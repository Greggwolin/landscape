-- ============================================================================
-- MIGRATION 014: Complete ARGUS Capitalization Parity (V2 - Fixed)
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

  -- Advanced terms (skip existing columns)
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
  ADD COLUMN IF NOT EXISTS ownership_pct NUMERIC(5,2) DEFAULT 0,

  -- Capital tracking
  ADD COLUMN IF NOT EXISTS capital_contributed NUMERIC(15,2) DEFAULT 0,
    -- Different from commitment_amount (committed vs actually funded)
  ADD COLUMN IF NOT EXISTS unreturned_capital NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_distributions NUMERIC(15,2) DEFAULT 0,

  -- Preferred return structure (skip preferred_return_pct and preferred_return_compounds - already exist)
  ADD COLUMN IF NOT EXISTS accrued_preferred_return NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_return_paid_to_date NUMERIC(12,2) DEFAULT 0,

  -- Promote/Waterfall structure
  ADD COLUMN IF NOT EXISTS catch_up_pct NUMERIC(5,2), -- GP catch-up split
  ADD COLUMN IF NOT EXISTS promote_trigger_type VARCHAR(20) DEFAULT 'irr', -- irr | equity_multiple | hybrid
  ADD COLUMN IF NOT EXISTS promote_tier_1_threshold NUMERIC(6,3), -- e.g., 8% IRR or 1.5x multiple
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
  ALTER TABLE landscape.tbl_equity ADD CONSTRAINT chk_partner_type CHECK (partner_type IN ('LP', 'GP', 'Sponsor', 'JV'));
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
-- PART 3: ALTER tbl_waterfall_tier - Add Missing Fields
-- ============================================================================

ALTER TABLE landscape.tbl_waterfall_tier
  -- Add project_id for easier querying
  ADD COLUMN IF NOT EXISTS project_id BIGINT,

  -- Rename/add tier_name
  ADD COLUMN IF NOT EXISTS tier_name VARCHAR(200),

  -- Additional threshold types
  ADD COLUMN IF NOT EXISTS irr_threshold_pct NUMERIC(6,3), -- Map from hurdle_rate when hurdle_type = 'irr'
  ADD COLUMN IF NOT EXISTS equity_multiple_threshold NUMERIC(5,2),

  -- Advanced waterfall features
  ADD COLUMN IF NOT EXISTS is_pari_passu BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_lookback_tier BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS catch_up_to_pct NUMERIC(5,2),

  -- Status & ordering
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Update project_id from equity_structure
UPDATE landscape.tbl_waterfall_tier wt
SET project_id = es.project_id
FROM landscape.tbl_equity_structure es
WHERE wt.equity_structure_id = es.equity_structure_id
  AND wt.project_id IS NULL;

-- Copy hurdle_rate to irr_threshold_pct for existing rows
UPDATE landscape.tbl_waterfall_tier
SET irr_threshold_pct = hurdle_rate
WHERE irr_threshold_pct IS NULL AND hurdle_rate IS NOT NULL;

-- Copy tier_description to tier_name if tier_name is null
UPDATE landscape.tbl_waterfall_tier
SET tier_name = tier_description
WHERE tier_name IS NULL AND tier_description IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_waterfall_project_new ON landscape.tbl_waterfall_tier(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waterfall_active ON landscape.tbl_waterfall_tier(project_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- PART 4: ALTER tbl_debt_draw_schedule - Add Missing Fields
-- ============================================================================

ALTER TABLE landscape.tbl_debt_draw_schedule
  -- Add project_id for easier querying
  ADD COLUMN IF NOT EXISTS project_id BIGINT,

  -- Add additional fields
  ADD COLUMN IF NOT EXISTS draw_number INTEGER,
  ADD COLUMN IF NOT EXISTS draw_date DATE,
  ADD COLUMN IF NOT EXISTS draw_purpose VARCHAR(200),
  ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(15,2),

  -- Interest details
  ADD COLUMN IF NOT EXISTS interest_rate_pct NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS interest_expense NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS interest_paid NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deferred_interest NUMERIC(12,2) DEFAULT 0,

  -- Fees
  ADD COLUMN IF NOT EXISTS unused_fee_charge NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commitment_fee_charge NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_fees NUMERIC(10,2) DEFAULT 0,

  -- Workflow dates
  ADD COLUMN IF NOT EXISTS request_date DATE,
  ADD COLUMN IF NOT EXISTS approval_date DATE,
  ADD COLUMN IF NOT EXISTS funding_date DATE,
  ADD COLUMN IF NOT EXISTS inspector_approval BOOLEAN,
  ADD COLUMN IF NOT EXISTS lender_approval BOOLEAN;

-- Update project_id from facility
UPDATE landscape.tbl_debt_draw_schedule dds
SET project_id = df.project_id
FROM landscape.tbl_debt_facility df
WHERE dds.facility_id = df.facility_id
  AND dds.project_id IS NULL;

-- Map existing dates to new fields
UPDATE landscape.tbl_debt_draw_schedule
SET
  request_date = draw_request_date,
  funding_date = draw_funded_date
WHERE request_date IS NULL OR funding_date IS NULL;

-- Map interest_amount to interest_expense
UPDATE landscape.tbl_debt_draw_schedule
SET interest_expense = interest_amount
WHERE interest_expense IS NULL AND interest_amount IS NOT NULL;

-- Map ending_balance to outstanding_balance
UPDATE landscape.tbl_debt_draw_schedule
SET outstanding_balance = ending_balance
WHERE outstanding_balance IS NULL AND ending_balance IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_draw_project_new ON landscape.tbl_debt_draw_schedule(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_draw_date ON landscape.tbl_debt_draw_schedule(draw_date) WHERE draw_date IS NOT NULL;

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
-- PART 6: Update Existing Project 11 Data
-- ============================================================================

-- Update existing Project 11 debt facility with full fields
UPDATE landscape.tbl_debt_facility
SET
  loan_amount = COALESCE(commitment_amount, 10500000),
  interest_rate_pct = COALESCE(interest_rate * 100, 5.75),
  ltv_pct = COALESCE((covenants->>'ltv_pct')::numeric, 70),
  dscr = COALESCE((covenants->>'dscr')::numeric, 1.25),
  amortization_years = 30,
  loan_term_years = EXTRACT(YEAR FROM AGE(maturity_date, commitment_date))::integer,
  is_construction_loan = TRUE,
  guarantee_type = 'Recourse',
  loan_covenant_dscr_min = COALESCE((covenants->>'loan_covenant_dscr_min')::numeric, 1.20),
  loan_covenant_ltv_max = COALESCE((covenants->>'loan_covenant_ltv_max')::numeric, 75),
  rate_type = 'fixed'
WHERE project_id = 11
  AND facility_type = 'CONSTRUCTION';

-- Insert default equity partners for Project 11
DO $$
DECLARE
  v_lp_id BIGINT;
  v_gp_id BIGINT;
BEGIN
  -- Insert LP
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
  ) VALUES (
    11, 'Limited Partner', 'LP', 'Class A', 90, 4500000, 4500000, 8, 0, 0, 15
  )
  ON CONFLICT DO NOTHING
  RETURNING equity_id INTO v_lp_id;

  -- Insert GP
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
  ) VALUES (
    11, 'General Partner', 'GP', 'Class B', 10, 0, 0, 8, 20, 50, NULL
  )
  ON CONFLICT DO NOTHING
  RETURNING equity_id INTO v_gp_id;
END $$;

-- Insert default waterfall tiers for Project 11
DO $$
DECLARE
  v_equity_structure_id BIGINT;
BEGIN
  -- Get or create equity structure for Project 11
  SELECT equity_structure_id INTO v_equity_structure_id
  FROM landscape.tbl_equity_structure
  WHERE project_id = 11
  LIMIT 1;

  IF v_equity_structure_id IS NULL THEN
    INSERT INTO landscape.tbl_equity_structure (project_id, structure_name)
    VALUES (11, 'Standard Waterfall')
    RETURNING equity_structure_id INTO v_equity_structure_id;
  END IF;

  -- Insert waterfall tiers
  INSERT INTO landscape.tbl_waterfall_tier (
    equity_structure_id,
    project_id,
    tier_number,
    tier_name,
    tier_description,
    irr_threshold_pct,
    hurdle_rate,
    hurdle_type,
    lp_split_pct,
    gp_split_pct,
    is_active
  ) VALUES
    (v_equity_structure_id, 11, 1, 'Return of Capital', 'Return of Capital', NULL, NULL, NULL, 90, 10, TRUE),
    (v_equity_structure_id, 11, 2, 'Preferred Return (8%)', 'Preferred Return (8%)', 8, 8, 'irr', 90, 10, TRUE),
    (v_equity_structure_id, 11, 3, 'GP Catch-Up', 'GP Catch-Up', 10, 10, 'irr', 50, 50, FALSE),
    (v_equity_structure_id, 11, 4, 'Promote (80/20 Split)', 'Promote (80/20 Split)', 15, 15, 'irr', 80, 20, TRUE)
  ON CONFLICT DO NOTHING;
END $$;

-- Insert sample draw schedule for Project 11
DO $$
DECLARE
  v_facility_id BIGINT;
  v_period_id_1 BIGINT;
  v_period_id_2 BIGINT;
BEGIN
  -- Get facility ID
  SELECT facility_id INTO v_facility_id
  FROM landscape.tbl_debt_facility
  WHERE project_id = 11 AND facility_type = 'CONSTRUCTION'
  LIMIT 1;

  IF v_facility_id IS NOT NULL THEN
    -- Get period IDs (first two periods)
    SELECT period_id INTO v_period_id_1
    FROM landscape.tbl_calculation_period
    WHERE project_id = 11
    ORDER BY period_sequence
    LIMIT 1;

    SELECT period_id INTO v_period_id_2
    FROM landscape.tbl_calculation_period
    WHERE project_id = 11
    ORDER BY period_sequence
    OFFSET 1
    LIMIT 1;

    -- Insert draws
    IF v_period_id_1 IS NOT NULL THEN
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id,
        project_id,
        period_id,
        draw_number,
        draw_amount,
        draw_date,
        draw_purpose,
        draw_status,
        cumulative_drawn
      ) VALUES (
        v_facility_id, 11, v_period_id_1, 1, 2000000, '2025-01-15', 'Acquisition', 'FUNDED', 2000000
      )
      ON CONFLICT (facility_id, period_id) DO UPDATE
      SET draw_purpose = 'Acquisition',
          draw_date = '2025-01-15',
          draw_number = 1;
    END IF;

    IF v_period_id_2 IS NOT NULL THEN
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id,
        project_id,
        period_id,
        draw_number,
        draw_amount,
        draw_date,
        draw_purpose,
        draw_status,
        cumulative_drawn
      ) VALUES (
        v_facility_id, 11, v_period_id_2, 2, 1500000, '2025-03-15', 'Renovations', 'PROJECTED', 3500000
      )
      ON CONFLICT (facility_id, period_id) DO UPDATE
      SET draw_purpose = 'Renovations',
          draw_date = '2025-03-15',
          draw_number = 2;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 7: Migration Tracking
-- ============================================================================

INSERT INTO landscape._migrations (migration_name, executed_at)
VALUES ('014_complete_argus_capitalization_parity_v2', NOW())
ON CONFLICT (migration_name) DO UPDATE
SET executed_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

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
