import os
import sqlite3
import random
from datetime import datetime

# Setup DB connection
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fpa.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # Create Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dim_accounts (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        subtype TEXT,
        parent_id TEXT,
        FOREIGN KEY(parent_id) REFERENCES dim_accounts(id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dim_departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        entity TEXT NOT NULL,
        cost_center TEXT UNIQUE NOT NULL
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dim_time_periods (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        quarter TEXT NOT NULL,
        fy TEXT NOT NULL
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dim_scenarios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'Actuals', 'Budget', 'Forecast'
        base_scenario_id TEXT,
        FOREIGN KEY(base_scenario_id) REFERENCES dim_scenarios(id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dim_exchange_rates (
        currency_from TEXT NOT NULL,
        currency_to TEXT NOT NULL,
        rate REAL NOT NULL,
        effective_date TEXT NOT NULL,
        PRIMARY KEY (currency_from, currency_to, effective_date)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fact_actuals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        dept_id TEXT NOT NULL,
        period_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        FOREIGN KEY(account_id) REFERENCES dim_accounts(id),
        FOREIGN KEY(dept_id) REFERENCES dim_departments(id),
        FOREIGN KEY(period_id) REFERENCES dim_time_periods(id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fact_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        dept_id TEXT NOT NULL,
        period_id TEXT NOT NULL,
        scenario_id TEXT NOT NULL,
        amount REAL NOT NULL,
        version INTEGER DEFAULT 1,
        FOREIGN KEY(account_id) REFERENCES dim_accounts(id),
        FOREIGN KEY(dept_id) REFERENCES dim_departments(id),
        FOREIGN KEY(period_id) REFERENCES dim_time_periods(id),
        FOREIGN KEY(scenario_id) REFERENCES dim_scenarios(id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fact_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        dept_id TEXT NOT NULL,
        period_id TEXT NOT NULL,
        scenario_id TEXT NOT NULL,
        amount REAL NOT NULL,
        lower_ci REAL,
        upper_ci REAL,
        FOREIGN KEY(account_id) REFERENCES dim_accounts(id),
        FOREIGN KEY(dept_id) REFERENCES dim_departments(id),
        FOREIGN KEY(period_id) REFERENCES dim_time_periods(id),
        FOREIGN KEY(scenario_id) REFERENCES dim_scenarios(id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        action TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        timestamp TEXT NOT NULL,
        user_id TEXT
    );
    """)
    
    conn.commit()
    conn.close()
    print("Database tables initialized successfully.")

def seed_dimensions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Accounts
    accounts = [
        # Assets & Liabilities
        ("1000", "1000", "Total Assets", "Balance Sheet", "Assets", None),
        ("1100", "1100", "Cash & Cash Equivalents", "Balance Sheet", "Assets", "1000"),
        ("1200", "1200", "Accounts Receivable", "Balance Sheet", "Assets", "1000"),
        ("2000", "2000", "Total Liabilities", "Balance Sheet", "Liabilities", None),
        ("2100", "2100", "Accounts Payable", "Balance Sheet", "Liabilities", "2000"),
        ("3000", "3000", "Total Equity", "Balance Sheet", "Equity", None),
        ("3100", "3100", "Retained Earnings", "Balance Sheet", "Equity", "3000"),
        
        # Revenue
        ("4000", "4000", "Total Revenue", "P&L", "Revenue", None),
        ("4100", "4100", "Product Revenue", "P&L", "Revenue", "4000"),
        ("4200", "4200", "Service Revenue", "P&L", "Revenue", "4000"),
        
        # COGS
        ("5000", "5000", "Total COGS", "P&L", "COGS", None),
        ("5100", "5100", "Direct Labor", "P&L", "COGS", "5000"),
        ("5200", "5200", "Materials & Hosting", "P&L", "COGS", "5000"),
        
        # OpEx
        ("6000", "6000", "Total OpEx", "P&L", "OpEx", None),
        ("6100", "6100", "Salaries & Benefits", "P&L", "OpEx", "6000"),
        ("6200", "6200", "Marketing & Advertising", "P&L", "OpEx", "6000"),
        ("6300", "6300", "Rent & Office Expenses", "P&L", "OpEx", "6000"),
        ("6400", "6400", "Software & IT Subscriptions", "P&L", "OpEx", "6000"),
        ("6500", "6500", "Travel & Entertainment", "P&L", "OpEx", "6000"),
        
        # Financial / Taxes
        ("7000", "7000", "Interest Expense", "P&L", "Financials", None),
        ("7100", "7100", "Tax Expense", "P&L", "Financials", None)
    ]
    cursor.executemany("INSERT OR IGNORE INTO dim_accounts VALUES (?, ?, ?, ?, ?, ?)", accounts)
    
    # 2. Departments
    entities = {
        "US": "USD",
        "IN": "INR",
        "EU": "EUR",
        "UK": "GBP",
        "AE": "AED"
    }
    depts = []
    for ent, cur in entities.items():
        depts.extend([
            (f"{ent}-Sales", f"Sales ({ent})", None, ent, f"CC-{ent}-SALES"),
            (f"{ent}-Eng", f"Engineering ({ent})", None, ent, f"CC-{ent}-ENG"),
            (f"{ent}-Mktg", f"Marketing ({ent})", None, ent, f"CC-{ent}-MKTG"),
            (f"{ent}-HR", f"HR ({ent})", None, ent, f"CC-{ent}-HR")
        ])
    cursor.executemany("INSERT OR IGNORE INTO dim_departments VALUES (?, ?, ?, ?, ?)", depts)
    
    # 3. Time Periods (24 months: Jan 2023 - Dec 2024)
    periods = []
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for year in [2023, 2024]:
        for m_idx, m_name in enumerate(months):
            p_id = f"{year}-{m_idx+1:02d}"
            label = f"{m_name} {year}"
            q = f"Q{(m_idx // 3) + 1}"
            fy = f"FY{year}"
            periods.append((p_id, label, year, m_idx+1, q, fy))
    cursor.executemany("INSERT OR IGNORE INTO dim_time_periods VALUES (?, ?, ?, ?, ?, ?)", periods)
    
    # 4. Scenarios
    scenarios = [
        ("Actuals", "Actuals", "Actuals", None),
        ("Budget", "Budget", "Budget", None),
        ("Forecast", "Forecast", "Forecast", "Budget")
    ]
    cursor.executemany("INSERT OR IGNORE INTO dim_scenarios VALUES (?, ?, ?, ?)", scenarios)
    
    # 5. Exchange Rates (Effective 2023-01-01)
    # Target is USD base
    rates = [
        ("USD", "USD", 1.0, "2023-01-01"),
        ("INR", "USD", 0.012, "2023-01-01"),
        ("EUR", "USD", 1.09, "2023-01-01"),
        ("GBP", "USD", 1.27, "2023-01-01"),
        ("AED", "USD", 0.27, "2023-01-01"),
        
        ("USD", "INR", 83.3, "2023-01-01"),
        ("USD", "EUR", 0.92, "2023-01-01"),
        ("USD", "GBP", 0.79, "2023-01-01"),
        ("USD", "AED", 3.67, "2023-01-01")
    ]
    cursor.executemany("INSERT OR IGNORE INTO dim_exchange_rates VALUES (?, ?, ?, ?)", rates)
    
    conn.commit()
    conn.close()
    print("Dimension tables seeded successfully.")

def seed_facts():
    random.seed(42)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all active combinations
    cursor.execute("SELECT id, entity FROM dim_departments")
    depts = cursor.fetchall()
    
    # Base configuration for seed amounts in USD
    # We will convert to local currency when seeding actuals
    entity_currencies = {
        "US": "USD",
        "IN": "INR",
        "EU": "EUR",
        "UK": "GBP",
        "AE": "AED"
    }
    
    usd_rates = {
        "USD": 1.0,
        "INR": 83.3,
        "EUR": 0.92,
        "GBP": 0.79,
        "AED": 3.67
    }
    
    # GL Account codes and their baseline values in USD (Sales department earns revenue, others have expenses)
    actuals_to_insert = []
    budgets_to_insert = []
    
    # Loop over 2023 months for Actuals
    for month in range(1, 13):
        period_id = f"2023-{month:02d}"
        
        # Monthly seasonal factor (holidays in Dec, lower in summer Q3)
        seasonal_factor = 1.0
        if month in [11, 12]:
            seasonal_factor = 1.25 # Holiday boost
        elif month in [7, 8]:
            seasonal_factor = 0.85 # Summer slowdown
            
        for dept_id, entity in depts:
            curr = entity_currencies[entity]
            fx_rate = usd_rates[curr]
            
            # Revenue (Only generated by Sales)
            if "Sales" in dept_id:
                # Product Revenue baseline $50,000 USD
                prod_rev = (50000 + random.normalvariate(0, 3000)) * seasonal_factor * fx_rate
                # Service Revenue baseline $15,000 USD
                serv_rev = (15000 + random.normalvariate(0, 1000)) * seasonal_factor * fx_rate
                
                actuals_to_insert.extend([
                    ("4100", dept_id, period_id, max(0.0, prod_rev), curr),
                    ("4200", dept_id, period_id, max(0.0, serv_rev), curr)
                ])
                
                # Direct Labor COGS (baseline 15% of revenue)
                cogs_lab = (prod_rev + serv_rev) * 0.15 + random.normalvariate(0, 500)
                actuals_to_insert.append(("5100", dept_id, period_id, max(0.0, cogs_lab), curr))
            else:
                # Engineering, Marketing, HR do not generate revenue
                actuals_to_insert.extend([
                    ("4100", dept_id, period_id, 0.0, curr),
                    ("4200", dept_id, period_id, 0.0, curr),
                    ("5100", dept_id, period_id, 0.0, curr)
                ])

            # Materials/Hosting (Only Eng and Sales)
            if "Eng" in dept_id:
                materials = (12000 + random.normalvariate(0, 800)) * fx_rate
                actuals_to_insert.append(("5200", dept_id, period_id, max(0.0, materials), curr))
            elif "Sales" in dept_id:
                materials = (2000 + random.normalvariate(0, 200)) * fx_rate
                actuals_to_insert.append(("5200", dept_id, period_id, max(0.0, materials), curr))
            else:
                actuals_to_insert.append(("5200", dept_id, period_id, 0.0, curr))
                
            # Salaries (All departments)
            salary_base = 0.0
            if "Eng" in dept_id: salary_base = 35000
            elif "Sales" in dept_id: salary_base = 25000
            elif "Mktg" in dept_id: salary_base = 18000
            elif "HR" in dept_id: salary_base = 12000
            
            salary = salary_base * fx_rate # Fixed contract salaries
            actuals_to_insert.append(("6100", dept_id, period_id, salary, curr))
            
            # Marketing (Marketing dept has high opex, others low)
            if "Mktg" in dept_id:
                mktg = (15000 + random.normalvariate(0, 1500)) * seasonal_factor * fx_rate
            else:
                mktg = (500 + random.normalvariate(0, 50)) * fx_rate
            actuals_to_insert.append(("6200", dept_id, period_id, max(0.0, mktg), curr))
            
            # Rent & Office (Allocated to HR)
            if "HR" in dept_id:
                rent = (6000 + random.normalvariate(0, 100)) * fx_rate
            else:
                rent = 0.0
            actuals_to_insert.append(("6300", dept_id, period_id, rent, curr))
            
            # Software IT
            it_cost = 0.0
            if "Eng" in dept_id: it_cost = 4000
            elif "Mktg" in dept_id: it_cost = 2000
            elif "Sales" in dept_id: it_cost = 1500
            elif "HR" in dept_id: it_cost = 1000
            it = (it_cost + random.normalvariate(0, 100)) * fx_rate
            actuals_to_insert.append(("6400", dept_id, period_id, max(0.0, it), curr))
            
            # Travel & Entertainment
            travel = (1500 + random.normalvariate(0, 300)) * fx_rate
            actuals_to_insert.append(("6500", dept_id, period_id, max(0.0, travel), curr))
            
            # Financials (Interest & Tax)
            actuals_to_insert.extend([
                ("7000", dept_id, period_id, 200.0 * fx_rate, curr),
                ("7100", dept_id, period_id, 1000.0 * fx_rate, curr)
            ])

    # Loop over 2024 months for Budgets (Scenario = Budget)
    # We budget 10% growth over 2023 averages
    for month in range(1, 13):
        period_id = f"2024-{month:02d}"
        seasonal_factor = 1.0
        if month in [11, 12]:
            seasonal_factor = 1.25
        elif month in [7, 8]:
            seasonal_factor = 0.85
            
        for dept_id, entity in depts:
            curr = entity_currencies[entity]
            fx_rate = usd_rates[curr]
            
            # Budget values with 1.10 multiplier
            if "Sales" in dept_id:
                prod_rev = 55000 * seasonal_factor * fx_rate
                serv_rev = 16500 * seasonal_factor * fx_rate
                budgets_to_insert.extend([
                    ("4100", dept_id, period_id, "Budget", prod_rev),
                    ("4200", dept_id, period_id, "Budget", serv_rev)
                ])
                # Direct labor COGS (15%)
                cogs_lab = (prod_rev + serv_rev) * 0.15
                budgets_to_insert.append(("5100", dept_id, period_id, "Budget", cogs_lab))
            else:
                budgets_to_insert.extend([
                    ("4100", dept_id, period_id, "Budget", 0.0),
                    ("4200", dept_id, period_id, "Budget", 0.0),
                    ("5100", dept_id, period_id, "Budget", 0.0)
                ])

            if "Eng" in dept_id:
                budgets_to_insert.append(("5200", dept_id, period_id, "Budget", 13000 * fx_rate))
            elif "Sales" in dept_id:
                budgets_to_insert.append(("5200", dept_id, period_id, "Budget", 2200 * fx_rate))
            else:
                budgets_to_insert.append(("5200", dept_id, period_id, "Budget", 0.0))
                
            salary_base = 0.0
            if "Eng" in dept_id: salary_base = 38000
            elif "Sales" in dept_id: salary_base = 27000
            elif "Mktg" in dept_id: salary_base = 20000
            elif "HR" in dept_id: salary_base = 13000
            budgets_to_insert.append(("6100", dept_id, period_id, "Budget", salary_base * fx_rate))
            
            if "Mktg" in dept_id:
                mktg = 16500 * seasonal_factor * fx_rate
            else:
                mktg = 500 * fx_rate
            budgets_to_insert.append(("6200", dept_id, period_id, "Budget", mktg))
            
            if "HR" in dept_id:
                rent = 6200 * fx_rate
            else:
                rent = 0.0
            budgets_to_insert.append(("6300", dept_id, period_id, "Budget", rent))
            
            it_cost = 0.0
            if "Eng" in dept_id: it_cost = 4500
            elif "Mktg" in dept_id: it_cost = 2200
            elif "Sales" in dept_id: it_cost = 1600
            elif "HR" in dept_id: it_cost = 1100
            budgets_to_insert.append(("6400", dept_id, period_id, "Budget", it_cost * fx_rate))
            
            travel = 1600 * fx_rate
            budgets_to_insert.append(("6500", dept_id, period_id, "Budget", travel))
            
            budgets_to_insert.extend([
                ("7000", dept_id, period_id, "Budget", 200.0 * fx_rate),
                ("7100", dept_id, period_id, "Budget", 1000.0 * fx_rate)
            ])

    # Write actuals and budgets to the SQLite DB
    cursor.executemany("""
    INSERT INTO fact_actuals (account_id, dept_id, period_id, amount, currency) 
    VALUES (?, ?, ?, ?, ?)
    """, actuals_to_insert)
    
    cursor.executemany("""
    INSERT INTO fact_budgets (account_id, dept_id, period_id, scenario_id, amount) 
    VALUES (?, ?, ?, ?, ?)
    """, budgets_to_insert)
    
    conn.commit()
    conn.close()
    print(f"Fact tables seeded successfully: {len(actuals_to_insert)} actuals, {len(budgets_to_insert)} budget entries added.")

if __name__ == "__main__":
    init_db()
    seed_dimensions()
    seed_facts()
    print("Database seeding completed successfully.")
