-- Migration: Create tbl_scenario_log for What-If Engine
-- Date: 2026-02-14
-- Description: Stores what-if shadow contexts, saved scenarios, committed changes,
--              and IC session data. The scenario_data JSONB column holds the full
--              shadow state including baseline_snapshot, overrides, and computed_results.

-- =========================================================================
-- UP
-- =========================================================================

CREATE TABLE landscape.tbl_scenario_log (
    scenario_log_id     BIGSERIAL PRIMARY KEY,
    project_id          INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
    thread_id           UUID REFERENCES landscape.landscaper_chat_thread(id),
    user_id             INTEGER,
    scenario_name       VARCHAR(200),
    description         TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'active_shadow'
                        CHECK (status IN (
                            'active_shadow',  -- currently being explored in a chat session
                            'explored',       -- session ended without commit or save
                            'saved',          -- user named and saved the scenario
                            'committed',      -- overrides were written to DB
                            'undone',         -- committed overrides were reverted
                            'archived'        -- soft-deleted by user
                        )),
    scenario_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- scenario_data structure:
    -- {
    --   "baseline_snapshot": {
    --     "assumptions": { ... full assumption state at session start ... },
    --     "metrics": { "irr": 0.08, "npv": 1500000, ... }
    --   },
    --   "overrides": {
    --     "field_key": {
    --       "field": "vacancy_loss_pct",
    --       "table": "tbl_project",
    --       "record_id": null,
    --       "original_value": 0.05,
    --       "override_value": 0.08,
    --       "label": "Vacancy Rate",
    --       "unit": "pct",
    --       "applied_at": "2026-02-13T10:30:00Z",
    --       "source_message_id": "uuid"
    --     }
    --   },
    --   "computed_results": {
    --     "metrics": { "irr": 0.065, "npv": 1200000, ... },
    --     "delta": { "irr": -0.015, "npv": -300000, ... }
    --   }
    -- }
    parent_scenario_id  BIGINT REFERENCES landscape.tbl_scenario_log(scenario_log_id),
    source              VARCHAR(30) DEFAULT 'landscaper_chat'
                        CHECK (source IN ('landscaper_chat', 'user_manual', 'auto_commit', 'ic_session')),
    tags                TEXT[],
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    committed_at        TIMESTAMPTZ,
    committed_by        INTEGER
);

-- Performance indexes
CREATE INDEX idx_scenario_log_project
    ON landscape.tbl_scenario_log(project_id);

CREATE INDEX idx_scenario_log_thread
    ON landscape.tbl_scenario_log(thread_id);

CREATE INDEX idx_scenario_log_status
    ON landscape.tbl_scenario_log(project_id, status);

CREATE INDEX idx_scenario_log_created
    ON landscape.tbl_scenario_log(project_id, created_at DESC);

-- GIN index for querying inside scenario_data JSONB
CREATE INDEX idx_scenario_log_data
    ON landscape.tbl_scenario_log USING GIN(scenario_data);

-- =========================================================================
-- DOWN (rollback)
-- =========================================================================

-- DROP TABLE IF EXISTS landscape.tbl_scenario_log CASCADE;
