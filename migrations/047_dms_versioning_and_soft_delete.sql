-- Migration: 047_dms_versioning_and_soft_delete.sql
-- Description: Add versioning, content hash, and soft delete support to DMS
-- Date: 2026-01-06

-- =====================================================
-- PART A: Add soft delete columns to core_doc
-- =====================================================

-- Note: version_no, parent_doc_id, and sha256_hash already exist
-- Adding: deleted_at, deleted_by for soft delete

ALTER TABLE landscape.core_doc
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

COMMENT ON COLUMN landscape.core_doc.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN landscape.core_doc.deleted_by IS 'User who deleted the document';

-- Create index for efficient filtering of non-deleted documents
CREATE INDEX IF NOT EXISTS idx_core_doc_deleted_at
ON landscape.core_doc(deleted_at)
WHERE deleted_at IS NULL;

-- =====================================================
-- PART B: Add version tracking to knowledge_embeddings
-- =====================================================

ALTER TABLE landscape.knowledge_embeddings
ADD COLUMN IF NOT EXISTS source_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS superseded_by_version INTEGER;

COMMENT ON COLUMN landscape.knowledge_embeddings.source_version IS 'Version of source doc when embedding was created';
COMMENT ON COLUMN landscape.knowledge_embeddings.superseded_by_version IS 'If set, newer version has better embeddings';

-- Index for finding active (non-superseded) embeddings
CREATE INDEX IF NOT EXISTS idx_embeddings_active
ON landscape.knowledge_embeddings(source_id, source_type)
WHERE superseded_by_version IS NULL;

-- =====================================================
-- PART C: Create extracted_facts table for cumulative knowledge
-- =====================================================

CREATE TABLE IF NOT EXISTS landscape.doc_extracted_facts (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id BIGINT NOT NULL REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
    source_version INTEGER NOT NULL DEFAULT 1,
    field_name VARCHAR(100) NOT NULL,
    field_value TEXT,
    confidence DECIMAL(3,2),
    extraction_method VARCHAR(50),
    superseded_at TIMESTAMPTZ,
    superseded_by_version INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_fact_per_version UNIQUE (doc_id, source_version, field_name)
);

CREATE INDEX IF NOT EXISTS idx_doc_facts_doc_id ON landscape.doc_extracted_facts(doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_facts_active ON landscape.doc_extracted_facts(doc_id) WHERE superseded_at IS NULL;

COMMENT ON TABLE landscape.doc_extracted_facts IS 'Cumulative extracted facts across document versions';

-- =====================================================
-- ROLLBACK
-- =====================================================
-- To rollback this migration:
--
-- DROP TABLE IF EXISTS landscape.doc_extracted_facts;
-- DROP INDEX IF EXISTS landscape.idx_embeddings_active;
-- ALTER TABLE landscape.knowledge_embeddings DROP COLUMN IF EXISTS source_version;
-- ALTER TABLE landscape.knowledge_embeddings DROP COLUMN IF EXISTS superseded_by_version;
-- DROP INDEX IF EXISTS landscape.idx_core_doc_deleted_at;
-- ALTER TABLE landscape.core_doc DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE landscape.core_doc DROP COLUMN IF EXISTS deleted_by;
