-- ============================================================================
-- Migration 074: Unified DCF Analysis Table
-- Date: 2026-01-28
-- Purpose: Create polymorphic DCF analysis table for both CRE and Land Dev
--          Add growth_rate_set_id FK to land_use_pricing
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create unified tbl_dcf_analysis table
-- Serves both CRE and Land Development property types
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS landscape.tbl_dcf_analysis (
    dcf_analysis_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Property type discriminator: 'cre' or 'land_dev'
    -- Derived from tbl_project.project_type_code:
    --   'LAND' -> 'land_dev'
    --   All others (MF, OFF, RET, IND, HTL, MXU) -> 'cre'
    property_type VARCHAR(20) NOT NULL,

    -- =========================================================================
    -- COMMON FIELDS (both property types)
    -- =========================================================================
    hold_period_years INTEGER,
    discount_rate NUMERIC(6,4),          -- e.g., 0.0850 = 8.50%
    exit_cap_rate NUMERIC(6,4),          -- e.g., 0.0600 = 6.00%
    selling_costs_pct NUMERIC(5,4),      -- e.g., 0.0200 = 2.00%

    -- =========================================================================
    -- CRE-SPECIFIC FIELDS
    -- =========================================================================
    going_in_cap_rate NUMERIC(6,4),      -- For direct capitalization
    cap_rate_method VARCHAR(20),         -- 'comp_sales', 'band', 'survey'
    sensitivity_interval NUMERIC(6,4),   -- e.g., 0.0050 = 50 bps
    vacancy_rate NUMERIC(5,4),
    stabilized_vacancy NUMERIC(5,4),
    credit_loss NUMERIC(5,4),
    management_fee_pct NUMERIC(5,4),
    reserves_per_unit NUMERIC(10,2),

    -- Growth rate set FKs for CRE
    income_growth_set_id INTEGER REFERENCES landscape.core_fin_growth_rate_sets(set_id) ON DELETE SET NULL,
    expense_growth_set_id INTEGER REFERENCES landscape.core_fin_growth_rate_sets(set_id) ON DELETE SET NULL,

    -- =========================================================================
    -- LAND DEV-SPECIFIC FIELDS
    -- =========================================================================
    -- Growth rate set FKs for Land Dev
    price_growth_set_id INTEGER REFERENCES landscape.core_fin_growth_rate_sets(set_id) ON DELETE SET NULL,
    cost_inflation_set_id INTEGER REFERENCES landscape.core_fin_growth_rate_sets(set_id) ON DELETE SET NULL,

    -- Bulk sale / exit assumptions
    bulk_sale_enabled BOOLEAN DEFAULT FALSE,
    bulk_sale_period INTEGER,            -- Period number for bulk sale exit
    bulk_sale_discount_pct NUMERIC(5,4), -- Discount on remaining inventory

    -- =========================================================================
    -- AUDIT FIELDS
    -- =========================================================================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- =========================================================================
    -- CONSTRAINTS
    -- =========================================================================
    CONSTRAINT uq_dcf_analysis_project_type UNIQUE (project_id, property_type),
    CONSTRAINT chk_dcf_property_type CHECK (property_type IN ('cre', 'land_dev')),
    CONSTRAINT chk_dcf_cap_rate_method CHECK (
        cap_rate_method IS NULL OR
        cap_rate_method IN ('comp_sales', 'band', 'survey', 'direct_entry')
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dcf_analysis_project ON landscape.tbl_dcf_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_dcf_analysis_property_type ON landscape.tbl_dcf_analysis(property_type);

-- Table comment
COMMENT ON TABLE landscape.tbl_dcf_analysis IS
'Unified DCF analysis parameters for both CRE and Land Development projects.
property_type discriminator determines which fields are relevant:
- cre: Uses income/expense growth, cap rates, vacancy assumptions
- land_dev: Uses price/cost inflation, bulk sale parameters';

-- Column comments
COMMENT ON COLUMN landscape.tbl_dcf_analysis.property_type IS
'Property type discriminator: land_dev (from LAND project_type_code) or cre (all other types)';
COMMENT ON COLUMN landscape.tbl_dcf_analysis.discount_rate IS
'Discount rate for DCF NPV calculation (decimal, e.g., 0.085 = 8.5%)';
COMMENT ON COLUMN landscape.tbl_dcf_analysis.exit_cap_rate IS
'Terminal/exit cap rate for reversion value (decimal, e.g., 0.06 = 6%)';
COMMENT ON COLUMN landscape.tbl_dcf_analysis.income_growth_set_id IS
'FK to core_fin_growth_rate_sets for CRE income growth (rent escalation)';
COMMENT ON COLUMN landscape.tbl_dcf_analysis.expense_growth_set_id IS
'FK to core_fin_growth_rate_sets for CRE expense growth (OpEx inflation)';
COMMENT ON COLUMN landscape.tbl_dcf_analysis.price_growth_set_id IS
'FK to core_fin_growth_rate_sets for Land Dev price appreciation';
COMMENT ON COLUMN landscape.tbl_dcf_analysis.cost_inflation_set_id IS
'FK to core_fin_growth_rate_sets for Land Dev development cost inflation';
COMMENT ON COLUMN landscape.tbl_dcf_analysis.bulk_sale_enabled IS
'Land Dev: Whether to model bulk sale of remaining inventory at exit';
COMMENT ON COLUMN landscape.tbl_dcf_analysis.bulk_sale_discount_pct IS
'Land Dev: Discount applied to remaining inventory in bulk sale (decimal)';


-- ----------------------------------------------------------------------------
-- 2. Add growth_rate_set_id to land_use_pricing
-- This allows linking pricing assumptions to stepped growth rate series
-- ----------------------------------------------------------------------------
ALTER TABLE landscape.land_use_pricing
ADD COLUMN IF NOT EXISTS growth_rate_set_id INTEGER
REFERENCES landscape.core_fin_growth_rate_sets(set_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_land_use_pricing_growth_set
ON landscape.land_use_pricing(growth_rate_set_id);

COMMENT ON COLUMN landscape.land_use_pricing.growth_rate_set_id IS
'FK to core_fin_growth_rate_sets for stepped/complex growth rates. Use this OR growth_rate field, not both.';


-- ----------------------------------------------------------------------------
-- 3. Trigger for updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION landscape.update_dcf_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dcf_analysis_updated ON landscape.tbl_dcf_analysis;
CREATE TRIGGER trg_dcf_analysis_updated
    BEFORE UPDATE ON landscape.tbl_dcf_analysis
    FOR EACH ROW EXECUTE FUNCTION landscape.update_dcf_analysis_updated_at();


-- ----------------------------------------------------------------------------
-- 4. Helper function to derive property_type from project_type_code
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION landscape.get_dcf_property_type(p_project_type_code VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    IF p_project_type_code = 'LAND' THEN
        RETURN 'land_dev';
    ELSE
        RETURN 'cre';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION landscape.get_dcf_property_type IS
'Derives DCF property_type from project_type_code: LAND -> land_dev, all others -> cre';


-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================
-- To rollback this migration, run:
/*
DROP TRIGGER IF EXISTS trg_dcf_analysis_updated ON landscape.tbl_dcf_analysis;
DROP FUNCTION IF EXISTS landscape.update_dcf_analysis_updated_at();
DROP FUNCTION IF EXISTS landscape.get_dcf_property_type(VARCHAR);
ALTER TABLE landscape.land_use_pricing DROP COLUMN IF EXISTS growth_rate_set_id;
DROP TABLE IF EXISTS landscape.tbl_dcf_analysis CASCADE;
*/


-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_column_exists BOOLEAN;
BEGIN
    -- Check table created
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'landscape'
        AND table_name = 'tbl_dcf_analysis'
    ) INTO v_table_exists;

    -- Check column added
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'landscape'
        AND table_name = 'land_use_pricing'
        AND column_name = 'growth_rate_set_id'
    ) INTO v_column_exists;

    IF v_table_exists AND v_column_exists THEN
        RAISE NOTICE 'Migration 074 completed successfully';
        RAISE NOTICE '  - tbl_dcf_analysis table created';
        RAISE NOTICE '  - growth_rate_set_id column added to land_use_pricing';
    ELSE
        RAISE EXCEPTION 'Migration 074 verification failed: table_exists=%, column_exists=%',
            v_table_exists, v_column_exists;
    END IF;
END $$;
