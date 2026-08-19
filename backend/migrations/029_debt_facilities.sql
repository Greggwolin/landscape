-- ============================================================================
-- DEPRECATED MIGRATION - DO NOT RUN
-- ============================================================================
-- Migration 029: Debt Facilities Table
-- Phase 5: Capitalization Tab - Debt tracking
--
-- ⚠️  WARNING: This migration creates a DUPLICATE table
-- ⚠️  Use existing table: landscape.tbl_debt_facility (50+ columns, ARGUS-compliant)
-- ⚠️  This simplified table has been removed by migration 036
--
-- To drop this table if already created:
--   DROP TABLE IF EXISTS landscape.debt_facilities CASCADE;
--
-- Use tbl_debt_facility instead with these mappings:
--   debt_facilities.id → tbl_debt_facility.facility_id
--   debt_facilities.lender → tbl_debt_facility.lender_name
--   debt_facilities.outstanding_balance → tbl_debt_facility.drawn_to_date
-- ============================================================================

-- DO NOT UNCOMMENT - TABLE REMOVED
/*
CREATE TABLE IF NOT EXISTS landscape.debt_facilities (
  id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  facility_name VARCHAR(200) NOT NULL,
  lender VARCHAR(200),
  facility_type VARCHAR(50), -- construction, acquisition, mezzanine, bridge
  commitment_amount NUMERIC(15,2),
  outstanding_balance NUMERIC(15,2) DEFAULT 0,
  interest_rate NUMERIC(6,4), -- Stored as decimal (e.g., 0.065 for 6.5%)
  origination_date DATE,
  maturity_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, pending, closed
  terms_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_debt_facilities_project ON landscape.debt_facilities(project_id);

COMMENT ON TABLE landscape.debt_facilities IS 'Debt facilities and loan terms for projects';
COMMENT ON COLUMN landscape.debt_facilities.interest_rate IS 'Annual interest rate stored as decimal (0.065 = 6.5%)';
*/
