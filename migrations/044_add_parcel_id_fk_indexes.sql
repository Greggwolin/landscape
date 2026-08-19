-- Migration: add missing parcel_id FK indexes
-- Date: 2026-01-06
-- Intent: idempotent, non-breaking index additions for parcel_id join keys
-- Notes: uses CREATE INDEX IF NOT EXISTS (no CONCURRENTLY to avoid migration framework issues)

CREATE INDEX IF NOT EXISTS idx_core_doc__parcel_id ON landscape.core_doc (parcel_id);
CREATE INDEX IF NOT EXISTS idx_gis_plan_parcel__parcel_id ON landscape.gis_plan_parcel (parcel_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__parcel_id ON landscape.tbl_acreage_allocation (parcel_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_property__parcel_id ON landscape.tbl_cre_property (parcel_id);

-- Verification queries
-- SELECT table_name, indexname FROM pg_indexes WHERE schemaname = 'landscape' AND indexname LIKE 'idx_%__parcel_id%';

-- ============================================================
-- VERIFICATION (commented out): parcel_id FK columns missing index
-- ============================================================
-- SELECT
--   src.relname AS table_name,
--   con.conname AS fk_name,
--   pg_get_constraintdef(con.oid) AS fk_definition,
--   ('idx_' || src.relname || '__parcel_id') AS suggested_index_name
-- FROM pg_constraint con
-- JOIN pg_class src ON src.oid = con.conrelid
-- JOIN pg_class ref ON ref.oid = con.confrelid
-- JOIN pg_namespace nsp ON nsp.oid = src.relnamespace
-- WHERE con.contype = 'f'
--   AND nsp.nspname = 'landscape'
--   AND ref.relname = 'tbl_parcel'
--   AND src.relkind IN ('r', 'p')
--   AND con.confkey = ARRAY[
--     (SELECT attnum FROM pg_attribute
--      WHERE attrelid = ref.oid AND attname = 'parcel_id')
--   ]
--   AND con.conkey = ARRAY[
--     (SELECT attnum FROM pg_attribute
--      WHERE attrelid = src.oid AND attname = 'parcel_id')
--   ]
--   AND NOT EXISTS (
--     SELECT 1
--     FROM pg_index idx
--     JOIN pg_class idxrel ON idxrel.oid = idx.indexrelid
--     WHERE idx.indrelid = src.oid
--       AND idx.indkey[0] = (
--         SELECT attnum FROM pg_attribute
--         WHERE attrelid = src.oid AND attname = 'parcel_id'
--       )
--   )
-- ORDER BY src.relname;
