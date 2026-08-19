-- Create rent comparables table
CREATE TABLE IF NOT EXISTS landscape.tbl_rent_comparable (
    comparable_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_projects(project_id) ON DELETE CASCADE,
    property_name VARCHAR(200) NOT NULL,
    address VARCHAR(300),
    distance_miles DECIMAL(5,2),
    year_built INTEGER,
    total_units INTEGER,
    unit_type VARCHAR(50) NOT NULL,
    bedrooms DECIMAL(3,1) NOT NULL,
    bathrooms DECIMAL(3,1) NOT NULL,
    avg_sqft INTEGER NOT NULL,
    asking_rent DECIMAL(10,2) NOT NULL,
    effective_rent DECIMAL(10,2),
    concessions VARCHAR(500),
    amenities TEXT,
    notes TEXT,
    data_source VARCHAR(100),
    as_of_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create market rate analysis table
CREATE TABLE IF NOT EXISTS landscape.tbl_market_rate_analysis (
    analysis_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_projects(project_id) ON DELETE CASCADE,
    unit_type VARCHAR(50) NOT NULL,
    bedrooms DECIMAL(3,1) NOT NULL,
    bathrooms DECIMAL(3,1) NOT NULL,
    subject_sqft INTEGER NOT NULL,
    comp_count INTEGER NOT NULL,
    min_rent DECIMAL(10,2),
    max_rent DECIMAL(10,2),
    avg_rent DECIMAL(10,2),
    median_rent DECIMAL(10,2),
    avg_rent_per_sf DECIMAL(6,2),
    location_adjustment DECIMAL(6,3) DEFAULT 0,
    condition_adjustment DECIMAL(6,3) DEFAULT 0,
    amenity_adjustment DECIMAL(6,3) DEFAULT 0,
    size_adjustment_per_sf DECIMAL(6,3) DEFAULT 0,
    recommended_market_rent DECIMAL(10,2),
    recommended_rent_per_sf DECIMAL(6,2),
    confidence_level VARCHAR(20) DEFAULT 'MEDIUM',
    analysis_notes TEXT,
    analyzed_by VARCHAR(100),
    analysis_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rent_comparable_project ON landscape.tbl_rent_comparable(project_id);
CREATE INDEX IF NOT EXISTS idx_rent_comparable_unit_type ON landscape.tbl_rent_comparable(unit_type);
CREATE INDEX IF NOT EXISTS idx_market_rate_analysis_project ON landscape.tbl_market_rate_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_market_rate_analysis_unit_type ON landscape.tbl_market_rate_analysis(unit_type);
