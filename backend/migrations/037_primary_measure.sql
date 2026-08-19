-- Migration 037: Cross-asset primary measure fields on tbl_project
-- Adds nullable primary_count + primary_area with type annotations.

ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS primary_count INTEGER,
  ADD COLUMN IF NOT EXISTS primary_count_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_area NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS primary_area_type VARCHAR(50);

COMMENT ON COLUMN landscape.tbl_project.primary_count IS 'Primary asset count (units/lots/suites/etc.)';
COMMENT ON COLUMN landscape.tbl_project.primary_count_type IS 'Primary count type: units, lots, suites, keys, pads, rooms, other';
COMMENT ON COLUMN landscape.tbl_project.primary_area IS 'Primary asset area (sf/acres/etc.)';
COMMENT ON COLUMN landscape.tbl_project.primary_area_type IS 'Primary area type: rentable_sf, gross_sf, net_sf, gross_acres, net_acres, other';
