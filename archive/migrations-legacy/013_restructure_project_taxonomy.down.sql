-- ============================================================================
-- MIGRATION 013 ROLLBACK: Restructure Project Taxonomy
-- ============================================================================
-- Purpose: Rollback taxonomy restructure changes
-- Date: 2025-10-31
-- ============================================================================

BEGIN;

-- Step 1: Restore original column names
ALTER TABLE landscape.tbl_project
RENAME COLUMN development_type_deprecated TO development_type;

ALTER TABLE landscape.tbl_project
RENAME COLUMN property_type_code_deprecated TO property_type_code;

-- Step 2: Remove new columns
ALTER TABLE landscape.tbl_project
DROP COLUMN IF EXISTS analysis_type;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS landscape.idx_project_analysis_type;
DROP INDEX IF EXISTS landscape.idx_project_property_subtype;

-- Step 4: Remove analysis_type from tbl_project_config if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'landscape'
    AND table_name = 'tbl_project_config'
  ) THEN
    ALTER TABLE landscape.tbl_project_config
    DROP COLUMN IF EXISTS analysis_type;
  END IF;
END $$;

-- Step 5: Remove migration record
DELETE FROM landscape._migrations
WHERE migration_file = '013_restructure_project_taxonomy.up.sql';

COMMIT;
