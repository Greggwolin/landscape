-- ============================================================================
-- Migration 0020: Add Planning & Engineering Lifecycle Stage
-- ============================================================================
-- Purpose: Add new lifecycle stage for pre-development planning and engineering
-- Author: Landscape Development Team
-- Date: 2025-11-18
-- Dependencies: Migration 0017 (Category Lifecycle Pivot)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP EXISTING CHECK CONSTRAINT
-- ============================================================================

ALTER TABLE landscape.core_category_lifecycle_stages
    DROP CONSTRAINT IF EXISTS chk_lifecycle_stage_value;

-- ============================================================================
-- STEP 2: ADD NEW CHECK CONSTRAINT WITH 6 STAGES
-- ============================================================================

ALTER TABLE landscape.core_category_lifecycle_stages
    ADD CONSTRAINT chk_lifecycle_stage_value
    CHECK (lifecycle_stage IN (
        'Acquisition',
        'Planning & Engineering',
        'Development',
        'Operations',
        'Disposition',
        'Financing'
    ));

-- ============================================================================
-- STEP 3: REASSIGN CATEGORIES TO NEW STAGE
-- ============================================================================

-- Categories to move entirely to Planning & Engineering
-- These are pre-development activities
INSERT INTO landscape.core_category_lifecycle_stages (category_id, lifecycle_stage, sort_order)
VALUES
    (31, 'Planning & Engineering', 0),  -- Land Planning
    (32, 'Planning & Engineering', 1),  -- Engineering Studies
    (33, 'Planning & Engineering', 2),  -- Environmental Studies
    (37, 'Planning & Engineering', 3),  -- Civil Engineering
    (38, 'Planning & Engineering', 4)   -- Final Studies
ON CONFLICT (category_id, lifecycle_stage) DO NOTHING;

-- Categories that span multiple stages (keep in both)
INSERT INTO landscape.core_category_lifecycle_stages (category_id, lifecycle_stage, sort_order)
VALUES
    (36, 'Planning & Engineering', 0),  -- Legal Fees (already in Acquisition, Development)
    (39, 'Planning & Engineering', 5),  -- Submittal Fees
    (40, 'Planning & Engineering', 6)   -- Other Consultants
ON CONFLICT (category_id, lifecycle_stage) DO NOTHING;

-- ============================================================================
-- STEP 4: REMOVE FROM DEVELOPMENT (categories moving entirely)
-- ============================================================================

-- Remove these categories from Development since they're now in Planning & Engineering
DELETE FROM landscape.core_category_lifecycle_stages
WHERE lifecycle_stage = 'Development'
  AND category_id IN (31, 32, 33, 37, 38);

-- Keep categories 36, 39, 40 in Development as they span multiple stages

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Show new distribution
SELECT lifecycle_stage, COUNT(*) as category_count
FROM landscape.core_category_lifecycle_stages
GROUP BY lifecycle_stage
ORDER BY
    CASE lifecycle_stage
        WHEN 'Acquisition' THEN 1
        WHEN 'Planning & Engineering' THEN 2
        WHEN 'Development' THEN 3
        WHEN 'Operations' THEN 4
        WHEN 'Disposition' THEN 5
        WHEN 'Financing' THEN 6
    END;

-- Show Planning & Engineering categories
SELECT c.category_id, c.category_name, cls.sort_order
FROM landscape.core_unit_cost_category c
INNER JOIN landscape.core_category_lifecycle_stages cls
    ON c.category_id = cls.category_id
WHERE cls.lifecycle_stage = 'Planning & Engineering'
ORDER BY cls.sort_order, c.category_name;

COMMIT;
