BEGIN;

ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN IF NOT EXISTS container_id BIGINT,
  ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS vendor_contact_id INTEGER,
  ADD COLUMN IF NOT EXISTS escalation_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS contingency_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS timing_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS purchase_order VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_committed BOOLEAN DEFAULT FALSE;

ALTER TABLE landscape.core_fin_fact_actual
  ADD COLUMN IF NOT EXISTS container_id BIGINT;

ALTER TABLE landscape.core_fin_fact_budget
  ADD CONSTRAINT IF NOT EXISTS fk_budget_container
    FOREIGN KEY (container_id)
    REFERENCES landscape.tbl_container(container_id)
    ON DELETE SET NULL;

ALTER TABLE landscape.core_fin_fact_actual
  ADD CONSTRAINT IF NOT EXISTS fk_actual_container
    FOREIGN KEY (container_id)
    REFERENCES landscape.tbl_container(container_id)
    ON DELETE SET NULL;

ALTER TABLE landscape.core_fin_fact_budget
  ADD CONSTRAINT IF NOT EXISTS fk_budget_vendor_contact
    FOREIGN KEY (vendor_contact_id)
    REFERENCES landscape.tbl_contacts(contact_id)
    ON DELETE SET NULL;

ALTER TABLE landscape.core_fin_fact_budget
  ADD CONSTRAINT IF NOT EXISTS ck_budget_confidence_level
    CHECK (confidence_level IS NULL OR confidence_level IN ('high', 'medium', 'low', 'guess'));

CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget_container
  ON landscape.core_fin_fact_budget(container_id);

CREATE INDEX IF NOT EXISTS idx_core_fin_fact_actual_container
  ON landscape.core_fin_fact_actual(container_id);

CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget_confidence
  ON landscape.core_fin_fact_budget(confidence_level);

CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget_vendor
  ON landscape.core_fin_fact_budget(vendor_contact_id);

COMMIT;
