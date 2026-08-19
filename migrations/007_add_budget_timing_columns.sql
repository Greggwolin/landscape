-- Migration 007: Add Timing Columns to tbl_budget_items
-- Date: 2025-10-14
-- Purpose: Add start_period and periods_to_complete to tbl_budget_items
--          to support timeline calculation and dependency resolution

SET search_path TO landscape, public;

-- ============================================================================
-- ADD COLUMNS
-- ============================================================================

-- Add start_period (nullable - will be calculated by timeline API)
ALTER TABLE landscape.tbl_budget_items
ADD COLUMN IF NOT EXISTS start_period INTEGER;

COMMENT ON COLUMN landscape.tbl_budget_items.start_period IS
'Calculated or manually set start period (P0, P1, etc.)';

-- Add periods_to_complete (nullable - can inherit from structure)
ALTER TABLE landscape.tbl_budget_items
ADD COLUMN IF NOT EXISTS periods_to_complete INTEGER;

COMMENT ON COLUMN landscape.tbl_budget_items.periods_to_complete IS
'Duration in periods for this budget item';

-- ============================================================================
-- POPULATE FROM STRUCTURE DEFAULTS
-- ============================================================================

-- Populate periods_to_complete from structure defaults
UPDATE landscape.tbl_budget_items bi
SET periods_to_complete = bs.periods_to_complete
FROM landscape.tbl_budget_structure bs
WHERE bi.structure_id = bs.structure_id
  AND bi.periods_to_complete IS NULL
  AND bs.periods_to_complete IS NOT NULL;

-- Populate start_period from structure defaults (only for ABSOLUTE timing)
UPDATE landscape.tbl_budget_items bi
SET start_period = bs.start_period
FROM landscape.tbl_budget_structure bs
WHERE bi.structure_id = bs.structure_id
  AND bi.start_period IS NULL
  AND bi.timing_method = 'ABSOLUTE'
  AND bs.start_period IS NOT NULL;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_budget_items_timing
ON landscape.tbl_budget_items(project_id, start_period, timing_method);

-- ============================================================================
-- UPDATE VIEWS (if needed)
-- ============================================================================

-- Recreate vw_budget_with_dependencies to include new columns
DROP VIEW IF EXISTS landscape.vw_budget_with_dependencies CASCADE;

CREATE OR REPLACE VIEW landscape.vw_budget_with_dependencies AS
SELECT
  bi.budget_item_id,
  bi.project_id,
  bi.structure_id,
  bs.scope,
  bs.category,
  bs.detail AS description,
  bi.amount,
  bi.quantity,
  bi.cost_per_unit,
  bi.notes,
  bi.timing_method,
  bi.timing_locked,
  bi.start_period,              -- NEW
  bi.periods_to_complete,       -- NEW
  bi.s_curve_profile,
  bi.actual_amount,
  bi.variance_amount,
  bi.variance_pct,
  d.dependency_id,
  d.trigger_event,
  d.trigger_value,
  d.offset_periods,
  d.is_hard_dependency,
  CASE WHEN d.dependency_id IS NOT NULL THEN TRUE ELSE FALSE END AS has_dependency,
  CASE
    WHEN d.dependency_id IS NULL THEN 'No dependency'
    WHEN d.trigger_event = 'ABSOLUTE' THEN 'Starts at period ' || d.offset_periods::TEXT
    WHEN d.trigger_event = 'START' THEN 'After ' || d.trigger_item_table || ' #' || d.trigger_item_id || ' starts' ||
      CASE WHEN d.offset_periods > 0 THEN ' +' || d.offset_periods || 'p' ELSE '' END
    WHEN d.trigger_event = 'COMPLETE' THEN 'After ' || d.trigger_item_table || ' #' || d.trigger_item_id || ' completes' ||
      CASE WHEN d.offset_periods > 0 THEN ' +' || d.offset_periods || 'p' ELSE '' END
    WHEN d.trigger_event = 'PCT_COMPLETE' THEN 'After ' || d.trigger_item_table || ' #' || d.trigger_item_id ||
      ' reaches ' || COALESCE(d.trigger_value, 50)::TEXT || '%' ||
      CASE WHEN d.offset_periods > 0 THEN ' +' || d.offset_periods || 'p' ELSE '' END
    ELSE 'Unknown dependency'
  END AS dependency_summary
FROM landscape.tbl_budget_items bi
JOIN landscape.tbl_budget_structure bs ON bi.structure_id = bs.structure_id
LEFT JOIN landscape.tbl_item_dependency d
  ON d.dependent_item_type = 'COST'
  AND d.dependent_item_table = 'tbl_budget_items'
  AND d.dependent_item_id = bi.budget_item_id;

COMMENT ON VIEW landscape.vw_budget_with_dependencies IS
'Budget items with dependency information and timing columns';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
  idx_count INTEGER;
BEGIN
  -- Verify columns exist
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'landscape'
    AND table_name = 'tbl_budget_items'
    AND column_name IN ('start_period', 'periods_to_complete');

  IF col_count <> 2 THEN
    RAISE EXCEPTION 'Expected 2 new columns, found %', col_count;
  END IF;

  -- Verify index exists
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'landscape'
    AND tablename = 'tbl_budget_items'
    AND indexname = 'idx_budget_items_timing';

  IF idx_count <> 1 THEN
    RAISE EXCEPTION 'Expected timing index, not found';
  END IF;

  RAISE NOTICE '✅ Migration 007: Add Budget Timing Columns Complete';
  RAISE NOTICE '   - 2 columns added to tbl_budget_items';
  RAISE NOTICE '   - Default values populated from tbl_budget_structure';
  RAISE NOTICE '   - 1 index created for timeline queries';
  RAISE NOTICE '   - vw_budget_with_dependencies updated';
  RAISE NOTICE '   - Ready for timeline calculation API';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
-- DROP INDEX landscape.idx_budget_items_timing;
-- ALTER TABLE landscape.tbl_budget_items DROP COLUMN IF EXISTS start_period;
-- ALTER TABLE landscape.tbl_budget_items DROP COLUMN IF EXISTS periods_to_complete;
-- (Then recreate original vw_budget_with_dependencies)
