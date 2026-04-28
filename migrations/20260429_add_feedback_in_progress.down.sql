-- ============================================================================
-- Migration: 20260429_add_feedback_in_progress.down.sql
-- Manual rollback for 20260429_add_feedback_in_progress.up.sql.
-- The runner only auto-applies *.up.sql; this file is psql-only.
-- ============================================================================

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.ix_tbl_feedback_in_progress;

ALTER TABLE landscape.tbl_feedback DROP COLUMN IF EXISTS started_at;
ALTER TABLE landscape.tbl_feedback DROP COLUMN IF EXISTS in_progress_session_slug;
ALTER TABLE landscape.tbl_feedback DROP COLUMN IF EXISTS in_progress_branch;

ALTER TABLE landscape.tbl_feedback DROP CONSTRAINT IF EXISTS tbl_feedback_status_check;

ALTER TABLE landscape.tbl_feedback
  ADD CONSTRAINT tbl_feedback_status_check
  CHECK (status IN ('open', 'addressed', 'closed', 'wontfix', 'duplicate'));

-- Rolling promote back to 'backfill' is destructive (loses any post-promote
-- transitions) so it is intentionally not done here. If you need to revert
-- the promote, do it manually with WHERE clauses tighter than this file's.
