-- ============================================================================
-- Migration: 20260505_add_feedback_working_summary.up.sql
-- Session:   LSCMD-FBLOG-0505-kp
-- Purpose:   Two new columns on tbl_feedback to support the live working
--            dashboard rework (Phase 1 of LSCMD-FBLOG-0505-kp):
--
--   (1) working_summary — chronological line-stream of inflection-point
--       summaries appended by Cowork during chats tied to a feedback item
--       (per Phase 3 of the prompt). Append-only, never rewritten by
--       Cowork. Format: one line per inflection point, each prefixed with
--       a timestamp (YYYY-MM-DD HH:MM) and a type tag ([start], [decision],
--       [edit], [blocker], [user-input], [resolved], [closed]).
--
--   (2) active_chat_slug — slug of the Cowork chat most recently observed
--       referencing this feedback id, populated by the hourly polling skill
--       (per Phase 4 of the prompt). Last-write-wins; the hourly poll
--       overwrites prior values.
--
-- Why active_chat_slug is distinct from the existing in_progress_session_slug:
--   - in_progress_session_slug is set by `python manage.py start_feedback`
--     when an item is *officially assigned* to a chat. Manual.
--   - active_chat_slug is set by the hourly auto-poller and reflects the
--     *most recent* chat to mention this feedback id, regardless of who
--     started it. Automatic.
--   These can diverge: a chat manually assigned vs a chat actively
--   working. Both signals are useful in the artifact.
--
-- Both columns are nullable with no default; existing rows stay clean
-- and rendering code falls back to "no summary yet" / "no active chat"
-- when null.
--
-- No new indexes:
--   - working_summary is only read/written by feedback id (PK) — never
--     filtered or searched.
--   - active_chat_slug ditto. If a future query pattern emerges
--     ("all in-progress items with an active chat in the last hour"),
--     add a partial index then.
--
-- Idempotent: IF NOT EXISTS on both column adds; column comments are
-- replaced unconditionally (cheap, deterministic).
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_feedback
  ADD COLUMN IF NOT EXISTS working_summary TEXT;

ALTER TABLE landscape.tbl_feedback
  ADD COLUMN IF NOT EXISTS active_chat_slug TEXT;

COMMENT ON COLUMN landscape.tbl_feedback.working_summary IS
  'Chronological inflection-point log appended by Cowork during chats tied to this feedback. One line per turn, prefixed with timestamp and type tag. Never rewritten.';

COMMENT ON COLUMN landscape.tbl_feedback.active_chat_slug IS
  'Slug of the Cowork chat most recently observed referencing this feedback id. Set by hourly polling skill. Distinct from in_progress_session_slug (manual ownership assignment).';
