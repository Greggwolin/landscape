-- ============================================================================
-- Migration 052: Backfill parent_category for Operating Expenses
-- Date: 2026-01-16
-- Purpose: Populate parent_category for all unclassified expenses based on
--          their expense_type. This fixes the UI showing all expenses as
--          "Unclassified" when they should be grouped into standard MF
--          expense categories (Taxes & Insurance, Utilities, etc.)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PRE-MIGRATION: Count affected rows
-- ============================================================================
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM landscape.tbl_operating_expenses
    WHERE parent_category = 'unclassified'
      AND expense_type IS NOT NULL;

    RAISE NOTICE 'Rows to be updated: %', affected_count;
END $$;

-- ============================================================================
-- MAIN MIGRATION: Backfill parent_category from expense_type
-- ============================================================================

-- Update parent_category based on expense_type mapping
-- This matches the derive_parent_category() logic in opex_utils.py
UPDATE landscape.tbl_operating_expenses
SET parent_category = CASE expense_type
    WHEN 'TAXES' THEN 'taxes_insurance'
    WHEN 'INSURANCE' THEN 'taxes_insurance'
    WHEN 'UTILITIES' THEN 'utilities'
    WHEN 'REPAIRS' THEN 'repairs_maintenance'
    WHEN 'MANAGEMENT' THEN 'management'
    WHEN 'CAM' THEN 'repairs_maintenance'
    ELSE 'other'
END,
    updated_at = NOW()
WHERE parent_category = 'unclassified'
  AND expense_type IS NOT NULL;

-- ============================================================================
-- POST-MIGRATION: Verify results
-- ============================================================================
DO $$
DECLARE
    remaining_unclassified INTEGER;
    category_distribution RECORD;
BEGIN
    -- Check remaining unclassified
    SELECT COUNT(*) INTO remaining_unclassified
    FROM landscape.tbl_operating_expenses
    WHERE parent_category = 'unclassified';

    RAISE NOTICE 'Remaining unclassified rows: %', remaining_unclassified;

    -- Show distribution
    RAISE NOTICE 'Parent category distribution after migration:';
    FOR category_distribution IN
        SELECT parent_category, COUNT(*) as cnt
        FROM landscape.tbl_operating_expenses
        GROUP BY parent_category
        ORDER BY cnt DESC
    LOOP
        RAISE NOTICE '  %: %', category_distribution.parent_category, category_distribution.cnt;
    END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================
-- To rollback, run:
-- UPDATE landscape.tbl_operating_expenses
-- SET parent_category = 'unclassified',
--     updated_at = NOW()
-- WHERE parent_category IN ('taxes_insurance', 'utilities', 'repairs_maintenance', 'management', 'other');
--
-- Note: This rollback is destructive and will lose any manual categorizations
-- made by users via drag-and-drop. Only use if absolutely necessary.
