-- Migration: Acquisition Ledger Data Cleanup and Category Assignment
-- Part A: Schema changes (category_id, subcategory_id columns)
-- Part B: Data cleanup, event type migration, category assignment
-- Date: 2026-02-02
-- Session: VB

-- ============================================================================
-- PART A: SCHEMA CHANGES (Safe to re-run - uses IF NOT EXISTS)
-- ============================================================================

-- Add category_id column if not exists
ALTER TABLE landscape.tbl_acquisition
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES landscape.core_unit_cost_category(category_id);

-- Add subcategory_id column if not exists
ALTER TABLE landscape.tbl_acquisition
ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES landscape.core_unit_cost_category(category_id);

-- Add indexes for performance (safe to re-run)
CREATE INDEX IF NOT EXISTS idx_acquisition_category_id
ON landscape.tbl_acquisition(category_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_subcategory_id
ON landscape.tbl_acquisition(subcategory_id);

-- Add column comments
COMMENT ON COLUMN landscape.tbl_acquisition.category_id IS 'FK to core_unit_cost_category - Level 1 category (1100, 1200, 1300 series)';
COMMENT ON COLUMN landscape.tbl_acquisition.subcategory_id IS 'FK to core_unit_cost_category - Level 2 subcategory (1110, 1120, etc.)';

-- ============================================================================
-- PART B: DATA CLEANUP AND MIGRATION
-- ============================================================================

-- Step 1: Create backup table
-- ============================================================================
DO $$
BEGIN
    -- Create backup if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'landscape'
        AND table_name = 'tbl_acquisition_backup_20260202'
    ) THEN
        CREATE TABLE landscape.tbl_acquisition_backup_20260202 AS
        SELECT * FROM landscape.tbl_acquisition;
        RAISE NOTICE 'Backup created: tbl_acquisition_backup_20260202 with % rows',
            (SELECT COUNT(*) FROM landscape.tbl_acquisition_backup_20260202);
    ELSE
        RAISE NOTICE 'Backup table already exists, skipping backup creation';
    END IF;
END $$;

-- Step 2: Project Cleanup
-- ============================================================================

-- Archive Project 7 (Peoria Lakes - duplicate of Project 9)
UPDATE landscape.tbl_project
SET is_active = false,
    project_name = project_name || ' [ARCHIVED - Duplicate]'
WHERE project_id = 7
  AND project_name NOT LIKE '%ARCHIVED%';

-- Clear acquisition prices for Project 17 (Chadron Terrace - valuation analysis)
UPDATE landscape.tbl_project
SET acquisition_price = NULL,
    asking_price = NULL
WHERE project_id = 17;

UPDATE landscape.tbl_property_acquisition
SET purchase_price = NULL
WHERE project_id = 17;

-- Clear acquisition prices for Project 42 (Lynn Villa)
UPDATE landscape.tbl_project
SET acquisition_price = NULL,
    asking_price = NULL
WHERE project_id = 42;

UPDATE landscape.tbl_property_acquisition
SET purchase_price = NULL
WHERE project_id = 42;

-- Step 3: Event Type Migration
-- ============================================================================

-- "Closing" with amount → "Closing Costs"
UPDATE landscape.tbl_acquisition
SET event_type = 'Closing Costs'
WHERE event_type = 'Closing'
  AND amount IS NOT NULL
  AND amount > 0;

-- "Closing" without amount → "Closing Date"
UPDATE landscape.tbl_acquisition
SET event_type = 'Closing Date'
WHERE event_type = 'Closing'
  AND (amount IS NULL OR amount = 0);

-- "Effective Date" → "Milestone" (preserve description)
UPDATE landscape.tbl_acquisition
SET event_type = 'Milestone',
    description = COALESCE(NULLIF(description, ''), 'Effective Date')
WHERE event_type = 'Effective Date';

-- "Title Survey" with amount → "Fee"
UPDATE landscape.tbl_acquisition
SET event_type = 'Fee',
    description = COALESCE(NULLIF(description, ''), 'Title Survey / ALTA Survey')
WHERE event_type = 'Title Survey'
  AND amount IS NOT NULL
  AND amount > 0;

-- "Title Survey" without amount → "Milestone"
UPDATE landscape.tbl_acquisition
SET event_type = 'Milestone',
    description = COALESCE(NULLIF(description, ''), 'Title Survey Completed')
WHERE event_type = 'Title Survey'
  AND (amount IS NULL OR amount = 0);

-- Step 4: Category Assignment
-- ============================================================================

DO $$
DECLARE
    cat_due_diligence INTEGER;
    cat_transaction_costs INTEGER;
    cat_land_cost INTEGER;
    cat_earnest_money INTEGER;
    cat_survey INTEGER;
    cat_closing_costs INTEGER;
    cat_escrow_fees INTEGER;
    rows_updated INTEGER;
BEGIN
    -- Look up category IDs
    SELECT category_id INTO cat_due_diligence FROM landscape.core_unit_cost_category WHERE account_number = '1100';
    SELECT category_id INTO cat_transaction_costs FROM landscape.core_unit_cost_category WHERE account_number = '1200';
    SELECT category_id INTO cat_land_cost FROM landscape.core_unit_cost_category WHERE account_number = '1300';
    SELECT category_id INTO cat_earnest_money FROM landscape.core_unit_cost_category WHERE account_number = '1210';
    SELECT category_id INTO cat_survey FROM landscape.core_unit_cost_category WHERE account_number = '1140';
    SELECT category_id INTO cat_closing_costs FROM landscape.core_unit_cost_category WHERE account_number = '1310';
    SELECT category_id INTO cat_escrow_fees FROM landscape.core_unit_cost_category WHERE account_number = '1220';

    -- Log what we found
    RAISE NOTICE 'Category IDs found:';
    RAISE NOTICE '  Due Diligence (1100): %', cat_due_diligence;
    RAISE NOTICE '  Transaction Costs (1200): %', cat_transaction_costs;
    RAISE NOTICE '  Land Cost (1300): %', cat_land_cost;
    RAISE NOTICE '  Earnest Money (1210): %', cat_earnest_money;
    RAISE NOTICE '  Survey (1140): %', cat_survey;
    RAISE NOTICE '  Closing Costs (1310): %', cat_closing_costs;

    -- Validate we have the required categories
    IF cat_due_diligence IS NULL OR cat_transaction_costs IS NULL OR cat_land_cost IS NULL THEN
        RAISE WARNING 'Missing required category IDs. Skipping category assignment.';
        RETURN;
    END IF;

    -- RULE 1: "Closing Costs" → Land Cost category / Closing Costs subcategory
    UPDATE landscape.tbl_acquisition
    SET category_id = cat_land_cost,
        subcategory_id = cat_closing_costs
    WHERE event_type = 'Closing Costs'
      AND category_id IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Closing Costs: % rows updated', rows_updated;

    -- RULE 2: "Deposit" → Transaction Costs / Earnest Money
    UPDATE landscape.tbl_acquisition
    SET category_id = cat_transaction_costs,
        subcategory_id = cat_earnest_money
    WHERE event_type = 'Deposit'
      AND category_id IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Deposit: % rows updated', rows_updated;

    -- RULE 3: "Fee" with survey/ALTA in description → Due Diligence / Survey
    UPDATE landscape.tbl_acquisition
    SET category_id = cat_due_diligence,
        subcategory_id = cat_survey
    WHERE event_type = 'Fee'
      AND category_id IS NULL
      AND (description ILIKE '%survey%' OR description ILIKE '%alta%');
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Fee (survey): % rows updated', rows_updated;

    -- RULE 4: Other "Fee" → Transaction Costs (no subcategory)
    UPDATE landscape.tbl_acquisition
    SET category_id = cat_transaction_costs
    WHERE event_type = 'Fee'
      AND category_id IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Fee (other): % rows updated', rows_updated;

    -- RULE 5: "Credit" → Transaction Costs
    UPDATE landscape.tbl_acquisition
    SET category_id = cat_transaction_costs
    WHERE event_type = 'Credit'
      AND category_id IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Credit: % rows updated', rows_updated;

    -- RULE 6: "Refund" → Transaction Costs / Earnest Money (usually refunded deposits)
    UPDATE landscape.tbl_acquisition
    SET category_id = cat_transaction_costs,
        subcategory_id = cat_earnest_money
    WHERE event_type = 'Refund'
      AND category_id IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Refund: % rows updated', rows_updated;

    -- RULE 7: "Adjustment" → Transaction Costs
    UPDATE landscape.tbl_acquisition
    SET category_id = cat_transaction_costs
    WHERE event_type = 'Adjustment'
      AND category_id IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Adjustment: % rows updated', rows_updated;

    RAISE NOTICE 'Category assignment complete';
END $$;

-- Step 5: Clear categories from milestone events (safety cleanup)
-- ============================================================================
UPDATE landscape.tbl_acquisition
SET category_id = NULL,
    subcategory_id = NULL
WHERE event_type IN ('Milestone', 'Open Escrow', 'Closing Date')
  AND (category_id IS NOT NULL OR subcategory_id IS NOT NULL);

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify success)
-- ============================================================================

-- Verification 1: Check event type distribution
SELECT
    'Event Type Distribution' as check_name,
    event_type,
    COUNT(*) as count
FROM landscape.tbl_acquisition
GROUP BY event_type
ORDER BY event_type;

-- Verification 2: Check for unmigrated event types (should be 0)
SELECT
    'Unmigrated Event Types' as check_name,
    COUNT(*) as count
FROM landscape.tbl_acquisition
WHERE event_type IN ('Closing', 'Effective Date', 'Title Survey');

-- Verification 3: Check project cleanup
SELECT
    'Project Cleanup Status' as check_name,
    project_id,
    project_name,
    is_active,
    acquisition_price,
    asking_price
FROM landscape.tbl_project
WHERE project_id IN (7, 17, 42)
ORDER BY project_id;

-- Verification 4: Category assignment summary
SELECT
    'Category Assignment Summary' as check_name,
    event_type,
    COUNT(*) as total,
    COUNT(category_id) as has_category,
    COUNT(subcategory_id) as has_subcategory
FROM landscape.tbl_acquisition
GROUP BY event_type
ORDER BY event_type;

-- Verification 5: Milestone events should NOT have categories
SELECT
    'Milestones With Categories (should be 0)' as check_name,
    COUNT(*) as count
FROM landscape.tbl_acquisition
WHERE event_type IN ('Milestone', 'Open Escrow', 'Closing Date')
  AND (category_id IS NOT NULL OR subcategory_id IS NOT NULL);

-- Verification 6: Financial events should have categories
SELECT
    'Financial Events Missing Categories' as check_name,
    acquisition_id,
    project_id,
    event_type,
    description,
    amount
FROM landscape.tbl_acquisition
WHERE event_type IN ('Deposit', 'Fee', 'Credit', 'Refund', 'Adjustment', 'Closing Costs')
  AND category_id IS NULL
  AND amount IS NOT NULL
  AND amount > 0
LIMIT 10;

-- Verification 7: Backup table exists and has data
SELECT
    'Backup Table Status' as check_name,
    (SELECT COUNT(*) FROM landscape.tbl_acquisition_backup_20260202) as backup_rows,
    (SELECT COUNT(*) FROM landscape.tbl_acquisition) as current_rows;
