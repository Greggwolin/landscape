-- Make pending_mutations.project_id nullable for create_project mutations.
--
-- create_project mutations originate from unassigned threads (project_id IS NULL).
-- No project exists yet at proposal time — the project is created on confirm.
-- The FK to tbl_project already supports NULL (ON DELETE CASCADE still applies
-- for non-null values).
--
-- Companion to 20260417_drop_mutation_type_check.sql (same S6 fix chain).

-- UP
BEGIN;

ALTER TABLE landscape.pending_mutations
  ALTER COLUMN project_id DROP NOT NULL;

-- mutation_audit_log also receives project_id from _log_audit();
-- make it nullable too so create_project audit entries don't fail.
-- Safe no-op if already nullable.
ALTER TABLE landscape.mutation_audit_log
  ALTER COLUMN project_id DROP NOT NULL;

COMMIT;

-- DOWN (rollback)
-- BEGIN;
-- -- WARNING: Must DELETE or UPDATE any rows with project_id IS NULL first.
-- -- UPDATE landscape.pending_mutations SET project_id = ... WHERE project_id IS NULL;
-- ALTER TABLE landscape.pending_mutations
--   ALTER COLUMN project_id SET NOT NULL;
-- COMMIT;
