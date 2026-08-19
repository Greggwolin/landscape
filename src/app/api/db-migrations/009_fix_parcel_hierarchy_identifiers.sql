-- Migration: Fix parcel hierarchy identifiers to proper format
-- Area should be integer: "1", "2", "3"
-- Phase should be single decimal: "1.1", "2.1", "3.2"
-- Parcel should be two decimals: "1.1.01", "1.1.02", "2.1.15"

-- Update inventory items to use proper hierarchical identifiers
UPDATE landscape.tbl_inventory_item i
SET hierarchy_values = jsonb_build_object(
  'area',
    -- Extract area number from "Planning Area X" or use area_id
    CASE
      WHEN EXISTS (
        SELECT 1 FROM landscape.tbl_parcel p
        WHERE p.parcel_id = SUBSTRING(i.item_code FROM 'PARCEL-(\d+)')::integer
      ) THEN (
        SELECT
          CASE
            WHEN a.area_alias LIKE 'Planning Area %' THEN SUBSTRING(a.area_alias FROM 'Planning Area (\d+)')
            WHEN a.area_alias ~ '^\d+$' THEN a.area_alias
            ELSE a.area_id::text
          END
        FROM landscape.tbl_parcel p
        JOIN landscape.tbl_area a ON p.area_id = a.area_id
        WHERE p.parcel_id = SUBSTRING(i.item_code FROM 'PARCEL-(\d+)')::integer
      )
      ELSE i.hierarchy_values->>'area'
    END,
  'phase',
    -- Phase should already be in correct format (1.1, 2.1, etc.)
    CASE
      WHEN EXISTS (
        SELECT 1 FROM landscape.tbl_parcel p
        WHERE p.parcel_id = SUBSTRING(i.item_code FROM 'PARCEL-(\d+)')::integer
      ) THEN (
        SELECT ph.phase_name
        FROM landscape.tbl_parcel p
        JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
        WHERE p.parcel_id = SUBSTRING(i.item_code FROM 'PARCEL-(\d+)')::integer
      )
      ELSE i.hierarchy_values->>'phase'
    END,
  'parcel',
    -- Parcel should be phase + 2-digit parcel number within phase (1.1.01, 1.1.02, etc.)
    CASE
      WHEN EXISTS (
        SELECT 1 FROM landscape.tbl_parcel p
        WHERE p.parcel_id = SUBSTRING(i.item_code FROM 'PARCEL-(\d+)')::integer
      ) THEN (
        SELECT
          ph.phase_name || '.' ||
          LPAD(
            ROW_NUMBER() OVER (
              PARTITION BY p.phase_id
              ORDER BY p.parcel_id
            )::text,
            2,
            '0'
          )
        FROM landscape.tbl_parcel p
        JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
        WHERE p.parcel_id = SUBSTRING(i.item_code FROM 'PARCEL-(\d+)')::integer
      )
      ELSE
        -- For parcels not in tbl_parcel, keep existing value
        i.hierarchy_values->>'parcel'
    END
)
WHERE
  property_type = 'mpc'
  AND item_code LIKE 'PARCEL-%';

-- Verification query
SELECT
  item_id,
  item_code,
  hierarchy_values->>'area' as area,
  hierarchy_values->>'phase' as phase,
  hierarchy_values->>'parcel' as parcel
FROM landscape.tbl_inventory_item
WHERE project_id = 7 AND property_type = 'mpc'
ORDER BY item_id
LIMIT 20;
