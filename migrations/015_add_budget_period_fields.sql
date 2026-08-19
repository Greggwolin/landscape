-- Migration 015: Add period-based timing fields to budget
-- Date: 2025-11-07
-- Purpose: Support period number timing instead of calendar dates for budget items

BEGIN;

-- Add start_period (period number: 1, 2, 3, etc.)
ALTER TABLE landscape.core_fin_fact_budget
ADD COLUMN IF NOT EXISTS start_period INTEGER;

-- Add periods (duration in periods)
ALTER TABLE landscape.core_fin_fact_budget
ADD COLUMN IF NOT EXISTS periods INTEGER;

-- Add end_period (calculated field, but useful for queries)
ALTER TABLE landscape.core_fin_fact_budget
ADD COLUMN IF NOT EXISTS end_period INTEGER;

-- Add comments
COMMENT ON COLUMN landscape.core_fin_fact_budget.start_period IS 'Starting period number (1, 2, 3, etc.)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.periods IS 'Duration in number of periods';
COMMENT ON COLUMN landscape.core_fin_fact_budget.end_period IS 'Ending period number (start_period + periods - 1)';

-- Create function to auto-calculate end_period
CREATE OR REPLACE FUNCTION landscape.trg_calculate_end_period()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate end_period if start_period and periods are provided
  IF NEW.start_period IS NOT NULL AND NEW.periods IS NOT NULL THEN
    NEW.end_period := NEW.start_period + NEW.periods - 1;
  ELSE
    NEW.end_period := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate end_period
DROP TRIGGER IF EXISTS trg_budget_calculate_end_period ON landscape.core_fin_fact_budget;
CREATE TRIGGER trg_budget_calculate_end_period
  BEFORE INSERT OR UPDATE ON landscape.core_fin_fact_budget
  FOR EACH ROW
  EXECUTE FUNCTION landscape.trg_calculate_end_period();

-- Create index for period-based queries
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget_periods
ON landscape.core_fin_fact_budget(start_period, end_period)
WHERE start_period IS NOT NULL;

COMMIT;

-- Rollback script (if needed):
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_budget_calculate_end_period ON landscape.core_fin_fact_budget;
-- DROP FUNCTION IF EXISTS landscape.trg_calculate_end_period();
-- DROP INDEX IF EXISTS landscape.idx_core_fin_fact_budget_periods;
-- ALTER TABLE landscape.core_fin_fact_budget DROP COLUMN IF EXISTS end_period;
-- ALTER TABLE landscape.core_fin_fact_budget DROP COLUMN IF EXISTS periods;
-- ALTER TABLE landscape.core_fin_fact_budget DROP COLUMN IF EXISTS start_period;
-- COMMIT;
