# Daily Sync — 2026-07-09

**Date**: Wednesday, July 9, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **Legend drag-reorder + terrain/hillshade** (#146) — New `src/lib/maps/layerOrder.ts` module maps legend row order to MapLibre style-layer draw order; new `src/lib/maps/terrain.ts` adds raster-DEM source (AWS Terrain Tiles, no API key), hillshade layer, and optional 3D terrain with configurable exaggeration. Both modules are framework-agnostic (no Landscape imports) for future reuse.
- **3D tilt slider + Demo Rings folded into Market group** (#151) — Pitch/tilt slider control added to map display controls; Demo Rings layer group collapsed into the Market layer group for a cleaner Layers panel.

### Bugs Fixed
- **Maricopa parcel-outline 502 spam** (#150) — Constrained the Maricopa County ArcGIS parcel-outline tile source to county-appropriate zoom range, preventing 502 errors when zoomed out beyond the source's coverage.
- **Legend Annotations disambiguation + per-shape visibility** (#147) — Annotations section in the legend now lists individual drawn shapes with independent visibility toggles instead of a single group toggle.

### Refactoring
- **Compact Layers panel** (#149) — Folded Drawn Items into Annotations section, collapsed utility sections, floated display controls (basemap picker, opacity, etc.) outside the scrollable layer list. Net: 254 additions, 143 deletions across LayerPanel, MapTab, and CSS.

### CI/CD
- **Production Deployment workflow fix** (#148) — Fixed red CI by adding `JWT_SIGNING_KEY` secret and stripping the workflow down to tests + health-check only (-177 lines).

## Files Modified

| File | Net Change |
|------|-----------|
| `.github/workflows/production.yml` | -177 lines (simplified) |
| `src/components/map-tab/LayerPanel.tsx` | Major refactor |
| `src/components/map-tab/MapCanvas.tsx` | +79 lines |
| `src/components/map-tab/MapTab.tsx` | +227 lines |
| `src/components/map-tab/constants.ts` | -25 lines (cleanup) |
| `src/components/map-tab/map-tab.css` | +148 lines |
| `src/components/map-tab/types.ts` | +19 lines |
| `src/lib/maps/layerOrder.ts` | **NEW** +199 lines |
| `src/lib/maps/terrain.ts` | **NEW** +194 lines |

**Total: +1,109 / -360 across 9 files**

## Git Commits

```
eacdac92 feat(map): 3D tilt slider + fold Demo Rings into Market group [KP-MAPUI3-0709] (#151)
705da3f1 fix(map): constrain Maricopa parcel-outline source to county zoom range — stop 502 spam [KP-PARCELTILE-0709] (#150)
a9f04d43 refactor(map): compact Layers panel — fold Drawn Items into Annotations, collapse utility sections, float display controls [KP-MAPUI2-0709] (#149)
8139eec5 ci(production): fix red Production Deployment — JWT_SIGNING_KEY + tests/health-check only [KP-CIFIX-0709] (#148)
46fbdcbd fix(map): disambiguate legend Annotations + per-shape visibility toggle [KP-LEGENDFIX-0709] (#147)
ce06c4eb feat(map): legend drag-reorder + terrain/hillshade [KP-MAPUI-0709] (#146)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement today. All work was map UI polish — the map/GIS feature was already marked ✅ WORKS. Today's changes improve UX quality (legend reorder, terrain, annotation controls, CI fix) but don't shift any blocker status.

## Notes for Next Session

- The two new modules (`layerOrder.ts`, `terrain.ts`) are deliberately framework-agnostic — good candidates for a future shared map package.
- Production CI is now green after #148 stripped it to health-check only. If a full test suite is desired in CI, the workflow will need expansion again.
- The Layers panel had a major UX overhaul today — if any user feedback references layer controls or annotations, this is the session to reference.
