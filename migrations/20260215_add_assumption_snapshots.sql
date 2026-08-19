-- Migration: Create tbl_assumption_snapshot for normalized scenario overrides
-- Date: 2026-02-15
-- Phase: 3 (Scenario Log + Snapshots)
-- Description: Normalized table that denormalizes overrides from scenario_data JSONB
--              into queryable rows for SQL-based reporting and filtering.

-- =========================================================================
-- UP
-- =========================================================================

CREATE TABLE landscape.tbl_assumption_snapshot (
    snapshot_id      BIGSERIAL PRIMARY KEY,
    scenario_log_id  BIGINT NOT NULL REFERENCES landscape.tbl_scenario_log(scenario_log_id) ON DELETE CASCADE,
    field            VARCHAR(100) NOT NULL,
    table_name       VARCHAR(100) NOT NULL,
    record_id        VARCHAR(100),
    original_value   JSONB,
    override_value   JSONB,
    label            VARCHAR(200),
    unit             VARCHAR(30),
    applied_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_assumption_snapshot_scenario
    ON landscape.tbl_assumption_snapshot(scenario_log_id);

CREATE INDEX idx_assumption_snapshot_field
    ON landscape.tbl_assumption_snapshot(field, table_name);

-- =========================================================================
-- DOWN (rollback)
-- =========================================================================

-- DROP TABLE IF EXISTS landscape.tbl_assumption_snapshot CASCADE;
