-- Migration 012: Scenario Management System
-- Feature: SCENARIO-001
-- Created: 2025-10-24
-- Description: Comprehensive scenario management for financial modeling with chip-based UI

-- ============================================================================
-- CORE SCENARIO TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tbl_scenario (
  scenario_id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  scenario_name VARCHAR(100) NOT NULL,
  scenario_type VARCHAR(20) NOT NULL DEFAULT 'custom',
    -- Options: 'base', 'optimistic', 'conservative', 'stress', 'custom'
  scenario_code VARCHAR(50) UNIQUE,
    -- e.g., 'PROJ7-BASE', 'PROJ7-OPT-15', 'PROJ7-CONS-10'
  is_active BOOLEAN DEFAULT false,
    -- Only one scenario can be active per project at a time
  is_locked BOOLEAN DEFAULT false,
    -- Locked scenarios cannot be edited (preserve historical records)
  display_order INT DEFAULT 0,
    -- Control chip ordering in UI
  description TEXT,
  color_hex VARCHAR(7) DEFAULT '#6B7280',
    -- For chip color coding: base=#2563EB, optimistic=#10B981, conservative=#F59E0B, stress=#EF4444

  -- Variance tracking (for non-base scenarios)
  variance_method VARCHAR(20),
    -- 'percentage', 'absolute', 'mixed'
  revenue_variance_pct NUMERIC(5,2),
    -- e.g., +15.00 for optimistic, -10.00 for conservative
  cost_variance_pct NUMERIC(5,2),
  absorption_variance_pct NUMERIC(5,2),

  -- Timing adjustments
  start_date_offset_months INT DEFAULT 0,
    -- e.g., +6 for "Delayed Start" scenario

  -- Metadata
  created_by INT REFERENCES auth_user(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cloned_from_scenario_id INT REFERENCES tbl_scenario(scenario_id),
    -- Track scenario lineage

  CONSTRAINT valid_scenario_type
    CHECK (scenario_type IN ('base', 'optimistic', 'conservative', 'stress', 'custom'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenario_project ON tbl_scenario(project_id);
CREATE INDEX IF NOT EXISTS idx_scenario_active ON tbl_scenario(project_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scenario_display_order ON tbl_scenario(project_id, display_order);

-- Add table and column comments
COMMENT ON TABLE tbl_scenario IS 'Financial modeling scenarios for sensitivity analysis';
COMMENT ON COLUMN tbl_scenario.is_active IS 'Only one scenario can be active per project at a time - drives current UI display';
COMMENT ON COLUMN tbl_scenario.is_locked IS 'Locked scenarios preserve historical analysis - cannot be edited or deleted';

-- ============================================================================
-- SCENARIO COMPARISON METADATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS tbl_scenario_comparison (
  comparison_id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  comparison_name VARCHAR(100) NOT NULL,
  scenario_ids INT[] NOT NULL,
    -- Array of scenario IDs being compared (2-5 scenarios typical)
  comparison_type VARCHAR(20) DEFAULT 'side_by_side',
    -- Options: 'side_by_side', 'variance_from_base', 'probability_weighted'

  -- Probability weighting (for Monte Carlo style analysis)
  scenario_probabilities NUMERIC(5,2)[],
    -- Must sum to 100.00 if comparison_type = 'probability_weighted'

  -- Saved comparison results (JSONB for flexibility)
  comparison_results JSONB,
    -- Stores delta analysis, key metrics, IRR comparison, etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_comparison_type
    CHECK (comparison_type IN ('side_by_side', 'variance_from_base', 'probability_weighted'))
);

CREATE INDEX IF NOT EXISTS idx_scenario_comparison_project ON tbl_scenario_comparison(project_id);

-- ============================================================================
-- ADD SCENARIO_ID TO EXISTING TABLES
-- ============================================================================

-- Add scenario_id FK to budget tables
ALTER TABLE core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS scenario_id INT REFERENCES tbl_scenario(scenario_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fact_budget_scenario ON core_fin_fact_budget(scenario_id);
CREATE INDEX IF NOT EXISTS idx_fact_budget_project_scenario ON core_fin_fact_budget(project_id, scenario_id);

ALTER TABLE core_fin_fact_actual
  ADD COLUMN IF NOT EXISTS scenario_id INT REFERENCES tbl_scenario(scenario_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fact_actual_scenario ON core_fin_fact_actual(scenario_id);

-- Add scenario_id FK to revenue tables
ALTER TABLE tbl_revenue_item
  ADD COLUMN IF NOT EXISTS scenario_id INT REFERENCES tbl_scenario(scenario_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_revenue_scenario ON tbl_revenue_item(scenario_id);

ALTER TABLE tbl_absorption_schedule
  ADD COLUMN IF NOT EXISTS scenario_id INT REFERENCES tbl_scenario(scenario_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_absorption_scenario ON tbl_absorption_schedule(scenario_id);

-- Add scenario_id FK to finance structure tables
ALTER TABLE tbl_finance_structure
  ADD COLUMN IF NOT EXISTS scenario_id INT REFERENCES tbl_scenario(scenario_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_finance_structure_scenario ON tbl_finance_structure(scenario_id);

ALTER TABLE tbl_cost_allocation
  ADD COLUMN IF NOT EXISTS scenario_id INT REFERENCES tbl_scenario(scenario_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cost_allocation_scenario ON tbl_cost_allocation(scenario_id);

-- ============================================================================
-- SCENARIO CLONE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION clone_scenario(
  source_scenario_id INT,
  new_scenario_name VARCHAR(100),
  new_scenario_type VARCHAR(20) DEFAULT 'custom'
) RETURNS INT AS $$
DECLARE
  new_scenario_id INT;
  source_project_id INT;
BEGIN
  -- Get source project
  SELECT project_id INTO source_project_id
  FROM tbl_scenario
  WHERE scenario_id = source_scenario_id;

  IF source_project_id IS NULL THEN
    RAISE EXCEPTION 'Source scenario % not found', source_scenario_id;
  END IF;

  -- Create new scenario
  INSERT INTO tbl_scenario (
    project_id, scenario_name, scenario_type,
    scenario_code, description, display_order,
    variance_method, revenue_variance_pct, cost_variance_pct,
    absorption_variance_pct, start_date_offset_months,
    cloned_from_scenario_id
  )
  SELECT
    project_id,
    new_scenario_name,
    new_scenario_type,
    'PROJ' || project_id || '-' || UPPER(LEFT(new_scenario_name, 10)) || '-' || EXTRACT(EPOCH FROM NOW())::INT,
    'Cloned from: ' || scenario_name,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM tbl_scenario WHERE project_id = source_project_id),
    variance_method,
    revenue_variance_pct,
    cost_variance_pct,
    absorption_variance_pct,
    start_date_offset_months,
    source_scenario_id
  FROM tbl_scenario
  WHERE scenario_id = source_scenario_id
  RETURNING scenario_id INTO new_scenario_id;

  -- Clone budget items
  INSERT INTO core_fin_fact_budget (
    project_id, container_id, category_id, subcategory_id,
    line_item, amount, notes, scenario_id
  )
  SELECT
    project_id, container_id, category_id, subcategory_id,
    line_item, amount, notes, new_scenario_id
  FROM core_fin_fact_budget
  WHERE scenario_id = source_scenario_id;

  -- Clone revenue items
  INSERT INTO tbl_revenue_item (
    project_id, container_id, revenue_type, unit_price,
    total_units, notes, scenario_id
  )
  SELECT
    project_id, container_id, revenue_type, unit_price,
    total_units, notes, new_scenario_id
  FROM tbl_revenue_item
  WHERE scenario_id = source_scenario_id;

  -- Clone absorption schedules
  INSERT INTO tbl_absorption_schedule (
    project_id, container_id, period_start, period_end,
    units_absorbed, notes, scenario_id
  )
  SELECT
    project_id, container_id, period_start, period_end,
    units_absorbed, notes, new_scenario_id
  FROM tbl_absorption_schedule
  WHERE scenario_id = source_scenario_id;

  -- Clone finance structures
  INSERT INTO tbl_finance_structure (
    project_id, structure_code, structure_name, structure_type,
    total_budget_amount, allocation_method, scenario_id
  )
  SELECT
    project_id, structure_code, structure_name, structure_type,
    total_budget_amount, allocation_method, new_scenario_id
  FROM tbl_finance_structure
  WHERE scenario_id = source_scenario_id;

  -- Clone cost allocations
  INSERT INTO tbl_cost_allocation (
    project_id, structure_id, container_id,
    allocation_percentage, notes, scenario_id
  )
  SELECT
    project_id, structure_id, container_id,
    allocation_percentage, notes, new_scenario_id
  FROM tbl_cost_allocation
  WHERE scenario_id = source_scenario_id;

  RETURN new_scenario_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clone_scenario IS 'Clone all assumptions from source scenario to new scenario';

-- ============================================================================
-- SCENARIO ACTIVATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION set_active_scenario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other scenarios for this project
    UPDATE tbl_scenario
    SET is_active = false
    WHERE project_id = NEW.project_id
      AND scenario_id != NEW.scenario_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scenario_activate ON tbl_scenario;

CREATE TRIGGER trg_scenario_activate
  BEFORE UPDATE OF is_active ON tbl_scenario
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION set_active_scenario();

COMMENT ON TRIGGER trg_scenario_activate ON tbl_scenario IS 'Ensures only one scenario is active per project';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_scenario') THEN
    RAISE NOTICE 'Table tbl_scenario created successfully';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_scenario_comparison') THEN
    RAISE NOTICE 'Table tbl_scenario_comparison created successfully';
  END IF;
END $$;

-- Verify scenario_id columns added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'core_fin_fact_budget' AND column_name = 'scenario_id'
  ) THEN
    RAISE NOTICE 'scenario_id column added to core_fin_fact_budget';
  END IF;
END $$;

-- Migration complete
SELECT 'Migration 012: Scenario Management System - COMPLETE' AS status;
