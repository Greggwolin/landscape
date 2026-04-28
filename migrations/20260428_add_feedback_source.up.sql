-- ============================================================================
-- Migration: 20260428_add_feedback_source.up.sql
-- Purpose:   Separate true #FB captures from the one-shot tbl_help_message
--            backfill so the daily brief's Section 1 stops drowning in 280+
--            help-panel questions that were never bug reports.
--
-- Adds tbl_feedback.source ('backfill' | 'help_panel' | 'manual'). Existing
-- rows default to 'backfill'; rows where Discord acknowledged the embed
-- (discord_posted_at IS NOT NULL) flip to 'help_panel' since those are the
-- only ones that actually traversed the live capture path.
--
-- Refs: LANDSCAPE_DAILY_BRIEF_SPEC.md (follow-up C5)
--
-- Idempotent:
--   - column added with IF NOT EXISTS
--   - constraint guarded via the runner's pg_constraint intercept
--     (see scripts/run-migrations.mjs)
--   - UPDATE narrowed by `source = 'backfill'` so re-runs never re-flip
--     a row already in 'help_panel' or 'manual'
--   - index created with IF NOT EXISTS
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_feedback
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'backfill';

ALTER TABLE landscape.tbl_feedback
  ADD CONSTRAINT IF NOT EXISTS tbl_feedback_source_check
  CHECK (source IN ('backfill', 'help_panel', 'manual'));

UPDATE landscape.tbl_feedback
   SET source = 'help_panel'
 WHERE discord_posted_at IS NOT NULL
   AND source = 'backfill';

CREATE INDEX IF NOT EXISTS ix_tbl_feedback_source_status
  ON landscape.tbl_feedback(source, status);
