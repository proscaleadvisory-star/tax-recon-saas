-- ============================================================================
-- E-Commerce Tax Reconciliation & Financial OS — PostgreSQL Migration
-- Version: 2.0.0
-- Description: Complete schema for staging, dynamic templates, product catalogs,
--              returns staging, and consolidated unit economic ledger.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (extends Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE NOT NULL,
    full_name       TEXT,
    company_name    TEXT,
    gstin           VARCHAR(15),
    subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise')),
    monthly_upload_count INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. DYNAMIC FILE TEMPLATES (stores column mappings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.file_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_name   TEXT NOT NULL,
    file_type       TEXT NOT NULL CHECK (file_type IN ('sales', 'payment', 'return', 'catalog')),
    delimiter       VARCHAR(5) DEFAULT ',',
    skip_rows       INTEGER DEFAULT 0,
    column_mapping  JSONB NOT NULL, -- Format: { "Raw Column Header": "canonical_column_name" }
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_template_name UNIQUE (user_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_file_templates_user ON public.file_templates(user_id);

-- ============================================================================
-- 3. PRODUCT CATALOG (holds unit cost structure)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_catalog (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sku             TEXT NOT NULL,
    product_name    TEXT,
    cost_price      NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Cost of Goods Sold (COGS)
    selling_price   NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    min_safety_stock INTEGER NOT NULL DEFAULT 10,
    stock_in_transit INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_sku UNIQUE (user_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_catalog_user_sku ON public.product_catalog(user_id, sku);

-- ============================================================================
-- 4. RAW SALES STAGING (temporary chunk-streamed sales data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.raw_sales_staging (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id        TEXT NOT NULL,
    sku             TEXT,
    product_description TEXT,
    quantity        INTEGER DEFAULT 1,
    taxable_value   NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cgst_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tcs_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_tax       NUMERIC(12, 2) GENERATED ALWAYS AS (cgst_amount + sgst_amount + igst_amount + tcs_amount) STORED,
    invoice_value   NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    shipping_state  TEXT DEFAULT 'UNKNOWN',
    shipping_charge NUMERIC(12, 2) DEFAULT 0.00,
    month_year      VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    upload_batch_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_staging_user_order ON public.raw_sales_staging (user_id, order_id);
CREATE INDEX IF NOT EXISTS idx_sales_staging_month ON public.raw_sales_staging (user_id, month_year);

-- ============================================================================
-- 5. RAW RETURNS STAGING (temporary chunk-streamed returns data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.raw_returns_staging (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id        TEXT NOT NULL,
    sku             TEXT,
    returned_quantity INTEGER DEFAULT 1,
    refund_amount   NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    return_reason   TEXT,
    month_year      VARCHAR(7) NOT NULL,
    upload_batch_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_staging_user_order ON public.raw_returns_staging (user_id, order_id);
CREATE INDEX IF NOT EXISTS idx_returns_staging_month ON public.raw_returns_staging (user_id, month_year);

-- ============================================================================
-- 6. RAW PAYMENTS STAGING (temporary chunk-streamed payments/charges data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.raw_payments_staging (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id        TEXT NOT NULL,
    transaction_type TEXT,
    settled_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    marketplace_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Commission, fixed fees, pg fees, etc.
    tds_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payout      NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    settlement_date DATE,
    month_year      VARCHAR(7) NOT NULL,
    upload_batch_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_staging_user_order ON public.raw_payments_staging (user_id, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_staging_month ON public.raw_payments_staging (user_id, month_year);

-- ============================================================================
-- 7. RECONCILED LEDGER & FINANCIAL OS (permanent system of record)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reconciled_ledger (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id        TEXT NOT NULL,
    sku             TEXT,
    product_description TEXT,
    
    -- Volumes
    quantity_sold   INTEGER DEFAULT 0,
    quantity_returned INTEGER DEFAULT 0,
    net_quantity    INTEGER GENERATED ALWAYS AS (quantity_sold - quantity_returned) STORED,
    
    -- Gross Financials
    gross_sales     NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- invoice value of sales
    gross_tax       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tcs_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Returns Financials
    refund_amount   NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Payout Financials
    settled_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    marketplace_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tds_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payout      NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Net Financials (Calculated fields)
    net_sales       NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- gross_sales minus refund_amount
    cost_price      NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- COGS per unit * net_quantity
    net_profit      NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- net_sales - cost_price - marketplace_fee
    
    -- Shipping Details (for heatmaps)
    shipping_state  TEXT DEFAULT 'UNKNOWN',
    
    -- Audit Reconciliation metrics
    variance        NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- expected net_sales vs settled_amount
    risk_flag       TEXT NOT NULL DEFAULT 'OK' CHECK (risk_flag IN ('OK', 'UNDER_REPORTED', 'OVER_REPORTED', 'MISSING_PAYMENT', 'MISSING_SALE', 'UNEXPECTED_RETURN')),
    
    month_year      VARCHAR(7) NOT NULL,
    reconciled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_reconciled_ledger_order_month UNIQUE (user_id, order_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_reconciled_ledger_user_month ON public.reconciled_ledger (user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_reconciled_ledger_risk ON public.reconciled_ledger (user_id, risk_flag) WHERE risk_flag != 'OK';
CREATE INDEX IF NOT EXISTS idx_reconciled_ledger_state ON public.reconciled_ledger (user_id, shipping_state);

-- ============================================================================
-- 8. CONSOLIDATED RECONCILIATION FUNCTION (Pushes heavy computations to SQL)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reconcile_orders(
    p_user_id UUID,
    p_month_year VARCHAR(7)
)
RETURNS TABLE (
    total_matched   BIGINT,
    total_flagged   BIGINT,
    total_variance  NUMERIC,
    net_profit      NUMERIC
) AS $$
DECLARE
    v_matched   BIGINT;
    v_flagged   BIGINT;
    v_variance  NUMERIC;
    v_profit    NUMERIC;
BEGIN
    INSERT INTO public.reconciled_ledger (
        user_id, order_id, sku, product_description,
        quantity_sold, quantity_returned,
        gross_sales, gross_tax, tcs_amount, refund_amount,
        settled_amount, marketplace_fee, tds_amount, net_payout,
        net_sales, cost_price, net_profit, shipping_state,
        variance, risk_flag, month_year,
        channel, metadata, order_status, shipping_charge,
        return_shipping_charge, recovery_amount, transaction_status,
        transaction_release_date
    )
    SELECT
        p_user_id,
        COALESCE(s.order_id, r.order_id, p.order_id)         AS order_id,
        COALESCE(s.sku, r.sku, p.sku)                        AS sku,
        MAX(s.product_description)                           AS product_description,
        COALESCE(SUM(s.quantity), 0)                         AS quantity_sold,
        COALESCE(SUM(r.returned_quantity), 0)                AS quantity_returned,
        COALESCE(SUM(s.invoice_value), 0)                    AS gross_sales,
        COALESCE(SUM(s.total_tax), 0)                        AS gross_tax,
        COALESCE(SUM(s.tcs_amount), 0)                       AS tcs_amount,
        COALESCE(SUM(r.refund_amount), 0)                    AS refund_amount,
        COALESCE(SUM(p.settled_amount), 0)                   AS settled_amount,
        COALESCE(SUM(p.marketplace_fee), 0)                  AS marketplace_fee,
        COALESCE(SUM(p.tds_amount), 0)                       AS tds_amount,
        COALESCE(SUM(p.net_payout), 0)                       AS net_payout,
        
        (COALESCE(SUM(s.invoice_value), 0) - COALESCE(SUM(r.refund_amount), 0)) AS net_sales,
        
        (COALESCE(MAX(c.cost_price), 0.00) * (COALESCE(SUM(s.quantity), 0) - COALESCE(SUM(r.returned_quantity), 0))) AS cost_price,
        
        ((COALESCE(SUM(s.invoice_value), 0) - COALESCE(SUM(r.refund_amount), 0)) 
         - (COALESCE(MAX(c.cost_price), 0.00) * (COALESCE(SUM(s.quantity), 0) - COALESCE(SUM(r.returned_quantity), 0)))
         - COALESCE(SUM(p.marketplace_fee), 0))               AS net_profit,
         
        COALESCE(MAX(s.shipping_state), 'UNKNOWN')           AS shipping_state,
        
        ((COALESCE(SUM(s.invoice_value), 0) - COALESCE(SUM(r.refund_amount), 0)) - COALESCE(SUM(p.settled_amount), 0)) AS variance,
        
        CASE
            WHEN MAX(s.order_id) IS NULL AND MAX(r.order_id) IS NOT NULL THEN 'UNEXPECTED_RETURN'
            WHEN MAX(s.order_id) IS NULL                          THEN 'MISSING_SALE'
            WHEN MAX(p.order_id) IS NULL AND MAX(r.order_id) IS NULL   THEN 
                CASE WHEN COALESCE(MAX(s.channel), MAX(r.channel)) = 'amazon' THEN 'OK' ELSE 'MISSING_PAYMENT' END
            WHEN MAX(p.transaction_status) = 'DEFERRED'      THEN 'OK'
            WHEN ((COALESCE(SUM(s.invoice_value), 0) - COALESCE(SUM(r.refund_amount), 0)) - COALESCE(SUM(p.settled_amount), 0)) > 1.00 
                                                             THEN 'UNDER_REPORTED'
            WHEN (COALESCE(SUM(p.settled_amount), 0) - (COALESCE(SUM(s.invoice_value), 0) - COALESCE(SUM(r.refund_amount), 0))) > 1.00 
                                                             THEN 'OVER_REPORTED'
            ELSE 'OK'
        END                                                  AS risk_flag,
        p_month_year,
        COALESCE(MAX(s.channel), MAX(r.channel), MAX(p.channel), 'standard') AS channel,
        COALESCE(MIN(s.metadata::text)::jsonb, MIN(r.metadata::text)::jsonb, MIN(p.metadata::text)::jsonb, '{}'::jsonb) AS metadata,
        COALESCE(MAX(s.order_status), MAX(p.order_status), 'Delivered') AS order_status,
        COALESCE(SUM(p.shipping_charge), 0)                  AS shipping_charge,
        COALESCE(SUM(p.return_shipping_charge), 0)           AS return_shipping_charge,
        COALESCE(SUM(p.recovery_amount), 0)                  AS recovery_amount,
        COALESCE(MAX(p.transaction_status), 'RELEASED')      AS transaction_status,
        MAX(p.transaction_release_date)                      AS transaction_release_date
    FROM (
        SELECT order_id, sku, MAX(product_description) AS product_description, SUM(quantity) AS quantity,
               SUM(total_tax) AS total_tax, SUM(tcs_amount) AS tcs_amount, SUM(invoice_value) AS invoice_value,
               MAX(shipping_state) AS shipping_state, MAX(channel) AS channel, MIN(metadata::text)::jsonb AS metadata,
               MAX(invoice_number) AS invoice_number, MAX(order_status) AS order_status
        FROM public.raw_sales_staging
        WHERE user_id = p_user_id AND month_year = p_month_year
        GROUP BY order_id, sku
    ) s
    FULL OUTER JOIN (
        SELECT order_id, sku, SUM(returned_quantity) AS returned_quantity, SUM(refund_amount) AS refund_amount,
               MAX(channel) AS channel, MIN(metadata::text)::jsonb AS metadata
        FROM public.raw_returns_staging
        WHERE user_id = p_user_id AND month_year = p_month_year
        GROUP BY order_id, sku
    ) r ON s.order_id = r.order_id AND s.sku = r.sku
    FULL OUTER JOIN (
        SELECT order_id, sku, MAX(channel) AS channel, MIN(metadata::text)::jsonb AS metadata,
               MAX(order_status) AS order_status,
               SUM(settled_amount) AS settled_amount,
               SUM(marketplace_fee) AS marketplace_fee,
               SUM(tds_amount) AS tds_amount,
               SUM(net_payout) AS net_payout,
               SUM(shipping_charge) AS shipping_charge,
               SUM(return_shipping_charge) AS return_shipping_charge,
               SUM(recovery_amount) AS recovery_amount,
               MAX(transaction_status) AS transaction_status,
               MAX(transaction_release_date) AS transaction_release_date
        FROM public.raw_payments_staging
        WHERE user_id = p_user_id AND month_year = p_month_year
        GROUP BY order_id, sku
    ) p ON COALESCE(s.order_id, r.order_id) = p.order_id 
       AND (p.sku IS NULL OR p.sku = '' OR COALESCE(s.sku, r.sku) = p.sku)
    LEFT JOIN public.product_catalog c 
      ON c.user_id = p_user_id AND c.sku = COALESCE(s.sku, r.sku)
    GROUP BY 
        COALESCE(s.order_id, r.order_id, p.order_id), 
        COALESCE(s.sku, r.sku, p.sku)
    ON CONFLICT (user_id, order_id, month_year) DO UPDATE SET
        sku                 = EXCLUDED.sku,
        product_description = EXCLUDED.product_description,
        quantity_sold       = EXCLUDED.quantity_sold,
        quantity_returned   = EXCLUDED.quantity_returned,
        gross_sales         = EXCLUDED.gross_sales,
        gross_tax           = EXCLUDED.gross_tax,
        tcs_amount          = EXCLUDED.tcs_amount,
        refund_amount       = EXCLUDED.refund_amount,
        settled_amount      = EXCLUDED.settled_amount,
        marketplace_fee     = EXCLUDED.marketplace_fee,
        tds_amount          = EXCLUDED.tds_amount,
        net_payout          = EXCLUDED.net_payout,
        net_sales           = EXCLUDED.net_sales,
        cost_price          = EXCLUDED.cost_price,
        net_profit          = EXCLUDED.net_profit,
        shipping_state      = EXCLUDED.shipping_state,
        variance            = EXCLUDED.variance,
        risk_flag           = EXCLUDED.risk_flag,
        channel             = EXCLUDED.channel,
        metadata            = EXCLUDED.metadata,
        order_status        = EXCLUDED.order_status,
        shipping_charge     = EXCLUDED.shipping_charge,
        return_shipping_charge = EXCLUDED.return_shipping_charge,
        recovery_amount     = EXCLUDED.recovery_amount,
        transaction_status  = EXCLUDED.transaction_status,
        transaction_release_date = EXCLUDED.transaction_release_date,
        reconciled_at       = NOW();

    DELETE FROM public.dispute_tickets 
    WHERE user_id = p_user_id 
      AND order_id IN (
          SELECT order_id FROM public.reconciled_ledger 
          WHERE user_id = p_user_id AND month_year = p_month_year
      )
      AND status = 'OPEN';

    INSERT INTO public.dispute_tickets (user_id, order_id, channel, dispute_type, amount, description)
    SELECT 
        l.user_id,
        l.order_id,
        l.channel,
        'MISSING_RETURN_INVENTORY',
        (l.refund_amount + l.return_shipping_charge) AS amount,
        'Customer return refunded on portal but SKU ' || COALESCE(l.sku, '') || ' was never physically scanned back in warehouse logs.'
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id 
      AND l.month_year = p_month_year
      AND (l.refund_amount > 0 OR l.return_shipping_charge > 0)
      AND NOT EXISTS (
          SELECT 1 FROM public.raw_warehouse_logs w 
          WHERE w.user_id = l.user_id 
            AND w.order_id = l.order_id
            AND (w.sku = l.sku OR l.sku IS NULL)
      )
    ON CONFLICT (user_id, order_id, dispute_type) DO NOTHING;

    INSERT INTO public.dispute_tickets (user_id, order_id, channel, dispute_type, amount, description)
    SELECT 
        l.user_id,
        l.order_id,
        l.channel,
        'WEIGHT_SLAB_OVERCHARGE',
        (l.shipping_charge - (rc.base_rate + GREATEST(0, CEIL(COALESCE(c.weight_g, 200)::float / rc.weight_slab_g::float) - 1) * rc.slab_cost)) AS amount,
        'Shipping charged (₹' || l.shipping_charge || ') exceeds expected rate card base (₹' || 
        (rc.base_rate + GREATEST(0, CEIL(COALESCE(c.weight_g, 200)::float / rc.weight_slab_g::float) - 1) * rc.slab_cost) || 
        ') for SKU weight class ' || COALESCE(c.weight_g, 200) || 'g.'
    FROM public.reconciled_ledger l
    JOIN public.product_catalog c ON c.user_id = l.user_id AND c.sku = l.sku
    JOIN public.platform_rate_cards rc ON rc.channel = l.channel 
      AND rc.weight_slab_g = 500
      AND rc.zone = CASE 
          WHEN l.shipping_state = 'Maharashtra' THEN 'LOCAL'
          WHEN l.shipping_state IN ('Gujarat', 'Goa', 'Madhya Pradesh', 'Karnataka', 'Telangana') THEN 'REGIONAL'
          ELSE 'NATIONAL'
      END
    WHERE l.user_id = p_user_id 
      AND l.month_year = p_month_year
      AND l.shipping_charge > (rc.base_rate + GREATEST(0, CEIL(COALESCE(c.weight_g, 200)::float / rc.weight_slab_g::float) - 1) * rc.slab_cost) + 15.00
    ON CONFLICT (user_id, order_id, dispute_type) DO NOTHING;

    INSERT INTO public.dispute_tickets (user_id, order_id, channel, dispute_type, amount, description)
    SELECT 
        l.user_id,
        l.order_id,
        l.channel,
        'UNJUSTIFIED_PENALTY',
        l.recovery_amount AS amount,
        'Platform recovery fee of ₹' || l.recovery_amount || ' deducted on order status: ' || COALESCE(l.order_status, '') || '.'
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id 
      AND l.month_year = p_month_year
      AND l.recovery_amount > 0
      AND (l.order_status = 'Delivered' OR l.quantity_returned = 0)
    ON CONFLICT (user_id, order_id, dispute_type) DO NOTHING;

    INSERT INTO public.dispute_tickets (user_id, order_id, channel, dispute_type, amount, description)
    SELECT 
        l.user_id,
        l.order_id,
        l.channel,
        'COD_PREMIUM_OVERCHARGE',
        l.marketplace_fee * 0.20 AS amount,
        'COD fee premium misapplied on prepaid order.'
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id 
      AND l.month_year = p_month_year
      AND l.channel = 'flipkart'
      AND (l.metadata->>'payment_type' = 'Prepaid' OR l.metadata->>'order_type' = 'Prepaid')
      AND l.marketplace_fee > 0.05 * l.gross_sales
    ON CONFLICT (user_id, order_id, dispute_type) DO NOTHING;

    INSERT INTO public.dispute_tickets (user_id, order_id, channel, dispute_type, amount, description)
    SELECT 
        l.user_id,
        l.order_id,
        l.channel,
        'DOUBLE_DEDUCTION_RETURN',
        l.return_shipping_charge AS amount,
        'Reverse logistics shipping fee of ₹' || l.return_shipping_charge || ' wrongfully charged on Courier Return (RTO).'
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id 
      AND l.month_year = p_month_year
      AND l.return_shipping_charge > 0
      AND (l.order_status = 'RTO' OR l.order_status = 'Courier Returned' OR l.metadata->>'return_type' = 'RTO')
    ON CONFLICT (user_id, order_id, dispute_type) DO NOTHING;

    SELECT COUNT(*) INTO v_matched
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = p_month_year;

    SELECT COUNT(*) INTO v_flagged
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = p_month_year AND l.risk_flag != 'OK';

    SELECT COALESCE(SUM(ABS(l.variance)), 0) INTO v_variance
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = p_month_year;

    SELECT COALESCE(SUM(l.net_profit), 0) INTO v_profit
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = p_month_year;

    DELETE FROM public.raw_sales_staging WHERE user_id = p_user_id AND month_year = p_month_year;
    DELETE FROM public.raw_returns_staging WHERE user_id = p_user_id AND month_year = p_month_year;
    DELETE FROM public.raw_payments_staging WHERE user_id = p_user_id AND month_year = p_month_year;

    RETURN QUERY SELECT v_matched, v_flagged, v_variance, v_profit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.file_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_sales_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_returns_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_payments_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciled_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY file_templates_policy ON public.file_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY product_catalog_policy ON public.product_catalog FOR ALL USING (auth.uid() = user_id);
CREATE POLICY sales_staging_policy ON public.raw_sales_staging FOR ALL USING (auth.uid() = user_id);
CREATE POLICY returns_staging_policy ON public.raw_returns_staging FOR ALL USING (auth.uid() = user_id);
CREATE POLICY payments_staging_policy ON public.raw_payments_staging FOR ALL USING (auth.uid() = user_id);
CREATE POLICY reconciled_ledger_policy ON public.reconciled_ledger FOR ALL USING (auth.uid() = user_id);

-- Auto-profile trigger creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 10. MULTI-CHANNEL & DISPUTE SCHEMA EVOLUTION ( Meesho, Amazon, Flipkart, Myntra )
-- ============================================================================

-- Extend existing staging tables
ALTER TABLE public.raw_sales_staging 
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS order_status TEXT;

ALTER TABLE public.raw_returns_staging 
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.raw_payments_staging 
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS order_status TEXT,
    ADD COLUMN IF NOT EXISTS shipping_charge NUMERIC(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS return_shipping_charge NUMERIC(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS recovery_amount NUMERIC(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS transaction_status TEXT DEFAULT 'RELEASED',
    ADD COLUMN IF NOT EXISTS transaction_release_date DATE,
    ADD COLUMN IF NOT EXISTS sku TEXT;

ALTER TABLE public.reconciled_ledger 
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS dispute_flags TEXT[] DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS order_status TEXT,
    ADD COLUMN IF NOT EXISTS shipping_charge NUMERIC(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS return_shipping_charge NUMERIC(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS recovery_amount NUMERIC(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS transaction_status TEXT DEFAULT 'RELEASED',
    ADD COLUMN IF NOT EXISTS transaction_release_date DATE;

ALTER TABLE public.product_catalog 
    ADD COLUMN IF NOT EXISTS weight_g INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weight_slab_g INTEGER DEFAULT 500;

-- Create warehouse return inward scans table
CREATE TABLE IF NOT EXISTS public.raw_warehouse_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id        TEXT NOT NULL,
    sku             TEXT,
    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_order_sku UNIQUE (user_id, order_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_warehouse_logs_user_order ON public.raw_warehouse_logs (user_id, order_id);

-- Create dispute tickets table
CREATE TABLE IF NOT EXISTS public.dispute_tickets (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id        TEXT NOT NULL,
    channel         TEXT NOT NULL,
    dispute_type    TEXT NOT NULL, -- e.g., 'MISSING_RETURN_INVENTORY', 'WEIGHT_SLAB_OVERCHARGE', 'UNJUSTIFIED_PENALTY', 'COD_PREMIUM_OVERCHARGE', 'TAG_LOOP_MISSING', 'DOUBLE_DEDUCTION_RETURN'
    amount          NUMERIC(12, 2) DEFAULT 0.00,
    description     TEXT,
    status          TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FILED', 'RESOLVED', 'REJECTED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_order_dispute UNIQUE (user_id, order_id, dispute_type)
);
CREATE INDEX IF NOT EXISTS idx_dispute_tickets_user ON public.dispute_tickets (user_id);

-- Create logistics rate cards table
CREATE TABLE IF NOT EXISTS public.platform_rate_cards (
    id              SERIAL PRIMARY KEY,
    channel         TEXT NOT NULL,
    zone            TEXT NOT NULL, -- 'LOCAL', 'REGIONAL', 'NATIONAL', etc.
    weight_slab_g   INTEGER NOT NULL, -- e.g., 500
    base_rate       NUMERIC(12,2) NOT NULL,
    slab_cost       NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_channel_zone_slab UNIQUE (channel, zone, weight_slab_g)
);

-- Seed platform rate cards for Meesho, Flipkart, Amazon
INSERT INTO public.platform_rate_cards (channel, zone, weight_slab_g, base_rate, slab_cost) VALUES
('meesho', 'LOCAL', 500, 35.00, 25.00),
('meesho', 'REGIONAL', 500, 45.00, 30.00),
('meesho', 'NATIONAL', 500, 55.00, 35.00),
('flipkart', 'LOCAL', 500, 29.00, 22.00),
('flipkart', 'REGIONAL', 500, 40.00, 28.00),
('flipkart', 'NATIONAL', 500, 65.00, 35.00),
('amazon', 'LOCAL', 500, 43.00, 25.00),
('amazon', 'REGIONAL', 500, 56.00, 32.00),
('amazon', 'NATIONAL', 500, 79.00, 38.00)
ON CONFLICT (channel, zone, weight_slab_g) DO UPDATE SET
    base_rate = EXCLUDED.base_rate,
    slab_cost = EXCLUDED.slab_cost,
    updated_at = NOW();

-- Enable RLS for new tables
ALTER TABLE public.raw_warehouse_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY raw_warehouse_logs_policy ON public.raw_warehouse_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY dispute_tickets_policy ON public.dispute_tickets FOR ALL USING (auth.uid() = user_id);
