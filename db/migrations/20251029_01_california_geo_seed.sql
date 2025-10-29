-- 20251029_01_california_geo_seed.sql
-- Adds California geography data including Hawthorne, CA
-- Run this on machines that don't have full geo_xwalk coverage

SET search_path TO public;

-- US (should already exist but included for completeness)
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id
)
VALUES
  ('US', 'US', 'United States', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (geo_id) DO NOTHING;

-- California State
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id
)
VALUES
  ('06', 'STATE', 'California', '06', NULL, NULL, NULL, 'US')
ON CONFLICT (geo_id) DO UPDATE
SET
  geo_level = EXCLUDED.geo_level,
  geo_name = EXCLUDED.geo_name,
  state_fips = EXCLUDED.state_fips,
  county_fips = EXCLUDED.county_fips,
  place_fips = EXCLUDED.place_fips,
  cbsa_code = EXCLUDED.cbsa_code,
  parent_geo_id = EXCLUDED.parent_geo_id,
  updated_at = now();

-- Los Angeles County (Hawthorne is in LA County)
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id
)
VALUES
  ('06037', 'COUNTY', 'Los Angeles County', '06', '037', NULL, NULL, '06')
ON CONFLICT (geo_id) DO UPDATE
SET
  geo_level = EXCLUDED.geo_level,
  geo_name = EXCLUDED.geo_name,
  state_fips = EXCLUDED.state_fips,
  county_fips = EXCLUDED.county_fips,
  place_fips = EXCLUDED.place_fips,
  cbsa_code = EXCLUDED.cbsa_code,
  parent_geo_id = EXCLUDED.parent_geo_id,
  updated_at = now();

-- Los Angeles-Long Beach-Anaheim MSA
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id
)
VALUES
  ('31080', 'MSA', 'Los Angeles-Long Beach-Anaheim MSA', '06', NULL, NULL, '31080', '06')
ON CONFLICT (geo_id) DO UPDATE
SET
  geo_level = EXCLUDED.geo_level,
  geo_name = EXCLUDED.geo_name,
  state_fips = EXCLUDED.state_fips,
  county_fips = EXCLUDED.county_fips,
  place_fips = EXCLUDED.place_fips,
  cbsa_code = EXCLUDED.cbsa_code,
  parent_geo_id = EXCLUDED.parent_geo_id,
  updated_at = now();

-- Hawthorne city, CA (Place FIPS: 33000)
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id,
  usps_city,
  usps_state
)
VALUES
  ('06-33000', 'CITY', 'Hawthorne city', '06', NULL, '33000', NULL, '06037', 'Hawthorne', 'CA')
ON CONFLICT (geo_id) DO UPDATE
SET
  geo_level = EXCLUDED.geo_level,
  geo_name = EXCLUDED.geo_name,
  state_fips = EXCLUDED.state_fips,
  county_fips = EXCLUDED.county_fips,
  place_fips = EXCLUDED.place_fips,
  cbsa_code = EXCLUDED.cbsa_code,
  parent_geo_id = EXCLUDED.parent_geo_id,
  usps_city = EXCLUDED.usps_city,
  usps_state = EXCLUDED.usps_state,
  updated_at = now();

-- Additional major California cities for good measure

-- San Francisco County
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id
)
VALUES
  ('06075', 'COUNTY', 'San Francisco County', '06', '075', NULL, NULL, '06')
ON CONFLICT (geo_id) DO NOTHING;

-- San Francisco-Oakland-Berkeley MSA
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id
)
VALUES
  ('41860', 'MSA', 'San Francisco-Oakland-Berkeley MSA', '06', NULL, NULL, '41860', '06')
ON CONFLICT (geo_id) DO NOTHING;

-- San Francisco city
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id,
  usps_city,
  usps_state
)
VALUES
  ('06-67000', 'CITY', 'San Francisco city', '06', NULL, '67000', NULL, '06075', 'San Francisco', 'CA')
ON CONFLICT (geo_id) DO NOTHING;

-- San Diego County
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id
)
VALUES
  ('06073', 'COUNTY', 'San Diego County', '06', '073', NULL, NULL, '06')
ON CONFLICT (geo_id) DO NOTHING;

-- San Diego-Chula Vista-Carlsbad MSA
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id
)
VALUES
  ('41740', 'MSA', 'San Diego-Chula Vista-Carlsbad MSA', '06', NULL, NULL, '41740', '06')
ON CONFLICT (geo_id) DO NOTHING;

-- San Diego city
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id,
  usps_city,
  usps_state
)
VALUES
  ('06-66000', 'CITY', 'San Diego city', '06', NULL, '66000', NULL, '06073', 'San Diego', 'CA')
ON CONFLICT (geo_id) DO NOTHING;

-- Los Angeles city
INSERT INTO public.geo_xwalk (
  geo_id,
  geo_level,
  geo_name,
  state_fips,
  county_fips,
  place_fips,
  cbsa_code,
  parent_geo_id,
  usps_city,
  usps_state
)
VALUES
  ('06-44000', 'CITY', 'Los Angeles city', '06', NULL, '44000', NULL, '06037', 'Los Angeles', 'CA')
ON CONFLICT (geo_id) DO NOTHING;

-- Verify the data was inserted
DO $$
DECLARE
  ca_count INTEGER;
  hawthorne_found BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO ca_count FROM public.geo_xwalk WHERE state_fips = '06';
  SELECT EXISTS(SELECT 1 FROM public.geo_xwalk WHERE geo_id = '06-33000') INTO hawthorne_found;

  RAISE NOTICE '✓ California geo records inserted: %', ca_count;
  IF hawthorne_found THEN
    RAISE NOTICE '✓ Hawthorne, CA successfully added';
  ELSE
    RAISE WARNING '✗ Hawthorne, CA not found';
  END IF;
END $$;
