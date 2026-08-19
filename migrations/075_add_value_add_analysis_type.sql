-- Migration 075: Add VALUE_ADD to analysis_type check constraint
-- This adds VALUE_ADD as a valid analysis type for value-add investment projects
-- (acquisition with renovation upside)

-- Step 1: Drop the existing check constraint
ALTER TABLE tbl_project DROP CONSTRAINT IF EXISTS tbl_project_analysis_type_check;

-- Step 2: Add the new check constraint with VALUE_ADD included
ALTER TABLE tbl_project ADD CONSTRAINT tbl_project_analysis_type_check
CHECK (
  (analysis_type IS NULL) OR
  (analysis_type IN ('VALUATION', 'INVESTMENT', 'VALUE_ADD', 'DEVELOPMENT', 'FEASIBILITY'))
);

-- Step 3: Add VALUE_ADD to tbl_analysis_type_config if not exists
INSERT INTO tbl_analysis_type_config (
  analysis_type,
  tile_hbu,
  tile_valuation,
  tile_capitalization,
  tile_returns,
  tile_development_budget,
  requires_capital_stack,
  requires_comparable_sales,
  requires_income_approach,
  requires_cost_approach,
  available_reports,
  landscaper_context,
  created_at,
  updated_at
)
VALUES (
  'VALUE_ADD',
  false,  -- tile_hbu
  true,   -- tile_valuation
  true,   -- tile_capitalization
  true,   -- tile_returns
  true,   -- tile_development_budget (for renovation budget)
  true,   -- requires_capital_stack
  true,   -- requires_comparable_sales
  true,   -- requires_income_approach
  false,  -- requires_cost_approach
  '["income_approach", "dcf", "renovation_budget", "returns_summary"]',
  'Focus on acquisition underwriting with renovation upside. Calculate as-is value, post-renovation value, and renovation costs to determine total investment basis and expected returns.',
  NOW(),
  NOW()
)
ON CONFLICT (analysis_type) DO UPDATE SET
  tile_development_budget = EXCLUDED.tile_development_budget,
  landscaper_context = EXCLUDED.landscaper_context,
  updated_at = NOW();

-- Rollback:
-- ALTER TABLE tbl_project DROP CONSTRAINT IF EXISTS tbl_project_analysis_type_check;
-- ALTER TABLE tbl_project ADD CONSTRAINT tbl_project_analysis_type_check
-- CHECK ((analysis_type IS NULL) OR (analysis_type IN ('VALUATION', 'INVESTMENT', 'DEVELOPMENT', 'FEASIBILITY')));
-- DELETE FROM tbl_analysis_type_config WHERE analysis_type = 'VALUE_ADD';
