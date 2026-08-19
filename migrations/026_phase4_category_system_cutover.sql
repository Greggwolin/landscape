-- Migration 026: Phase 4 - Category System Cutover
-- Created: 2025-11-19
-- Purpose: Drop old core_fin_category table and consolidate to single-source category system
-- BREAKING CHANGE: This migration removes backward compatibility with the old category system

-- ============================================
-- PRE-FLIGHT VALIDATION
-- ============================================

DO $$
DECLARE
  orphaned_count INT;
  old_table_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  -- Check for orphaned category references
  SELECT COUNT(*) INTO orphaned_count
  FROM landscape.core_fin_fact_budget fb
  LEFT JOIN landscape.core_unit_cost_category ucc ON fb.category_id = ucc.category_id
  WHERE fb.category_id IS NOT NULL
    AND ucc.category_id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'BLOCKER: Found % budget items with orphaned category references. Fix before Phase 4.', orphaned_count;
  END IF;

  -- Verify old table exists (otherwise nothing to drop)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'core_fin_category'
    AND table_schema = 'landscape'
  ) INTO old_table_exists;

  IF NOT old_table_exists THEN
    RAISE NOTICE 'core_fin_category table already dropped - Phase 4 may have already run';
  END IF;

  -- Verify view exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'vw_budget_grid_items'
    AND table_schema = 'landscape'
  ) INTO view_exists;

  IF NOT view_exists THEN
    RAISE EXCEPTION 'BLOCKER: vw_budget_grid_items view missing. Cannot proceed with Phase 4.';
  END IF;

  RAISE NOTICE '✅ Pre-flight validation passed';
END $$;

-- ============================================
-- STEP 1: Backup Old Category Table (for rollback)
-- ============================================

-- Create backup table with timestamp
CREATE TABLE IF NOT EXISTS landscape.core_fin_category_backup_20251119 AS
SELECT * FROM landscape.core_fin_category;

COMMENT ON TABLE landscape.core_fin_category_backup_20251119 IS
'Backup of core_fin_category before Phase 4 cutover on 2025-11-19. Kept for rollback purposes.';

-- ============================================
-- STEP 2: Update Budget Grid View (Remove Dual System)
-- ============================================

-- Drop existing view
DROP VIEW IF EXISTS landscape.vw_budget_grid_items CASCADE;

-- Recreate view with ONLY unit_cost_category support
CREATE VIEW landscape.vw_budget_grid_items AS
WITH RECURSIVE unit_cost_category_path AS (
  -- Build hierarchical paths for core_unit_cost_category
  SELECT
    c.category_id,
    c.parent_id,
    NULL::text AS code,
    NULL::text AS scope,
    c.category_name::text AS detail,
    ARRAY[c.category_name::text] AS path_array,
    c.category_name::text AS full_path,
    1 AS depth,
    'unit_cost_category' AS category_source
  FROM landscape.core_unit_cost_category c
  WHERE c.parent_id IS NULL
    AND c.is_active = TRUE

  UNION ALL

  SELECT
    c.category_id,
    c.parent_id,
    NULL::text AS code,
    NULL::text AS scope,
    c.category_name::text AS detail,
    cp.path_array || c.category_name::text,
    cp.full_path || ' → ' || c.category_name::text,
    cp.depth + 1,
    'unit_cost_category' AS category_source
  FROM landscape.core_unit_cost_category c
  INNER JOIN unit_cost_category_path cp ON c.parent_id = cp.category_id
  WHERE c.is_active = TRUE
)
SELECT
  b.fact_id,
  b.budget_id,
  bv.name AS budget_version,
  b.project_id,
  b.division_id,
  d.tier,
  d.division_code,
  d.display_name AS division_name,
  d.parent_division_id,
  b.category_id,
  uc.code AS cost_code,
  uc.scope,
  uc.full_path AS category_path,
  uc.depth AS category_depth,
  uc.category_source,
  uc.path_array[1] AS category_l1_name,
  uc.path_array[2] AS category_l2_name,
  uc.path_array[3] AS category_l3_name,
  uc.path_array[4] AS category_l4_name,
  b.activity,
  b.uom_code,
  u.name AS uom_display,
  b.qty,
  b.rate,
  b.amount,
  CASE
    WHEN b.amount IS NOT NULL THEN b.amount
    WHEN b.qty IS NOT NULL AND b.rate IS NOT NULL THEN b.qty * b.rate
    ELSE 0
  END AS calculated_amount,
  b.start_date,
  b.end_date,
  b.escalation_rate,
  b.contingency_pct,
  b.timing_method,
  b.contract_number,
  b.purchase_order,
  b.is_committed,
  b.confidence_level,
  b.vendor_contact_id,
  contacts.company_name AS vendor_name,
  b.notes,
  b.created_at
FROM landscape.core_fin_fact_budget b
INNER JOIN landscape.core_fin_budget_version bv ON bv.budget_id = b.budget_id
LEFT JOIN landscape.tbl_division d ON d.division_id = b.division_id
LEFT JOIN unit_cost_category_path uc ON uc.category_id = b.category_id
LEFT JOIN landscape.core_fin_uom u ON u.uom_code = b.uom_code
LEFT JOIN landscape.tbl_contacts contacts ON contacts.contact_id = b.vendor_contact_id;

COMMENT ON VIEW landscape.vw_budget_grid_items IS
'Budget grid items view (Phase 4+). Uses ONLY core_unit_cost_category for single-source categorization.
Supports NULL category_id for progressive complexity (MVP napkin-mode budgets).
Updated column names: division_id, tier, activity (Phase 3 terminology).';

-- ============================================
-- STEP 3: Drop Old Category Tables and Views
-- ============================================

-- Drop any views that depend on core_fin_category (if any)
-- Note: vw_budget_grid_items already updated above

-- Drop the old category system table
DROP TABLE IF EXISTS landscape.core_fin_category CASCADE;

RAISE NOTICE '✅ Dropped core_fin_category table';

-- Drop old applicability table if it exists
DROP TABLE IF EXISTS landscape.core_fin_container_applicability CASCADE;

RAISE NOTICE '✅ Dropped core_fin_container_applicability table (legacy)';

-- ============================================
-- STEP 4: Update Table Comments for Clarity
-- ============================================

COMMENT ON TABLE landscape.core_unit_cost_category IS
'Universal category taxonomy for cost/revenue items across all property types (Phase 4+).
Single source of truth for budget categorization. Categories belong to activities via core_category_lifecycle_stages.';

COMMENT ON TABLE landscape.core_fin_fact_budget IS
'Budget line items with optional categorization (category_id can be NULL for MVP).
Uses core_unit_cost_category for single-source categorization (Phase 4+).';

COMMENT ON COLUMN landscape.core_fin_fact_budget.category_id IS
'References core_unit_cost_category.category_id. NULL allowed for napkin-mode / progressive complexity.';

COMMENT ON COLUMN landscape.core_fin_fact_budget.activity IS
'Budget activity: Acquisition, Planning & Engineering, Development, Operations, Disposition, Financing.
Filters available categories via core_category_lifecycle_stages.';

-- ============================================
-- STEP 5: Validation
-- ============================================

DO $$
DECLARE
  view_row_count INT;
  category_count INT;
  budget_count INT;
  old_table_exists BOOLEAN;
  view_column_count INT;
BEGIN
  -- Verify view returns data
  SELECT COUNT(*) INTO view_row_count
  FROM landscape.vw_budget_grid_items
  LIMIT 100;

  -- Count active categories
  SELECT COUNT(*) INTO category_count
  FROM landscape.core_unit_cost_category
  WHERE is_active = TRUE;

  -- Count budget items
  SELECT COUNT(*) INTO budget_count
  FROM landscape.core_fin_fact_budget;

  -- Verify old table is gone
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'core_fin_category'
    AND table_schema = 'landscape'
  ) INTO old_table_exists;

  -- Check view has correct columns (should use division_id, tier, activity)
  SELECT COUNT(*) INTO view_column_count
  FROM information_schema.columns
  WHERE table_name = 'vw_budget_grid_items'
    AND table_schema = 'landscape'
    AND column_name IN ('division_id', 'tier', 'activity', 'category_path');

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 026 Validation:';
  RAISE NOTICE '   Budget grid view rows: % (sample)', view_row_count;
  RAISE NOTICE '   Active categories: %', category_count;
  RAISE NOTICE '   Total budget items: %', budget_count;
  RAISE NOTICE '   Old core_fin_category exists: %', old_table_exists;
  RAISE NOTICE '   View columns verified: %/4', view_column_count;
  RAISE NOTICE '========================================';

  IF old_table_exists THEN
    RAISE WARNING '⚠️  Old core_fin_category table still exists - drop may have failed';
  END IF;

  IF view_column_count < 4 THEN
    RAISE WARNING '⚠️  View missing expected columns - check view definition';
  END IF;

  IF view_row_count > 0 AND category_count > 0 AND NOT old_table_exists AND view_column_count = 4 THEN
    RAISE NOTICE '✅ All validation checks passed!';
    RAISE NOTICE '🎉 Phase 4 Category System Cutover COMPLETE';
  ELSE
    RAISE WARNING '⚠️  Some validation checks failed - review output above';
  END IF;
END $$;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================

/*
To rollback Phase 4 (restore dual-category system):

1. Restore the old category table:
   CREATE TABLE landscape.core_fin_category AS
   SELECT * FROM landscape.core_fin_category_backup_20251119;

2. Re-run migration 022 to restore dual-system view:
   \i migrations/022_fix_budget_grid_view_unit_cost_categories.sql

3. Verify:
   SELECT COUNT(*) FROM landscape.core_fin_category;
   SELECT * FROM landscape.vw_budget_grid_items LIMIT 5;

Note: Only rollback if critical issues found. Phase 4 is designed to be forward-only.
*/
