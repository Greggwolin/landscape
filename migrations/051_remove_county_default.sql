-- Migration 051: Remove hardcoded Maricopa county default
-- Purpose: The county column should not default to any value - it should be NULL
-- if not explicitly provided, allowing proper extraction from documents.
--
-- Date: 2026-01-13

-- UP: Remove the default value from tbl_project.county
ALTER TABLE landscape.tbl_project
  ALTER COLUMN county DROP DEFAULT;

-- DOWN: Restore the default if needed (not recommended)
-- ALTER TABLE landscape.tbl_project
--   ALTER COLUMN county SET DEFAULT 'Maricopa'::character varying;
