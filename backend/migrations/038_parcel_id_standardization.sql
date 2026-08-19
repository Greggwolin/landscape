-- Migration 038: Parcel ID standardization + APN separation
-- Adds parcel_apn for APN text storage and parcel_id_int for bigint drift tables.

-- 1) APN: project_parcel_boundaries.parcel_id is APN (text). Add parcel_apn and backfill.
ALTER TABLE landscape.project_parcel_boundaries
  ADD COLUMN IF NOT EXISTS parcel_apn TEXT;

UPDATE landscape.project_parcel_boundaries
SET parcel_apn = parcel_id
WHERE parcel_apn IS NULL;

COMMENT ON COLUMN landscape.project_parcel_boundaries.parcel_id
  IS 'DEPRECATED: legacy APN storage. Use parcel_apn for assessor parcel number.';
COMMENT ON COLUMN landscape.project_parcel_boundaries.parcel_apn
  IS 'Assessor parcel number (APN). Not a join key.';

-- 2) Bigint parcel_id drift: add integer compat columns + FK to tbl_parcel
ALTER TABLE landscape.core_doc
  ADD COLUMN IF NOT EXISTS parcel_id_int INTEGER;

UPDATE landscape.core_doc
SET parcel_id_int = parcel_id::integer
WHERE parcel_id IS NOT NULL
  AND parcel_id BETWEEN -2147483648 AND 2147483647
  AND parcel_id_int IS NULL;

ALTER TABLE landscape.core_doc
  ADD CONSTRAINT IF NOT EXISTS fk_core_doc_parcel_id_int
  FOREIGN KEY (parcel_id_int) REFERENCES landscape.tbl_parcel(parcel_id) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_core_doc_parcel_id_int ON landscape.core_doc(parcel_id_int);

ALTER TABLE landscape.tbl_absorption_schedule
  ADD COLUMN IF NOT EXISTS parcel_id_int INTEGER;

UPDATE landscape.tbl_absorption_schedule
SET parcel_id_int = parcel_id::integer
WHERE parcel_id IS NOT NULL
  AND parcel_id BETWEEN -2147483648 AND 2147483647
  AND parcel_id_int IS NULL;

ALTER TABLE landscape.tbl_absorption_schedule
  ADD CONSTRAINT IF NOT EXISTS fk_absorption_parcel_id_int
  FOREIGN KEY (parcel_id_int) REFERENCES landscape.tbl_parcel(parcel_id) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_absorption_parcel_id_int
  ON landscape.tbl_absorption_schedule(parcel_id_int);

ALTER TABLE landscape.tbl_acreage_allocation
  ADD COLUMN IF NOT EXISTS parcel_id_int INTEGER;

UPDATE landscape.tbl_acreage_allocation
SET parcel_id_int = parcel_id::integer
WHERE parcel_id IS NOT NULL
  AND parcel_id BETWEEN -2147483648 AND 2147483647
  AND parcel_id_int IS NULL;

ALTER TABLE landscape.tbl_acreage_allocation
  ADD CONSTRAINT IF NOT EXISTS fk_acreage_parcel_id_int
  FOREIGN KEY (parcel_id_int) REFERENCES landscape.tbl_parcel(parcel_id) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_acreage_parcel_id_int
  ON landscape.tbl_acreage_allocation(parcel_id_int);

ALTER TABLE landscape.tbl_parcel_sale_event
  ADD COLUMN IF NOT EXISTS parcel_id_int INTEGER;

UPDATE landscape.tbl_parcel_sale_event
SET parcel_id_int = parcel_id::integer
WHERE parcel_id IS NOT NULL
  AND parcel_id BETWEEN -2147483648 AND 2147483647
  AND parcel_id_int IS NULL;

ALTER TABLE landscape.tbl_parcel_sale_event
  ADD CONSTRAINT IF NOT EXISTS fk_parcel_sale_event_parcel_id_int
  FOREIGN KEY (parcel_id_int) REFERENCES landscape.tbl_parcel(parcel_id) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_parcel_sale_event_parcel_id_int
  ON landscape.tbl_parcel_sale_event(parcel_id_int);

-- 3) Ensure FK parcel_id columns have indexes
CREATE INDEX IF NOT EXISTS idx_core_doc_parcel_id ON landscape.core_doc(parcel_id);
CREATE INDEX IF NOT EXISTS idx_gis_plan_parcel_parcel_id ON landscape.gis_plan_parcel(parcel_id);
CREATE INDEX IF NOT EXISTS idx_absorption_parcel_id ON landscape.tbl_absorption_schedule(parcel_id);
CREATE INDEX IF NOT EXISTS idx_acreage_allocation_parcel_id ON landscape.tbl_acreage_allocation(parcel_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_parcel_id ON landscape.tbl_cashflow(parcel_id);
CREATE INDEX IF NOT EXISTS idx_cre_property_parcel_id ON landscape.tbl_cre_property(parcel_id);
CREATE INDEX IF NOT EXISTS idx_lease_parcel_id ON landscape.tbl_lease(parcel_id);
CREATE INDEX IF NOT EXISTS idx_lot_parcel_id ON landscape.tbl_lot(parcel_id);
CREATE INDEX IF NOT EXISTS idx_operating_expense_parcel_id ON landscape.tbl_operating_expense(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_sale_assumptions_parcel_id ON landscape.tbl_parcel_sale_assumptions(parcel_id);
