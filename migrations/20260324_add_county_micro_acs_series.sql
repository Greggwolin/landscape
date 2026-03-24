-- Migration: Register county-level and micropolitan-level ACS series
-- in market_series so the ingestion pipeline can fetch population and
-- median household income for sub-state geographies.
--
-- These series use the same Census ACS variables as their state/national
-- counterparts but are scoped to COUNTY and MICRO coverage levels.
-- The LAUS county-level series are also registered if missing.

-- UP -----------------------------------------------------------------

-- ACS County Population
INSERT INTO public.market_series (
  series_code, series_name, category, subcategory, units, frequency,
  seasonal, source, coverage_level, notes, is_active
) VALUES (
  'ACS_COUNTY_POPULATION',
  'ACS County Total Population',
  'Demographics', 'Population',
  'Persons', 'A',
  NULL, 'ACS', 'COUNTY',
  'Census ACS B01001_001E at county level', TRUE
) ON CONFLICT (series_code, seasonal) DO UPDATE SET
  coverage_level = 'COUNTY',
  is_active = TRUE;

-- ACS County Median Household Income
INSERT INTO public.market_series (
  series_code, series_name, category, subcategory, units, frequency,
  seasonal, source, coverage_level, notes, is_active
) VALUES (
  'ACS_COUNTY_MEDIAN_HH_INC',
  'ACS County Median Household Income',
  'Demographics', 'Income',
  'Dollars', 'A',
  NULL, 'ACS', 'COUNTY',
  'Census ACS B19013_001E at county level', TRUE
) ON CONFLICT (series_code, seasonal) DO UPDATE SET
  coverage_level = 'COUNTY',
  is_active = TRUE;

-- ACS Micropolitan Population
INSERT INTO public.market_series (
  series_code, series_name, category, subcategory, units, frequency,
  seasonal, source, coverage_level, notes, is_active
) VALUES (
  'ACS_MICRO_POPULATION',
  'ACS Micropolitan Area Total Population',
  'Demographics', 'Population',
  'Persons', 'A',
  NULL, 'ACS', 'MICRO',
  'Census ACS B01001_001E at micropolitan statistical area level', TRUE
) ON CONFLICT (series_code, seasonal) DO UPDATE SET
  coverage_level = 'MICRO',
  is_active = TRUE;

-- ACS Micropolitan Median Household Income
INSERT INTO public.market_series (
  series_code, series_name, category, subcategory, units, frequency,
  seasonal, source, coverage_level, notes, is_active
) VALUES (
  'ACS_MICRO_MEDIAN_HH_INC',
  'ACS Micropolitan Area Median Household Income',
  'Demographics', 'Income',
  'Dollars', 'A',
  NULL, 'ACS', 'MICRO',
  'Census ACS B19013_001E at micropolitan statistical area level', TRUE
) ON CONFLICT (series_code, seasonal) DO UPDATE SET
  coverage_level = 'MICRO',
  is_active = TRUE;

-- LAUS County Unemployment Rate (may already exist)
INSERT INTO public.market_series (
  series_code, series_name, category, subcategory, units, frequency,
  seasonal, source, coverage_level, notes, is_active
) VALUES (
  'LAUS_COUNTY_UNRATE',
  'LAUS County Unemployment Rate',
  'Employment', 'Unemployment',
  'Percent', 'M',
  'NSA', 'BLS', 'COUNTY',
  'BLS LAUS county-level unemployment rate', TRUE
) ON CONFLICT (series_code, seasonal) DO NOTHING;

-- LAUS County Employment (may already exist)
INSERT INTO public.market_series (
  series_code, series_name, category, subcategory, units, frequency,
  seasonal, source, coverage_level, notes, is_active
) VALUES (
  'LAUS_COUNTY_EMP',
  'LAUS County Employment',
  'Employment', 'Total Employment',
  'Persons', 'M',
  'NSA', 'BLS', 'COUNTY',
  'BLS LAUS county-level total employment', TRUE
) ON CONFLICT (series_code, seasonal) DO NOTHING;

-- Also add BLS alias templates for county LAUS series
-- (provider_series_code uses FIPS placeholders resolved at runtime)
INSERT INTO public.series_alias (series_id, provider, provider_series_code)
SELECT ms.series_id, 'BLS', 'LAUCN{STATE_FIPS}{COUNTY_FIPS}0000000003'
FROM public.market_series ms
WHERE ms.series_code = 'LAUS_COUNTY_UNRATE'
ON CONFLICT (series_id, provider) DO NOTHING;

INSERT INTO public.series_alias (series_id, provider, provider_series_code)
SELECT ms.series_id, 'BLS', 'LAUCN{STATE_FIPS}{COUNTY_FIPS}0000000005'
FROM public.market_series ms
WHERE ms.series_code = 'LAUS_COUNTY_EMP'
ON CONFLICT (series_id, provider) DO NOTHING;


-- DOWN ---------------------------------------------------------------
-- DELETE FROM public.series_alias WHERE series_id IN (
--   SELECT series_id FROM public.market_series
--   WHERE series_code IN ('LAUS_COUNTY_UNRATE', 'LAUS_COUNTY_EMP')
-- );
-- DELETE FROM public.market_series WHERE series_code IN (
--   'ACS_COUNTY_POPULATION', 'ACS_COUNTY_MEDIAN_HH_INC',
--   'ACS_MICRO_POPULATION', 'ACS_MICRO_MEDIAN_HH_INC'
-- );
