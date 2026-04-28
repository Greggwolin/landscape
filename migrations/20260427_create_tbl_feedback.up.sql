-- ============================================================================
-- Migration: 20260427_create_tbl_feedback.up.sql
-- Purpose:   Persistent feedback tracker for #FB Help-panel captures.
--            Replaces Discord-webhook-only flow with a queryable lifecycle
--            table feeding the nightly Daily Brief generator.
--
-- Refs:      Landscape app/LANDSCAPE_DAILY_BRIEF_SPEC.md sections 3, 11
--
-- Idempotent: uses IF NOT EXISTS on table + indexes; backfill is guarded by
-- a "table is empty" check so re-runs (the migration runner re-applies all
-- .up.sql files every invocation) do not duplicate rows.
-- ============================================================================

SET search_path TO landscape, public;

-- ────────────────────────────────────────────────────────────────────────────
-- UP — Schema
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS landscape.tbl_feedback (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  user_id         INTEGER,
  user_name       TEXT,
  user_email      TEXT,
  page_context    TEXT,
  project_id      INTEGER,
  project_name    TEXT,

  message_text    TEXT NOT NULL,

  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'addressed', 'closed', 'wontfix', 'duplicate')),
  addressed_at    TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  resolved_by_commit_sha   TEXT,
  resolved_by_commit_url   TEXT,
  resolution_notes TEXT,
  duplicate_of_id BIGINT REFERENCES landscape.tbl_feedback(id),

  discord_message_id TEXT,
  discord_posted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_tbl_feedback_status_created
  ON landscape.tbl_feedback(status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_tbl_feedback_project_id
  ON landscape.tbl_feedback(project_id) WHERE project_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- UP — One-shot backfill from tbl_help_message (spec §11.1)
-- Only fires when tbl_feedback is empty so subsequent re-runs (or
-- post-rollback re-application) work correctly without duplicating rows.
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO landscape.tbl_feedback (
  created_at, page_context, message_text, status
)
SELECT
  m.created_at,
  CONCAT('Help > ', COALESCE(m.current_page, 'general')),
  m.content,
  'open'
FROM landscape.tbl_help_message m
WHERE m.role = 'user'
  AND m.content IS NOT NULL
  AND LENGTH(TRIM(m.content)) > 0
  AND NOT EXISTS (SELECT 1 FROM landscape.tbl_feedback);

-- ────────────────────────────────────────────────────────────────────────────
-- DOWN  (manual rollback — uncomment and run separately if needed)
-- ────────────────────────────────────────────────────────────────────────────
--
-- DROP INDEX IF EXISTS landscape.ix_tbl_feedback_project_id;
-- DROP INDEX IF EXISTS landscape.ix_tbl_feedback_status_created;
-- DROP TABLE IF EXISTS landscape.tbl_feedback;
