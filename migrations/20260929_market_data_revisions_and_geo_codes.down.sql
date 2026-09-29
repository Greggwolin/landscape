-- 20260929_market_data_revisions_and_geo_codes.down.sql
-- Reverses the .up.sql of the same name. Session MQ-MKTDATA-S1.
-- Observations fetched by the NEW series are dropped with those series; everything that
-- existed before the up migration is put back exactly (codes, series rows, the 215
-- quarantined rows, and metro unemployment's SA history).

BEGIN;

-- metro unemployment SA history back into series 11
UPDATE public.market_data d SET series_id = 11
  FROM public.market_series s
 WHERE d.series_id = s.series_id AND s.series_code = 'LAUS_MSA_UNRATE_SA_LEGACY'
   AND NOT EXISTS (SELECT 1 FROM public.market_data x WHERE x.series_id = 11 AND x.geo_id = d.geo_id AND x.date = d.date);
DELETE FROM public.market_data d USING public.market_series s
 WHERE d.series_id = s.series_id AND s.series_code = 'LAUS_MSA_UNRATE_SA_LEGACY';

-- drop observations and rows of series that did not exist before
DELETE FROM public.market_data
 WHERE series_id NOT IN (SELECT series_id FROM public.market_series_backup_20260929);
DELETE FROM public.series_geo_alias;
DELETE FROM public.series_alias;
DELETE FROM public.market_series
 WHERE series_id NOT IN (SELECT series_id FROM public.market_series_backup_20260929);

-- restore series rows and codes as they were
UPDATE public.market_series m
   SET source = b.source, seasonal = b.seasonal, series_name = b.series_name,
       is_active = b.is_active, notes = b.notes, updated_at = b.updated_at
  FROM public.market_series_backup_20260929 b
 WHERE m.series_id = b.series_id;
INSERT INTO public.series_alias SELECT * FROM public.series_alias_backup_20260929;

-- quarantined rows back
INSERT INTO public.market_data (series_id, geo_id, date, value, rev_tag, coverage_note, created_at)
SELECT series_id, geo_id, date, value, rev_tag, coverage_note, created_at
  FROM public.market_data_quarantine_20260929
ON CONFLICT (series_id, geo_id, date) DO NOTHING;

DROP TRIGGER IF EXISTS trg_market_data_keep_revision ON public.market_data;
DROP FUNCTION IF EXISTS public.fn_market_data_keep_revision();
DROP TABLE IF EXISTS public.series_geo_alias;
-- The revision log, quarantine and backups are kept on purpose: they are the only record
-- of what changed. Drop them by hand once nothing needs them:
--   public.market_data_revision, public.market_data_quarantine_20260929,
--   public.series_alias_backup_20260929, public.market_series_backup_20260929

COMMIT;
