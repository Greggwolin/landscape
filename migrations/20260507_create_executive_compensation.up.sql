-- ============================================================================
-- 20260507_create_executive_compensation.up.sql
-- Session: LSCMD-NLF-0507-OP7
-- Increment 7 of net lease foundation work — schema only
--
-- REIT executive compensation domain. Schema lands today; the DEF 14A
-- extraction pipeline that populates these from EDGAR is deferred to a
-- follow-up so this morning isn't blocked on data ingestion.
--
-- Four additive tables:
--   1. tbl_executive — exec at an operator (typically a public REIT)
--   2. tbl_executive_compensation_period — annual comp record per exec
--   3. tbl_executive_employment_agreement — employment agreement key terms
--   4. tbl_executive_incentive_target — specific bonus targets per period
-- ============================================================================

BEGIN;

-- 1. tbl_executive
CREATE TABLE IF NOT EXISTS landscape.tbl_executive (
    executive_id         SERIAL PRIMARY KEY,
    operator_id          INTEGER NOT NULL REFERENCES landscape.tbl_operator(operator_id) ON DELETE CASCADE,

    full_name            VARCHAR(200) NOT NULL,
    role                 VARCHAR(40)
        CHECK (role IN (
            'CEO', 'CFO', 'COO', 'CIO', 'President', 'GC',
            'Head_of_Acquisitions', 'Head_of_Dispositions',
            'Chairman', 'Vice_Chairman', 'Other'
        )),
    title                VARCHAR(200),
    start_date           DATE,
    end_date             DATE,
    is_named_executive_officer BOOLEAN DEFAULT false,
    is_board_member      BOOLEAN DEFAULT false,

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100)
);

COMMENT ON TABLE landscape.tbl_executive IS
    'Executive at an operator (typically a public REIT for net lease use cases). Captures role, tenure, NEO designation (top 5 by SEC compensation rules), board membership.';

CREATE INDEX IF NOT EXISTS idx_executive_operator ON landscape.tbl_executive(operator_id);
CREATE INDEX IF NOT EXISTS idx_executive_role ON landscape.tbl_executive(role);


-- 2. tbl_executive_compensation_period
CREATE TABLE IF NOT EXISTS landscape.tbl_executive_compensation_period (
    compensation_id      SERIAL PRIMARY KEY,
    executive_id         INTEGER NOT NULL REFERENCES landscape.tbl_executive(executive_id) ON DELETE CASCADE,

    fiscal_year          INTEGER NOT NULL,
    source_filing_type   VARCHAR(20)
        CHECK (source_filing_type IN ('DEF_14A', '10K', '10Q', '8K', 'manual', NULL)),

    base_salary                  NUMERIC(15,2),
    target_annual_bonus          NUMERIC(15,2),
    actual_annual_bonus          NUMERIC(15,2),
    equity_awards_grant_date_fair_value NUMERIC(15,2),
    equity_awards_target_value   NUMERIC(15,2),
    restricted_stock_value       NUMERIC(15,2),
    performance_share_value      NUMERIC(15,2),
    option_value                 NUMERIC(15,2),
    all_other_compensation       NUMERIC(15,2),
    total_reported_compensation  NUMERIC(15,2),

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_executive_compensation UNIQUE (executive_id, fiscal_year)
);

COMMENT ON TABLE landscape.tbl_executive_compensation_period IS
    'Annual compensation record per executive. Captures base + bonus (target + actual) + equity (multiple grant types) + all other comp + total reported. Powers the analysis of how exec incentives shape acquisition / disposition behavior — Sarah''s competitive-edge insight.';

CREATE INDEX IF NOT EXISTS idx_executive_comp_exec ON landscape.tbl_executive_compensation_period(executive_id);
CREATE INDEX IF NOT EXISTS idx_executive_comp_year ON landscape.tbl_executive_compensation_period(fiscal_year);


-- 3. tbl_executive_employment_agreement
CREATE TABLE IF NOT EXISTS landscape.tbl_executive_employment_agreement (
    agreement_id         SERIAL PRIMARY KEY,
    executive_id         INTEGER NOT NULL REFERENCES landscape.tbl_executive(executive_id) ON DELETE CASCADE,

    effective_date       DATE,
    expiration_date      DATE,
    severance_terms      TEXT,
    change_of_control_terms TEXT,
    equity_acceleration_on_termination BOOLEAN,
    non_compete_duration_months INTEGER,
    non_solicit_duration_months INTEGER,
    source_filing_type   VARCHAR(20),
    full_text            TEXT,

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE landscape.tbl_executive_employment_agreement IS
    'Key terms of an executive employment agreement plus full text. Severance triggers, change-of-control provisions, equity acceleration, non-compete / non-solicit durations. Drives understanding of how protected an exec is and how that shapes their decision behavior.';

CREATE INDEX IF NOT EXISTS idx_executive_agreement_exec ON landscape.tbl_executive_employment_agreement(executive_id);


-- 4. tbl_executive_incentive_target
CREATE TABLE IF NOT EXISTS landscape.tbl_executive_incentive_target (
    target_id            SERIAL PRIMARY KEY,
    executive_id         INTEGER NOT NULL REFERENCES landscape.tbl_executive(executive_id) ON DELETE CASCADE,

    fiscal_year          INTEGER NOT NULL,
    metric_name          VARCHAR(60) NOT NULL,
    metric_description   TEXT,
    target_threshold     NUMERIC(15,4),
    target_unit          VARCHAR(20),
    weight_pct           NUMERIC(5,2),
    threshold_payout_pct NUMERIC(5,2),
    target_payout_pct    NUMERIC(5,2),
    max_payout_pct       NUMERIC(5,2),

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE landscape.tbl_executive_incentive_target IS
    'Specific bonus targets per executive per fiscal year. metric_name examples: AFFO_per_share, acquisition_volume, disposition_volume, leverage_target, occupancy, TSR, FFO_per_share. weight_pct is the % of total bonus tied to this metric. Together rows for one exec for one year describe their full bonus structure.';

CREATE INDEX IF NOT EXISTS idx_executive_target_exec ON landscape.tbl_executive_incentive_target(executive_id);
CREATE INDEX IF NOT EXISTS idx_executive_target_year ON landscape.tbl_executive_incentive_target(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_executive_target_metric ON landscape.tbl_executive_incentive_target(metric_name);

COMMIT;
