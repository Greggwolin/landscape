-- Migration: Add cabinet_id to tbl_project and core_doc
-- Purpose: Associate existing tables with cabinet for tenancy isolation
-- Date: 2026-01-20
-- Part of Cabinet/Contact Architecture implementation

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Add cabinet_id to tbl_project
-- -----------------------------------------------------------------------------

-- Add the column if it doesn't exist
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS cabinet_id BIGINT REFERENCES landscape.tbl_cabinet(cabinet_id);

-- Add project_focus column (replacing/augmenting analysis_type)
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS project_focus VARCHAR(50)
CHECK (project_focus IN ('Valuation', 'Investment', 'Feasibility', 'Operations'));

-- Create index for cabinet lookup on projects
CREATE INDEX IF NOT EXISTS idx_project_cabinet
ON landscape.tbl_project(cabinet_id);

-- Create index for project_focus filtering
CREATE INDEX IF NOT EXISTS idx_project_focus
ON landscape.tbl_project(project_focus) WHERE project_focus IS NOT NULL;

-- Add comments
COMMENT ON COLUMN landscape.tbl_project.cabinet_id IS 'Foreign key to tbl_cabinet for tenancy isolation';
COMMENT ON COLUMN landscape.tbl_project.project_focus IS 'What the user is trying to accomplish: Valuation, Investment, Feasibility, Operations';

-- -----------------------------------------------------------------------------
-- Add cabinet_id to core_doc
-- -----------------------------------------------------------------------------

-- Add the column if it doesn't exist
ALTER TABLE landscape.core_doc
ADD COLUMN IF NOT EXISTS cabinet_id BIGINT REFERENCES landscape.tbl_cabinet(cabinet_id);

-- Create index for cabinet lookup on documents
CREATE INDEX IF NOT EXISTS idx_doc_cabinet
ON landscape.core_doc(cabinet_id);

-- Add comment
COMMENT ON COLUMN landscape.core_doc.cabinet_id IS 'Foreign key to tbl_cabinet for tenancy isolation';

-- -----------------------------------------------------------------------------
-- Create document-project junction table (for multi-project document attachment)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS landscape.tbl_document_project (
    document_project_id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'attached' CHECK (relationship_type IN (
        'attached',    -- Document is attached/belongs to project
        'reference',   -- Document is referenced but lives elsewhere
        'source'       -- Document was source for extracted data
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,

    -- Prevent duplicate attachments
    CONSTRAINT uq_document_project UNIQUE(document_id, project_id)
);

-- Indexes for document-project junction
CREATE INDEX IF NOT EXISTS idx_doc_project_doc
ON landscape.tbl_document_project(document_id);

CREATE INDEX IF NOT EXISTS idx_doc_project_project
ON landscape.tbl_document_project(project_id);

CREATE INDEX IF NOT EXISTS idx_doc_project_type
ON landscape.tbl_document_project(relationship_type);

-- Comments
COMMENT ON TABLE landscape.tbl_document_project IS 'Junction table allowing documents to be attached to multiple projects';
COMMENT ON COLUMN landscape.tbl_document_project.relationship_type IS 'How the document relates: attached (belongs to), reference (linked), source (data extracted from)';

-- -----------------------------------------------------------------------------
-- Assign default cabinet to existing data
-- -----------------------------------------------------------------------------

-- Get the default cabinet ID (created in migration 053)
DO $$
DECLARE
    default_cabinet_id BIGINT;
BEGIN
    -- Get the default cabinet (or create one if somehow missing)
    SELECT cabinet_id INTO default_cabinet_id
    FROM landscape.tbl_cabinet
    WHERE owner_user_id = 'system'
    LIMIT 1;

    -- If no default cabinet exists, create one
    IF default_cabinet_id IS NULL THEN
        INSERT INTO landscape.tbl_cabinet (cabinet_name, owner_user_id, cabinet_type)
        VALUES ('Default Cabinet', 'system', 'standard')
        RETURNING cabinet_id INTO default_cabinet_id;
    END IF;

    -- Assign default cabinet to all projects without a cabinet
    UPDATE landscape.tbl_project
    SET cabinet_id = default_cabinet_id
    WHERE cabinet_id IS NULL;

    RAISE NOTICE 'Assigned cabinet_id % to projects without cabinet', default_cabinet_id;

    -- Assign default cabinet to all documents without a cabinet
    UPDATE landscape.core_doc
    SET cabinet_id = default_cabinet_id
    WHERE cabinet_id IS NULL;

    RAISE NOTICE 'Assigned cabinet_id % to documents without cabinet', default_cabinet_id;
END $$;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP INDEX IF EXISTS landscape.idx_doc_project_type;
-- DROP INDEX IF EXISTS landscape.idx_doc_project_project;
-- DROP INDEX IF EXISTS landscape.idx_doc_project_doc;
-- DROP TABLE IF EXISTS landscape.tbl_document_project;
-- DROP INDEX IF EXISTS landscape.idx_doc_cabinet;
-- ALTER TABLE landscape.core_doc DROP COLUMN IF EXISTS cabinet_id;
-- DROP INDEX IF EXISTS landscape.idx_project_focus;
-- DROP INDEX IF EXISTS landscape.idx_project_cabinet;
-- ALTER TABLE landscape.tbl_project DROP COLUMN IF EXISTS project_focus;
-- ALTER TABLE landscape.tbl_project DROP COLUMN IF EXISTS cabinet_id;
