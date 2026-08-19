-- Migration: Migrate parcel data from tbl_parcel to universal inventory system
-- This adds MPC/Land Development inventory for projects with parcels

-- ============================================================================
-- PART 1: Configure inventory columns for projects with parcel data
-- ============================================================================

-- For each project with parcel data, create MPC column configuration
-- Only for projects that exist in tbl_project
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
-- Get distinct projects that have parcels AND exist in tbl_project
SELECT DISTINCT
  p.project_id,
  'area' as column_name,
  'Area' as column_label,
  'hierarchy' as column_type,
  1 as container_level,
  'text' as data_type,
  false as is_required,
  true as is_visible,
  1 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'area' AND column_type = 'hierarchy'
)
UNION ALL
SELECT DISTINCT
  p.project_id,
  'phase' as column_name,
  'Phase' as column_label,
  'hierarchy' as column_type,
  2 as container_level,
  'text' as data_type,
  false as is_required,
  true as is_visible,
  2 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'phase' AND column_type = 'hierarchy'
)
UNION ALL
SELECT DISTINCT
  p.project_id,
  'parcel' as column_name,
  'Parcel' as column_label,
  'hierarchy' as column_type,
  3 as container_level,
  'text' as data_type,
  true as is_required,
  true as is_visible,
  3 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'parcel' AND column_type = 'hierarchy'
)
UNION ALL
SELECT DISTINCT
  p.project_id,
  'lot_product' as column_name,
  'Lot Product' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'text' as data_type,
  false as is_required,
  true as is_visible,
  4 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'lot_product'
)
UNION ALL
SELECT DISTINCT
  p.project_id,
  'lot_width' as column_name,
  'Lot Width (ft)' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  false as is_required,
  true as is_visible,
  5 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'lot_width'
)
UNION ALL
SELECT DISTINCT
  p.project_id,
  'lot_depth' as column_name,
  'Lot Depth (ft)' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  false as is_required,
  true as is_visible,
  6 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'lot_depth'
)
UNION ALL
SELECT DISTINCT
  p.project_id,
  'lot_area' as column_name,
  'Lot Area (SF)' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  false as is_required,
  true as is_visible,
  7 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'lot_area'
)
UNION ALL
SELECT DISTINCT
  p.project_id,
  'saleprice' as column_name,
  'Sale Price' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'currency' as data_type,
  false as is_required,
  true as is_visible,
  8 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'saleprice'
);

-- ============================================================================
-- PART 2: Migrate parcel data to inventory
-- ============================================================================

-- Insert parcel inventory items (one per parcel)
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
  p.project_id,
  'mpc' as property_type,
  'PARCEL-' || p.parcel_id::text as item_code,
  jsonb_build_object(
    'area', COALESCE(
      (SELECT area_alias FROM landscape.tbl_area WHERE area_id = p.area_id),
      'Area ' || COALESCE(p.area_id::text, '1')
    ),
    'phase', COALESCE(
      (SELECT phase_name FROM landscape.tbl_phase WHERE phase_id = p.phase_id),
      'Phase ' || COALESCE(p.phase_id::text, '1')
    ),
    'parcel', COALESCE(p.lot_product, 'Parcel ' || p.parcel_id::text)
  ) as hierarchy_values,
  jsonb_build_object(
    'lot_product', p.lot_product,
    'lot_width', p.lot_width,
    'lot_depth', p.lot_depth,
    'lot_area', p.lot_area,
    'saleprice', p.saleprice
  ) as data_values,
  CASE
    WHEN p.saleprice IS NOT NULL THEN 'Sold'
    ELSE 'Available'
  END as status,
  true as is_active
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_inventory_item
  WHERE project_id = p.project_id
    AND item_code = 'PARCEL-' || p.parcel_id::text
    AND property_type = 'mpc'
);

-- ============================================================================
-- Verification queries (run these to check migration)
-- ============================================================================

-- Count migrated items per project and property type
-- SELECT
--   project_id,
--   property_type,
--   COUNT(*) as inventory_items
-- FROM landscape.tbl_inventory_item
-- GROUP BY project_id, property_type
-- ORDER BY project_id, property_type;

-- View sample migrated parcel data
-- SELECT
--   item_id,
--   item_code,
--   hierarchy_values,
--   data_values,
--   status
-- FROM landscape.tbl_inventory_item
-- WHERE project_id = 7 AND property_type = 'mpc'
-- LIMIT 5;
