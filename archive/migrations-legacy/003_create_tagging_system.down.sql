BEGIN;

DROP INDEX IF EXISTS idx_fact_tags_category;
DROP INDEX IF EXISTS idx_fact_tags_name;
DROP INDEX IF EXISTS idx_fact_tags_fact;
DROP TABLE IF EXISTS landscape.core_fin_fact_tags;

COMMIT;
