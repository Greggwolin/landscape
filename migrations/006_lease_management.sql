-- Migration 006: Income Property & Lease Management
-- Version: v1.0 (2025-10-13)
--
-- Adds comprehensive lease management tables for:
-- - Rent roll tracking
-- - Lease assumptions and rollover
-- - Operating expenses
-- - Capital reserves (TI/LC/CapEx)
-- - Periodized revenue and expense timing

-- ============================================================================
-- 1. RENT ROLL TABLE
-- ============================================================================
-- In-place leases with escalations, recoveries, and concessions

CREATE TABLE IF NOT EXISTS landscape.tbl_rent_roll (
  rent_roll_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  tenant_name VARCHAR(255) NOT NULL,
  space_type VARCHAR(50) CHECK (space_type IN ('OFFICE','RETAIL','INDUSTRIAL','MEDICAL','FLEX','OTHER')),

  -- Lease terms
  lease_start_date DATE NOT NULL,
  lease_end_date DATE NOT NULL,
  lease_term_months INTEGER NOT NULL,

  -- Space details
  leased_sf NUMERIC(12,2) NOT NULL CHECK (leased_sf > 0),
  base_rent_psf_annual NUMERIC(10,2) NOT NULL,

  -- Escalations
  escalation_type VARCHAR(50) DEFAULT 'NONE' CHECK (escalation_type IN ('NONE','FIXED_DOLLAR','FIXED_PERCENT','CPI','STEPPED')),
  escalation_value NUMERIC(10,4),
  escalation_frequency_months INTEGER DEFAULT 12,

  -- Recoveries
  recovery_structure VARCHAR(50) DEFAULT 'GROSS' CHECK (recovery_structure IN ('GROSS','NNN','MODIFIED_GROSS','INDUSTRIAL_GROSS')),
  cam_recovery_rate NUMERIC(6,5) DEFAULT 1.0,
  tax_recovery_rate NUMERIC(6,5) DEFAULT 1.0,
  insurance_recovery_rate NUMERIC(6,5) DEFAULT 1.0,

  -- Concessions
  free_rent_months INTEGER DEFAULT 0,
  free_rent_start_month INTEGER DEFAULT 1,
  rent_abatement_amount NUMERIC(12,2) DEFAULT 0,

  -- Percentage rent (retail)
  has_percentage_rent BOOLEAN DEFAULT FALSE,
  percentage_rent_rate NUMERIC(6,5),
  percentage_rent_breakpoint NUMERIC(12,2),

  -- TI/LC allowances
  ti_allowance_psf NUMERIC(10,2) DEFAULT 0,
  lc_allowance_psf NUMERIC(10,2) DEFAULT 0,

  -- Status
  lease_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (lease_status IN ('ACTIVE','EXPIRED','TERMINATED','PENDING')),
  is_vacancy BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rent_roll_project ON landscape.tbl_rent_roll(project_id);
CREATE INDEX idx_rent_roll_end_date ON landscape.tbl_rent_roll(lease_end_date);
CREATE INDEX idx_rent_roll_status ON landscape.tbl_rent_roll(lease_status);
CREATE INDEX idx_rent_roll_space_type ON landscape.tbl_rent_roll(space_type);

COMMENT ON TABLE landscape.tbl_rent_roll IS 'In-place leases with escalations, recoveries, and concessions';

-- ============================================================================
-- 2. LEASE ASSUMPTIONS TABLE
-- ============================================================================
-- Market & rollover parameters by space type

CREATE TABLE IF NOT EXISTS landscape.tbl_lease_assumptions (
  assumption_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  space_type VARCHAR(50) NOT NULL CHECK (space_type IN ('OFFICE','RETAIL','INDUSTRIAL','MEDICAL','FLEX','OTHER')),

  -- Market rent assumptions
  market_rent_psf_annual NUMERIC(10,2) NOT NULL,
  market_rent_growth_rate NUMERIC(6,5) DEFAULT 0.025,

  -- Rollover probabilities
  renewal_probability NUMERIC(5,4) DEFAULT 0.70 CHECK (renewal_probability BETWEEN 0 AND 1),
  downtime_months INTEGER DEFAULT 6,

  -- Rollover costs
  ti_psf_renewal NUMERIC(10,2) DEFAULT 0,
  ti_psf_new_tenant NUMERIC(10,2) DEFAULT 0,
  lc_psf_renewal NUMERIC(10,2) DEFAULT 0,
  lc_psf_new_tenant NUMERIC(10,2) DEFAULT 0,

  -- Additional costs
  free_rent_months_renewal INTEGER DEFAULT 0,
  free_rent_months_new_tenant INTEGER DEFAULT 3,

  -- Metadata
  effective_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, space_type, effective_date)
);

CREATE INDEX idx_lease_assumptions_project ON landscape.tbl_lease_assumptions(project_id);
CREATE INDEX idx_lease_assumptions_space_type ON landscape.tbl_lease_assumptions(space_type);

COMMENT ON TABLE landscape.tbl_lease_assumptions IS 'Market and rollover parameters by space type';

-- ============================================================================
-- 3. OPERATING EXPENSES TABLE
-- ============================================================================
-- Recoverable and non-recoverable expenses with escalation

CREATE TABLE IF NOT EXISTS landscape.tbl_operating_expenses (
  opex_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  -- Expense details
  expense_category VARCHAR(100) NOT NULL,
  expense_type VARCHAR(50) NOT NULL CHECK (expense_type IN ('CAM','TAXES','INSURANCE','MANAGEMENT','UTILITIES','REPAIRS','OTHER')),

  -- Amount
  annual_amount NUMERIC(12,2) NOT NULL,
  amount_per_sf NUMERIC(10,2),

  -- Recovery
  is_recoverable BOOLEAN DEFAULT TRUE,
  recovery_rate NUMERIC(6,5) DEFAULT 1.0 CHECK (recovery_rate BETWEEN 0 AND 1),

  -- Escalation
  escalation_type VARCHAR(50) DEFAULT 'FIXED_PERCENT' CHECK (escalation_type IN ('NONE','FIXED_PERCENT','CPI')),
  escalation_rate NUMERIC(6,5) DEFAULT 0.03,

  -- Timing
  start_period INTEGER NOT NULL,
  payment_frequency VARCHAR(50) DEFAULT 'MONTHLY' CHECK (payment_frequency IN ('MONTHLY','QUARTERLY','ANNUAL')),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opex_project ON landscape.tbl_operating_expenses(project_id);
CREATE INDEX idx_opex_type ON landscape.tbl_operating_expenses(expense_type);
CREATE INDEX idx_opex_recoverable ON landscape.tbl_operating_expenses(is_recoverable);

COMMENT ON TABLE landscape.tbl_operating_expenses IS 'Recoverable and non-recoverable operating expenses';

-- ============================================================================
-- 4. CAPITAL RESERVES TABLE
-- ============================================================================
-- TI/LC/CapEx triggers (lease expiration, scheduled, recurring)

CREATE TABLE IF NOT EXISTS landscape.tbl_capital_reserves (
  reserve_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  -- Reserve type
  reserve_type VARCHAR(50) NOT NULL CHECK (reserve_type IN ('TI','LC','CAPEX','STRUCTURAL_RESERVE')),
  reserve_name VARCHAR(200) NOT NULL,

  -- Trigger
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('LEASE_EXPIRATION','SCHEDULED','RECURRING','IMMEDIATE')),
  trigger_lease_id BIGINT REFERENCES landscape.tbl_rent_roll(rent_roll_id) ON DELETE SET NULL,
  trigger_period INTEGER,

  -- Amount
  amount NUMERIC(12,2) NOT NULL,
  amount_per_sf NUMERIC(10,2),

  -- Recurring settings
  recurrence_frequency_months INTEGER,
  recurrence_end_period INTEGER,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capital_reserves_project ON landscape.tbl_capital_reserves(project_id);
CREATE INDEX idx_capital_reserves_type ON landscape.tbl_capital_reserves(reserve_type);
CREATE INDEX idx_capital_reserves_trigger ON landscape.tbl_capital_reserves(trigger_type);
CREATE INDEX idx_capital_reserves_lease ON landscape.tbl_capital_reserves(trigger_lease_id);

COMMENT ON TABLE landscape.tbl_capital_reserves IS 'Capital reserves for TI/LC/CapEx with various triggers';

-- ============================================================================
-- 5. LEASE REVENUE TIMING TABLE
-- ============================================================================
-- Periodized lease revenue and recoveries

CREATE TABLE IF NOT EXISTS landscape.tbl_lease_revenue_timing (
  timing_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  lease_id BIGINT NOT NULL REFERENCES landscape.tbl_rent_roll(rent_roll_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL,

  -- Revenue components
  base_rent NUMERIC(12,2) DEFAULT 0,
  escalated_rent NUMERIC(12,2) DEFAULT 0,
  percentage_rent NUMERIC(12,2) DEFAULT 0,

  -- Recoveries
  cam_recovery NUMERIC(12,2) DEFAULT 0,
  tax_recovery NUMERIC(12,2) DEFAULT 0,
  insurance_recovery NUMERIC(12,2) DEFAULT 0,

  -- Adjustments
  vacancy_loss NUMERIC(12,2) DEFAULT 0,
  free_rent_adjustment NUMERIC(12,2) DEFAULT 0,

  -- Total
  effective_gross_rent NUMERIC(12,2) DEFAULT 0,

  -- Metadata
  calculation_date TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lease_id, period_id)
);

CREATE INDEX idx_lease_revenue_timing_project ON landscape.tbl_lease_revenue_timing(project_id);
CREATE INDEX idx_lease_revenue_timing_lease ON landscape.tbl_lease_revenue_timing(lease_id);
CREATE INDEX idx_lease_revenue_timing_period ON landscape.tbl_lease_revenue_timing(period_id);
CREATE INDEX idx_lease_revenue_timing_project_period ON landscape.tbl_lease_revenue_timing(project_id, period_id);

COMMENT ON TABLE landscape.tbl_lease_revenue_timing IS 'Periodized lease revenue and recoveries';

-- ============================================================================
-- 6. OPEX TIMING TABLE
-- ============================================================================
-- Periodized expenses and recoveries

CREATE TABLE IF NOT EXISTS landscape.tbl_opex_timing (
  timing_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  opex_id BIGINT NOT NULL REFERENCES landscape.tbl_operating_expenses(opex_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL,

  -- Expense
  expense_amount NUMERIC(12,2) DEFAULT 0,

  -- Recovery
  recoverable_amount NUMERIC(12,2) DEFAULT 0,
  recovery_collected NUMERIC(12,2) DEFAULT 0,

  -- Net
  net_expense NUMERIC(12,2) DEFAULT 0,

  -- Metadata
  calculation_date TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(opex_id, period_id)
);

CREATE INDEX idx_opex_timing_project ON landscape.tbl_opex_timing(project_id);
CREATE INDEX idx_opex_timing_opex ON landscape.tbl_opex_timing(opex_id);
CREATE INDEX idx_opex_timing_period ON landscape.tbl_opex_timing(period_id);
CREATE INDEX idx_opex_timing_project_period ON landscape.tbl_opex_timing(project_id, period_id);

COMMENT ON TABLE landscape.tbl_opex_timing IS 'Periodized operating expenses and recoveries';

-- ============================================================================
-- 7. LEASE EXPIRATION SCHEDULE VIEW
-- ============================================================================
-- Expirations with mark-to-market and expected rollover cost

CREATE OR REPLACE VIEW landscape.vw_lease_expiration_schedule AS
SELECT
  rr.rent_roll_id,
  rr.project_id,
  rr.tenant_name,
  rr.space_type,
  rr.lease_end_date,
  rr.leased_sf,
  rr.base_rent_psf_annual,
  (rr.leased_sf * rr.base_rent_psf_annual) AS annual_rent,

  -- Market comparison
  COALESCE(la.market_rent_psf_annual, rr.base_rent_psf_annual) AS market_rent_psf_annual,
  (COALESCE(la.market_rent_psf_annual, rr.base_rent_psf_annual) - rr.base_rent_psf_annual) AS mark_to_market_psf,
  (COALESCE(la.market_rent_psf_annual, rr.base_rent_psf_annual) - rr.base_rent_psf_annual) * rr.leased_sf AS mark_to_market_annual,

  -- Rollover assumptions
  COALESCE(la.renewal_probability, 0.7) AS renewal_probability,
  COALESCE(la.downtime_months, 6) AS downtime_months,

  -- Rollover costs (weighted by probability)
  (
    COALESCE(la.renewal_probability, 0.7) *
    (COALESCE(la.ti_psf_renewal, 0) + COALESCE(la.lc_psf_renewal, 0)) +
    (1 - COALESCE(la.renewal_probability, 0.7)) *
    (COALESCE(la.ti_psf_new_tenant, 0) + COALESCE(la.lc_psf_new_tenant, 0))
  ) * rr.leased_sf AS expected_rollover_cost,

  -- Free rent (weighted by probability)
  (
    COALESCE(la.renewal_probability, 0.7) * COALESCE(la.free_rent_months_renewal, 0) +
    (1 - COALESCE(la.renewal_probability, 0.7)) * COALESCE(la.free_rent_months_new_tenant, 3)
  ) AS expected_free_rent_months,

  -- Vacancy loss during downtime
  (
    (1 - COALESCE(la.renewal_probability, 0.7)) *
    COALESCE(la.downtime_months, 6) / 12.0 *
    COALESCE(la.market_rent_psf_annual, rr.base_rent_psf_annual) *
    rr.leased_sf
  ) AS expected_vacancy_loss,

  rr.lease_status

FROM landscape.tbl_rent_roll rr
LEFT JOIN landscape.tbl_lease_assumptions la
  ON rr.project_id = la.project_id
  AND rr.space_type = la.space_type
  AND la.effective_date <= rr.lease_end_date
WHERE rr.lease_status = 'ACTIVE'
ORDER BY rr.lease_end_date, rr.tenant_name;

COMMENT ON VIEW landscape.vw_lease_expiration_schedule IS 'Lease expirations with mark-to-market and rollover cost analysis';

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate period from date
CREATE OR REPLACE FUNCTION landscape.get_period_from_date(
  p_project_id BIGINT,
  p_date DATE
) RETURNS INTEGER AS $$
DECLARE
  v_start_date DATE;
  v_period_type VARCHAR(50);
  v_months_elapsed INTEGER;
BEGIN
  -- Get project start date and period type
  SELECT analysis_start_date, period_type
  INTO v_start_date, v_period_type
  FROM landscape.tbl_project
  WHERE project_id = p_project_id;

  IF v_start_date IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate months elapsed
  v_months_elapsed := EXTRACT(YEAR FROM AGE(p_date, v_start_date)) * 12 +
                      EXTRACT(MONTH FROM AGE(p_date, v_start_date));

  -- Return period based on period type
  CASE v_period_type
    WHEN 'MONTHLY' THEN
      RETURN v_months_elapsed;
    WHEN 'QUARTERLY' THEN
      RETURN v_months_elapsed / 3;
    WHEN 'ANNUAL' THEN
      RETURN v_months_elapsed / 12;
    ELSE
      RETURN v_months_elapsed;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION landscape.get_period_from_date IS 'Convert date to period number for a project';

-- Function to calculate date from period
CREATE OR REPLACE FUNCTION landscape.get_date_from_period(
  p_project_id BIGINT,
  p_period INTEGER
) RETURNS DATE AS $$
DECLARE
  v_start_date DATE;
  v_period_type VARCHAR(50);
  v_months_to_add INTEGER;
BEGIN
  -- Get project start date and period type
  SELECT analysis_start_date, period_type
  INTO v_start_date, v_period_type
  FROM landscape.tbl_project
  WHERE project_id = p_project_id;

  IF v_start_date IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate months to add
  CASE v_period_type
    WHEN 'MONTHLY' THEN
      v_months_to_add := p_period;
    WHEN 'QUARTERLY' THEN
      v_months_to_add := p_period * 3;
    WHEN 'ANNUAL' THEN
      v_months_to_add := p_period * 12;
    ELSE
      v_months_to_add := p_period;
  END CASE;

  RETURN v_start_date + (v_months_to_add || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION landscape.get_date_from_period IS 'Convert period number to date for a project';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 006: Lease Management Complete';
  RAISE NOTICE '   - 6 new tables created';
  RAISE NOTICE '   - 1 view created';
  RAISE NOTICE '   - 2 helper functions created';
  RAISE NOTICE '   - Indexes created for performance';
  RAISE NOTICE '   - Ready for lease revenue calculation';
END $$;
