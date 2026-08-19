-- ============================================================================
-- MIGRATION: project_type_code Standardization
-- Date: 2025-11-02
-- Purpose: Rename property_type_code → project_type_code, standardize values
-- ============================================================================
--
-- This migration:
-- 1. Renames property_type_code to project_type_code
-- 2. Standardizes code values to 7 official codes (LAND, MF, OFF, RET, IND, HTL, MXU)
-- 3. Syncs project_type (full name) with project_type_code (abbreviation)
-- 4. Removes deprecated columns
-- 5. Adds CHECK constraint for data integrity
-- 6. Makes project_type_code NOT NULL with default
--
-- ROLLBACK: See 013_rollback.sql
-- ============================================================================

BEGIN;

-- Step 1: Rename the primary classification column
ALTER TABLE landscape.tbl_project
RENAME COLUMN property_type_code TO project_type_code;

-- Step 2: Standardize code values (normalize any variants to official codes)
UPDATE landscape.tbl_project
SET project_type_code = CASE
  -- Land Development variants
  WHEN project_type_code IN ('LAND_DEV', 'Land Development', 'Land', 'MPC', 'land')
    THEN 'LAND'

  -- Multifamily variants
  WHEN project_type_code IN ('Multifamily', 'MULTIFAMILY', 'multifamily', 'MF')
    THEN 'MF'

  -- Office variants
  WHEN project_type_code IN ('Office', 'OFFICE', 'office', 'OFF')
    THEN 'OFF'

  -- Retail variants
  WHEN project_type_code IN ('Retail', 'RETAIL', 'retail', 'RET')
    THEN 'RET'

  -- Industrial variants
  WHEN project_type_code IN ('Industrial', 'INDUSTRIAL', 'industrial', 'IND')
    THEN 'IND'

  -- Hotel variants
  WHEN project_type_code IN ('Hotel', 'HOTEL', 'hotel', 'HTL')
    THEN 'HTL'

  -- Mixed-Use variants
  WHEN project_type_code IN ('Mixed-Use', 'MIXED_USE', 'MixedUse', 'mixed-use', 'MXU')
    THEN 'MXU'

  -- Default for NULL or empty values
  WHEN project_type_code IS NULL OR project_type_code = ''
    THEN 'LAND'

  -- Keep if already correct
  ELSE project_type_code
END;

-- Step 3: Sync project_type (full name) with project_type_code (abbreviation)
UPDATE landscape.tbl_project
SET project_type = CASE project_type_code
  WHEN 'LAND' THEN 'Land Development'
  WHEN 'MF' THEN 'Multifamily'
  WHEN 'OFF' THEN 'Office'
  WHEN 'RET' THEN 'Retail'
  WHEN 'IND' THEN 'Industrial'
  WHEN 'HTL' THEN 'Hotel'
  WHEN 'MXU' THEN 'Mixed-Use'
  ELSE project_type  -- Keep existing if code doesn't match
END;

-- Step 4: Clean up deprecated columns
ALTER TABLE landscape.tbl_project
DROP COLUMN IF EXISTS property_type_code_deprecated;

ALTER TABLE landscape.tbl_project
DROP COLUMN IF EXISTS development_type_deprecated;

-- Step 5: Add CHECK constraint for data integrity
ALTER TABLE landscape.tbl_project
ADD CONSTRAINT check_project_type_code
CHECK (project_type_code IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'));

-- Step 6: Make project_type_code NOT NULL (all existing projects have values)
ALTER TABLE landscape.tbl_project
ALTER COLUMN project_type_code SET NOT NULL;

-- Step 7: Set defaults for new projects
ALTER TABLE landscape.tbl_project
ALTER COLUMN project_type_code SET DEFAULT 'LAND';

ALTER TABLE landscape.tbl_project
ALTER COLUMN project_type SET DEFAULT 'Land Development';

-- Step 8: Add helpful column comments
COMMENT ON COLUMN landscape.tbl_project.project_type_code IS
'Project type abbreviation (LAND, MF, OFF, RET, IND, HTL, MXU) - determines UI template routing';

COMMENT ON COLUMN landscape.tbl_project.project_type IS
'Project type full name (Land Development, Multifamily, Office, etc.) - for display to users';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify migration results
SELECT
  project_type_code,
  project_type,
  COUNT(*) as project_count
FROM landscape.tbl_project
GROUP BY project_type_code, project_type
ORDER BY project_type_code;

-- Expected output:
-- LAND | Land Development | ~7-8 projects
-- MF   | Multifamily      | ~2 projects

-- Verify no deprecated columns remain
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'tbl_project'
  AND column_name LIKE '%deprecated%';

-- Expected: ZERO rows

-- Verify CHECK constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'check_project_type_code';

-- Expected: 1 row with CHECK clause showing 7 valid codes

-- Verify NOT NULL constraint
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'tbl_project'
  AND column_name = 'project_type_code';

-- Expected: is_nullable = 'NO'

-- Verify defaults
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'tbl_project'
  AND column_name IN ('project_type_code', 'project_type');

-- Expected:
-- project_type_code | 'LAND'::character varying
-- project_type      | 'Land Development'::character varying

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
