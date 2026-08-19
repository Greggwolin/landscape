-- Migration: Extend container table to support levels 4 and 5
-- This is needed for multifamily and other property types that have deeper hierarchies
-- Example: Property → Building → Floor → Unit Type → Unit (5 levels)

-- Step 1: Drop the existing check constraint that limits to levels 1-3
ALTER TABLE landscape.tbl_container
DROP CONSTRAINT IF EXISTS tbl_container_container_level_check;

-- Step 2: Add new check constraint that allows levels 1-5
ALTER TABLE landscape.tbl_container
ADD CONSTRAINT tbl_container_container_level_check
CHECK (container_level >= 1 AND container_level <= 5);

-- Step 3: Update the parent-level check constraint to handle all levels
ALTER TABLE landscape.tbl_container
DROP CONSTRAINT IF EXISTS ck_container_parent_level;

ALTER TABLE landscape.tbl_container
ADD CONSTRAINT ck_container_parent_level
CHECK (
  (container_level = 1 AND parent_container_id IS NULL) OR
  (container_level IN (2, 3, 4, 5) AND parent_container_id IS NOT NULL)
);

-- Verification query
-- SELECT container_level, COUNT(*)
-- FROM landscape.tbl_container
-- GROUP BY container_level
-- ORDER BY container_level;
