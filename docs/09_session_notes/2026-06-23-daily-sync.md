# Daily Sync — June 23, 2026

**Date**: 2026-06-23
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added / Progressed

1. **Map overlay z-order + Annotations legend (#133)** — Overlays now render on top of both parcels/basemap AND drawn shapes. New "Annotations" legend section lists each drawn shape with inline rename (button + double-click), edit, and remove actions. Shapes remain selectable under the non-interactive raster via `queryRenderedFeatures`. Double-click finishes vertex reshape and reopens the edit modal. (+233/−18 lines across 3 files)

2. **Overlay UX polish — editable names, rename "Site Plans" → "Overlays" (#131)** — Overlay names editable during and after creation (Name field in editor, inline rename in legend). Renamed "Site Plan" to "Overlays" across all UI labels. Drawn shapes selectable/editable through the raster overlay. (+144/−19 lines across 5 files)

3. **Classic landing map — Hybrid default + double-click pin-to-move (#132)** — `ProjectTabMap` now pans on plain click (no accidental pin relocation); double-click enters drag mode for repositioning the project pin. Hybrid basemap forced on classic project/property views via `styleUrl` override. `MapOblique` made backward-compatible with ref-based onMapClick. (+119/−13 lines across 4 files)

### Bugs Fixed

4. **Durable R2 storage for site-plan drapes (#130)** — Drape images were previously uploaded via UploadThing and orphan-swept, causing saved overlays to 404. New Django endpoint `POST /api/projects/<id>/overlays/upload-image/` writes directly to R2 (same backend as MediaExtractionService). Graceful "image unavailable — re-drape" state for legacy broken URLs. New `overlayImageStore.ts` utility + `toRenderableOverlayUrl` same-origin proxy path. (+236/−30 lines across 7 files)

5. **Competitive map filter sync (#129)** — Shared filter state (radius/days/min-year-built) between SFD Pricing list and Competitive Projects map so Recent Sales layer matches the list filters. Relabeled "Year Built" → "Min Year Built". (+84/−23 lines across 3 files)

### Documentation

6. **Maricopa/RVR data-mining migration discovery report (#134)** — Read-only discovery audit of migrating the Maricopa/Red Valley Ranch data-mining mechanism into Landscape. No code changes. Markdown + docx report added to docs. (+275 lines)

### Uncommitted Changes (Staged)

- `CLAUDE.md` — Updated "Last audit" line to reflect 2026-06-20 ship (plan extraction, click-to-extract canvas, OCR seam, sales-tab auth sweep, financial engine vendor)
- `propertyTypeTokens.ts` (+15) — Ghost subtype badge style (outline variant with light-grey text)
- `PropertyTypeBadge.tsx` — Minor variant fix
- `StyleCatalog/PropertyTypeTokensSection.tsx` (+6) — Governance view renders both solid + outline variants
- `src/app/w/projects/page.tsx` — Minor project tile adjustments

## Git Commits (6 today)

```
951a955b feat(map): overlay on top of shapes + nameable Annotations legend section (#133)
e55d18d7 docs: add Maricopa/RVR data-mining migration discovery report (md + docx) (#134)
f595239b fix(map): classic landing map — Hybrid default + click-pans / double-click pin to move (#132)
763d98b0 feat(map): overlays always on top, editable shapes, editable names, rename (#131)
7ef6ad9e fix(map): store site-plan drapes durably on R2 so saved overlays don't 404 (#130)
f9a1176b fix(market): competitive map Recent Sales mirrors SFD Pricing filters (#129)
```

## Files Modified (Committed)

```
backend/apps/gis/views_overlay.py                          | 57 +++
backend/apps/projects/urls.py                               |  6 +-
docs/maricopa-datamining-migration-discovery.docx           | Bin
docs/maricopa-datamining-migration-discovery.md             | 275 +++
src/app/components/Market/MarketMapView.tsx                  | 20 +-
src/app/components/property/PropertyPage.tsx                 |  3 +-
src/app/projects/[projectId]/components/tabs/MarketTab.tsx   | 11 +-
src/app/projects/[projectId]/components/tabs/ProjectTab.tsx  |  3 +-
src/components/analysis/SfCompsTile.tsx                      | 76 ++-
src/components/map/MapOblique.tsx                            | 16 +-
src/components/map/ProjectTabMap.tsx                         | 110 +++-
src/components/map-tab/LayerPanel.tsx                        | 105 +++
src/components/map-tab/MapTab.tsx                            | 133 +++-
src/components/map-tab/map-tab.css                           | 12 +
src/components/map-tab/overlay/SitePlanOverlayControls.tsx   | 29 +-
src/components/map-tab/types.ts                              | 13 +
src/lib/gis/overlayImageStore.ts                             | 72 +++
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Staged but uncommitted: CLAUDE.md audit-line update, property-type badge ghost variant, project tile tweaks (5 files, +25/−8 lines)
- [ ] Overlay 6 image is unrecoverable (orphan-swept before #130 shipped) — needs re-drape
- [ ] Maricopa/RVR data-mining migration — discovery report written (#134), implementation not started

## Alpha Readiness Impact

No alpha blocker movement today. Work focused on map-tab polish (overlay durability, annotations, UX) and competitive-map filter sync — all within the "WORKS" category. The R2 durable storage fix (#130) closes a regression where saved overlays silently broke, which would have been visible to alpha testers.

## Notes for Next Session

- The map tab saw heavy iteration today (6 commits, PRs #129–#134). The overlay system is now substantially more robust: durable R2 storage, z-order correct (drapes on top, shapes selectable underneath), annotations legend with rename/edit/delete, and the classic landing map has proper pan/pin behavior.
- The Maricopa/RVR data-mining discovery report (#134) is a read-only audit — no code was written. Implementation decisions pending.
- Five staged files remain uncommitted (property-type badge ghost variant + CLAUDE.md audit line). These are cosmetic/doc changes, not blocking anything.
