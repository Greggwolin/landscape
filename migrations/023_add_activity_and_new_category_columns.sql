-- Migration 023: Add activity and new_category_id columns (NON-BREAKING)
-- Created: 2025-11-19
-- Purpose: Shadow existing lifecycle_stage and category_id columns with new terminology
--          This is Phase 2 of the category system consolidation
--          Old columns remain untouched - system continues to work

-- Part 2A: Add new columns (nullable initially)
ALTER TABLE landscape.core_fin_fact_budget
ADD COLUMN IF NOT EXISTS activity VARCHAR(50),
ADD COLUMN IF NOT EXISTS new_category_id BIGINT;

COMMENT ON COLUMN landscape.core_fin_fact_budget.activity IS
'Renamed from lifecycle_stage. Represents the cost lifecycle timing (Acquisition, Planning & Engineering, Development, Operations, Disposition, Financing)';

COMMENT ON COLUMN landscape.core_fin_fact_budget.new_category_id IS
'Temporary column during migration. Will replace category_id after cutover to core_unit_cost_category only.';

-- Part 2B: Backfill activity from lifecycle_stage
UPDATE landscape.core_fin_fact_budget
SET activity = lifecycle_stage
WHERE lifecycle_stage IS NOT NULL;

-- Part 2C: Default missing activities to "Development" (for 26 legacy items)
-- Rationale: Most budget items without explicit stage are development costs
UPDATE landscape.core_fin_fact_budget
SET activity = 'Development'
WHERE activity IS NULL;

-- Part 2D: Backfill new_category_id from existing category_id
-- Per Part 1 audit: All 24 existing category_ids reference core_unit_cost_category
UPDATE landscape.core_fin_fact_budget
SET new_category_id = category_id
WHERE category_id IS NOT NULL;

-- Part 2E: Validation Query
DO $$
DECLARE
  total_count INT;
  activity_count INT;
  category_count INT;
  legacy_defaulted INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM landscape.core_fin_fact_budget;
  SELECT COUNT(*) INTO activity_count FROM landscape.core_fin_fact_budget WHERE activity IS NOT NULL;
  SELECT COUNT(*) INTO category_count FROM landscape.core_fin_fact_budget WHERE new_category_id IS NOT NULL;
  SELECT COUNT(*) INTO legacy_defaulted FROM landscape.core_fin_fact_budget
    WHERE activity = 'Development' AND lifecycle_stage IS NULL;

  RAISE NOTICE '✅ Migration 023 Validation:';
  RAISE NOTICE '   Total items: % (expected: 53)', total_count;
  RAISE NOTICE '   Items with activity: % (expected: 53)', activity_count;
  RAISE NOTICE '   Items with new_category_id: % (expected: 24)', category_count;
  RAISE NOTICE '   Legacy items defaulted to Development: % (expected: 26)', legacy_defaulted;

  IF total_count = 53 AND activity_count = 53 AND category_count = 24 AND legacy_defaulted = 26 THEN
    RAISE NOTICE '✅ All validation checks passed!';
  ELSE
    RAISE WARNING '⚠️  Validation counts do not match expected values!';
  END IF;
END $$;
