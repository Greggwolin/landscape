-- Migration: Connect Universal Inventory to Existing Land Use Taxonomy (TC27)
-- This wires the inventory system to use proper FKs instead of JSONB codes

-- ============================================================================
-- PART 1: Add Foreign Key Columns to tbl_inventory_item
-- ============================================================================

-- Add FK columns to replace JSONB lookups
ALTER TABLE landscape.tbl_inventory_item
ADD COLUMN IF NOT EXISTS family_id BIGINT REFERENCES landscape.lu_family(family_id),
ADD COLUMN IF NOT EXISTS type_id BIGINT REFERENCES landscape.lu_type(type_id),
ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES landscape.res_lot_product(product_id),
ADD COLUMN IF NOT EXISTS density_code VARCHAR(10);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_family ON landscape.tbl_inventory_item(family_id);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON landscape.tbl_inventory_item(type_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON landscape.tbl_inventory_item(product_id);

-- Migrate existing JSONB data to FK columns (Project 7 has 48 parcels)
UPDATE landscape.tbl_inventory_item i
SET
  family_id = (
    SELECT family_id FROM landscape.lu_family
    WHERE code = i.data_values->>'family_code'
  ),
  type_id = (
    SELECT type_id FROM landscape.lu_type
    WHERE code = i.data_values->>'type_code'
  ),
  product_id = (
    SELECT product_id FROM landscape.res_lot_product
    WHERE code = i.data_values->>'product_code'
  )
WHERE property_type = 'mpc';

-- Verify migration
SELECT
  COUNT(*) as total_items,
  COUNT(family_id) as items_with_family,
  COUNT(type_id) as items_with_type,
  COUNT(product_id) as items_with_product
FROM landscape.tbl_inventory_item
WHERE project_id = 7;

COMMENT ON COLUMN landscape.tbl_inventory_item.family_id IS 'FK to lu_family - top level land use classification';
COMMENT ON COLUMN landscape.tbl_inventory_item.type_id IS 'FK to lu_type - second level classification';
COMMENT ON COLUMN landscape.tbl_inventory_item.product_id IS 'FK to res_lot_product - specific lot dimensions';
COMMENT ON COLUMN landscape.tbl_inventory_item.density_code IS 'Density classification (VLDR, LDR, MDR, HDR)';

-- ============================================================================
-- PART 2: Update Column Configuration Schema
-- ============================================================================

-- Add data source configuration to column definitions
ALTER TABLE landscape.tbl_project_inventory_columns
ADD COLUMN IF NOT EXISTS data_source_table VARCHAR(100),  -- 'lu_family', 'lu_type', 'res_lot_product'
ADD COLUMN IF NOT EXISTS data_source_value_col VARCHAR(50),  -- Column to store: 'family_id', 'type_id'
ADD COLUMN IF NOT EXISTS data_source_label_col VARCHAR(50),  -- Column to display: 'name', 'code'
ADD COLUMN IF NOT EXISTS parent_column_name VARCHAR(50),     -- For cascading: 'family_id' filters type_id
ADD COLUMN IF NOT EXISTS junction_table VARCHAR(100);        -- For many-to-many: 'type_lot_product'

-- Update existing columns to reference lu_* tables
UPDATE landscape.tbl_project_inventory_columns
SET
  column_name = 'family_id',
  data_source_table = 'lu_family',
  data_source_value_col = 'family_id',
  data_source_label_col = 'name',
  parent_column_name = NULL,
  data_type = 'enum'
WHERE column_name = 'family_code';

UPDATE landscape.tbl_project_inventory_columns
SET
  column_name = 'type_id',
  data_source_table = 'lu_type',
  data_source_value_col = 'type_id',
  data_source_label_col = 'name',
  parent_column_name = 'family_id',
  data_type = 'enum'
WHERE column_name = 'type_code';

UPDATE landscape.tbl_project_inventory_columns
SET
  column_name = 'product_id',
  data_source_table = 'res_lot_product',
  data_source_value_col = 'product_id',
  data_source_label_col = 'code',
  parent_column_name = 'type_id',
  junction_table = 'type_lot_product',
  data_type = 'enum'
WHERE column_name = 'product_code';

COMMENT ON COLUMN landscape.tbl_project_inventory_columns.data_source_table IS 'Table to query for dropdown options';
COMMENT ON COLUMN landscape.tbl_project_inventory_columns.parent_column_name IS 'Column that filters this columns options (cascading)';
COMMENT ON COLUMN landscape.tbl_project_inventory_columns.junction_table IS 'Many-to-many junction table for filtering';

-- Verification: Show updated column configuration for Project 7
SELECT
  column_name,
  column_label,
  data_type,
  data_source_table,
  data_source_value_col,
  data_source_label_col,
  parent_column_name,
  junction_table
FROM landscape.tbl_project_inventory_columns
WHERE project_id = 7
  AND column_name IN ('family_id', 'type_id', 'product_id')
ORDER BY display_order;
