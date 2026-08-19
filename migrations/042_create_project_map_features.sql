-- Migration: Create project_map_features table
-- Description: Generic table for storing user-drawn map features (points, lines, polygons, measurements)
-- Date: 2026-01-27

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- Create the table in location_intelligence schema
CREATE TABLE IF NOT EXISTS location_intelligence.project_map_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Feature type
    feature_type VARCHAR(50) NOT NULL,  -- point, line, polygon, measurement
    category VARCHAR(50),                -- boundary, trade_area, land_sale, annotation, custom

    -- Geometry (supports all types)
    geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,

    -- Properties
    label VARCHAR(255),
    notes TEXT,
    style JSONB DEFAULT '{}',            -- color, stroke, fill, icon

    -- Linking (optional association to other records)
    linked_table VARCHAR(100),           -- e.g., 'tbl_land_comp', 'tbl_sale_comp'
    linked_id INTEGER,

    -- Measurements (calculated on save)
    area_sqft NUMERIC,
    area_acres NUMERIC,
    perimeter_ft NUMERIC,
    length_ft NUMERIC,

    -- Metadata
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_feature_type CHECK (feature_type IN ('point', 'line', 'polygon', 'measurement')),
    CONSTRAINT valid_category CHECK (category IS NULL OR category IN (
        'boundary', 'trade_area', 'land_sale', 'building_sale',
        'annotation', 'measurement', 'custom'
    ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_map_features_geom
    ON location_intelligence.project_map_features USING GIST(geometry);

CREATE INDEX IF NOT EXISTS idx_project_map_features_project
    ON location_intelligence.project_map_features(project_id);

CREATE INDEX IF NOT EXISTS idx_project_map_features_type
    ON location_intelligence.project_map_features(feature_type, category);

CREATE INDEX IF NOT EXISTS idx_project_map_features_linked
    ON location_intelligence.project_map_features(linked_table, linked_id)
    WHERE linked_table IS NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION location_intelligence.update_map_features_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_map_features_updated_at ON location_intelligence.project_map_features;

CREATE TRIGGER trg_project_map_features_updated_at
    BEFORE UPDATE ON location_intelligence.project_map_features
    FOR EACH ROW
    EXECUTE FUNCTION location_intelligence.update_map_features_timestamp();

-- Add comments
COMMENT ON TABLE location_intelligence.project_map_features IS
    'User-drawn map features including points, lines, polygons, and measurements';
COMMENT ON COLUMN location_intelligence.project_map_features.feature_type IS
    'Type of feature: point, line, polygon, or measurement';
COMMENT ON COLUMN location_intelligence.project_map_features.category IS
    'Category for grouping: boundary, trade_area, land_sale, building_sale, annotation, measurement, custom';
COMMENT ON COLUMN location_intelligence.project_map_features.style IS
    'JSON object with styling: color, strokeColor, strokeWidth, fillOpacity, icon';
COMMENT ON COLUMN location_intelligence.project_map_features.linked_table IS
    'Optional link to another table (e.g., tbl_sale_comp for a sale comp boundary)';
COMMENT ON COLUMN location_intelligence.project_map_features.linked_id IS
    'Primary key of the linked record';

-- =============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- =============================================================================

-- To rollback, run these commands:
-- DROP TRIGGER IF EXISTS trg_project_map_features_updated_at ON location_intelligence.project_map_features;
-- DROP FUNCTION IF EXISTS location_intelligence.update_map_features_timestamp();
-- DROP TABLE IF EXISTS location_intelligence.project_map_features;
