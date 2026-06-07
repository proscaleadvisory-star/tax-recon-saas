import csv
import random

# 1. Product Catalog Master
catalog = [
    ["sku", "product_name", "cost_price", "selling_price", "min_safety_stock", "stock_in_transit"],
    ["SKU-PRO-01", "Premium Leather Wallet", 450.00, 1299.00, 25, 50],
    ["SKU-PRO-02", "Wireless Charger Stand", 750.00, 1999.00, 15, 30],
    ["SKU-PRO-03", "Minimalist Travel Bag", 1200.00, 3499.00, 10, 10]
]

with open("catalog_master.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(catalog)

# 2. Sales Orders Report (Amazon Style headers)
sales_headers = [
    "Amazon Order ID", "Merchant SKU", "Product Title", "Quantity Purchased", 
    "Taxable Revenue", "CGST Amt", "SGST Amt", "IGST Amt", "TCS GST Deducted", 
    "Invoice Value Gross", "Ship To State", "Logistic Cost", "Month Period"
]

order_ids = [f"403-{1000000 + i}-{2000000 + i}" for i in range(1, 101)]
prices = {"SKU-PRO-01": 1299.00, "SKU-PRO-02": 1999.00, "SKU-PRO-03": 3499.00}
tax_rates = 0.18
states = ["Maharashtra", "Karnataka", "Tamil Nadu", "Delhi", "Uttar Pradesh", "Gujarat", "Kerala", "West Bengal"]

sales_rows = [sales_headers]
sales_data = []

for i, oid in enumerate(order_ids):
    sku = random.choice(list(prices.keys()))
    price = prices[sku]
    qty = random.choice([1, 2])
    gross_val = price * qty
    taxable = round(gross_val / (1 + tax_rates), 2)
    tax = round(gross_val - taxable, 2)
    cgst = round(tax / 2, 2)
    sgst = round(tax / 2, 2)
    tcs = round(gross_val * 0.01, 2)
    state = random.choice(states)
    
    sales_rows.append([
        oid, sku, f"Product {sku}", qty, taxable, cgst, sgst, 0.00, tcs, gross_val, state, 80.00, "2026-05"
    ])
    sales_data.append({
        "oid": oid, "sku": sku, "qty": qty, "gross": gross_val, "state": state
    })

with open("amazon_sales_report.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(sales_rows)

# 3. Customer Returns Report
returns_headers = ["order_id_ref", "sku_code", "returned_qty", "refund_amt_gross", "reason_code", "month_period"]
returns_rows = [returns_headers]
returned_orders = order_ids[:5]

for oid in returned_orders:
    sales_entry = next(item for item in sales_data if item["oid"] == oid)
    returns_rows.append([
        oid, sales_entry["sku"], 1, round(sales_entry["gross"] / sales_entry["qty"], 2), "Size mismatch", "2026-05"
    ])

with open("amazon_returns_report.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(returns_rows)

# 4. Bank Payments Settlements Report
payment_headers = ["order_reference", "tx_code", "settled_amt_val", "commission_fees", "tds_deducted", "net_payout_bank", "payout_date", "month_period"]
payment_rows = [payment_headers]

for i, oid in enumerate(order_ids):
    if i >= 90 and i < 95:
        # Missing payout
        continue
    
    sales_entry = next(item for item in sales_data if item["oid"] == oid)
    base_gross = sales_entry["gross"]
    
    commission = round(base_gross * 0.10, 2)
    shipping = 80.00
    fees = commission + shipping
    expected_settlement = base_gross - fees
    
    if i >= 80 and i < 85:
        settlement = expected_settlement - 300.00
    elif i >= 85 and i < 90:
        settlement = expected_settlement + 150.00
    else:
        settlement = expected_settlement
        
    tds = round(base_gross * 0.0075, 2)
    net_payout = settlement - tds
    
    payment_rows.append([
        oid, "Order Payment", settlement, fees, tds, net_payout, "2026-05-25", "2026-05"
    ])

# Add unexpected refund
payment_rows.append([
    "403-9999999-9999999", "Refund Settlement", -500.00, 0.00, 0.00, -500.00, "2026-05-26", "2026-05"
])

with open("bank_settlements.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(payment_rows)

print("Standard Python generated mock files successfully!")
