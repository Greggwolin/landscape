-- MK24 §1 — how the project's location point was set.
--
-- The location point is not a record of something a user typed. It is a
-- working estimate that improves as the deal is understood: a general point
-- for the site, then the centre of the parcels once they are attached, then
-- wherever a person puts it by hand. Each step is allowed to move the point
-- and persist it.
--
-- What keeps that honest is knowing WHICH of those set it, so a weaker source
-- can never quietly overwrite a stronger one. Without it, someone corrects the
-- point, attaches another parcel a week later, and the correction vanishes
-- with nothing to show it ever happened.
--
-- Precedence, strongest first (Gregg, 2026-08-17):
--     manual  > parcel > geocoded > typed
--
--   manual    placed by hand on the map. Never overwritten automatically.
--   parcel    centroid of the project's attached parcels. May overwrite
--             geocoded and typed — a surveyed parcel centroid is more precise
--             than a geocoded address.
--   geocoded  resolved from an address.
--   typed     coordinates entered directly.
--
-- NULL means unsourced/legacy — every row predating this column. Those are
-- treated as the weakest source and may be moved by anything.
--
-- Note there is an older, overlapping marker in gis_metadata
-- (location_override / location_override_source), which the project PATCH
-- route stamped as 'user' on ANY coordinate write — including automatic ones.
-- This column supersedes it for gating; the JSONB keys are left in place for
-- anything still reading them.
--
-- Idempotent: npm run db:migrate re-executes every .up.sql on each run.

ALTER TABLE landscape.tbl_project
    ADD COLUMN IF NOT EXISTS location_source varchar(16) NULL;

COMMENT ON COLUMN landscape.tbl_project.location_source IS
    'How location_lat/location_lon was set: manual | parcel | geocoded | typed. '
    'NULL = unsourced/legacy. Precedence manual > parcel > geocoded > typed; a '
    'weaker source must never overwrite a stronger one (MK24).';
