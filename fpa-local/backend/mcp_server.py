import os
import sys
import json
import sqlite3
from datetime import datetime

# Logging helper (writes to stderr, as stdout is reserved for JSON-RPC protocol)
def log(msg: str):
    sys.stderr.write(f"[{datetime.now().isoformat()}] MCP SERVER: {msg}\n")
    sys.stderr.flush()

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fpa.db")

def get_db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Helper to read reports for resource mapping
def query_pnl_summary() -> str:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT da.type as acct_type, SUM(fa.amount) as amt
        FROM fact_actuals fa
        JOIN dim_accounts da ON fa.account_id = da.id
        GROUP BY da.type
    """)
    rows = cursor.fetchall()
    conn.close()
    
    lines = ["### Income Statement Summary (Consolidated Actuals 2023)", ""]
    for r in rows:
        lines.append(f"- **{r['acct_type']}**: ${r['amt']:,.2f}")
    return "\n".join(lines)

def query_balance_sheet_summary() -> str:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT da.subtype as subtype, SUM(fa.amount) as amt
        FROM fact_actuals fa
        JOIN dim_accounts da ON fa.account_id = da.id
        WHERE da.type = 'Balance Sheet'
        GROUP BY da.subtype
    """)
    rows = cursor.fetchall()
    conn.close()
    
    lines = ["### Balance Sheet Summary (Consolidated Actuals 2023)", ""]
    for r in rows:
        lines.append(f"- **{r['subtype']}**: ${r['amt']:,.2f}")
    return "\n".join(lines)

# Tools implementations
def tool_adjust_budget(account_id: str, dept_id: str, period_id: str, amount: float) -> str:
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        # Check if cell exists
        cursor.execute("""
            SELECT id FROM fact_budgets 
            WHERE account_id = ? AND dept_id = ? AND period_id = ? AND scenario_id = 'Budget'
        """, (account_id, dept_id, period_id))
        row = cursor.fetchone()
        
        if row:
            cursor.execute("""
                UPDATE fact_budgets SET amount = ?, version = version + 1
                WHERE id = ?
            """, (amount, row["id"]))
            action = "UPDATED"
        else:
            cursor.execute("""
                INSERT INTO fact_budgets (account_id, dept_id, period_id, scenario_id, amount) 
                VALUES (?, ?, ?, 'Budget', ?)
            """, (account_id, dept_id, period_id, amount))
            action = "INSERTED"
            
        conn.commit()
        return f"Successfully {action} budget for Account {account_id}, Department {dept_id}, Period {period_id} to {amount}."
    except Exception as e:
        conn.rollback()
        return f"Error adjusting budget: {e}"
    finally:
        conn.close()

def tool_run_what_if(scenario_name: str, revenue_growth: float = 0.0, opex_reduction: float = 0.0) -> str:
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        # Create scenario if not exists
        cursor.execute("SELECT id FROM dim_scenarios WHERE id = ?", (scenario_name,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO dim_scenarios VALUES (?, ?, 'Budget', 'Budget')", (scenario_name, scenario_name))
            
        # Clear any existing facts for this scenario
        cursor.execute("DELETE FROM fact_budgets WHERE scenario_id = ?", (scenario_name,))
        
        # Clone 'Budget' scenario facts with adjustment factors
        cursor.execute("""
            SELECT fb.account_id, da.type as acct_type, fb.dept_id, fb.period_id, fb.amount
            FROM fact_budgets fb
            JOIN dim_accounts da ON fb.account_id = da.id
            WHERE fb.scenario_id = 'Budget'
        """)
        facts = cursor.fetchall()
        
        adjusted_facts = []
        original_revenue = 0.0
        original_opex = 0.0
        new_revenue = 0.0
        new_opex = 0.0
        
        for f in facts:
            acct_type = f["acct_type"]
            amt = f["amount"]
            
            new_amt = amt
            if acct_type == "Revenue":
                original_revenue += amt
                new_amt = amt * (1.0 + revenue_growth)
                new_revenue += new_amt
            elif acct_type == "OpEx":
                original_opex += amt
                new_amt = amt * (1.0 + opex_reduction)
                new_opex += new_amt
                
            adjusted_facts.append((f["account_id"], f["dept_id"], f["period_id"], scenario_name, new_amt))
            
        cursor.executemany("""
            INSERT INTO fact_budgets (account_id, dept_id, period_id, scenario_id, amount)
            VALUES (?, ?, ?, ?, ?)
        """, adjusted_facts)
        
        conn.commit()
        
        orig_ebitda = original_revenue - original_opex
        new_ebitda = new_revenue - new_opex
        
        return f"""### What-If Scenario '{scenario_name}' Initialized
Adjustments Applied:
- Revenue Growth: {revenue_growth * 100:+.1f}%
- OpEx Reduction: {opex_reduction * 100:+.1f}%

**Comparison Summary (Consolidated FY2024 Budget)**:
- **Baseline Revenue**: ${original_revenue:,.2f} vs **What-if Revenue**: ${new_revenue:,.2f}
- **Baseline OpEx**: ${original_opex:,.2f} vs **What-if OpEx**: ${new_opex:,.2f}
- **Baseline EBITDA**: ${orig_ebitda:,.2f} vs **What-if EBITDA**: ${new_ebitda:,.2f} (Variance: ${(new_ebitda - orig_ebitda):+,.2f})
"""
    except Exception as e:
        conn.rollback()
        return f"Error compiling what-if scenario: {e}"
    finally:
        conn.close()

def tool_get_variance() -> str:
    conn = get_db_conn()
    cursor = conn.cursor()
    
    # Calculate simple variance numbers
    cursor.execute("""
        SELECT SUM(amount) as amt FROM fact_actuals fa
        JOIN dim_accounts da ON fa.account_id = da.id
        WHERE da.type = 'Revenue'
    """)
    act_rev = cursor.fetchone()["amt"] or 0.0
    
    cursor.execute("""
        SELECT SUM(amount) as amt FROM fact_actuals fa
        JOIN dim_accounts da ON fa.account_id = da.id
        WHERE da.type = 'OpEx'
    """)
    act_opex = cursor.fetchone()["amt"] or 0.0
    
    cursor.execute("""
        SELECT SUM(amount) as amt FROM fact_budgets fb
        JOIN dim_accounts da ON fb.account_id = da.id
        WHERE fb.scenario_id = 'Budget' AND da.type = 'Revenue'
    """)
    bud_rev = cursor.fetchone()["amt"] or 0.0
    
    cursor.execute("""
        SELECT SUM(amount) as amt FROM fact_budgets fb
        JOIN dim_accounts da ON fb.account_id = da.id
        WHERE fb.scenario_id = 'Budget' AND da.type = 'OpEx'
    """)
    bud_opex = cursor.fetchone()["amt"] or 0.0
    
    conn.close()
    
    act_net = act_rev - act_opex
    bud_net = bud_rev - bud_opex
    
    return f"""### Quick Variance Report (Consolidated)
- **Revenue**: Actuals 2023 ${act_rev:,.0f} vs Budget 2024 ${bud_rev:,.0f} (Variance: ${(bud_rev - act_rev):+,.0f})
- **OpEx**: Actuals 2023 ${act_opex:,.0f} vs Budget 2024 ${bud_opex:,.0f} (Variance: ${(bud_opex - act_opex):+,.0f})
- **Net Operating Margin**: Actuals 2023 ${act_net:,.0f} vs Budget 2024 ${bud_net:,.0f} (Variance: ${(bud_net - act_net):+,.0f})
"""

# JSON-RPC Message Dispatcher
def handle_request(req: dict) -> dict:
    method = req.get("method")
    params = req.get("params", {})
    req_id = req.get("id")
    
    log(f"Handling method: {method}")
    
    if method == "initialize":
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "resources": {},
                "tools": {}
            },
            "serverInfo": {
                "name": "Local-FP&A-MCP-Server",
                "version": "1.0.0"
            }
        }
        
    elif method == "initialized":
        return {}
        
    elif method == "resources/list":
        return {
            "resources": [
                {
                    "uri": "fpa://reports/pnl",
                    "name": "Consolidated Income Statement (P&L)",
                    "mimeType": "text/markdown",
                    "description": "Consolidated actuals statement showing core revenues and cost metrics."
                },
                {
                    "uri": "fpa://reports/balancesheet",
                    "name": "Consolidated Balance Sheet",
                    "mimeType": "text/markdown",
                    "description": "Consolidated balance details covering assets and liability subtypes."
                }
            ]
        }
        
    elif method == "resources/read":
        uri = params.get("uri")
        text_content = ""
        if uri == "fpa://reports/pnl":
            text_content = query_pnl_summary()
        elif uri == "fpa://reports/balancesheet":
            text_content = query_balance_sheet_summary()
        else:
            raise ValueError(f"Resource uri '{uri}' not found.")
            
        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "text/markdown",
                    "text": text_content
                }
            ]
        }
        
    elif method == "tools/list":
        return {
            "tools": [
                {
                    "name": "adjust_budget_driver",
                    "description": "Adjusts or inserts a budget cell in SQLite.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "account_id": {"type": "string", "description": "e.g. '4100'"},
                            "dept_id": {"type": "string", "description": "e.g. 'US-Sales'"},
                            "period_id": {"type": "string", "description": "e.g. '2024-01'"},
                            "amount": {"type": "number", "description": "new budget amount value"}
                        },
                        "required": ["account_id", "dept_id", "period_id", "amount"]
                    }
                },
                {
                    "name": "run_what_if_scenario",
                    "description": "Clones budget and models actual vs budgeted adjustments for revenue and opex.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "scenario_name": {"type": "string", "description": "Name of the new scenario"},
                            "revenue_growth": {"type": "number", "description": "Growth multiplier (e.g. 0.08 for +8%)"},
                            "opex_reduction": {"type": "number", "description": "Reduction multiplier (e.g. -0.05 for -5%)"}
                        },
                        "required": ["scenario_name"]
                    }
                },
                {
                    "name": "get_variance_report",
                    "description": "Runs variance query between 2023 actuals and 2024 budget.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {}
                    }
                }
            ]
        }
        
    elif method == "tools/call":
        name = params.get("name")
        args = params.get("arguments", {})
        
        result_text = ""
        if name == "adjust_budget_driver":
            result_text = tool_adjust_budget(
                str(args.get("account_id")),
                str(args.get("dept_id")),
                str(args.get("period_id")),
                float(args.get("amount", 0.0))
            )
        elif name == "run_what_if_scenario":
            result_text = tool_run_what_if(
                str(args.get("scenario_name")),
                float(args.get("revenue_growth", 0.0)),
                float(args.get("opex_reduction", 0.0))
            )
        elif name == "get_variance_report":
            result_text = tool_get_variance()
        else:
            raise ValueError(f"Unknown tool name '{name}'")
            
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }
        
    else:
        raise ValueError(f"Unknown method '{method}'")

# Main loop reading stdio
def main():
    log("Server starting up...")
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id")
            
            try:
                res_result = handle_request(req)
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": res_result
                }
            except Exception as inner_e:
                log(f"Inner processing error: {inner_e}")
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32603,
                        "message": str(inner_e)
                    }
                }
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except Exception as e:
            log(f"Outer parser error: {e}")
            # JSON-RPC parse error
            response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": f"Parse error: {e}"
                }
            }
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
