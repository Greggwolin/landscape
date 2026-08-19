-- =====================================================
-- PHASE 2: Container Query Migration
-- -----------------------------------------------------
-- * Add project_id to finance fact tables
-- * Backfill project references using container hierarchy
-- * Refresh sync trigger to maintain project_id
-- * Refresh budget grid view to prioritize container_id
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Extend finance fact tables with project references
-- -----------------------------------------------------

ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS project_id BIGINT;

ALTER TABLE landscape.core_fin_fact_actual
  ADD COLUMN IF NOT EXISTS project_id BIGINT;

ALTER TABLE landscape.core_fin_budget_version
  ADD COLUMN IF NOT EXISTS project_id BIGINT;

-- Backfill project_id for budget facts using container lookup
WITH container_projects AS (
  SELECT container_id, project_id
  FROM landscape.tbl_container
)
UPDATE landscape.core_fin_fact_budget b
SET project_id = cp.project_id
FROM container_projects cp
WHERE b.container_id = cp.container_id
  AND (b.project_id IS NULL OR b.project_id <> cp.project_id);

-- Backfill using legacy pe_level/project rows (project level has NULL container)
UPDATE landscape.core_fin_fact_budget
SET project_id = NULLIF(pe_id, '')::BIGINT
WHERE project_id IS NULL
  AND pe_level = 'project'
  AND pe_id ~ '^[0-9]+$';

-- As a safety net, attempt legacy attribute lookups when container_id is NULL
WITH resolved AS (
  SELECT
    b.fact_id,
    c.project_id
  FROM landscape.core_fin_fact_budget b
  JOIN landscape.tbl_container c
    ON (
      (b.pe_level = 'area'  AND c.container_level = 1 AND c.attributes->>'area_id'  = b.pe_id) OR
      (b.pe_level = 'phase' AND c.container_level = 2 AND c.attributes->>'phase_id' = b.pe_id) OR
      (b.pe_level IN ('parcel','lot') AND c.container_level = 3 AND c.attributes->>'parcel_id' = b.pe_id)
    )
)
UPDATE landscape.core_fin_fact_budget b
SET project_id = r.project_id
FROM resolved r
WHERE b.fact_id = r.fact_id
  AND b.project_id IS NULL;

-- Backfill core_fin_fact_actual using container and legacy data
WITH container_projects AS (
  SELECT container_id, project_id
  FROM landscape.tbl_container
)
UPDATE landscape.core_fin_fact_actual a
SET project_id = cp.project_id
FROM container_projects cp
WHERE a.container_id = cp.container_id
  AND (a.project_id IS NULL OR a.project_id <> cp.project_id);

UPDATE landscape.core_fin_fact_actual
SET project_id = NULLIF(pe_id, '')::BIGINT
WHERE project_id IS NULL
  AND pe_level = 'project'
  AND pe_id ~ '^[0-9]+$';

WITH resolved AS (
  SELECT
    a.fact_id,
    c.project_id
  FROM landscape.core_fin_fact_actual a
  JOIN landscape.tbl_container c
    ON (
      (a.pe_level = 'area'  AND c.container_level = 1 AND c.attributes->>'area_id'  = a.pe_id) OR
      (a.pe_level = 'phase' AND c.container_level = 2 AND c.attributes->>'phase_id' = a.pe_id) OR
      (a.pe_level IN ('parcel','lot') AND c.container_level = 3 AND c.attributes->>'parcel_id' = a.pe_id)
    )
)
UPDATE landscape.core_fin_fact_actual a
SET project_id = r.project_id
FROM resolved r
WHERE a.fact_id = r.fact_id
  AND a.project_id IS NULL;

-- Populate project_id on budget versions where possible
WITH version_projects AS (
  SELECT
    b.budget_id,
    MAX(f.project_id) AS project_id
  FROM landscape.core_fin_budget_version b
  JOIN landscape.core_fin_fact_budget f ON f.budget_id = b.budget_id
  WHERE f.project_id IS NOT NULL
  GROUP BY b.budget_id
)
UPDATE landscape.core_fin_budget_version v
SET project_id = vp.project_id
FROM version_projects vp
WHERE v.budget_id = vp.budget_id
  AND (v.project_id IS NULL OR v.project_id <> vp.project_id);

-- Enforce referential integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_core_fin_fact_budget_project'
      AND table_name = 'core_fin_fact_budget'
      AND table_schema = 'landscape'
  ) THEN
    ALTER TABLE landscape.core_fin_fact_budget
      ADD CONSTRAINT fk_core_fin_fact_budget_project
        FOREIGN KEY (project_id)
        REFERENCES landscape.tbl_project(project_id)
        ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_core_fin_fact_actual_project'
      AND table_name = 'core_fin_fact_actual'
      AND table_schema = 'landscape'
  ) THEN
    ALTER TABLE landscape.core_fin_fact_actual
      ADD CONSTRAINT fk_core_fin_fact_actual_project
        FOREIGN KEY (project_id)
        REFERENCES landscape.tbl_project(project_id)
        ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_core_fin_budget_version_project'
      AND table_name = 'core_fin_budget_version'
      AND table_schema = 'landscape'
  ) THEN
    ALTER TABLE landscape.core_fin_budget_version
      ADD CONSTRAINT fk_core_fin_budget_version_project
        FOREIGN KEY (project_id)
        REFERENCES landscape.tbl_project(project_id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2. Refresh sync trigger to manage project references
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION landscape.sync_pe_level_and_container()
RETURNS TRIGGER AS $$
DECLARE
  v_container_level INT;
  v_area_id TEXT;
  v_phase_id TEXT;
  v_parcel_id TEXT;
  v_project_id BIGINT;
BEGIN
  -- Direction 1: container_id → legacy columns + project
  IF NEW.container_id IS NOT NULL THEN
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

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Container ID % does not exist', NEW.container_id;
    END IF;

    NEW.project_id := v_project_id;

    IF NEW.pe_level IS NULL OR NEW.pe_id IS NULL THEN
      CASE v_container_level
        WHEN 1 THEN
          NEW.pe_level := 'area'::landscape.pe_level;
          NEW.pe_id := v_area_id;
        WHEN 2 THEN
          NEW.pe_level := 'phase'::landscape.pe_level;
          NEW.pe_id := v_phase_id;
        WHEN 3 THEN
          NEW.pe_level := 'parcel'::landscape.pe_level;
          NEW.pe_id := v_parcel_id;
        ELSE
          RAISE EXCEPTION 'Invalid container_level: %', v_container_level;
      END CASE;
    END IF;
  END IF;

  -- Direction 2: legacy columns → container/project
  IF NEW.pe_level IS NOT NULL AND NEW.pe_id IS NOT NULL THEN
    IF NEW.pe_level = 'project' THEN
      IF NEW.container_id IS NOT NULL THEN
        NEW.container_id := NULL;
      END IF;
      IF NEW.project_id IS NULL AND NEW.pe_id ~ '^[0-9]+$' THEN
        NEW.project_id := NEW.pe_id::BIGINT;
      END IF;
    ELSE
      -- Resolve container from attributes when container_id missing
      IF NEW.container_id IS NULL THEN
        CASE NEW.pe_level
          WHEN 'area' THEN
            SELECT container_id, project_id
            INTO NEW.container_id, NEW.project_id
            FROM landscape.tbl_container
            WHERE container_level = 1
              AND attributes->>'area_id' = NEW.pe_id
            LIMIT 1;
          WHEN 'phase' THEN
            SELECT container_id, project_id
            INTO NEW.container_id, NEW.project_id
            FROM landscape.tbl_container
            WHERE container_level = 2
              AND attributes->>'phase_id' = NEW.pe_id
            LIMIT 1;
          WHEN 'parcel', 'lot' THEN
            SELECT container_id, project_id
            INTO NEW.container_id, NEW.project_id
            FROM landscape.tbl_container
            WHERE container_level = 3
              AND attributes->>'parcel_id' = NEW.pe_id
            LIMIT 1;
          ELSE
            RAISE EXCEPTION 'Unsupported pe_level: %', NEW.pe_level;
        END CASE;
      ELSE
        -- Ensure project_id matches resolved container when both provided
        SELECT project_id
        INTO v_project_id
        FROM landscape.tbl_container
        WHERE container_id = NEW.container_id;

        IF FOUND THEN
          NEW.project_id := v_project_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.sync_pe_level_and_container() IS
'Keeps pe_level/pe_id, container_id, and project_id in sync during migration.';

-- -----------------------------------------------------
-- 3. Refresh budget grid view (container-first)
-- -----------------------------------------------------

-- Drop and recreate view to change column structure
DROP VIEW IF EXISTS landscape.vw_budget_grid_items CASCADE;

CREATE VIEW landscape.vw_budget_grid_items AS
WITH RECURSIVE category_path AS (
  SELECT
    c.category_id,
    c.parent_id,
    c.code,
    c.scope,
    c.detail,
    ARRAY[c.detail] AS path_array,
    c.detail AS full_path,
    1 AS depth
  FROM landscape.core_fin_category c
  WHERE c.parent_id IS NULL
    AND c.is_active = TRUE

  UNION ALL

  SELECT
    c.category_id,
    c.parent_id,
    c.code,
    c.scope,
    c.detail,
    cp.path_array || c.detail,
    cp.full_path || ' → ' || c.detail,
    cp.depth + 1
  FROM landscape.core_fin_category c
  INNER JOIN category_path cp ON c.parent_id = cp.category_id
  WHERE c.is_active = TRUE
)
SELECT
  b.fact_id,
  b.budget_id,
  bv.name AS budget_version,
  b.project_id,
  b.container_id,
  coalesce(ct.container_level, 0) AS container_level,
  ct.container_code,
  ct.display_name AS container_name,
  ct.parent_container_id,
  b.category_id,
  cp.code AS cost_code,
  cp.scope,
  cp.full_path AS category_path,
  cp.depth AS category_depth,
  b.uom_code,
  u.name AS uom_display,
  b.qty,
  b.rate,
  b.amount,
  CASE
    WHEN b.amount IS NOT NULL THEN b.amount
    WHEN b.qty IS NOT NULL AND b.rate IS NOT NULL THEN b.qty * b.rate
    ELSE NULL
  END AS calculated_amount,
  b.start_date,
  b.end_date,
  b.escalation_rate,
  b.contingency_pct,
  b.timing_method,
  b.contract_number,
  b.purchase_order,
  b.is_committed,
  b.confidence_level,
  b.vendor_contact_id,
  contacts.company_name AS vendor_name,
  b.notes,
  b.created_at,
  -- Legacy columns retained temporarily (Phase 4 removes)
  b.pe_level,
  b.pe_id
FROM landscape.core_fin_fact_budget b
INNER JOIN landscape.core_fin_budget_version bv ON bv.budget_id = b.budget_id
LEFT JOIN landscape.tbl_container ct ON ct.container_id = b.container_id
LEFT JOIN category_path cp ON cp.category_id = b.category_id
LEFT JOIN landscape.core_fin_uom u ON u.uom_code = b.uom_code
LEFT JOIN landscape.tbl_contacts contacts ON contacts.contact_id = b.vendor_contact_id;

COMMENT ON VIEW landscape.vw_budget_grid_items IS
'Budget grid items view prioritizing container_id/project_id while retaining legacy columns temporarily.';

-- Update variance view to align with container/project identifiers
DROP VIEW IF EXISTS landscape.vw_budget_variance CASCADE;

CREATE VIEW landscape.vw_budget_variance AS
WITH original_budget AS (
  SELECT
    fb.category_id,
    fb.project_id,
    fb.container_id,
    fb.pe_level,
    fb.pe_id,
    SUM(fb.amount) AS original_amount
  FROM landscape.core_fin_fact_budget fb
  INNER JOIN landscape.core_fin_budget_version bv ON fb.budget_id = bv.budget_id
  WHERE bv.name = 'Original' AND bv.status = 'active'
  GROUP BY fb.category_id, fb.project_id, fb.container_id, fb.pe_level, fb.pe_id
),
current_budget AS (
  SELECT
    fb.fact_id,
    fb.category_id,
    fb.project_id,
    fb.container_id,
    fb.pe_level,
    fb.pe_id,
    fb.amount AS current_amount
  FROM landscape.core_fin_fact_budget fb
  INNER JOIN landscape.core_fin_budget_version bv ON fb.budget_id = bv.budget_id
  WHERE bv.name = 'Forecast' AND bv.status = 'active'
)
SELECT
  cb.fact_id,
  cb.category_id,
  cb.project_id,
  cb.container_id,
  cb.pe_level,
  cb.pe_id,
  COALESCE(ob.original_amount, 0) AS original_amount,
  cb.current_amount,
  (cb.current_amount - COALESCE(ob.original_amount, 0)) AS variance_amount,
  CASE
    WHEN ob.original_amount > 0 THEN ROUND(((cb.current_amount - ob.original_amount) / ob.original_amount * 100)::numeric, 2)
    ELSE NULL
  END AS variance_percent,
  CASE
    WHEN cb.current_amount < COALESCE(ob.original_amount, 0) THEN 'under'
    WHEN cb.current_amount > COALESCE(ob.original_amount, 0) THEN 'over'
    ELSE 'on_budget'
  END AS variance_status
FROM current_budget cb
LEFT JOIN original_budget ob
  ON cb.category_id = ob.category_id
  AND cb.project_id = ob.project_id
  AND COALESCE(cb.container_id, -1) = COALESCE(ob.container_id, -1);

COMMENT ON VIEW landscape.vw_budget_variance IS
'Variance tracking between Original and Forecast budgets using container/project identifiers.';

COMMIT;
