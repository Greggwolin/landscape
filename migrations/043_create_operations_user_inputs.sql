-- Migration: 043_create_operations_user_inputs.sql
-- Purpose: Create table for storing user-provided As-Is and Post-Reno values
--          for the unified Operations P&L view (Rental Income, Vacancy, Other Income, OpEx)
--
-- Evidence data (ingested from documents) remains in tbl_operating_expenses.
-- This table stores the user's underwriting assumptions separately.

BEGIN;

-- =============================================================================
-- CREATE MAIN TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_operations_user_inputs (
    input_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Line item identification
    section VARCHAR(50) NOT NULL CHECK (section IN (
        'rental_income',
        'vacancy_deductions',
        'other_income',
        'operating_expenses'
    )),
    line_item_key VARCHAR(100) NOT NULL,  -- e.g., 'unit_type:1BR', 'physical_vacancy', '5110'
    category_id INTEGER REFERENCES landscape.core_unit_cost_category(category_id),  -- FK for CoA items

    -- Display metadata
    label VARCHAR(200),  -- User-friendly display label
    parent_key VARCHAR(100),  -- For hierarchy (e.g., parent category key)
    sort_order INTEGER DEFAULT 0,

    -- As-Is inputs (blue styling)
    as_is_value DECIMAL(14, 2),           -- Total annual value
    as_is_count INTEGER,                   -- Count (units, spaces, etc.)
    as_is_rate DECIMAL(14, 4),             -- Rate input ($/unit/mo, %, etc.)
    as_is_per_sf DECIMAL(10, 4),           -- Per SF value (calculated or entered)
    as_is_growth_rate DECIMAL(6, 4),       -- Annual growth/escalation (0.03 = 3%)
    as_is_growth_type VARCHAR(20) DEFAULT 'global',  -- 'global', 'custom', 'fee_based'

    -- Post-Reno inputs (green styling)
    post_reno_value DECIMAL(14, 2),
    post_reno_count INTEGER,
    post_reno_rate DECIMAL(14, 4),
    post_reno_per_sf DECIMAL(10, 4),
    post_reno_growth_rate DECIMAL(6, 4),

    -- Calculation flags
    is_percentage BOOLEAN DEFAULT FALSE,   -- True for vacancy %, management fee %
    is_calculated BOOLEAN DEFAULT FALSE,   -- True for parent rollup rows
    calculation_base VARCHAR(50),          -- 'gpr', 'egi', 'nri', etc. for % calculations

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(project_id, section, line_item_key)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_ops_inputs_project ON landscape.tbl_operations_user_inputs(project_id);
CREATE INDEX idx_ops_inputs_section ON landscape.tbl_operations_user_inputs(project_id, section);
CREATE INDEX idx_ops_inputs_category ON landscape.tbl_operations_user_inputs(category_id)
    WHERE category_id IS NOT NULL;
CREATE INDEX idx_ops_inputs_parent ON landscape.tbl_operations_user_inputs(project_id, section, parent_key)
    WHERE parent_key IS NOT NULL;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE landscape.tbl_operations_user_inputs IS
'User-provided As-Is and Post-Reno values for the unified Operations P&L view.
Evidence values (ingested from documents) come from tbl_operating_expenses and rent roll tables.
This table stores the underwriting assumptions that can differ from extracted evidence.';

COMMENT ON COLUMN landscape.tbl_operations_user_inputs.section IS
'Section of the P&L: rental_income, vacancy_deductions, other_income, operating_expenses';

COMMENT ON COLUMN landscape.tbl_operations_user_inputs.line_item_key IS
'Unique key within section. Format varies by section:
- rental_income: "unit_type:1BR", "unit_type:2BR", etc.
- vacancy_deductions: "physical_vacancy", "credit_loss", "concessions", "manager_unit"
- other_income: category_id as string or "custom:label"
- operating_expenses: account_number (5110, 5200) or "custom:label"';

COMMENT ON COLUMN landscape.tbl_operations_user_inputs.as_is_growth_type IS
'Type of growth rate: global (uses project default), custom (overridden), fee_based (% of EGI)';

COMMENT ON COLUMN landscape.tbl_operations_user_inputs.calculation_base IS
'For percentage-based items, what total to calculate against: gpr, nri, egi';

-- =============================================================================
-- ADD COLUMN TO tbl_project FOR VALUE-ADD MODE TOGGLE
-- =============================================================================

ALTER TABLE landscape.tbl_project
ADD COLUMN IF NOT EXISTS value_add_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN landscape.tbl_project.value_add_enabled IS
'Toggle for Value-Add mode in Operations tab. When true, shows Post-Reno input columns.';

-- =============================================================================
-- TRIGGER FOR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION landscape.update_operations_inputs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_operations_inputs_updated ON landscape.tbl_operations_user_inputs;
CREATE TRIGGER trg_operations_inputs_updated
    BEFORE UPDATE ON landscape.tbl_operations_user_inputs
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_operations_inputs_timestamp();

-- =============================================================================
-- SEED DEFAULT VACANCY/DEDUCTION ITEMS
-- This creates the standard deduction types that appear in every project
-- =============================================================================

-- Note: Actual seeding will happen when a project is first viewed in Operations tab
-- This is just the structure. The API will insert defaults on first load.

COMMIT;
