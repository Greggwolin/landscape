-- Migration: 060_hbu_analysis_tables.sql
-- Description: Create Highest & Best Use (H&BU) analysis tables
-- Date: 2026-01-20
--
-- H&BU implements the four-test framework for USPAP-compliant appraisals:
-- 1. Legally Permissible - Zoning, entitlements, restrictions
-- 2. Physically Possible - Site constraints, size, topography, utilities
-- 3. Economically Feasible - Positive return above land cost
-- 4. Maximally Productive - Highest residual value among feasible uses
--
-- Use Cases:
-- - Existing Stabilized Property: 1 row (as_improved)
-- - Value-Add Analysis: 2 rows (current + renovated)
-- - Proposed Development: 2 rows (as_vacant + as_improved)
-- - Feasibility Study: 3+ rows (multiple alternatives)

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Main H&BU Analysis Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS landscape.tbl_hbu_analysis (
    hbu_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Scenario identification
    scenario_name VARCHAR(200) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL CHECK (scenario_type IN (
        'as_vacant',           -- H&BU of site as vacant
        'as_improved',         -- H&BU of property as improved
        'alternative'          -- Alternative use for feasibility comparison
    )),

    -- ─────────────────────────────────────────────────────────────────────────
    -- 1. Legally Permissible
    -- ─────────────────────────────────────────────────────────────────────────
    legal_permissible BOOLEAN,
    legal_zoning_code VARCHAR(100),
    legal_zoning_source_doc_id BIGINT REFERENCES landscape.core_doc(doc_id) ON DELETE SET NULL,
    legal_permitted_uses JSONB,              -- Array of permitted use strings
    legal_requires_variance BOOLEAN DEFAULT FALSE,
    legal_variance_type VARCHAR(200),
    legal_narrative TEXT,

    -- ─────────────────────────────────────────────────────────────────────────
    -- 2. Physically Possible
    -- ─────────────────────────────────────────────────────────────────────────
    physical_possible BOOLEAN,
    physical_site_adequate BOOLEAN,
    physical_topography_suitable BOOLEAN,
    physical_utilities_available BOOLEAN,
    physical_access_adequate BOOLEAN,
    physical_constraints JSONB,              -- Array of constraint objects
    physical_narrative TEXT,

    -- ─────────────────────────────────────────────────────────────────────────
    -- 3. Economically Feasible
    -- ─────────────────────────────────────────────────────────────────────────
    economic_feasible BOOLEAN,
    economic_development_cost NUMERIC(15,2),
    economic_stabilized_value NUMERIC(15,2),
    economic_residual_land_value NUMERIC(15,2),
    economic_profit_margin_pct NUMERIC(5,2),
    economic_irr_pct NUMERIC(5,2),
    economic_feasibility_threshold VARCHAR(50),  -- e.g., 'positive_residual', 'min_irr_15'
    economic_narrative TEXT,

    -- ─────────────────────────────────────────────────────────────────────────
    -- 4. Maximally Productive
    -- ─────────────────────────────────────────────────────────────────────────
    is_maximally_productive BOOLEAN DEFAULT FALSE,
    productivity_rank INTEGER,
    productivity_metric VARCHAR(50),          -- 'residual_land_value', 'irr', 'profit_margin'
    productivity_narrative TEXT,

    -- ─────────────────────────────────────────────────────────────────────────
    -- Conclusion
    -- ─────────────────────────────────────────────────────────────────────────
    conclusion_use_type VARCHAR(200),         -- e.g., 'Garden Apartments', 'Townhomes'
    conclusion_density VARCHAR(100),          -- e.g., '24 DU/AC', '150 units'
    conclusion_summary TEXT,                  -- 1-2 sentence summary
    conclusion_full_narrative TEXT,           -- Full appraisal-style narrative

    -- ─────────────────────────────────────────────────────────────────────────
    -- Status & Audit
    -- ─────────────────────────────────────────────────────────────────────────
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft',
        'ai_generated',
        'user_reviewed',
        'final'
    )),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- Indexes for tbl_hbu_analysis
CREATE INDEX idx_hbu_project ON landscape.tbl_hbu_analysis(project_id);
CREATE INDEX idx_hbu_scenario_type ON landscape.tbl_hbu_analysis(project_id, scenario_type);
CREATE INDEX idx_hbu_maximally_productive ON landscape.tbl_hbu_analysis(project_id, is_maximally_productive)
    WHERE is_maximally_productive = TRUE;

-- Comments
COMMENT ON TABLE landscape.tbl_hbu_analysis IS 'Highest and Best Use analysis supporting both simple valuation and multi-scenario feasibility studies';
COMMENT ON COLUMN landscape.tbl_hbu_analysis.scenario_type IS 'as_vacant = site without improvements; as_improved = with current/proposed improvements; alternative = comparison scenario for feasibility';
COMMENT ON COLUMN landscape.tbl_hbu_analysis.is_maximally_productive IS 'TRUE for the scenario that represents the highest and best use conclusion';
COMMENT ON COLUMN landscape.tbl_hbu_analysis.productivity_metric IS 'The metric used to determine maximum productivity: residual_land_value, irr, or profit_margin';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Comparable Uses Table (for Feasibility Studies)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS landscape.tbl_hbu_comparable_use (
    comparable_use_id BIGSERIAL PRIMARY KEY,
    hbu_id BIGINT NOT NULL REFERENCES landscape.tbl_hbu_analysis(hbu_id) ON DELETE CASCADE,

    -- Use identification
    use_name VARCHAR(200) NOT NULL,
    use_category VARCHAR(100),                -- e.g., 'Residential', 'Commercial', 'Mixed-Use'

    -- Four tests for this specific use
    is_legally_permissible BOOLEAN,
    is_physically_possible BOOLEAN,
    is_economically_feasible BOOLEAN,

    -- Key metrics
    proposed_density VARCHAR(100),            -- e.g., '20 DU/AC', '0.5 FAR'
    development_cost NUMERIC(15,2),
    stabilized_value NUMERIC(15,2),
    residual_land_value NUMERIC(15,2),
    irr_pct NUMERIC(5,2),

    -- Ranking
    feasibility_rank INTEGER,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tbl_hbu_comparable_use
CREATE INDEX idx_hbu_comparable_use_hbu ON landscape.tbl_hbu_comparable_use(hbu_id);
CREATE INDEX idx_hbu_comparable_use_rank ON landscape.tbl_hbu_comparable_use(hbu_id, feasibility_rank);

COMMENT ON TABLE landscape.tbl_hbu_comparable_use IS 'Individual uses tested within an H&BU analysis for feasibility comparison';
COMMENT ON COLUMN landscape.tbl_hbu_comparable_use.use_category IS 'Broad category: Residential, Commercial, Industrial, Mixed-Use, etc.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Zoning Document Links Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS landscape.tbl_hbu_zoning_document (
    zoning_doc_id BIGSERIAL PRIMARY KEY,
    hbu_id BIGINT NOT NULL REFERENCES landscape.tbl_hbu_analysis(hbu_id) ON DELETE CASCADE,
    document_id BIGINT NOT NULL REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,

    -- Extracted data
    jurisdiction_name VARCHAR(200),
    zoning_designation VARCHAR(100),
    permitted_uses_extracted JSONB,           -- Array of permitted use strings
    conditional_uses_extracted JSONB,         -- Array of conditional use strings
    prohibited_uses_extracted JSONB,          -- Array of prohibited use strings
    development_standards_extracted JSONB,    -- Object: max_density, max_height, max_far, setbacks, parking_ratio

    -- Extraction metadata
    extraction_confidence NUMERIC(5,4),       -- 0.0000 to 1.0000
    extraction_date TIMESTAMP WITH TIME ZONE,
    user_verified BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tbl_hbu_zoning_document
CREATE INDEX idx_hbu_zoning_doc_hbu ON landscape.tbl_hbu_zoning_document(hbu_id);
CREATE INDEX idx_hbu_zoning_doc_document ON landscape.tbl_hbu_zoning_document(document_id);

COMMENT ON TABLE landscape.tbl_hbu_zoning_document IS 'Zoning documents linked to H&BU analysis with AI-extracted data';
COMMENT ON COLUMN landscape.tbl_hbu_zoning_document.extraction_confidence IS 'AI extraction confidence score from 0 to 1';
COMMENT ON COLUMN landscape.tbl_hbu_zoning_document.user_verified IS 'TRUE if user has reviewed and confirmed extracted data';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger for updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION landscape.update_hbu_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hbu_analysis_updated_at
    BEFORE UPDATE ON landscape.tbl_hbu_analysis
    FOR EACH ROW
    EXECUTE FUNCTION landscape.update_hbu_analysis_timestamp();


COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK SECTION
-- ═══════════════════════════════════════════════════════════════════════════
-- To rollback this migration, run:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_hbu_analysis_updated_at ON landscape.tbl_hbu_analysis;
-- DROP FUNCTION IF EXISTS landscape.update_hbu_analysis_timestamp();
-- DROP TABLE IF EXISTS landscape.tbl_hbu_zoning_document;
-- DROP TABLE IF EXISTS landscape.tbl_hbu_comparable_use;
-- DROP TABLE IF EXISTS landscape.tbl_hbu_analysis;
-- COMMIT;
