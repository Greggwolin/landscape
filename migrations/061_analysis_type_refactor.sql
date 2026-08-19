-- Migration: 061_analysis_type_refactor.sql
-- Description: Refactor analysis types to four distinct values orthogonal to property type
-- Date: 2026-01-20
--
-- This migration separates the concept of "what the asset is" (Property Type)
-- from "what the user is doing" (Analysis Type).
--
-- NEW ANALYSIS TYPES:
-- - VALUATION:   Market value opinion (USPAP compliant appraisals)
-- - INVESTMENT:  Acquisition underwriting (IRR, returns analysis)
-- - DEVELOPMENT: Ground-up or redevelopment returns
-- - FEASIBILITY: Go/no-go binary decision analysis
--
-- MIGRATION PATH:
-- - 'Land Development' -> 'DEVELOPMENT'
-- - 'Income Property'  -> 'INVESTMENT'

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ADD NEW ANALYSIS TYPE CODES TO PICKLIST
-- ═══════════════════════════════════════════════════════════════════════════

-- Recreate helper function for this migration
CREATE OR REPLACE FUNCTION landscape._insert_picklist(
  p_type VARCHAR,
  p_code VARCHAR,
  p_name VARCHAR,
  p_description TEXT,
  p_parent_id BIGINT,
  p_sort INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO landscape.tbl_system_picklist (picklist_type, code, name, description, parent_id, sort_order)
  VALUES (p_type, p_code, p_name, p_description, p_parent_id, COALESCE(p_sort, 0))
  ON CONFLICT (picklist_type, code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert new analysis type codes
SELECT landscape._insert_picklist(
    'ANALYSIS_TYPE',
    'VALUATION',
    'Valuation',
    'Market value opinion - USPAP compliant appraisal',
    NULL,
    10
);

SELECT landscape._insert_picklist(
    'ANALYSIS_TYPE',
    'INVESTMENT',
    'Investment',
    'Acquisition underwriting - IRR, returns analysis',
    NULL,
    20
);

SELECT landscape._insert_picklist(
    'ANALYSIS_TYPE',
    'DEVELOPMENT',
    'Development',
    'Ground-up or redevelopment returns analysis',
    NULL,
    30
);

SELECT landscape._insert_picklist(
    'ANALYSIS_TYPE',
    'FEASIBILITY',
    'Feasibility',
    'Go/no-go binary feasibility analysis',
    NULL,
    40
);

-- Clean up helper
DROP FUNCTION IF EXISTS landscape._insert_picklist(VARCHAR, VARCHAR, VARCHAR, TEXT, BIGINT, INTEGER);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. DROP EXISTING CHECK CONSTRAINT ON analysis_type
-- ═══════════════════════════════════════════════════════════════════════════

-- The old constraint restricts values to 'Land Development' and 'Income Property'
-- We need to drop it before updating to the new values
ALTER TABLE landscape.tbl_project
DROP CONSTRAINT IF EXISTS tbl_project_analysis_type_check;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. MIGRATE EXISTING PROJECT DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Map 'Land Development' -> 'DEVELOPMENT'
UPDATE landscape.tbl_project
SET analysis_type = 'DEVELOPMENT',
    updated_at = CURRENT_TIMESTAMP
WHERE analysis_type = 'Land Development';

-- Map 'Income Property' -> 'INVESTMENT'
UPDATE landscape.tbl_project
SET analysis_type = 'INVESTMENT',
    updated_at = CURRENT_TIMESTAMP
WHERE analysis_type = 'Income Property';

-- Handle any legacy codes that might exist
UPDATE landscape.tbl_project
SET analysis_type = 'DEVELOPMENT',
    updated_at = CURRENT_TIMESTAMP
WHERE analysis_type = 'LAND_DEV';

UPDATE landscape.tbl_project
SET analysis_type = 'INVESTMENT',
    updated_at = CURRENT_TIMESTAMP
WHERE analysis_type = 'INCOME';


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ADD NEW CHECK CONSTRAINT FOR analysis_type
-- ═══════════════════════════════════════════════════════════════════════════

-- Add new constraint with the new valid values
ALTER TABLE landscape.tbl_project
ADD CONSTRAINT tbl_project_analysis_type_check
CHECK (analysis_type IS NULL OR analysis_type IN ('VALUATION', 'INVESTMENT', 'DEVELOPMENT', 'FEASIBILITY'));


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. DEPRECATE OLD PICKLIST CODES
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE landscape.tbl_system_picklist
SET is_active = FALSE,
    description = 'DEPRECATED - Migrated to DEVELOPMENT',
    updated_at = CURRENT_TIMESTAMP
WHERE picklist_type = 'ANALYSIS_TYPE' AND code = 'LAND_DEV';

UPDATE landscape.tbl_system_picklist
SET is_active = FALSE,
    description = 'DEPRECATED - Migrated to INVESTMENT',
    updated_at = CURRENT_TIMESTAMP
WHERE picklist_type = 'ANALYSIS_TYPE' AND code = 'INCOME';


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CREATE ANALYSIS TYPE CONFIGURATION TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS landscape.tbl_analysis_type_config (
    config_id BIGSERIAL PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL UNIQUE,

    -- Tile visibility flags
    tile_hbu BOOLEAN DEFAULT FALSE,
    tile_valuation BOOLEAN DEFAULT FALSE,
    tile_capitalization BOOLEAN DEFAULT FALSE,
    tile_returns BOOLEAN DEFAULT FALSE,
    tile_development_budget BOOLEAN DEFAULT FALSE,

    -- Feature/requirement flags
    requires_capital_stack BOOLEAN DEFAULT FALSE,
    requires_comparable_sales BOOLEAN DEFAULT FALSE,
    requires_income_approach BOOLEAN DEFAULT FALSE,
    requires_cost_approach BOOLEAN DEFAULT FALSE,

    -- Report types available (JSON array of report type codes)
    available_reports JSONB DEFAULT '[]'::jsonb,

    -- Landscaper behavior context
    landscaper_context TEXT,

    -- Audit columns
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for lookups
CREATE INDEX idx_analysis_type_config_type ON landscape.tbl_analysis_type_config(analysis_type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION landscape.update_analysis_type_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_analysis_type_config_updated_at
    BEFORE UPDATE ON landscape.tbl_analysis_type_config
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_analysis_type_config_timestamp();


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SEED CONFIGURATION FOR EACH ANALYSIS TYPE
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO landscape.tbl_analysis_type_config
(analysis_type, tile_hbu, tile_valuation, tile_capitalization, tile_returns, tile_development_budget,
 requires_capital_stack, requires_comparable_sales, requires_income_approach, requires_cost_approach,
 available_reports, landscaper_context)
VALUES
(
    'VALUATION',
    TRUE,   -- tile_hbu
    TRUE,   -- tile_valuation (3 approaches)
    FALSE,  -- tile_capitalization
    FALSE,  -- tile_returns
    FALSE,  -- tile_development_budget
    FALSE,  -- requires_capital_stack
    TRUE,   -- requires_comparable_sales
    TRUE,   -- requires_income_approach
    TRUE,   -- requires_cost_approach
    '["appraisal_report", "restricted_appraisal", "value_letter"]'::jsonb,
    'Focus on USPAP compliance, three approaches to value, reconciliation narrative, market value opinion. Guide user through comparable sales selection, income capitalization, and cost approach as applicable. Ensure highest and best use analysis is complete before value conclusions.'
),
(
    'INVESTMENT',
    FALSE,  -- tile_hbu
    FALSE,  -- tile_valuation
    TRUE,   -- tile_capitalization
    TRUE,   -- tile_returns
    FALSE,  -- tile_development_budget
    TRUE,   -- requires_capital_stack
    FALSE,  -- requires_comparable_sales
    TRUE,   -- requires_income_approach
    FALSE,  -- requires_cost_approach
    '["investment_memo", "offering_memo", "due_diligence_report"]'::jsonb,
    'Focus on IRR, cash-on-cash returns, equity multiple, debt coverage ratios. Help size debt, structure equity waterfall, and model hold period scenarios. Provide pricing guidance for acquisition underwriting. Emphasize sensitivity analysis and risk factors.'
),
(
    'DEVELOPMENT',
    TRUE,   -- tile_hbu
    FALSE,  -- tile_valuation
    TRUE,   -- tile_capitalization
    TRUE,   -- tile_returns
    TRUE,   -- tile_development_budget
    TRUE,   -- requires_capital_stack
    FALSE,  -- requires_comparable_sales
    TRUE,   -- requires_income_approach
    TRUE,   -- requires_cost_approach (for budget)
    '["development_pro_forma", "construction_budget", "draw_schedule", "investor_presentation"]'::jsonb,
    'Focus on development budget, hard/soft costs, construction timeline, and phasing. Calculate residual land value, development profit margin, and construction period returns. Model absorption schedule and lease-up. Track construction loan draws and interest carry. Consider highest and best use for development alternatives.'
),
(
    'FEASIBILITY',
    TRUE,   -- tile_hbu
    FALSE,  -- tile_valuation
    TRUE,   -- tile_capitalization
    TRUE,   -- tile_returns
    TRUE,   -- tile_development_budget
    TRUE,   -- requires_capital_stack
    FALSE,  -- requires_comparable_sales
    TRUE,   -- requires_income_approach
    TRUE,   -- requires_cost_approach
    '["feasibility_study", "sensitivity_analysis", "scenario_comparison"]'::jsonb,
    'Focus on go/no-go decision criteria. Define minimum return hurdles and threshold metrics. Run sensitivity analysis on key variables (rent, cost, cap rate, absorption). Compare scenarios if multiple alternatives exist. Provide clear recommendation with supporting rationale. Highlight risk factors and breakeven points.'
)
ON CONFLICT (analysis_type) DO UPDATE SET
    tile_hbu = EXCLUDED.tile_hbu,
    tile_valuation = EXCLUDED.tile_valuation,
    tile_capitalization = EXCLUDED.tile_capitalization,
    tile_returns = EXCLUDED.tile_returns,
    tile_development_budget = EXCLUDED.tile_development_budget,
    requires_capital_stack = EXCLUDED.requires_capital_stack,
    requires_comparable_sales = EXCLUDED.requires_comparable_sales,
    requires_income_approach = EXCLUDED.requires_income_approach,
    requires_cost_approach = EXCLUDED.requires_cost_approach,
    available_reports = EXCLUDED.available_reports,
    landscaper_context = EXCLUDED.landscaper_context,
    updated_at = CURRENT_TIMESTAMP;


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. ADD COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE landscape.tbl_analysis_type_config IS
'Configuration for each analysis type - controls tile visibility, required inputs, and Landscaper behavior. Analysis types are orthogonal to property types.';

COMMENT ON COLUMN landscape.tbl_analysis_type_config.analysis_type IS
'Analysis type code: VALUATION, INVESTMENT, DEVELOPMENT, FEASIBILITY';

COMMENT ON COLUMN landscape.tbl_analysis_type_config.tile_hbu IS
'Show Highest & Best Use tile in project navigation';

COMMENT ON COLUMN landscape.tbl_analysis_type_config.tile_valuation IS
'Show Valuation tile (three approaches) in project navigation';

COMMENT ON COLUMN landscape.tbl_analysis_type_config.tile_capitalization IS
'Show Capitalization (debt/equity) tile in project navigation';

COMMENT ON COLUMN landscape.tbl_analysis_type_config.tile_returns IS
'Show Returns (IRR, sensitivity) tile in project navigation';

COMMENT ON COLUMN landscape.tbl_analysis_type_config.tile_development_budget IS
'Show Development Budget tile in project navigation';

COMMENT ON COLUMN landscape.tbl_analysis_type_config.landscaper_context IS
'System prompt context injected into Landscaper for analysis-type-aware behavior';


COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK SECTION
-- ═══════════════════════════════════════════════════════════════════════════
-- To rollback this migration, run:
--
-- BEGIN;
--
-- -- Restore project analysis_type values
-- UPDATE landscape.tbl_project SET analysis_type = 'Land Development' WHERE analysis_type = 'DEVELOPMENT';
-- UPDATE landscape.tbl_project SET analysis_type = 'Income Property' WHERE analysis_type = 'INVESTMENT';
--
-- -- Reactivate old picklist codes
-- UPDATE landscape.tbl_system_picklist SET is_active = TRUE, description = NULL
-- WHERE picklist_type = 'ANALYSIS_TYPE' AND code IN ('LAND_DEV', 'INCOME');
--
-- -- Remove new picklist codes
-- DELETE FROM landscape.tbl_system_picklist
-- WHERE picklist_type = 'ANALYSIS_TYPE' AND code IN ('VALUATION', 'INVESTMENT', 'DEVELOPMENT', 'FEASIBILITY');
--
-- -- Drop config table
-- DROP TRIGGER IF EXISTS trg_analysis_type_config_updated_at ON landscape.tbl_analysis_type_config;
-- DROP FUNCTION IF EXISTS landscape.update_analysis_type_config_timestamp();
-- DROP TABLE IF EXISTS landscape.tbl_analysis_type_config;
--
-- COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════
-- Run these after migration to verify success:
--
-- -- Check picklist values
-- SELECT picklist_type, code, name, is_active, sort_order
-- FROM landscape.tbl_system_picklist
-- WHERE picklist_type = 'ANALYSIS_TYPE'
-- ORDER BY sort_order;
--
-- -- Check project migration
-- SELECT analysis_type, COUNT(*) as project_count
-- FROM landscape.tbl_project
-- GROUP BY analysis_type
-- ORDER BY analysis_type;
--
-- -- Check config table
-- SELECT analysis_type, tile_hbu, tile_valuation, tile_capitalization, tile_returns, tile_development_budget
-- FROM landscape.tbl_analysis_type_config
-- ORDER BY analysis_type;
