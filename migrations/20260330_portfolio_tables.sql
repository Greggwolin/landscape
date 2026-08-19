-- Migration: Portfolio Analysis Tables
-- Date: 2026-03-30
-- Description: Creates 4 tables for Landscaper-driven portfolio analysis feature.
--              Supports project cloning with size variation, staggered acquisitions,
--              consolidated cash flow aggregation, and fund-level GP/LP waterfall.
-- Session: QJ (Cowork) — architecture spec finalized 2026-03-30
-- Scope: Underwriting mode only (not Valuation)

-- ============================================================================
-- UP
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. tbl_portfolio — Portfolio entity
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_portfolio (
    portfolio_id        SERIAL PRIMARY KEY,
    portfolio_name      VARCHAR(200) NOT NULL,
    description         TEXT,
    created_by_id       INTEGER REFERENCES landscape.tbl_user(id),

    -- Fund structure (simple — no fees in initial implementation)
    lp_ownership_pct    NUMERIC(5,2) DEFAULT 70.00,
    gp_ownership_pct    NUMERIC(5,2) DEFAULT 30.00,
    fund_equity_total   NUMERIC(15,2),
    leverage_target_pct NUMERIC(5,2),

    -- Status
    is_active           BOOLEAN DEFAULT true,

    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE landscape.tbl_portfolio IS 'Portfolio entity for fund-level analysis. Groups cloned projects with staggered acquisitions and size variation.';
COMMENT ON COLUMN landscape.tbl_portfolio.lp_ownership_pct IS 'LP ownership percentage (e.g., 70.00 for 70%)';
COMMENT ON COLUMN landscape.tbl_portfolio.gp_ownership_pct IS 'GP co-invest percentage (e.g., 30.00 for 30%)';
COMMENT ON COLUMN landscape.tbl_portfolio.fund_equity_total IS 'Total fund equity commitment (optional — for deployment optimization)';
COMMENT ON COLUMN landscape.tbl_portfolio.leverage_target_pct IS 'Target leverage as % of total capitalization (optional)';

-- ============================================================================
-- 2. tbl_portfolio_member — Junction: portfolio → project
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_portfolio_member (
    member_id           SERIAL PRIMARY KEY,
    portfolio_id        INTEGER NOT NULL REFERENCES landscape.tbl_portfolio(portfolio_id) ON DELETE CASCADE,
    project_id          INTEGER NOT NULL REFERENCES landscape.tbl_project(id) ON DELETE CASCADE,
    source_project_id   INTEGER REFERENCES landscape.tbl_project(id) ON DELETE SET NULL,

    -- Clone parameters
    date_offset_months  INTEGER DEFAULT 0,
    size_scalar         NUMERIC(5,4) DEFAULT 1.0000,
    size_low            NUMERIC(5,4),
    size_high           NUMERIC(5,4),
    acquisition_date    DATE,

    -- Ordering and flags
    sort_order          INTEGER DEFAULT 0,
    is_template         BOOLEAN DEFAULT false,

    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_portfolio_project UNIQUE (portfolio_id, project_id)
);

COMMENT ON TABLE landscape.tbl_portfolio_member IS 'Links projects to portfolios. Each member is a cloned project with date offset and size scalar.';
COMMENT ON COLUMN landscape.tbl_portfolio_member.source_project_id IS 'FK to the template project this member was cloned from';
COMMENT ON COLUMN landscape.tbl_portfolio_member.size_scalar IS 'Randomized multiplier applied at clone time (e.g., 0.8500–1.1500). Precision to 4 decimals.';
COMMENT ON COLUMN landscape.tbl_portfolio_member.size_low IS 'Lower bound of size range for reroll (e.g., 0.8500)';
COMMENT ON COLUMN landscape.tbl_portfolio_member.size_high IS 'Upper bound of size range for reroll (e.g., 1.1500)';
COMMENT ON COLUMN landscape.tbl_portfolio_member.is_template IS 'True for the source/template project (never modified by portfolio operations)';

CREATE INDEX idx_portfolio_member_portfolio ON landscape.tbl_portfolio_member(portfolio_id);
CREATE INDEX idx_portfolio_member_project ON landscape.tbl_portfolio_member(project_id);

-- ============================================================================
-- 3. tbl_portfolio_waterfall_tier — Fund-level waterfall configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_portfolio_waterfall_tier (
    tier_id             SERIAL PRIMARY KEY,
    portfolio_id        INTEGER NOT NULL REFERENCES landscape.tbl_portfolio(portfolio_id) ON DELETE CASCADE,

    -- Tier configuration
    tier_number         INTEGER NOT NULL,
    tier_name           VARCHAR(100),
    hurdle_type         VARCHAR(10) NOT NULL DEFAULT 'IRR',
    hurdle_rate         NUMERIC(8,4) NOT NULL DEFAULT 0.0000,
    lp_split_pct        NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    gp_split_pct        NUMERIC(5,2) NOT NULL DEFAULT 0.00,

    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_portfolio_tier UNIQUE (portfolio_id, tier_number),
    CONSTRAINT chk_hurdle_type CHECK (hurdle_type IN ('PREF', 'IRR', 'EMX')),
    CONSTRAINT chk_split_sum CHECK (lp_split_pct + gp_split_pct BETWEEN 99.99 AND 100.01)
);

COMMENT ON TABLE landscape.tbl_portfolio_waterfall_tier IS 'Fund-level waterfall tiers for GP/LP distribution. Operates on consolidated portfolio cash flows.';
COMMENT ON COLUMN landscape.tbl_portfolio_waterfall_tier.hurdle_type IS 'PREF = preferred return, IRR = IRR hurdle, EMX = equity multiple hurdle';
COMMENT ON COLUMN landscape.tbl_portfolio_waterfall_tier.hurdle_rate IS 'Hurdle rate as percentage (e.g., 8.0000 for 8% pref, 15.0000 for 15% IRR)';
COMMENT ON COLUMN landscape.tbl_portfolio_waterfall_tier.lp_split_pct IS 'LP share of distributions in this tier (e.g., 80.00 for 80%)';
COMMENT ON COLUMN landscape.tbl_portfolio_waterfall_tier.gp_split_pct IS 'GP share of distributions in this tier (e.g., 20.00 for 20%)';

CREATE INDEX idx_portfolio_waterfall_portfolio ON landscape.tbl_portfolio_waterfall_tier(portfolio_id);

-- ============================================================================
-- 4. tbl_portfolio_result — Cached calculation results
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_portfolio_result (
    result_id           SERIAL PRIMARY KEY,
    portfolio_id        INTEGER NOT NULL REFERENCES landscape.tbl_portfolio(portfolio_id) ON DELETE CASCADE,
    run_id              UUID NOT NULL DEFAULT gen_random_uuid(),

    -- Portfolio-level metrics
    consolidated_irr    NUMERIC(8,4),
    consolidated_emx    NUMERIC(8,4),
    total_equity_deployed NUMERIC(15,2),
    peak_equity         NUMERIC(15,2),
    total_debt_peak     NUMERIC(15,2),

    -- GP/LP metrics
    gp_irr              NUMERIC(8,4),
    gp_emx              NUMERIC(8,4),
    gp_total_distributions NUMERIC(15,2),
    gp_promote_earned   NUMERIC(15,2),
    lp_irr              NUMERIC(8,4),
    lp_emx              NUMERIC(8,4),
    lp_total_distributions NUMERIC(15,2),

    -- Full period-by-period data (token-efficient: stored here, sliced on demand)
    result_json         JSONB,

    -- Timestamps
    run_date            TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_portfolio_run UNIQUE (portfolio_id, run_id)
);

COMMENT ON TABLE landscape.tbl_portfolio_result IS 'Cached portfolio calculation results. result_json holds full period-by-period data; Landscaper tools return summaries only and slice detail on demand.';
COMMENT ON COLUMN landscape.tbl_portfolio_result.run_id IS 'UUID for each calculation run. Reroll creates a new run.';
COMMENT ON COLUMN landscape.tbl_portfolio_result.result_json IS 'Full period-by-period stacked cash flows, per-property metrics, and waterfall detail. Sliced by Landscaper tools to minimize token consumption.';

CREATE INDEX idx_portfolio_result_portfolio ON landscape.tbl_portfolio_result(portfolio_id);
CREATE INDEX idx_portfolio_result_run_date ON landscape.tbl_portfolio_result(run_date DESC);

COMMIT;

-- ============================================================================
-- DOWN (Rollback)
-- ============================================================================

-- DROP TABLE IF EXISTS landscape.tbl_portfolio_result;
-- DROP TABLE IF EXISTS landscape.tbl_portfolio_waterfall_tier;
-- DROP TABLE IF EXISTS landscape.tbl_portfolio_member;
-- DROP TABLE IF EXISTS landscape.tbl_portfolio;
