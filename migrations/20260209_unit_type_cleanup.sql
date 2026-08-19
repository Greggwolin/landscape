-- Migration: Unit Type Cleanup
-- Date: 2026-02-09
-- Description: Add unit_category and unit_designation columns to tbl_multifamily_unit,
--              then backfill unit_type from bedrooms/bathrooms for all projects.

-- =========================================================================
-- UP
-- =========================================================================

-- Step 1: Add new columns for descriptive attributes
ALTER TABLE landscape.tbl_multifamily_unit
    ADD COLUMN IF NOT EXISTS unit_category VARCHAR(50),
    ADD COLUMN IF NOT EXISTS unit_designation VARCHAR(100);

-- Step 2: Backfill unit_category and unit_designation from current unit_type
-- Parse 'Residential Unit, Sec. 8' → category='residential', designation='section_8'
UPDATE landscape.tbl_multifamily_unit
SET unit_category = CASE
    WHEN LOWER(unit_type) LIKE '%commercial%' OR LOWER(unit_type) LIKE '%retail%' THEN 'commercial'
    WHEN LOWER(unit_type) LIKE '%office%' OR LOWER(unit_type) LIKE '%leasing%' THEN 'office'
    WHEN LOWER(unit_type) LIKE '%residential%' OR LOWER(unit_type) LIKE '%unit%' THEN 'residential'
    ELSE 'other'
END
WHERE unit_category IS NULL;

UPDATE landscape.tbl_multifamily_unit
SET unit_designation = NULLIF(TRIM(CONCAT_WS(',',
    CASE WHEN LOWER(unit_type) LIKE '%sec. 8%' OR LOWER(unit_type) LIKE '%sec 8%' OR LOWER(unit_type) LIKE '%section 8%' THEN 'section_8' END,
    CASE WHEN LOWER(unit_type) LIKE '%manager%' THEN 'manager' END,
    CASE WHEN LOWER(unit_type) LIKE '%payment plan%' THEN 'payment_plan' END,
    CASE WHEN LOWER(unit_type) LIKE '%downtown women%' THEN 'downtown_women' END
)), '')
WHERE unit_designation IS NULL;

-- Step 3: Derive clean unit_type from bedrooms/bathrooms for ALL projects
-- Only update units where bedrooms and bathrooms are populated
UPDATE landscape.tbl_multifamily_unit
SET unit_type = CASE
    WHEN bedrooms = 0 AND bathrooms = 0 THEN unit_type  -- Keep as-is (office, commercial)
    WHEN bedrooms = 0 THEN 'Studio/' || bathrooms::int || 'BA'
    ELSE bedrooms::int || 'BR/' || bathrooms::int || 'BA'
END
WHERE bedrooms IS NOT NULL
  AND bathrooms IS NOT NULL
  AND NOT (bedrooms = 0 AND bathrooms = 0)
  AND unit_type NOT SIMILAR TO '[0-9]+BR/[0-9]+BA'
  AND unit_type NOT LIKE 'Studio/%';

-- =========================================================================
-- DOWN (rollback)
-- =========================================================================

-- To rollback, you would need to restore the original unit_type values.
-- Since we only update rows where the derived type differs from the pattern,
-- a rollback would require a backup of the original values. Consider this
-- migration as non-reversible for unit_type values.

-- ALTER TABLE landscape.tbl_multifamily_unit DROP COLUMN IF EXISTS unit_category;
-- ALTER TABLE landscape.tbl_multifamily_unit DROP COLUMN IF EXISTS unit_designation;
