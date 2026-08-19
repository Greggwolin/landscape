-- =====================================================
-- Migrate Budget Facts from pe_level/pe_id to container_id
-- =====================================================
--
-- Purpose: Populate container_id in core_fin_fact_budget based on
--          existing pe_level (project/area/phase/parcel/lot) and pe_id
--
-- Strategy:
--   1. Map pe_level='project' + pe_id → NULL (project level has no container)
--   2. Map pe_level='area' + pe_id → Level 1 containers via area_id
--   3. Map pe_level='phase' + pe_id → Level 2 containers via phase_id
--   4. Map pe_level='parcel' + pe_id → Level 3 containers via parcel_id
--   5. Map pe_level='lot' + pe_id → Level 3 containers (lots stored as parcels)
--
-- Author: Claude Code Assistant
-- Date: 2025-10-15
-- =====================================================

-- =====================================================
-- STEP 1: Pre-Migration Analysis
-- =====================================================

-- Check current state
SELECT
  'Current State' as report,
  pe_level,
  COUNT(*) as total_facts,
  COUNT(container_id) as has_container_id,
  COUNT(*) FILTER (WHERE container_id IS NULL) as null_container_id,
  ARRAY_AGG(DISTINCT pe_id ORDER BY pe_id) as pe_ids
FROM landscape.core_fin_fact_budget
GROUP BY pe_level
ORDER BY pe_level;

-- =====================================================
-- STEP 2: Validate Container Mapping
-- =====================================================

-- Test mapping logic for each pe_level
WITH mapping_test AS (
  -- PROJECT level: pe_id is project_id (no container at project level)
  SELECT
    'project' as pe_level,
    pe_id,
    NULL::bigint as expected_container_id,
    'Project level has no container' as note
  FROM landscape.core_fin_fact_budget
  WHERE pe_level = 'project'

  UNION ALL

  -- AREA level: Map via area_id in container attributes
  SELECT
    'area' as pe_level,
    b.pe_id,
    c.container_id as expected_container_id,
    'Mapped via area_id=' || (c.attributes->>'area_id') as note
  FROM landscape.core_fin_fact_budget b
  LEFT JOIN landscape.tbl_container c
    ON c.container_level = 1
    AND c.attributes->>'area_id' = b.pe_id
  WHERE b.pe_level = 'area'

  UNION ALL

  -- PHASE level: Map via phase_id in container attributes
  SELECT
    'phase' as pe_level,
    b.pe_id,
    c.container_id as expected_container_id,
    'Mapped via phase_id=' || (c.attributes->>'phase_id') as note
  FROM landscape.core_fin_fact_budget b
  LEFT JOIN landscape.tbl_container c
    ON c.container_level = 2
    AND c.attributes->>'phase_id' = b.pe_id
  WHERE b.pe_level = 'phase'

  UNION ALL

  -- PARCEL level: Map via parcel_id in container attributes
  SELECT
    'parcel' as pe_level,
    b.pe_id,
    c.container_id as expected_container_id,
    'Mapped via parcel_id=' || (c.attributes->>'parcel_id') as note
  FROM landscape.core_fin_fact_budget b
  LEFT JOIN landscape.tbl_container c
    ON c.container_level = 3
    AND c.attributes->>'parcel_id' = b.pe_id
  WHERE b.pe_level = 'parcel'

  UNION ALL

  -- LOT level: Lots are stored as Level 3 containers (same as parcels)
  SELECT
    'lot' as pe_level,
    b.pe_id,
    c.container_id as expected_container_id,
    'Mapped via lot_id (stored as parcel)' as note
  FROM landscape.core_fin_fact_budget b
  LEFT JOIN landscape.tbl_container c
    ON c.container_level = 3
    AND c.attributes->>'parcel_id' = b.pe_id  -- Lots stored in same structure
  WHERE b.pe_level = 'lot'
)
SELECT
  pe_level,
  COUNT(*) as total_items,
  COUNT(expected_container_id) as will_map,
  COUNT(*) FILTER (WHERE expected_container_id IS NULL) as will_be_null,
  STRING_AGG(DISTINCT note, ', ') as mapping_notes
FROM mapping_test
GROUP BY pe_level
ORDER BY pe_level;

-- =====================================================
-- STEP 3: Perform Migration (Dry Run)
-- =====================================================

BEGIN;

-- Create temporary table to hold migration results
CREATE TEMP TABLE migration_preview AS
SELECT
  b.fact_id,
  b.pe_level,
  b.pe_id,
  b.container_id as old_container_id,
  CASE
    -- PROJECT: No container at project level
    WHEN b.pe_level = 'project' THEN NULL

    -- AREA: Map to Level 1 container
    WHEN b.pe_level = 'area' THEN (
      SELECT c.container_id
      FROM landscape.tbl_container c
      WHERE c.container_level = 1
        AND c.attributes->>'area_id' = b.pe_id
      LIMIT 1
    )

    -- PHASE: Map to Level 2 container
    WHEN b.pe_level = 'phase' THEN (
      SELECT c.container_id
      FROM landscape.tbl_container c
      WHERE c.container_level = 2
        AND c.attributes->>'phase_id' = b.pe_id
      LIMIT 1
    )

    -- PARCEL: Map to Level 3 container
    WHEN b.pe_level = 'parcel' THEN (
      SELECT c.container_id
      FROM landscape.tbl_container c
      WHERE c.container_level = 3
        AND c.attributes->>'parcel_id' = b.pe_id
      LIMIT 1
    )

    -- LOT: Map to Level 3 container (same as parcel)
    WHEN b.pe_level = 'lot' THEN (
      SELECT c.container_id
      FROM landscape.tbl_container c
      WHERE c.container_level = 3
        AND c.attributes->>'parcel_id' = b.pe_id
      LIMIT 1
    )

    ELSE NULL
  END as new_container_id
FROM landscape.core_fin_fact_budget b;

-- Show migration preview
SELECT
  'Migration Preview' as report,
  pe_level,
  COUNT(*) as total_facts,
  COUNT(old_container_id) as had_container_id,
  COUNT(new_container_id) as will_have_container_id,
  COUNT(*) FILTER (WHERE old_container_id IS DISTINCT FROM new_container_id) as will_change
FROM migration_preview
GROUP BY pe_level
ORDER BY pe_level;

-- Show detailed changes
SELECT
  fact_id,
  pe_level,
  pe_id,
  old_container_id,
  new_container_id,
  CASE
    WHEN old_container_id IS NULL AND new_container_id IS NOT NULL THEN 'WILL POPULATE'
    WHEN old_container_id IS NOT NULL AND new_container_id IS NULL THEN 'WILL CLEAR'
    WHEN old_container_id IS DISTINCT FROM new_container_id THEN 'WILL UPDATE'
    ELSE 'NO CHANGE'
  END as change_type
FROM migration_preview
WHERE old_container_id IS DISTINCT FROM new_container_id
ORDER BY pe_level, pe_id::int
LIMIT 20;

-- Rollback the dry run
ROLLBACK;

-- =====================================================
-- STEP 4: Execute Migration (UNCOMMENT TO RUN)
-- =====================================================

-- BEGIN;

-- -- Update PROJECT level (pe_level='project')
-- -- These remain NULL as there's no container at project level
-- UPDATE landscape.core_fin_fact_budget
-- SET container_id = NULL
-- WHERE pe_level = 'project';

-- -- Update AREA level (pe_level='area')
-- UPDATE landscape.core_fin_fact_budget b
-- SET container_id = c.container_id
-- FROM landscape.tbl_container c
-- WHERE b.pe_level = 'area'
--   AND c.container_level = 1
--   AND c.attributes->>'area_id' = b.pe_id;

-- -- Update PHASE level (pe_level='phase')
-- UPDATE landscape.core_fin_fact_budget b
-- SET container_id = c.container_id
-- FROM landscape.tbl_container c
-- WHERE b.pe_level = 'phase'
--   AND c.container_level = 2
--   AND c.attributes->>'phase_id' = b.pe_id;

-- -- Update PARCEL level (pe_level='parcel')
-- UPDATE landscape.core_fin_fact_budget b
-- SET container_id = c.container_id
-- FROM landscape.tbl_container c
-- WHERE b.pe_level = 'parcel'
--   AND c.container_level = 3
--   AND c.attributes->>'parcel_id' = b.pe_id;

-- -- Update LOT level (pe_level='lot')
-- UPDATE landscape.core_fin_fact_budget b
-- SET container_id = c.container_id
-- FROM landscape.tbl_container c
-- WHERE b.pe_level = 'lot'
--   AND c.container_level = 3
--   AND c.attributes->>'parcel_id' = b.pe_id;

-- COMMIT;

-- =====================================================
-- STEP 5: Post-Migration Validation
-- =====================================================

-- Check results
SELECT
  'Post-Migration State' as report,
  pe_level,
  COUNT(*) as total_facts,
  COUNT(container_id) as has_container_id,
  COUNT(*) FILTER (WHERE container_id IS NULL) as null_container_id,
  ROUND(100.0 * COUNT(container_id) / COUNT(*), 2) as pct_populated
FROM landscape.core_fin_fact_budget
GROUP BY pe_level
ORDER BY pe_level;

-- Validate all mappings are correct
SELECT
  'Validation Check' as report,
  b.fact_id,
  b.pe_level,
  b.pe_id,
  b.container_id,
  c.container_level,
  c.container_code,
  c.display_name,
  c.attributes->>'area_id' as area_id,
  c.attributes->>'phase_id' as phase_id,
  c.attributes->>'parcel_id' as parcel_id
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
WHERE b.pe_level != 'project'  -- Project level should have NULL container
ORDER BY b.pe_level, b.pe_id::int
LIMIT 20;

-- Check for orphaned facts (pe_level != 'project' but no container found)
SELECT
  'Orphaned Facts (ERRORS)' as report,
  pe_level,
  pe_id,
  COUNT(*) as orphaned_count
FROM landscape.core_fin_fact_budget
WHERE pe_level != 'project'
  AND container_id IS NULL
GROUP BY pe_level, pe_id;

-- =====================================================
-- STEP 6: Create Helper Views
-- =====================================================

-- View to show budget facts with container hierarchy
CREATE OR REPLACE VIEW landscape.v_budget_facts_with_containers AS
SELECT
  b.fact_id,
  b.budget_id,
  b.pe_level,
  b.pe_id,
  b.container_id,
  c.container_level,
  c.container_code,
  c.display_name as container_name,
  c.project_id,
  b.category_id,
  b.amount,
  b.confidence_level,
  b.is_committed,
  -- Legacy IDs from container attributes
  (c.attributes->>'area_id')::int as legacy_area_id,
  (c.attributes->>'phase_id')::int as legacy_phase_id,
  (c.attributes->>'parcel_id')::int as legacy_parcel_id
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id;

COMMENT ON VIEW landscape.v_budget_facts_with_containers IS
'Budget facts with container hierarchy and legacy ID mapping for backward compatibility';
