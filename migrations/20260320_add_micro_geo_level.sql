-- Add MICRO (Micropolitan Statistical Area) to geo_xwalk geo_level CHECK constraint
-- Required for cities in Micropolitan areas (e.g., Ketchum → Hailey μSA)
--
-- UP:
ALTER TABLE public.geo_xwalk DROP CONSTRAINT geo_xwalk_geo_level_check;
ALTER TABLE public.geo_xwalk ADD CONSTRAINT geo_xwalk_geo_level_check
  CHECK (geo_level = ANY (ARRAY['US','STATE','MSA','MICRO','COUNTY','CITY','TRACT']));

-- DOWN (rollback):
-- ALTER TABLE public.geo_xwalk DROP CONSTRAINT geo_xwalk_geo_level_check;
-- ALTER TABLE public.geo_xwalk ADD CONSTRAINT geo_xwalk_geo_level_check
--   CHECK (geo_level = ANY (ARRAY['US','STATE','MSA','COUNTY','CITY','TRACT']));
-- DELETE FROM public.geo_xwalk WHERE geo_level = 'MICRO';
