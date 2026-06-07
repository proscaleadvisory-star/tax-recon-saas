-- ============================================================================
-- E-Commerce Tax Reconciliation & Financial OS — Meesho Refactor Schema
-- Version: 3.0.0
-- ============================================================================

-- 1. REPORT CONTRACTS TABLE
CREATE TABLE IF NOT EXISTS public.report_contracts (
    id                      VARCHAR(50) PRIMARY KEY,
    platform                TEXT NOT NULL CHECK (platform IN ('meesho', 'amazon', 'flipkart', 'myntra')),
    report_family           TEXT NOT NULL, -- e.g., 'gst_sales', 'payment', 'ads_cost'
    report_name             TEXT NOT NULL,
    report_name_aliases     JSONB NOT NULL DEFAULT '[]'::jsonb,
    sheet_name_aliases      JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence_level        TEXT NOT NULL DEFAULT 'screenshot_observed' CHECK (confidence_level IN ('official', 'screenshot_observed', 'live_sample_verified', 'reconstructed', 'unsupported')),
    file_type               TEXT NOT NULL CHECK (file_type IN ('xlsx', 'csv', 'zip', 'tsv')),
    expected_sheets         JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_header_row     INTEGER DEFAULT 1, -- 1-indexed
    formula_rows_to_skip    JSONB NOT NULL DEFAULT '[]'::jsonb, -- list of row numbers to skip
    data_start_row          INTEGER DEFAULT 2, -- 1-indexed
    required_columns        JSONB NOT NULL DEFAULT '[]'::jsonb,
    optional_columns        JSONB NOT NULL DEFAULT '[]'::jsonb,
    column_aliases_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
    amount_sign_rules_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
    date_format_rules_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
    canonical_mapping_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
    version                 VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    active_from             DATE DEFAULT CURRENT_DATE,
    active_to               DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_contracts_platform ON public.report_contracts(platform);

-- 2. RAW FILE UPLOADS TABLE
CREATE TABLE IF NOT EXISTS public.raw_file_uploads (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform                TEXT NOT NULL,
    report_contract_id      VARCHAR(50) REFERENCES public.report_contracts(id) ON DELETE SET NULL,
    original_file_name      TEXT NOT NULL,
    file_hash               VARCHAR(64) NOT NULL,
    upload_period_from      DATE,
    upload_period_to        DATE,
    gst_period              VARCHAR(7), -- YYYY-MM
    payout_period           VARCHAR(20),
    sheet_names_detected    JSONB NOT NULL DEFAULT '[]'::jsonb,
    parser_version          VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    validation_status       TEXT NOT NULL CHECK (validation_status IN ('PENDING', 'VALID', 'INVALID', 'WARNING')),
    validation_errors_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
    empty_sheets_json       JSONB NOT NULL DEFAULT '[]'::jsonb,
    unmapped_columns_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_confidence       TEXT NOT NULL, -- official / screenshot_observed / live_sample_verified
    uploaded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_file_hash UNIQUE (user_id, platform, report_contract_id, file_hash)
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_platform ON public.raw_file_uploads(user_id, platform);

-- Enable RLS
ALTER TABLE public.report_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_contracts_policy ON public.report_contracts FOR SELECT USING (true); -- Read-only public contracts
CREATE POLICY file_uploads_policy ON public.raw_file_uploads FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 3. CANONICAL FACT TABLES
-- ============================================================================

-- Fact 1: fact_payout_batches (Parent table for payout NEFT batches)
CREATE TABLE IF NOT EXISTS public.fact_payout_batches (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    upload_id               UUID NOT NULL REFERENCES public.raw_file_uploads(id) ON DELETE CASCADE,
    transaction_id          TEXT NOT NULL,
    payment_date            DATE NOT NULL,
    final_settlement_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_payout_batch UNIQUE (user_id, transaction_id)
);
CREATE INDEX IF NOT EXISTS idx_fact_payout_batches_user ON public.fact_payout_batches(user_id);

-- Fact 2: fact_order_items (Core order level items)
CREATE TABLE IF NOT EXISTS public.fact_order_items (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    upload_id               UUID NOT NULL REFERENCES public.raw_file_uploads(id) ON DELETE CASCADE,
    sub_order_num           TEXT, -- Nullable!
    sku                     TEXT,
    product_name            TEXT,
    quantity                INTEGER NOT NULL DEFAULT 1,
    hsn_code                TEXT,
    unit_price              NUMERIC(12, 2) DEFAULT 0.00,
    order_date              DATE,
    order_month             VARCHAR(7), -- YYYY-MM
    dispatch_date           DATE,
    delivered_date          DATE,
    order_status            TEXT,
    order_source            TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fact_order_items_user_order ON public.fact_order_items(user_id, sub_order_num);

-- Fact 3: fact_tax_invoices
CREATE TABLE IF NOT EXISTS public.fact_tax_invoices (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    upload_id               UUID NOT NULL REFERENCES public.raw_file_uploads(id) ON DELETE CASCADE,
    sub_order_num           TEXT,
    invoice_number          TEXT,
    invoice_date            DATE,
    invoice_month           VARCHAR(7), -- YYYY-MM
    taxable_value           NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cgst_amount             NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount             NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount             NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_rate                NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    invoice_value           NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    shipping_state          TEXT,
    customer_gstin          TEXT,
    type                    TEXT CHECK (type IN ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fact_tax_invoices_user_order ON public.fact_tax_invoices(user_id, sub_order_num);

-- Fact 4: fact_fee_lines (Logistics, Platform Commission, Ads, etc.)
CREATE TABLE IF NOT EXISTS public.fact_fee_lines (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    upload_id               UUID NOT NULL REFERENCES public.raw_file_uploads(id) ON DELETE CASCADE,
    sub_order_num           TEXT,
    fee_type                TEXT NOT NULL, -- e.g., 'COMMISSION', 'FIXED_FEE', 'SHIPPING_CHARGE', 'RETURN_SHIPPING_CHARGE', 'ADS_COST', 'WAREHOUSING_FEE', 'MALL_PLATFORM_FEE', 'GOLD_PLATFORM_FEE', 'OTHER_CHARGES'
    taxable_amount          NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_amount              NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount            NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Signed charge amount
    billing_date            DATE,
    campaign_id             TEXT,
    remarks                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fact_fee_lines_user_order ON public.fact_fee_lines(user_id, sub_order_num);

-- Fact 5: fact_settlement_events
CREATE TABLE IF NOT EXISTS public.fact_settlement_events (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    upload_id               UUID NOT NULL REFERENCES public.raw_file_uploads(id) ON DELETE CASCADE,
    sub_order_num           TEXT,
    settlement_date         DATE NOT NULL,
    amount                  NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Signed amount
    payout_batch_id         BIGINT REFERENCES public.fact_payout_batches(id) ON DELETE SET NULL,
    transaction_id          TEXT,
    price_type              TEXT, -- 'Sale' or 'Return'
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fact_settlement_events_user_order ON public.fact_settlement_events(user_id, sub_order_num);

-- Fact 6: fact_adjustment_events (Referrals, rewards, program waivers)
CREATE TABLE IF NOT EXISTS public.fact_adjustment_events (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    upload_id               UUID NOT NULL REFERENCES public.raw_file_uploads(id) ON DELETE CASCADE,
    sub_order_num           TEXT,
    adjustment_type         TEXT NOT NULL, -- e.g. 'REFERRAL_PAYMENT', 'WAIVER', 'REWARD', 'DISCOUNT'
    reward_id               TEXT,
    amount                  NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Signed amount
    taxes                   NUMERIC(12, 2) DEFAULT 0.00,
    store_name              TEXT,
    reason                  TEXT,
    adjustment_date         DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fact_adjustment_events_user_order ON public.fact_adjustment_events(user_id, sub_order_num);

-- Fact 7: fact_tax_deductions
CREATE TABLE IF NOT EXISTS public.fact_tax_deductions (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    upload_id               UUID NOT NULL REFERENCES public.raw_file_uploads(id) ON DELETE CASCADE,
    sub_order_num           TEXT,
    deduction_type          TEXT NOT NULL CHECK (deduction_type IN ('TCS', 'TDS')),
    rate_percent            NUMERIC(5, 2),
    amount                  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    date                    DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fact_tax_deductions_user_order ON public.fact_tax_deductions(user_id, sub_order_num);

-- Fact 8: fact_claim_events
CREATE TABLE IF NOT EXISTS public.fact_claim_events (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    upload_id               UUID NOT NULL REFERENCES public.raw_file_uploads(id) ON DELETE CASCADE,
    sub_order_num           TEXT,
    claim_type              TEXT NOT NULL CHECK (claim_type IN ('COMPENSATION', 'CLAIMS', 'RECOVERY')),
    reason                  TEXT,
    amount                  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    date                    DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fact_claim_events_user_order ON public.fact_claim_events(user_id, sub_order_num);

-- Enable RLS for fact tables
ALTER TABLE public.fact_payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_tax_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_fee_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_settlement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_adjustment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_tax_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_claim_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY fact_payout_batches_policy ON public.fact_payout_batches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY fact_order_items_policy ON public.fact_order_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY fact_tax_invoices_policy ON public.fact_tax_invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY fact_fee_lines_policy ON public.fact_fee_lines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY fact_settlement_events_policy ON public.fact_settlement_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY fact_adjustment_events_policy ON public.fact_adjustment_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY fact_tax_deductions_policy ON public.fact_tax_deductions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY fact_claim_events_policy ON public.fact_claim_events FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 4. CONTRACT SEED DATA
-- ============================================================================

INSERT INTO public.report_contracts (
    id, platform, report_family, report_name, report_name_aliases, sheet_name_aliases, 
    confidence_level, file_type, expected_sheets, expected_header_row, data_start_row, required_columns, version
) VALUES
('MEESHO_GST_TCS_SALES_CURRENT', 'meesho', 'gst_sales', 'Meesho GST TCS Sales Report', 
 '["tcs_sales", "sales report", "gst sales report", "sales register", "forward sales", "outward supply", "sales report format"]',
 '["sales report format"]', 'screenshot_observed', 'xlsx', '["sales report format"]', 1, 2,
 '["sub_order_num", "order_date", "total_taxable_sale_value", "total_invoice_value"]', '1.0.0'),

('MEESHO_GST_TCS_SALES_RETURN_CURRENT', 'meesho', 'gst_returns', 'Meesho GST TCS Return Report', 
 '["tcs_sales_return", "sales return", "gst sales return", "credit note report", "return sales", "sales return report"]',
 '["sales report format"]', 'screenshot_observed', 'xlsx', '["sales report format"]', 1, 2,
 '["sub_order_num", "order_date", "total_taxable_sale_value", "total_invoice_value"]', '1.0.0'),

('MEESHO_PAYMENT_PREVIOUS_PAYMENT_CURRENT', 'meesho', 'payout', 'Meesho Previous Payments Ledger', 
 '["SP_ORDER_ADS_REFERRAL_PAYMENT_FILE_PREVIOUS_PAYMENT", "previous payment", "order payments", "payment file", "payout report", "settlement report"]',
 '["Order Payments", "Disclaimer", "Ads Cost", "Referral Payments", "Compensation and Recovery"]', 'screenshot_observed', 'xlsx', 
 '["Order Payments"]', 2, 4, '["Sub Order No", "Payment Date", "Final Settlement Amount"]', '1.0.0')
ON CONFLICT (id) DO UPDATE SET
    report_name_aliases = EXCLUDED.report_name_aliases,
    sheet_name_aliases = EXCLUDED.sheet_name_aliases,
    expected_sheets = EXCLUDED.expected_sheets,
    expected_header_row = EXCLUDED.expected_header_row,
    data_start_row = EXCLUDED.data_start_row,
    required_columns = EXCLUDED.required_columns;

-- ============================================================================
-- 5. RECONCILIATION STORED PROCEDURE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_meesho_settlement(
    p_user_id UUID,
    p_period_from DATE,
    p_period_to DATE
)
RETURNS TABLE (
    total_orders            BIGINT,
    total_flagged           BIGINT,
    underpaid_count         BIGINT,
    overpaid_count          BIGINT,
    net_profit              NUMERIC
) AS $$
DECLARE
    v_total_orders   BIGINT;
    v_total_flagged  BIGINT;
    v_underpaid      BIGINT;
    v_overpaid       BIGINT;
    v_profit         NUMERIC;
BEGIN
    -- Temporary clear dispute tickets that are OPEN in this user's period
    -- To ensure cross-period audit rules run cleanly
    DELETE FROM public.dispute_tickets 
    WHERE user_id = p_user_id 
      AND order_id IN (
          SELECT sub_order_num FROM public.fact_order_items 
          WHERE user_id = p_user_id AND order_date BETWEEN p_period_from AND p_period_to
      )
      AND status = 'OPEN';

    -- Insert/Update reconciled_ledger based on canonical fact tables
    -- Reconcile orders in the timeframe based on payment_date or order_date
    -- Let's run a heavy aggregation and merge into reconciled_ledger
    -- First, aggregate expected values from Sales Invoices and Deductions
    
    INSERT INTO public.reconciled_ledger (
        user_id, order_id, sku, product_description,
        quantity_sold, quantity_returned,
        gross_sales, gross_tax, tcs_amount, refund_amount,
        settled_amount, marketplace_fee, tds_amount, net_payout,
        net_sales, cost_price, net_profit, shipping_state,
        variance, risk_flag, month_year, channel, metadata
    )
    SELECT
        p_user_id,
        sub.order_id,
        MAX(sub.sku) AS sku,
        MAX(sub.product_name) AS product_description,
        COALESCE(SUM(sub.qty_sold), 0)::int AS quantity_sold,
        COALESCE(SUM(sub.qty_returned), 0)::int AS quantity_returned,
        COALESCE(SUM(sub.gross_sale_val), 0) AS gross_sales,
        COALESCE(SUM(sub.gross_tax_val), 0) AS gross_tax,
        COALESCE(SUM(sub.tcs_val), 0) AS tcs_amount,
        COALESCE(SUM(sub.refund_val), 0) AS refund_amount,
        COALESCE(SUM(sub.settled_val), 0) AS settled_amount,
        COALESCE(SUM(sub.fee_val), 0) AS marketplace_fee,
        COALESCE(SUM(sub.tds_val), 0) AS tds_amount,
        COALESCE(SUM(sub.net_payout_val), 0) AS net_payout,
        (COALESCE(SUM(sub.gross_sale_val), 0) - COALESCE(SUM(sub.refund_val), 0)) AS net_sales,
        COALESCE(SUM(sub.cost_val), 0) AS cost_price,
        (COALESCE(SUM(sub.gross_sale_val), 0) - COALESCE(SUM(sub.refund_val), 0) - COALESCE(SUM(sub.cost_val), 0) - COALESCE(SUM(sub.fee_val), 0)) AS net_profit,
        COALESCE(MAX(sub.state_val), 'UNKNOWN') AS shipping_state,
        ((COALESCE(SUM(sub.gross_sale_val), 0) - COALESCE(SUM(sub.refund_val), 0)) - COALESCE(SUM(sub.settled_val), 0)) AS variance,
        CASE
            WHEN COALESCE(SUM(sub.qty_sold), 0) = 0 AND COALESCE(SUM(sub.qty_returned), 0) > 0 THEN 'UNEXPECTED_RETURN'
            WHEN COALESCE(SUM(sub.gross_sale_val), 0) = 0 AND COALESCE(SUM(sub.settled_val), 0) > 0 THEN 'MISSING_SALE'
            WHEN COALESCE(SUM(sub.settled_val), 0) = 0 AND COALESCE(SUM(sub.qty_returned), 0) = 0 THEN 'MISSING_PAYMENT'
            WHEN ((COALESCE(SUM(sub.gross_sale_val), 0) - COALESCE(SUM(sub.refund_val), 0)) - COALESCE(SUM(sub.settled_val), 0)) > 1.00 THEN 'UNDER_REPORTED'
            WHEN (COALESCE(SUM(sub.settled_val), 0) - (COALESCE(SUM(sub.gross_sale_val), 0) - COALESCE(SUM(sub.refund_val), 0))) > 1.00 THEN 'OVER_REPORTED'
            ELSE 'OK'
        END AS risk_flag,
        TO_CHAR(COALESCE(MAX(sub.o_date), p_period_from), 'YYYY-MM') AS month_year,
        'meesho' AS channel,
        '{}'::jsonb AS metadata
    FROM (
        -- Sales order items & catalog COGS
        SELECT 
            o.sub_order_num AS order_id, 
            o.sku, 
            o.product_name,
            o.quantity AS qty_sold, 
            0 AS qty_returned,
            0.00 AS gross_sale_val, 
            0.00 AS gross_tax_val,
            0.00 AS tcs_val, 
            0.00 AS refund_val,
            0.00 AS settled_val, 
            0.00 AS fee_val, 
            0.00 AS tds_val, 
            0.00 AS net_payout_val,
            (COALESCE(c.cost_price, 0.00) * o.quantity) AS cost_val,
            o.order_date AS o_date,
            'UNKNOWN' AS state_val
        FROM public.fact_order_items o
        LEFT JOIN public.product_catalog c ON c.user_id = p_user_id AND c.sku = o.sku
        WHERE o.user_id = p_user_id AND o.order_date BETWEEN p_period_from AND p_period_to
        
        UNION ALL
        
        -- Forward Invoices / Tax value
        SELECT 
            i.sub_order_num AS order_id, 
            NULL AS sku, 
            NULL AS product_name,
            0 AS qty_sold, 
            0 AS qty_returned,
            i.invoice_value AS gross_sale_val, 
            (i.cgst_amount + i.sgst_amount + i.igst_amount) AS gross_tax_val,
            0.00 AS tcs_val, 
            0.00 AS refund_val,
            0.00 AS settled_val, 
            0.00 AS fee_val, 
            0.00 AS tds_val, 
            0.00 AS net_payout_val,
            0.00 AS cost_val,
            i.invoice_date AS o_date,
            i.shipping_state AS state_val
        FROM public.fact_tax_invoices i
        WHERE i.user_id = p_user_id AND i.invoice_date BETWEEN p_period_from AND p_period_to AND i.type = 'INVOICE'
        
        UNION ALL
        
        -- Returns Refunds / Credit Notes
        SELECT 
            i.sub_order_num AS order_id, 
            NULL AS sku, 
            NULL AS product_name,
            0 AS qty_sold, 
            1 AS qty_returned,
            0.00 AS gross_sale_val, 
            0.00 AS gross_tax_val,
            0.00 AS tcs_val, 
            i.invoice_value AS refund_val,
            0.00 AS settled_val, 
            0.00 AS fee_val, 
            0.00 AS tds_val, 
            0.00 AS net_payout_val,
            0.00 AS cost_val,
            i.invoice_date AS o_date,
            i.shipping_state AS state_val
        FROM public.fact_tax_invoices i
        WHERE i.user_id = p_user_id AND i.invoice_date BETWEEN p_period_from AND p_period_to AND i.type = 'CREDIT_NOTE'
        
        UNION ALL
        
        -- Payout Settlements (credits & actual cash)
        SELECT 
            se.sub_order_num AS order_id, 
            NULL AS sku, 
            NULL AS product_name,
            0 AS qty_sold, 
            0 AS qty_returned,
            0.00 AS gross_sale_val, 
            0.00 AS gross_tax_val,
            0.00 AS tcs_val, 
            0.00 AS refund_val,
            se.amount AS settled_val, 
            0.00 AS fee_val, 
            0.00 AS tds_val, 
            se.amount AS net_payout_val,
            0.00 AS cost_val,
            se.settlement_date AS o_date,
            'UNKNOWN' AS state_val
        FROM public.fact_settlement_events se
        WHERE se.user_id = p_user_id AND se.settlement_date BETWEEN p_period_from AND p_period_to
        
        UNION ALL
        
        -- Fees deductions
        SELECT 
            f.sub_order_num AS order_id, 
            NULL AS sku, 
            NULL AS product_name,
            0 AS qty_sold, 
            0 AS qty_returned,
            0.00 AS gross_sale_val, 
            0.00 AS gross_tax_val,
            0.00 AS tcs_val, 
            0.00 AS refund_val,
            0.00 AS settled_val, 
            f.total_amount AS fee_val, 
            0.00 AS tds_val, 
            -f.total_amount AS net_payout_val,
            0.00 AS cost_val,
            f.billing_date AS o_date,
            'UNKNOWN' AS state_val
        FROM public.fact_fee_lines f
        WHERE f.user_id = p_user_id AND f.billing_date BETWEEN p_period_from AND p_period_to
        
        UNION ALL
        
        -- TCS & TDS deductions
        SELECT 
            td.sub_order_num AS order_id, 
            NULL AS sku, 
            NULL AS product_name,
            0 AS qty_sold, 
            0 AS qty_returned,
            0.00 AS gross_sale_val, 
            0.00 AS gross_tax_val,
            CASE WHEN td.deduction_type = 'TCS' THEN td.amount ELSE 0.00 END AS tcs_val, 
            0.00 AS refund_val,
            0.00 AS settled_val, 
            0.00 AS fee_val, 
            CASE WHEN td.deduction_type = 'TDS' THEN td.amount ELSE 0.00 END AS tds_val, 
            -td.amount AS net_payout_val,
            0.00 AS cost_val,
            td.date AS o_date,
            'UNKNOWN' AS state_val
        FROM public.fact_tax_deductions td
        WHERE td.user_id = p_user_id AND td.date BETWEEN p_period_from AND p_period_to
    ) sub
    GROUP BY sub.order_id
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
        reconciled_at       = NOW();

    -- Generate new dispute tickets for Meesho overcharges using official rules
    -- Dispute Rule 1: WEIGHT_SLAB_OVERCHARGE for Meesho
    INSERT INTO public.dispute_tickets (user_id, order_id, channel, dispute_type, amount, description)
    SELECT 
        l.user_id,
        l.order_id,
        l.channel,
        'WEIGHT_SLAB_OVERCHARGE',
        (fl.total_amount - (rc.base_rate + GREATEST(0, CEIL(COALESCE(c.weight_g, 200)::float / rc.weight_slab_g::float) - 1) * rc.slab_cost)) AS amount,
        'Meesho shipping charge of ₹' || fl.total_amount || ' exceeds expected rate card base (₹' || 
        (rc.base_rate + GREATEST(0, CEIL(COALESCE(c.weight_g, 200)::float / rc.weight_slab_g::float) - 1) * rc.slab_cost) || 
        ') for SKU weight class ' || COALESCE(c.weight_g, 200) || 'g.'
    FROM public.reconciled_ledger l
    JOIN public.fact_fee_lines fl ON fl.user_id = l.user_id AND fl.sub_order_num = l.order_id AND fl.fee_type = 'SHIPPING_CHARGE'
    JOIN public.product_catalog c ON c.user_id = l.user_id AND c.sku = l.sku
    JOIN public.platform_rate_cards rc ON rc.channel = 'meesho' 
      AND rc.weight_slab_g = 500
      AND rc.zone = CASE 
          WHEN l.shipping_state = 'Maharashtra' THEN 'LOCAL'
          WHEN l.shipping_state IN ('Gujarat', 'Goa', 'Madhya Pradesh', 'Karnataka', 'Telangana') THEN 'REGIONAL'
          ELSE 'NATIONAL'
      END
    WHERE l.user_id = p_user_id 
      AND l.month_year = TO_CHAR(p_period_from, 'YYYY-MM')
      AND fl.total_amount > (rc.base_rate + GREATEST(0, CEIL(COALESCE(c.weight_g, 200)::float / rc.weight_slab_g::float) - 1) * rc.slab_cost) + 15.00
    ON CONFLICT (user_id, order_id, dispute_type) DO NOTHING;

    -- Dispute Rule 2: MISSING_RETURN_INVENTORY
    INSERT INTO public.dispute_tickets (user_id, order_id, channel, dispute_type, amount, description)
    SELECT 
        l.user_id,
        l.order_id,
        l.channel,
        'MISSING_RETURN_INVENTORY',
        l.refund_amount AS amount,
        'Meesho return refunded but SKU ' || COALESCE(l.sku, '') || ' was never physically scanned back in warehouse logs.'
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id 
      AND l.month_year = TO_CHAR(p_period_from, 'YYYY-MM')
      AND l.refund_amount > 0
      AND NOT EXISTS (
          SELECT 1 FROM public.raw_warehouse_logs w 
          WHERE w.user_id = l.user_id 
            AND w.order_id = l.order_id
            AND (w.sku = l.sku OR l.sku IS NULL)
      )
    ON CONFLICT (user_id, order_id, dispute_type) DO NOTHING;

    -- Metrics retrieval
    SELECT COUNT(*) INTO v_total_orders
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = TO_CHAR(p_period_from, 'YYYY-MM');

    SELECT COUNT(*) INTO v_total_flagged
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = TO_CHAR(p_period_from, 'YYYY-MM') AND l.risk_flag != 'OK';

    SELECT COUNT(*) INTO v_underpaid
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = TO_CHAR(p_period_from, 'YYYY-MM') AND l.risk_flag = 'UNDER_REPORTED';

    SELECT COUNT(*) INTO v_overpaid
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = TO_CHAR(p_period_from, 'YYYY-MM') AND l.risk_flag = 'OVER_REPORTED';

    SELECT COALESCE(SUM(l.net_profit), 0) INTO v_profit
    FROM public.reconciled_ledger l
    WHERE l.user_id = p_user_id AND l.month_year = TO_CHAR(p_period_from, 'YYYY-MM');

    RETURN QUERY SELECT v_total_orders, v_total_flagged, v_underpaid, v_overpaid, v_profit;
END;
$$ LANGUAGE plpgsql;
