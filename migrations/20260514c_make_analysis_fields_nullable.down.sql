-- ============================================================================
-- Rollback: 20260514c_make_analysis_fields_nullable.down.sql
-- Purpose:  Restore NOT NULL on analysis_perspective and analysis_purpose.
--
-- WARNING:  If any rows have NULL in either column when this rollback runs,
-- the ALTER will fail. Decide whether to backfill those rows (likely the
-- user_home placeholders) with sentinel values first, or DELETE them.
--
--           Example backfill (uses safe sentinels that satisfy the existing
--           CHECK constraints):
--             UPDATE landscape.tbl_project
--             SET analysis_perspective = 'INVESTMENT'
--             WHERE analysis_perspective IS NULL;
--
--             UPDATE landscape.tbl_project
--             SET analysis_purpose = 'VALUATION'
--             WHERE analysis_purpose IS NULL;
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.tbl_project
  ALTER COLUMN analysis_perspective SET NOT NULL;

ALTER TABLE landscape.tbl_project
  ALTER COLUMN analysis_purpose SET NOT NULL;
