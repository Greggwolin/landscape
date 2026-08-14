-- A home for lot outlines read off a plat.
--
-- Why a new table rather than gis_plan_parcel: that table's parcel_id is
-- NOT NULL and ux_gpp_active is unique on (project_id, parcel_id) WHERE
-- is_active, so it holds exactly one row per parcel by construction. A plat
-- carries hundreds of lots inside each parcel and they need somewhere to go.
--
-- Why not tbl_lot: Gregg's decision, 2026-08-14 — a plat creates PARCELS with
-- lot counts and frontage rolled up to each, not hundreds of individual lot
-- records. The parcel is what he sells. Lot outlines are still kept, but they
-- hang off the parcel as geometry rather than becoming inventory anyone
-- manages one at a time. tbl_lot stays empty and remains the right home if
-- lot-level inventory is ever wanted.
--
-- The vintage columns (source_doc, version, confidence, valid_from, valid_to,
-- is_active, created_at) mirror gis_plan_parcel exactly, names and semantics
-- alike, so the supersede logic is identical across both tables: a re-read
-- deactivates the previous version rather than duplicating it.
--
-- geom is POLYGON in SRID 3857, matching gis_plan_parcel (read from
-- geometry_columns, not assumed). Requires PostGIS.
--
-- Session: LSCMD-PLATPARCELS-0814-MK12

BEGIN;

CREATE TABLE IF NOT EXISTS landscape.gis_plan_lot (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id  integer NOT NULL
                REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,

    -- Null until the parcel this lot belongs to exists. ON DELETE SET NULL
    -- rather than CASCADE: deleting a parcel must not destroy the record of
    -- what the drawing said — the outline outlives the rollup.
    parcel_id   integer NULL
                REFERENCES landscape.tbl_parcel(parcel_id) ON DELETE SET NULL,

    -- Text, not integer: plats number lots 101, 102A, 12-B.
    lot_number  varchar(32) NOT NULL,

    geom        geometry(Polygon, 3857) NOT NULL,

    area_sqft   numeric,
    frontage_ft numeric,

    -- How the outline was obtained: 'read' straight off the drawing's
    -- linework, or 'derived' by construction where the linework did not close.
    source      varchar(16) NOT NULL,

    source_doc  text NOT NULL,

    -- The PlanStage integer. Stored and compared, never renumbered.
    stage       integer NOT NULL,

    version     integer NOT NULL DEFAULT 1,
    confidence  numeric DEFAULT 0.95,

    valid_from  timestamptz NOT NULL DEFAULT now(),
    valid_to    timestamptz,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT gis_plan_lot_source_check CHECK (source IN ('read', 'derived'))
);

-- One active outline per lot number per project — the same shape as
-- ux_gpp_active, so re-reading a plat must supersede rather than duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS ux_gpl_active
    ON landscape.gis_plan_lot (project_id, lot_number)
    WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_gpl_geom
    ON landscape.gis_plan_lot USING gist (geom);

CREATE INDEX IF NOT EXISTS idx_gpl_parcel
    ON landscape.gis_plan_lot (parcel_id);

COMMIT;

-- ROLLBACK: 20260814_create_gis_plan_lot.down.sql drops the table and its
-- indexes. Kept as a paired file rather than a commented block, matching the
-- convention every migration since 20260619 uses.
