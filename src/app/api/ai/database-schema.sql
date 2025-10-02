-- DMS Extraction Queue and Assertion Tables
-- Schema for unified document extraction pipeline (v2.0)

-- ============================================================================
-- 1. DMS Extract Queue
-- ============================================================================
-- Tracks extraction jobs and stores raw Claude JSON output
CREATE TABLE IF NOT EXISTS landscape.dms_extract_queue (
    queue_id SERIAL PRIMARY KEY,
    doc_id TEXT NOT NULL UNIQUE,
    project_id INTEGER REFERENCES landscape.tbl_project(project_id),
    file_uri TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status values: 'pending', 'processing', 'processed', 'error', 'skipped'
    extracted_data JSONB,
    -- Full JSON response from Claude unified extractor
    error_message TEXT,
    -- Error details if status='error'
    raw_response TEXT,
    -- Raw Claude response for debugging parse failures
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 2. DMS Unmapped Fields
-- ============================================================================
-- Stores fields that couldn't be automatically mapped to schema
CREATE TABLE IF NOT EXISTS landscape.dms_unmapped (
    unmapped_id SERIAL PRIMARY KEY,
    doc_id TEXT NOT NULL,
    project_id INTEGER REFERENCES landscape.tbl_project(project_id),
    source_key TEXT NOT NULL,
    -- Original key from document (e.g., "gp_designation")
    raw_value TEXT,
    -- Raw value extracted
    candidate_targets TEXT[],
    -- Suggested target columns: ["tbl_project.general_plan", "tbl_zoning_control.zoning_code"]
    page INTEGER,
    -- Page number where found
    bbox DECIMAL[],
    -- Bounding box [x, y, width, height] if available
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    -- Status: 'new', 'reviewed', 'mapped', 'ignored'
    mapped_to_table TEXT,
    -- Target table if manually mapped
    mapped_to_column TEXT,
    -- Target column if manually mapped
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT
);

-- ============================================================================
-- 3. DMS Document Assertions
-- ============================================================================
-- Stores all quantitative/qualitative claims from documents
CREATE TABLE IF NOT EXISTS landscape.dms_assertion (
    assertion_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
    doc_id TEXT NOT NULL,
    -- Source document ID
    subject_type VARCHAR(50) NOT NULL,
    -- 'project', 'phase', 'parcel', 'product'
    subject_ref TEXT,
    -- Reference ID (e.g., parcel_id="2", phase_id="1")
    metric_key TEXT NOT NULL,
    -- Metric name (e.g., "plan_density_du_ac", "units_total", "open_space_pct")
    value_num DECIMAL(15,4),
    -- Numeric value if applicable
    value_text TEXT,
    -- Text value if not numeric
    units TEXT,
    -- Unit of measurement (e.g., "ac", "du/ac", "sf", "%")
    context VARCHAR(50),
    -- Context: 'proposed', 'approved', 'as-built', 'other'
    page INTEGER,
    -- Page number in source document
    bbox DECIMAL[],
    -- Bounding box coordinates
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.95,
    -- Extraction confidence 0.0-1.0
    source VARCHAR(50),
    -- Source type: 'table', 'narrative', 'figure'
    as_of_date DATE,
    -- Document date (when the assertion was made)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_value_present CHECK (value_num IS NOT NULL OR value_text IS NOT NULL),
    CONSTRAINT check_confidence_range CHECK (confidence >= 0 AND confidence <= 1)
);

-- ============================================================================
-- 4. Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_extract_queue_doc_id ON landscape.dms_extract_queue(doc_id);
CREATE INDEX IF NOT EXISTS idx_extract_queue_project_id ON landscape.dms_extract_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_extract_queue_status ON landscape.dms_extract_queue(status);
CREATE INDEX IF NOT EXISTS idx_extract_queue_created_at ON landscape.dms_extract_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_unmapped_doc_id ON landscape.dms_unmapped(doc_id);
CREATE INDEX IF NOT EXISTS idx_unmapped_project_id ON landscape.dms_unmapped(project_id);
CREATE INDEX IF NOT EXISTS idx_unmapped_status ON landscape.dms_unmapped(status);
CREATE INDEX IF NOT EXISTS idx_unmapped_source_key ON landscape.dms_unmapped(source_key);

CREATE INDEX IF NOT EXISTS idx_assertion_project_id ON landscape.dms_assertion(project_id);
CREATE INDEX IF NOT EXISTS idx_assertion_doc_id ON landscape.dms_assertion(doc_id);
CREATE INDEX IF NOT EXISTS idx_assertion_subject_type ON landscape.dms_assertion(subject_type);
CREATE INDEX IF NOT EXISTS idx_assertion_metric_key ON landscape.dms_assertion(metric_key);
CREATE INDEX IF NOT EXISTS idx_assertion_as_of_date ON landscape.dms_assertion(as_of_date);

-- ============================================================================
-- 5. Comments / Documentation
-- ============================================================================
COMMENT ON TABLE landscape.dms_extract_queue IS 'Job queue for document extraction using Claude unified extractor';
COMMENT ON COLUMN landscape.dms_extract_queue.extracted_data IS 'Full JSON payload from Claude v2.0 unified prompt';
COMMENT ON COLUMN landscape.dms_extract_queue.status IS 'Job status: pending, processing, processed, error, skipped';

COMMENT ON TABLE landscape.dms_unmapped IS 'Fields extracted from documents that could not be auto-mapped to schema';
COMMENT ON COLUMN landscape.dms_unmapped.candidate_targets IS 'Array of suggested target columns for manual mapping';

COMMENT ON TABLE landscape.dms_assertion IS 'All quantitative/qualitative assertions from documents with provenance';
COMMENT ON COLUMN landscape.dms_assertion.subject_type IS 'Type of entity: project, phase, parcel, product';
COMMENT ON COLUMN landscape.dms_assertion.metric_key IS 'Standardized metric name matching schema columns';
COMMENT ON COLUMN landscape.dms_assertion.context IS 'Temporal context: proposed, approved, as-built, other';
COMMENT ON COLUMN landscape.dms_assertion.confidence IS 'Extraction confidence score 0.0-1.0';

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to get latest assertion for a specific metric
CREATE OR REPLACE FUNCTION landscape.get_latest_assertion(
    p_project_id INTEGER,
    p_subject_type VARCHAR(50),
    p_subject_ref TEXT,
    p_metric_key TEXT
)
RETURNS TABLE (
    value_num DECIMAL(15,4),
    value_text TEXT,
    units TEXT,
    confidence DECIMAL(3,2),
    doc_id TEXT,
    as_of_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.value_num,
        a.value_text,
        a.units,
        a.confidence,
        a.doc_id,
        a.as_of_date
    FROM landscape.dms_assertion a
    WHERE a.project_id = p_project_id
        AND a.subject_type = p_subject_type
        AND (p_subject_ref IS NULL OR a.subject_ref = p_subject_ref)
        AND a.metric_key = p_metric_key
    ORDER BY a.as_of_date DESC NULLS LAST, a.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.get_latest_assertion IS 'Retrieves the most recent assertion for a given metric';

-- Function to reconcile conflicting assertions
CREATE OR REPLACE FUNCTION landscape.get_assertion_conflicts(
    p_project_id INTEGER,
    p_metric_key TEXT
)
RETURNS TABLE (
    subject_type VARCHAR(50),
    subject_ref TEXT,
    value_num DECIMAL(15,4),
    value_text TEXT,
    doc_id TEXT,
    as_of_date DATE,
    confidence DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.subject_type,
        a.subject_ref,
        a.value_num,
        a.value_text,
        a.doc_id,
        a.as_of_date,
        a.confidence
    FROM landscape.dms_assertion a
    WHERE a.project_id = p_project_id
        AND a.metric_key = p_metric_key
    ORDER BY a.subject_ref, a.as_of_date DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.get_assertion_conflicts IS 'Retrieves all assertions for a metric to identify conflicts';
