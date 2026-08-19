-- =====================================================================
-- Landscape Financial Engine - Phase 1.5 Migration
-- Dependencies, Revenue (Absorption), Enhanced Finance
-- Version: 1.5
-- Date: 2025-10-13
-- Description: Adds universal dependency tracking, absorption/revenue
--              modeling, enhanced debt facilities, and equity partners
-- =====================================================================

-- Set search path
SET search_path TO landscape, public;

-- =====================================================================
-- SECTION 1: UNIVERSAL DEPENDENCY SYSTEM
-- =====================================================================

-- tbl_item_dependency: Universal dependency tracking across costs, revenue, financing
CREATE TABLE IF NOT EXISTS landscape.tbl_item_dependency (
  dependency_id       BIGSERIAL PRIMARY KEY,

  -- Dependent item (the item that depends on something else)
  dependent_item_type VARCHAR(50) NOT NULL
    CHECK (dependent_item_type IN ('COST','REVENUE','FINANCING')),
  dependent_item_table VARCHAR(100) NOT NULL,
  dependent_item_id   BIGINT NOT NULL,

  -- Trigger item (what we're dependent on)
  trigger_item_type   VARCHAR(50),
  trigger_item_table  VARCHAR(100),
  trigger_item_id     BIGINT,

  -- Trigger event type
  trigger_event       VARCHAR(50) NOT NULL DEFAULT 'ABSOLUTE'
    CHECK (trigger_event IN (
      'ABSOLUTE',           -- Starts at absolute period
      'START',              -- After trigger item starts
      'COMPLETE',           -- After trigger item completes
      'PCT_COMPLETE',       -- At X% complete of trigger item
      'CUMULATIVE_AMOUNT',  -- After cumulative $ threshold
      'UNIT_COUNT',         -- After X units sold/completed
      'PERIOD_COUNT'        -- After X periods elapsed
    )),

  -- Trigger parameters
  trigger_value       NUMERIC(15,2),  -- Percentage, amount, count, etc.
  offset_periods      INTEGER DEFAULT 0,  -- Periods to offset after trigger

  -- Dependency metadata
  is_hard_dependency  BOOLEAN DEFAULT FALSE,  -- Hard = cannot proceed if trigger fails
  notes               TEXT,

  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_dependency_dependent
  ON landscape.tbl_item_dependency(dependent_item_type, dependent_item_id);
CREATE INDEX IF NOT EXISTS idx_item_dependency_trigger
  ON landscape.tbl_item_dependency(trigger_item_type, trigger_item_id);

COMMENT ON TABLE landscape.tbl_item_dependency IS 'Universal dependency tracking linking costs, revenue, and financing items';
COMMENT ON COLUMN landscape.tbl_item_dependency.trigger_event IS 'ABSOLUTE, START, COMPLETE, PCT_COMPLETE, CUMULATIVE_AMOUNT, UNIT_COUNT, PERIOD_COUNT';
COMMENT ON COLUMN landscape.tbl_item_dependency.is_hard_dependency IS 'If true, dependent cannot proceed if trigger condition not met';

-- =====================================================================
-- SECTION 2: REVENUE & ABSORPTION MODELING
-- =====================================================================

-- tbl_absorption_schedule: Revenue stream absorption/sales schedule
CREATE TABLE IF NOT EXISTS landscape.tbl_absorption_schedule (
  absorption_id       BIGSERIAL PRIMARY KEY,
  project_id          BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  area_id             BIGINT REFERENCES landscape.tbl_area(area_id) ON DELETE CASCADE,
  phase_id            BIGINT REFERENCES landscape.tbl_phase(phase_id) ON DELETE CASCADE,
  parcel_id           BIGINT REFERENCES landscape.tbl_parcel(parcel_id) ON DELETE CASCADE,

  -- Revenue stream definition
  revenue_stream_name VARCHAR(200) NOT NULL,
  revenue_category    VARCHAR(100),  -- 'Residential Lots', 'Commercial Lease-Up', 'Land Sales'

  -- Product/land use linkage
  lu_family_name      VARCHAR(100),
  lu_type_code        VARCHAR(50),
  product_code        VARCHAR(100),

  -- Timing
  start_period        INTEGER,
  periods_to_complete INTEGER,
  timing_method       VARCHAR(50) DEFAULT 'ABSOLUTE'
    CHECK (timing_method IN ('ABSOLUTE','DEPENDENT','MANUAL')),

  -- Units & pricing
  units_per_period    NUMERIC(8,2),
  total_units         INTEGER,
  base_price_per_unit NUMERIC(12,2),
  price_escalation_pct NUMERIC(6,5) DEFAULT 0,  -- Per-period price escalation

  -- Scenario support
  scenario_name       VARCHAR(100) DEFAULT 'Base Case',
  probability_weight  NUMERIC(5,4) DEFAULT 1.0
    CHECK (probability_weight>=0 AND probability_weight<=1),

  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_absorption_project_period
  ON landscape.tbl_absorption_schedule(project_id, start_period);
CREATE INDEX IF NOT EXISTS idx_absorption_phase
  ON landscape.tbl_absorption_schedule(phase_id);
CREATE INDEX IF NOT EXISTS idx_absorption_parcel
  ON landscape.tbl_absorption_schedule(parcel_id);
CREATE INDEX IF NOT EXISTS idx_absorption_product
  ON landscape.tbl_absorption_schedule(product_code);

COMMENT ON TABLE landscape.tbl_absorption_schedule IS 'Revenue stream absorption/sales schedules with timing and pricing';
COMMENT ON COLUMN landscape.tbl_absorption_schedule.timing_method IS 'ABSOLUTE (fixed period), DEPENDENT (on trigger), or MANUAL';
COMMENT ON COLUMN landscape.tbl_absorption_schedule.price_escalation_pct IS 'Per-period price escalation rate';

-- tbl_revenue_timing: Period-by-period revenue detail
CREATE TABLE IF NOT EXISTS landscape.tbl_revenue_timing (
  revenue_timing_id      BIGSERIAL PRIMARY KEY,
  absorption_id          BIGINT NOT NULL REFERENCES landscape.tbl_absorption_schedule(absorption_id) ON DELETE CASCADE,
  period_id              BIGINT NOT NULL REFERENCES landscape.tbl_calculation_period(period_id) ON DELETE CASCADE,

  -- Units sold
  units_sold_this_period NUMERIC(8,2) DEFAULT 0,
  cumulative_units_sold  NUMERIC(12,2) DEFAULT 0,
  units_remaining        NUMERIC(12,2),

  -- Pricing & revenue
  average_price_this_period NUMERIC(12,2),
  gross_revenue          NUMERIC(15,2),

  -- Costs of sale
  sales_commission       NUMERIC(15,2) DEFAULT 0,
  closing_costs          NUMERIC(15,2) DEFAULT 0,

  -- Net revenue
  net_revenue            NUMERIC(15,2),

  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW(),

  CONSTRAINT uq_revenue_timing_period UNIQUE(absorption_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_revenue_timing_absorption
  ON landscape.tbl_revenue_timing(absorption_id, period_id);
CREATE INDEX IF NOT EXISTS idx_revenue_timing_period
  ON landscape.tbl_revenue_timing(period_id);

COMMENT ON TABLE landscape.tbl_revenue_timing IS 'Period-by-period revenue realization with units sold and pricing';

-- =====================================================================
-- SECTION 3: ENHANCED DEBT FACILITIES
-- =====================================================================

-- tbl_debt_facility: Construction/permanent debt facilities
CREATE TABLE IF NOT EXISTS landscape.tbl_debt_facility (
  facility_id         BIGSERIAL PRIMARY KEY,
  project_id          BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  -- Facility identification
  facility_name       VARCHAR(200) NOT NULL,
  facility_type       VARCHAR(50) NOT NULL
    CHECK (facility_type IN ('CONSTRUCTION','BRIDGE','PERMANENT','MEZZANINE')),
  lender_name         VARCHAR(200),

  -- Principal & interest
  commitment_amount   NUMERIC(15,2) NOT NULL,
  interest_rate       NUMERIC(6,5) NOT NULL,  -- e.g., 0.0575 = 5.75%
  interest_calculation VARCHAR(50) DEFAULT 'SIMPLE'
    CHECK (interest_calculation IN ('SIMPLE','COMPOUND')),
  payment_frequency   VARCHAR(50) DEFAULT 'MONTHLY'
    CHECK (payment_frequency IN ('MONTHLY','QUARTERLY','AT_MATURITY')),

  -- Dates
  commitment_date     DATE,
  maturity_date       DATE,
  maturity_period_id  BIGINT REFERENCES landscape.tbl_calculation_period(period_id),

  -- Fees
  origination_fee_pct NUMERIC(5,4),
  unused_fee_pct      NUMERIC(5,4),
  extension_fee_amount NUMERIC(12,2),

  -- Covenants (JSONB for flexibility)
  covenants           JSONB DEFAULT '{}',

  -- Draw behavior
  draw_trigger_type   VARCHAR(50) DEFAULT 'COST_INCURRED'
    CHECK (draw_trigger_type IN ('COST_INCURRED','MANUAL','MILESTONE','PCT_COMPLETE')),

  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_facility_project
  ON landscape.tbl_debt_facility(project_id);
CREATE INDEX IF NOT EXISTS idx_debt_facility_type
  ON landscape.tbl_debt_facility(facility_type);

COMMENT ON TABLE landscape.tbl_debt_facility IS 'Construction, permanent, bridge, and mezzanine debt facilities';
COMMENT ON COLUMN landscape.tbl_debt_facility.interest_rate IS 'Decimal rate (e.g., 0.0575 = 5.75%)';
COMMENT ON COLUMN landscape.tbl_debt_facility.covenants IS 'JSONB: LTC, DSCR, completion guarantees, etc.';

-- tbl_debt_draw_schedule: Period-by-period debt draws and interest
CREATE TABLE IF NOT EXISTS landscape.tbl_debt_draw_schedule (
  draw_id             BIGSERIAL PRIMARY KEY,
  facility_id         BIGINT NOT NULL REFERENCES landscape.tbl_debt_facility(facility_id) ON DELETE CASCADE,
  period_id           BIGINT NOT NULL REFERENCES landscape.tbl_calculation_period(period_id) ON DELETE CASCADE,

  -- Draw amounts
  draw_amount         NUMERIC(15,2) DEFAULT 0,
  cumulative_drawn    NUMERIC(15,2) DEFAULT 0,
  available_remaining NUMERIC(15,2),

  -- Balance tracking
  beginning_balance   NUMERIC(15,2),
  interest_amount     NUMERIC(15,2) DEFAULT 0,
  cumulative_interest NUMERIC(15,2) DEFAULT 0,
  principal_payment   NUMERIC(15,2) DEFAULT 0,
  ending_balance      NUMERIC(15,2),

  -- Draw metadata
  draw_request_date   DATE,
  draw_funded_date    DATE,
  draw_status         VARCHAR(50) DEFAULT 'PROJECTED'
    CHECK (draw_status IN ('PROJECTED','REQUESTED','FUNDED','ACTUAL')),

  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),

  CONSTRAINT uq_debt_draw_facility_period UNIQUE(facility_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_debt_draw_facility
  ON landscape.tbl_debt_draw_schedule(facility_id, period_id);
CREATE INDEX IF NOT EXISTS idx_debt_draw_period
  ON landscape.tbl_debt_draw_schedule(period_id);

COMMENT ON TABLE landscape.tbl_debt_draw_schedule IS 'Period-by-period debt draws, interest accrual, and principal payments';

-- =====================================================================
-- SECTION 4: EQUITY PARTNERS & DISTRIBUTIONS
-- =====================================================================

-- tbl_equity_partner: Equity partner/investor structure
CREATE TABLE IF NOT EXISTS landscape.tbl_equity_partner (
  partner_id          BIGSERIAL PRIMARY KEY,
  project_id          BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

  partner_name        VARCHAR(200) NOT NULL,
  partner_class       VARCHAR(50) NOT NULL
    CHECK (partner_class IN ('GP','LP','COMMON','PREFERRED')),

  -- Ownership & capital
  ownership_pct       NUMERIC(5,4),  -- e.g., 0.8000 = 80%
  committed_capital   NUMERIC(15,2),

  -- Waterfall terms
  preferred_return_pct NUMERIC(6,5),  -- e.g., 0.08000 = 8%
  promote_pct         NUMERIC(5,4),   -- e.g., 0.2000 = 20% promote
  hurdle_irr_pct      NUMERIC(6,5),   -- IRR hurdle for promote

  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equity_partner_project
  ON landscape.tbl_equity_partner(project_id);
CREATE INDEX IF NOT EXISTS idx_equity_partner_class
  ON landscape.tbl_equity_partner(partner_class);

COMMENT ON TABLE landscape.tbl_equity_partner IS 'Equity partner/investor structure with waterfall terms';
COMMENT ON COLUMN landscape.tbl_equity_partner.partner_class IS 'GP, LP, COMMON, or PREFERRED';

-- tbl_equity_distribution: Period-by-period equity distributions
CREATE TABLE IF NOT EXISTS landscape.tbl_equity_distribution (
  distribution_id     BIGSERIAL PRIMARY KEY,
  partner_id          BIGINT NOT NULL REFERENCES landscape.tbl_equity_partner(partner_id) ON DELETE CASCADE,
  period_id           BIGINT REFERENCES landscape.tbl_calculation_period(period_id) ON DELETE CASCADE,

  distribution_type   VARCHAR(50) NOT NULL
    CHECK (distribution_type IN ('CAPITAL_CALL','RETURN_OF_CAPITAL','PREFERRED_RETURN','PROMOTE','RESIDUAL')),

  -- Amounts
  amount              NUMERIC(15,2) NOT NULL,
  cumulative_amount   NUMERIC(15,2),
  unpaid_preferred_return NUMERIC(15,2) DEFAULT 0,  -- Accrued unpaid preferred return

  -- Distribution metadata
  distribution_date   DATE,
  distribution_status VARCHAR(50) DEFAULT 'PROJECTED'
    CHECK (distribution_status IN ('PROJECTED','APPROVED','PAID')),

  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equity_distribution_partner
  ON landscape.tbl_equity_distribution(partner_id, period_id);
CREATE INDEX IF NOT EXISTS idx_equity_distribution_period
  ON landscape.tbl_equity_distribution(period_id);
CREATE INDEX IF NOT EXISTS idx_equity_distribution_type
  ON landscape.tbl_equity_distribution(distribution_type);

COMMENT ON TABLE landscape.tbl_equity_distribution IS 'Period-by-period equity distributions: capital calls, returns, promotes';
COMMENT ON COLUMN landscape.tbl_equity_distribution.distribution_type IS 'CAPITAL_CALL, RETURN_OF_CAPITAL, PREFERRED_RETURN, PROMOTE, or RESIDUAL';

-- =====================================================================
-- SECTION 5: ENHANCE EXISTING TABLES
-- =====================================================================

-- Enhance tbl_budget_items with timing and actual tracking
DO $$
BEGIN
  -- Timing method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget_items'
                 AND column_name = 'timing_method') THEN
    ALTER TABLE landscape.tbl_budget_items
      ADD COLUMN timing_method VARCHAR(50) DEFAULT 'ABSOLUTE'
        CHECK (timing_method IN ('ABSOLUTE','DEPENDENT','MANUAL'));
  END IF;

  -- Timing locked flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget_items'
                 AND column_name = 'timing_locked') THEN
    ALTER TABLE landscape.tbl_budget_items
      ADD COLUMN timing_locked BOOLEAN DEFAULT FALSE;
  END IF;

  -- S-curve profile
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget_items'
                 AND column_name = 's_curve_profile') THEN
    ALTER TABLE landscape.tbl_budget_items
      ADD COLUMN s_curve_profile VARCHAR(50) DEFAULT 'LINEAR'
        CHECK (s_curve_profile IN ('LINEAR','FRONT_LOADED','BACK_LOADED','BELL_CURVE'));
  END IF;

  -- Actual tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget_items'
                 AND column_name = 'actual_amount') THEN
    ALTER TABLE landscape.tbl_budget_items
      ADD COLUMN actual_amount NUMERIC(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget_items'
                 AND column_name = 'actual_quantity') THEN
    ALTER TABLE landscape.tbl_budget_items
      ADD COLUMN actual_quantity NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget_items'
                 AND column_name = 'actual_period_id') THEN
    ALTER TABLE landscape.tbl_budget_items
      ADD COLUMN actual_period_id BIGINT REFERENCES landscape.tbl_calculation_period(period_id);
  END IF;

  -- Variance tracking (generated columns)
  -- Note: PostgreSQL doesn't support GENERATED columns with external table references,
  -- so we'll use regular columns and calculate in application/views
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget_items'
                 AND column_name = 'variance_amount') THEN
    ALTER TABLE landscape.tbl_budget_items
      ADD COLUMN variance_amount NUMERIC(15,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_budget_items'
                 AND column_name = 'variance_pct') THEN
    ALTER TABLE landscape.tbl_budget_items
      ADD COLUMN variance_pct NUMERIC(6,4);
  END IF;
END$$;

COMMENT ON COLUMN landscape.tbl_budget_items.timing_method IS 'ABSOLUTE (fixed period), DEPENDENT (on trigger), or MANUAL';
COMMENT ON COLUMN landscape.tbl_budget_items.s_curve_profile IS 'LINEAR, FRONT_LOADED, BACK_LOADED, or BELL_CURVE';
COMMENT ON COLUMN landscape.tbl_budget_items.variance_amount IS 'Budget - Actual amount';

-- Enhance tbl_calculation_period with status tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_calculation_period'
                 AND column_name = 'period_status') THEN
    ALTER TABLE landscape.tbl_calculation_period
      ADD COLUMN period_status VARCHAR(50) DEFAULT 'OPEN'
        CHECK (period_status IN ('OPEN','CLOSED','LOCKED'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_calculation_period'
                 AND column_name = 'closed_date') THEN
    ALTER TABLE landscape.tbl_calculation_period
      ADD COLUMN closed_date TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'landscape'
                 AND table_name = 'tbl_calculation_period'
                 AND column_name = 'closed_by_user_id') THEN
    ALTER TABLE landscape.tbl_calculation_period
      ADD COLUMN closed_by_user_id BIGINT;
  END IF;
END$$;

COMMENT ON COLUMN landscape.tbl_calculation_period.period_status IS 'OPEN (active), CLOSED (finalized), or LOCKED (no changes allowed)';

-- =====================================================================
-- SECTION 6: DEPENDENCY & BUDGET VIEWS
-- =====================================================================

-- View: Dependency status with calculated start periods
CREATE OR REPLACE VIEW landscape.vw_item_dependency_status AS
SELECT
  d.dependency_id,
  d.dependent_item_type,
  d.dependent_item_table,
  d.dependent_item_id,
  d.trigger_event,
  d.trigger_value,
  d.offset_periods,
  d.is_hard_dependency,

  -- Trigger timing from budget items
  CASE WHEN d.trigger_item_table='tbl_budget_items' THEN bi.start_period END AS trigger_start_period,
  CASE WHEN d.trigger_item_table='tbl_budget_items' THEN bi.start_period + bi.periods_to_complete END AS trigger_completion_period,

  -- Trigger timing from absorption schedule
  CASE WHEN d.trigger_item_table='tbl_absorption_schedule' THEN ab.start_period END AS trigger_revenue_start_period,
  CASE WHEN d.trigger_item_table='tbl_absorption_schedule' THEN ab.start_period + ab.periods_to_complete END AS trigger_revenue_completion_period,

  -- Calculate dependent item start period based on trigger
  CASE
    WHEN d.trigger_event='ABSOLUTE' THEN d.offset_periods
    WHEN d.trigger_event='COMPLETE' AND d.trigger_item_table='tbl_budget_items'
      THEN bi.start_period + bi.periods_to_complete + d.offset_periods
    WHEN d.trigger_event='START' AND d.trigger_item_table='tbl_budget_items'
      THEN bi.start_period + d.offset_periods
    WHEN d.trigger_event='PCT_COMPLETE' AND d.trigger_item_table='tbl_budget_items'
      THEN bi.start_period + FLOOR(bi.periods_to_complete * (d.trigger_value/100.0)) + d.offset_periods
    WHEN d.trigger_event='COMPLETE' AND d.trigger_item_table='tbl_absorption_schedule'
      THEN ab.start_period + ab.periods_to_complete + d.offset_periods
    WHEN d.trigger_event='START' AND d.trigger_item_table='tbl_absorption_schedule'
      THEN ab.start_period + d.offset_periods
  END AS calculated_start_period,

  NOW() AS calculated_at
FROM landscape.tbl_item_dependency d
LEFT JOIN landscape.tbl_budget_items bi
  ON d.trigger_item_table='tbl_budget_items' AND d.trigger_item_id=bi.budget_item_id
LEFT JOIN landscape.tbl_absorption_schedule ab
  ON d.trigger_item_table='tbl_absorption_schedule' AND d.trigger_item_id=ab.absorption_id;

COMMENT ON VIEW landscape.vw_item_dependency_status IS 'Dependency status with calculated start periods based on trigger conditions';

-- View: Budget items with dependency information
CREATE OR REPLACE VIEW landscape.vw_budget_with_dependencies AS
SELECT
  bi.*,
  d.dependency_id,
  d.trigger_event,
  d.trigger_value,
  d.offset_periods,
  d.is_hard_dependency,
  (d.dependency_id IS NOT NULL) AS has_dependency,

  -- Human-readable dependency summary
  CASE
    WHEN d.dependency_id IS NULL THEN 'No dependency'
    WHEN d.trigger_event='START' THEN
      'After item #'||d.trigger_item_id||' starts'||CASE WHEN d.offset_periods<>0 THEN ' +'||d.offset_periods||'p' ELSE '' END
    WHEN d.trigger_event='COMPLETE' THEN
      'After item #'||d.trigger_item_id||' completes'||CASE WHEN d.offset_periods<>0 THEN ' +'||d.offset_periods||'p' ELSE '' END
    WHEN d.trigger_event='PCT_COMPLETE' THEN
      'At '||d.trigger_value||'% of item #'||d.trigger_item_id
    ELSE 'Unknown dependency'
  END AS dependency_summary
FROM landscape.tbl_budget_items bi
LEFT JOIN landscape.tbl_item_dependency d
  ON d.dependent_item_type='COST'
  AND d.dependent_item_table='tbl_budget_items'
  AND d.dependent_item_id=bi.budget_item_id;

COMMENT ON VIEW landscape.vw_budget_with_dependencies IS 'Budget items with dependency information and human-readable summaries';

-- View: Revenue timeline summary
CREATE OR REPLACE VIEW landscape.vw_revenue_timeline AS
SELECT
  ab.absorption_id,
  ab.project_id,
  ab.revenue_stream_name,
  ab.revenue_category,
  ab.total_units,
  ab.base_price_per_unit,
  ab.price_escalation_pct,

  rt.period_id,
  cp.period_start_date,
  cp.period_end_date,

  rt.units_sold_this_period,
  rt.cumulative_units_sold,
  rt.units_remaining,
  rt.average_price_this_period,
  rt.gross_revenue,
  rt.sales_commission,
  rt.closing_costs,
  rt.net_revenue,

  -- Progress metrics
  ROUND((rt.cumulative_units_sold::NUMERIC / NULLIF(ab.total_units, 0)) * 100, 2) AS pct_complete
FROM landscape.tbl_absorption_schedule ab
JOIN landscape.tbl_revenue_timing rt ON ab.absorption_id = rt.absorption_id
JOIN landscape.tbl_calculation_period cp ON rt.period_id = cp.period_id
ORDER BY ab.absorption_id, cp.period_start_date;

COMMENT ON VIEW landscape.vw_revenue_timeline IS 'Revenue timeline with absorption progress by period';

-- View: Debt balance summary
CREATE OR REPLACE VIEW landscape.vw_debt_balance_summary AS
SELECT
  df.facility_id,
  df.project_id,
  df.facility_name,
  df.facility_type,
  df.commitment_amount,
  df.interest_rate,

  dds.period_id,
  cp.period_start_date,
  cp.period_end_date,

  dds.draw_amount,
  dds.cumulative_drawn,
  dds.available_remaining,
  dds.beginning_balance,
  dds.interest_amount,
  dds.cumulative_interest,
  dds.principal_payment,
  dds.ending_balance,

  -- Utilization
  ROUND((dds.cumulative_drawn::NUMERIC / NULLIF(df.commitment_amount, 0)) * 100, 2) AS utilization_pct
FROM landscape.tbl_debt_facility df
JOIN landscape.tbl_debt_draw_schedule dds ON df.facility_id = dds.facility_id
JOIN landscape.tbl_calculation_period cp ON dds.period_id = cp.period_id
ORDER BY df.facility_id, cp.period_start_date;

COMMENT ON VIEW landscape.vw_debt_balance_summary IS 'Debt facility balance summary by period with utilization metrics';

-- =====================================================================
-- SECTION 7: UTILITY FUNCTIONS
-- =====================================================================

-- Function: Calculate variance for budget items (to populate variance columns)
CREATE OR REPLACE FUNCTION landscape.update_budget_variance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.variance_amount := NEW.amount - COALESCE(NEW.actual_amount, 0);

  IF NEW.amount > 0 THEN
    NEW.variance_pct := (NEW.variance_amount / NEW.amount);
  ELSE
    NEW.variance_pct := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply variance trigger to tbl_budget_items
DROP TRIGGER IF EXISTS trg_budget_items_variance ON landscape.tbl_budget_items;
CREATE TRIGGER trg_budget_items_variance
  BEFORE INSERT OR UPDATE ON landscape.tbl_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION landscape.update_budget_variance();

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE 'Financial Engine Phase 1.5 Migration completed successfully at %', NOW();
  RAISE NOTICE 'Schema version: 1.5';
  RAISE NOTICE 'New tables: tbl_item_dependency, tbl_absorption_schedule, tbl_revenue_timing, tbl_debt_facility, tbl_debt_draw_schedule, tbl_equity_partner, tbl_equity_distribution';
  RAISE NOTICE 'Enhanced tables: tbl_budget_items (timing + actuals), tbl_calculation_period (status tracking)';
  RAISE NOTICE 'Views created: vw_item_dependency_status, vw_budget_with_dependencies, vw_revenue_timeline, vw_debt_balance_summary';
END$$;
