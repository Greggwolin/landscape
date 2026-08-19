-- ============================================================================
-- COMMERCIAL REAL ESTATE (CRE) PROFORMA SCHEMA
-- ============================================================================
-- Purpose: Reference schema for future CRE/income property functionality
-- Covers: Lease mgmt, tenant operations, NOI, valuation, stabilization
-- Status: NOT YET IMPLEMENTED - For planning/reference only
-- Date: 2025-09-30
-- ============================================================================

-- ============================================================================
-- SECTION 1: PROPERTY & SPACE MANAGEMENT
-- ============================================================================

-- Core commercial property attributes
CREATE TABLE tbl_cre_property (
    cre_property_id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES tbl_project(project_id),
    parcel_id INTEGER REFERENCES tbl_parcel(parcel_id),
    
    property_name VARCHAR(200),
    property_type VARCHAR(50), -- Office, Retail, Industrial, Mixed-Use, etc.
    property_subtype VARCHAR(50), -- Class A Office, Neighborhood Retail, etc.
    
    -- Physical attributes
    total_building_sf NUMERIC(12,2),
    rentable_sf NUMERIC(12,2),
    usable_sf NUMERIC(12,2),
    common_area_sf NUMERIC(12,2),
    load_factor NUMERIC(5,4), -- Rentable/Usable ratio
    
    -- Building details
    year_built INTEGER,
    year_renovated INTEGER,
    number_of_floors INTEGER,
    number_of_units INTEGER, -- For multi-tenant
    parking_spaces INTEGER,
    parking_ratio NUMERIC(5,2), -- Spaces per 1,000 SF
    
    -- Operating status
    property_status VARCHAR(50), -- Development, Lease-Up, Stabilized, Value-Add
    stabilization_date DATE,
    stabilized_occupancy_pct NUMERIC(5,2), -- Target stabilized %
    
    -- Valuation inputs
    acquisition_date DATE,
    acquisition_price NUMERIC(15,2),
    current_assessed_value NUMERIC(15,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Space/suite inventory within property
CREATE TABLE tbl_cre_space (
    space_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    
    space_number VARCHAR(50), -- Suite 200, Unit 5A, etc.
    floor_number INTEGER,
    
    -- Space measurements
    usable_sf NUMERIC(10,2),
    rentable_sf NUMERIC(10,2),
    space_type VARCHAR(50), -- Office, Retail, Storage, Warehouse, etc.
    
    -- Space characteristics
    frontage_ft NUMERIC(8,2), -- For retail
    ceiling_height_ft NUMERIC(6,2),
    number_of_offices INTEGER,
    number_of_conference_rooms INTEGER,
    has_kitchenette BOOLEAN DEFAULT FALSE,
    has_private_restroom BOOLEAN DEFAULT FALSE,
    
    -- Availability
    space_status VARCHAR(50), -- Available, Leased, Owner-Occupied, Offline
    available_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 2: TENANT & LEASE MANAGEMENT
-- ============================================================================

-- Tenant/lessee information
CREATE TABLE tbl_cre_tenant (
    tenant_id SERIAL PRIMARY KEY,
    
    -- Tenant identity
    tenant_name VARCHAR(200) NOT NULL,
    tenant_legal_name VARCHAR(200),
    dba_name VARCHAR(200), -- Doing Business As
    
    -- Business details
    industry VARCHAR(100),
    naics_code VARCHAR(10),
    business_type VARCHAR(50), -- Retail, Professional Services, Restaurant, etc.
    
    -- Credit profile
    credit_rating VARCHAR(20), -- AAA, AA, A, BBB, BB, B, etc.
    creditworthiness VARCHAR(50), -- Excellent, Good, Average, Poor
    dun_bradstreet_number VARCHAR(20),
    annual_revenue NUMERIC(15,2),
    years_in_business INTEGER,
    
    -- Contact info
    contact_name VARCHAR(100),
    contact_title VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    
    -- Corporate guarantor
    guarantor_name VARCHAR(200),
    guarantor_type VARCHAR(50), -- Corporate, Personal, Letter of Credit
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Master lease record
CREATE TABLE tbl_cre_lease (
    lease_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    space_id INTEGER REFERENCES tbl_cre_space(space_id),
    tenant_id INTEGER REFERENCES tbl_cre_tenant(tenant_id),
    
    -- Lease identification
    lease_number VARCHAR(50),
    lease_type VARCHAR(50), -- Gross, NNN, Modified Gross, Percentage, Ground
    lease_status VARCHAR(50), -- Proposed, Active, Expired, Terminated, Renewed
    
    -- Term dates
    lease_execution_date DATE,
    lease_commencement_date DATE,
    rent_commencement_date DATE, -- May differ from lease commencement
    lease_expiration_date DATE,
    lease_term_months INTEGER,
    
    -- Space leased
    leased_sf NUMERIC(10,2),
    
    -- Renewal options
    number_of_options INTEGER,
    option_term_months INTEGER,
    option_notice_months INTEGER, -- Months notice required
    
    -- Termination
    early_termination_allowed BOOLEAN DEFAULT FALSE,
    termination_notice_months INTEGER,
    termination_penalty_amount NUMERIC(12,2),
    
    -- Security deposit
    security_deposit_amount NUMERIC(12,2),
    security_deposit_months NUMERIC(4,2), -- Months of rent
    
    -- Special provisions
    expansion_rights BOOLEAN DEFAULT FALSE,
    right_of_first_refusal BOOLEAN DEFAULT FALSE,
    exclusive_use_clause TEXT,
    co_tenancy_clause TEXT,
    radius_restriction TEXT,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 3: RENT & INCOME STREAMS
-- ============================================================================

-- Base rent schedule (may have steps/gradations)
CREATE TABLE tbl_cre_base_rent (
    base_rent_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    
    -- Period definition
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    period_number INTEGER,
    
    -- Rent amounts
    base_rent_annual NUMERIC(12,2),
    base_rent_monthly NUMERIC(12,2),
    base_rent_psf_annual NUMERIC(8,2), -- Per SF per year
    
    -- Rent type for this period
    rent_type VARCHAR(50), -- Fixed, Free, Percentage, Market
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rent escalations (CPI, fixed %, stepped)
CREATE TABLE tbl_cre_rent_escalation (
    escalation_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    
    escalation_type VARCHAR(50), -- Fixed Percentage, CPI, Fixed Dollar, Stepped
    
    -- Fixed percentage escalation
    escalation_pct NUMERIC(6,3), -- e.g., 3.000 for 3%
    escalation_frequency VARCHAR(20), -- Annual, Every 2 Years, Every 5 Years
    compound_escalation BOOLEAN DEFAULT TRUE,
    
    -- CPI-based escalation
    cpi_index VARCHAR(50), -- CPI-U, Regional CPI, etc.
    cpi_floor_pct NUMERIC(6,3), -- Minimum increase
    cpi_cap_pct NUMERIC(6,3), -- Maximum increase
    
    -- Fixed dollar escalation
    annual_increase_amount NUMERIC(10,2),
    
    -- Stepped escalation (predefined increases)
    step_schedule TEXT, -- JSON: [{year: 1, amount: 50000}, {year: 3, amount: 55000}]
    
    first_escalation_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Percentage rent (retail - based on tenant sales)
CREATE TABLE tbl_cre_percentage_rent (
    percentage_rent_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    
    -- Percentage rent structure
    breakpoint_amount NUMERIC(15,2), -- Natural or artificial breakpoint
    percentage_rate NUMERIC(6,3), -- e.g., 6.000 for 6% of sales over breakpoint
    
    -- Sales reporting
    reporting_frequency VARCHAR(20), -- Monthly, Quarterly, Annual
    reporting_deadline_days INTEGER, -- Days after period end
    
    -- Historical performance
    prior_year_sales NUMERIC(15,2),
    current_year_sales_projection NUMERIC(15,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rent concessions (free rent, TI allowances)
CREATE TABLE tbl_cre_rent_concession (
    concession_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    
    concession_type VARCHAR(50), -- Free Rent, Reduced Rent, TI Allowance, Moving Allowance
    
    -- Free/reduced rent
    free_rent_months NUMERIC(5,2),
    free_rent_start_date DATE,
    free_rent_end_date DATE,
    reduced_rent_amount NUMERIC(12,2),
    
    -- Tenant improvements
    ti_allowance_psf NUMERIC(8,2),
    ti_allowance_total NUMERIC(12,2),
    ti_work_letter TEXT, -- Description of landlord vs tenant responsibilities
    
    -- Other allowances
    moving_allowance NUMERIC(10,2),
    other_concession_amount NUMERIC(10,2),
    other_concession_description TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: OPERATING EXPENSES & RECOVERIES
-- ============================================================================

-- Operating expense structure (what expenses apply to property)
CREATE TABLE tbl_cre_operating_expense (
    operating_expense_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    expense_category VARCHAR(100), -- Property Taxes, Insurance, Management, CAM, Utilities, etc.
    expense_type VARCHAR(50), -- Fixed, Variable, Replacement Reserve
    
    -- Amount tracking
    budgeted_amount NUMERIC(12,2),
    actual_amount NUMERIC(12,2),
    amount_psf NUMERIC(8,2), -- Per rentable SF
    
    -- Growth assumptions
    annual_growth_rate NUMERIC(6,3),
    
    -- Recoverability
    recoverable BOOLEAN DEFAULT TRUE, -- Can this be passed to tenants?
    recovery_method VARCHAR(50), -- Pro-Rata, Direct Bill, Not Recovered
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Expense stop/base year (tenant's share cap)
CREATE TABLE tbl_cre_expense_stop (
    expense_stop_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    
    stop_type VARCHAR(50), -- Base Year, Fixed Dollar, None
    
    -- Base year method
    base_year INTEGER, -- e.g., 2025
    base_year_amount_psf NUMERIC(8,2),
    
    -- Fixed dollar stop
    expense_stop_psf NUMERIC(8,2),
    expense_stop_total NUMERIC(12,2),
    
    -- Which expenses are included in stop
    taxes_included BOOLEAN DEFAULT TRUE,
    insurance_included BOOLEAN DEFAULT TRUE,
    cam_included BOOLEAN DEFAULT TRUE,
    utilities_included BOOLEAN DEFAULT FALSE,
    
    -- Caps on increases
    annual_cap_pct NUMERIC(6,3), -- Max % increase per year
    cumulative_cap_pct NUMERIC(6,3), -- Max total increase over lease term
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Common Area Maintenance (CAM) charges
CREATE TABLE tbl_cre_cam_charge (
    cam_charge_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- CAM components
    janitorial NUMERIC(10,2),
    landscaping NUMERIC(10,2),
    snow_removal NUMERIC(10,2),
    parking_lot_maintenance NUMERIC(10,2),
    security NUMERIC(10,2),
    common_area_utilities NUMERIC(10,2),
    common_area_repairs NUMERIC(10,2),
    management_fee_on_cam NUMERIC(10,2),
    
    -- Totals
    total_cam_amount NUMERIC(12,2),
    total_cam_psf NUMERIC(8,2),
    
    -- Reconciliation
    budgeted_cam_psf NUMERIC(8,2),
    variance_psf NUMERIC(8,2),
    reconciliation_due_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant expense reimbursements
CREATE TABLE tbl_cre_expense_reimbursement (
    reimbursement_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- Reimbursement amounts by category
    property_tax_reimbursement NUMERIC(10,2),
    insurance_reimbursement NUMERIC(10,2),
    cam_reimbursement NUMERIC(10,2),
    utility_reimbursement NUMERIC(10,2),
    
    -- Total
    total_reimbursement NUMERIC(12,2),
    
    -- Calculation method
    tenant_pro_rata_share NUMERIC(6,4), -- Based on leased SF / total SF
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: LEASING COSTS
-- ============================================================================

-- Tenant improvement costs (build-out)
CREATE TABLE tbl_cre_tenant_improvement (
    ti_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    
    -- TI amounts
    landlord_ti_psf NUMERIC(8,2),
    landlord_ti_total NUMERIC(12,2),
    tenant_ti_contribution NUMERIC(12,2),
    
    -- Timing
    construction_start_date DATE,
    construction_completion_date DATE,
    
    -- Scope
    work_letter_included BOOLEAN DEFAULT FALSE,
    scope_description TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Leasing commissions
CREATE TABLE tbl_cre_leasing_commission (
    commission_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    
    -- Commission structure
    commission_type VARCHAR(50), -- Percentage of Rent, Fixed Amount, Tiered
    
    -- Percentage method
    commission_pct NUMERIC(6,3), -- e.g., 5.000 for 5% of total lease value
    base_for_calculation NUMERIC(15,2), -- Total lease value
    
    -- Tiered commission (different % for different years)
    year_1_pct NUMERIC(6,3),
    year_2_5_pct NUMERIC(6,3),
    year_6_plus_pct NUMERIC(6,3),
    
    -- Fixed amount
    fixed_commission_amount NUMERIC(12,2),
    
    -- Payment timing
    payment_timing VARCHAR(50), -- At Lease Execution, At Rent Commencement, Split
    upfront_payment_pct NUMERIC(6,3), -- % paid upfront
    deferred_payment_pct NUMERIC(6,3), -- % paid over time
    
    -- Broker info
    listing_broker VARCHAR(100),
    listing_broker_split_pct NUMERIC(6,3),
    tenant_broker VARCHAR(100),
    tenant_broker_split_pct NUMERIC(6,3),
    
    -- Calculated commission
    total_commission_amount NUMERIC(12,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Leasing legal fees
CREATE TABLE tbl_cre_leasing_legal (
    legal_fee_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES tbl_cre_lease(lease_id),
    
    landlord_legal_fee NUMERIC(10,2),
    tenant_legal_fee NUMERIC(10,2),
    
    fee_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 6: PROPERTY OPERATIONS & PERFORMANCE
-- ============================================================================

-- Vacancy tracking
CREATE TABLE tbl_cre_vacancy (
    vacancy_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- Physical vs economic vacancy
    physical_vacancy_sf NUMERIC(10,2),
    physical_vacancy_pct NUMERIC(6,3),
    
    economic_vacancy_sf NUMERIC(10,2), -- Includes free rent, concessions
    economic_vacancy_pct NUMERIC(6,3),
    
    -- Collection loss
    collection_loss_amount NUMERIC(10,2),
    collection_loss_pct NUMERIC(6,3),
    
    -- Total vacancy & collection loss
    total_vacancy_loss NUMERIC(12,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Absorption schedule (lease-up/stabilization)
CREATE TABLE tbl_cre_absorption (
    absorption_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- Absorption assumptions
    space_leased_sf NUMERIC(10,2),
    cumulative_occupied_sf NUMERIC(10,2),
    occupancy_pct NUMERIC(6,3),
    
    -- Market assumptions
    market_absorption_rate_sf_per_period NUMERIC(10,2),
    months_to_stabilization INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Net Operating Income (NOI) calculation
CREATE TABLE tbl_cre_noi (
    noi_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- Income components
    potential_gross_income NUMERIC(15,2), -- PGI
    vacancy_loss NUMERIC(12,2),
    collection_loss NUMERIC(10,2),
    effective_gross_income NUMERIC(15,2), -- EGI = PGI - Vacancy - Collection Loss
    
    -- Additional income
    expense_reimbursements NUMERIC(12,2),
    percentage_rent_income NUMERIC(10,2),
    parking_income NUMERIC(10,2),
    other_income NUMERIC(10,2),
    
    -- Total revenue
    total_revenue NUMERIC(15,2),
    
    -- Operating expenses
    total_operating_expenses NUMERIC(12,2),
    
    -- NOI
    net_operating_income NUMERIC(15,2), -- Total Revenue - Operating Expenses
    
    -- Per SF metrics
    noi_psf NUMERIC(8,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 7: VALUATION & RETURNS
-- ============================================================================

-- Capitalization rate analysis
CREATE TABLE tbl_cre_cap_rate (
    cap_rate_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    
    valuation_date DATE,
    valuation_type VARCHAR(50), -- In-Place, Stabilized, Market
    
    -- NOI used for valuation
    noi_amount NUMERIC(15,2),
    
    -- Cap rates
    going_in_cap_rate NUMERIC(6,4), -- At acquisition
    current_cap_rate NUMERIC(6,4), -- Based on current NOI
    terminal_cap_rate NUMERIC(6,4), -- Exit/reversion cap rate
    market_cap_rate NUMERIC(6,4), -- Comparable sales
    
    -- Valuation
    implied_value NUMERIC(15,2), -- NOI / Cap Rate
    value_per_sf NUMERIC(8,2),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cash flow and return metrics
CREATE TABLE tbl_cre_cash_flow (
    cash_flow_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- Operating cash flow
    net_operating_income NUMERIC(15,2),
    capital_expenditures NUMERIC(12,2),
    leasing_costs NUMERIC(12,2),
    cash_flow_before_debt NUMERIC(15,2), -- NOI - CapEx - Leasing Costs
    
    -- Debt service
    debt_service NUMERIC(12,2),
    cash_flow_after_debt NUMERIC(15,2),
    
    -- Metrics
    debt_service_coverage_ratio NUMERIC(6,3), -- NOI / Debt Service
    cash_on_cash_return NUMERIC(6,4), -- Cash Flow / Equity Invested
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- DCF analysis & IRR calculation
CREATE TABLE tbl_cre_dcf_analysis (
    dcf_analysis_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    
    analysis_name VARCHAR(100),
    analysis_date DATE,
    
    -- Hold period
    hold_period_years INTEGER,
    
    -- Discount rate
    discount_rate NUMERIC(6,4),
    
    -- Reversion/exit assumptions
    terminal_noi NUMERIC(15,2),
    terminal_cap_rate NUMERIC(6,4),
    reversion_value NUMERIC(15,2), -- Terminal NOI / Terminal Cap Rate
    selling_costs_pct NUMERIC(6,3),
    net_reversion NUMERIC(15,2),
    
    -- Investment metrics
    total_equity_invested NUMERIC(15,2),
    total_cash_flow_during_hold NUMERIC(15,2),
    
    -- Returns
    npv NUMERIC(15,2), -- Net Present Value
    irr NUMERIC(8,5), -- Internal Rate of Return
    equity_multiple NUMERIC(6,3), -- Total Cash Returned / Equity Invested
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stabilization tracking
CREATE TABLE tbl_cre_stabilization (
    stabilization_id SERIAL PRIMARY KEY,
    cre_property_id INTEGER REFERENCES tbl_cre_property(cre_property_id),
    
    -- Stabilization criteria
    target_occupancy_pct NUMERIC(6,3),
    target_noi_psf NUMERIC(8,2),
    target_months_of_trailing_performance INTEGER, -- e.g., 6 consecutive months at 95%+
    
    -- Actual stabilization
    is_stabilized BOOLEAN DEFAULT FALSE,
    stabilization_date DATE,
    actual_occupancy_at_stabilization NUMERIC(6,3),
    actual_noi_at_stabilization NUMERIC(15,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 8: VIEWS FOR REPORTING
-- ============================================================================

-- Rent roll view (current tenant list with lease details)
CREATE OR REPLACE VIEW vw_rent_roll AS
SELECT 
    p.property_name,
    s.space_number,
    s.rentable_sf,
    t.tenant_name,
    t.creditworthiness,
    l.lease_number,
    l.lease_commencement_date,
    l.lease_expiration_date,
    l.lease_term_months,
    br.base_rent_annual,
    br.base_rent_psf_annual,
    l.lease_status
FROM tbl_cre_lease l
JOIN tbl_cre_space s ON l.space_id = s.space_id
JOIN tbl_cre_property p ON s.cre_property_id = p.cre_property_id
JOIN tbl_cre_tenant t ON l.tenant_id = t.tenant_id
LEFT JOIN tbl_cre_base_rent br ON l.lease_id = br.lease_id
WHERE l.lease_status = 'Active'
ORDER BY p.property_name, s.space_number;

-- Property performance summary
CREATE OR REPLACE VIEW vw_property_performance AS
SELECT 
    p.property_name,
    p.property_type,
    p.rentable_sf,
    p.stabilized_occupancy_pct,
    n.potential_gross_income,
    n.effective_gross_income,
    n.total_operating_expenses,
    n.net_operating_income,
    n.noi_psf,
    c.current_cap_rate,
    c.implied_value,
    c.value_per_sf
FROM tbl_cre_property p
LEFT JOIN tbl_cre_noi n ON p.cre_property_id = n.cre_property_id
LEFT JOIN tbl_cre_cap_rate c ON p.cre_property_id = c.cre_property_id
ORDER BY p.property_name;

-- Lease expiration schedule
CREATE OR REPLACE VIEW vw_lease_expiration_schedule AS
SELECT 
    p.property_name,
    t.tenant_name,
    s.space_number,
    l.leased_sf,
    l.lease_expiration_date,
    EXTRACT(YEAR FROM l.lease_expiration_date) AS expiration_year,
    br.base_rent_annual,
    br.base_rent_psf_annual,
    l.number_of_options,
    CASE 
        WHEN l.lease_expiration_date < CURRENT_DATE THEN 'Expired'
        WHEN l.lease_expiration_date < CURRENT_DATE + INTERVAL '12 months' THEN 'Expires Within 1 Year'
        WHEN l.lease_expiration_date < CURRENT_DATE + INTERVAL '24 months' THEN 'Expires Within 2 Years'
        ELSE 'Expires Beyond 2 Years'
    END AS expiration_category
FROM tbl_cre_lease l
JOIN tbl_cre_space s ON l.space_id = s.space_id
JOIN tbl_cre_property p ON s.cre_property_id = p.cre_property_id
JOIN tbl_cre_tenant t ON l.tenant_id = t.tenant_id
LEFT JOIN tbl_cre_base_rent br ON l.lease_id = br.lease_id
WHERE l.lease_status = 'Active'
ORDER BY l.lease_expiration_date;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Property indexes
CREATE INDEX idx_cre_property_project ON tbl_cre_property(project_id);
CREATE INDEX idx_cre_property_status ON tbl_cre_property(property_status);
CREATE INDEX idx_cre_property_type ON tbl_cre_property(property_type);

-- Space indexes
CREATE INDEX idx_cre_space_property ON tbl_cre_space(cre_property_id);
CREATE INDEX idx_cre_space_status ON tbl_cre_space(space_status);

-- Lease indexes
CREATE INDEX idx_cre_lease_property ON tbl_cre_lease(cre_property_id);
CREATE INDEX idx_cre_lease_tenant ON tbl_cre_lease(tenant_id);
CREATE INDEX idx_cre_lease_status ON tbl_cre_lease(lease_status);
CREATE INDEX idx_cre_lease_expiration ON tbl_cre_lease(lease_expiration_date);

-- Tenant indexes
CREATE INDEX idx_cre_tenant_name ON tbl_cre_tenant(tenant_name);
CREATE INDEX idx_cre_tenant_credit ON tbl_cre_tenant(creditworthiness);

-- NOI indexes
CREATE INDEX idx_cre_noi_property_period ON tbl_cre_noi(cre_property_id, period_id);

-- Cash flow indexes
CREATE INDEX idx_cre_cash_flow_property_period ON tbl_cre_cash_flow(cre_property_id, period_id);

-- ============================================================================
-- COMMENTS/DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tbl_cre_property IS 'Core commercial property attributes - links to project/parcel hierarchy';
COMMENT ON TABLE tbl_cre_space IS 'Individual rentable spaces/suites within a property';
COMMENT ON TABLE tbl_cre_tenant IS 'Tenant/lessee information including credit profile';
COMMENT ON TABLE tbl_cre_lease IS 'Master lease record with terms, dates, and options';
COMMENT ON TABLE tbl_cre_base_rent IS 'Base rent schedule with steps/gradations over lease term';
COMMENT ON TABLE tbl_cre_rent_escalation IS 'Rent escalation provisions (CPI, fixed %, stepped)';
COMMENT ON TABLE tbl_cre_percentage_rent IS 'Percentage rent for retail tenants based on sales';
COMMENT ON TABLE tbl_cre_rent_concession IS 'Rent concessions (free rent, TI allowances, etc.)';
COMMENT ON TABLE tbl_cre_operating_expense IS 'Property operating expenses by category and period';
COMMENT ON TABLE tbl_cre_expense_stop IS 'Expense stop/base year provisions for each lease';
COMMENT ON TABLE tbl_cre_cam_charge IS 'Common Area Maintenance charges and reconciliation';
COMMENT ON TABLE tbl_cre_expense_reimbursement IS 'Tenant expense reimbursements (NNN, modified gross)';
COMMENT ON TABLE tbl_cre_tenant_improvement IS 'Tenant improvement costs and scope';
COMMENT ON TABLE tbl_cre_leasing_commission IS 'Broker commissions for new leases and renewals';
COMMENT ON TABLE tbl_cre_leasing_legal IS 'Legal fees for lease execution';
COMMENT ON TABLE tbl_cre_vacancy IS 'Physical and economic vacancy tracking';
COMMENT ON TABLE tbl_cre_absorption IS 'Lease-up/absorption schedule during stabilization';
COMMENT ON TABLE tbl_cre_noi IS 'Net Operating Income calculation by period';
COMMENT ON TABLE tbl_cre_cap_rate IS 'Capitalization rate analysis and valuation';
COMMENT ON TABLE tbl_cre_cash_flow IS 'Operating cash flow and debt service coverage';
COMMENT ON TABLE tbl_cre_dcf_analysis IS 'Discounted cash flow analysis and IRR calculation';
COMMENT ON TABLE tbl_cre_stabilization IS 'Property stabilization criteria and tracking';

-- ============================================================================
-- END OF CRE PROFORMA SCHEMA
-- ============================================================================
