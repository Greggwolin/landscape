-- Migration 016: Clean up Project 7 container names (V2 - Safe approach)
-- Date: 2025-11-07
-- Purpose: Mark incorrectly named containers as inactive, fix correct ones

BEGIN;

-- Step 1: Mark incorrect Level 1 containers as INACTIVE
-- (Cannot delete due to FK constraints from tbl_sale_settlement and others)
-- Planning Area 1-4, Area 1, and any others that aren't the correct numeric ones

UPDATE tbl_container
SET is_active = false
WHERE project_id = 7
  AND container_level = 1
  AND container_id NOT IN (437, 434, 443, 454);

-- Step 2: Mark their children (Level 2 and 3) as INACTIVE as well
UPDATE tbl_container
SET is_active = false
WHERE project_id = 7
  AND parent_container_id IN (
    SELECT container_id
    FROM tbl_container
    WHERE project_id = 7
      AND container_level = 1
      AND is_active = false
  );

-- Also mark Level 3 children of inactive Level 2
UPDATE tbl_container c3
SET is_active = false
FROM tbl_container c2
WHERE c3.parent_container_id = c2.container_id
  AND c3.project_id = 7
  AND c2.is_active = false;

-- Step 3: Update display names to match expected format
-- Villages should be numbered 1, 2, 3, 4
UPDATE tbl_container
SET
  display_name = '1',
  container_code = 'L1-1',
  sort_order = 1,
  is_active = true
WHERE container_id = 437 AND project_id = 7;

UPDATE tbl_container
SET
  display_name = '2',
  container_code = 'L1-2',
  sort_order = 2,
  is_active = true
WHERE container_id = 434 AND project_id = 7;

UPDATE tbl_container
SET
  display_name = '3',
  container_code = 'L1-3',
  sort_order = 3,
  is_active = true
WHERE container_id = 454 AND project_id = 7;

UPDATE tbl_container
SET
  display_name = '4',
  container_code = 'L1-4',
  sort_order = 4,
  is_active = true
WHERE container_id = 443 AND project_id = 7;

-- Step 4: Ensure their Phase children are active and have proper sort order
UPDATE tbl_container
SET
  sort_order = CASE
    WHEN display_name = '1.1' THEN 11
    WHEN display_name = '1.2' THEN 12
    WHEN display_name = '2.1' THEN 21
    WHEN display_name = '2.2' THEN 22
    WHEN display_name = '3.1' THEN 31
    WHEN display_name = '3.2' THEN 32
    WHEN display_name = '4.1' THEN 41
    WHEN display_name = '4.2' THEN 42
    ELSE sort_order
  END,
  is_active = true
WHERE project_id = 7
  AND container_level = 2
  AND parent_container_id IN (437, 434, 443, 454);

-- Step 5: Ensure parcels under correct phases are active
UPDATE tbl_container
SET is_active = true
WHERE project_id = 7
  AND container_level = 3
  AND parent_container_id IN (
    SELECT container_id
    FROM tbl_container
    WHERE project_id = 7
      AND container_level = 2
      AND parent_container_id IN (437, 434, 443, 454)
      AND is_active = true
  );

COMMIT;

-- Verification query:
-- SELECT container_id, container_level, display_name, sort_order, parent_container_id, is_active
-- FROM tbl_container
-- WHERE project_id = 7 AND is_active = true
-- ORDER BY container_level, sort_order;
