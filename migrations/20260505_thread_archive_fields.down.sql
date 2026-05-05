-- ============================================================================
-- Rollback: 20260505_thread_archive_fields.down.sql
-- Purpose:  Reverse 20260505_thread_archive_fields.up.sql.
--
-- WARNING:  Dropping these columns destroys archive state. Any rows currently
-- archived become visible again as live threads. Run only if intentionally
-- abandoning the archive feature.
-- ============================================================================

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.idx_landscaper_chat_thread_active;
DROP INDEX IF EXISTS landscape.idx_landscaper_chat_thread_archived;

ALTER TABLE landscape.landscaper_chat_thread
  DROP COLUMN IF EXISTS archived_by_user_id,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS is_archived;
