-- Migration: Refine MPC inventory structure
-- 1. Use lot_product as item_code (not parcel_id)
-- 2. Remove lot_width and lot_depth columns (derived from product)
-- 3. Add acres_gross column
-- 4. Ensure lot_area is calculated from width x depth

-- ============================================================================
-- PART 1: Clear and reconfigure columns
-- ============================================================================

DELETE FROM landscape.tbl_inventory_item WHERE property_type = 'mpc';
DELETE FROM landscape.tbl_project_inventory_columns
WHERE project_id IN (SELECT DISTINCT project_id FROM landscape.tbl_parcel)
  AND column_name IN ('lot_width', 'lot_depth');

-- Add acres_gross column for all parcel projects
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
  p.project_id,
  'acres_gross' as column_name,
  'Acres (Gross)' as column_label,
  'data' as column_type,
  NULL::integer as container_level,
  'number' as data_type,
  false as is_required,
  true as is_visible,
  11 as display_order
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM landscape.tbl_project_inventory_columns
  WHERE project_id = p.project_id AND column_name = 'acres_gross'
);

-- ============================================================================
-- PART 2: Re-migrate parcels with correct item_code and fields
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
  -- Use lot_product with parcel_id suffix to ensure uniqueness
  CASE
    WHEN p.lot_product IS NOT NULL THEN p.lot_product || '-' || p.parcel_id::text
    ELSE 'Parcel-' || p.parcel_id::text
  END as item_code,
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
    -- Calculate lot_area from width x depth (even though width/depth not visible)
    'lot_area', CASE
      WHEN p.lot_width IS NOT NULL AND p.lot_depth IS NOT NULL
      THEN p.lot_width * p.lot_depth
      ELSE p.lot_area
    END,
    'units_total', p.units_total,
    'acres_gross', p.acres_gross
  ) as data_values,
  'Available' as status,
  true as is_active
FROM landscape.tbl_parcel p
INNER JOIN landscape.tbl_project proj ON p.project_id = proj.project_id;

-- ============================================================================
-- PART 3: Update display_order for remaining columns to be logical
-- ============================================================================

-- Hierarchy: Area(1), Phase(2), Parcel(3)
-- Data: Family(4), Type(5), Product(6), Area(7), Units(8), Acres(9)

UPDATE landscape.tbl_project_inventory_columns
SET display_order = 7
WHERE column_name = 'lot_area';

UPDATE landscape.tbl_project_inventory_columns
SET display_order = 8
WHERE column_name = 'units_total';

UPDATE landscape.tbl_project_inventory_columns
SET display_order = 9
WHERE column_name = 'acres_gross';

-- Verification
SELECT
  project_id,
  COUNT(*) as inventory_count
FROM landscape.tbl_inventory_item
WHERE property_type = 'mpc'
GROUP BY project_id;
