from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import date, datetime

class ReportContractSchema(BaseModel):
    id: str
    platform: str
    report_family: str
    report_name: str
    report_name_aliases: List[str] = []
    sheet_name_aliases: List[str] = []
    confidence_level: str = "screenshot_observed"
    file_type: str = "xlsx"
    expected_sheets: List[str] = []
    expected_header_row: int = 1
    formula_rows_to_skip: List[int] = []
    data_start_row: int = 2
    required_columns: List[str] = []
    optional_columns: List[str] = []
    column_aliases_json: Dict[str, str] = {}
    amount_sign_rules_json: Dict[str, float] = {}
    date_format_rules_json: Dict[str, str] = {}
    canonical_mapping_json: Dict[str, str] = {}
    version: str = "1.0.0"

# Static definitions matching our report_contracts database seeds
MEESHO_CONTRACTS: List[ReportContractSchema] = [
    ReportContractSchema(
        id="MEESHO_GST_TCS_SALES_CURRENT",
        platform="meesho",
        report_family="gst_sales",
        report_name="Meesho GST TCS Sales Report",
        report_name_aliases=[
            "tcs_sales", "sales report", "gst sales report", "sales register", 
            "forward sales", "outward supply", "sales report format"
        ],
        sheet_name_aliases=["sales report format"],
        confidence_level="screenshot_observed",
        file_type="xlsx",
        expected_sheets=["sales report format"],
        expected_header_row=1,
        formula_rows_to_skip=[],
        data_start_row=2,
        required_columns=[
            "sub_order_num", 
            "order_date", 
            "total_taxable_sale_value", 
            "total_invoice_value"
        ],
        optional_columns=[
            "end_customer_state_new", 
            "quantity", 
            "sku", 
            "cgst_rate", "cgst_amount", 
            "sgst_rate", "sgst_amount", 
            "igst_rate", "igst_amount",
            "invoice_number", "customer_gstin"
        ],
        column_aliases_json={
            "sub_order_num": "order_id",
            "total_invoice_value": "invoice_value",
            "total_taxable_sale_value": "taxable_value",
            "end_customer_state_new": "shipping_state",
            "quantity": "quantity",
            "order_date": "month_year"
        },
        amount_sign_rules_json={},
        date_format_rules_json={
            "order_date": "%Y-%m-%d"
        },
        canonical_mapping_json={}
    ),
    ReportContractSchema(
        id="MEESHO_GST_TCS_SALES_RETURN_CURRENT",
        platform="meesho",
        report_family="gst_returns",
        report_name="Meesho GST TCS Return Report",
        report_name_aliases=[
            "tcs_sales_return", "sales return", "gst sales return", "credit note report", 
            "return sales", "sales return report"
        ],
        sheet_name_aliases=["sales report format"],
        confidence_level="screenshot_observed",
        file_type="xlsx",
        expected_sheets=["sales report format"],
        expected_header_row=1,
        formula_rows_to_skip=[],
        data_start_row=2,
        required_columns=[
            "sub_order_num", 
            "order_date", 
            "total_taxable_sale_value", 
            "total_invoice_value"
        ],
        optional_columns=[
            "end_customer_state_new", 
            "quantity", 
            "sku", 
            "cgst_rate", "cgst_amount", 
            "sgst_rate", "sgst_amount", 
            "igst_rate", "igst_amount",
            "invoice_number", "customer_gstin"
        ],
        column_aliases_json={
            "sub_order_num": "order_id",
            "total_invoice_value": "invoice_value",
            "total_taxable_sale_value": "taxable_value",
            "end_customer_state_new": "shipping_state",
            "quantity": "quantity",
            "order_date": "month_year"
        },
        amount_sign_rules_json={},
        date_format_rules_json={
            "order_date": "%Y-%m-%d"
        },
        canonical_mapping_json={}
    ),
    ReportContractSchema(
        id="MEESHO_PAYMENT_PREVIOUS_PAYMENT_CURRENT",
        platform="meesho",
        report_family="payout",
        report_name="Meesho Previous Payments Ledger",
        report_name_aliases=[
            "SP_ORDER_ADS_REFERRAL_PAYMENT_FILE_PREVIOUS_PAYMENT", 
            "previous payment", "order payments", "payment file", 
            "payout report", "settlement report"
        ],
        sheet_name_aliases=[
            "Order Payments", "Disclaimer", "Ads Cost", 
            "Referral Payments", "Compensation and Recovery"
        ],
        confidence_level="screenshot_observed",
        file_type="xlsx",
        expected_sheets=["Order Payments"],
        expected_header_row=2, # The column headers are in row 2 (index 1), Row 1 has group headers
        formula_rows_to_skip=[3], # The formula explanation row in row 3 (index 2)
        data_start_row=4, # Data starts at row 4 (index 3)
        # Note: These columns represent the COMBINED headers we will produce
        required_columns=[
            "Order Details_Sub Order No", 
            "Payment Details_Payment Date", 
            "Payment Details_Final Settlement Amount"
        ],
        optional_columns=[
            "Order Details_Supplier SKU",
            "Order Details_Product Name",
            "Order Details_Quantity",
            "Order Details_Live Order Status",
            "Deductions_Meesho Commission (Incl. GST)",
            "Deductions_TDS",
            "Deductions_Shipping Charge (Incl. GST)",
            "Deductions_Return Shipping Charge (Incl. GST)",
            "Deductions_Recovery",
            "Deductions_TCS"
        ],
        column_aliases_json={
            "Order Details_Sub Order No": "order_id",
            "Order Details_Supplier SKU": "sku",
            "Order Details_Product Name": "product_description",
            "Order Details_Quantity": "quantity",
            "Payment Details_Payment Date": "settlement_date",
            "Payment Details_Final Settlement Amount": "settled_amount",
            "Deductions_Meesho Commission (Incl. GST)": "marketplace_fee",
            "Deductions_TDS": "tds_amount",
            "Deductions_Shipping Charge (Incl. GST)": "shipping_charge",
            "Deductions_Return Shipping Charge (Incl. GST)": "return_shipping_charge",
            "Deductions_Recovery": "recovery_amount",
            "Deductions_TCS": "tcs_amount",
            "Order Details_Live Order Status": "order_status"
        },
        amount_sign_rules_json={
            "claims": 1.0,
            "recovery": -1.0,
            "gst_compensation": 1.0,
            "waivers": 1.0,
            "compensation": 1.0,
            "default": 1.0
        },
        date_format_rules_json={
            "Payment Details_Payment Date": "%Y-%m-%d"
        },
        canonical_mapping_json={}
    )
]
