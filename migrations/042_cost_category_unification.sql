-- ============================================================================
-- Migration 042: Cost Category System Unification
-- ============================================================================
-- Purpose: Unify cost categories by:
--   1. Adding OpEx-specific columns to core_unit_cost_category
--   2. Renaming "Development" -> "Improvements" lifecycle stage
--   3. Migrating tbl_opex_accounts INTO core_unit_cost_category
--   4. Adding missing OpEx categories (Payroll, Reserves)
--   5. Updating FK relationships
--   6. Deprecating tbl_opex_accounts
--
-- Dependencies: core_unit_cost_category, core_category_lifecycle_stages,
--               tbl_opex_accounts, tbl_operating_expenses
--
-- Rollback: See ROLLBACK section at bottom
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: SCHEMA PREPARATION
-- ============================================================================

-- 1.1 Add dedicated columns to core_unit_cost_category for OpEx compatibility
ALTER TABLE landscape.core_unit_cost_category
ADD COLUMN IF NOT EXISTS account_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS account_level SMALLINT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_calculated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS property_types TEXT[] DEFAULT ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU', 'LAND'];

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_category_account_number
ON landscape.core_unit_cost_category(account_number)
WHERE account_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_category_property_types
ON landscape.core_unit_cost_category USING GIN(property_types);

CREATE INDEX IF NOT EXISTS idx_category_is_calculated
ON landscape.core_unit_cost_category(is_calculated)
WHERE is_calculated = true;

-- Add column comments
COMMENT ON COLUMN landscape.core_unit_cost_category.account_number IS 'Chart of Accounts code (e.g., 5110, 5200) - from OpEx migration';
COMMENT ON COLUMN landscape.core_unit_cost_category.account_level IS 'Hierarchy depth: 1=parent, 2=child, 3=grandchild';
COMMENT ON COLUMN landscape.core_unit_cost_category.is_calculated IS 'True if this is a rollup parent that sums children';
COMMENT ON COLUMN landscape.core_unit_cost_category.property_types IS 'Array of applicable property type codes';

-- 1.2 Create ID mapping table for rollback/audit and FK updates
CREATE TABLE IF NOT EXISTS landscape.opex_account_migration_map (
    old_account_id INTEGER PRIMARY KEY,
    new_category_id INTEGER NOT NULL,
    account_number VARCHAR(20),
    account_name VARCHAR(255),
    migrated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE landscape.opex_account_migration_map IS
'Mapping table for OpEx account migration to core_unit_cost_category. Used for FK updates and rollback.';

-- 1.3 Drop the existing check constraint
ALTER TABLE landscape.core_category_lifecycle_stages
DROP CONSTRAINT IF EXISTS chk_lifecycle_stage_value;

-- 1.4 Rename "Development" -> "Improvements" lifecycle stage (before re-adding constraint)
UPDATE landscape.core_category_lifecycle_stages
SET activity = 'Improvements',
    updated_at = NOW()
WHERE activity = 'Development';

-- 1.5 Re-add check constraint with new value
ALTER TABLE landscape.core_category_lifecycle_stages
ADD CONSTRAINT chk_lifecycle_stage_value
CHECK (activity IN (
    'Acquisition',
    'Planning & Engineering',
    'Improvements',  -- New name (replaces Development)
    'Operations',
    'Disposition',
    'Financing'
));

-- Log the rename
DO $$
DECLARE
    rows_updated INTEGER;
BEGIN
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Renamed % categories from Development to Improvements', rows_updated;
END $$;

-- ============================================================================
-- PHASE 2: DATA MIGRATION
-- ============================================================================

-- 2.1 Insert all OpEx accounts as categories with Operations activity
-- Process level 1 (parents) first, then level 2, then level 3

-- Level 1 parents
INSERT INTO landscape.core_unit_cost_category (
    category_name,
    parent_id,
    sort_order,
    is_active,
    account_number,
    account_level,
    is_calculated,
    property_types,
    created_at,
    updated_at
)
SELECT
    oa.account_name,
    NULL,
    oa.sort_order,
    oa.is_active,
    oa.account_number,
    oa.account_level,
    oa.is_calculated,
    oa.applicable_property_types,
    oa.created_at,
    NOW()
FROM landscape.tbl_opex_accounts oa
WHERE oa.account_level = 1
ORDER BY oa.sort_order;

-- Record Level 1 mappings
INSERT INTO landscape.opex_account_migration_map (old_account_id, new_category_id, account_number, account_name)
SELECT
    oa.account_id,
    c.category_id,
    c.account_number,
    c.category_name
FROM landscape.tbl_opex_accounts oa
JOIN landscape.core_unit_cost_category c ON c.account_number = oa.account_number
WHERE oa.account_level = 1
  AND c.account_number IS NOT NULL;

-- Level 2 children
INSERT INTO landscape.core_unit_cost_category (
    category_name,
    parent_id,
    sort_order,
    is_active,
    account_number,
    account_level,
    is_calculated,
    property_types,
    created_at,
    updated_at
)
SELECT
    oa.account_name,
    map_parent.new_category_id,
    oa.sort_order,
    oa.is_active,
    oa.account_number,
    oa.account_level,
    oa.is_calculated,
    oa.applicable_property_types,
    oa.created_at,
    NOW()
FROM landscape.tbl_opex_accounts oa
JOIN landscape.opex_account_migration_map map_parent
    ON oa.parent_account_id = map_parent.old_account_id
WHERE oa.account_level = 2
ORDER BY oa.sort_order;

-- Record Level 2 mappings
INSERT INTO landscape.opex_account_migration_map (old_account_id, new_category_id, account_number, account_name)
SELECT
    oa.account_id,
    c.category_id,
    c.account_number,
    c.category_name
FROM landscape.tbl_opex_accounts oa
JOIN landscape.core_unit_cost_category c ON c.account_number = oa.account_number
WHERE oa.account_level = 2
  AND c.account_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM landscape.opex_account_migration_map m WHERE m.old_account_id = oa.account_id
  );

-- Level 3 grandchildren
INSERT INTO landscape.core_unit_cost_category (
    category_name,
    parent_id,
    sort_order,
    is_active,
    account_number,
    account_level,
    is_calculated,
    property_types,
    created_at,
    updated_at
)
SELECT
    oa.account_name,
    map_parent.new_category_id,
    oa.sort_order,
    oa.is_active,
    oa.account_number,
    oa.account_level,
    oa.is_calculated,
    oa.applicable_property_types,
    oa.created_at,
    NOW()
FROM landscape.tbl_opex_accounts oa
JOIN landscape.opex_account_migration_map map_parent
    ON oa.parent_account_id = map_parent.old_account_id
WHERE oa.account_level = 3
ORDER BY oa.sort_order;

-- Record Level 3 mappings
INSERT INTO landscape.opex_account_migration_map (old_account_id, new_category_id, account_number, account_name)
SELECT
    oa.account_id,
    c.category_id,
    c.account_number,
    c.category_name
FROM landscape.tbl_opex_accounts oa
JOIN landscape.core_unit_cost_category c ON c.account_number = oa.account_number
WHERE oa.account_level = 3
  AND c.account_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM landscape.opex_account_migration_map m WHERE m.old_account_id = oa.account_id
  );

-- 2.2 Link all migrated OpEx categories to "Operations" activity
INSERT INTO landscape.core_category_lifecycle_stages (category_id, activity, sort_order, created_at)
SELECT
    new_category_id,
    'Operations',
    ROW_NUMBER() OVER (ORDER BY account_number)::INTEGER,
    NOW()
FROM landscape.opex_account_migration_map;

-- 2.3 Add missing categories: Payroll & Personnel
INSERT INTO landscape.core_unit_cost_category (
    category_name, parent_id, sort_order, is_active, account_number, account_level, is_calculated, property_types
) VALUES
    ('Payroll & Personnel', NULL, 550, true, '5550', 1, true, ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']);

-- Get the Payroll parent ID and add children
DO $$
DECLARE
    payroll_parent_id INTEGER;
    reserves_parent_id INTEGER;
BEGIN
    SELECT category_id INTO payroll_parent_id
    FROM landscape.core_unit_cost_category
    WHERE account_number = '5550';

    INSERT INTO landscape.core_unit_cost_category (
        category_name, parent_id, sort_order, is_active, account_number, account_level, is_calculated, property_types
    ) VALUES
        ('On-Site Manager Salary', payroll_parent_id, 551, true, '5551', 2, false, ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']),
        ('Manager Rent Credit', payroll_parent_id, 552, true, '5552', 2, false, ARRAY['MF']),
        ('Leasing Staff', payroll_parent_id, 553, true, '5553', 2, false, ARRAY['MF', 'OFF', 'RET']),
        ('Maintenance Staff', payroll_parent_id, 554, true, '5554', 2, false, ARRAY['MF', 'OFF', 'RET', 'IND']),
        ('Payroll Taxes', payroll_parent_id, 555, true, '5555', 2, false, ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']),
        ('Employee Benefits', payroll_parent_id, 556, true, '5556', 2, false, ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']);

    -- Add Reserves parent
    INSERT INTO landscape.core_unit_cost_category (
        category_name, parent_id, sort_order, is_active, account_number, account_level, is_calculated, property_types
    ) VALUES
        ('Reserves', NULL, 990, true, '5990', 1, true, ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']);

    SELECT category_id INTO reserves_parent_id
    FROM landscape.core_unit_cost_category
    WHERE account_number = '5990';

    INSERT INTO landscape.core_unit_cost_category (
        category_name, parent_id, sort_order, is_active, account_number, account_level, is_calculated, property_types
    ) VALUES
        ('Replacement Reserves', reserves_parent_id, 991, true, '5991', 2, false, ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']),
        ('Capital Expenditure Reserve', reserves_parent_id, 992, true, '5992', 2, false, ARRAY['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']);
END $$;

-- Link new Payroll & Reserves categories to Operations activity
INSERT INTO landscape.core_category_lifecycle_stages (category_id, activity, sort_order, created_at)
SELECT category_id, 'Operations', sort_order, NOW()
FROM landscape.core_unit_cost_category
WHERE account_number IN ('5550', '5551', '5552', '5553', '5554', '5555', '5556', '5990', '5991', '5992');

-- ============================================================================
-- PHASE 3: UPDATE PG FUNCTIONS
-- ============================================================================

-- 3.1 Fix the broken get_category_stages function (uses wrong column name)
CREATE OR REPLACE FUNCTION landscape.get_category_stages(p_category_id INTEGER)
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT activity  -- Fixed: was incorrectly 'lifecycle_stage'
        FROM landscape.core_category_lifecycle_stages
        WHERE category_id = p_category_id
        ORDER BY activity
    );
END;
$$ LANGUAGE plpgsql;

-- 3.2 Create new calculate_opex_account_total using core_unit_cost_category
-- First drop the old version
DROP FUNCTION IF EXISTS landscape.calculate_opex_account_total(INTEGER, INTEGER);

-- Create new version
CREATE OR REPLACE FUNCTION landscape.calculate_opex_account_total(
    p_project_id INTEGER,
    p_category_id INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC := 0;
    v_is_calculated BOOLEAN;
BEGIN
    -- Check if this is a rollup parent
    SELECT is_calculated INTO v_is_calculated
    FROM landscape.core_unit_cost_category
    WHERE category_id = p_category_id;

    IF v_is_calculated THEN
        -- Sum children recursively
        SELECT COALESCE(SUM(
            landscape.calculate_opex_account_total(p_project_id, c.category_id)
        ), 0)
        INTO v_total
        FROM landscape.core_unit_cost_category c
        WHERE c.parent_id = p_category_id
          AND c.is_active = true;
    ELSE
        -- Get direct expense value - note: column may be account_id or category_id
        SELECT COALESCE(SUM(oe.annual_amount), 0)
        INTO v_total
        FROM landscape.tbl_operating_expenses oe
        WHERE oe.project_id = p_project_id
          AND oe.account_id = p_category_id;
    END IF;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.calculate_opex_account_total(INTEGER, INTEGER) IS
'Calculates total operating expenses for a category. For rollup parents (is_calculated=true),
recursively sums children. For leaf categories, sums direct expense entries.';

-- ============================================================================
-- PHASE 4: UPDATE FK RELATIONSHIPS
-- ============================================================================

-- 4.1 Add category_id column to tbl_operating_expenses (keep account_id for now)
ALTER TABLE landscape.tbl_operating_expenses
ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- 4.2 Backfill category_id using the mapping table
UPDATE landscape.tbl_operating_expenses oe
SET category_id = map.new_category_id
FROM landscape.opex_account_migration_map map
WHERE oe.account_id = map.old_account_id;

-- 4.3 For any remaining records, try to match by account_id directly
-- (in case some were already using category IDs)
UPDATE landscape.tbl_operating_expenses oe
SET category_id = oe.account_id
WHERE oe.category_id IS NULL
  AND EXISTS (
    SELECT 1 FROM landscape.core_unit_cost_category c
    WHERE c.category_id = oe.account_id
  );

-- 4.4 Add FK constraint for new column
ALTER TABLE landscape.tbl_operating_expenses
ADD CONSTRAINT fk_operating_expenses_category
FOREIGN KEY (category_id) REFERENCES landscape.core_unit_cost_category(category_id);

-- 4.5 Create index on new column
CREATE INDEX IF NOT EXISTS idx_operating_expenses_category_id
ON landscape.tbl_operating_expenses(category_id);

-- ============================================================================
-- PHASE 5: DEPRECATE OLD TABLE
-- ============================================================================

-- 5.1 Rename old table (keep for 30 days as backup)
ALTER TABLE landscape.tbl_opex_accounts
RENAME TO tbl_opex_accounts_deprecated;

COMMENT ON TABLE landscape.tbl_opex_accounts_deprecated IS
'DEPRECATED 2024-12: Migrated to core_unit_cost_category with activity=Operations.
Safe to drop after 30 days. See opex_account_migration_map for ID mappings.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify category counts by activity
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== Category Counts by Activity ===';
    FOR rec IN
        SELECT
            cls.activity,
            COUNT(*) as category_count
        FROM landscape.core_unit_cost_category c
        JOIN landscape.core_category_lifecycle_stages cls ON c.category_id = cls.category_id
        WHERE c.is_active = true
        GROUP BY cls.activity
        ORDER BY cls.activity
    LOOP
        RAISE NOTICE '%: %', rec.activity, rec.category_count;
    END LOOP;
END $$;

-- Verify migration mapping count
DO $$
DECLARE
    mapping_count INTEGER;
    expense_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapping_count FROM landscape.opex_account_migration_map;
    RAISE NOTICE 'Migration mappings created: %', mapping_count;

    SELECT COUNT(*) INTO expense_orphans
    FROM landscape.tbl_operating_expenses
    WHERE category_id IS NULL;
    RAISE NOTICE 'Expense records without category_id: %', expense_orphans;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SECTION (run manually if needed)
-- ============================================================================
/*
-- To rollback this migration:

BEGIN;

-- 1. Restore old table name
ALTER TABLE landscape.tbl_opex_accounts_deprecated
RENAME TO tbl_opex_accounts;

-- 2. Remove new columns from core_unit_cost_category
ALTER TABLE landscape.core_unit_cost_category
DROP COLUMN IF EXISTS account_number,
DROP COLUMN IF EXISTS account_level,
DROP COLUMN IF EXISTS is_calculated,
DROP COLUMN IF EXISTS property_types;

-- 3. Remove Operations categories that were migrated
DELETE FROM landscape.core_category_lifecycle_stages
WHERE activity = 'Operations';

DELETE FROM landscape.core_unit_cost_category
WHERE account_number IS NOT NULL;

-- 4. Revert "Improvements" back to "Development"
UPDATE landscape.core_category_lifecycle_stages
SET activity = 'Development'
WHERE activity = 'Improvements';

-- 5. Drop mapping table
DROP TABLE IF EXISTS landscape.opex_account_migration_map;

-- 6. Revert FK changes
ALTER TABLE landscape.tbl_operating_expenses
DROP CONSTRAINT IF EXISTS fk_operating_expenses_category;

ALTER TABLE landscape.tbl_operating_expenses
DROP COLUMN IF EXISTS category_id;

-- 7. Restore original function
-- (Would need to restore from backup)

COMMIT;
*/
