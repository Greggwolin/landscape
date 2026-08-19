-- 030_add_uom_sort_order.sql
-- Add sort_order to landscape.tbl_measures (UOM) and backfill based on existing ordering

ALTER TABLE landscape.tbl_measures
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Backfill sort_order deterministically if null/zero
WITH ordered AS (
  SELECT measure_code,
         ROW_NUMBER() OVER (ORDER BY measure_category, measure_code) AS rn
  FROM landscape.tbl_measures
)
UPDATE landscape.tbl_measures m
SET sort_order = o.rn
FROM ordered o
WHERE m.measure_code = o.measure_code
  AND (m.sort_order IS NULL OR m.sort_order = 0);

CREATE INDEX IF NOT EXISTS idx_tbl_measures_sort_order ON landscape.tbl_measures(sort_order);
