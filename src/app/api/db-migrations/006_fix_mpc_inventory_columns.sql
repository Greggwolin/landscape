-- Migration: Fix MPC inventory to use proper land use fields
-- Remove sale/disposition data, add Family/Type/Product classification

-- ============================================================================
-- PART 1: Clear existing MPC inventory data (will re-migrate)
-- ============================================================================

DELETE FROM landscape.tbl_inventory_item WHERE property_type = 'mpc';
DELETE FROM landscape.tbl_project_inventory_columns
WHERE project_id IN (
  SELECT DISTINCT project_id FROM landscape.tbl_parcel
) AND column_name IN ('saleprice', 'lot_product', 'lot_width', 'lot_depth', 'lot_area');

-- ============================================================================
-- PART 2: Add proper MPC inventory columns
-- ============================================================================

-- Insert column configurations for MPC projects
INSERT INTO landscape.tbl_project_inventory_columns (
  project_id,
  column_name,
  column_label,
  column_type,
  container_level,
  data_type,
  enum_options,
  is_required,
  is_visible,
  display_order
)
-- Land Use Family (dropdown from lu_family)
SELECT DISTINCT
  p.project_id,
  'family_code' as column_name,
  'Land Use Family' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'enum' as data_type,
  (SELECT jsonb_agg(jsonb_build_object('value', code, 'label', name))
   FROM landscape.lu_family WHERE active = true) as enum_options,
  false as is_required,
  true as is_visible,
  4 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'family_code'
)
UNION ALL
-- Land Use Type (dropdown from lu_type)
SELECT DISTINCT
  p.project_id,
  'type_code' as column_name,
  'Land Use Type' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'enum' as data_type,
  (SELECT jsonb_agg(jsonb_build_object('value', code, 'label', name))
   FROM landscape.lu_type WHERE active = true) as enum_options,
  false as is_required,
  true as is_visible,
  5 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'type_code'
)
UNION ALL
-- Product Code (dropdown from res_lot_product for residential)
SELECT DISTINCT
  p.project_id,
  'product_code' as column_name,
  'Product Code' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'enum' as data_type,
  (SELECT jsonb_agg(jsonb_build_object('value', code, 'label', code || ' (' || lot_w_ft || 'x' || lot_d_ft || ')'))
   FROM landscape.res_lot_product) as enum_options,
  false as is_required,
  true as is_visible,
  6 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'product_code'
)
UNION ALL
-- Lot Width
SELECT DISTINCT
  p.project_id,
  'lot_width' as column_name,
  'Lot Width (ft)' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  NULL::jsonb as enum_options,
  false as is_required,
  true as is_visible,
  7 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'lot_width'
)
UNION ALL
-- Lot Depth
SELECT DISTINCT
  p.project_id,
  'lot_depth' as column_name,
  'Lot Depth (ft)' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  NULL::jsonb as enum_options,
  false as is_required,
  true as is_visible,
  8 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'lot_depth'
)
UNION ALL
-- Lot Area (calculated from width x depth)
SELECT DISTINCT
  p.project_id,
  'lot_area' as column_name,
  'Lot Area (SF)' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  NULL::jsonb as enum_options,
  false as is_required,
  true as is_visible,
  9 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'lot_area'
)
UNION ALL
-- Units Total
SELECT DISTINCT
  p.project_id,
  'units_total' as column_name,
  'Total Units' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  NULL::jsonb as enum_options,
  false as is_required,
  true as is_visible,
  10 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'units_total'
);

-- ============================================================================
-- PART 3: Re-migrate parcel data with proper fields
-- ============================================================================

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
  -- Use parcel_id as the item_code
  p.parcel_id::text as item_code,
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
    'family_code', COALESCE(
      (SELECT code FROM landscape.lu_family WHERE name = p.family_name),
      p.landuse_code
    ),
    'type_code', p.type_code,
    'product_code', p.product_code,
    'lot_width', p.lot_width,
    'lot_depth', p.lot_depth,
    'lot_area', p.lot_area,
    'units_total', p.units_total
  ) as data_values,
  'Available' as status,
  true as is_active
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_inventory_item
  WHERE project_id = p.project_id
    AND item_code = p.parcel_id::text
    AND property_type = 'mpc'
);

-- Verification
SELECT
  project_id,
  property_type,
  COUNT(*) as inventory_items
FROM landscape.tbl_inventory_item
WHERE property_type = 'mpc'
GROUP BY project_id, property_type;
