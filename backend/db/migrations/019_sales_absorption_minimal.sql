-- ============================================================================
-- Migration 019: Sales & Absorption - Minimal Implementation
-- ============================================================================
-- Purpose: Add sale tracking to containers and enhance pricing for frontend
-- Date: 2025-11-14
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Enhance land_use_pricing table
-- ============================================================================

-- Add product_code and growth_rate columns if they don't exist
ALTER TABLE landscape.land_use_pricing
ADD COLUMN IF NOT EXISTS product_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS growth_rate NUMERIC(5,3) DEFAULT 0.035;

-- Drop old constraint if it exists (project + lu_type only)
ALTER TABLE landscape.land_use_pricing
DROP CONSTRAINT IF EXISTS land_use_pricing_project_id_lu_type_code_key;

-- Add new constraint (project + lu_type + product)
ALTER TABLE landscape.land_use_pricing
DROP CONSTRAINT IF EXISTS land_use_pricing_project_lu_product_key;

ALTER TABLE landscape.land_use_pricing
ADD CONSTRAINT land_use_pricing_project_lu_product_key
UNIQUE(project_id, lu_type_code, product_code);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_land_use_pricing_project_product
ON landscape.land_use_pricing(project_id, lu_type_code, product_code);

COMMENT ON COLUMN landscape.land_use_pricing.product_code IS 'Product type code for specific lot products (e.g., 50x120, 40x100)';
COMMENT ON COLUMN landscape.land_use_pricing.growth_rate IS 'Annual price growth rate (e.g., 0.035 = 3.5% per year)';

-- ============================================================================
-- PART 2: Add sale tracking columns to tbl_parcel (primary) and tbl_container
-- ============================================================================

-- Add columns to tbl_parcel (primary storage)
ALTER TABLE landscape.tbl_parcel
ADD COLUMN IF NOT EXISTS sale_phase_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS custom_sale_date DATE,
ADD COLUMN IF NOT EXISTS has_sale_overrides BOOLEAN DEFAULT FALSE;

-- Create index for filtering by sale phase
CREATE INDEX IF NOT EXISTS idx_parcel_sale_phase
ON landscape.tbl_parcel(project_id, sale_phase_code)
WHERE sale_phase_code IS NOT NULL;

COMMENT ON COLUMN landscape.tbl_parcel.sale_phase_code IS 'Phase grouping for parcel sales (e.g., "1.1.1", "Phase 2A")';
COMMENT ON COLUMN landscape.tbl_parcel.custom_sale_date IS 'Custom sale date override (clears phase_code when set)';
COMMENT ON COLUMN landscape.tbl_parcel.has_sale_overrides IS 'True if parcel has custom commission/cost overrides';

-- Also add to tbl_container for future container-based workflows
ALTER TABLE landscape.tbl_container
ADD COLUMN IF NOT EXISTS sale_phase_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS custom_sale_date DATE,
ADD COLUMN IF NOT EXISTS has_sale_overrides BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_container_sale_phase
ON landscape.tbl_container(project_id, sale_phase_code)
WHERE sale_phase_code IS NOT NULL;

COMMENT ON COLUMN landscape.tbl_container.sale_phase_code IS 'Phase grouping for parcel sales (container-level tracking)';
COMMENT ON COLUMN landscape.tbl_container.custom_sale_date IS 'Custom sale date override for container';
COMMENT ON COLUMN landscape.tbl_container.has_sale_overrides IS 'True if container has custom sale overrides';

-- ============================================================================
-- PART 3: Create sale phases lookup table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_sale_phases (
  phase_code VARCHAR(20) PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  phase_name VARCHAR(100),
  default_sale_date DATE NOT NULL,
  default_commission_pct NUMERIC(5,2) DEFAULT 3.0,
  default_closing_cost_per_unit NUMERIC(12,2) DEFAULT 750.00,
  default_onsite_cost_pct NUMERIC(5,2) DEFAULT 6.5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_phases_project
ON landscape.tbl_sale_phases(project_id);

COMMENT ON TABLE landscape.tbl_sale_phases IS 'Sale phase groupings for parcels with default assumptions';

-- ============================================================================
-- PART 4: Enhance tbl_sale_settlement for phase tracking
-- ============================================================================

-- Add phase, parcel reference, and cost override columns if they don't exist
ALTER TABLE landscape.tbl_sale_settlement
ADD COLUMN IF NOT EXISTS parcel_id INTEGER,
ADD COLUMN IF NOT EXISTS sale_phase_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS closing_cost_per_unit NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS onsite_cost_pct NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS gross_value NUMERIC(15,2);

-- Make certain columns nullable for partial sale data
ALTER TABLE landscape.tbl_sale_settlement
ALTER COLUMN container_id DROP NOT NULL,
ALTER COLUMN list_price DROP NOT NULL,
ALTER COLUMN allocated_cost_to_complete DROP NOT NULL,
ALTER COLUMN other_adjustments DROP NOT NULL,
ALTER COLUMN net_proceeds DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sale_settlement_phase
ON landscape.tbl_sale_settlement(sale_phase_code);

CREATE INDEX IF NOT EXISTS idx_sale_settlement_container
ON landscape.tbl_sale_settlement(container_id);

CREATE INDEX IF NOT EXISTS idx_sale_settlement_parcel
ON landscape.tbl_sale_settlement(parcel_id);

COMMENT ON COLUMN landscape.tbl_sale_settlement.parcel_id IS 'Reference to tbl_parcel for parcel-based workflows';
COMMENT ON COLUMN landscape.tbl_sale_settlement.sale_phase_code IS 'Links settlement to sale phase for grouped reporting';
COMMENT ON COLUMN landscape.tbl_sale_settlement.commission_pct IS 'Commission percentage override (e.g., 3.0 = 3%)';
COMMENT ON COLUMN landscape.tbl_sale_settlement.onsite_cost_pct IS 'Onsite improvement cost percentage (e.g., 6.5 = 6.5% of gross)';
COMMENT ON COLUMN landscape.tbl_sale_settlement.gross_value IS 'Gross sale value before deductions';

-- ============================================================================
-- PART 5: Create view for parcels with sales data
-- ============================================================================

CREATE OR REPLACE VIEW landscape.vw_parcels_with_sales AS
SELECT
  p.parcel_id,
  p.parcel_code,
  p.project_id,
  p.area_id,
  p.phase_id AS dev_phase_id,
  p.units_total AS units,
  p.acres_gross AS acres,
  p.sale_phase_code,
  p.custom_sale_date,
  p.has_sale_overrides,

  -- Land use and product info (directly from parcel)
  p.type_code AS use_type_code,
  p.landuse_type AS use_type_name,
  p.product_code,
  p.lot_product AS product_name,

  -- Pricing assumptions
  lup.price_per_unit AS base_price_per_unit,
  lup.growth_rate,
  lup.unit_of_measure AS uom_code,
  lup.created_at AS pricing_base_date,

  -- Sale settlement data (parcel_id join, not container_id)
  ss.settlement_id AS sale_id,
  ss.sale_date,
  ss.buyer_name,
  ss.buyer_entity,
  ss.settlement_status AS sale_status,
  ss.gross_value,
  ss.net_proceeds,

  -- Sale cost assumptions (with defaults)
  COALESCE(ss.commission_pct, sp.default_commission_pct, 3.0) AS commission_pct,
  COALESCE(ss.closing_cost_per_unit, sp.default_closing_cost_per_unit, 750.0) AS closing_cost_per_unit,
  COALESCE(ss.onsite_cost_pct, sp.default_onsite_cost_pct, 6.5) AS onsite_cost_pct

FROM landscape.tbl_parcel p
LEFT JOIN landscape.land_use_pricing lup
  ON lup.project_id = p.project_id
  AND lup.lu_type_code = p.type_code
  AND lup.product_code = p.product_code
LEFT JOIN landscape.tbl_sale_settlement ss ON ss.parcel_id = p.parcel_id
LEFT JOIN landscape.tbl_sale_phases sp
  ON sp.phase_code = p.sale_phase_code
  AND sp.project_id = p.project_id
WHERE p.project_id IS NOT NULL
ORDER BY p.project_id, p.parcel_code;

COMMENT ON VIEW landscape.vw_parcels_with_sales IS 'Comprehensive view of parcels with pricing, phases, and sale data';

-- ============================================================================
-- PART 6: Sample data for testing (Project 7)
-- ============================================================================

-- Insert sample pricing for Project 7 if it doesn't exist
INSERT INTO landscape.land_use_pricing (project_id, lu_type_code, product_code, price_per_unit, unit_of_measure, growth_rate)
VALUES
  (7, 'SFD', '50x120', 2100.00, 'FF', 0.035),
  (7, 'SFD', '40x100', 2350.00, 'FF', 0.035),
  (7, 'SFD', '60x130', 1950.00, 'FF', 0.030)
ON CONFLICT (project_id, lu_type_code, product_code) DO NOTHING;

COMMIT;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Test 1: Check pricing columns exist
-- SELECT product_code, growth_rate FROM landscape.land_use_pricing LIMIT 1;

-- Test 2: Check container sale columns exist
-- SELECT container_id, sale_phase_code, custom_sale_date FROM landscape.tbl_container WHERE project_id = 7 LIMIT 1;

-- Test 3: Check view returns data
-- SELECT * FROM landscape.vw_parcels_with_sales WHERE project_id = 7 LIMIT 1;

-- Test 4: Check sale phases table exists
-- SELECT * FROM landscape.tbl_sale_phases LIMIT 1;
