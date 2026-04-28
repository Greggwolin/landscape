-- ============================================================================
-- Migration: 20260428_add_feedback_source.down.sql
-- Manual rollback for 20260428_add_feedback_source.up.sql.
-- The runner only auto-applies *.up.sql; this file is psql-only.
-- ============================================================================

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.ix_tbl_feedback_source_status;

ALTER TABLE landscape.tbl_feedback
  DROP CONSTRAINT IF EXISTS tbl_feedback_source_check;

ALTER TABLE landscape.tbl_feedback
  DROP COLUMN IF EXISTS source;
