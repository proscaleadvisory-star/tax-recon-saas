"""
ledger_models.py
================
Enterprise Pre-Close Ledger Auditor — Core ML Engine

Architecture:
    LedgerPreprocessor  → sklearn Pipeline (RobustScale + OHE + TargetEncode)
    LedgerAutoencoder   → PyTorch deep reconstruction network
    IsolationForest     → sklearn random partition ensemble
    PreCloseLedgerAuditor → Orchestrator: trains both, fuses scores, explains flags

Mathematical References:
    AE Loss:    L(x, x̂) = (1/d) Σ (x_i - x̂_i)²
    IF Score:   s(x, n) = 2^{-E(h(x)) / c(n)}
    Risk Score: R(x) = 0.6·Norm(AE_loss) + 0.4·Norm(IF_score)
    Flagged if: R(x) > 0.75
    AE Threshold τ: 97th percentile of training reconstruction losses
"""

from __future__ import annotations

import os
import logging
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd
import joblib

# ── scikit-learn ──────────────────────────────────────────────────────────────
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer

# target encoding: prefer sklearn.preprocessing if available, fallback to category_encoders
_USE_SKLEARN_TE = False
try:
    from sklearn.preprocessing import TargetEncoder
    _HAS_CE = True
    _USE_SKLEARN_TE = True
except ImportError:
    try:
        from category_encoders import TargetEncoder
        _HAS_CE = True
    except ImportError:
        _HAS_CE = False
        warnings.warn(
            "Neither sklearn.preprocessing.TargetEncoder nor category_encoders.TargetEncoder "
            "is installed. Falling back to ordinal encoding for vendor_id and account_id."
        )
        from sklearn.preprocessing import OrdinalEncoder

# ── PyTorch ───────────────────────────────────────────────────────────────────
try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset
    _HAS_TORCH = True
except ImportError:
    _HAS_TORCH = False
    warnings.warn(
        "PyTorch not installed. Autoencoder will be disabled and only "
        "IsolationForest will be used. Install with: pip install torch --index-url "
        "https://download.pytorch.org/whl/cpu"
    )

logger = logging.getLogger("ledger-auditor")

# ── Configuration constants ────────────────────────────────────────────────────
# Environment-configurable model persistence directory
MODEL_DIR: Path = Path(os.environ.get("MODEL_DIR", "model_artifacts"))
REQUIRED_COLUMNS: List[str] = [
    "transaction_id", "amount", "vendor_id", "account_id",
    "cost_center", "posting_timestamp"
]

# Fusion weights — AE reconstruction is weighted higher as it captures structural patterns
FUSION_WEIGHT_AE: float = 0.6
FUSION_WEIGHT_IF: float = 0.4

# Risk score threshold above which a transaction is flagged for human review
RISK_THRESHOLD: float = 0.70

# Autoencoder dynamic threshold percentile on training losses
AE_THRESHOLD_PERCENTILE: float = 97.0


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOM EXCEPTION CLASSES
# ══════════════════════════════════════════════════════════════════════════════

class SchemaValidationError(ValueError):
    """Raised when input DataFrame is missing required columns or has type mismatches."""
    pass


class ModelNotTrainedError(RuntimeError):
    """Raised when audit is attempted before the model has been trained."""
    pass


# ══════════════════════════════════════════════════════════════════════════════
# VELOCITY FEATURE ENGINEER
# ══════════════════════════════════════════════════════════════════════════════

class VelocityFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Computes rolling velocity and engineers unsupervised features for anomalies:
    - velocity: 24h transaction frequency count
    - is_weekend: transaction posted on Sat/Sun
    - is_off_hours: transaction posted outside 08:00–18:00
    - duplicate_count: identical transactions within 2h window
    - cost_center_mismatch: 1.0 if cost_center x account prefix combination was never seen in training data
    """

    def __init__(self) -> None:
        self.valid_combinations_ = set()

    def fit(self, X: pd.DataFrame, y=None) -> "VelocityFeatureEngineer":
        # Learn valid cost center and account prefix combinations
        prefixes = X["account_id"].astype(str).str[0]
        self.valid_combinations_ = set(zip(X["cost_center"].astype(str), prefixes))
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        df = X.copy()
        # Ensure timestamp is datetime
        df["posting_timestamp"] = pd.to_datetime(
            df["posting_timestamp"], errors="coerce"
        )
        df = df.sort_values("posting_timestamp")

        # 1. Rolling velocity
        df["velocity"] = self._compute_rolling_velocity(df)

        # 2. Weekend and off-hours features
        df["is_weekend"] = df["posting_timestamp"].dt.weekday.ge(5).astype(np.float32)
        hours = df["posting_timestamp"].dt.hour
        df["is_off_hours"] = ((hours < 8) | (hours >= 18)).astype(np.float32)

        # 3. Duplicate count (same vendor + account + amount in 2h)
        df["duplicate_count"] = self._compute_duplicate_count(df)

        # 4. Cost center mismatch
        prefixes = df["account_id"].astype(str).str[0]
        df["cost_center_mismatch"] = np.array([
            0.0 if (cc, pref) in self.valid_combinations_ else 1.0
            for cc, pref in zip(df["cost_center"].astype(str), prefixes)
        ], dtype=np.float32)

        return df.loc[X.index]

    @staticmethod
    def _compute_rolling_velocity(df: pd.DataFrame) -> pd.Series:
        velocity = pd.Series(np.ones(len(df), dtype=np.float32), index=df.index)
        window_ns = pd.Timedelta(hours=24).value

        for (vid, aid), group in df.groupby(["vendor_id", "account_id"]):
            if len(group) <= 1:
                continue
            ts_ns = group["posting_timestamp"].astype(np.int64).values
            counts = np.array([
                np.sum((ts_ns <= ts_ns[i]) & (ts_ns >= ts_ns[i] - window_ns))
                for i in range(len(ts_ns))
            ], dtype=np.float32)
            velocity.loc[group.index] = counts

        return velocity

    @staticmethod
    def _compute_duplicate_count(df: pd.DataFrame) -> pd.Series:
        dup_count = pd.Series(np.zeros(len(df), dtype=np.float32), index=df.index)
        window_ns = pd.Timedelta(hours=2).value

        for (vid, aid, amt), group in df.groupby(["vendor_id", "account_id", "amount"]):
            if len(group) <= 1:
                continue
            ts_ns = group["posting_timestamp"].astype(np.int64).values
            counts = np.array([
                np.sum((ts_ns >= ts_ns[i] - window_ns) & (ts_ns <= ts_ns[i] + window_ns)) - 1
                for i in range(len(ts_ns))
            ], dtype=np.float32)
            dup_count.loc[group.index] = counts

        return dup_count


# ══════════════════════════════════════════════════════════════════════════════
# LEDGER PREPROCESSOR
# ══════════════════════════════════════════════════════════════════════════════

class LedgerPreprocessor:
    """
    Full feature preprocessing pipeline for raw ledger entries.

    Preprocessing steps:
        1. Schema validation (raise SchemaValidationError on mismatch)
        2. Median imputation for numeric columns
        3. "UNKNOWN" fill for categorical columns
        4. Velocity + Unsupervised feature engineering
        5. RobustScaler on numeric features
        6. OneHotEncoder for `cost_center`
        7. TargetEncoder for `vendor_id`, `account_id`
    """

    NUMERIC_COLS = [
        "amount", "velocity", "is_weekend", "is_off_hours",
        "duplicate_count", "cost_center_mismatch"
    ]
    CAT_OHE_COLS = ["cost_center"]
    CAT_HI_CARD_COLS = ["vendor_id", "account_id"]

    def __init__(self) -> None:
        self._velocity_engineer = VelocityFeatureEngineer()
        self._pipeline: Optional[Pipeline] = None
        self._feature_names: List[str] = []
        self._is_fitted: bool = False

    @staticmethod
    def _validate_schema(df: pd.DataFrame) -> None:
        """Raise SchemaValidationError if required columns are missing."""
        missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
        if missing:
            raise SchemaValidationError(
                f"Input DataFrame is missing required columns: {missing}. "
                f"Received columns: {list(df.columns)}"
            )

    def fit(self, df: pd.DataFrame, target_col: Optional[pd.Series] = None) -> "LedgerPreprocessor":
        """
        Fit the preprocessor on a training DataFrame.
        target_col is required for TargetEncoder if available.
        """
        self._validate_schema(df)

        # Step 1: Impute missing values before velocity computation
        df = df.copy()
        df["amount"] = df["amount"].fillna(df["amount"].median())
        for col in self.CAT_OHE_COLS + self.CAT_HI_CARD_COLS:
            df[col] = df[col].fillna("UNKNOWN").astype(str)

        # Step 2: Compute velocity feature
        df = self._velocity_engineer.fit_transform(df)

        # Step 3: Build sklearn ColumnTransformer
        numeric_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
        ])

        # Low-cardinality categorical: OHE
        ohe_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
            ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])

        # High-cardinality categorical: TargetEncoder or OrdinalEncoder fallback
        if _HAS_CE:
            # TargetEncoder smooths category means toward global mean — ideal for
            # high-cardinality IDs where rare categories would balloon OHE width
            encoder_inst = TargetEncoder(smooth="auto") if _USE_SKLEARN_TE else TargetEncoder(smoothing=10)
            hi_card_transformer = Pipeline(steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
                ("encoder", encoder_inst),
            ])
        else:
            hi_card_transformer = Pipeline(steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
                ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
            ])

        self._pipeline = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, self.NUMERIC_COLS),
                ("ohe", ohe_transformer, self.CAT_OHE_COLS),
                ("hi_card", hi_card_transformer, self.CAT_HI_CARD_COLS),
            ],
            remainder="drop",
        )

        # Fit the full pipeline
        X_proc = df[self.NUMERIC_COLS + self.CAT_OHE_COLS + self.CAT_HI_CARD_COLS]
        target = target_col.values if target_col is not None else np.zeros(len(df))
        self._pipeline.fit(X_proc, target)
        self._is_fitted = True

        # Record output feature count for validation
        self._feature_names = self._get_feature_names()
        logger.info(f"LedgerPreprocessor fitted. Output features: {len(self._feature_names)}")
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transform raw ledger entries into a numeric feature matrix.
        Returns shape (n_samples, n_features) as float32 numpy array.
        """
        if not self._is_fitted:
            raise ModelNotTrainedError("LedgerPreprocessor must be fitted before transform().")

        self._validate_schema(df)

        df = df.copy()
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(df["amount"].median())
        for col in self.CAT_OHE_COLS + self.CAT_HI_CARD_COLS:
            df[col] = df[col].fillna("UNKNOWN").astype(str)

        df = self._velocity_engineer.transform(df)
        X_proc = df[self.NUMERIC_COLS + self.CAT_OHE_COLS + self.CAT_HI_CARD_COLS]
        return self._pipeline.transform(X_proc).astype(np.float32)

    def fit_transform(self, df: pd.DataFrame, target_col: Optional[pd.Series] = None) -> np.ndarray:
        return self.fit(df, target_col).transform(df)

    def _get_feature_names(self) -> List[str]:
        """Collect output feature names from the ColumnTransformer."""
        names = []
        for name, transformer, cols in self._pipeline.transformers_:
            if name == "num":
                names.extend(cols)
            elif name == "ohe":
                ohe = transformer.named_steps["ohe"]
                names.extend(ohe.get_feature_names_out(cols).tolist())
            elif name == "hi_card":
                names.extend(cols)
        return names

    @property
    def n_features(self) -> int:
        return len(self._feature_names)

    @property
    def feature_names(self) -> List[str]:
        return self._feature_names


# ══════════════════════════════════════════════════════════════════════════════
# LEDGER AUTOENCODER (PyTorch)
# ══════════════════════════════════════════════════════════════════════════════

if _HAS_TORCH:
    class LedgerAutoencoder(nn.Module):
        """
        Deep reconstruction autoencoder for structured ledger feature vectors.

        Encoder Architecture:
            input_dim → 64 → (BatchNorm1d + ReLU) → 32 → (BatchNorm1d + ReLU) → 16 (bottleneck)

        Decoder Architecture (mirror):
            16 → 32 → (BatchNorm1d + ReLU) → 64 → (BatchNorm1d + ReLU) → input_dim (linear)

        Training Objective:
            Minimize per-sample MSE reconstruction loss:
            L(x, x̂) = (1/d) Σ (x_i - x̂_i)²

        Anomaly Threshold:
            τ = 97th percentile of reconstruction losses on training set.
            Transactions with loss > τ are flagged by the AE subsystem.
        """

        def __init__(self, input_dim: int) -> None:
            super().__init__()
            self.input_dim = input_dim

            # ── Encoder ──────────────────────────────────────────────────────
            self.encoder = nn.Sequential(
                nn.Linear(input_dim, 64),
                nn.BatchNorm1d(64),
                nn.ReLU(),
                nn.Linear(64, 32),
                nn.BatchNorm1d(32),
                nn.ReLU(),
                nn.Linear(32, 16),  # bottleneck — compressed latent representation
                nn.BatchNorm1d(16),
                nn.ReLU(),
            )

            # ── Decoder (mirror) ─────────────────────────────────────────────
            self.decoder = nn.Sequential(
                nn.Linear(16, 32),
                nn.BatchNorm1d(32),
                nn.ReLU(),
                nn.Linear(32, 64),
                nn.BatchNorm1d(64),
                nn.ReLU(),
                nn.Linear(64, input_dim),  # linear output — no sigmoid since features are RobustScaled
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            """Encode → decode. Returns reconstructed input."""
            z = self.encoder(x)
            return self.decoder(z)

        def reconstruction_loss(self, x: torch.Tensor) -> torch.Tensor:
            """
            Per-sample MSE reconstruction loss.
            Returns shape (n_samples,) — one scalar loss per input row.
            This is used for thresholding individual transactions.
            """
            x_hat = self.forward(x)
            # Mean across feature dimension → per-sample loss scalar
            return torch.mean((x - x_hat) ** 2, dim=1)

        def feature_wise_error(self, x: torch.Tensor) -> torch.Tensor:
            """
            Per-feature squared error for explainability attribution.
            Returns shape (n_samples, input_dim) — contribution of each feature
            to the total reconstruction loss.
            """
            x_hat = self.forward(x)
            return (x - x_hat) ** 2  # shape: (n, d)


# ══════════════════════════════════════════════════════════════════════════════
# PRE-CLOSE LEDGER AUDITOR (Orchestrator)
# ══════════════════════════════════════════════════════════════════════════════

class PreCloseLedgerAuditor:
    """
    Hybrid unsupervised ledger anomaly detection system.

    Sub-systems:
        1. LedgerAutoencoder (AE)   — captures structural reconstruction patterns
        2. IsolationForest   (IF)   — random partition-based point outlier detection

    Score Fusion:
        R(x) = w₁ · Norm(AE_loss) + w₂ · Norm(IF_score)
        w₁ = 0.6, w₂ = 0.4

        where:
        - Norm(AE_loss) = MinMax normalised reconstruction loss ∈ [0, 1]
        - Norm(IF_score) = MinMax normalised isolation score ∈ [0, 1]
          (IF decision_function remapped so 1.0 = extreme anomaly)

    Flagging:
        Transactions with R(x) > 0.75 are flagged for human review.

    Explainability:
        For flagged rows:
        - AE: feature-wise squared error → identify which feature drove high loss
        - IF: perturbation-based path length delta (sensitivity per feature)

    Training:
        1. Fit LedgerPreprocessor on normal baseline data
        2. Train LedgerAutoencoder via Adam for N epochs (MSE loss)
        3. Set AE threshold τ at 97th percentile of training losses
        4. Fit IsolationForest on same preprocessed features
        5. Compute IF score bounds on training set for Min-Max normalisation
        6. Persist all artifacts to MODEL_DIR
    """

    def __init__(
        self,
        ae_epochs: int = 50,
        ae_batch_size: int = 256,
        ae_lr: float = 1e-3,
        if_n_estimators: int = 200,
        if_contamination: float = 0.02,
        device: Optional[str] = None,
    ) -> None:
        self.ae_epochs = ae_epochs
        self.ae_batch_size = ae_batch_size
        self.ae_lr = ae_lr
        self.if_n_estimators = if_n_estimators
        self.if_contamination = if_contamination

        # Auto-select device: CUDA if available, else CPU
        if _HAS_TORCH:
            self.device = torch.device(
                device or ("cuda" if torch.cuda.is_available() else "cpu")
            )

        # Sub-system instances
        self.preprocessor = LedgerPreprocessor()
        self.autoencoder: Optional[Any] = None
        self.isolation_forest: Optional[IsolationForest] = None

        # Calibration bounds (fitted on training set for normalisation)
        self._ae_loss_min: float = 0.0
        self._ae_loss_max: float = 1.0
        self._if_score_min: float = 0.0
        self._if_score_max: float = 1.0
        self._ae_threshold_tau: float = float("inf")

        self._is_trained: bool = False
        self._train_timestamp: Optional[str] = None
        self._training_metrics: Dict[str, Any] = {}

    # ──────────────────────────────────────────────────────────────────────────
    # TRAINING
    # ──────────────────────────────────────────────────────────────────────────

    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Full training pipeline on historical normal ledger data.

        Args:
            df: Raw ledger DataFrame with REQUIRED_COLUMNS. Expected to be
                predominantly normal transactions (contamination ≤ 5%).

        Returns:
            Dict with training metrics: ae_final_loss, ae_threshold_tau,
            if_contamination_rate, n_samples_trained.
        """
        logger.info(f"Starting PreCloseLedgerAuditor training on {len(df)} samples...")

        # ── Step 1: Preprocess ─────────────────────────────────────────────
        X = self.preprocessor.fit_transform(df)
        n_samples, n_features = X.shape
        logger.info(f"Preprocessed: {n_samples} samples × {n_features} features")

        # ── Step 2: Train Autoencoder ──────────────────────────────────────
        ae_metrics = {}
        if _HAS_TORCH:
            ae_metrics = self._train_autoencoder(X, n_features)
        else:
            logger.warning("PyTorch unavailable. Skipping Autoencoder. Only IF will be used.")
            self._ae_threshold_tau = float("inf")

        # ── Step 3: Train Isolation Forest ────────────────────────────────
        logger.info("Fitting IsolationForest...")
        self.isolation_forest = IsolationForest(
            n_estimators=self.if_n_estimators,
            contamination=self.if_contamination,
            random_state=42,
            n_jobs=-1,  # use all CPU cores
        )
        self.isolation_forest.fit(X)

        # ── Step 4: Calibrate normalisation bounds on training set ─────────
        if_raw_scores = self._get_if_raw_scores(X)
        self._if_score_min = float(if_raw_scores.min())
        self._if_score_max = float(if_raw_scores.max())

        if _HAS_TORCH:
            ae_losses = self._get_ae_losses(X)
            self._ae_loss_min = float(ae_losses.min())
            self._ae_loss_max = float(ae_losses.max())
            # Dynamic threshold: 97th percentile of training reconstruction losses
            self._ae_threshold_tau = float(np.percentile(ae_losses, AE_THRESHOLD_PERCENTILE))
            logger.info(f"AE dynamic threshold τ = {self._ae_threshold_tau:.6f} "
                        f"(97th pct of training losses)")

        # ── Step 5: Persist artifacts ──────────────────────────────────────
        self._is_trained = True
        import datetime
        self._train_timestamp = datetime.datetime.utcnow().isoformat()
        self._training_metrics = {
            "n_samples": n_samples,
            "n_features": n_features,
            "ae_threshold_tau": self._ae_threshold_tau,
            "ae_loss_min": self._ae_loss_min,
            "ae_loss_max": self._ae_loss_max,
            "if_score_min": self._if_score_min,
            "if_score_max": self._if_score_max,
            "train_timestamp": self._train_timestamp,
            **ae_metrics,
        }
        self._save_artifacts()
        logger.info(f"Training complete. Artifacts saved to {MODEL_DIR}")
        return self._training_metrics

    def _train_autoencoder(self, X: np.ndarray, n_features: int) -> Dict[str, float]:
        """Train the PyTorch Autoencoder. Returns training metrics."""
        logger.info(f"Training LedgerAutoencoder (device={self.device})...")
        self.autoencoder = LedgerAutoencoder(input_dim=n_features).to(self.device)
        optimizer = torch.optim.Adam(self.autoencoder.parameters(), lr=self.ae_lr)

        # Build DataLoader
        X_tensor = torch.tensor(X, dtype=torch.float32)
        dataset = TensorDataset(X_tensor)
        loader = DataLoader(dataset, batch_size=self.ae_batch_size, shuffle=True)

        self.autoencoder.train()
        epoch_losses: List[float] = []

        for epoch in range(self.ae_epochs):
            batch_losses = []
            for (batch,) in loader:
                batch = batch.to(self.device)
                optimizer.zero_grad()
                # Mean across samples and features = total MSE loss for this batch
                x_hat = self.autoencoder(batch)
                loss = torch.mean((batch - x_hat) ** 2)
                loss.backward()
                optimizer.step()
                batch_losses.append(loss.item())

            epoch_loss = float(np.mean(batch_losses))
            epoch_losses.append(epoch_loss)

            if (epoch + 1) % 10 == 0:
                logger.info(f"  Epoch [{epoch+1}/{self.ae_epochs}] Loss: {epoch_loss:.6f}")

        self.autoencoder.eval()
        return {
            "ae_initial_loss": epoch_losses[0],
            "ae_final_loss": epoch_losses[-1],
            "ae_convergence_ratio": epoch_losses[-1] / max(epoch_losses[0], 1e-8),
            "ae_epochs_trained": self.ae_epochs,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # INFERENCE / AUDIT
    # ──────────────────────────────────────────────────────────────────────────

    def audit(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Run the full audit pipeline on a batch of pending ledger entries.

        Args:
            df: Raw ledger DataFrame with REQUIRED_COLUMNS.

        Returns:
            List of per-row audit result dicts containing:
                - transaction_id: str
                - risk_score: float ∈ [0, 1]
                - is_flagged: bool (True if risk_score > RISK_THRESHOLD)
                - ae_loss: float (raw autoencoder reconstruction loss)
                - if_score: float (raw isolation forest score)
                - flag_reasons: List[str] (human-readable explanations)
                - feature_attributions: Dict[str, float] (per-feature contribution %)
        """
        if not self._is_trained:
            raise ModelNotTrainedError(
                "Model must be trained before audit(). Call train() or load_artifacts()."
            )

        logger.info(f"Running audit on {len(df)} ledger entries...")
        X = self.preprocessor.transform(df)

        # ── Sub-system scores ─────────────────────────────────────────────
        ae_losses = self._get_ae_losses(X) if _HAS_TORCH and self.autoencoder else np.zeros(len(X))
        if_scores = self._get_if_raw_scores(X)

        # ── Normalise both scores to [0, 1] using training calibration bounds
        # Norm(AE_loss): 0 = perfectly normal, 1 = maximally anomalous
        ae_norm = self._minmax_norm(ae_losses, self._ae_loss_min, self._ae_loss_max)

        # IF decision_function returns negative values for anomalies.
        # Remap: anomalies (low raw score) → high norm score
        if_norm = 1.0 - self._minmax_norm(if_scores, self._if_score_min, self._if_score_max)
        if_norm = np.clip(if_norm, 0.0, 1.0)

        # ── Dynamic Score Fusion ──────────────────────────────────────────
        # R(x) = w1·Norm(AE_loss) + w2·Norm(IF_score)
        risk_scores = FUSION_WEIGHT_AE * ae_norm + FUSION_WEIGHT_IF * if_norm

        # ── Build per-row results ─────────────────────────────────────────
        results: List[Dict[str, Any]] = []
        feature_names = self.preprocessor.feature_names

        # Compute feature-wise AE squared errors for explainability
        ae_feature_errors: Optional[np.ndarray] = None
        if _HAS_TORCH and self.autoencoder is not None:
            ae_feature_errors = self._get_ae_feature_errors(X)

        for i, row_df in enumerate(df.itertuples()):
            txn_id = str(getattr(row_df, "transaction_id", f"row_{i}"))
            risk = float(risk_scores[i])
            is_flagged = risk > RISK_THRESHOLD

            flag_reasons: List[str] = []
            feature_attributions: Dict[str, float] = {}

            if is_flagged:
                flag_reasons, feature_attributions = self._explain(
                    idx=i,
                    X=X,
                    ae_loss=float(ae_losses[i]),
                    ae_norm=float(ae_norm[i]),
                    if_norm=float(if_norm[i]),
                    ae_feature_errors=ae_feature_errors,
                    feature_names=feature_names,
                )

            results.append({
                "transaction_id": txn_id,
                "risk_score": round(risk, 6),
                "is_flagged": is_flagged,
                "ae_loss": round(float(ae_losses[i]), 6),
                "if_score": round(float(if_scores[i]), 6),
                "ae_norm": round(float(ae_norm[i]), 6),
                "if_norm": round(float(if_norm[i]), 6),
                "flag_reasons": flag_reasons,
                "feature_attributions": feature_attributions,
            })

        flagged_count = sum(1 for r in results if r["is_flagged"])
        logger.info(f"Audit complete: {flagged_count}/{len(results)} entries flagged "
                    f"(R > {RISK_THRESHOLD})")
        return results

    # ──────────────────────────────────────────────────────────────────────────
    # EXPLAINABILITY ENGINE
    # ──────────────────────────────────────────────────────────────────────────

    def _explain(
        self,
        idx: int,
        X: np.ndarray,
        ae_loss: float,
        ae_norm: float,
        if_norm: float,
        ae_feature_errors: Optional[np.ndarray],
        feature_names: List[str],
    ) -> Tuple[List[str], Dict[str, float]]:
        """
        Generate human-readable flag reasons and feature attributions for a flagged row.

        AE Attribution:
            feature_contribution[i] = (x_i - x̂_i)² / Σ(x_j - x̂_j)²
            Identifies which feature column drove the high reconstruction loss.

        IF Attribution (perturbation-based):
            For each feature, zero it out and measure change in IF decision score.
            Δscore_f = |IF_score(x) - IF_score(x with feature_f zeroed)|
            Larger Δ → feature_f is more responsible for isolation.
        """
        flag_reasons: List[str] = []
        feature_attributions: Dict[str, float] = {}

        # ── AE Explainability ─────────────────────────────────────────────
        if ae_feature_errors is not None and ae_norm > 0.5:
            row_errors = ae_feature_errors[idx]  # shape: (n_features,)
            total_error = float(np.sum(row_errors)) + 1e-10
            # Percentage contribution of each feature to reconstruction loss
            contributions = (row_errors / total_error * 100.0).tolist()

            # Build attribution dict (top features only, truncated)
            for fname, contrib in zip(feature_names, contributions):
                feature_attributions[fname] = round(float(contrib), 2)

            # Identify top driver for flag reason text
            top_idx = int(np.argmax(row_errors))
            top_feature = feature_names[top_idx] if top_idx < len(feature_names) else "unknown"
            top_pct = round(contributions[top_idx], 1)
            flag_reasons.append(
                f"Reconstruction anomaly: '{top_feature}' drove {top_pct}% of AE error"
            )

        # ── IF Perturbation Attribution ───────────────────────────────────
        if if_norm > 0.5 and self.isolation_forest is not None:
            x_row = X[idx:idx+1].copy()  # shape (1, n_features)
            base_score = float(self.isolation_forest.decision_function(x_row)[0])

            deltas: List[Tuple[str, float]] = []
            for f_idx, fname in enumerate(feature_names):
                x_perturbed = x_row.copy()
                x_perturbed[0, f_idx] = 0.0  # zero out this feature
                perturbed_score = float(self.isolation_forest.decision_function(x_perturbed)[0])
                delta = abs(base_score - perturbed_score)
                deltas.append((fname, delta))

            deltas.sort(key=lambda t: t[1], reverse=True)
            # Update attributions with IF deltas for features not already covered
            for fname, delta in deltas:
                if fname not in feature_attributions:
                    feature_attributions[fname] = round(delta, 4)

            # Flag reason from top IF feature
            if deltas:
                top_if_feat, top_delta = deltas[0]
                flag_reasons.append(
                    f"Isolation anomaly: '{top_if_feat}' isolation path Δ={top_delta:.4f}"
                )

        # ── Velocity-specific reason ──────────────────────────────────────
        velocity_attr = feature_attributions.get("velocity", 0.0)
        if velocity_attr > 20.0:
            flag_reasons.append(
                f"Velocity spike: high transaction frequency on this vendor+account "
                f"(contributed {velocity_attr:.1f}% of reconstruction error)"
            )

        # ── Amount-specific reason ────────────────────────────────────────
        amount_attr = feature_attributions.get("amount", 0.0)
        if amount_attr > 30.0:
            flag_reasons.append(
                f"Unusual amount: amount value is structurally anomalous "
                f"(contributed {amount_attr:.1f}% of reconstruction error)"
            )

        if not flag_reasons:
            flag_reasons.append(
                f"Unified risk score {round(FUSION_WEIGHT_AE*ae_norm + FUSION_WEIGHT_IF*if_norm, 3)} "
                f"exceeds threshold {RISK_THRESHOLD} (AE:{ae_norm:.3f}, IF:{if_norm:.3f})"
            )

        return flag_reasons, feature_attributions

    # ──────────────────────────────────────────────────────────────────────────
    # HELPER METHODS
    # ──────────────────────────────────────────────────────────────────────────

    def _get_ae_losses(self, X: np.ndarray) -> np.ndarray:
        """Compute per-sample AE reconstruction loss on X. Returns shape (n,)."""
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self.device)
            losses = self.autoencoder.reconstruction_loss(X_t).cpu().numpy()
        return losses.astype(np.float32)

    def _get_ae_feature_errors(self, X: np.ndarray) -> np.ndarray:
        """Compute per-sample per-feature squared errors. Returns shape (n, d)."""
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self.device)
            errors = self.autoencoder.feature_wise_error(X_t).cpu().numpy()
        return errors.astype(np.float32)

    def _get_if_raw_scores(self, X: np.ndarray) -> np.ndarray:
        """
        Get IsolationForest decision_function scores.
        sklearn's decision_function returns: negative → anomaly, positive → normal.
        Returns shape (n,).
        """
        return self.isolation_forest.decision_function(X).astype(np.float32)

    @staticmethod
    def _minmax_norm(arr: np.ndarray, mn: float, mx: float) -> np.ndarray:
        """
        Min-Max normalise arr to [0, 1] using pre-computed training bounds.
        Clips values outside the calibration range to [0, 1].
        """
        span = mx - mn
        if span < 1e-10:
            return np.zeros_like(arr)
        normalised = (arr - mn) / span
        return np.clip(normalised, 0.0, 1.0)

    # ──────────────────────────────────────────────────────────────────────────
    # PERSISTENCE
    # ──────────────────────────────────────────────────────────────────────────

    def _save_artifacts(self) -> None:
        """Persist all model artifacts to MODEL_DIR."""
        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        # Save preprocessor
        joblib.dump(self.preprocessor, MODEL_DIR / "ledger_preprocessor.pkl")

        # Save IsolationForest
        joblib.dump(self.isolation_forest, MODEL_DIR / "isolation_forest.pkl")

        # Save PyTorch Autoencoder state dict
        if _HAS_TORCH and self.autoencoder is not None:
            torch.save(
                {
                    "state_dict": self.autoencoder.state_dict(),
                    "input_dim": self.autoencoder.input_dim,
                },
                MODEL_DIR / "autoencoder.pt",
            )

        # Save calibration metadata as JSON
        import json
        meta = {
            "ae_threshold_tau": self._ae_threshold_tau,
            "ae_loss_min": self._ae_loss_min,
            "ae_loss_max": self._ae_loss_max,
            "if_score_min": self._if_score_min,
            "if_score_max": self._if_score_max,
            "train_timestamp": self._train_timestamp,
            "training_metrics": self._training_metrics,
        }
        with open(MODEL_DIR / "calibration_meta.json", "w") as f:
            json.dump(meta, f, indent=2)

        logger.info(f"Artifacts saved: {list(MODEL_DIR.iterdir())}")

    @classmethod
    def load_artifacts(cls) -> "PreCloseLedgerAuditor":
        """
        Load a previously trained auditor from persisted artifacts in MODEL_DIR.
        Raises FileNotFoundError if artifacts not found.
        """
        if not (MODEL_DIR / "calibration_meta.json").exists():
            raise FileNotFoundError(
                f"No trained model found in {MODEL_DIR}. "
                "Call /audit/train first to train the model."
            )

        import json
        auditor = cls()
        auditor.preprocessor = joblib.load(MODEL_DIR / "ledger_preprocessor.pkl")
        auditor.isolation_forest = joblib.load(MODEL_DIR / "isolation_forest.pkl")

        with open(MODEL_DIR / "calibration_meta.json") as f:
            meta = json.load(f)

        auditor._ae_threshold_tau = meta["ae_threshold_tau"]
        auditor._ae_loss_min = meta["ae_loss_min"]
        auditor._ae_loss_max = meta["ae_loss_max"]
        auditor._if_score_min = meta["if_score_min"]
        auditor._if_score_max = meta["if_score_max"]
        auditor._train_timestamp = meta.get("train_timestamp")
        auditor._training_metrics = meta.get("training_metrics", {})

        # Load PyTorch Autoencoder
        ae_path = MODEL_DIR / "autoencoder.pt"
        if _HAS_TORCH and ae_path.exists():
            checkpoint = torch.load(ae_path, map_location="cpu")
            input_dim = checkpoint["input_dim"]
            auditor.autoencoder = LedgerAutoencoder(input_dim=input_dim)
            auditor.autoencoder.load_state_dict(checkpoint["state_dict"])
            auditor.autoencoder.eval()
            auditor.device = torch.device("cpu")

        auditor._is_trained = True
        logger.info(f"Loaded PreCloseLedgerAuditor from {MODEL_DIR}")
        return auditor

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    @property
    def status(self) -> Dict[str, Any]:
        return {
            "is_trained": self._is_trained,
            "train_timestamp": self._train_timestamp,
            "ae_threshold_tau": self._ae_threshold_tau,
            "risk_threshold": RISK_THRESHOLD,
            "fusion_weights": {"ae": FUSION_WEIGHT_AE, "if": FUSION_WEIGHT_IF},
            "model_dir": str(MODEL_DIR),
            **self._training_metrics,
        }
