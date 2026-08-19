-- Fix Orphaned Container IDs in Budget Items
-- This script identifies and helps fix budget items with container_ids
-- that don't belong to their project's container hierarchy

-- Step 1: Identify orphaned container references
-- Budget items with container_ids that don't match their project
SELECT
  fb.fact_id,
  fb.project_id,
  fb.container_id,
  fb.amount,
  fb.notes,
  c.container_id AS valid_container,
  c.project_id AS container_project_id,
  CASE
    WHEN c.container_id IS NULL THEN 'Container does not exist'
    WHEN c.project_id != fb.project_id THEN 'Container belongs to different project'
    ELSE 'Valid'
  END AS issue_type
FROM landscape.core_fin_fact_budget fb
LEFT JOIN landscape.core_container c ON fb.container_id = c.container_id
WHERE fb.container_id IS NOT NULL
  AND (c.container_id IS NULL OR c.project_id != fb.project_id)
ORDER BY fb.project_id, fb.fact_id;

-- Step 2: Count issues by project
SELECT
  fb.project_id,
  COUNT(*) as orphaned_count,
  STRING_AGG(DISTINCT fb.container_id::text, ', ') as orphaned_container_ids
FROM landscape.core_fin_fact_budget fb
LEFT JOIN landscape.core_container c ON fb.container_id = c.container_id
WHERE fb.container_id IS NOT NULL
  AND (c.container_id IS NULL OR c.project_id != fb.project_id)
GROUP BY fb.project_id
ORDER BY orphaned_count DESC;

-- Step 3: Show available containers for a specific project
-- Replace 7 with your project_id
SELECT
  container_id,
  container_level,
  display_name,
  container_code,
  parent_container_id
FROM landscape.core_container
WHERE project_id = 7
  AND is_active = true
ORDER BY container_level, sort_order, display_name;

-- Step 4: Fix orphaned references (OPTION A: Set to NULL for project-level)
-- Uncomment and run this to set all orphaned container_ids to NULL (project-level)
-- UPDATE landscape.core_fin_fact_budget fb
-- SET container_id = NULL
-- FROM landscape.core_container c
-- WHERE fb.container_id = c.container_id
--   AND c.project_id != fb.project_id;

-- Step 5: Fix orphaned references (OPTION B: Map to specific container)
-- Example: Move all items from old container 488 to new container 485 for project 7
-- UPDATE landscape.core_fin_fact_budget
-- SET container_id = 485
-- WHERE project_id = 7
--   AND container_id = 488;

-- Step 6: Verify fixes
-- Run Step 1 query again to confirm no orphaned references remain
