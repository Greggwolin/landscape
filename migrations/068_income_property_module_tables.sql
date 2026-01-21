-- Migration 068: Income Property Module Tables
-- Date: 2026-01-20
-- Status: PENDING
-- Purpose: Create ARGUS-grade module tables for advanced lease analysis
-- Part of: Income Property Schema Architecture (Core + Extension pattern)
--
-- Module Tables:
-- These are standalone tables that augment lease/property data
-- with institutional-grade tracking capabilities

-- ============================================================================
-- TENANT IMPROVEMENT MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_tenant_improvement (
    ti_id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- TI Allowance
    ti_allowance_psf NUMERIC(8,2),
    ti_allowance_total NUMERIC(12,2),
    ti_allowance_type VARCHAR(50), -- turnkey, allowance, as-is

    -- Landlord Contribution
    landlord_work_description TEXT,
    landlord_work_cost NUMERIC(12,2),
    landlord_work_completion_date DATE,

    -- Tenant Contribution
    tenant_work_description TEXT,
    tenant_work_cost NUMERIC(12,2),
    above_standard_ti_cost NUMERIC(12,2),

    -- Amortization
    ti_amortization_term_months INTEGER,
    ti_amortization_rate_pct NUMERIC(6,4),
    ti_amortized_rent_psf NUMERIC(8,2),

    -- Payment Schedule
    ti_payment_timing VARCHAR(50), -- at-signing, at-commencement, upon-completion, 50/50
    ti_payment_date DATE,
    ti_paid BOOLEAN DEFAULT FALSE,

    -- Documentation
    ti_estimate_date DATE,
    ti_bid_date DATE,
    ti_contract_date DATE,
    ti_substantial_completion_date DATE,
    ti_final_completion_date DATE,

    -- Ownership
    ti_removable BOOLEAN DEFAULT FALSE,
    ti_reversion_to_landlord BOOLEAN DEFAULT TRUE,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- LEASING COMMISSION MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_leasing_commission (
    commission_id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Commission Structure
    commission_type VARCHAR(50), -- full-service, tenant-rep-only, landlord-rep-only
    commission_basis VARCHAR(50), -- aggregate-rent, first-year-rent, flat-fee

    -- Landlord Rep
    landlord_broker_name VARCHAR(255),
    landlord_broker_company VARCHAR(255),
    landlord_commission_pct NUMERIC(5,2),
    landlord_commission_amount NUMERIC(12,2),

    -- Tenant Rep
    tenant_broker_name VARCHAR(255),
    tenant_broker_company VARCHAR(255),
    tenant_commission_pct NUMERIC(5,2),
    tenant_commission_amount NUMERIC(12,2),

    -- Total Commission
    total_commission_amount NUMERIC(12,2),
    commission_psf NUMERIC(8,2),

    -- Payment Schedule
    payment_schedule VARCHAR(50), -- at-execution, at-commencement, 50/50, installments
    first_payment_date DATE,
    first_payment_amount NUMERIC(12,2),
    second_payment_date DATE,
    second_payment_amount NUMERIC(12,2),

    -- Splits (for co-broker deals)
    split_with_broker VARCHAR(255),
    split_percentage NUMERIC(5,2),

    -- Amortization
    commission_amortization_months INTEGER,
    commission_amortization_rate_pct NUMERIC(6,4),

    -- Status
    commission_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    paid_amount NUMERIC(12,2),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RENEWAL OPTION MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_renewal_option (
    renewal_option_id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Option Sequence
    option_number INTEGER NOT NULL, -- 1st option, 2nd option, etc.

    -- Term
    option_term_months INTEGER NOT NULL,
    option_term_years NUMERIC(4,1),

    -- Notice Requirements
    notice_period_months INTEGER,
    earliest_notice_date DATE,
    latest_notice_date DATE,
    notice_received BOOLEAN DEFAULT FALSE,
    notice_received_date DATE,

    -- Rent Determination
    rent_determination_method VARCHAR(50), -- fixed, market, CPI, formula
    fixed_rent_psf NUMERIC(8,2),
    fixed_rent_annual NUMERIC(12,2),
    market_rent_floor_psf NUMERIC(8,2),
    market_rent_ceiling_psf NUMERIC(8,2),
    cpi_adjustment_pct NUMERIC(5,2),
    formula_description TEXT,

    -- Escalations During Option
    option_escalation_type VARCHAR(50),
    option_escalation_pct NUMERIC(5,2),
    option_escalation_frequency VARCHAR(20),

    -- Fair Market Value Process
    fmv_determination_period_days INTEGER,
    fmv_arbitration_required BOOLEAN DEFAULT FALSE,
    fmv_appraiser_selection VARCHAR(100),

    -- Exercise Status
    option_exercised BOOLEAN DEFAULT FALSE,
    exercise_date DATE,
    exercised_rent_psf NUMERIC(8,2),
    exercised_rent_annual NUMERIC(12,2),

    -- Conditions
    exercise_conditions TEXT,
    no_default_required BOOLEAN DEFAULT TRUE,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EXPANSION OPTION MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_expansion_option (
    expansion_option_id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Option Type
    option_type VARCHAR(50), -- ROFO (right of first offer), ROFR (right of first refusal), must-take

    -- Target Space
    target_space_id INTEGER
        REFERENCES landscape.tbl_space(space_id) ON DELETE SET NULL,
    target_space_description VARCHAR(255),
    expansion_sf_min NUMERIC(10,2),
    expansion_sf_max NUMERIC(10,2),

    -- Timing
    option_start_date DATE,
    option_end_date DATE,
    must_take_date DATE,

    -- Notice Requirements
    notice_period_days INTEGER,
    landlord_notice_required BOOLEAN DEFAULT FALSE,
    response_period_days INTEGER,

    -- Rent Terms
    expansion_rent_method VARCHAR(50), -- match-existing, market, fixed
    expansion_rent_psf NUMERIC(8,2),
    expansion_rent_spread_psf NUMERIC(8,2), -- +/- market

    -- Exercise Status
    option_exercised BOOLEAN DEFAULT FALSE,
    exercise_date DATE,
    exercised_space_id INTEGER
        REFERENCES landscape.tbl_space(space_id) ON DELETE SET NULL,
    exercised_sf NUMERIC(10,2),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TERMINATION OPTION MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_termination_option (
    termination_option_id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Termination Type
    termination_type VARCHAR(50), -- tenant-option, landlord-option, mutual, contingent

    -- Timing
    earliest_termination_date DATE,
    termination_window_start DATE,
    termination_window_end DATE,

    -- Notice Requirements
    notice_period_months INTEGER,
    notice_deadline DATE,

    -- Penalty/Fee
    termination_fee_type VARCHAR(50), -- flat, unamortized-ti, unamortized-lc, combination
    termination_fee_flat NUMERIC(12,2),
    termination_fee_months_rent INTEGER,
    unamortized_ti_included BOOLEAN DEFAULT FALSE,
    unamortized_lc_included BOOLEAN DEFAULT FALSE,
    termination_fee_formula TEXT,
    estimated_termination_fee NUMERIC(12,2),

    -- Conditions
    termination_conditions TEXT,
    financial_covenant_trigger BOOLEAN DEFAULT FALSE,
    sales_threshold_trigger NUMERIC(14,2),

    -- Exercise Status
    termination_exercised BOOLEAN DEFAULT FALSE,
    termination_notice_date DATE,
    actual_termination_date DATE,
    termination_fee_paid NUMERIC(12,2),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FREE RENT / CONCESSION MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_rent_concession (
    concession_id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Concession Type
    concession_type VARCHAR(50), -- free-rent, reduced-rent, abatement, credit

    -- Timing
    concession_start_date DATE,
    concession_end_date DATE,
    concession_months INTEGER,

    -- Value
    concession_amount_monthly NUMERIC(10,2),
    concession_amount_total NUMERIC(12,2),
    concession_psf NUMERIC(8,2),
    concession_pct_of_rent NUMERIC(5,2),

    -- Structure
    concession_timing VARCHAR(50), -- upfront, spread, back-end, conditional
    applies_to_base_rent BOOLEAN DEFAULT TRUE,
    applies_to_cam BOOLEAN DEFAULT FALSE,
    applies_to_taxes BOOLEAN DEFAULT FALSE,

    -- Burn-Off
    burn_off_upon_default BOOLEAN DEFAULT FALSE,
    burn_off_upon_assignment BOOLEAN DEFAULT FALSE,
    remaining_concession_value NUMERIC(12,2),

    -- Amortization
    amortized_over_months INTEGER,
    amortization_start_date DATE,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECURITY DEPOSIT MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_security_deposit (
    deposit_id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Deposit Details
    deposit_type VARCHAR(50), -- cash, letter-of-credit, surety-bond, corporate-guarantee
    deposit_amount NUMERIC(12,2),
    deposit_months NUMERIC(4,1),

    -- Letter of Credit Details
    loc_issuing_bank VARCHAR(255),
    loc_expiration_date DATE,
    loc_auto_renew BOOLEAN DEFAULT FALSE,
    loc_renewal_notice_days INTEGER,
    loc_beneficiary VARCHAR(255),

    -- Corporate Guarantee
    guarantor_name VARCHAR(255),
    guarantor_relationship VARCHAR(100),
    guarantee_type VARCHAR(50), -- full, limited, good-guy
    guarantee_cap NUMERIC(12,2),
    guarantee_burn_down BOOLEAN DEFAULT FALSE,
    burn_down_schedule TEXT,

    -- Reduction Schedule
    deposit_reduction_allowed BOOLEAN DEFAULT FALSE,
    reduction_trigger VARCHAR(100), -- time-based, financial-covenant
    reduction_schedule TEXT,

    -- Interest
    interest_bearing BOOLEAN DEFAULT FALSE,
    interest_rate_pct NUMERIC(5,3),
    interest_payment_frequency VARCHAR(20),

    -- Status
    deposit_received BOOLEAN DEFAULT FALSE,
    deposit_received_date DATE,
    deposit_account_number VARCHAR(100),
    current_deposit_balance NUMERIC(12,2),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RENT STEP / ESCALATION SCHEDULE MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_rent_step (
    rent_step_id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL
        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Step Sequence
    step_number INTEGER NOT NULL,
    step_effective_date DATE NOT NULL,
    step_end_date DATE,

    -- Rent Amounts
    base_rent_psf NUMERIC(8,2),
    base_rent_monthly NUMERIC(12,2),
    base_rent_annual NUMERIC(14,2),

    -- Step Details
    step_type VARCHAR(50), -- fixed, percentage, CPI
    step_increase_pct NUMERIC(5,2),
    step_increase_amount NUMERIC(10,2),
    cumulative_increase_pct NUMERIC(5,2),

    -- CPI Details (if CPI-based)
    cpi_index VARCHAR(100),
    cpi_base_value NUMERIC(10,2),
    cpi_current_value NUMERIC(10,2),
    cpi_floor_pct NUMERIC(5,2),
    cpi_cap_pct NUMERIC(5,2),

    -- Calculated Values
    rent_psf_change NUMERIC(8,2),
    rent_annual_change NUMERIC(14,2),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR MODULE TABLES
-- ============================================================================

-- Tenant Improvement
CREATE INDEX IF NOT EXISTS idx_ti_lease ON landscape.tbl_tenant_improvement(lease_id);
CREATE INDEX IF NOT EXISTS idx_ti_completion ON landscape.tbl_tenant_improvement(ti_substantial_completion_date);

-- Leasing Commission
CREATE INDEX IF NOT EXISTS idx_commission_lease ON landscape.tbl_leasing_commission(lease_id);
CREATE INDEX IF NOT EXISTS idx_commission_paid ON landscape.tbl_leasing_commission(commission_paid);

-- Renewal Option
CREATE INDEX IF NOT EXISTS idx_renewal_lease ON landscape.tbl_renewal_option(lease_id);
CREATE INDEX IF NOT EXISTS idx_renewal_notice ON landscape.tbl_renewal_option(latest_notice_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_renewal_lease_number
    ON landscape.tbl_renewal_option(lease_id, option_number);

-- Expansion Option
CREATE INDEX IF NOT EXISTS idx_expansion_lease ON landscape.tbl_expansion_option(lease_id);
CREATE INDEX IF NOT EXISTS idx_expansion_target ON landscape.tbl_expansion_option(target_space_id);

-- Termination Option
CREATE INDEX IF NOT EXISTS idx_termination_lease ON landscape.tbl_termination_option(lease_id);
CREATE INDEX IF NOT EXISTS idx_termination_deadline ON landscape.tbl_termination_option(notice_deadline);

-- Rent Concession
CREATE INDEX IF NOT EXISTS idx_concession_lease ON landscape.tbl_rent_concession(lease_id);
CREATE INDEX IF NOT EXISTS idx_concession_dates ON landscape.tbl_rent_concession(concession_start_date, concession_end_date);

-- Security Deposit
CREATE INDEX IF NOT EXISTS idx_deposit_lease ON landscape.tbl_security_deposit(lease_id);
CREATE INDEX IF NOT EXISTS idx_deposit_loc_expiry ON landscape.tbl_security_deposit(loc_expiration_date)
    WHERE deposit_type = 'letter-of-credit';

-- Rent Step
CREATE INDEX IF NOT EXISTS idx_rent_step_lease ON landscape.tbl_rent_step(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_step_date ON landscape.tbl_rent_step(step_effective_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_step_lease_number
    ON landscape.tbl_rent_step(lease_id, step_number);

-- ============================================================================
-- VALIDATION QUERY
-- ============================================================================

/*
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c
     WHERE c.table_name = t.table_name AND c.table_schema = 'landscape') as column_count
FROM information_schema.tables t
WHERE table_schema = 'landscape'
AND table_name IN (
    'tbl_tenant_improvement', 'tbl_leasing_commission', 'tbl_renewal_option',
    'tbl_expansion_option', 'tbl_termination_option', 'tbl_rent_concession',
    'tbl_security_deposit', 'tbl_rent_step'
)
ORDER BY table_name;
*/

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================

/*
DROP TABLE IF EXISTS landscape.tbl_rent_step;
DROP TABLE IF EXISTS landscape.tbl_security_deposit;
DROP TABLE IF EXISTS landscape.tbl_rent_concession;
DROP TABLE IF EXISTS landscape.tbl_termination_option;
DROP TABLE IF EXISTS landscape.tbl_expansion_option;
DROP TABLE IF EXISTS landscape.tbl_renewal_option;
DROP TABLE IF EXISTS landscape.tbl_leasing_commission;
DROP TABLE IF EXISTS landscape.tbl_tenant_improvement;
*/
