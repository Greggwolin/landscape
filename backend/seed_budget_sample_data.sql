-- Sample Budget Data for Peoria Lakes (Project 7)
-- Run this to populate the budget tables with test data

-- Step 1: Insert budget categories (if they don't exist)
INSERT INTO core_fin_category (code, detail, scope, kind, parent_id, is_active) VALUES
  ('ACQ', 'Acquisition Costs', 'Acquisition', 'cost', NULL, true),
  ('ACQ-LAND', 'Land Purchase', 'Acquisition', 'cost', (SELECT category_id FROM core_fin_category WHERE code = 'ACQ' LIMIT 1), true),
  ('ACQ-CLOSE', 'Closing Costs', 'Acquisition', 'cost', (SELECT category_id FROM core_fin_category WHERE code = 'ACQ' LIMIT 1), true),

  ('STG1', 'Stage 1 Development', 'Stage 1', 'cost', NULL, true),
  ('STG1-ENG', 'Engineering & Design', 'Stage 1', 'cost', (SELECT category_id FROM core_fin_category WHERE code = 'STG1' LIMIT 1), true),
  ('STG1-ONSITE', 'On-Site Development', 'Stage 1', 'cost', (SELECT category_id FROM core_fin_category WHERE code = 'STG1' LIMIT 1), true),
  ('STG1-OFFSITE', 'Off-Site Improvements', 'Stage 1', 'cost', (SELECT category_id FROM core_fin_category WHERE code = 'STG1' LIMIT 1), true),

  ('STG2', 'Stage 2 Development', 'Stage 2', 'cost', NULL, true),
  ('STG2-VERT', 'Vertical Construction', 'Stage 2', 'cost', (SELECT category_id FROM core_fin_category WHERE code = 'STG2' LIMIT 1), true),
  ('STG2-LAND', 'Landscaping', 'Stage 2', 'cost', (SELECT category_id FROM core_fin_category WHERE code = 'STG2' LIMIT 1), true)
ON CONFLICT (code) DO NOTHING;

-- Step 2: Create budget version for project 7 (if doesn't exist)
INSERT INTO core_fin_budget_version (project_id, status, version_date, version_name)
VALUES (7, 'active', NOW(), 'Original Budget')
ON CONFLICT DO NOTHING;

-- Get the budget_id we just created
DO $$
DECLARE
  v_budget_id INT;
  v_acq_cat INT;
  v_acq_land_cat INT;
  v_acq_close_cat INT;
  v_stg1_cat INT;
  v_stg1_eng_cat INT;
  v_stg1_onsite_cat INT;
  v_stg1_offsite_cat INT;
  v_stg2_cat INT;
  v_stg2_vert_cat INT;
  v_stg2_land_cat INT;
BEGIN
  -- Get budget ID
  SELECT budget_id INTO v_budget_id
  FROM core_fin_budget_version
  WHERE project_id = 7 AND status = 'active'
  LIMIT 1;

  -- Get category IDs
  SELECT category_id INTO v_acq_cat FROM core_fin_category WHERE code = 'ACQ' LIMIT 1;
  SELECT category_id INTO v_acq_land_cat FROM core_fin_category WHERE code = 'ACQ-LAND' LIMIT 1;
  SELECT category_id INTO v_acq_close_cat FROM core_fin_category WHERE code = 'ACQ-CLOSE' LIMIT 1;
  SELECT category_id INTO v_stg1_cat FROM core_fin_category WHERE code = 'STG1' LIMIT 1;
  SELECT category_id INTO v_stg1_eng_cat FROM core_fin_category WHERE code = 'STG1-ENG' LIMIT 1;
  SELECT category_id INTO v_stg1_onsite_cat FROM core_fin_category WHERE code = 'STG1-ONSITE' LIMIT 1;
  SELECT category_id INTO v_stg1_offsite_cat FROM core_fin_category WHERE code = 'STG1-OFFSITE' LIMIT 1;
  SELECT category_id INTO v_stg2_cat FROM core_fin_category WHERE code = 'STG2' LIMIT 1;
  SELECT category_id INTO v_stg2_vert_cat FROM core_fin_category WHERE code = 'STG2-VERT' LIMIT 1;
  SELECT category_id INTO v_stg2_land_cat FROM core_fin_category WHERE code = 'STG2-LAND' LIMIT 1;

  -- Step 3: Insert budget items

  -- Acquisition parent (no qty/rate, just subtotal)
  INSERT INTO core_fin_fact_budget (
    budget_id, pe_level, pe_id, category_id, qty, rate, amount,
    start_date, end_date, uom_code, escalation_rate, contingency_pct, timing_method
  ) VALUES
    (v_budget_id, 'project', 7, v_acq_cat, NULL, NULL, 7500000,
     '2024-01-01', '2024-03-31', NULL, 0, 0, 'distributed');

  -- Acquisition children
  INSERT INTO core_fin_fact_budget (
    budget_id, pe_level, pe_id, category_id, qty, rate, amount,
    start_date, end_date, uom_code, escalation_rate, contingency_pct, timing_method
  ) VALUES
    (v_budget_id, 'project', 7, v_acq_land_cat, 100, 50000, 5000000,
     '2024-01-01', '2024-02-28', 'AC', 0, 5, 'milestone'),

    (v_budget_id, 'project', 7, v_acq_close_cat, 1, 250000, 250000,
     '2024-02-01', '2024-02-28', 'LS', 0, 0, 'milestone');

  -- Stage 1 parent
  INSERT INTO core_fin_fact_budget (
    budget_id, pe_level, pe_id, category_id, qty, rate, amount,
    start_date, end_date, uom_code, escalation_rate, contingency_pct, timing_method
  ) VALUES
    (v_budget_id, 'project', 7, v_stg1_cat, NULL, NULL, 15000000,
     '2024-03-01', '2025-12-31', NULL, 0, 0, 'distributed');

  -- Stage 1 children
  INSERT INTO core_fin_fact_budget (
    budget_id, pe_level, pe_id, category_id, qty, rate, amount,
    start_date, end_date, uom_code, escalation_rate, contingency_pct, timing_method
  ) VALUES
    (v_budget_id, 'project', 7, v_stg1_eng_cat, 1500, 2500, 3750000,
     '2024-03-01', '2024-09-30', 'AC', 2, 10, 'distributed'),

    (v_budget_id, 'project', 7, v_stg1_onsite_cat, 1500, 5000, 7500000,
     '2024-06-01', '2025-06-30', 'AC', 3, 15, 'distributed'),

    (v_budget_id, 'project', 7, v_stg1_offsite_cat, 1, 3750000, 3750000,
     '2024-09-01', '2025-03-31', 'LS', 2, 10, 'distributed');

  -- Stage 2 parent
  INSERT INTO core_fin_fact_budget (
    budget_id, pe_level, pe_id, category_id, qty, rate, amount,
    start_date, end_date, uom_code, escalation_rate, contingency_pct, timing_method
  ) VALUES
    (v_budget_id, 'project', 7, v_stg2_cat, NULL, NULL, 12000000,
     '2025-01-01', '2026-12-31', NULL, 0, 0, 'distributed');

  -- Stage 2 children
  INSERT INTO core_fin_fact_budget (
    budget_id, pe_level, pe_id, category_id, qty, rate, amount,
    start_date, end_date, uom_code, escalation_rate, contingency_pct, timing_method
  ) VALUES
    (v_budget_id, 'project', 7, v_stg2_vert_cat, 500000, 200, 100000000,
     '2025-01-01', '2026-06-30', 'SF', 3, 12, 'distributed'),

    (v_budget_id, 'project', 7, v_stg2_land_cat, 1500, 5000, 7500000,
     '2025-09-01', '2026-03-31', 'AC', 2, 8, 'distributed');

  RAISE NOTICE 'Sample budget data inserted successfully for project 7';
END $$;

-- Verify the data
SELECT
  fb.fact_id,
  fc.code AS category_code,
  fc.detail AS category_detail,
  fb.qty,
  fb.uom_code,
  fb.rate,
  fb.amount,
  fb.start_date,
  fb.end_date,
  fc.scope
FROM core_fin_fact_budget fb
JOIN core_fin_category fc ON fb.category_id = fc.category_id
WHERE fb.budget_id = (SELECT budget_id FROM core_fin_budget_version WHERE project_id = 7 AND status = 'active' LIMIT 1)
ORDER BY fc.scope, fc.parent_id NULLS FIRST, fc.category_id;
