-- ============================================================================
-- ROLLBACK: Remove Duplicate Debt/Equity Tables from Phase 5
-- ============================================================================
-- Purpose: Phase 5 created duplicate tables when comprehensive ARGUS-compliant
--          tables already existed. This migration removes the duplicates.
-- Date: 2025-11-21
-- ============================================================================
-- Phase 5 created:
--   - landscape.debt_facilities (DUPLICATE of tbl_debt_facility)
--   - landscape.equity_partners (DUPLICATE - use tbl_finance_structure)
--   - landscape.waterfall_tiers (DUPLICATE - use tbl_finance_structure)
--   - landscape.waterfall_splits (DUPLICATE - use tbl_finance_structure)
--   - landscape.developer_fees (KEPT - no duplicate found)
-- ============================================================================

BEGIN;

-- Drop Phase 5 duplicate tables in correct order (children first)
DROP TABLE IF EXISTS landscape.waterfall_splits CASCADE;
DROP TABLE IF EXISTS landscape.waterfall_tiers CASCADE;
DROP TABLE IF EXISTS landscape.equity_partners CASCADE;
DROP TABLE IF EXISTS landscape.debt_facilities CASCADE;

-- Keep landscape.developer_fees (no existing duplicate)
-- This table tracks acquisition, development, asset management, and disposition fees

-- Verify existing tables are intact
DO $$
BEGIN
    -- Check tbl_debt_facility exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'landscape'
        AND table_name = 'tbl_debt_facility'
    ) THEN
        RAISE EXCEPTION 'ERROR: tbl_debt_facility does not exist. Do not proceed.';
    END IF;

    -- Check tbl_debt_draw_schedule exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'landscape'
        AND table_name = 'tbl_debt_draw_schedule'
    ) THEN
        RAISE EXCEPTION 'ERROR: tbl_debt_draw_schedule does not exist. Do not proceed.';
    END IF;

    -- Check tbl_finance_structure exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'landscape'
        AND table_name = 'tbl_finance_structure'
    ) THEN
        RAISE EXCEPTION 'ERROR: tbl_finance_structure does not exist. Do not proceed.';
    END IF;

    RAISE NOTICE 'SUCCESS: Duplicate tables dropped. Existing debt/equity tables verified intact.';
    RAISE NOTICE 'Kept: landscape.developer_fees (no duplicate found)';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
/*
-- Verify duplicate tables are gone
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'landscape'
AND table_name IN ('debt_facilities', 'equity_partners', 'waterfall_tiers', 'waterfall_splits');
-- Should return 0 rows

-- Verify existing tables remain
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'landscape'
AND table_name IN ('tbl_debt_facility', 'tbl_debt_draw_schedule', 'tbl_finance_structure', 'developer_fees');
-- Should return 4 rows

-- Check tbl_debt_facility structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'landscape'
AND table_name = 'tbl_debt_facility'
ORDER BY ordinal_position;
*/
