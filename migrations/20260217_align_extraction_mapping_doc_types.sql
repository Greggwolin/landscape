-- Migration: Align extraction mapping document_type values with DMS template vocabulary
-- Date: 2026-02-17
-- Description: Remap hardcoded uppercase document_type codes to template-derived mixed-case names.
--              Also adds applicable_tags column for tag-based filtering.

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

BEGIN;

-- Step 1: Add applicable_tags column for tag-based extraction filtering (Part 2)
ALTER TABLE landscape.tbl_extraction_mapping
  ADD COLUMN IF NOT EXISTS applicable_tags JSONB DEFAULT '[]'::jsonb;

-- Step 2: Create audit log for the remapping
CREATE TABLE IF NOT EXISTS landscape.extraction_mapping_doctype_migration_log (
  id SERIAL PRIMARY KEY,
  mapping_id INTEGER NOT NULL,
  old_document_type VARCHAR(50) NOT NULL,
  new_document_type VARCHAR(50) NOT NULL,
  migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Log all remappings before updating
INSERT INTO landscape.extraction_mapping_doctype_migration_log (mapping_id, old_document_type, new_document_type)
SELECT mapping_id, document_type,
  CASE document_type
    WHEN 'APPRAISAL' THEN 'Property Data'
    WHEN 'INSURANCE' THEN 'Operations'
    WHEN 'OM' THEN 'Offering'
    WHEN 'RENT_ROLL' THEN 'Property Data'
    WHEN 'T12' THEN 'Accounting'
    WHEN 'MARKET_STUDY' THEN 'Market Data'
    WHEN 'LOAN_DOC' THEN 'Diligence'
    WHEN 'PSA' THEN 'Agreements'
    WHEN 'PCR' THEN 'Diligence'
    WHEN 'ENVIRONMENTAL' THEN 'Diligence'
    WHEN 'SURVEY' THEN 'Title & Survey'
    WHEN 'ZONING' THEN 'Diligence'
    WHEN 'TAX_BILL' THEN 'Accounting'
    WHEN 'DEV_BUDGET' THEN 'Accounting'
    WHEN 'PROFORMA' THEN 'Accounting'
    ELSE 'Misc'
  END
FROM landscape.tbl_extraction_mapping;

-- Step 4: Update document_type values to new vocabulary
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Property Data' WHERE document_type = 'APPRAISAL';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Operations' WHERE document_type = 'INSURANCE';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Offering' WHERE document_type = 'OM';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Property Data' WHERE document_type = 'RENT_ROLL';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Accounting' WHERE document_type = 'T12';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Market Data' WHERE document_type = 'MARKET_STUDY';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Diligence' WHERE document_type = 'LOAN_DOC';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Agreements' WHERE document_type = 'PSA';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Diligence' WHERE document_type = 'PCR';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Diligence' WHERE document_type = 'ENVIRONMENTAL';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Title & Survey' WHERE document_type = 'SURVEY';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Diligence' WHERE document_type = 'ZONING';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Accounting' WHERE document_type = 'TAX_BILL';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Accounting' WHERE document_type = 'DEV_BUDGET';
UPDATE landscape.tbl_extraction_mapping SET document_type = 'Accounting' WHERE document_type = 'PROFORMA';

-- Step 5: Create tag tables for Part 2
CREATE TABLE IF NOT EXISTS landscape.dms_doc_tags (
  tag_id SERIAL PRIMARY KEY,
  tag_name VARCHAR(100) NOT NULL,
  workspace_id BIGINT,
  usage_count INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tag_name, workspace_id)
);

CREATE TABLE IF NOT EXISTS landscape.dms_doc_tag_assignments (
  doc_id BIGINT NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES landscape.dms_doc_tags(tag_id) ON DELETE CASCADE,
  assigned_by INTEGER,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (doc_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_tags_workspace ON landscape.dms_doc_tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_doc_tags_name ON landscape.dms_doc_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_doc ON landscape.dms_doc_tag_assignments(doc_id);

-- Step 6: Create project-level doc type overrides table for Part 4
CREATE TABLE IF NOT EXISTS landscape.dms_project_doc_types (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  doc_type_name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_from_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, doc_type_name)
);

COMMIT;

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================

-- To rollback, run these statements:
-- BEGIN;
--
-- -- Reverse the document_type remapping using the audit log
-- UPDATE landscape.tbl_extraction_mapping em
-- SET document_type = log.old_document_type
-- FROM landscape.extraction_mapping_doctype_migration_log log
-- WHERE em.mapping_id = log.mapping_id;
--
-- -- Drop the new columns and tables
-- ALTER TABLE landscape.tbl_extraction_mapping DROP COLUMN IF EXISTS applicable_tags;
-- DROP TABLE IF EXISTS landscape.dms_project_doc_types;
-- DROP TABLE IF EXISTS landscape.dms_doc_tag_assignments;
-- DROP TABLE IF EXISTS landscape.dms_doc_tags;
-- DROP TABLE IF EXISTS landscape.extraction_mapping_doctype_migration_log;
--
-- COMMIT;
