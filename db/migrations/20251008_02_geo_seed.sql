-- 20251008_02_geo_seed.sql
-- v1.0 · Market Engine Geo Seed

SET search_path TO public;

INSERT INTO public.geo_xwalk AS gx (
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
  ('US', 'US', 'United States', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('04', 'STATE', 'Arizona', '04', NULL, NULL, NULL, 'US', NULL, 'AZ'),
  ('38060', 'MSA', 'Phoenix-Mesa-Chandler MSA', '04', NULL, NULL, '38060', '04', NULL, NULL),
  ('04013', 'COUNTY', 'Maricopa County', '04', '013', NULL, NULL, '04', NULL, NULL),
  ('04-55000', 'CITY', 'Phoenix city', '04', NULL, '55000', NULL, '04013', 'Phoenix', 'AZ')
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
