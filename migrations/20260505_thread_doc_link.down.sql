-- ============================================================================
-- Rollback: 20260505_thread_doc_link.down.sql
-- ============================================================================

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.idx_landscaper_chat_thread_project_doc;
DROP INDEX IF EXISTS landscape.idx_landscaper_chat_thread_doc;

ALTER TABLE landscape.landscaper_chat_thread
  DROP COLUMN IF EXISTS doc_id;
