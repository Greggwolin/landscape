-- Migration 025: Complete Part 3 - Container terminology renames
-- Created: 2025-11-19
-- Purpose: Rename container → division, container_level → tier
--          This completes Phase 3 of the terminology standardization

-- Step 3.1: Rename Physical Hierarchy Tables
-- ============================================

-- Rename main container table to division
ALTER TABLE landscape.tbl_container RENAME TO tbl_division;

-- Rename columns in tbl_division
ALTER TABLE landscape.tbl_division RENAME COLUMN container_id TO division_id;
ALTER TABLE landscape.tbl_division RENAME COLUMN parent_container_id TO parent_division_id;
ALTER TABLE landscape.tbl_division RENAME COLUMN container_level TO tier;
ALTER TABLE landscape.tbl_division RENAME COLUMN container_code TO division_code;

-- Update project config table (tier labels)
ALTER TABLE landscape.tbl_project_config RENAME COLUMN level_0_label TO tier_0_label;
ALTER TABLE landscape.tbl_project_config RENAME COLUMN level_1_label TO tier_1_label;
ALTER TABLE landscape.tbl_project_config RENAME COLUMN level_2_label TO tier_2_label;
ALTER TABLE landscape.tbl_project_config RENAME COLUMN level_3_label TO tier_3_label;

-- Rename applicability table
ALTER TABLE landscape.core_fin_container_applicability RENAME TO core_fin_division_applicability;
ALTER TABLE landscape.core_fin_division_applicability RENAME COLUMN container_level TO tier;

-- Step 3.2: Update Foreign Keys
-- ============================================

-- Rename container_id → division_id in budget fact table
ALTER TABLE landscape.core_fin_fact_budget RENAME COLUMN container_id TO division_id;

-- Update indexes (if they exist)
DO $$
BEGIN
    -- Rename container indexes to division
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fact_budget_container' AND schemaname = 'landscape') THEN
        ALTER INDEX landscape.idx_fact_budget_container RENAME TO idx_fact_budget_division;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_container_project' AND schemaname = 'landscape') THEN
        ALTER INDEX landscape.idx_container_project RENAME TO idx_division_project;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_container_parent' AND schemaname = 'landscape') THEN
        ALTER INDEX landscape.idx_container_parent RENAME TO idx_division_parent;
    END IF;
END $$;

-- Step 3.4: Update Comments
-- ============================================

COMMENT ON TABLE landscape.tbl_division IS
'Physical divisions of the project: Project (tier 0), Area/Property (tier 1), Phase/Building (tier 2), Parcel/Unit (tier 3)';

COMMENT ON COLUMN landscape.tbl_division.tier IS
'Hierarchy depth: 0=Project, 1=Area/Property, 2=Phase/Building, 3=Parcel/Unit';

COMMENT ON COLUMN landscape.tbl_division.division_id IS
'Primary key for division (formerly container_id)';

COMMENT ON COLUMN landscape.tbl_division.parent_division_id IS
'Parent division in hierarchy (NULL for tier 0)';

COMMENT ON COLUMN landscape.tbl_project_config.tier_0_label IS
'User-configurable label for tier 0 (default: Project)';

COMMENT ON COLUMN landscape.tbl_project_config.tier_1_label IS
'User-configurable label for tier 1 (default: Area)';

COMMENT ON COLUMN landscape.tbl_project_config.tier_2_label IS
'User-configurable label for tier 2 (default: Phase)';

COMMENT ON COLUMN landscape.tbl_project_config.tier_3_label IS
'User-configurable label for tier 3 (default: Parcel)';

COMMENT ON TABLE landscape.core_fin_division_applicability IS
'Defines which budget categories apply to which division tiers';

-- Validation
-- ============================================

DO $$
DECLARE
  division_count INT;
  budget_with_division INT;
  old_table_exists BOOLEAN;
  tier_labels_count INT;
BEGIN
  -- Check division table exists and has data
  SELECT COUNT(*) INTO division_count FROM landscape.tbl_division;

  -- Check budget items reference divisions
  SELECT COUNT(*) INTO budget_with_division
  FROM landscape.core_fin_fact_budget
  WHERE division_id IS NOT NULL;

  -- Verify old table is gone
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tbl_container'
    AND table_schema = 'landscape'
  ) INTO old_table_exists;

  -- Check tier labels exist in config
  SELECT COUNT(*) INTO tier_labels_count
  FROM information_schema.columns
  WHERE table_name = 'tbl_project_config'
    AND table_schema = 'landscape'
    AND column_name LIKE 'tier_%_label';

  RAISE NOTICE '✅ Migration 025 Validation:';
  RAISE NOTICE '   Divisions in tbl_division: %', division_count;
  RAISE NOTICE '   Budget items with division_id: %', budget_with_division;
  RAISE NOTICE '   Old tbl_container exists: %', old_table_exists;
  RAISE NOTICE '   Tier label columns found: % (expected: 4)', tier_labels_count;

  IF NOT old_table_exists AND tier_labels_count = 4 THEN
    RAISE NOTICE '✅ All validation checks passed!';
  ELSE
    RAISE WARNING '⚠️  Some validation checks failed!';
  END IF;
END $$;
