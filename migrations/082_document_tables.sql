-- Migration 082: Add document_tables for structured table extraction
-- Stores tables extracted from PDFs (market research, presentations, reports)

-- UP
CREATE TABLE IF NOT EXISTS landscape.document_tables (
    table_id BIGSERIAL PRIMARY KEY,
    doc_id BIGINT REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
    table_order INTEGER DEFAULT 0,
    page_number INTEGER,
    table_title VARCHAR(500),
    headers JSONB,              -- Array of column header strings
    rows JSONB,                 -- Array of row arrays
    row_count INTEGER DEFAULT 0,
    extraction_source VARCHAR(50) DEFAULT 'pdfplumber',
    accuracy NUMERIC(5,2),
    raw_data JSONB,             -- Complete raw extraction for debugging
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_tables_doc_id
    ON landscape.document_tables(doc_id);

ALTER TABLE landscape.core_doc
    ADD COLUMN IF NOT EXISTS table_count INTEGER DEFAULT 0;

-- DOWN (rollback)
-- DROP TABLE IF EXISTS landscape.document_tables;
-- ALTER TABLE landscape.core_doc DROP COLUMN IF EXISTS table_count;
