-- Migration: Create project_map_features table for Map tab draw tools
-- Date: 2026-03-31
-- Schema: location_intelligence
--
-- This table stores user-drawn map features (polygons, lines, points)
-- created via the Map tab's draw tools. Uses PostGIS geometry column
-- for spatial data and UUID primary keys.

-- ============================================================
-- UP
-- ============================================================

-- Ensure the location_intelligence schema exists
CREATE SCHEMA IF NOT EXISTS location_intelligence;

-- Ensure PostGIS extension is available
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS location_intelligence.project_map_features (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      INTEGER NOT NULL,
    feature_type    VARCHAR(20) NOT NULL CHECK (feature_type IN ('point', 'line', 'polygon', 'measurement')),
    category        VARCHAR(30) NOT NULL DEFAULT 'annotation'
                    CHECK (category IN ('boundary', 'trade_area', 'land_sale', 'building_sale', 'annotation', 'measurement', 'custom')),
    geometry        geometry NOT NULL,
    label           VARCHAR(255) NOT NULL,
    notes           TEXT,
    style           JSONB,
    linked_table    VARCHAR(100),
    linked_id       INTEGER,
    area_sqft       NUMERIC(18,4),
    area_acres      NUMERIC(18,4),
    perimeter_ft    NUMERIC(18,4),
    length_ft       NUMERIC(18,4),
    created_by      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_map_features_project_id
    ON location_intelligence.project_map_features (project_id);

CREATE INDEX IF NOT EXISTS idx_map_features_category
    ON location_intelligence.project_map_features (category);

CREATE INDEX IF NOT EXISTS idx_map_features_geometry
    ON location_intelligence.project_map_features USING GIST (geometry);

-- ============================================================
-- DOWN (rollback)
-- ============================================================
-- DROP TABLE IF EXISTS location_intelligence.project_map_features;
