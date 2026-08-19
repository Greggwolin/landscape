-- Migration: Investment Committee Session Tables + Benchmark Category Extension
-- Date: 2026-02-21
-- Description: Creates tbl_ic_session and tbl_ic_challenge for IC devil's advocate
--              workflow. Also extends the benchmark registry CHECK constraint to
--              include IC-specific categories needed for assumption comparison.

-- =========================================================================
-- UP
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Extend CHECK constraint on tbl_global_benchmark_registry
--    Add IC-relevant categories: vacancy, rent_growth, expense_growth,
--    cap_rate, discount_rate, pricing, inflation
-- -------------------------------------------------------------------------

ALTER TABLE landscape.tbl_global_benchmark_registry
    DROP CONSTRAINT IF EXISTS valid_category;

ALTER TABLE landscape.tbl_global_benchmark_registry
    ADD CONSTRAINT valid_category CHECK (
        category IN (
            -- Original categories
            'growth_rate', 'transaction_cost', 'unit_cost', 'absorption',
            'contingency', 'market_timing', 'land_use_pricing', 'commission',
            'op_cost', 'income', 'capital_stack', 'debt_standard',
            -- IC devil's advocate categories
            'vacancy', 'rent_growth', 'expense_growth',
            'cap_rate', 'discount_rate', 'pricing', 'inflation'
        )
    );

-- -------------------------------------------------------------------------
-- 2. Create tbl_ic_session
-- -------------------------------------------------------------------------

CREATE TABLE landscape.tbl_ic_session (
    ic_session_id           BIGSERIAL PRIMARY KEY,
    project_id              INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id),
    scenario_log_id         BIGINT REFERENCES landscape.tbl_scenario_log(scenario_log_id),
    thread_id               UUID REFERENCES landscape.landscaper_chat_thread(id),
    aggressiveness          INTEGER NOT NULL DEFAULT 5
                            CHECK (aggressiveness BETWEEN 1 AND 10),
    status                  VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'completed', 'abandoned')),
    total_assumptions_scanned INTEGER DEFAULT 0,
    total_challenges        INTEGER DEFAULT 0,
    challenges_presented    INTEGER DEFAULT 0,
    baseline_snapshot       JSONB DEFAULT '{}'::jsonb,
    summary                 JSONB DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ
);

CREATE INDEX idx_ic_session_project
    ON landscape.tbl_ic_session(project_id);

CREATE INDEX idx_ic_session_status
    ON landscape.tbl_ic_session(project_id, status);

CREATE INDEX idx_ic_session_thread
    ON landscape.tbl_ic_session(thread_id);

COMMENT ON TABLE landscape.tbl_ic_session IS
'Investment Committee devil''s advocate sessions. Tracks aggressiveness level, challenge counts, and baseline snapshot for each IC review.';

-- -------------------------------------------------------------------------
-- 3. Create tbl_ic_challenge
-- -------------------------------------------------------------------------

CREATE TABLE landscape.tbl_ic_challenge (
    ic_challenge_id         BIGSERIAL PRIMARY KEY,
    ic_session_id           BIGINT NOT NULL REFERENCES landscape.tbl_ic_session(ic_session_id) ON DELETE CASCADE,
    challenge_index         INTEGER NOT NULL,
    assumption_key          VARCHAR(100) NOT NULL,
    label                   VARCHAR(200),
    current_value           NUMERIC,
    suggested_value         NUMERIC,
    unit                    VARCHAR(20),
    benchmark_mean          NUMERIC,
    benchmark_std           NUMERIC,
    deviation_score         NUMERIC,
    percentile_desc         VARCHAR(100),
    challenge_text          TEXT,
    -- Response tracking
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'presented', 'accepted', 'rejected', 'modified')),
    user_response           TEXT,
    user_value              NUMERIC,
    whatif_scenario_log_id  BIGINT REFERENCES landscape.tbl_scenario_log(scenario_log_id),
    impact_deltas           JSONB DEFAULT '{}'::jsonb,
    presented_at            TIMESTAMPTZ,
    responded_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ic_challenge_session
    ON landscape.tbl_ic_challenge(ic_session_id);

CREATE INDEX idx_ic_challenge_status
    ON landscape.tbl_ic_challenge(ic_session_id, status);

COMMENT ON TABLE landscape.tbl_ic_challenge IS
'Individual assumption challenges within an IC session. Tracks the challenge details, user response, and impact metrics.';

-- =========================================================================
-- DOWN (rollback)
-- =========================================================================

-- DROP TABLE IF EXISTS landscape.tbl_ic_challenge CASCADE;
-- DROP TABLE IF EXISTS landscape.tbl_ic_session CASCADE;
--
-- ALTER TABLE landscape.tbl_global_benchmark_registry
--     DROP CONSTRAINT IF EXISTS valid_category;
-- ALTER TABLE landscape.tbl_global_benchmark_registry
--     ADD CONSTRAINT valid_category CHECK (
--         category IN (
--             'growth_rate', 'transaction_cost', 'unit_cost', 'absorption',
--             'contingency', 'market_timing', 'land_use_pricing', 'commission',
--             'op_cost', 'income', 'capital_stack', 'debt_standard'
--         )
--     );
