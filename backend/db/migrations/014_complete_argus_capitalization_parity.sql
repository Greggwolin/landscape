-- ============================================================================
-- MIGRATION 014: Complete ARGUS Capitalization Parity
-- ============================================================================
-- Date: 2025-10-23
-- Purpose: Add all missing debt, equity, and waterfall fields for full ARGUS parity
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ALTER tbl_debt_facility - Add Missing Fields
-- ============================================================================

ALTER TABLE landscape.tbl_debt_facility
  -- Basic loan structure (CRITICAL - missing fundamentals!)
  ADD COLUMN IF NOT EXISTS ltv_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS dscr NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS amortization_years INTEGER,
  ADD COLUMN IF NOT EXISTS loan_term_years INTEGER,
  ADD COLUMN IF NOT EXISTS is_construction_loan BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS loan_amount NUMERIC(15,2), -- Core field!

  -- Rate structure
  ADD COLUMN IF NOT EXISTS interest_rate_pct NUMERIC(6,3), -- Store as percentage
  ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20) DEFAULT 'fixed', -- fixed, floating, variable
  ADD COLUMN IF NOT EXISTS spread_over_index_bps INTEGER, -- Basis points over index
  ADD COLUMN IF NOT EXISTS rate_floor_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS rate_cap_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS index_name VARCHAR(50), -- SOFR, Prime, etc.
  ADD COLUMN IF NOT EXISTS rate_reset_frequency VARCHAR(20), -- Monthly, Quarterly, Annual

  -- Fees
  ADD COLUMN IF NOT EXISTS commitment_fee_pct NUMERIC(5,3),
  -- unused_fee_pct already exists
  ADD COLUMN IF NOT EXISTS extension_fee_bps INTEGER,
  ADD COLUMN IF NOT EXISTS prepayment_penalty_years INTEGER,
  ADD COLUMN IF NOT EXISTS exit_fee_pct NUMERIC(5,3),

  -- Covenants & Guarantees
  ADD COLUMN IF NOT EXISTS guarantee_type VARCHAR(50), -- Recourse, Non-recourse, Carve-out
  ADD COLUMN IF NOT EXISTS guarantor_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS loan_covenant_dscr_min NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS loan_covenant_ltv_max NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS loan_covenant_occupancy_min NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS covenant_test_frequency VARCHAR(20) DEFAULT 'Quarterly',

  -- Reserves & Escrows
  ADD COLUMN IF NOT EXISTS reserve_requirements JSONB DEFAULT '{}', -- Flexible structure
  ADD COLUMN IF NOT EXISTS replacement_reserve_per_unit NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS tax_insurance_escrow_months INTEGER,
  ADD COLUMN IF NOT EXISTS initial_reserve_months INTEGER,

  -- Advanced terms
  ADD COLUMN IF NOT EXISTS interest_payment_method VARCHAR(50) DEFAULT 'paid_current',
    -- paid_current | accrued_simple | accrued_compound
  ADD COLUMN IF NOT EXISTS can_participate_in_profits BOOLEAN DEFAULT FALSE, -- Mezzanine debt with equity kicker
  ADD COLUMN IF NOT EXISTS profit_participation_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS recourse_carveout_provisions TEXT, -- Detailed carveout language

  -- Draw/commitment tracking
  ADD COLUMN IF NOT EXISTS commitment_balance NUMERIC(15,2), -- Remaining commitment
  ADD COLUMN IF NOT EXISTS drawn_to_date NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_options INTEGER DEFAULT 0, -- Number of extension options
  ADD COLUMN IF NOT EXISTS extension_option_years INTEGER, -- Years per extension

  -- Debt service tracking (calculated fields for reporting)
  ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS annual_debt_service NUMERIC(12,2);

-- Add constraints
DO $$
BEGIN
  ALTER TABLE landscape.tbl_debt_facility ADD CONSTRAINT chk_ltv_range CHECK (ltv_pct >= 0 AND ltv_pct <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE landscape.tbl_debt_facility ADD CONSTRAINT chk_dscr_positive CHECK (dscr > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE landscape.tbl_debt_facility ADD CONSTRAINT chk_rate_positive CHECK (interest_rate_pct >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE landscape.tbl_debt_facility ADD CONSTRAINT chk_amortization_term CHECK (
    amortization_years IS NULL OR
    loan_term_years IS NULL OR
    amortization_years >= loan_term_years
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_debt_facility_construction ON landscape.tbl_debt_facility(project_id, is_construction_loan);
CREATE INDEX IF NOT EXISTS idx_debt_facility_maturity ON landscape.tbl_debt_facility(maturity_date);

-- ============================================================================
-- PART 2: ALTER tbl_equity - Add Missing Fields
-- ============================================================================

ALTER TABLE landscape.tbl_equity
  -- Partner classification (CRITICAL - missing fundamental structure!)
  ADD COLUMN IF NOT EXISTS partner_type VARCHAR(10),
  ADD COLUMN IF NOT EXISTS partner_name VARCHAR(200), -- May differ from equity_name
  ADD COLUMN IF NOT EXISTS ownership_pct NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Capital tracking
  ADD COLUMN IF NOT EXISTS capital_contributed NUMERIC(15,2) DEFAULT 0,
    -- Different from commitment_amount (committed vs actually funded)
  ADD COLUMN IF NOT EXISTS unreturned_capital NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_distributions NUMERIC(15,2) DEFAULT 0,

  -- Preferred return structure
  -- preferred_return_pct already exists
  ADD COLUMN IF NOT EXISTS preferred_return_compounds BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accrued_preferred_return NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_return_paid_to_date NUMERIC(12,2) DEFAULT 0,

  -- Promote/Waterfall structure
  -- promote_pct already exists (GP promote percentage)
  ADD COLUMN IF NOT EXISTS catch_up_pct NUMERIC(5,2), -- GP catch-up split
  ADD COLUMN IF NOT EXISTS promote_trigger_type VARCHAR(20) DEFAULT 'irr', -- irr | equity_multiple | hybrid
  ADD COLUMN IF NOT EXISTS promote_tier_1_threshold NUMERIC(6,3), -- e.g., 8% IRR or 1.5x multiple
  -- promote_tier_2_threshold and promote_tier_2_pct already exist
  ADD COLUMN IF NOT EXISTS promote_tier_3_threshold NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS promote_tier_3_pct NUMERIC(5,2),

  -- Return targets
  ADD COLUMN IF NOT EXISTS irr_target_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS equity_multiple_target NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS cash_on_cash_target_pct NUMERIC(6,3),

  -- Distribution structure
  ADD COLUMN IF NOT EXISTS distribution_frequency VARCHAR(20) DEFAULT 'Quarterly',
  ADD COLUMN IF NOT EXISTS distribution_priority INTEGER, -- Order of distributions
  ADD COLUMN IF NOT EXISTS can_defer_distributions BOOLEAN DEFAULT FALSE,

  -- Fees (GP typically charges these)
  ADD COLUMN IF NOT EXISTS management_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS management_fee_base VARCHAR(20) DEFAULT 'equity', -- equity | cost | revenue
  ADD COLUMN IF NOT EXISTS acquisition_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS disposition_fee_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS promote_fee_pct NUMERIC(5,3), -- Fee on promote in addition to promote itself

  -- Clawback & Lookback provisions
  ADD COLUMN IF NOT EXISTS has_clawback BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS clawback_threshold_pct NUMERIC(6,3), -- Return threshold triggering clawback
  ADD COLUMN IF NOT EXISTS has_lookback BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS lookback_at_sale BOOLEAN DEFAULT TRUE;

-- Add constraints for tbl_equity
DO $$
BEGIN
  ALTER TABLE landscape.tbl_equity ADD CONSTRAINT chk_partner_type CHECK (partner_type IN ('LP', 'GP'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE landscape.tbl_equity ADD CONSTRAINT chk_ownership_range CHECK (ownership_pct >= 0 AND ownership_pct <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE landscape.tbl_equity ADD CONSTRAINT chk_capital_positive CHECK (capital_contributed >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE landscape.tbl_equity ADD CONSTRAINT chk_catch_up_range CHECK (catch_up_pct IS NULL OR (catch_up_pct >= 0 AND catch_up_pct <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_equity_partner_type ON landscape.tbl_equity(project_id, partner_type);
CREATE INDEX IF NOT EXISTS idx_equity_class ON landscape.tbl_equity(project_id, equity_class);

-- ============================================================================
-- PART 3: CREATE tbl_waterfall_tier (NEW TABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_waterfall_tier (
    tier_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE NOT NULL,
    equity_structure_id BIGINT, -- Link to parent equity structure if using tbl_equity_structure

    -- Tier identification
    tier_number INTEGER NOT NULL,
    tier_name VARCHAR(200) NOT NULL,
    tier_description TEXT,

    -- Threshold triggers
    irr_threshold_pct NUMERIC(6,3), -- Return tier if IRR-based
    equity_multiple_threshold NUMERIC(5,2), -- Return tier if multiple-based
    hurdle_type VARCHAR(20) DEFAULT 'irr', -- irr | equity_multiple | cumulative_cash | hybrid

    -- Distribution splits
    lp_split_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    gp_split_pct NUMERIC(5,2) NOT NULL DEFAULT 0,

    -- Advanced waterfall features
    is_pari_passu BOOLEAN DEFAULT FALSE, -- True if this tier splits pro-rata by capital
    is_lookback_tier BOOLEAN DEFAULT FALSE, -- True if this tier adjusts at exit based on actual returns
    catch_up_to_pct NUMERIC(5,2), -- GP catches up to X% of total distributions

    -- Status & ordering
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER, -- Override tier_number for custom ordering

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_splits_total_100 CHECK (lp_split_pct + gp_split_pct = 100),
    CONSTRAINT chk_tier_number_positive CHECK (tier_number > 0),
    CONSTRAINT chk_valid_hurdle_type CHECK (hurdle_type IN ('irr', 'equity_multiple', 'cumulative_cash', 'hybrid'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waterfall_project ON landscape.tbl_waterfall_tier(project_id);
CREATE INDEX IF NOT EXISTS idx_waterfall_active ON landscape.tbl_waterfall_tier(project_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_waterfall_tier_number ON landscape.tbl_waterfall_tier(project_id, tier_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_waterfall_unique_tier ON landscape.tbl_waterfall_tier(project_id, tier_number);

-- ============================================================================
-- PART 4: CREATE tbl_debt_draw_schedule (NEW TABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_debt_draw_schedule (
    draw_id BIGSERIAL PRIMARY KEY,
    debt_facility_id BIGINT REFERENCES landscape.tbl_debt_facility(facility_id) ON DELETE CASCADE NOT NULL,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE NOT NULL,
    period_id BIGINT REFERENCES landscape.tbl_calculation_period(period_id),

    -- Draw details
    draw_number INTEGER,
    draw_amount NUMERIC(12,2) NOT NULL,
    draw_date DATE NOT NULL,
    draw_purpose VARCHAR(200), -- Acquisition, Vertical Construction, Infrastructure, etc.

    -- Cumulative tracking
    cumulative_drawn NUMERIC(15,2), -- Total drawn including this draw
    outstanding_balance NUMERIC(15,2), -- Balance after this period

    -- Repayment
    principal_payment NUMERIC(12,2) DEFAULT 0,

    -- Interest calculation
    interest_rate_pct NUMERIC(6,4), -- Rate in effect for this period
    interest_expense NUMERIC(12,2), -- Interest accrued
    interest_paid NUMERIC(12,2), -- Interest actually paid
    deferred_interest NUMERIC(12,2) DEFAULT 0, -- Unpaid interest added to balance

    -- Fees for this period
    unused_fee_charge NUMERIC(10,2) DEFAULT 0,
    commitment_fee_charge NUMERIC(10,2) DEFAULT 0,
    other_fees NUMERIC(10,2) DEFAULT 0,

    -- Draw approval workflow
    draw_status VARCHAR(50) DEFAULT 'Projected',
      -- Projected | Requested | Approved | Funded | Rejected
    request_date DATE,
    approval_date DATE,
    funding_date DATE,
    inspector_approval BOOLEAN,
    lender_approval BOOLEAN,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_draw_amount_positive CHECK (draw_amount > 0),
    CONSTRAINT chk_valid_draw_status CHECK (draw_status IN ('Projected', 'Requested', 'Approved', 'Funded', 'Rejected'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_draw_facility ON landscape.tbl_debt_draw_schedule(debt_facility_id);
CREATE INDEX IF NOT EXISTS idx_draw_project ON landscape.tbl_debt_draw_schedule(project_id);
CREATE INDEX IF NOT EXISTS idx_draw_period ON landscape.tbl_debt_draw_schedule(period_id);
CREATE INDEX IF NOT EXISTS idx_draw_date ON landscape.tbl_debt_draw_schedule(draw_date);
CREATE INDEX IF NOT EXISTS idx_draw_status ON landscape.tbl_debt_draw_schedule(draw_status);

-- ============================================================================
-- PART 5: CREATE tbl_equity_distribution (If doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_equity_distribution (
    distribution_id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT REFERENCES landscape.tbl_equity(equity_id) ON DELETE CASCADE NOT NULL,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE NOT NULL,
    period_id BIGINT REFERENCES landscape.tbl_calculation_period(period_id),

    -- Transaction type
    distribution_type VARCHAR(50) NOT NULL,
      -- Capital Call | Return of Capital | Preferred Return | Promote | Special Distribution

    -- Amounts
    amount NUMERIC(15,2) NOT NULL,
    cumulative_amount NUMERIC(15,2), -- Running total by type

    -- Waterfall tracking
    waterfall_tier_id BIGINT REFERENCES landscape.tbl_waterfall_tier(tier_id),
    is_lookback_adjustment BOOLEAN DEFAULT FALSE,

    -- Preferred return tracking
    unpaid_preferred_return NUMERIC(12,2) DEFAULT 0,
    accrued_pref_this_period NUMERIC(12,2) DEFAULT 0,
    pref_paid_this_period NUMERIC(12,2) DEFAULT 0,

    -- Dates
    distribution_date DATE,

    -- Status
    distribution_status VARCHAR(20) DEFAULT 'PROJECTED', -- PROJECTED | APPROVED | PAID

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_valid_distribution_type CHECK (
      distribution_type IN ('Capital Call', 'Return of Capital', 'Preferred Return', 'Promote', 'Special Distribution')
    ),
    CONSTRAINT chk_valid_status CHECK (distribution_status IN ('PROJECTED', 'APPROVED', 'PAID'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distribution_partner ON landscape.tbl_equity_distribution(partner_id);
CREATE INDEX IF NOT EXISTS idx_distribution_project ON landscape.tbl_equity_distribution(project_id);
CREATE INDEX IF NOT EXISTS idx_distribution_period ON landscape.tbl_equity_distribution(period_id);
CREATE INDEX IF NOT EXISTS idx_distribution_type ON landscape.tbl_equity_distribution(distribution_type);
CREATE INDEX IF NOT EXISTS idx_distribution_date ON landscape.tbl_equity_distribution(distribution_date);

-- ============================================================================
-- PART 6: Insert Default Data for Project 11 (Multifamily Test)
-- ============================================================================

-- Update existing Project 11 debt facility with full fields
UPDATE landscape.tbl_debt_facility
SET
  loan_amount = 10500000,
  interest_rate_pct = 5.75,
  ltv_pct = 70,
  dscr = 1.25,
  amortization_years = 30,
  loan_term_years = 10,
  is_construction_loan = TRUE,
  guarantee_type = 'Recourse',
  loan_covenant_dscr_min = 1.20,
  loan_covenant_ltv_max = 75,
  rate_type = 'fixed',
  interest_payment_method = 'paid_current'
WHERE project_id = 11
  AND facility_name = 'Construction Loan';

-- Insert default equity partners for Project 11
INSERT INTO landscape.tbl_equity (
  project_id,
  equity_name,
  partner_type,
  equity_class,
  ownership_pct,
  commitment_amount,
  capital_contributed,
  preferred_return_pct,
  promote_pct,
  catch_up_pct,
  irr_target_pct
) VALUES
  (11, 'Limited Partner', 'LP', 'Class A', 90, 4500000, 4500000, 8, 0, 0, 15),
  (11, 'General Partner', 'GP', 'Class B', 10, 0, 0, 8, 20, 50, NULL)
ON CONFLICT DO NOTHING;

-- Insert default waterfall tiers for Project 11
INSERT INTO landscape.tbl_waterfall_tier (
  project_id,
  tier_number,
  tier_name,
  irr_threshold_pct,
  lp_split_pct,
  gp_split_pct,
  is_active
) VALUES
  (11, 1, 'Return of Capital', NULL, 90, 10, TRUE),
  (11, 2, 'Preferred Return (8%)', 8, 90, 10, TRUE),
  (11, 3, 'GP Catch-Up', 10, 50, 50, FALSE),
  (11, 4, 'Promote (80/20 Split)', 15, 80, 20, TRUE)
ON CONFLICT DO NOTHING;

-- Insert sample draw schedule for Project 11
INSERT INTO landscape.tbl_debt_draw_schedule (
  debt_facility_id,
  project_id,
  draw_number,
  draw_amount,
  draw_date,
  draw_purpose,
  draw_status
)
SELECT
  df.facility_id,
  11,
  1,
  2000000,
  '2025-01-15',
  'Acquisition',
  'Funded'
FROM landscape.tbl_debt_facility df
WHERE df.project_id = 11 AND df.is_construction_loan = TRUE
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO landscape.tbl_debt_draw_schedule (
  debt_facility_id,
  project_id,
  draw_number,
  draw_amount,
  draw_date,
  draw_purpose,
  draw_status
)
SELECT
  df.facility_id,
  11,
  2,
  1500000,
  '2025-03-15',
  'Renovations',
  'Projected'
FROM landscape.tbl_debt_facility df
WHERE df.project_id = 11 AND df.is_construction_loan = TRUE
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 7: Migration Tracking
-- ============================================================================

INSERT INTO landscape._migrations (migration_name, executed_at)
VALUES ('014_complete_argus_capitalization_parity', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check field counts
SELECT 'tbl_debt_facility' as table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'landscape' AND table_name = 'tbl_debt_facility'
UNION ALL
SELECT 'tbl_equity', COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'landscape' AND table_name = 'tbl_equity'
UNION ALL
SELECT 'tbl_waterfall_tier', COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'landscape' AND table_name = 'tbl_waterfall_tier'
UNION ALL
SELECT 'tbl_debt_draw_schedule', COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'landscape' AND table_name = 'tbl_debt_draw_schedule';

-- Check Project 11 data
SELECT * FROM landscape.tbl_debt_facility WHERE project_id = 11;
SELECT * FROM landscape.tbl_equity WHERE project_id = 11;
SELECT * FROM landscape.tbl_waterfall_tier WHERE project_id = 11;
SELECT * FROM landscape.tbl_debt_draw_schedule WHERE project_id = 11;
