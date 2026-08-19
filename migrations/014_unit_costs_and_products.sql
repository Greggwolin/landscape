-- =====================================================
-- Migration 014: Unit Costs & Product Library Foundations
-- =====================================================
-- Description: Establish reference tables for unit cost templates,
--              ensure supporting measures, and extend product standards.
-- Date: November 7, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Ensure measures library exists with required system codes
-- =====================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_measures (
  measure_code VARCHAR(16) PRIMARY KEY,
  measure_name VARCHAR(64) NOT NULL,
  measure_category VARCHAR(32),
  measure_type VARCHAR(32),
  is_system BOOLEAN DEFAULT FALSE
);

INSERT INTO landscape.tbl_measures (measure_code, measure_name, measure_category, measure_type, is_system) VALUES
  ('DAY', 'Day', 'time', 'time', TRUE),
  ('WK', 'Week', 'time', 'time', TRUE),
  ('MO', 'Month', 'time', 'time', TRUE),
  ('YR', 'Year', 'time', 'time', TRUE),
  ('%', 'Percent', 'ratio', 'ratio', TRUE),
  ('EA', 'Each', 'count', 'count', TRUE),
  ('LF', 'Linear Foot', 'length', 'length', TRUE),
  ('SF', 'Square Foot', 'area', 'area', TRUE),
  ('SY', 'Square Yard', 'area', 'area', TRUE),
  ('CY', 'Cubic Yard', 'volume', 'volume', TRUE),
  ('LS', 'Lump Sum', 'none', 'none', TRUE)
ON CONFLICT (measure_code) DO NOTHING;

-- =====================================================
-- 2. Unit cost category hierarchy (development scope)
-- =====================================================

CREATE TABLE IF NOT EXISTS landscape.core_unit_cost_category (
  category_id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES landscape.core_unit_cost_category(category_id),
  category_name VARCHAR(100) NOT NULL,
  cost_scope VARCHAR(20) NOT NULL CHECK (cost_scope IN ('development', 'operations')),
  cost_type VARCHAR(20) NOT NULL CHECK (cost_type IN ('hard', 'soft', 'deposit', 'other')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT core_unit_cost_category_unique UNIQUE (category_name, cost_scope)
);

CREATE INDEX IF NOT EXISTS idx_unit_cost_category_parent
  ON landscape.core_unit_cost_category(parent_id);

CREATE INDEX IF NOT EXISTS idx_unit_cost_category_scope
  ON landscape.core_unit_cost_category(cost_scope);

CREATE INDEX IF NOT EXISTS idx_unit_cost_category_type
  ON landscape.core_unit_cost_category(cost_type);

COMMENT ON COLUMN landscape.core_unit_cost_category.cost_scope IS
  'Development (one-time construction) vs Operations (recurring OPEX/CAPEX)';

COMMENT ON COLUMN landscape.core_unit_cost_category.cost_type IS
  'Hard costs, soft costs, deposits, or other within the scope';

INSERT INTO landscape.core_unit_cost_category (category_name, cost_scope, cost_type, sort_order) VALUES
  ('Sewer', 'development', 'hard', 10),
  ('Water', 'development', 'hard', 20),
  ('Grading / Site Prep', 'development', 'hard', 30),
  ('Concrete', 'development', 'hard', 40),
  ('Paving', 'development', 'hard', 50),
  ('Storm Drain', 'development', 'hard', 60),
  ('Dry Utilities', 'development', 'hard', 70),
  ('Staking', 'development', 'hard', 80),
  ('Testing', 'development', 'hard', 90),
  ('Landscaping', 'development', 'hard', 100),
  ('Permits', 'development', 'soft', 110),
  ('Insurance', 'development', 'soft', 120),
  ('Contractor', 'development', 'soft', 130),
  ('Sales Tax', 'development', 'soft', 140),
  ('Warranty', 'development', 'soft', 150),
  ('Bonds', 'development', 'deposit', 160),
  ('Deposits', 'development', 'deposit', 170),
  ('Other Cost', 'development', 'other', 180)
ON CONFLICT (category_name, cost_scope) DO NOTHING;

-- =====================================================
-- 3. Unit cost template library and benchmark links
-- =====================================================

CREATE TABLE IF NOT EXISTS landscape.core_unit_cost_template (
  template_id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES landscape.core_unit_cost_category(category_id),
  item_name VARCHAR(200) NOT NULL,
  default_uom_code VARCHAR(10) REFERENCES landscape.tbl_measures(measure_code),
  typical_low_value NUMERIC(12,2),
  typical_mid_value NUMERIC(12,2),
  typical_high_value NUMERIC(12,2),
  market_geography VARCHAR(100),
  project_type_code VARCHAR(50) DEFAULT 'LAND' CHECK (project_type_code IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU')),
  last_used_date DATE,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_from_project_id INTEGER REFERENCES landscape.tbl_project(project_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT core_unit_cost_template_unique UNIQUE (category_id, item_name, default_uom_code, project_type_code, market_geography)
);

CREATE INDEX IF NOT EXISTS idx_unit_cost_template_category
  ON landscape.core_unit_cost_template(category_id);

CREATE INDEX IF NOT EXISTS idx_unit_cost_template_name
  ON landscape.core_unit_cost_template(item_name);

CREATE INDEX IF NOT EXISTS idx_unit_cost_template_geography
  ON landscape.core_unit_cost_template(market_geography);

CREATE INDEX IF NOT EXISTS idx_unit_cost_template_project_type
  ON landscape.core_unit_cost_template(project_type_code);

COMMENT ON COLUMN landscape.core_unit_cost_template.item_name IS
  'Descriptive line item (e.g., "Monthly Rental of Fence (per LF per mo)")';

COMMENT ON COLUMN landscape.core_unit_cost_template.default_uom_code IS
  'Primary unit (MO, EA, LF, etc.)';

COMMENT ON TABLE landscape.core_unit_cost_template IS
  'Template library for budget line items — autocomplete + typical values';

CREATE TABLE IF NOT EXISTS landscape.core_template_benchmark_link (
  link_id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES landscape.core_unit_cost_template(template_id) ON DELETE CASCADE,
  benchmark_id INTEGER REFERENCES landscape.core_global_benchmark(benchmark_id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_benchmark_template
  ON landscape.core_template_benchmark_link(template_id);

CREATE INDEX IF NOT EXISTS idx_template_benchmark_benchmark
  ON landscape.core_template_benchmark_link(benchmark_id);

-- =====================================================
-- 4. Product library enhancements
-- =====================================================

ALTER TABLE landscape.res_lot_product
  ADD COLUMN IF NOT EXISTS type_id BIGINT REFERENCES landscape.lu_type(type_id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_res_lot_product_type
  ON landscape.res_lot_product(type_id);

CREATE INDEX IF NOT EXISTS idx_res_lot_product_active
  ON landscape.res_lot_product(is_active);

COMMENT ON TABLE landscape.res_lot_product IS
  'Global catalog of lot products with dimensional standards';

COMMENT ON COLUMN landscape.res_lot_product.code IS
  'Product code (42x120, SF50, ADU, etc.)';

COMMENT ON COLUMN landscape.res_lot_product.lot_w_ft IS
  'Lot width (ft)';

COMMENT ON COLUMN landscape.res_lot_product.lot_d_ft IS
  'Lot depth (ft)';

COMMENT ON COLUMN landscape.res_lot_product.lot_area_sf IS
  'Lot area (SF)';

-- =====================================================
-- 5. Planning standards catalog and project override
-- =====================================================

CREATE TABLE IF NOT EXISTS landscape.core_planning_standards (
  standard_id SERIAL PRIMARY KEY,
  standard_name VARCHAR(100) NOT NULL,
  default_planning_efficiency NUMERIC(5,4) DEFAULT 0.7500,
  default_street_row_pct NUMERIC(5,4),
  default_park_dedication_pct NUMERIC(5,4),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT core_planning_standards_unique UNIQUE (standard_name)
);

COMMENT ON TABLE landscape.core_planning_standards IS
  'Global planning defaults used to calculate residential efficiency';

INSERT INTO landscape.core_planning_standards (standard_name, default_planning_efficiency)
VALUES ('Global Default', 0.7500)
ON CONFLICT (standard_name) DO NOTHING;

ALTER TABLE landscape.tbl_project
  ADD COLUMN IF NOT EXISTS planning_efficiency NUMERIC(5,4);

COMMENT ON COLUMN landscape.tbl_project.planning_efficiency IS
  'Project-specific planning efficiency override (NULL = use global default)';

COMMIT;
