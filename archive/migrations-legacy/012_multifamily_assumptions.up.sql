-- ============================================================================
-- MULTIFAMILY ASSUMPTION TABLES - Income Property Modeling
-- ============================================================================
-- Purpose: Store user assumptions for apartment/multifamily cash flow analysis
-- Context: Supports napkin→kitchen sink progressive disclosure UI
-- Property Type: Multifamily apartments (will extend to office/retail later)
-- Date: 2025-10-17
-- Session: KP60
-- ============================================================================

-- ============================================================================
-- BASKET 1: THE DEAL (Acquisition & Disposition)
-- ============================================================================

-- Core acquisition/disposition terms
CREATE TABLE IF NOT EXISTS landscape.tbl_property_acquisition (
    acquisition_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,

    -- NAPKIN TIER (5 fields - always visible)
    purchase_price NUMERIC(15,2) NOT NULL,
    acquisition_date DATE NOT NULL,
    hold_period_years NUMERIC(5,2) NOT NULL,
    exit_cap_rate NUMERIC(6,4) NOT NULL,
    sale_date DATE, -- Auto-calculated from acquisition_date + hold_period

    -- MID TIER (7 additional fields)
    closing_costs_pct NUMERIC(6,3) DEFAULT 0.015, -- 1.5% typical
    due_diligence_days INTEGER DEFAULT 30,
    earnest_money NUMERIC(12,2),
    sale_costs_pct NUMERIC(6,3) DEFAULT 0.015,
    broker_commission_pct NUMERIC(6,3) DEFAULT 0.025,
    price_per_unit NUMERIC(10,2), -- Auto-calc: purchase_price / unit_count
    price_per_sf NUMERIC(8,2), -- Auto-calc: purchase_price / rentable_sf

    -- PRO TIER (6 additional fields)
    legal_fees NUMERIC(10,2),
    financing_fees NUMERIC(10,2),
    third_party_reports NUMERIC(10,2),
    depreciation_basis NUMERIC(15,2), -- Auto-calc: purchase_price * improvement_pct
    land_pct NUMERIC(5,2) DEFAULT 20.0, -- 20% typical for multifamily
    improvement_pct NUMERIC(5,2) DEFAULT 80.0,
    is_1031_exchange BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE landscape.tbl_property_acquisition IS 'Acquisition and disposition assumptions - supports napkin/mid/pro tiers';
COMMENT ON COLUMN landscape.tbl_property_acquisition.price_per_unit IS 'Validation metric - purchase price per unit';
COMMENT ON COLUMN landscape.tbl_property_acquisition.depreciation_basis IS 'Tax treatment - depreciable improvements (27.5yr for multifamily)';

-- ============================================================================
-- BASKET 2: CASH IN / REVENUE
-- ============================================================================

-- Rent schedule and growth assumptions
CREATE TABLE IF NOT EXISTS landscape.tbl_revenue_rent (
    rent_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,

    -- NAPKIN TIER (3 fields)
    current_rent_psf NUMERIC(8,2) NOT NULL, -- Or per unit
    occupancy_pct NUMERIC(5,2) NOT NULL DEFAULT 0.95,
    annual_rent_growth_pct NUMERIC(5,3) NOT NULL DEFAULT 0.03,

    -- MID TIER (10 additional fields)
    in_place_rent_psf NUMERIC(8,2),
    market_rent_psf NUMERIC(8,2),
    rent_loss_to_lease_pct NUMERIC(5,2), -- Difference between in-place and market
    lease_up_months INTEGER DEFAULT 12,
    stabilized_occupancy_pct NUMERIC(5,2) DEFAULT 0.96,
    rent_growth_years_1_3_pct NUMERIC(5,3) DEFAULT 0.04,
    rent_growth_stabilized_pct NUMERIC(5,3) DEFAULT 0.025,
    free_rent_months NUMERIC(4,1) DEFAULT 0,
    ti_allowance_per_unit NUMERIC(10,2) DEFAULT 0,
    renewal_probability_pct NUMERIC(5,2) DEFAULT 0.60,

    -- PRO TIER (20+ additional fields via related tables - see tbl_rent_roll_unit)
    -- Pro tier includes unit-by-unit rent roll (grid interface)

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unit-level rent roll (PRO TIER ONLY)
CREATE TABLE IF NOT EXISTS landscape.tbl_rent_roll_unit (
    rent_roll_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,
    unit_id BIGINT, -- References tbl_multifamily_unit if exists

    unit_number VARCHAR(20) NOT NULL,
    unit_type VARCHAR(50), -- 1BR, 2BR, 3BR
    square_feet INTEGER,
    current_rent NUMERIC(10,2),
    market_rent NUMERIC(10,2),
    lease_start_date DATE,
    lease_end_date DATE,
    tenant_name VARCHAR(200),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Other income sources
CREATE TABLE IF NOT EXISTS landscape.tbl_revenue_other (
    other_income_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,

    -- NAPKIN TIER (1 field - aggregate)
    other_income_per_unit_monthly NUMERIC(8,2) DEFAULT 0,

    -- MID TIER (7 additional fields - itemized)
    parking_income_per_space NUMERIC(8,2) DEFAULT 50,
    parking_spaces INTEGER,
    pet_fee_per_pet NUMERIC(8,2) DEFAULT 35,
    pet_penetration_pct NUMERIC(5,2) DEFAULT 0.30,
    laundry_income_per_unit NUMERIC(8,2) DEFAULT 15,
    storage_income_per_unit NUMERIC(8,2) DEFAULT 10,
    application_fees_annual NUMERIC(10,2) DEFAULT 0,

    -- PRO TIER (10 additional fields)
    late_fees_annual NUMERIC(10,2),
    utility_reimbursements_annual NUMERIC(10,2),
    furnished_unit_premium_pct NUMERIC(5,2),
    short_term_rental_income NUMERIC(10,2),
    ancillary_services_income NUMERIC(10,2),
    vending_income NUMERIC(8,2),
    package_locker_fees NUMERIC(8,2),
    reserved_parking_premium NUMERIC(8,2),
    ev_charging_fees NUMERIC(8,2),
    other_miscellaneous NUMERIC(10,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vacancy and credit loss assumptions
CREATE TABLE IF NOT EXISTS landscape.tbl_vacancy_assumption (
    vacancy_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,

    -- NAPKIN TIER (2 fields)
    vacancy_loss_pct NUMERIC(5,2) NOT NULL DEFAULT 0.05,
    collection_loss_pct NUMERIC(5,2) NOT NULL DEFAULT 0.02,

    -- MID TIER (5 additional fields)
    physical_vacancy_pct NUMERIC(5,2) DEFAULT 0.03,
    economic_vacancy_pct NUMERIC(5,2) DEFAULT 0.02,
    bad_debt_pct NUMERIC(5,2) DEFAULT 0.01,
    concession_cost_pct NUMERIC(5,2) DEFAULT 0.01,
    turnover_vacancy_days INTEGER DEFAULT 14,

    -- PRO TIER (5 additional fields)
    seasonal_vacancy_adjustment JSONB, -- By month or quarter
    lease_up_absorption_curve JSONB, -- Non-linear stabilization
    market_vacancy_rate_pct NUMERIC(5,2),
    submarket_vacancy_rate_pct NUMERIC(5,2),
    competitive_set_vacancy_pct NUMERIC(5,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- BASKET 3: CASH OUT / EXPENSES
-- ============================================================================

-- Operating expense assumptions
CREATE TABLE IF NOT EXISTS landscape.tbl_operating_expense (
    expense_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,

    -- NAPKIN TIER (2 fields - aggregate)
    total_opex_per_unit_annual NUMERIC(10,2) NOT NULL,
    management_fee_pct NUMERIC(5,3) DEFAULT 0.03,

    -- MID TIER (12 additional fields - major categories)
    property_taxes_annual NUMERIC(12,2),
    insurance_annual NUMERIC(10,2),
    utilities_annual NUMERIC(10,2),
    repairs_maintenance_annual NUMERIC(10,2),
    payroll_annual NUMERIC(10,2),
    marketing_leasing_annual NUMERIC(10,2),
    admin_legal_annual NUMERIC(10,2),
    landscaping_annual NUMERIC(8,2),
    trash_removal_annual NUMERIC(8,2),
    pest_control_annual NUMERIC(6,2),
    security_annual NUMERIC(8,2),
    other_expenses_annual NUMERIC(10,2),

    -- PRO TIER (20+ fields via related table - itemized by line)
    -- See tbl_expense_detail for full line-item breakdown

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Detailed expense line items (PRO TIER)
CREATE TABLE IF NOT EXISTS landscape.tbl_expense_detail (
    expense_detail_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,
    expense_id BIGINT REFERENCES landscape.tbl_operating_expense(expense_id),

    expense_category VARCHAR(100) NOT NULL, -- Property Tax, Insurance, Utilities, etc.
    expense_subcategory VARCHAR(100), -- Electric, Gas, Water, Sewer under Utilities

    amount_annual NUMERIC(12,2) NOT NULL,
    per_unit_monthly NUMERIC(8,2), -- Alternative view
    per_sf_annual NUMERIC(6,2), -- Alternative view

    escalation_pct NUMERIC(5,3) DEFAULT 0.03,
    escalation_start_year INTEGER DEFAULT 1,

    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Capital expenditure reserves
CREATE TABLE IF NOT EXISTS landscape.tbl_capex_reserve (
    capex_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,

    -- NAPKIN TIER (1 field)
    capex_per_unit_annual NUMERIC(8,2) NOT NULL DEFAULT 300,

    -- MID TIER (5 additional fields)
    immediate_capex NUMERIC(12,2) DEFAULT 0, -- Year 1 major items
    roof_reserve_per_unit NUMERIC(6,2) DEFAULT 50,
    hvac_reserve_per_unit NUMERIC(6,2) DEFAULT 75,
    appliance_reserve_per_unit NUMERIC(6,2) DEFAULT 100,
    other_reserve_per_unit NUMERIC(6,2) DEFAULT 75,

    -- PRO TIER (10 additional fields)
    roof_replacement_year INTEGER,
    roof_replacement_cost NUMERIC(12,2),
    hvac_replacement_cycle_years INTEGER DEFAULT 15,
    hvac_replacement_cost_per_unit NUMERIC(8,2),
    parking_lot_reseal_year INTEGER,
    parking_lot_reseal_cost NUMERIC(10,2),
    exterior_paint_cycle_years INTEGER DEFAULT 7,
    exterior_paint_cost NUMERIC(10,2),
    elevator_modernization_cost NUMERIC(10,2),
    unit_renovation_per_turn NUMERIC(8,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- BASKET 4: FINANCING
-- ============================================================================

-- Debt facility terms
CREATE TABLE IF NOT EXISTS landscape.tbl_debt_facility (
    debt_facility_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,

    -- NAPKIN TIER (4 fields)
    loan_amount NUMERIC(15,2) NOT NULL,
    interest_rate_pct NUMERIC(6,4) NOT NULL,
    amortization_years INTEGER NOT NULL DEFAULT 30,
    loan_term_years INTEGER NOT NULL DEFAULT 10,

    -- MID TIER (8 additional fields)
    ltv_pct NUMERIC(5,2), -- Loan-to-value
    dscr NUMERIC(5,3), -- Debt service coverage ratio
    interest_only_years INTEGER DEFAULT 0,
    origination_fee_pct NUMERIC(5,3) DEFAULT 0.01,
    lender_legal_fees NUMERIC(10,2),
    third_party_reports NUMERIC(10,2),
    rate_type VARCHAR(20) DEFAULT 'Fixed', -- Fixed, Floating, Hybrid
    index_spread_bps INTEGER, -- For floating rate (basis points over SOFR)

    -- PRO TIER (12 additional fields)
    prepayment_penalty_structure VARCHAR(50), -- 5-4-3-2-1, Yield Maintenance, etc.
    prepayment_penalty_years INTEGER,
    guarantee_type VARCHAR(50), -- Recourse, Non-recourse, Carve-out
    guarantor_name VARCHAR(200),
    loan_covenant_dscr_min NUMERIC(5,3),
    loan_covenant_ltv_max NUMERIC(5,2),
    reserve_requirements JSONB, -- Tax, insurance, CapEx reserves
    replacement_reserve_per_unit NUMERIC(8,2),
    tax_insurance_escrow_months INTEGER,
    commitment_fee_pct NUMERIC(5,3),
    extension_option_years INTEGER,
    extension_fee_bps INTEGER,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Debt draw schedule (for construction/renovation)
CREATE TABLE IF NOT EXISTS landscape.tbl_debt_draw_schedule (
    draw_id BIGSERIAL PRIMARY KEY,
    debt_facility_id BIGINT REFERENCES landscape.tbl_debt_facility(debt_facility_id) NOT NULL,
    period_id BIGINT REFERENCES landscape.tbl_calculation_period(period_id),

    draw_amount NUMERIC(12,2) NOT NULL,
    draw_date DATE,
    draw_purpose VARCHAR(200), -- Acquisition, Construction, Lease-up, etc.

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- BASKET 5: EQUITY SPLIT / WATERFALL
-- ============================================================================

-- Capital structure and equity terms
CREATE TABLE IF NOT EXISTS landscape.tbl_equity_structure (
    equity_structure_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,

    -- NAPKIN TIER (3 fields)
    lp_ownership_pct NUMERIC(5,2) NOT NULL, -- Limited partner %
    gp_ownership_pct NUMERIC(5,2) NOT NULL, -- General partner %
    preferred_return_pct NUMERIC(6,3) NOT NULL DEFAULT 0.08, -- 8% pref typical

    -- MID TIER (5 additional fields)
    gp_promote_after_pref NUMERIC(5,2) DEFAULT 0.20, -- 20% promote after pref
    catch_up_pct NUMERIC(5,2), -- GP catch-up after pref
    equity_multiple_target NUMERIC(5,2), -- e.g., 2.0x
    irr_target_pct NUMERIC(6,3), -- e.g., 15% IRR
    distribution_frequency VARCHAR(20) DEFAULT 'Quarterly',

    -- PRO TIER (multi-tier waterfall via related table)
    -- See tbl_waterfall_tier for complex promote structures

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Multi-tier waterfall (PRO TIER)
CREATE TABLE IF NOT EXISTS landscape.tbl_waterfall_tier (
    tier_id BIGSERIAL PRIMARY KEY,
    equity_structure_id BIGINT REFERENCES landscape.tbl_equity_structure(equity_structure_id) NOT NULL,

    tier_number INTEGER NOT NULL, -- 1, 2, 3, etc.
    tier_description VARCHAR(200), -- "8% Pref Return", "20% Promote", "30% Promote over 15% IRR"

    hurdle_type VARCHAR(20), -- 'IRR' or 'Equity Multiple'
    hurdle_rate NUMERIC(6,3), -- e.g., 0.15 for 15% IRR

    lp_split_pct NUMERIC(5,2), -- LP % in this tier
    gp_split_pct NUMERIC(5,2), -- GP % in this tier

    has_catch_up BOOLEAN DEFAULT FALSE,
    catch_up_pct NUMERIC(5,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Capital call schedule
CREATE TABLE IF NOT EXISTS landscape.tbl_capital_call (
    capital_call_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES landscape.tbl_project(project_id) NOT NULL,
    period_id BIGINT REFERENCES landscape.tbl_calculation_period(period_id),

    call_amount NUMERIC(12,2) NOT NULL,
    call_date DATE,
    call_purpose VARCHAR(200), -- Acquisition, Construction, Operating Deficit, etc.

    lp_amount NUMERIC(12,2), -- Amount from LP
    gp_amount NUMERIC(12,2), -- Amount from GP

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_acquisition_project ON landscape.tbl_property_acquisition(project_id);
CREATE INDEX IF NOT EXISTS idx_rent_project ON landscape.tbl_revenue_rent(project_id);
CREATE INDEX IF NOT EXISTS idx_rent_roll_project ON landscape.tbl_rent_roll_unit(project_id);
CREATE INDEX IF NOT EXISTS idx_rent_roll_unit ON landscape.tbl_rent_roll_unit(unit_id);
CREATE INDEX IF NOT EXISTS idx_other_income_project ON landscape.tbl_revenue_other(project_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_project ON landscape.tbl_vacancy_assumption(project_id);
CREATE INDEX IF NOT EXISTS idx_opex_project ON landscape.tbl_operating_expense(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_detail_project ON landscape.tbl_expense_detail(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_detail_category ON landscape.tbl_expense_detail(expense_category);
CREATE INDEX IF NOT EXISTS idx_capex_project ON landscape.tbl_capex_reserve(project_id);
CREATE INDEX IF NOT EXISTS idx_debt_project ON landscape.tbl_debt_facility(project_id);

-- Ensure legacy schemas have the draw column before building indexes
ALTER TABLE landscape.tbl_debt_draw_schedule
    ADD COLUMN IF NOT EXISTS debt_facility_id BIGINT
    REFERENCES landscape.tbl_debt_facility(debt_facility_id);

CREATE INDEX IF NOT EXISTS idx_draw_facility ON landscape.tbl_debt_draw_schedule(debt_facility_id);
CREATE INDEX IF NOT EXISTS idx_equity_project ON landscape.tbl_equity_structure(project_id);
CREATE INDEX IF NOT EXISTS idx_waterfall_structure ON landscape.tbl_waterfall_tier(equity_structure_id);
CREATE INDEX IF NOT EXISTS idx_capital_call_project ON landscape.tbl_capital_call(project_id);

-- ============================================================================
-- INITIAL DATA: Project 11 (Multifamily Complex)
-- ============================================================================

-- Insert default assumptions for existing Project 11
INSERT INTO landscape.tbl_property_acquisition (
    project_id, purchase_price, acquisition_date, hold_period_years,
    exit_cap_rate, closing_costs_pct, price_per_unit
) VALUES (
    11, 15000000, '2025-01-15', 7.0, 0.055, 0.015, 1875000
)
ON CONFLICT DO NOTHING;

INSERT INTO landscape.tbl_revenue_rent (
    project_id, current_rent_psf, occupancy_pct, annual_rent_growth_pct,
    market_rent_psf, stabilized_occupancy_pct
) VALUES (
    11, 2.25, 0.875, 0.03, 2.50, 0.95
)
ON CONFLICT DO NOTHING;

INSERT INTO landscape.tbl_revenue_other (
    project_id, other_income_per_unit_monthly, parking_income_per_space,
    parking_spaces, pet_fee_per_pet, pet_penetration_pct
) VALUES (
    11, 150, 75, 12, 35, 0.30
)
ON CONFLICT DO NOTHING;

INSERT INTO landscape.tbl_vacancy_assumption (
    project_id, vacancy_loss_pct, collection_loss_pct
) VALUES (
    11, 0.05, 0.02
)
ON CONFLICT DO NOTHING;

INSERT INTO landscape.tbl_operating_expense (
    project_id, total_opex_per_unit_annual, management_fee_pct
) VALUES (
    11, 6500, 0.03
)
ON CONFLICT DO NOTHING;

INSERT INTO landscape.tbl_capex_reserve (
    project_id, capex_per_unit_annual
) VALUES (
    11, 400
)
ON CONFLICT DO NOTHING;

INSERT INTO landscape.tbl_debt_facility (
    project_id, loan_amount, interest_rate_pct, amortization_years,
    loan_term_years, ltv_pct, dscr
) VALUES (
    11, 10500000, 0.0575, 30, 10, 0.70, 1.25
)
ON CONFLICT DO NOTHING;

INSERT INTO landscape.tbl_equity_structure (
    project_id, lp_ownership_pct, gp_ownership_pct, preferred_return_pct,
    gp_promote_after_pref
) VALUES (
    11, 0.90, 0.10, 0.08, 0.20
)
ON CONFLICT DO NOTHING;
