-- Migration: 2025-11-05_sales_absorption_module
-- Purpose : Stand up Sales & Absorption data structures, benchmark tables, and inventory gauge view
-- Schema  : landscape
-- Notes   : Idempotent; safe to re-run; emits NOTICES when skipping existing artifacts
BEGIN;
SET search_path TO landscape, public;

-- ============================================================================
-- Section 1: Extend core_fin_fact_budget with phase linkage
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'landscape'
      AND table_name = 'core_fin_fact_budget'
      AND column_name = 'phase_id'
  ) THEN
    ALTER TABLE landscape.core_fin_fact_budget
      ADD COLUMN phase_id INTEGER REFERENCES landscape.tbl_phase(phase_id);
    RAISE NOTICE 'Added column landscape.core_fin_fact_budget.phase_id';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'landscape'
      AND table_name = 'core_fin_fact_budget'
      AND column_name = 'phase_id'
  ) THEN
    COMMENT ON COLUMN landscape.core_fin_fact_budget.phase_id IS
      'Links budget fact to development phase for filtering and sequencing';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'landscape'
      AND indexname = 'idx_core_fin_fact_budget_phase'
  ) THEN
    CREATE INDEX idx_core_fin_fact_budget_phase
      ON landscape.core_fin_fact_budget(phase_id);
    RAISE NOTICE 'Created index idx_core_fin_fact_budget_phase';
  END IF;
END$$;

-- ============================================================================
-- Section 2: UOM integrity for budget facts (Project 7 and beyond)
-- ============================================================================
-- Normalize UOM casing for consistency
UPDATE landscape.core_fin_fact_budget
SET uom_code = UPPER(TRIM(uom_code))
WHERE uom_code IS NOT NULL
  AND uom_code <> UPPER(TRIM(uom_code));

-- Ensure measure rows exist for any referenced codes
INSERT INTO landscape.tbl_measures (measure_code, measure_name, measure_category, is_system)
SELECT DISTINCT
  cf.uom_code,
  CASE UPPER(cf.uom_code)
    WHEN 'AC' THEN 'Acre'
    WHEN 'SF' THEN 'Square Foot'
    WHEN 'LF' THEN 'Linear Foot'
    WHEN 'EA' THEN 'Each'
    WHEN 'CY' THEN 'Cubic Yard'
    WHEN 'LS' THEN 'Lump Sum'
    ELSE UPPER(cf.uom_code)
  END AS measure_name,
  CASE UPPER(cf.uom_code)
    WHEN 'AC' THEN 'area'
    WHEN 'SF' THEN 'area'
    WHEN 'LF' THEN 'length'
    WHEN 'EA' THEN 'count'
    WHEN 'CY' THEN 'volume'
    WHEN 'LS' THEN 'lump_sum'
    ELSE 'custom'
  END AS measure_category,
  TRUE
FROM landscape.core_fin_fact_budget cf
LEFT JOIN landscape.tbl_measures tm
  ON tm.measure_code = cf.uom_code
WHERE cf.uom_code IS NOT NULL
  AND tm.measure_code IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_core_fin_fact_budget_uom_code'
      AND connamespace = 'landscape'::regnamespace
  ) THEN
    ALTER TABLE landscape.core_fin_fact_budget
      ADD CONSTRAINT fk_core_fin_fact_budget_uom_code
        FOREIGN KEY (uom_code) REFERENCES landscape.tbl_measures(measure_code);
    RAISE NOTICE 'Added FK landscape.core_fin_fact_budget.uom_code → tbl_measures.measure_code';
  END IF;
END$$;

-- ============================================================================
-- Section 3: Global benchmark tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_benchmark_market_timing (
  benchmark_timing_id SERIAL PRIMARY KEY,
  process_name           VARCHAR(100) NOT NULL,
  process_display_name   VARCHAR(100) NOT NULL,
  duration_months        INTEGER NOT NULL,
  dependency_trigger     VARCHAR(100),
  dependency_display_name VARCHAR(100),
  offset_months          INTEGER DEFAULT 0,
  market_geography       VARCHAR(100) DEFAULT 'national',
  data_source            VARCHAR(200),
  last_updated           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active              BOOLEAN DEFAULT TRUE,
  sort_order             INTEGER DEFAULT 0,
  notes                  TEXT,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_benchmark_duration_positive CHECK (duration_months >= 0)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_timing_geography
  ON landscape.tbl_benchmark_market_timing(market_geography);

CREATE INDEX IF NOT EXISTS idx_benchmark_timing_active
  ON landscape.tbl_benchmark_market_timing(is_active);

COMMENT ON TABLE landscape.tbl_benchmark_market_timing IS
  'Global benchmark assumptions for development process timing and dependencies';

CREATE TABLE IF NOT EXISTS landscape.tbl_benchmark_absorption_velocity (
  benchmark_velocity_id SERIAL PRIMARY KEY,
  classification_code        VARCHAR(50) NOT NULL UNIQUE,
  classification_display_name VARCHAR(100) NOT NULL,
  units_per_month            NUMERIC(6,2) NOT NULL,
  builder_inventory_target_min_months INTEGER DEFAULT 18,
  builder_inventory_target_max_months INTEGER DEFAULT 24,
  market_geography           VARCHAR(100) DEFAULT 'national',
  data_source                VARCHAR(200),
  last_updated               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active                  BOOLEAN DEFAULT TRUE,
  sort_order                 INTEGER DEFAULT 0,
  notes                      TEXT,
  created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_benchmark_velocity_positive CHECK (units_per_month > 0),
  CONSTRAINT chk_inventory_targets CHECK (builder_inventory_target_min_months <= builder_inventory_target_max_months)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_velocity_active
  ON landscape.tbl_benchmark_absorption_velocity(is_active);

CREATE INDEX IF NOT EXISTS idx_benchmark_velocity_geography
  ON landscape.tbl_benchmark_absorption_velocity(market_geography);

COMMENT ON TABLE landscape.tbl_benchmark_absorption_velocity IS
  'Global benchmark absorption rates by residential product classification';

-- Seed defaults (idempotent)
INSERT INTO landscape.tbl_benchmark_market_timing (
  process_name,
  process_display_name,
  duration_months,
  dependency_trigger,
  dependency_display_name,
  offset_months,
  sort_order
)
SELECT seed.process_name,
       seed.process_display_name,
       seed.duration_months,
       seed.dependency_trigger,
       seed.dependency_display_name,
       seed.offset_months,
       seed.sort_order
FROM (
  VALUES
    ('subdivision_improvement', 'Subdivision Improvement (on-site)', 14, 'offsite_completion', 'Offsite Completion', 0, 1),
    ('subdivision_improvement', 'Subdivision Improvement (on-site)', 14, 'parcel_sale', 'Parcel Sale', 0, 1),
    ('model_home_start', 'Model Home Start', 0, 'subdivision_completion', 'Subdivision Completion', -2, 2),
    ('model_home_construction', 'Model Home Construction', 6, 'model_home_start', 'Model Home Start', 0, 3),
    ('sales_start', 'Sales Start', 1, 'model_home_completion', 'Model Home Completion', 0, 4)
) AS seed(process_name, process_display_name, duration_months, dependency_trigger, dependency_display_name, offset_months, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM landscape.tbl_benchmark_market_timing b
  WHERE b.process_name = seed.process_name
    AND COALESCE(b.dependency_trigger, '') = COALESCE(seed.dependency_trigger, '')
    AND b.sort_order = seed.sort_order
);

INSERT INTO landscape.tbl_benchmark_absorption_velocity (
  classification_code,
  classification_display_name,
  units_per_month,
  sort_order
)
SELECT seed.classification_code,
       seed.classification_display_name,
       seed.units_per_month,
       seed.sort_order
FROM (
  VALUES
    ('slow_large', 'Slow - Large Product', 3.0, 1),
    ('average_standard', 'Average - Standard Product', 5.0, 2),
    ('fast_small', 'Fast - Small Product', 8.0, 3)
) AS seed(classification_code, classification_display_name, units_per_month, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM landscape.tbl_benchmark_absorption_velocity b
  WHERE b.classification_code = seed.classification_code
);

-- ============================================================================
-- Section 4: Project-level overrides
-- ============================================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_project_timing_assumptions (
  project_timing_id SERIAL PRIMARY KEY,
  project_id            INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  benchmark_timing_id   INTEGER REFERENCES landscape.tbl_benchmark_market_timing(benchmark_timing_id),
  process_name          VARCHAR(100) NOT NULL,
  process_display_name  VARCHAR(100),
  duration_months_override INTEGER,
  dependency_trigger_override VARCHAR(100),
  offset_months_override INTEGER,
  override_reason       TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_duration_override_positive CHECK (duration_months_override IS NULL OR duration_months_override > 0)
);

CREATE INDEX IF NOT EXISTS idx_project_timing_project
  ON landscape.tbl_project_timing_assumptions(project_id);

CREATE INDEX IF NOT EXISTS idx_project_timing_benchmark
  ON landscape.tbl_project_timing_assumptions(benchmark_timing_id);

COMMENT ON TABLE landscape.tbl_project_timing_assumptions IS
  'Project-specific timing assumptions that override global benchmarks';

CREATE TABLE IF NOT EXISTS landscape.tbl_project_absorption_assumptions (
  project_absorption_id SERIAL PRIMARY KEY,
  project_id            INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  benchmark_velocity_id INTEGER REFERENCES landscape.tbl_benchmark_absorption_velocity(benchmark_velocity_id),
  classification_code   VARCHAR(50) NOT NULL,
  classification_display_name VARCHAR(100),
  units_per_month_override NUMERIC(6,2),
  override_reason        TEXT,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_velocity_override_positive CHECK (units_per_month_override IS NULL OR units_per_month_override > 0),
  CONSTRAINT uq_project_absorption UNIQUE (project_id, classification_code)
);

CREATE INDEX IF NOT EXISTS idx_project_absorption_project
  ON landscape.tbl_project_absorption_assumptions(project_id);

CREATE INDEX IF NOT EXISTS idx_project_absorption_benchmark
  ON landscape.tbl_project_absorption_assumptions(benchmark_velocity_id);

COMMENT ON TABLE landscape.tbl_project_absorption_assumptions IS
  'Project-specific absorption velocity assumptions that override global benchmarks';

-- ============================================================================
-- Section 5: Parcel sale events and absorption profile tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_parcel_sale_event (
  sale_event_id SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
  parcel_id         INTEGER NOT NULL REFERENCES landscape.tbl_parcel(parcel_id),
  phase_id          INTEGER REFERENCES landscape.tbl_phase(phase_id),
  sale_type         VARCHAR(50) NOT NULL,
  buyer_entity      VARCHAR(200) NOT NULL,
  buyer_contact_id  INTEGER REFERENCES landscape.tbl_contacts(contact_id),
  contract_date     DATE NOT NULL,
  total_lots_contracted INTEGER NOT NULL,
  base_price_per_lot NUMERIC(12,2) NOT NULL,
  price_escalation_formula TEXT,
  deposit_amount    NUMERIC(12,2),
  deposit_date      DATE,
  deposit_terms     VARCHAR(100),
  deposit_applied_to_purchase BOOLEAN DEFAULT TRUE,
  has_escrow_holdback BOOLEAN DEFAULT FALSE,
  escrow_holdback_amount NUMERIC(12,2),
  escrow_release_terms TEXT,
  sale_status       VARCHAR(50) DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sale_type_valid CHECK (sale_type IN ('single_closing', 'structured_sale', 'bulk_assignment')),
  CONSTRAINT chk_sale_status_valid CHECK (sale_status IN ('pending', 'active', 'closed', 'terminated')),
  CONSTRAINT chk_total_lots_positive CHECK (total_lots_contracted > 0),
  CONSTRAINT chk_base_price_positive CHECK (base_price_per_lot > 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_event_project
  ON landscape.tbl_parcel_sale_event(project_id);

CREATE INDEX IF NOT EXISTS idx_sale_event_parcel
  ON landscape.tbl_parcel_sale_event(parcel_id);

CREATE INDEX IF NOT EXISTS idx_sale_event_phase
  ON landscape.tbl_parcel_sale_event(phase_id);

CREATE INDEX IF NOT EXISTS idx_sale_event_status
  ON landscape.tbl_parcel_sale_event(sale_status);

CREATE INDEX IF NOT EXISTS idx_sale_event_buyer
  ON landscape.tbl_parcel_sale_event(buyer_entity);

COMMENT ON TABLE landscape.tbl_parcel_sale_event IS
  'Master record of parcel sales to builders - single closing or structured takedowns';

CREATE TABLE IF NOT EXISTS landscape.tbl_closing_event (
  closing_id SERIAL PRIMARY KEY,
  sale_event_id   INTEGER NOT NULL REFERENCES landscape.tbl_parcel_sale_event(sale_event_id) ON DELETE CASCADE,
  closing_sequence INTEGER NOT NULL DEFAULT 1,
  closing_date     DATE NOT NULL,
  lots_closed      INTEGER NOT NULL,
  gross_proceeds   NUMERIC(15,2) NOT NULL,
  less_commissions_amount NUMERIC(12,2) DEFAULT 0,
  less_closing_costs NUMERIC(12,2) DEFAULT 0,
  less_improvements_credit NUMERIC(12,2) DEFAULT 0,
  net_proceeds     NUMERIC(15,2) NOT NULL,
  cumulative_lots_closed INTEGER NOT NULL,
  lots_remaining   INTEGER NOT NULL,
  escrow_release_amount NUMERIC(12,2),
  escrow_release_date  DATE,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_lots_closed_positive CHECK (lots_closed > 0),
  CONSTRAINT chk_gross_proceeds_positive CHECK (gross_proceeds > 0),
  CONSTRAINT uq_closing_sequence UNIQUE (sale_event_id, closing_sequence)
);

CREATE INDEX IF NOT EXISTS idx_closing_sale_event
  ON landscape.tbl_closing_event(sale_event_id);

CREATE INDEX IF NOT EXISTS idx_closing_date
  ON landscape.tbl_closing_event(closing_date);

COMMENT ON TABLE landscape.tbl_closing_event IS
  'Individual closing transactions - one per single_closing sale, multiple per structured_sale';

CREATE TABLE IF NOT EXISTS landscape.tbl_parcel_absorption_profile (
  absorption_profile_id SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
  parcel_id       INTEGER NOT NULL REFERENCES landscape.tbl_parcel(parcel_id),
  sale_event_id   INTEGER REFERENCES landscape.tbl_parcel_sale_event(sale_event_id),
  product_classification_code VARCHAR(50),
  absorption_velocity_override NUMERIC(6,2),
  sales_start_date DATE,
  initial_inventory_lots INTEGER NOT NULL,
  projected_sellout_date DATE,
  months_to_sellout INTEGER,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_parcel_absorption UNIQUE (parcel_id),
  CONSTRAINT chk_velocity_override_positive CHECK (absorption_velocity_override IS NULL OR absorption_velocity_override > 0)
);

CREATE INDEX IF NOT EXISTS idx_absorption_profile_project
  ON landscape.tbl_parcel_absorption_profile(project_id);

CREATE INDEX IF NOT EXISTS idx_absorption_profile_parcel
  ON landscape.tbl_parcel_absorption_profile(parcel_id);

CREATE INDEX IF NOT EXISTS idx_absorption_profile_sale_event
  ON landscape.tbl_parcel_absorption_profile(sale_event_id);

COMMENT ON TABLE landscape.tbl_parcel_absorption_profile IS
  'Absorption velocity assumptions per parcel for inventory thermometer calculations';

-- ============================================================================
-- Section 6: Inventory gauge view
-- ============================================================================
DROP VIEW IF EXISTS landscape.vw_annual_inventory_gauge;

CREATE VIEW landscape.vw_annual_inventory_gauge AS
WITH parcel_sales AS (
  SELECT
    p.project_id,
    p.parcel_id,
    p.phase_id,
    COALESCE(pap.initial_inventory_lots, p.units, 0) AS total_lots,
    COALESCE(
      pap.absorption_velocity_override,
      paa.units_per_month_override,
      bav.units_per_month,
      5.0
    ) AS velocity_per_month,
    COALESCE(
      pap.sales_start_date,
      first_closing.closing_date + INTERVAL '18 months'
    ) AS sales_start_date,
    first_closing.closing_date AS lot_delivery_date
  FROM landscape.tbl_parcel p
  LEFT JOIN landscape.tbl_parcel_sale_event pse
    ON p.parcel_id = pse.parcel_id
   AND pse.sale_status IN ('pending', 'active', 'closed')
  LEFT JOIN LATERAL (
    SELECT ce.closing_date
    FROM landscape.tbl_closing_event ce
    WHERE ce.sale_event_id = pse.sale_event_id
    ORDER BY ce.closing_sequence
    LIMIT 1
  ) AS first_closing ON TRUE
  LEFT JOIN landscape.tbl_parcel_absorption_profile pap
    ON p.parcel_id = pap.parcel_id
  LEFT JOIN LATERAL (
    SELECT paa.*
    FROM landscape.tbl_project_absorption_assumptions paa
    WHERE paa.project_id = p.project_id
      AND (
        pap.product_classification_code IS NULL
        OR paa.classification_code = pap.product_classification_code
      )
    ORDER BY
      (paa.units_per_month_override IS NOT NULL) DESC,
      paa.updated_at DESC
    LIMIT 1
  ) AS paa ON TRUE
  LEFT JOIN landscape.tbl_benchmark_absorption_velocity bav
    ON bav.classification_code = COALESCE(
      pap.product_classification_code,
      paa.classification_code
    )
),
parcel_months AS (
  SELECT
    ps.project_id,
    ps.parcel_id,
    ps.phase_id,
    ps.total_lots,
    ps.velocity_per_month,
    ps.sales_start_date,
    ps.lot_delivery_date,
    month_start
  FROM parcel_sales ps
  JOIN LATERAL (
    SELECT generate_series(
      date_trunc('month', COALESCE(ps.sales_start_date, ps.lot_delivery_date)),
      date_trunc('month', COALESCE(ps.sales_start_date, ps.lot_delivery_date)) +
        (COALESCE(
           CEILING(
             (ps.total_lots::NUMERIC) /
             NULLIF(ps.velocity_per_month, 0)
           ),
           0
         )::INT + 36) * INTERVAL '1 month',
      INTERVAL '1 month'
    ) AS month_start
  ) AS months ON ps.total_lots > 0
             AND ps.velocity_per_month > 0
             AND ps.sales_start_date IS NOT NULL
),
monthly_absorption AS (
  SELECT
    pm.project_id,
    pm.parcel_id,
    pm.phase_id,
    pm.month_start,
    pm.total_lots,
    pm.velocity_per_month,
    pm.sales_start_date,
    pm.lot_delivery_date,
    CASE
      WHEN pm.month_start < date_trunc('month', pm.sales_start_date) THEN 0::NUMERIC
      ELSE LEAST(
        pm.velocity_per_month,
        GREATEST(
          0::NUMERIC,
          pm.total_lots::NUMERIC - pm.velocity_per_month *
            (
              CAST(DATE_PART('year', age(pm.month_start, date_trunc('month', pm.sales_start_date))) AS NUMERIC) * 12 +
              CAST(DATE_PART('month', age(pm.month_start, date_trunc('month', pm.sales_start_date))) AS NUMERIC)
            )
        )
      )
    END AS lots_absorbed_in_month
  FROM parcel_months pm
),
yearly_absorption AS (
  SELECT
    project_id,
    EXTRACT(YEAR FROM month_start)::INTEGER AS year,
    SUM(lots_absorbed_in_month) AS lots_absorbed
  FROM monthly_absorption
  GROUP BY project_id, year
),
yearly_deliveries AS (
  SELECT
    project_id,
    EXTRACT(YEAR FROM lot_delivery_date)::INTEGER AS year,
    SUM(total_lots) AS lots_delivered
  FROM parcel_sales
  WHERE lot_delivery_date IS NOT NULL
  GROUP BY project_id, year
),
combined_years AS (
  SELECT DISTINCT project_id, year
  FROM (
    SELECT project_id, year FROM yearly_absorption
    UNION
    SELECT project_id, year FROM yearly_deliveries
  ) AS yrs
)
SELECT
  years.project_id,
  years.year,
  COALESCE(deliveries.lots_delivered, 0)::NUMERIC AS lots_delivered,
  COALESCE(absorption.lots_absorbed, 0)::NUMERIC AS lots_absorbed,
  SUM(
    COALESCE(deliveries.lots_delivered, 0)::NUMERIC -
    COALESCE(absorption.lots_absorbed, 0)::NUMERIC
  ) OVER (
    PARTITION BY years.project_id
    ORDER BY years.year
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS year_end_inventory
FROM combined_years years
LEFT JOIN yearly_deliveries deliveries
  ON deliveries.project_id = years.project_id
 AND deliveries.year = years.year
LEFT JOIN yearly_absorption absorption
  ON absorption.project_id = years.project_id
 AND absorption.year = years.year
ORDER BY years.project_id, years.year;

COMMENT ON VIEW landscape.vw_annual_inventory_gauge IS
  'Annual inventory position showing lots delivered vs absorbed for thermometer visualization';

COMMIT;
