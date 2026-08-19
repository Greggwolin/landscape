-- Migration: 046_income_approach_enhancements
-- Description: Add ONLY columns to tbl_income_approach that don't exist elsewhere
-- Date: 2026-01-16
-- Dependencies: 014_valuation_system.sql
-- Session: QK-11 (original), QK-16 (refactored to minimal additions)
--
-- IMPORTANT: This migration was refactored to avoid duplicating fields that
-- already exist in the schema:
--   - Vacancy/credit loss -> tbl_project_assumption (physical_vacancy_pct, bad_debt_pct)
--   - Management fee -> tbl_project_assumption (management_fee_pct)
--   - Reserves -> tbl_project_assumption or tbl_debt_facility
--   - DCF params -> tbl_cre_dcf_analysis (hold_period_years, discount_rate, etc.)
--   - Growth rates -> core_fin_growth_rate_sets/steps
--
-- Only adding fields that are truly unique to the Income Approach UI:

-- ============================================================================
-- NOI CAPITALIZATION BASIS (UI Selection)
-- ============================================================================
-- Determines which NOI figure to use for direct capitalization display
-- This is a UI state field, not duplicated elsewhere

ALTER TABLE landscape.tbl_income_approach
ADD COLUMN IF NOT EXISTS noi_capitalization_basis VARCHAR(20) DEFAULT 'forward_12';

COMMENT ON COLUMN landscape.tbl_income_approach.noi_capitalization_basis IS
'NOI basis for direct cap: trailing_12, forward_12, avg_straddle, stabilized';

-- Add check constraint for valid values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_noi_basis'
        AND conrelid = 'landscape.tbl_income_approach'::regclass
    ) THEN
        ALTER TABLE landscape.tbl_income_approach
        ADD CONSTRAINT check_noi_basis
        CHECK (noi_capitalization_basis IN ('trailing_12', 'forward_12', 'avg_straddle', 'stabilized'));
    END IF;
END $$;


-- ============================================================================
-- STABILIZED VACANCY RATE
-- ============================================================================
-- Separate from project's physical_vacancy_pct, this is specifically for
-- the "Stabilized NOI" calculation which uses market-standard vacancy.
-- Not found in tbl_cre_vacancy or tbl_project_assumption.

ALTER TABLE landscape.tbl_income_approach
ADD COLUMN IF NOT EXISTS stabilized_vacancy_rate NUMERIC(5,4) DEFAULT 0.05;

COMMENT ON COLUMN landscape.tbl_income_approach.stabilized_vacancy_rate IS
'Market-standard vacancy rate for stabilized NOI calculation (0.05 = 5%)';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_stabilized_vacancy_rate_ia') THEN
        ALTER TABLE landscape.tbl_income_approach
        ADD CONSTRAINT check_stabilized_vacancy_rate_ia
        CHECK (stabilized_vacancy_rate IS NULL OR (stabilized_vacancy_rate >= 0 AND stabilized_vacancy_rate <= 0.50));
    END IF;
END $$;


-- ============================================================================
-- SENSITIVITY ANALYSIS INTERVALS
-- ============================================================================
-- These are UI-specific parameters for the sensitivity matrix display.
-- Not stored elsewhere in the schema.

-- Cap rate sensitivity interval (e.g., 50 bps = 0.0050)
ALTER TABLE landscape.tbl_income_approach
ADD COLUMN IF NOT EXISTS cap_rate_interval NUMERIC(5,4) DEFAULT 0.0050;

COMMENT ON COLUMN landscape.tbl_income_approach.cap_rate_interval IS
'Interval for cap rate sensitivity analysis (0.0050 = 50 bps)';

-- Discount rate sensitivity interval (for DCF sensitivity)
ALTER TABLE landscape.tbl_income_approach
ADD COLUMN IF NOT EXISTS discount_rate_interval NUMERIC(5,4) DEFAULT 0.0050;

COMMENT ON COLUMN landscape.tbl_income_approach.discount_rate_interval IS
'Interval for discount rate sensitivity analysis (0.0050 = 50 bps)';


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To rollback this migration, run:
/*
ALTER TABLE landscape.tbl_income_approach DROP COLUMN IF EXISTS noi_capitalization_basis;
ALTER TABLE landscape.tbl_income_approach DROP COLUMN IF EXISTS stabilized_vacancy_rate;
ALTER TABLE landscape.tbl_income_approach DROP COLUMN IF EXISTS cap_rate_interval;
ALTER TABLE landscape.tbl_income_approach DROP COLUMN IF EXISTS discount_rate_interval;

ALTER TABLE landscape.tbl_income_approach DROP CONSTRAINT IF EXISTS check_noi_basis;
ALTER TABLE landscape.tbl_income_approach DROP CONSTRAINT IF EXISTS check_stabilized_vacancy_rate_ia;
*/
