-- ============================================================================
-- Migration 0018: Rename Unit Cost Template Tables to Item Tables
-- ============================================================================
-- Purpose: Eliminate confusion between page templates and cost line items
--          "Template" implies reusable pattern; these are individual cost items
-- Date: 2025-11-09
-- Author: Claude Code
-- Dependencies: Migration 0017 (Category Lifecycle Pivot)
-- Impact: 2 tables, 1 junction table, all FK references
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: RENAME MAIN TABLE
-- ============================================================================

ALTER TABLE landscape.core_unit_cost_template
  RENAME TO core_unit_cost_item;

COMMENT ON TABLE landscape.core_unit_cost_item IS
  'Individual cost line items within categories (formerly called templates).
   Each item represents a specific cost element (e.g., "Preliminary Plat", "Landscape Plans").';

-- ============================================================================
-- STEP 2: RENAME PRIMARY KEY COLUMN
-- ============================================================================

ALTER TABLE landscape.core_unit_cost_item
  RENAME COLUMN template_id TO item_id;

COMMENT ON COLUMN landscape.core_unit_cost_item.item_id IS
  'Primary key for cost items (renamed from template_id in migration 0018)';

-- ============================================================================
-- STEP 3: RENAME SEQUENCE
-- ============================================================================

ALTER SEQUENCE landscape.core_unit_cost_template_template_id_seq
  RENAME TO core_unit_cost_item_item_id_seq;

-- ============================================================================
-- STEP 4: UPDATE SEQUENCE OWNERSHIP
-- ============================================================================

ALTER TABLE landscape.core_unit_cost_item
  ALTER COLUMN item_id SET DEFAULT nextval('landscape.core_unit_cost_item_item_id_seq'::regclass);

-- ============================================================================
-- STEP 5: RENAME JUNCTION TABLE
-- ============================================================================

ALTER TABLE landscape.core_template_benchmark_link
  RENAME TO core_item_benchmark_link;

COMMENT ON TABLE landscape.core_item_benchmark_link IS
  'Many-to-many relationship between cost items and benchmarks';

-- ============================================================================
-- STEP 6: RENAME FOREIGN KEY COLUMN IN JUNCTION TABLE
-- ============================================================================

ALTER TABLE landscape.core_item_benchmark_link
  RENAME COLUMN template_id TO item_id;

COMMENT ON COLUMN landscape.core_item_benchmark_link.item_id IS
  'Foreign key to cost item (renamed from template_id in migration 0018)';

-- ============================================================================
-- STEP 7: RENAME PRIMARY KEY CONSTRAINT
-- ============================================================================

ALTER INDEX IF EXISTS landscape.core_unit_cost_template_pkey
  RENAME TO core_unit_cost_item_pkey;

ALTER INDEX IF EXISTS landscape.core_template_benchmark_link_pkey
  RENAME TO core_item_benchmark_link_pkey;

-- ============================================================================
-- STEP 8: UPDATE FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Drop old FK constraint
ALTER TABLE landscape.core_item_benchmark_link
  DROP CONSTRAINT IF EXISTS core_template_benchmark_link_template_id_fkey;

ALTER TABLE landscape.core_item_benchmark_link
  DROP CONSTRAINT IF EXISTS fk_template_benchmark_template;

-- Add new FK constraint with updated name
ALTER TABLE landscape.core_item_benchmark_link
  ADD CONSTRAINT core_item_benchmark_link_item_id_fkey
  FOREIGN KEY (item_id)
  REFERENCES landscape.core_unit_cost_item(item_id)
  ON DELETE CASCADE;

-- Update FK from categories table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'landscape'
    AND table_name = 'core_unit_cost_item'
    AND constraint_name LIKE '%template%'
  ) THEN
    -- Find and rename any FK constraints with 'template' in the name
    EXECUTE (
      SELECT 'ALTER TABLE landscape.core_unit_cost_item RENAME CONSTRAINT ' ||
             constraint_name || ' TO ' ||
             REPLACE(constraint_name, 'template', 'item')
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'landscape'
      AND table_name = 'core_unit_cost_item'
      AND constraint_name LIKE '%template%'
      LIMIT 1
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 9: RENAME INDEXES
-- ============================================================================

ALTER INDEX IF EXISTS landscape.idx_unit_cost_template_category
  RENAME TO idx_unit_cost_item_category;

ALTER INDEX IF EXISTS landscape.idx_template_benchmark_link_template
  RENAME TO idx_item_benchmark_link_item;

ALTER INDEX IF EXISTS landscape.idx_template_benchmark_link_benchmark
  RENAME TO idx_item_benchmark_link_benchmark;

ALTER INDEX IF EXISTS landscape.idx_unit_cost_template_active
  RENAME TO idx_unit_cost_item_active;

ALTER INDEX IF EXISTS landscape.idx_unit_cost_template_project_type
  RENAME TO idx_unit_cost_item_project_type;

-- ============================================================================
-- STEP 10: UPDATE ANY MATERIALIZED VIEWS OR FUNCTIONS
-- ============================================================================

-- Check for any functions that reference the old table
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT proname, prosrc
    FROM pg_proc
    WHERE prosrc LIKE '%core_unit_cost_template%'
  LOOP
    RAISE NOTICE 'WARNING: Function % contains reference to old table name', func_record.proname;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table rename
DO $$
DECLARE
  item_table_exists BOOLEAN;
  template_table_exists BOOLEAN;
  item_count INTEGER;
BEGIN
  -- Check new table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'landscape'
    AND table_name = 'core_unit_cost_item'
  ) INTO item_table_exists;

  -- Check old table is gone
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'landscape'
    AND table_name = 'core_unit_cost_template'
  ) INTO template_table_exists;

  -- Count items in new table
  SELECT COUNT(*) INTO item_count FROM landscape.core_unit_cost_item;

  RAISE NOTICE 'Migration Verification:';
  RAISE NOTICE '  New table exists: %', item_table_exists;
  RAISE NOTICE '  Old table removed: %', NOT template_table_exists;
  RAISE NOTICE '  Item count: %', item_count;

  IF NOT item_table_exists THEN
    RAISE EXCEPTION 'Migration failed: core_unit_cost_item table does not exist';
  END IF;

  IF template_table_exists THEN
    RAISE EXCEPTION 'Migration failed: old core_unit_cost_template table still exists';
  END IF;
END $$;

-- Display junction table info
SELECT
  COUNT(*) as link_count,
  COUNT(DISTINCT item_id) as unique_items,
  COUNT(DISTINCT benchmark_id) as unique_benchmarks
FROM landscape.core_item_benchmark_link;

-- Display any remaining references to 'template' in schema
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND (table_name LIKE '%template%' OR column_name LIKE '%template%')
  AND table_name NOT LIKE 'core_category_template%' -- Exclude budget category templates
ORDER BY table_name, column_name;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed - run separately)
-- ============================================================================

/*
BEGIN;

-- Revert table names
ALTER TABLE landscape.core_unit_cost_item RENAME TO core_unit_cost_template;
ALTER TABLE landscape.core_item_benchmark_link RENAME TO core_template_benchmark_link;

-- Revert column names
ALTER TABLE landscape.core_unit_cost_template RENAME COLUMN item_id TO template_id;
ALTER TABLE landscape.core_template_benchmark_link RENAME COLUMN item_id TO template_id;

-- Revert sequence
ALTER SEQUENCE landscape.core_unit_cost_item_item_id_seq RENAME TO core_unit_cost_template_template_id_seq;
ALTER TABLE landscape.core_unit_cost_template ALTER COLUMN template_id SET DEFAULT nextval('landscape.core_unit_cost_template_template_id_seq'::regclass);

-- Revert FK constraints
ALTER TABLE landscape.core_template_benchmark_link DROP CONSTRAINT IF EXISTS core_item_benchmark_link_item_id_fkey;
ALTER TABLE landscape.core_template_benchmark_link ADD CONSTRAINT core_template_benchmark_link_template_id_fkey FOREIGN KEY (template_id) REFERENCES landscape.core_unit_cost_template(template_id) ON DELETE CASCADE;

-- Revert indexes
ALTER INDEX IF EXISTS landscape.core_unit_cost_item_pkey RENAME TO core_unit_cost_template_pkey;
ALTER INDEX IF EXISTS landscape.core_item_benchmark_link_pkey RENAME TO core_template_benchmark_link_pkey;
ALTER INDEX IF EXISTS landscape.idx_unit_cost_item_category RENAME TO idx_unit_cost_template_category;
ALTER INDEX IF EXISTS landscape.idx_item_benchmark_link_item RENAME TO idx_template_benchmark_link_template;
ALTER INDEX IF EXISTS landscape.idx_item_benchmark_link_benchmark RENAME TO idx_template_benchmark_link_benchmark;

COMMIT;
*/
