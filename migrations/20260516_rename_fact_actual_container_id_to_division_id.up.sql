-- Migration: Complete the container → division rename (column on core_fin_fact_actual)
-- Created: 2026-05-16
-- Session: LSCMD-CONTAINER-DRIFT-0516-Px
-- Purpose: Migration 025_rename_container_to_division renamed container_id → division_id
--          on core_fin_fact_budget but missed core_fin_fact_actual. Finish the rename for
--          schema symmetry and to unblock the asymmetric-JOIN footgun.

ALTER TABLE landscape.core_fin_fact_actual RENAME COLUMN container_id TO division_id;

-- Postgres updates index definitions to reference the new column name automatically,
-- but the index *names* still carry the old "container" term. Rename for hygiene.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE indexname = 'idx_fact_actual_container'
                 AND schemaname = 'landscape') THEN
        ALTER INDEX landscape.idx_fact_actual_container RENAME TO idx_fact_actual_division;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE indexname = 'idx_core_fin_fact_actual_container'
                 AND schemaname = 'landscape') THEN
        ALTER INDEX landscape.idx_core_fin_fact_actual_container RENAME TO idx_core_fin_fact_actual_division;
    END IF;
END $$;

-- Validation
DO $$
DECLARE
  actual_with_division INT;
BEGIN
  SELECT COUNT(*) INTO actual_with_division
  FROM landscape.core_fin_fact_actual WHERE division_id IS NOT NULL;
  RAISE NOTICE 'core_fin_fact_actual rows with non-null division_id: %', actual_with_division;
END $$;
