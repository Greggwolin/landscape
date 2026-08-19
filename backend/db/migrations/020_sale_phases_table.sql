-- ============================================================================
-- Migration 020: Sale Phases Table
-- ============================================================================
-- Purpose: Create tbl_sale_phases referenced by migration 019 view
-- Date: 2025-11-14
-- Note: Minimal implementation - sale phases being phased out in favor of
--       direct sale events, but table needed for view compatibility
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create tbl_sale_phases (project-scoped)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_sale_phases (
  phase_id              BIGSERIAL,
  project_id            INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  phase_code            VARCHAR(20) NOT NULL,
  phase_name            VARCHAR(100),
  default_sale_date     DATE NOT NULL,

  -- Default benchmark assumptions (applied to all parcels in phase)
  default_commission_pct      NUMERIC(5,2) DEFAULT 3.0,
  default_closing_cost_per_unit NUMERIC(12,2) DEFAULT 750.00,
  default_onsite_cost_pct     NUMERIC(5,2) DEFAULT 6.5,

  -- Audit
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  created_by            VARCHAR(100),

  -- Composite primary key (project-scoped phases)
  PRIMARY KEY (project_id, phase_code)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sale_phases_project
ON landscape.tbl_sale_phases(project_id);

COMMENT ON TABLE landscape.tbl_sale_phases IS 'Sale phase groupings for parcels with default assumptions (LEGACY - being replaced by tbl_parcel_sale_event)';
COMMENT ON COLUMN landscape.tbl_sale_phases.phase_code IS 'Phase identifier within project (e.g., "1.1", "Phase 2A")';
COMMENT ON COLUMN landscape.tbl_sale_phases.default_sale_date IS 'Default sale date for all parcels in this phase';
COMMENT ON COLUMN landscape.tbl_sale_phases.default_commission_pct IS 'Default commission percentage (e.g., 3.0 = 3%)';
COMMENT ON COLUMN landscape.tbl_sale_phases.default_closing_cost_per_unit IS 'Default closing cost per unit (e.g., $750)';
COMMENT ON COLUMN landscape.tbl_sale_phases.default_onsite_cost_pct IS 'Default onsite improvement cost percentage (e.g., 6.5 = 6.5%)';

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Test: Check table exists
-- SELECT * FROM landscape.tbl_sale_phases LIMIT 1;
