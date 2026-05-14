-- ============================================================================
-- Rollback: 20260514_make_project_type_code_nullable.down.sql
-- Purpose:  Restore NOT NULL on tbl_project.project_type_code.
--
-- WARNING:  If any user_home rows exist with project_type_code=NULL when this
-- rollback runs, the ALTER will fail. Backfill those rows with 'LAND' (the
-- prior column default) first, or delete them before rolling back.
--
--           UPDATE landscape.tbl_project
--           SET project_type_code = 'LAND'
--           WHERE project_type_code IS NULL;
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_project
  ALTER COLUMN project_type_code SET NOT NULL;
