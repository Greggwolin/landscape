-- ============================================================================
-- 20260507_create_concept_catalog.up.sql
-- Session: LSCMD-NLF-0507-OP3
-- Increment 3 of net lease foundation work — Block 1 (schema)
--
-- Five additive changes:
--   1. CREATE TABLE landscape.tbl_concept_category
--   2. CREATE TABLE landscape.tbl_concept
--   3. CREATE TABLE landscape.tbl_operator_concept (junction operator <-> concept)
--   4. CREATE TABLE landscape.tbl_concept_field (extension field definitions
--      for concept-aware unit-level operations data)
--   5. ALTER TABLE landscape.tbl_lease_nl_ext ADD COLUMN concept_id (FK)
--
-- All additive; no existing data touched, no existing tables dropped or
-- modified. Companion: 20260507_create_concept_catalog.down.sql reverses
-- everything.
--
-- Approval: net_lease_increment_3_design.html (workspace folder, "proceed
-- with ALL" 7 May 2026)
-- ============================================================================

BEGIN;


-- ============================================================================
-- 1. tbl_concept_category — top-level grouping for concepts
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_concept_category (
    category_id          SERIAL PRIMARY KEY,
    category_code        VARCHAR(20) UNIQUE NOT NULL,
    category_name        VARCHAR(100) NOT NULL,
    sort_order           INTEGER DEFAULT 0,
    description          TEXT,
    is_active            BOOLEAN DEFAULT true,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE landscape.tbl_concept_category IS
    'Top-level grouping for net lease concepts. Examples: Auto Service, Quick-Serve Restaurant, Casual Dining, Convenience & Fuel, Pharmacy, Dollar Store, Medical Service, Specialty Retail, Bank, Distribution, Education, Fitness, Cinema, Self-Storage. Stable controlled list (12-15 categories at v1).';

CREATE INDEX IF NOT EXISTS idx_tbl_concept_category_sort ON landscape.tbl_concept_category(sort_order, category_code);


-- ============================================================================
-- 2. tbl_concept — the concept catalog (the glossary of defined terms)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_concept (
    concept_id           SERIAL PRIMARY KEY,

    -- Identity
    concept_code         VARCHAR(40) UNIQUE NOT NULL,
    concept_name         VARCHAR(120) NOT NULL,
    category_id          INTEGER NOT NULL REFERENCES landscape.tbl_concept_category(category_id),
    naics_code           VARCHAR(10),
    alternative_naics_codes TEXT,
    aliases              TEXT[],

    -- Underwriting reference ranges (all nullable; populated over time
    -- via curation or as deals get underwritten)
    ebitdar_margin_low   NUMERIC(5,2),
    ebitdar_margin_mid   NUMERIC(5,2),
    ebitdar_margin_high  NUMERIC(5,2),
    coverage_threshold_min NUMERIC(5,2),
    typical_going_in_cap_rate_low  NUMERIC(5,4),
    typical_going_in_cap_rate_high NUMERIC(5,4),

    -- Real estate characteristics
    typical_building_sf_min INTEGER,
    typical_building_sf_max INTEGER,
    has_drive_thru       BOOLEAN,
    has_fuel_canopy      BOOLEAN,
    dark_value_characteristic VARCHAR(20)
        CHECK (dark_value_characteristic IN ('good', 'moderate', 'poor', NULL)),
    replacement_cost_characteristic VARCHAR(20)
        CHECK (replacement_cost_characteristic IN ('specialized', 'generic', NULL)),
    highway_corridor_preference BOOLEAN,

    -- Provenance
    seed_source          VARCHAR(40)
        CHECK (seed_source IN ('EDGAR', 'hand_curated', 'user_defined', NULL)),
    seeded_from_reits    TEXT[],
    seeded_at            DATE,
    last_refreshed_at    TIMESTAMPTZ,

    -- Status
    is_active            BOOLEAN DEFAULT true,
    is_curated           BOOLEAN DEFAULT false,
    notes                TEXT,

    -- Audit
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100)
);

COMMENT ON TABLE landscape.tbl_concept IS
    'The net lease concept catalog. Each row is one concept (Lube Shop, Express Car Wash, Quick-Serve Restaurant, Pharmacy, Diagnostic Lab, etc.). Functions as a glossary of defined terms — each concept has a precise definition with NAICS codes, typical underwriting ranges, and real estate characteristics that the rest of the platform''s analysis is anchored on.';

COMMENT ON COLUMN landscape.tbl_concept.aliases IS
    'Array of alternative names for this concept (e.g., ["QSR", "Quick-Service Restaurant", "Fast Food"] for Quick-Serve Restaurant). Populated as EDGAR extraction surfaces variations across REITs.';

COMMENT ON COLUMN landscape.tbl_concept.seed_source IS
    'EDGAR = auto-extracted from public REIT 10-K filings; hand_curated = manually entered by domain expert; user_defined = added by a firm''s users at firm level (extends the catalog beyond the curated set).';

COMMENT ON COLUMN landscape.tbl_concept.is_curated IS
    'TRUE once underwriting reference ranges (margin band, coverage threshold, cap rate range) have been validated by a domain expert. EDGAR-seeded rows start with is_curated=false and these fields NULL.';

CREATE INDEX IF NOT EXISTS idx_tbl_concept_category ON landscape.tbl_concept(category_id);
CREATE INDEX IF NOT EXISTS idx_tbl_concept_naics ON landscape.tbl_concept(naics_code);
CREATE INDEX IF NOT EXISTS idx_tbl_concept_name ON landscape.tbl_concept(concept_name);


-- ============================================================================
-- 3. tbl_operator_concept — junction (operator runs 1+ concepts;
--    concept run by 1+ operators)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_operator_concept (
    operator_concept_id  SERIAL PRIMARY KEY,
    operator_id          INTEGER NOT NULL REFERENCES landscape.tbl_operator(operator_id) ON DELETE CASCADE,
    concept_id           INTEGER NOT NULL REFERENCES landscape.tbl_concept(concept_id) ON DELETE CASCADE,
    is_primary           BOOLEAN DEFAULT false,
    first_observed_at    DATE,
    last_observed_at     DATE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_operator_concept UNIQUE (operator_id, concept_id)
);

COMMENT ON TABLE landscape.tbl_operator_concept IS
    'Many-to-many junction. One operator can run multiple concepts (an automotive service operator running Lube + Auto Repair + Car Wash). One concept is operated by many different operators.';

COMMENT ON COLUMN landscape.tbl_operator_concept.is_primary IS
    'TRUE for the operator''s flagship concept (the one they''re primarily known for). At most one row per operator should have is_primary=TRUE.';

CREATE INDEX IF NOT EXISTS idx_tbl_operator_concept_operator ON landscape.tbl_operator_concept(operator_id);
CREATE INDEX IF NOT EXISTS idx_tbl_operator_concept_concept ON landscape.tbl_operator_concept(concept_id);


-- ============================================================================
-- 4. tbl_concept_field — extension field definitions for concept-aware
--    unit-level operations data (drives Increment 6's per-store P&L shape)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_concept_field (
    concept_field_id     SERIAL PRIMARY KEY,
    concept_id           INTEGER NOT NULL REFERENCES landscape.tbl_concept(concept_id) ON DELETE CASCADE,

    field_name           VARCHAR(60) NOT NULL,
    display_name         VARCHAR(120) NOT NULL,
    description          TEXT,
    data_type            VARCHAR(20) NOT NULL
        CHECK (data_type IN ('integer', 'numeric', 'text', 'date', 'boolean')),
    unit_of_measure      VARCHAR(40),
    valid_values         JSONB,
    is_required          BOOLEAN DEFAULT false,
    sort_order           INTEGER DEFAULT 0,
    field_group          VARCHAR(40),
    is_active            BOOLEAN DEFAULT true,

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_concept_field UNIQUE (concept_id, field_name)
);

COMMENT ON TABLE landscape.tbl_concept_field IS
    'Extension field definitions for concept-aware unit-level operations data. Universal-base fields (revenue, EBITDAR, margin, rent, coverage, AUV) apply to every concept and live as columns on the unit-level operations table (added in Increment 6). This table declares the concept-specific extensions: fuel gallons for c-store, payer mix for medical, drive-thru share for QSR, wash counts and monthly memberships for car wash. Modeled on tbl_field_catalog.';

COMMENT ON COLUMN landscape.tbl_concept_field.field_group IS
    'Optional grouping for related fields. Examples: "fuel_metrics" for c-store fuel-related fields, "medical_payer_mix" for medical lab payer breakdown, "qsr_format" for QSR drive-thru and seating fields.';

COMMENT ON COLUMN landscape.tbl_concept_field.valid_values IS
    'JSONB array of allowed values for enum-style fields (e.g., {"options": ["Express", "Full-Service", "Flex"]} for car wash format). NULL for free-form fields.';

CREATE INDEX IF NOT EXISTS idx_tbl_concept_field_concept ON landscape.tbl_concept_field(concept_id);
CREATE INDEX IF NOT EXISTS idx_tbl_concept_field_group ON landscape.tbl_concept_field(field_group);


-- ============================================================================
-- 5. Add concept_id link to tbl_lease_nl_ext
-- ============================================================================

ALTER TABLE landscape.tbl_lease_nl_ext
    ADD COLUMN IF NOT EXISTS concept_id INTEGER
        REFERENCES landscape.tbl_concept(concept_id) ON DELETE SET NULL;

COMMENT ON COLUMN landscape.tbl_lease_nl_ext.concept_id IS
    'The operating concept of the tenant at this property at the time of this lease. NULL until concept resolution succeeds during deal underwriting. A property has a concept history tracked via successive lease records — when a tenant changes (Walgreens leaves, Dollar Tree moves in), a new lease is recorded with the new concept.';

CREATE INDEX IF NOT EXISTS idx_tbl_lease_nl_ext_concept ON landscape.tbl_lease_nl_ext(concept_id);


COMMIT;


-- ============================================================================
-- Verification queries (run after migration to confirm)
-- ============================================================================
-- SELECT to_regclass('landscape.tbl_concept_category');  -- expect 'landscape.tbl_concept_category'
-- SELECT to_regclass('landscape.tbl_concept');           -- expect 'landscape.tbl_concept'
-- SELECT to_regclass('landscape.tbl_operator_concept'); -- expect 'landscape.tbl_operator_concept'
-- SELECT to_regclass('landscape.tbl_concept_field');    -- expect 'landscape.tbl_concept_field'
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='landscape' AND table_name='tbl_lease_nl_ext' AND column_name='concept_id';
-- All counts expect 0
