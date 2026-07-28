-- ============================================================================
-- Rollback: 20260728_thread_last_destination.down.sql
--
-- Drops the per-thread "where was this thread last productive" memory.
-- Safe: the column is additive and nothing else reads it. Reopening a thread
-- reverts to transcript-only, which is the pre-migration behaviour.
--
-- Refs: chat TA (LSCMD-THREADDEST-0728-TA)
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.landscaper_chat_thread
  DROP COLUMN IF EXISTS last_destination;
