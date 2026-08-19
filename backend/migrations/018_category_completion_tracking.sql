-- ============================================================================
-- MIGRATION 018: Add Category Completion Tracking
-- ============================================================================
-- File: backend/migrations/018_category_completion_tracking.sql
-- Target: landscape.core_budget_category (existing table)
-- Purpose: Track incomplete categories from quick-add, provide Landscaper reminders
-- Author: Claude Code
-- Date: 2025-01-10

BEGIN;

-- ============================================================================
-- STEP 1: Add tracking columns to core_budget_category
-- ============================================================================

ALTER TABLE landscape.core_budget_category ADD COLUMN IF NOT EXISTS
  is_incomplete BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN landscape.core_budget_category.is_incomplete IS
  'TRUE if category created via quick-add and missing optional fields (description, icon, color, or parent for L2-4)';

ALTER TABLE landscape.core_budget_category ADD COLUMN IF NOT EXISTS
  created_from VARCHAR(50);

COMMENT ON COLUMN landscape.core_budget_category.created_from IS
  'Source of creation: budget_quick_add, admin_panel, ai_import, template, seed_data';

ALTER TABLE landscape.core_budget_category ADD COLUMN IF NOT EXISTS
  reminder_dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN landscape.core_budget_category.reminder_dismissed_at IS
  'When user dismissed reminder; NULL = still showing reminders. 7-day cooldown applies.';

ALTER TABLE landscape.core_budget_category ADD COLUMN IF NOT EXISTS
  last_reminded_at TIMESTAMPTZ;

COMMENT ON COLUMN landscape.core_budget_category.last_reminded_at IS
  'Last time Landscaper showed a reminder for this category (for analytics)';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_budget_category_incomplete
  ON landscape.core_budget_category(is_incomplete)
  WHERE is_incomplete = TRUE;

CREATE INDEX IF NOT EXISTS idx_budget_category_reminders
  ON landscape.core_budget_category(reminder_dismissed_at, last_reminded_at)
  WHERE is_incomplete = TRUE;

-- ============================================================================
-- STEP 2: Create completion status tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.core_category_completion_status (
  category_id BIGINT NOT NULL REFERENCES landscape.core_budget_category(category_id) ON DELETE CASCADE,
  missing_field VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id, missing_field)
);

COMMENT ON TABLE landscape.core_category_completion_status IS
  'Tracks specific fields missing for incomplete categories. Deleted when field is filled.';

COMMENT ON COLUMN landscape.core_category_completion_status.missing_field IS
  'Field name: description, icon, color, parent (valid parent_id for L2-4 categories)';

CREATE INDEX IF NOT EXISTS idx_completion_status_category
  ON landscape.core_category_completion_status(category_id);

-- ============================================================================
-- STEP 3: Function to check category completeness
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.check_category_completeness(cat_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  cat RECORD;
  is_complete BOOLEAN := TRUE;
BEGIN
  SELECT * INTO cat FROM landscape.core_budget_category WHERE category_id = cat_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check optional fields that make a category "complete"
  IF cat.description IS NULL OR TRIM(cat.description) = '' THEN
    is_complete := FALSE;
  END IF;

  IF cat.icon IS NULL OR TRIM(cat.icon) = '' THEN
    is_complete := FALSE;
  END IF;

  IF cat.color IS NULL OR TRIM(cat.color) = '' THEN
    is_complete := FALSE;
  END IF;

  -- Level 2-4 categories need a valid parent at level-1
  IF cat.level > 1 THEN
    IF cat.parent_id IS NULL THEN
      is_complete := FALSE;
    ELSE
      -- Verify parent exists and is at correct level
      IF NOT EXISTS (
        SELECT 1 FROM landscape.core_budget_category parent
        WHERE parent.category_id = cat.parent_id
          AND parent.level = cat.level - 1
          AND parent.is_active = TRUE
      ) THEN
        is_complete := FALSE;
      END IF;
    END IF;
  END IF;

  RETURN is_complete;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.check_category_completeness(BIGINT) IS
  'Returns TRUE if category has all optional fields filled (description, icon, color) and valid parent (for L2-4)';

-- ============================================================================
-- STEP 4: Function to update completion status records
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.update_category_completion_status(cat_id BIGINT)
RETURNS VOID AS $$
DECLARE
  cat RECORD;
BEGIN
  SELECT * INTO cat FROM landscape.core_budget_category WHERE category_id = cat_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Clear existing completion status records
  DELETE FROM landscape.core_category_completion_status
  WHERE category_id = cat_id;

  -- Re-add missing field records if category is incomplete
  IF cat.description IS NULL OR TRIM(cat.description) = '' THEN
    INSERT INTO landscape.core_category_completion_status (category_id, missing_field)
    VALUES (cat_id, 'description');
  END IF;

  IF cat.icon IS NULL OR TRIM(cat.icon) = '' THEN
    INSERT INTO landscape.core_category_completion_status (category_id, missing_field)
    VALUES (cat_id, 'icon');
  END IF;

  IF cat.color IS NULL OR TRIM(cat.color) = '' THEN
    INSERT INTO landscape.core_category_completion_status (category_id, missing_field)
    VALUES (cat_id, 'color');
  END IF;

  IF cat.level > 1 THEN
    IF cat.parent_id IS NULL THEN
      INSERT INTO landscape.core_category_completion_status (category_id, missing_field)
      VALUES (cat_id, 'parent');
    ELSIF NOT EXISTS (
      SELECT 1 FROM landscape.core_budget_category parent
      WHERE parent.category_id = cat.parent_id
        AND parent.level = cat.level - 1
        AND parent.is_active = TRUE
    ) THEN
      INSERT INTO landscape.core_category_completion_status (category_id, missing_field)
      VALUES (cat_id, 'parent');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.update_category_completion_status(BIGINT) IS
  'Updates completion status records based on current category field values';

-- ============================================================================
-- STEP 5: Function to mark category complete
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.mark_category_complete(cat_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE landscape.core_budget_category
  SET is_incomplete = FALSE,
      reminder_dismissed_at = NULL,
      last_reminded_at = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE category_id = cat_id;

  DELETE FROM landscape.core_category_completion_status
  WHERE category_id = cat_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.mark_category_complete(BIGINT) IS
  'Marks category as complete and removes all completion status records. Used when user manually marks complete.';

-- ============================================================================
-- STEP 6: Function to get incomplete categories for project
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.get_incomplete_categories_for_project(proj_id BIGINT)
RETURNS TABLE (
  category_id BIGINT,
  category_name VARCHAR,
  category_code VARCHAR,
  category_level INTEGER,
  parent_name VARCHAR,
  usage_count BIGINT,
  missing_fields VARCHAR[],
  created_at TIMESTAMPTZ,
  last_reminded_at TIMESTAMPTZ,
  days_since_created INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH category_usage AS (
    -- Count how many times each category is used in budget facts for this project
    SELECT
      cat_ref AS cat_id,
      COUNT(*) as use_count
    FROM (
      SELECT UNNEST(ARRAY[
        fb.category_l1_id,
        fb.category_l2_id,
        fb.category_l3_id,
        fb.category_l4_id
      ]) AS cat_ref
      FROM landscape.core_fin_fact_budget fb
      WHERE fb.project_id = proj_id
    ) category_refs
    WHERE cat_ref IS NOT NULL
    GROUP BY cat_ref
  )
  SELECT
    c.category_id,
    c.name::VARCHAR AS category_name,
    c.code::VARCHAR AS category_code,
    c.level AS category_level,
    COALESCE(parent.name, 'No Parent')::VARCHAR AS parent_name,
    COALESCE(cu.use_count, 0) AS usage_count,
    COALESCE(
      ARRAY_AGG(DISTINCT ccs.missing_field ORDER BY ccs.missing_field)
      FILTER (WHERE ccs.missing_field IS NOT NULL),
      ARRAY[]::VARCHAR[]
    ) AS missing_fields,
    c.created_at,
    c.last_reminded_at,
    EXTRACT(DAY FROM CURRENT_TIMESTAMP - c.created_at)::INTEGER AS days_since_created
  FROM landscape.core_budget_category c
  LEFT JOIN landscape.core_budget_category parent ON parent.category_id = c.parent_id
  LEFT JOIN category_usage cu ON cu.cat_id = c.category_id
  LEFT JOIN landscape.core_category_completion_status ccs ON ccs.category_id = c.category_id
  WHERE c.is_incomplete = TRUE
    AND c.is_active = TRUE
    AND (c.reminder_dismissed_at IS NULL
         OR c.reminder_dismissed_at < CURRENT_TIMESTAMP - INTERVAL '7 days')
    AND COALESCE(cu.use_count, 0) > 0  -- Only show categories actually used in budget
  GROUP BY
    c.category_id,
    c.name,
    c.code,
    c.level,
    c.created_at,
    c.last_reminded_at,
    cu.use_count,
    parent.name
  ORDER BY
    COALESCE(cu.use_count, 0) DESC,  -- Most-used first
    c.created_at DESC;                -- Then newest first
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.get_incomplete_categories_for_project(BIGINT) IS
  'Returns incomplete categories used in specified project budget, ordered by usage frequency. Respects 7-day dismissal cooldown.';

-- ============================================================================
-- STEP 7: Trigger to auto-check completeness on update
-- ============================================================================

CREATE OR REPLACE FUNCTION landscape.auto_check_category_completeness()
RETURNS TRIGGER AS $$
DECLARE
  is_now_complete BOOLEAN;
BEGIN
  -- Check if category is now complete
  is_now_complete := landscape.check_category_completeness(NEW.category_id);

  IF is_now_complete AND NEW.is_incomplete = TRUE THEN
    -- Category was incomplete but is now complete - auto-mark complete
    NEW.is_incomplete := FALSE;
    NEW.reminder_dismissed_at := NULL;
    NEW.last_reminded_at := NULL;
    NEW.updated_at := CURRENT_TIMESTAMP;

    -- Clean up completion status records (will happen in AFTER trigger)
  ELSIF NOT is_now_complete THEN
    -- Update completion status records in AFTER trigger
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION landscape.after_update_category_completeness()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_incomplete = FALSE THEN
    -- Clean up completion status records
    DELETE FROM landscape.core_category_completion_status
    WHERE category_id = NEW.category_id;
  ELSE
    -- Update completion status records
    PERFORM landscape.update_category_completion_status(NEW.category_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_check_category_completeness_before ON landscape.core_budget_category;
DROP TRIGGER IF EXISTS trg_auto_check_category_completeness_after ON landscape.core_budget_category;

CREATE TRIGGER trg_auto_check_category_completeness_before
BEFORE UPDATE ON landscape.core_budget_category
FOR EACH ROW
WHEN (OLD.description IS DISTINCT FROM NEW.description
   OR OLD.icon IS DISTINCT FROM NEW.icon
   OR OLD.color IS DISTINCT FROM NEW.color
   OR OLD.parent_id IS DISTINCT FROM NEW.parent_id)
EXECUTE FUNCTION landscape.auto_check_category_completeness();

CREATE TRIGGER trg_auto_check_category_completeness_after
AFTER UPDATE ON landscape.core_budget_category
FOR EACH ROW
WHEN (OLD.description IS DISTINCT FROM NEW.description
   OR OLD.icon IS DISTINCT FROM NEW.icon
   OR OLD.color IS DISTINCT FROM NEW.color
   OR OLD.parent_id IS DISTINCT FROM NEW.parent_id)
EXECUTE FUNCTION landscape.after_update_category_completeness();

COMMENT ON TRIGGER trg_auto_check_category_completeness_before ON landscape.core_budget_category IS
  'Automatically marks category complete when all required fields are filled';

COMMENT ON TRIGGER trg_auto_check_category_completeness_after ON landscape.core_budget_category IS
  'Updates completion status records after category fields change';

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================
-- Run these after migration to verify success

-- Verify new columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'core_budget_category'
  AND column_name IN ('is_incomplete', 'created_from', 'reminder_dismissed_at', 'last_reminded_at')
ORDER BY column_name;
-- Expected: 4 rows

-- Verify completion status table exists
SELECT COUNT(*) as record_count
FROM landscape.core_category_completion_status;
-- Expected: 0 (empty initially)

-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'landscape'
  AND tablename = 'core_budget_category'
  AND indexname LIKE '%incomplete%';
-- Expected: 2 rows

-- Test completeness function (use an existing category_id)
SELECT
  category_id,
  name,
  landscape.check_category_completeness(category_id) as is_complete
FROM landscape.core_budget_category
WHERE is_active = TRUE
LIMIT 5;
-- Expected: boolean results

-- Test incomplete categories query (should be empty initially)
SELECT * FROM landscape.get_incomplete_categories_for_project(NULL);
-- Expected: 0 rows (no incomplete categories yet)

-- Verify triggers exist
SELECT
  tgname,
  tgenabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname LIKE '%category_completeness%'
  AND tgrelid = 'landscape.core_budget_category'::regclass
ORDER BY tgname;
-- Expected: 2 rows (before and after triggers)

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- Uncomment and run if you need to undo this migration

/*
BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_auto_check_category_completeness_before ON landscape.core_budget_category;
DROP TRIGGER IF EXISTS trg_auto_check_category_completeness_after ON landscape.core_budget_category;

-- Drop functions
DROP FUNCTION IF EXISTS landscape.auto_check_category_completeness();
DROP FUNCTION IF EXISTS landscape.after_update_category_completeness();
DROP FUNCTION IF EXISTS landscape.get_incomplete_categories_for_project(BIGINT);
DROP FUNCTION IF EXISTS landscape.mark_category_complete(BIGINT);
DROP FUNCTION IF EXISTS landscape.update_category_completion_status(BIGINT);
DROP FUNCTION IF EXISTS landscape.check_category_completeness(BIGINT);

-- Drop table
DROP TABLE IF EXISTS landscape.core_category_completion_status;

-- Drop columns
ALTER TABLE landscape.core_budget_category DROP COLUMN IF EXISTS last_reminded_at;
ALTER TABLE landscape.core_budget_category DROP COLUMN IF EXISTS reminder_dismissed_at;
ALTER TABLE landscape.core_budget_category DROP COLUMN IF EXISTS created_from;
ALTER TABLE landscape.core_budget_category DROP COLUMN IF EXISTS is_incomplete;

COMMIT;
*/
