-- ============================================================================
-- Migration: Add KPI Definitions and Custom Instructions tables
-- Phase 6 of What-If Engine: Custom Instructions + KPI Definitions
-- ============================================================================

-- UP
-- ============================================================================

-- Custom instructions: user-level (project_id NULL) and project-level
CREATE TABLE IF NOT EXISTS landscape.tbl_landscaper_instructions (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL DEFAULT 1,
    project_id        INTEGER REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    instruction_type  VARCHAR(50) NOT NULL DEFAULT 'custom'
                      CHECK (instruction_type IN (
                          'communication', 'kpi_definition', 'summary_preference', 'units', 'custom'
                      )),
    instruction_text  TEXT NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for instruction lookups
CREATE INDEX IF NOT EXISTS idx_instructions_user_id
    ON landscape.tbl_landscaper_instructions(user_id);
CREATE INDEX IF NOT EXISTS idx_instructions_project_id
    ON landscape.tbl_landscaper_instructions(project_id);
CREATE INDEX IF NOT EXISTS idx_instructions_type
    ON landscape.tbl_landscaper_instructions(instruction_type);
CREATE INDEX IF NOT EXISTS idx_instructions_active
    ON landscape.tbl_landscaper_instructions(user_id, is_active)
    WHERE is_active = true;

-- KPI definitions: per-user, per-project-type "results" definition
CREATE TABLE IF NOT EXISTS landscape.tbl_landscaper_kpi_definition (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL DEFAULT 1,
    project_type_code   VARCHAR(10) NOT NULL DEFAULT 'LAND'
                        CHECK (project_type_code IN (
                            'LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'
                        )),
    kpi_key             VARCHAR(100) NOT NULL,
    display_label       VARCHAR(200) NOT NULL,
    display_order       INTEGER NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for KPI lookups
CREATE INDEX IF NOT EXISTS idx_kpi_def_user_type
    ON landscape.tbl_landscaper_kpi_definition(user_id, project_type_code);
CREATE INDEX IF NOT EXISTS idx_kpi_def_active
    ON landscape.tbl_landscaper_kpi_definition(user_id, project_type_code, is_active)
    WHERE is_active = true;

-- Unique constraint: one kpi_key per user per project type
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_def_unique_key
    ON landscape.tbl_landscaper_kpi_definition(user_id, project_type_code, kpi_key);

-- Seed default KPI definitions for Land Development
INSERT INTO landscape.tbl_landscaper_kpi_definition
    (user_id, project_type_code, kpi_key, display_label, display_order)
VALUES
    (1, 'LAND', 'irr', 'IRR', 1),
    (1, 'LAND', 'equity_multiple', 'Equity Multiple', 2),
    (1, 'LAND', 'total_profit', 'Total Profit', 3),
    (1, 'LAND', 'total_revenue', 'Total Revenue', 4),
    (1, 'LAND', 'total_cost', 'Total Cost', 5)
ON CONFLICT (user_id, project_type_code, kpi_key) DO NOTHING;

-- Seed default KPI definitions for Multifamily
INSERT INTO landscape.tbl_landscaper_kpi_definition
    (user_id, project_type_code, kpi_key, display_label, display_order)
VALUES
    (1, 'MF', 'irr', 'IRR', 1),
    (1, 'MF', 'equity_multiple', 'Equity Multiple', 2),
    (1, 'MF', 'noi', 'NOI', 3),
    (1, 'MF', 'cap_rate', 'Cap Rate', 4),
    (1, 'MF', 'cash_on_cash', 'Cash-on-Cash Return', 5),
    (1, 'MF', 'dscr', 'DSCR', 6)
ON CONFLICT (user_id, project_type_code, kpi_key) DO NOTHING;


-- DOWN (Rollback)
-- ============================================================================
-- DROP INDEX IF EXISTS landscape.idx_kpi_def_unique_key;
-- DROP INDEX IF EXISTS landscape.idx_kpi_def_active;
-- DROP INDEX IF EXISTS landscape.idx_kpi_def_user_type;
-- DROP TABLE IF EXISTS landscape.tbl_landscaper_kpi_definition;
-- DROP INDEX IF EXISTS landscape.idx_instructions_active;
-- DROP INDEX IF EXISTS landscape.idx_instructions_type;
-- DROP INDEX IF EXISTS landscape.idx_instructions_project_id;
-- DROP INDEX IF EXISTS landscape.idx_instructions_user_id;
-- DROP TABLE IF EXISTS landscape.tbl_landscaper_instructions;
