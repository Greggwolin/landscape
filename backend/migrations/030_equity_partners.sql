-- ============================================================================
-- DEPRECATED MIGRATION - DO NOT RUN
-- ============================================================================
-- Migration 030: Equity Partners Table
-- Phase 5: Capitalization Tab - Equity structure
--
-- ⚠️  WARNING: This migration creates a table with no existing equivalent
-- ⚠️  This table has been removed by migration 036
-- ⚠️  Proper equity partner schema needs to be designed
--
-- To drop this table if already created:
--   DROP TABLE IF EXISTS landscape.equity_partners CASCADE;
--
-- Future: Design proper equity partner tracking with waterfall integration
-- ============================================================================

-- DO NOT UNCOMMENT - TABLE REMOVED
/*
CREATE TABLE IF NOT EXISTS landscape.equity_partners (
  id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  partner_name VARCHAR(200) NOT NULL,
  partner_type VARCHAR(20), -- LP, GP, Sponsor
  capital_committed NUMERIC(15,2),
  capital_deployed NUMERIC(15,2) DEFAULT 0,
  ownership_percent NUMERIC(5,2),
  preferred_return NUMERIC(6,4), -- Stored as decimal (e.g., 0.08 for 8%)
  investment_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_equity_partners_project ON landscape.equity_partners(project_id);

COMMENT ON TABLE landscape.equity_partners IS 'Equity partners and ownership structure';
*/
