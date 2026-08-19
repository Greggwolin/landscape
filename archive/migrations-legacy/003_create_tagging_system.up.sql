BEGIN;

CREATE TABLE IF NOT EXISTS landscape.core_fin_fact_tags (
    tag_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fact_id BIGINT NOT NULL,
    fact_type VARCHAR(10) NOT NULL CHECK (fact_type IN ('budget', 'actual')),
    tag_name VARCHAR(50) NOT NULL,
    tag_color VARCHAR(7),
    tag_category VARCHAR(20),
    is_compact BOOLEAN DEFAULT FALSE,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (fact_id, fact_type, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_fact_tags_fact
  ON landscape.core_fin_fact_tags(fact_id, fact_type);

CREATE INDEX IF NOT EXISTS idx_fact_tags_name
  ON landscape.core_fin_fact_tags(tag_name);

CREATE INDEX IF NOT EXISTS idx_fact_tags_category
  ON landscape.core_fin_fact_tags(tag_category);

COMMIT;
