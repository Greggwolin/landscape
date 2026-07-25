-- Rollback: drape overlay warp mode + scale + lock (SS14).
-- LSCMD-SS-DRAPE-POLYGON-TPS-0724

ALTER TABLE landscape.tbl_project_overlay
  DROP CONSTRAINT IF EXISTS tbl_project_overlay_warp_mode_chk;

ALTER TABLE landscape.tbl_project_overlay
  DROP COLUMN IF EXISTS warp_mode,
  DROP COLUMN IF EXISTS scale,
  DROP COLUMN IF EXISTS locked;
