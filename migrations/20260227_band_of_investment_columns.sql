-- Migration: Add Band of Investment columns to tbl_income_approach
-- Date: 2026-02-27
-- Purpose: Store band of investment inputs for cap rate derivation
-- These are independent market assumptions, NOT pulled from project's actual loan terms
--
-- Formula:
--   Mortgage Constant (Rm) = monthly_payment_factor × 12
--   Indicated Cap Rate = (LTV × Rm) + ((1 - LTV) × equity_dividend_rate)

-- ============================================================================
-- UP
-- ============================================================================

ALTER TABLE landscape.tbl_income_approach
  ADD COLUMN IF NOT EXISTS band_mortgage_ltv NUMERIC(5,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS band_mortgage_rate NUMERIC(5,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS band_amortization_years INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS band_equity_dividend_rate NUMERIC(5,4) DEFAULT NULL;

COMMENT ON COLUMN landscape.tbl_income_approach.band_mortgage_ltv IS 'Band of Investment: Market LTV ratio (e.g. 0.65 = 65%)';
COMMENT ON COLUMN landscape.tbl_income_approach.band_mortgage_rate IS 'Band of Investment: Market interest rate (e.g. 0.065 = 6.5%)';
COMMENT ON COLUMN landscape.tbl_income_approach.band_amortization_years IS 'Band of Investment: Amortization period in years (e.g. 25)';
COMMENT ON COLUMN landscape.tbl_income_approach.band_equity_dividend_rate IS 'Band of Investment: Required equity dividend rate (e.g. 0.10 = 10%)';

-- ============================================================================
-- DOWN (Rollback)
-- ============================================================================
-- ALTER TABLE landscape.tbl_income_approach
--   DROP COLUMN IF EXISTS band_mortgage_ltv,
--   DROP COLUMN IF EXISTS band_mortgage_rate,
--   DROP COLUMN IF EXISTS band_amortization_years,
--   DROP COLUMN IF EXISTS band_equity_dividend_rate;
