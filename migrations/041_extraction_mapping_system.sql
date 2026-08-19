-- ============================================================================
-- Migration 041: Extraction Mapping System
-- Purpose: Configurable field mappings for AI document extraction
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Main mapping configuration table
CREATE TABLE IF NOT EXISTS landscape.tbl_extraction_mapping (
    mapping_id SERIAL PRIMARY KEY,

    -- Document classification
    document_type VARCHAR(50) NOT NULL,  -- 'OM', 'RENT_ROLL', 'T12', etc.

    -- Source pattern (what to look for in documents)
    source_pattern VARCHAR(200) NOT NULL,
    source_aliases JSONB DEFAULT '[]',  -- Additional patterns that map to same field

    -- Target destination
    target_table VARCHAR(100) NOT NULL,
    target_field VARCHAR(100) NOT NULL,

    -- Data handling
    data_type VARCHAR(20) NOT NULL DEFAULT 'text',
    transform_rule VARCHAR(100),  -- 'strip_currency', 'percent_to_decimal', 'parse_date', etc.

    -- Confidence and behavior
    confidence VARCHAR(10) NOT NULL DEFAULT 'Medium',
    auto_write BOOLEAN NOT NULL DEFAULT true,
    overwrite_existing BOOLEAN NOT NULL DEFAULT false,

    -- Admin
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT true,  -- System mappings can't be deleted
    notes TEXT,

    -- Audit
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_mapping_pattern_field UNIQUE (document_type, source_pattern, target_table, target_field),
    CONSTRAINT chk_confidence CHECK (confidence IN ('High', 'Medium', 'Low')),
    CONSTRAINT chk_data_type CHECK (data_type IN ('text', 'integer', 'decimal', 'boolean', 'date', 'json'))
);

-- Extraction activity log
CREATE TABLE IF NOT EXISTS landscape.tbl_extraction_log (
    log_id SERIAL PRIMARY KEY,
    mapping_id INTEGER REFERENCES landscape.tbl_extraction_mapping(mapping_id) ON DELETE SET NULL,
    project_id INTEGER,
    doc_id INTEGER,

    -- What was extracted
    source_pattern_matched VARCHAR(200),
    extracted_value TEXT,
    transformed_value TEXT,
    previous_value TEXT,

    -- Quality
    confidence_score NUMERIC(5,4),
    extraction_context TEXT,  -- Surrounding text for debugging

    -- Result
    was_written BOOLEAN NOT NULL DEFAULT false,
    was_accepted BOOLEAN,  -- NULL = pending review, true = accepted, false = rejected
    rejection_reason TEXT,

    -- Timestamps
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_extraction_mapping_doctype
    ON landscape.tbl_extraction_mapping(document_type);
CREATE INDEX IF NOT EXISTS idx_extraction_mapping_target
    ON landscape.tbl_extraction_mapping(target_table, target_field);
CREATE INDEX IF NOT EXISTS idx_extraction_mapping_active
    ON landscape.tbl_extraction_mapping(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_extraction_log_mapping
    ON landscape.tbl_extraction_log(mapping_id);
CREATE INDEX IF NOT EXISTS idx_extraction_log_project
    ON landscape.tbl_extraction_log(project_id);
CREATE INDEX IF NOT EXISTS idx_extraction_log_doc
    ON landscape.tbl_extraction_log(doc_id);

-- Stats view for monitoring extraction effectiveness
CREATE OR REPLACE VIEW landscape.vw_extraction_mapping_stats AS
SELECT
    m.mapping_id,
    m.document_type,
    m.source_pattern,
    m.target_table,
    m.target_field,
    m.confidence,
    m.is_active,
    COUNT(l.log_id) AS times_extracted,
    COUNT(DISTINCT l.project_id) AS projects_used,
    COUNT(DISTINCT l.doc_id) AS documents_processed,
    ROUND(AVG(l.confidence_score)::numeric, 4) AS avg_confidence_score,
    ROUND(AVG(CASE WHEN l.was_written THEN 1 ELSE 0 END)::numeric, 4) AS write_rate,
    ROUND(AVG(CASE WHEN l.was_accepted THEN 1 WHEN l.was_accepted = false THEN 0 END)::numeric, 4) AS acceptance_rate,
    MAX(l.extracted_at) AS last_used_at
FROM landscape.tbl_extraction_mapping m
LEFT JOIN landscape.tbl_extraction_log l ON m.mapping_id = l.mapping_id
GROUP BY m.mapping_id;

-- Add comment documentation
COMMENT ON TABLE landscape.tbl_extraction_mapping IS 'Configurable field mappings for AI document extraction. Maps source patterns from documents to database fields.';
COMMENT ON COLUMN landscape.tbl_extraction_mapping.document_type IS 'Document type: OM, RENT_ROLL, T12, APPRAISAL, LOAN_DOC, PSA, PCR, ENVIRONMENTAL, SURVEY, ZONING, TAX_BILL, INSURANCE, MARKET_STUDY, DEV_BUDGET, PROFORMA';
COMMENT ON COLUMN landscape.tbl_extraction_mapping.source_pattern IS 'The label or pattern to look for in documents (e.g., "Year Built", "Total Units")';
COMMENT ON COLUMN landscape.tbl_extraction_mapping.source_aliases IS 'Additional patterns that map to the same field (e.g., ["Units", "Unit Count"] for total_units)';
COMMENT ON COLUMN landscape.tbl_extraction_mapping.transform_rule IS 'Value transformation: strip_currency, percent_to_decimal, parse_date, extract_number, none';
COMMENT ON COLUMN landscape.tbl_extraction_mapping.confidence IS 'Extraction confidence level: High (auto-write), Medium (write with flag), Low (report only)';
COMMENT ON COLUMN landscape.tbl_extraction_mapping.is_system IS 'System mappings cannot be deleted by users';

COMMENT ON TABLE landscape.tbl_extraction_log IS 'Audit log for all extraction attempts, including accepted and rejected values';
COMMENT ON COLUMN landscape.tbl_extraction_log.was_accepted IS 'NULL = pending review, true = user accepted, false = user rejected';

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================
/*
DROP VIEW IF EXISTS landscape.vw_extraction_mapping_stats;
DROP TABLE IF EXISTS landscape.tbl_extraction_log;
DROP TABLE IF EXISTS landscape.tbl_extraction_mapping;
*/
