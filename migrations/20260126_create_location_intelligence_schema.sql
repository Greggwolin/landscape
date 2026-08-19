-- ===========================================
-- LOCATION INTELLIGENCE SCHEMA
-- Migration: 20260126_create_location_intelligence_schema.sql
-- Purpose: Create schema for demographics, POIs, and spatial analysis
-- ===========================================

-- Preflight check: Verify PostGIS is enabled
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        RAISE EXCEPTION 'PostGIS extension is not installed. Please run: CREATE EXTENSION postgis;';
    END IF;
END $$;

-- Create schema
CREATE SCHEMA IF NOT EXISTS location_intelligence;

-- -----------------------------------------
-- 1. Block Group Boundaries (Pre-loaded from TIGER/Line)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS location_intelligence.block_groups (
    geoid VARCHAR(12) PRIMARY KEY,        -- State(2) + County(3) + Tract(6) + BG(1)
    state_fips VARCHAR(2) NOT NULL,
    county_fips VARCHAR(3) NOT NULL,
    tract_code VARCHAR(6) NOT NULL,
    bg_code VARCHAR(1) NOT NULL,
    state_name VARCHAR(50),
    county_name VARCHAR(100),
    land_area_sqm NUMERIC,
    water_area_sqm NUMERIC,
    geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_Centroid(geometry)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial and attribute indexes
CREATE INDEX IF NOT EXISTS idx_block_groups_geom
    ON location_intelligence.block_groups USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_block_groups_centroid
    ON location_intelligence.block_groups USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_block_groups_state
    ON location_intelligence.block_groups(state_fips);
CREATE INDEX IF NOT EXISTS idx_block_groups_county
    ON location_intelligence.block_groups(state_fips, county_fips);

-- -----------------------------------------
-- 2. Demographics Cache (ACS 5-Year Estimates)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS location_intelligence.demographics_cache (
    geoid VARCHAR(12) PRIMARY KEY REFERENCES location_intelligence.block_groups(geoid) ON DELETE CASCADE,

    -- Population
    total_population INTEGER,
    population_density_sqmi NUMERIC,      -- Calculated: pop / land_area

    -- Age
    median_age NUMERIC(4,1),

    -- Households
    total_households INTEGER,
    avg_household_size NUMERIC(3,2),

    -- Income
    median_household_income INTEGER,
    per_capita_income INTEGER,

    -- Housing
    total_housing_units INTEGER,
    median_home_value INTEGER,
    median_gross_rent INTEGER,
    owner_occupied_pct NUMERIC(5,2),

    -- Employment
    employed_population INTEGER,
    unemployment_rate NUMERIC(5,2),

    -- Metadata
    acs_vintage VARCHAR(10) NOT NULL,     -- e.g., "2023_5yr"
    fetched_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_percentages CHECK (
        (owner_occupied_pct IS NULL OR (owner_occupied_pct >= 0 AND owner_occupied_pct <= 100)) AND
        (unemployment_rate IS NULL OR (unemployment_rate >= 0 AND unemployment_rate <= 100))
    )
);

-- -----------------------------------------
-- 3. Ring Demographics (Cached Results)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS location_intelligence.ring_demographics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL,          -- References landscape.tbl_project

    -- Center point
    center_lat NUMERIC(10,7) NOT NULL,
    center_lon NUMERIC(10,7) NOT NULL,
    center_point GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)
    ) STORED,

    -- Ring definition
    radius_miles NUMERIC(4,1) NOT NULL,   -- 1, 3, or 5
    radius_meters NUMERIC GENERATED ALWAYS AS (radius_miles * 1609.34) STORED,

    -- Aggregated demographics (area-weighted)
    population INTEGER,
    households INTEGER,
    median_income INTEGER,
    median_age NUMERIC(4,1),
    median_home_value INTEGER,
    median_gross_rent INTEGER,
    owner_occupied_pct NUMERIC(5,2),

    -- Calculation metadata
    block_groups_included INTEGER,
    total_land_area_sqmi NUMERIC,
    calculation_method VARCHAR(20) DEFAULT 'area_weighted',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_radius CHECK (radius_miles IN (1, 3, 5)),
    CONSTRAINT unique_project_radius UNIQUE (project_id, radius_miles)
);

CREATE INDEX IF NOT EXISTS idx_ring_demographics_project
    ON location_intelligence.ring_demographics(project_id);
CREATE INDEX IF NOT EXISTS idx_ring_demographics_center
    ON location_intelligence.ring_demographics USING GIST(center_point);

-- -----------------------------------------
-- 4. POI Cache (OpenStreetMap Overpass)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS location_intelligence.poi_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    osm_id BIGINT NOT NULL,
    osm_type VARCHAR(10),                 -- node, way, relation

    -- Classification
    category VARCHAR(50) NOT NULL,        -- hospital, grocery, school, etc.
    subcategory VARCHAR(50),

    -- Identity
    name VARCHAR(255),
    brand VARCHAR(100),

    -- Location
    lat NUMERIC(10,7) NOT NULL,
    lon NUMERIC(10,7) NOT NULL,
    geometry GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) STORED,

    -- Address (from Nominatim reverse geocode)
    address_full TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),

    -- OSM metadata
    tags JSONB,

    -- Cache management
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

    CONSTRAINT unique_osm_entity UNIQUE (osm_id, osm_type)
);

CREATE INDEX IF NOT EXISTS idx_poi_cache_geom
    ON location_intelligence.poi_cache USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_poi_cache_category
    ON location_intelligence.poi_cache(category);
CREATE INDEX IF NOT EXISTS idx_poi_cache_expires
    ON location_intelligence.poi_cache(expires_at);

-- -----------------------------------------
-- 5. User-Added Map Points
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS location_intelligence.project_map_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership
    project_id INTEGER,                   -- NULL if global
    created_by INTEGER,                   -- User ID
    scope VARCHAR(10) DEFAULT 'project' CHECK (scope IN ('project', 'global')),

    -- Location
    lat NUMERIC(10,7) NOT NULL,
    lon NUMERIC(10,7) NOT NULL,
    geometry GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) STORED,

    -- Reverse geocode result (Nominatim)
    address TEXT,
    poi_name VARCHAR(255),                -- If clicked on a business/POI

    -- User input
    category VARCHAR(50) NOT NULL,        -- comp_sale, comp_rent, competitor, amenity, poi, infrastructure, custom
    custom_category VARCHAR(100),         -- If category = 'custom'
    label VARCHAR(255),
    notes TEXT,

    -- Optional structured data (for comps)
    attributes JSONB,                     -- Price, units, cap_rate, etc.

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Landscaper integration
    ingested_at TIMESTAMPTZ,
    knowledge_ref UUID,                   -- Reference to knowledge base entry

    CONSTRAINT valid_category CHECK (
        category IN ('comp_sale', 'comp_rent', 'competitor', 'amenity', 'poi', 'infrastructure', 'custom')
    )
);

CREATE INDEX IF NOT EXISTS idx_project_map_points_geom
    ON location_intelligence.project_map_points USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_project_map_points_project
    ON location_intelligence.project_map_points(project_id);
CREATE INDEX IF NOT EXISTS idx_project_map_points_category
    ON location_intelligence.project_map_points(category);
CREATE INDEX IF NOT EXISTS idx_project_map_points_global
    ON location_intelligence.project_map_points(created_by)
    WHERE scope = 'global';

-- -----------------------------------------
-- Helper Function: Meters to Miles
-- -----------------------------------------
CREATE OR REPLACE FUNCTION location_intelligence.meters_to_miles(meters NUMERIC)
RETURNS NUMERIC AS $$
    SELECT meters / 1609.34;
$$ LANGUAGE SQL IMMUTABLE;

-- -----------------------------------------
-- Helper Function: Miles to Meters
-- -----------------------------------------
CREATE OR REPLACE FUNCTION location_intelligence.miles_to_meters(miles NUMERIC)
RETURNS NUMERIC AS $$
    SELECT miles * 1609.34;
$$ LANGUAGE SQL IMMUTABLE;

-- ===========================================
-- RING DEMOGRAPHICS CALCULATION FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION location_intelligence.calculate_ring_demographics(
    p_lat NUMERIC,
    p_lon NUMERIC,
    p_radius_miles NUMERIC
)
RETURNS TABLE (
    population INTEGER,
    households INTEGER,
    median_income INTEGER,
    median_age NUMERIC,
    median_home_value INTEGER,
    median_gross_rent INTEGER,
    owner_occupied_pct NUMERIC,
    block_groups_count INTEGER,
    total_land_area_sqmi NUMERIC
) AS $$
DECLARE
    v_center GEOMETRY;
    v_buffer GEOMETRY;
    v_radius_meters NUMERIC;
BEGIN
    -- Create center point
    v_center := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326);

    -- Convert miles to meters
    v_radius_meters := p_radius_miles * 1609.34;

    -- Create buffer (circle) around center
    -- Use geography for accurate distance, then cast back to geometry
    v_buffer := ST_Buffer(v_center::geography, v_radius_meters)::geometry;

    RETURN QUERY
    WITH intersecting_bgs AS (
        SELECT
            bg.geoid,
            bg.geometry,
            bg.land_area_sqm,
            dc.*,
            -- Calculate intersection area (in square meters)
            ST_Area(ST_Intersection(bg.geometry::geography, v_buffer::geography)) AS intersection_area_sqm,
            -- Calculate overlap ratio (intersection / block group land area)
            CASE
                WHEN bg.land_area_sqm > 0 THEN
                    ST_Area(ST_Intersection(bg.geometry::geography, v_buffer::geography)) / bg.land_area_sqm
                ELSE 0
            END AS overlap_ratio
        FROM location_intelligence.block_groups bg
        JOIN location_intelligence.demographics_cache dc ON bg.geoid = dc.geoid
        WHERE ST_Intersects(bg.geometry, v_buffer)
    )
    SELECT
        -- Area-weighted aggregations
        ROUND(SUM(ib.total_population * ib.overlap_ratio))::INTEGER AS population,
        ROUND(SUM(ib.total_households * ib.overlap_ratio))::INTEGER AS households,

        -- Weighted median (approximation using household weights)
        ROUND(
            SUM(ib.median_household_income * ib.total_households * ib.overlap_ratio) /
            NULLIF(SUM(ib.total_households * ib.overlap_ratio), 0)
        )::INTEGER AS median_income,

        ROUND(
            SUM(ib.median_age * ib.total_population * ib.overlap_ratio) /
            NULLIF(SUM(ib.total_population * ib.overlap_ratio), 0),
            1
        )::NUMERIC AS median_age,

        ROUND(
            SUM(ib.median_home_value * ib.total_housing_units * ib.overlap_ratio) /
            NULLIF(SUM(ib.total_housing_units * ib.overlap_ratio), 0)
        )::INTEGER AS median_home_value,

        ROUND(
            SUM(ib.median_gross_rent * ib.total_households * ib.overlap_ratio) /
            NULLIF(SUM(ib.total_households * ib.overlap_ratio), 0)
        )::INTEGER AS median_gross_rent,

        ROUND(
            SUM(ib.owner_occupied_pct * ib.total_households * ib.overlap_ratio) /
            NULLIF(SUM(ib.total_households * ib.overlap_ratio), 0),
            2
        )::NUMERIC AS owner_occupied_pct,

        -- Metadata
        COUNT(*)::INTEGER AS block_groups_count,
        ROUND(SUM(ib.intersection_area_sqm) / 2589988.11, 2)::NUMERIC AS total_land_area_sqmi  -- sqm to sqmi

    FROM intersecting_bgs ib;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- CONVENIENCE FUNCTION: Get All Rings for a Point
-- ===========================================

CREATE OR REPLACE FUNCTION location_intelligence.get_ring_demographics_all(
    p_lat NUMERIC,
    p_lon NUMERIC
)
RETURNS TABLE (
    radius_miles NUMERIC,
    population INTEGER,
    households INTEGER,
    median_income INTEGER,
    median_age NUMERIC,
    median_home_value INTEGER,
    median_gross_rent INTEGER,
    owner_occupied_pct NUMERIC,
    block_groups_count INTEGER,
    total_land_area_sqmi NUMERIC
) AS $$
BEGIN
    -- 1-mile ring
    RETURN QUERY
    SELECT 1.0::NUMERIC AS radius_miles, r.*
    FROM location_intelligence.calculate_ring_demographics(p_lat, p_lon, 1) r;

    -- 3-mile ring
    RETURN QUERY
    SELECT 3.0::NUMERIC AS radius_miles, r.*
    FROM location_intelligence.calculate_ring_demographics(p_lat, p_lon, 3) r;

    -- 5-mile ring
    RETURN QUERY
    SELECT 5.0::NUMERIC AS radius_miles, r.*
    FROM location_intelligence.calculate_ring_demographics(p_lat, p_lon, 5) r;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON SCHEMA location_intelligence IS 'Location intelligence: demographics, POIs, and spatial analysis';
COMMENT ON TABLE location_intelligence.block_groups IS 'Census block group boundaries (CA, AZ) from TIGER/Line shapefiles';
COMMENT ON TABLE location_intelligence.demographics_cache IS 'ACS 5-year demographic estimates by block group';
COMMENT ON TABLE location_intelligence.ring_demographics IS 'Cached ring analysis results per project';
COMMENT ON TABLE location_intelligence.poi_cache IS 'POIs from OpenStreetMap Overpass API';
COMMENT ON TABLE location_intelligence.project_map_points IS 'User-added map points (comps, POIs, custom markers)';

COMMENT ON FUNCTION location_intelligence.calculate_ring_demographics IS
'Calculate area-weighted demographics for a radius ring around a point.
Returns population, households, income, age, home values, rent, and ownership rate.
Uses area-weighted aggregation (standard methodology for ring analysis).';

COMMENT ON FUNCTION location_intelligence.get_ring_demographics_all IS
'Convenience function to get demographics for all standard rings (1, 3, 5 miles) in one call.';

-- ===========================================
-- ROLLBACK
-- ===========================================
-- To rollback this migration:
-- DROP SCHEMA location_intelligence CASCADE;
