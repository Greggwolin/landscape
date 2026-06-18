# Daily Sync — 2026-06-16

**Date**: Monday, June 16, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Rent Comp Mapping Overhaul (#85 / #86 / #87)
Three commits shipping a complete rent-comp-on-map workflow:
- **#85 (aa51920c)**: `generate_map_artifact` now reads from `tbl_rent_comp` (the actual rent comparables table) instead of `tbl_multifamily_unit_type`. New `geocode_rent_comps` Landscaper tool geocodes active rent comps missing coordinates — project-scoped, offer-gated (never fires autonomously), never overwrites existing coords. Tool registered in `tool_registry.py`, schema in `tool_schemas.py`, implementation in `geocoding_tools.py`.
- **#86 (602cd7ec)**: `generate_map_artifact` now persists the interactive MapLibre map as a durable artifact via `create_artifact` call. `ArtifactWorkspacePanel.tsx` updated to render map artifacts with iframe.
- **#87 (33b6b83d)**: One-pin-per-property deduplication — rent comps with the same `property_name` collapse to a single map pin with combined unit-type details in popup. Honest comp counts in tool output (shows mapped vs total). `ai_handler.py` updated with rent-comp map instructions in BASE_INSTRUCTIONS.

### Classic View Toggle (cdec064f — `feature/classic-view-toggle` branch)
- New `ClassicViewToggle.tsx` component — renders a "Classic View" link in the project `ActiveProjectBar` header, visible only when `NEXT_PUBLIC_ENABLE_CLASSIC_VIEW=true`
- `src/lib/uiMode.ts` — helper to read/write `ui_mode` cookie (`wrapper` | `classic`)
- `src/middleware.ts` — intercepts `/projects/[id]` routes; redirects to `/w/projects/[id]` unless `?mode=classic` or `ui_mode=classic` cookie set
- Legacy backend audit document (`docs/02-features/classic-view-backend-audit.md`) — maps all legacy `/projects/[id]` API dependencies
- `ProjectArtifactsPanel.tsx` — conditional rendering adjustments for classic mode

### CLAUDE_MODEL Environment Variable (#84 — a5ea1294)
- `ai_handler.py` now reads `CLAUDE_MODEL` from environment instead of hardcoding
- Default falls back to `claude-sonnet-4-5-20241022` (in-service Sonnet 4.5)
- Enables model switching without code changes (Railway env var)

### Dark Theme First-Paint Fix (e39fdc0c)
- `CoreUIThemeProvider.tsx` — forces `colorMode: 'dark'` on `/w/` routes at provider level
- `layout.tsx` — adds `data-coreui-theme="dark"` to `<html>` tag to prevent flash of light theme on initial page load

## Files Modified

```
A  docs/02-features/classic-view-backend-audit.md     (100 lines — legacy backend audit)
M  next.config.ts                                      (classic view redirect config)
M  src/app/w/projects/[projectId]/components/ActiveProjectBar.tsx  (classic view toggle mount)
M  src/app/w/projects/[projectId]/page.tsx             (classic mode pass-through)
A  src/components/ui/ClassicViewToggle.tsx              (61 lines — toggle component)
M  src/components/wrapper/ProjectArtifactsPanel.tsx     (classic mode conditionals)
A  src/lib/uiMode.ts                                   (15 lines — cookie helper)
A  src/middleware.ts                                    (40 lines — route interception)
M  backend/apps/landscaper/ai_handler.py               (model env var + rent-comp instructions)
M  backend/apps/landscaper/tool_registry.py            (geocode_rent_comps registration)
M  backend/apps/landscaper/tool_schemas.py             (geocode_rent_comps schema)
A  backend/apps/landscaper/tools/geocoding_tools.py    (96 lines — geocode_rent_comps)
M  backend/apps/landscaper/tools/map_tools.py          (rent comp source, artifact persist, dedup)
M  src/components/wrapper/ArtifactWorkspacePanel.tsx   (map artifact iframe rendering)
M  src/app/components/CoreUIThemeProvider.tsx           (dark mode forcing)
M  src/app/layout.tsx                                  (html data-attribute for theme)
M  CLAUDE.md                                           (audit date + tool count)
```

## Git Commits

```
cdec064f feat(ui): conditional classic-view toggle + legacy backend audit (5 hours ago)
33b6b83d fix(landscaper): one pin per property on rent-comp maps + honest counts (#87) (6 hours ago)
602cd7ec feat(landscaper): persist the interactive map as a durable artifact (#86) (7 hours ago)
aa51920c feat(landscaper): map rent comps from the right table; offer geocode for missing coords (#85) (9 hours ago)
a5ea1294 fix(landscaper): env-drive CLAUDE_MODEL, default to in-service Sonnet 4.5 (#84) (10 hours ago)
e39fdc0c fix(theme): force dark on /w unified UI + kill first-paint light flash (12 hours ago)
```

## Uncommitted Changes

```
M  CLAUDE.md                                           — audit date bumped to 2026-06-16
M  docs/14-specifications/LANDSCAPER_ADMIN_USER_MANUAL.md  — admin manual updates (prior session carry)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Classic view toggle is on `feature/classic-view-toggle` branch — merge to main when validated.
- [ ] Geocoding backfill — run `backfill_geocoding` management command against existing projects to populate lat/lng columns.
- [ ] Site-plan overlay Phase 2 — rubber-sheet warp deferred; current Phase 1 is rectangular-quad drape only.

## Alpha Readiness Impact

No alpha blocker movement today. All 6 committed today are enhancements/fixes to already-working features (map, Landscaper, theme). The classic view toggle is a UX convenience for alpha testers who need legacy folder/tab access — it doesn't change alpha readiness status.

## Notes for Next Session

- **Branch state**: Currently on `feature/classic-view-toggle`. The classic view toggle + middleware + audit doc are committed but not merged to main. Review and merge if validated.
- **Rent comp map workflow**: Now end-to-end — Landscaper can map rent comps, geocode missing ones, and persist the map as a durable artifact. Test with a project that has rent comps with and without coordinates.
- **CLAUDE_MODEL**: Set `CLAUDE_MODEL` env var on Railway to switch models without deploy. Default is Sonnet 4.5.
- **Admin manual**: `LANDSCAPER_ADMIN_USER_MANUAL.md` has uncommitted changes from a prior session — review and commit or discard.
