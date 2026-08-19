-- =====================================================================
-- Landscape Financial Engine - Phase 1 Schema Migration
-- Version: 1.0
-- Date: 2025-10-13
-- Description: Core tables for land development, income property, and
--              mixed-use financial modeling with ARGUS parity
-- =====================================================================

-- Set search path
SET search_path TO landscape, public;

-- =====================================================================
-- SECTION 1: ENHANCE EXISTING TABLES
-- =====================================================================

-- Enhance tbl_project
DO $$
BEGIN
  -- Add project financial configuration fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'project_type') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN project_type VARCHAR(50) DEFAULT 'Land Development';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'financial_model_type') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN financial_model_type VARCHAR(50) DEFAULT 'Development';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'analysis_start_date') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN analysis_start_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'analysis_end_date') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN analysis_end_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'calculation_frequency') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN calculation_frequency VARCHAR(20) DEFAULT 'Monthly';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'discount_rate_pct') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN discount_rate_pct NUMERIC(5,2) DEFAULT 10.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'cost_of_capital_pct') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN cost_of_capital_pct NUMERIC(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'schema_version') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN schema_version INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_project'
                 AND column_name = 'last_calculated_at') THEN
    ALTER TABLE landscape.tbl_project ADD COLUMN last_calculated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END$$;

COMMENT ON COLUMN landscape.tbl_project.project_type IS 'Land Development, Income Property, or Mixed Use';
COMMENT ON COLUMN landscape.tbl_project.financial_model_type IS 'Development, Stabilized, or Value-Add';
COMMENT ON COLUMN landscape.tbl_project.calculation_frequency IS 'Monthly, Quarterly, or Annual';
COMMENT ON COLUMN landscape.tbl_project.discount_rate_pct IS 'Discount rate for NPV calculations';

-- Enhance tbl_phase
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_phase'
                 AND column_name = 'phase_status') THEN
    ALTER TABLE landscape.tbl_phase ADD COLUMN phase_status VARCHAR(50) DEFAULT 'Planning';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_phase'
                 AND column_name = 'phase_start_date') THEN
    ALTER TABLE landscape.tbl_phase ADD COLUMN phase_start_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_phase'
                 AND column_name = 'phase_completion_date') THEN
    ALTER TABLE landscape.tbl_phase ADD COLUMN phase_completion_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_phase'
                 AND column_name = 'absorption_start_date') THEN
    ALTER TABLE landscape.tbl_phase ADD COLUMN absorption_start_date DATE;
  END IF;
END$$;

COMMENT ON COLUMN landscape.tbl_phase.phase_status IS 'Planning, Approved, Under Construction, Completed, or On Hold';

-- Enhance tbl_parcel
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'parcel_name') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN parcel_name VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'building_name') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN building_name VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'building_class') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN building_class VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'year_built') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN year_built INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'year_renovated') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN year_renovated INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'rentable_sf') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN rentable_sf NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'common_area_sf') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN common_area_sf NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'load_factor_pct') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN load_factor_pct NUMERIC(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'parking_spaces') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN parking_spaces INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'parking_ratio') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN parking_ratio NUMERIC(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'is_income_property') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN is_income_property BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_parcel'
                 AND column_name = 'property_metadata') THEN
    ALTER TABLE landscape.tbl_parcel ADD COLUMN property_metadata JSONB DEFAULT '{}';
  END IF;
END$$;

COMMENT ON COLUMN landscape.tbl_parcel.building_class IS 'Building class: A, B, or C';
COMMENT ON COLUMN landscape.tbl_parcel.parking_ratio IS 'Parking spaces per 1,000 SF';
COMMENT ON COLUMN landscape.tbl_parcel.is_income_property IS 'Flag for income-producing properties';

-- Enhance tbl_budget
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget'
                 AND column_name = 'expense_type') THEN
    ALTER TABLE landscape.tbl_budget ADD COLUMN expense_type VARCHAR(50) DEFAULT 'Capital';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget'
                 AND column_name = 'budget_timing_method') THEN
    ALTER TABLE landscape.tbl_budget ADD COLUMN budget_timing_method VARCHAR(50) DEFAULT 'Lump Sum';
  END IF;
END$$;

COMMENT ON COLUMN landscape.tbl_budget.expense_type IS 'Capital or Operating';
COMMENT ON COLUMN landscape.tbl_budget.budget_timing_method IS 'Lump Sum, S-Curve, Linear, or Custom';

-- =====================================================================
-- SECTION 2: CREATE NEW CORE TABLES
-- =====================================================================

-- tbl_lot: Individual units/lots within parcels
CREATE TABLE IF NOT EXISTS landscape.tbl_lot (
  lot_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parcel_id INTEGER NOT NULL REFERENCES landscape.tbl_parcel(parcel_id) ON DELETE CASCADE,
  phase_id INTEGER REFERENCES landscape.tbl_phase(phase_id),
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),

  -- Identification
  lot_number VARCHAR(50),
  unit_number VARCHAR(50),
  suite_number VARCHAR(50),

  -- Physical Characteristics
  unit_type VARCHAR(50),
  lot_sf NUMERIC(12,2),
  unit_sf NUMERIC(12,2),
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  floor_number INTEGER,

  -- Pricing
  base_price NUMERIC(15,2),
  price_psf NUMERIC(10,2),
  options_price NUMERIC(15,2),
  total_price NUMERIC(15,2),

  -- Status & Timing
  lot_status VARCHAR(50) DEFAULT 'Available',
  sale_date DATE,
  close_date DATE,
  lease_id INTEGER,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_lot_project_number UNIQUE(project_id, lot_number)
);

CREATE INDEX idx_lot_parcel ON landscape.tbl_lot(parcel_id);
CREATE INDEX idx_lot_phase ON landscape.tbl_lot(phase_id);
CREATE INDEX idx_lot_status ON landscape.tbl_lot(project_id, lot_status);
CREATE INDEX idx_lot_sale_date ON landscape.tbl_lot(sale_date) WHERE sale_date IS NOT NULL;

COMMENT ON TABLE landscape.tbl_lot IS 'Individual units/lots within parcels';
COMMENT ON COLUMN landscape.tbl_lot.lot_status IS 'Available, Reserved, Sold, Closed, Leased, or Vacant';
COMMENT ON COLUMN landscape.tbl_lot.unit_type IS 'SFD-40, SFD-50, Townhome, Office Suite, Retail Space, etc.';

-- =====================================================================
-- SECTION 3: INCOME & LEASE TABLES
-- =====================================================================

-- tbl_lease: Master lease register
CREATE TABLE IF NOT EXISTS landscape.tbl_lease (
  lease_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  parcel_id INTEGER REFERENCES landscape.tbl_parcel(parcel_id),
  lot_id INTEGER REFERENCES landscape.tbl_lot(lot_id),

  -- Tenant Information
  tenant_name VARCHAR(255) NOT NULL,
  tenant_contact VARCHAR(255),
  tenant_email VARCHAR(255),
  tenant_phone VARCHAR(50),
  tenant_classification VARCHAR(50),

  -- Lease Terms
  lease_status VARCHAR(50) DEFAULT 'Speculative',
  lease_type VARCHAR(50),
  suite_number VARCHAR(50),
  floor_number INTEGER,

  -- Dates
  lease_execution_date DATE,
  lease_commencement_date DATE NOT NULL,
  rent_start_date DATE,
  lease_expiration_date DATE NOT NULL,
  lease_term_months INTEGER NOT NULL,

  -- Space
  leased_sf NUMERIC(12,2) NOT NULL,
  usable_sf NUMERIC(12,2),

  -- Renewal Options
  number_of_renewal_options INTEGER DEFAULT 0,
  renewal_option_term_months INTEGER,
  renewal_notice_months INTEGER,
  renewal_probability_pct NUMERIC(5,2) DEFAULT 50.00,

  -- Termination
  early_termination_allowed BOOLEAN DEFAULT false,
  termination_notice_months INTEGER,
  termination_penalty_amount NUMERIC(15,2),

  -- Security
  security_deposit_amount NUMERIC(15,2),
  security_deposit_months INTEGER,

  -- Flags
  affects_occupancy BOOLEAN DEFAULT true,
  expansion_rights BOOLEAN DEFAULT false,
  right_of_first_refusal BOOLEAN DEFAULT false,

  -- Clauses
  exclusive_use_clause TEXT,
  co_tenancy_clause TEXT,
  radius_restriction VARCHAR(255),

  -- Metadata
  notes TEXT,
  lease_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(100),

  CONSTRAINT chk_lease_dates CHECK (lease_expiration_date >= lease_commencement_date)
);

CREATE INDEX idx_lease_project ON landscape.tbl_lease(project_id);
CREATE INDEX idx_lease_parcel ON landscape.tbl_lease(parcel_id);
CREATE INDEX idx_lease_lot ON landscape.tbl_lease(lot_id);
CREATE INDEX idx_lease_status ON landscape.tbl_lease(lease_status, affects_occupancy);
CREATE INDEX idx_lease_expiration ON landscape.tbl_lease(lease_expiration_date);
CREATE INDEX idx_lease_tenant ON landscape.tbl_lease(tenant_name);

COMMENT ON TABLE landscape.tbl_lease IS 'Master lease register for income properties';
COMMENT ON COLUMN landscape.tbl_lease.lease_status IS 'Contract, Speculative, Month-to-Month, Holdover, or Expired';
COMMENT ON COLUMN landscape.tbl_lease.tenant_classification IS 'Anchor, Major, Inline, or Kiosk';

-- tbl_base_rent: Rent schedule periods
CREATE TABLE IF NOT EXISTS landscape.tbl_base_rent (
  base_rent_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

  period_number INTEGER NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Rent Structure
  rent_type VARCHAR(50) DEFAULT 'Fixed',
  base_rent_psf_annual NUMERIC(10,2),
  base_rent_annual NUMERIC(15,2),
  base_rent_monthly NUMERIC(15,2),

  -- Percentage Rent (for retail)
  percentage_rent_rate NUMERIC(5,2),
  percentage_rent_breakpoint NUMERIC(15,2),
  percentage_rent_annual NUMERIC(15,2),

  -- Free Rent
  free_rent_months INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_base_rent_lease_period UNIQUE(lease_id, period_number),
  CONSTRAINT chk_base_rent_dates CHECK (period_end_date >= period_start_date)
);

CREATE INDEX idx_base_rent_lease ON landscape.tbl_base_rent(lease_id);
CREATE INDEX idx_base_rent_dates ON landscape.tbl_base_rent(period_start_date, period_end_date);

COMMENT ON TABLE landscape.tbl_base_rent IS 'Rent schedule periods (ARGUS Rent Steps)';
COMMENT ON COLUMN landscape.tbl_base_rent.rent_type IS 'Fixed, Free, Percentage, Market, or Turnover';

-- tbl_escalation: Rent escalation rules
CREATE TABLE IF NOT EXISTS landscape.tbl_escalation (
  escalation_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

  escalation_type VARCHAR(50) NOT NULL,
  escalation_pct NUMERIC(5,2),
  escalation_frequency VARCHAR(50) DEFAULT 'Annual',
  compound_escalation BOOLEAN DEFAULT true,

  -- CPI-specific
  cpi_index VARCHAR(100),
  cpi_floor_pct NUMERIC(5,2),
  cpi_cap_pct NUMERIC(5,2),
  tenant_cpi_share_pct NUMERIC(5,2) DEFAULT 100.00,

  -- Fixed Dollar
  annual_increase_amount NUMERIC(15,2),

  -- Stepped Schedule
  step_schedule JSONB,

  first_escalation_date DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escalation_lease ON landscape.tbl_escalation(lease_id);
CREATE INDEX idx_escalation_type ON landscape.tbl_escalation(escalation_type);

COMMENT ON TABLE landscape.tbl_escalation IS 'Rent escalation rules';
COMMENT ON COLUMN landscape.tbl_escalation.escalation_type IS 'Fixed Percentage, CPI, Fixed Dollar, or Stepped';
COMMENT ON COLUMN landscape.tbl_escalation.step_schedule IS 'JSON array: [{step_start_date, step_amount}, ...]';

-- tbl_recovery: Expense recovery structures
CREATE TABLE IF NOT EXISTS landscape.tbl_recovery (
  recovery_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

  recovery_structure VARCHAR(50) DEFAULT 'Triple Net',
  expense_cap_pct NUMERIC(5,2),

  -- Recovery Categories (JSONB for flexibility)
  categories JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_recovery_lease UNIQUE(lease_id)
);

CREATE INDEX idx_recovery_lease ON landscape.tbl_recovery(lease_id);

COMMENT ON TABLE landscape.tbl_recovery IS 'Expense recovery structures (CAM, Tax, Insurance)';
COMMENT ON COLUMN landscape.tbl_recovery.recovery_structure IS 'None, Single Net, Double Net, Triple Net, Modified Gross, or Full Service';
COMMENT ON COLUMN landscape.tbl_recovery.categories IS 'JSON array: [{name, included, cap, basis}, ...]';

-- tbl_additional_income: Parking, signage, etc.
CREATE TABLE IF NOT EXISTS landscape.tbl_additional_income (
  additional_income_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

  -- Parking
  parking_spaces INTEGER DEFAULT 0,
  parking_rate_monthly NUMERIC(10,2),
  parking_annual NUMERIC(15,2),

  -- Other Income Items (flexible structure)
  other_income JSONB DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_additional_income_lease UNIQUE(lease_id)
);

CREATE INDEX idx_additional_income_lease ON landscape.tbl_additional_income(lease_id);

COMMENT ON TABLE landscape.tbl_additional_income IS 'Additional income: parking, signage, percentage rent, etc.';
COMMENT ON COLUMN landscape.tbl_additional_income.other_income IS 'JSON array: [{label, amount, frequency}, ...]';

-- tbl_tenant_improvement: TI/LC allowances
CREATE TABLE IF NOT EXISTS landscape.tbl_tenant_improvement (
  tenant_improvement_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

  allowance_psf NUMERIC(10,2),
  allowance_total NUMERIC(15,2),
  actual_cost NUMERIC(15,2),
  landlord_contribution NUMERIC(15,2),
  reimbursement_structure VARCHAR(50) DEFAULT 'Upfront',
  amortization_months INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_ti_lease UNIQUE(lease_id)
);

CREATE INDEX idx_ti_lease ON landscape.tbl_tenant_improvement(lease_id);

COMMENT ON TABLE landscape.tbl_tenant_improvement IS 'Tenant improvement allowances and costs';
COMMENT ON COLUMN landscape.tbl_tenant_improvement.reimbursement_structure IS 'Upfront, Amortized, or Blend';

-- tbl_leasing_commission: Broker commissions
CREATE TABLE IF NOT EXISTS landscape.tbl_leasing_commission (
  commission_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

  base_commission_pct NUMERIC(5,2),
  renewal_commission_pct NUMERIC(5,2),

  -- Tiered commissions
  tiers JSONB DEFAULT '[]',

  commission_amount NUMERIC(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_commission_lease UNIQUE(lease_id)
);

CREATE INDEX idx_commission_lease ON landscape.tbl_leasing_commission(lease_id);

COMMENT ON TABLE landscape.tbl_leasing_commission IS 'Leasing broker commissions';
COMMENT ON COLUMN landscape.tbl_leasing_commission.tiers IS 'JSON array: [{breakpoint_psf, rate_pct}, ...]';

-- =====================================================================
-- SECTION 4: FINANCIAL TABLES
-- =====================================================================

-- tbl_operating_expense: Operating expenses for income properties
CREATE TABLE IF NOT EXISTS landscape.tbl_operating_expense (
  expense_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  parcel_id INTEGER REFERENCES landscape.tbl_parcel(parcel_id),

  expense_category VARCHAR(100) NOT NULL,
  expense_subcategory VARCHAR(100),

  -- Amount Structure
  amount_type VARCHAR(50) DEFAULT 'Annual',
  amount NUMERIC(15,2),
  amount_psf NUMERIC(10,2),
  percentage_of_revenue NUMERIC(5,2),

  -- Recoverable?
  is_recoverable BOOLEAN DEFAULT true,
  recovery_pool VARCHAR(50),

  -- Growth
  annual_growth_pct NUMERIC(5,2) DEFAULT 3.00,

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_opex_project ON landscape.tbl_operating_expense(project_id);
CREATE INDEX idx_opex_parcel ON landscape.tbl_operating_expense(parcel_id);
CREATE INDEX idx_opex_category ON landscape.tbl_operating_expense(expense_category);

COMMENT ON TABLE landscape.tbl_operating_expense IS 'Operating expenses for income properties';
COMMENT ON COLUMN landscape.tbl_operating_expense.expense_category IS 'Management Fee, Utilities, Repairs & Maintenance, Insurance, Property Tax, Marketing, etc.';
COMMENT ON COLUMN landscape.tbl_operating_expense.amount_type IS 'Annual, Monthly, Per SF, or Percentage of Revenue';
COMMENT ON COLUMN landscape.tbl_operating_expense.recovery_pool IS 'CAM, Operating, Tax, or Insurance';

-- tbl_loan: Debt facilities
CREATE TABLE IF NOT EXISTS landscape.tbl_loan (
  loan_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  loan_name VARCHAR(255) NOT NULL,
  loan_type VARCHAR(50) NOT NULL,
  lender_name VARCHAR(255),

  -- Principal
  commitment_amount NUMERIC(15,2) NOT NULL,
  loan_to_cost_pct NUMERIC(5,2),
  loan_to_value_pct NUMERIC(5,2),

  -- Interest
  interest_rate_pct NUMERIC(6,3) NOT NULL,
  interest_type VARCHAR(50) DEFAULT 'Floating',
  interest_index VARCHAR(50),
  interest_spread_bps INTEGER,

  -- Fees
  origination_fee_pct NUMERIC(5,2),
  exit_fee_pct NUMERIC(5,2),
  unused_fee_pct NUMERIC(5,2),

  -- Terms
  loan_term_months INTEGER,
  amortization_months INTEGER,
  interest_only_months INTEGER DEFAULT 0,

  -- Dates
  loan_start_date DATE,
  loan_maturity_date DATE,

  -- Reserve
  interest_reserve_amount NUMERIC(15,2),
  interest_reserve_funded_upfront BOOLEAN DEFAULT false,

  -- Payment
  payment_frequency VARCHAR(50) DEFAULT 'Monthly',

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loan_project ON landscape.tbl_loan(project_id);
CREATE INDEX idx_loan_type ON landscape.tbl_loan(loan_type);

COMMENT ON TABLE landscape.tbl_loan IS 'Debt facilities (construction, permanent, mezzanine)';
COMMENT ON COLUMN landscape.tbl_loan.loan_type IS 'Construction, Permanent, Bridge, or Mezzanine';
COMMENT ON COLUMN landscape.tbl_loan.interest_type IS 'Fixed or Floating';
COMMENT ON COLUMN landscape.tbl_loan.interest_index IS 'SOFR, Prime, or Fixed';

-- tbl_equity: Equity contributions and structure
CREATE TABLE IF NOT EXISTS landscape.tbl_equity (
  equity_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  equity_name VARCHAR(255) NOT NULL,
  equity_class VARCHAR(50) NOT NULL,
  equity_tier INTEGER DEFAULT 1,

  commitment_amount NUMERIC(15,2) NOT NULL,
  funded_amount NUMERIC(15,2) DEFAULT 0,

  -- Preferred Return
  preferred_return_pct NUMERIC(5,2),
  preferred_return_compounds BOOLEAN DEFAULT false,

  -- Promote/Carried Interest
  promote_pct NUMERIC(5,2),
  promote_tier_2_threshold NUMERIC(15,2),
  promote_tier_2_pct NUMERIC(5,2),

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_equity_project ON landscape.tbl_equity(project_id);
CREATE INDEX idx_equity_tier ON landscape.tbl_equity(project_id, equity_tier);

COMMENT ON TABLE landscape.tbl_equity IS 'Equity contributions and structure';
COMMENT ON COLUMN landscape.tbl_equity.equity_class IS 'Class A, Class B, GP, LP, Sponsor, or Investor';
COMMENT ON COLUMN landscape.tbl_equity.equity_tier IS 'Waterfall sequencing (1 = first priority)';

-- tbl_waterfall: Cash flow distribution waterfall definitions
CREATE TABLE IF NOT EXISTS landscape.tbl_waterfall (
  waterfall_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  waterfall_name VARCHAR(255) NOT NULL,

  -- Tier definitions stored as ordered JSONB array
  tiers JSONB NOT NULL,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_waterfall_project ON landscape.tbl_waterfall(project_id);
CREATE INDEX idx_waterfall_active ON landscape.tbl_waterfall(project_id, is_active);

COMMENT ON TABLE landscape.tbl_waterfall IS 'Cash flow distribution waterfall definitions';
COMMENT ON COLUMN landscape.tbl_waterfall.tiers IS 'JSON array defining waterfall tiers with equity class distributions';

-- =====================================================================
-- SECTION 5: CALCULATION ENGINE TABLES
-- =====================================================================

-- Enhance tbl_calculation_period if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'landscape'
             AND table_name = 'tbl_calculation_period') THEN

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'landscape'
                   AND table_name = 'tbl_calculation_period'
                   AND column_name = 'period_type') THEN
      ALTER TABLE landscape.tbl_calculation_period ADD COLUMN period_type VARCHAR(50) DEFAULT 'Monthly';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'landscape'
                   AND table_name = 'tbl_calculation_period'
                   AND column_name = 'fiscal_year') THEN
      ALTER TABLE landscape.tbl_calculation_period ADD COLUMN fiscal_year INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'landscape'
                   AND table_name = 'tbl_calculation_period'
                   AND column_name = 'fiscal_quarter') THEN
      ALTER TABLE landscape.tbl_calculation_period ADD COLUMN fiscal_quarter INTEGER;
    END IF;
  END IF;
END$$;

-- tbl_cashflow: Calculated cash flows by period
CREATE TABLE IF NOT EXISTS landscape.tbl_cashflow (
  cashflow_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL,

  -- Dimensional slicing
  parcel_id INTEGER REFERENCES landscape.tbl_parcel(parcel_id),
  phase_id INTEGER REFERENCES landscape.tbl_phase(phase_id),
  lot_id INTEGER REFERENCES landscape.tbl_lot(lot_id),
  lease_id INTEGER REFERENCES landscape.tbl_lease(lease_id),

  cashflow_category VARCHAR(100) NOT NULL,
  cashflow_subcategory VARCHAR(100),

  -- Amounts
  amount NUMERIC(15,2) NOT NULL,
  cumulative_amount NUMERIC(15,2),

  -- Calculation Metadata
  calculation_method VARCHAR(50),
  source_table VARCHAR(100),
  source_id INTEGER,

  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cashflow_project_period ON landscape.tbl_cashflow(project_id, period_id);
CREATE INDEX idx_cashflow_category ON landscape.tbl_cashflow(cashflow_category);
CREATE INDEX idx_cashflow_parcel ON landscape.tbl_cashflow(parcel_id, period_id);
CREATE INDEX idx_cashflow_phase ON landscape.tbl_cashflow(phase_id, period_id);
CREATE INDEX idx_cashflow_lease ON landscape.tbl_cashflow(lease_id, period_id);

COMMENT ON TABLE landscape.tbl_cashflow IS 'Calculated cash flows by period (granular)';
COMMENT ON COLUMN landscape.tbl_cashflow.cashflow_category IS 'Revenue, Operating Expense, Capital Expense, Financing, or Distribution';
COMMENT ON COLUMN landscape.tbl_cashflow.calculation_method IS 'S-Curve, Linear, Lump Sum, or Lease Schedule';

-- tbl_cashflow_summary: Aggregated financial metrics by period
CREATE TABLE IF NOT EXISTS landscape.tbl_cashflow_summary (
  summary_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL,

  -- Income Statement
  gross_revenue NUMERIC(15,2) DEFAULT 0,
  vacancy_loss NUMERIC(15,2) DEFAULT 0,
  credit_loss NUMERIC(15,2) DEFAULT 0,
  effective_gross_income NUMERIC(15,2) DEFAULT 0,

  operating_expenses NUMERIC(15,2) DEFAULT 0,
  net_operating_income NUMERIC(15,2) DEFAULT 0,

  -- Below-line items
  capital_expenditures NUMERIC(15,2) DEFAULT 0,
  tenant_improvements NUMERIC(15,2) DEFAULT 0,
  leasing_commissions NUMERIC(15,2) DEFAULT 0,

  debt_service NUMERIC(15,2) DEFAULT 0,
  interest_expense NUMERIC(15,2) DEFAULT 0,
  principal_payment NUMERIC(15,2) DEFAULT 0,

  -- Cash flows
  cash_flow_before_tax NUMERIC(15,2) DEFAULT 0,
  equity_contributions NUMERIC(15,2) DEFAULT 0,
  equity_distributions NUMERIC(15,2) DEFAULT 0,

  net_cash_flow NUMERIC(15,2) DEFAULT 0,
  cumulative_net_cash_flow NUMERIC(15,2) DEFAULT 0,

  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_summary_project_period UNIQUE(project_id, period_id)
);

CREATE INDEX idx_summary_project_period ON landscape.tbl_cashflow_summary(project_id, period_id);

COMMENT ON TABLE landscape.tbl_cashflow_summary IS 'Aggregated financial metrics by period (ARGUS-style summary)';

-- tbl_project_metrics: Final project-level return metrics
CREATE TABLE IF NOT EXISTS landscape.tbl_project_metrics (
  metrics_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  -- Investment Metrics
  total_equity_invested NUMERIC(15,2),
  total_debt_proceeds NUMERIC(15,2),
  total_project_cost NUMERIC(15,2),

  -- Returns
  project_irr_pct NUMERIC(6,3),
  equity_irr_pct NUMERIC(6,3),
  levered_irr_pct NUMERIC(6,3),
  unlevered_irr_pct NUMERIC(6,3),

  equity_multiple NUMERIC(6,3),

  -- Value Metrics
  stabilized_noi NUMERIC(15,2),
  exit_cap_rate_pct NUMERIC(5,2),
  exit_value NUMERIC(15,2),

  residual_land_value_per_acre NUMERIC(15,2),
  residual_land_value_per_unit NUMERIC(15,2),

  -- Debt Coverage
  peak_debt NUMERIC(15,2),
  avg_dscr NUMERIC(6,3),
  min_dscr NUMERIC(6,3),

  -- Timing
  development_duration_months INTEGER,
  absorption_duration_months INTEGER,

  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculation_version INTEGER DEFAULT 1,

  CONSTRAINT uq_metrics_project_version UNIQUE(project_id, calculation_version)
);

CREATE INDEX idx_metrics_project ON landscape.tbl_project_metrics(project_id);
CREATE INDEX idx_metrics_latest ON landscape.tbl_project_metrics(project_id, calculation_version DESC);

COMMENT ON TABLE landscape.tbl_project_metrics IS 'Final project-level return metrics (IRR, EM, NPV, DSCR)';

-- =====================================================================
-- SECTION 6: REFERENCE DATA & ENUMERATIONS
-- =====================================================================

-- Create lookup table for lease statuses
CREATE TABLE IF NOT EXISTS landscape.lu_lease_status (
  status_code VARCHAR(50) PRIMARY KEY,
  status_name VARCHAR(100) NOT NULL,
  description TEXT,
  affects_occupancy BOOLEAN DEFAULT true,
  display_order INTEGER
);

INSERT INTO landscape.lu_lease_status (status_code, status_name, description, affects_occupancy, display_order)
VALUES
  ('CONTRACT', 'Contract', 'Executed lease with tenant', true, 1),
  ('SPECULATIVE', 'Speculative', 'Projected future lease', false, 2),
  ('MONTH_TO_MONTH', 'Month-to-Month', 'Lease converted to month-to-month', true, 3),
  ('HOLDOVER', 'Holdover', 'Tenant holding over after expiration', true, 4),
  ('EXPIRED', 'Expired', 'Lease expired', false, 5)
ON CONFLICT (status_code) DO NOTHING;

-- Create lookup table for lease types
CREATE TABLE IF NOT EXISTS landscape.lu_lease_type (
  type_code VARCHAR(50) PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER
);

INSERT INTO landscape.lu_lease_type (type_code, type_name, description, display_order)
VALUES
  ('OFFICE', 'Office', 'Office space lease', 1),
  ('RETAIL', 'Retail', 'Retail space lease', 2),
  ('INDUSTRIAL', 'Industrial', 'Industrial/warehouse lease', 3),
  ('RESIDENTIAL', 'Residential', 'Residential apartment lease', 4),
  ('MIXED_USE', 'Mixed Use', 'Mixed-use space', 5)
ON CONFLICT (type_code) DO NOTHING;

-- Create lookup table for recovery structures
CREATE TABLE IF NOT EXISTS landscape.lu_recovery_structure (
  structure_code VARCHAR(50) PRIMARY KEY,
  structure_name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER
);

INSERT INTO landscape.lu_recovery_structure (structure_code, structure_name, description, display_order)
VALUES
  ('NONE', 'None', 'No expense recovery (gross lease)', 1),
  ('SINGLE_NET', 'Single Net', 'Tenant pays property taxes', 2),
  ('DOUBLE_NET', 'Double Net', 'Tenant pays taxes and insurance', 3),
  ('TRIPLE_NET', 'Triple Net', 'Tenant pays taxes, insurance, and CAM', 4),
  ('MODIFIED_GROSS', 'Modified Gross', 'Modified gross with specific inclusions', 5),
  ('FULL_SERVICE', 'Full Service', 'Landlord pays all expenses', 6)
ON CONFLICT (structure_code) DO NOTHING;

-- =====================================================================
-- SECTION 7: UTILITY FUNCTIONS
-- =====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION landscape.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables with updated_at column
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'landscape'
    AND column_name = 'updated_at'
    AND table_name LIKE 'tbl_%'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_updated_at ON landscape.%I;
      CREATE TRIGGER trg_update_updated_at
        BEFORE UPDATE ON landscape.%I
        FOR EACH ROW
        EXECUTE FUNCTION landscape.update_updated_at_column();
    ', t, t);
  END LOOP;
END$$;

-- =====================================================================
-- SECTION 8: VIEWS (for convenience)
-- =====================================================================

-- View: Current lease summary by project
CREATE OR REPLACE VIEW landscape.v_lease_summary AS
SELECT
  l.project_id,
  p.project_name,
  COUNT(DISTINCT l.lease_id) as total_leases,
  COUNT(DISTINCT CASE WHEN l.lease_status = 'CONTRACT' THEN l.lease_id END) as contract_leases,
  COUNT(DISTINCT CASE WHEN l.lease_status = 'SPECULATIVE' THEN l.lease_id END) as speculative_leases,
  SUM(l.leased_sf) as total_leased_sf,
  SUM(CASE WHEN l.affects_occupancy AND l.lease_status = 'CONTRACT' THEN l.leased_sf ELSE 0 END) as occupied_sf,
  ROUND(
    SUM(CASE WHEN l.affects_occupancy AND l.lease_status = 'CONTRACT' THEN l.leased_sf ELSE 0 END)::NUMERIC /
    NULLIF(SUM(l.leased_sf), 0) * 100,
    2
  ) as occupancy_pct
FROM landscape.tbl_lease l
JOIN landscape.tbl_project p ON l.project_id = p.project_id
GROUP BY l.project_id, p.project_name;

COMMENT ON VIEW landscape.v_lease_summary IS 'Summary of leases by project with occupancy metrics';

-- View: Rent roll
CREATE OR REPLACE VIEW landscape.v_rent_roll AS
SELECT
  l.lease_id,
  l.project_id,
  l.tenant_name,
  l.suite_number,
  l.lease_status,
  l.lease_type,
  l.leased_sf,
  l.lease_commencement_date,
  l.lease_expiration_date,
  l.lease_term_months,
  br.base_rent_psf_annual,
  br.base_rent_annual,
  br.base_rent_monthly,
  l.renewal_probability_pct,
  EXTRACT(YEAR FROM AGE(l.lease_expiration_date, CURRENT_DATE))::INTEGER * 12 +
  EXTRACT(MONTH FROM AGE(l.lease_expiration_date, CURRENT_DATE))::INTEGER as months_to_expiration
FROM landscape.tbl_lease l
LEFT JOIN landscape.tbl_base_rent br ON l.lease_id = br.lease_id AND br.period_number = 1
WHERE l.affects_occupancy = true
ORDER BY l.lease_expiration_date;

COMMENT ON VIEW landscape.v_rent_roll IS 'Current rent roll with key lease metrics';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Financial Engine Schema Migration (Phase 1) completed successfully at %', NOW();
  RAISE NOTICE 'Schema version: 1.0';
  RAISE NOTICE 'Tables created: tbl_lot, tbl_lease, tbl_base_rent, tbl_escalation, tbl_recovery, tbl_additional_income, tbl_tenant_improvement, tbl_leasing_commission, tbl_operating_expense, tbl_loan, tbl_equity, tbl_waterfall, tbl_cashflow, tbl_cashflow_summary, tbl_project_metrics';
  RAISE NOTICE 'Lookup tables created: lu_lease_status, lu_lease_type, lu_recovery_structure';
  RAISE NOTICE 'Views created: v_lease_summary, v_rent_roll';
END$$;
