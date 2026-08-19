-- Migration 027: Market Data Tables
-- Phase 4: Feasibility/Valuation Tab - Market Data
-- Creates three tables for comparable data storage

-- ============================================================================
-- Table: market_data_land_sales
-- Stores comparable land sale transactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.market_data_land_sales (
  comp_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  property_name VARCHAR(200),
  location VARCHAR(200),
  sale_date DATE,
  acres NUMERIC(10, 2),
  price_per_acre NUMERIC(12, 2),
  total_price NUMERIC(14, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_land_sales_project ON landscape.market_data_land_sales(project_id);

-- ============================================================================
-- Table: market_data_housing_prices
-- Stores housing price comparables
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.market_data_housing_prices (
  comp_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  project_name VARCHAR(200),
  location VARCHAR(200),
  product_type VARCHAR(100),
  avg_price NUMERIC(12, 2),
  price_per_sf NUMERIC(8, 2),
  date_reported DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_housing_project ON landscape.market_data_housing_prices(project_id);

-- ============================================================================
-- Table: market_data_absorption_rates
-- Stores absorption rate comparables
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.market_data_absorption_rates (
  comp_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  project_name VARCHAR(200),
  location VARCHAR(200),
  product_type VARCHAR(100),
  monthly_absorption NUMERIC(6, 2),
  annual_absorption NUMERIC(6, 2),
  date_reported DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_absorption_project ON landscape.market_data_absorption_rates(project_id);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE landscape.market_data_land_sales IS 'Comparable land sale transactions for market analysis';
COMMENT ON TABLE landscape.market_data_housing_prices IS 'Housing price comparables for pricing assumptions';
COMMENT ON TABLE landscape.market_data_absorption_rates IS 'Absorption rate comparables for sales velocity assumptions';
