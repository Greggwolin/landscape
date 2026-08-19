-- ============================================================================
-- Location Analysis Persistence
-- Extends tbl_narrative_version to store T1/T2/T3 location analyses
-- with data snapshots for staleness detection
-- ============================================================================

-- 1. Drop and re-add CHECK constraint to include location tiers
ALTER TABLE landscape.tbl_narrative_version
DROP CONSTRAINT IF EXISTS chk_narrative_approach_type;

ALTER TABLE landscape.tbl_narrative_version
ADD CONSTRAINT chk_narrative_approach_type
CHECK (approach_type IN (
  'sales_comparison', 'cost', 'income', 'reconciliation',
  'location_t1', 'location_t2', 'location_t3'
));

-- 2. Add data_snapshot column for staleness detection
-- Stores: { market_data_latest_dates: {series_code: date}, document_count, document_latest_created_at, snapshot_timestamp }
ALTER TABLE landscape.tbl_narrative_version
ADD COLUMN IF NOT EXISTS data_snapshot JSONB;

COMMENT ON COLUMN landscape.tbl_narrative_version.data_snapshot IS
'Snapshot of underlying data state when analysis was generated. Used to detect staleness on subsequent loads.';

-- 3. Index for efficient latest-version lookups
CREATE INDEX IF NOT EXISTS idx_narrative_version_approach_latest
ON landscape.tbl_narrative_version(project_id, approach_type, version_number DESC);

-- ============================================================================
-- DOWN (Rollback)
-- ============================================================================
/*
ALTER TABLE landscape.tbl_narrative_version
DROP CONSTRAINT IF EXISTS chk_narrative_approach_type;

ALTER TABLE landscape.tbl_narrative_version
ADD CONSTRAINT chk_narrative_approach_type
CHECK (approach_type IN ('sales_comparison', 'cost', 'income', 'reconciliation'));

ALTER TABLE landscape.tbl_narrative_version
DROP COLUMN IF EXISTS data_snapshot;

DROP INDEX IF EXISTS landscape.idx_narrative_version_approach_latest;
*/
