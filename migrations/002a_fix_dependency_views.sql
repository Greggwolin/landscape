-- =====================================================================
-- Fix Dependency Views - Patch for 002 Migration
-- Version: 1.5a
-- Date: 2025-10-13
-- Description: Fix views to work with existing budget timing structure
-- =====================================================================

SET search_path TO landscape, public;

-- Drop existing views (they failed due to column references)
DROP VIEW IF EXISTS landscape.vw_item_dependency_status CASCADE;
DROP VIEW IF EXISTS landscape.vw_budget_with_dependencies CASCADE;

-- =====================================================================
-- RECREATE VIEWS WITH CORRECT COLUMN REFERENCES
-- =====================================================================

-- View: Dependency status with calculated start periods
-- This is a simplified version that works with absorption schedule
CREATE OR REPLACE VIEW landscape.vw_item_dependency_status AS
SELECT
  d.dependency_id,
  d.dependent_item_type,
  d.dependent_item_table,
  d.dependent_item_id,
  d.trigger_event,
  d.trigger_value,
  d.offset_periods,
  d.is_hard_dependency,

  -- Trigger timing from absorption schedule (has start_period column)
  ab.start_period AS trigger_start_period,
  ab.start_period + ab.periods_to_complete AS trigger_completion_period,

  -- Calculate dependent item start period based on trigger
  CASE
    WHEN d.trigger_event='ABSOLUTE' THEN d.offset_periods
    WHEN d.trigger_event='COMPLETE' AND d.trigger_item_table='tbl_absorption_schedule'
      THEN ab.start_period + ab.periods_to_complete + d.offset_periods
    WHEN d.trigger_event='START' AND d.trigger_item_table='tbl_absorption_schedule'
      THEN ab.start_period + d.offset_periods
    WHEN d.trigger_event='PCT_COMPLETE' AND d.trigger_item_table='tbl_absorption_schedule'
      THEN ab.start_period + FLOOR(ab.periods_to_complete * (d.trigger_value/100.0)) + d.offset_periods
    ELSE d.offset_periods  -- Default to offset for other cases
  END AS calculated_start_period,

  NOW() AS calculated_at
FROM landscape.tbl_item_dependency d
LEFT JOIN landscape.tbl_absorption_schedule ab
  ON d.trigger_item_table='tbl_absorption_schedule' AND d.trigger_item_id=ab.absorption_id;

COMMENT ON VIEW landscape.vw_item_dependency_status IS 'Dependency status with calculated start periods (simplified for absorption triggers)';

-- View: Budget items with dependency information
-- Simplified to show dependency without period calculations (those require tbl_budget_timing joins)
CREATE OR REPLACE VIEW landscape.vw_budget_with_dependencies AS
SELECT
  bi.budget_item_id,
  bi.project_id,
  bi.structure_id,
  bi.amount,
  bi.quantity,
  bi.cost_per_unit,
  bi.timing_method,
  bi.timing_locked,
  bi.s_curve_profile,
  bi.actual_amount,
  bi.variance_amount,
  bi.variance_pct,

  d.dependency_id,
  d.trigger_event,
  d.trigger_value,
  d.offset_periods,
  d.is_hard_dependency,
  (d.dependency_id IS NOT NULL) AS has_dependency,

  -- Human-readable dependency summary
  CASE
    WHEN d.dependency_id IS NULL THEN 'No dependency'
    WHEN d.trigger_event='START' THEN
      'After ' || d.trigger_item_table || ' #' || d.trigger_item_id || ' starts' ||
      CASE WHEN d.offset_periods <> 0 THEN ' +' || d.offset_periods || 'p' ELSE '' END
    WHEN d.trigger_event='COMPLETE' THEN
      'After ' || d.trigger_item_table || ' #' || d.trigger_item_id || ' completes' ||
      CASE WHEN d.offset_periods <> 0 THEN ' +' || d.offset_periods || 'p' ELSE '' END
    WHEN d.trigger_event='PCT_COMPLETE' THEN
      'At ' || d.trigger_value || '% of ' || d.trigger_item_table || ' #' || d.trigger_item_id
    WHEN d.trigger_event='ABSOLUTE' THEN
      'Absolute period ' || d.offset_periods
    ELSE 'Unknown dependency'
  END AS dependency_summary
FROM landscape.tbl_budget_items bi
LEFT JOIN landscape.tbl_item_dependency d
  ON d.dependent_item_type='COST'
  AND d.dependent_item_table='tbl_budget_items'
  AND d.dependent_item_id=bi.budget_item_id;

COMMENT ON VIEW landscape.vw_budget_with_dependencies IS 'Budget items with dependency information (uses budget_item_id, not fact_id)';

-- =====================================================================
-- ADDITIONAL HELPER VIEWS
-- =====================================================================

-- View: Budget timing with dependencies
-- Shows the actual period-by-period timing for budget items
CREATE OR REPLACE VIEW landscape.vw_budget_timing_with_dependencies AS
SELECT
  bt.timing_id,
  bt.fact_id,
  bt.period_id,
  bt.amount AS period_amount,
  bt.timing_method,
  cp.period_start_date,
  cp.period_end_date,
  cp.period_number,

  -- Link to budget item
  bi.budget_item_id,
  bi.project_id,
  bi.structure_id,

  -- Dependency info
  d.dependency_id,
  d.trigger_event,
  d.has_dependency,
  d.dependency_summary

FROM landscape.tbl_budget_timing bt
JOIN landscape.core_fin_fact_budget cfb ON bt.fact_id = cfb.fact_id
JOIN landscape.tbl_budget_items bi ON cfb.budget_item_id = bi.budget_item_id
JOIN landscape.tbl_calculation_period cp ON bt.period_id = cp.period_id
LEFT JOIN landscape.vw_budget_with_dependencies d ON bi.budget_item_id = d.budget_item_id
ORDER BY bt.period_id, bi.budget_item_id;

COMMENT ON VIEW landscape.vw_budget_timing_with_dependencies IS 'Budget timing by period with dependency information';

-- View: Absorption schedule with dependencies
CREATE OR REPLACE VIEW landscape.vw_absorption_with_dependencies AS
SELECT
  ab.absorption_id,
  ab.project_id,
  ab.area_id,
  ab.phase_id,
  ab.parcel_id,
  ab.revenue_stream_name,
  ab.revenue_category,
  ab.start_period,
  ab.periods_to_complete,
  ab.timing_method,
  ab.units_per_period,
  ab.total_units,
  ab.base_price_per_unit,
  ab.price_escalation_pct,

  d.dependency_id,
  d.trigger_event,
  d.trigger_value,
  d.offset_periods,
  d.is_hard_dependency,
  (d.dependency_id IS NOT NULL) AS has_dependency,

  -- Human-readable dependency summary
  CASE
    WHEN d.dependency_id IS NULL THEN 'No dependency'
    WHEN d.trigger_event='START' THEN
      'After ' || d.trigger_item_table || ' #' || d.trigger_item_id || ' starts' ||
      CASE WHEN d.offset_periods <> 0 THEN ' +' || d.offset_periods || 'p' ELSE '' END
    WHEN d.trigger_event='COMPLETE' THEN
      'After ' || d.trigger_item_table || ' #' || d.trigger_item_id || ' completes' ||
      CASE WHEN d.offset_periods <> 0 THEN ' +' || d.offset_periods || 'p' ELSE '' END
    WHEN d.trigger_event='PCT_COMPLETE' THEN
      'At ' || d.trigger_value || '% of ' || d.trigger_item_table || ' #' || d.trigger_item_id
    WHEN d.trigger_event='ABSOLUTE' THEN
      'Absolute period ' || ab.start_period
    ELSE 'Unknown dependency'
  END AS dependency_summary

FROM landscape.tbl_absorption_schedule ab
LEFT JOIN landscape.tbl_item_dependency d
  ON d.dependent_item_type='REVENUE'
  AND d.dependent_item_table='tbl_absorption_schedule'
  AND d.dependent_item_id=ab.absorption_id;

COMMENT ON VIEW landscape.vw_absorption_with_dependencies IS 'Absorption schedules with dependency information and summaries';

-- =====================================================================
-- MIGRATION PATCH COMPLETE
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE 'Dependency views patch (002a) completed successfully at %', NOW();
  RAISE NOTICE 'Views recreated: vw_item_dependency_status, vw_budget_with_dependencies';
  RAISE NOTICE 'Views added: vw_budget_timing_with_dependencies, vw_absorption_with_dependencies';
END$$;
