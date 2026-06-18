"""
E-Commerce Tax Reconciliation & Financial OS — FastAPI Backend
===============================================================
Production-ready API supporting dynamic schema matching, returns mapping,
payout reconciliations, inventory safety analytics, unit margins, and state-wise sales.
"""

import io
import os
import uuid
import json
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from rapidfuzz import process, fuzz

from meesho_contracts import MEESHO_CONTRACTS, ReportContractSchema
from extractor import MeeshoExtractionEngine, calculate_file_hash


# ============================================================================
# CONFIG
# ============================================================================
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://tax-recon-saas.vercel.app"
).split(",")
MAX_CHUNK_SIZE = int(os.getenv("MAX_CHUNK_SIZE", "5000"))

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tax-recon")

app = FastAPI(
    title="ProScale Advisory Financial OS API",
    description="Engine for dynamic tax mappings, profit tracking, and operations.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["https://tax-recon-saas.vercel.app"],
    allow_origin_regex=r"https://tax-recon-saas.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from it_routes import router as it_router
app.include_router(it_router)

from fpa_routes import router as fpa_router
app.include_router(fpa_router)

from ledger_api import router as audit_router
app.include_router(audit_router)


# ============================================================================
# DEPENDENCIES
# ============================================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================================
# CANONICAL SCHEMA FIELD DEFINITIONS
# ============================================================================
CANONICAL_FIELDS = {
    "sales": {
        "order_id": {"label": "Order ID (Required)", "required": True},
        "sku": {"label": "Product SKU", "required": False},
        "product_description": {"label": "Product Name/Desc", "required": False},
        "quantity": {"label": "Quantity Sold", "required": False, "type": "int"},
        "taxable_value": {"label": "Taxable Value (Required)", "required": True, "type": "float"},
        "cgst_amount": {"label": "CGST Amount", "required": False, "type": "float"},
        "sgst_amount": {"label": "SGST Amount", "required": False, "type": "float"},
        "igst_amount": {"label": "IGST Amount", "required": False, "type": "float"},
        "tcs_amount": {"label": "TCS (GST)", "required": False, "type": "float"},
        "invoice_value": {"label": "Total Invoice Value", "required": False, "type": "float"},
        "shipping_state": {"label": "Shipping State (e.g. Maharashtra)", "required": False},
        "shipping_charge": {"label": "Shipping Collected", "required": False, "type": "float"},
        "month_year": {"label": "Period (YYYY-MM)", "required": False},
        "channel": {"label": "Sales Channel", "required": False},
        "invoice_number": {"label": "Invoice Number", "required": False},
        "order_status": {"label": "Order Status", "required": False}
    },
    "payment": {
        "order_id": {"label": "Order ID (Required)", "required": True},
        "transaction_type": {"label": "Transaction Type (Order/Refund)", "required": False},
        "settled_amount": {"label": "Settled Amount (Required)", "required": True, "type": "float"},
        "marketplace_fee": {"label": "Marketplace Fees (Commission, Shipping, Pg)", "required": False, "type": "float"},
        "tds_amount": {"label": "TDS (Income Tax)", "required": False, "type": "float"},
        "net_payout": {"label": "Net Payout in Bank", "required": False, "type": "float"},
        "settlement_date": {"label": "Settlement Date", "required": False, "type": "date"},
        "month_year": {"label": "Period (YYYY-MM)", "required": False},
        "channel": {"label": "Sales Channel", "required": False},
        "order_status": {"label": "Order Status", "required": False},
        "shipping_charge": {"label": "Shipping Charged", "required": False, "type": "float"},
        "return_shipping_charge": {"label": "Return Shipping Charged", "required": False, "type": "float"},
        "recovery_amount": {"label": "Recovery/Penalty Charged", "required": False, "type": "float"},
        "transaction_status": {"label": "Transaction Status (Accrual)", "required": False},
        "transaction_release_date": {"label": "Transaction Release Date", "required": False, "type": "date"}
    },
    "return": {
        "order_id": {"label": "Order ID (Required)", "required": True},
        "sku": {"label": "Product SKU", "required": False},
        "returned_quantity": {"label": "Returned Quantity", "required": False, "type": "int"},
        "refund_amount": {"label": "Refund Amount", "required": False, "type": "float"},
        "return_reason": {"label": "Return Reason", "required": False},
        "month_year": {"label": "Period (YYYY-MM)", "required": False},
        "channel": {"label": "Sales Channel", "required": False}
    },
    "catalog": {
        "sku": {"label": "Product SKU (Required)", "required": True},
        "product_name": {"label": "Product Title", "required": False},
        "cost_price": {"label": "Cost Price / COGS (Required)", "required": True, "type": "float"},
        "selling_price": {"label": "Base Selling Price", "required": False, "type": "float"},
        "min_safety_stock": {"label": "Safety Stock Threshold", "required": False, "type": "int"},
        "stock_in_transit": {"label": "Stock in Transit", "required": False, "type": "int"},
        "weight_g": {"label": "Weight (Grams)", "required": False, "type": "int"},
        "weight_slab_g": {"label": "Weight Slab (Grams)", "required": False, "type": "int"}
    }
}

# ============================================================================
# SYNONYMS LEXICON FOR AUTO-MAPPING
# ============================================================================
SYNONYMS = {
    "sales": {
        "order_id": ["order id", "orderid", "order no", "order number", "order ref", "reference", "amazon order id"],
        "sku": ["sku", "merchant sku", "product sku", "sku code", "item code", "seller sku"],
        "product_description": ["product name", "product title", "item name", "description", "title", "product description"],
        "quantity": ["quantity", "qty", "units", "quantity purchased", "qty sold", "unit count"],
        "taxable_value": ["taxable value", "taxable amt", "taxable amount", "taxable revenue", "taxable sales", "assessable value", "taxable"],
        "cgst_amount": ["cgst amount", "cgst amt", "cgst"],
        "sgst_amount": ["sgst amount", "sgst amt", "sgst"],
        "igst_amount": ["igst amount", "igst amt", "igst"],
        "tcs_amount": ["tcs gst", "tcs amount", "tcs amt", "tcs", "tcs gst deducted"],
        "invoice_value": ["invoice value", "invoice amt", "invoice amount", "total invoice", "gross sales", "gross value", "invoice value gross"],
        "shipping_state": ["shipping state", "ship state", "ship to state", "buyer state", "destination state", "state"],
        "shipping_charge": ["shipping charge", "shipping collected", "logistic cost", "shipping fee", "shipping cost", "delivery charge", "logistic expense"],
        "month_year": ["month period", "month year", "year month", "month", "period"]
    },
    "payment": {
        "order_id": ["order id", "orderid", "order no", "order number", "order reference", "order ref", "reference"],
        "transaction_type": ["transaction type", "tx type", "tx code", "type", "payment type", "transaction_type"],
        "settled_amount": ["settled amount", "settled amt", "settled val", "payout amount", "net settled", "settled", "settled amt val"],
        "marketplace_fee": ["marketplace fee", "platform fee", "commission fee", "commission fees", "commission", "shipping fee", "fees", "charges", "marketplace charge"],
        "tds_amount": ["tds amount", "tds amt", "tds", "tds deducted"],
        "net_payout": ["net payout bank", "net payout", "payout in bank", "bank settlement"],
        "settlement_date": ["settlement date", "payout date", "date of payout", "payout_date", "date"],
        "month_year": ["month period", "month year", "year month", "month", "period"]
    },
    "return": {
        "order_id": ["order id", "orderid", "order no", "order number", "order reference", "order ref", "reference", "order id ref"],
        "sku": ["sku", "merchant sku", "product sku", "sku code", "item code", "seller sku", "sku_code"],
        "returned_quantity": ["returned quantity", "returned qty", "return quantity", "return qty", "qty returned"],
        "refund_amount": ["refund amount", "refund amt", "refund value", "refund gross", "refund cost", "refunded amount", "refund", "refund amt gross"],
        "return_reason": ["return reason", "reason code", "customer reason", "reason", "return_reason", "reason_code"],
        "month_year": ["month period", "month year", "year month", "month", "period"]
    },
    "catalog": {
        "sku": ["sku", "merchant sku", "product sku", "sku code", "item code", "seller sku"],
        "product_name": ["product name", "product title", "item name", "description", "title", "product_name"],
        "cost_price": ["cost price", "cogs", "unit cost", "purchase price", "cost price / cogs", "cost"],
        "selling_price": ["selling price", "base selling price", "price", "mrp"],
        "min_safety_stock": ["safety stock", "min safety", "threshold", "safety stock threshold", "min_safety_stock"],
        "stock_in_transit": ["transit", "stock in transit", "in transit", "stock_in_transit"]
    }
}

# ============================================================================
# FUZZY SEARCH HEURISTIC FUNCTION
# ============================================================================
def predict_column_mappings(raw_headers: List[str], file_type: str) -> Dict[str, str]:
    """Uses hybrid rule-based and fuzzy logic to map raw file headers to canonical DB columns."""
    canonical_keys = list(CANONICAL_FIELDS[file_type].keys())
    suggested = {}
    
    # Map cleaned canonical key names back to original key names
    cleaned_canonical = {}
    for key in canonical_keys:
        cleaned_key = key.replace("_", " ").replace("-", " ")
        cleaned_canonical[cleaned_key] = key
        
    for raw in raw_headers:
        cleaned = raw.strip().lower().replace("_", " ").replace("-", " ")
        
        # 1. Exact Synonym Match
        found = False
        for canonical_key, syns in SYNONYMS[file_type].items():
            if cleaned in [s.lower().replace("_", " ").replace("-", " ") for s in syns]:
                suggested[raw] = canonical_key
                found = True
                break
        if found:
            continue
            
        # 2. Key Substring Heuristic Rules
        if file_type == "sales":
            if "cgst" in cleaned:
                suggested[raw] = "cgst_amount"
                continue
            elif "sgst" in cleaned:
                suggested[raw] = "sgst_amount"
                continue
            elif "igst" in cleaned:
                suggested[raw] = "igst_amount"
                continue
            elif "tcs" in cleaned:
                suggested[raw] = "tcs_amount"
                continue
            elif "taxable" in cleaned or "assessable" in cleaned:
                suggested[raw] = "taxable_value"
                continue
            elif "invoice" in cleaned or "gross sales" in cleaned:
                suggested[raw] = "invoice_value"
                continue
            elif "shipping" in cleaned or "logistic" in cleaned or "delivery" in cleaned:
                suggested[raw] = "shipping_charge"
                continue
            elif "quantity" in cleaned or "qty" in cleaned:
                suggested[raw] = "quantity"
                continue
            elif "product" in cleaned or "title" in cleaned or "description" in cleaned:
                suggested[raw] = "product_description"
                continue
            elif "order" in cleaned and "id" in cleaned:
                suggested[raw] = "order_id"
                continue
            elif "sku" in cleaned:
                suggested[raw] = "sku"
                continue
            elif "state" in cleaned:
                suggested[raw] = "shipping_state"
                continue
            elif "month" in cleaned or "period" in cleaned or "year" in cleaned:
                suggested[raw] = "month_year"
                continue

        elif file_type == "payment":
            if "tds" in cleaned:
                suggested[raw] = "tds_amount"
                continue
            elif "settle" in cleaned or "payout" in cleaned:
                if "date" in cleaned or "time" in cleaned:
                    suggested[raw] = "settlement_date"
                else:
                    suggested[raw] = "settled_amount"
                continue
            elif "fee" in cleaned or "commission" in cleaned or "charge" in cleaned:
                suggested[raw] = "marketplace_fee"
                continue
            elif "net" in cleaned or "bank" in cleaned:
                suggested[raw] = "net_payout"
                continue
            elif "tx" in cleaned or "transaction" in cleaned or "type" in cleaned:
                suggested[raw] = "transaction_type"
                continue
            elif "order" in cleaned or "reference" in cleaned or "ref" in cleaned:
                suggested[raw] = "order_id"
                continue
            elif "date" in cleaned:
                suggested[raw] = "settlement_date"
                continue
            elif "month" in cleaned or "period" in cleaned or "year" in cleaned:
                suggested[raw] = "month_year"
                continue

        elif file_type == "return":
            if "returned" in cleaned or "return" in cleaned:
                if "qty" in cleaned or "quantity" in cleaned or "count" in cleaned:
                    suggested[raw] = "returned_quantity"
                else:
                    suggested[raw] = "return_reason"
                continue
            elif "refund" in cleaned:
                suggested[raw] = "refund_amount"
                continue
            elif "reason" in cleaned:
                suggested[raw] = "return_reason"
                continue
            elif "order" in cleaned or "id" in cleaned or "reference" in cleaned:
                suggested[raw] = "order_id"
                continue
            elif "sku" in cleaned:
                suggested[raw] = "sku"
                continue
            elif "month" in cleaned or "period" in cleaned or "year" in cleaned:
                suggested[raw] = "month_year"
                continue

        elif file_type == "catalog":
            if "cost" in cleaned or "cogs" in cleaned:
                suggested[raw] = "cost_price"
                continue
            elif "selling" in cleaned or "price" in cleaned:
                suggested[raw] = "selling_price"
                continue
            elif "safety" in cleaned or "threshold" in cleaned:
                suggested[raw] = "min_safety_stock"
                continue
            elif "transit" in cleaned:
                suggested[raw] = "stock_in_transit"
                continue
            elif "name" in cleaned or "title" in cleaned or "description" in cleaned:
                suggested[raw] = "product_name"
                continue
            elif "sku" in cleaned:
                suggested[raw] = "sku"
                continue
            
        # 3. Fallback to Fuzzy Match
        match = process.extractOne(cleaned, list(cleaned_canonical.keys()), scorer=fuzz.token_sort_ratio)
        if match:
            target_cleaned, score, _ = match
            target_key = cleaned_canonical[target_cleaned]
            if score >= 65:
                suggested[raw] = target_key
                
    return suggested


def load_excel_to_dataframe(content: bytes, filename: str, file_type: str) -> pd.DataFrame:
    """
    Cleans and loads an Excel sheet.
    Handles multi-sheet workbooks (e.g. Flipkart STL) and Meesho's merged header layout.
    """
    buffer = io.BytesIO(content)
    excel_file = pd.ExcelFile(buffer)
    sheet_names = excel_file.sheet_names
    
    # Select target sheet
    sheet_to_load = sheet_names[0]
    if len(sheet_names) > 1:
        if file_type == "payment":
            for name in ["Orders", "orders", "Settlement", "settlement", "STL", "stl", "Previouspayment", "PreviousPayment"]:
                if name in sheet_names:
                    sheet_to_load = name
                    break
        elif file_type == "sales":
            for name in ["Sales", "sales", "Invoices", "invoices", "TCS Sales", "tcs sales", "TCS_Sales"]:
                if name in sheet_names:
                    sheet_to_load = name
                    break
                    
    # Check for Meesho payout structure
    df_check = pd.read_excel(buffer, sheet_name=sheet_to_load, nrows=5, header=None)
    is_meesho_payout = False
    if len(df_check) >= 3:
        row_2_vals = [str(x).lower().strip() for x in df_check.iloc[1].tolist()]
        if "sub order no" in row_2_vals or "supplier sku" in row_2_vals or "final settlement amount" in row_2_vals:
            is_meesho_payout = True
            
    if is_meesho_payout:
        # Skips row 1 (merged headers) and row 3 (calculation formulas)
        df = pd.read_excel(buffer, sheet_name=sheet_to_load, header=1, dtype=str)
        df = df.drop(index=0).reset_index(drop=True)
        return df
    else:
        return pd.read_excel(buffer, sheet_name=sheet_to_load, dtype=str)


# ============================================================================
# PYDANTIC MODEL SCHEMAS
# ============================================================================
class ReconcileRequest(BaseModel):
    user_id: str
    month_year: str

class MeeshoReconcileRequest(BaseModel):
    user_id: str
    period_from: str
    period_to: str


class TemplateSaveRequest(BaseModel):
    user_id: str
    template_name: str
    file_type: str
    column_mapping: dict
    delimiter: Optional[str] = ","
    skip_rows: Optional[int] = 0

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {"service": "ProScale Advisory Dynamic Financial OS Engine", "version": "2.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "proscale-advisory-api", "version": "2.0.0"}


@app.get("/api/health")
async def api_health_check():
    return {"status": "ok", "service": "proscale-advisory-api", "version": "2.0.0"}

# --------------------------------------------------------------------------
# FILE PREVIEW & AUTO-MAPPING SUGGESTION
# --------------------------------------------------------------------------
@app.post("/upload-preview")
async def upload_preview(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    file_type: str = Form(...), # sales, payment, return, catalog
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded file, extracts the first few lines and headers,
    and returns suggested mappings and a visual preview.
    """
    if file_type not in CANONICAL_FIELDS:
        raise HTTPException(status_code=400, detail="Invalid file type category")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Unsupported file layout format")

    try:
        content = await file.read()
        buffer = io.BytesIO(content)
        sheet_names = []
        if ext != "csv":
            try:
                excel_file = pd.ExcelFile(buffer)
                sheet_names = excel_file.sheet_names
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to read Excel workbook sheets: {str(e)}")

        # Check if Meesho
        is_meesho = "meesho" in file.filename.lower() or any("meesho" in str(s).lower() for s in sheet_names)

        if is_meesho:
            # Instantiate extraction engine
            engine_meesho = MeeshoExtractionEngine(db, user_id)
            contract = engine_meesho.classify_file(file.filename, sheet_names)
            
            if not contract:
                raise HTTPException(
                    status_code=400, 
                    detail="Unknown Meesho report format or missing expected worksheets. Please verify the report contract."
                )

            # Load and parse for preview
            validation_errors = []
            preview_rows = []
            raw_headers = []
            
            if contract.report_family in ("gst_sales", "gst_returns"):
                target_sheet = contract.expected_sheets[0]
                if target_sheet not in sheet_names:
                    raise HTTPException(status_code=400, detail=f"Required sheet '{target_sheet}' not found.")
                
                # Parse
                buffer.seek(0)
                df_raw = pd.read_excel(buffer, sheet_name=target_sheet, header=None, dtype=str)
                if df_raw.empty:
                    raise HTTPException(status_code=400, detail="Sheet is empty.")
                df_raw.columns = list(df_raw.iloc[0])
                df_raw = df_raw.iloc[1:].reset_index(drop=True)
                
                df_sliced = engine_meesho.slice_horizontal_blocks(df_raw, contract.id)
                validation_errors = engine_meesho.run_pre_ingestion_validation(df_sliced, contract, target_sheet)
                
                raw_headers = list(df_sliced.columns)
                preview_rows = df_sliced.head(5).fillna("").to_dict(orient="records")
                
            elif contract.report_family == "payout":
                # Find Order Payments
                target_sheet = "Order Payments"
                if target_sheet not in sheet_names:
                    raise HTTPException(status_code=400, detail="Required sheet 'Order Payments' not found.")
                
                buffer.seek(0)
                df_raw = pd.read_excel(buffer, sheet_name=target_sheet, header=None, dtype=str)
                df_parsed = engine_meesho.parse_payment_order_payments(df_raw, contract)
                validation_errors = engine_meesho.run_pre_ingestion_validation(df_parsed, contract, target_sheet)
                
                raw_headers = list(df_parsed.columns)
                preview_rows = df_parsed.head(5).fillna("").to_dict(orient="records")

            suggested_mappings = contract.column_aliases_json
            
            # Map canonical schema file type to the contract family
            category = "sales"
            if contract.report_family == "payout":
                category = "payment"
            elif contract.report_family == "gst_returns":
                category = "return"

            suitability = []
            if contract.report_family in ("gst_sales", "gst_returns"):
                suitability.append("suitable_for_gst")
            elif contract.report_family == "payout":
                suitability.append("suitable_for_payout")

            return {
                "filename": file.filename,
                "file_type": category,
                "raw_headers": raw_headers,
                "suggested_mappings": suggested_mappings,
                "canonical_schema": CANONICAL_FIELDS[category],
                "preview_rows": preview_rows,
                "saved_templates": [],
                "contract_id": contract.id,
                "confidence_level": contract.confidence_level,
                "sheet_names": sheet_names,
                "validation_errors": validation_errors,
                "suitability": suitability
            }

        # Standard fallback logic
        buffer.seek(0)
        if ext == "csv":
            df = pd.read_csv(buffer, nrows=5, dtype=str)
        else:
            full_df = load_excel_to_dataframe(content, file.filename, file_type)
            df = full_df.head(5)

        raw_headers = [str(c) for c in df.columns]
        preview_rows = df.fillna("").to_dict(orient="records")

        # Get fuzzy mapping suggestions
        suggested_mappings = predict_column_mappings(raw_headers, file_type)

        # Query user's existing templates for this category
        templates_res = db.execute(
            text("SELECT id, template_name, column_mapping FROM public.file_templates WHERE user_id = :uid AND file_type = :ft"),
            {"uid": user_id, "ft": file_type}
        ).fetchall()

        templates = [
            {"id": str(r[0]), "name": r[1], "mapping": r[2]}
            for r in templates_res
        ]

        return {
            "filename": file.filename,
            "file_type": file_type,
            "raw_headers": raw_headers,
            "suggested_mappings": suggested_mappings,
            "canonical_schema": CANONICAL_FIELDS[file_type],
            "preview_rows": preview_rows,
            "saved_templates": templates,
            "contract_id": None,
            "confidence_level": "official",
            "sheet_names": sheet_names,
            "validation_errors": [],
            "suitability": [f"suitable_for_{file_type}"]
        }

    except Exception as e:
        logger.error(f"Preview failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to parse file preview: {str(e)}")

# --------------------------------------------------------------------------
# CHUNKED STREAMING PIPELINE (INGESTION)
# --------------------------------------------------------------------------
@app.post("/upload-stream")
async def upload_stream(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    file_type: str = Form(...),
    month_year: str = Form(...),
    column_mapping_json: str = Form(...), # JSON string mapping raw to canonical
    db: Session = Depends(get_db)
):
    """
    Accepts file + mapping configuration, renames columns dynamically,
    and streams clean normalized chunks into database.
    """
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    content = await file.read()
    buffer = io.BytesIO(content)

    # 1. Route Meesho files through the contract extraction engine
    try:
        sheet_names = []
        if ext != "csv":
            try:
                excel_file = pd.ExcelFile(buffer)
                sheet_names = excel_file.sheet_names
            except Exception:
                pass

        is_meesho = "meesho" in file.filename.lower() or any("meesho" in str(s).lower() for s in sheet_names)

        if is_meesho:
            engine_meesho = MeeshoExtractionEngine(db, user_id)
            result = engine_meesho.process_and_save(content, file.filename, month_year)
            return {
                "status": "success",
                "file_type": file_type,
                "total_rows": result["records_inserted"],
                "chunks_processed": 1,
                "batch_id": result["upload_id"],
                "message": f"Successfully ingested {result['records_inserted']} records into Meesho canonical fact tables."
            }
    except ValueError as val_e:
        raise HTTPException(status_code=400, detail=str(val_e))
    except Exception as e:
        logger.error(f"Meesho streaming failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Meesho streaming ingestion error: {str(e)}")

    # 2. Standard fallback logic for non-Meesho files
    try:
        mapping = json.loads(column_mapping_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid column_mapping_json payload")

    # Inverted mapping: { "raw_header": "canonical_name" }
    inverted_map = {v: k for k, v in mapping.items()}

    buffer.seek(0)
    batch_id = str(uuid.uuid4())
    total_rows = 0
    chunks_count = 0

    if file_type == "payment":
        target_table = "raw_payments_staging"
    elif file_type == "return":
        target_table = "raw_returns_staging"
    elif file_type == "catalog":
        target_table = "product_catalog"
    else:
        target_table = f"raw_{file_type}_staging"
    
    try:
        # Create reader
        if ext == "csv":
            reader = pd.read_csv(buffer, chunksize=MAX_CHUNK_SIZE, dtype=str, low_memory=True)
        else:
            full_df = load_excel_to_dataframe(content, file.filename, file_type)

            reader = [full_df.iloc[i:i + MAX_CHUNK_SIZE] for i in range(0, len(full_df), MAX_CHUNK_SIZE)]

        # Auto-detect channel from filename or mapping headers
        channel = "standard"
        fn_lower = file.filename.lower() if file.filename else ""
        if "meesho" in fn_lower:
            channel = "meesho"
        elif "amazon" in fn_lower or "mtr" in fn_lower:
            channel = "amazon"
        elif "flipkart" in fn_lower or "stl" in fn_lower:
            channel = "flipkart"
        elif "myntra" in fn_lower or "ppmp" in fn_lower:
            channel = "myntra"
            
        for raw_h in mapping.keys():
            rh_lower = str(raw_h).lower()
            if "meesho" in rh_lower:
                channel = "meesho"
                break
            if "amazon" in rh_lower:
                channel = "amazon"
                break
            if "flipkart" in rh_lower:
                channel = "flipkart"
                break
            if "myntra" in rh_lower:
                channel = "myntra"
                break

        for chunk in reader:
            if chunk.empty:
                continue

            # Convert raw rows to JSON strings for postgres jsonb
            metadata_list = [json.dumps(row) for row in chunk.fillna("").to_dict(orient="records")]

            # Rename raw headers to database canonical names
            chunk = chunk.rename(columns=mapping)

            # Filter only to canonical fields
            valid_cols = [c for c in chunk.columns if c in CANONICAL_FIELDS[file_type]]
            chunk = chunk[valid_cols].copy()

            if chunk.empty:
                continue

            # Clean and coerce data types
            for col, spec in CANONICAL_FIELDS[file_type].items():
                if col in chunk.columns:
                    if spec.get("type") == "float":
                        chunk[col] = pd.to_numeric(chunk[col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors="coerce").fillna(0.0)
                    elif spec.get("type") == "int":
                        chunk[col] = pd.to_numeric(chunk[col], errors="coerce").fillna(0).astype(int)
                    else:
                        chunk[col] = chunk[col].astype(str).str.strip()

            # Inject metadata
            chunk["user_id"] = user_id
            if file_type != "catalog":
                chunk["month_year"] = month_year
                chunk["upload_batch_id"] = batch_id
                chunk["channel"] = channel
                chunk["metadata"] = metadata_list
                
            # Perform upsert for product catalog
            if file_type == "catalog":
                # Raw insert with upsert constraint
                for _, row in chunk.iterrows():
                    db.execute(
                        text("""
                            INSERT INTO public.product_catalog (user_id, sku, product_name, cost_price, selling_price, min_safety_stock, stock_in_transit, weight_g, weight_slab_g)
                            VALUES (:uid, :sku, :name, :cp, :sp, :ss, :sit, :wg, :wsg)
                            ON CONFLICT (user_id, sku) DO UPDATE SET
                                product_name = EXCLUDED.product_name,
                                cost_price = EXCLUDED.cost_price,
                                selling_price = EXCLUDED.selling_price,
                                min_safety_stock = EXCLUDED.min_safety_stock,
                                stock_in_transit = EXCLUDED.stock_in_transit,
                                weight_g = COALESCE(NULLIF(EXCLUDED.weight_g, 0), product_catalog.weight_g),
                                weight_slab_g = COALESCE(NULLIF(EXCLUDED.weight_slab_g, 500), product_catalog.weight_slab_g),
                                updated_at = NOW();
                        """),
                        {
                            "uid": user_id,
                            "sku": row.get("sku"),
                            "name": row.get("product_name", ""),
                            "cp": float(row.get("cost_price", 0.0)),
                            "sp": float(row.get("selling_price", 0.0)),
                            "ss": int(row.get("min_safety_stock", 10)),
                            "sit": int(row.get("stock_in_transit", 0)),
                            "wg": int(row.get("weight_g", 0)),
                            "wsg": int(row.get("weight_slab_g", 500))
                        }
                    )
                db.commit()
            else:
                # Direct SQL append for staging tables (no unique constraints during staging)
                chunk.to_sql(
                    name=target_table,
                    con=engine,
                    schema="public",
                    if_exists="append",
                    index=False,
                    method="multi"
                )

            total_rows += len(chunk)
            chunks_count += 1

        return {
            "status": "success",
            "file_type": file_type,
            "total_rows": total_rows,
            "chunks_processed": chunks_count,
            "batch_id": batch_id,
            "message": f"Successfully ingested {total_rows} records into {target_table}."
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Streaming failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Streaming ingestion error: {str(e)}")

# --------------------------------------------------------------------------
# TEMPLATES MANAGEMENT
# --------------------------------------------------------------------------
@app.post("/templates")
async def save_template(req: TemplateSaveRequest, db: Session = Depends(get_db)):
    """Saves a schema configuration template for future uploads."""
    try:
        db.execute(
            text("""
                INSERT INTO public.file_templates (user_id, template_name, file_type, column_mapping, delimiter, skip_rows)
                VALUES (:uid, :name, :ft, :map, :del, :skip)
                ON CONFLICT (user_id, template_name) DO UPDATE SET
                    column_mapping = EXCLUDED.column_mapping,
                    delimiter = EXCLUDED.delimiter,
                    skip_rows = EXCLUDED.skip_rows,
                    updated_at = NOW();
            """),
            {
                "uid": req.user_id,
                "name": req.template_name,
                "ft": req.file_type,
                "map": json.dumps(req.column_mapping),
                "del": req.delimiter,
                "skip": req.skip_rows
            }
        )
        db.commit()
        return {"status": "success", "message": f"Template '{req.template_name}' saved successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --------------------------------------------------------------------------
# CONSOLIDATED RECONCILIATION TRIGGER
# --------------------------------------------------------------------------
@app.post("/reconcile")
async def run_reconciliation(req: ReconcileRequest, db: Session = Depends(get_db)):
    """Runs database-side FULL OUTER JOIN aggregation matching."""
    import calendar
    from datetime import date
    try:
        # 1. Run standard channel reconciliation
        res = db.execute(
            text("SELECT * FROM public.reconcile_orders(:uid, :period)"),
            {"uid": req.user_id, "period": req.month_year}
        )
        row = res.fetchone()

        # 2. Run Meesho channel reconciliation dynamically using dates boundaries of the period month
        row_meesho = None
        try:
            year, month = map(int, req.month_year.split("-"))
            last_day = calendar.monthrange(year, month)[1]
            p_from = date(year, month, 1)
            p_to = date(year, month, last_day)

            res_meesho = db.execute(
                text("SELECT * FROM public.reconcile_meesho_settlement(:uid, :p_from, :p_to)"),
                {"uid": req.user_id, "p_from": p_from, "p_to": p_to}
            )
            row_meesho = res_meesho.fetchone()
        except Exception as me_err:
            logger.error(f"Auto-triggering Meesho reconciliation failed: {me_err}", exc_info=True)

        db.commit()
        
        # Combine results
        total_matched = (row[0] or 0) if row else 0
        total_flagged = (row[1] or 0) if row else 0
        total_variance = float(row[2] or 0.0) if row else 0.0
        net_profit = float(row[3] or 0.0) if row else 0.0

        if row_meesho:
            total_matched += (row_meesho[0] or 0)
            total_flagged += (row_meesho[1] or 0)
            net_profit += float(row_meesho[4] or 0.0)

        return {
            "status": "success",
            "total_matched": total_matched,
            "total_flagged": total_flagged,
            "total_variance": total_variance,
            "net_profit": net_profit,
            "message": f"Complete financial reconciliation completed for {req.month_year}."
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Reconciliation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reconcile-meesho")
async def run_meesho_reconciliation(req: MeeshoReconcileRequest, db: Session = Depends(get_db)):
    """Runs the reconcile_meesho_settlement stored procedure on database fact tables."""
    try:
        p_from = datetime.strptime(req.period_from, "%Y-%m-%d").date()
        p_to = datetime.strptime(req.period_to, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    try:
        res = db.execute(
            text("SELECT * FROM public.reconcile_meesho_settlement(:uid, :p_from, :p_to)"),
            {"uid": req.user_id, "p_from": p_from, "p_to": p_to}
        )
        row = res.fetchone()
        db.commit()
        
        if row:
            return {
                "status": "success",
                "total_orders": row[0] or 0,
                "total_flagged": row[1] or 0,
                "underpaid_count": row[2] or 0,
                "overpaid_count": row[3] or 0,
                "net_profit": float(row[4] or 0.0),
                "message": f"Meesho reconciliation completed for period {req.period_from} to {req.period_to}."
            }
        else:
            return {"status": "success", "total_orders": 0, "total_flagged": 0, "underpaid_count": 0, "overpaid_count": 0, "net_profit": 0.0}
    except Exception as e:
        db.rollback()
        logger.error(f"Meesho reconciliation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------------------------
# FINANCIAL OS ANALYTICS — Aggregated JSON metrics
# --------------------------------------------------------------------------
@app.get("/analytics")
async def get_financial_analytics(
    user_id: str = Query(...),
    month_year: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Computes Unit Economics, Cost Analysis, Heatmap data, and Inventory recommendations.
    """
    try:
        # 1. Total Financial Summaries
        summary = db.execute(
            text("""
                SELECT
                    COALESCE(SUM(gross_sales), 0)        AS gross_revenue,
                    COALESCE(SUM(gross_tax), 0)          AS gross_tax,
                    COALESCE(SUM(refund_amount), 0)      AS returns_refund,
                    COALESCE(SUM(net_sales), 0)          AS net_revenue,
                    COALESCE(SUM(settled_amount), 0)     AS settled_cash,
                    COALESCE(SUM(marketplace_fee), 0)    AS platform_fees,
                    COALESCE(SUM(cost_price), 0)         AS cogs,
                    COALESCE(SUM(net_profit), 0)         AS total_profit,
                    COALESCE(SUM(tcs_amount), 0)         AS tcs,
                    COALESCE(SUM(tds_amount), 0)         AS tds,
                    COALESCE(SUM(ABS(variance)), 0)      AS variance,
                    COUNT(*)                             AS total_orders,
                    COUNT(*) FILTER (WHERE risk_flag != 'OK') AS flagged_count
                FROM public.reconciled_ledger
                WHERE user_id = :uid AND month_year = :period
            """),
            {"uid": user_id, "period": month_year}
        ).fetchone()

        # 2. Product-wise Unit Economics (Top 10 Profitable and Top 10 returns)
        sku_economics = db.execute(
            text("""
                SELECT 
                    sku,
                    MAX(product_description) AS product_name,
                    SUM(quantity_sold) AS units_sold,
                    SUM(quantity_returned) AS units_returned,
                    SUM(net_sales) AS net_revenue,
                    SUM(cost_price) AS cogs,
                    SUM(marketplace_fee) AS fees,
                    SUM(net_profit) AS profit
                FROM public.reconciled_ledger
                WHERE user_id = :uid AND month_year = :period
                GROUP BY sku
                ORDER BY SUM(net_profit) DESC
            """),
            {"uid": user_id, "period": month_year}
        ).fetchall()

        skus = [
            {
                "sku": r[0],
                "name": r[1] or "Unknown Product",
                "sold": r[2],
                "returned": r[3],
                "net_revenue": float(r[4]),
                "cogs": float(r[5]),
                "fees": float(r[6]),
                "profit": float(r[7]),
                "margin_pct": round((float(r[7]) / float(r[4]) * 100), 2) if float(r[4]) > 0 else 0.0
            }
            for r in sku_economics
        ]

        # 3. State-wise Sales (for SVG Heatmap)
        state_sales_res = db.execute(
            text("""
                SELECT 
                    shipping_state,
                    COUNT(*) AS order_count,
                    SUM(net_sales) AS revenue
                FROM public.reconciled_ledger
                WHERE user_id = :uid AND month_year = :period AND shipping_state != 'UNKNOWN'
                GROUP BY shipping_state
                ORDER BY SUM(net_sales) DESC
            """),
            {"uid": user_id, "period": month_year}
        ).fetchall()

        # Map state names to standard capitalization format for frontend paths
        heatmap = {
            r[0].strip().title(): {
                "orders": r[1],
                "revenue": float(r[2])
            }
            for r in state_sales_res
        }

        # 4. Operations / Inventory Intelligence
        # Calculate daily sales rate based on current month's sales to recommend safety stock levels
        inventory_res = db.execute(
            text("""
                SELECT 
                    c.sku,
                    c.product_name,
                    COALESCE(SUM(l.net_quantity), 0) AS monthly_sales,
                    MAX(c.min_safety_stock) AS min_safety,
                    MAX(c.stock_in_transit) AS transit,
                    MAX(c.cost_price) AS cost
                FROM public.product_catalog c
                LEFT JOIN public.reconciled_ledger l ON c.user_id = l.user_id AND c.sku = l.sku AND l.month_year = :period
                WHERE c.user_id = :uid
                GROUP BY c.sku, c.product_name
            """),
            {"uid": user_id, "period": month_year}
        ).fetchall()

        inventory_intel = []
        for r in inventory_res:
            monthly_sales = r[2]
            daily_run_rate = round(monthly_sales / 30.0, 2)
            
            # Recommendation thresholds
            recommended_daily = round(daily_run_rate * 7, 0) # 1 week supply
            recommended_weekly = round(daily_run_rate * 30, 0) # 1 month supply

            inventory_intel.append({
                "sku": r[0],
                "name": r[1] or "Unknown Product",
                "monthly_sales": monthly_sales,
                "daily_run_rate": daily_run_rate,
                "min_safety_stock": r[3],
                "stock_in_transit": r[4],
                "cost": float(r[5]),
                "recommended_inventory_day": int(recommended_daily),
                "recommended_inventory_week": int(recommended_weekly)
            })

        # Flagged list (first 100 for review)
        flagged_ledger = db.execute(
            text("""
                SELECT 
                    order_id, sku, product_description, quantity_sold, quantity_returned,
                    net_quantity, gross_sales, gross_tax, tcs_amount, refund_amount,
                    settled_amount, marketplace_fee, tds_amount, net_payout,
                    net_sales, cost_price, net_profit, shipping_state,
                    variance, risk_flag, month_year, channel, dispute_flags
                FROM public.reconciled_ledger
                WHERE user_id = :uid AND month_year = :period AND risk_flag != 'OK'
                ORDER BY ABS(variance) DESC
                LIMIT 100
            """),
            {"uid": user_id, "period": month_year}
        ).fetchall()
        
        flagged_list = [
            {
                "order_id": r[0],
                "sku": r[1],
                "product_description": r[2] or "Unknown Product",
                "quantity_sold": int(r[3] or 0),
                "quantity_returned": int(r[4] or 0),
                "net_quantity": int(r[5] or 0),
                "gross_sales": float(r[6] or 0.0),
                "gross_tax": float(r[7] or 0.0),
                "tcs_amount": float(r[8] or 0.0),
                "refund_amount": float(r[9] or 0.0),
                "settled_amount": float(r[10] or 0.0),
                "marketplace_fee": float(r[11] or 0.0),
                "tds_amount": float(r[12] or 0.0),
                "net_payout": float(r[13] or 0.0),
                "net_sales": float(r[14] or 0.0),
                "cost_price": float(r[15] or 0.0),
                "net_profit": float(r[16] or 0.0),
                "shipping_state": r[17] or "UNKNOWN",
                "variance": float(r[18] or 0.0),
                "risk": r[19] or "OK",
                "month_year": r[20],
                "channel": r[21] or "standard",
                "dispute_flags": r[22] or []
            }
            for r in flagged_ledger
        ]

        return {
            "summary": {
                "gross_revenue": float(summary[0]),
                "gross_tax": float(summary[1]),
                "returns_refund": float(summary[2]),
                "net_revenue": float(summary[3]),
                "settled_cash": float(summary[4]),
                "platform_fees": float(summary[5]),
                "cogs": float(summary[6]),
                "total_profit": float(summary[7]),
                "tcs": float(summary[8]),
                "tds": float(summary[9]),
                "variance": float(summary[10]),
                "total_orders": summary[11],
                "flagged_count": summary[12]
            },
            "skus": skus,
            "heatmap": heatmap,
            "inventory": inventory_intel,
            "flagged_orders": flagged_list
        }

    except Exception as e:
        logger.error(f"Analytics query failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# --------------------------------------------------------------------------
# EXPORT
# --------------------------------------------------------------------------
@app.get("/export")
async def export_flagged(
    user_id: str = Query(...),
    month_year: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        result = db.execute(
            text("""
                SELECT 
                    order_id, sku, product_description, quantity_sold, quantity_returned,
                    net_quantity, gross_sales, refund_amount, settled_amount,
                    marketplace_fee, net_payout, net_sales, cost_price, net_profit,
                    shipping_state, variance, risk_flag, month_year
                FROM public.reconciled_ledger
                WHERE user_id = :uid AND month_year = :period
                ORDER BY ABS(variance) DESC
            """),
            {"uid": user_id, "period": month_year}
        )
        
        rows = result.fetchall()
        columns = [
            "Order ID", "SKU", "Description", "Qty Sold", "Qty Returned",
            "Net Qty", "Gross Sales", "Refund Amt", "Settled Amt",
            "Platform Fees", "Net Payout", "Net Sales", "COGS", "Net Profit",
            "Shipping State", "Variance", "Risk Flag", "Period"
        ]
        
        df = pd.DataFrame(rows, columns=columns)
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)
        
        filename = f"reconciliation_report_{month_year}.csv"
        return StreamingResponse(
            io.BytesIO(buffer.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --------------------------------------------------------------------------
# STAGING ROW COUNTS
# --------------------------------------------------------------------------
@app.get("/staging-status")
async def staging_status(
    user_id: str = Query(...),
    month_year: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        sales = db.execute(
            text("SELECT COUNT(*) FROM public.raw_sales_staging WHERE user_id = :uid AND month_year = :period"),
            {"uid": user_id, "period": month_year}
        ).scalar() or 0

        payments = db.execute(
            text("SELECT COUNT(*) FROM public.raw_payments_staging WHERE user_id = :uid AND month_year = :period"),
            {"uid": user_id, "period": month_year}
        ).scalar() or 0

        returns = db.execute(
            text("SELECT COUNT(*) FROM public.raw_returns_staging WHERE user_id = :uid AND month_year = :period"),
            {"uid": user_id, "period": month_year}
        ).scalar() or 0

        catalog = db.execute(
            text("SELECT COUNT(*) FROM public.product_catalog WHERE user_id = :uid"),
            {"uid": user_id}
        ).scalar() or 0

        return {
            "sales_rows_staged": sales,
            "payment_rows_staged": payments,
            "returns_rows_staged": returns,
            "catalog_products": catalog,
            "ready_to_reconcile": (sales > 0 or returns > 0) and payments > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------------------------
# WAREHOUSE RETURN LOGS UPLOAD
# --------------------------------------------------------------------------
@app.post("/upload-warehouse-logs")
async def upload_warehouse_logs(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    db: Session = Depends(get_db)
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    content = await file.read()
    buffer = io.BytesIO(content)
    
    try:
        if ext == "csv":
            df = pd.read_csv(buffer, dtype=str)
        else:
            df = pd.read_excel(buffer, dtype=str)
            
        df.columns = [str(c).strip().lower().replace("_", " ").replace("-", " ") for c in df.columns]
        
        order_col = None
        sku_col = None
        
        for c in df.columns:
            if "order" in c or "sub order" in c:
                order_col = c
            if "sku" in c or "item" in c or "product" in c:
                sku_col = c
                
        if not order_col:
            order_col = df.columns[0]
            
        records_inserted = 0
        for _, row in df.iterrows():
            order_val = row.get(order_col)
            sku_val = row.get(sku_col) if sku_col else None
            
            if order_val and pd.notna(order_val):
                db.execute(
                    text("""
                        INSERT INTO public.raw_warehouse_logs (user_id, order_id, sku)
                        VALUES (:uid, :order_id, :sku)
                        ON CONFLICT (user_id, order_id, sku) DO NOTHING;
                    """),
                    {
                        "uid": user_id,
                        "order_id": str(order_val).strip(),
                        "sku": str(sku_val).strip() if sku_val else None
                    }
                )
                records_inserted += 1
                
        db.commit()
        return {"status": "success", "message": f"Successfully imported {records_inserted} warehouse return scan logs."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Warehouse upload failed: {str(e)}")


# --------------------------------------------------------------------------
# CLAIMS & DISPUTES
# --------------------------------------------------------------------------
@app.get("/disputes")
async def get_disputes(
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        res = db.execute(
            text("""
                SELECT id, order_id, channel, dispute_type, amount, description, status, created_at
                FROM public.dispute_tickets
                WHERE user_id = :uid
                ORDER BY created_at DESC
            """),
            {"uid": user_id}
        ).fetchall()
        
        tickets = [
            {
                "id": r[0],
                "order_id": r[1],
                "channel": r[2],
                "dispute_type": r[3],
                "amount": float(r[4] or 0.0),
                "description": r[5],
                "status": r[6],
                "created_at": r[7].isoformat()
            }
            for r in res
        ]
        return tickets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DisputeStatusUpdateRequest(BaseModel):
    status: str


@app.post("/disputes/{ticket_id}/status")
async def update_dispute_status(
    ticket_id: int,
    req: DisputeStatusUpdateRequest,
    db: Session = Depends(get_db)
):
    if req.status not in ('OPEN', 'FILED', 'RESOLVED', 'REJECTED'):
        raise HTTPException(status_code=400, detail="Invalid dispute status")
        
    try:
        db.execute(
            text("UPDATE public.dispute_tickets SET status = :status, updated_at = NOW() WHERE id = :tid"),
            {"status": req.status, "tid": ticket_id}
        )
        db.commit()
        return {"status": "success", "message": f"Dispute ticket status updated to {req.status}."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
