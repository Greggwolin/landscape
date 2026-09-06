-- 20260823_cpi_auto_sync_settings.up.sql
-- The three columns and the view that src/app/api/cron/sync-cpi-to-settings and
-- src/app/api/assumptions/cpi-baseline have referenced since they were written,
-- and which have never existed in the live database (FB-340).
--
-- Promoted from archive/migrations-legacy/20251103_01_cpi_auto_sync.sql, which was
-- written 2025-11-03 and never applied. Verified ABSENT against Neon branch
-- ep-tiny-lab (database land_v2) on 2026-08-23: a cross-schema search for all three
-- column names returned zero rows, and to_regclass on the view returned NULL.
-- Dry-run inside a rolled-back transaction against that same database before apply.
-- All statements are idempotent; a re-run is a no-op.
--
-- TWO DELIBERATE CHANGES FROM THE ARCHIVED FILE -- do not silently revert:
--
--   1. use_auto_cpi defaults to FALSE, not TRUE.
--      The archive made every project opt-out. Repairing a job that has never once
--      run must not, on the day it lands, begin rewriting all 15 projects'
--      inflation assumptions. Opting a project in is now a deliberate act.
--
--   2. The view partitions its 12-month lag BY GEOGRAPHY.
--      The archived view -- and the cron that duplicated its arithmetic -- ran
--      LAG(md.value, 12) OVER (ORDER BY md.date) with no PARTITION BY and no geo
--      filter. public.market_data holds CPIAUCSL for five geographies, so that
--      window lagged 12 ROWS across interleaved geographies rather than 12 MONTHS
--      of one. Measured against live data on 2026-08-23 the difference is real:
--      the unpartitioned form yields 1.64%, the correct US-scoped form 2.43% --
--      79 basis points, silently wrong. The view is now the single definition of
--      this arithmetic; the cron reads it instead of keeping its own copy.

SET search_path TO landscape, public;

-- ---------------------------------------------------------------------------
-- Project settings: opt-in flag, series choice, sync bookkeeping
-- ---------------------------------------------------------------------------

ALTER TABLE landscape.tbl_project_settings
  ADD COLUMN IF NOT EXISTS use_auto_cpi       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_cpi_sync_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cpi_series_id      TEXT DEFAULT 'CPIAUCSL';

COMMENT ON COLUMN landscape.tbl_project_settings.use_auto_cpi IS
  'When true, global_inflation_rate is overwritten from CPI market data by the monthly sync. Defaults false: opting in is deliberate.';

COMMENT ON COLUMN landscape.tbl_project_settings.last_cpi_sync_date IS
  'Timestamp of the most recent CPI sync that actually wrote to this row. Unset means never synced -- including runs the staleness guard declined.';

COMMENT ON COLUMN landscape.tbl_project_settings.cpi_series_id IS
  'public.market_series.series_code used as the CPI baseline for this project (default CPIAUCSL).';

-- ---------------------------------------------------------------------------
-- Trailing-12-month change, one row per series, national geography
-- ---------------------------------------------------------------------------
-- Callers filter by series_code. Restricted to geo_id = 'US' because a national
-- index is what an inflation assumption means here; a series with no US-level
-- observations simply does not appear.

CREATE OR REPLACE VIEW landscape.v_current_cpi_inflation AS
WITH ranked AS (
  SELECT
    ms.series_code,
    md.date                                                             AS observation_date,
    md.value::numeric                                                   AS index_value,
    LAG(md.value, 12) OVER (PARTITION BY md.series_id ORDER BY md.date) AS prior_year_value,
    ROW_NUMBER()      OVER (PARTITION BY md.series_id ORDER BY md.date DESC) AS rn
  FROM public.market_series ms
  JOIN public.market_data md
    ON md.series_id = ms.series_id
  WHERE md.geo_id = 'US'
)
SELECT
  series_code,
  observation_date AS latest_observation_date,
  index_value      AS current_index,
  prior_year_value,
  ROUND(((index_value / NULLIF(prior_year_value, 0)) - 1) * 100, 2) AS trailing_12mo_pct_change,
  ROUND(((index_value / NULLIF(prior_year_value, 0)) - 1),      4) AS trailing_12mo_decimal
FROM ranked
WHERE rn = 1
  AND prior_year_value IS NOT NULL;

COMMENT ON VIEW landscape.v_current_cpi_inflation IS
  'Trailing 12-month change per series_code at US geography, from public.market_data. Single definition of this arithmetic: read by /api/assumptions/cpi-baseline and by the monthly CPI sync. The 12-month lag is partitioned by series -- an unpartitioned lag mixes geographies and is wrong by ~80bp.';
