-- 20260619_add_tbl_project_deleted_at.down.sql
-- Rollback for FB-318 soft-delete column.

DROP INDEX IF EXISTS landscape.idx_tbl_project_not_deleted;

ALTER TABLE landscape.tbl_project
  DROP COLUMN IF EXISTS deleted_at;
