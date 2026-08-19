-- 028_uom_usage_contexts.sql
-- Adds usage_contexts to tbl_measures for context-aware UOM filtering

ALTER TABLE landscape.tbl_measures
ADD COLUMN IF NOT EXISTS usage_contexts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN landscape.tbl_measures.usage_contexts IS
'Array of context strings where this UOM is valid: land_pricing, budget_cost, budget_qty, absorption, rate_factor';

-- Populate default contexts for system UOMs
UPDATE landscape.tbl_measures
SET usage_contexts =
CASE measure_code
  -- Area measures: pricing and quantities
  WHEN 'AC' THEN '["land_pricing", "budget_cost", "budget_qty"]'::jsonb
  WHEN 'SF' THEN '["land_pricing", "budget_cost", "budget_qty"]'::jsonb
  WHEN 'SY' THEN '["land_pricing", "budget_cost", "budget_qty"]'::jsonb

  -- Linear measures: pricing and quantities
  WHEN 'FF' THEN '["land_pricing", "budget_cost", "budget_qty"]'::jsonb
  WHEN 'LF' THEN '["land_pricing", "budget_cost", "budget_qty"]'::jsonb

  -- Count measures: varies by type
  WHEN 'EA' THEN '["land_pricing", "budget_cost", "budget_qty"]'::jsonb
  WHEN 'UNIT' THEN '["land_pricing", "budget_cost", "budget_qty"]'::jsonb
  WHEN 'LOT' THEN '["land_pricing", "budget_cost", "budget_qty"]'::jsonb
  WHEN 'DOOR' THEN '["budget_cost", "budget_qty"]'::jsonb
  WHEN 'STALL' THEN '["budget_cost", "budget_qty"]'::jsonb

  -- Lump Sum: budget costs only (not land pricing)
  WHEN 'LS' THEN '["budget_cost"]'::jsonb

  -- Volume: budget only
  WHEN 'CY' THEN '["budget_cost", "budget_qty"]'::jsonb

  -- Time periods: absorption and some budget items
  WHEN 'MO' THEN '["absorption", "budget_cost"]'::jsonb
  WHEN 'QTR' THEN '["absorption"]'::jsonb
  WHEN 'YR' THEN '["absorption", "budget_cost"]'::jsonb
  WHEN 'WK' THEN '["absorption"]'::jsonb
  WHEN 'DAY' THEN '["budget_cost"]'::jsonb

  -- Rate factors: escalation, inflation
  WHEN '%' THEN '["rate_factor"]'::jsonb

  ELSE COALESCE(usage_contexts, '[]'::jsonb)
END
WHERE is_system = true;

-- Deactivate redundant dollar-prefixed measures (dynamic formatting replaces these)
UPDATE landscape.tbl_measures
SET is_system = false
WHERE measure_code IN ('$/MO', '$/QTR', '$/YR')
  AND measure_code LIKE '$/%';
