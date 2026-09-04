-- Rollback: restore the original CHECK constraint and drop the lot_type column.

BEGIN;

ALTER TABLE landscape.gis_plan_lot
    DROP CONSTRAINT IF EXISTS gis_plan_lot_type_check;

ALTER TABLE landscape.gis_plan_lot
    DROP COLUMN IF EXISTS lot_type;

ALTER TABLE landscape.gis_plan_lot
    DROP CONSTRAINT IF EXISTS gis_plan_lot_source_check;

ALTER TABLE landscape.gis_plan_lot
    ADD CONSTRAINT gis_plan_lot_source_check
    CHECK (source IN ('read', 'derived'));

COMMIT;
