-- ============================================================================
-- Migration: 20260505_add_feedback_working_summary.down.sql
-- Session:   LSCMD-FBLOG-0505-kp
-- Reverses:  20260505_add_feedback_working_summary.up.sql
--
-- WARNING: drops both columns. ANY data accumulated in working_summary or
-- active_chat_slug will be permanently destroyed. Back up first if you
-- care about the working-summary history:
--
--   COPY (SELECT id, working_summary, active_chat_slug
--           FROM landscape.tbl_feedback
--          WHERE working_summary IS NOT NULL OR active_chat_slug IS NOT NULL)
--     TO '/tmp/tbl_feedback_extras_backup.csv' WITH CSV HEADER;
--
-- (Run the COPY by hand from psql before invoking this rollback.)
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_feedback
  DROP COLUMN IF EXISTS active_chat_slug;

ALTER TABLE landscape.tbl_feedback
  DROP COLUMN IF EXISTS working_summary;
