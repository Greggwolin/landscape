-- Migration 014: Budget Category Hierarchy System
-- Created: 2025-11-02
-- Purpose: Implement user-defined 4-level budget category hierarchy
--
-- Design Philosophy:
-- - Mirror geographic hierarchy (Project → Area → Phase → Parcel)
-- - Follow multifamily OpEx pattern (parent-child relationships)
-- - Support template-based initialization per project type
-- - Enable bidirectional creation (Admin UI ↔ Budget Page)

-- ============================================================================
-- 1. Budget Category Table (Hierarchical Taxonomy)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.core_budget_category (
    category_id BIGSERIAL PRIMARY KEY,

    -- Hierarchy
    parent_id BIGINT REFERENCES landscape.core_budget_category(category_id) ON DELETE CASCADE,
    level INT NOT NULL CHECK (level BETWEEN 1 AND 4),

    -- Identity
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Scope (null for project-specific, project_id for custom)
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    is_template BOOLEAN DEFAULT false,
    template_name VARCHAR(100), -- 'Land Development', 'Multifamily', etc.
    project_type_code VARCHAR(20), -- 'LAND', 'MF', 'RET', etc.

    -- Display & Ordering
    sort_order INT DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(20),

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),

    -- Constraints
    UNIQUE (code, project_id, level),
    CHECK (
        (is_template = true AND project_id IS NULL AND template_name IS NOT NULL) OR
        (is_template = false AND project_id IS NOT NULL)
    )
);

COMMENT ON TABLE landscape.core_budget_category IS
'User-defined budget category hierarchy (4 levels max). Supports both global templates and project-specific customization.';

COMMENT ON COLUMN landscape.core_budget_category.parent_id IS
'Links to parent category. NULL for Level 1 (roots).';

COMMENT ON COLUMN landscape.core_budget_category.level IS
'Hierarchy level: 1 (top), 2, 3, 4 (bottom). Enforced via CHECK constraint.';

COMMENT ON COLUMN landscape.core_budget_category.is_template IS
'true = global template, false = project-specific category';

-- Indexes
CREATE INDEX idx_budget_category_parent ON landscape.core_budget_category(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_budget_category_project ON landscape.core_budget_category(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_budget_category_template ON landscape.core_budget_category(template_name, project_type_code) WHERE is_template = true;
CREATE INDEX idx_budget_category_level ON landscape.core_budget_category(level);
CREATE INDEX idx_budget_category_active ON landscape.core_budget_category(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. Update Budget Fact Table (Add Category Foreign Keys)
-- ============================================================================

-- Add category hierarchy columns to existing budget facts
ALTER TABLE landscape.core_fin_fact_budget
    ADD COLUMN IF NOT EXISTS category_l1_id BIGINT REFERENCES landscape.core_budget_category(category_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS category_l2_id BIGINT REFERENCES landscape.core_budget_category(category_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS category_l3_id BIGINT REFERENCES landscape.core_budget_category(category_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS category_l4_id BIGINT REFERENCES landscape.core_budget_category(category_id) ON DELETE SET NULL;

COMMENT ON COLUMN landscape.core_fin_fact_budget.category_l1_id IS 'Level 1 category (e.g., Revenue, OpEx, CapEx)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.category_l2_id IS 'Level 2 category (e.g., Land, Vertical, Marketing)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.category_l3_id IS 'Level 3 category (e.g., Due Diligence, Engineering)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.category_l4_id IS 'Level 4 category (e.g., Geotechnical, Traffic Study)';

-- Indexes for category lookups
CREATE INDEX IF NOT EXISTS idx_budget_fact_category_l1 ON landscape.core_fin_fact_budget(category_l1_id) WHERE category_l1_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budget_fact_category_l2 ON landscape.core_fin_fact_budget(category_l2_id) WHERE category_l2_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budget_fact_category_l3 ON landscape.core_fin_fact_budget(category_l3_id) WHERE category_l3_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budget_fact_category_l4 ON landscape.core_fin_fact_budget(category_l4_id) WHERE category_l4_id IS NOT NULL;

-- ============================================================================
-- 3. Validation Function (Enforce Hierarchy Consistency)
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.validate_budget_category_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure parent level = child level - 1
    IF NEW.parent_id IS NOT NULL THEN
        IF (SELECT level FROM landscape.core_budget_category WHERE category_id = NEW.parent_id) != NEW.level - 1 THEN
            RAISE EXCEPTION 'Invalid hierarchy: parent must be exactly one level above child';
        END IF;
    END IF;

    -- Ensure Level 1 categories have no parent
    IF NEW.level = 1 AND NEW.parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Level 1 categories cannot have a parent';
    END IF;

    -- Ensure Level 2-4 categories have a parent
    IF NEW.level > 1 AND NEW.parent_id IS NULL THEN
        RAISE EXCEPTION 'Level % categories must have a parent', NEW.level;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_budget_category_hierarchy
    BEFORE INSERT OR UPDATE ON landscape.core_budget_category
    FOR EACH ROW
    EXECUTE FUNCTION landscape.validate_budget_category_hierarchy();

-- ============================================================================
-- 4. Updated Timestamp Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.update_budget_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_budget_category_timestamp
    BEFORE UPDATE ON landscape.core_budget_category
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_budget_category_timestamp();

-- ============================================================================
-- 5. Seed Data: Default Templates
-- ============================================================================

-- Land Development Template
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order) VALUES
-- Level 1
('LAND_ACQ', 'Acquisition', 1, NULL, true, 'Land Development', 'LAND', 10),
('LAND_HORIZ', 'Horizontal Development', 1, NULL, true, 'Land Development', 'LAND', 20),
('LAND_VERT', 'Vertical Development', 1, NULL, true, 'Land Development', 'LAND', 30),
('LAND_SOFT', 'Soft Costs', 1, NULL, true, 'Land Development', 'LAND', 40);

-- Level 2 (Acquisition children)
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'LAND_ACQ_DD', 'Due Diligence', 2, category_id, true, 'Land Development', 'LAND', 10
FROM landscape.core_budget_category WHERE code = 'LAND_ACQ' AND is_template = true;

INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'LAND_ACQ_PURCH', 'Purchase', 2, category_id, true, 'Land Development', 'LAND', 20
FROM landscape.core_budget_category WHERE code = 'LAND_ACQ' AND is_template = true;

-- Level 3 (Due Diligence children)
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'LAND_ACQ_DD_ENV', 'Environmental', 3, category_id, true, 'Land Development', 'LAND', 10
FROM landscape.core_budget_category WHERE code = 'LAND_ACQ_DD' AND is_template = true;

INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'LAND_ACQ_DD_GEO', 'Geotechnical', 3, category_id, true, 'Land Development', 'LAND', 20
FROM landscape.core_budget_category WHERE code = 'LAND_ACQ_DD' AND is_template = true;

-- Level 4 (Environmental children)
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'LAND_ACQ_DD_ENV_P1', 'Phase I ESA', 4, category_id, true, 'Land Development', 'LAND', 10
FROM landscape.core_budget_category WHERE code = 'LAND_ACQ_DD_ENV' AND is_template = true;

INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'LAND_ACQ_DD_ENV_P2', 'Phase II ESA', 4, category_id, true, 'Land Development', 'LAND', 20
FROM landscape.core_budget_category WHERE code = 'LAND_ACQ_DD_ENV' AND is_template = true;

-- Level 2 (Horizontal Development children)
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'LAND_HORIZ_ENG', 'Engineering', 2, category_id, true, 'Land Development', 'LAND', 10
FROM landscape.core_budget_category WHERE code = 'LAND_HORIZ' AND is_template = true;

INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'LAND_HORIZ_GRAD', 'Grading & Utilities', 2, category_id, true, 'Land Development', 'LAND', 20
FROM landscape.core_budget_category WHERE code = 'LAND_HORIZ' AND is_template = true;

-- Multifamily Template (Income Property)
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order) VALUES
-- Level 1
('MF_REV', 'Revenue', 1, NULL, true, 'Multifamily', 'MF', 10),
('MF_OPEX', 'Operating Expenses', 1, NULL, true, 'Multifamily', 'MF', 20),
('MF_CAPEX', 'Capital Expenditures', 1, NULL, true, 'Multifamily', 'MF', 30);

-- Level 2 (Revenue children)
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'MF_REV_RENT', 'Rental Income', 2, category_id, true, 'Multifamily', 'MF', 10
FROM landscape.core_budget_category WHERE code = 'MF_REV' AND is_template = true;

INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'MF_REV_OTHER', 'Other Income', 2, category_id, true, 'Multifamily', 'MF', 20
FROM landscape.core_budget_category WHERE code = 'MF_REV' AND is_template = true;

-- Level 3 (Rental Income children)
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'MF_REV_RENT_BASE', 'Base Rent', 3, category_id, true, 'Multifamily', 'MF', 10
FROM landscape.core_budget_category WHERE code = 'MF_REV_RENT' AND is_template = true;

-- Level 2 (OpEx children)
INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'MF_OPEX_OCC', 'Occupancy Costs', 2, category_id, true, 'Multifamily', 'MF', 10
FROM landscape.core_budget_category WHERE code = 'MF_OPEX' AND is_template = true;

INSERT INTO landscape.core_budget_category (code, name, level, parent_id, is_template, template_name, project_type_code, sort_order)
SELECT 'MF_OPEX_UTIL', 'Utilities', 2, category_id, true, 'Multifamily', 'MF', 20
FROM landscape.core_budget_category WHERE code = 'MF_OPEX' AND is_template = true;

-- ============================================================================
-- 6. Helper Views
-- ============================================================================

-- View: Full category hierarchy with breadcrumb path
CREATE OR REPLACE VIEW landscape.vw_budget_category_hierarchy AS
WITH RECURSIVE category_path AS (
    -- Base case: Level 1 categories
    SELECT
        category_id,
        parent_id,
        level,
        code,
        name,
        name::TEXT as path,
        code::TEXT as code_path,
        project_id,
        is_template,
        template_name,
        project_type_code,
        sort_order
    FROM landscape.core_budget_category
    WHERE level = 1

    UNION ALL

    -- Recursive case: Join children to their parents
    SELECT
        c.category_id,
        c.parent_id,
        c.level,
        c.code,
        c.name,
        cp.path || ' > ' || c.name as path,
        cp.code_path || '.' || c.code as code_path,
        c.project_id,
        c.is_template,
        c.template_name,
        c.project_type_code,
        c.sort_order
    FROM landscape.core_budget_category c
    JOIN category_path cp ON c.parent_id = cp.category_id
)
SELECT * FROM category_path
ORDER BY code_path;

COMMENT ON VIEW landscape.vw_budget_category_hierarchy IS
'Flattened view of budget category hierarchy with full breadcrumb paths';

-- ============================================================================
-- 7. Grant Permissions
-- ============================================================================

-- Grant read/write access to application role (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON landscape.core_budget_category TO your_app_role;
-- GRANT SELECT ON landscape.vw_budget_category_hierarchy TO your_app_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verification query
SELECT
    template_name,
    project_type_code,
    level,
    COUNT(*) as category_count
FROM landscape.core_budget_category
WHERE is_template = true
GROUP BY template_name, project_type_code, level
ORDER BY template_name, level;
