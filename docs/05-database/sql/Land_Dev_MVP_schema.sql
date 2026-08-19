-- ============================================================================
-- LAND DEVELOPMENT MVP SCHEMA - Revenue & Finance Tables
-- ============================================================================
-- Purpose: Close the gap in current Neon schema to achieve ARGUS parity for
--          master-planned community cash flow generation
--
-- Current Status: Neon schema has ~75% ARGUS cost parity but only ~20% revenue
--                 parity. These tables add the missing revenue/finance layer.
--
-- What We Already Have:
--   ✅ land_use_pricing - Base pricing by land use type
--   ✅ tbl_budget_structure & tbl_budget_items - Cost structure
--   ✅ tbl_acquisition - Land acquisition tracking
--   ✅ core_fin_funding_source - Debt/equity sources
--   ✅ tbl_calculation_period - Period definitions
--
-- What This Adds (5 tables for MVP):
--   1. tbl_absorption_schedule - WHEN lots/units sell (period-by-period)
--   2. tbl_sales_commission - Broker fee structure
--   3. tbl_debt_facility - Loan terms, rates, covenants
--   4. tbl_debt_draw_schedule - Period-by-period debt draws
--   5. tbl_equity_distribution - Capital calls, returns, waterfall
--
-- Related Schema: ../sql/CRE_proforma_schema.sql contains ~30 tables for 
--                 commercial income properties (Phase 2+). This MVP schema 
--                 focuses on land development only.
--
-- Integration: These tables integrate with existing hierarchy:
--              tbl_project → tbl_area → tbl_phase → tbl_parcel
--
-- Date: 2025-09-30
-- ============================================================================

-- ============================================================================
-- TABLE 1: ABSORPTION SCHEDULE
-- ============================================================================
-- Purpose: Define WHEN lots/units sell over time. This is the critical link
--          between pricing and cash flow - absorption pace drives everything.
--
-- Key Insight: Slower absorption = higher carry costs = lower land values
--              This table enables "what-if" scenarios on sales velocity
-- ============================================================================

CREATE TABLE tbl_absorption_schedule (
    absorption_id SERIAL PRIMARY KEY,
    
    -- Hierarchy links
    project_id INTEGER REFERENCES tbl_project(project_id),
    parcel_id INTEGER REFERENCES tbl_parcel(parcel_id), -- Can be project-level or parcel-level
    phase_id INTEGER REFERENCES tbl_phase(phase_id), -- Optional: phase-specific absorption
    
    -- Period reference
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- Land use specificity
    lu_type_code VARCHAR(20), -- Optional: absorption by land use type
    product_code VARCHAR(50), -- Optional: absorption by specific product (e.g., 50' lots vs 60' lots)
    
    -- Absorption data
    units_sold INTEGER, -- Number of lots/units sold in this period
    cumulative_units_sold INTEGER, -- Running total
    units_remaining INTEGER, -- Inventory remaining after this period
    
    -- Pricing in this period (may differ from base pricing due to escalation)
    average_price_per_unit NUMERIC(12,2),
    total_revenue NUMERIC(15,2), -- units_sold * average_price_per_unit
    
    -- Market assumptions
    absorption_rate_per_month NUMERIC(8,2), -- Average monthly pace in this period
    months_of_inventory NUMERIC(8,2), -- Remaining units / absorption rate
    
    -- Scenario analysis
    scenario_name VARCHAR(100), -- "Base Case", "Optimistic", "Conservative", etc.
    probability_weight NUMERIC(5,4), -- For weighted average scenarios (0.0000 to 1.0000)
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_absorption_project_period ON tbl_absorption_schedule(project_id, period_id);
CREATE INDEX idx_absorption_parcel ON tbl_absorption_schedule(parcel_id);
CREATE INDEX idx_absorption_phase ON tbl_absorption_schedule(phase_id);
CREATE INDEX idx_absorption_scenario ON tbl_absorption_schedule(scenario_name);
CREATE INDEX idx_absorption_lu_type ON tbl_absorption_schedule(lu_type_code);

COMMENT ON TABLE tbl_absorption_schedule IS 'Period-by-period lot/unit sales schedule - drives revenue cash flow. Critical for master plan modeling where absorption pace affects all downstream values.';

-- ============================================================================
-- TABLE 2: SALES COMMISSION
-- ============================================================================
-- Purpose: Define broker fees and sales costs. Can be % of sales, flat fee,
--          tiered by volume, or split between upfront and deferred payment.
-- ============================================================================

CREATE TABLE tbl_sales_commission (
    commission_id SERIAL PRIMARY KEY,
    
    -- Hierarchy links
    project_id INTEGER REFERENCES tbl_project(project_id),
    parcel_id INTEGER REFERENCES tbl_parcel(parcel_id), -- Optional: parcel-specific commission
    
    -- Commission structure
    commission_type VARCHAR(50), -- "Percentage", "Flat Fee", "Tiered", "Per Unit"
    
    -- Percentage method
    commission_pct NUMERIC(6,3), -- e.g., 5.000 for 5% of sales revenue
    applies_to VARCHAR(50), -- "Gross Sales", "Net Sales", "Base Price Only"
    
    -- Flat fee method
    flat_fee_amount NUMERIC(12,2),
    
    -- Per unit method
    per_unit_amount NUMERIC(10,2), -- Fixed $ per lot/unit sold
    
    -- Tiered commission (volume-based)
    tier_1_units INTEGER, -- First X units
    tier_1_pct NUMERIC(6,3),
    tier_2_units INTEGER, -- Next Y units
    tier_2_pct NUMERIC(6,3),
    tier_3_units INTEGER, -- Remaining units
    tier_3_pct NUMERIC(6,3),
    
    -- Payment timing
    payment_timing VARCHAR(50), -- "At Sale", "At Close", "Deferred", "Split"
    upfront_pct NUMERIC(6,3), -- % paid at sale/close
    deferred_pct NUMERIC(6,3), -- % paid over time
    deferral_months INTEGER, -- Number of months to defer payment
    
    -- Broker split
    listing_broker VARCHAR(100),
    listing_split_pct NUMERIC(6,3), -- % of total commission
    selling_broker VARCHAR(100),
    selling_split_pct NUMERIC(6,3), -- % of total commission
    
    -- Co-op commission (if developer pays buyer's broker)
    coop_commission_pct NUMERIC(6,3),
    
    -- Additional sales costs
    marketing_fund_pct NUMERIC(6,3), -- % for marketing/advertising
    closing_costs_per_unit NUMERIC(8,2), -- Legal, title, etc.
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_commission_project ON tbl_sales_commission(project_id);
CREATE INDEX idx_commission_parcel ON tbl_sales_commission(parcel_id);

COMMENT ON TABLE tbl_sales_commission IS 'Broker commission structure and sales costs. Supports percentage, flat fee, tiered, and split payment timing to model real-world commission agreements.';

-- ============================================================================
-- TABLE 3: DEBT FACILITY
-- ============================================================================
-- Purpose: Define loan terms, rates, covenants. Master-planned developments
--          typically use multiple debt facilities (land loan, development loan,
--          construction loan) with different terms and draw schedules.
-- ============================================================================

CREATE TABLE tbl_debt_facility (
    facility_id SERIAL PRIMARY KEY,
    
    -- Project link
    project_id INTEGER REFERENCES tbl_project(project_id),
    
    -- Links to existing finance structure
    funding_source_id INTEGER REFERENCES core_fin_funding_source(source_id),
    
    -- Facility identification
    facility_name VARCHAR(200), -- "Land Acquisition Loan", "Development Line of Credit", etc.
    facility_type VARCHAR(50), -- "Term Loan", "Line of Credit", "Construction Loan", "Mezzanine"
    lender_name VARCHAR(200),
    
    -- Loan terms
    commitment_amount NUMERIC(15,2), -- Total loan commitment
    initial_funding_date DATE,
    maturity_date DATE,
    term_months INTEGER,
    
    -- Interest rate structure
    rate_type VARCHAR(50), -- "Fixed", "Floating", "Hybrid"
    
    -- Fixed rate
    fixed_rate_pct NUMERIC(6,4), -- e.g., 7.5000 for 7.50%
    
    -- Floating rate
    index_rate VARCHAR(50), -- "SOFR", "Prime", "LIBOR" (legacy), "WSJ Prime"
    spread_bps INTEGER, -- Basis points over index (e.g., 275 for 2.75%)
    rate_floor_pct NUMERIC(6,4), -- Minimum rate
    rate_cap_pct NUMERIC(6,4), -- Maximum rate
    
    -- Hybrid rate (fixed for initial period, then floating)
    fixed_period_months INTEGER,
    
    -- Fees
    origination_fee_pct NUMERIC(6,3), -- % of commitment amount
    origination_fee_amount NUMERIC(12,2), -- Or fixed amount
    unused_fee_pct NUMERIC(6,3), -- Annual fee on unused portion
    exit_fee_pct NUMERIC(6,3), -- Fee at payoff
    
    -- Loan-to-Value (LTV) and Loan-to-Cost (LTC)
    ltv_pct NUMERIC(6,3), -- Maximum loan as % of appraised value
    ltc_pct NUMERIC(6,3), -- Maximum loan as % of total project cost
    
    -- Debt service requirements
    interest_only_months INTEGER, -- Initial IO period before amortization
    amortization_months INTEGER, -- Amortization period (may exceed term)
    payment_frequency VARCHAR(20), -- "Monthly", "Quarterly", "Annual"
    
    -- Covenants and requirements
    debt_service_coverage_required NUMERIC(6,3), -- Minimum DSCR (e.g., 1.250 for 1.25x)
    presale_requirement_pct NUMERIC(6,3), -- % of units that must be presold
    minimum_equity_pct NUMERIC(6,3), -- Required equity contribution
    
    -- Draw mechanics
    max_draw_pct_per_period NUMERIC(6,3), -- Maximum % of commitment per draw
    inspection_required BOOLEAN DEFAULT TRUE,
    title_insurance_required BOOLEAN DEFAULT TRUE,
    personal_guarantee_required BOOLEAN DEFAULT FALSE,
    
    -- Recourse
    recourse_type VARCHAR(50), -- "Full Recourse", "Non-Recourse", "Carve-Out"
    
    -- Prepayment
    prepayment_allowed BOOLEAN DEFAULT TRUE,
    prepayment_penalty_pct NUMERIC(6,3),
    lockout_months INTEGER, -- Period when prepayment not allowed
    
    -- Extension options
    extension_available BOOLEAN DEFAULT FALSE,
    extension_months INTEGER,
    extension_fee_pct NUMERIC(6,3),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_debt_project ON tbl_debt_facility(project_id);
CREATE INDEX idx_debt_funding_source ON tbl_debt_facility(funding_source_id);
CREATE INDEX idx_debt_type ON tbl_debt_facility(facility_type);
CREATE INDEX idx_debt_lender ON tbl_debt_facility(lender_name);

COMMENT ON TABLE tbl_debt_facility IS 'Detailed loan terms including interest rates, fees, covenants, and draw mechanics. Supports both fixed and floating rate structures common in land development.';

-- ============================================================================
-- TABLE 4: DEBT DRAW SCHEDULE
-- ============================================================================
-- Purpose: Period-by-period debt draws and repayments. Land development debt
--          is typically drawn as costs are incurred, not all upfront. This
--          table tracks the timing of draws and calculates interest expense.
-- ============================================================================

CREATE TABLE tbl_debt_draw_schedule (
    draw_id SERIAL PRIMARY KEY,
    
    facility_id INTEGER REFERENCES tbl_debt_facility(facility_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- Draw information
    draw_number INTEGER, -- Sequential draw number
    draw_date DATE,
    draw_amount NUMERIC(12,2),
    cumulative_drawn NUMERIC(15,2), -- Total drawn to date
    outstanding_balance NUMERIC(15,2), -- Current loan balance
    
    -- Repayment (if applicable)
    principal_payment NUMERIC(12,2),
    
    -- Interest calculation
    interest_rate_pct NUMERIC(6,4), -- Rate in effect for this period
    interest_expense NUMERIC(12,2), -- Interest due this period
    interest_paid NUMERIC(12,2), -- Interest actually paid (may differ if deferred)
    deferred_interest NUMERIC(12,2), -- Unpaid interest added to balance
    
    -- Fees charged this period
    unused_fee_charge NUMERIC(10,2),
    other_fees NUMERIC(10,2),
    
    -- Availability
    commitment_amount NUMERIC(15,2), -- Total commitment
    available_to_draw NUMERIC(15,2), -- Remaining capacity
    
    -- Draw purpose/allocation
    draw_purpose VARCHAR(200), -- "Land Acquisition", "Infrastructure", "Horizontal Improvements"
    
    -- Approval/inspection
    draw_status VARCHAR(50), -- "Requested", "Approved", "Funded", "Rejected"
    inspector_approval_date DATE,
    lender_approval_date DATE,
    funding_date DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_draw_facility_period ON tbl_debt_draw_schedule(facility_id, period_id);
CREATE INDEX idx_draw_date ON tbl_debt_draw_schedule(draw_date);
CREATE INDEX idx_draw_status ON tbl_debt_draw_schedule(draw_status);

COMMENT ON TABLE tbl_debt_draw_schedule IS 'Period-by-period debt draws and interest expense. Critical for accurate cash flow modeling as interest is only paid on drawn amounts, not total commitment.';

-- ============================================================================
-- TABLE 5: EQUITY DISTRIBUTION
-- ============================================================================
-- Purpose: Track equity capital calls and distributions. Land development
--          often involves multiple equity partners with preferred returns,
--          promotes, and waterfall structures. This table models the equity
--          side of the capital stack.
-- ============================================================================

CREATE TABLE tbl_equity_distribution (
    distribution_id SERIAL PRIMARY KEY,
    
    project_id INTEGER REFERENCES tbl_project(project_id),
    period_id INTEGER REFERENCES tbl_calculation_period(period_id),
    
    -- Links to existing finance structure
    funding_source_id INTEGER REFERENCES core_fin_funding_source(source_id),
    
    -- Transaction type
    transaction_type VARCHAR(50), -- "Capital Call", "Distribution", "Return of Capital", "Promote"
    
    -- Capital call details
    capital_call_amount NUMERIC(12,2),
    capital_call_due_date DATE,
    capital_call_purpose TEXT, -- "Land Acquisition", "Phase 1 Infrastructure", etc.
    
    -- Distribution details
    distribution_amount NUMERIC(12,2),
    distribution_date DATE,
    distribution_source VARCHAR(50), -- "Operating Cash Flow", "Sale Proceeds", "Refinancing"
    
    -- Return calculations
    cumulative_capital_contributed NUMERIC(15,2),
    cumulative_distributions_received NUMERIC(15,2),
    unreturned_capital NUMERIC(15,2), -- Capital not yet returned
    
    -- Preferred return tracking
    preferred_return_pct NUMERIC(6,4), -- Annual preferred return rate
    accrued_preferred_return NUMERIC(12,2), -- Unpaid preferred return
    preferred_return_paid_this_period NUMERIC(12,2),
    
    -- Waterfall/promote structure
    waterfall_tier VARCHAR(50), -- "Tier 1: Return of Capital", "Tier 2: Preferred Return", etc.
    promote_pct NUMERIC(6,3), -- % of profits above hurdle going to sponsor
    hurdle_rate_pct NUMERIC(6,4), -- IRR hurdle for promote
    
    -- Partner allocation
    partner_name VARCHAR(200),
    ownership_pct NUMERIC(6,4), -- % ownership in this tier
    amount_allocated_to_partner NUMERIC(12,2),
    
    -- Metrics
    current_irr NUMERIC(8,5), -- Current project IRR
    equity_multiple NUMERIC(6,3), -- Total distributions / Total invested
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_equity_project_period ON tbl_equity_distribution(project_id, period_id);
CREATE INDEX idx_equity_funding_source ON tbl_equity_distribution(funding_source_id);
CREATE INDEX idx_equity_transaction_type ON tbl_equity_distribution(transaction_type);
CREATE INDEX idx_equity_partner ON tbl_equity_distribution(partner_name);

COMMENT ON TABLE tbl_equity_distribution IS 'Equity capital calls and distributions including preferred returns and promote structures. Essential for modeling JV structures and investor returns.';

-- ============================================================================
-- VIEWS FOR CASH FLOW GENERATION
-- ============================================================================

-- Revenue cash flow view
CREATE OR REPLACE VIEW vw_revenue_cash_flow AS
SELECT 
    a.project_id,
    a.parcel_id,
    a.period_id,
    cp.period_start,
    cp.period_end,
    a.units_sold,
    a.average_price_per_unit,
    a.total_revenue AS gross_revenue,
    
    -- Sales commissions
    CASE 
        WHEN sc.commission_type = 'Percentage' THEN a.total_revenue * (sc.commission_pct / 100)
        WHEN sc.commission_type = 'Per Unit' THEN a.units_sold * sc.per_unit_amount
        WHEN sc.commission_type = 'Flat Fee' THEN sc.flat_fee_amount
        ELSE 0
    END AS sales_commission,
    
    -- Net revenue after commissions
    a.total_revenue - COALESCE(
        CASE 
            WHEN sc.commission_type = 'Percentage' THEN a.total_revenue * (sc.commission_pct / 100)
            WHEN sc.commission_type = 'Per Unit' THEN a.units_sold * sc.per_unit_amount
            WHEN sc.commission_type = 'Flat Fee' THEN sc.flat_fee_amount
            ELSE 0
        END, 0
    ) AS net_revenue,
    
    a.scenario_name
FROM tbl_absorption_schedule a
JOIN tbl_calculation_period cp ON a.period_id = cp.period_id
LEFT JOIN tbl_sales_commission sc ON a.project_id = sc.project_id 
    AND (sc.parcel_id IS NULL OR sc.parcel_id = a.parcel_id)
ORDER BY a.project_id, a.period_id;

-- Debt service view
CREATE OR REPLACE VIEW vw_debt_service AS
SELECT 
    dds.facility_id,
    df.project_id,
    df.facility_name,
    dds.period_id,
    cp.period_start,
    cp.period_end,
    dds.draw_amount,
    dds.principal_payment,
    dds.interest_expense,
    dds.interest_paid,
    dds.unused_fee_charge,
    dds.other_fees,
    (COALESCE(dds.principal_payment, 0) + 
     COALESCE(dds.interest_paid, 0) + 
     COALESCE(dds.unused_fee_charge, 0) + 
     COALESCE(dds.other_fees, 0)) AS total_debt_service,
    dds.outstanding_balance
FROM tbl_debt_draw_schedule dds
JOIN tbl_debt_facility df ON dds.facility_id = df.facility_id
JOIN tbl_calculation_period cp ON dds.period_id = cp.period_id
ORDER BY df.project_id, dds.period_id;

-- Equity cash flow view
CREATE OR REPLACE VIEW vw_equity_cash_flow AS
SELECT 
    project_id,
    period_id,
    partner_name,
    SUM(CASE WHEN transaction_type = 'Capital Call' THEN capital_call_amount ELSE 0 END) AS capital_calls,
    SUM(CASE WHEN transaction_type IN ('Distribution', 'Return of Capital', 'Promote') 
        THEN distribution_amount ELSE 0 END) AS distributions,
    SUM(CASE WHEN transaction_type = 'Capital Call' THEN capital_call_amount ELSE 0 END) -
    SUM(CASE WHEN transaction_type IN ('Distribution', 'Return of Capital', 'Promote') 
        THEN distribution_amount ELSE 0 END) AS net_equity_cash_flow
FROM tbl_equity_distribution
GROUP BY project_id, period_id, partner_name
ORDER BY project_id, period_id;

-- ============================================================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================================================

-- Sample: Revenue by period
/*
SELECT 
    period_start,
    period_end,
    SUM(units_sold) AS total_units_sold,
    SUM(gross_revenue) AS total_revenue,
    SUM(sales_commission) AS total_commissions,
    SUM(net_revenue) AS net_revenue
FROM vw_revenue_cash_flow
WHERE project_id = 1
    AND scenario_name = 'Base Case'
GROUP BY period_start, period_end
ORDER BY period_start;
*/

-- Sample: Total debt service by period
/*
SELECT 
    period_start,
    period_end,
    SUM(draw_amount) AS total_draws,
    SUM(interest_expense) AS total_interest,
    SUM(total_debt_service) AS total_debt_service
FROM vw_debt_service
WHERE project_id = 1
GROUP BY period_start, period_end
ORDER BY period_start;
*/

-- Sample: Equity contributions vs distributions
/*
SELECT 
    period_id,
    partner_name,
    capital_calls,
    distributions,
    net_equity_cash_flow
FROM vw_equity_cash_flow
WHERE project_id = 1
ORDER BY period_id, partner_name;
*/

-- ============================================================================
-- INTEGRATION NOTES
-- ============================================================================
/*
INTEGRATION WITH EXISTING SCHEMA:

1. Revenue Flow:
   land_use_pricing (base prices) 
   → tbl_absorption_schedule (timing + escalated prices)
   → tbl_sales_commission (deduct commissions)
   → vw_revenue_cash_flow (net revenue by period)

2. Cost Flow:
   tbl_budget_items (line item costs)
   → tbl_budget_timing (timing)
   → core_fin_fact_budget (with escalation)
   → [Need to build cost cash flow view]

3. Debt Flow:
   core_fin_funding_source (debt sources)
   → tbl_debt_facility (terms)
   → tbl_debt_draw_schedule (period-by-period)
   → vw_debt_service (total debt service by period)

4. Equity Flow:
   core_fin_funding_source (equity sources)
   → tbl_equity_distribution (calls + distributions)
   → vw_equity_cash_flow (net equity cash flow by period)

5. Master Cash Flow:
   Combine: Revenue - Costs - Debt Service +/- Equity = Net Cash Flow
   [Need to build master cash flow view that ties everything together]

NEXT STEPS FOR FULL CASH FLOW:
- Create vw_cost_cash_flow (from existing budget tables)
- Create vw_master_cash_flow (combines all sources/uses)
- Add IRR/NPV calculation functions
- Build cash flow waterfall report
*/

-- ============================================================================
-- END OF LAND DEVELOPMENT MVP SCHEMA
-- ============================================================================
