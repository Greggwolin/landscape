-- ============================================================================
-- Drop Legacy Budget Tables
-- ============================================================================
-- CAUTION: This script permanently removes the legacy budget system.
-- Only run after verifying:
--   1. Migration completed successfully
--   2. Application testing complete
--   3. User acceptance obtained
--   4. Backup tables verified
-- ============================================================================

SET search_path TO landscape;

-- ============================================================================
-- STEP 1: Final Validation
-- ============================================================================

DO $$
DECLARE
    v_legacy_count INTEGER;
    v_migrated_count INTEGER;
    v_backup_count INTEGER;
BEGIN
    RAISE NOTICE '=== PRE-DROP VALIDATION ===';

    -- Check legacy data exists
    SELECT COUNT(*) INTO v_legacy_count FROM tbl_budget_items;
    RAISE NOTICE 'Legacy budget items: %', v_legacy_count;

    -- Check migrated data exists
    SELECT COUNT(*) INTO v_migrated_count
    FROM core_fin_fact_budget
    WHERE notes LIKE '%Migrated from tbl_budget_items%';
    RAISE NOTICE 'Migrated budget facts: %', v_migrated_count;

    -- Check backup exists
    SELECT COUNT(*) INTO v_backup_count FROM tbl_budget_items_backup;
    RAISE NOTICE 'Backup items: %', v_backup_count;

    -- Validate counts match
    IF v_legacy_count != v_migrated_count THEN
        RAISE EXCEPTION 'Count mismatch! Legacy: %, Migrated: %', v_legacy_count, v_migrated_count;
    END IF;

    IF v_backup_count != v_legacy_count THEN
        RAISE EXCEPTION 'Backup incomplete! Legacy: %, Backup: %', v_legacy_count, v_backup_count;
    END IF;

    RAISE NOTICE '✓ Validation passed - safe to proceed';
END $$;

-- ============================================================================
-- STEP 2: Show What Will Be Dropped
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TABLES TO BE DROPPED ===';
    RAISE NOTICE 'The following tables will be permanently deleted:';
    RAISE NOTICE '  - tbl_budget_items (4 records)';
    RAISE NOTICE '  - tbl_budget_structure (27 records)';
    RAISE NOTICE '  - tbl_budget_timing (0 records - empty)';
    RAISE NOTICE '  - tbl_budget (0 records - empty)';
    RAISE NOTICE '';
    RAISE NOTICE 'The following will be kept:';
    RAISE NOTICE '  - tbl_budget_items_backup (for archival)';
    RAISE NOTICE '  - tbl_budget_structure_backup (for archival)';
    RAISE NOTICE '  - core_fin_fact_budget (new system)';
    RAISE NOTICE '  - core_fin_category (new system)';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: Archive Final State (Optional)
-- ============================================================================

-- Create one final snapshot with timestamp
DROP TABLE IF EXISTS tbl_budget_items_final_archive CASCADE;
DROP TABLE IF EXISTS tbl_budget_structure_final_archive CASCADE;

CREATE TABLE tbl_budget_items_final_archive AS
SELECT *, NOW() as archived_at FROM tbl_budget_items;

CREATE TABLE tbl_budget_structure_final_archive AS
SELECT *, NOW() as archived_at FROM tbl_budget_structure;

COMMENT ON TABLE tbl_budget_items_final_archive IS
'Final archive before dropping legacy table on 2025-10-02. Original data migrated to core_fin_fact_budget.';

COMMENT ON TABLE tbl_budget_structure_final_archive IS
'Final archive before dropping legacy table on 2025-10-02. Original data migrated to core_fin_category.';

-- ============================================================================
-- STEP 4: Drop Legacy Tables
-- ============================================================================

RAISE NOTICE '=== DROPPING LEGACY TABLES ===';

-- Drop comparison view first (depends on tables)
DROP VIEW IF EXISTS v_budget_migration_comparison CASCADE;
RAISE NOTICE '✓ Dropped view: v_budget_migration_comparison';

-- Drop the empty tables first (no data loss risk)
DROP TABLE IF EXISTS tbl_budget_timing CASCADE;
RAISE NOTICE '✓ Dropped table: tbl_budget_timing (0 records)';

DROP TABLE IF EXISTS tbl_budget CASCADE;
RAISE NOTICE '✓ Dropped table: tbl_budget (0 records)';

-- Drop the migrated tables (data preserved in core_fin_*)
DROP TABLE IF EXISTS tbl_budget_items CASCADE;
RAISE NOTICE '✓ Dropped table: tbl_budget_items (4 records → now in core_fin_fact_budget)';

DROP TABLE IF EXISTS tbl_budget_structure CASCADE;
RAISE NOTICE '✓ Dropped table: tbl_budget_structure (27 records → now in core_fin_category)';

-- ============================================================================
-- STEP 5: Clean Up Helper Function
-- ============================================================================

-- Drop the category code generation function (no longer needed)
DROP FUNCTION IF EXISTS create_category_code(TEXT, TEXT, TEXT);
RAISE NOTICE '✓ Dropped helper function: create_category_code';

-- ============================================================================
-- STEP 6: Verify Cleanup
-- ============================================================================

DO $$
DECLARE
    v_remaining_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== POST-DROP VERIFICATION ===';

    -- Check that legacy tables are gone
    SELECT COUNT(*) INTO v_remaining_count
    FROM information_schema.tables
    WHERE table_schema = 'landscape'
        AND table_name IN ('tbl_budget_items', 'tbl_budget_structure', 'tbl_budget', 'tbl_budget_timing');

    IF v_remaining_count > 0 THEN
        RAISE WARNING 'Some legacy tables still exist!';
    ELSE
        RAISE NOTICE '✓ All legacy budget tables dropped successfully';
    END IF;

    -- Verify core_fin tables still have data
    SELECT COUNT(*) INTO v_remaining_count FROM core_fin_fact_budget;
    RAISE NOTICE 'core_fin_fact_budget: % records', v_remaining_count;

    SELECT COUNT(*) INTO v_remaining_count FROM core_fin_category WHERE code LIKE 'USE-%';
    RAISE NOTICE 'core_fin_category (USE-*): % records', v_remaining_count;

    -- Check archives exist
    SELECT COUNT(*) INTO v_remaining_count FROM tbl_budget_items_final_archive;
    RAISE NOTICE 'tbl_budget_items_final_archive: % records', v_remaining_count;

    SELECT COUNT(*) INTO v_remaining_count FROM tbl_budget_structure_final_archive;
    RAISE NOTICE 'tbl_budget_structure_final_archive: % records', v_remaining_count;
END $$;

-- ============================================================================
-- STEP 7: Summary Report
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CLEANUP COMPLETE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Dropped Tables:';
    RAISE NOTICE '  ✓ tbl_budget_items';
    RAISE NOTICE '  ✓ tbl_budget_structure';
    RAISE NOTICE '  ✓ tbl_budget';
    RAISE NOTICE '  ✓ tbl_budget_timing';
    RAISE NOTICE '  ✓ v_budget_migration_comparison (view)';
    RAISE NOTICE '';
    RAISE NOTICE 'Preserved Archives:';
    RAISE NOTICE '  ✓ tbl_budget_items_backup (original backup)';
    RAISE NOTICE '  ✓ tbl_budget_structure_backup (original backup)';
    RAISE NOTICE '  ✓ tbl_budget_items_final_archive (final snapshot)';
    RAISE NOTICE '  ✓ tbl_budget_structure_final_archive (final snapshot)';
    RAISE NOTICE '';
    RAISE NOTICE 'Active Tables:';
    RAISE NOTICE '  ✓ core_fin_fact_budget (contains migrated budget items)';
    RAISE NOTICE '  ✓ core_fin_category (contains migrated categories)';
    RAISE NOTICE '  ✓ core_fin_budget_version (budget versioning)';
    RAISE NOTICE '';
    RAISE NOTICE 'Application Updates Required:';
    RAISE NOTICE '  - Update budget-structure API route';
    RAISE NOTICE '  - Update TypeScript types';
    RAISE NOTICE '  - Update any direct SQL queries';
    RAISE NOTICE '';
    RAISE NOTICE 'Rollback (if needed):';
    RAISE NOTICE '  - Restore from tbl_budget_*_final_archive tables';
    RAISE NOTICE '  - Delete migrated core_fin_* records';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- OPTIONAL: Drop Archive Tables After Extended Period
-- ============================================================================
-- Run these commands manually after 6+ months if no issues:
--
-- DROP TABLE tbl_budget_items_backup CASCADE;
-- DROP TABLE tbl_budget_structure_backup CASCADE;
-- DROP TABLE tbl_budget_items_final_archive CASCADE;
-- DROP TABLE tbl_budget_structure_final_archive CASCADE;
-- ============================================================================
