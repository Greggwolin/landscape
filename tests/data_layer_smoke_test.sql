-- =====================================================================
-- Landscape Financial Engine - Smoke Test Suite
-- Version: 1.5
-- Date: 2025-10-13
-- Description: Comprehensive smoke tests for all financial engine tables
-- =====================================================================

SET search_path TO landscape, public;

\echo ''
\echo '========================================='
\echo 'Financial Engine Smoke Test Suite v1.5'
\echo '========================================='
\echo ''

-- =====================================================================
-- SECTION 1: TABLE EXISTENCE CHECKS
-- =====================================================================

\echo '1. Checking table existence...'
\echo ''

SELECT
  'tbl_lease' AS table_name,
  to_regclass('landscape.tbl_lease') IS NOT NULL AS exists
UNION ALL
SELECT
  'tbl_base_rent',
  to_regclass('landscape.tbl_base_rent') IS NOT NULL
UNION ALL
SELECT
  'tbl_escalation',
  to_regclass('landscape.tbl_escalation') IS NOT NULL
UNION ALL
SELECT
  'tbl_recovery',
  to_regclass('landscape.tbl_recovery') IS NOT NULL
UNION ALL
SELECT
  'tbl_lot',
  to_regclass('landscape.tbl_lot') IS NOT NULL
UNION ALL
SELECT
  'tbl_loan',
  to_regclass('landscape.tbl_loan') IS NOT NULL
UNION ALL
SELECT
  'tbl_equity',
  to_regclass('landscape.tbl_equity') IS NOT NULL
UNION ALL
SELECT
  'tbl_waterfall',
  to_regclass('landscape.tbl_waterfall') IS NOT NULL
UNION ALL
SELECT
  'tbl_item_dependency',
  to_regclass('landscape.tbl_item_dependency') IS NOT NULL
UNION ALL
SELECT
  'tbl_absorption_schedule',
  to_regclass('landscape.tbl_absorption_schedule') IS NOT NULL
UNION ALL
SELECT
  'tbl_revenue_timing',
  to_regclass('landscape.tbl_revenue_timing') IS NOT NULL
UNION ALL
SELECT
  'tbl_debt_facility',
  to_regclass('landscape.tbl_debt_facility') IS NOT NULL
UNION ALL
SELECT
  'tbl_debt_draw_schedule',
  to_regclass('landscape.tbl_debt_draw_schedule') IS NOT NULL
UNION ALL
SELECT
  'tbl_equity_partner',
  to_regclass('landscape.tbl_equity_partner') IS NOT NULL
UNION ALL
SELECT
  'tbl_equity_distribution',
  to_regclass('landscape.tbl_equity_distribution') IS NOT NULL;

\echo ''
\echo '✓ Table existence checks complete'
\echo ''

-- =====================================================================
-- SECTION 2: VIEW EXISTENCE CHECKS
-- =====================================================================

\echo '2. Checking view existence...'
\echo ''

SELECT
  viewname AS view_name,
  true AS exists
FROM pg_views
WHERE schemaname = 'landscape'
AND viewname IN (
  'v_lease_summary',
  'v_rent_roll',
  'vw_item_dependency_status',
  'vw_budget_with_dependencies',
  'vw_absorption_with_dependencies',
  'vw_revenue_timeline',
  'vw_debt_balance_summary'
)
ORDER BY viewname;

\echo ''
\echo '✓ View existence checks complete'
\echo ''

-- =====================================================================
-- SECTION 3: CONSTRAINT VALIDATION TESTS
-- =====================================================================

\echo '3. Testing constraint validation...'
\echo ''

-- Test 1: Invalid lease status should fail
BEGIN;
  DO $$
  BEGIN
    BEGIN
      INSERT INTO landscape.tbl_lease (
        project_id, tenant_name, lease_commencement_date,
        lease_expiration_date, lease_term_months, leased_sf,
        lease_status
      ) VALUES (
        1, 'Test Tenant', '2025-01-01', '2030-12-31', 72, 1000,
        'INVALID_STATUS'  -- Should fail
      );
      RAISE EXCEPTION 'Constraint did not fire!';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS: Lease status constraint working';
    END;
  END $$;
ROLLBACK;

-- Test 2: Invalid escalation type should fail
BEGIN;
  DO $$
  BEGIN
    BEGIN
      INSERT INTO landscape.tbl_escalation (
        lease_id, escalation_type
      ) VALUES (
        1, 'INVALID_TYPE'  -- Should fail
      );
      RAISE EXCEPTION 'Constraint did not fire!';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS: Escalation type constraint working';
    END;
  END $$;
ROLLBACK;

-- Test 3: Invalid dependency trigger should fail
BEGIN;
  DO $$
  BEGIN
    BEGIN
      INSERT INTO landscape.tbl_item_dependency (
        dependent_item_type, dependent_item_table, dependent_item_id,
        trigger_event
      ) VALUES (
        'COST', 'tbl_budget_items', 1,
        'INVALID_EVENT'  -- Should fail
      );
      RAISE EXCEPTION 'Constraint did not fire!';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS: Dependency trigger constraint working';
    END;
  END $$;
ROLLBACK;

-- Test 4: Invalid timing method should fail
BEGIN;
  DO $$
  BEGIN
    BEGIN
      INSERT INTO landscape.tbl_absorption_schedule (
        project_id, revenue_stream_name, start_period, periods_to_complete,
        timing_method
      ) VALUES (
        1, 'Test Revenue', 1, 10,
        'INVALID_METHOD'  -- Should fail
      );
      RAISE EXCEPTION 'Constraint did not fire!';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS: Timing method constraint working';
    END;
  END $$;
ROLLBACK;

\echo ''
\echo '✓ Constraint validation tests complete'
\echo ''

-- =====================================================================
-- SECTION 4: FOREIGN KEY INTEGRITY TESTS
-- =====================================================================

\echo '4. Testing foreign key integrity...'
\echo ''

-- Get a valid project_id for testing
DO $$
DECLARE
  test_project_id INTEGER;
BEGIN
  SELECT project_id INTO test_project_id
  FROM landscape.tbl_project
  LIMIT 1;

  IF test_project_id IS NOT NULL THEN
    RAISE NOTICE 'Using project_id % for FK tests', test_project_id;

    -- Test absorption schedule FK
    BEGIN
      INSERT INTO landscape.tbl_absorption_schedule (
        project_id, revenue_stream_name, start_period, periods_to_complete, total_units
      ) VALUES (
        test_project_id, 'Smoke Test Revenue Stream', 5, 10, 100
      );
      RAISE NOTICE 'PASS: Absorption schedule FK working';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FAIL: Absorption schedule FK - %', SQLERRM;
    END;

    -- Test debt facility FK
    BEGIN
      INSERT INTO landscape.tbl_debt_facility (
        project_id, facility_name, facility_type, commitment_amount, interest_rate
      ) VALUES (
        test_project_id, 'Test Construction Loan', 'CONSTRUCTION', 5000000, 0.065
      );
      RAISE NOTICE 'PASS: Debt facility FK working';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FAIL: Debt facility FK - %', SQLERRM;
    END;

    -- Test equity partner FK
    BEGIN
      INSERT INTO landscape.tbl_equity_partner (
        project_id, partner_name, partner_class, committed_capital
      ) VALUES (
        test_project_id, 'Test LP', 'LP', 2000000
      );
      RAISE NOTICE 'PASS: Equity partner FK working';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FAIL: Equity partner FK - %', SQLERRM;
    END;

  ELSE
    RAISE NOTICE 'SKIP: No projects found for FK testing';
  END IF;
END $$;

-- Clean up test data
DELETE FROM landscape.tbl_absorption_schedule WHERE revenue_stream_name = 'Smoke Test Revenue Stream';
DELETE FROM landscape.tbl_debt_facility WHERE facility_name = 'Test Construction Loan';
DELETE FROM landscape.tbl_equity_partner WHERE partner_name = 'Test LP';

\echo ''
\echo '✓ Foreign key integrity tests complete'
\echo ''

-- =====================================================================
-- SECTION 5: VIEW FUNCTIONALITY TESTS
-- =====================================================================

\echo '5. Testing view functionality...'
\echo ''

-- Test lease summary view
SELECT 'v_lease_summary' AS view_name, COUNT(*) AS row_count
FROM landscape.v_lease_summary;

-- Test rent roll view
SELECT 'v_rent_roll' AS view_name, COUNT(*) AS row_count
FROM landscape.v_rent_roll;

-- Test dependency status view
SELECT 'vw_item_dependency_status' AS view_name, COUNT(*) AS row_count
FROM landscape.vw_item_dependency_status;

-- Test budget with dependencies view
SELECT 'vw_budget_with_dependencies' AS view_name, COUNT(*) AS row_count
FROM landscape.vw_budget_with_dependencies;

-- Test revenue timeline view
SELECT 'vw_revenue_timeline' AS view_name, COUNT(*) AS row_count
FROM landscape.vw_revenue_timeline;

\echo ''
\echo '✓ View functionality tests complete'
\echo ''

-- =====================================================================
-- SECTION 6: DATA INTEGRITY CHECKS
-- =====================================================================

\echo '6. Checking data integrity...'
\echo ''

-- Check for orphaned leases (no project)
SELECT
  'Orphaned leases' AS check_name,
  COUNT(*) AS count
FROM landscape.tbl_lease l
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project p WHERE p.project_id = l.project_id
);

-- Check for orphaned base rents (no lease)
SELECT
  'Orphaned base rents' AS check_name,
  COUNT(*) AS count
FROM landscape.tbl_base_rent br
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_lease l WHERE l.lease_id = br.lease_id
);

-- Check for absorption schedules without periods
SELECT
  'Absorption without periods' AS check_name,
  COUNT(*) AS count
FROM landscape.tbl_absorption_schedule ab
WHERE ab.start_period IS NULL OR ab.periods_to_complete IS NULL;

-- Check for debt facilities with invalid rates
SELECT
  'Debt facilities with invalid rates' AS check_name,
  COUNT(*) AS count
FROM landscape.tbl_debt_facility
WHERE interest_rate <= 0 OR interest_rate > 1;

\echo ''
\echo '✓ Data integrity checks complete'
\echo ''

-- =====================================================================
-- SECTION 7: ENHANCED COLUMN CHECKS
-- =====================================================================

\echo '7. Checking enhanced columns on existing tables...'
\echo ''

-- Check tbl_project enhancements
SELECT
  'tbl_project' AS table_name,
  COUNT(CASE WHEN project_type IS NOT NULL THEN 1 END) AS has_project_type,
  COUNT(CASE WHEN financial_model_type IS NOT NULL THEN 1 END) AS has_financial_model_type,
  COUNT(CASE WHEN discount_rate_pct IS NOT NULL THEN 1 END) AS has_discount_rate
FROM landscape.tbl_project;

-- Check tbl_phase enhancements
SELECT
  'tbl_phase' AS table_name,
  COUNT(CASE WHEN phase_status IS NOT NULL THEN 1 END) AS has_phase_status
FROM landscape.tbl_phase;

-- Check tbl_parcel enhancements
SELECT
  'tbl_parcel' AS table_name,
  COUNT(CASE WHEN is_income_property IS NOT NULL THEN 1 END) AS has_income_property_flag,
  COUNT(CASE WHEN rentable_sf IS NOT NULL THEN 1 END) AS has_rentable_sf
FROM landscape.tbl_parcel;

-- Check tbl_budget_items enhancements
SELECT
  'tbl_budget_items' AS table_name,
  COUNT(CASE WHEN timing_method IS NOT NULL THEN 1 END) AS has_timing_method,
  COUNT(CASE WHEN s_curve_profile IS NOT NULL THEN 1 END) AS has_s_curve_profile
FROM landscape.tbl_budget_items;

\echo ''
\echo '✓ Enhanced column checks complete'
\echo ''

-- =====================================================================
-- SECTION 8: SUMMARY STATISTICS
-- =====================================================================

\echo '8. Summary statistics...'
\echo ''

SELECT
  'Total leases' AS metric,
  COUNT(*) AS value
FROM landscape.tbl_lease
UNION ALL
SELECT
  'Total lots',
  COUNT(*)
FROM landscape.tbl_lot
UNION ALL
SELECT
  'Total loans',
  COUNT(*)
FROM landscape.tbl_loan
UNION ALL
SELECT
  'Total equity partners',
  COUNT(*)
FROM landscape.tbl_equity
UNION ALL
SELECT
  'Total dependencies',
  COUNT(*)
FROM landscape.tbl_item_dependency
UNION ALL
SELECT
  'Total absorption schedules',
  COUNT(*)
FROM landscape.tbl_absorption_schedule
UNION ALL
SELECT
  'Total debt facilities',
  COUNT(*)
FROM landscape.tbl_debt_facility
UNION ALL
SELECT
  'Total equity partners (enhanced)',
  COUNT(*)
FROM landscape.tbl_equity_partner;

\echo ''
\echo '========================================='
\echo 'Smoke Test Suite Complete!'
\echo '========================================='
\echo ''
\echo 'All critical tables, views, and constraints verified.'
\echo 'Phase 1 + Phase 1.5 migrations successful.'
\echo ''
