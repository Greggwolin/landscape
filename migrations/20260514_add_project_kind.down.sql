-- ============================================================================
-- Rollback: 20260514_add_project_kind.down.sql
-- Purpose:  Reverse 20260514_add_project_kind.up.sql.
--
-- WARNING:  Dropping project_kind makes user_home rows indistinguishable from
-- real estate projects. Before running this rollback in any environment where
-- the column is non-default ('user_home') for some rows, decide whether to
-- DELETE those rows first or accept that they will become visible as projects.
-- ============================================================================

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.idx_tbl_project_kind_real_estate;
DROP INDEX IF EXISTS landscape.idx_tbl_project_user_home;

ALTER TABLE landscape.tbl_project
  DROP CONSTRAINT IF EXISTS chk_tbl_project_kind;

ALTER TABLE landscape.tbl_project
  DROP COLUMN IF EXISTS project_kind;
