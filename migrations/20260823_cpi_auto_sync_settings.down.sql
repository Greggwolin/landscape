-- 20260823_cpi_auto_sync_settings.down.sql
-- Reverses 20260823_cpi_auto_sync_settings.up.sql.
--
-- Dropping the view re-breaks /api/assumptions/cpi-baseline, which will fall back
-- to its hardcoded 3% baseline (silently -- it catches and serves the fallback).
-- Dropping use_auto_cpi re-breaks the monthly CPI sync at its first query. Both
-- were the state before this migration; neither is a state worth returning to
-- except to undo a bad apply.

SET search_path TO landscape, public;

DROP VIEW IF EXISTS landscape.v_current_cpi_inflation;

ALTER TABLE landscape.tbl_project_settings
  DROP COLUMN IF EXISTS use_auto_cpi,
  DROP COLUMN IF EXISTS last_cpi_sync_date,
  DROP COLUMN IF EXISTS cpi_series_id;
