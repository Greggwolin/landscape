-- Create project boundaries tables for storing selected tax parcels

-- Main project boundaries table
CREATE TABLE IF NOT EXISTS landscape.project_boundaries (
    boundary_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
    parcel_count INTEGER NOT NULL,
    total_acres DECIMAL(10,4) NOT NULL,
    dissolved_geometry GEOMETRY(POLYGON, 4326), -- Dissolved boundary if multiple parcels
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual parcel boundaries table
CREATE TABLE IF NOT EXISTS landscape.project_parcel_boundaries (
    parcel_boundary_id SERIAL PRIMARY KEY,
    boundary_id INTEGER NOT NULL REFERENCES landscape.project_boundaries(boundary_id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
    parcel_id TEXT NOT NULL, -- Pinal County Parcel ID
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    gross_acres DECIMAL(10,4),
    owner_name TEXT,
    site_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_boundaries_project_id ON landscape.project_boundaries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_parcel_boundaries_boundary_id ON landscape.project_parcel_boundaries(boundary_id);
CREATE INDEX IF NOT EXISTS idx_project_parcel_boundaries_project_id ON landscape.project_parcel_boundaries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_parcel_boundaries_parcel_id ON landscape.project_parcel_boundaries(parcel_id);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_project_boundaries_geometry ON landscape.project_boundaries USING GIST(dissolved_geometry);
CREATE INDEX IF NOT EXISTS idx_project_parcel_boundaries_geometry ON landscape.project_parcel_boundaries USING GIST(geometry);

-- Comments
COMMENT ON TABLE landscape.project_boundaries IS 'Stores project boundary definitions from selected tax parcels';
COMMENT ON TABLE landscape.project_parcel_boundaries IS 'Individual tax parcels that define project boundaries';
COMMENT ON COLUMN landscape.project_boundaries.dissolved_geometry IS 'Dissolved geometry when multiple parcels are selected';
COMMENT ON COLUMN landscape.project_parcel_boundaries.parcel_id IS 'Pinal County tax parcel identifier';

-- Update trigger for project_boundaries
CREATE OR REPLACE FUNCTION landscape.update_project_boundaries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_boundaries_timestamp ON landscape.project_boundaries;
CREATE TRIGGER trigger_update_project_boundaries_timestamp
    BEFORE UPDATE ON landscape.project_boundaries
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_project_boundaries_timestamp();