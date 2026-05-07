-- ============================================================================
-- Migration: 20260505_thread_archive_fields.up.sql
-- Purpose:   Universal Archive Pattern Phase 1a (chat threads).
--
--            Adds:
--              - landscaper_chat_thread.is_archived (BOOLEAN NOT NULL DEFAULT FALSE)
--              - landscaper_chat_thread.archived_at (TIMESTAMPTZ NULL)
--              - landscaper_chat_thread.archived_by_user_id (VARCHAR(50) NULL)
--              - Partial index on (is_archived, project_id, updated_at DESC) WHERE
--                is_archived = FALSE — keeps the common active-thread queries fast
--                as archived rows accumulate.
--
-- Refs:      Landscape app/SPEC-Universal-Archive-Pattern-PV-2026-05-05.md §4.1
--
-- Note on existing is_active column: Deliberately NOT repurposed. is_active
-- already encodes "thread is open vs closed" (started new / idle timeout)
-- semantics across the codebase. Adding is_archived as a separate column
-- avoids cascading breakage in queries, hooks, and tools that read is_active.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.landscaper_chat_thread
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id VARCHAR(50) NULL;

CREATE INDEX IF NOT EXISTS idx_landscaper_chat_thread_active
  ON landscape.landscaper_chat_thread (is_archived, project_id, updated_at DESC)
  WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_landscaper_chat_thread_archived
  ON landscape.landscaper_chat_thread (is_archived, archived_at DESC)
  WHERE is_archived = TRUE;

COMMENT ON COLUMN landscape.landscaper_chat_thread.is_archived IS
  'Universal Archive Pattern: TRUE = soft-archived (hidden from default lists, recoverable). FALSE = live. See SPEC-Universal-Archive-Pattern-PV-2026-05-05.';
COMMENT ON COLUMN landscape.landscaper_chat_thread.archived_at IS
  'When the thread was archived (NULL when is_archived = FALSE).';
COMMENT ON COLUMN landscape.landscaper_chat_thread.archived_by_user_id IS
  'User who archived the thread (NULL when is_archived = FALSE).';
