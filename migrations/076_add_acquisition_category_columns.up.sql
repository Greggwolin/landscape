-- Migration: 076_add_acquisition_category_columns.sql
-- Description: Add category_id and subcategory_id columns to tbl_acquisition
--              for linking acquisition events to cost categories (1xxx series)
-- Date: 2026-02-02

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Add category_id column (references parent-level categories like 1100, 1200, 1300)
ALTER TABLE landscape.tbl_acquisition
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES landscape.core_unit_cost_category(category_id);

-- Add subcategory_id column (references child-level categories like 1110, 1120, 1210)
ALTER TABLE landscape.tbl_acquisition
ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES landscape.core_unit_cost_category(category_id);

-- Add indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_tbl_acquisition_category_id
ON landscape.tbl_acquisition(category_id);

CREATE INDEX IF NOT EXISTS idx_tbl_acquisition_subcategory_id
ON landscape.tbl_acquisition(subcategory_id);

-- Add comments for documentation
COMMENT ON COLUMN landscape.tbl_acquisition.category_id IS
'FK to core_unit_cost_category - parent category (e.g., 1100 Due Diligence, 1200 Transaction Costs)';

COMMENT ON COLUMN landscape.tbl_acquisition.subcategory_id IS
'FK to core_unit_cost_category - child subcategory (e.g., 1110 Phase I Environmental)';

-- ============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================================================
-- To rollback, run:
--
-- DROP INDEX IF EXISTS landscape.idx_tbl_acquisition_subcategory_id;
-- DROP INDEX IF EXISTS landscape.idx_tbl_acquisition_category_id;
-- ALTER TABLE landscape.tbl_acquisition DROP COLUMN IF EXISTS subcategory_id;
-- ALTER TABLE landscape.tbl_acquisition DROP COLUMN IF EXISTS category_id;
-- ============================================================================
