-- Universal Container System bootstrap data
-- Run after the migrations in db/migrations have been applied.

-- Example project configuration defaults for existing projects
INSERT INTO landscape.tbl_project_config (project_id, asset_type, level1_label, level2_label, level3_label)
SELECT p.project_id,
       COALESCE(cfg.asset_type, 'land_development') AS asset_type,
       COALESCE(cfg.level1_label, 'Plan Area') AS level1_label,
       COALESCE(cfg.level2_label, 'Phase') AS level2_label,
       COALESCE(cfg.level3_label, 'Parcel') AS level3_label
FROM landscape.tbl_project p
LEFT JOIN landscape.tbl_project_config cfg ON cfg.project_id = p.project_id
WHERE cfg.project_id IS NULL;

-- Sample land development hierarchy for project 1
INSERT INTO landscape.tbl_container (
  project_id,
  parent_container_id,
  container_level,
  container_code,
  display_name,
  sort_order,
  attributes
) VALUES
  (1, NULL, 1, 'PA1', 'Sunset Hills Master Plan', 1, '{"total_acres": 450, "zoning": "PUD"}'),
  (1, NULL, 1, 'PA2', 'North Fork Expansion', 2, '{"total_acres": 180}');

-- Link phases to plan areas
WITH areas AS (
  SELECT container_id, container_code
  FROM landscape.tbl_container
  WHERE project_id = 1 AND container_level = 1
)
INSERT INTO landscape.tbl_container (
  project_id,
  parent_container_id,
  container_level,
  container_code,
  display_name,
  sort_order,
  attributes
)
SELECT
  1 AS project_id,
  a.container_id AS parent_container_id,
  2 AS container_level,
  phase_code,
  phase_name,
  sort_order,
  attributes
FROM (
  VALUES
    ('PH1A', 'Phase 1A', 1, '{"acres": 85, "start_month": 1, "completion_month": 24}'),
    ('PH1B', 'Phase 1B', 2, '{"acres": 65, "start_month": 12, "completion_month": 36}'),
    ('PH2A', 'Phase 2A', 3, '{"acres": 95, "start_month": 24, "completion_month": 48}')
) phase_data(phase_code, phase_name, sort_order, attributes)
JOIN areas a ON a.container_code = 'PA1';

-- Example parcels nested under Phase 1A
WITH phase AS (
  SELECT container_id
  FROM landscape.tbl_container
  WHERE project_id = 1 AND container_code = 'PH1A'
)
INSERT INTO landscape.tbl_container (
  project_id,
  parent_container_id,
  container_level,
  container_code,
  display_name,
  sort_order,
  attributes
)
SELECT
  1,
  phase.container_id,
  3,
  parcel_code,
  parcel_name,
  sort_order,
  attributes
FROM phase,
(VALUES
  ('LOT001', 'Lot 1', 1, '{"front_feet": 60, "depth": 120, "product_type": "SFR"}'),
  ('LOT002', 'Lot 2', 2, '{"front_feet": 55, "depth": 120, "product_type": "SFR"}'),
  ('LOT003', 'Lot 3', 3, '{"front_feet": 70, "depth": 130, "product_type": "Townhome"}')
) parcel_data(parcel_code, parcel_name, sort_order, attributes);

-- Sample project settings defaults
INSERT INTO landscape.tbl_project_settings (project_id, default_currency, default_period_type, global_inflation_rate)
SELECT p.project_id, 'USD', 'monthly', 0.03
FROM landscape.tbl_project p
LEFT JOIN landscape.tbl_project_settings s ON s.project_id = p.project_id
WHERE s.project_id IS NULL;

-- Sample calculation periods (monthly for first 12 months)
INSERT INTO landscape.tbl_calculation_period (
  project_id,
  period_start_date,
  period_end_date,
  period_type,
  period_sequence
)
SELECT
  1,
  period_start,
  period_end,
  'monthly',
  seq
FROM (
  SELECT
    generate_series(1, 12) AS seq,
    (DATE '2025-01-01' + (interval '1 month' * (generate_series(1, 12) - 1)))::date AS period_start,
    (DATE '2025-01-01' + (interval '1 month' * generate_series(1, 12)) - INTERVAL '1 day')::date AS period_end
) s
ON CONFLICT (project_id, period_sequence) DO NOTHING;
