-- Migration 015: Milestone & Dependency System
-- Created: 2025-11-10
-- Purpose: Add milestone, dependency, and timeline logging scaffolding for automated CPM calculations

BEGIN;
SET search_path TO landscape, public;

-- ==========================================================================
-- Section 1: Milestone type reference data
-- ==========================================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_project_milestone_type (
  milestone_type VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE landscape.tbl_project_milestone_type IS
  'Lookup table for project milestone categories used in milestone scheduling and reporting';

CREATE INDEX IF NOT EXISTS idx_project_milestone_type_sort
  ON landscape.tbl_project_milestone_type(sort_order);

INSERT INTO landscape.tbl_project_milestone_type (
  milestone_type,
  display_name,
  description,
  sort_order
)
VALUES
  ('regulatory', 'Regulatory / Entitlements', 'Approvals, permits, and jurisdictional sign-offs', 10),
  ('construction', 'Construction / Completion', 'Gravity-driven construction progress events', 20),
  ('sales', 'Sales / Leasing', 'Marketing, sales launch, occupancy milestones', 30),
  ('financial', 'Financial / Closing', 'Financial events such as funding draws or sales closing', 40),
  ('other', 'Other / External', 'Third-party or owner-driven timing events', 50)
ON CONFLICT (milestone_type) DO NOTHING;

-- ==========================================================================
-- Section 2: Milestone table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_project_milestone (
  milestone_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  milestone_name VARCHAR(200) NOT NULL,
  milestone_code VARCHAR(50) NOT NULL,
  milestone_type VARCHAR(50) NOT NULL REFERENCES landscape.tbl_project_milestone_type(milestone_type),
  description TEXT,
  planned_date DATE,
  baseline_date DATE,
  current_date DATE,
  early_date DATE,
  late_date DATE,
  actual_date DATE,
  status VARCHAR(20) DEFAULT 'not_started',
  percent_complete NUMERIC(5,2) DEFAULT 0,
  is_critical BOOLEAN DEFAULT FALSE,
  float_days INTEGER,
  container_id BIGINT REFERENCES landscape.tbl_container(container_id) ON DELETE SET NULL,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_project_milestone_code UNIQUE (project_id, milestone_code),
  CONSTRAINT ck_project_milestone_percent CHECK (percent_complete BETWEEN 0 AND 100),
  CONSTRAINT ck_project_milestone_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT ck_project_milestone_actual_date CHECK (status != 'completed' OR actual_date IS NOT NULL)
);

COMMENT ON TABLE landscape.tbl_project_milestone IS
  'Event markers outside of the budget costs that participate in dependency-driven timelines';
COMMENT ON COLUMN landscape.tbl_project_milestone.percent_complete IS
  'Percent complete (0-100) for dashboard reporting';
COMMENT ON COLUMN landscape.tbl_project_milestone.is_critical IS
  'Flag indicating the milestone is on the current critical path';
COMMENT ON COLUMN landscape.tbl_project_milestone.current_date IS
  'Working forecast date updated by the timeline engine';

CREATE INDEX IF NOT EXISTS idx_project_milestone_project_status
  ON landscape.tbl_project_milestone(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_milestone_project_date
  ON landscape.tbl_project_milestone(project_id, current_date);
-- idx_project_milestone_code already implied by UNIQUE constraint

-- ==========================================================================
-- Section 3: Dependencies
-- ==========================================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_dependency (
  dependency_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  predecessor_type VARCHAR(20) NOT NULL,
  predecessor_id BIGINT NOT NULL,
  successor_type VARCHAR(20) NOT NULL,
  successor_id BIGINT NOT NULL,
  dependency_type VARCHAR(2) NOT NULL,
  lag_days INTEGER DEFAULT 0,
  is_hard_constraint BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT ck_dependency_predecessor_type CHECK (predecessor_type IN ('budget', 'milestone')),
  CONSTRAINT ck_dependency_successor_type CHECK (successor_type IN ('budget', 'milestone')),
  CONSTRAINT ck_dependency_dependency_type CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  CONSTRAINT ck_dependency_no_self CHECK (NOT (predecessor_type = successor_type AND predecessor_id = successor_id)),
  CONSTRAINT uq_dependency_unique
    UNIQUE (predecessor_type, predecessor_id, successor_type, successor_id)
);

COMMENT ON TABLE landscape.tbl_dependency IS
  'Polymorphic dependency relationships that drive the CPM calculation';

CREATE INDEX IF NOT EXISTS idx_dependency_predecessor
  ON landscape.tbl_dependency(predecessor_type, predecessor_id);
CREATE INDEX IF NOT EXISTS idx_dependency_successor
  ON landscape.tbl_dependency(successor_type, successor_id);
CREATE INDEX IF NOT EXISTS idx_dependency_project_active
  ON landscape.tbl_dependency(project_id, is_active);

-- ==========================================================================
-- Section 4: Timeline calculation log
-- ==========================================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_timeline_calculation_log (
  calculation_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  calculation_type VARCHAR(50) NOT NULL,
  trigger_event TEXT,
  items_updated INTEGER,
  critical_path_length_days INTEGER,
  calculation_duration_ms INTEGER,
  errors JSONB,
  warnings JSONB,
  calculated_by INT,
  calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeline_calc_log_project
  ON landscape.tbl_timeline_calculation_log(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_calc_log_calculated_at
  ON landscape.tbl_timeline_calculation_log(calculated_at DESC);

COMMENT ON TABLE landscape.tbl_timeline_calculation_log IS
  'Audit trail of timeline calculations for debugging, variance reporting, and runtime metrics';

-- ==========================================================================
-- Section 5: Timeline recalculation queue flag
-- ==========================================================================
CREATE TABLE IF NOT EXISTS landscape.tbl_timeline_recalculation_queue (
  queue_id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('budget', 'milestone')),
  item_id BIGINT NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  trigger_data JSONB,
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeline_recalc_queue_project
  ON landscape.tbl_timeline_recalculation_queue(project_id, is_processed);

COMMENT ON TABLE landscape.tbl_timeline_recalculation_queue IS
  'Queue entries that flag a project/timeline item needs recalculation';

-- ==========================================================================
-- Section 6: Enhanced core_fin_fact_budget
-- ==========================================================================
ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS baseline_start_date DATE,
  ADD COLUMN IF NOT EXISTS baseline_end_date DATE,
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,
  ADD COLUMN IF NOT EXISTS percent_complete NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS float_days INTEGER,
  ADD COLUMN IF NOT EXISTS early_start_date DATE,
  ADD COLUMN IF NOT EXISTS early_finish_date DATE,
  ADD COLUMN IF NOT EXISTS late_start_date DATE,
  ADD COLUMN IF NOT EXISTS late_finish_date DATE;

COMMENT ON COLUMN landscape.core_fin_fact_budget.baseline_start_date IS
  'Original planned start date used for variance reporting';
COMMENT ON COLUMN landscape.core_fin_fact_budget.baseline_end_date IS
  'Original planned end date used for variance reporting';
COMMENT ON COLUMN landscape.core_fin_fact_budget.actual_start_date IS
  'Actual start date (populated when status moves to in_progress)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.actual_end_date IS
  'Actual finish date (populated when status moves to completed)';
COMMENT ON COLUMN landscape.core_fin_fact_budget.percent_complete IS
  'Percent complete for earned-value reporting';
COMMENT ON COLUMN landscape.core_fin_fact_budget.is_critical IS
  'Flag when item sits on the critical path';
COMMENT ON COLUMN landscape.core_fin_fact_budget.float_days IS
  'Total float (slack) computed by the CPM engine';
COMMENT ON COLUMN landscape.core_fin_fact_budget.early_start_date IS
  'Forward pass early start result';
COMMENT ON COLUMN landscape.core_fin_fact_budget.early_finish_date IS
  'Forward pass early finish result';
COMMENT ON COLUMN landscape.core_fin_fact_budget.late_start_date IS
  'Backward pass late start result';
COMMENT ON COLUMN landscape.core_fin_fact_budget.late_finish_date IS
  'Backward pass late finish result';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_core_fin_fact_budget_percent_complete'
      AND connamespace = 'landscape'::regnamespace
  ) THEN
    ALTER TABLE landscape.core_fin_fact_budget
      ADD CONSTRAINT ck_core_fin_fact_budget_percent_complete
        CHECK (percent_complete BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_core_fin_fact_budget_status'
      AND connamespace = 'landscape'::regnamespace
  ) THEN
    ALTER TABLE landscape.core_fin_fact_budget
      ADD CONSTRAINT ck_core_fin_fact_budget_status
        CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_core_fin_fact_budget_actual_dates'
      AND connamespace = 'landscape'::regnamespace
  ) THEN
    ALTER TABLE landscape.core_fin_fact_budget
      ADD CONSTRAINT ck_core_fin_fact_budget_actual_dates
        CHECK (
          actual_start_date IS NULL
          OR actual_end_date IS NULL
          OR actual_end_date >= actual_start_date
        );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_core_fin_fact_budget_baseline_dates'
      AND connamespace = 'landscape'::regnamespace
  ) THEN
    ALTER TABLE landscape.core_fin_fact_budget
      ADD CONSTRAINT ck_core_fin_fact_budget_baseline_dates
        CHECK (
          baseline_start_date IS NULL
          OR baseline_end_date IS NULL
          OR baseline_end_date >= baseline_start_date
        );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget_status
  ON landscape.core_fin_fact_budget(status);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget_is_critical
  ON landscape.core_fin_fact_budget(is_critical);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget_float_days
  ON landscape.core_fin_fact_budget(float_days);

-- ==========================================================================
-- Section 7: Trigger functions and validation
-- ==========================================================================
CREATE OR REPLACE FUNCTION landscape.fn_protect_baseline_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.baseline_start_date IS NOT NULL
     AND NEW.baseline_start_date IS DISTINCT FROM OLD.baseline_start_date THEN
    RAISE EXCEPTION 'Baseline start date is locked for fact_id %', NEW.fact_id;
  END IF;

  IF OLD.baseline_end_date IS NOT NULL
     AND NEW.baseline_end_date IS DISTINCT FROM OLD.baseline_end_date THEN
    RAISE EXCEPTION 'Baseline end date is locked for fact_id %', NEW.fact_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_baseline_dates ON landscape.core_fin_fact_budget;
CREATE TRIGGER trg_protect_baseline_dates
  BEFORE UPDATE ON landscape.core_fin_fact_budget
  FOR EACH ROW
  EXECUTE FUNCTION landscape.fn_protect_baseline_dates();

CREATE OR REPLACE FUNCTION landscape.fn_queue_timeline_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO landscape.tbl_timeline_recalculation_queue (
    project_id,
    item_type,
    item_id,
    trigger_event,
    trigger_data
  ) VALUES (
    NEW.project_id,
    'budget',
    NEW.fact_id,
    'status_change',
    jsonb_build_object(
      'status_old', OLD.status,
      'status_new', NEW.status,
      'actual_start_old', OLD.actual_start_date,
      'actual_start_new', NEW.actual_start_date,
      'actual_end_old', OLD.actual_end_date,
      'actual_end_new', NEW.actual_end_date
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_status_change_recalc ON landscape.core_fin_fact_budget;
CREATE TRIGGER trg_status_change_recalc
  AFTER UPDATE OF status, actual_start_date, actual_end_date ON landscape.core_fin_fact_budget
  FOR EACH ROW
  WHEN (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.actual_start_date IS DISTINCT FROM OLD.actual_start_date
    OR NEW.actual_end_date IS DISTINCT FROM OLD.actual_end_date
  )
  EXECUTE FUNCTION landscape.fn_queue_timeline_recalculation();

CREATE OR REPLACE FUNCTION landscape.fn_detect_dependency_cycle()
RETURNS TRIGGER AS $$
DECLARE
  cycle_path TEXT;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  WITH RECURSIVE search_path AS (
    SELECT
      d.successor_type,
      d.successor_id,
      format('%s-%s → %s-%s', NEW.successor_type, NEW.successor_id, d.successor_type, d.successor_id) AS chain
    FROM landscape.tbl_dependency d
    WHERE d.project_id = NEW.project_id
      AND d.is_active
      AND d.predecessor_type = NEW.successor_type
      AND d.predecessor_id = NEW.successor_id
      AND (TG_OP != 'UPDATE' OR d.dependency_id != NEW.dependency_id)
    UNION ALL
    SELECT
      d2.successor_type,
      d2.successor_id,
      format('%s → %s-%s', search_path.chain, d2.successor_type, d2.successor_id)
    FROM landscape.tbl_dependency d2
    JOIN search_path
      ON d2.predecessor_type = search_path.successor_type
      AND d2.predecessor_id = search_path.successor_id
    WHERE d2.project_id = NEW.project_id
      AND d2.is_active
  )
  SELECT format('%s-%s → %s', NEW.predecessor_type, NEW.predecessor_id, chain)
  INTO cycle_path
  FROM search_path
  WHERE successor_type = NEW.predecessor_type
    AND successor_id = NEW.predecessor_id
  LIMIT 1;

  IF cycle_path IS NOT NULL THEN
    RAISE EXCEPTION 'Circular dependency detected: %', cycle_path;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_dependency ON landscape.tbl_dependency;
CREATE CONSTRAINT TRIGGER trg_validate_dependency
  AFTER INSERT OR UPDATE ON landscape.tbl_dependency
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  WHEN (NEW.is_active IS TRUE)
  EXECUTE FUNCTION landscape.fn_detect_dependency_cycle();

COMMIT;
