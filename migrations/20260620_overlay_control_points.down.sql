-- Rollback: control-point georeferencing column (D16).
-- LSCMD-CW-PLANEXTRACT-CP-0620-ot4

ALTER TABLE landscape.tbl_project_overlay
  DROP COLUMN IF EXISTS control_points;
