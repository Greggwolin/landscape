-- =====================================================
-- PHASE 1: Parallel Population
-- pe_level Deprecation Migration
-- =====================================================
--
-- Purpose: Enable dual-column population for pe_level/pe_id AND container_id
--          This allows both legacy (pe_level) and new (container_id) approaches
--          to coexist during the transition period.
--
-- Safety: This migration is ADDITIVE ONLY - no breaking changes
--         - Creates triggers for automatic sync
--         - Backfills any missing data
--         - Both columns remain populated for backward compatibility
--
-- Timeline: Deploy immediately, monitor for 2-3 weeks
-- Risk Level: LOW - Additive only, easy rollback
--
-- Author: Claude Code Assistant
-- Date: 2025-10-15
-- Approved By: User
-- Status: READY FOR DEPLOYMENT
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create Bidirectional Sync Function
-- =====================================================

CREATE OR REPLACE FUNCTION landscape.sync_pe_level_and_container()
RETURNS TRIGGER AS $$
DECLARE
  v_container_level INT;
  v_area_id TEXT;
  v_phase_id TEXT;
  v_parcel_id TEXT;
  v_project_id INT;
BEGIN
  -- ============================================
  -- Direction 1: container_id → pe_level/pe_id
  -- ============================================
  -- If container_id is provided but pe_level/pe_id are missing, derive them
  IF NEW.container_id IS NOT NULL AND (NEW.pe_level IS NULL OR NEW.pe_id IS NULL) THEN

    -- Get container details
    SELECT
      container_level,
      attributes->>'area_id',
      attributes->>'phase_id',
      attributes->>'parcel_id',
      project_id
    INTO
      v_container_level,
      v_area_id,
      v_phase_id,
      v_parcel_id,
      v_project_id
    FROM landscape.tbl_container
    WHERE container_id = NEW.container_id;

    -- Validate container was found
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Container ID % does not exist', NEW.container_id;
    END IF;

    -- Map container_level to pe_level and extract appropriate ID
    CASE v_container_level
      WHEN 1 THEN
        NEW.pe_level := 'area'::landscape.pe_level;
        NEW.pe_id := v_area_id;
      WHEN 2 THEN
        NEW.pe_level := 'phase'::landscape.pe_level;
        NEW.pe_id := v_phase_id;
      WHEN 3 THEN
        -- Level 3 can be either 'parcel' or 'lot' - default to 'parcel'
        NEW.pe_level := 'parcel'::landscape.pe_level;
        NEW.pe_id := v_parcel_id;
      ELSE
        RAISE EXCEPTION 'Invalid container_level: %. Must be 1, 2, or 3.', v_container_level;
    END CASE;

    -- Validate we got a pe_id
    IF NEW.pe_id IS NULL THEN
      RAISE EXCEPTION 'Container % is missing legacy ID in attributes (level %)', NEW.container_id, v_container_level;
    END IF;

  END IF;

  -- ============================================
  -- Direction 2: pe_level/pe_id → container_id
  -- ============================================
  -- If pe_level/pe_id are provided but container_id is missing, derive it
  IF NEW.pe_level IS NOT NULL AND NEW.pe_id IS NOT NULL AND NEW.container_id IS NULL THEN

    -- Skip project level - it has no container
    IF NEW.pe_level = 'project' THEN
      NEW.container_id := NULL;
    ELSE
      -- Find matching container based on pe_level and pe_id
      CASE NEW.pe_level
        WHEN 'area' THEN
          SELECT container_id INTO NEW.container_id
          FROM landscape.tbl_container
          WHERE container_level = 1
            AND attributes->>'area_id' = NEW.pe_id
          LIMIT 1;

        WHEN 'phase' THEN
          SELECT container_id INTO NEW.container_id
          FROM landscape.tbl_container
          WHERE container_level = 2
            AND attributes->>'phase_id' = NEW.pe_id
          LIMIT 1;

        WHEN 'parcel', 'lot' THEN
          SELECT container_id INTO NEW.container_id
          FROM landscape.tbl_container
          WHERE container_level = 3
            AND attributes->>'parcel_id' = NEW.pe_id
          LIMIT 1;

        ELSE
          RAISE EXCEPTION 'Unsupported pe_level: %. Must be project, area, phase, parcel, or lot.', NEW.pe_level;
      END CASE;

      -- Warn if no container found (but don't fail - allows legacy data)
      IF NEW.container_id IS NULL THEN
        RAISE WARNING 'No container found for pe_level=% pe_id=%. This is expected for legacy projects not yet migrated to containers.', NEW.pe_level, NEW.pe_id;
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.sync_pe_level_and_container() IS
'Bidirectional sync between pe_level/pe_id (legacy) and container_id (new).
Automatically populates missing columns based on provided values.
Allows APIs to use either approach during migration period.';

-- =====================================================
-- STEP 2: Create Triggers for core_fin_fact_budget
-- =====================================================

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS trigger_sync_pe_level_budget ON landscape.core_fin_fact_budget;

CREATE TRIGGER trigger_sync_pe_level_budget
  BEFORE INSERT OR UPDATE ON landscape.core_fin_fact_budget
  FOR EACH ROW
  EXECUTE FUNCTION landscape.sync_pe_level_and_container();

COMMENT ON TRIGGER trigger_sync_pe_level_budget ON landscape.core_fin_fact_budget IS
'Auto-syncs pe_level/pe_id ↔ container_id on budget items.
Ensures both columns always populated during Phase 1 migration.';

-- =====================================================
-- STEP 3: Create Triggers for core_fin_fact_actual
-- =====================================================

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS trigger_sync_pe_level_actual ON landscape.core_fin_fact_actual;

CREATE TRIGGER trigger_sync_pe_level_actual
  BEFORE INSERT OR UPDATE ON landscape.core_fin_fact_actual
  FOR EACH ROW
  EXECUTE FUNCTION landscape.sync_pe_level_and_container();

COMMENT ON TRIGGER trigger_sync_pe_level_actual ON landscape.core_fin_fact_actual IS
'Auto-syncs pe_level/pe_id ↔ container_id on actual transactions.
Ensures both columns always populated during Phase 1 migration.';

-- =====================================================
-- STEP 4: Backfill Existing Data
-- =====================================================

-- Backfill container_id for existing items that have pe_level but no container_id
-- (This handles legacy data created before container system)

DO $$
DECLARE
  v_updated_count INT;
BEGIN
  -- Update budget facts
  WITH updates AS (
    UPDATE landscape.core_fin_fact_budget b
    SET container_id = c.container_id
    FROM landscape.tbl_container c
    WHERE b.pe_level IS NOT NULL
      AND b.pe_id IS NOT NULL
      AND b.container_id IS NULL
      AND b.pe_level != 'project'  -- Project level has no container
      AND (
        (b.pe_level = 'area' AND c.container_level = 1 AND c.attributes->>'area_id' = b.pe_id) OR
        (b.pe_level = 'phase' AND c.container_level = 2 AND c.attributes->>'phase_id' = b.pe_id) OR
        (b.pe_level IN ('parcel', 'lot') AND c.container_level = 3 AND c.attributes->>'parcel_id' = b.pe_id)
      )
    RETURNING b.fact_id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updates;

  RAISE NOTICE 'Backfilled container_id for % budget fact rows', v_updated_count;

  -- Update actual facts (if any exist)
  WITH updates AS (
    UPDATE landscape.core_fin_fact_actual b
    SET container_id = c.container_id
    FROM landscape.tbl_container c
    WHERE b.pe_level IS NOT NULL
      AND b.pe_id IS NOT NULL
      AND b.container_id IS NULL
      AND b.pe_level != 'project'
      AND (
        (b.pe_level = 'area' AND c.container_level = 1 AND c.attributes->>'area_id' = b.pe_id) OR
        (b.pe_level = 'phase' AND c.container_level = 2 AND c.attributes->>'phase_id' = b.pe_id) OR
        (b.pe_level IN ('parcel', 'lot') AND c.container_level = 3 AND c.attributes->>'parcel_id' = b.pe_id)
      )
    RETURNING b.fact_id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updates;

  RAISE NOTICE 'Backfilled container_id for % actual fact rows', v_updated_count;
END $$;

COMMIT;

-- =====================================================
-- STEP 5: Validation Queries
-- =====================================================

-- Show trigger status
SELECT
  'Phase 1 Deployment Status' as report,
  'Trigger Created' as status;

SELECT
  trigger_name,
  event_manipulation as event,
  event_object_table as table_name,
  action_statement as function
FROM information_schema.triggers
WHERE trigger_schema = 'landscape'
  AND trigger_name IN ('trigger_sync_pe_level_budget', 'trigger_sync_pe_level_actual')
ORDER BY event_object_table;

-- Show data integrity status
SELECT
  'Data Integrity Check' as report,
  pe_level,
  COUNT(*) as total_items,
  COUNT(container_id) as has_container_id,
  COUNT(*) - COUNT(container_id) as null_container_id,
  ROUND(100.0 * COUNT(container_id) / COUNT(*), 2) as pct_populated
FROM landscape.core_fin_fact_budget
GROUP BY pe_level
ORDER BY pe_level;

-- Check for orphaned items (non-project items without container_id)
SELECT
  'Orphaned Items Check' as report,
  pe_level,
  COUNT(*) as orphaned_count
FROM landscape.core_fin_fact_budget
WHERE pe_level != 'project'
  AND container_id IS NULL
GROUP BY pe_level;
-- Expected: 0 rows for projects with containers, may have rows for legacy projects

-- Summary
SELECT
  'Phase 1 Summary' as report,
  COUNT(*) as total_budget_items,
  COUNT(CASE WHEN pe_level = 'project' THEN 1 END) as project_level_items,
  COUNT(CASE WHEN pe_level != 'project' AND container_id IS NOT NULL THEN 1 END) as container_level_items,
  COUNT(CASE WHEN pe_level != 'project' AND container_id IS NULL THEN 1 END) as legacy_items_without_container
FROM landscape.core_fin_fact_budget;

-- =====================================================
-- DEPLOYMENT NOTES
-- =====================================================
--
-- ✅ SAFE TO DEPLOY - This migration is additive only
--
-- What this does:
-- 1. Creates bidirectional sync function
-- 2. Adds triggers to core_fin_fact_budget and core_fin_fact_actual
-- 3. Backfills container_id for existing items
-- 4. Validates data integrity
--
-- What this does NOT do:
-- ❌ Does not drop any columns
-- ❌ Does not remove any constraints
-- ❌ Does not break any existing queries
-- ❌ Does not require API changes (but enables them)
--
-- Rollback plan:
-- If issues occur, simply drop the triggers:
--   DROP TRIGGER IF EXISTS trigger_sync_pe_level_budget ON landscape.core_fin_fact_budget;
--   DROP TRIGGER IF EXISTS trigger_sync_pe_level_actual ON landscape.core_fin_fact_actual;
--
-- Monitoring:
-- - Watch for WARNING messages about containers not found (expected for legacy projects)
-- - Monitor trigger execution time (should be < 1ms)
-- - Check validation queries daily for 2-3 weeks
--
-- Next phase:
-- Phase 2 will update APIs to use container_id - do NOT proceed until:
-- - All new items have both columns populated
-- - Validation queries show healthy state
-- - At least 2-3 weeks of stable operation
--
-- =====================================================
