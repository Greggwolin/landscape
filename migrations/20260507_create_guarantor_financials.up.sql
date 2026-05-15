-- ============================================================================
-- 20260507_create_guarantor_financials.up.sql
-- Session: LSCMD-NLF-0507-OP5
-- Increment 5 of net lease foundation work
--
-- Multi-period guarantor financials + owner-operator principal infrastructure.
--
-- Four additive tables:
--   1. tbl_guarantor_financial_period — wide multi-period BS + IS + ratios
--   2. tbl_operator_principal — owner / founder / CEO of closely-held operators
--   3. tbl_operator_principal_distribution — annual distribution history
--   4. tbl_principal_financial_statement — PFS structure for owner-operators
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. tbl_guarantor_financial_period
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_guarantor_financial_period (
    period_id            SERIAL PRIMARY KEY,
    guarantor_tenant_id  INTEGER NOT NULL REFERENCES landscape.tbl_tenant(tenant_id) ON DELETE CASCADE,

    -- Period identity
    period_type          VARCHAR(20) NOT NULL
        CHECK (period_type IN ('FYE', 'TTM', 'annualized', 'interim', 'pro_forma')),
    period_end_date      DATE NOT NULL,
    period_label         VARCHAR(60),
    is_pre_slb           BOOLEAN DEFAULT false,
    is_post_slb          BOOLEAN DEFAULT false,
    currency             VARCHAR(3) DEFAULT 'USD',

    -- Balance sheet
    cash                          NUMERIC(15,2),
    accounts_receivable           NUMERIC(15,2),
    inventories                   NUMERIC(15,2),
    prepaid_other_current         NUMERIC(15,2),
    current_assets                NUMERIC(15,2),
    ppe_net                       NUMERIC(15,2),
    goodwill                      NUMERIC(15,2),
    other_assets                  NUMERIC(15,2),
    total_assets                  NUMERIC(15,2),
    accounts_payable              NUMERIC(15,2),
    deferred_revenue              NUMERIC(15,2),
    other_current_liab            NUMERIC(15,2),
    current_portion_long_term_debt NUMERIC(15,2),
    line_of_credit                NUMERIC(15,2),
    current_liabilities           NUMERIC(15,2),
    long_term_debt                NUMERIC(15,2),
    funded_debt                   NUMERIC(15,2),
    total_liabilities             NUMERIC(15,2),
    equity                        NUMERIC(15,2),

    -- Income statement
    revenue                       NUMERIC(15,2),
    cogs                          NUMERIC(15,2),
    gross_profit                  NUMERIC(15,2),
    gross_profit_margin           NUMERIC(5,2),
    operating_expense             NUMERIC(15,2),
    other_income_expense          NUMERIC(15,2),
    ebitdar                       NUMERIC(15,2),
    ebitdar_margin                NUMERIC(5,2),
    rent                          NUMERIC(15,2),
    ebitda                        NUMERIC(15,2),
    ebitda_margin                 NUMERIC(5,2),
    depreciation_amortization     NUMERIC(15,2),
    interest_expense              NUMERIC(15,2),
    net_income                    NUMERIC(15,2),

    -- Key credit ratios
    ebitdar_coverage              NUMERIC(7,2),
    fixed_charge_coverage         NUMERIC(7,2),
    lease_adjusted_leverage       NUMERIC(7,2),
    funded_debt_to_ebitda         NUMERIC(7,2),

    -- Moody's KMV shadow rating
    rating_period_date            DATE,
    one_year_edf                  NUMERIC(7,4),
    moodys_equivalent             VARCHAR(10),
    sp_equivalent                 VARCHAR(10),

    -- Audit
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100),

    CONSTRAINT uq_guarantor_period UNIQUE (guarantor_tenant_id, period_type, period_end_date)
);

COMMENT ON TABLE landscape.tbl_guarantor_financial_period IS
    'Multi-period financials for a guarantor tenant. One row per (guarantor, period_type, period_end_date) triple. Wide table — universal balance sheet, income statement, key credit ratios, plus Moody''s KMV shadow rating. Captures the kind of data EPRT memos document across FYE / TTM / Pro Forma columns.';

CREATE INDEX IF NOT EXISTS idx_guarantor_period_tenant ON landscape.tbl_guarantor_financial_period(guarantor_tenant_id);
CREATE INDEX IF NOT EXISTS idx_guarantor_period_date ON landscape.tbl_guarantor_financial_period(period_end_date);


-- ============================================================================
-- 2. tbl_operator_principal
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_operator_principal (
    principal_id         SERIAL PRIMARY KEY,
    operator_id          INTEGER NOT NULL REFERENCES landscape.tbl_operator(operator_id) ON DELETE CASCADE,

    full_name            VARCHAR(200) NOT NULL,
    role                 VARCHAR(40)
        CHECK (role IN ('CEO', 'Founder', 'Owner', 'President', 'CFO', 'Other')),
    ownership_pct        NUMERIC(5,2),
    professional_background TEXT,
    other_business_interests TEXT,
    is_active            BOOLEAN DEFAULT true,

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100)
);

COMMENT ON TABLE landscape.tbl_operator_principal IS
    'Individual owner / founder / CEO of a closely-held operator. For institutional / public operators, this table is N/A. For owner-operator deals (Vista Clinical, WLR pre-public), this captures the principal whose personal credit and extraction patterns matter for the deal.';

CREATE INDEX IF NOT EXISTS idx_operator_principal_operator ON landscape.tbl_operator_principal(operator_id);


-- ============================================================================
-- 3. tbl_operator_principal_distribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_operator_principal_distribution (
    distribution_id      SERIAL PRIMARY KEY,
    principal_id         INTEGER NOT NULL REFERENCES landscape.tbl_operator_principal(principal_id) ON DELETE CASCADE,

    fiscal_year          INTEGER NOT NULL,
    distribution_amount  NUMERIC(15,2),
    distribution_type    VARCHAR(20)
        CHECK (distribution_type IN ('cash', 'equity', 'mixed', 'other')),
    notes                TEXT,

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_principal_distribution_year UNIQUE (principal_id, fiscal_year)
);

COMMENT ON TABLE landscape.tbl_operator_principal_distribution IS
    'Annual distribution history for an owner-operator principal. Captures the kind of data the Vista Clinical memo documented (Davian Santana''s $21.9M in 2017, $1.1M in 2018, $3.7M in 2019, $1.2M YTD 2020). Affects retained earnings and signals owner extraction patterns.';

CREATE INDEX IF NOT EXISTS idx_principal_distribution_principal ON landscape.tbl_operator_principal_distribution(principal_id);


-- ============================================================================
-- 4. tbl_principal_financial_statement
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_principal_financial_statement (
    pfs_id               SERIAL PRIMARY KEY,
    principal_id         INTEGER NOT NULL REFERENCES landscape.tbl_operator_principal(principal_id) ON DELETE CASCADE,

    as_of_date           DATE NOT NULL,
    statement_type       VARCHAR(20) DEFAULT 'unaudited'
        CHECK (statement_type IN ('signed', 'unaudited', 'verified')),

    -- Asset breakdown — value + estimated/verified flag per class
    real_estate_value             NUMERIC(15,2),
    real_estate_status            VARCHAR(15) CHECK (real_estate_status IN ('estimated', 'verified', NULL)),
    business_interests_value      NUMERIC(15,2),
    business_interests_status     VARCHAR(15) CHECK (business_interests_status IN ('estimated', 'verified', NULL)),
    cash_and_equivalents_value    NUMERIC(15,2),
    cash_and_equivalents_status   VARCHAR(15) CHECK (cash_and_equivalents_status IN ('estimated', 'verified', NULL)),
    marketable_securities_value   NUMERIC(15,2),
    marketable_securities_status  VARCHAR(15) CHECK (marketable_securities_status IN ('estimated', 'verified', NULL)),
    retirement_accounts_value     NUMERIC(15,2),
    retirement_accounts_status    VARCHAR(15) CHECK (retirement_accounts_status IN ('estimated', 'verified', NULL)),
    art_and_collectibles_value    NUMERIC(15,2),
    art_and_collectibles_status   VARCHAR(15) CHECK (art_and_collectibles_status IN ('estimated', 'verified', NULL)),
    other_assets_value            NUMERIC(15,2),
    other_assets_status           VARCHAR(15) CHECK (other_assets_status IN ('estimated', 'verified', NULL)),

    -- Liabilities
    mortgage_debt        NUMERIC(15,2),
    business_debt        NUMERIC(15,2),
    other_debt           NUMERIC(15,2),

    -- Computed totals (app-computed; recompute as needed)
    total_assets         NUMERIC(15,2),
    total_liabilities    NUMERIC(15,2),
    net_worth            NUMERIC(15,2),

    notes                TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_principal_pfs_date UNIQUE (principal_id, as_of_date)
);

COMMENT ON TABLE landscape.tbl_principal_financial_statement IS
    'Personal financial statement structure. One row per (principal, as_of_date). Asset breakdown by class with estimated/verified flag per class — captures the institutional reality that personal financial statements are disclosed but not auditable (the v3 taxonomy''s uncertainty marker requirement).';

CREATE INDEX IF NOT EXISTS idx_pfs_principal ON landscape.tbl_principal_financial_statement(principal_id);
CREATE INDEX IF NOT EXISTS idx_pfs_as_of_date ON landscape.tbl_principal_financial_statement(as_of_date);


COMMIT;
