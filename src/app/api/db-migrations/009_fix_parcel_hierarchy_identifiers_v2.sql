-- Migration: Fix parcel hierarchy identifiers to proper format
-- Area should be integer: "1", "2", "3"
-- Phase should be single decimal: "1.1", "2.1", "3.2"
-- Parcel should be two decimals: "1.1.01", "1.1.02", "2.1.15"

-- Use CTE to calculate proper parcel numbers within each phase
WITH parcel_numbering AS (
  SELECT
    item_id,
    hierarchy_values->>'area' as current_area,
    hierarchy_values->>'phase' as current_phase,
    hierarchy_values->>'parcel' as current_parcel,
    -- Extract area number
    CASE
      WHEN hierarchy_values->>'area' LIKE 'Planning Area %'
        THEN SUBSTRING(hierarchy_values->>'area' FROM 'Planning Area (\d+)')
      WHEN hierarchy_values->>'area' ~ '^\d+$'
        THEN hierarchy_values->>'area'
      ELSE hierarchy_values->>'area'
    END as area_number,
    -- Phase is already correct format or needs fixing
    CASE
      WHEN hierarchy_values->>'phase' ~ '^\d+\.\d+$'
        THEN hierarchy_values->>'phase'
      WHEN hierarchy_values->>'phase' LIKE 'Phase %'
        THEN NULL  -- Will need manual mapping
      ELSE hierarchy_values->>'phase'
    END as phase_number,
    -- Generate sequential parcel number within phase
    ROW_NUMBER() OVER (
      PARTITION BY hierarchy_values->>'phase'
      ORDER BY item_id
    ) as parcel_seq
  FROM landscape.tbl_inventory_item
  WHERE project_id = 7 AND property_type = 'mpc'
)
UPDATE landscape.tbl_inventory_item i
SET hierarchy_values = jsonb_build_object(
  'area', pn.area_number,
  'phase', pn.phase_number,
  'parcel', pn.phase_number || '.' || LPAD(pn.parcel_seq::text, 2, '0')
)
FROM parcel_numbering pn
WHERE i.item_id = pn.item_id
  AND pn.phase_number IS NOT NULL;  -- Only update items with valid phase numbers

-- Verification query
SELECT
  item_id,
  item_code,
  hierarchy_values->>'area' as area,
  hierarchy_values->>'phase' as phase,
  hierarchy_values->>'parcel' as parcel
FROM landscape.tbl_inventory_item
WHERE project_id = 7 AND property_type = 'mpc'
ORDER BY
  NULLIF(REGEXP_REPLACE(hierarchy_values->>'area', '[^0-9]', '', 'g'), '')::integer NULLS LAST,
  hierarchy_values->>'phase',
  hierarchy_values->>'parcel'
LIMIT 25;
