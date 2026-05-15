-- ============================================================================
-- 20260507_create_master_lease_entity.up.sql
-- Session: LSCMD-NLF-0507-OP4
-- Increment 4 of net lease foundation work
--
-- Master Lease as a long-lived first-class entity. Plugs into the slot
-- reserved on tbl_lease_nl_ext.master_lease_id from Increment 2.
--
-- Four additive changes:
--   1. CREATE TABLE landscape.tbl_master_lease (the long-lived entity)
--   2. CREATE TABLE landscape.tbl_master_lease_amendment (append-only history)
--   3. CREATE TABLE landscape.tbl_master_lease_property (per-property allocation)
--   4. ALTER TABLE landscape.tbl_lease_nl_ext ADD FK constraint on
--      master_lease_id pointing at tbl_master_lease.master_lease_id
--
-- Strictly additive; no existing data touched. Companion .down.sql reverses.
--
-- Approval: net_lease_increment_4_design.html (workspace folder, "yes" 7 May 2026)
-- ============================================================================

BEGIN;


-- ============================================================================
-- 1. tbl_master_lease — the long-lived entity
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_master_lease (
    master_lease_id      SERIAL PRIMARY KEY,

    -- Identity
    master_lease_name    VARCHAR(200) NOT NULL,
    project_id           INTEGER REFERENCES landscape.tbl_project(project_id) ON DELETE SET NULL,
    lease_id             INTEGER REFERENCES landscape.tbl_lease(lease_id) ON DELETE SET NULL,

    -- Current state (gets updated via amendments — past states live in tbl_master_lease_amendment)
    current_lessee_tenant_id INTEGER REFERENCES landscape.tbl_tenant(tenant_id) ON DELETE SET NULL,
    original_commencement_date DATE,
    current_expiration_date DATE,
    current_term_months  INTEGER,

    -- Structural flags
    cross_default_flag   BOOLEAN DEFAULT false,
    cross_collateralized_flag BOOLEAN DEFAULT false,
    recovery_structure   VARCHAR(10)
        CHECK (recovery_structure IN ('NNN', 'NN', 'N', NULL)),

    -- Lifecycle
    status               VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'restructuring', 'terminated', 'expired', 'assigned')),
    amendment_count      INTEGER DEFAULT 0,
    last_amended_at      DATE,

    -- Audit
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100)
);

COMMENT ON TABLE landscape.tbl_master_lease IS
    'Long-lived master lease entity. One row per master lease (one lease covering many properties under a single rent stream). Survives across deals — when properties get added or removed via amendments, the master lease record persists; the changes get logged in tbl_master_lease_amendment.';

COMMENT ON COLUMN landscape.tbl_master_lease.lease_id IS
    'Link to the lease record (tbl_lease) representing the actual contract. The lease record holds the universal lease fields (term, escalations, options, recovery treatment); this entity adds the structural metadata that makes it specifically a master lease.';

COMMENT ON COLUMN landscape.tbl_master_lease.amendment_count IS
    'Denormalized count of amendments on this master lease for performance. Maintained by application code or trigger; not authoritative — always cross-reference tbl_master_lease_amendment if exact count matters.';

COMMENT ON COLUMN landscape.tbl_master_lease.cross_default_flag IS
    'When true, default by the tenant on any one property in the master lease constitutes default across all properties. Standard institutional protection.';

COMMENT ON COLUMN landscape.tbl_master_lease.cross_collateralized_flag IS
    'When true, security interest under the lease applies across all properties in the master lease. Reinforces cross-default protection.';

CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_project ON landscape.tbl_master_lease(project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_lease ON landscape.tbl_master_lease(lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_lessee ON landscape.tbl_master_lease(current_lessee_tenant_id);
CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_status ON landscape.tbl_master_lease(status);


-- ============================================================================
-- 2. tbl_master_lease_amendment — append-only amendment history
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_master_lease_amendment (
    amendment_id         SERIAL PRIMARY KEY,
    master_lease_id      INTEGER NOT NULL REFERENCES landscape.tbl_master_lease(master_lease_id) ON DELETE CASCADE,

    -- Identity
    amendment_number     INTEGER NOT NULL,
    amendment_date       DATE NOT NULL,
    amendment_type       VARCHAR(40) NOT NULL
        CHECK (amendment_type IN (
            'term_extension',
            'term_shortening',
            'property_addition',
            'property_removal',
            'rent_modification',
            'escalation_change',
            'financial_covenant_change',
            'lessee_assignment',
            'guarantor_change',
            'restructuring',
            'other'
        )),

    -- What changed
    description          TEXT,
    term_change_months   INTEGER,
    new_expiration_date  DATE,
    new_escalation_text  TEXT,
    new_lessee_tenant_id INTEGER REFERENCES landscape.tbl_tenant(tenant_id) ON DELETE SET NULL,
    recovery_pct         NUMERIC(5,2),

    -- Audit (append-only — no updated_at)
    amended_by           VARCHAR(100),
    created_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_master_lease_amendment_number UNIQUE (master_lease_id, amendment_number)
);

COMMENT ON TABLE landscape.tbl_master_lease_amendment IS
    'Append-only log of amendments to a master lease. Every modification is a row — never updated, never deleted. Captures term extensions (e.g., the GB Auto Add-On reset to 15 years), property additions/removals (e.g., the Whitewater +7 sites), restructuring outcomes (e.g., the Taco Bueno post-bankruptcy 75% rent recovery), and lessee assignments.';

COMMENT ON COLUMN landscape.tbl_master_lease_amendment.amendment_number IS
    'Sequential within the master lease. First amendment is 1, second is 2, etc. Unique constraint enforces this.';

COMMENT ON COLUMN landscape.tbl_master_lease_amendment.recovery_pct IS
    'Post-restructuring rent recovery percentage. Set when amendment_type=''restructuring''. Example: Taco Bueno 2018 emergence had 75% recovery (rent dropped from pre-petition $1.95M to $1.47M with 8 properties removed).';

CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_amendment_lease ON landscape.tbl_master_lease_amendment(master_lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_amendment_date ON landscape.tbl_master_lease_amendment(amendment_date);
CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_amendment_type ON landscape.tbl_master_lease_amendment(amendment_type);


-- ============================================================================
-- 3. tbl_master_lease_property — per-property allocation
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_master_lease_property (
    master_lease_property_id SERIAL PRIMARY KEY,
    master_lease_id      INTEGER NOT NULL REFERENCES landscape.tbl_master_lease(master_lease_id) ON DELETE CASCADE,
    parcel_id            INTEGER REFERENCES landscape.tbl_parcel(parcel_id) ON DELETE SET NULL,

    -- Allocation
    allocated_rent       NUMERIC(15,2),
    allocated_purchase_price NUMERIC(15,2),
    allocated_cap_rate   NUMERIC(7,5),

    -- Lifecycle
    joined_at            DATE,
    joined_via_amendment_id INTEGER REFERENCES landscape.tbl_master_lease_amendment(amendment_id) ON DELETE SET NULL,
    removed_at           DATE,
    removal_reason       VARCHAR(40)
        CHECK (removal_reason IN (
            'rejected_in_bankruptcy',
            'sold',
            'eminent_domain',
            'subleased',
            'lease_modification',
            'other',
            NULL
        )),
    removed_via_amendment_id INTEGER REFERENCES landscape.tbl_master_lease_amendment(amendment_id) ON DELETE SET NULL,

    -- Audit
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_master_lease_property UNIQUE (master_lease_id, parcel_id)
);

COMMENT ON TABLE landscape.tbl_master_lease_property IS
    'Per-property allocation under a master lease. Each row represents one property''s participation. allocated_rent is this property''s share of the master lease''s total rent stream; allocated_purchase_price is its share of the deal price; allocated_cap_rate is the computed yield (rent ÷ price). Properties can join via amendment (joined_via_amendment_id) or at master lease creation (NULL). Properties can be removed via bankruptcy rejection, sale, eminent domain, or sublease — captured by removed_at, removal_reason, removed_via_amendment_id.';

COMMENT ON COLUMN landscape.tbl_master_lease_property.allocated_cap_rate IS
    'Per-property yield (allocated_rent / allocated_purchase_price). May be computed at insert time or recomputed; not authoritative — application can recompute from rent/price columns.';

CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_property_lease ON landscape.tbl_master_lease_property(master_lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_property_parcel ON landscape.tbl_master_lease_property(parcel_id);
CREATE INDEX IF NOT EXISTS idx_tbl_master_lease_property_joined ON landscape.tbl_master_lease_property(joined_at);


-- ============================================================================
-- 4. Add FK constraint to tbl_lease_nl_ext.master_lease_id (slot reserved in Increment 2)
-- ============================================================================

ALTER TABLE landscape.tbl_lease_nl_ext
    ADD CONSTRAINT tbl_lease_nl_ext_master_lease_id_fkey
        FOREIGN KEY (master_lease_id)
        REFERENCES landscape.tbl_master_lease(master_lease_id)
        ON DELETE SET NULL;

COMMENT ON COLUMN landscape.tbl_lease_nl_ext.master_lease_id IS
    'Link to the master lease this lease is part of (filled in by Increment 4''s FK constraint). NULL for single-property net leases. Set when the lease is one of many under a master lease covering multiple properties.';


COMMIT;


-- ============================================================================
-- Verification queries
-- ============================================================================
-- SELECT to_regclass('landscape.tbl_master_lease');                     -- expect set
-- SELECT to_regclass('landscape.tbl_master_lease_amendment');           -- expect set
-- SELECT to_regclass('landscape.tbl_master_lease_property');            -- expect set
-- SELECT COUNT(*) FROM landscape.tbl_master_lease;                       -- expect 0
-- SELECT COUNT(*) FROM landscape.tbl_master_lease_amendment;             -- expect 0
-- SELECT COUNT(*) FROM landscape.tbl_master_lease_property;              -- expect 0
-- Confirm FK constraint exists:
-- SELECT constraint_name FROM information_schema.table_constraints
--   WHERE table_schema='landscape' AND table_name='tbl_lease_nl_ext'
--   AND constraint_name='tbl_lease_nl_ext_master_lease_id_fkey';
