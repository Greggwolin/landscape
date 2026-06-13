-- Site-plan image overlay persistence (Phase 1: snap + pin).
--
-- Backs the site-plan drape editor in the Map tab: a georeferenced image
-- pinned to four corner coordinates (TL, TR, BR, BL), with adjustable
-- opacity and rotation. One row per saved overlay; a project may have many.
-- Phase 1 is the rectangular-quad drape — true rubber-sheet warp is a later
-- slice and does not change this shape (corners stays 4 x [lng,lat]).
--
-- LSCMD-CW-OVERLAY-P1-0613-GV
-- Refs: backend/apps/gis/views_overlay.py, src/lib/gis/imageOverlay.ts

CREATE TABLE IF NOT EXISTS landscape.tbl_project_overlay (
    overlay_id   BIGSERIAL PRIMARY KEY,
    project_id   INTEGER NOT NULL
        REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    title        TEXT,
    source_uri   TEXT NOT NULL,
    corners      JSONB NOT NULL,
    opacity      NUMERIC(4, 3) NOT NULL DEFAULT 0.7,
    rotation_deg NUMERIC(6, 2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tbl_project_overlay_project_id_idx
    ON landscape.tbl_project_overlay (project_id);
