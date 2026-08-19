BEGIN;

DROP INDEX IF EXISTS idx_budget_timing_period;
DROP INDEX IF EXISTS idx_budget_timing_fact;
DROP TABLE IF EXISTS landscape.tbl_budget_timing;

DROP INDEX IF EXISTS idx_calculation_period_project;
DROP TABLE IF EXISTS landscape.tbl_calculation_period;

COMMIT;
