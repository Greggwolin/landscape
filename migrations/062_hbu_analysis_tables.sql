-- Migration: 062_hbu_analysis_tables.sql
-- Description: Create Highest & Best Use (H&BU) analysis tables
-- Date: 2026-01-20
--
-- H&BU implements the four-test framework required for USPAP compliance:
-- 1. Legally Permissible - Zoning, entitlements, restrictions
-- 2. Physically Possible - Site constraints, size, topography, utilities
-- 3. Economically Feasible - Positive return above land cost
-- 4. Maximally Productive - Highest residual value among feasible uses
--
-- Use Cases:
-- | Scenario                    | Complexity | Rows in tbl_hbu_analysis |
-- |-----------------------------|------------|--------------------------|
-- | Existing Stabilized Property| Simple     | 1 (as_improved)          |
-- | Value-Add Analysis          | Medium     | 2 (current + renovated)  |
-- | Proposed Development        | Medium     | 2 (as_vacant + as_improved)|
-- | Feasibility Study           | Complex    | 3+ (multiple alternatives)|

BEGIN;

-- ============================================================================
-- 1. Main H&BU Analysis Table
-- ============================================================================

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
    legal_zoning_source_doc_id BIGINT REFERENCES landscape.core_doc(id),
    legal_permitted_uses JSONB,
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
    physical_constraints JSONB,
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
    economic_feasibility_threshold VARCHAR(50),
    economic_narrative TEXT,

    -- ─────────────────────────────────────────────────────────────────────────
    -- 4. Maximally Productive
    -- ─────────────────────────────────────────────────────────────────────────
    is_maximally_productive BOOLEAN DEFAULT FALSE,
    productivity_rank INTEGER,
    productivity_metric VARCHAR(50),
    productivity_narrative TEXT,

    -- ─────────────────────────────────────────────────────────────────────────
    -- Conclusion
    -- ─────────────────────────────────────────────────────────────────────────
    conclusion_use_type VARCHAR(200),
    conclusion_density VARCHAR(100),
    conclusion_summary TEXT,
    conclusion_full_narrative TEXT,

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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hbu_project ON landscape.tbl_hbu_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_hbu_scenario_type ON landscape.tbl_hbu_analysis(project_id, scenario_type);
CREATE INDEX IF NOT EXISTS idx_hbu_maximally_productive ON landscape.tbl_hbu_analysis(project_id, is_maximally_productive)
    WHERE is_maximally_productive = TRUE;
CREATE INDEX IF NOT EXISTS idx_hbu_status ON landscape.tbl_hbu_analysis(project_id, status);

-- Comments
COMMENT ON TABLE landscape.tbl_hbu_analysis IS 'Highest and Best Use analysis supporting both simple valuation and multi-scenario feasibility studies';
COMMENT ON COLUMN landscape.tbl_hbu_analysis.scenario_type IS 'as_vacant = site without improvements; as_improved = with current/proposed improvements; alternative = comparison scenario for feasibility';
COMMENT ON COLUMN landscape.tbl_hbu_analysis.is_maximally_productive IS 'TRUE for the scenario that represents the highest and best use conclusion';
COMMENT ON COLUMN landscape.tbl_hbu_analysis.productivity_rank IS 'Ranking among feasible scenarios (1 = winner)';
COMMENT ON COLUMN landscape.tbl_hbu_analysis.productivity_metric IS 'Metric used for comparison: residual_land_value, irr, or profit_margin';


-- ============================================================================
-- 2. Comparable Uses Table (for Feasibility Studies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_hbu_comparable_use (
    comparable_use_id BIGSERIAL PRIMARY KEY,
    hbu_id BIGINT NOT NULL REFERENCES landscape.tbl_hbu_analysis(hbu_id) ON DELETE CASCADE,

    -- Use identification
    use_name VARCHAR(200) NOT NULL,
    use_category VARCHAR(100),

    -- Four tests for this specific use
    is_legally_permissible BOOLEAN,
    is_physically_possible BOOLEAN,
    is_economically_feasible BOOLEAN,

    -- Key metrics
    proposed_density VARCHAR(100),
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

CREATE INDEX IF NOT EXISTS idx_hbu_comparable_use_hbu ON landscape.tbl_hbu_comparable_use(hbu_id);
CREATE INDEX IF NOT EXISTS idx_hbu_comparable_use_rank ON landscape.tbl_hbu_comparable_use(hbu_id, feasibility_rank);

COMMENT ON TABLE landscape.tbl_hbu_comparable_use IS 'Individual uses tested within an H&BU analysis for feasibility comparison';
COMMENT ON COLUMN landscape.tbl_hbu_comparable_use.use_name IS 'Name of the potential use (e.g., "200-Unit Garden Apartments", "150-Unit Townhomes")';
COMMENT ON COLUMN landscape.tbl_hbu_comparable_use.feasibility_rank IS 'Ranking among uses within this H&BU analysis';


-- ============================================================================
-- 3. Zoning Document Links Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_hbu_zoning_document (
    zoning_doc_id BIGSERIAL PRIMARY KEY,
    hbu_id BIGINT NOT NULL REFERENCES landscape.tbl_hbu_analysis(hbu_id) ON DELETE CASCADE,
    document_id BIGINT NOT NULL REFERENCES landscape.core_doc(id),

    -- Extracted data
    jurisdiction_name VARCHAR(200),
    zoning_designation VARCHAR(100),
    permitted_uses_extracted JSONB,
    conditional_uses_extracted JSONB,
    prohibited_uses_extracted JSONB,
    development_standards_extracted JSONB,

    -- Extraction metadata
    extraction_confidence NUMERIC(5,4),
    extraction_date TIMESTAMP WITH TIME ZONE,
    user_verified BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hbu_zoning_doc_hbu ON landscape.tbl_hbu_zoning_document(hbu_id);
CREATE INDEX IF NOT EXISTS idx_hbu_zoning_doc_document ON landscape.tbl_hbu_zoning_document(document_id);

COMMENT ON TABLE landscape.tbl_hbu_zoning_document IS 'Zoning documents linked to H&BU analysis with AI-extracted data';
COMMENT ON COLUMN landscape.tbl_hbu_zoning_document.extraction_confidence IS 'AI extraction confidence score (0.0000 to 1.0000)';
COMMENT ON COLUMN landscape.tbl_hbu_zoning_document.user_verified IS 'TRUE if a user has reviewed and verified the AI extractions';
COMMENT ON COLUMN landscape.tbl_hbu_zoning_document.development_standards_extracted IS 'JSONB with extracted standards: max_density, max_height, max_far, setbacks, parking_ratio';


-- ============================================================================
-- 4. Updated_at trigger for tbl_hbu_analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.fn_hbu_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hbu_updated_at ON landscape.tbl_hbu_analysis;
CREATE TRIGGER trg_hbu_updated_at
    BEFORE UPDATE ON landscape.tbl_hbu_analysis
    FOR EACH ROW
    EXECUTE FUNCTION landscape.fn_hbu_updated_at();


COMMIT;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To roll back this migration:
--
-- DROP TRIGGER IF EXISTS trg_hbu_updated_at ON landscape.tbl_hbu_analysis;
-- DROP FUNCTION IF EXISTS landscape.fn_hbu_updated_at();
-- DROP TABLE IF EXISTS landscape.tbl_hbu_zoning_document;
-- DROP TABLE IF EXISTS landscape.tbl_hbu_comparable_use;
-- DROP TABLE IF EXISTS landscape.tbl_hbu_analysis;
