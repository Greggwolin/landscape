-- Fix the CHECK constraint on gis_plan_lot.source to match the actual values
-- the pipeline writes.
--
-- The original migration (20260814) constrained source to ('read', 'derived').
-- The pipeline writes four values that describe HOW the outline was obtained:
--
--   traced      linework closed and the lot's own number sat inside
--   rebuilt     outline reconstructed from stated dimensions between two
--               proven neighbours
--   positional  outline recovered but label was missing; identified by walking
--               the shared-edge chain between two named neighbours
--   unplaced    counted in the schedule but no outline on any sheet
--
-- Additionally, add 'tract' for drainage/utility tracts extracted from the
-- same plat.
--
-- Session: LSCMD-PLANFIX-0823

BEGIN;

ALTER TABLE landscape.gis_plan_lot
    DROP CONSTRAINT IF EXISTS gis_plan_lot_source_check;

ALTER TABLE landscape.gis_plan_lot
    ADD CONSTRAINT gis_plan_lot_source_check
    CHECK (source IN ('traced', 'rebuilt', 'positional', 'unplaced', 'tract'));

-- Add lot_type discriminator column: 'lot' for numbered lots, 'tract' for
-- lettered drainage/utility tracts.
ALTER TABLE landscape.gis_plan_lot
    ADD COLUMN IF NOT EXISTS lot_type varchar(8) NOT NULL DEFAULT 'lot';

-- Dropped first: the migration runner re-executes every .up.sql on each run,
-- so an unguarded ADD CONSTRAINT aborts the whole batch the second time.
ALTER TABLE landscape.gis_plan_lot
    DROP CONSTRAINT IF EXISTS gis_plan_lot_type_check;

ALTER TABLE landscape.gis_plan_lot
    ADD CONSTRAINT gis_plan_lot_type_check
    CHECK (lot_type IN ('lot', 'tract'));

COMMIT;
