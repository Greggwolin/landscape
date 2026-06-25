# Daily Sync — June 22, 2026

**Date**: 2026-06-22
**Generated**: Nightly automated sync (updated — 3 commits landed after earlier run)

---

## Work Completed Today

### Commits (3)

1. **`e2a3f9b4` — fix(market): competitive map Recent Sales mirrors SFD Pricing filters**
   Shared filter state (radius, days, min-year-built) between the SFD Pricing list and the Competitive Projects map so the Recent Sales layer matches the list instead of showing all sales. Relabeled "Year Built" → "Min Year Built". Files: `MarketMapView.tsx`, `MarketTab.tsx`, `SfCompsTile.tsx` (+84/−23 lines).

2. **`ff054ed8` — fix(w-projects): canonical solid property-type badges on project tiles (#119)**
   Project tile badges on the `/w/projects` page now use the canonical `PropertyTypeBadge` component and solid variant from `propertyTypeTokens`. (+5/−3 lines).

3. **`df4fd9be` — fix(dms): add auth headers to media-scan pipeline fetches (#118)**
   `ProjectMediaGallery.tsx` — added `getAuthHeaders()` to 7 fetch calls (media list, scan, extract, classify, actions, reset) that were previously unauthenticated. Continues the classic-view auth sweep. (+12/−11 lines).

### Uncommitted Work In Progress

**Map tab feature editing + layer panel site plans (~502 lines across 7 files):**
- `MapTab.tsx` (+325): Click-to-edit saved drawn shapes (FeatureModal in edit mode), vertex-reshape via `direct_select`, per-overlay legend visibility toggling (`hiddenOverlayIds`), geometry persist on reshape via `updateFeature`, delete flow with confirmation.
- `FeatureModal.tsx` (+66): Edit mode prefill from existing feature, Delete button, Reshape button for line/polygon features.
- `LayerPanel.tsx` (+67): "Site Plans" legend section with per-overlay visibility checkbox, Edit/Remove actions for saved overlays.
- `types.ts` (+14): `SitePlanLegendItem` interface, `LayerPanelProps` extended with site-plan callbacks.
- `useMapDraw.ts` (+18): Hook additions for reshape support.
- `useMapFeatures.ts` (+3): `updateFeature` and `deleteFeature` exposed from hook.
- `map-tab.css` (+27): Styles for site-plan legend rows and edit/remove actions.

**Other uncommitted changes:**
- `src/app/api/media/proxy/route.ts` (NEW, +60): Same-origin image proxy for R2-hosted extracted media. Host-whitelisted to `*.r2.dev` to prevent open-proxy abuse. Needed for CORS-clean data URLs in click-to-extract canvas.
- `ArtifactWorkspacePanel.tsx` (−36/+22): Source Pointers section now visible in takeover mode (was unreachable); `EmptyActiveState` returns null (blank panel, claude.ai pattern).
- `propertyTypeTokens.ts` (+15): Ghost subtype badge style — outline variant uses parent-type border color with light-grey text (rgb 200,200,200) and regular weight — subtypes clearly secondary to solid primary.
- `PropertyTypeBadge.tsx` (−1/+1): Minor variant fix.
- `StyleCatalog/PropertyTypeTokensSection.tsx` (+6): Governance view renders both solid + outline variants.
- `src/app/w/layout.tsx` (+16): Map route auto-collapses sidebar and chat panel on entry for full-canvas experience. Fires once per map visit (ref-tracked).

## Files Modified

### Committed
```
src/app/components/Market/MarketMapView.tsx          | 20 ++++--
src/app/projects/[projectId]/components/tabs/MarketTab.tsx | 11 +++-
src/components/analysis/SfCompsTile.tsx              | 76 ++++++++++++++-----
src/app/w/projects/page.tsx                          |  8 +++-
src/components/dms/ProjectMediaGallery.tsx           | 23 ++++---
```

### Uncommitted
```
src/components/map-tab/MapTab.tsx                    | 325 +++++++++++++++++++-
src/components/map-tab/FeatureModal.tsx              |  66 ++++-
src/components/map-tab/LayerPanel.tsx                |  67 ++++-
src/components/map-tab/hooks/useMapDraw.ts           |  18 +
src/components/map-tab/hooks/useMapFeatures.ts       |   3 +
src/components/map-tab/map-tab.css                   |  27 ++
src/components/map-tab/types.ts                      |  14 ++
src/app/api/media/proxy/route.ts                     |  60 +++ (NEW)
src/components/wrapper/ArtifactWorkspacePanel.tsx    |  36 +--
src/config/propertyTypeTokens.ts                     |  15 +-
src/components/ui/landscape/PropertyTypeBadge.tsx    |   2 +-
src/app/components/StyleCatalog/PropertyTypeTokensSection.tsx | 6 +-
src/app/w/layout.tsx                                 |  16 +
CLAUDE.md                                           |   3 +-
```

## Git Commits

```
e2a3f9b4 fix(market): competitive map Recent Sales mirrors SFD Pricing filters (15:07 MST)
ff054ed8 fix(w-projects): canonical solid property-type badges on project tiles (#119) (07:33 MST)
df4fd9be fix(dms): add auth headers to media-scan pipeline fetches (#118) (07:16 MST)
```

## Recent Activity (Last 3 Days — Jun 19–20)

Heavy feature push on June 19–20 (17 commits across PRs #99–#117):

### Features
- Site-plan image extraction Phase 1 (#115) — `extract_plan_image` tool + `MediaExtractionService.render_plan_crop()` + source-doc provenance
- Click-to-extract canvas + control-point georeferencing (#117) — `PlanExtractCanvas.tsx`, `controlPoints.ts`, `planExtractBridge.ts`
- User Guide system (#101–#103, #106, #108–#109) — dual-UI chapters, context-aware deep-links, platform-knowledge corpus ingestion
- Project tile actions + soft-delete (#99, FB-318)
- Always-visible Chat/Classic view switch (#111)

### Bug Fixes
- Classic-view auth sweep completed (#104, #105, #112, #114) — all tabs now authenticated
- Financial engine vendored for Railway (#113)
- CI preview databases schema-only (#100)
- Guide page→chapter mapping cleanup (#108)

### Infrastructure
- 4 new migrations (project soft-delete, overlay provenance, overlay control points)
- OCR seam wired in `auto_classifier.py` (flag-gated)
- User Guide corpus ingestion command (`ingest_guide_corpus`)

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Provision OCRmyPDF + Tesseract + Ghostscript binaries and enable `settings.ENABLE_OCR` to close the scanned-PDF gap. OCR seam is now wired.
- [ ] TPS rubber-sheet warp for 5+ control points (flagged by `recommendTpsWarp()` but not yet implemented).
- [ ] Commit map-tab feature editing + layer panel site-plan legend work (~502 lines) — substantial WIP, likely needs a PR.
- [ ] Commit media proxy route, ArtifactWorkspacePanel cleanup, property-type badge refinements, and layout auto-collapse.
- [ ] Commit 5 untracked daily-sync files (06-18 through 06-22) via `scripts/nightly/commit-generated-docs.sh`.

## Alpha Readiness Impact

No alpha blocker movement. Today's work is polish/UX: market map filter sync, auth hardening, badge consistency. The uncommitted map-tab editing work (click-to-edit shapes, vertex reshape, site-plan legend) is a significant UX improvement for the GIS surface but doesn't change alpha blocker status. Alpha readiness holds at ~92%.

## Notes for Next Session

- The map-tab feature editing work is substantial (~502 uncommitted lines). Consider bundling as a PR (e.g., `fix(map): click-to-edit shapes + site-plan legend`) once tested.
- The media proxy route (`/api/media/proxy/`) solves CORS for R2-hosted extracted images — needed by the click-to-extract canvas. Should ship with or before the map-tab PR.
- Market map filter sync (`e2a3f9b4`) is committed and deployed — verify in production that the Recent Sales layer reflects the SFD Pricing panel's radius/days/min-year filters.
- The `/w/` layout auto-collapse on map entry is a nice UX touch — sidebar and chat panel collapse to give the map full canvas. Test that re-opening them sticks (the ref guard should prevent re-collapse).
- `ArtifactWorkspacePanel` cleanup makes Source Pointers visible during takeover mode — was a bug where opening an artifact hid the section that requires an open artifact.
