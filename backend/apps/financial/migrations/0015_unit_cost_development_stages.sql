-- ============================================================================
-- Migration 0015: Unit Cost Development Stages
-- ============================================================================
-- Purpose: Add development stage taxonomy to unit cost categories
--          Stage 1: Entitlements (discretionary approvals)
--          Stage 2: Engineering (administrative/ministerial)
--          Stage 3: Development (physical construction)
--
-- Author: Landscape Platform
-- Date: 2025-11-07
-- Session: PL33
-- ============================================================================

-- ============================================================================
-- STEP 1: Add development_stage column to core_unit_cost_category
-- ============================================================================

ALTER TABLE landscape.core_unit_cost_category
ADD COLUMN development_stage VARCHAR(50) DEFAULT 'stage3_development';

COMMENT ON COLUMN landscape.core_unit_cost_category.development_stage IS
'Project lifecycle stage: stage1_entitlements | stage2_engineering | stage3_development';

-- ============================================================================
-- STEP 2: Update unique constraint to include development_stage
-- ============================================================================

-- Drop existing unique constraint
ALTER TABLE landscape.core_unit_cost_category
DROP CONSTRAINT IF EXISTS core_unit_cost_category_unique;

-- Add new unique constraint including development_stage
ALTER TABLE landscape.core_unit_cost_category
ADD CONSTRAINT core_unit_cost_category_unique
UNIQUE (category_name, cost_scope, development_stage);

-- ============================================================================
-- STEP 3: Create constraint for valid stage values
-- ============================================================================

ALTER TABLE landscape.core_unit_cost_category
ADD CONSTRAINT chk_unit_cost_category_stage
CHECK (development_stage IN ('stage1_entitlements', 'stage2_engineering', 'stage3_development'));

-- ============================================================================
-- STEP 4: Add index for stage filtering
-- ============================================================================

CREATE INDEX idx_unit_cost_category_stage
ON landscape.core_unit_cost_category(development_stage);

-- ============================================================================
-- STEP 5: Update existing categories to Stage 3
-- ============================================================================

UPDATE landscape.core_unit_cost_category
SET development_stage = 'stage3_development'
WHERE development_stage IS NULL OR development_stage = 'stage3_development';

-- ============================================================================
-- STEP 6: Insert Stage 1 (Entitlements) Categories
-- ============================================================================
-- All Stage 1 categories are soft costs related to discretionary approvals

INSERT INTO landscape.core_unit_cost_category (
    category_name,
    cost_scope,
    cost_type,
    development_stage,
    sort_order,
    is_active
) VALUES
    ('Legal Fees', 'development', 'soft', 'stage1_entitlements', 10, true),
    ('Land Planning', 'development', 'soft', 'stage1_entitlements', 20, true),
    ('Engineering Studies', 'development', 'soft', 'stage1_entitlements', 30, true),
    ('Environmental Studies', 'development', 'soft', 'stage1_entitlements', 40, true),
    ('Submittal Fees', 'development', 'soft', 'stage1_entitlements', 50, true),
    ('Other Consultants', 'development', 'soft', 'stage1_entitlements', 60, true);

-- ============================================================================
-- STEP 7: Insert Stage 2 (Engineering) Categories
-- ============================================================================
-- All Stage 2 categories are soft costs related to administrative/ministerial work

INSERT INTO landscape.core_unit_cost_category (
    category_name,
    cost_scope,
    cost_type,
    development_stage,
    sort_order,
    is_active
) VALUES
    ('Legal Fees', 'development', 'soft', 'stage2_engineering', 10, true),
    ('Civil Engineering', 'development', 'soft', 'stage2_engineering', 20, true),
    ('Final Studies', 'development', 'soft', 'stage2_engineering', 30, true),
    ('Submittal Fees', 'development', 'soft', 'stage2_engineering', 40, true),
    ('Other Consultants', 'development', 'soft', 'stage2_engineering', 50, true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count categories by stage
SELECT
    development_stage,
    cost_type,
    COUNT(*) as category_count
FROM landscape.core_unit_cost_category
WHERE is_active = true
GROUP BY development_stage, cost_type
ORDER BY development_stage, cost_type;

-- Show new Stage 1 categories
SELECT category_id, category_name, cost_type, development_stage, sort_order
FROM landscape.core_unit_cost_category
WHERE development_stage = 'stage1_entitlements'
ORDER BY sort_order;

-- Show new Stage 2 categories
SELECT category_id, category_name, cost_type, development_stage, sort_order
FROM landscape.core_unit_cost_category
WHERE development_stage = 'stage2_engineering'
ORDER BY sort_order;

-- Verify all existing categories are Stage 3
SELECT COUNT(*) as existing_stage3_count
FROM landscape.core_unit_cost_category
WHERE development_stage = 'stage3_development';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
DROP INDEX IF EXISTS landscape.idx_unit_cost_category_stage;
ALTER TABLE landscape.core_unit_cost_category DROP CONSTRAINT IF EXISTS chk_unit_cost_category_stage;
DELETE FROM landscape.core_unit_cost_category WHERE development_stage IN ('stage1_entitlements', 'stage2_engineering');
ALTER TABLE landscape.core_unit_cost_category DROP COLUMN IF EXISTS development_stage;
*/
