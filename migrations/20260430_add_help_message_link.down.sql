-- ============================================================================
-- Migration: 20260430_add_help_message_link.down.sql
-- Manual rollback for 20260430_add_help_message_link.up.sql.
-- The runner only auto-applies *.up.sql; this file is psql-only.
-- ============================================================================

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.ix_tbl_feedback_source_help_message_id;

ALTER TABLE landscape.tbl_feedback
  DROP COLUMN IF EXISTS source_help_message_id;
