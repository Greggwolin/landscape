-- Roll back the site-plan image overlay table.
-- LSCMD-CW-OVERLAY-P1-0613-GV

DROP INDEX IF EXISTS landscape.tbl_project_overlay_project_id_idx;

DROP TABLE IF EXISTS landscape.tbl_project_overlay;
