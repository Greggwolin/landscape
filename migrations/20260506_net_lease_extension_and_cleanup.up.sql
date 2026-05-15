-- ============================================================================
-- 20260506_net_lease_extension_and_cleanup.up.sql
-- Session: LSCMD-NLF-0506-OP2
-- Increment 2 of net lease foundation work
--
-- Three logical blocks:
--   BLOCK 1: Drop orphan commercial-lease infrastructure (5 stub rows + 4
--            empty child tables; no production code consumers)
--   BLOCK 2: Delete 40 mislabeled "Resident Unit X" rows on tbl_lease
--            (multifamily test data, lease_type_code='CRE' but content is
--             apartment residents; child-table data is empty; unrelated to
--             the production multifamily lease pipeline which lives on
--             tbl_multifamily_lease)
--   BLOCK 3: Add tenant_id FK to tbl_lease + create tbl_lease_nl_ext
--            (net-lease-specific lease extension following the existing
--             retail/industrial/MF extension pattern)
--
-- Both destructive blocks (1 and 2) backup their data to side tables before
-- the drop/delete fires, so the down migration can restore.
--
-- Approval: net_lease_increment_2_design_v2.html (workspace folder, "yes" 6 May 2026)
-- ============================================================================

BEGIN;


-- ============================================================================
-- PRE-BLOCK BACKUPS (safety nets — preserved if the down migration runs)
-- ============================================================================

-- Backup tbl_commercial_lease and its 4 child tables before dropping
CREATE TABLE landscape.tbl_commercial_lease_archive_20260506 AS
    SELECT * FROM landscape.tbl_commercial_lease;

CREATE TABLE landscape.tbl_rent_schedule_archive_20260506 AS
    SELECT * FROM landscape.tbl_rent_schedule;

CREATE TABLE landscape.tbl_rent_escalation_archive_20260506 AS
    SELECT * FROM landscape.tbl_rent_escalation;

CREATE TABLE landscape.tbl_percentage_rent_archive_20260506 AS
    SELECT * FROM landscape.tbl_percentage_rent;

CREATE TABLE landscape.tbl_expense_recovery_archive_20260506 AS
    SELECT * FROM landscape.tbl_expense_recovery;

COMMENT ON TABLE landscape.tbl_commercial_lease_archive_20260506 IS
    'Backup of tbl_commercial_lease prior to drop in Increment 2 cleanup. 5 stub rows on Vincent Village Apartments. Restorable via down migration if needed.';

-- Backup the 40 stale tbl_lease rows that are about to be deleted
CREATE TABLE landscape.tbl_lease_archive_20260506 AS
    SELECT l.*
    FROM landscape.tbl_lease l
    JOIN landscape.tbl_project p ON p.project_id = l.project_id
    WHERE l.tenant_name LIKE 'Resident Unit %'
      AND p.project_name = 'Vincent Village Apartments';

COMMENT ON TABLE landscape.tbl_lease_archive_20260506 IS
    'Backup of 40 mislabeled "Resident Unit X" rows from tbl_lease before Increment 2 deletes them. All on Vincent Village Apartments project. Restorable via down migration if needed.';


-- ============================================================================
-- BLOCK 1: Drop orphan commercial-lease infrastructure
-- ============================================================================

-- 1a. Drop the orphan view that depends on tbl_commercial_lease + tbl_rent_schedule
--     (vw_rent_roll — 13 rows, zero application code references, schema-doc-only)
DROP VIEW IF EXISTS landscape.vw_rent_roll;

-- 1b. Drop the 4 child tables (they FK to tbl_commercial_lease)
DROP TABLE IF EXISTS landscape.tbl_rent_schedule;
DROP TABLE IF EXISTS landscape.tbl_rent_escalation;
DROP TABLE IF EXISTS landscape.tbl_percentage_rent;
DROP TABLE IF EXISTS landscape.tbl_expense_recovery;

-- 1c. Drop the commercial-lease table itself
DROP TABLE IF EXISTS landscape.tbl_commercial_lease;


-- ============================================================================
-- BLOCK 2: Delete the 40 mislabeled rows on tbl_lease
-- ============================================================================

DELETE FROM landscape.tbl_lease
WHERE tenant_name LIKE 'Resident Unit %'
  AND project_id IN (
      SELECT project_id FROM landscape.tbl_project WHERE project_name = 'Vincent Village Apartments'
  );


-- ============================================================================
-- BLOCK 3: Net lease extension on the main lease table
-- ============================================================================

-- 3a. Add tenant_id FK to tbl_lease (nullable; coexists with tenant_name string)
ALTER TABLE landscape.tbl_lease
    ADD COLUMN IF NOT EXISTS tenant_id INTEGER
        REFERENCES landscape.tbl_tenant(tenant_id) ON DELETE SET NULL;

COMMENT ON COLUMN landscape.tbl_lease.tenant_id IS
    'Link to the tenant record (which links to the permanent Operator entity from Increment 1). Coexists with the tenant_name string column for backward compatibility — the FK is the source of truth going forward when populated, the string is the legacy fallback.';

CREATE INDEX IF NOT EXISTS idx_tbl_lease_tenant ON landscape.tbl_lease(tenant_id);


-- 3b. Create the net-lease extension table
CREATE TABLE IF NOT EXISTS landscape.tbl_lease_nl_ext (
    lease_id            INTEGER PRIMARY KEY
                        REFERENCES landscape.tbl_lease(lease_id) ON DELETE CASCADE,

    -- Deal classification
    sale_leaseback_subtype VARCHAR(40)
        CHECK (sale_leaseback_subtype IN (
            'new_master_lease',
            'add_on_to_existing',
            'existing_lease_acquisition',
            'build_to_suit_forward',
            'not_slb'
        )),
    is_build_to_suit    BOOLEAN DEFAULT false,

    -- Real estate interest
    investment_type     VARCHAR(20)
        CHECK (investment_type IN ('fee_simple', 'leasehold', 'fee_with_ground_lease')),
    is_conforming_investment BOOLEAN,
    is_all_or_none_purchase  BOOLEAN,

    -- Buyer rights and protections
    has_rofo            BOOLEAN DEFAULT false,
    has_rofr            BOOLEAN DEFAULT false,
    has_purchase_option BOOLEAN DEFAULT false,
    has_early_termination BOOLEAN DEFAULT false,
    deposit_amount      NUMERIC(15,2),

    -- Tenant rights and obligations
    subleasing_allowed  VARCHAR(60),
    lessor_assignment_provisions TEXT,
    lessee_assignment_net_worth_test VARCHAR(120),
    going_dark_clause   TEXT,
    permitted_use_restrictions TEXT,
    percentage_rent_threshold NUMERIC(15,2),
    percentage_rent_rate NUMERIC(5,4),

    -- Credit and reporting requirements
    financial_covenants TEXT,
    financial_covenants_removed_in_restructuring BOOLEAN DEFAULT false,
    management_fee_limitation NUMERIC(15,2),
    rent_recovery_pct_post_restructuring NUMERIC(5,2),
    corp_reporting_frequency VARCHAR(20)
        CHECK (corp_reporting_frequency IN ('quarterly', 'annual', 'monthly', 'on_demand', 'none')),
    corp_reporting_statements VARCHAR(120),
    unit_reporting_frequency VARCHAR(20)
        CHECK (unit_reporting_frequency IN ('quarterly', 'annual', 'monthly', 'on_demand', 'none')),
    unit_reporting_statements VARCHAR(120),

    -- Master lease relationship — slot reserved for Increment 4
    master_lease_id     INTEGER,

    -- Audit
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100)
);

COMMENT ON TABLE landscape.tbl_lease_nl_ext IS
    'Net-lease-specific lease extension. Follows the same pattern as tbl_lease_ret_ext, tbl_lease_ind_ext, tbl_lease_mf_ext — universal lease fields stay on tbl_lease; net-lease-specific structured fields (sale-leaseback subtype, investment type, all-or-none, ROFO/ROFR, deposit, subleasing rights, going-dark, financial covenants, percentage rent, financial reporting requirements, etc.) live here. One row per lease.';

COMMENT ON COLUMN landscape.tbl_lease_nl_ext.sale_leaseback_subtype IS
    'Deal classification: new_master_lease (fresh SLB creating a new master lease), add_on_to_existing (properties added to an existing master lease, often with term reset and escalation modification), existing_lease_acquisition (institutional landlord exits, operator stays on existing lease), build_to_suit_forward (buyer commits to fund construction; tenant signs lease at delivery), not_slb (none of the above).';

COMMENT ON COLUMN landscape.tbl_lease_nl_ext.investment_type IS
    'fee_simple = full real estate ownership; leasehold = buyer holds ground-leased interest only; fee_with_ground_lease = building owned in fee, land ground-leased from third party (the inherit-and-pass-through pattern).';

COMMENT ON COLUMN landscape.tbl_lease_nl_ext.is_conforming_investment IS
    'Internal credit-committee designation about whether the deal fits the buyer''s standard underwriting profile. Larger building, atypical property type, atypical operator, etc. flag as non-conforming.';

COMMENT ON COLUMN landscape.tbl_lease_nl_ext.master_lease_id IS
    'Reserved slot for Increment 4 — links to the long-lived Master Lease entity. NULL until that entity exists and is populated.';

CREATE INDEX IF NOT EXISTS idx_tbl_lease_nl_ext_subtype ON landscape.tbl_lease_nl_ext(sale_leaseback_subtype);
CREATE INDEX IF NOT EXISTS idx_tbl_lease_nl_ext_master_lease ON landscape.tbl_lease_nl_ext(master_lease_id);


COMMIT;


-- ============================================================================
-- Verification queries (run after migration to confirm)
-- ============================================================================
-- BLOCK 1 verification:
-- SELECT to_regclass('landscape.tbl_commercial_lease');  -- expect NULL
-- SELECT to_regclass('landscape.tbl_rent_schedule');     -- expect NULL
-- SELECT to_regclass('landscape.tbl_rent_escalation');   -- expect NULL
-- SELECT to_regclass('landscape.tbl_percentage_rent');   -- expect NULL
-- SELECT to_regclass('landscape.tbl_expense_recovery');  -- expect NULL
-- SELECT COUNT(*) FROM landscape.tbl_commercial_lease_archive_20260506;  -- expect 5
--
-- BLOCK 2 verification:
-- SELECT COUNT(*) FROM landscape.tbl_lease;   -- expect 0 (was 40, all stale)
-- SELECT COUNT(*) FROM landscape.tbl_lease_archive_20260506;  -- expect 40
--
-- BLOCK 3 verification:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='landscape' AND table_name='tbl_lease' AND column_name='tenant_id';
-- SELECT to_regclass('landscape.tbl_lease_nl_ext');  -- expect 'landscape.tbl_lease_nl_ext'
-- SELECT COUNT(*) FROM landscape.tbl_lease_nl_ext;   -- expect 0
