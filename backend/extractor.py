import io
import json
import hashlib
import logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text

from meesho_contracts import MEESHO_CONTRACTS, ReportContractSchema

logger = logging.getLogger("tax-recon.extractor")

def calculate_file_hash(content: bytes) -> str:
    """Computes SHA-256 hash of file content to prevent duplicate uploads."""
    return hashlib.sha256(content).hexdigest()

def parse_date(date_str: Any) -> Optional[date]:
    """Robustly parses date strings in multiple formats."""
    if pd.isna(date_str) or not str(date_str).strip():
        return None
    s = str(date_str).strip()
    # Try common formats
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s.split(" ")[0], fmt).date()
        except ValueError:
            continue
    # Fallback to pandas parsing
    try:
        dt = pd.to_datetime(s, errors="coerce")
        if pd.notna(dt):
            return dt.date()
    except Exception:
        pass
    return None

def clean_numeric(val: Any) -> float:
    """Coerces cell values into clean floats, stripping currency characters and formatting."""
    if pd.isna(val):
        return 0.0
    s = str(val).strip()
    if not s:
        return 0.0
    # Keep only digits, dots, and minus signs
    s_cleaned = "".join(c for c in s if c.isdigit() or c in (".", "-"))
    try:
        return float(s_cleaned) if s_cleaned else 0.0
    except ValueError:
        return 0.0

def clean_int(val: Any) -> int:
    """Coerces values to integer, default 0."""
    return int(clean_numeric(val))

class MeeshoExtractionEngine:
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id

    def classify_file(self, filename: str, sheet_names: List[str]) -> Optional[ReportContractSchema]:
        """
        Classifies an uploaded Meesho file against our report contracts.
        If the file matches Meesho aliases but does not match any contract, returns None (unknown Meesho format).
        """
        fn_lower = filename.lower()
        
        # Check against registered contracts
        matched_contract = None
        for contract in MEESHO_CONTRACTS:
            # Check name aliases
            name_match = False
            for alias in contract.report_name_aliases:
                if alias.lower() in fn_lower:
                    name_match = True
                    break
            
            # Check expected sheets
            sheet_match = False
            if name_match:
                # If we have sheets, at least one expected sheet must match
                if not contract.expected_sheets:
                    sheet_match = True
                else:
                    for s in sheet_names:
                        if any(exp.lower() in s.lower() for exp in contract.expected_sheets):
                            sheet_match = True
                            break
            
            if name_match and sheet_match:
                matched_contract = contract
                break

        if matched_contract:
            return matched_contract

        # If it contains meesho keyword but didn't match a contract, it's an unknown Meesho format
        is_meesho_by_keyword = "meesho" in fn_lower or any("meesho" in str(s).lower() for s in sheet_names)
        if is_meesho_by_keyword:
            return None

        # Not a Meesho file at all
        return None

    def slice_horizontal_blocks(self, df: pd.DataFrame, contract_id: str) -> pd.DataFrame:
        """
        Slices the Meesho GST horizontal multi-block sheet.
        * Outward Sales is block 0 (columns before first duplicate column suffix like .1)
        * Outward Returns is block 1 (columns containing .1, stripped to match schemas)
        """
        cols = list(df.columns)
        if contract_id == "MEESHO_GST_TCS_SALES_CURRENT":
            # Outward Sales Block: Columns before the first duplicate column containing .1
            first_suffix_idx = len(cols)
            for i, c in enumerate(cols):
                if ".1" in str(c):
                    first_suffix_idx = i
                    break
            target_cols = cols[:first_suffix_idx]
            sliced_df = df[target_cols].copy()
            # Clean up column names (remove pandas suffixes if any)
            sliced_df.columns = [str(c).split(".")[0].strip() for c in sliced_df.columns]
            return sliced_df
            
        elif contract_id == "MEESHO_GST_TCS_SALES_RETURN_CURRENT":
            # Outward Returns Block: Columns containing .1 suffix
            target_cols = [c for c in cols if ".1" in str(c)]
            if not target_cols:
                return pd.DataFrame() # Empty block
            sliced_df = df[target_cols].copy()
            # Rename by stripping the .1 suffix
            sliced_df.columns = [str(c).replace(".1", "").strip() for c in sliced_df.columns]
            return sliced_df
            
        return df

    def parse_payment_order_payments(self, df_raw: pd.DataFrame, contract: ReportContractSchema) -> pd.DataFrame:
        """
        Parses Meesho payout sheets by combining Row 1 group headers and Row 2 column headers.
        Skips Row 3 formula rows and starts data from Row 4.
        """
        if len(df_raw) < 3:
            raise ValueError("Meesho payout sheet has insufficient rows to combine group and column headers.")

        # Row 1 is group headers (index 0)
        row1 = list(df_raw.iloc[0])
        # Forward fill Row 1
        filled_row1 = []
        current = ""
        for x in row1:
            val = str(x).strip() if pd.notna(x) else ""
            if val:
                current = val
            filled_row1.append(current)

        # Row 2 is column headers (index 1)
        row2 = list(df_raw.iloc[1])

        # Combine Row 1 and Row 2 headers
        combined_headers = []
        for r1, r2 in zip(filled_row1, row2):
            r1_clean = str(r1).strip()
            r2_clean = str(r2).strip() if pd.notna(r2) else ""
            if r1_clean and r2_clean:
                combined_headers.append(f"{r1_clean}_{r2_clean}")
            elif r2_clean:
                combined_headers.append(r2_clean)
            else:
                combined_headers.append(f"Unnamed_{len(combined_headers)}")

        # Skip Row 3 formula row (index 2 in df_raw) and slice data starting from Row 4 (index 3)
        df_data = df_raw.iloc[3:].copy()
        df_data.columns = combined_headers
        df_data = df_data.reset_index(drop=True)
        return df_data

    def run_pre_ingestion_validation(
        self, 
        df: pd.DataFrame, 
        contract: ReportContractSchema,
        sheet_name: str
    ) -> List[str]:
        """
        Validates the extracted data frame against contract requirements.
        Returns a list of error strings. If empty, the file is valid.
        """
        errors = []
        cols = [str(c).strip() for c in df.columns]

        # Check required columns
        # In payment sheets, if it's the main sheet (Order Payments), we check required columns.
        # Other sheets are optional/nullable and validated separately.
        if sheet_name == "Order Payments" or contract.report_family in ("gst_sales", "gst_returns"):
            for req_col in contract.required_columns:
                if req_col not in cols:
                    errors.append(f"Missing required column in '{sheet_name}': '{req_col}'")

        # Basic formats check (e.g. check GSTIN if present)
        gstin_col = None
        for c in cols:
            if "gstin" in c.lower() or "gst" in c.lower():
                if "tcs" not in c.lower() and "rate" not in c.lower():
                    gstin_col = c
                    break

        if gstin_col and not df.empty:
            sample_gstins = df[gstin_col].dropna().head(10).tolist()
            for g in sample_gstins:
                g_str = str(g).strip()
                if g_str and len(g_str) != 15 and g_str != "nan":
                    errors.append(f"Invalid GSTIN length detected: '{g_str}' (expected 15 characters)")
                    break

        return errors

    def process_and_save(
        self, 
        content: bytes, 
        filename: str, 
        month_year: str
    ) -> Dict[str, Any]:
        """
        Main entry point for extraction, validation, and database ingestion.
        Returns ingestion metadata summary.
        """
        file_hash = calculate_file_hash(content)
        
        # 1. Read sheet names first
        buffer = io.BytesIO(content)
        try:
            excel_file = pd.ExcelFile(buffer)
            sheet_names = excel_file.sheet_names
        except Exception as e:
            # Not an Excel or unreadable
            raise ValueError(f"Failed to read file workbook layout: {e}")

        # 2. Classify contract
        contract = self.classify_file(filename, sheet_names)
        
        # Check if Meesho keyword exists in filename but contract is None
        fn_lower = filename.lower()
        if "meesho" in fn_lower and not contract:
            # Create a blank raw upload and fail
            self.create_failed_upload(
                filename, file_hash, "meesho", None, 
                ["Unknown Meesho report format or missing expected worksheets."]
            )
            raise ValueError(f"Unknown Meesho report format: '{filename}' failed classification.")

        if not contract:
            raise ValueError(f"File '{filename}' does not match Meesho schemas.")

        # Check unique file hash for user, platform, contract
        existing_upload = self.db.execute(
            text("""
                SELECT id FROM public.raw_file_uploads
                WHERE user_id = :uid AND platform = 'meesho' 
                  AND report_contract_id = :contract_id AND file_hash = :hash
            """),
            {"uid": self.user_id, "contract_id": contract.id, "hash": file_hash}
        ).fetchone()

        if existing_upload:
            self.create_failed_upload(
                filename, file_hash, "meesho", contract.id, 
                ["Duplicate file hash detected for this user and report type."]
            )
            raise ValueError("This report file has already been uploaded.")

        # Create raw upload record in PENDING status (Requirement 6)
        upload_id = self.db.execute(
            text("""
                INSERT INTO public.raw_file_uploads (
                    user_id, platform, report_contract_id, original_file_name, file_hash,
                    validation_status, source_confidence
                ) VALUES (
                    :uid, 'meesho', :contract_id, :filename, :hash, 'PENDING', :confidence
                ) RETURNING id
            """),
            {
                "uid": self.user_id,
                "contract_id": contract.id,
                "filename": filename,
                "hash": file_hash,
                "confidence": contract.confidence_level
            }
        ).scalar()
        self.db.commit()

        # Keep track of parsed details
        validation_errors = []
        empty_sheets = []
        unmapped_columns = []
        total_records_inserted = 0

        try:
            # 3. Process sheets
            if contract.report_family in ("gst_sales", "gst_returns"):
                # Handle outward sales / returns reports
                target_sheet = contract.expected_sheets[0]
                if target_sheet not in sheet_names:
                    raise ValueError(f"Required worksheet '{target_sheet}' not found in workbook.")

                df_raw = pd.read_excel(buffer, sheet_name=target_sheet, header=None, dtype=str)
                # Typically row 1 is header
                df_raw.columns = list(df_raw.iloc[0])
                df_raw = df_raw.iloc[1:].reset_index(drop=True)

                # Slice Outward / Return blocks
                df_sliced = self.slice_horizontal_blocks(df_raw, contract.id)
                if df_sliced.empty:
                    empty_sheets.append(target_sheet)
                else:
                    # Validate
                    val_errs = self.run_pre_ingestion_validation(df_sliced, contract, target_sheet)
                    validation_errors.extend(val_errs)
                    
                    if not validation_errors:
                        # Write to database (Sales/Returns)
                        count = self.save_gst_records(df_sliced, contract, upload_id, month_year)
                        total_records_inserted += count

            elif contract.report_family == "payout":
                # Handle multi-sheet Previous Payments
                for sheet in contract.sheet_name_aliases:
                    if sheet not in sheet_names:
                        # Optional sheets can be skipped, but log empty or warning
                        continue

                    # Read raw data
                    df_raw = pd.read_excel(buffer, sheet_name=sheet, header=None, dtype=str)
                    
                    # Handle empty sheets or notes (e.g. disclaimer)
                    if df_raw.empty or len(df_raw) < 2:
                        empty_sheets.append(sheet)
                        continue

                    # Check for "No data is available" messages
                    if df_raw.fillna("").astype(str).apply(lambda row: row.str.contains("no data is available", case=False).any(), axis=1).any():
                        empty_sheets.append(sheet)
                        continue

                    # Parse based on worksheet
                    if sheet == "Order Payments":
                        df_parsed = self.parse_payment_order_payments(df_raw, contract)
                        val_errs = self.run_pre_ingestion_validation(df_parsed, contract, sheet)
                        validation_errors.extend(val_errs)
                        
                        # Detect unmapped columns
                        mapped_keys = list(contract.column_aliases_json.keys())
                        unmapped = [c for c in df_parsed.columns if c not in mapped_keys]
                        unmapped_columns.extend(unmapped)

                        if not validation_errors and not df_parsed.empty:
                            count = self.save_payout_order_payments(df_parsed, contract, upload_id)
                            total_records_inserted += count

                    elif sheet == "Ads Cost":
                        # Row 1 columns
                        df_raw.columns = list(df_raw.iloc[0])
                        df_parsed = df_raw.iloc[1:].reset_index(drop=True)
                        count = self.save_ads_cost(df_parsed, contract, upload_id)
                        total_records_inserted += count

                    elif sheet == "Referral Payments":
                        df_raw.columns = list(df_raw.iloc[0])
                        df_parsed = df_raw.iloc[1:].reset_index(drop=True)
                        count = self.save_referrals(df_parsed, contract, upload_id)
                        total_records_inserted += count

                    elif sheet == "Compensation and Recovery":
                        df_raw.columns = list(df_raw.iloc[0])
                        df_parsed = df_raw.iloc[1:].reset_index(drop=True)
                        count = self.save_compensation_recovery(df_parsed, contract, upload_id)
                        total_records_inserted += count

            # Update validation status based on errors
            final_status = "VALID"
            if validation_errors:
                final_status = "INVALID"
            elif empty_sheets:
                final_status = "WARNING"

            self.db.execute(
                text("""
                    UPDATE public.raw_file_uploads
                    SET validation_status = :status,
                        validation_errors_json = :errs,
                        empty_sheets_json = :empties,
                        unmapped_columns_json = :unmapped,
                        sheet_names_detected = :sheets,
                        uploaded_at = NOW()
                    WHERE id = :id
                """),
                {
                    "id": upload_id,
                    "status": final_status,
                    "errs": json.dumps(validation_errors),
                    "empties": json.dumps(empty_sheets),
                    "unmapped": json.dumps(unmapped_columns),
                    "sheets": json.dumps(sheet_names)
                }
            )
            self.db.commit()

            if final_status == "INVALID":
                raise ValueError(f"File validation failed: {validation_errors}")

            return {
                "upload_id": str(upload_id),
                "validation_status": final_status,
                "validation_errors": validation_errors,
                "empty_sheets": empty_sheets,
                "unmapped_columns": unmapped_columns,
                "records_inserted": total_records_inserted
            }

        except Exception as e:
            self.db.rollback()
            # Log failure in raw_file_uploads
            err_msg = str(e)
            if not validation_errors:
                validation_errors.append(err_msg)
            
            try:
                self.db.execute(
                    text("""
                        UPDATE public.raw_file_uploads
                        SET validation_status = 'INVALID',
                            validation_errors_json = :errs,
                            uploaded_at = NOW()
                        WHERE id = :id
                    """),
                    {
                        "id": upload_id,
                        "errs": json.dumps(validation_errors)
                    }
                )
                self.db.commit()
            except Exception as inner_e:
                logger.error(f"Failed to record upload error: {inner_e}")
            raise e

    def create_failed_upload(
        self, 
        filename: str, 
        file_hash: str, 
        platform: str, 
        contract_id: Optional[str], 
        errors: List[str]
    ):
        """Helper to create a failed upload record when classification fails or duplicate is hit."""
        try:
            self.db.execute(
                text("""
                    INSERT INTO public.raw_file_uploads (
                        user_id, platform, report_contract_id, original_file_name, file_hash,
                        validation_status, validation_errors_json, source_confidence
                    ) VALUES (
                        :uid, :platform, :contract_id, :filename, :hash, 'INVALID', :errs, 'screenshot_observed'
                    )
                """),
                {
                    "uid": self.user_id,
                    "platform": platform,
                    "contract_id": contract_id,
                    "filename": filename,
                    "hash": file_hash,
                    "errs": json.dumps(errors)
                }
            )
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to create raw_file_uploads record: {e}")

    # ============================================================================
    # SHEET SPECIFIC DATABASE SAVE FUNCTIONS
    # ============================================================================

    def save_gst_records(self, df: pd.DataFrame, contract: ReportContractSchema, upload_id: Any, month_year: str) -> int:
        count = 0
        for _, row in df.iterrows():
            sub_order_num = row.get("sub_order_num")
            if pd.isna(sub_order_num) or not str(sub_order_num).strip():
                continue

            order_date = parse_date(row.get("order_date"))
            taxable_val = clean_numeric(row.get("total_taxable_sale_value"))
            invoice_val = clean_numeric(row.get("total_invoice_value"))
            qty = clean_int(row.get("quantity")) if "quantity" in row else 1
            sku = str(row.get("sku")).strip() if "sku" in row and pd.notna(row.get("sku")) else None
            state = str(row.get("end_customer_state_new")).strip() if "end_customer_state_new" in row and pd.notna(row.get("end_customer_state_new")) else None
            cgst = clean_numeric(row.get("cgst_amount")) if "cgst_amount" in row else 0.0
            sgst = clean_numeric(row.get("sgst_amount")) if "sgst_amount" in row else 0.0
            igst = clean_numeric(row.get("igst_amount")) if "igst_amount" in row else 0.0
            cgst_rate = clean_numeric(row.get("cgst_rate")) if "cgst_rate" in row else 0.0
            sgst_rate = clean_numeric(row.get("sgst_rate")) if "sgst_rate" in row else 0.0
            igst_rate = clean_numeric(row.get("igst_rate")) if "igst_rate" in row else 0.0
            gst_rate = cgst_rate + sgst_rate + igst_rate

            inv_no = str(row.get("invoice_number")).strip() if "invoice_number" in row and pd.notna(row.get("invoice_number")) else None
            cust_gstin = str(row.get("customer_gstin")).strip() if "customer_gstin" in row and pd.notna(row.get("customer_gstin")) else None

            # 1. Save to fact_order_items (if not already existing or append)
            self.db.execute(
                text("""
                    INSERT INTO public.fact_order_items (
                        user_id, upload_id, sub_order_num, sku, quantity, order_date, order_month, order_source
                    ) VALUES (
                        :uid, :upload_id, :order_id, :sku, :qty, :order_date, :month, 'meesho'
                    )
                """),
                {
                    "uid": self.user_id,
                    "upload_id": upload_id,
                    "order_id": sub_order_num,
                    "sku": sku,
                    "qty": qty,
                    "order_date": order_date,
                    "month": month_year
                }
            )

            # 2. Save to fact_tax_invoices
            invoice_type = "INVOICE" if contract.report_family == "gst_sales" else "CREDIT_NOTE"
            self.db.execute(
                text("""
                    INSERT INTO public.fact_tax_invoices (
                        user_id, upload_id, sub_order_num, invoice_number, invoice_date, invoice_month,
                        taxable_value, cgst_amount, sgst_amount, igst_amount, gst_rate, invoice_value,
                        shipping_state, customer_gstin, type
                    ) VALUES (
                        :uid, :upload_id, :order_id, :inv_no, :inv_date, :month,
                        :taxable_val, :cgst, :sgst, :igst, :gst_rate, :invoice_val,
                        :state, :gstin, :type
                    )
                """),
                {
                    "uid": self.user_id,
                    "upload_id": upload_id,
                    "order_id": sub_order_num,
                    "inv_no": inv_no or sub_order_num,
                    "inv_date": order_date,
                    "month": month_year,
                    "taxable_val": taxable_val,
                    "cgst": cgst,
                    "sgst": sgst,
                    "igst": igst,
                    "gst_rate": gst_rate,
                    "invoice_val": invoice_val,
                    "state": state,
                    "gstin": cust_gstin,
                    "type": invoice_type
                }
            )
            count += 1
        return count

    def save_payout_order_payments(self, df: pd.DataFrame, contract: ReportContractSchema, upload_id: Any) -> int:
        count = 0
        for _, row in df.iterrows():
            sub_order_num = row.get("Order Details_Sub Order No")
            if pd.isna(sub_order_num) or not str(sub_order_num).strip():
                continue

            payment_date = parse_date(row.get("Payment Details_Payment Date"))
            settled_amt = clean_numeric(row.get("Payment Details_Final Settlement Amount"))
            sku = str(row.get("Order Details_Supplier SKU")).strip() if "Order Details_Supplier SKU" in row and pd.notna(row.get("Order Details_Supplier SKU")) else None
            p_name = str(row.get("Order Details_Product Name")).strip() if "Order Details_Product Name" in row and pd.notna(row.get("Order Details_Product Name")) else None
            qty = clean_int(row.get("Order Details_Quantity")) if "Order Details_Quantity" in row else 1
            status = str(row.get("Order Details_Live Order Status")).strip() if "Order Details_Live Order Status" in row and pd.notna(row.get("Order Details_Live Order Status")) else None

            commission = clean_numeric(row.get("Deductions_Meesho Commission (Incl. GST)"))
            tds = clean_numeric(row.get("Deductions_TDS"))
            shipping = clean_numeric(row.get("Deductions_Shipping Charge (Incl. GST)"))
            ret_shipping = clean_numeric(row.get("Deductions_Return Shipping Charge (Incl. GST)"))
            recovery = clean_numeric(row.get("Deductions_Recovery"))
            tcs = clean_numeric(row.get("Deductions_TCS"))

            # 1. Payout Batch (Unique per Payment Date / NEFT reference if available)
            # Create a synthetic transaction batch ID per payment date
            batch_tx_id = f"MEESHO_BATCH_{payment_date.strftime('%Y%m%d') if payment_date else 'UNKNOWN'}"
            self.db.execute(
                text("""
                    INSERT INTO public.fact_payout_batches (
                        user_id, upload_id, transaction_id, payment_date, final_settlement_amount
                    ) VALUES (
                        :uid, :upload_id, :tx_id, :p_date, 0.00
                    ) ON CONFLICT (user_id, transaction_id) DO NOTHING
                """),
                {
                    "uid": self.user_id,
                    "upload_id": upload_id,
                    "tx_id": batch_tx_id,
                    "p_date": payment_date or date.today()
                }
            )

            # Get the batch ID
            batch_id = self.db.execute(
                text("SELECT id FROM public.fact_payout_batches WHERE user_id = :uid AND transaction_id = :tx_id"),
                {"uid": self.user_id, "tx_id": batch_tx_id}
            ).scalar()

            # Update batch amount
            self.db.execute(
                text("UPDATE public.fact_payout_batches SET final_settlement_amount = final_settlement_amount + :amt WHERE id = :id"),
                {"amt": settled_amt, "id": batch_id}
            )

            # 2. fact_settlement_events
            price_type = "Sale" if settled_amt >= 0 else "Return"
            self.db.execute(
                text("""
                    INSERT INTO public.fact_settlement_events (
                        user_id, upload_id, sub_order_num, settlement_date, amount, payout_batch_id, transaction_id, price_type
                    ) VALUES (
                        :uid, :upload_id, :order_id, :p_date, :amt, :batch_id, :tx_id, :price_type
                    )
                """),
                {
                    "uid": self.user_id,
                    "upload_id": upload_id,
                    "order_id": sub_order_num,
                    "p_date": payment_date or date.today(),
                    "amt": settled_amt,
                    "batch_id": batch_id,
                    "tx_id": batch_tx_id,
                    "price_type": price_type
                }
            )

            # 3. fact_order_items (enrich)
            self.db.execute(
                text("""
                    INSERT INTO public.fact_order_items (
                        user_id, upload_id, sub_order_num, sku, product_name, quantity, order_date, order_status, order_source
                    ) VALUES (
                        :uid, :upload_id, :order_id, :sku, :p_name, :qty, :p_date, :status, 'meesho'
                    )
                """),
                {
                    "uid": self.user_id,
                    "upload_id": upload_id,
                    "order_id": sub_order_num,
                    "sku": sku,
                    "p_name": p_name,
                    "qty": qty,
                    "p_date": payment_date,
                    "status": status
                }
            )

            # 4. fact_fee_lines
            # Commission
            if commission != 0.0:
                self.db.execute(
                    text("""
                        INSERT INTO public.fact_fee_lines (
                            user_id, upload_id, sub_order_num, fee_type, total_amount, billing_date
                        ) VALUES (
                            :uid, :upload_id, :order_id, 'COMMISSION', :amt, :p_date
                        )
                    """),
                    {"uid": self.user_id, "upload_id": upload_id, "order_id": sub_order_num, "amt": commission, "p_date": payment_date}
                )
            # Forward Shipping
            if shipping != 0.0:
                self.db.execute(
                    text("""
                        INSERT INTO public.fact_fee_lines (
                            user_id, upload_id, sub_order_num, fee_type, total_amount, billing_date
                        ) VALUES (
                            :uid, :upload_id, :order_id, 'SHIPPING_CHARGE', :amt, :p_date
                        )
                    """),
                    {"uid": self.user_id, "upload_id": upload_id, "order_id": sub_order_num, "amt": shipping, "p_date": payment_date}
                )
            # Return Shipping
            if ret_shipping != 0.0:
                self.db.execute(
                    text("""
                        INSERT INTO public.fact_fee_lines (
                            user_id, upload_id, sub_order_num, fee_type, total_amount, billing_date
                        ) VALUES (
                            :uid, :upload_id, :order_id, 'RETURN_SHIPPING_CHARGE', :amt, :p_date
                        )
                    """),
                    {"uid": self.user_id, "upload_id": upload_id, "order_id": sub_order_num, "amt": ret_shipping, "p_date": payment_date}
                )
            # Recovery Fee
            if recovery != 0.0:
                self.db.execute(
                    text("""
                        INSERT INTO public.fact_fee_lines (
                            user_id, upload_id, sub_order_num, fee_type, total_amount, billing_date
                        ) VALUES (
                            :uid, :upload_id, :order_id, 'OTHER_CHARGES', :amt, :p_date
                        )
                    """),
                    {"uid": self.user_id, "upload_id": upload_id, "order_id": sub_order_num, "amt": recovery, "p_date": payment_date}
                )

            # 5. fact_tax_deductions
            if tds != 0.0:
                self.db.execute(
                    text("""
                        INSERT INTO public.fact_tax_deductions (
                            user_id, upload_id, sub_order_num, deduction_type, amount, date
                        ) VALUES (
                            :uid, :upload_id, :order_id, 'TDS', :amt, :p_date
                        )
                    """),
                    {"uid": self.user_id, "upload_id": upload_id, "order_id": sub_order_num, "amt": tds, "p_date": payment_date}
                )
            if tcs != 0.0:
                self.db.execute(
                    text("""
                        INSERT INTO public.fact_tax_deductions (
                            user_id, upload_id, sub_order_num, deduction_type, amount, date
                        ) VALUES (
                            :uid, :upload_id, :order_id, 'TCS', :amt, :p_date
                        )
                    """),
                    {"uid": self.user_id, "upload_id": upload_id, "order_id": sub_order_num, "amt": tcs, "p_date": payment_date}
                )

            count += 1
        return count

    def save_ads_cost(self, df: pd.DataFrame, contract: ReportContractSchema, upload_id: Any) -> int:
        count = 0
        for _, row in df.iterrows():
            # sub_order_num is nullable for Ads Cost
            sub_order_num = None
            for c in ("sub order no", "order_id", "order id", "sub_order_num"):
                if c in row and pd.notna(row[c]):
                    sub_order_num = str(row[c]).strip()
                    break

            date_val = None
            for c in ("date", "payment date", "billing date", "campaign date", "date of payout"):
                # Clean header match
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches and pd.notna(row[matches[0]]):
                    date_val = parse_date(row[matches[0]])
                    break

            campaign_id = None
            for c in ("campaign id", "campaign no", "campaign name", "campaign"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches and pd.notna(row[matches[0]]):
                    campaign_id = str(row[matches[0]]).strip()
                    break

            amt_col = None
            for c in ("amount", "spend", "cost", "total deducted amount"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches:
                    amt_col = matches[0]
                    break

            amount = clean_numeric(row[amt_col]) if amt_col else 0.0
            # Apply multiplier from amount_sign_rules_json (default is 1.0)
            multiplier = contract.amount_sign_rules_json.get("default", 1.0)
            amount *= multiplier

            self.db.execute(
                text("""
                    INSERT INTO public.fact_fee_lines (
                        user_id, upload_id, sub_order_num, fee_type, total_amount, billing_date, campaign_id
                    ) VALUES (
                        :uid, :upload_id, :order_id, 'ADS_COST', :amt, :b_date, :camp_id
                    )
                """),
                {
                    "uid": self.user_id,
                    "upload_id": upload_id,
                    "order_id": sub_order_num,
                    "amt": amount,
                    "b_date": date_val or date.today(),
                    "camp_id": campaign_id
                }
            )
            count += 1
        return count

    def save_referrals(self, df: pd.DataFrame, contract: ReportContractSchema, upload_id: Any) -> int:
        count = 0
        for _, row in df.iterrows():
            sub_order_num = None
            for c in ("sub order no", "order_id", "order id", "sub_order_num"):
                if c in row and pd.notna(row[c]):
                    sub_order_num = str(row[c]).strip()
                    break

            reward_id = None
            for c in ("reward id", "referral id", "reward_id"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches and pd.notna(row[matches[0]]):
                    reward_id = str(row[matches[0]]).strip()
                    break

            date_val = None
            for c in ("date", "payment date", "billing date", "date of payout"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches and pd.notna(row[matches[0]]):
                    date_val = parse_date(row[matches[0]])
                    break

            amt_col = None
            for c in ("amount", "referral amount", "reward amount"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches:
                    amt_col = matches[0]
                    break

            amount = clean_numeric(row[amt_col]) if amt_col else 0.0
            multiplier = contract.amount_sign_rules_json.get("default", 1.0)
            amount *= multiplier

            tds = 0.0
            if "tds" in row:
                tds = clean_numeric(row["tds"])

            self.db.execute(
                text("""
                    INSERT INTO public.fact_adjustment_events (
                        user_id, upload_id, sub_order_num, adjustment_type, reward_id, amount, taxes, adjustment_date
                    ) VALUES (
                        :uid, :upload_id, :order_id, 'REFERRAL_PAYMENT', :reward_id, :amt, :tds, :a_date
                    )
                """),
                {
                    "uid": self.user_id,
                    "upload_id": upload_id,
                    "order_id": sub_order_num,
                    "reward_id": reward_id,
                    "amt": amount,
                    "tds": tds,
                    "a_date": date_val or date.today()
                }
            )
            count += 1
        return count

    def save_compensation_recovery(self, df: pd.DataFrame, contract: ReportContractSchema, upload_id: Any) -> int:
        count = 0
        for _, row in df.iterrows():
            sub_order_num = None
            for c in ("sub order no", "order_id", "order id", "sub_order_num"):
                # Clean check
                matches = [col for col in df.columns if c in str(col).lower().replace("_", " ").replace("-", " ")]
                if matches and pd.notna(row[matches[0]]):
                    sub_order_num = str(row[matches[0]]).strip()
                    break

            date_val = None
            for c in ("date", "payment date", "billing date", "date of payout"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches and pd.notna(row[matches[0]]):
                    date_val = parse_date(row[matches[0]])
                    break

            type_val = "COMPENSATION"
            for c in ("compensation type", "type", "description"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches and pd.notna(row[matches[0]]):
                    type_val = str(row[matches[0]]).strip()
                    break

            reason_val = None
            for c in ("reason", "remarks", "details"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches and pd.notna(row[matches[0]]):
                    reason_val = str(row[matches[0]]).strip()
                    break

            amt_col = None
            for c in ("amount", "compensation amount", "net amount"):
                matches = [col for col in df.columns if c in str(col).lower()]
                if matches:
                    amt_col = matches[0]
                    break

            raw_amount = clean_numeric(row[amt_col]) if amt_col else 0.0

            # Sign rules derived from contract (Requirement 5)
            # Match type against known keys in amount_sign_rules_json
            type_lower = type_val.lower().replace("_", " ").replace("-", " ")
            multiplier = contract.amount_sign_rules_json.get("default", 1.0)
            
            for rule_key, mult in contract.amount_sign_rules_json.items():
                if rule_key != "default" and rule_key in type_lower:
                    multiplier = mult
                    break

            amount = raw_amount * multiplier

            # Decide on claim category: COMPENSATION, CLAIMS, RECOVERY
            claim_cat = "COMPENSATION"
            if "recovery" in type_lower or "chargeback" in type_lower:
                claim_cat = "RECOVERY"
            elif "claim" in type_lower or "dispute" in type_lower:
                claim_cat = "CLAIMS"

            self.db.execute(
                text("""
                    INSERT INTO public.fact_claim_events (
                        user_id, upload_id, sub_order_num, claim_type, reason, amount, date
                    ) VALUES (
                        :uid, :upload_id, :order_id, :claim_type, :reason, :amt, :c_date
                    )
                """),
                {
                    "uid": self.user_id,
                    "upload_id": upload_id,
                    "order_id": sub_order_num,
                    "claim_type": claim_cat,
                    "reason": reason_val or type_val,
                    "amt": amount,
                    "c_date": date_val or date.today()
                }
            )
            count += 1
        return count
