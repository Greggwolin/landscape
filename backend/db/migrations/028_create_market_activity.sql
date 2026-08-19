-- Migration: Create market_activity table
-- Description: Flexible market activity tracking for permits, closings, starts, etc.
-- Supports multiple MSAs, data sources, metric types, and geography granularities.
-- Date: 2025-12-03

-- ============================================================================
-- TABLE: market_activity
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.market_activity (
    id SERIAL PRIMARY KEY,

    -- Market identification
    msa_code VARCHAR(10) NOT NULL,            -- MSA code (e.g., '38060' for Phoenix)

    -- Data classification
    source VARCHAR(50) NOT NULL,              -- 'HBACA', 'Census', 'MLS', etc.
    metric_type VARCHAR(50) NOT NULL,         -- 'permits', 'closings', 'starts'
    geography_type VARCHAR(50) NOT NULL,      -- 'jurisdiction', 'county', 'msa', 'zip'
    geography_name VARCHAR(100) NOT NULL,     -- 'Buckeye', 'Maricopa County', etc.

    -- Period identification
    period_type VARCHAR(20) NOT NULL,         -- 'monthly', 'quarterly', 'annual'
    period_end_date DATE NOT NULL,            -- End of period (e.g., 2025-01-31 for Jan 2025)

    -- Value
    value INT NOT NULL,                       -- The metric value (e.g., permit count)

    -- Metadata
    notes TEXT,                               -- Optional context or notes
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Uniqueness constraint for upsert
    UNIQUE (msa_code, source, metric_type, geography_type, geography_name, period_end_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: MSA + geography + date range
CREATE INDEX IF NOT EXISTS idx_market_activity_lookup
    ON landscape.market_activity (msa_code, geography_name, period_end_date DESC);

-- Filter by source and metric type
CREATE INDEX IF NOT EXISTS idx_market_activity_source
    ON landscape.market_activity (source, metric_type);

-- Date-based queries (recent data)
CREATE INDEX IF NOT EXISTS idx_market_activity_period
    ON landscape.market_activity (period_end_date DESC);

-- Geography type filtering
CREATE INDEX IF NOT EXISTS idx_market_activity_geo_type
    ON landscape.market_activity (msa_code, geography_type);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE landscape.market_activity IS
    'Flexible market activity tracking for permits, closings, housing starts, and other periodic market metrics. Supports multiple MSAs, data sources, and geography granularities.';

COMMENT ON COLUMN landscape.market_activity.msa_code IS
    'Metropolitan Statistical Area code (Census CBSA code). E.g., 38060 for Phoenix-Mesa-Chandler.';

COMMENT ON COLUMN landscape.market_activity.source IS
    'Data source identifier. E.g., HBACA, Census, MLS, CoStar.';

COMMENT ON COLUMN landscape.market_activity.metric_type IS
    'Type of market activity metric. E.g., permits, closings, starts, absorptions.';

COMMENT ON COLUMN landscape.market_activity.geography_type IS
    'Granularity of the geography. E.g., jurisdiction, county, msa, zip, submarket.';

COMMENT ON COLUMN landscape.market_activity.geography_name IS
    'Name of the geographic area. E.g., Buckeye, Maricopa County, Phoenix MSA.';

COMMENT ON COLUMN landscape.market_activity.period_type IS
    'Reporting period cadence. E.g., monthly, quarterly, annual.';

COMMENT ON COLUMN landscape.market_activity.period_end_date IS
    'End date of the reporting period. Monthly uses last day of month (2025-01-31), quarterly uses last day of quarter (2025-03-31), annual uses Dec 31.';

COMMENT ON COLUMN landscape.market_activity.value IS
    'The metric value for this period. Interpretation depends on metric_type.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table created
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'market_activity'
ORDER BY ordinal_position;
