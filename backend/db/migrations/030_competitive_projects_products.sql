-- Migration: Create market_competitive_projects tables for Zonda integration
-- For: Competitive Projects Zonda Integration feature
-- Date: 2025-12-12
--
-- Creates:
-- 1. market_competitive_projects - Main competitors table
-- 2. market_competitive_project_products - Product-level data (lot widths, pricing)
-- 3. market_competitive_project_exclusions - Tracks user-deleted competitors to prevent re-import

-- ============================================================================
-- 1. CREATE market_competitive_projects table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.market_competitive_projects (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Project identity - display master_plan_name if present, else comp_name
    master_plan_name VARCHAR(200),
    comp_name VARCHAR(200) NOT NULL,
    builder_name VARCHAR(200),

    -- Location
    comp_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    city VARCHAR(100),
    zip_code VARCHAR(10),

    -- Summary metrics (project-level aggregates, product-level in child table)
    total_units INTEGER,
    price_min DECIMAL(15, 2),
    price_max DECIMAL(15, 2),
    absorption_rate_monthly DECIMAL(8, 2),

    -- Status and source
    status VARCHAR(50) DEFAULT 'selling',
    data_source VARCHAR(50) DEFAULT 'manual',
    source_url TEXT,
    notes TEXT,

    -- Zonda linkage
    source_project_id VARCHAR(100),
    effective_date DATE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for project lookups
CREATE INDEX IF NOT EXISTS idx_market_comps_project
ON landscape.market_competitive_projects(project_id);

-- Index for source_project_id lookups
CREATE INDEX IF NOT EXISTS idx_market_comps_source_project
ON landscape.market_competitive_projects(source_project_id);

-- Create unique constraint to prevent duplicate Zonda imports per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_comps_project_source_unique
ON landscape.market_competitive_projects(project_id, source_project_id)
WHERE source_project_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE landscape.market_competitive_projects IS
'Competitive land development projects for market analysis. Supports Zonda-imported and manually-entered competitors.';

COMMENT ON COLUMN landscape.market_competitive_projects.data_source IS
'Source: manual, Zonda, landscaper_ai, mls, public_records';

COMMENT ON COLUMN landscape.market_competitive_projects.source_project_id IS
'Reference to mkt_new_home_project.source_project_id for Zonda-sourced data';

COMMENT ON COLUMN landscape.market_competitive_projects.effective_date IS
'Date of the Zonda snapshot used (from mkt_new_home_project.effective_date)';

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION landscape.update_market_comp_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_market_comp_timestamp
ON landscape.market_competitive_projects;

CREATE TRIGGER trigger_update_market_comp_timestamp
BEFORE UPDATE ON landscape.market_competitive_projects
FOR EACH ROW
EXECUTE FUNCTION landscape.update_market_comp_timestamp();

-- ============================================================================
-- 2. CREATE market_competitive_project_products table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.market_competitive_project_products (
    id SERIAL PRIMARY KEY,
    competitive_project_id INTEGER NOT NULL REFERENCES landscape.market_competitive_projects(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES landscape.res_lot_product(product_id) ON DELETE SET NULL,

    -- Lot specifications (denormalized for display/filtering)
    lot_width_ft INTEGER,
    lot_dimensions VARCHAR(20),  -- e.g., "50x115"

    -- Unit specifications
    unit_size_min_sf INTEGER,
    unit_size_max_sf INTEGER,
    unit_size_avg_sf INTEGER,

    -- Pricing
    price_min DECIMAL(12, 2),
    price_max DECIMAL(12, 2),
    price_avg DECIMAL(12, 2),
    price_per_sf_avg DECIMAL(8, 2),

    -- Inventory
    units_planned INTEGER,
    units_sold INTEGER,
    units_remaining INTEGER,
    qmi_count INTEGER,

    -- Absorption metrics
    sales_rate_monthly DECIMAL(6, 2),
    sales_rate_3m_avg DECIMAL(6, 2),
    sales_rate_6m_avg DECIMAL(6, 2),

    -- Supply metrics
    mos_vdl DECIMAL(6, 2),
    mos_inventory DECIMAL(6, 2),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One row per project/product combo (or project/lot_width if no product_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_products_project_product
ON landscape.market_competitive_project_products(competitive_project_id, product_id)
WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_products_project_width
ON landscape.market_competitive_project_products(competitive_project_id, lot_width_ft)
WHERE product_id IS NULL AND lot_width_ft IS NOT NULL;

-- Index for filtering by lot width
CREATE INDEX IF NOT EXISTS idx_comp_products_lot_width
ON landscape.market_competitive_project_products(lot_width_ft);

-- Index for joining to competitive projects
CREATE INDEX IF NOT EXISTS idx_comp_products_competitive_project
ON landscape.market_competitive_project_products(competitive_project_id);

-- Add comments
COMMENT ON TABLE landscape.market_competitive_project_products IS
'Product-level data for competitive projects. Many-to-many relationship between competitors and lot products.';

COMMENT ON COLUMN landscape.market_competitive_project_products.product_id IS
'FK to res_lot_product. Nullable if lot width not yet in product library.';

COMMENT ON COLUMN landscape.market_competitive_project_products.lot_width_ft IS
'Denormalized lot width for display/filtering even if product not linked';

COMMENT ON COLUMN landscape.market_competitive_project_products.mos_vdl IS
'Months of Supply at Vacant Developed Lot stage';

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION landscape.update_market_comp_products_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_market_comp_products_timestamp
ON landscape.market_competitive_project_products;

CREATE TRIGGER trigger_update_market_comp_products_timestamp
BEFORE UPDATE ON landscape.market_competitive_project_products
FOR EACH ROW
EXECUTE FUNCTION landscape.update_market_comp_products_timestamp();

-- ============================================================================
-- 3. CREATE market_competitive_project_exclusions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.market_competitive_project_exclusions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    source_project_id VARCHAR(100) NOT NULL,
    excluded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    excluded_reason VARCHAR(200),

    -- Prevent duplicate exclusions
    UNIQUE(project_id, source_project_id)
);

-- Index for quick lookups during sync
CREATE INDEX IF NOT EXISTS idx_comp_exclusions_project
ON landscape.market_competitive_project_exclusions(project_id);

COMMENT ON TABLE landscape.market_competitive_project_exclusions IS
'Tracks Zonda projects that user has explicitly removed to prevent re-import on sync';

COMMENT ON COLUMN landscape.market_competitive_project_exclusions.source_project_id IS
'Reference to mkt_new_home_project.source_project_id that was excluded';
