-- ============================================================================
-- Migration 023: Sale Calculation System
-- ============================================================================
-- Description: Creates tables for sale benchmarks and parcel sale assumptions
--              to support detailed net proceeds calculations with improvement
--              offsets and transaction costs
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Sale Benchmarks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_sale_benchmarks (
  benchmark_id SERIAL PRIMARY KEY,

  -- Scope hierarchy: global < project < product
  scope_level VARCHAR(20) NOT NULL CHECK (scope_level IN ('global', 'project', 'product')),
  project_id INTEGER REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  lu_type_code VARCHAR(20),
  product_code VARCHAR(50),

  -- Benchmark type
  benchmark_type VARCHAR(50) NOT NULL,
  -- Types: 'improvement_offset', 'legal', 'commission', 'closing', 'title_insurance', 'custom'

  -- Name (for custom items)
  benchmark_name VARCHAR(100),

  -- Value stored as both rate and per-unit for flexibility
  rate_pct NUMERIC(5,4),           -- For % based (e.g., 0.0300 = 3%)
  amount_per_uom NUMERIC(12,2),    -- For $ per UOM (e.g., $1,000/FF)
  fixed_amount NUMERIC(12,2),      -- For fixed $ amount (e.g., $5,000)
  uom_code VARCHAR(10),

  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- Indexes
CREATE INDEX idx_sale_benchmarks_scope ON landscape.tbl_sale_benchmarks(scope_level, project_id);
CREATE INDEX idx_sale_benchmarks_type ON landscape.tbl_sale_benchmarks(benchmark_type);
CREATE INDEX idx_sale_benchmarks_product ON landscape.tbl_sale_benchmarks(project_id, lu_type_code, product_code);

-- Seed global defaults
INSERT INTO landscape.tbl_sale_benchmarks
  (scope_level, benchmark_type, benchmark_name, rate_pct, description)
VALUES
  ('global', 'legal', 'Legal Fees', 0.0050, 'Standard legal fees for land sales'),
  ('global', 'commission', 'Sales Commission', 0.0300, 'Standard broker commission'),
  ('global', 'closing', 'Closing Costs', 0.0050, 'Title company and escrow fees'),
  ('global', 'title_insurance', 'Title Insurance', 0.0100, 'Owner and lender title policies')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE landscape.tbl_sale_benchmarks IS
  'Benchmark defaults for improvement offsets and transaction costs. Uses hierarchy: product > project > global.';

-- ============================================================================
-- PART 2: Parcel Sale Assumptions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_parcel_sale_assumptions (
  assumption_id SERIAL PRIMARY KEY,
  parcel_id INTEGER NOT NULL REFERENCES landscape.tbl_parcel(parcel_id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,

  -- Gross pricing (from land_use_pricing + inflation)
  base_price_per_unit NUMERIC(12,2),
  price_uom VARCHAR(10),
  inflation_rate NUMERIC(8,6),
  inflated_price_per_unit NUMERIC(12,2),
  gross_parcel_price NUMERIC(15,2),

  -- Improvement offset
  improvement_offset_per_uom NUMERIC(12,2),
  improvement_offset_total NUMERIC(15,2),
  improvement_offset_source VARCHAR(50), -- 'benchmark_product', 'benchmark_project', 'benchmark_global', 'manual_override'
  improvement_offset_override BOOLEAN DEFAULT FALSE,

  -- Gross sale proceeds (after improvement offset)
  gross_sale_proceeds NUMERIC(15,2),

  -- Transaction costs (stored as both % and calculated $)
  legal_pct NUMERIC(5,4),
  legal_amount NUMERIC(12,2),
  legal_override BOOLEAN DEFAULT FALSE,

  commission_pct NUMERIC(5,4),
  commission_amount NUMERIC(12,2),
  commission_override BOOLEAN DEFAULT FALSE,

  closing_cost_pct NUMERIC(5,4),
  closing_cost_amount NUMERIC(12,2),
  closing_cost_override BOOLEAN DEFAULT FALSE,

  title_insurance_pct NUMERIC(5,4),
  title_insurance_amount NUMERIC(12,2),
  title_insurance_override BOOLEAN DEFAULT FALSE,

  -- Custom transaction costs (JSON array)
  custom_transaction_costs JSONB DEFAULT '[]'::jsonb,
  -- Format: [{"name": "HOA Fee", "amount": 5000.00, "type": "$$", "description": "...", "is_saved_as_benchmark": true}]

  -- Net result
  total_transaction_costs NUMERIC(15,2),
  net_sale_proceeds NUMERIC(15,2),
  net_proceeds_per_uom NUMERIC(12,2),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(parcel_id) -- One assumption record per parcel
);

-- Index
CREATE INDEX idx_parcel_sale_assumptions_parcel ON landscape.tbl_parcel_sale_assumptions(parcel_id);

COMMENT ON TABLE landscape.tbl_parcel_sale_assumptions IS
  'Stores calculated sale proceeds for each parcel including improvement offsets and transaction costs.';

COMMENT ON COLUMN landscape.tbl_parcel_sale_assumptions.custom_transaction_costs IS
  'JSONB array of custom transaction cost items: [{"name", "amount", "type", "description", "is_saved_as_benchmark"}]';

COMMIT;
