-- ============================================================================
-- Migration 0021: Add Lifecycle Stage Column to Budget Items
-- ============================================================================
-- Purpose: Add lifecycle_stage column to budget fact table for categorization
-- Author: Landscape Development Team
-- Date: 2025-11-18
-- Dependencies: Migration 0020 (Planning & Engineering Lifecycle Stage)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ADD LIFECYCLE_STAGE COLUMN
-- ============================================================================

ALTER TABLE landscape.core_fin_fact_budget
ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50) NULL;

-- ============================================================================
-- STEP 2: ADD CHECK CONSTRAINT FOR VALID VALUES
-- ============================================================================

ALTER TABLE landscape.core_fin_fact_budget
ADD CONSTRAINT chk_budget_lifecycle_stage
CHECK (lifecycle_stage IS NULL OR lifecycle_stage IN (
  'Acquisition',
  'Planning & Engineering',
  'Development',
  'Operations',
  'Disposition',
  'Financing'
));

-- ============================================================================
-- STEP 3: CREATE INDEX FOR FILTERING PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_budget_lifecycle_stage
ON landscape.core_fin_fact_budget(lifecycle_stage);

-- ============================================================================
-- STEP 4: POPULATE EXISTING RECORDS BASED ON CATEGORY CODES
-- ============================================================================
-- This migration maps existing budget items to lifecycle stages based on
-- their category codes using pattern matching

UPDATE landscape.core_fin_fact_budget fb
SET lifecycle_stage =
  CASE
    -- Acquisition stage
    WHEN EXISTS (
      SELECT 1 FROM landscape.core_fin_category fc
      WHERE fc.category_id IN (fb.category_l1_id, fb.category_l2_id, fb.category_l3_id, fb.category_l4_id)
        AND fc.code LIKE 'USE-ACQ-%'
    ) THEN 'Acquisition'

    -- Planning & Engineering stage (Stage 1 & 2)
    WHEN EXISTS (
      SELECT 1 FROM landscape.core_fin_category fc
      WHERE fc.category_id IN (fb.category_l1_id, fb.category_l2_id, fb.category_l3_id, fb.category_l4_id)
        AND (fc.code LIKE 'USE-STG1-%' OR fc.code LIKE 'USE-STG2-%')
    ) THEN 'Planning & Engineering'

    -- Development stage (Stage 3 + Project Management + Overhead)
    WHEN EXISTS (
      SELECT 1 FROM landscape.core_fin_category fc
      WHERE fc.category_id IN (fb.category_l1_id, fb.category_l2_id, fb.category_l3_id, fb.category_l4_id)
        AND (
          fc.code LIKE 'USE-STG3-%' OR
          fc.code LIKE 'USE-PRJ-MGT%' OR
          fc.code LIKE 'USE-PRJ-OVH%'
        )
    ) THEN 'Development'

    -- Financing stage (Capital costs)
    WHEN EXISTS (
      SELECT 1 FROM landscape.core_fin_category fc
      WHERE fc.category_id IN (fb.category_l1_id, fb.category_l2_id, fb.category_l3_id, fb.category_l4_id)
        AND fc.code LIKE 'USE-PRJ-CAP%'
    ) THEN 'Financing'

    -- Operations stage (if we have operational categories in the future)
    -- Currently no operational budget items expected in development budget

    -- Disposition stage (if we have disposition categories in the future)
    -- Currently no disposition budget items expected in development budget

    -- Default: leave as NULL if no pattern matches
    ELSE NULL
  END
WHERE fb.lifecycle_stage IS NULL;

-- ============================================================================
-- STEP 5: VERIFICATION - Show distribution of lifecycle stages
-- ============================================================================

SELECT
  COALESCE(lifecycle_stage, 'Not Assigned') as lifecycle_stage,
  COUNT(*) as budget_item_count,
  ROUND(SUM(amount)::numeric, 2) as total_amount
FROM landscape.core_fin_fact_budget
GROUP BY lifecycle_stage
ORDER BY
  CASE lifecycle_stage
    WHEN 'Acquisition' THEN 1
    WHEN 'Planning & Engineering' THEN 2
    WHEN 'Development' THEN 3
    WHEN 'Operations' THEN 4
    WHEN 'Disposition' THEN 5
    WHEN 'Financing' THEN 6
    ELSE 7
  END;

-- ============================================================================
-- STEP 6: Show sample budget items with their assigned stages
-- ============================================================================

SELECT
  fb.fact_id,
  fb.project_id,
  fb.lifecycle_stage,
  fb.notes,
  fb.amount
FROM landscape.core_fin_fact_budget fb
WHERE fb.lifecycle_stage IS NOT NULL
ORDER BY fb.lifecycle_stage, fb.fact_id
LIMIT 20;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- BEGIN;
--
-- DROP INDEX IF EXISTS landscape.idx_budget_lifecycle_stage;
--
-- ALTER TABLE landscape.core_fin_fact_budget
-- DROP CONSTRAINT IF EXISTS chk_budget_lifecycle_stage;
--
-- ALTER TABLE landscape.core_fin_fact_budget
-- DROP COLUMN IF EXISTS lifecycle_stage;
--
-- COMMIT;
-- ============================================================================
