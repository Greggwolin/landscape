BEGIN;

DROP INDEX IF EXISTS idx_core_fin_fact_budget_vendor;
DROP INDEX IF EXISTS idx_core_fin_fact_budget_confidence;
DROP INDEX IF EXISTS idx_core_fin_fact_actual_container;
DROP INDEX IF EXISTS idx_core_fin_fact_budget_container;

ALTER TABLE landscape.core_fin_fact_budget
  DROP CONSTRAINT IF EXISTS ck_budget_confidence_level,
  DROP CONSTRAINT IF EXISTS fk_budget_vendor_contact,
  DROP CONSTRAINT IF EXISTS fk_budget_container;

ALTER TABLE landscape.core_fin_fact_actual
  DROP CONSTRAINT IF EXISTS fk_actual_container;

ALTER TABLE landscape.core_fin_fact_actual
  DROP COLUMN IF EXISTS container_id;

ALTER TABLE landscape.core_fin_fact_budget
  DROP COLUMN IF EXISTS is_committed,
  DROP COLUMN IF EXISTS purchase_order,
  DROP COLUMN IF EXISTS contract_number,
  DROP COLUMN IF EXISTS timing_method,
  DROP COLUMN IF EXISTS contingency_pct,
  DROP COLUMN IF EXISTS escalation_rate,
  DROP COLUMN IF EXISTS vendor_contact_id,
  DROP COLUMN IF EXISTS confidence_level,
  DROP COLUMN IF EXISTS container_id;

COMMIT;
