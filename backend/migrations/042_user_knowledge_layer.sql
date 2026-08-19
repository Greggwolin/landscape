-- Migration: User Knowledge Layer
-- Purpose: Enable Landscaper to learn from user's past assumptions, documents, and comparables
-- Date: 2026-01-12

-- =============================================================================
-- 1. ASSUMPTION HISTORY TABLE
-- Tracks all assumptions users have made across projects, enabling pattern learning
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_assumption_history (
    id BIGSERIAL PRIMARY KEY,

    -- Scope
    organization_id BIGINT,  -- NULL = personal assumption
    user_id BIGINT NOT NULL,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,

    -- Property context
    property_type VARCHAR(50) NOT NULL,  -- LAND, MF, OFFICE, RETAIL, INDUSTRIAL, HOTEL
    property_subtype VARCHAR(100),        -- e.g., garden-style, high-rise, power-center
    market VARCHAR(100),                  -- MSA or market name
    submarket VARCHAR(100),

    -- Assumption content
    assumption_category VARCHAR(100) NOT NULL,  -- income, expense, cost, cap_rate, vacancy, etc.
    assumption_key VARCHAR(200) NOT NULL,       -- e.g., management_fee_pct, capex_per_unit
    assumption_value NUMERIC(20, 6),            -- Numeric value (if applicable)
    assumption_text TEXT,                       -- Text value (if applicable, e.g., notes)
    assumption_unit VARCHAR(50),                -- %, $/unit, $/sf, etc.

    -- Context
    context_json JSONB DEFAULT '{}'::jsonb,     -- Additional context (property size, vintage, etc.)
    source_type VARCHAR(50) NOT NULL,           -- user_input, ai_suggestion, document_extract
    source_reference TEXT,                      -- Document name/ID if extracted

    -- Learning signals
    confidence_score NUMERIC(3, 2) DEFAULT 1.00,
    was_modified BOOLEAN DEFAULT FALSE,         -- Did user modify AI suggestion?
    original_value NUMERIC(20, 6),              -- Original AI suggestion (if modified)

    -- Embedding for semantic search
    embedding vector(1536),                      -- ada-002 embedding of assumption context

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_assumption_value CHECK (
        assumption_value IS NOT NULL OR assumption_text IS NOT NULL
    )
);

-- Indexes for assumption history
CREATE INDEX IF NOT EXISTS idx_assumption_history_user
ON landscape.tbl_assumption_history(user_id);

CREATE INDEX IF NOT EXISTS idx_assumption_history_org
ON landscape.tbl_assumption_history(organization_id)
WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assumption_history_project
ON landscape.tbl_assumption_history(project_id)
WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assumption_history_property_type
ON landscape.tbl_assumption_history(property_type);

CREATE INDEX IF NOT EXISTS idx_assumption_history_category_key
ON landscape.tbl_assumption_history(assumption_category, assumption_key);

CREATE INDEX IF NOT EXISTS idx_assumption_history_market
ON landscape.tbl_assumption_history(market, submarket)
WHERE market IS NOT NULL;

-- Vector similarity search index (HNSW for faster queries)
CREATE INDEX IF NOT EXISTS idx_assumption_history_embedding
ON landscape.tbl_assumption_history
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);


-- =============================================================================
-- 2. USER DOCUMENT CHUNKS TABLE
-- Stores chunked content from user-uploaded documents with embeddings
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_user_document_chunks (
    id BIGSERIAL PRIMARY KEY,

    -- Document reference
    document_id BIGINT NOT NULL,  -- References core_doc.doc_id
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,
    organization_id BIGINT,
    user_id BIGINT NOT NULL,

    -- Document metadata (denormalized for fast retrieval)
    document_name VARCHAR(500) NOT NULL,
    document_type VARCHAR(100),           -- rent_roll, t12, om, appraisal, lease, etc.

    -- Chunk content
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',  -- text, table, list

    -- Location in document
    page_number INTEGER,
    section_path VARCHAR(500),            -- e.g., "Income Analysis > Rent Roll"

    -- Extracted entities (for filtering)
    property_type VARCHAR(50),
    entities_json JSONB DEFAULT '{}'::jsonb,  -- {property_name, addresses, dates, amounts}

    -- Embedding for semantic search
    embedding vector(1536),
    token_count INTEGER,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint on document + chunk
    CONSTRAINT uk_user_doc_chunk UNIQUE (document_id, chunk_index)
);

-- Indexes for user document chunks
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_doc
ON landscape.tbl_user_document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_project
ON landscape.tbl_user_document_chunks(project_id)
WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_org
ON landscape.tbl_user_document_chunks(organization_id)
WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_user
ON landscape.tbl_user_document_chunks(user_id);

CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_type
ON landscape.tbl_user_document_chunks(document_type)
WHERE document_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_property_type
ON landscape.tbl_user_document_chunks(property_type)
WHERE property_type IS NOT NULL;

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_embedding
ON landscape.tbl_user_document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for entity search
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_entities
ON landscape.tbl_user_document_chunks
USING GIN (entities_json jsonb_path_ops);


-- =============================================================================
-- 3. USER COMPARABLES TABLE
-- Tracks comparable properties/sales the user has referenced or used
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_user_comparables (
    id BIGSERIAL PRIMARY KEY,

    -- Ownership
    organization_id BIGINT,
    user_id BIGINT NOT NULL,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,

    -- Comparable identification
    comparable_type VARCHAR(50) NOT NULL,     -- sale, lease, rent, expense
    property_name VARCHAR(500) NOT NULL,
    property_address TEXT,

    -- Property characteristics
    property_type VARCHAR(50) NOT NULL,       -- LAND, MF, OFFICE, RETAIL, etc.
    property_subtype VARCHAR(100),
    market VARCHAR(100),
    submarket VARCHAR(100),

    -- Size metrics
    size_value NUMERIC(15, 2),
    size_unit VARCHAR(50),                    -- units, sf, acres, rooms
    year_built INTEGER,

    -- Transaction/metric data
    transaction_date DATE,
    price_value NUMERIC(15, 2),
    price_unit VARCHAR(50),                   -- total, per_unit, per_sf, per_acre
    cap_rate NUMERIC(5, 4),
    noi NUMERIC(15, 2),

    -- Additional metrics (flexible)
    metrics_json JSONB DEFAULT '{}'::jsonb,   -- {occupancy, rent_psf, expenses_psf, etc.}

    -- Source
    source_type VARCHAR(50) NOT NULL,         -- user_input, document_extract, market_data
    source_reference TEXT,                    -- Document name/ID or data provider
    source_document_id BIGINT,

    -- Quality signals
    confidence_score NUMERIC(3, 2) DEFAULT 1.00,
    is_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,

    -- Embedding for semantic search
    embedding vector(1536),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user comparables
CREATE INDEX IF NOT EXISTS idx_user_comparables_user
ON landscape.tbl_user_comparables(user_id);

CREATE INDEX IF NOT EXISTS idx_user_comparables_org
ON landscape.tbl_user_comparables(organization_id)
WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_comparables_project
ON landscape.tbl_user_comparables(project_id)
WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_comparables_type
ON landscape.tbl_user_comparables(comparable_type);

CREATE INDEX IF NOT EXISTS idx_user_comparables_property_type
ON landscape.tbl_user_comparables(property_type);

CREATE INDEX IF NOT EXISTS idx_user_comparables_market
ON landscape.tbl_user_comparables(market, submarket)
WHERE market IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_comparables_date
ON landscape.tbl_user_comparables(transaction_date DESC)
WHERE transaction_date IS NOT NULL;

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_user_comparables_embedding
ON landscape.tbl_user_comparables
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for metrics search
CREATE INDEX IF NOT EXISTS idx_user_comparables_metrics
ON landscape.tbl_user_comparables
USING GIN (metrics_json jsonb_path_ops);


-- =============================================================================
-- 4. HELPER FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION landscape.update_user_knowledge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for assumption_history
DROP TRIGGER IF EXISTS trg_assumption_history_updated ON landscape.tbl_assumption_history;
CREATE TRIGGER trg_assumption_history_updated
    BEFORE UPDATE ON landscape.tbl_assumption_history
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_user_knowledge_timestamp();

-- Trigger for user_comparables
DROP TRIGGER IF EXISTS trg_user_comparables_updated ON landscape.tbl_user_comparables;
CREATE TRIGGER trg_user_comparables_updated
    BEFORE UPDATE ON landscape.tbl_user_comparables
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_user_knowledge_timestamp();


-- =============================================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE landscape.tbl_assumption_history IS
'Tracks all assumptions users have made across projects, enabling pattern learning and personalized suggestions';

COMMENT ON TABLE landscape.tbl_user_document_chunks IS
'Stores chunked content from user-uploaded documents with vector embeddings for semantic search';

COMMENT ON TABLE landscape.tbl_user_comparables IS
'Tracks comparable properties/sales the user has referenced, enabling comp suggestions';

COMMENT ON COLUMN landscape.tbl_assumption_history.embedding IS
'OpenAI ada-002 embedding for semantic similarity search on assumption context';

COMMENT ON COLUMN landscape.tbl_user_document_chunks.embedding IS
'OpenAI ada-002 embedding for semantic similarity search on document content';

COMMENT ON COLUMN landscape.tbl_user_comparables.embedding IS
'OpenAI ada-002 embedding for semantic similarity search on comparable details';


-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- DROP TRIGGER IF EXISTS trg_user_comparables_updated ON landscape.tbl_user_comparables;
-- DROP TRIGGER IF EXISTS trg_assumption_history_updated ON landscape.tbl_assumption_history;
-- DROP FUNCTION IF EXISTS landscape.update_user_knowledge_timestamp();
-- DROP TABLE IF EXISTS landscape.tbl_user_comparables;
-- DROP TABLE IF EXISTS landscape.tbl_user_document_chunks;
-- DROP TABLE IF EXISTS landscape.tbl_assumption_history;
