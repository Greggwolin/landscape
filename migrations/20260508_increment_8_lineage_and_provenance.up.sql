-- =====================================================================
-- Increment 8 — Master Lease Lineage + Property Provenance
-- =====================================================================
-- Session: LSCMD-NLF-0508-OP8
-- Date: 2026-05-08
-- Branch: feature/net-lease-foundation
--
-- Adds:
--   1. tbl_parcel_acquisition_history — per-parcel acquisition records
--      independent of any master lease that subsequently absorbed them.
--   2. tbl_master_lease_property extensions — original_acquisition_date,
--      original_acquisition_price, original_going_in_cap_rate, snapshot_only.
--   3. tbl_master_lease extensions — lineage_type, replaces_master_lease_id,
--      created_from_doc_ids.
--   4. tbl_lease extensions — terminated_by_master_lease_id, terminated_at,
--      termination_reason (for prior single-property leases that get absorbed
--      into a new master lease).
--
-- Strictly additive; no existing rows mutated.
-- =====================================================================

SET search_path TO landscape, public;

-- ---------------------------------------------------------------------
-- 1. tbl_parcel_acquisition_history
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS landscape.tbl_parcel_acquisition_history (
    acquisition_id              SERIAL PRIMARY KEY,
    parcel_id                   INTEGER NOT NULL,
    acquisition_date            DATE,
    acquired_by_operator_id     INTEGER,
    acquired_by_name            VARCHAR(255),
    purchase_price              NUMERIC(18, 2),
    going_in_cap_rate           NUMERIC(7, 4),
    effective_cap_rate          NUMERIC(7, 4),
    seller_name                 VARCHAR(255),
    source_doc_id               INTEGER,
    is_current_owner            BOOLEAN DEFAULT TRUE,
    acquired_via_master_lease_id INTEGER,
    acquired_via_lease_id       INTEGER,
    snapshot_only               BOOLEAN DEFAULT FALSE,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    created_by                  VARCHAR(255),
    updated_by                  VARCHAR(255),

    CONSTRAINT tbl_parcel_acquisition_history_parcel_fkey
        FOREIGN KEY (parcel_id) REFERENCES landscape.tbl_parcel(parcel_id)
        ON DELETE CASCADE,
    CONSTRAINT tbl_parcel_acquisition_history_operator_fkey
        FOREIGN KEY (acquired_by_operator_id) REFERENCES landscape.tbl_operator(operator_id)
        ON DELETE SET NULL,
    CONSTRAINT tbl_parcel_acquisition_history_master_lease_fkey
        FOREIGN KEY (acquired_via_master_lease_id) REFERENCES landscape.tbl_master_lease(master_lease_id)
        ON DELETE SET NULL,
    CONSTRAINT tbl_parcel_acquisition_history_lease_fkey
        FOREIGN KEY (acquired_via_lease_id) REFERENCES landscape.tbl_lease(lease_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_parcel_acq_hx_parcel
    ON landscape.tbl_parcel_acquisition_history(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_acq_hx_operator
    ON landscape.tbl_parcel_acquisition_history(acquired_by_operator_id);
CREATE INDEX IF NOT EXISTS idx_parcel_acq_hx_current
    ON landscape.tbl_parcel_acquisition_history(parcel_id, is_current_owner)
    WHERE is_current_owner = TRUE;

COMMENT ON TABLE landscape.tbl_parcel_acquisition_history IS
    'Per-parcel acquisition records, independent of any master lease that subsequently absorbed them. Exists to capture provenance: when a parcel was first acquired by its current owner, at what price, from whom. Multiple rows per parcel allowed (ownership changes over time); is_current_owner=TRUE flags the active record.';

-- ---------------------------------------------------------------------
-- 2. tbl_master_lease_property — original-basis fields
-- ---------------------------------------------------------------------
ALTER TABLE landscape.tbl_master_lease_property
    ADD COLUMN IF NOT EXISTS original_acquisition_date     DATE,
    ADD COLUMN IF NOT EXISTS original_acquisition_price    NUMERIC(18, 2),
    ADD COLUMN IF NOT EXISTS original_going_in_cap_rate    NUMERIC(7, 4),
    ADD COLUMN IF NOT EXISTS snapshot_only                 BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN landscape.tbl_master_lease_property.original_acquisition_date IS
    'When the parcel was originally acquired by the current owner (distinct from joined_at, which is when the parcel joined this master lease).';
COMMENT ON COLUMN landscape.tbl_master_lease_property.original_acquisition_price IS
    'Price paid when the parcel was originally acquired (distinct from allocated_purchase_price, which is the basis allocated under the current master lease).';
COMMENT ON COLUMN landscape.tbl_master_lease_property.snapshot_only IS
    'TRUE when only the current-master-lease snapshot is known and original acquisition fields are blank because the prior deal CM was not available.';

-- ---------------------------------------------------------------------
-- 3. tbl_master_lease — lineage fields
-- ---------------------------------------------------------------------
ALTER TABLE landscape.tbl_master_lease
    ADD COLUMN IF NOT EXISTS lineage_type           VARCHAR(40) DEFAULT 'original_creation',
    ADD COLUMN IF NOT EXISTS replaces_master_lease_id INTEGER,
    ADD COLUMN IF NOT EXISTS created_from_doc_ids   JSONB DEFAULT '[]'::jsonb;

ALTER TABLE landscape.tbl_master_lease
    ADD CONSTRAINT tbl_master_lease_lineage_type_check CHECK (
        lineage_type IN ('original_creation', 'replaces_prior', 'incorporates_prior_single_leases')
    );

ALTER TABLE landscape.tbl_master_lease
    ADD CONSTRAINT tbl_master_lease_replaces_self_fkey
        FOREIGN KEY (replaces_master_lease_id) REFERENCES landscape.tbl_master_lease(master_lease_id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_master_lease_replaces
    ON landscape.tbl_master_lease(replaces_master_lease_id)
    WHERE replaces_master_lease_id IS NOT NULL;

COMMENT ON COLUMN landscape.tbl_master_lease.lineage_type IS
    'How this master lease came to be: original_creation (first lease for these properties), replaces_prior (supersedes a prior master lease, e.g., post-bankruptcy restructuring), or incorporates_prior_single_leases (rolls up one or more single-property leases into a new master lease, e.g., Vista Clinical Lake City absorbed by Clermont add-on master lease).';

-- ---------------------------------------------------------------------
-- 4. tbl_lease — termination-by-master-lease fields
-- ---------------------------------------------------------------------
ALTER TABLE landscape.tbl_lease
    ADD COLUMN IF NOT EXISTS terminated_by_master_lease_id INTEGER,
    ADD COLUMN IF NOT EXISTS terminated_at                 DATE,
    ADD COLUMN IF NOT EXISTS termination_reason            VARCHAR(80);

ALTER TABLE landscape.tbl_lease
    ADD CONSTRAINT tbl_lease_terminated_by_ml_fkey
        FOREIGN KEY (terminated_by_master_lease_id) REFERENCES landscape.tbl_master_lease(master_lease_id)
        ON DELETE SET NULL;

ALTER TABLE landscape.tbl_lease
    ADD CONSTRAINT tbl_lease_termination_reason_check CHECK (
        termination_reason IS NULL OR termination_reason IN (
            'absorbed_by_master_lease',
            'restructured',
            'expired',
            'mutual_termination',
            'default',
            'sold',
            'other'
        )
    );

CREATE INDEX IF NOT EXISTS idx_lease_terminated_by_ml
    ON landscape.tbl_lease(terminated_by_master_lease_id)
    WHERE terminated_by_master_lease_id IS NOT NULL;

COMMENT ON COLUMN landscape.tbl_lease.terminated_by_master_lease_id IS
    'When a single-property lease is absorbed by a new master lease (e.g., Vista Lake City prior lease being absorbed when the Clermont add-on master lease was created), this points to the absorbing master lease.';
