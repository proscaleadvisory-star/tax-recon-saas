"""
models.py
=========
Unsupervised Anomaly Detection & Time-Series Forecasting Models for fpa-local

Features:
    1. LocalForecaster: ARIMA with AIC grid search + ExponentialSmoothing fallback
    2. LedgerPreprocessor: robust target encoder / OHE / scaling pipeline
    3. LedgerAutoencoder: PyTorch deep reconstruction model
    4. LocalAnomalyDetector: Fuses AE and IsolationForest + Explainability Engine
"""

from __future__ import annotations

import logging
import warnings
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd
import joblib

# statsmodels
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing

# sklearn
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler, OneHotEncoder, StandardScaler, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer

# target encoder (prefers sklearn built-in, falls back to category_encoders, then OrdinalEncoder)
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
        from sklearn.preprocessing import OrdinalEncoder

# PyTorch CPU check
try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset
    _HAS_TORCH = True
except ImportError:
    _HAS_TORCH = False

logger = logging.getLogger("fpa-models")


# ══════════════════════════════════════════════════════════════════════════════
# 1. TIME SERIES FORECASTER
# ══════════════════════════════════════════════════════════════════════════════

class LocalForecaster:
    """
    Fits time-series forecasting models to historical actuals.
    Executes an AIC-minimizing grid search for ARIMA(p,d,q).
    Falls back to Holt-Winters Exponential Smoothing or linear extrapolation on failure.
    """

    def __init__(self, periods_to_forecast: int = 6) -> None:
        self.periods_to_forecast = periods_to_forecast
        self.model_info = ""

    def forecast(self, history: List[float]) -> List[Dict[str, float]]:
        """
        Fits a model and forecasts future periods.
        Returns a list of dicts with: period_index, forecast, lower_ci, upper_ci.
        """
        n = len(history)
        if n < 4:
            # Not enough data for statsmodels; fall back to linear extrapolation
            logger.info("Historical data size < 4. Falling back to linear trend extrapolation.")
            return self._linear_extrapolate(history)

        history_arr = np.array(history, dtype=np.float64)

        # ── Grid Search ARIMA(p, d, q)
        best_aic = float("inf")
        best_order = (1, 1, 0)
        best_fit = None

        for p in [0, 1, 2]:
            for d in [0, 1]:
                for q in [0, 1, 2]:
                    try:
                        # Suppress statsmodels warnings
                        with warnings.catch_warnings():
                            warnings.simplefilter("ignore")
                            model = ARIMA(history_arr, order=(p, d, q))
                            fit = model.fit()
                            if fit.aic < best_aic:
                                best_aic = fit.aic
                                best_order = (p, d, q)
                                best_fit = fit
                    except Exception:
                        continue

        if best_fit is not None:
            try:
                self.model_info = f"ARIMA{best_order}"
                forecast_res = best_fit.get_forecast(steps=self.periods_to_forecast)
                mean = forecast_res.predicted_mean
                # Extract 95% confidence intervals
                ci = forecast_res.conf_int(alpha=0.05)
                
                results = []
                for idx in range(self.periods_to_forecast):
                    results.append({
                        "period_index": n + idx,
                        "forecast": float(mean[idx]),
                        "lower_ci": float(ci[idx, 0]),
                        "upper_ci": float(ci[idx, 1]),
                    })
                return results
            except Exception as e:
                logger.warning(f"ARIMA forecasting failed: {e}. Falling back to Holt-Winters.")

        # ── Holt-Winters Exponential Smoothing Fallback
        try:
            self.model_info = "Holt-Winters ExponentialSmoothing"
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = ExponentialSmoothing(history_arr, trend="add", seasonal=None)
                fit = model.fit()
                forecast_mean = fit.forecast(steps=self.periods_to_forecast)
                
                # Approximate 95% confidence interval using residual variance
                residuals = fit.resid
                std_err = np.std(residuals) if len(residuals) > 0 else 0.1 * np.mean(history_arr)
                
                results = []
                for idx in range(self.periods_to_forecast):
                    margin = 1.96 * std_err * np.sqrt(idx + 1)
                    results.append({
                        "period_index": n + idx,
                        "forecast": float(forecast_mean[idx]),
                        "lower_ci": float(forecast_mean[idx] - margin),
                        "upper_ci": float(forecast_mean[idx] + margin),
                    })
                return results
        except Exception as e:
            logger.warning(f"Holt-Winters failed: {e}. Falling back to linear trend.")

        # Final Fallback
        return self._linear_extrapolate(history)

    def _linear_extrapolate(self, history: List[float]) -> List[Dict[str, float]]:
        self.model_info = "Linear Trend Extrapolation"
        n = len(history)
        if n == 0:
            return [{"period_index": idx, "forecast": 0.0, "lower_ci": 0.0, "upper_ci": 0.0} for idx in range(self.periods_to_forecast)]
        elif n == 1:
            val = history[0]
            return [{"period_index": 1 + idx, "forecast": val, "lower_ci": val * 0.8, "upper_ci": val * 1.2} for idx in range(self.periods_to_forecast)]

        # Fit a simple line: y = mx + c
        x = np.arange(n)
        y = np.array(history)
        m, c = np.polyfit(x, y, 1)

        results = []
        std_err = np.std(y - (m * x + c)) if n > 2 else 0.1 * np.mean(y)
        for idx in range(self.periods_to_forecast):
            proj_idx = n + idx
            pred = m * proj_idx + c
            margin = 1.96 * std_err * np.sqrt(idx + 1)
            results.append({
                "period_index": proj_idx,
                "forecast": float(pred),
                "lower_ci": float(pred - margin),
                "upper_ci": float(pred + margin),
            })
        return results


# ══════════════════════════════════════════════════════════════════════════════
# 2. LEDGER PREPROCESSOR & VELOCITY FEATURE ENGINEER
# ══════════════════════════════════════════════════════════════════════════════

class VelocityFeatureEngineer(BaseEstimator, TransformerMixin):
    """Computes rolling velocity and other temporal/cross-sectional features."""

    def __init__(self) -> None:
        self.valid_combinations_ = set()

    def fit(self, X: pd.DataFrame, y=None) -> "VelocityFeatureEngineer":
        prefixes = X["account_id"].astype(str).str[0]
        self.valid_combinations_ = set(zip(X["cost_center"].astype(str), prefixes))
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        df = X.copy()
        df["posting_timestamp"] = pd.to_datetime(df["posting_timestamp"], errors="coerce")
        df = df.sort_values("posting_timestamp")

        # 1. 24h rolling velocity
        df["velocity"] = self._compute_rolling_velocity(df)

        # 2. Weekend & off-hours indicators
        df["is_weekend"] = df["posting_timestamp"].dt.weekday.ge(5).astype(np.float32)
        hours = df["posting_timestamp"].dt.hour
        df["is_off_hours"] = ((hours < 8) | (hours >= 18)).astype(np.float32)

        # 3. Duplicate invoices (same vendor + account + amount in 2h)
        df["duplicate_count"] = self._compute_duplicate_count(df)

        # 4. Cost center control bypass
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


class LedgerPreprocessor:
    """Preprocesses raw ledger sheets into scaled feature matrices."""

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

    def fit(self, df: pd.DataFrame, target_col: Optional[pd.Series] = None) -> "LedgerPreprocessor":
        df = df.copy()
        df["amount"] = df["amount"].fillna(df["amount"].median())
        for col in self.CAT_OHE_COLS + self.CAT_HI_CARD_COLS:
            df[col] = df[col].fillna("UNKNOWN").astype(str)

        df = self._velocity_engineer.fit_transform(df)

        numeric_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
        ])
        ohe_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
            ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])

        if _HAS_CE:
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

        self._pipeline = ColumnTransformer(transformers=[
            ("num", numeric_transformer, self.NUMERIC_COLS),
            ("ohe", ohe_transformer, self.CAT_OHE_COLS),
            ("hi_card", hi_card_transformer, self.CAT_HI_CARD_COLS),
        ], remainder="drop")

        X_proc = df[self.NUMERIC_COLS + self.CAT_OHE_COLS + self.CAT_HI_CARD_COLS]
        target = target_col.values if target_col is not None else np.zeros(len(df))
        self._pipeline.fit(X_proc, target)
        self._is_fitted = True

        # Grab output feature names
        names = []
        for name, transformer, cols in self._pipeline.transformers_:
            if name == "num":
                names.extend(cols)
            elif name == "ohe":
                ohe = transformer.named_steps["ohe"]
                names.extend(ohe.get_feature_names_out(cols).tolist())
            elif name == "hi_card":
                names.extend(cols)
        self._feature_names = names
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        df = df.copy()
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(df["amount"].median())
        for col in self.CAT_OHE_COLS + self.CAT_HI_CARD_COLS:
            df[col] = df[col].fillna("UNKNOWN").astype(str)

        df = self._velocity_engineer.transform(df)
        X_proc = df[self.NUMERIC_COLS + self.CAT_OHE_COLS + self.CAT_HI_CARD_COLS]
        return self._pipeline.transform(X_proc).astype(np.float32)


# ══════════════════════════════════════════════════════════════════════════════
# 3. PYTORCH AUTOENCODER MODEL
# ══════════════════════════════════════════════════════════════════════════════

if _HAS_TORCH:
    class LedgerAutoencoder(nn.Module):
        """Deep neural network that learns normal transaction mappings."""

        def __init__(self, input_dim: int) -> None:
            super().__init__()
            self.encoder = nn.Sequential(
                nn.Linear(input_dim, 64),
                nn.BatchNorm1d(64),
                nn.ReLU(),
                nn.Linear(64, 32),
                nn.BatchNorm1d(32),
                nn.ReLU(),
                nn.Linear(32, 16),
                nn.BatchNorm1d(16),
                nn.ReLU(),
            )
            self.decoder = nn.Sequential(
                nn.Linear(16, 32),
                nn.BatchNorm1d(32),
                nn.ReLU(),
                nn.Linear(32, 64),
                nn.BatchNorm1d(64),
                nn.ReLU(),
                nn.Linear(64, input_dim),
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.decoder(self.encoder(x))

        def reconstruction_loss(self, x: torch.Tensor) -> torch.Tensor:
            x_hat = self.forward(x)
            return torch.mean((x - x_hat) ** 2, dim=1)

        def feature_wise_error(self, x: torch.Tensor) -> torch.Tensor:
            x_hat = self.forward(x)
            return (x - x_hat) ** 2


# ══════════════════════════════════════════════════════════════════════════════
# 4. HYBRID ANOMALY SCANNERS
# ══════════════════════════════════════════════════════════════════════════════

class HybridAnomalyDetector:
    """Fuses deep reconstruction models with isolation path metrics."""

    def __init__(self, ae_epochs: int = 40, ae_batch_size: int = 128) -> None:
        self.ae_epochs = ae_epochs
        self.ae_batch_size = ae_batch_size
        self.preprocessor = LedgerPreprocessor()
        self.autoencoder = None
        self.isolation_forest = None
        self.device = torch.device("cpu") if _HAS_TORCH else None

        self._ae_loss_min = 0.0
        self._ae_loss_max = 1.0
        self._if_score_min = 0.0
        self._if_score_max = 1.0
        self._ae_threshold_tau = float("inf")
        self._is_trained = False

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    def train(self, df: pd.DataFrame, epochs: Optional[int] = None) -> Dict[str, Any]:
        if epochs is not None:
            self.ae_epochs = epochs

        X = self.preprocessor.fit(df).transform(df)
        n_samples, n_features = X.shape

        # Train Autoencoder
        if _HAS_TORCH:
            self.autoencoder = LedgerAutoencoder(n_features)
            optimizer = torch.optim.Adam(self.autoencoder.parameters(), lr=1e-3)
            dataset = TensorDataset(torch.tensor(X, dtype=torch.float32))
            loader = DataLoader(dataset, batch_size=self.ae_batch_size, shuffle=True)

            self.autoencoder.train()
            for epoch in range(self.ae_epochs):
                for (batch,) in loader:
                    optimizer.zero_grad()
                    loss = torch.mean(self.autoencoder.reconstruction_loss(batch))
                    loss.backward()
                    optimizer.step()
            self.autoencoder.eval()

            with torch.no_grad():
                ae_losses = self.autoencoder.reconstruction_loss(torch.tensor(X, dtype=torch.float32)).numpy()
            self._ae_loss_min = float(ae_losses.min())
            self._ae_loss_max = float(ae_losses.max())
            self._ae_threshold_tau = float(np.percentile(ae_losses, 97.0))

        # Train Isolation Forest
        self.isolation_forest = IsolationForest(n_estimators=150, contamination=0.02, random_state=42)
        self.isolation_forest.fit(X)

        if_scores = self.isolation_forest.decision_function(X)
        self._if_score_min = float(if_scores.min())
        self._if_score_max = float(if_scores.max())

        self._is_trained = True
        return {
            "is_trained": True,
            "num_training_samples": n_samples,
            "threshold_tau": self._ae_threshold_tau,
        }

    def save(self, model_dir: str) -> None:
        import os
        import json
        from pathlib import Path
        
        dir_path = Path(model_dir)
        dir_path.mkdir(parents=True, exist_ok=True)
        
        # Save preprocessor
        joblib.dump(self.preprocessor, dir_path / "ledger_preprocessor.pkl")
        
        # Save IsolationForest
        joblib.dump(self.isolation_forest, dir_path / "isolation_forest.pkl")
        
        # Save PyTorch Autoencoder state dict
        if _HAS_TORCH and self.autoencoder is not None:
            torch.save(
                {
                    "state_dict": self.autoencoder.state_dict(),
                    "input_dim": self.autoencoder.input_dim,
                },
                dir_path / "autoencoder.pt",
            )
            
        # Save calibration metadata as JSON
        meta = {
            "ae_threshold_tau": self._ae_threshold_tau,
            "ae_loss_min": self._ae_loss_min,
            "ae_loss_max": self._ae_loss_max,
            "if_score_min": self._if_score_min,
            "if_score_max": self._if_score_max,
            "is_trained": self._is_trained,
        }
        with open(dir_path / "calibration_meta.json", "w") as f:
            json.dump(meta, f, indent=2)

    def load(self, model_dir: str) -> None:
        import os
        import json
        from pathlib import Path
        
        dir_path = Path(model_dir)
        if not (dir_path / "calibration_meta.json").exists():
            raise FileNotFoundError(f"No calibration meta found in {model_dir}")
            
        self.preprocessor = joblib.load(dir_path / "ledger_preprocessor.pkl")
        self.isolation_forest = joblib.load(dir_path / "isolation_forest.pkl")
        
        with open(dir_path / "calibration_meta.json") as f:
            meta = json.load(f)
            
        self._ae_threshold_tau = meta["ae_threshold_tau"]
        self._ae_loss_min = meta["ae_loss_min"]
        self._ae_loss_max = meta["ae_loss_max"]
        self._if_score_min = meta["if_score_min"]
        self._if_score_max = meta["if_score_max"]
        self._is_trained = meta.get("is_trained", True)
        
        ae_path = dir_path / "autoencoder.pt"
        if _HAS_TORCH and ae_path.exists():
            checkpoint = torch.load(ae_path, map_location="cpu")
            input_dim = checkpoint["input_dim"]
            self.autoencoder = LedgerAutoencoder(input_dim=input_dim)
            self.autoencoder.load_state_dict(checkpoint["state_dict"])
            self.autoencoder.eval()

    def predict_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        return self.audit(df)

    def audit(self, df: pd.DataFrame, risk_threshold: float = 0.65) -> List[Dict[str, Any]]:
        if not self._is_trained:
            raise RuntimeError("Model is not trained.")

        X = self.preprocessor.transform(df)
        n_samples = len(X)

        # AE scoring
        if _HAS_TORCH and self.autoencoder:
            with torch.no_grad():
                ae_losses = self.autoencoder.reconstruction_loss(torch.tensor(X, dtype=torch.float32)).numpy()
            ae_norm = np.clip((ae_losses - self._ae_loss_min) / max(self._ae_loss_max - self._ae_loss_min, 1e-8), 0.0, 1.0)
        else:
            ae_losses = np.zeros(n_samples)
            ae_norm = np.zeros(n_samples)

        # IF scoring
        if_scores = self.isolation_forest.decision_function(X)
        if_norm = np.clip((if_scores - self._if_score_min) / max(self._if_score_max - self._if_score_min, 1e-8), 0.0, 1.0)
        if_norm = 1.0 - if_norm  # higher = anomaly

        # Fused scoring
        risk_scores = 0.6 * ae_norm + 0.4 * if_norm

        results = []
        feature_names = self.preprocessor._feature_names

        # Feature errors for explainability
        if _HAS_TORCH and self.autoencoder:
            with torch.no_grad():
                ae_errors = self.autoencoder.feature_wise_error(torch.tensor(X, dtype=torch.float32)).numpy()
        else:
            ae_errors = None

        for idx in range(n_samples):
            txn_id = str(df.iloc[idx].get("transaction_id", f"row_{idx}"))
            risk = float(risk_scores[idx])
            is_flagged = risk > risk_threshold

            flag_reasons = []
            attributions = {}

            if is_flagged:
                # Explain with AE features
                if ae_errors is not None and ae_norm[idx] > 0.5:
                    row_err = ae_errors[idx]
                    total_err = np.sum(row_err) + 1e-9
                    for fname, val in zip(feature_names, row_err):
                        attributions[fname] = float(val / total_err)

                    top_f_idx = int(np.argmax(row_err))
                    top_f = feature_names[top_f_idx]
                    flag_reasons.append(f"Reconstruction outlier driven by: {top_f} ({attributions[top_f]*100:.1f}%)")

                # Explain with IF perturbations
                if if_norm[idx] > 0.5:
                    x_row = X[idx:idx+1].copy()
                    base = self.isolation_forest.decision_function(x_row)[0]
                    deltas = []
                    for f_idx, fname in enumerate(feature_names):
                        x_pert = x_row.copy()
                        x_pert[0, f_idx] = 0.0
                        pert = self.isolation_forest.decision_function(x_pert)[0]
                        deltas.append((fname, abs(base - pert)))
                    deltas.sort(key=lambda x: x[1], reverse=True)
                    top_f_if, delta = deltas[0]
                    flag_reasons.append(f"Isolation partition outlier: {top_f_if} (path delta: {delta:.4f})")
                    for fname, val in deltas:
                        if fname not in attributions:
                            attributions[fname] = float(val)

                if not flag_reasons:
                    flag_reasons.append(f"High risk score {risk:.2f} (AE:{ae_norm[idx]:.2f}, IF:{if_norm[idx]:.2f})")

            results.append({
                "transaction_id": txn_id,
                "risk_score": risk,
                "is_flagged": is_flagged,
                "ae_loss": float(ae_losses[idx]),
                "if_score": float(if_scores[idx]),
                "ae_norm": float(ae_norm[idx]),
                "if_norm": float(if_norm[idx]),
                "flag_reasons": flag_reasons,
                "feature_attributions": attributions,
            })
        return results
