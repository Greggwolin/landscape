-- Validation Test: Peoria Lakes Phase 1
-- Quick test fixture for dependency resolution validation
-- Based on validation checklist requirements

BEGIN;

-- Cleanup
DELETE FROM landscape.tbl_item_dependency WHERE dependent_item_id IN (
  SELECT budget_item_id FROM landscape.tbl_budget_items WHERE project_id = 7
);
DELETE FROM landscape.tbl_budget_items WHERE project_id = 7;
DELETE FROM landscape.tbl_absorption_schedule WHERE project_id = 7;
DELETE FROM landscape.tbl_rent_roll WHERE project_id = 7;
DELETE FROM landscape.tbl_debt_facility WHERE project_id = 7;
DELETE FROM landscape.tbl_equity_partner WHERE project_id = 7;
DELETE FROM landscape.tbl_project WHERE project_id = 7;

-- Insert Peoria Lakes project
INSERT INTO landscape.tbl_project (
  project_id,
  project_name,
  project_type,
  project_address,
  jurisdiction_city,
  jurisdiction_state,
  jurisdiction_county,
  analysis_start_date,
  start_date
) VALUES (
  7,
  'Peoria Lakes Phase 1',
  'Land Development',
  '15000 N Lake Pleasant Parkway',
  'Peoria',
  'AZ',
  'Maricopa',
  '2025-01-01',
  '2025-01-01'
);

-- Insert 4 budget items with timing
INSERT INTO landscape.tbl_budget_items (
  budget_item_id,
  project_id,
  category,
  description,
  amount,
  timing_method,
  start_period,
  periods_to_complete,
  s_curve_profile
) VALUES
  (100, 7, 'SITE_WORK', '100 - Mass Grading', 1200000, 'ABSOLUTE', 0, 4, 'LINEAR'),
  (101, 7, 'INFRASTRUCTURE', '101 - Utilities', 800000, 'DEPENDENT', NULL, 3, 'LINEAR'),
  (102, 7, 'INFRASTRUCTURE', '102 - Roads', 1500000, 'DEPENDENT', NULL, 4, 'LINEAR'),
  (103, 7, 'AMENITIES', '103 - Landscaping', 300000, 'DEPENDENT', NULL, 2, 'LINEAR');

-- Insert dependencies (from Canvas 8)
-- 101 depends on 100 COMPLETE + 1 period offset
-- 102 depends on 100 COMPLETE + 0 period offset
-- 103 depends on 102 COMPLETE + 1 period offset
INSERT INTO landscape.tbl_item_dependency (
  dependent_item_type,
  dependent_item_table,
  dependent_item_id,
  trigger_item_type,
  trigger_item_table,
  trigger_item_id,
  trigger_event,
  offset_periods,
  is_hard_dependency
) VALUES
  ('COST', 'tbl_budget_items', 101, 'COST', 'tbl_budget_items', 100, 'COMPLETE', 1, TRUE),
  ('COST', 'tbl_budget_items', 102, 'COST', 'tbl_budget_items', 100, 'COMPLETE', 0, TRUE),
  ('COST', 'tbl_budget_items', 103, 'COST', 'tbl_budget_items', 102, 'COMPLETE', 1, TRUE);

-- Insert absorption schedule (80 lots, 8 per period, starting P6)
INSERT INTO landscape.tbl_absorption_schedule (
  project_id,
  revenue_stream_name,
  revenue_category,
  timing_method,
  start_period,
  periods_to_complete,
  units_per_period,
  total_units,
  base_price_per_unit,
  price_escalation_pct
) VALUES (
  7,
  'For-Sale Lots',
  'Lot Sales',
  'ABSOLUTE',
  6,
  10,
  8.0,
  80,
  85000.00,
  0.005
);

COMMIT;

-- Verification queries
SELECT '✅ PROJECT CREATED' as status, project_id, project_name FROM landscape.tbl_project WHERE project_id = 7;
SELECT '✅ BUDGET ITEMS CREATED' as status, COUNT(*) as count FROM landscape.tbl_budget_items WHERE project_id = 7;
SELECT '✅ DEPENDENCIES CREATED' as status, COUNT(*) as count FROM landscape.tbl_item_dependency
WHERE dependent_item_id IN (SELECT budget_item_id FROM landscape.tbl_budget_items WHERE project_id = 7);
SELECT '✅ ABSORPTION CREATED' as status, COUNT(*) as count FROM landscape.tbl_absorption_schedule WHERE project_id = 7;

-- Show dependency status view
SELECT
  '✅ DEPENDENCY VIEW' as status,
  budget_item_id,
  description,
  timing_method,
  start_period,
  periods_to_complete
FROM landscape.vw_budget_with_dependencies
WHERE project_id = 7
ORDER BY budget_item_id;
