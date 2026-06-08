-- ============================================================================
-- India 26AS and Income-Tax Reconciliation Tool — PostgreSQL Migration
-- Description: Core schema for taxpayers, consents, import batches, source
--              documents, source records, tax events, match groups, match links,
--              exceptions, remediation tasks, and audit logs.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Taxpayer Profile table
CREATE TABLE IF NOT EXISTS public.taxpayers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pan_masked      VARCHAR(10) NOT NULL,
    legal_name      TEXT NOT NULL,
    dob_or_incorp   DATE,
    taxpayer_type   VARCHAR(50) DEFAULT 'Individual', -- 'Individual', 'HUF', 'Company', 'Firm'
    locale          VARCHAR(10) DEFAULT 'en',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_pan UNIQUE (tenant_id, pan_masked)
);

-- 2. Consents ledger
CREATE TABLE IF NOT EXISTS public.consents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taxpayer_id     UUID NOT NULL REFERENCES public.taxpayers(id) ON DELETE CASCADE,
    purpose         TEXT NOT NULL,
    scope_json      JSONB NOT NULL,
    source_type     VARCHAR(50) NOT NULL, -- 'traces', 'ais', 'bank'
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Import Batches
CREATE TABLE IF NOT EXISTS public.import_batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taxpayer_id     UUID NOT NULL REFERENCES public.taxpayers(id) ON DELETE CASCADE,
    source_type     VARCHAR(50) NOT NULL, -- 'ais_json', 'form26as_txt', 'form16_pdf', 'bank_csv', 'manual_claims_csv'
    source_format   VARCHAR(20) NOT NULL, -- 'json', 'csv', 'txt', 'pdf'
    filename        TEXT NOT NULL,
    checksum        VARCHAR(64),
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) DEFAULT 'STAGED' CHECK (status IN ('STAGED', 'PROCESSED', 'FAILED'))
);

-- 4. Source Documents
CREATE TABLE IF NOT EXISTS public.source_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
    doc_type        VARCHAR(50) NOT NULL, -- 'AIS', '26AS', 'Form 16', 'Bank Statement', 'Manual Claims'
    file_uri        TEXT,
    parser_version  VARCHAR(10) DEFAULT '1.0.0',
    metadata_json   JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Source Records (raw lines/records in document)
CREATE TABLE IF NOT EXISTS public.source_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id  UUID NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
    source_row_id       VARCHAR(100) NOT NULL,
    category            VARCHAR(100) NOT NULL, -- e.g., 'TDS/TCS Information', 'Salary', 'SFT'
    subcategory         VARCHAR(100),
    txn_date            DATE NOT NULL,
    reported_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount          NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    counterparty_name   TEXT,
    counterparty_id     VARCHAR(50), -- TAN/PAN of deductor/employer
    raw_json            JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tax Events (normalized canonical records)
CREATE TABLE IF NOT EXISTS public.tax_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taxpayer_id         UUID NOT NULL REFERENCES public.taxpayers(id) ON DELETE CASCADE,
    source_record_id    UUID REFERENCES public.source_records(id) ON DELETE SET NULL,
    tax_year            VARCHAR(7) NOT NULL, -- '2025-26'
    event_type          VARCHAR(50) NOT NULL, -- e.g. 'salary_income', 'interest_income', 'tax_deducted'
    income_head         VARCHAR(50), -- e.g. 'salary', 'other_sources', 'business_profession'
    event_date          DATE NOT NULL,
    amount_gross        NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    amount_tax          NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    currency            VARCHAR(3) DEFAULT 'INR',
    canonical_key       TEXT NOT NULL,
    source_confidence   VARCHAR(20) DEFAULT 'HIGH' CHECK (source_confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    source_type         VARCHAR(50) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Match Groups
CREATE TABLE IF NOT EXISTS public.match_groups (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taxpayer_id         UUID NOT NULL REFERENCES public.taxpayers(id) ON DELETE CASCADE,
    tax_year            VARCHAR(7) NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'unmatched' CHECK (status IN ('matched', 'partial', 'unmatched', 'review_required')),
    explanation_code    VARCHAR(50), -- e.g., 'exact_match', 'timing_lag_suspected'
    explanation_text    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Match Links
CREATE TABLE IF NOT EXISTS public.match_links (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_group_id      UUID NOT NULL REFERENCES public.match_groups(id) ON DELETE CASCADE,
    left_tax_event_id   UUID NOT NULL REFERENCES public.tax_events(id) ON DELETE CASCADE,
    right_tax_event_id  UUID NOT NULL REFERENCES public.tax_events(id) ON DELETE CASCADE,
    score               NUMERIC(5, 2) NOT NULL,
    match_rule          VARCHAR(50) NOT NULL, -- 'exact_key', 'tolerant_similarity', etc.
    reviewer_status     VARCHAR(30) DEFAULT 'unverified' CHECK (reviewer_status IN ('verified', 'override', 'unverified')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Exception Items
CREATE TABLE IF NOT EXISTS public.exception_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taxpayer_id         UUID NOT NULL REFERENCES public.taxpayers(id) ON DELETE CASCADE,
    match_group_id      UUID REFERENCES public.match_groups(id) ON DELETE SET NULL,
    tax_year            VARCHAR(7) NOT NULL,
    exception_type      VARCHAR(50) NOT NULL,
    severity            VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
    explanation_code    VARCHAR(50) NOT NULL,
    explanation_text    TEXT NOT NULL,
    recommended_action  TEXT,
    status              VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'ignored')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Remediation Tasks
CREATE TABLE IF NOT EXISTS public.remediation_tasks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_item_id   UUID NOT NULL REFERENCES public.exception_items(id) ON DELETE CASCADE,
    assignee_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type         VARCHAR(50) NOT NULL,
    due_date            DATE,
    resolution_note     TEXT,
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'cancelled')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Audit Events
CREATE TABLE IF NOT EXISTS public.it_audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL,
    event_ts        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata_json   JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.taxpayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exception_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remediation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_audit_events ENABLE ROW LEVEL SECURITY;

-- Create Policies mapping tenant_id or taxpayer context to auth.uid()
DROP POLICY IF EXISTS taxpayers_policy ON public.taxpayers;
CREATE POLICY taxpayers_policy ON public.taxpayers FOR ALL USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS consents_policy ON public.consents;
CREATE POLICY consents_policy ON public.consents FOR ALL USING (
    taxpayer_id IN (SELECT id FROM public.taxpayers WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS import_batches_policy ON public.import_batches;
CREATE POLICY import_batches_policy ON public.import_batches FOR ALL USING (
    taxpayer_id IN (SELECT id FROM public.taxpayers WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS source_documents_policy ON public.source_documents;
CREATE POLICY source_documents_policy ON public.source_documents FOR ALL USING (
    import_batch_id IN (SELECT ib.id FROM public.import_batches ib JOIN public.taxpayers t ON ib.taxpayer_id = t.id WHERE t.tenant_id = auth.uid())
);

DROP POLICY IF EXISTS source_records_policy ON public.source_records;
CREATE POLICY source_records_policy ON public.source_records FOR ALL USING (
    source_document_id IN (SELECT sd.id FROM public.source_documents sd JOIN public.import_batches ib ON sd.import_batch_id = ib.id JOIN public.taxpayers t ON ib.taxpayer_id = t.id WHERE t.tenant_id = auth.uid())
);

DROP POLICY IF EXISTS tax_events_policy ON public.tax_events;
CREATE POLICY tax_events_policy ON public.tax_events FOR ALL USING (
    taxpayer_id IN (SELECT id FROM public.taxpayers WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS match_groups_policy ON public.match_groups;
CREATE POLICY match_groups_policy ON public.match_groups FOR ALL USING (
    taxpayer_id IN (SELECT id FROM public.taxpayers WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS match_links_policy ON public.match_links;
CREATE POLICY match_links_policy ON public.match_links FOR ALL USING (
    match_group_id IN (SELECT mg.id FROM public.match_groups mg JOIN public.taxpayers t ON mg.taxpayer_id = t.id WHERE t.tenant_id = auth.uid())
);

DROP POLICY IF EXISTS exception_items_policy ON public.exception_items;
CREATE POLICY exception_items_policy ON public.exception_items FOR ALL USING (
    taxpayer_id IN (SELECT id FROM public.taxpayers WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS remediation_tasks_policy ON public.remediation_tasks;
CREATE POLICY remediation_tasks_policy ON public.remediation_tasks FOR ALL USING (
    exception_item_id IN (SELECT ei.id FROM public.exception_items ei JOIN public.taxpayers t ON ei.taxpayer_id = t.id WHERE t.tenant_id = auth.uid())
);

DROP POLICY IF EXISTS it_audit_events_policy ON public.it_audit_events;
CREATE POLICY it_audit_events_policy ON public.it_audit_events FOR ALL USING (auth.uid() = tenant_id);
