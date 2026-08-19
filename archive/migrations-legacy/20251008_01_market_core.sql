-- 20251008_01_market_core.sql
-- v1.0 · Market Engine Core DDL

SET search_path TO public;

-- Shared trigger to maintain updated_at stamps
CREATE OR REPLACE FUNCTION public.tg_market_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 2.1 Geo Crosswalk (authoritative IDs and hierarchy)
CREATE TABLE IF NOT EXISTS public.geo_xwalk (
  geo_id TEXT PRIMARY KEY,
  geo_level TEXT NOT NULL CHECK (geo_level IN ('US','STATE','MSA','COUNTY','CITY')),
  geo_name TEXT NOT NULL,
  state_fips TEXT,
  county_fips TEXT,
  place_fips TEXT,
  cbsa_code TEXT,
  gnis_id TEXT,
  usps_city TEXT,
  usps_state TEXT,
  parent_geo_id TEXT REFERENCES public.geo_xwalk(geo_id) ON DELETE SET NULL,
  hierarchy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_geo_xwalk_level ON public.geo_xwalk(geo_level);
CREATE INDEX IF NOT EXISTS idx_geo_xwalk_cbsa ON public.geo_xwalk(cbsa_code);
CREATE INDEX IF NOT EXISTS idx_geo_xwalk_parent ON public.geo_xwalk(parent_geo_id);

DROP TRIGGER IF EXISTS trg_geo_xwalk_set_updated_at ON public.geo_xwalk;
CREATE TRIGGER trg_geo_xwalk_set_updated_at
BEFORE UPDATE ON public.geo_xwalk
FOR EACH ROW
EXECUTE FUNCTION public.tg_market_set_updated_at();

-- 2.2 Series Catalog (what each time series means)
CREATE TABLE IF NOT EXISTS public.market_series (
  series_id BIGSERIAL PRIMARY KEY,
  series_code TEXT NOT NULL,
  series_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  units TEXT,
  frequency TEXT,
  seasonal TEXT CHECK (seasonal IN ('SA','NSA')),
  source TEXT NOT NULL,
  coverage_level TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (series_code, seasonal)
);
CREATE INDEX IF NOT EXISTS idx_market_series_cat ON public.market_series(category, subcategory);

DROP TRIGGER IF EXISTS trg_market_series_set_updated_at ON public.market_series;
CREATE TRIGGER trg_market_series_set_updated_at
BEFORE UPDATE ON public.market_series
FOR EACH ROW
EXECUTE FUNCTION public.tg_market_set_updated_at();

-- 2.3 Time Series Values
CREATE TABLE IF NOT EXISTS public.market_data (
  series_id BIGINT NOT NULL REFERENCES public.market_series(series_id) ON DELETE RESTRICT,
  geo_id TEXT NOT NULL REFERENCES public.geo_xwalk(geo_id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  value NUMERIC,
  rev_tag TEXT,
  coverage_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (series_id, geo_id, date)
);
CREATE INDEX IF NOT EXISTS idx_market_data_date ON public.market_data(date);
CREATE INDEX IF NOT EXISTS idx_market_data_geo ON public.market_data(geo_id);

-- 2.4 Aliases for external ids (handy for joins)
CREATE TABLE IF NOT EXISTS public.series_alias (
  alias_id BIGSERIAL PRIMARY KEY,
  series_id BIGINT NOT NULL REFERENCES public.market_series(series_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_series_code TEXT NOT NULL,
  UNIQUE (series_id, provider)
);

-- 2.5 Fetch Jobs & Lineage (ties into ai_ingestion_history)
CREATE TABLE IF NOT EXISTS public.market_fetch_job (
  job_id BIGSERIAL PRIMARY KEY,
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'queued',
  params JSONB NOT NULL,
  sources JSONB,
  stats JSONB,
  error TEXT,
  ai_ingestion_id INTEGER REFERENCES landscape.ai_ingestion_history(ingestion_id)
);
CREATE INDEX IF NOT EXISTS idx_market_fetch_job_status ON public.market_fetch_job(status);

-- 2.6 Helpful views for UI
CREATE OR REPLACE VIEW public.vw_market_latest AS
SELECT md.series_id,
       ms.series_code,
       ms.series_name,
       ms.category,
       ms.subcategory,
       md.geo_id,
       gx.geo_name,
       gx.geo_level,
       md.date,
       md.value,
       ms.units,
       ms.seasonal
FROM public.market_data md
JOIN public.market_series ms ON ms.series_id = md.series_id
JOIN public.geo_xwalk gx ON gx.geo_id = md.geo_id
WHERE (md.series_id, md.geo_id, md.date) IN (
  SELECT series_id, geo_id, MAX(date)
  FROM public.market_data
  GROUP BY series_id, geo_id
);
