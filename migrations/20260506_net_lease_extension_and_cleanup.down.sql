-- ============================================================================
-- 20260506_net_lease_extension_and_cleanup.down.sql
-- Session: LSCMD-NLF-0506-OP2
-- Reverses 20260506_net_lease_extension_and_cleanup.up.sql
--
-- Restores in reverse dependency order:
--   BLOCK 3 (additive, fully reversible):
--     - Drop tbl_lease_nl_ext
--     - Drop tenant_id column + index from tbl_lease
--   BLOCK 2 (deletion, restorable from archive):
--     - Re-insert the 40 stale rows from tbl_lease_archive_20260506
--   BLOCK 1 (drops, partially reversible):
--     - Re-create tbl_commercial_lease and 4 child tables from archive contents
--       NOTE: Schema reconstruction below is the CURRENT-as-of-2026-05-06 schema.
--       If the original tables had additional columns or indexes not in the
--       archive, those will not be restored. Use this down migration only for
--       same-day rollback. For later restore, the archive tables hold the data
--       and you'd need to manually reconstruct the schema from the rich schema
--       export (docs/schema/landscape_rich_schema_2026-03-24*.md).
--
--   PRE-BLOCK ARCHIVES (kept around even after down — drop manually if desired):
--     - tbl_commercial_lease_archive_20260506
--     - tbl_rent_schedule_archive_20260506
--     - tbl_rent_escalation_archive_20260506
--     - tbl_percentage_rent_archive_20260506
--     - tbl_expense_recovery_archive_20260506
--     - tbl_lease_archive_20260506
-- ============================================================================

BEGIN;


-- ============================================================================
-- BLOCK 3 reversal (clean, fully reversible)
-- ============================================================================

-- Drop the net-lease extension table
DROP TABLE IF EXISTS landscape.tbl_lease_nl_ext;

-- Drop the tenant_id column + index from tbl_lease
DROP INDEX IF EXISTS landscape.idx_tbl_lease_tenant;
ALTER TABLE landscape.tbl_lease DROP COLUMN IF EXISTS tenant_id;


-- ============================================================================
-- BLOCK 2 reversal (restore the 40 deleted rows from archive)
-- ============================================================================

INSERT INTO landscape.tbl_lease
    SELECT * FROM landscape.tbl_lease_archive_20260506;


-- ============================================================================
-- BLOCK 1 reversal (re-create tbl_commercial_lease + 4 child tables)
-- ============================================================================

-- 1b. Re-create tbl_commercial_lease (schema as of 2026-05-06)
CREATE TABLE landscape.tbl_commercial_lease (
    lease_id                   INTEGER PRIMARY KEY,
    income_property_id         INTEGER,
    space_id                   INTEGER,
    tenant_id                  INTEGER,
    lease_number               VARCHAR(50),
    lease_type                 VARCHAR(30),
    lease_status               VARCHAR(30),
    lease_execution_date       DATE,
    lease_commencement_date    DATE,
    rent_commencement_date     DATE,
    lease_expiration_date      DATE,
    lease_term_months          INTEGER,
    leased_sf                  NUMERIC,
    number_of_options          INTEGER,
    option_term_months         INTEGER,
    option_notice_months       INTEGER,
    early_termination_allowed  BOOLEAN,
    termination_notice_months  INTEGER,
    termination_penalty_amount NUMERIC,
    security_deposit_amount    NUMERIC,
    security_deposit_months    NUMERIC,
    expansion_rights           BOOLEAN,
    right_of_first_refusal     BOOLEAN,
    exclusive_use_clause       TEXT,
    co_tenancy_clause          TEXT,
    radius_restriction         TEXT,
    notes                      TEXT,
    created_at                 TIMESTAMP,
    updated_at                 TIMESTAMP,
    lease_type_code            VARCHAR(20)
);

-- Restore data from archive
INSERT INTO landscape.tbl_commercial_lease
    SELECT * FROM landscape.tbl_commercial_lease_archive_20260506;

-- 1a. Re-create the 4 child tables (schema as of 2026-05-06)
CREATE TABLE landscape.tbl_rent_schedule (
    schedule_id        INTEGER PRIMARY KEY,
    lease_id           INTEGER REFERENCES landscape.tbl_commercial_lease(lease_id),
    period_start_date  DATE,
    period_end_date    DATE,
    monthly_rent       NUMERIC,
    annual_rent        NUMERIC,
    rent_psf_annual    NUMERIC,
    notes              TEXT,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP
);

CREATE TABLE landscape.tbl_rent_escalation (
    escalation_id      INTEGER PRIMARY KEY,
    lease_id           INTEGER REFERENCES landscape.tbl_commercial_lease(lease_id),
    escalation_date    DATE,
    escalation_type    VARCHAR(30),
    escalation_pct     NUMERIC,
    escalation_amount  NUMERIC,
    notes              TEXT,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP
);

CREATE TABLE landscape.tbl_percentage_rent (
    percentage_rent_id   INTEGER PRIMARY KEY,
    lease_id             INTEGER REFERENCES landscape.tbl_commercial_lease(lease_id),
    breakpoint_amount    NUMERIC,
    percentage_rate      NUMERIC,
    natural_breakpoint   BOOLEAN,
    artificial_breakpoint BOOLEAN,
    exclusions           TEXT,
    notes                TEXT,
    created_at           TIMESTAMP,
    updated_at           TIMESTAMP
);

CREATE TABLE landscape.tbl_expense_recovery (
    recovery_id        INTEGER PRIMARY KEY,
    lease_id           INTEGER REFERENCES landscape.tbl_commercial_lease(lease_id),
    expense_category   VARCHAR(50),
    recovery_method    VARCHAR(30),
    pro_rata_share_pct NUMERIC,
    base_year          INTEGER,
    base_amount        NUMERIC,
    cap_amount         NUMERIC,
    notes              TEXT,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP
);

-- Restore child-table data from archives (all 4 are empty per pre-drop state)
INSERT INTO landscape.tbl_rent_schedule
    SELECT * FROM landscape.tbl_rent_schedule_archive_20260506;
INSERT INTO landscape.tbl_rent_escalation
    SELECT * FROM landscape.tbl_rent_escalation_archive_20260506;
INSERT INTO landscape.tbl_percentage_rent
    SELECT * FROM landscape.tbl_percentage_rent_archive_20260506;
INSERT INTO landscape.tbl_expense_recovery
    SELECT * FROM landscape.tbl_expense_recovery_archive_20260506;

-- Re-create the vw_rent_roll view (schema as of pre-drop state on 2026-05-06)
CREATE VIEW landscape.vw_rent_roll AS
 SELECT p.property_name,
    s.space_number,
    s.rentable_sf,
    t.tenant_name,
    t.creditworthiness,
    l.lease_number,
    l.lease_commencement_date,
    l.lease_expiration_date,
    l.lease_term_months,
    br.base_rent_annual,
    br.base_rent_psf_annual,
    l.lease_status
   FROM landscape.tbl_commercial_lease l
     JOIN landscape.tbl_space s ON l.space_id = s.space_id
     JOIN landscape.tbl_income_property p ON s.income_property_id = p.income_property_id
     JOIN landscape.tbl_tenant t ON l.tenant_id = t.tenant_id
     LEFT JOIN landscape.tbl_rent_schedule br ON l.lease_id = br.lease_id
  WHERE l.lease_status::text = 'Active'::text
  ORDER BY p.property_name, s.space_number;


COMMIT;

-- ============================================================================
-- Note on archive tables
-- ============================================================================
-- The 6 archive tables created by the up migration are intentionally NOT
-- dropped by this down migration, in case they're useful for forensics.
-- Drop them manually if desired:
--   DROP TABLE landscape.tbl_commercial_lease_archive_20260506;
--   DROP TABLE landscape.tbl_rent_schedule_archive_20260506;
--   DROP TABLE landscape.tbl_rent_escalation_archive_20260506;
--   DROP TABLE landscape.tbl_percentage_rent_archive_20260506;
--   DROP TABLE landscape.tbl_expense_recovery_archive_20260506;
--   DROP TABLE landscape.tbl_lease_archive_20260506;
