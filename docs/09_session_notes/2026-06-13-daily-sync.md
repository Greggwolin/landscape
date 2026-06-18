# Daily Sync — 2026-06-13

**Date**: Friday, June 13, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **Site-plan image overlay — Phase 1** (#75): New `tbl_project_overlay` table, Django CRUD endpoints (`views_overlay.py`), frontend overlay controls with snap-to-parcel and pin placement. New `imageOverlay.ts` + `snapIndex.ts` utility modules, `useSitePlanOverlay` and `useSitePlanOverlays` hooks. +1,379 lines across 12 files.
- **Pluggable geocoding service** (#71, FB-317): New `geocode_provider.py` abstraction with provider config in Django settings. New `geocode_address` Landscaper tool (registered universal + unassigned-safe). Backfill management command (`backfill_geocoding.py`). Migration adds `latitude`/`longitude`/`geocoded_at`/`geocode_source` columns to `tbl_project`. +561 lines across 10 files.
- **Feedback system unification** (#78): Retired `tester_feedback` Django model/views/serializers/admin and migrated all tracking to canonical `tbl_feedback`. Deleted dead alpha UI components (`AlphaAssistantFlyout`, `FeedbackLog`, `HelpFeedbackAgent`). New `views_canonical.py` replaces bloated original views. Net -1,927 lines across 18 files.
- **Admin sidebar gating** (#72): Feedback link in `/w/` sidebar now only visible to staff users.
- **ARGUS income-statement shape** (#70, FB-315): Operating statement artifact renderer updated to match ARGUS-style column layout with improved guard rules.

### Bugs Fixed
- **Map auto-fit** (#76): `fitBounds` now fires once per project load instead of on every parcel data reload. Prevents jarring re-framing.
- **Map project coordinates** (#77): Project lat/lng now threaded through the `/w/` wrapper layout context so map centers correctly in chat-first UI.
- **Landscaper positional tool_result repair** (#74): Fixed `tool_result` block ordering in `ai_handler.py` when multiple tool calls return; also enhanced comp-marker map popups with richer data.
- **Empty #FB rejection** (#69, FB-313): Feedback submissions with empty message text after `#FB` tag are now rejected server-side. `/w/` routes now map correctly to `page_context` values.
- **Auth headers on reports** (#67, FB-316): `useReports` hook now sends auth headers on GET requests.
- **Auth headers on knowledge library** (#68, FB-314): Search, classification, and upload endpoints in KnowledgeLibraryPanel now include auth headers.

### Documentation
- Docs refresh (#73): Backfilled session notes for Jun 9–12, updated session-log.md, added screenshots to .gitignore.

## Files Modified

18 files changed in #78 (feedback unification)
12 files changed in #75 (site-plan overlay)
10 files changed in #71 (geocoding)
5 files changed in #70 (ARGUS OS shape)
3 files changed in #74 (tool_result repair)
3 files changed in #69 (empty FB rejection)
3 files changed in #68 (knowledge library auth)
2 files changed in #77 (map coords wrapper)
2 files changed in #72 (sidebar gating)
1 file changed in #76 (map auto-fit)
1 file changed in #67 (reports auth)
7 files changed in #73 (docs refresh)

## Git Commits

```
f7f0f2f1 feat(feedback): unify tracker on tbl_feedback, retire tester_feedback mirror (#78)
d20a2de8 fix(map): thread project coordinates through the /w/ wrapper (#77)
b71305dd fix(map): auto-fit frames once per project, not on every parcel reload (#76)
37714cf0 feat(map): site-plan image overlay — snap + pin (Phase 1) (#75)
f06c58c5 fix(landscaper): positional tool_result repair + rich comp-marker popups (#74)
08162160 chore(docs): refresh audit notes, session log, daily syncs; ignore screenshots (#73)
5fce8bf7 feat(sidebar): gate admin-only Feedback link behind staff role (#72)
93c43efe feat(geocoding): pluggable address→coords service + project geocoding — fixes FB-317 (#71)
09449794 feat(artifacts): ARGUS income-statement shape for operating statement — fixes FB-315 (#70)
388600cd fix(feedback): reject empty #FB submissions + map /w/ routes to page context — fixes FB-313 (#69)
934f7916 fix(knowledge-library): send auth headers on search/classification/upload — fixes FB-314 (#68)
41f415cf fix(reports): send auth headers on report GET hooks — fixes FB-316 (#67)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Site-plan overlay Phase 2 — rubber-sheet warp (non-rectangular distortion) deferred; current Phase 1 is rectangular-quad drape only.
- [ ] Geocoding backfill — run `backfill_geocoding` management command against existing projects to populate lat/lng columns.
- [ ] Scanned PDF / OCR pipeline — still the primary alpha blocker (OCRmyPDF identified, not implemented).

## Alpha Readiness Impact

No alpha blocker movement today. Primary remaining blocker is the scanned-PDF/OCR pipeline. Today's work improved map functionality (site-plan overlay, geocoding, auto-fit) and cleaned up significant technical debt (feedback unification removed ~2,500 lines of dead/duplicated code). Auth header fixes (#67/#68) resolved real user-facing bugs where reports and knowledge library searches were failing silently.

## Notes for Next Session

- **Feedback system is now singular**: All feedback tracking is on `tbl_feedback`. The `TesterFeedback` model, its migration history, and the old `views.py` endpoints are gone. `views_canonical.py` is the new entry point. Admin page simplified.
- **New DB table `tbl_project_overlay`**: One row per saved overlay image, with corner coordinates (JSONB), opacity, rotation. FK to `tbl_project`.
- **New migration `0010_add_geocoding_columns_to_project.py`**: Adds `latitude`, `longitude`, `geocoded_at`, `geocode_source` to the Django `Project` model.
- **Geocoding provider is configurable**: `settings.py` has `GEOCODING_PROVIDER` (default: `nominatim`) and `GEOCODING_API_KEY` for paid providers.
- **12 commits today** — highest single-day commit count in recent weeks. Mix of new features (overlay, geocoding), bug fixes (auth headers, map behavior), and tech debt cleanup (feedback unification).
