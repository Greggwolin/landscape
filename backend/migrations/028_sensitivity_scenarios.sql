-- Migration 028: Sensitivity Scenarios Table
-- Phase 4: Feasibility/Valuation Tab - Sensitivity Analysis
-- Stores saved scenario configurations with metrics

-- ============================================================================
-- Table: sensitivity_scenarios
-- Stores user-saved sensitivity analysis scenarios
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.sensitivity_scenarios (
  scenario_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  scenario_name VARCHAR(200) NOT NULL,
  
  -- Assumption adjustments stored as JSON
  -- Format: { "units_sold": -10, "price_per_unit": 15, ... }
  assumptions JSONB NOT NULL,
  
  -- Calculated metrics stored as JSON
  -- Format: { "landValue": 1500000, "irr": 0.12, "npv": 2500000 }
  metrics JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensitivity_scenarios_project ON landscape.sensitivity_scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_sensitivity_scenarios_name ON landscape.sensitivity_scenarios(scenario_name);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE landscape.sensitivity_scenarios IS 'Saved sensitivity analysis scenarios with assumption adjustments and calculated metrics';
COMMENT ON COLUMN landscape.sensitivity_scenarios.assumptions IS 'JSON object of assumption keys to adjustment percentages (-100 to +100)';
COMMENT ON COLUMN landscape.sensitivity_scenarios.metrics IS 'JSON object of calculated metrics (landValue, irr, npv)';
