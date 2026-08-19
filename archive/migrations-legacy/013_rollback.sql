-- ============================================================================
-- ROLLBACK: project_type_code Standardization
-- Date: 2025-11-02
-- Purpose: Reverse migration 013 - restore property_type_code naming
-- ============================================================================
--
-- This rollback:
-- 1. Removes CHECK constraint
-- 2. Removes NOT NULL constraint
-- 3. Removes DEFAULT values
-- 4. Removes column comments
-- 5. Renames project_type_code back to property_type_code
--
-- USE ONLY IF: Migration 013 causes issues and you need to revert
-- ============================================================================

BEGIN;

-- Step 1: Remove CHECK constraint
ALTER TABLE landscape.tbl_project
DROP CONSTRAINT IF EXISTS check_project_type_code;

-- Step 2: Remove NOT NULL constraint
ALTER TABLE landscape.tbl_project
ALTER COLUMN project_type_code DROP NOT NULL;

-- Step 3: Remove DEFAULT values
ALTER TABLE landscape.tbl_project
ALTER COLUMN project_type_code DROP DEFAULT;

ALTER TABLE landscape.tbl_project
ALTER COLUMN project_type DROP DEFAULT;

-- Step 4: Remove column comments
COMMENT ON COLUMN landscape.tbl_project.project_type_code IS NULL;
COMMENT ON COLUMN landscape.tbl_project.project_type IS NULL;

-- Step 5: Rename column back to original name
ALTER TABLE landscape.tbl_project
RENAME COLUMN project_type_code TO property_type_code;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify rollback results
SELECT
  property_type_code,
  project_type,
  COUNT(*) as project_count
FROM landscape.tbl_project
GROUP BY property_type_code, project_type
ORDER BY property_type_code;

-- Verify constraint removed
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_schema = 'landscape'
  AND table_name = 'tbl_project'
  AND constraint_name = 'check_project_type_code';

-- Expected: ZERO rows

-- Verify column renamed back
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'tbl_project'
  AND column_name IN ('property_type_code', 'project_type_code');

-- Expected: property_type_code exists, project_type_code does NOT exist

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
