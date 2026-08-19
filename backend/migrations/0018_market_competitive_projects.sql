-- Migration: Add market competitive projects and macro data tables
-- For: Navigation Restructure - Lifecycle Stage Tiles (Market Analysis page)
-- Date: 2025-11-21

-- Create market_competitive_projects table
CREATE TABLE IF NOT EXISTS landscape.market_competitive_projects (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.projects(id) ON DELETE CASCADE,
    comp_name VARCHAR(200) NOT NULL,
    comp_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    total_units INTEGER,
    price_min DECIMAL(15, 2),
    price_max DECIMAL(15, 2),
    absorption_rate_monthly DECIMAL(8, 2),
    status VARCHAR(50) DEFAULT 'selling',
    data_source VARCHAR(50) DEFAULT 'manual',
    source_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_comps_project
ON landscape.market_competitive_projects(project_id);

CREATE INDEX IF NOT EXISTS idx_market_comps_status
ON landscape.market_competitive_projects(status);

-- Add comments
COMMENT ON TABLE landscape.market_competitive_projects IS
'Competitive land development projects for market analysis';

COMMENT ON COLUMN landscape.market_competitive_projects.status IS
'Status: selling, sold_out, planned';

COMMENT ON COLUMN landscape.market_competitive_projects.data_source IS
'Source: manual, landscaper_ai, mls, public_records';

-- Create market_macro_data table
CREATE TABLE IF NOT EXISTS landscape.market_macro_data (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.projects(id) ON DELETE CASCADE,
    population_growth_rate DECIMAL(5, 2),
    employment_trend VARCHAR(50),
    household_formation_rate DECIMAL(5, 2),
    building_permits_annual INTEGER,
    median_income DECIMAL(12, 2),
    data_year INTEGER,
    data_source VARCHAR(50) DEFAULT 'manual',
    source_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_macro_project
ON landscape.market_macro_data(project_id);

CREATE INDEX IF NOT EXISTS idx_market_macro_year
ON landscape.market_macro_data(data_year);

-- Add comments
COMMENT ON TABLE landscape.market_macro_data IS
'Market macro-economic data for project market analysis';

COMMENT ON COLUMN landscape.market_macro_data.employment_trend IS
'Trend: growing, stable, declining';

COMMENT ON COLUMN landscape.market_macro_data.data_source IS
'Source: manual, landscaper_ai, census, bls';

-- Add trigger for updated_at timestamp on competitive projects
CREATE OR REPLACE FUNCTION update_market_competitive_projects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_market_competitive_projects_timestamp
BEFORE UPDATE ON landscape.market_competitive_projects
FOR EACH ROW
EXECUTE FUNCTION update_market_competitive_projects_timestamp();

-- Add trigger for updated_at timestamp on macro data
CREATE OR REPLACE FUNCTION update_market_macro_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_market_macro_data_timestamp
BEFORE UPDATE ON landscape.market_macro_data
FOR EACH ROW
EXECUTE FUNCTION update_market_macro_data_timestamp();
