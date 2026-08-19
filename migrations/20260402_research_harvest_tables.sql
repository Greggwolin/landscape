-- ============================================================================
-- Migration: Research Harvest Tables
-- Date: 2026-04-02
-- Description: Create tables for ULI/CREFC research publication harvesting
-- ============================================================================

-- UP
-- ============================================================================

-- 1. Publication metadata from any research source
CREATE TABLE IF NOT EXISTS landscape.tbl_research_publication (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,                        -- 'uli', 'crefc', future sources
    source_id VARCHAR(255),                             -- Source-specific unique ID (URL slug, DOI, etc.)
    publication_type VARCHAR(100),                      -- 'emerging_trends', 'case_study', 'research_report', 'advisory_panel', 'sentiment_index', 'policy_briefing', 'article_metadata'
    title TEXT NOT NULL,
    subtitle TEXT,
    authors TEXT[],                                     -- Array of author names
    publisher VARCHAR(255),                             -- 'Urban Land Institute', 'CRE Finance Council', etc.
    published_date DATE,
    categories TEXT[],                                  -- ['Capital Markets', 'Multifamily', 'Climate Risk']
    tags TEXT[],                                        -- Finer-grained tags from source
    document_type VARCHAR(100),                         -- 'pdf', 'html', 'data'
    summary TEXT,                                       -- Teaser or executive summary
    source_url TEXT,                                    -- Original URL on source site
    pdf_url TEXT,                                       -- Direct PDF download URL if available
    local_pdf_path TEXT,                                -- Path to downloaded PDF on disk
    content_hash VARCHAR(64),                           -- SHA-256 of PDF/content for change detection
    is_gated BOOLEAN DEFAULT FALSE,                     -- Whether full content requires login
    full_text_extracted BOOLEAN DEFAULT FALSE,           -- Whether we've extracted the full text
    extraction_status VARCHAR(50) DEFAULT 'pending',     -- 'pending', 'downloaded', 'extracted', 'failed'
    extraction_error TEXT,                              -- Error message if extraction failed
    metadata JSONB DEFAULT '{}',                        -- Flexible field for source-specific metadata
    harvested_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_research_pub_source UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_research_pub_source ON landscape.tbl_research_publication(source);
CREATE INDEX IF NOT EXISTS idx_research_pub_type ON landscape.tbl_research_publication(publication_type);
CREATE INDEX IF NOT EXISTS idx_research_pub_date ON landscape.tbl_research_publication(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_research_pub_categories ON landscape.tbl_research_publication USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_research_pub_tags ON landscape.tbl_research_publication USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_research_pub_status ON landscape.tbl_research_publication(extraction_status);

-- 2. Extracted financial data points from publications
CREATE TABLE IF NOT EXISTS landscape.tbl_research_financial_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id UUID NOT NULL REFERENCES landscape.tbl_research_publication(id) ON DELETE CASCADE,
    data_category VARCHAR(100) NOT NULL,                -- 'development_cost', 'rent', 'vacancy', 'cap_rate', 'sale_price', 'noi', 'construction_cost', 'absorption', 'sentiment_index'
    metric_name VARCHAR(255) NOT NULL,                  -- 'total_development_cost', 'cost_per_sf', 'avg_rent_1br', 'exit_cap_rate', 'bog_index_value'
    metric_value NUMERIC,                               -- The number
    metric_unit VARCHAR(50),                            -- 'usd', 'usd_psf', 'percent', 'index', 'units', 'sf'
    metric_text TEXT,                                   -- For non-numeric values or qualitative data
    property_type VARCHAR(100),                         -- 'multifamily', 'office', 'retail', 'industrial', 'mixed_use', 'land', 'mpc'
    geography VARCHAR(255),                             -- Market, city, or region
    reference_date DATE,                                -- Date the data point refers to
    reference_period VARCHAR(50),                       -- '4Q25', '2025', 'stabilized', 'at_completion'
    context TEXT,                                       -- Surrounding text or notes for context
    confidence_score NUMERIC(3,2),                      -- 0.00-1.00 extraction confidence
    extraction_method VARCHAR(50),                      -- 'table_parse', 'llm_extract', 'regex', 'manual'
    page_number INTEGER,                                -- Page in source PDF
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_research_fin_data UNIQUE (publication_id, data_category, metric_name, property_type, geography, reference_period)
);

CREATE INDEX IF NOT EXISTS idx_research_fin_pub ON landscape.tbl_research_financial_data(publication_id);
CREATE INDEX IF NOT EXISTS idx_research_fin_category ON landscape.tbl_research_financial_data(data_category);
CREATE INDEX IF NOT EXISTS idx_research_fin_proptype ON landscape.tbl_research_financial_data(property_type);
CREATE INDEX IF NOT EXISTS idx_research_fin_geo ON landscape.tbl_research_financial_data(geography);
CREATE INDEX IF NOT EXISTS idx_research_fin_date ON landscape.tbl_research_financial_data(reference_date DESC);

-- 3. Harvest run tracking
CREATE TABLE IF NOT EXISTS landscape.tbl_research_harvest_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,                        -- 'uli', 'crefc'
    agent_name VARCHAR(100) NOT NULL,                   -- 'ULI', 'CREFC'
    run_started_at TIMESTAMPTZ NOT NULL,
    run_completed_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'running',               -- 'running', 'completed', 'failed', 'partial'
    publications_discovered INTEGER DEFAULT 0,
    publications_new INTEGER DEFAULT 0,
    publications_updated INTEGER DEFAULT 0,
    pdfs_downloaded INTEGER DEFAULT 0,
    extractions_completed INTEGER DEFAULT 0,
    errors TEXT[],                                       -- Array of error messages
    metadata JSONB DEFAULT '{}',                        -- Run-specific stats
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvest_log_source ON landscape.tbl_research_harvest_log(source, run_started_at DESC);


-- DOWN (rollback)
-- ============================================================================
-- DROP TABLE IF EXISTS landscape.tbl_research_financial_data;
-- DROP TABLE IF EXISTS landscape.tbl_research_harvest_log;
-- DROP TABLE IF EXISTS landscape.tbl_research_publication;
