import os
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional
from pydantic import BaseModel

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

# Import local modules
from models import HybridAnomalyDetector, LocalForecaster

app = FastAPI(title="Local-First FP&A Platform Backend", version="1.0.0")

# Setup CORS for frontend on port 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fpa.db")
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_artifacts")

# Initialize detector
detector = HybridAnomalyDetector()
if os.path.exists(os.path.join(MODEL_DIR, "autoencoder.pt")):
    try:
        detector.load(MODEL_DIR)
        print("Trained anomaly detection model loaded successfully.")
    except Exception as e:
        print(f"Error loading anomaly model: {e}. Model will need retraining.")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Helper to translate amount using exchange rates
def get_exchange_rate(cursor, currency_from: str, currency_to: str) -> float:
    if currency_from == currency_to:
        return 1.0
    cursor.execute("""
        SELECT rate FROM dim_exchange_rates 
        WHERE currency_from = ? AND currency_to = ? 
        ORDER BY effective_date DESC LIMIT 1
    """, (currency_from, currency_to))
    row = cursor.fetchone()
    if row:
        return float(row["rate"])
    # Check inverse
    cursor.execute("""
        SELECT rate FROM dim_exchange_rates 
        WHERE currency_from = ? AND currency_to = ? 
        ORDER BY effective_date DESC LIMIT 1
    """, (currency_to, currency_from))
    row = cursor.fetchone()
    if row:
        return 1.0 / float(row["rate"])
    return 1.0


class GridSaveRequest(BaseModel):
    account_id: str
    dept_id: str
    period_id: str
    scenario: str
    amount: float

class ForecastRunRequest(BaseModel):
    account_id: str
    dept_id: str

class ChatRequest(BaseModel):
    question: str


@app.get("/api/meta")
def get_meta():
    """
    Returns coordinate dimension mappings.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, code, type, parent_id FROM dim_accounts")
    accounts = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT id, name, entity, cost_center FROM dim_departments")
    depts = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT id, label, year, month, quarter FROM dim_time_periods")
    periods = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT id, name, type FROM dim_scenarios")
    scenarios = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    return {
        "accounts": accounts,
        "departments": depts,
        "periods": periods,
        "scenarios": scenarios
    }


@app.get("/api/grid")
def get_grid(scenario: str = "Budget", year: int = 2024):
    """
    Retrieves the editable spreadsheet pivot grid (Accounts x Months) for a specific scenario and year.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all accounts & depts
    cursor.execute("SELECT id, code, name FROM dim_accounts WHERE parent_id IS NOT NULL")
    accounts = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT id, name FROM dim_departments")
    depts = [dict(r) for r in cursor.fetchall()]
    
    # Get period headers for the given year
    cursor.execute("SELECT id, label FROM dim_time_periods WHERE year = ? ORDER BY month ASC", (year,))
    periods = [dict(r) for r in cursor.fetchall()]
    period_ids = [p["id"] for p in periods]
    
    # Read grid entries
    # actuals table holds facts for 'Actuals' scenario, fact_budgets holds 'Budget' scenario
    grid_rows = []
    
    if scenario == "Actuals":
        cursor.execute("""
            SELECT account_id, dept_id, period_id, amount FROM fact_actuals 
            WHERE period_id LIKE ?
        """, (f"{year}-%",))
    else:
        cursor.execute("""
            SELECT account_id, dept_id, period_id, amount FROM fact_budgets 
            WHERE scenario_id = ? AND period_id LIKE ?
        """, (scenario, f"{year}-%",))
        
    facts = cursor.fetchall()
    fact_map = {}
    for f in facts:
        fact_map[(f["account_id"], f["dept_id"], f["period_id"])] = f["amount"]
        
    for acct in accounts:
        for dept in depts:
            row_data = {
                "account_id": acct["id"],
                "account_code": acct["code"],
                "account_name": acct["name"],
                "dept_id": dept["id"],
                "dept_name": dept["name"],
                "values": {}
            }
            # Fill month values
            has_data = False
            for p_id in period_ids:
                val = fact_map.get((acct["id"], dept["id"], p_id), 0.0)
                row_data["values"][p_id] = val
                if val != 0.0:
                    has_data = True
            
            # For cleanliness, we only return rows that are relevant (or all, let's return all to populate grid)
            grid_rows.append(row_data)
            
    conn.close()
    return {
        "periods": periods,
        "rows": grid_rows
    }


@app.post("/api/grid/save")
def save_grid_cell(req: GridSaveRequest):
    """
    Saves an edited budget cell value. Writes to audit logs.
    """
    if req.scenario == "Actuals":
        raise HTTPException(status_code=400, detail="Cannot edit actuals.")
        
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Check if cell exists
        cursor.execute("""
            SELECT amount FROM fact_budgets 
            WHERE account_id = ? AND dept_id = ? AND period_id = ? AND scenario_id = ?
        """, (req.account_id, req.dept_id, req.period_id, req.scenario))
        row = cursor.fetchone()
        
        old_val = str(row["amount"]) if row else "None"
        new_val = str(req.amount)
        
        if row:
            # Update
            cursor.execute("""
                UPDATE fact_budgets SET amount = ?, version = version + 1
                WHERE account_id = ? AND dept_id = ? AND period_id = ? AND scenario_id = ?
            """, (req.amount, req.account_id, req.dept_id, req.period_id, req.scenario))
            action = "UPDATE"
        else:
            # Insert
            cursor.execute("""
                INSERT INTO fact_budgets (account_id, dept_id, period_id, scenario_id, amount) 
                VALUES (?, ?, ?, ?, ?)
            """, (req.account_id, req.dept_id, req.period_id, req.scenario, req.amount))
            action = "INSERT"
            
        # Write to audit log
        cursor.execute("""
            INSERT INTO audit_log (table_name, action, old_value, new_value, timestamp, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("fact_budgets", action, old_val, new_val, datetime.now().isoformat(), "LocalUser"))
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()
        
    return {"status": "success", "action": action}


@app.post("/api/forecast/run")
def run_forecast(req: ForecastRunRequest):
    """
    Fits ARIMA model on 2023 actuals and generates/saves a 12-month 2024 forecast.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Query 2023 actuals (12 months)
    cursor.execute("""
        SELECT period_id, amount FROM fact_actuals 
        WHERE account_id = ? AND dept_id = ? AND period_id LIKE '2023-%'
        ORDER BY period_id ASC
    """, (req.account_id, req.dept_id))
    rows = cursor.fetchall()
    
    # Fill in monthly history (ensure correct chronological order and completeness)
    hist_map = {r["period_id"]: r["amount"] for r in rows}
    history = []
    for m in range(1, 13):
        p_id = f"2023-{m:02d}"
        history.append(hist_map.get(p_id, 0.0))
        
    # Run Forecast
    try:
        point, lower, upper = LocalForecaster.forecast(history, steps=12)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting calculation failed: {e}")
        
    # Save/Overwrite in database under fact_forecasts
    try:
        for idx, month in enumerate(range(1, 13)):
            p_id = f"2024-{month:02d}"
            # Check if exists
            cursor.execute("""
                SELECT id FROM fact_forecasts 
                WHERE account_id = ? AND dept_id = ? AND period_id = ? AND scenario_id = 'Forecast'
            """, (req.account_id, req.dept_id, p_id))
            row = cursor.fetchone()
            
            if row:
                cursor.execute("""
                    UPDATE fact_forecasts SET amount = ?, lower_ci = ?, upper_ci = ?
                    WHERE id = ?
                """, (point[idx], lower[idx], upper[idx], row["id"]))
            else:
                cursor.execute("""
                    INSERT INTO fact_forecasts (account_id, dept_id, period_id, scenario_id, amount, lower_ci, upper_ci)
                    VALUES (?, ?, ?, 'Forecast', ?, ?, ?)
                """, (req.account_id, req.dept_id, p_id, point[idx], lower[idx], upper[idx]))
                
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save forecasts: {e}")
    finally:
        conn.close()
        
    return {
        "status": "success",
        "forecast": [
            {"period_id": f"2024-{m:02d}", "amount": point[m-1], "lower": lower[m-1], "upper": upper[m-1]}
            for m in range(1, 13)
        ]
    }


@app.post("/api/audit/train")
def train_auditor(file: Optional[UploadFile] = File(None)):
    """
    Trains the Autoencoder and Isolation Forest on uploaded trial balance CSV.
    If no file is provided, trains using the current SQLite actuals.
    """
    global detector
    try:
        if file is not None:
            df = pd.read_csv(file.file)
        else:
            # Query actuals from database
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT fa.id, fa.period_id as timestamp, fa.account_id, fa.dept_id, 
                       fa.amount, dd.cost_center, 'VENDOR_UNKNOWN' as vendor_id
                FROM fact_actuals fa
                JOIN dim_departments dd ON fa.dept_id = dd.id
            """)
            rows = cursor.fetchall()
            conn.close()
            
            if len(rows) < 100:
                raise HTTPException(status_code=400, detail="Not enough ledger transactions in database to train. Please upload a CSV.")
                
            df = pd.DataFrame([dict(r) for r in rows])
            # Synthesize vendor_id for diversity
            df['vendor_id'] = df.apply(lambda r: f"VND_{hash(r['account_id']) % 20:02d}", axis=1)
            
        # Enforce column presence
        required_cols = ['amount', 'timestamp', 'cost_center', 'account_id']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
                
        if 'vendor_id' not in df.columns:
            df['vendor_id'] = 'VND_UNKNOWN'
            
        detector = HybridAnomalyDetector()
        detector.train(df, epochs=30)
        
        # Save model
        detector.save(MODEL_DIR)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {e}")
        
    return {"status": "success", "message": "Hybrid anomaly detection pipeline successfully trained."}


@app.post("/api/audit/run")
def run_auditor(file: UploadFile = File(...)):
    """
    Runs ledger pre-close audit on uploaded transaction CSV.
    """
    global detector
    if not detector.is_trained:
        # Attempt to autoload
        if os.path.exists(os.path.join(MODEL_DIR, "autoencoder.pt")):
            try:
                detector.load(MODEL_DIR)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Model needs training: {e}")
        else:
            raise HTTPException(status_code=400, detail="Model needs training. Call /api/audit/train first.")
            
    try:
        df = pd.read_csv(file.file)
        required_cols = ['amount', 'timestamp', 'cost_center', 'account_id']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column in transaction list: {col}")
                
        if 'vendor_id' not in df.columns:
            df['vendor_id'] = 'VND_UNKNOWN'
            
        anomalies = detector.predict_anomalies(df)
        
        # Sort anomalies by risk_score descending
        anomalies = sorted(anomalies, key=lambda x: x["risk_score"], reverse=True)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auditing run failed: {e}")
        
    return {"status": "success", "anomalies": anomalies}


# Multi-currency translation logic and P&L aggregation helper
def compile_reporting_dataset(cursor, year: int, scenario: str, target_curr: str) -> pd.DataFrame:
    """
    Queries fact tables for a scenario + year, translates foreign currencies to target_curr,
    and returns a pandas DataFrame for reporting.
    """
    if scenario == "Actuals":
        cursor.execute("""
            SELECT fa.account_id, da.code as account_code, da.name as account_name, 
                   da.type as account_type, da.subtype as account_subtype,
                   fa.dept_id, fa.period_id, fa.amount, fa.currency
            FROM fact_actuals fa
            JOIN dim_accounts da ON fa.account_id = da.id
            WHERE fa.period_id LIKE ?
        """, (f"{year}-%",))
        rows = [dict(r) for r in cursor.fetchall()]
        df = pd.DataFrame(rows)
    else:
        cursor.execute("""
            SELECT fb.account_id, da.code as account_code, da.name as account_name, 
                   da.type as account_type, da.subtype as account_subtype,
                   fb.dept_id, fb.period_id, fb.amount, dd.entity
            FROM fact_budgets fb
            JOIN dim_accounts da ON fb.account_id = da.id
            JOIN dim_departments dd ON fb.dept_id = dd.id
            WHERE fb.scenario_id = ? AND fb.period_id LIKE ?
        """, (scenario, f"{year}-%",))
        rows = [dict(r) for r in cursor.fetchall()]
        df = pd.DataFrame(rows)
        # For budgets, amounts are stored in local entity currency
        # We need to map entity back to currency
        entity_currencies = {"US": "USD", "IN": "INR", "EU": "EUR", "UK": "GBP", "AE": "AED"}
        if len(df) > 0:
            df["currency"] = df["entity"].map(entity_currencies)

    if len(df) == 0:
        return pd.DataFrame(columns=["account_id", "account_code", "account_name", "account_type", 
                                     "account_subtype", "period_id", "usd_amount"])

    # Perform FX translation
    rates_cache = {}
    
    def translate(row):
        cur = row["currency"]
        amt = row["amount"]
        if cur == target_curr:
            return amt
        cache_key = (cur, target_curr)
        if cache_key in rates_cache:
            rate = rates_cache[cache_key]
        else:
            rate = get_exchange_rate(cursor, cur, target_curr)
            rates_cache[cache_key] = rate
        return amt * rate

    df["usd_amount"] = df.apply(translate, axis=1)
    return df


@app.get("/api/reports/pnl")
def get_pnl_report(year: int = 2023, scenario: str = "Actuals", currency: str = "USD"):
    """
    Generates a structured multi-currency consolidated Profit & Loss (P&L) statement.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    df = compile_reporting_dataset(cursor, year, scenario, currency)
    
    # Get standard period labels
    cursor.execute("SELECT id, label FROM dim_time_periods WHERE year = ? ORDER BY month ASC", (year,))
    periods = [dict(r) for r in cursor.fetchall()]
    period_ids = [p["id"] for p in periods]
    
    conn.close()
    
    # Initialize statement rows
    def aggregate_account(code_prefix: str) -> Dict[str, float]:
        res = {p_id: 0.0 for p_id in period_ids}
        if len(df) == 0:
            return res
        sub_df = df[df["account_code"].str.startswith(code_prefix)]
        p_sums = sub_df.groupby("period_id")["usd_amount"].sum()
        for p_id in period_ids:
            res[p_id] = float(p_sums.get(p_id, 0.0))
        return res

    product_rev = aggregate_account("4100")
    service_rev = aggregate_account("4200")
    total_rev = {p_id: product_rev[p_id] + service_rev[p_id] for p_id in period_ids}
    
    labor_cogs = aggregate_account("5100")
    materials_cogs = aggregate_account("5200")
    total_cogs = {p_id: labor_cogs[p_id] + materials_cogs[p_id] for p_id in period_ids}
    
    gross_profit = {p_id: total_rev[p_id] - total_cogs[p_id] for p_id in period_ids}
    
    salaries_opex = aggregate_account("6100")
    marketing_opex = aggregate_account("6200")
    rent_opex = aggregate_account("6300")
    software_opex = aggregate_account("6400")
    travel_opex = aggregate_account("6500")
    
    total_opex = {
        p_id: salaries_opex[p_id] + marketing_opex[p_id] + rent_opex[p_id] + software_opex[p_id] + travel_opex[p_id]
        for p_id in period_ids
    }
    
    ebitda = {p_id: gross_profit[p_id] - total_opex[p_id] for p_id in period_ids}
    
    interest = aggregate_account("7000")
    tax = aggregate_account("7100")
    
    net_income = {p_id: ebitda[p_id] - interest[p_id] - tax[p_id] for p_id in period_ids}

    # Return statement nodes
    return {
        "periods": periods,
        "currency": currency,
        "scenario": scenario,
        "nodes": [
            {"name": "Revenue", "is_total": True, "values": total_rev},
            {"name": "  Product Revenue", "is_total": False, "values": product_rev},
            {"name": "  Service Revenue", "is_total": False, "values": service_rev},
            {"name": "Cost of Goods Sold (COGS)", "is_total": True, "values": total_cogs},
            {"name": "  Direct Labor", "is_total": False, "values": labor_cogs},
            {"name": "  Materials & Hosting", "is_total": False, "values": materials_cogs},
            {"name": "Gross Profit", "is_total": True, "values": gross_profit},
            {"name": "Operating Expenses (OpEx)", "is_total": True, "values": total_opex},
            {"name": "  Salaries & Benefits", "is_total": False, "values": salaries_opex},
            {"name": "  Marketing & Advertising", "is_total": False, "values": marketing_opex},
            {"name": "  Rent & Office Expenses", "is_total": False, "values": rent_opex},
            {"name": "  Software & IT Subscriptions", "is_total": False, "values": software_opex},
            {"name": "  Travel & Entertainment", "is_total": False, "values": travel_opex},
            {"name": "EBITDA", "is_total": True, "values": ebitda},
            {"name": "Interest Expense", "is_total": False, "values": interest},
            {"name": "Tax Expense", "is_total": False, "values": tax},
            {"name": "Net Income", "is_total": True, "values": net_income}
        ]
    }


# Deterministic Local Variance Narrative Generator (Zero Cost)
def generate_math_variance_narrative(cursor) -> str:
    """
    Gathers actuals and budget data from SQLite and computes exact mathematical variances.
    Returns a markdown-formatted report.
    """
    # Sum actuals (2023) vs budget (2024, scaled for comparison or comparing month-by-month if overlapping)
    # Since Actuals is 2023 and Budget is 2024, we will compare Total 2023 Actuals vs Total 2024 Budget in USD
    
    df_act = compile_reporting_dataset(cursor, 2023, "Actuals", "USD")
    df_bud = compile_reporting_dataset(cursor, 2024, "Budget", "USD")
    
    if len(df_act) == 0 or len(df_bud) == 0:
        return "Variance narrative cannot be generated yet: seed database has insufficient actuals or budget facts."
        
    act_rev = df_act[df_act["account_code"].str.startswith("4")]["usd_amount"].sum()
    act_cogs = df_act[df_act["account_code"].str.startswith("5")]["usd_amount"].sum()
    act_opex = df_act[df_act["account_code"].str.startswith("6")]["usd_amount"].sum()
    act_net = act_rev - act_cogs - act_opex
    
    bud_rev = df_bud[df_bud["account_code"].str.startswith("4")]["usd_amount"].sum()
    bud_cogs = df_bud[df_bud["account_code"].str.startswith("5")]["usd_amount"].sum()
    bud_opex = df_bud[df_bud["account_code"].str.startswith("6")]["usd_amount"].sum()
    bud_net = bud_rev - bud_cogs - bud_opex
    
    rev_var = bud_rev - act_rev
    cogs_var = bud_cogs - act_cogs
    opex_var = bud_opex - act_opex
    net_var = bud_net - act_net
    
    # Entity breakdowns
    cursor.execute("SELECT DISTINCT entity FROM dim_departments")
    entities = [r["entity"] for r in cursor.fetchall()]
    
    entity_narratives = []
    for ent in entities:
        # Actuals entity total (based on depts belonging to entity)
        cursor.execute("SELECT id FROM dim_departments WHERE entity = ?", (ent,))
        dept_ids = [r["id"] for r in cursor.fetchall()]
        
        ent_act = df_act[df_act["dept_id"].isin(dept_ids)]["usd_amount"].sum()
        ent_bud = df_bud[df_bud["dept_id"].isin(dept_ids)]["usd_amount"].sum()
        ent_pct = ((ent_bud - ent_act) / ent_act * 100) if ent_act > 0 else 0.0
        entity_narratives.append(f"- **{ent}**: 2023 Actuals ${ent_act:,.0f} USD vs 2024 Budget ${ent_bud:,.0f} USD (Variance: {ent_pct:+.1f}%)")

    narrative = f"""### Consolidated Financial Variance Report
**Comparison: FY2023 Actuals vs FY2024 Budget (Consolidated in USD)**

1. **Revenue Performance**:
   - FY2023 Actual Revenue: **${act_rev:,.2f} USD**
   - FY2024 Budgeted Revenue: **${bud_rev:,.2f} USD**
   - Variance: **${rev_var:,.2f} USD ({((bud_rev - act_rev)/act_rev * 100):+.1f}%)**
   - *Driver*: Increased target product and service sales budgeted for Q4.

2. **Cost of Goods Sold (COGS)**:
   - FY2023 Actual COGS: **${act_cogs:,.2f} USD**
   - FY2024 Budgeted COGS: **${bud_cogs:,.2f} USD**
   - Variance: **${cogs_var:,.2f} USD ({((bud_cogs - act_cogs)/act_cogs * 100):+.1f}%)**

3. **Operating Expenses (OpEx)**:
   - FY2023 Actual OpEx: **${act_opex:,.2f} USD**
   - FY2024 Budgeted OpEx: **${bud_opex:,.2f} USD**
   - Variance: **${opex_var:,.2f} USD ({((bud_opex - act_opex)/act_opex * 100):+.1f}%)**
   - *Driver*: Salaries and benefits adjustments (+10% baseline growth).

4. **Net Operating Profit**:
   - FY2023 Net Profit (EBITDA approx): **${act_net:,.2f} USD**
   - FY2024 Budget Net Profit: **${bud_net:,.2f} USD**
   - Variance: **${net_var:,.2f} USD ({((bud_net - act_net)/act_net * 100):+.1f}%)**

### Entity-Level Variance Rollups:
{chr(10).join(entity_narratives)}
"""
    return narrative


@app.get("/api/insights/narrative")
def get_insights_narrative():
    """
    Returns the deterministic math variance analysis report.
    """
    conn = get_db()
    cursor = conn.cursor()
    report = generate_math_variance_narrative(cursor)
    conn.close()
    return {"status": "success", "narrative": report}


@app.post("/api/insights/chat")
async def ask_local_cfo(req: ChatRequest):
    """
    Queries local Ollama (Llama 3/3.2) with financial context.
    If Ollama is not running/available, falls back gracefully to the math-based variance report.
    """
    conn = get_db()
    cursor = conn.cursor()
    math_narrative = generate_math_variance_narrative(cursor)
    conn.close()
    
    import httpx
    
    ollama_url = "http://localhost:11434/api/generate"
    system_prompt = f"""You are an expert Virtual CFO (Financial Analyst). 
You are given the following financial context representing FY2023 Actuals and FY2024 Budget details:
---
{math_narrative}
---
Use this structured financial context to answer the user's question. Provide high-quality, professional, and mathematically correct responses.
If you cannot answer from the context, state that clearly.
"""
    
    payload = {
        "model": "llama3.2", # Supports llama3, llama3.2, etc.
        "prompt": f"{system_prompt}\nUser Question: {req.question}\nCFO Response:",
        "stream": False
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(ollama_url, json=payload)
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": "success", 
                    "response": result.get("response", ""), 
                    "engine": "Ollama (Local LLM)"
                }
    except Exception as e:
        # Fallback to local variance narrative + custom note
        pass
        
    # Standard math-based query handler fallback
    lowered_q = req.question.lower()
    custom_response = ""
    if "revenue" in lowered_q:
        custom_response = "Regarding revenue, budgeted sales for FY2024 reflect a 10% expected growth, driven primarily by product sales expansion in USD."
    elif "opex" in lowered_q or "expense" in lowered_q:
        custom_response = "Operating expenses (OpEx) for FY2024 are budgeted at a baseline increase of ~10% to support team salary increments."
    elif "profit" in lowered_q or "net income" in lowered_q:
        custom_response = "Consolidated net profitability is projected to increase, as revenue growth offsets the additional budgeted payroll costs."
    else:
        custom_response = "I am currently running in Local Offline Math Mode because Ollama (local AI) is disconnected. Here is the variance overview:"

    full_resp = f"{custom_response}\n\n{math_narrative}"
    return {
        "status": "success",
        "response": full_resp,
        "engine": "Offline Variance Engine (Deterministic Fallback)"
    }


# Standard reports for Balance Sheet & Cash Flow (mock/simplified rollups for full application experience)
@app.get("/api/reports/balancesheet")
def get_balance_sheet(year: int = 2023, scenario: str = "Actuals", currency: str = "USD"):
    conn = get_db()
    cursor = conn.cursor()
    df = compile_reporting_dataset(cursor, year, scenario, currency)
    
    cursor.execute("SELECT id, label FROM dim_time_periods WHERE year = ? ORDER BY month ASC", (year,))
    periods = [dict(r) for r in cursor.fetchall()]
    period_ids = [p["id"] for p in periods]
    conn.close()
    
    def aggregate_account(code_prefix: str) -> Dict[str, float]:
        res = {p_id: 0.0 for p_id in period_ids}
        if len(df) == 0:
            return res
        sub_df = df[df["account_code"].str.startswith(code_prefix)]
        p_sums = sub_df.groupby("period_id")["usd_amount"].sum()
        for p_id in period_ids:
            res[p_id] = float(p_sums.get(p_id, 0.0))
        return res

    cash = aggregate_account("1100")
    ar = aggregate_account("1200")
    assets = {p_id: cash[p_id] + ar[p_id] for p_id in period_ids}
    
    ap = aggregate_account("2100")
    liab = {p_id: ap[p_id] for p_id in period_ids}
    
    retained = aggregate_account("3100")
    equity = {p_id: retained[p_id] for p_id in period_ids}
    
    return {
        "periods": periods,
        "currency": currency,
        "scenario": scenario,
        "nodes": [
            {"name": "Total Assets", "is_total": True, "values": assets},
            {"name": "  Cash & Cash Equivalents", "is_total": False, "values": cash},
            {"name": "  Accounts Receivable", "is_total": False, "values": ar},
            {"name": "Total Liabilities", "is_total": True, "values": liab},
            {"name": "  Accounts Payable", "is_total": False, "values": ap},
            {"name": "Total Equity", "is_total": True, "values": equity},
            {"name": "  Retained Earnings", "is_total": False, "values": retained}
        ]
    }


@app.get("/api/reports/cashflow")
def get_cash_flow(year: int = 2023, scenario: str = "Actuals", currency: str = "USD"):
    # Simplified standard Cash Flow structure
    conn = get_db()
    cursor = conn.cursor()
    df = compile_reporting_dataset(cursor, year, scenario, currency)
    
    cursor.execute("SELECT id, label FROM dim_time_periods WHERE year = ? ORDER BY month ASC", (year,))
    periods = [dict(r) for r in cursor.fetchall()]
    period_ids = [p["id"] for p in periods]
    conn.close()
    
    def aggregate_account(code_prefix: str) -> Dict[str, float]:
        res = {p_id: 0.0 for p_id in period_ids}
        if len(df) == 0:
            return res
        sub_df = df[df["account_code"].str.startswith(code_prefix)]
        p_sums = sub_df.groupby("period_id")["usd_amount"].sum()
        for p_id in period_ids:
            res[p_id] = float(p_sums.get(p_id, 0.0))
        return res

    # Cash Flow Operations (Net Income + change in AR/AP mock)
    # Using Net Income baseline
    net_income = {p_id: aggregate_account("4100")[p_id] + aggregate_account("4200")[p_id] - 
                       aggregate_account("5100")[p_id] - aggregate_account("5200")[p_id] -
                       aggregate_account("6100")[p_id] - aggregate_account("6200")[p_id]
                       for p_id in period_ids}
    
    ops_cf = {p_id: net_income[p_id] * 0.95 for p_id in period_ids}
    inv_cf = {p_id: -5000.0 if p_id.endswith("-06") or p_id.endswith("-12") else 0.0 for p_id in period_ids}
    fin_cf = {p_id: 0.0 for p_id in period_ids}
    net_cf = {p_id: ops_cf[p_id] + inv_cf[p_id] + fin_cf[p_id] for p_id in period_ids}
    
    return {
        "periods": periods,
        "currency": currency,
        "scenario": scenario,
        "nodes": [
            {"name": "Operating Cash Flow", "is_total": True, "values": ops_cf},
            {"name": "  Net Income Adjustments", "is_total": False, "values": net_income},
            {"name": "Investing Cash Flow", "is_total": True, "values": inv_cf},
            {"name": "Financing Cash Flow", "is_total": True, "values": fin_cf},
            {"name": "Net Change in Cash", "is_total": True, "values": net_cf}
        ]
    }
