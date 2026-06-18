# Daily Sync — 2026-06-15

**Date**: Sunday, June 15, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Map Feedback Batch (7bd4bb1e — `LSCMD-MAPFB-0615-rk`)
Five feedback items resolved in a single commit:
- **FB-319**: Custom-point color swatches in FeatureModal — 8-color preset palette, persisted via feature `style` JSON; user-features-point layer repainted to honor `style.color`; click popup on saved points shows name/notes/category
- **FB-320**: Reference parcel boundary line-width reduction across all layers (plan 2→1.2, tax 1.6→1, la-parcels 1.6→1, comps 2.2→1.4, subject 2.8→1.8); selection-highlight + site-boundary widths left bold
- **FB-321**: Dedicated ephemeral Measure tool (line distance) — reuses line drawing into live overlay, never persists a feature, cleans up on finish/Escape, auto-deselects after measurement
- **FB-322**: Collapsed-sidebar avatar centering fix (margin 0 → 0 auto)
- **FB-323**: Competitor marker detail drawer — `CompetitorDetailPanel` component reusing legacy field set (address, lot/size, units, price range, last sale, status); popup retained as quick view

### Parcel Association P2 + P3 (f55ff374 — `LSCMD-CW-PARCEL-P2P3-0613-GV`, committed ~12h ago)
- **P2 (Gesture B)**: Drag-pin attach mode — draggable subject pin at project center, drop on tax parcel opens P1 confirm modal pre-filled, snap-to-parcel-center checkbox
- **P3 (Gesture C)**: Draw-boundary mode — polygon draw routes to attach flow with acreage from draw, best-effort APN from intersecting parcel, point = polygon centroid
- **Backend**: New `POST /api/gis/boundary-set/` endpoint — UPSERTs drawn GeoJSON polygon into `gis_project_boundary`
- **Bug fix**: Suppress P1 click-attach during draw; hide drag pin while `attachDrawActive`

## Files Modified

```
A  src/components/map-tab/CompetitorDetailPanel.tsx   (new — competitor detail drawer)
M  src/components/map-tab/DrawToolbar.tsx             (measure tool integration)
M  src/components/map-tab/FeatureModal.tsx            (color swatch picker)
M  src/components/map-tab/MapCanvas.tsx               (attach-draw suppression, layer styling)
M  src/components/map-tab/MapTab.tsx                  (measure tool, competitor panel, attach modes)
M  src/components/map-tab/hooks/useMapDraw.ts         (measure tool hook logic)
M  src/components/map-tab/hooks/useMapFeatures.ts     (color persistence)
M  src/components/map-tab/map-tab.css                 (line widths, color swatches, measure tool)
M  src/components/map-tab/types.ts                    (attach draw active flag)
M  src/styles/wrapper.css                             (sidebar avatar centering)
M  backend/apps/gis/urls.py                           (boundary-set endpoint)
M  backend/apps/gis/views.py                          (boundary-set view)
```

## Git Commits

```
7bd4bb1e fixes FB-319 FB-320 FB-321 FB-322 FB-323 (4 hours ago)
f55ff374 feat(map): parcel association P2 + P3 — drag-pin attach + draw-boundary (#80) (12 hours ago)
```

## Uncommitted Changes

```
M  CLAUDE.md                                          — audit date bumped to 2026-06-13 (prior session)
M  docs/14-specifications/LANDSCAPER_ADMIN_USER_MANUAL.md  — admin manual rewrite (prior session)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Site-plan overlay Phase 2 — rubber-sheet warp (non-rectangular distortion) deferred; current Phase 1 is rectangular-quad drape only.
- [ ] Geocoding backfill — run `backfill_geocoding` management command against existing projects to populate lat/lng columns.
- [ ] Scanned PDF / OCR pipeline — still the primary alpha blocker (OCRmyPDF identified, not implemented).
- [ ] Commit staged docs (CLAUDE.md + daily syncs + admin manual rewrite) — now 3 sync files pending.
- [ ] Parcel association live click-through QA — P1/P2/P3 all coded; full end-to-end test recommended.

## Alpha Readiness Impact

No direct alpha blocker movement. The parcel association and map feedback work strengthens the GIS/Map feature area (already marked ✅ WORKS). Primary remaining blocker: scanned-PDF/OCR pipeline.

## Notes for Next Session

- **Map tab is feature-rich now**: parcel association (3 gestures), site-plan overlay, measure tool, custom-point colors, competitor detail panel, boundary drawing. Good candidate for a map-tab-specific QA pass.
- **Four uncommitted doc files** ready to stage+commit: CLAUDE.md, admin manual, 2026-06-13 sync, 2026-06-14 sync. This sync (2026-06-15) will be a fifth.
- Weekend pace: 2 commits today, 2 yesterday (Sat was P1 parcel + P2/P3 parcel), 12 on Friday. Good velocity on map features.
