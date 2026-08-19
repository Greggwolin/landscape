-- Migration: 072_add_opex_source_column.sql
-- Purpose: Add source column to tbl_operating_expenses for tracking user vs ingested data
-- This enables Landscaper to distinguish between user-created and extracted values

-- UP
ALTER TABLE landscape.tbl_operating_expenses
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'user';

-- Set existing rows to 'ingestion' (they came from Landscaper document extraction)
UPDATE landscape.tbl_operating_expenses
SET source = 'ingestion'
WHERE source IS NULL OR source = 'user';

-- Add comment for documentation
COMMENT ON COLUMN landscape.tbl_operating_expenses.source IS
'Tracks data origin: user = user-created, ingestion = Landscaper extracted, user_modified = user edited ingested value';

-- Create index for efficient filtering by source
CREATE INDEX IF NOT EXISTS idx_opex_source
ON landscape.tbl_operating_expenses(source);

-- DOWN (rollback)
-- DROP INDEX IF EXISTS landscape.idx_opex_source;
-- ALTER TABLE landscape.tbl_operating_expenses DROP COLUMN IF EXISTS source;
