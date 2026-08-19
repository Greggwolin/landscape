BEGIN;

-- Remove the growth_rate_set_id column from budget facts
ALTER TABLE landscape.core_fin_fact_budget
DROP COLUMN IF EXISTS growth_rate_set_id;

-- Drop the trigger and function
DROP TRIGGER IF EXISTS trigger_calculate_thru_period ON landscape.core_fin_growth_rate_steps;
DROP FUNCTION IF EXISTS landscape.calculate_thru_period();
DROP FUNCTION IF EXISTS landscape.get_growth_rate(INTEGER, INTEGER);

-- Drop indexes
DROP INDEX IF EXISTS landscape.idx_growth_rate_steps_set;
DROP INDEX IF EXISTS landscape.idx_growth_rate_sets_project_card;

-- Drop tables (CASCADE will handle foreign key dependencies)
DROP TABLE IF EXISTS landscape.core_fin_growth_rate_steps CASCADE;
DROP TABLE IF EXISTS landscape.core_fin_growth_rate_sets CASCADE;

COMMIT;