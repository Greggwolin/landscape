-- ============================================================================
-- Migration: 20260429_create_artifact_tables.down.sql
-- Purpose:   Reverse 20260429_create_artifact_tables.up.sql.
--            Manual rollback only (the runner picks up *.up.sql files).
-- ============================================================================

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.idx_artifact_version_artifact_time;
DROP INDEX IF EXISTS landscape.idx_artifact_version_artifact_recent;
DROP TABLE IF EXISTS landscape.tbl_artifact_version;

DROP INDEX IF EXISTS landscape.idx_artifact_pinned;
DROP INDEX IF EXISTS landscape.idx_artifact_thread;
DROP INDEX IF EXISTS landscape.idx_artifact_project_recent;
DROP TABLE IF EXISTS landscape.tbl_artifact;

ALTER TABLE landscape.tbl_project
  DROP CONSTRAINT IF EXISTS tbl_project_artifact_cascade_mode_check;

ALTER TABLE landscape.tbl_project
  DROP COLUMN IF EXISTS artifact_cascade_mode;
