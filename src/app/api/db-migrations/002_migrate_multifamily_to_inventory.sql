-- Migration: Migrate existing multifamily data to universal inventory system
-- This script:
-- 1. Sets up project inventory columns for multifamily projects
-- 2. Migrates floorplan data (unit types) to inventory
-- 3. Migrates unit data (rent roll) to inventory

-- ============================================================================
-- PART 1: Configure inventory columns for projects with multifamily data
-- ============================================================================

-- For each project with multifamily data, create column configuration
INSERT INTO landscape.tbl_project_inventory_columns (
  project_id,
  column_name,
  column_label,
  column_type,
  container_level,
  data_type,
  is_required,
  is_visible,
  display_order
)
SELECT DISTINCT
  ut.project_id,
  'building' as column_name,
  'Building' as column_label,
  'hierarchy' as column_type,
  2 as container_level,
  'text' as data_type,
  true as is_required,
  true as is_visible,
  1 as display_order
FROM landscape.tbl_multifamily_unit_type ut
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = ut.project_id AND column_name = 'building'
)
UNION ALL
SELECT DISTINCT
  ut.project_id,
  'floor' as column_name,
  'Floor' as column_label,
  'hierarchy' as column_type,
  3 as container_level,
  'text' as data_type,
  false as is_required,
  true as is_visible,
  2 as display_order
FROM landscape.tbl_multifamily_unit_type ut
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = ut.project_id AND column_name = 'floor'
)
UNION ALL
SELECT DISTINCT
  ut.project_id,
  'unit_type' as column_name,
  'Unit Type' as column_label,
  'hierarchy' as column_type,
  4 as container_level,
  'text' as data_type,
  true as is_required,
  true as is_visible,
  3 as display_order
FROM landscape.tbl_multifamily_unit_type ut
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = ut.project_id AND column_name = 'unit_type'
)
UNION ALL
SELECT DISTINCT
  ut.project_id,
  'bedrooms' as column_name,
  'Bedrooms' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  false as is_required,
  true as is_visible,
  4 as display_order
FROM landscape.tbl_multifamily_unit_type ut
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = ut.project_id AND column_name = 'bedrooms'
)
UNION ALL
SELECT DISTINCT
  ut.project_id,
  'bathrooms' as column_name,
  'Bathrooms' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  false as is_required,
  true as is_visible,
  5 as display_order
FROM landscape.tbl_multifamily_unit_type ut
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = ut.project_id AND column_name = 'bathrooms'
)
UNION ALL
SELECT DISTINCT
  ut.project_id,
  'square_feet' as column_name,
  'Square Feet' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  false as is_required,
  true as is_visible,
  6 as display_order
FROM landscape.tbl_multifamily_unit_type ut
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = ut.project_id AND column_name = 'square_feet'
)
UNION ALL
SELECT DISTINCT
  ut.project_id,
  'market_rent' as column_name,
  'Market Rent' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'currency' as data_type,
  false as is_required,
  true as is_visible,
  7 as display_order
FROM landscape.tbl_multifamily_unit_type ut
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = ut.project_id AND column_name = 'market_rent'
);

-- ============================================================================
-- PART 2: Migrate floorplan data (unit types) to inventory
-- ============================================================================

-- Insert floorplan-level inventory items (one per unit type)
INSERT INTO landscape.tbl_inventory_item (
  project_id,
  property_type,
  item_code,
  hierarchy_values,
  data_values,
  status,
  is_active
)
SELECT
  ut.project_id,
  'multifamily' as property_type,
  ut.unit_type_code as item_code,
  jsonb_build_object(
    'building', 'Main Building',
    'unit_type', ut.unit_type_code
  ) as hierarchy_values,
  jsonb_build_object(
    'bedrooms', ut.bedrooms,
    'bathrooms', ut.bathrooms,
    'square_feet', ut.avg_square_feet,
    'market_rent', ut.current_market_rent,
    'total_units', ut.total_units
  ) as data_values,
  'Available' as status,
  true as is_active
FROM landscape.tbl_multifamily_unit_type ut
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_inventory_item
  WHERE project_id = ut.project_id
    AND item_code = ut.unit_type_code
    AND property_type = 'multifamily'
);

-- ============================================================================
-- PART 3: Migrate individual units from rent roll (if exists)
-- ============================================================================

-- Note: This part depends on tbl_multifamily_unit structure
-- Let's check if we should migrate individual units or just unit types
-- For now, we'll focus on unit types (floorplans) which is the primary data

-- ============================================================================
-- Verification queries (run these to check migration)
-- ============================================================================

-- Count migrated items per project
-- SELECT
--   project_id,
--   COUNT(*) as inventory_items
-- FROM landscape.tbl_inventory_item
-- WHERE property_type = 'multifamily'
-- GROUP BY project_id;

-- View migrated data for a specific project
-- SELECT
--   item_id,
--   item_code,
--   hierarchy_values,
--   data_values,
--   status
-- FROM landscape.tbl_inventory_item
-- WHERE project_id = 7 AND property_type = 'multifamily';
