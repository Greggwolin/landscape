-- ============================================================================
-- Migration 040: Multifamily Cash Flow Adapter Supporting Tables
-- Date: 2025-12-20
-- Purpose: Add optional tables to support advanced MF cash flow projections
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Multifamily Operating Assumptions
-- Stores property-level operating assumptions for MF projections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS landscape.tbl_multifamily_operating_assumptions (
    assumption_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Vacancy & Loss
    physical_vacancy_pct NUMERIC(5,2) DEFAULT 5.00,
    economic_vacancy_pct NUMERIC(5,2) DEFAULT 5.00,
    credit_loss_pct NUMERIC(5,2) DEFAULT 2.00,
    concessions_pct NUMERIC(5,2) DEFAULT 0.00,

    -- Management
    management_fee_pct NUMERIC(5,2) DEFAULT 3.00,

    -- Reserves & CapEx
    replacement_reserves_per_unit NUMERIC(10,2) DEFAULT 300.00,
    capex_per_unit_annual NUMERIC(10,2) DEFAULT 0.00,

    -- Growth Rates (FK to existing growth rate sets)
    rent_growth_set_id INTEGER REFERENCES landscape.core_fin_growth_rate_sets(set_id),
    expense_growth_set_id INTEGER REFERENCES landscape.core_fin_growth_rate_sets(set_id),

    -- Hold Period
    hold_period_years INTEGER DEFAULT 5,

    -- Exit Assumptions
    exit_cap_rate NUMERIC(6,4) DEFAULT 0.0550,
    disposition_costs_pct NUMERIC(5,2) DEFAULT 2.00,

    -- Stabilization
    stabilized_occupancy_pct NUMERIC(5,2) DEFAULT 95.00,
    months_to_stabilization INTEGER DEFAULT 12,

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_mf_operating_assumptions_project UNIQUE (project_id)
);

CREATE INDEX idx_mf_oper_assumptions_project ON landscape.tbl_multifamily_operating_assumptions(project_id);

COMMENT ON TABLE landscape.tbl_multifamily_operating_assumptions IS
'Stores operating assumptions for multifamily cash flow projections. Links to existing growth rate sets for escalation.';


-- ----------------------------------------------------------------------------
-- 2. Multifamily Market Leasing Profile
-- Stores new lease vs renewal assumptions for detailed rollover modeling
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS landscape.tbl_multifamily_market_leasing (
    profile_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    profile_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,

    -- New Lease Assumptions
    new_lease_term_months INTEGER DEFAULT 12,
    new_free_rent_months NUMERIC(4,1) DEFAULT 0,
    new_concessions_pct NUMERIC(5,2) DEFAULT 0,
    new_lease_commission_pct NUMERIC(5,2) DEFAULT 0,

    -- Renewal Assumptions
    renewal_probability_pct NUMERIC(5,2) DEFAULT 65.00,
    renewal_lease_term_months INTEGER DEFAULT 12,
    renewal_free_rent_months NUMERIC(4,1) DEFAULT 0,
    renewal_rate_bump_pct NUMERIC(5,2) DEFAULT 3.00,

    -- Downtime / Vacancy
    avg_days_vacant_new INTEGER DEFAULT 30,
    avg_days_vacant_renewal INTEGER DEFAULT 0,
    make_ready_cost_per_turn NUMERIC(10,2) DEFAULT 1500.00,

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mf_market_leasing_project ON landscape.tbl_multifamily_market_leasing(project_id);

COMMENT ON TABLE landscape.tbl_multifamily_market_leasing IS
'Stores leasing assumptions for modeling unit rollovers - new lease terms, renewal rates, vacancy periods.';


-- ----------------------------------------------------------------------------
-- 3. Multifamily Cash Flow Cache
-- Caches calculated cash flows for performance (optional optimization)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS landscape.tbl_multifamily_cash_flow_cache (
    cache_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    scenario_name VARCHAR(100) DEFAULT 'base',
    period_number INTEGER NOT NULL,
    period_date DATE,

    -- Revenue Components
    gross_potential_rent NUMERIC(14,2),
    vacancy_loss NUMERIC(14,2),
    credit_loss NUMERIC(14,2),
    concessions NUMERIC(14,2),
    other_income NUMERIC(14,2),
    effective_gross_income NUMERIC(14,2),

    -- Expense Components
    operating_expenses NUMERIC(14,2),
    management_fee NUMERIC(14,2),
    replacement_reserves NUMERIC(14,2),
    total_expenses NUMERIC(14,2),

    -- NOI & Cash Flow
    net_operating_income NUMERIC(14,2),
    debt_service NUMERIC(14,2),
    capex NUMERIC(14,2),
    cash_flow_before_debt NUMERIC(14,2),
    cash_flow_after_debt NUMERIC(14,2),

    -- Disposition (only in exit period)
    reversion_value NUMERIC(14,2),
    disposition_costs NUMERIC(14,2),
    net_sale_proceeds NUMERIC(14,2),

    -- Cache metadata
    calculated_at TIMESTAMP DEFAULT NOW(),
    assumptions_hash VARCHAR(64),  -- MD5 hash of input assumptions for cache invalidation

    CONSTRAINT uq_mf_cf_cache_period UNIQUE (project_id, scenario_name, period_number)
);

CREATE INDEX idx_mf_cf_cache_project ON landscape.tbl_multifamily_cash_flow_cache(project_id);
CREATE INDEX idx_mf_cf_cache_scenario ON landscape.tbl_multifamily_cash_flow_cache(project_id, scenario_name);

COMMENT ON TABLE landscape.tbl_multifamily_cash_flow_cache IS
'Caches period-by-period cash flow calculations for performance. Invalidate when assumptions change.';


-- ----------------------------------------------------------------------------
-- 4. Add io_months and loan_term_months to tbl_debt_facility if missing
-- (These columns may already exist from prior migrations)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- Add io_months if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'landscape'
          AND table_name = 'tbl_debt_facility'
          AND column_name = 'io_months'
    ) THEN
        ALTER TABLE landscape.tbl_debt_facility
        ADD COLUMN io_months INTEGER DEFAULT 0;
        COMMENT ON COLUMN landscape.tbl_debt_facility.io_months IS 'Number of interest-only months at loan start';
    END IF;
END $$;


-- ----------------------------------------------------------------------------
-- Triggers for updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION landscape.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mf_oper_assumptions_updated ON landscape.tbl_multifamily_operating_assumptions;
CREATE TRIGGER trg_mf_oper_assumptions_updated
    BEFORE UPDATE ON landscape.tbl_multifamily_operating_assumptions
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_mf_market_leasing_updated ON landscape.tbl_multifamily_market_leasing;
CREATE TRIGGER trg_mf_market_leasing_updated
    BEFORE UPDATE ON landscape.tbl_multifamily_market_leasing
    FOR EACH ROW EXECUTE FUNCTION landscape.update_updated_at_column();


-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================
-- To rollback, run:
-- DROP TABLE IF EXISTS landscape.tbl_multifamily_cash_flow_cache CASCADE;
-- DROP TABLE IF EXISTS landscape.tbl_multifamily_market_leasing CASCADE;
-- DROP TABLE IF EXISTS landscape.tbl_multifamily_operating_assumptions CASCADE;
-- ALTER TABLE landscape.tbl_debt_facility DROP COLUMN IF EXISTS io_months;


-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 040 completed successfully';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - tbl_multifamily_operating_assumptions';
    RAISE NOTICE '  - tbl_multifamily_market_leasing';
    RAISE NOTICE '  - tbl_multifamily_cash_flow_cache';
END $$;
