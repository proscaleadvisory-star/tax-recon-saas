import os
import sys
import uuid
from datetime import date, datetime
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    sys.exit(1)

print("Connecting to database...")
engine = create_engine(DATABASE_URL)

migration_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "fpa_migration.sql"))
print(f"Reading migration file: {migration_file}")

with open(migration_file, "r") as f:
    sql_script = f.read()

# Execute schema migration statements
statements = sql_script.split(";")
with engine.begin() as conn:
    print("Applying schema updates...")
    for idx, stmt in enumerate(statements):
        stmt_clean = stmt.strip()
        if not stmt_clean:
            continue
        try:
            conn.execute(text(stmt_clean))
        except Exception as e:
            print(f"Error executing statement #{idx}: {stmt_clean[:120]}...")
            print(f"Details: {e}")
            raise e

print("Schema migrations applied successfully!")

# Seed default roles and permissions
print("Seeding RBAC roles and permissions...")
with engine.begin() as conn:
    # 1. Roles
    roles = ['FinanceAdmin', 'FinanceManager', 'DepartmentHead', 'Viewer']
    role_ids = {}
    for role in roles:
        # Check if role exists
        existing = conn.execute(text("SELECT id FROM public.fpa_roles WHERE name = :name"), {"name": role}).fetchone()
        if existing:
            role_ids[role] = str(existing[0])
        else:
            r_id = str(uuid.uuid4())
            conn.execute(text("INSERT INTO public.fpa_roles (id, name) VALUES (:id, :name)"), {"id": r_id, "name": role})
            role_ids[role] = r_id
    
    # 2. Permissions
    permissions_map = {
        'FinanceAdmin': ['edit_budgets', 'view_dashboards', 'run_forecasting', 'admin_users', 'run_consolidation'],
        'FinanceManager': ['edit_budgets', 'view_dashboards', 'run_forecasting', 'run_consolidation'],
        'DepartmentHead': ['edit_budgets', 'view_dashboards'],
        'Viewer': ['view_dashboards']
    }
    
    for role, perms in permissions_map.items():
        role_id = role_ids[role]
        for perm in perms:
            # Check if exists
            existing = conn.execute(
                text("SELECT id FROM public.fpa_permissions WHERE role_id = :r_id AND permission_code = :code"),
                {"r_id": role_id, "code": perm}
            ).fetchone()
            if not existing:
                conn.execute(
                    text("INSERT INTO public.fpa_permissions (id, role_id, permission_code) VALUES (:id, :r_id, :code)"),
                    {"id": str(uuid.uuid4()), "r_id": role_id, "code": perm}
                )

# Seed Mock data for existing users
print("Checking for user profiles to seed demo data...")
with engine.begin() as conn:
    profiles = conn.execute(text("SELECT id, email FROM public.profiles")).fetchall()
    print(f"Found {len(profiles)} profiles in the database.")
    
    for p in profiles:
        tenant_id = str(p[0])
        email = p[1]
        print(f"Seeding demo FP&A workspace for {email} ({tenant_id})...")
        
        # Check if already seeded
        existing_comp = conn.execute(text("SELECT id FROM public.fpa_companies WHERE tenant_id = :tid"), {"tid": tenant_id}).fetchone()
        if existing_comp:
            print(f"Workspace for {email} already seeded. Skipping.")
            continue
            
        # 1. User Roles
        # Assign user as FinanceAdmin by default for the demo
        admin_role_id = role_ids['FinanceAdmin']
        conn.execute(
            text("""
                INSERT INTO public.fpa_user_roles (id, tenant_id, user_id, role_id)
                VALUES (:id, :tid, :uid, :rid)
                ON CONFLICT (tenant_id, user_id) DO NOTHING
            """),
            {"id": str(uuid.uuid4()), "tid": tenant_id, "uid": tenant_id, "rid": admin_role_id}
        )
        
        # 2. Companies
        comp1_id = str(uuid.uuid4()) # Primary Parent
        comp2_id = str(uuid.uuid4()) # Subsidiary (Multi-currency test)
        conn.execute(
            text("INSERT INTO public.fpa_companies (id, tenant_id, legal_name, currency_code) VALUES (:id, :tid, :name, 'INR')"),
            {"id": comp1_id, "tid": tenant_id, "name": "Acme India Tech Pvt Ltd"}
        )
        conn.execute(
            text("INSERT INTO public.fpa_companies (id, tenant_id, legal_name, currency_code) VALUES (:id, :tid, :name, 'USD')"),
            {"id": comp2_id, "tid": tenant_id, "name": "Acme US Global Inc"}
        )
        
        # 3. Departments
        depts = [
            ("Sales & Marketing", comp1_id),
            ("Engineering & Tech", comp1_id),
            ("G&A / Human Resources", comp1_id),
            ("US Sales & Operations", comp2_id)
        ]
        dept_ids = {}
        for name, comp_id in depts:
            d_id = str(uuid.uuid4())
            conn.execute(
                text("INSERT INTO public.fpa_departments (id, tenant_id, company_id, name) VALUES (:id, :tid, :cid, :name)"),
                {"id": d_id, "tid": tenant_id, "cid": comp_id, "name": name}
            )
            dept_ids[name] = d_id
            
        # 4. Chart of Accounts (COA)
        accounts = [
            ("REV-100", "Product Sales Revenue", "REVENUE", "Operating Revenue"),
            ("REV-200", "Enterprise Subscriptions", "REVENUE", "SaaS Revenue"),
            ("CGS-100", "Server & Cloud Infrastructure", "COGS", "Direct Hosting"),
            ("CGS-200", "Customer Support & Success", "COGS", "Operations COGS"),
            ("OPX-100", "Employee Payroll Salaries", "OPERATING_EXPENSE", "Compensation"),
            ("OPX-200", "Marketing & Ad Spend", "OPERATING_EXPENSE", "Growth Marketing"),
            ("OPX-300", "Office Rent & Warehouse EMIs", "OPERATING_EXPENSE", "Facilities"),
            ("OPX-400", "Software SaaS Licenses", "OPERATING_EXPENSE", "G&A Software"),
            ("TAX-100", "Corporate Income Tax", "TAX", "Tax Expenses"),
            ("OTH-100", "Exchange Rate Variance", "OTHER", "Financial Expenses")
        ]
        acct_ids = {}
        for code, name, type_, subtype in accounts:
            a_id = str(uuid.uuid4())
            conn.execute(
                text("INSERT INTO public.fpa_accounts (id, tenant_id, code, name, type, subtype) VALUES (:id, :tid, :code, :name, :type, :subtype)"),
                {"id": a_id, "tid": tenant_id, "code": code, "name": name, "type": type_, "subtype": subtype}
            )
            acct_ids[code] = a_id
            
        # 5. Time Periods
        periods = [
            (date(2026, 1, 1), "Jan 2026", "Q4", "2025-26"),
            (date(2026, 2, 1), "Feb 2026", "Q4", "2025-26"),
            (date(2026, 3, 1), "Mar 2026", "Q4", "2025-26"),
            (date(2026, 4, 1), "Apr 2026", "Q1", "2026-27"),
            (date(2026, 5, 1), "May 2026", "Q1", "2026-27"),
            (date(2026, 6, 1), "Jun 2026", "Q1", "2026-27")
        ]
        period_ids = {}
        for p_date, label, qtr, fy in periods:
            p_id = str(uuid.uuid4())
            conn.execute(
                text("INSERT INTO public.fpa_time_periods (id, tenant_id, period_date, label, quarter, financial_year) VALUES (:id, :tid, :date, :label, :qtr, :fy)"),
                {"id": p_id, "tid": tenant_id, "date": p_date, "label": label, "qtr": qtr, "fy": fy}
            )
            period_ids[label] = p_id
            
        # 6. Scenarios
        scenarios = [
            ("Actuals (FY25-26)", "Actual historical transaction data", "ACTUAL"),
            ("Board Approved Budget", "Board-approved primary baseline plan", "BUDGET"),
            ("Q4 Conservative Forecast", "Forecast adjusting opex downward", "FORECAST")
        ]
        scen_ids = {}
        for name, desc, type_ in scenarios:
            s_id = str(uuid.uuid4())
            conn.execute(
                text("INSERT INTO public.fpa_scenarios (id, tenant_id, name, description, type) VALUES (:id, :tid, :name, :desc, :type)"),
                {"id": s_id, "tid": tenant_id, "name": name, "desc": desc, "type": type_}
            )
            scen_ids[name] = s_id
            
        # 7. Exchange Rates (USD to INR is 83.00, INR to USD is 0.012)
        conn.execute(
            text("INSERT INTO public.fpa_exchange_rates (tenant_id, from_currency, to_currency, rate, effective_date) VALUES (:tid, 'USD', 'INR', 83.50, '2026-01-01')"),
            {"tid": tenant_id}
        )
        conn.execute(
            text("INSERT INTO public.fpa_exchange_rates (tenant_id, from_currency, to_currency, rate, effective_date) VALUES (:tid, 'INR', 'USD', 0.012, '2026-01-01')"),
            {"tid": tenant_id}
        )
        
        # 8. Fact Table: Seed initial Budget and Actuals figures (USD and INR)
        # We seed values for Jan, Feb, Mar 2026 (Historical Actuals and Budgets)
        # and Apr, May, Jun 2026 (Forecasts & Budgets)
        
        # Mapping accounts to values
        # India (INR) Budget/Actuals
        in_sales_dept = dept_ids["Sales & Marketing"]
        in_tech_dept = dept_ids["Engineering & Tech"]
        in_ga_dept = dept_ids["G&A / Human Resources"]
        
        us_dept = dept_ids["US Sales & Operations"]
        
        # Baseline seed values
        data_to_seed = [
            # Actuals Jan 2026
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["REV-100"], period_ids["Jan 2026"], 850000, "INR", 850000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["REV-200"], period_ids["Jan 2026"], 1200000, "INR", 1200000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_tech_dept, acct_ids["CGS-100"], period_ids["Jan 2026"], 250000, "INR", 250000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_tech_dept, acct_ids["OPX-100"], period_ids["Jan 2026"], 600000, "INR", 600000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["OPX-200"], period_ids["Jan 2026"], 450000, "INR", 450000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_ga_dept, acct_ids["OPX-300"], period_ids["Jan 2026"], 150000, "INR", 150000 * 0.012),
            
            # US (USD) Actuals Jan 2026
            (scen_ids["Actuals (FY25-26)"], comp2_id, us_dept, acct_ids["REV-100"], period_ids["Jan 2026"], 25000, "USD", 25000),
            (scen_ids["Actuals (FY25-26)"], comp2_id, us_dept, acct_ids["OPX-100"], period_ids["Jan 2026"], 12000, "USD", 12000),
            (scen_ids["Actuals (FY25-26)"], comp2_id, us_dept, acct_ids["OPX-200"], period_ids["Jan 2026"], 8000, "USD", 8000),
            
            # Budget Jan 2026
            (scen_ids["Board Approved Budget"], comp1_id, in_sales_dept, acct_ids["REV-100"], period_ids["Jan 2026"], 800000, "INR", 800000 * 0.012),
            (scen_ids["Board Approved Budget"], comp1_id, in_sales_dept, acct_ids["REV-200"], period_ids["Jan 2026"], 1100000, "INR", 1100000 * 0.012),
            (scen_ids["Board Approved Budget"], comp1_id, in_tech_dept, acct_ids["CGS-100"], period_ids["Jan 2026"], 220000, "INR", 220000 * 0.012),
            (scen_ids["Board Approved Budget"], comp1_id, in_tech_dept, acct_ids["OPX-100"], period_ids["Jan 2026"], 580000, "INR", 580000 * 0.012),
            (scen_ids["Board Approved Budget"], comp1_id, in_sales_dept, acct_ids["OPX-200"], period_ids["Jan 2026"], 400000, "INR", 400000 * 0.012),
            
            # Actuals Feb 2026 (Slight Sales growth, Rent constant)
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["REV-100"], period_ids["Feb 2026"], 920000, "INR", 920000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["REV-200"], period_ids["Feb 2026"], 1350000, "INR", 1350000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_tech_dept, acct_ids["CGS-100"], period_ids["Feb 2026"], 260000, "INR", 260000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_tech_dept, acct_ids["OPX-100"], period_ids["Feb 2026"], 600000, "INR", 600000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["OPX-200"], period_ids["Feb 2026"], 520000, "INR", 520000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_ga_dept, acct_ids["OPX-300"], period_ids["Feb 2026"], 150000, "INR", 150000 * 0.012),
            
            # Budget Feb 2026
            (scen_ids["Board Approved Budget"], comp1_id, in_sales_dept, acct_ids["REV-100"], period_ids["Feb 2026"], 850000, "INR", 850000 * 0.012),
            (scen_ids["Board Approved Budget"], comp1_id, in_sales_dept, acct_ids["REV-200"], period_ids["Feb 2026"], 1200000, "INR", 1200000 * 0.012),
            (scen_ids["Board Approved Budget"], comp1_id, in_tech_dept, acct_ids["OPX-100"], period_ids["Feb 2026"], 580000, "INR", 580000 * 0.012),
            
            # Actuals Mar 2026
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["REV-100"], period_ids["Mar 2026"], 980000, "INR", 980000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["REV-200"], period_ids["Mar 2026"], 1420000, "INR", 1420000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_tech_dept, acct_ids["CGS-100"], period_ids["Mar 2026"], 280000, "INR", 280000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_tech_dept, acct_ids["OPX-100"], period_ids["Mar 2026"], 620000, "INR", 620000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_sales_dept, acct_ids["OPX-200"], period_ids["Mar 2026"], 590000, "INR", 590000 * 0.012),
            (scen_ids["Actuals (FY25-26)"], comp1_id, in_ga_dept, acct_ids["OPX-300"], period_ids["Mar 2026"], 150000, "INR", 150000 * 0.012),
            
            # Budget Mar 2026
            (scen_ids["Board Approved Budget"], comp1_id, in_sales_dept, acct_ids["REV-100"], period_ids["Mar 2026"], 900000, "INR", 900000 * 0.012),
            (scen_ids["Board Approved Budget"], comp1_id, in_sales_dept, acct_ids["REV-200"], period_ids["Mar 2026"], 1300000, "INR", 1300000 * 0.012),
            (scen_ids["Board Approved Budget"], comp1_id, in_tech_dept, acct_ids["OPX-100"], period_ids["Mar 2026"], 580000, "INR", 580000 * 0.012),
        ]
        
        for scen, comp, dept, acct, tp, amt, cur, amt_c in data_to_seed:
            conn.execute(
                text("""
                    INSERT INTO public.fpa_financial_facts (tenant_id, scenario_id, company_id, department_id, account_id, time_period_id, amount, currency_code, amount_consolidated)
                    VALUES (:tid, :scen, :comp, :dept, :acct, :tp, :amt, :cur, :amt_c)
                """),
                {"tid": tenant_id, "scen": scen, "comp": comp, "dept": dept, "acct": acct, "tp": tp, "amt": amt, "cur": cur, "amt_c": amt_c}
            )

        print(f"Demo FP&A workspace seeded successfully for profile {email}!")

print("FP&A Database Seeding completed successfully!")
