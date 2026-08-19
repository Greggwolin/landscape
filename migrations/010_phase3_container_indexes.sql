-- =====================================================
-- PHASE 3: Container Indexes & Applicability Migration
-- -----------------------------------------------------
-- * Create container-centric indexes for budget/actual tables
-- * Migrate applicability table from pe_level enum to container_level
-- * Drop legacy pe_level indexes and applicability table
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Create container-focused indexes
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_fact_budget_container
  ON landscape.core_fin_fact_budget (container_id, category_id);

CREATE INDEX IF NOT EXISTS idx_fact_budget_budget_container
  ON landscape.core_fin_fact_budget (budget_id, container_id);

CREATE INDEX IF NOT EXISTS idx_fact_budget_project_level
  ON landscape.core_fin_fact_budget (project_id, category_id)
  WHERE container_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_fact_actual_container
  ON landscape.core_fin_fact_actual (container_id, txn_date);

-- -----------------------------------------------------
-- 2. Drop legacy pe_level indexes
-- -----------------------------------------------------

DROP INDEX IF EXISTS landscape.idx_fact_budget_pe;
DROP INDEX IF EXISTS landscape.idx_fact_budget_budget_pe;
DROP INDEX IF EXISTS landscape.idx_fact_actual_pe;

-- -----------------------------------------------------
-- 3. Migrate applicability table to container levels
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS landscape.core_fin_container_applicability (
  category_id BIGINT NOT NULL REFERENCES landscape.core_fin_category(category_id) ON DELETE CASCADE,
  container_level INT NOT NULL CHECK (container_level BETWEEN 0 AND 3),
  PRIMARY KEY (category_id, container_level)
);

INSERT INTO landscape.core_fin_container_applicability (category_id, container_level)
SELECT
  category_id,
  CASE pe_level
    WHEN 'project' THEN 0
    WHEN 'area' THEN 1
    WHEN 'phase' THEN 2
    WHEN 'parcel' THEN 3
    WHEN 'lot' THEN 3
    ELSE 3
  END AS container_level
FROM landscape.core_fin_pe_applicability
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS landscape.core_fin_pe_applicability;

COMMIT;

