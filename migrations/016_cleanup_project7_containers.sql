-- Migration 016: Clean up Project 7 container names
-- Date: 2025-11-07
-- Purpose: Remove incorrectly named containers, keep only Villages 1-4 and their Phases

BEGIN;

-- Step 1: Identify correct containers to KEEP
-- Level 1 (Villages): container_ids 437, 434, 443, 454 (display_name: "1", "2", "3", "4")
-- Level 2 (Phases): Children of the above with decimal names like "1.1", "1.2", "2.1", etc.

-- Step 2: Delete incorrect Level 1 containers (this will CASCADE delete their children)
-- Planning Area 1-4, Area 1, and any others that aren't the correct numeric ones

DELETE FROM tbl_container
WHERE project_id = 7
  AND container_level = 1
  AND container_id NOT IN (437, 434, 443, 454);

-- Verify: Check remaining containers
-- Should show:
-- Level 1: 437 (1), 434 (2), 443 (4), 454 (3)
-- Level 2: Their children with decimal names

-- Step 3: Update display names to match expected format
-- Villages should be numbered 1, 2, 3, 4
UPDATE tbl_container
SET
  display_name = '1',
  container_code = 'L1-1',
  sort_order = 1
WHERE container_id = 437 AND project_id = 7;

UPDATE tbl_container
SET
  display_name = '2',
  container_code = 'L1-2',
  sort_order = 2
WHERE container_id = 434 AND project_id = 7;

UPDATE tbl_container
SET
  display_name = '3',
  container_code = 'L1-3',
  sort_order = 3
WHERE container_id = 454 AND project_id = 7;

UPDATE tbl_container
SET
  display_name = '4',
  container_code = 'L1-4',
  sort_order = 4
WHERE container_id = 443 AND project_id = 7;

-- Step 4: Update Phase sort orders to match their numeric order
-- Phase 1.1 should sort before 1.2, etc.
UPDATE tbl_container
SET sort_order = CASE
  WHEN display_name = '1.1' THEN 11
  WHEN display_name = '1.2' THEN 12
  WHEN display_name = '2.1' THEN 21
  WHEN display_name = '2.2' THEN 22
  WHEN display_name = '3.1' THEN 31
  WHEN display_name = '3.2' THEN 32
  WHEN display_name = '4.1' THEN 41
  WHEN display_name = '4.2' THEN 42
  ELSE sort_order
END
WHERE project_id = 7
  AND container_level = 2
  AND parent_container_id IN (437, 434, 443, 454);

COMMIT;

-- Verification queries:
-- SELECT container_id, container_level, display_name, sort_order, parent_container_id
-- FROM tbl_container
-- WHERE project_id = 7
-- ORDER BY container_level, sort_order;

-- Expected result:
-- Level 1: 437 (1), 434 (2), 454 (3), 443 (4)
-- Level 2: 440 (1.1), 464 (1.2), 435 (2.1), 483 (2.2), 488 (3.1), 455 (3.2), 444 (4.1), 457 (4.2)
