-- Reverses 20260930_budget_stage_improvements.up.sql using the dated backup table.
BEGIN;
ALTER TABLE landscape.core_fin_fact_budget DROP CONSTRAINT chk_budget_lifecycle_stage;
UPDATE landscape.core_fin_fact_budget f SET activity = b.activity
  FROM landscape.bak_budget_activity_20260930 b WHERE b.fact_id = f.fact_id;
ALTER TABLE landscape.core_fin_fact_budget ADD CONSTRAINT chk_budget_lifecycle_stage
  CHECK (activity IS NULL OR activity IN ('Acquisition','Planning & Engineering','Development','Operations','Disposition','Financing'));
COMMIT;
