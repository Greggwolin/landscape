-- Migration: Add last_waterfall_result persistence to tbl_equity_structure
-- Date: 2026-03-31
-- Purpose: Store last-run waterfall calculation results for page-reload display

-- UP
ALTER TABLE landscape.tbl_equity_structure
ADD COLUMN IF NOT EXISTS last_waterfall_result JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_waterfall_run_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN landscape.tbl_equity_structure.last_waterfall_result IS 'JSON snapshot of last waterfall engine output';
COMMENT ON COLUMN landscape.tbl_equity_structure.last_waterfall_run_at IS 'Timestamp of last waterfall calculation';

-- DOWN (rollback)
-- ALTER TABLE landscape.tbl_equity_structure DROP COLUMN IF EXISTS last_waterfall_result;
-- ALTER TABLE landscape.tbl_equity_structure DROP COLUMN IF EXISTS last_waterfall_run_at;
