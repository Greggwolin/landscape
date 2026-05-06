-- ============================================================================
-- Rollback: 20260505_artifact_dedup_key.down.sql
-- Reverses 20260505_artifact_dedup_key.up.sql.
-- ============================================================================

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.idx_artifact_dedup_lookup;

ALTER TABLE landscape.tbl_artifact
  DROP COLUMN IF EXISTS dedup_key;
