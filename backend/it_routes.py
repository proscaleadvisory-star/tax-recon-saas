import os
import io
import uuid
import json
import logging
import zipfile
import hashlib
from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any

import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from rapidfuzz import process, fuzz

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=2,
    pool_timeout=30,
    pool_recycle=300,
    pool_pre_ping=True,
    connect_args={"options": "-c statement_timeout=60000"}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

logger = logging.getLogger("it-recon")

router = APIRouter(
    prefix="/api/v1",
    tags=["Income Tax Reconciliation"]
)

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================
class TaxpayerCreate(BaseModel):
    pan: str = Field(..., max_length=10, min_length=10, pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]$")
    legal_name: str
    dob_or_incorp: Optional[str] = None # YYYY-MM-DD
    taxpayer_type: Optional[str] = "Individual" # Individual, HUF, Company, Firm
    locale: Optional[str] = "en"
    tenant_id: str # Supabase User ID

class TaskResolveRequest(BaseModel):
    resolution_note: str
    status: str = "resolved" # resolved, cancelled

class TaskCreateRequest(BaseModel):
    assignee_user_id: Optional[str] = None
    action_type: str # ask_deductor_revision, file_rectification, revise_return, submit_ais_feedback, ignore_informational
    due_date: Optional[str] = None # YYYY-MM-DD

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def mask_pan(pan: str) -> str:
    if len(pan) == 10:
        return f"{pan[:3]}XXXX{pan[7:]}"
    return pan

def calculate_checksum(content: bytes) -> str:
    import hashlib
    return hashlib.sha256(content).hexdigest()

# ============================================================================
# ENDPOINTS
# ============================================================================

# 1. Register or Retrieve Taxpayer
@router.post("/taxpayers")
async def create_taxpayer(req: TaxpayerCreate, db: Session = Depends(get_db)):
    try:
        # Check if already exists
        existing = db.execute(
            text("SELECT id, pan_masked, legal_name, dob_or_incorp, taxpayer_type, locale FROM public.taxpayers WHERE tenant_id = :tid AND pan_masked = :pan"),
            {"tid": req.tenant_id, "pan": mask_pan(req.pan.upper())}
        ).fetchone()

        if existing:
            return {
                "status": "success",
                "message": "Taxpayer profile already exists.",
                "taxpayer": {
                    "id": str(existing[0]),
                    "pan_masked": existing[1],
                    "legal_name": existing[2],
                    "dob_or_incorp": str(existing[3]) if existing[3] else None,
                    "taxpayer_type": existing[4],
                    "locale": existing[5]
                }
            }

        # Insert new
        new_id = str(uuid.uuid4())
        dob = None
        if req.dob_or_incorp:
            dob = datetime.strptime(req.dob_or_incorp, "%Y-%m-%d").date()

        db.execute(
            text("""
                INSERT INTO public.taxpayers (id, tenant_id, pan_masked, legal_name, dob_or_incorp, taxpayer_type, locale)
                VALUES (:id, :tid, :pan, :name, :dob, :type, :locale)
            """),
            {
                "id": new_id,
                "tid": req.tenant_id,
                "pan": mask_pan(req.pan.upper()),
                "name": req.legal_name,
                "dob": dob,
                "type": req.taxpayer_type,
                "locale": req.locale
            }
        )
        
        # Log Audit event
        db.execute(
            text("""
                INSERT INTO public.it_audit_events (tenant_id, actor_user_id, entity_type, entity_id, action)
                VALUES (:tid, :aid, 'taxpayer', :eid, :act)
            """),
            {"tid": req.tenant_id, "aid": req.tenant_id, "eid": new_id, "act": "CREATE_TAXPAYER"}
        )
        
        db.commit()

        return {
            "status": "success",
            "message": "Taxpayer profile created successfully.",
            "taxpayer": {
                "id": new_id,
                "pan_masked": mask_pan(req.pan.upper()),
                "legal_name": req.legal_name,
                "dob_or_incorp": req.dob_or_incorp,
                "taxpayer_type": req.taxpayer_type,
                "locale": req.locale
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create taxpayer: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/taxpayers")
async def list_taxpayers(tenant_id: str = Query(...), db: Session = Depends(get_db)):
    try:
        res = db.execute(
            text("SELECT id, pan_masked, legal_name, dob_or_incorp, taxpayer_type, locale FROM public.taxpayers WHERE tenant_id = :tid"),
            {"tid": tenant_id}
        ).fetchall()

        taxpayers = [
            {
                "id": str(r[0]),
                "pan_masked": r[1],
                "legal_name": r[2],
                "dob_or_incorp": str(r[3]) if r[3] else None,
                "taxpayer_type": r[4],
                "locale": r[5]
            }
            for r in res
        ]
        return taxpayers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. File Ingestion & Parsing
@router.post("/imports")
async def import_document(
    file: UploadFile = File(...),
    taxpayer_id: str = Form(...),
    source_type: str = Form(...), # ais_json, form16_pdf, bank_csv, manual_claims_csv
    db: Session = Depends(get_db)
):
    """
    Ingests official or workbook files and stages their contents in public.source_records.
    """
    if source_type not in ("ais_json", "form16_pdf", "bank_csv", "manual_claims_csv", "form26as_txt"):
        raise HTTPException(status_code=400, detail=f"Unsupported source type: {source_type}")

    content = await file.read()
    checksum = calculate_checksum(content)

    # Resolve tenant_id for audit logging
    tenant_res = db.execute(
        text("SELECT tenant_id FROM public.taxpayers WHERE id = :id"),
        {"id": taxpayer_id}
    ).fetchone()
    if not tenant_res:
        raise HTTPException(status_code=404, detail="Taxpayer profile not found")
    tenant_id = str(tenant_res[0])

    try:
        # Create ImportBatch
        batch_id = str(uuid.uuid4())
        db.execute(
            text("""
                INSERT INTO public.import_batches (id, taxpayer_id, source_type, source_format, filename, checksum, status)
                VALUES (:id, :t_id, :st, :sf, :fn, :cs, 'STAGED')
            """),
            {
                "id": batch_id,
                "t_id": taxpayer_id,
                "st": source_type,
                "sf": "json" if "json" in source_type else ("csv" if "csv" in source_type else ("txt" if "txt" in source_type else "pdf")),
                "fn": file.filename,
                "cs": checksum
            }
        )

        # Create SourceDocument
        doc_id = str(uuid.uuid4())
        db.execute(
            text("""
                INSERT INTO public.source_documents (id, import_batch_id, doc_type, file_uri, parser_version)
                VALUES (:id, :ib_id, :dt, :uri, '1.0.0')
            """),
            {
                "id": doc_id,
                "ib_id": batch_id,
                "dt": source_type.upper().replace("_", " "),
                "uri": f"local://{batch_id}/{file.filename}"
            }
        )

        records_inserted = 0

        # Parser implementations
        if source_type in ("ais_json", "form16_pdf"):
            try:
                data = json.loads(content.decode("utf-8"))
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid JSON format.")

            records = data.get("records", [])
            for idx, r in enumerate(records):
                # Ensure date format is standard
                txn_date_str = r.get("event_date") or r.get("txn_date") or str(date.today())
                try:
                    txn_date = datetime.strptime(txn_date_str, "%Y-%m-%d").date()
                except Exception:
                    txn_date = date.today()

                reported_amt = float(r.get("gross_amount") or r.get("reported_amount") or 0.0)
                tax_amt = float(r.get("tax_amount") or r.get("tax_deducted") or 0.0)

                db.execute(
                    text("""
                        INSERT INTO public.source_records (source_document_id, source_row_id, category, subcategory, txn_date, reported_amount, tax_amount, counterparty_name, counterparty_id, raw_json)
                        VALUES (:sd_id, :row_id, :cat, :subcat, :date, :rep_amt, :tax_amt, :cp_name, :cp_id, :raw)
                    """),
                    {
                        "sd_id": doc_id,
                        "row_id": str(idx),
                        "cat": r.get("category") or ("Salary" if source_type == "form16_pdf" else "Income"),
                        "subcat": r.get("description") or r.get("event_type") or "Tax Transaction",
                        "date": txn_date,
                        "rep_amt": reported_amt,
                        "tax_amt": tax_amt,
                        "cp_name": r.get("counterparty_name"),
                        "cp_id": r.get("counterparty_id"),
                        "raw": json.dumps(r)
                    }
                )
                records_inserted += 1

        elif source_type in ("bank_csv", "manual_claims_csv"):
            # Load CSV into pandas
            df = pd.read_csv(io.BytesIO(content), dtype=str)
            df.columns = [str(c).strip().lower().replace("_", "").replace(" ", "") for c in df.columns]

            for idx, row in df.iterrows():
                # Flexible column extraction
                # Date
                date_val = None
                for col in ("date", "txndate", "transactiondate", "valuedate"):
                    if col in df.columns and pd.notna(row.get(col)):
                        raw_d = str(row.get(col)).strip()
                        # try various formats
                        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
                            try:
                                date_val = datetime.strptime(raw_d, fmt).date()
                                break
                            except Exception:
                                continue
                        if date_val:
                            break
                if not date_val:
                    date_val = date.today()

                # Description / Category
                desc_val = ""
                for col in ("description", "narration", "particulars", "details"):
                    if col in df.columns and pd.notna(row.get(col)):
                        desc_val = str(row.get(col)).strip()
                        break

                category = "Bank Statement"
                if source_type == "manual_claims_csv":
                    category = "Tax Return Claim"
                    for col in ("category", "eventtype", "type"):
                        if col in df.columns and pd.notna(row.get(col)):
                            category = str(row.get(col)).strip()
                            break

                # Gross amount
                gross_amt = 0.0
                for col in ("amount", "grossamount", "reportedamount", "deposit", "credit", "payout"):
                    if col in df.columns and pd.notna(row.get(col)):
                        try:
                            val = str(row.get(col)).replace(",", "").strip()
                            if val:
                                gross_amt = float(val)
                                break
                        except Exception:
                            pass

                # Tax amount
                tax_amt = 0.0
                for col in ("tax", "taxamount", "tds", "taxdeducted"):
                    if col in df.columns and pd.notna(row.get(col)):
                        try:
                            val = str(row.get(col)).replace(",", "").strip()
                            if val:
                                tax_amt = float(val)
                                break
                        except Exception:
                            pass

                # Counterparty
                cp_name = None
                for col in ("counterparty", "counterpartyname", "sender", "employer", "deductor"):
                    if col in df.columns and pd.notna(row.get(col)):
                        cp_name = str(row.get(col)).strip()
                        break

                cp_id = None
                for col in ("counterpartyid", "pan", "tan", "deductorpan", "deductorid"):
                    if col in df.columns and pd.notna(row.get(col)):
                        cp_id = str(row.get(col)).strip()
                        break

                raw_dict = row.fillna("").to_dict()

                db.execute(
                    text("""
                        INSERT INTO public.source_records (source_document_id, source_row_id, category, subcategory, txn_date, reported_amount, tax_amount, counterparty_name, counterparty_id, raw_json)
                        VALUES (:sd_id, :row_id, :cat, :subcat, :date, :rep_amt, :tax_amt, :cp_name, :cp_id, :raw)
                    """),
                    {
                        "sd_id": doc_id,
                        "row_id": str(idx),
                        "cat": category,
                        "subcat": desc_val[:100] if desc_val else "Row Inward",
                        "date": date_val,
                        "rep_amt": gross_amt,
                        "tax_amt": tax_amt,
                        "cp_name": cp_name,
                        "cp_id": cp_id,
                        "raw": json.dumps(raw_dict)
                    }
                )
                records_inserted += 1

        elif source_type == "form26as_txt":
            # Simple text lines parser for Form 26AS text dump
            lines = content.decode("utf-8").split("\n")
            for idx, line in enumerate(lines):
                line_clean = line.strip()
                if not line_clean or len(line_clean) < 10:
                    continue
                # Mock parser: extract values if line looks like it contains dates or PAN/TAN
                # In real-world this would run regex
                parts = line_clean.split()
                reported_amt = 0.0
                tax_amt = 0.0
                cp_id = None
                
                # Check for TAN pattern
                for part in parts:
                    if len(part) == 10 and part[:4].isalpha() and part[4:9].isdigit() and part[9].isalpha():
                        cp_id = part # TAN
                
                # Extract float values
                floats = []
                for part in parts:
                    try:
                        val = float(part.replace(",", ""))
                        floats.append(val)
                    except ValueError:
                        pass
                
                if len(floats) >= 2:
                    reported_amt = floats[0]
                    tax_amt = floats[1]

                db.execute(
                    text("""
                        INSERT INTO public.source_records (source_document_id, source_row_id, category, subcategory, txn_date, reported_amount, tax_amount, counterparty_name, counterparty_id, raw_json)
                        VALUES (:sd_id, :row_id, :cat, :subcat, :date, :rep_amt, :tax_amt, :cp_name, :cp_id, :raw)
                    """),
                    {
                        "sd_id": doc_id,
                        "row_id": str(idx),
                        "cat": "TDS/TCS Information",
                        "subcat": "Form 26AS Inward line",
                        "date": date.today(),
                        "rep_amt": reported_amt,
                        "tax_amt": tax_amt,
                        "cp_name": "Portal Deductor",
                        "cp_id": cp_id or "UNKNOWN_TAN",
                        "raw": json.dumps({"raw_line": line_clean})
                    }
                )
                records_inserted += 1

        db.execute(
            text("UPDATE public.import_batches SET status = 'STAGED' WHERE id = :id"),
            {"id": batch_id}
        )

        # Audit logging
        db.execute(
            text("""
                INSERT INTO public.it_audit_events (tenant_id, actor_user_id, entity_type, entity_id, action, metadata_json)
                VALUES (:tid, :aid, 'import_batch', :eid, 'UPLOAD_DOCUMENT', :meta)
            """),
            {
                "tid": tenant_id,
                "aid": tenant_id,
                "eid": batch_id,
                "meta": json.dumps({"filename": file.filename, "records": records_inserted, "source_type": source_type})
            }
        )
        db.commit()

        return {
            "status": "success",
            "import_batch_id": batch_id,
            "filename": file.filename,
            "records_staged": records_inserted,
            "message": f"Successfully uploaded and staged {records_inserted} rows."
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/imports/{id}")
async def get_import_details(id: str, db: Session = Depends(get_db)):
    try:
        import_res = db.execute(
            text("""
                SELECT ib.id, ib.source_type, ib.source_format, ib.filename, ib.imported_at, ib.status, t.legal_name, t.pan_masked
                FROM public.import_batches ib
                JOIN public.taxpayers t ON ib.taxpayer_id = t.id
                WHERE ib.id = :id
            """),
            {"id": id}
        ).fetchone()

        if not import_res:
            raise HTTPException(status_code=404, detail="Import batch not found")

        # Get records count
        count_res = db.execute(
            text("""
                SELECT COUNT(*) 
                FROM public.source_records sr
                JOIN public.source_documents sd ON sr.source_document_id = sd.id
                WHERE sd.import_batch_id = :id
            """),
            {"id": id}
        ).scalar() or 0

        return {
            "id": str(import_res[0]),
            "source_type": import_res[1],
            "source_format": import_res[2],
            "filename": import_res[3],
            "imported_at": import_res[4].isoformat(),
            "status": import_res[5],
            "taxpayer_name": import_res[6],
            "taxpayer_pan": import_res[7],
            "records_count": count_res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Normalization Engine (POST /imports/{id}/normalize)
@router.post("/imports/{id}/normalize")
async def normalize_import_batch(id: str, db: Session = Depends(get_db)):
    """
    Parses staged source records, coerces values to canonical schema, and inserts into public.tax_events.
    """
    import_res = db.execute(
        text("SELECT taxpayer_id, source_type, status FROM public.import_batches WHERE id = :id"),
        {"id": id}
    ).fetchone()

    if not import_res:
        raise HTTPException(status_code=404, detail="Import batch not found")

    taxpayer_id, source_type, status = import_res

    # Retrieve staged records
    records = db.execute(
        text("""
            SELECT sr.id, sr.category, sr.subcategory, sr.txn_date, sr.reported_amount, sr.tax_amount, sr.counterparty_name, sr.counterparty_id, sr.raw_json, sd.metadata_json
            FROM public.source_records sr
            JOIN public.source_documents sd ON sr.source_document_id = sd.id
            WHERE sd.import_batch_id = :id
        """),
        {"id": id}
    ).fetchall()

    if not records:
        return {"status": "success", "normalized_records": 0, "message": "No staged records to process."}

    # Resolve tax_year (default to current financial year based on transaction date or system)
    # Let's map dates to Tax Years. Indian AY/FY, e.g. FY 2025-26 covers April 1, 2025 to March 31, 2026.
    def get_tax_year(dt: date) -> str:
        if dt.month >= 4:
            return f"{dt.year}-{str(dt.year+1)[2:]}"
        else:
            return f"{dt.year-1}-{str(dt.year)[2:]}"

    normalized_count = 0
    try:
        for r in records:
            sr_id, cat, subcat, txn_date, rep_amt, tax_amt, cp_name, cp_id, raw_json, doc_meta = r
            tax_year = get_tax_year(txn_date)

            # Normalization rules mapping to canonical types
            canon_type = "other_information"
            income_head = "other_sources"

            cat_lower = cat.lower()
            subcat_lower = subcat.lower()

            if source_type == "ais_json":
                # Categories from official AIS JSON schema
                if "tds" in cat_lower or "tcs" in cat_lower or "tax deducted" in subcat_lower:
                    canon_type = "tax_deducted" if "tds" in cat_lower else "tax_collected"
                    # Determine income head
                    if "salary" in subcat_lower:
                        income_head = "salary"
                    elif "interest" in subcat_lower:
                        income_head = "other_sources"
                    elif "dividend" in subcat_lower:
                        income_head = "other_sources"
                    elif "professional" in subcat_lower or "technical" in subcat_lower or "194j" in subcat_lower:
                        income_head = "business_profession"
                        canon_type = "tax_deducted"
                    else:
                        income_head = "other_sources"
                elif "sft" in cat_lower:
                    canon_type = "sft_indicator"
                    income_head = "other_sources"
                elif "tax paid" in cat_lower or "payment of taxes" in cat_lower:
                    if "advance" in subcat_lower:
                        canon_type = "advance_tax"
                    elif "self assessment" in subcat_lower:
                        canon_type = "self_assessment_tax"
                    else:
                        canon_type = "self_assessment_tax"
                    income_head = None
                elif "refund" in cat_lower:
                    canon_type = "refund"
                    income_head = None
                elif "salary" in cat_lower or "salary" in subcat_lower:
                    canon_type = "salary_income"
                    income_head = "salary"

            elif source_type == "form16_pdf":
                canon_type = "tax_deducted"
                income_head = "salary"

            elif source_type == "bank_csv":
                # Infer based on transaction description keywords
                if "salary" in subcat_lower or "paycheck" in subcat_lower:
                    canon_type = "salary_income"
                    income_head = "salary"
                elif "interest" in subcat_lower:
                    canon_type = "interest_income"
                    income_head = "other_sources"
                elif "dividend" in subcat_lower:
                    canon_type = "dividend_income"
                    income_head = "other_sources"
                elif "professional" in subcat_lower or "fee" in subcat_lower or "consulting" in subcat_lower:
                    canon_type = "professional_receipts"
                    income_head = "business_profession"
                else:
                    canon_type = "other_information"
                    income_head = "other_sources"

            elif source_type == "manual_claims_csv":
                canon_type = cat_lower.replace(" ", "_")
                # map head
                if canon_type in ("salary_income", "salary"):
                    canon_type = "salary_income"
                    income_head = "salary"
                elif canon_type in ("interest_income", "interest"):
                    canon_type = "interest_income"
                    income_head = "other_sources"
                elif canon_type in ("professional_receipts", "professional"):
                    canon_type = "professional_receipts"
                    income_head = "business_profession"
                else:
                    income_head = "other_sources"

            elif source_type == "form26as_txt":
                canon_type = "tax_deducted"
                income_head = "other_sources"

            # Create a unique canonical matching key
            # format: PAN/TAN + event_type + quarter + gross_amount
            quarter = f"Q{(txn_date.month - 1) // 3 + 1}"
            canon_key = f"{cp_id or 'UNKNOWN'}:{canon_type}:{quarter}:{round(rep_amt, 2)}"

            # Insert normalized tax event
            db.execute(
                text("""
                    INSERT INTO public.tax_events (taxpayer_id, source_record_id, tax_year, event_type, income_head, event_date, amount_gross, amount_tax, currency, canonical_key, source_confidence, source_type)
                    VALUES (:t_id, :sr_id, :year, :evt_type, :inc_head, :date, :amt_gross, :amt_tax, 'INR', :key, 'HIGH', :st)
                """),
                {
                    "t_id": taxpayer_id,
                    "sr_id": sr_id,
                    "year": tax_year,
                    "evt_type": canon_type,
                    "inc_head": income_head,
                    "date": txn_date,
                    "amt_gross": round(rep_amt, 2),
                    "amt_tax": round(tax_amt, 2),
                    "key": canon_key,
                    "st": source_type
                }
            )
            normalized_count += 1



        # Update batch status
        db.execute(
            text("UPDATE public.import_batches SET status = 'PROCESSED' WHERE id = :id"),
            {"id": id}
        )
        db.commit()

        return {
            "status": "success",
            "normalized_records": normalized_count,
            "message": f"Successfully normalized {normalized_count} events into canonical TaxEvent ledger."
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Normalization failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# 4. Reconciliation Matching Engine (POST /api/v1/reconciliation/run)
@router.post("/reconciliation/run")
async def run_reconciliation_engine(
    taxpayer_id: str = Form(...),
    tax_year: str = Form(...), # e.g. 2025-26
    db: Session = Depends(get_db)
):
    """
    Cleans previous run results and triggers the rules-based matching sequence.
    Generates MatchGroups, MatchLinks, ExceptionItems, and RemediationTasks.
    """
    # 1. Clean previous run state
    # Due to cascades, deleting match_groups deletes match_links and clears match reference in exception_items
    db.execute(
        text("DELETE FROM public.match_groups WHERE taxpayer_id = :tid AND tax_year = :ty"),
        {"tid": taxpayer_id, "ty": tax_year}
    )
    db.execute(
        text("DELETE FROM public.exception_items WHERE taxpayer_id = :tid AND tax_year = :ty"),
        {"tid": taxpayer_id, "ty": tax_year}
    )
    db.commit()

    # 2. Fetch all TaxEvents
    events = db.execute(
        text("""
            SELECT te.id, te.event_type, te.income_head, te.event_date, te.amount_gross, te.amount_tax, te.canonical_key, te.source_type, sr.counterparty_id, sr.counterparty_name
            FROM public.tax_events te
            LEFT JOIN public.source_records sr ON te.source_record_id = sr.id
            WHERE te.taxpayer_id = :tid AND te.tax_year = :ty
        """),
        {"tid": taxpayer_id, "ty": tax_year}
    ).fetchall()

    if not events:
        return {
            "status": "success",
            "message": "No tax events found for taxpayer in this year. Upload files first.",
            "summary": {
                "matched_groups": 0,
                "partial_groups": 0,
                "unmatched_groups": 0,
                "exception_count": 0
            }
        }

    # Map events into Official vs Reference/Books
    official_sources = ("ais_json", "form26as_txt", "form26as_pdf")
    official_events = []
    reference_events = []

    for ev in events:
        ev_dict = {
            "id": str(ev[0]),
            "event_type": ev[1],
            "income_head": ev[2],
            "event_date": ev[3],
            "amount_gross": float(ev[4]),
            "amount_tax": float(ev[5]),
            "canonical_key": ev[6],
            "source_type": ev[7],
            "counterparty_id": ev[8],
            "counterparty_name": ev[9],
            "matched": False
        }
        if ev_dict["source_type"] in official_sources:
            official_events.append(ev_dict)
        else:
            reference_events.append(ev_dict)

    matched_groups_count = 0
    partial_groups_count = 0
    exceptions_list = []

    # 3. RULE 1: Exact Key Matching (PAN/TAN + Section + Gross Amount + Tax Amount)
    for off in official_events:
        for ref in reference_events:
            if ref["matched"]:
                continue
            
            # Match condition
            same_tan = off["counterparty_id"] == ref["counterparty_id"] and off["counterparty_id"] is not None
            same_type = off["event_type"] == ref["event_type"]
            same_gross = abs(off["amount_gross"] - ref["amount_gross"]) < 1.00
            same_tax = abs(off["amount_tax"] - ref["amount_tax"]) < 1.00

            if same_tan and same_type and same_gross and same_tax:
                off["matched"] = True
                ref["matched"] = True

                # Create MatchGroup
                mg_id = str(uuid.uuid4())
                db.execute(
                    text("""
                        INSERT INTO public.match_groups (id, taxpayer_id, tax_year, status, explanation_code, explanation_text)
                        VALUES (:id, :tid, :ty, 'matched', 'exact_match', 'Exact match on PAN/TAN, category, and gross/tax amounts.')
                    """),
                    {"id": mg_id, "tid": taxpayer_id, "ty": tax_year}
                )

                # Create Link
                db.execute(
                    text("""
                        INSERT INTO public.match_links (match_group_id, left_tax_event_id, right_tax_event_id, score, match_rule, reviewer_status)
                        VALUES (:mg_id, :left_id, :right_id, 100.00, 'exact_key', 'verified')
                    """),
                    {"mg_id": mg_id, "left_id": off["id"], "right_id": ref["id"]}
                )
                matched_groups_count += 1
                break

    # 4. RULE 2: Tolerant Matching (Matching within date windows + amount tolerance)
    for off in [o for o in official_events if not o["matched"]]:
        for ref in [r for r in reference_events if not r["matched"]]:
            same_tan = off["counterparty_id"] == ref["counterparty_id"] and off["counterparty_id"] is not None
            same_type = off["event_type"] == ref["event_type"]
            date_diff = abs(off["event_date"] - ref["event_date"]).days
            
            # Amount tolerance <= 5% or absolute <= 10.00
            amt_diff = abs(off["amount_gross"] - ref["amount_gross"])
            amt_pct = (amt_diff / off["amount_gross"] * 100) if off["amount_gross"] > 0 else 100.00
            amount_compatible = amt_diff <= 10.00 or amt_pct <= 5.00

            if same_tan and same_type and date_diff <= 15 and amount_compatible:
                off["matched"] = True
                ref["matched"] = True

                mg_id = str(uuid.uuid4())
                is_partial = amt_diff > 1.00
                status = "partial" if is_partial else "matched"
                code = "amount_tolerance_match" if is_partial else "tolerant_similarity"
                desc = f"Matched with gross variance of ₹{round(amt_diff, 2)} and {date_diff} days offset."

                db.execute(
                    text("""
                        INSERT INTO public.match_groups (id, taxpayer_id, tax_year, status, explanation_code, explanation_text)
                        VALUES (:id, :tid, :ty, :status, :code, :desc)
                    """),
                    {"id": mg_id, "tid": taxpayer_id, "ty": tax_year, "status": status, "code": code, "desc": desc}
                )

                db.execute(
                    text("""
                        INSERT INTO public.match_links (match_group_id, left_tax_event_id, right_tax_event_id, score, match_rule, reviewer_status)
                        VALUES (:mg_id, :left_id, :right_id, 85.00, 'tolerant_similarity', 'unverified')
                    """),
                    {"mg_id": mg_id, "left_id": off["id"], "right_id": ref["id"]}
                )

                if is_partial:
                    partial_groups_count += 1
                    # Generate Exception
                    exceptions_list.append({
                        "mg_id": mg_id,
                        "type": "gross_net_difference",
                        "severity": "medium",
                        "code": "gross_net_difference",
                        "text": f"Gross amount reported in AIS (₹{off['amount_gross']}) differs from books (₹{ref['amount_gross']}) by ₹{round(amt_diff, 2)}.",
                        "action": "Verify if the difference is due to GST inclusion or transport reimbursement, and file feedback on AIS portal if incorrect."
                    })
                else:
                    matched_groups_count += 1
                break

    # 5. RULE 3: Timing-lag detection (Quarter-end filing lag)
    for off in [o for o in official_events if not o["matched"]]:
        for ref in [r for r in reference_events if not r["matched"]]:
            # deductor matches, amount matches, but dates differ by up to 45 days (across quarter boundary)
            same_tan = off["counterparty_id"] == ref["counterparty_id"] and off["counterparty_id"] is not None
            same_gross = abs(off["amount_gross"] - ref["amount_gross"]) < 5.00
            date_diff = abs(off["event_date"] - ref["event_date"]).days
            
            # Check if crossing quarter boundary (months 3, 6, 9, 12)
            quarter_crossing = False
            d1, d2 = sorted([off["event_date"], ref["event_date"]])
            for m in (3, 6, 9, 12):
                if d1.month <= m and d2.month > m and d1.year == d2.year:
                    quarter_crossing = True
                    break

            if same_tan and same_gross and date_diff <= 45 and quarter_crossing:
                off["matched"] = True
                ref["matched"] = True

                mg_id = str(uuid.uuid4())
                desc = f"Timing lag suspected. Entry reported in official ledger on {off['event_date']} but recorded in books on {ref['event_date']}."
                db.execute(
                    text("""
                        INSERT INTO public.match_groups (id, taxpayer_id, tax_year, status, explanation_code, explanation_text)
                        VALUES (:id, :tid, :ty, 'partial', 'timing_lag_suspected', :desc)
                    """),
                    {"id": mg_id, "tid": taxpayer_id, "ty": tax_year, "desc": desc}
                )

                db.execute(
                    text("""
                        INSERT INTO public.match_links (match_group_id, left_tax_event_id, right_tax_event_id, score, match_rule, reviewer_status)
                        VALUES (:mg_id, :left_id, :right_id, 75.00, 'timing_lag', 'unverified')
                    """),
                    {"mg_id": mg_id, "left_id": off["id"], "right_id": ref["id"]}
                )
                partial_groups_count += 1

                exceptions_list.append({
                    "mg_id": mg_id,
                    "type": "timing_lag_suspected",
                    "severity": "low",
                    "code": "timing_lag_suspected",
                    "text": desc,
                    "action": "No immediate filing revision needed. Verify matching quarter-end credit is carried forward to correct assessment year."
                })
                break

    # 6. RULE 4: Wrong Income Head (Same counterparty, same gross amount, but different head)
    for off in [o for o in official_events if not o["matched"]]:
        for ref in [r for r in reference_events if not r["matched"]]:
            same_tan = off["counterparty_id"] == ref["counterparty_id"] and off["counterparty_id"] is not None
            same_gross = abs(off["amount_gross"] - ref["amount_gross"]) < 5.00
            diff_head = off["income_head"] != ref["income_head"]

            if same_tan and same_gross and diff_head:
                off["matched"] = True
                ref["matched"] = True

                mg_id = str(uuid.uuid4())
                desc = f"Wrong income head classification. Official reports under '{off['income_head']}' but books claim '{ref['income_head']}'."
                db.execute(
                    text("""
                        INSERT INTO public.match_groups (id, taxpayer_id, tax_year, status, explanation_code, explanation_text)
                        VALUES (:id, :tid, :ty, 'partial', 'wrong_income_head', :desc)
                    """),
                    {"id": mg_id, "tid": taxpayer_id, "ty": tax_year, "desc": desc}
                )

                db.execute(
                    text("""
                        INSERT INTO public.match_links (match_group_id, left_tax_event_id, right_tax_event_id, score, match_rule, reviewer_status)
                        VALUES (:mg_id, :left_id, :right_id, 70.00, 'head_mismatch', 'unverified')
                    """),
                    {"mg_id": mg_id, "left_id": off["id"], "right_id": ref["id"]}
                )
                partial_groups_count += 1

                exceptions_list.append({
                    "mg_id": mg_id,
                    "type": "wrong_income_head",
                    "severity": "high",
                    "code": "wrong_income_head",
                    "text": desc,
                    "action": "Review ITR form selection. Salary vs Professional receipt classifications trigger automatic compliance notices if misreported."
                })
                break

    # 7. Exceptions for remaining unmatched official events (Missing in books)
    for off in [o for o in official_events if not o["matched"]]:
        # Create MatchGroup first
        mg_id = str(uuid.uuid4())
        desc = f"Official TDS of ₹{off['amount_tax']} on gross ₹{off['amount_gross']} is missing in user books/statements."
        db.execute(
            text("""
                INSERT INTO public.match_groups (id, taxpayer_id, tax_year, status, explanation_code, explanation_text)
                VALUES (:id, :tid, :ty, 'unmatched', 'missing_in_books', :desc)
            """),
            {"id": mg_id, "tid": taxpayer_id, "ty": tax_year, "desc": desc}
        )

        exceptions_list.append({
            "mg_id": mg_id,
            "type": "missing_in_books",
            "severity": "medium",
            "code": "missing_in_books",
            "text": f"Transaction from deductor {off['counterparty_name'] or off['counterparty_id']} of ₹{off['amount_gross']} reported in official statements but not registered in books.",
            "action": "Ensure all client receipts or bank deposits from this counterparty are accounted for in profit & loss statement."
        })

    # 8. Exceptions for remaining unmatched reference events (Missing in official statement)
    for ref in [r for r in reference_events if not r["matched"]]:
        mg_id = str(uuid.uuid4())
        desc = f"Books claim TDS credit of ₹{ref['amount_tax']} on gross ₹{ref['amount_gross']} but missing in official statements."
        db.execute(
            text("""
                INSERT INTO public.match_groups (id, taxpayer_id, tax_year, status, explanation_code, explanation_text)
                VALUES (:id, :tid, :ty, 'unmatched', 'missing_in_official_statement', :desc)
            """),
            {"id": mg_id, "tid": taxpayer_id, "ty": tax_year, "desc": desc}
        )

        exceptions_list.append({
            "mg_id": mg_id,
            "type": "missing_in_official_statement",
            "severity": "high",
            "code": "missing_in_official_statement",
            "text": f"TDS claim of ₹{ref['amount_tax']} from counterparty {ref['counterparty_name'] or ref['counterparty_id']} is missing in AIS/26AS.",
            "action": "Ask deductor/employer to revise their TDS return. You cannot claim this tax credit until it appears on TRACES."
        })

    # Insert Exceptions into DB
    for exc in exceptions_list:
        db.execute(
            text("""
                INSERT INTO public.exception_items (taxpayer_id, match_group_id, tax_year, exception_type, severity, explanation_code, explanation_text, recommended_action, status)
                VALUES (:tid, :mg_id, :ty, :type, :sev, :code, :txt, :act, 'open')
            """),
            {
                "tid": taxpayer_id,
                "mg_id": exc["mg_id"],
                "ty": tax_year,
                "type": exc["type"],
                "sev": exc["severity"],
                "code": exc["code"],
                "txt": exc["text"],
                "act": exc["action"]
            }
        )

    # Log Audit event
    tenant_res = db.execute(
        text("SELECT tenant_id FROM public.taxpayers WHERE id = :id"),
        {"id": taxpayer_id}
    ).fetchone()
    tenant_id = str(tenant_res[0]) if tenant_res else taxpayer_id

    db.execute(
        text("""
            INSERT INTO public.it_audit_events (tenant_id, actor_user_id, entity_type, entity_id, action, metadata_json)
            VALUES (:tid, :aid, 'taxpayer', :eid, 'RUN_RECONCILIATION', :meta)
        """),
        {
            "tid": tenant_id,
            "aid": tenant_id,
            "eid": taxpayer_id,
            "meta": json.dumps({
                "tax_year": tax_year,
                "matched": matched_groups_count,
                "partial": partial_groups_count,
                "exceptions": len(exceptions_list)
            })
        }
    )

    db.commit()

    return {
        "status": "success",
        "message": f"Income Tax reconciliation completed for tax year {tax_year}.",
        "summary": {
            "matched_groups": matched_groups_count,
            "partial_groups": partial_groups_count,
            "unmatched_groups": len([o for o in official_events if not o["matched"]]) + len([r for r in reference_events if not r["matched"]]),
            "exception_count": len(exceptions_list)
        }
    }

# 5. Get Reconciliation Summary
@router.get("/reconciliation/summary")
async def get_reconciliation_summary(
    taxpayer_id: str = Query(...),
    tax_year: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        # Get counts of match groups by status
        res = db.execute(
            text("""
                SELECT status, COUNT(*) 
                FROM public.match_groups 
                WHERE taxpayer_id = :tid AND tax_year = :ty
                GROUP BY status
            """),
            {"tid": taxpayer_id, "ty": tax_year}
        ).fetchall()

        summary = {
            "matched_groups": 0,
            "partial_groups": 0,
            "unmatched_groups": 0
        }
        for status, count in res:
            if status == "matched":
                summary["matched_groups"] = count
            elif status == "partial":
                summary["partial_groups"] = count
            elif status == "unmatched":
                summary["unmatched_groups"] = count

        # Exception counts
        exception_count = db.execute(
            text("SELECT COUNT(*) FROM public.exception_items WHERE taxpayer_id = :tid AND tax_year = :ty"),
            {"tid": taxpayer_id, "ty": tax_year}
        ).scalar() or 0
        summary["exception_count"] = exception_count

        # Get top exceptions
        top_exceptions_res = db.execute(
            text("""
                SELECT id, exception_type, severity, explanation_code, explanation_text, recommended_action, status
                FROM public.exception_items
                WHERE taxpayer_id = :tid AND tax_year = :ty
                ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
                LIMIT 5
            """),
            {"tid": taxpayer_id, "ty": tax_year}
        ).fetchall()

        top_exceptions = [
            {
                "id": str(r[0]),
                "exception_type": r[1],
                "severity": r[2],
                "explanation_code": r[3],
                "explanation_text": r[4],
                "recommended_action": r[5],
                "status": r[6]
            }
            for r in top_exceptions_res
        ]

        return {
            "taxpayer_id": taxpayer_id,
            "tax_year": tax_year,
            "summary": summary,
            "top_exceptions": top_exceptions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 6. Exceptions & Tasks Management
@router.get("/exceptions")
async def get_exceptions(
    taxpayer_id: str = Query(...),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        query = """
            SELECT id, match_group_id, tax_year, exception_type, severity, explanation_code, explanation_text, recommended_action, status, created_at
            FROM public.exception_items
            WHERE taxpayer_id = :tid
        """
        params = {"tid": taxpayer_id}
        if status:
            query += " AND status = :status"
            params["status"] = status
        
        query += " ORDER BY created_at DESC"
        res = db.execute(text(query), params).fetchall()

        exceptions = [
            {
                "id": str(r[0]),
                "match_group_id": str(r[1]) if r[1] else None,
                "tax_year": r[2],
                "exception_type": r[3],
                "severity": r[4],
                "explanation_code": r[5],
                "explanation_text": r[6],
                "recommended_action": r[7],
                "status": r[8],
                "created_at": r[9].isoformat()
            }
            for r in res
        ]
        return exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exceptions/{id}/tasks")
async def create_remediation_task(
    id: str,
    req: TaskCreateRequest,
    db: Session = Depends(get_db)
):
    """Creates a remediation playbook task for a specific exception."""
    try:
        # Check exception exists
        exc = db.execute(
            text("SELECT taxpayer_id, exception_type FROM public.exception_items WHERE id = :id"),
            {"id": id}
        ).fetchone()

        if not exc:
            raise HTTPException(status_code=404, detail="Exception item not found")

        taxpayer_id = str(exc[0])
        task_id = str(uuid.uuid4())
        
        due_d = None
        if req.due_date:
            due_d = datetime.strptime(req.due_date, "%Y-%m-%d").date()

        db.execute(
            text("""
                INSERT INTO public.remediation_tasks (id, exception_item_id, assignee_user_id, action_type, due_date, status)
                VALUES (:id, :exc_id, :assignee, :action, :due, 'pending')
            """),
            {
                "id": task_id,
                "exc_id": id,
                "assignee": req.assignee_user_id,
                "action": req.action_type,
                "due": due_d
            }
        )

        # Update exception status
        db.execute(
            text("UPDATE public.exception_items SET status = 'in_progress' WHERE id = :id"),
            {"id": id}
        )

        # Audit
        tenant_res = db.execute(
            text("SELECT tenant_id FROM public.taxpayers WHERE id = :id"),
            {"id": taxpayer_id}
        ).fetchone()
        tenant_id = str(tenant_res[0]) if tenant_res else taxpayer_id

        db.execute(
            text("""
                INSERT INTO public.it_audit_events (tenant_id, actor_user_id, entity_type, entity_id, action, metadata_json)
                VALUES (:tid, :aid, 'remediation_task', :eid, 'CREATE_REMEDIATION_TASK', :meta)
            """),
            {
                "tid": tenant_id,
                "aid": tenant_id,
                "eid": task_id,
                "meta": json.dumps({"exception_id": id, "action_type": req.action_type})
            }
        )

        db.commit()
        return {
            "status": "success",
            "task_id": task_id,
            "message": "Remediation task created successfully."
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exceptions/{id}/tasks")
async def get_exception_tasks(id: str, db: Session = Depends(get_db)):
    try:
        res = db.execute(
            text("SELECT id, assignee_user_id, action_type, due_date, resolution_note, status, created_at FROM public.remediation_tasks WHERE exception_item_id = :eid"),
            {"eid": id}
        ).fetchall()

        tasks = [
            {
                "id": str(r[0]),
                "assignee_user_id": str(r[1]) if r[1] else None,
                "action_type": r[2],
                "due_date": r[3].isoformat() if r[3] else None,
                "resolution_note": r[4],
                "status": r[5],
                "created_at": r[6].isoformat()
            }
            for r in res
        ]
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tasks/{id}/resolve")
async def resolve_task(id: str, req: TaskResolveRequest, db: Session = Depends(get_db)):
    try:
        # Check task exists and fetch exception ID
        task = db.execute(
            text("SELECT exception_item_id FROM public.remediation_tasks WHERE id = :id"),
            {"id": id}
        ).fetchone()

        if not task:
            raise HTTPException(status_code=404, detail="Remediation task not found")

        exc_id = str(task[0])

        db.execute(
            text("UPDATE public.remediation_tasks SET resolution_note = :note, status = :status WHERE id = :id"),
            {"note": req.resolution_note, "status": req.status, "id": id}
        )

        # If resolved, check if all tasks for exception are resolved to close exception
        if req.status == "resolved":
            all_resolved = db.execute(
                text("SELECT COUNT(*) FROM public.remediation_tasks WHERE exception_item_id = :eid AND status = 'pending'"),
                {"eid": exc_id}
            ).scalar() == 0

            if all_resolved:
                db.execute(
                    text("UPDATE public.exception_items SET status = 'resolved' WHERE id = :eid"),
                    {"eid": exc_id}
                )

        # Audit
        exc = db.execute(
            text("SELECT taxpayer_id FROM public.exception_items WHERE id = :id"),
            {"id": exc_id}
        ).fetchone()
        taxpayer_id = str(exc[0]) if exc else id
        tenant_res = db.execute(
            text("SELECT tenant_id FROM public.taxpayers WHERE id = :id"),
            {"id": taxpayer_id}
        ).fetchone()
        tenant_id = str(tenant_res[0]) if tenant_res else taxpayer_id

        db.execute(
            text("""
                INSERT INTO public.it_audit_events (tenant_id, actor_user_id, entity_type, entity_id, action, metadata_json)
                VALUES (:tid, :aid, 'remediation_task', :eid, 'RESOLVE_TASK', :meta)
            """),
            {
                "tid": tenant_id,
                "aid": tenant_id,
                "eid": id,
                "meta": json.dumps({"resolution_note": req.resolution_note, "status": req.status})
            }
        )

        db.commit()
        return {"status": "success", "message": f"Task resolved with status: {req.status}."}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to resolve task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# 7. Audit Pack Export (GET /api/v1/audit-pack/{taxpayer_id}/{tax_year})
@router.get("/audit-pack/{taxpayer_id}/{tax_year}")
async def export_audit_pack(taxpayer_id: str, tax_year: str, db: Session = Depends(get_db)):
    """
    Generates a signed ZIP containing structured reconciliation summary, CSV sheets, and audit trail logs.
    """
    try:
        # Fetch taxpayer profile
        taxpayer = db.execute(
            text("SELECT pan_masked, legal_name, dob_or_incorp, taxpayer_type FROM public.taxpayers WHERE id = :id"),
            {"id": taxpayer_id}
        ).fetchone()

        if not taxpayer:
            raise HTTPException(status_code=404, detail="Taxpayer profile not found")

        pan, name, dob, tp_type = taxpayer

        # 1. Fetch reconciliation summary counts
        res = db.execute(
            text("""
                SELECT status, COUNT(*) 
                FROM public.match_groups 
                WHERE taxpayer_id = :tid AND tax_year = :ty
                GROUP BY status
            """),
            {"tid": taxpayer_id, "ty": tax_year}
        ).fetchall()

        summary = {"matched_groups": 0, "partial_groups": 0, "unmatched_groups": 0}
        for status, count in res:
            summary[f"{status}_groups"] = count

        # 2. Fetch matched events details
        matched_res = db.execute(
            text("""
                SELECT te1.event_type, te1.event_date, te1.amount_gross, te1.amount_tax, te1.source_type, sr1.counterparty_id, sr1.counterparty_name,
                       te2.source_type, te2.amount_gross, te2.amount_tax, ml.score, ml.match_rule
                FROM public.match_links ml
                JOIN public.match_groups mg ON ml.match_group_id = mg.id
                JOIN public.tax_events te1 ON ml.left_tax_event_id = te1.id
                JOIN public.tax_events te2 ON ml.right_tax_event_id = te2.id
                LEFT JOIN public.source_records sr1 ON te1.source_record_id = sr1.id
                WHERE mg.taxpayer_id = :tid AND mg.tax_year = :ty
            """),
            {"tid": taxpayer_id, "ty": tax_year}
        ).fetchall()

        matched_columns = [
            "Category/Event Type", "Event Date", "Official Gross (₹)", "Official Tax (₹)", "Official Source", "Deductor TAN", "Deductor Name",
            "Workbook Source", "Workbook Gross (₹)", "Workbook Tax (₹)", "Confidence Score (%)", "Matching Rule"
        ]
        matched_df = pd.DataFrame(matched_res, columns=matched_columns)

        # 3. Fetch exceptions list
        exceptions_res = db.execute(
            text("""
                SELECT exception_type, severity, explanation_code, explanation_text, recommended_action, status, created_at
                FROM public.exception_items
                WHERE taxpayer_id = :tid AND tax_year = :ty
            """),
            {"tid": taxpayer_id, "ty": tax_year}
        ).fetchall()

        exceptions_columns = [
            "Exception Type", "Severity", "Explanation Code", "Explanation Description", "Recommended Action", "Remediation Status", "Detected At"
        ]
        exceptions_df = pd.DataFrame(exceptions_res, columns=exceptions_columns)

        # 4. Fetch Audit log events
        audit_res = db.execute(
            text("""
                SELECT actor_user_id, entity_type, action, event_ts, metadata_json
                FROM public.it_audit_events
                WHERE tenant_id = (SELECT tenant_id FROM public.taxpayers WHERE id = :id)
                ORDER BY event_ts DESC
            """),
            {"id": taxpayer_id}
        ).fetchall()

        audit_columns = ["Actor User ID", "Entity Scope", "Action Performed", "Timestamp", "Context Details"]
        audit_df = pd.DataFrame(audit_res, columns=audit_columns)

        # Create ZIP in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            # 1. Summary JSON
            summary_info = {
                "audit_pack_info": {
                    "generated_at": datetime.now().isoformat(),
                    "taxpayer_name": name,
                    "taxpayer_pan_masked": pan,
                    "taxpayer_type": tp_type,
                    "tax_year": tax_year,
                    "authenticity_signature": hashlib.sha256(f"{pan}-{tax_year}-{name}".encode()).hexdigest()
                },
                "reconciliation_summary": summary,
                "exceptions_count": len(exceptions_res)
            }
            zip_file.writestr("summary.json", json.dumps(summary_info, indent=2))

            # 2. Matched event CSV
            matched_csv = io.StringIO()
            matched_df.to_csv(matched_csv, index=False)
            zip_file.writestr("matched_tax_credits.csv", matched_csv.getvalue())

            # 3. Exceptions CSV
            exceptions_csv = io.StringIO()
            exceptions_df.to_csv(exceptions_csv, index=False)
            zip_file.writestr("exceptions_list.csv", exceptions_csv.getvalue())

            # 4. Audit trail log CSV
            audit_csv = io.StringIO()
            audit_df.to_csv(audit_csv, index=False)
            zip_file.writestr("reconciliation_audit_trail.csv", audit_csv.getvalue())

            # 5. Readme HTML report
            readme_html = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: sans-serif; color: #333; margin: 40px; }}
                    h1 {{ color: #4F46E5; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; }}
                    .card {{ background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px; }}
                    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
                    th, td {{ border: 1px solid #E5E7EB; padding: 8px; text-align: left; font-size: 13px; }}
                    th {{ background: #F3F4F6; }}
                    .high {{ color: #EF4444; font-weight: bold; }}
                    .medium {{ color: #F59E0B; font-weight: bold; }}
                    .low {{ color: #10B981; font-weight: bold; }}
                </style>
            </head>
            <body>
                <h1>ProScale Tax Reconciliation Report</h1>
                <div class="card">
                    <h3>Taxpayer Information</h3>
                    <p><b>Legal Name:</b> {name}</p>
                    <p><b>PAN (Masked):</b> {pan}</p>
                    <p><b>Tax Year:</b> {tax_year}</p>
                    <p><b>Report Generated At:</b> {summary_info['audit_pack_info']['generated_at']}</p>
                </div>
                <div class="card">
                    <h3>Reconciliation Cockpit Summary</h3>
                    <p><b>Matched Transaction Groups:</b> {summary['matched_groups']}</p>
                    <p><b>Partially Matched Groups (Variance flagged):</b> {summary['partial_groups']}</p>
                    <p><b>Unmatched Groups:</b> {summary['unmatched_groups']}</p>
                    <p><b>Active Compliance Mismatches/Exceptions:</b> {len(exceptions_res)}</p>
                </div>
                <h3>Active Compliance Mismatches</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Scope</th>
                            <th>Severity</th>
                            <th>Description</th>
                            <th>Recommended Remediating Action</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            for exc in exceptions_res:
                severity_class = str(exc[1]).lower()
                readme_html += f"""
                        <tr>
                            <td>{exc[0]}</td>
                            <td><span class="{severity_class}">{exc[1].upper()}</span></td>
                            <td>{exc[3]}</td>
                            <td>{exc[4]}</td>
                        </tr>
                """
            readme_html += """
                    </tbody>
                </table>
            </body>
            </html>
            """
            zip_file.writestr("audit_report.html", readme_html)

        zip_buffer.seek(0)
        filename = f"ITRecon_AuditPack_{pan}_{tax_year}.zip"
        
        # Log Audit event
        tenant_res = db.execute(
            text("SELECT tenant_id FROM public.taxpayers WHERE id = :id"),
            {"id": taxpayer_id}
        ).fetchone()
        tenant_id = str(tenant_res[0]) if tenant_res else taxpayer_id

        db.execute(
            text("""
                INSERT INTO public.it_audit_events (tenant_id, actor_user_id, entity_type, entity_id, action)
                VALUES (:tid, :aid, 'taxpayer', :eid, 'EXPORT_AUDIT_PACK')
            """),
            {"tid": tenant_id, "aid": tenant_id, "eid": taxpayer_id}
        )
        db.commit()

        return StreamingResponse(
            io.BytesIO(zip_buffer.getvalue()),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 8. ITR Handoff Prefill (GET /api/v1/itr-handoff/{taxpayer_id}/{tax_year})
@router.get("/itr-handoff/{taxpayer_id}/{tax_year}")
async def get_itr_handoff(taxpayer_id: str, tax_year: str, db: Session = Depends(get_db)):
    """
    Returns clean JSON representations of matching credits to prefill tax filing forms (ITR-1/2/3/4).
    Sums professional receipts, salary, interest, and actual verified TDS tax credits.
    """
    try:
        # Check taxpayer
        taxpayer = db.execute(
            text("SELECT pan_masked, legal_name FROM public.taxpayers WHERE id = :id"),
            {"id": taxpayer_id}
        ).fetchone()

        if not taxpayer:
            raise HTTPException(status_code=404, detail="Taxpayer profile not found")

        # Sum of verified tax credits (matched match groups)
        verified_tds = db.execute(
            text("""
                SELECT COALESCE(SUM(te.amount_tax), 0)
                FROM public.match_links ml
                JOIN public.match_groups mg ON ml.match_group_id = mg.id
                JOIN public.tax_events te ON ml.left_tax_event_id = te.id
                WHERE mg.taxpayer_id = :tid AND mg.tax_year = :ty AND mg.status = 'matched' AND te.event_type = 'tax_deducted'
            """),
            {"tid": taxpayer_id, "ty": tax_year}
        ).scalar() or 0.0

        # Sum of gross income heads from matching groups
        incomes = db.execute(
            text("""
                SELECT te.income_head, SUM(te.amount_gross)
                FROM public.match_links ml
                JOIN public.match_groups mg ON ml.match_group_id = mg.id
                JOIN public.tax_events te ON ml.left_tax_event_id = te.id
                WHERE mg.taxpayer_id = :tid AND mg.tax_year = :ty AND mg.status = 'matched' AND te.income_head IS NOT NULL
                GROUP BY te.income_head
            """),
            {"tid": taxpayer_id, "ty": tax_year}
        ).fetchall()

        income_heads_sum = {
            "salary": 0.0,
            "business_profession": 0.0,
            "other_sources": 0.0
        }
        for head, amount in incomes:
            if head in income_heads_sum:
                income_heads_sum[head] = float(amount)

        # Get TDS deductions list group by TAN
        tds_by_tan_res = db.execute(
            text("""
                SELECT sr.counterparty_id, sr.counterparty_name, SUM(te.amount_gross) as gross, SUM(te.amount_tax) as tax
                FROM public.match_links ml
                JOIN public.match_groups mg ON ml.match_group_id = mg.id
                JOIN public.tax_events te ON ml.left_tax_event_id = te.id
                LEFT JOIN public.source_records sr ON te.source_record_id = sr.id
                WHERE mg.taxpayer_id = :tid AND mg.tax_year = :ty AND mg.status = 'matched' AND te.event_type = 'tax_deducted'
                GROUP BY sr.counterparty_id, sr.counterparty_name
            """),
            {"tid": taxpayer_id, "ty": tax_year}
        ).fetchall()

        tds_by_tan = [
            {
                "tan": r[0],
                "deductor_name": r[1] or "Verified Deductor",
                "gross_amount": float(r[2]),
                "tds_deducted": float(r[3])
            }
            for r in tds_by_tan_res
        ]

        return {
            "pan_masked": taxpayer[0],
            "legal_name": taxpayer[1],
            "tax_year": tax_year,
            "prefill_data": {
                "income_from_salary": income_heads_sum["salary"],
                "income_from_business_profession": income_heads_sum["business_profession"],
                "income_from_other_sources": income_heads_sum["other_sources"],
                "total_tds_tax_credits_claimable": float(verified_tds),
                "tds_schedule_details": tds_by_tan
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
