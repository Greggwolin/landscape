-- =============================================================================
-- 037: Research harvest tables for market intelligence agents
-- Creates tbl_research_publication, tbl_research_financial_data,
-- and tbl_research_harvest_log in the landscape schema.
-- =============================================================================

-- ── UP ──────────────────────────────────────────────────────────────────────

-- Publications catalog
CREATE TABLE IF NOT EXISTS landscape.tbl_research_publication (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source          TEXT NOT NULL,           -- e.g. 'ULI', 'CREFC', 'MBA', 'KBRA'
    source_id       TEXT NOT NULL,           -- source-specific unique ID
    publication_type TEXT,                   -- 'report', 'press_release', 'blog_post', etc.
    title           TEXT NOT NULL,
    subtitle        TEXT,
    authors         TEXT[],
    publisher       TEXT,
    published_date  DATE,
    categories      TEXT[],
    tags            TEXT[],
    document_type   TEXT,                    -- 'pdf', 'html', 'dataset'
    summary         TEXT,
    source_url      TEXT,
    pdf_url         TEXT,
    local_pdf_path  TEXT,
    content_hash    TEXT,                    -- SHA-256 of downloaded content
    is_gated        BOOLEAN DEFAULT false,
    extraction_status TEXT DEFAULT 'pending', -- pending, extracted, failed, skipped
    extraction_error TEXT,
    metadata        JSONB DEFAULT '{}',
    harvested_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, source_id)
);

-- Extracted financial data points
CREATE TABLE IF NOT EXISTS landscape.tbl_research_financial_data (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id  UUID NOT NULL REFERENCES landscape.tbl_research_publication(id) ON DELETE CASCADE,
    data_category   TEXT NOT NULL,           -- 'origination', 'delinquency', 'vacancy', etc.
    metric_name     TEXT NOT NULL,           -- 'total_originations', 'delinquency_rate', etc.
    metric_value    NUMERIC,
    metric_unit     TEXT,                    -- 'usd_billion', 'percent', 'bps', etc.
    metric_text     TEXT,                    -- raw text when numeric parsing fails
    property_type   TEXT DEFAULT 'all',      -- 'multifamily', 'office', 'retail', 'all'
    geography       TEXT DEFAULT 'national', -- 'national', 'Phoenix MSA', etc.
    reference_date  DATE,
    reference_period TEXT DEFAULT 'unknown', -- 'Q1 2026', '2025', 'March 2026'
    context         TEXT,                    -- surrounding text for provenance
    confidence_score NUMERIC,               -- 0-1 extraction confidence
    extraction_method TEXT,                  -- 'regex', 'pdfplumber', 'llm'
    page_number     INT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (publication_id, data_category, metric_name, property_type, geography, reference_period)
);

-- Harvest run log
CREATE TABLE IF NOT EXISTS landscape.tbl_research_harvest_log (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source                  TEXT NOT NULL,
    agent_name              TEXT NOT NULL,
    run_started_at          TIMESTAMPTZ DEFAULT NOW(),
    run_completed_at        TIMESTAMPTZ,
    status                  TEXT DEFAULT 'running',  -- running, completed, partial, failed
    publications_discovered INT DEFAULT 0,
    publications_new        INT DEFAULT 0,
    publications_updated    INT DEFAULT 0,
    pdfs_downloaded         INT DEFAULT 0,
    extractions_completed   INT DEFAULT 0,
    errors                  TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_research_pub_source ON landscape.tbl_research_publication(source);
CREATE INDEX IF NOT EXISTS idx_research_pub_published ON landscape.tbl_research_publication(published_date);
CREATE INDEX IF NOT EXISTS idx_research_pub_status ON landscape.tbl_research_publication(extraction_status);
CREATE INDEX IF NOT EXISTS idx_research_fin_pub ON landscape.tbl_research_financial_data(publication_id);
CREATE INDEX IF NOT EXISTS idx_research_fin_category ON landscape.tbl_research_financial_data(data_category);
CREATE INDEX IF NOT EXISTS idx_research_harvest_source ON landscape.tbl_research_harvest_log(source);

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS landscape.tbl_research_financial_data CASCADE;
-- DROP TABLE IF EXISTS landscape.tbl_research_publication CASCADE;
-- DROP TABLE IF EXISTS landscape.tbl_research_harvest_log CASCADE;
