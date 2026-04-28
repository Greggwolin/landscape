-- ============================================================================
-- Migration: 20260430_add_help_message_link.up.sql
-- Purpose:   Link tbl_feedback rows back to their originating tbl_help_message
--            row so the daily brief can show the LLM's prior answer inline
--            for backfilled FB items. Without this link, old questions look
--            orphaned in Section 1 ("Open Feedback") with no context for
--            what was discussed at the time.
--
-- Filename uses 2026-04-30 to sort AFTER 20260429_add_feedback_in_progress.
-- The earlier T2 suffix idea would sort BEFORE because 'T' (0x54) <
-- '_' (0x5F) in ASCII.
--
-- Idempotent:
--   - column added with the IF NOT EXISTS form
--   - partial index created with the IF NOT EXISTS form
--   - backfill UPDATE narrowed by source_help_message_id IS NULL so
--     re-runs do not re-link rows already pointed at a help_message id
--
-- Refs: daily-brief Phase 1
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_feedback
  ADD COLUMN IF NOT EXISTS source_help_message_id BIGINT;

CREATE INDEX IF NOT EXISTS ix_tbl_feedback_source_help_message_id
  ON landscape.tbl_feedback(source_help_message_id)
  WHERE source_help_message_id IS NOT NULL;

-- Backfill: match each tbl_feedback row to its originating tbl_help_message
-- row on (content, created_at, page_context). If multiple help_message rows
-- match (rare — same user asks the same thing in the same minute on the
-- same page), pick the lowest id deterministically.
WITH matches AS (
  SELECT
    f.id AS feedback_id,
    MIN(m.id) AS help_message_id
  FROM landscape.tbl_feedback f
  JOIN landscape.tbl_help_message m
    ON m.role = 'user'
   AND m.content = f.message_text
   AND m.created_at = f.created_at
   AND CONCAT('Help > ', COALESCE(m.current_page, 'general')) = f.page_context
  WHERE f.source_help_message_id IS NULL
  GROUP BY f.id
)
UPDATE landscape.tbl_feedback f
SET source_help_message_id = m.help_message_id
FROM matches m
WHERE f.id = m.feedback_id;

-- Diagnostic only — runner discards SELECT output. Logs how many feedback
-- rows had ambiguous matches (>1 help_message hits). If non-empty, those
-- rows still got the lowest-id pick above; this is an FYI for the operator.
SELECT f.id, COUNT(*) AS dupe_count
  FROM landscape.tbl_feedback f
  JOIN landscape.tbl_help_message m
    ON m.role = 'user'
   AND m.content = f.message_text
   AND m.created_at = f.created_at
 GROUP BY f.id
HAVING COUNT(*) > 1;
