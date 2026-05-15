-- ============================================================================
-- 20260506_create_operator_entity.up.sql
-- Session: LSCMD-NLF-0506-OP1
-- Increment 1 of net lease foundation work
--
-- Introduces the Operator entity — a permanent, cross-deal record for the
-- business actually running operations at net lease properties. Distinct from
-- Tenant (the legal entity on the lease signature block) and Guarantor (often
-- the corporate parent). General CRE concept, not net-lease-specific; net
-- lease is just the property type where it's highest-value.
--
-- Three changes, all additive:
--   1. CREATE TABLE landscape.tbl_operator (with self-referential hierarchy)
--   2. CREATE TABLE landscape.tbl_operator_alias (name variations registry)
--   3. ALTER TABLE landscape.tbl_tenant ADD COLUMN operator_id (nullable FK)
--
-- Companion: 20260506_create_operator_entity.down.sql reverses all three.
--
-- Approval: net_lease_increment_1_design.html (in workspace folder, "yes" 6 May 2026)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. tbl_operator — permanent business identity
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_operator (
    operator_id          SERIAL PRIMARY KEY,

    -- Core identity
    legal_name           VARCHAR(255) NOT NULL,
    dba_name             VARCHAR(255),

    -- Industry classification
    naics_code           VARCHAR(10),
    industry_segment     VARCHAR(100),
    tenant_industry      VARCHAR(100),

    -- Corporate structure
    parent_operator_id   INTEGER REFERENCES landscape.tbl_operator(operator_id) ON DELETE SET NULL,
    jurisdiction_of_formation VARCHAR(50),
    is_public            BOOLEAN DEFAULT false,
    ticker               VARCHAR(10),

    -- Identity resolution
    identity_resolution_status VARCHAR(20) DEFAULT 'pending'
        CHECK (identity_resolution_status IN ('pending', 'auto-confirmed', 'user-confirmed')),

    -- Cross-deal recognition
    first_seen_at        TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at         TIMESTAMPTZ DEFAULT NOW(),

    -- Audit
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100)
);

COMMENT ON TABLE landscape.tbl_operator IS
    'Permanent business identity. The operator is the business actually running operations and generating the cash flow that pays rent. Distinct from Tenant (the legal entity on the lease) and Guarantor (often the corporate parent). Cross-deal record — same operator surfaces across many deals via NAICS+name+jurisdiction matching.';

COMMENT ON COLUMN landscape.tbl_operator.parent_operator_id IS
    'Self-referential parent. Supports up to four-level hierarchy: sponsor / parent operating company / operating subsidiary / property SPE.';

COMMENT ON COLUMN landscape.tbl_operator.identity_resolution_status IS
    'auto-confirmed = matched programmatically by NAICS+name+jurisdiction; user-confirmed = matched after human review; pending = not yet resolved.';

COMMENT ON COLUMN landscape.tbl_operator.first_seen_at IS
    'When this Operator was first encountered by the platform (across all deals). Useful for cross-deal recognition diagnostics.';

CREATE INDEX IF NOT EXISTS idx_tbl_operator_legal_name ON landscape.tbl_operator(legal_name);
CREATE INDEX IF NOT EXISTS idx_tbl_operator_naics_code ON landscape.tbl_operator(naics_code);
CREATE INDEX IF NOT EXISTS idx_tbl_operator_parent ON landscape.tbl_operator(parent_operator_id);


-- ============================================================================
-- 2. tbl_operator_alias — known name variations
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_operator_alias (
    alias_id             SERIAL PRIMARY KEY,
    operator_id          INTEGER NOT NULL REFERENCES landscape.tbl_operator(operator_id) ON DELETE CASCADE,
    alias_name           VARCHAR(255) NOT NULL,
    alias_type           VARCHAR(30)
        CHECK (alias_type IN ('informal_name', 'prior_legal_name', 'dba', 'subsidiary_name', 'misspelling', 'other')),
    confirmed_by         VARCHAR(100),
    confirmed_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_operator_alias UNIQUE (operator_id, alias_name)
);

COMMENT ON TABLE landscape.tbl_operator_alias IS
    'Known name variations for an Operator. Populated as identity-resolution succeeds. Subsequent encounters of the alias_name are auto-resolved without re-prompting the user.';

COMMENT ON COLUMN landscape.tbl_operator_alias.alias_type IS
    'Why this alias points to this operator. informal_name = e.g., "WLR Auto" for "WLR Automotive Group, Inc."; prior_legal_name = pre-bankruptcy or pre-restructuring entity; dba = doing-business-as; subsidiary_name = an operating sub the parent is also known by; misspelling = OCR-induced or extraction-induced typo; other = catch-all.';

CREATE INDEX IF NOT EXISTS idx_tbl_operator_alias_alias_name ON landscape.tbl_operator_alias(alias_name);
CREATE INDEX IF NOT EXISTS idx_tbl_operator_alias_operator ON landscape.tbl_operator_alias(operator_id);


-- ============================================================================
-- 3. Add operator_id link to tbl_tenant
-- ============================================================================

ALTER TABLE landscape.tbl_tenant
    ADD COLUMN IF NOT EXISTS operator_id INTEGER REFERENCES landscape.tbl_operator(operator_id) ON DELETE SET NULL;

COMMENT ON COLUMN landscape.tbl_tenant.operator_id IS
    'Link to the permanent Operator entity. Existing rows start as NULL; backfill happens separately. New tenant rows created from extraction or user input get linked at creation time when identity-resolution succeeds.';

CREATE INDEX IF NOT EXISTS idx_tbl_tenant_operator ON landscape.tbl_tenant(operator_id);


COMMIT;

-- ============================================================================
-- Verification queries (run after migration to confirm)
-- ============================================================================
-- SELECT COUNT(*) FROM landscape.tbl_operator;          -- expect 0
-- SELECT COUNT(*) FROM landscape.tbl_operator_alias;    -- expect 0
-- SELECT COUNT(*) FROM landscape.tbl_tenant WHERE operator_id IS NULL;  -- expect 78 (all existing rows)
-- SELECT COUNT(*) FROM landscape.tbl_tenant WHERE operator_id IS NOT NULL;  -- expect 0
