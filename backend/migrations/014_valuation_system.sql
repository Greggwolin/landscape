-- Migration: 014_valuation_system
-- Description: Create tables for comprehensive property valuation system
-- Date: 2025-10-26
-- Dependencies: 013_project_contacts_system.sql

-- ============================================================================
-- SALES COMPARISON APPROACH TABLES
-- ============================================================================

-- Sales Comparables
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comparables (
    comparable_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    comp_number INTEGER,
    property_name VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    sale_date DATE,
    sale_price NUMERIC(15,2),
    price_per_unit NUMERIC(10,2),
    price_per_sf NUMERIC(10,2),
    year_built INTEGER,
    units INTEGER,
    building_sf INTEGER,
    cap_rate NUMERIC(5,4),
    grm NUMERIC(6,2),
    distance_from_subject VARCHAR(50),
    unit_mix JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_cap_rate CHECK (cap_rate IS NULL OR (cap_rate >= 0.01 AND cap_rate <= 0.15)),
    CONSTRAINT check_price_per_unit CHECK (price_per_unit IS NULL OR price_per_unit > 100000)
);

CREATE INDEX idx_sales_comparables_project ON landscape.tbl_sales_comparables(project_id);
CREATE INDEX idx_sales_comparables_sale_date ON landscape.tbl_sales_comparables(sale_date DESC);

COMMENT ON TABLE landscape.tbl_sales_comparables IS 'Comparable sales for Sales Comparison Approach valuation';
COMMENT ON COLUMN landscape.tbl_sales_comparables.comp_number IS 'Comparable number (1, 2, 3, etc.) for sorting';
COMMENT ON COLUMN landscape.tbl_sales_comparables.cap_rate IS 'Capitalization rate (0.01-0.15 representing 1%-15%)';
COMMENT ON COLUMN landscape.tbl_sales_comparables.unit_mix IS 'JSON object with unit type distribution (e.g., {"studio": {"count": 10, "percentage": 0.10}})';

-- Sales Comp Adjustments
CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_adjustments (
    adjustment_id SERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL,
    adjustment_pct NUMERIC(6,3),
    adjustment_amount NUMERIC(12,2),
    justification TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_adjustment_type CHECK (adjustment_type IN ('location', 'physical_age', 'physical_condition', 'physical_unit_mix', 'market_conditions', 'financing', 'other'))
);

CREATE INDEX idx_sales_comp_adjustments_comparable ON landscape.tbl_sales_comp_adjustments(comparable_id);

COMMENT ON TABLE landscape.tbl_sales_comp_adjustments IS 'Adjustments applied to sales comparables';
COMMENT ON COLUMN landscape.tbl_sales_comp_adjustments.adjustment_type IS 'Type of adjustment: location, physical_age, physical_condition, physical_unit_mix, market_conditions, financing, other';
COMMENT ON COLUMN landscape.tbl_sales_comp_adjustments.adjustment_pct IS 'Percentage adjustment (e.g., -0.20 for -20%)';

-- ============================================================================
-- COST APPROACH TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_cost_approach (
    cost_approach_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Land Value
    land_valuation_method VARCHAR(50),
    land_area_sf NUMERIC(12,2),
    land_value_per_sf NUMERIC(10,2),
    total_land_value NUMERIC(15,2),

    -- Replacement Cost
    cost_method VARCHAR(50),
    building_area_sf NUMERIC(12,2),
    cost_per_sf NUMERIC(10,2),
    base_replacement_cost NUMERIC(15,2),
    entrepreneurial_incentive_pct NUMERIC(5,2),
    total_replacement_cost NUMERIC(15,2),

    -- Depreciation
    physical_curable NUMERIC(12,2),
    physical_incurable_short NUMERIC(12,2),
    physical_incurable_long NUMERIC(12,2),
    functional_curable NUMERIC(12,2),
    functional_incurable NUMERIC(12,2),
    external_obsolescence NUMERIC(12,2),
    total_depreciation NUMERIC(15,2),
    depreciated_improvements NUMERIC(15,2),

    -- Site Improvements
    site_improvements_cost NUMERIC(12,2),
    site_improvements_description TEXT,

    -- Result
    indicated_value NUMERIC(15,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT check_land_method CHECK (land_valuation_method IN ('sales_comparison', 'allocation', 'extraction', 'other')),
    CONSTRAINT check_cost_method CHECK (cost_method IN ('comparative_unit', 'unit_in_place', 'quantity_survey', 'marshall_swift', 'other'))
);

CREATE UNIQUE INDEX idx_cost_approach_project ON landscape.tbl_cost_approach(project_id);

COMMENT ON TABLE landscape.tbl_cost_approach IS 'Cost Approach valuation methodology';
COMMENT ON COLUMN landscape.tbl_cost_approach.land_valuation_method IS 'Method used to value land: sales_comparison, allocation, extraction, other';
COMMENT ON COLUMN landscape.tbl_cost_approach.cost_method IS 'Method used to estimate replacement cost: comparative_unit, unit_in_place, quantity_survey, marshall_swift, other';

-- ============================================================================
-- INCOME APPROACH TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_income_approach (
    income_approach_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Direct Capitalization
    market_cap_rate_method VARCHAR(50),
    selected_cap_rate NUMERIC(5,4),
    cap_rate_justification TEXT,
    direct_cap_value NUMERIC(15,2),

    -- DCF (optional, links to existing tbl_cre_dcf_analysis)
    forecast_period_years INTEGER,
    terminal_cap_rate NUMERIC(5,4),
    discount_rate NUMERIC(5,4),
    dcf_value NUMERIC(15,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT check_cap_rate_method CHECK (market_cap_rate_method IN ('comp_sales', 'band_investment', 'investor_survey', 'other')),
    CONSTRAINT check_selected_cap_rate CHECK (selected_cap_rate IS NULL OR (selected_cap_rate >= 0.01 AND selected_cap_rate <= 0.15)),
    CONSTRAINT check_terminal_cap_rate CHECK (terminal_cap_rate IS NULL OR (terminal_cap_rate >= 0.01 AND terminal_cap_rate <= 0.15))
);

CREATE UNIQUE INDEX idx_income_approach_project ON landscape.tbl_income_approach(project_id);

COMMENT ON TABLE landscape.tbl_income_approach IS 'Income Approach valuation methodology';
COMMENT ON COLUMN landscape.tbl_income_approach.market_cap_rate_method IS 'Method for determining market cap rate: comp_sales, band_investment, investor_survey, other';

-- Cap Rate Comps (supporting data)
CREATE TABLE IF NOT EXISTS landscape.tbl_cap_rate_comps (
    cap_rate_comp_id SERIAL PRIMARY KEY,
    income_approach_id INTEGER REFERENCES landscape.tbl_income_approach(income_approach_id) ON DELETE CASCADE,
    property_address VARCHAR(255),
    sale_price NUMERIC(15,2),
    noi NUMERIC(12,2),
    implied_cap_rate NUMERIC(5,4),
    sale_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cap_rate_comps_income_approach ON landscape.tbl_cap_rate_comps(income_approach_id);

COMMENT ON TABLE landscape.tbl_cap_rate_comps IS 'Supporting cap rate comparables for Income Approach';

-- ============================================================================
-- VALUATION RECONCILIATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_valuation_reconciliation (
    reconciliation_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    sales_comparison_value NUMERIC(15,2),
    sales_comparison_weight NUMERIC(4,2),

    cost_approach_value NUMERIC(15,2),
    cost_approach_weight NUMERIC(4,2),

    income_approach_value NUMERIC(15,2),
    income_approach_weight NUMERIC(4,2),

    final_reconciled_value NUMERIC(15,2),
    reconciliation_narrative TEXT,
    valuation_date DATE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT check_weights_sum CHECK (
        COALESCE(sales_comparison_weight, 0) +
        COALESCE(cost_approach_weight, 0) +
        COALESCE(income_approach_weight, 0) <= 1.01
    )
);

CREATE UNIQUE INDEX idx_valuation_reconciliation_project ON landscape.tbl_valuation_reconciliation(project_id);

COMMENT ON TABLE landscape.tbl_valuation_reconciliation IS 'Final reconciliation of three approaches to value';
COMMENT ON COLUMN landscape.tbl_valuation_reconciliation.sales_comparison_weight IS 'Weight given to sales comparison approach (0.00-1.00)';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_comparables_updated_at
    BEFORE UPDATE ON landscape.tbl_sales_comparables
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

CREATE TRIGGER update_cost_approach_updated_at
    BEFORE UPDATE ON landscape.tbl_cost_approach
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

CREATE TRIGGER update_income_approach_updated_at
    BEFORE UPDATE ON landscape.tbl_income_approach
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

CREATE TRIGGER update_valuation_reconciliation_updated_at
    BEFORE UPDATE ON landscape.tbl_valuation_reconciliation
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to application role (adjust based on your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA landscape TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA landscape TO app_user;
