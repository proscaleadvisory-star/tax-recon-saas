"""
ledger_api.py
=============
Pre-Close Ledger Auditor — FastAPI Sub-Application

Endpoints:
    POST /audit/train   — Upload CSV baseline, train Autoencoder + IsolationForest
    POST /audit/run     — Submit pending ledger entries, receive risk scores + explanations
    GET  /audit/status  — Model training status, thresholds, calibration metadata

Security Note:
    In production, endpoints should be secured with JWT/OAuth2. The tenant_id
    field provides logical data isolation when routing to a multi-tenant DB.
"""

from __future__ import annotations

import io
import logging
import threading
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ledger_models import (
    REQUIRED_COLUMNS,
    PreCloseLedgerAuditor,
    SchemaValidationError,
    ModelNotTrainedError,
)

logger = logging.getLogger("ledger-api")

# ── Global auditor singleton ───────────────────────────────────────────────────
# Single shared instance — thread-safe training lock prevents concurrent train calls
_auditor: Optional[PreCloseLedgerAuditor] = None
_train_lock = threading.Lock()
_training_in_progress: bool = False

router = APIRouter(
    prefix="/api/v1/audit",
    tags=["Pre-Close Ledger Auditor"],
)


def _get_auditor() -> PreCloseLedgerAuditor:
    """
    Return the global auditor instance.
    Attempts to load persisted artifacts on first access;
    falls back to an untrained instance if no artifacts exist.
    """
    global _auditor
    if _auditor is None:
        try:
            _auditor = PreCloseLedgerAuditor.load_artifacts()
            logger.info("Loaded pre-trained auditor from disk artifacts.")
        except FileNotFoundError:
            _auditor = PreCloseLedgerAuditor()
            logger.info("No pre-trained artifacts found. Auditor awaiting training.")
    return _auditor


# ══════════════════════════════════════════════════════════════════════════════
# REQUEST / RESPONSE SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class LedgerEntryInput(BaseModel):
    """Single ledger entry for audit submission."""
    transaction_id: str = Field(..., description="Unique transaction identifier")
    amount: float = Field(..., description="Transaction amount in base currency")
    vendor_id: str = Field(..., description="Vendor identifier (AP system ID)")
    account_id: str = Field(..., description="GL account code (e.g., '5100')")
    cost_center: str = Field(..., description="Cost center code (e.g., 'CC-OPS')")
    posting_timestamp: str = Field(..., description="ISO 8601 timestamp of the journal posting")

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v


class AuditBatchRequest(BaseModel):
    """Batch of pending ledger entries to audit before period close."""
    entries: List[LedgerEntryInput] = Field(
        ..., min_length=1, max_length=50_000,
        description="Batch of pending journal entries (1 to 50,000)"
    )
    tenant_id: Optional[str] = Field(None, description="Tenant identifier for multi-tenant deployments")


class FeatureAttribution(BaseModel):
    feature: str
    contribution_pct: float


class AuditRowResult(BaseModel):
    """Audit result for a single ledger entry."""
    transaction_id: str
    risk_score: float = Field(..., description="Unified risk score R(x) ∈ [0, 1]")
    is_flagged: bool = Field(..., description="True if risk_score > 0.75 threshold")
    ae_loss: float = Field(..., description="Autoencoder reconstruction loss (raw)")
    if_score: float = Field(..., description="IsolationForest decision score (raw)")
    ae_norm: float = Field(..., description="Normalised AE score ∈ [0, 1]")
    if_norm: float = Field(..., description="Normalised IF score ∈ [0, 1]")
    flag_reasons: List[str] = Field(default_factory=list, description="Human-readable audit reasons")
    feature_attributions: Dict[str, float] = Field(
        default_factory=dict,
        description="Per-feature contribution percentages to anomaly score"
    )


class AuditBatchResponse(BaseModel):
    status: str
    total_entries: int
    flagged_count: int
    flag_rate_pct: float
    results: List[AuditRowResult]


class TrainResponse(BaseModel):
    status: str
    message: str
    n_samples_trained: int
    ae_threshold_tau: float
    ae_final_loss: Optional[float]
    if_contamination: float
    train_timestamp: Optional[str]
    n_features: int


class AuditorStatusResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    is_trained: bool
    train_timestamp: Optional[str]
    ae_threshold_tau: float
    risk_threshold: float
    fusion_weights: Dict[str, float]
    model_dir: str
    n_samples: Optional[int] = None
    n_features: Optional[int] = None
    ae_final_loss: Optional[float] = None
    ae_convergence_ratio: Optional[float] = None


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/train", response_model=TrainResponse)
async def train_model(file: UploadFile = File(...)):
    """
    **Train the Pre-Close Ledger Auditor on historical baseline data.**

    Accepts a CSV file with the following required columns:
        transaction_id, amount, vendor_id, account_id, cost_center, posting_timestamp

    The uploaded data should represent a clean historical baseline
    (predominantly normal transactions). Training will:
    1. Fit the LedgerPreprocessor (imputation + scaling + encoding)
    2. Train the PyTorch Autoencoder (50 epochs, Adam optimiser)
    3. Set dynamic AE threshold τ at 97th percentile of training losses
    4. Fit the IsolationForest ensemble (200 trees)
    5. Calibrate Min-Max normalisation bounds for score fusion
    6. Persist all artifacts to MODEL_DIR for subsequent audit calls

    **Note:** This endpoint is synchronous and may take 30–120 seconds for large datasets.
    Use GET /audit/status to check training state.
    """
    global _auditor, _training_in_progress

    if _training_in_progress:
        raise HTTPException(
            status_code=409,
            detail="Training already in progress. Please wait until current training completes."
        )

    # ── Read and validate CSV ─────────────────────────────────────────────────
    if not file.filename.endswith((".csv", ".CSV")):
        raise HTTPException(
            status_code=422,
            detail="Only CSV files are accepted. Please upload a .csv file."
        )

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse CSV: {str(e)}"
        )

    # Schema validation
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=422,
            detail=(
                f"CSV is missing required columns: {missing_cols}. "
                f"Required: {REQUIRED_COLUMNS}. Found: {list(df.columns)}"
            )
        )

    if len(df) < 100:
        raise HTTPException(
            status_code=422,
            detail=f"Training requires at least 100 samples. Received: {len(df)}"
        )

    # ── Train ─────────────────────────────────────────────────────────────────
    with _train_lock:
        _training_in_progress = True
        try:
            logger.info(f"Starting training on {len(df)} samples from '{file.filename}'")
            _auditor = PreCloseLedgerAuditor(ae_epochs=50, if_n_estimators=200)
            metrics = _auditor.train(df)
        except SchemaValidationError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            logger.error(f"Training failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")
        finally:
            _training_in_progress = False

    return TrainResponse(
        status="success",
        message=f"Model trained successfully on {metrics['n_samples']:,} samples.",
        n_samples_trained=metrics["n_samples"],
        ae_threshold_tau=metrics.get("ae_threshold_tau", 0.0),
        ae_final_loss=metrics.get("ae_final_loss"),
        if_contamination=_auditor.if_contamination,
        train_timestamp=metrics.get("train_timestamp"),
        n_features=metrics.get("n_features", 0),
    )


@router.post("/run", response_model=AuditBatchResponse)
async def run_audit(request: AuditBatchRequest):
    """
    **Run the Pre-Close Audit pipeline on a batch of pending ledger entries.**

    Accepts a JSON batch of up to 50,000 pending journal entries and returns:
    - `risk_score`: Unified R(x) ∈ [0, 1]  (higher = more anomalous)
    - `is_flagged`: True if R(x) > 0.75
    - `flag_reasons`: List of human-readable explanations for each flagged row
    - `feature_attributions`: Per-feature % contribution to anomaly score

    **Mathematical basis:**
    - AE subsystem: MSE reconstruction loss, normalised by training bounds
    - IF subsystem: Isolation path length score, normalised and inverted
    - Fusion: R(x) = 0.6 · Norm(AE) + 0.4 · Norm(IF)

    **Prerequisites:** POST /audit/train must be called first.
    """
    auditor = _get_auditor()

    if not auditor.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Model has not been trained yet. Call POST /audit/train first."
        )

    # Convert request entries to DataFrame
    rows = [entry.dict() for entry in request.entries]
    df = pd.DataFrame(rows)

    try:
        raw_results = auditor.audit(df)
    except SchemaValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ModelNotTrainedError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Audit pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Audit pipeline error: {str(e)}")

    # Build typed response
    results = [AuditRowResult(**r) for r in raw_results]
    flagged_count = sum(1 for r in results if r.is_flagged)
    total = len(results)

    return AuditBatchResponse(
        status="success",
        total_entries=total,
        flagged_count=flagged_count,
        flag_rate_pct=round(flagged_count / total * 100, 2) if total > 0 else 0.0,
        results=results,
    )


@router.get("/status", response_model=AuditorStatusResponse)
async def get_status():
    """
    **Get current auditor model status, calibration thresholds, and training metadata.**

    Returns whether the model is trained, the dynamic AE threshold τ,
    the risk threshold (0.75), fusion weights, and training metrics.
    """
    auditor = _get_auditor()
    status = auditor.status

    return AuditorStatusResponse(
        is_trained=status["is_trained"],
        train_timestamp=status.get("train_timestamp"),
        ae_threshold_tau=status.get("ae_threshold_tau", 0.0),
        risk_threshold=status["risk_threshold"],
        fusion_weights=status["fusion_weights"],
        model_dir=status["model_dir"],
        n_samples=status.get("n_samples"),
        n_features=status.get("n_features"),
        ae_final_loss=status.get("ae_final_loss"),
        ae_convergence_ratio=status.get("ae_convergence_ratio"),
    )


@router.post("/generate-sample-csv")
async def generate_sample_csv():
    """
    **Generate a sample CSV with synthetic ledger data for testing.**

    Returns a JSON payload with a sample of the expected CSV format and
    the column schema. Use this to understand the required input format
    for POST /audit/train and POST /audit/run.
    """
    try:
        from ledger_generator import generate_training_data
        sample = generate_training_data(n_normal=5)
        sample_rows = sample.head(5).to_dict(orient="records")
        # Convert timestamps to strings for JSON serialisation
        for row in sample_rows:
            if hasattr(row.get("posting_timestamp"), "isoformat"):
                row["posting_timestamp"] = row["posting_timestamp"].isoformat()

        return {
            "status": "success",
            "required_columns": REQUIRED_COLUMNS,
            "sample_rows": sample_rows,
            "notes": {
                "transaction_id": "Unique ID string per transaction",
                "amount": "Positive float, transaction amount in base currency",
                "vendor_id": "Vendor identifier string (e.g., 'VND-0001')",
                "account_id": "GL account code (e.g., '5100', '4200')",
                "cost_center": "Cost center code (e.g., 'CC-SALES', 'CC-OPS')",
                "posting_timestamp": "ISO 8601 datetime string (e.g., '2024-03-15T14:30:00')",
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
