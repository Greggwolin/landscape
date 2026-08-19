-- Rollback for 20260814_create_gis_plan_lot.up.sql
--
-- Dropping the table takes its indexes with it; they are listed explicitly
-- first so the intent is readable and the file is safe to run piecemeal.
--
-- gis_plan_lot is a leaf: it points at tbl_project and tbl_parcel, and nothing
-- points back at it, so nothing else needs unwinding.
--
-- This discards recorded lot outlines. They are re-derivable by re-reading the
-- source drawing, which is why a plain drop is acceptable rather than an
-- archive step.
--
-- Session: LSCMD-PLATPARCELS-0814-MK12

BEGIN;

DROP INDEX IF EXISTS landscape.idx_gpl_parcel;
DROP INDEX IF EXISTS landscape.idx_gpl_geom;
DROP INDEX IF EXISTS landscape.ux_gpl_active;

DROP TABLE IF EXISTS landscape.gis_plan_lot;

COMMIT;
