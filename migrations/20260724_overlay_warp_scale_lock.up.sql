-- Drape overlay: warp mode + discrete scale + lock (SS14).
--
-- Adds three fields to a saved site-plan overlay so the extra transform state persists
-- on the SAME row the 4-corner drape already writes:
--   * warp_mode — 'quad' (default, existing 4-corner image drape) | 'tps' (rubber-sheet)
--   * scale     — discrete uniform scale factor applied to the quad (1.0 = unchanged)
--   * locked    — freeze the transform so it can't be nudged/dragged accidentally
--
-- The TPS warp itself is reconstructed at render time from the existing `control_points`
-- column (added 2026-06-20); this migration only records which mode is active plus the
-- scale/lock UI state. Additive + defaulted: existing rows read back as an unlocked,
-- unscaled 4-corner drape exactly as before.
--
-- LSCMD-SS-DRAPE-POLYGON-TPS-0724
-- Refs: backend/apps/gis/views_overlay.py, src/lib/gis/tpsOverlay.ts,
--       src/components/map-tab/overlay/useSitePlanOverlay.ts

ALTER TABLE landscape.tbl_project_overlay
  ADD COLUMN IF NOT EXISTS warp_mode TEXT NOT NULL DEFAULT 'quad',
  ADD COLUMN IF NOT EXISTS scale     NUMERIC(8, 4) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS locked    BOOLEAN NOT NULL DEFAULT false;

-- Guard the enum-ish text column against typos.
ALTER TABLE landscape.tbl_project_overlay
  DROP CONSTRAINT IF EXISTS tbl_project_overlay_warp_mode_chk;
ALTER TABLE landscape.tbl_project_overlay
  ADD CONSTRAINT tbl_project_overlay_warp_mode_chk
  CHECK (warp_mode IN ('quad', 'tps'));

COMMENT ON COLUMN landscape.tbl_project_overlay.warp_mode IS
  'Drape render mode: quad = 4-corner image source (default); tps = thin-plate-spline '
  'rubber-sheet warp rendered from control_points (SS14).';
COMMENT ON COLUMN landscape.tbl_project_overlay.scale IS
  'Discrete uniform scale factor applied to the drape quad about its centroid (SS14). '
  '1.0 = unchanged.';
COMMENT ON COLUMN landscape.tbl_project_overlay.locked IS
  'When true the overlay transform is frozen (no drag/rotate/scale) to prevent accidental '
  'nudges (SS14).';
