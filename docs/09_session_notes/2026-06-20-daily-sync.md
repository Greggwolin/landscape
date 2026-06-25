# Daily Sync — June 20, 2026

**Date**: 2026-06-20
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **Site-plan image extraction — Phase 1** (#115) — New `extract_plan_image` Landscaper tool renders a plan/plat/site-plan PDF page (or clipped region) to a transparent RGBA PNG via `MediaExtractionService.render_plan_crop()`. Two-step flow: preview with `doc_id` only → confirm with `page` + `crop_bbox`. Frontend receives results via `landscaper:place_plan_overlay` CustomEvent and drapes through existing overlay editor. New source-doc provenance columns (`source_doc_id`, `source_page`, `source_crop_bbox`) on `tbl_project_overlay` via migration `20260620_overlay_source_provenance`. OCR seam added to `auto_classifier.extract_text_from_bytes()` — flag-gated (`settings.ENABLE_OCR`), returns explicit error when OCRmyPDF is unprovisioned rather than silent empty. +737 lines across 18 files.
- **Click-to-extract canvas + control-point georeferencing** (#117) — Interactive `PlanExtractCanvas.tsx` (431 lines) lets users trace regions on uploaded site plans and export transparent PNGs per region. Control-point georeferencing via `src/lib/gis/controlPoints.ts` (253 lines): 2 pts → similarity transform, 3 → affine, 4+ → projective, with snap-to-vertex (8m tolerance) against parcel layers. `planExtractBridge.ts` latches payloads for cross-panel handoff (chat → map route). Chat mount path wired in `CenterChatPanel.tsx` for both `show_plan_extract_preview` and `place_plan_overlay` tool results. New migration `20260620_overlay_control_points` adds `control_points JSONB` to `tbl_project_overlay`. +1,101 lines across 12 files.

### Bugs Fixed
- **Sales tab auth headers** (#114) — Authenticated Sales-tab data calls (benchmarks, parcels-with-sales, parcel-product-types, calculate-sale) with two-leg auth + batch propagation. Completes the classic-view auth sweep for Land Dev sales absorption.
- **Financial engine vendor fix** (#113) — Vendored `financial_engine` into `backend/` so Railway can import it. Fixes deploy-time ImportError.

### Infrastructure
- Two new database migrations: `20260620_overlay_source_provenance` (source-doc provenance on overlays) and `20260620_overlay_control_points` (control-point JSONB on overlays).
- OCR seam infrastructure ready — `auto_classifier.py` now has the integration point for OCRmyPDF. Provisioning the binaries + enabling `settings.ENABLE_OCR` is the remaining work.

## Files Modified (committed)

4 commits touching 30 files, ~1,838 net lines added.

Key areas:
- `backend/apps/gis/` — overlay serializer + views (provenance + control points)
- `backend/apps/knowledge/services/` — `auto_classifier.py` (OCR seam), `media_extraction_service.py` (plan crop render)
- `backend/apps/landscaper/` — `plan_extract_tools.py` (new tool), tool registry + schemas
- `src/components/map-tab/` — `MapTab.tsx` (extract + drape handlers), `PlanExtractCanvas.tsx` (new), `useSitePlanOverlays.ts`
- `src/components/wrapper/` — `CenterChatPanel.tsx` (chat→map bridge)
- `src/lib/gis/` — `controlPoints.ts` (new), `planExtractBridge.ts` (new)
- `migrations/` — 2 new migrations

## Git Commits (4)

| Hash | Description |
|------|-------------|
| `b13031ae` | feat(gis): click-to-extract canvas + control-point georeferencing + chat mount (#117) |
| `8d13f3a9` | feat(gis): plan extract + place — Phase 1 (#115) |
| `9156803c` | fix(sales): authenticate Sales-tab data calls (two-leg auth, batch) (#114) |
| `e528235b` | fix(deploy): vendor financial_engine into backend/ so Railway imports it (#113) |

## Uncommitted Changes

Working tree clean.

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Provision OCRmyPDF + Tesseract + Ghostscript binaries and enable `settings.ENABLE_OCR` to close the scanned-PDF gap. OCR seam is now wired.
- [ ] TPS rubber-sheet warp for 5+ control points (flagged by `recommendTpsWarp()` but not yet implemented).
- [ ] Auto boundary detection + irregular-mask transparency for plan extraction (later phases).

## Alpha Readiness Impact

- **Document Upload & Extraction** — OCR seam infrastructure now exists (`auto_classifier.py` → `_extract_pdf_with_ocr()`). The last alpha blocker (scanned-PDF pipeline) is now a provisioning task, not an architecture task. Status holds at ⚠️ PARTIAL until binaries are deployed and flag enabled.
- **Site-plan extraction** is a new capability not on the original alpha checklist but strengthens the GIS/Map story significantly.
- **Classic-view auth sweep** now complete across all tabs (Sales absorption was the last gap, fixed in #114).

## Notes for Next Session

- The plan extraction flow works in both the classic `/projects/[id]` Map tab and the chat-first `/w/` shell — the `planExtractBridge.ts` latch + CustomEvent pattern handles the cross-panel handoff.
- Control-point georeferencing is live: 2-point (similarity), 3-point (affine), 4+ (projective). RMS error is shown to the user. TPS warp (5+ points) is stubbed but not implemented.
- The OCR seam is the closest the platform has ever been to closing the scanned-PDF blocker. It's a deploy/provision task now.
- `financial_engine` is now vendored into `backend/` — this was needed for Railway deploys where the top-level `services/financial_engine_py/` wasn't on the Python path.
