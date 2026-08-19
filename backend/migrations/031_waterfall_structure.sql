-- ============================================================================
-- DEPRECATED MIGRATION - DO NOT RUN
-- ============================================================================
-- Migration 031: Waterfall Structure Tables
-- Phase 5: Capitalization Tab - Equity waterfall
--
-- ⚠️  WARNING: These tables have been removed by migration 036
-- ⚠️  Proper waterfall schema needs to be designed
--
-- To drop these tables if already created:
--   DROP TABLE IF EXISTS landscape.waterfall_splits CASCADE;
--   DROP TABLE IF EXISTS landscape.waterfall_tiers CASCADE;
--
-- Future: Design proper waterfall tracking integrated with equity partners
-- ============================================================================

-- DO NOT UNCOMMENT - TABLES REMOVED
/*
CREATE TABLE IF NOT EXISTS landscape.waterfall_tiers (
  id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  tier_number INT NOT NULL,
  tier_name VARCHAR(200),
  distribution_type VARCHAR(50), -- pari_passu, preferred, promote
  hurdle_rate NUMERIC(6,4),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, tier_number)
);

CREATE TABLE IF NOT EXISTS landscape.waterfall_splits (
  id SERIAL PRIMARY KEY,
  tier_id INT NOT NULL REFERENCES landscape.waterfall_tiers(id) ON DELETE CASCADE,
  partner_id INT NOT NULL REFERENCES landscape.equity_partners(id) ON DELETE CASCADE,
  split_percent NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waterfall_tiers_project ON landscape.waterfall_tiers(project_id);
CREATE INDEX IF NOT EXISTS idx_waterfall_splits_tier ON landscape.waterfall_splits(tier_id);

COMMENT ON TABLE landscape.waterfall_tiers IS 'Waterfall distribution tiers';
COMMENT ON TABLE landscape.waterfall_splits IS 'Partner split percentages per tier';
*/
