-- 20251103_01_cpi_auto_sync.sql
-- v1.0 · CPI auto-sync support (project settings + inflation view)

SET search_path TO landscape, public;

-- Ensure project settings can opt into automated CPI updates
ALTER TABLE landscape.tbl_project_settings
  ADD COLUMN IF NOT EXISTS use_auto_cpi BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_cpi_sync_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cpi_series_id TEXT DEFAULT 'CPIAUCSL';

COMMENT ON COLUMN landscape.tbl_project_settings.use_auto_cpi IS
  'When true, global_inflation_rate syncs automatically from CPI market data on a scheduled job.';

COMMENT ON COLUMN landscape.tbl_project_settings.last_cpi_sync_date IS
  'Timestamp of the most recent CPI sync job that updated the project settings.';

COMMENT ON COLUMN landscape.tbl_project_settings.cpi_series_id IS
  'Market series_code (e.g., CPIAUCSL) used as the baseline for CPI auto-sync.';

-- View: current trailing-12 CPI derived from market_data + market_series
CREATE OR REPLACE VIEW landscape.v_current_cpi_inflation AS
WITH target_series AS (
  SELECT ms.series_id,
         ms.series_code
  FROM public.market_series ms
  WHERE ms.series_code = 'CPIAUCSL'
  LIMIT 1
),
ranked_cpi AS (
  SELECT
    ts.series_code,
    md.date AS observation_date,
    md.value::numeric AS index_value,
    LAG(md.value, 12) OVER (PARTITION BY md.series_id ORDER BY md.date) AS prior_year_value,
    ROW_NUMBER() OVER (PARTITION BY md.series_id ORDER BY md.date DESC) AS rn
  FROM target_series ts
  JOIN public.market_data md
    ON md.series_id = ts.series_id
  WHERE md.date >= (CURRENT_DATE - INTERVAL '13 months')
)
SELECT
  series_code,
  observation_date AS latest_observation_date,
  index_value AS current_index,
  prior_year_value,
  ROUND(
    ((index_value / NULLIF(prior_year_value, 0)) - 1) * 100,
    2
  ) AS trailing_12mo_pct_change,
  ROUND(
    ((index_value / NULLIF(prior_year_value, 0)) - 1),
    4
  ) AS trailing_12mo_decimal
FROM ranked_cpi
WHERE rn = 1
  AND prior_year_value IS NOT NULL;

COMMENT ON VIEW landscape.v_current_cpi_inflation IS
  'Calculates trailing 12-month CPI inflation rate (default CPIAUCSL series) from market_data.';
