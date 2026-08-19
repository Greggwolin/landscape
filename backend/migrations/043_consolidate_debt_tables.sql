-- ============================================================================
-- Migration 043: Consolidate Debt Tables (tbl_loan + tbl_debt_facility)
-- ============================================================================
-- Purpose: Unify debt facilities and loans into a single tbl_loan table with
--          structure_type (TERM vs REVOLVER), replace ARRAY assignments with
--          junction tables, remap draw schedule FK, and recreate summary view.
-- Date: 2026-02-05
-- ============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Step 2: Drop dependent objects
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS landscape.vw_debt_balance_summary;
DROP TABLE IF EXISTS landscape.tbl_debt_draw_schedule;
DROP TABLE IF EXISTS landscape.tbl_loan;
DROP TABLE IF EXISTS landscape.tbl_debt_facility;

-- -----------------------------------------------------------------------------
-- Step 3: Create unified tbl_loan
-- -----------------------------------------------------------------------------
CREATE TABLE landscape.tbl_loan (
    -- === IDENTITY ===
    loan_id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id                      BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- === CLASSIFICATION ===
    loan_name                       VARCHAR(255) NOT NULL,
    loan_type                       VARCHAR(50) NOT NULL CHECK (loan_type IN (
                                        'CONSTRUCTION', 'BRIDGE', 'PERMANENT', 'MEZZANINE',
                                        'LINE_OF_CREDIT', 'PREFERRED_EQUITY'
                                    )),
    structure_type                  VARCHAR(20) NOT NULL DEFAULT 'TERM' CHECK (structure_type IN ('TERM', 'REVOLVER')),
    lender_name                     VARCHAR(255),
    seniority                       INTEGER NOT NULL DEFAULT 1,
    status                          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'closed', 'defeased')),

    -- === SIZING ===
    commitment_amount               NUMERIC(15,2) NOT NULL,
    loan_amount                     NUMERIC(15,2),
    loan_to_cost_pct                NUMERIC(5,2),
    loan_to_value_pct               NUMERIC(5,2),

    -- === INTEREST RATE ===
    interest_rate_pct               NUMERIC(6,3),
    interest_rate_decimal           NUMERIC(6,5),
    interest_type                   VARCHAR(50) DEFAULT 'Fixed' CHECK (interest_type IN ('Fixed', 'Floating')),
    interest_index                  VARCHAR(50),
    interest_spread_bps             INTEGER,
    rate_floor_pct                  NUMERIC(6,3),
    rate_cap_pct                    NUMERIC(6,3),
    rate_reset_frequency            VARCHAR(20),
    interest_calculation            VARCHAR(50) DEFAULT 'SIMPLE' CHECK (interest_calculation IN ('SIMPLE', 'COMPOUND')),
    interest_payment_method         VARCHAR(50) DEFAULT 'paid_current' CHECK (interest_payment_method IN (
                                        'paid_current', 'accrued_simple', 'accrued_compound'
                                    )),

    -- === TIMING ===
    loan_start_date                 DATE,
    loan_maturity_date              DATE,
    maturity_period_id              BIGINT REFERENCES landscape.tbl_calculation_period(period_id),
    loan_term_months                INTEGER,
    loan_term_years                 INTEGER,
    amortization_months             INTEGER,
    amortization_years              INTEGER,
    interest_only_months            INTEGER DEFAULT 0,
    payment_frequency               VARCHAR(50) DEFAULT 'MONTHLY' CHECK (payment_frequency IN (
                                        'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AT_MATURITY'
                                    )),
    commitment_date                 DATE,

    -- === FEES ===
    origination_fee_pct             NUMERIC(5,4),
    exit_fee_pct                    NUMERIC(5,3),
    unused_fee_pct                  NUMERIC(5,4),
    commitment_fee_pct              NUMERIC(5,3),
    extension_fee_bps               INTEGER,
    extension_fee_amount            NUMERIC(12,2),
    prepayment_penalty_years        INTEGER,

    -- === RESERVES ===
    interest_reserve_amount         NUMERIC(15,2),
    interest_reserve_funded_upfront BOOLEAN DEFAULT false,
    reserve_requirements            JSONB DEFAULT '{}'::jsonb,
    replacement_reserve_per_unit    NUMERIC(8,2),
    tax_insurance_escrow_months     INTEGER,
    initial_reserve_months          INTEGER,

    -- === COVENANTS ===
    covenants                       JSONB DEFAULT '{}'::jsonb,
    loan_covenant_dscr_min          NUMERIC(5,3),
    loan_covenant_ltv_max           NUMERIC(5,2),
    loan_covenant_occupancy_min     NUMERIC(5,2),
    covenant_test_frequency         VARCHAR(20) DEFAULT 'Quarterly',

    -- === GUARANTEE / RECOURSE ===
    guarantee_type                  VARCHAR(50),
    guarantor_name                  VARCHAR(200),
    recourse_carveout_provisions    TEXT,

    -- === EXTENSIONS ===
    extension_options               INTEGER DEFAULT 0,
    extension_option_years          INTEGER,

    -- === REVOLVER-SPECIFIC (nullable, only populated when structure_type = 'REVOLVER') ===
    draw_trigger_type               VARCHAR(50) DEFAULT 'COST_INCURRED' CHECK (draw_trigger_type IN (
                                        'COST_INCURRED', 'MANUAL', 'MILESTONE', 'PCT_COMPLETE'
                                    )),
    commitment_balance              NUMERIC(15,2),
    drawn_to_date                   NUMERIC(15,2) DEFAULT 0,
    is_construction_loan            BOOLEAN DEFAULT false,

    -- === RELEASE PRICING (land development) ===
    release_price_pct               NUMERIC(5,2),
    minimum_release_amount          NUMERIC(15,2),

    -- === REFINANCING LINKAGE ===
    takes_out_loan_id               BIGINT REFERENCES landscape.tbl_loan(loan_id),

    -- === PROFIT PARTICIPATION (mezzanine/pref equity kicker) ===
    can_participate_in_profits      BOOLEAN DEFAULT false,
    profit_participation_tier       INTEGER,
    profit_participation_pct        NUMERIC(6,3),

    -- === CALCULATED / TRACKING ===
    monthly_payment                 NUMERIC(12,2),
    annual_debt_service             NUMERIC(12,2),

    -- === AUDIT ===
    notes                           TEXT,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW(),
    created_by                      TEXT,
    updated_by                      TEXT
);

COMMENT ON TABLE landscape.tbl_loan IS 'Unified debt instrument table supporting both term loans and revolving credit facilities';
COMMENT ON COLUMN landscape.tbl_loan.structure_type IS 'TERM = fixed proceeds with amortization schedule; REVOLVER = draw-based with variable balance';
COMMENT ON COLUMN landscape.tbl_loan.seniority IS 'Payment/lien priority: 1=senior, 2=subordinate, 3=mezzanine, etc.';
COMMENT ON COLUMN landscape.tbl_loan.takes_out_loan_id IS 'Self-referencing FK: identifies which existing loan this loan refinances/takes out';
COMMENT ON COLUMN landscape.tbl_loan.interest_rate_pct IS 'Interest rate as display percentage, e.g. 5.750 = 5.75%';
COMMENT ON COLUMN landscape.tbl_loan.interest_rate_decimal IS 'Interest rate as decimal for calculations, e.g. 0.05750 = 5.75%';
COMMENT ON COLUMN landscape.tbl_loan.release_price_pct IS 'For land dev: lot release price as % of allocated loan basis (e.g. 110%)';
COMMENT ON COLUMN landscape.tbl_loan.draw_trigger_type IS 'Revolver only: what triggers a draw (cost incurred, manual, milestone, % complete)';

-- -----------------------------------------------------------------------------
-- Step 4: Create indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_loan_project ON landscape.tbl_loan(project_id);
CREATE INDEX idx_loan_type ON landscape.tbl_loan(loan_type);
CREATE INDEX idx_loan_structure ON landscape.tbl_loan(structure_type);
CREATE INDEX idx_loan_seniority ON landscape.tbl_loan(project_id, seniority);
CREATE INDEX idx_loan_takes_out ON landscape.tbl_loan(takes_out_loan_id) WHERE takes_out_loan_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Step 5: Create junction tables
-- -----------------------------------------------------------------------------
CREATE TABLE landscape.tbl_loan_container (
    loan_container_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_id             BIGINT NOT NULL REFERENCES landscape.tbl_loan(loan_id) ON DELETE CASCADE,
    division_id         BIGINT NOT NULL REFERENCES landscape.tbl_division(division_id) ON DELETE CASCADE,
    allocation_pct      NUMERIC(5,2),
    collateral_type     VARCHAR(50),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (loan_id, division_id)
);

COMMENT ON TABLE landscape.tbl_loan_container IS 'Junction: assigns loans to specific containers/divisions. NULL means loan applies to entire project.';

CREATE INDEX idx_loan_container_loan ON landscape.tbl_loan_container(loan_id);
CREATE INDEX idx_loan_container_division ON landscape.tbl_loan_container(division_id);

CREATE TABLE landscape.tbl_loan_finance_structure (
    loan_fs_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_id             BIGINT NOT NULL REFERENCES landscape.tbl_loan(loan_id) ON DELETE CASCADE,
    finance_structure_id BIGINT NOT NULL REFERENCES landscape.tbl_finance_structure(finance_structure_id) ON DELETE CASCADE,
    contribution_pct    NUMERIC(5,2),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (loan_id, finance_structure_id)
);

COMMENT ON TABLE landscape.tbl_loan_finance_structure IS 'Junction: assigns loans to finance structures. NULL means loan is project-wide.';

CREATE INDEX idx_loan_fs_loan ON landscape.tbl_loan_finance_structure(loan_id);
CREATE INDEX idx_loan_fs_structure ON landscape.tbl_loan_finance_structure(finance_structure_id);

-- -----------------------------------------------------------------------------
-- Step 6: Recreate draw schedule with new FK to tbl_loan
-- -----------------------------------------------------------------------------
CREATE TABLE landscape.tbl_debt_draw_schedule (
    draw_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_id             BIGINT NOT NULL REFERENCES landscape.tbl_loan(loan_id) ON DELETE CASCADE,
    period_id           BIGINT NOT NULL REFERENCES landscape.tbl_calculation_period(period_id) ON DELETE CASCADE,

    -- Draw details
    draw_number         INTEGER,
    draw_amount         NUMERIC(15,2),
    cumulative_drawn    NUMERIC(15,2),
    available_remaining NUMERIC(15,2),
    beginning_balance   NUMERIC(15,2),
    ending_balance      NUMERIC(15,2),
    draw_date           DATE,
    draw_purpose        VARCHAR(200),
    draw_status         VARCHAR(20) DEFAULT 'PROJECTED' CHECK (draw_status IN (
                            'PROJECTED', 'REQUESTED', 'FUNDED', 'ACTUAL'
                        )),

    -- Interest tracking
    interest_rate_pct   NUMERIC(6,4),
    interest_amount     NUMERIC(12,2),
    interest_expense    NUMERIC(12,2),
    interest_paid       NUMERIC(12,2),
    deferred_interest   NUMERIC(12,2) DEFAULT 0,
    cumulative_interest NUMERIC(12,2),
    principal_payment   NUMERIC(12,2),
    outstanding_balance NUMERIC(15,2),

    -- Fees
    unused_fee_charge       NUMERIC(10,2) DEFAULT 0,
    commitment_fee_charge   NUMERIC(10,2) DEFAULT 0,
    other_fees              NUMERIC(10,2) DEFAULT 0,

    -- Approval workflow
    request_date        DATE,
    approval_date       DATE,
    funding_date        DATE,
    inspector_approval  BOOLEAN,
    lender_approval     BOOLEAN,

    -- Audit
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (loan_id, period_id)
);

CREATE INDEX idx_debt_draw_loan ON landscape.tbl_debt_draw_schedule(loan_id, period_id);
CREATE INDEX idx_debt_draw_period ON landscape.tbl_debt_draw_schedule(period_id);

-- -----------------------------------------------------------------------------
-- Step 7: Recreate summary view
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW landscape.vw_debt_balance_summary AS
SELECT
    l.loan_id,
    l.project_id,
    l.loan_name,
    l.loan_type,
    l.structure_type,
    l.commitment_amount,
    l.interest_rate_pct,
    l.seniority,
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
    ROUND(dds.cumulative_drawn / NULLIF(l.commitment_amount, 0) * 100, 2) AS utilization_pct
FROM landscape.tbl_loan l
JOIN landscape.tbl_debt_draw_schedule dds ON l.loan_id = dds.loan_id
JOIN landscape.tbl_calculation_period cp ON dds.period_id = cp.period_id
ORDER BY l.loan_id, cp.period_start_date;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
/*
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
AND table_name IN ('tbl_loan', 'tbl_debt_draw_schedule', 'tbl_loan_container', 'tbl_loan_finance_structure')
ORDER BY table_name;

SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'landscape' AND table_name = 'tbl_loan';

SELECT table_name FROM information_schema.views
WHERE table_schema = 'landscape' AND table_name = 'vw_debt_balance_summary';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
AND table_name IN ('tbl_debt_facility');

SELECT tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name AS ref_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'landscape'
AND tc.table_name IN ('tbl_loan', 'tbl_debt_draw_schedule', 'tbl_loan_container', 'tbl_loan_finance_structure')
ORDER BY tc.table_name;
*/
