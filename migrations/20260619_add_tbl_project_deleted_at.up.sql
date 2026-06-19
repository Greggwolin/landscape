-- 20260619_add_tbl_project_deleted_at.up.sql
-- FB-318: project tiles need an Open / Archive / Delete affordance.
-- Archive reuses the existing is_active flag (already filtered out of the list).
-- Delete is a soft-delete: a distinct deleted_at timestamp so deleted projects
-- stay distinguishable from merely-archived ones and remain recoverable by a
-- direct data change. Mainly for projects created by accident or in error.
--
-- Safe to apply live: all existing rows get deleted_at = NULL (not deleted),
-- so list/detail behavior is unchanged until a project is explicitly deleted.

ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Partial index keeps the "not deleted" list scan cheap as deleted rows accrue.
CREATE INDEX IF NOT EXISTS idx_tbl_project_not_deleted
  ON landscape.tbl_project (project_id)
  WHERE deleted_at IS NULL;
