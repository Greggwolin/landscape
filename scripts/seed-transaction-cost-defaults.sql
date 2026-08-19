/**
 * Seed Default Transaction Cost Benchmarks
 * Creates built-in transaction cost records with placeholder values
 * Run with: psql $DATABASE_URL -f scripts/seed-transaction-cost-defaults.sql
 */

-- Insert default transaction costs with NULL values (user will fill in)
INSERT INTO landscape.tbl_global_benchmark_registry (
  user_id,
  category,
  benchmark_name,
  description,
  source_type,
  confidence_level,
  usage_count,
  as_of_date,
  is_active,
  is_global,
  created_at,
  updated_at
) VALUES
  ('1', 'transaction_cost', 'Closing Costs', 'Standard closing costs for property transactions', 'system_default', 'medium', 0, CURRENT_DATE, true, true, NOW(), NOW()),
  ('1', 'transaction_cost', 'Title Insurance', 'Title insurance and related title fees', 'system_default', 'medium', 0, CURRENT_DATE, true, true, NOW(), NOW()),
  ('1', 'transaction_cost', 'Legal', 'Legal fees for transaction documentation and review', 'system_default', 'medium', 0, CURRENT_DATE, true, true, NOW(), NOW()),
  ('1', 'transaction_cost', 'Due Diligence', 'Due diligence costs including inspections and reports', 'system_default', 'medium', 0, CURRENT_DATE, true, true, NOW(), NOW()),
  ('1', 'transaction_cost', 'Broker Fee', 'Real estate broker commission or fees', 'system_default', 'medium', 0, CURRENT_DATE, true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert corresponding transaction cost details
WITH inserted_benchmarks AS (
  SELECT
    benchmark_id,
    benchmark_name
  FROM landscape.tbl_global_benchmark_registry
  WHERE category = 'transaction_cost'
    AND source_type = 'system_default'
    AND user_id = '1'
)
INSERT INTO landscape.tbl_benchmark_transaction_cost (
  benchmark_id,
  cost_type,
  value,
  value_type,
  basis,
  created_at,
  updated_at
)
SELECT
  ib.benchmark_id,
  CASE ib.benchmark_name
    WHEN 'Closing Costs' THEN 'closing_costs'
    WHEN 'Title Insurance' THEN 'title_insurance'
    WHEN 'Legal' THEN 'legal'
    WHEN 'Due Diligence' THEN 'due_diligence'
    WHEN 'Broker Fee' THEN 'broker_fee'
  END,
  0.0, -- Placeholder value, user will edit
  'flat_fee', -- Default to flat fee
  NULL, -- No basis for flat fee
  NOW(),
  NOW()
FROM inserted_benchmarks ib
ON CONFLICT DO NOTHING;

-- Verify results
SELECT
  r.benchmark_name,
  tc.cost_type,
  tc.value,
  tc.value_type,
  r.description
FROM landscape.tbl_global_benchmark_registry r
JOIN landscape.tbl_benchmark_transaction_cost tc ON r.benchmark_id = tc.benchmark_id
WHERE r.category = 'transaction_cost'
  AND r.source_type = 'system_default'
  AND r.user_id = '1'
ORDER BY r.benchmark_name;
