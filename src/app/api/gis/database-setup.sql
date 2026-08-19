-- GIS Workflow Database Tables
-- Add missing tables for boundary and mapping history tracking

-- Create boundary history table
CREATE TABLE IF NOT EXISTS landscape.gis_boundary_history (
    boundary_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
    boundary_type VARCHAR(50) NOT NULL DEFAULT 'tax_parcel_boundary',
    parcels_selected JSONB NOT NULL,
    total_acres DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_type VARCHAR(50) NOT NULL DEFAULT 'boundary_confirmed'
);

-- Create mapping history table
CREATE TABLE IF NOT EXISTS landscape.gis_mapping_history (
    mapping_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
    mapping_type VARCHAR(50) NOT NULL DEFAULT 'assessor_field_mapping',
    fields_mapped JSONB NOT NULL,
    source_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_type VARCHAR(50) NOT NULL DEFAULT 'mapping_applied'
);

-- Add missing project fields for assessor data mapping
ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS project_address TEXT,
ADD COLUMN IF NOT EXISTS legal_owner TEXT,
ADD COLUMN IF NOT EXISTS county VARCHAR(100) DEFAULT 'Maricopa',
ADD COLUMN IF NOT EXISTS existing_land_use TEXT,
ADD COLUMN IF NOT EXISTS assessed_value DECIMAL(15,2);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_boundary_history_project_id ON landscape.gis_boundary_history(project_id);
CREATE INDEX IF NOT EXISTS idx_boundary_history_created_at ON landscape.gis_boundary_history(created_at);
CREATE INDEX IF NOT EXISTS idx_mapping_history_project_id ON landscape.gis_mapping_history(project_id);
CREATE INDEX IF NOT EXISTS idx_mapping_history_created_at ON landscape.gis_mapping_history(created_at);

-- Add comments for documentation
COMMENT ON TABLE landscape.gis_boundary_history IS 'Tracks tax parcel boundary selections for projects';
COMMENT ON TABLE landscape.gis_mapping_history IS 'Tracks field mapping from assessor data to project fields';
COMMENT ON COLUMN landscape.tbl_project.project_address IS 'Primary address from selected tax parcels';
COMMENT ON COLUMN landscape.tbl_project.legal_owner IS 'Primary legal owner from selected tax parcels';
COMMENT ON COLUMN landscape.tbl_project.existing_land_use IS 'Existing land use description from assessor data';
COMMENT ON COLUMN landscape.tbl_project.assessed_value IS 'Total assessed value of selected tax parcels';