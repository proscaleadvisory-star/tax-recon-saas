-- FP&A & Virtual CFO Database Schema Migration

-- 1. Companies / Entities
CREATE TABLE IF NOT EXISTS public.fpa_companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    legal_name      TEXT NOT NULL,
    currency_code   VARCHAR(3) NOT NULL DEFAULT 'INR', -- INR, USD, EUR, etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS public.fpa_departments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES public.fpa_companies(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Chart of Accounts (COA)
CREATE TABLE IF NOT EXISTS public.fpa_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code            VARCHAR(20) NOT NULL,
    name            TEXT NOT NULL,
    type            VARCHAR(30) NOT NULL CHECK (type IN ('REVENUE', 'COGS', 'OPERATING_EXPENSE', 'TAX', 'OTHER')),
    subtype         TEXT,
    parent_id       UUID REFERENCES public.fpa_accounts(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_code UNIQUE (tenant_id, code)
);

-- 4. Time Periods Dimension
CREATE TABLE IF NOT EXISTS public.fpa_time_periods (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_date     DATE NOT NULL, -- First day of month
    label           VARCHAR(20) NOT NULL, -- e.g. 'Jan 2026'
    quarter         VARCHAR(5) NOT NULL, -- e.g. 'Q4'
    financial_year  VARCHAR(7) NOT NULL, -- e.g. '2025-26'
    CONSTRAINT uq_tenant_period_date UNIQUE (tenant_id, period_date)
);

-- 5. Planning & Forecast Scenarios (Version Control)
CREATE TABLE IF NOT EXISTS public.fpa_scenarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('ACTUAL', 'BUDGET', 'FORECAST')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    base_scenario_id UUID REFERENCES public.fpa_scenarios(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Exchange Rates
CREATE TABLE IF NOT EXISTS public.fpa_exchange_rates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_currency   VARCHAR(3) NOT NULL,
    to_currency     VARCHAR(3) NOT NULL,
    rate            NUMERIC(10, 6) NOT NULL,
    effective_date  DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Fact Table: Financial Facts (Unified Actuals, Budgets, Forecasts)
CREATE TABLE IF NOT EXISTS public.fpa_financial_facts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scenario_id         UUID NOT NULL REFERENCES public.fpa_scenarios(id) ON DELETE CASCADE,
    company_id          UUID NOT NULL REFERENCES public.fpa_companies(id) ON DELETE CASCADE,
    department_id       UUID NOT NULL REFERENCES public.fpa_departments(id) ON DELETE CASCADE,
    account_id          UUID NOT NULL REFERENCES public.fpa_accounts(id) ON DELETE CASCADE,
    time_period_id      UUID NOT NULL REFERENCES public.fpa_time_periods(id) ON DELETE CASCADE,
    amount              NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Amount in Entity's local currency
    currency_code       VARCHAR(3) NOT NULL, -- local currency code
    amount_consolidated NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Amount in consolidated base currency (USD)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for Fact Table (star schema query performance)
CREATE INDEX IF NOT EXISTS idx_fpa_facts_query ON public.fpa_financial_facts (tenant_id, scenario_id, company_id, department_id, account_id, time_period_id);

-- 8. KPI Scorecard Table
CREATE TABLE IF NOT EXISTS public.fpa_kpis (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id          UUID NOT NULL REFERENCES public.fpa_companies(id) ON DELETE CASCADE,
    time_period_id      UUID NOT NULL REFERENCES public.fpa_time_periods(id) ON DELETE CASCADE,
    name                TEXT NOT NULL, -- e.g. 'Gross Profit Margin', 'CAC', 'LTV'
    value               NUMERIC(15, 4) NOT NULL DEFAULT 0.00,
    target_value        NUMERIC(15, 4),
    category            VARCHAR(50) NOT NULL, -- e.g. 'PROFITABILITY', 'EFFICIENCY', 'GROWTH'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Collaboration Comments
CREATE TABLE IF NOT EXISTS public.fpa_comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    fact_id         UUID REFERENCES public.fpa_financial_facts(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comment_text    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS public.fpa_audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action          TEXT NOT NULL, -- 'CREATE_BUDGET', 'UPDATE_BUDGET', 'RUN_CONSOLIDATION', etc.
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    change_json     JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Role-Based Access Control (RBAC) Tables
CREATE TABLE IF NOT EXISTS public.fpa_roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE -- 'FinanceAdmin', 'FinanceManager', 'DepartmentHead', 'Viewer'
);

CREATE TABLE IF NOT EXISTS public.fpa_user_roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES public.fpa_roles(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_user UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.fpa_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID NOT NULL REFERENCES public.fpa_roles(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL, -- 'edit_budgets', 'view_dashboards', 'run_forecasting', 'admin_users'
    CONSTRAINT uq_role_perm UNIQUE (role_id, permission_code)
);

-- Enable RLS
ALTER TABLE public.fpa_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_time_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_financial_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpa_user_roles ENABLE ROW LEVEL SECURITY;

-- Create Policies mapping tenant_id to auth.uid()
CREATE POLICY fpa_companies_policy ON public.fpa_companies FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_departments_policy ON public.fpa_departments FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_accounts_policy ON public.fpa_accounts FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_time_periods_policy ON public.fpa_time_periods FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_scenarios_policy ON public.fpa_scenarios FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_exchange_rates_policy ON public.fpa_exchange_rates FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_financial_facts_policy ON public.fpa_financial_facts FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_kpis_policy ON public.fpa_kpis FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_comments_policy ON public.fpa_comments FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_audit_logs_policy ON public.fpa_audit_logs FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY fpa_user_roles_policy ON public.fpa_user_roles FOR ALL USING (auth.uid() = tenant_id);
