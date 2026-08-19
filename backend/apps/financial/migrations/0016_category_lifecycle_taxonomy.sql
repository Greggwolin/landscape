-- Migration 0016: Category Lifecycle Taxonomy
-- Date: 2025-01-08
-- Purpose: Migrate core_unit_cost_category from land-dev-specific taxonomy to universal lifecycle-based taxonomy
--
-- Changes:
-- 1. Create core_category_tag_library table for flexible tag system
-- 2. Add lifecycle_stage and tags to core_unit_cost_category
-- 3. Migrate data from development_stage/cost_type to lifecycle_stage/tags
-- 4. Drop old fields: development_stage, cost_scope, cost_type
-- 5. Create helper functions for tag management
-- 6. Create hierarchy view for nested category display

BEGIN;

-- ============================================================================
-- STEP 1: Create Tag Library Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.core_category_tag_library (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) NOT NULL UNIQUE,
    tag_context VARCHAR(50) NOT NULL,  -- Which lifecycle_stage(s) this applies to
    is_system_default BOOLEAN DEFAULT TRUE,
    description TEXT,
    display_order INTEGER DEFAULT 999,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE landscape.core_category_tag_library IS
'System and user-defined tags for categorizing cost items across lifecycle stages';

COMMENT ON COLUMN landscape.core_category_tag_library.tag_context IS
'Comma-separated lifecycle stages where this tag applies (e.g., "Development", "Development,Operations")';

-- Seed default tags
INSERT INTO landscape.core_category_tag_library (tag_name, tag_context, description, display_order) VALUES
-- Development context tags
('Hard', 'Development', 'Physical construction - materials and labor', 1),
('Soft', 'Development', 'Non-construction - professional services, permits, fees', 2),
('Deposits', 'Development', 'Refundable deposits or utility deposits', 3),
('Other', 'Development', 'Miscellaneous development costs', 4),

-- Operations context tags
('OpEx', 'Operations', 'Operating expenses - recurring costs', 10),
('CapEx', 'Operations', 'Capital expenditures - improvements and replacements', 11),
('Revenue', 'Operations', 'Income from operations (rental, sales, etc.)', 12),

-- Financing context tags
('Debt', 'Financing', 'Borrowed capital and debt service', 20),
('Equity', 'Financing', 'Invested capital and equity distributions', 21),
('Fees', 'Financing', 'Financing fees and costs', 22),

-- Multi-context tags
('Professional Services', 'Development,Acquisition,Disposition', 'Legal, engineering, consulting services', 30),
('Due Diligence', 'Acquisition', 'Studies, reports, inspections, surveys', 31),
('Marketing', 'Operations,Disposition', 'Marketing and advertising costs', 32),
('Closing Costs', 'Acquisition,Disposition', 'Transaction closing expenses', 33)
ON CONFLICT (tag_name) DO NOTHING;

-- Add indexes to tag library
CREATE INDEX IF NOT EXISTS idx_tag_library_context ON landscape.core_category_tag_library(tag_context);
CREATE INDEX IF NOT EXISTS idx_tag_library_active ON landscape.core_category_tag_library(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STEP 2: Add New Columns to core_unit_cost_category
-- ============================================================================

-- Add lifecycle_stage column (nullable initially for migration)
ALTER TABLE landscape.core_unit_cost_category
ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50);

-- Add tags column (JSONB array)
ALTER TABLE landscape.core_unit_cost_category
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN landscape.core_unit_cost_category.lifecycle_stage IS
'Universal lifecycle stage: Acquisition, Development, Operations, Disposition, or Financing';

COMMENT ON COLUMN landscape.core_unit_cost_category.tags IS
'JSONB array of tag strings for flexible categorization (e.g., ["Hard", "Professional Services"])';

-- ============================================================================
-- STEP 3: Migrate Data from Old Schema to New Schema
-- ============================================================================

-- Migrate lifecycle_stage: All existing categories are Development
-- (Stage 1/2/3 were all sub-phases of Development for land development)
UPDATE landscape.core_unit_cost_category
SET lifecycle_stage = 'Development'
WHERE lifecycle_stage IS NULL;

-- Migrate tags from cost_type field
UPDATE landscape.core_unit_cost_category
SET tags = CASE
    WHEN cost_type = 'hard' THEN '["Hard"]'::jsonb
    WHEN cost_type = 'soft' THEN '["Soft"]'::jsonb
    WHEN cost_type = 'deposit' THEN '["Deposits"]'::jsonb
    WHEN cost_type = 'other' THEN '["Other"]'::jsonb
    ELSE '[]'::jsonb
END
WHERE tags = '[]'::jsonb;

-- Add intelligent default tags based on category names
-- This helps categorize items that might span multiple contexts

-- Professional Services tag
UPDATE landscape.core_unit_cost_category
SET tags = tags || '["Professional Services"]'::jsonb
WHERE category_name ILIKE ANY(ARRAY[
    '%engineering%', '%legal%', '%architect%', '%consulting%',
    '%planning%', '%design%', '%survey%', '%environmental%'
])
AND NOT tags ? 'Professional Services'
AND jsonb_typeof(tags) = 'array';

-- Due Diligence tag (for categories that sound like DD costs)
UPDATE landscape.core_unit_cost_category
SET tags = tags || '["Due Diligence"]'::jsonb
WHERE category_name ILIKE ANY(ARRAY[
    '%study%', '%report%', '%inspection%', '%analysis%',
    '%geotechnical%', '%environmental%', '%survey%'
])
AND NOT tags ? 'Due Diligence'
AND jsonb_typeof(tags) = 'array';

-- ============================================================================
-- STEP 4: Add Constraints and Make Fields Required
-- ============================================================================

-- Make lifecycle_stage required
ALTER TABLE landscape.core_unit_cost_category
ALTER COLUMN lifecycle_stage SET NOT NULL;

-- Add check constraint for valid lifecycle_stage values
ALTER TABLE landscape.core_unit_cost_category
ADD CONSTRAINT chk_lifecycle_stage
CHECK (lifecycle_stage IN ('Acquisition', 'Development', 'Operations', 'Disposition', 'Financing'));

-- Add check constraint to ensure tags is always an array
ALTER TABLE landscape.core_unit_cost_category
ADD CONSTRAINT chk_tags_is_array
CHECK (jsonb_typeof(tags) = 'array');

-- ============================================================================
-- STEP 5: Drop Old Columns (Land-Dev Specific)
-- ============================================================================

-- Drop the old development_stage column (stage1/stage2/stage3)
ALTER TABLE landscape.core_unit_cost_category
DROP COLUMN IF EXISTS development_stage;

-- Drop the old cost_scope column (development/operations)
ALTER TABLE landscape.core_unit_cost_category
DROP COLUMN IF EXISTS cost_scope;

-- Drop the old cost_type column (hard/soft/deposit/other)
ALTER TABLE landscape.core_unit_cost_category
DROP COLUMN IF EXISTS cost_type;

-- Drop old unique constraint that referenced development_stage
ALTER TABLE landscape.core_unit_cost_category
DROP CONSTRAINT IF EXISTS core_unit_cost_category_category_name_cost_scope_develop_key;

-- Drop old index for development_stage
DROP INDEX IF EXISTS landscape.idx_unit_cost_category_stage;

-- ============================================================================
-- STEP 6: Create New Indexes for Performance
-- ============================================================================

-- Index on lifecycle_stage for filtering
CREATE INDEX IF NOT EXISTS idx_category_lifecycle_stage
ON landscape.core_unit_cost_category(lifecycle_stage);

-- GIN index on tags for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_category_tags
ON landscape.core_unit_cost_category USING GIN(tags);

-- Composite index for common query pattern (lifecycle + active)
CREATE INDEX IF NOT EXISTS idx_category_lifecycle_active
ON landscape.core_unit_cost_category(lifecycle_stage, is_active)
WHERE is_active = TRUE;

-- Index on parent_id for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_category_parent
ON landscape.core_unit_cost_category(parent_id)
WHERE parent_id IS NOT NULL;

-- ============================================================================
-- STEP 7: Create Helper Functions for Tag Management
-- ============================================================================

-- Function: Check if category has a specific tag
CREATE OR REPLACE FUNCTION landscape.category_has_tag(category_tags JSONB, tag_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN category_tags ? tag_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION landscape.category_has_tag IS
'Check if a category has a specific tag in its tags array';

-- Function: Add tag to category (if not already present)
CREATE OR REPLACE FUNCTION landscape.add_category_tag(p_category_id INT, p_tag_name TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE landscape.core_unit_cost_category
    SET tags = tags || jsonb_build_array(p_tag_name),
        updated_at = NOW()
    WHERE category_id = p_category_id
      AND NOT (tags ? p_tag_name);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.add_category_tag IS
'Add a tag to a category if not already present';

-- Function: Remove tag from category
CREATE OR REPLACE FUNCTION landscape.remove_category_tag(p_category_id INT, p_tag_name TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE landscape.core_unit_cost_category
    SET tags = tags - p_tag_name,
        updated_at = NOW()
    WHERE category_id = p_category_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.remove_category_tag IS
'Remove a tag from a category';

-- Function: Get all categories with a specific tag
CREATE OR REPLACE FUNCTION landscape.get_categories_by_tag(p_tag_name TEXT)
RETURNS TABLE (
    category_id INT,
    category_name VARCHAR,
    lifecycle_stage VARCHAR,
    tags JSONB,
    sort_order INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.category_id,
        c.category_name,
        c.lifecycle_stage,
        c.tags,
        c.sort_order
    FROM landscape.core_unit_cost_category c
    WHERE c.tags ? p_tag_name
      AND c.is_active = TRUE
    ORDER BY c.lifecycle_stage, c.sort_order, c.category_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.get_categories_by_tag IS
'Get all active categories that have a specific tag';

-- Function: Get tag usage statistics
CREATE OR REPLACE FUNCTION landscape.get_tag_usage_stats()
RETURNS TABLE (
    tag_name TEXT,
    usage_count BIGINT,
    lifecycle_stages TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        jsonb_array_elements_text(c.tags) AS tag_name,
        COUNT(*) AS usage_count,
        ARRAY_AGG(DISTINCT c.lifecycle_stage ORDER BY c.lifecycle_stage) AS lifecycle_stages
    FROM landscape.core_unit_cost_category c
    WHERE c.is_active = TRUE
    GROUP BY jsonb_array_elements_text(c.tags)
    ORDER BY usage_count DESC, tag_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.get_tag_usage_stats IS
'Get statistics on tag usage across categories';

-- ============================================================================
-- STEP 8: Create Category Hierarchy View
-- ============================================================================

CREATE OR REPLACE VIEW landscape.vw_category_hierarchy AS
WITH RECURSIVE category_tree AS (
    -- Base case: Root categories (no parent)
    SELECT
        c.category_id,
        c.parent_id,
        c.category_name,
        c.lifecycle_stage,
        c.tags,
        c.sort_order,
        c.is_active,
        0 AS depth,
        ARRAY[c.category_name::text] AS path,
        c.category_name::text AS display_label
    FROM landscape.core_unit_cost_category c
    WHERE c.parent_id IS NULL

    UNION ALL

    -- Recursive case: Child categories
    SELECT
        c.category_id,
        c.parent_id,
        c.category_name,
        c.lifecycle_stage,
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
    lifecycle_stage,
    tags,
    sort_order,
    is_active,
    depth,
    path,
    display_label,
    array_to_string(path, ' > ') AS full_path
FROM category_tree
ORDER BY lifecycle_stage, sort_order, path;

COMMENT ON VIEW landscape.vw_category_hierarchy IS
'Hierarchical view of categories showing parent-child relationships with depth and path';

-- ============================================================================
-- STEP 9: Update Table Ordering (Meta)
-- ============================================================================

-- The default ordering should now be by lifecycle_stage, then sort_order
-- This is handled in Django model Meta, but documented here for reference

COMMENT ON TABLE landscape.core_unit_cost_category IS
'Universal category taxonomy for cost/revenue items. Works across all property types using lifecycle stages (Acquisition, Development, Operations, Disposition, Financing) and flexible tags.';

-- ============================================================================
-- STEP 10: Validation Queries (For Testing)
-- ============================================================================

-- These queries can be run after migration to validate success

-- Validate: All categories should have lifecycle_stage
DO $$
DECLARE
    null_count INT;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM landscape.core_unit_cost_category
    WHERE lifecycle_stage IS NULL;

    IF null_count > 0 THEN
        RAISE EXCEPTION 'Migration validation failed: % categories have NULL lifecycle_stage', null_count;
    END IF;

    RAISE NOTICE 'Validation passed: All categories have lifecycle_stage';
END $$;

-- Validate: All categories should have tags array
DO $$
DECLARE
    invalid_count INT;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM landscape.core_unit_cost_category
    WHERE jsonb_typeof(tags) != 'array';

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Migration validation failed: % categories have invalid tags format', invalid_count;
    END IF;

    RAISE NOTICE 'Validation passed: All categories have valid tags array';
END $$;

-- Display migration summary
DO $$
DECLARE
    total_categories INT;
    dev_categories INT;
    tag_library_count INT;
BEGIN
    SELECT COUNT(*) INTO total_categories FROM landscape.core_unit_cost_category WHERE is_active = TRUE;
    SELECT COUNT(*) INTO dev_categories FROM landscape.core_unit_cost_category WHERE lifecycle_stage = 'Development' AND is_active = TRUE;
    SELECT COUNT(*) INTO tag_library_count FROM landscape.core_category_tag_library WHERE is_active = TRUE;

    RAISE NOTICE '=== Migration 0016 Summary ===';
    RAISE NOTICE 'Total active categories: %', total_categories;
    RAISE NOTICE 'Development lifecycle categories: %', dev_categories;
    RAISE NOTICE 'Tags in library: %', tag_library_count;
    RAISE NOTICE '================================';
END $$;

COMMIT;

-- ============================================================================
-- Post-Migration Validation Queries (Run Separately)
-- ============================================================================

-- Check lifecycle_stage distribution
-- SELECT lifecycle_stage, COUNT(*) as count
-- FROM landscape.core_unit_cost_category
-- GROUP BY lifecycle_stage
-- ORDER BY lifecycle_stage;

-- Check tag usage
-- SELECT * FROM landscape.get_tag_usage_stats();

-- View all categories with their tags
-- SELECT category_id, category_name, lifecycle_stage, tags
-- FROM landscape.core_unit_cost_category
-- WHERE is_active = TRUE
-- ORDER BY lifecycle_stage, sort_order, category_name;

-- Test hierarchy view
-- SELECT * FROM landscape.vw_category_hierarchy
-- WHERE lifecycle_stage = 'Development'
-- LIMIT 20;

-- Test tag filtering
-- SELECT * FROM landscape.get_categories_by_tag('Soft');
