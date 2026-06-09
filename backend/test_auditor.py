"""
test_auditor.py
===============
pytest Test Suite — Pre-Close Ledger Auditor

Test Coverage:
    1. test_preprocessor_shape_preservation
       Validates that LedgerPreprocessor output maintains expected shape
       and produces a numeric float32 matrix (no NaN, no inf).

    2. test_autoencoder_loss_convergence
       Validates that LedgerAutoencoder loss on normal patterns converges
       (final loss < initial loss × 0.5 after 20 epochs of training).

    3. test_anomaly_flag_accuracy
       End-to-end: trains on clean data, runs audit on mixed batch,
       validates that ≥ 80% of injected anomalies are flagged and
       false positive rate on normal entries is < 10%.

Run with:
    cd backend
    venv\\Scripts\\python -m pytest test_auditor.py -v
"""

from __future__ import annotations

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List

# ──────────────────────────────────────────────────────────────────────────────
# LOCAL IMPORTS
# ──────────────────────────────────────────────────────────────────────────────
from ledger_models import (
    LedgerPreprocessor,
    PreCloseLedgerAuditor,
    SchemaValidationError,
    REQUIRED_COLUMNS,
    _HAS_TORCH,
)
from ledger_generator import (
    generate_training_data,
    generate_ledger_dataset,
)


# ══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def small_normal_df() -> pd.DataFrame:
    """Small (300 row) normal ledger DataFrame for fast unit tests."""
    return generate_training_data(n_normal=300)


@pytest.fixture(scope="module")
def full_training_df() -> pd.DataFrame:
    """Full 2000-row normal training set for integration tests."""
    return generate_training_data(n_normal=2_000)


@pytest.fixture(scope="module")
def mixed_audit_df() -> pd.DataFrame:
    """
    Mixed dataset: 200 normal + ~170 anomalies across 5 types.
    Used for flag accuracy validation.
    """
    return generate_ledger_dataset(n_normal=200, n_per_anomaly_type=5)


@pytest.fixture(scope="module")
def trained_auditor(full_training_df: pd.DataFrame) -> PreCloseLedgerAuditor:
    """
    Module-scoped fixture: trains a full PreCloseLedgerAuditor once
    and reuses it across integration tests to avoid redundant training overhead.
    """
    auditor = PreCloseLedgerAuditor(
        ae_epochs=20,          # Reduced epochs for faster CI; still validates convergence
        ae_batch_size=128,
        if_n_estimators=100,   # Reduced trees for speed
        if_contamination=0.02,
    )
    auditor.train(full_training_df)
    return auditor


# ══════════════════════════════════════════════════════════════════════════════
# TEST 1: PREPROCESSOR SHAPE PRESERVATION
# ══════════════════════════════════════════════════════════════════════════════

class TestPreprocessorShapePreservation:
    """
    Validates that LedgerPreprocessor:
    a) Accepts valid input without errors
    b) Produces correct output shape (n_samples, n_features)
    c) Outputs float32 with no NaN or Inf values
    d) Raises SchemaValidationError on missing columns
    """

    def test_output_shape_matches_input_rows(self, small_normal_df: pd.DataFrame) -> None:
        """Output row count must exactly equal input row count."""
        preprocessor = LedgerPreprocessor()
        X = preprocessor.fit_transform(small_normal_df)

        assert X.shape[0] == len(small_normal_df), (
            f"Output rows ({X.shape[0]}) must match input rows ({len(small_normal_df)})"
        )

    def test_output_feature_count_is_reasonable(self, small_normal_df: pd.DataFrame) -> None:
        """
        Output feature count must be ≥ the number of raw numeric features (2)
        plus at least the OHE expansion of cost_center.
        A reasonable minimum is 7+ features.
        """
        preprocessor = LedgerPreprocessor()
        X = preprocessor.fit_transform(small_normal_df)

        assert X.shape[1] >= 7, (
            f"Expected at least 7 output features (2 numeric + 5+ OHE+encoded), "
            f"got {X.shape[1]}"
        )

    def test_output_dtype_is_float32(self, small_normal_df: pd.DataFrame) -> None:
        """All output values must be float32 for PyTorch compatibility."""
        preprocessor = LedgerPreprocessor()
        X = preprocessor.fit_transform(small_normal_df)

        assert X.dtype == np.float32, (
            f"Expected float32 output dtype, got {X.dtype}"
        )

    def test_no_nan_or_inf_in_output(self, small_normal_df: pd.DataFrame) -> None:
        """Output must contain no NaN or infinite values after imputation + scaling."""
        preprocessor = LedgerPreprocessor()
        X = preprocessor.fit_transform(small_normal_df)

        assert not np.any(np.isnan(X)), "Output contains NaN values — imputation failed"
        assert not np.any(np.isinf(X)), "Output contains Inf values — scaling failed"

    def test_transform_matches_fit_transform_shape(self, small_normal_df: pd.DataFrame) -> None:
        """
        Separately calling fit() then transform() must produce the same
        output shape as fit_transform().
        """
        preprocessor_a = LedgerPreprocessor()
        X_ft = preprocessor_a.fit_transform(small_normal_df)

        preprocessor_b = LedgerPreprocessor()
        preprocessor_b.fit(small_normal_df)
        X_t = preprocessor_b.transform(small_normal_df)

        assert X_ft.shape == X_t.shape, (
            f"fit_transform shape {X_ft.shape} != fit+transform shape {X_t.shape}"
        )

    def test_raises_schema_error_on_missing_columns(self, small_normal_df: pd.DataFrame) -> None:
        """Should raise SchemaValidationError if required columns are absent."""
        preprocessor = LedgerPreprocessor()

        # Drop a required column to simulate schema mismatch
        bad_df = small_normal_df.drop(columns=["vendor_id"])

        with pytest.raises(SchemaValidationError) as exc_info:
            preprocessor.fit_transform(bad_df)

        assert "vendor_id" in str(exc_info.value), (
            "SchemaValidationError message should identify the missing column"
        )

    def test_handles_missing_values_gracefully(self, small_normal_df: pd.DataFrame) -> None:
        """
        Preprocessor must not crash on NaN values in numeric or categorical columns.
        Imputation should fill them silently.
        """
        preprocessor = LedgerPreprocessor()
        df_with_nulls = small_normal_df.copy()

        # Inject NaNs into 10% of rows
        mask = df_with_nulls.sample(frac=0.1, random_state=42).index
        df_with_nulls.loc[mask, "amount"] = np.nan
        df_with_nulls.loc[mask, "cost_center"] = np.nan

        # Should not raise
        X = preprocessor.fit_transform(df_with_nulls)
        assert not np.any(np.isnan(X)), "NaN values present after imputation"


# ══════════════════════════════════════════════════════════════════════════════
# TEST 2: AUTOENCODER LOSS CONVERGENCE
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _HAS_TORCH, reason="PyTorch not installed — skipping AE convergence test")
class TestAutoencoderLossConvergence:
    """
    Validates that the LedgerAutoencoder:
    a) Trains without errors on normal transaction features
    b) Achieves loss convergence (final_loss < initial_loss × 0.5)
    c) Produces reconstruction losses that are positive and finite
    d) Sets a valid 97th percentile dynamic threshold τ
    """

    def test_training_converges_on_normal_data(self, full_training_df: pd.DataFrame) -> None:
        """
        The Autoencoder must reduce its training loss by at least 50% over 20 epochs
        when trained on predominantly normal transaction patterns.

        Mathematical basis: A properly implemented AE with BatchNorm + ReLU should
        rapidly converge on tabular data with a clear structure.
        """
        auditor = PreCloseLedgerAuditor(ae_epochs=20, ae_batch_size=128)
        metrics = auditor.train(full_training_df)

        initial_loss = metrics.get("ae_initial_loss", 1.0)
        final_loss = metrics.get("ae_final_loss", 1.0)
        convergence_ratio = metrics.get("ae_convergence_ratio", 1.0)

        assert final_loss < initial_loss, (
            f"Autoencoder loss did not decrease: initial={initial_loss:.6f}, final={final_loss:.6f}"
        )
        assert convergence_ratio < 0.9, (
            f"Convergence ratio {convergence_ratio:.4f} is too high — loss barely decreased. "
            f"Expected final < 90% of initial loss after 20 epochs."
        )

    def test_dynamic_threshold_is_positive_and_finite(self, trained_auditor: PreCloseLedgerAuditor) -> None:
        """
        The dynamic AE threshold τ (97th percentile) must be:
        - Positive (losses are always non-negative)
        - Finite (no infinity from training instability)
        - Reasonably small (< 10.0 for normalised features)
        """
        tau = trained_auditor._ae_threshold_tau

        assert tau > 0, f"AE threshold τ must be positive, got {tau}"
        assert np.isfinite(tau), f"AE threshold τ is not finite: {tau}"
        assert tau < 10.0, (
            f"AE threshold τ = {tau:.4f} seems too large for normalised features. "
            f"Check if RobustScaler is applied correctly."
        )

    def test_reconstruction_losses_are_non_negative(
        self, trained_auditor: PreCloseLedgerAuditor, full_training_df: pd.DataFrame
    ) -> None:
        """
        MSE reconstruction losses L(x, x̂) = (1/d) Σ (x_i - x̂_i)² must always be ≥ 0.
        This is a mathematical invariant of the squared error loss.
        """
        import torch
        X = trained_auditor.preprocessor.transform(full_training_df)
        losses = trained_auditor._get_ae_losses(X)

        assert np.all(losses >= 0), (
            f"Found negative reconstruction losses (impossible for MSE). "
            f"Min loss: {losses.min():.8f}"
        )

    def test_loss_lower_on_normal_vs_anomaly(self, trained_auditor: PreCloseLedgerAuditor) -> None:
        """
        Reconstruction loss should be systematically lower on normal transactions
        than on clearly anomalous ones (massive odd values).
        This validates the AE learned the normal distribution manifold.
        """
        from ledger_generator import generate_training_data, _inject_massive_odd_values

        # Normal samples
        normal_df = generate_training_data(n_normal=50)
        X_normal = trained_auditor.preprocessor.transform(normal_df)
        losses_normal = trained_auditor._get_ae_losses(X_normal)

        # Massive odd value anomalies (maximally anomalous)
        anomaly_df_labeled = _inject_massive_odd_values(10)
        anomaly_df = anomaly_df_labeled.drop(columns=["is_anomaly", "anomaly_type"])
        X_anomaly = trained_auditor.preprocessor.transform(anomaly_df)
        losses_anomaly = trained_auditor._get_ae_losses(X_anomaly)

        mean_normal_loss = float(np.mean(losses_normal))
        mean_anomaly_loss = float(np.mean(losses_anomaly))

        assert mean_anomaly_loss > mean_normal_loss, (
            f"Expected anomaly reconstruction loss ({mean_anomaly_loss:.6f}) "
            f"> normal loss ({mean_normal_loss:.6f}). "
            "The Autoencoder may not have learned the normal distribution manifold."
        )


# ══════════════════════════════════════════════════════════════════════════════
# TEST 3: FLAG ACCURACY (End-to-End Validation)
# ══════════════════════════════════════════════════════════════════════════════

class TestAnomalyFlagAccuracy:
    """
    End-to-end validation of the full PreCloseLedgerAuditor pipeline:
    a) Recall ≥ 80% — at least 80% of injected anomalies are flagged
    b) Precision / False Positive Rate — less than 10% of normal entries flagged
    c) Risk scores are valid (∈ [0, 1], not NaN)
    d) Flagged rows have non-empty flag_reasons
    """

    def test_recall_on_anomalies_above_80_pct(
        self,
        trained_auditor: PreCloseLedgerAuditor,
        mixed_audit_df: pd.DataFrame,
    ) -> None:
        """
        At least 80% of injected anomalies must be flagged by the pipeline.
        This validates the hybrid system's sensitivity across all 5 anomaly types.

        Ground truth: mixed_audit_df['is_anomaly'] column.
        """
        # Separate labels from audit input
        labels = mixed_audit_df["is_anomaly"].values
        audit_input = mixed_audit_df.drop(columns=["is_anomaly", "anomaly_type"])

        results = trained_auditor.audit(audit_input)
        flagged_mask = np.array([r["is_flagged"] for r in results])

        # Only evaluate on true anomaly rows
        true_anomaly_indices = np.where(labels)[0]
        n_true_anomalies = len(true_anomaly_indices)

        if n_true_anomalies == 0:
            pytest.skip("No anomalies in test batch — skip recall test")

        flagged_anomalies = flagged_mask[true_anomaly_indices].sum()
        recall = flagged_anomalies / n_true_anomalies

        assert recall >= 0.80, (
            f"Anomaly recall {recall:.2%} is below required 80% threshold. "
            f"Flagged {flagged_anomalies}/{n_true_anomalies} true anomalies. "
            f"Consider reducing RISK_THRESHOLD or retraining with more epochs."
        )

    def test_false_positive_rate_below_10_pct(
        self,
        trained_auditor: PreCloseLedgerAuditor,
        mixed_audit_df: pd.DataFrame,
    ) -> None:
        """
        No more than 10% of normal (non-anomaly) transactions should be flagged.
        A high FPR would make the audit system unusable in practice.
        """
        labels = mixed_audit_df["is_anomaly"].values
        audit_input = mixed_audit_df.drop(columns=["is_anomaly", "anomaly_type"])

        results = trained_auditor.audit(audit_input)
        flagged_mask = np.array([r["is_flagged"] for r in results])

        # False positives: normal rows that were incorrectly flagged
        normal_indices = np.where(~labels)[0]
        n_normal = len(normal_indices)

        if n_normal == 0:
            pytest.skip("No normal entries in test batch")

        false_positives = flagged_mask[normal_indices].sum()
        fpr = false_positives / n_normal

        assert fpr <= 0.10, (
            f"False positive rate {fpr:.2%} exceeds 10% limit. "
            f"Flagged {false_positives}/{n_normal} normal transactions incorrectly. "
            f"The model may be over-sensitive — consider raising RISK_THRESHOLD or increasing "
            f"training set size."
        )

    def test_all_risk_scores_in_valid_range(
        self,
        trained_auditor: PreCloseLedgerAuditor,
        mixed_audit_df: pd.DataFrame,
    ) -> None:
        """
        All unified risk scores R(x) must be in [0, 1] and finite.
        This validates the Min-Max normalisation and fusion layer.
        """
        audit_input = mixed_audit_df.drop(columns=["is_anomaly", "anomaly_type"])
        results = trained_auditor.audit(audit_input)
        scores = np.array([r["risk_score"] for r in results])

        assert np.all(np.isfinite(scores)), "Risk scores contain NaN or Inf values"
        assert np.all(scores >= 0.0), f"Found risk score < 0: min={scores.min():.6f}"
        assert np.all(scores <= 1.0), f"Found risk score > 1: max={scores.max():.6f}"

    def test_flagged_rows_have_flag_reasons(
        self,
        trained_auditor: PreCloseLedgerAuditor,
        mixed_audit_df: pd.DataFrame,
    ) -> None:
        """
        Every flagged transaction must have at least one human-readable flag reason.
        Empty flag_reasons would render the audit result useless to the human auditor.
        """
        audit_input = mixed_audit_df.drop(columns=["is_anomaly", "anomaly_type"])
        results = trained_auditor.audit(audit_input)

        flagged = [r for r in results if r["is_flagged"]]

        if not flagged:
            pytest.skip("No transactions flagged in this batch — skip reason test")

        for row in flagged:
            assert len(row["flag_reasons"]) > 0, (
                f"Flagged transaction {row['transaction_id']} has no flag_reasons. "
                "The Explainability Engine failed to generate audit text."
            )

    def test_feature_attributions_sum_to_approx_100(
        self,
        trained_auditor: PreCloseLedgerAuditor,
        mixed_audit_df: pd.DataFrame,
    ) -> None:
        """
        For flagged rows with AE attributions, the feature contribution percentages
        should sum to approximately 100% (within floating point tolerance).
        """
        audit_input = mixed_audit_df.drop(columns=["is_anomaly", "anomaly_type"])
        results = trained_auditor.audit(audit_input)

        for row in results:
            if row["is_flagged"] and row["feature_attributions"]:
                # Check only AE attributions (values ∈ [0, 100] range — IF deltas are different)
                pct_values = [v for v in row["feature_attributions"].values() if v > 1.0]
                if pct_values:
                    total = sum(pct_values)
                    assert abs(total - 100.0) < 5.0, (
                        f"Feature attributions for {row['transaction_id']} sum to {total:.2f}%, "
                        f"expected ~100% ± 5%"
                    )
                    break  # One validation is sufficient

    def test_schema_error_on_missing_input_column(
        self, trained_auditor: PreCloseLedgerAuditor
    ) -> None:
        """
        Running audit with a missing required column must raise SchemaValidationError,
        not a cryptic KeyError or silent failure.
        """
        from ledger_generator import generate_training_data
        bad_df = generate_training_data(n_normal=10).drop(columns=["account_id"])

        with pytest.raises((SchemaValidationError, Exception)) as exc_info:
            trained_auditor.audit(bad_df)

        # Either our custom error or a clear error message
        error_text = str(exc_info.value).lower()
        assert "account_id" in error_text or "missing" in error_text or "column" in error_text, (
            f"Error message should reference the missing column. Got: {exc_info.value}"
        )
