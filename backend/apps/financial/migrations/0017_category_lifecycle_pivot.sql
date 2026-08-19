-- ============================================================================
-- Migration 0017: Category Lifecycle Stage Pivot Refactoring
-- ============================================================================
-- Purpose: Refactor from single lifecycle_stage column to many-to-many pivot
--          Eliminates duplicate category records across lifecycle stages
--          Follows enterprise normalization best practices
--
-- Author: Claude Code
-- Date: 2025-11-09
-- Dependencies: Migration 0016 (Category Lifecycle Taxonomy)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: CREATE PIVOT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.core_category_lifecycle_stages (
    category_id INTEGER NOT NULL,
    lifecycle_stage VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (category_id, lifecycle_stage),
    CONSTRAINT fk_category_lifecycle_category
        FOREIGN KEY (category_id)
        REFERENCES landscape.core_unit_cost_category(category_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_lifecycle_stage_value
        CHECK (lifecycle_stage IN ('Acquisition', 'Development', 'Operations', 'Disposition', 'Financing'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_lifecycle_stage
    ON landscape.core_category_lifecycle_stages(lifecycle_stage);

CREATE INDEX IF NOT EXISTS idx_category_lifecycle_sort
    ON landscape.core_category_lifecycle_stages(lifecycle_stage, sort_order);

CREATE INDEX IF NOT EXISTS idx_category_lifecycle_category
    ON landscape.core_category_lifecycle_stages(category_id);

-- Table comment
COMMENT ON TABLE landscape.core_category_lifecycle_stages IS
    'Many-to-many pivot: categories can belong to multiple lifecycle stages. Replaces single lifecycle_stage column.';

COMMENT ON COLUMN landscape.core_category_lifecycle_stages.sort_order IS
    'Display order within lifecycle stage (per-stage sorting)';

-- ============================================================================
-- STEP 2: MIGRATE EXISTING DATA TO PIVOT TABLE
-- ============================================================================

-- Insert current lifecycle_stage values into pivot table
-- Each category gets one pivot record for its current stage
INSERT INTO landscape.core_category_lifecycle_stages
    (category_id, lifecycle_stage, sort_order)
SELECT
    category_id,
    lifecycle_stage,
    sort_order
FROM landscape.core_unit_cost_category
WHERE is_active = true
ON CONFLICT (category_id, lifecycle_stage) DO NOTHING;

-- ============================================================================
-- STEP 3: DROP lifecycle_stage COLUMN FROM CATEGORY TABLE
-- ============================================================================

-- Drop index on lifecycle_stage
DROP INDEX IF EXISTS landscape.idx_category_lifecycle_stage CASCADE;
DROP INDEX IF EXISTS landscape.idx_category_lifecycle_active CASCADE;

-- Drop the lifecycle_stage column
ALTER TABLE landscape.core_unit_cost_category
    DROP COLUMN IF EXISTS lifecycle_stage CASCADE;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function: Get all lifecycle stages for a category
CREATE OR REPLACE FUNCTION landscape.get_category_stages(p_category_id INTEGER)
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT lifecycle_stage
        FROM landscape.core_category_lifecycle_stages
        WHERE category_id = p_category_id
        ORDER BY lifecycle_stage
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION landscape.get_category_stages(INTEGER) IS
    'Returns array of lifecycle stages for a given category';

-- Function: Add category to lifecycle stage
CREATE OR REPLACE FUNCTION landscape.add_category_to_stage(
    p_category_id INTEGER,
    p_lifecycle_stage VARCHAR(50),
    p_sort_order INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    INSERT INTO landscape.core_category_lifecycle_stages
        (category_id, lifecycle_stage, sort_order)
    VALUES
        (p_category_id, p_lifecycle_stage, p_sort_order)
    ON CONFLICT (category_id, lifecycle_stage) DO UPDATE
        SET sort_order = EXCLUDED.sort_order,
            updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.add_category_to_stage(INTEGER, VARCHAR, INTEGER) IS
    'Add a category to a lifecycle stage (or update sort_order if already exists)';

-- Function: Remove category from lifecycle stage
CREATE OR REPLACE FUNCTION landscape.remove_category_from_stage(
    p_category_id INTEGER,
    p_lifecycle_stage VARCHAR(50)
) RETURNS VOID AS $$
BEGIN
    DELETE FROM landscape.core_category_lifecycle_stages
    WHERE category_id = p_category_id
      AND lifecycle_stage = p_lifecycle_stage;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.remove_category_from_stage(INTEGER, VARCHAR) IS
    'Remove a category from a lifecycle stage';

-- Function: Get categories for a lifecycle stage
CREATE OR REPLACE FUNCTION landscape.get_stage_categories(p_lifecycle_stage VARCHAR(50))
RETURNS TABLE (
    category_id INTEGER,
    category_name VARCHAR,
    tags JSONB,
    sort_order INTEGER,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.category_id,
        c.category_name,
        c.tags,
        cls.sort_order,
        c.is_active
    FROM landscape.core_unit_cost_category c
    INNER JOIN landscape.core_category_lifecycle_stages cls
        ON c.category_id = cls.category_id
    WHERE cls.lifecycle_stage = p_lifecycle_stage
      AND c.is_active = true
    ORDER BY cls.sort_order, c.category_name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION landscape.get_stage_categories(VARCHAR) IS
    'Get all categories for a specific lifecycle stage';

-- ============================================================================
-- STEP 5: UPDATE VIEW TO USE PIVOT TABLE
-- ============================================================================

-- Drop old hierarchy view
DROP VIEW IF EXISTS landscape.vw_category_hierarchy CASCADE;

-- Recreate hierarchy view with pivot table support
CREATE OR REPLACE VIEW landscape.vw_category_hierarchy AS
WITH RECURSIVE category_tree AS (
    -- Base: Root categories (no parent)
    SELECT
        c.category_id,
        c.parent_id,
        c.category_name,
        landscape.get_category_stages(c.category_id) as lifecycle_stages,
        c.tags,
        c.sort_order,
        c.is_active,
        0 AS depth,
        ARRAY[c.category_name::text] AS path,
        c.category_name::text AS display_label
    FROM landscape.core_unit_cost_category c
    WHERE c.parent_id IS NULL

    UNION ALL

    -- Recursive: Child categories
    SELECT
        c.category_id,
        c.parent_id,
        c.category_name,
        landscape.get_category_stages(c.category_id) as lifecycle_stages,
        c.tags,
        c.sort_order,
        c.is_active,
        ct.depth + 1,
        ct.path || c.category_name::text,
        REPEAT('  ', ct.depth + 1) || c.category_name AS display_label
    FROM landscape.core_unit_cost_category c
    INNER JOIN category_tree ct ON c.parent_id = ct.category_id
)
SELECT
    category_id,
    parent_id,
    category_name,
    lifecycle_stages,
    tags,
    sort_order,
    is_active,
    depth,
    path,
    display_label,
    array_to_string(path, ' > ') AS full_path
FROM category_tree
ORDER BY sort_order, path;

COMMENT ON VIEW landscape.vw_category_hierarchy IS
    'Hierarchical view of categories with lifecycle stages array';

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

-- Verify pivot table has data
DO $$
DECLARE
    pivot_count INTEGER;
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pivot_count FROM landscape.core_category_lifecycle_stages;
    SELECT COUNT(*) INTO category_count FROM landscape.core_unit_cost_category WHERE is_active = true;

    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE '  Active categories: %', category_count;
    RAISE NOTICE '  Pivot table entries: %', pivot_count;

    IF pivot_count = 0 THEN
        RAISE WARNING 'No entries in pivot table - migration may have failed';
    END IF;
END $$;

-- Show distribution of categories across lifecycle stages
SELECT
    lifecycle_stage,
    COUNT(*) as category_count
FROM landscape.core_category_lifecycle_stages
GROUP BY lifecycle_stage
ORDER BY lifecycle_stage;

-- Verify no orphaned templates
SELECT COUNT(*) as orphaned_templates
FROM landscape.core_unit_cost_template t
LEFT JOIN landscape.core_unit_cost_category c
    ON t.category_id = c.category_id
WHERE c.category_id IS NULL OR c.is_active = false;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed - run separately)
-- ============================================================================

/*
BEGIN;

-- Add lifecycle_stage column back to category table
ALTER TABLE landscape.core_unit_cost_category
    ADD COLUMN lifecycle_stage VARCHAR(50);

-- Populate from pivot table (use first stage found for each category)
UPDATE landscape.core_unit_cost_category c
SET lifecycle_stage = (
    SELECT lifecycle_stage
    FROM landscape.core_category_lifecycle_stages cls
    WHERE cls.category_id = c.category_id
    ORDER BY lifecycle_stage
    LIMIT 1
);

-- Make column NOT NULL
ALTER TABLE landscape.core_unit_cost_category
    ALTER COLUMN lifecycle_stage SET NOT NULL;

-- Add check constraint
ALTER TABLE landscape.core_unit_cost_category
    ADD CONSTRAINT chk_lifecycle_stage
    CHECK (lifecycle_stage IN ('Acquisition', 'Development', 'Operations', 'Disposition', 'Financing'));

-- Recreate indexes
CREATE INDEX idx_category_lifecycle_stage
    ON landscape.core_unit_cost_category(lifecycle_stage);

CREATE INDEX idx_category_lifecycle_active
    ON landscape.core_unit_cost_category(lifecycle_stage, is_active)
    WHERE is_active = true;

-- Drop pivot table and related objects
DROP FUNCTION IF EXISTS landscape.get_category_stages(INTEGER);
DROP FUNCTION IF EXISTS landscape.add_category_to_stage(INTEGER, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS landscape.remove_category_from_stage(INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS landscape.get_stage_categories(VARCHAR);
DROP VIEW IF EXISTS landscape.vw_category_hierarchy;
DROP TABLE IF EXISTS landscape.core_category_lifecycle_stages CASCADE;

-- Recreate old hierarchy view
CREATE VIEW landscape.vw_category_hierarchy AS
WITH RECURSIVE category_tree AS (
    SELECT category_id, parent_id, category_name, lifecycle_stage, tags,
           sort_order, is_active, 0 AS depth,
           ARRAY[category_name::text] AS path,
           category_name::text AS display_label
    FROM landscape.core_unit_cost_category
    WHERE parent_id IS NULL

    UNION ALL

    SELECT c.category_id, c.parent_id, c.category_name, c.lifecycle_stage, c.tags,
           c.sort_order, c.is_active, ct.depth + 1,
           ct.path || c.category_name::text,
           REPEAT('  ', ct.depth + 1) || c.category_name AS display_label
    FROM landscape.core_unit_cost_category c
    INNER JOIN category_tree ct ON c.parent_id = ct.category_id
)
SELECT category_id, parent_id, category_name, lifecycle_stage, tags,
       sort_order, is_active, depth, path, display_label,
       array_to_string(path, ' > ') AS full_path
FROM category_tree
ORDER BY lifecycle_stage, sort_order, path;

COMMIT;
*/
