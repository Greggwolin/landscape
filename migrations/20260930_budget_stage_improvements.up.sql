-- 2026-09-30 (chat HQ) — APPLIED to the live database the same day, by hand, with backups.
-- Budget-line stage vocabulary: the rule allowed 'Development' where the backend
-- allowlist (VALID_ACTIVITIES), the category stage list and the screens all say 'Improvements'.
-- Backup of changed rows: landscape.bak_budget_activity_20260930 (fact_id, project_id, activity).
-- Register: _project_logs/renames.md.
BEGIN;
ALTER TABLE landscape.core_fin_fact_budget DROP CONSTRAINT chk_budget_lifecycle_stage;
UPDATE landscape.core_fin_fact_budget SET activity = 'Improvements' WHERE activity = 'Development';
ALTER TABLE landscape.core_fin_fact_budget ADD CONSTRAINT chk_budget_lifecycle_stage
  CHECK (activity IS NULL OR activity IN ('Acquisition','Planning & Engineering','Improvements','Operations','Disposition','Financing'));
COMMIT;
