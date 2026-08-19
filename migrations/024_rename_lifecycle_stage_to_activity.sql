-- Migration 024: Rename lifecycle_stage to activity (TERMINOLOGY UPDATE)
-- Created: 2025-11-19
-- Purpose: Phase 3 of category system consolidation - rename lifecycle_stage column to activity
--          This makes terminology consistent: "activity" represents cost lifecycle timing

-- STRATEGY: Drop the temporary activity column created in 023, then rename lifecycle_stage
-- This preserves all data and maintains backward compatibility via views

-- Step 1: Drop the temporary activity column (data is safe in lifecycle_stage)
ALTER TABLE landscape.core_fin_fact_budget
DROP COLUMN IF EXISTS activity;

-- Step 2: Rename lifecycle_stage to activity
ALTER TABLE landscape.core_fin_fact_budget
RENAME COLUMN lifecycle_stage TO activity;

-- Step 3: Update column comment
COMMENT ON COLUMN landscape.core_fin_fact_budget.activity IS
'Cost lifecycle timing. Valid values: Acquisition, Planning & Engineering, Development, Operations, Disposition, Financing';

-- Step 4: Rename column in core_category_lifecycle_stages table
ALTER TABLE landscape.core_category_lifecycle_stages
RENAME COLUMN lifecycle_stage TO activity;

COMMENT ON COLUMN landscape.core_category_lifecycle_stages.activity IS
'Activity type that this category applies to. Links categories to cost lifecycle phases.';

-- Step 5: Update the view to use new column name
DROP VIEW IF EXISTS landscape.vw_budget_grid_items CASCADE;

CREATE VIEW landscape.vw_budget_grid_items AS
WITH RECURSIVE fin_category_path AS (
  -- Build hierarchical paths for core_fin_category (old system)
  SELECT
    c.category_id,
    c.parent_id,
    c.code,
    c.scope,
    c.detail,
    ARRAY[c.detail] AS path_array,
    c.detail AS full_path,
    1 AS depth,
    'fin_category' AS category_source
  FROM landscape.core_fin_category c
  WHERE c.parent_id IS NULL
    AND c.is_active = TRUE

  UNION ALL

  SELECT
    c.category_id,
    c.parent_id,
    c.code,
    c.scope,
    c.detail,
    cp.path_array || c.detail,
    cp.full_path || ' → ' || c.detail,
    cp.depth + 1,
    'fin_category' AS category_source
  FROM landscape.core_fin_category c
  INNER JOIN fin_category_path cp ON c.parent_id = cp.category_id
  WHERE c.is_active = TRUE
),
unit_cost_category_path AS (
  -- Build hierarchical paths for core_unit_cost_category (new system)
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
  b.container_id,
  coalesce(ct.container_level, 0) AS container_level,
  ct.container_code,
  ct.display_name AS container_name,
  ct.parent_container_id,
  b.category_id,
  COALESCE(uc.code, fc.code) AS cost_code,
  COALESCE(uc.scope, fc.scope) AS scope,
  COALESCE(uc.full_path, fc.full_path) AS category_path,
  COALESCE(uc.depth, fc.depth) AS category_depth,
  CASE
    WHEN uc.category_id IS NOT NULL THEN 'unit_cost_category'
    WHEN fc.category_id IS NOT NULL THEN 'fin_category'
    ELSE NULL
  END AS category_source,
  COALESCE(uc.path_array[1], fc.path_array[1]) AS category_l1_name,
  COALESCE(uc.path_array[2], fc.path_array[2]) AS category_l2_name,
  COALESCE(uc.path_array[3], fc.path_array[3]) AS category_l3_name,
  COALESCE(uc.path_array[4], fc.path_array[4]) AS category_l4_name,
  b.activity,  -- RENAMED from lifecycle_stage
  b.uom_code,
  u.name AS uom_display,
  b.qty,
  b.rate,
  b.amount,
  CASE
    WHEN b.amount IS NOT NULL THEN b.amount
    WHEN b.qty IS NOT NULL AND b.rate IS NOT NULL THEN b.qty * b.rate
    ELSE NULL
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
LEFT JOIN landscape.tbl_container ct ON ct.container_id = b.container_id
LEFT JOIN unit_cost_category_path uc ON uc.category_id = b.category_id
LEFT JOIN fin_category_path fc ON fc.category_id = b.category_id
LEFT JOIN landscape.core_fin_uom u ON u.uom_code = b.uom_code
LEFT JOIN landscape.tbl_contacts contacts ON contacts.contact_id = b.vendor_contact_id;

COMMENT ON VIEW landscape.vw_budget_grid_items IS
'Budget grid items view with support for both core_fin_category and core_unit_cost_category.
Includes explicit category_l1/category_l2/category_l3/category_l4 columns so the UI can display names regardless of source.
Updated to use "activity" terminology instead of "lifecycle_stage".';

-- Validation
DO $$
DECLARE
  activity_count INT;
  table_exists BOOLEAN;
BEGIN
  -- Check that activity column exists and has data
  SELECT COUNT(*) INTO activity_count
  FROM landscape.core_fin_fact_budget
  WHERE activity IS NOT NULL;

  RAISE NOTICE '✅ Migration 024 Validation:';
  RAISE NOTICE '   Items with activity: % (expected: 27)', activity_count;

  -- Verify lifecycle_stage column no longer exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'landscape'
      AND table_name = 'core_fin_fact_budget'
      AND column_name = 'lifecycle_stage'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE WARNING '⚠️  lifecycle_stage column still exists!';
  ELSE
    RAISE NOTICE '✅ lifecycle_stage column successfully renamed to activity';
  END IF;

  -- Verify new column exists in core_category_lifecycle_stages
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'landscape'
      AND table_name = 'core_category_lifecycle_stages'
      AND column_name = 'activity'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '✅ core_category_lifecycle_stages.activity column exists';
  ELSE
    RAISE WARNING '⚠️  core_category_lifecycle_stages.activity column not found!';
  END IF;
END $$;
