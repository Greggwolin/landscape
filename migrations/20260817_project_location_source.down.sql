-- Rollback for MK24 §1 (20260817_project_location_source.up.sql).
--
-- Dropping this column loses the provenance of every location point — after
-- this runs, a hand-placed point is indistinguishable from a geocoded one and
-- the next parcel attach will move it. That is the pre-MK24 behaviour, which
-- is what a rollback is for; the coordinates themselves in location_lat /
-- location_lon are untouched.

ALTER TABLE landscape.tbl_project
    DROP COLUMN IF EXISTS location_source;
