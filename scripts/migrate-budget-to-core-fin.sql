-- ============================================================================
-- Budget Consolidation Migration Script
-- Migrates tbl_budget_* → core_fin_*
-- ============================================================================
-- Author: Claude Code
-- Date: 2025-10-02
-- Description: Consolidates legacy budget system into core finance framework
-- ============================================================================

-- Ensure we're in the correct schema
SET search_path TO landscape;

-- ============================================================================
-- STEP 0: Pre-migration Validation & Backup
-- ============================================================================

-- Show current state
DO $$
BEGIN
    RAISE NOTICE '=== PRE-MIGRATION STATE ===';
    RAISE NOTICE 'Budget structures: %', (SELECT COUNT(*) FROM tbl_budget_structure);
    RAISE NOTICE 'Budget items: %', (SELECT COUNT(*) FROM tbl_budget_items);
    RAISE NOTICE 'Core finance categories: %', (SELECT COUNT(*) FROM core_fin_category);
    RAISE NOTICE 'Core finance budget facts: %', (SELECT COUNT(*) FROM core_fin_fact_budget);
END $$;

-- Create backup tables (with timestamp)
DROP TABLE IF EXISTS tbl_budget_structure_backup CASCADE;
DROP TABLE IF EXISTS tbl_budget_items_backup CASCADE;

CREATE TABLE tbl_budget_structure_backup AS SELECT * FROM tbl_budget_structure;
CREATE TABLE tbl_budget_items_backup AS SELECT * FROM tbl_budget_items;

COMMENT ON TABLE tbl_budget_structure_backup IS 'Backup created before migration to core_fin_* on 2025-10-02';
COMMENT ON TABLE tbl_budget_items_backup IS 'Backup created before migration to core_fin_* on 2025-10-02';

-- ============================================================================
-- STEP 1: Expand core_fin_category with Legacy Structure Categories
-- ============================================================================

-- We'll create a mapping between legacy structure and new categories
-- Strategy: Create categories matching the legacy scope→category→detail hierarchy

-- Insert missing categories from tbl_budget_structure
-- Use structured codes: USE-{SCOPE_ABBR}-{CATEGORY_ABBR}-{DETAIL_ABBR}

-- Helper function to create category codes
CREATE OR REPLACE FUNCTION create_category_code(
    p_scope TEXT,
    p_category TEXT,
    p_detail TEXT
) RETURNS TEXT AS $$
DECLARE
    v_scope_abbr TEXT;
    v_cat_abbr TEXT;
    v_detail_abbr TEXT;
BEGIN
    -- Abbreviate scope
    v_scope_abbr := CASE
        WHEN p_scope = 'Acquisition' THEN 'ACQ'
        WHEN p_scope = 'Stage 1' THEN 'STG1'
        WHEN p_scope = 'Stage 2' THEN 'STG2'
        WHEN p_scope = 'Stage 3' THEN 'STG3'
        WHEN p_scope = 'Project' THEN 'PRJ'
        ELSE UPPER(LEFT(p_scope, 3))
    END;

    -- Abbreviate category
    v_cat_abbr := CASE
        WHEN p_category = 'Diligence' THEN 'DUE'
        WHEN p_category = 'Purchase' THEN 'PUR'
        WHEN p_category = 'Other' THEN 'OTH'
        WHEN p_category = 'Entitlements' THEN 'ENT'
        WHEN p_category = 'Engineering' THEN 'ENG'
        WHEN p_category = 'Offsites' THEN 'OFF'
        WHEN p_category = 'Onsites' THEN 'ONS'
        WHEN p_category = 'Subdivision' THEN 'SUB'
        WHEN p_category = 'Exactions' THEN 'EXA'
        WHEN p_category = 'Management Fees' THEN 'MGT'
        WHEN p_category = 'Capital Cost / Interest' THEN 'CAP'
        WHEN p_category = 'Overhead' THEN 'OVH'
        ELSE UPPER(LEFT(p_category, 3))
    END;

    -- Create detail abbreviation (first 3 chars of first word)
    v_detail_abbr := UPPER(LEFT(SPLIT_PART(p_detail, ' ', 1), 3));

    RETURN 'USE-' || v_scope_abbr || '-' || v_cat_abbr || '-' || v_detail_abbr;
END;
$$ LANGUAGE plpgsql;

-- Create a temporary mapping table
DROP TABLE IF EXISTS tmp_budget_category_mapping;
CREATE TEMP TABLE tmp_budget_category_mapping (
    structure_id INTEGER,
    scope TEXT,
    category TEXT,
    detail TEXT,
    new_code TEXT,
    new_category_id BIGINT
);

-- Populate mapping with generated codes
INSERT INTO tmp_budget_category_mapping (structure_id, scope, category, detail, new_code)
SELECT
    structure_id,
    scope,
    category,
    detail,
    create_category_code(scope, category, detail) as new_code
FROM tbl_budget_structure
ORDER BY structure_id;

-- Show proposed mappings
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== PROPOSED CATEGORY MAPPINGS ===';
    FOR r IN SELECT structure_id, scope, category, detail, new_code FROM tmp_budget_category_mapping ORDER BY structure_id LOOP
        RAISE NOTICE 'ID % | % > % > % → %', r.structure_id, r.scope, r.category, r.detail, r.new_code;
    END LOOP;
END $$;

-- Insert new categories into core_fin_category
-- First, get the max category_id for parent categories
DO $$
DECLARE
    v_max_id BIGINT;
    r RECORD;
    v_parent_id BIGINT;
    v_new_id BIGINT;
BEGIN
    -- Get starting ID
    SELECT COALESCE(MAX(category_id), 0) + 1 INTO v_max_id FROM core_fin_category;

    RAISE NOTICE '=== CREATING NEW CATEGORIES ===';
    RAISE NOTICE 'Starting from category_id: %', v_max_id;

    -- Insert categories (we'll create a flat structure for now, can add hierarchy later)
    FOR r IN SELECT DISTINCT structure_id, scope, category, detail, new_code
             FROM tmp_budget_category_mapping
             ORDER BY structure_id LOOP

        -- Check if category already exists
        SELECT category_id INTO v_new_id
        FROM core_fin_category
        WHERE code = r.new_code;

        IF v_new_id IS NULL THEN
            -- Insert new category
            INSERT INTO core_fin_category (
                code,
                kind,
                class,
                scope,
                detail,
                is_active
            ) VALUES (
                r.new_code,
                'Use',           -- All budget items are expenses (Use)
                r.scope,         -- Acquisition, Stage 1, etc.
                r.category,      -- Diligence, Purchase, etc.
                r.detail,        -- Environmental Studies, Land Cost, etc.
                TRUE
            ) RETURNING category_id INTO v_new_id;

            RAISE NOTICE 'Created category % → % (ID: %)', r.structure_id, r.new_code, v_new_id;
        ELSE
            RAISE NOTICE 'Category already exists: % (ID: %)', r.new_code, v_new_id;
        END IF;

        -- Update mapping
        UPDATE tmp_budget_category_mapping
        SET new_category_id = v_new_id
        WHERE structure_id = r.structure_id;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Determine Default Budget Version
-- ============================================================================

DO $$
DECLARE
    v_budget_id BIGINT;
    v_budget_name TEXT;
BEGIN
    -- Try to find an 'active' budget version, fallback to first one
    SELECT budget_id, name INTO v_budget_id, v_budget_name
    FROM core_fin_budget_version
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_budget_id IS NULL THEN
        -- Get first available budget
        SELECT budget_id, name INTO v_budget_id, v_budget_name
        FROM core_fin_budget_version
        ORDER BY budget_id
        LIMIT 1;
    END IF;

    IF v_budget_id IS NULL THEN
        RAISE EXCEPTION 'No budget version found in core_fin_budget_version. Please create one first.';
    END IF;

    -- Store in session variable
    CREATE TEMP TABLE tmp_migration_config (key TEXT, value TEXT);
    INSERT INTO tmp_migration_config VALUES ('budget_id', v_budget_id::TEXT);
    INSERT INTO tmp_migration_config VALUES ('budget_name', v_budget_name);

    RAISE NOTICE '=== BUDGET VERSION ===';
    RAISE NOTICE 'Using budget_id: % (%)', v_budget_id, v_budget_name;
END $$;

-- ============================================================================
-- STEP 3: Check for Default UOM
-- ============================================================================

DO $$
DECLARE
    v_uom_code TEXT;
BEGIN
    -- Check if 'EA' (Each) exists, otherwise use first available
    SELECT uom_code INTO v_uom_code
    FROM core_fin_uom
    WHERE uom_code = 'EA'
    LIMIT 1;

    IF v_uom_code IS NULL THEN
        SELECT uom_code INTO v_uom_code
        FROM core_fin_uom
        ORDER BY uom_code
        LIMIT 1;
    END IF;

    IF v_uom_code IS NULL THEN
        -- Create default UOM
        INSERT INTO core_fin_uom (uom_code, name, uom_type)
        VALUES ('EA', 'Each', 'count');
        v_uom_code := 'EA';
        RAISE NOTICE 'Created default UOM: EA (Each)';
    END IF;

    INSERT INTO tmp_migration_config VALUES ('default_uom', v_uom_code);
    RAISE NOTICE 'Using default UOM: %', v_uom_code;
END $$;

-- ============================================================================
-- STEP 4: Migrate tbl_budget_items → core_fin_fact_budget
-- ============================================================================

DO $$
DECLARE
    v_budget_id BIGINT;
    v_default_uom TEXT;
    r RECORD;
    v_fact_count INTEGER := 0;
BEGIN
    -- Get config
    SELECT value::BIGINT INTO v_budget_id FROM tmp_migration_config WHERE key = 'budget_id';
    SELECT value INTO v_default_uom FROM tmp_migration_config WHERE key = 'default_uom';

    RAISE NOTICE '=== MIGRATING BUDGET ITEMS ===';

    FOR r IN
        SELECT
            bi.budget_item_id,
            bi.project_id,
            bi.structure_id,
            bi.amount,
            bi.quantity,
            bi.cost_per_unit,
            bi.notes,
            m.new_category_id,
            m.new_code
        FROM tbl_budget_items bi
        JOIN tmp_budget_category_mapping m ON bi.structure_id = m.structure_id
        ORDER BY bi.budget_item_id
    LOOP
        -- Insert into core_fin_fact_budget
        INSERT INTO core_fin_fact_budget (
            budget_id,
            pe_level,
            pe_id,
            category_id,
            uom_code,
            qty,
            rate,
            amount,
            notes,
            confidence_level,
            is_committed
        ) VALUES (
            v_budget_id,
            'project',                    -- Project-level budget
            r.project_id::TEXT,           -- Convert to text for polymorphic reference
            r.new_category_id,
            v_default_uom,
            COALESCE(r.quantity, 1),
            r.cost_per_unit,
            r.amount,
            COALESCE(r.notes, '') || ' [Migrated from tbl_budget_items #' || r.budget_item_id || ']',
            'medium',                     -- Default confidence
            FALSE                         -- Not yet committed
        );

        v_fact_count := v_fact_count + 1;

        RAISE NOTICE 'Migrated item % → Project % | Category % | Amount $%',
            r.budget_item_id,
            r.project_id,
            r.new_code,
            r.amount;
    END LOOP;

    RAISE NOTICE 'Successfully migrated % budget items', v_fact_count;
END $$;

-- ============================================================================
-- STEP 5: Post-Migration Validation
-- ============================================================================

DO $$
DECLARE
    v_legacy_count INTEGER;
    v_migrated_count INTEGER;
    v_category_count INTEGER;
BEGIN
    RAISE NOTICE '=== POST-MIGRATION VALIDATION ===';

    -- Count legacy items
    SELECT COUNT(*) INTO v_legacy_count FROM tbl_budget_items;

    -- Count migrated items (with migration note)
    SELECT COUNT(*) INTO v_migrated_count
    FROM core_fin_fact_budget
    WHERE notes LIKE '%Migrated from tbl_budget_items%';

    -- Count new categories
    SELECT COUNT(*) INTO v_category_count
    FROM core_fin_category
    WHERE code LIKE 'USE-%'
        AND category_id > 5;  -- Assuming original 5 categories had IDs 1-5

    RAISE NOTICE 'Legacy budget items: %', v_legacy_count;
    RAISE NOTICE 'Migrated budget facts: %', v_migrated_count;
    RAISE NOTICE 'New categories created: %', v_category_count;

    IF v_legacy_count != v_migrated_count THEN
        RAISE WARNING 'Migration count mismatch! Legacy: %, Migrated: %', v_legacy_count, v_migrated_count;
    ELSE
        RAISE NOTICE '✓ All budget items successfully migrated';
    END IF;
END $$;

-- Show sample migrated data
SELECT
    fb.fact_id,
    fb.budget_id,
    fb.pe_level,
    fb.pe_id as project_id,
    fc.code as category_code,
    fc.detail,
    fb.qty,
    fb.rate,
    fb.amount,
    fb.confidence_level
FROM core_fin_fact_budget fb
JOIN core_fin_category fc ON fb.category_id = fc.category_id
WHERE fb.notes LIKE '%Migrated from tbl_budget_items%'
ORDER BY fb.fact_id;

-- ============================================================================
-- STEP 6: Mark Legacy Tables as Deprecated (NOT DROPPING YET)
-- ============================================================================

COMMENT ON TABLE tbl_budget_items IS 'DEPRECATED: Migrated to core_fin_fact_budget on 2025-10-02. Will be dropped after testing period.';
COMMENT ON TABLE tbl_budget_structure IS 'DEPRECATED: Migrated to core_fin_category on 2025-10-02. Will be dropped after testing period.';

-- Add migration timestamp column to legacy tables for tracking
ALTER TABLE tbl_budget_items ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tbl_budget_structure ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP WITH TIME ZONE;

UPDATE tbl_budget_items SET migrated_at = NOW();
UPDATE tbl_budget_structure SET migrated_at = NOW();

-- ============================================================================
-- STEP 7: Create Comparison View for Validation
-- ============================================================================

CREATE OR REPLACE VIEW v_budget_migration_comparison AS
SELECT
    'LEGACY' as source,
    bi.budget_item_id as source_id,
    bi.project_id,
    bs.scope || ' > ' || bs.category || ' > ' || bs.detail as category_path,
    bi.amount,
    bi.quantity as qty,
    bi.cost_per_unit as rate,
    bi.notes
FROM tbl_budget_items bi
JOIN tbl_budget_structure bs ON bi.structure_id = bs.structure_id

UNION ALL

SELECT
    'MIGRATED' as source,
    fb.fact_id as source_id,
    fb.pe_id::INTEGER as project_id,
    fc.class || ' > ' || fc.scope || ' > ' || fc.detail as category_path,
    fb.amount,
    fb.qty,
    fb.rate,
    fb.notes
FROM core_fin_fact_budget fb
JOIN core_fin_category fc ON fb.category_id = fc.category_id
WHERE fb.notes LIKE '%Migrated from tbl_budget_items%'
ORDER BY project_id, source DESC, source_id;

COMMENT ON VIEW v_budget_migration_comparison IS 'Side-by-side comparison of legacy vs migrated budget data for validation';

-- Show comparison
SELECT * FROM v_budget_migration_comparison ORDER BY project_id, source_id;

-- ============================================================================
-- STEP 8: Summary Report
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - Backup tables created: tbl_budget_structure_backup, tbl_budget_items_backup';
    RAISE NOTICE '  - Categories migrated to: core_fin_category';
    RAISE NOTICE '  - Budget items migrated to: core_fin_fact_budget';
    RAISE NOTICE '  - Comparison view created: v_budget_migration_comparison';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Review v_budget_migration_comparison for data accuracy';
    RAISE NOTICE '  2. Test application queries against core_fin_fact_budget';
    RAISE NOTICE '  3. Update application code to use new tables';
    RAISE NOTICE '  4. After testing period, drop legacy tables with:';
    RAISE NOTICE '     DROP TABLE tbl_budget_items CASCADE;';
    RAISE NOTICE '     DROP TABLE tbl_budget_structure CASCADE;';
    RAISE NOTICE '';
    RAISE NOTICE 'Rollback:';
    RAISE NOTICE '  - Restore from backup tables if needed';
    RAISE NOTICE '  - Delete migrated facts: DELETE FROM core_fin_fact_budget WHERE notes LIKE ''%Migrated from tbl_budget_items%'';';
    RAISE NOTICE '';
END $$;
