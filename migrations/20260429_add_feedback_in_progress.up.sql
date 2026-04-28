-- ============================================================================
-- Migration: 20260429_add_feedback_in_progress.up.sql
-- Purpose:   Two related changes to make the daily brief useful:
--   (1) Promote real feedback (Feb 19+ from tbl_help_message) out of the
--       'backfill' source bucket so the brief surfaces them.
--   (2) Add an 'in_progress' lifecycle state plus columns recording which
--       branch / Cowork chat is working on each item, so the brief can show
--       a "Being worked on" banner per the redesign mockup.
--
-- Filename uses tomorrow's date (2026-04-29) so it sorts AFTER
-- 20260428_add_feedback_source.up.sql. The earlier T2-suffix proposal would
-- have sorted BEFORE because 'T' (0x54) < '_' (0x5F) in ASCII.
--
-- Idempotent:
--   - Promote UPDATE narrowed by source='backfill' so re-runs do not flip
--     rows already at 'help_panel' or 'manual'.
--   - The status check is dropped and re-added under the runner's
--     pg_constraint intercept (see scripts/run-migrations.mjs).
--   - Columns added with the IF NOT EXISTS form.
--   - Partial index created with the IF NOT EXISTS form.
--
-- Refs: daily-brief redesign (replaces in-flight C6)
-- ============================================================================

SET search_path TO landscape, public;

-- 1. Promote real feedback out of backfill bucket.
--    Items prior to 2026-02-19 are demo conversations from initial Help-panel
--    testing; everything from that date forward is real feedback that should
--    surface on the brief.
UPDATE landscape.tbl_feedback
   SET source = 'help_panel'
 WHERE source = 'backfill'
   AND created_at >= '2026-02-19'::timestamptz;

-- 2. Lifecycle state — replace the existing status check with one that
--    includes 'in_progress'.
ALTER TABLE landscape.tbl_feedback
  DROP CONSTRAINT IF EXISTS tbl_feedback_status_check;

ALTER TABLE landscape.tbl_feedback
  ADD CONSTRAINT IF NOT EXISTS tbl_feedback_status_check
  CHECK (status IN ('open', 'in_progress', 'addressed', 'closed', 'wontfix', 'duplicate'));

-- 3. Columns recording who/what is working on an in-progress item.
ALTER TABLE landscape.tbl_feedback
  ADD COLUMN IF NOT EXISTS in_progress_branch TEXT;

ALTER TABLE landscape.tbl_feedback
  ADD COLUMN IF NOT EXISTS in_progress_session_slug TEXT;

ALTER TABLE landscape.tbl_feedback
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 4. Partial index — Section 1 of the brief joins on this every render.
CREATE INDEX IF NOT EXISTS ix_tbl_feedback_in_progress
  ON landscape.tbl_feedback(status) WHERE status = 'in_progress';
