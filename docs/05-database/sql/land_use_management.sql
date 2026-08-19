-- Land Use Management Schema
-- This creates the comprehensive land use ecosystem tables

-- Core Hierarchy Tables
CREATE TABLE IF NOT EXISTS landscape.lu_family (
    family_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    ord INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS landscape.lu_subtype (
    subtype_id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES landscape.lu_family(family_id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    ord INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(family_id, code)
);

-- Land Use Definitions (enhanced from existing)
CREATE TABLE IF NOT EXISTS landscape.tbl_landuse (
    landuse_id SERIAL PRIMARY KEY,
    subtype_id INTEGER REFERENCES landscape.lu_subtype(subtype_id) ON DELETE SET NULL,
    landuse_code VARCHAR(20) NOT NULL UNIQUE,
    landuse_type VARCHAR(50),
    name VARCHAR(100),
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Programming Parameters
CREATE TABLE IF NOT EXISTS landscape.tbl_landuse_program (
    landuse_code VARCHAR(20) PRIMARY KEY REFERENCES landscape.tbl_landuse(landuse_code) ON DELETE CASCADE,
    -- Building efficiency and density
    rsf_to_gfa_eff DECIMAL(5,4), -- Rentable SF to Gross Floor Area efficiency
    employee_density DECIMAL(8,2), -- SF per employee
    floor_plate_efficiency DECIMAL(5,4), -- Net to gross floor area ratio
    clear_height_ft DECIMAL(6,2), -- Clear height in feet
    
    -- Loading and circulation
    loading_dock_ratio DECIMAL(8,4), -- Loading docks per 1000 SF
    truck_court_depth_ft DECIMAL(6,2), -- Truck court depth
    trailer_parking_ratio DECIMAL(8,4), -- Trailer parking spaces per 1000 SF
    
    -- Residential specific
    dwelling_units_per_acre DECIMAL(8,2), -- DU/acre for residential
    average_unit_size_sf INTEGER, -- Average unit size in SF
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zoning Controls and Requirements  
CREATE TABLE IF NOT EXISTS landscape.tbl_zoning_control (
    landuse_code VARCHAR(20) PRIMARY KEY REFERENCES landscape.tbl_landuse(landuse_code) ON DELETE CASCADE,
    
    -- Site development controls
    site_coverage_pct DECIMAL(5,2), -- Maximum site coverage percentage
    site_far DECIMAL(6,3), -- Floor Area Ratio
    max_stories INTEGER, -- Maximum number of stories
    max_height_ft DECIMAL(6,2), -- Maximum height in feet
    
    -- Parking requirements
    parking_ratio_per1000sf DECIMAL(8,3), -- Parking spaces per 1000 SF
    parking_stall_sf DECIMAL(6,2), -- SF per parking stall (including circulation)
    
    -- Site design
    site_common_area_pct DECIMAL(5,2), -- Required common/open space percentage
    setback_front_ft DECIMAL(6,2), -- Front setback in feet
    setback_side_ft DECIMAL(6,2), -- Side setback in feet
    setback_rear_ft DECIMAL(6,2), -- Rear setback in feet
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lu_subtype_family ON landscape.lu_subtype(family_id);
CREATE INDEX IF NOT EXISTS idx_tbl_landuse_subtype ON landscape.tbl_landuse(subtype_id);
CREATE INDEX IF NOT EXISTS idx_tbl_landuse_code ON landscape.tbl_landuse(landuse_code);
CREATE INDEX IF NOT EXISTS idx_lu_family_active ON landscape.lu_family(active);
CREATE INDEX IF NOT EXISTS idx_lu_subtype_active ON landscape.lu_subtype(active);
CREATE INDEX IF NOT EXISTS idx_tbl_landuse_active ON landscape.tbl_landuse(active);

-- Update triggers to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION landscape.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lu_family_updated_at BEFORE UPDATE ON landscape.lu_family 
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

CREATE TRIGGER update_lu_subtype_updated_at BEFORE UPDATE ON landscape.lu_subtype 
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

CREATE TRIGGER update_tbl_landuse_updated_at BEFORE UPDATE ON landscape.tbl_landuse 
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

CREATE TRIGGER update_tbl_landuse_program_updated_at BEFORE UPDATE ON landscape.tbl_landuse_program 
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

CREATE TRIGGER update_tbl_zoning_control_updated_at BEFORE UPDATE ON landscape.tbl_zoning_control 
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();