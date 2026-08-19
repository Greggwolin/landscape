-- Smoke Tests for Fixture Data
-- Version: v1.1 (2025-10-13)
--
-- Validates that Peoria Lakes and Carney Power Center fixtures are loaded correctly
-- Run after: ./scripts/load-fixtures.sh

\set ON_ERROR_STOP on

BEGIN;

-- ============================================================================
-- TEST 1: Project Existence
-- ============================================================================

DO $$
DECLARE
  peoria_count INTEGER;
  carney_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO peoria_count FROM landscape.tbl_project WHERE project_id=7;
  SELECT COUNT(*) INTO carney_count FROM landscape.tbl_project WHERE project_id=8;

  ASSERT peoria_count = 1, 'Peoria Lakes project (ID=7) not found';
  ASSERT carney_count = 1, 'Carney Power Center project (ID=8) not found';

  RAISE NOTICE '✅ TEST 1: Projects exist (Peoria=7, Carney=8)';
END $$;

-- ============================================================================
-- TEST 2: Peoria Lakes Budget Items
-- ============================================================================

DO $$
DECLARE
  budget_count INTEGER;
  item_100_exists BOOLEAN;
  item_101_exists BOOLEAN;
  item_102_exists BOOLEAN;
  item_103_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO budget_count FROM landscape.tbl_budget_items WHERE project_id=7;

  SELECT EXISTS(SELECT 1 FROM landscape.tbl_budget_items WHERE project_id=7 AND description LIKE '100%') INTO item_100_exists;
  SELECT EXISTS(SELECT 1 FROM landscape.tbl_budget_items WHERE project_id=7 AND description LIKE '101%') INTO item_101_exists;
  SELECT EXISTS(SELECT 1 FROM landscape.tbl_budget_items WHERE project_id=7 AND description LIKE '102%') INTO item_102_exists;
  SELECT EXISTS(SELECT 1 FROM landscape.tbl_budget_items WHERE project_id=7 AND description LIKE '103%') INTO item_103_exists;

  ASSERT budget_count = 4, 'Expected 4 budget items for Peoria Lakes';
  ASSERT item_100_exists, 'Item 100 (Mass Grading) not found';
  ASSERT item_101_exists, 'Item 101 (Utilities) not found';
  ASSERT item_102_exists, 'Item 102 (Roads) not found';
  ASSERT item_103_exists, 'Item 103 (Landscaping) not found';

  RAISE NOTICE '✅ TEST 2: Peoria budget items (4 items: 100-103)';
END $$;

-- ============================================================================
-- TEST 3: Peoria Lakes Dependencies
-- ============================================================================

DO $$
DECLARE
  dep_count INTEGER;
  dep_101_to_100 BOOLEAN;
  dep_102_to_100 BOOLEAN;
  dep_103_to_102 BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO dep_count
  FROM landscape.tbl_item_dependency d
  WHERE d.dependent_item_id IN (
    SELECT budget_item_id FROM landscape.tbl_budget_items WHERE project_id=7
  );

  -- Check specific dependencies
  SELECT EXISTS(
    SELECT 1 FROM landscape.tbl_item_dependency d
    JOIN landscape.tbl_budget_items b1 ON d.dependent_item_id = b1.budget_item_id
    JOIN landscape.tbl_budget_items b2 ON d.trigger_item_id = b2.budget_item_id
    WHERE b1.project_id=7 AND b1.description LIKE '101%'
      AND b2.description LIKE '100%'
      AND d.trigger_event='COMPLETE' AND d.offset_periods=1
  ) INTO dep_101_to_100;

  SELECT EXISTS(
    SELECT 1 FROM landscape.tbl_item_dependency d
    JOIN landscape.tbl_budget_items b1 ON d.dependent_item_id = b1.budget_item_id
    JOIN landscape.tbl_budget_items b2 ON d.trigger_item_id = b2.budget_item_id
    WHERE b1.project_id=7 AND b1.description LIKE '102%'
      AND b2.description LIKE '100%'
      AND d.trigger_event='COMPLETE' AND d.offset_periods=0
  ) INTO dep_102_to_100;

  SELECT EXISTS(
    SELECT 1 FROM landscape.tbl_item_dependency d
    JOIN landscape.tbl_budget_items b1 ON d.dependent_item_id = b1.budget_item_id
    JOIN landscape.tbl_budget_items b2 ON d.trigger_item_id = b2.budget_item_id
    WHERE b1.project_id=7 AND b1.description LIKE '103%'
      AND b2.description LIKE '102%'
      AND d.trigger_event='COMPLETE' AND d.offset_periods=1
  ) INTO dep_103_to_102;

  ASSERT dep_count = 3, 'Expected 3 dependencies for Peoria Lakes';
  ASSERT dep_101_to_100, 'Dependency 101→100 COMPLETE+1 not found';
  ASSERT dep_102_to_100, 'Dependency 102→100 COMPLETE+0 not found';
  ASSERT dep_103_to_102, 'Dependency 103→102 COMPLETE+1 not found';

  RAISE NOTICE '✅ TEST 3: Peoria dependencies (3: 101→100, 102→100, 103→102)';
END $$;

-- ============================================================================
-- TEST 4: Peoria Lakes Absorption Schedule
-- ============================================================================

DO $$
DECLARE
  absorption_count INTEGER;
  a1_exists BOOLEAN;
  a1_start INTEGER;
  a1_duration INTEGER;
  a1_units_per_period NUMERIC;
BEGIN
  SELECT COUNT(*) INTO absorption_count FROM landscape.tbl_absorption_schedule WHERE project_id=7;

  SELECT
    EXISTS(SELECT 1 FROM landscape.tbl_absorption_schedule WHERE project_id=7 AND revenue_stream_name LIKE 'A1%'),
    start_period,
    periods_to_complete,
    units_per_period
  INTO a1_exists, a1_start, a1_duration, a1_units_per_period
  FROM landscape.tbl_absorption_schedule
  WHERE project_id=7 AND revenue_stream_name LIKE 'A1%'
  LIMIT 1;

  ASSERT absorption_count = 1, 'Expected 1 absorption schedule for Peoria Lakes';
  ASSERT a1_exists, 'Absorption A1 not found';
  ASSERT a1_start = 6, 'A1 should start at P6';
  ASSERT a1_duration = 10, 'A1 should have duration 10';
  ASSERT a1_units_per_period = 8, 'A1 should have 8 units per period';

  RAISE NOTICE '✅ TEST 4: Peoria absorption (A1: P6, 10 periods, 8 units/period)';
END $$;

-- ============================================================================
-- TEST 5: Peoria Lakes Leases
-- ============================================================================

DO $$
DECLARE
  lease_count INTEGER;
  l1_exists BOOLEAN;
  l2_exists BOOLEAN;
  l1_sf NUMERIC;
  l2_sf NUMERIC;
  l2_pct_rent BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO lease_count FROM landscape.tbl_rent_roll WHERE project_id=7;

  SELECT EXISTS(SELECT 1 FROM landscape.tbl_rent_roll WHERE project_id=7 AND tenant_name LIKE 'L1%') INTO l1_exists;
  SELECT EXISTS(SELECT 1 FROM landscape.tbl_rent_roll WHERE project_id=7 AND tenant_name LIKE 'L2%') INTO l2_exists;

  SELECT leased_sf INTO l1_sf FROM landscape.tbl_rent_roll WHERE project_id=7 AND tenant_name LIKE 'L1%';
  SELECT leased_sf, has_percentage_rent INTO l2_sf, l2_pct_rent FROM landscape.tbl_rent_roll WHERE project_id=7 AND tenant_name LIKE 'L2%';

  ASSERT lease_count = 2, 'Expected 2 leases for Peoria Lakes';
  ASSERT l1_exists, 'Lease L1 (Office) not found';
  ASSERT l2_exists, 'Lease L2 (Retail) not found';
  ASSERT l1_sf = 10000, 'L1 should be 10,000 SF';
  ASSERT l2_sf = 5000, 'L2 should be 5,000 SF';
  ASSERT l2_pct_rent = TRUE, 'L2 should have percentage rent';

  RAISE NOTICE '✅ TEST 5: Peoria leases (L1-Office 10KSF, L2-Retail 5KSF w/ pct rent)';
END $$;

-- ============================================================================
-- TEST 6: Carney Power Center Leases
-- ============================================================================

DO $$
DECLARE
  lease_count INTEGER;
  all_retail BOOLEAN;
  all_5000sf BOOLEAN;
  all_pct_rent BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO lease_count FROM landscape.tbl_rent_roll WHERE project_id=8;

  SELECT COUNT(*) = 5 INTO all_retail
  FROM landscape.tbl_rent_roll
  WHERE project_id=8 AND space_type='RETAIL';

  SELECT COUNT(*) = 5 INTO all_5000sf
  FROM landscape.tbl_rent_roll
  WHERE project_id=8 AND leased_sf=5000;

  SELECT COUNT(*) = 5 INTO all_pct_rent
  FROM landscape.tbl_rent_roll
  WHERE project_id=8 AND has_percentage_rent=TRUE;

  ASSERT lease_count = 5, 'Expected 5 leases for Carney Power Center';
  ASSERT all_retail, 'All Carney leases should be RETAIL';
  ASSERT all_5000sf, 'All Carney leases should be 5,000 SF';
  ASSERT all_pct_rent, 'All Carney leases should have percentage rent';

  RAISE NOTICE '✅ TEST 6: Carney leases (5 retail tenants, 5KSF each, all w/ pct rent)';
END $$;

-- ============================================================================
-- TEST 7: Carney Has No Absorption (sales-based project)
-- ============================================================================

DO $$
DECLARE
  absorption_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO absorption_count FROM landscape.tbl_absorption_schedule WHERE project_id=8;

  ASSERT absorption_count = 0, 'Carney should have no absorption schedules (sales-based)';

  RAISE NOTICE '✅ TEST 7: Carney has no absorption (sales-based project)';
END $$;

-- ============================================================================
-- TEST 8: Peoria Has Equity & Debt
-- ============================================================================

DO $$
DECLARE
  debt_count INTEGER;
  equity_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO debt_count FROM landscape.tbl_debt_facility WHERE project_id=7;
  SELECT COUNT(*) INTO equity_count FROM landscape.tbl_equity_partner WHERE project_id=7;

  ASSERT debt_count >= 1, 'Peoria should have at least 1 debt facility';
  ASSERT equity_count >= 2, 'Peoria should have at least 2 equity partners (GP/LP)';

  RAISE NOTICE '✅ TEST 8: Peoria has debt facility and equity partners';
END $$;

-- ============================================================================
-- TEST 9: Project Isolation (no cross-contamination)
-- ============================================================================

DO $$
DECLARE
  peoria_budget_items INTEGER;
  carney_budget_items INTEGER;
  peoria_leases INTEGER;
  carney_leases INTEGER;
BEGIN
  SELECT COUNT(*) INTO peoria_budget_items FROM landscape.tbl_budget_items WHERE project_id=7;
  SELECT COUNT(*) INTO carney_budget_items FROM landscape.tbl_budget_items WHERE project_id=8;
  SELECT COUNT(*) INTO peoria_leases FROM landscape.tbl_rent_roll WHERE project_id=7;
  SELECT COUNT(*) INTO carney_leases FROM landscape.tbl_rent_roll WHERE project_id=8;

  ASSERT peoria_budget_items = 4, 'Peoria should have exactly 4 budget items';
  ASSERT carney_budget_items = 0, 'Carney should have no budget items';
  ASSERT peoria_leases = 2, 'Peoria should have exactly 2 leases';
  ASSERT carney_leases = 5, 'Carney should have exactly 5 leases';

  RAISE NOTICE '✅ TEST 9: Project isolation verified (no cross-contamination)';
END $$;

-- ============================================================================
-- TEST 10: Data Completeness
-- ============================================================================

DO $$
DECLARE
  total_projects INTEGER;
  total_budget_items INTEGER;
  total_dependencies INTEGER;
  total_absorption INTEGER;
  total_leases INTEGER;
  total_debt INTEGER;
  total_equity INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_projects FROM landscape.tbl_project WHERE project_id IN (7,8);
  SELECT COUNT(*) INTO total_budget_items FROM landscape.tbl_budget_items WHERE project_id IN (7,8);
  SELECT COUNT(*) INTO total_dependencies FROM landscape.tbl_item_dependency
    WHERE dependent_item_id IN (SELECT budget_item_id FROM landscape.tbl_budget_items WHERE project_id IN (7,8));
  SELECT COUNT(*) INTO total_absorption FROM landscape.tbl_absorption_schedule WHERE project_id IN (7,8);
  SELECT COUNT(*) INTO total_leases FROM landscape.tbl_rent_roll WHERE project_id IN (7,8);
  SELECT COUNT(*) INTO total_debt FROM landscape.tbl_debt_facility WHERE project_id IN (7,8);
  SELECT COUNT(*) INTO total_equity FROM landscape.tbl_equity_partner WHERE project_id IN (7,8);

  RAISE NOTICE '';
  RAISE NOTICE '📊 FIXTURE DATA SUMMARY:';
  RAISE NOTICE '   Projects: % (Peoria + Carney)', total_projects;
  RAISE NOTICE '   Budget Items: % (Peoria only)', total_budget_items;
  RAISE NOTICE '   Dependencies: % (Peoria only)', total_dependencies;
  RAISE NOTICE '   Absorption Schedules: % (Peoria only)', total_absorption;
  RAISE NOTICE '   Leases: % (Peoria 2 + Carney 5)', total_leases;
  RAISE NOTICE '   Debt Facilities: %', total_debt;
  RAISE NOTICE '   Equity Partners: %', total_equity;
  RAISE NOTICE '';

  ASSERT total_projects = 2, 'Should have 2 projects';
  ASSERT total_budget_items = 4, 'Should have 4 budget items total';
  ASSERT total_dependencies = 3, 'Should have 3 dependencies total';
  ASSERT total_absorption = 1, 'Should have 1 absorption schedule';
  ASSERT total_leases = 7, 'Should have 7 leases total';

  RAISE NOTICE '✅ TEST 10: Data completeness verified';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

ROLLBACK; -- Don't modify data during tests

SELECT '✅ ALL SMOKE TESTS PASSED' AS result;

SELECT
  'FIXTURE VERIFICATION COMPLETE' AS status,
  '10/10 tests passed' AS tests,
  'Peoria Lakes (ID=7) + Carney Power Center (ID=8)' AS projects,
  'Ready for calculation engine tests' AS next_step;
