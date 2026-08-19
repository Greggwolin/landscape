-- ============================================================================
-- MIGRATION 014: Complete ARGUS Capitalization Parity (V3 - Step by Step)
-- ============================================================================
-- Date: 2025-10-23
-- Purpose: Add all missing debt, equity, and waterfall fields for full ARGUS parity
-- ============================================================================

-- STEP 1: Add columns to tbl_debt_facility
ALTER TABLE landscape.tbl_debt_facility
  ADD COLUMN IF NOT EXISTS ltv_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS dscr NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS amortization_years INTEGER,
  ADD COLUMN IF NOT EXISTS loan_term_years INTEGER,
  ADD COLUMN IF NOT EXISTS is_construction_loan BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS loan_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS interest_rate_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20) DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS spread_over_index_bps INTEGER,
  ADD COLUMN IF NOT EXISTS rate_floor_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS rate_cap_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS index_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rate_reset_frequency VARCHAR(20),
  ADD COLUMN IF NOT EXISTS commitment_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS extension_fee_bps INTEGER,
  ADD COLUMN IF NOT EXISTS prepayment_penalty_years INTEGER,
  ADD COLUMN IF NOT EXISTS exit_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS guarantee_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guarantor_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS loan_covenant_dscr_min NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS loan_covenant_ltv_max NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS loan_covenant_occupancy_min NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS covenant_test_frequency VARCHAR(20) DEFAULT 'Quarterly',
  ADD COLUMN IF NOT EXISTS reserve_requirements JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS replacement_reserve_per_unit NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS tax_insurance_escrow_months INTEGER,
  ADD COLUMN IF NOT EXISTS initial_reserve_months INTEGER,
  ADD COLUMN IF NOT EXISTS recourse_carveout_provisions TEXT,
  ADD COLUMN IF NOT EXISTS commitment_balance NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS drawn_to_date NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_options INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_option_years INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS annual_debt_service NUMERIC(12,2);

-- STEP 2: Add columns to tbl_equity
ALTER TABLE landscape.tbl_equity
  ADD COLUMN IF NOT EXISTS partner_type VARCHAR(10),
  ADD COLUMN IF NOT EXISTS partner_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS ownership_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capital_contributed NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unreturned_capital NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_distributions NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accrued_preferred_return NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_return_paid_to_date NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catch_up_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS promote_trigger_type VARCHAR(20) DEFAULT 'irr',
  ADD COLUMN IF NOT EXISTS promote_tier_1_threshold NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS promote_tier_3_threshold NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS promote_tier_3_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS irr_target_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS equity_multiple_target NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS cash_on_cash_target_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS distribution_frequency VARCHAR(20) DEFAULT 'Quarterly',
  ADD COLUMN IF NOT EXISTS distribution_priority INTEGER,
  ADD COLUMN IF NOT EXISTS can_defer_distributions BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS management_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS management_fee_base VARCHAR(20) DEFAULT 'equity',
  ADD COLUMN IF NOT EXISTS acquisition_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS disposition_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS promote_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS has_clawback BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS clawback_threshold_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS has_lookback BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS lookback_at_sale BOOLEAN DEFAULT TRUE;

-- STEP 3: Add columns to tbl_waterfall_tier
ALTER TABLE landscape.tbl_waterfall_tier
  ADD COLUMN IF NOT EXISTS project_id BIGINT,
  ADD COLUMN IF NOT EXISTS tier_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS irr_threshold_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS equity_multiple_threshold NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS is_pari_passu BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_lookback_tier BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS catch_up_to_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- STEP 4: Add columns to tbl_debt_draw_schedule
ALTER TABLE landscape.tbl_debt_draw_schedule
  ADD COLUMN IF NOT EXISTS project_id BIGINT,
  ADD COLUMN IF NOT EXISTS draw_number INTEGER,
  ADD COLUMN IF NOT EXISTS draw_date DATE,
  ADD COLUMN IF NOT EXISTS draw_purpose VARCHAR(200),
  ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS interest_rate_pct NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS interest_expense NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS interest_paid NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deferred_interest NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unused_fee_charge NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commitment_fee_charge NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_fees NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS request_date DATE,
  ADD COLUMN IF NOT EXISTS approval_date DATE,
  ADD COLUMN IF NOT EXISTS funding_date DATE,
  ADD COLUMN IF NOT EXISTS inspector_approval BOOLEAN,
  ADD COLUMN IF NOT EXISTS lender_approval BOOLEAN;

-- Migration complete
-- Note: Migration tracking skipped (table uses migration_file instead of migration_name)
