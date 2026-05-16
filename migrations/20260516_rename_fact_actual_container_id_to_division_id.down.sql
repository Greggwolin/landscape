-- Rollback for 20260516_rename_fact_actual_container_id_to_division_id.up.sql

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE indexname = 'idx_fact_actual_division'
                 AND schemaname = 'landscape') THEN
        ALTER INDEX landscape.idx_fact_actual_division RENAME TO idx_fact_actual_container;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE indexname = 'idx_core_fin_fact_actual_division'
                 AND schemaname = 'landscape') THEN
        ALTER INDEX landscape.idx_core_fin_fact_actual_division RENAME TO idx_core_fin_fact_actual_container;
    END IF;
END $$;

ALTER TABLE landscape.core_fin_fact_actual RENAME COLUMN division_id TO container_id;
