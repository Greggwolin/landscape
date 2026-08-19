-- =====================================================
-- PHASE 4: Remove Legacy pe_level Columns & Enum
-- -----------------------------------------------------
-- * Drop sync trigger/function now that pe_level columns are gone
-- * Remove pe_level/pe_id columns from budget + actual fact tables
-- * Drop the landscape.pe_level enum type
-- =====================================================

BEGIN;

-- Remove triggers and sync function
DROP TRIGGER IF EXISTS trigger_sync_pe_level_budget ON landscape.core_fin_fact_budget;
DROP TRIGGER IF EXISTS trigger_sync_pe_level_actual ON landscape.core_fin_fact_actual;
DROP FUNCTION IF EXISTS landscape.sync_pe_level_and_container();

-- Drop ALL views that reference pe_level/pe_id before dropping columns
DROP VIEW IF EXISTS landscape.vw_budget_variance CASCADE;
DROP VIEW IF EXISTS landscape.vw_budget_grid_items CASCADE;
DROP VIEW IF EXISTS landscape.vw_budget_rollup CASCADE;
DROP VIEW IF EXISTS landscape.v_budget_facts_with_containers CASCADE;
DROP VIEW IF EXISTS landscape.v_budget_migration_comparison CASCADE;
DROP VIEW IF EXISTS landscape.vw_lu_choices CASCADE;
DROP VIEW IF EXISTS landscape.vw_product_choices CASCADE;

-- Drop legacy columns
ALTER TABLE landscape.core_fin_fact_budget
  DROP COLUMN IF EXISTS pe_level,
  DROP COLUMN IF EXISTS pe_id;

ALTER TABLE landscape.core_fin_fact_actual
  DROP COLUMN IF EXISTS pe_level,
  DROP COLUMN IF EXISTS pe_id;

-- Drop enum type
DROP TYPE IF EXISTS landscape.pe_level;

-- Recreate views without legacy columns
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
  b.created_at
FROM landscape.core_fin_fact_budget b
INNER JOIN landscape.core_fin_budget_version bv ON bv.budget_id = b.budget_id
LEFT JOIN landscape.tbl_container ct ON ct.container_id = b.container_id
LEFT JOIN category_path cp ON cp.category_id = b.category_id
LEFT JOIN landscape.core_fin_uom u ON u.uom_code = b.uom_code
LEFT JOIN landscape.tbl_contacts contacts ON contacts.contact_id = b.vendor_contact_id;

COMMENT ON VIEW landscape.vw_budget_grid_items IS
'Budget grid items view prioritizing container/project identifiers.';

CREATE OR REPLACE VIEW landscape.vw_budget_variance AS
WITH original_budget AS (
  SELECT
    fb.category_id,
    fb.project_id,
    fb.container_id,
    SUM(fb.amount) AS original_amount
  FROM landscape.core_fin_fact_budget fb
  INNER JOIN landscape.core_fin_budget_version bv ON fb.budget_id = bv.budget_id
  WHERE bv.name = 'Original' AND bv.status = 'active'
  GROUP BY fb.category_id, fb.project_id, fb.container_id
),
current_budget AS (
  SELECT
    fb.fact_id,
    fb.category_id,
    fb.project_id,
    fb.container_id,
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
