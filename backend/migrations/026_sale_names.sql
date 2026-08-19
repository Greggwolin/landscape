-- Run with: psql -d landscape -f backend/migrations/026_sale_names.sql

-- Create table to store user-defined sale names
-- Phase 3: Sale Transaction Details feature
-- Each sale transaction is identified by project_id + sale_date
-- Multiple parcels can belong to the same sale if they have the same sale_date

CREATE TABLE IF NOT EXISTS landscape.sale_names (
  id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  sale_name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, sale_date)
);

-- Create index for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_sale_names_project ON landscape.sale_names(project_id);

-- Add comment for documentation
COMMENT ON TABLE landscape.sale_names IS 'User-defined names for sale transactions. Grouped by sale_date.';
COMMENT ON COLUMN landscape.sale_names.sale_date IS 'The date parcels were sold. All parcels with the same sale_date belong to the same transaction.';
COMMENT ON COLUMN landscape.sale_names.sale_name IS 'User-defined label for the sale (e.g., "Retail Portfolio Sale", "Phase 1 Bulk Sale")';
