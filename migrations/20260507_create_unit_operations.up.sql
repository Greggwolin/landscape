-- ============================================================================
-- 20260507_create_unit_operations.up.sql
-- Session: LSCMD-NLF-0507-OP6
-- Increment 6 of net lease foundation work
--
-- Per-store P&L over time with concept-aware extension fields via JSONB.
-- One row per (parcel, period). Universal base columns + concept_specific JSONB
-- governed by tbl_concept_field rules from Increment 3.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS landscape.tbl_unit_operations (
    unit_operations_id   SERIAL PRIMARY KEY,
    parcel_id            INTEGER REFERENCES landscape.tbl_parcel(parcel_id) ON DELETE SET NULL,
    concept_id           INTEGER REFERENCES landscape.tbl_concept(concept_id) ON DELETE SET NULL,

    period_type          VARCHAR(20) NOT NULL
        CHECK (period_type IN ('FYE', 'TTM', 'annualized', 'interim', 'pro_forma')),
    period_end_date      DATE NOT NULL,
    period_label         VARCHAR(60),

    -- Universal base — revenue side
    revenue              NUMERIC(15,2),
    cogs                 NUMERIC(15,2),
    gross_profit         NUMERIC(15,2),
    gross_profit_margin  NUMERIC(5,2),

    -- Universal base — operating side
    operating_expenses   NUMERIC(15,2),
    ebitdar              NUMERIC(15,2),
    ebitdar_margin       NUMERIC(5,2),
    rent                 NUMERIC(15,2),
    rent_coverage        NUMERIC(7,2),
    fixed_charge_coverage NUMERIC(7,2),
    ebitda               NUMERIC(15,2),
    ebitda_margin        NUMERIC(5,2),

    -- Universal base — volume / trajectory
    auv                  NUMERIC(15,2),
    same_store_revenue_yoy   NUMERIC(7,4),
    same_store_revenue_cagr  NUMERIC(7,4),
    same_store_ebitdar_yoy   NUMERIC(7,4),
    same_store_ebitdar_cagr  NUMERIC(7,4),

    -- Concept-specific extensions (validated against tbl_concept_field)
    concept_specific     JSONB,

    -- Provenance
    data_source          VARCHAR(40)
        CHECK (data_source IN ('operator_provided', 'extracted_from_doc', 'estimated', 'corporate_margin_proxy', NULL)),
    source_doc_id        INTEGER,
    is_pro_forma         BOOLEAN DEFAULT false,

    -- Audit
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100),

    CONSTRAINT uq_unit_operations_period UNIQUE (parcel_id, period_type, period_end_date)
);

COMMENT ON TABLE landscape.tbl_unit_operations IS
    'Per-store P&L with concept-aware extensions. One row per (parcel, period_type, period_end_date) triple. Universal base columns capture metrics that apply to every concept (revenue, EBITDAR, margin, coverage, AUV); concept-specific extensions go in concept_specific JSONB validated against the field definitions in tbl_concept_field. Powers the Unit Analysis section of the credit memo.';

COMMENT ON COLUMN landscape.tbl_unit_operations.data_source IS
    'operator_provided = direct from operator''s P&L; extracted_from_doc = pulled from an uploaded document via the extraction pipeline; estimated = analyst estimate; corporate_margin_proxy = unit-level margin not available, corporate margin applied to unit revenue (the Vista Clinical pattern — flagged as a data-quality limitation in the memo).';

COMMENT ON COLUMN landscape.tbl_unit_operations.concept_specific IS
    'JSONB for concept-specific fields. Keys validated against tbl_concept_field rows for the concept. Example for c-store: {"fuel_gallons_sold": 1200000, "fuel_margin_per_gallon": 0.32, "inside_store_sales": 850000}. Validation enforced at app layer, not DB constraint.';

CREATE INDEX IF NOT EXISTS idx_unit_operations_parcel ON landscape.tbl_unit_operations(parcel_id);
CREATE INDEX IF NOT EXISTS idx_unit_operations_concept ON landscape.tbl_unit_operations(concept_id);
CREATE INDEX IF NOT EXISTS idx_unit_operations_period_date ON landscape.tbl_unit_operations(period_end_date);
CREATE INDEX IF NOT EXISTS idx_unit_operations_data_source ON landscape.tbl_unit_operations(data_source);

COMMIT;
