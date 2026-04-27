# Daily Sync — April 23, 2026

**Date**: Wednesday, April 23, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added / Progressed
- **`generate_location_brief` universal tool** (commit 5e82a9e, 1,529 insertions): Full-stack location intelligence tool that works pre-project from unassigned chat threads. Backend Django service package with Nominatim geocoding, FRED economic data, Census ACS 5-Year 2023 demographics, and Anthropic narrative generation. Persistent cache in new `tbl_location_brief` table (migration 20260423) keyed on `(user_id, location_key, depth)` with release-schedule invalidation. Three depth tiers: condensed (~1,400 tokens), standard (~2,400), comprehensive (~4,000). Registered in both `UNIVERSAL_TOOLS` and `UNASSIGNED_SAFE_TOOLS`. Tool count: 260 → 261.
- **LocationBriefArtifact rework** (commits 3b53789 + c7a69a5, two rounds): Round 1 switched to card-based layout with green accents, added draggable right panel width (320–900px, 420px default, left-edge handle) on `/w/chat` aside and `ProjectArtifactsPanel`. Round 2 replaced with tabular indicator tiles (Geography / Value / YoY with colored arrows), condensed exec summary in accent callout with show/hide toggle, and hardcoded light palette to prevent dark-mode bleed through CoreUI tokens.
- **CreateProjectCTA component**: Contextual "Create Project" prompt shown in artifacts panel when location brief resolves city, state, and property type.
- **Draggable right panel**: Both `/w/chat` layout aside and `ProjectArtifactsPanel` now support pointer-drag resizing (mirrors left sidebar pattern).

### Backend Changes
- New Django service: `backend/apps/knowledge/services/location_brief/service.py` (794 lines)
- New tool file: `backend/apps/landscaper/tools/location_brief_tools.py` (81 lines)
- Tool registry + schema updates for `generate_location_brief`
- Narration prompt updated in Round 2 to use directional language rather than restating raw tile numbers

### Frontend Changes
- `LocationBriefArtifact.tsx` — 721-line artifact renderer (after two rewrites)
- `CreateProjectCTA.tsx` — 120-line project creation prompt
- `src/app/w/layout.tsx` — draggable aside + location brief slot for unassigned routes
- `ProjectArtifactsPanel.tsx` — draggable width + location brief priority branch
- `CenterChatPanel.tsx` — location brief dispatch
- `WrapperUIContext.tsx` — expanded panel state management

### Database
- New migration: `migrations/20260423_location_brief.sql` — creates `tbl_location_brief` table with persistent cache

## Files Modified

```
CLAUDE.md                                                    |  12 changes
backend/apps/knowledge/services/location_brief/__init__.py   |   4 new
backend/apps/knowledge/services/location_brief/service.py    | 806 new + changes
backend/apps/landscaper/tool_executor.py                     |   1 change
backend/apps/landscaper/tool_registry.py                     |   4 changes
backend/apps/landscaper/tool_schemas.py                      |  28 changes
backend/apps/landscaper/tools/location_brief_tools.py        |  81 new
migrations/20260423_location_brief.sql                       |  56 new
src/app/w/layout.tsx                                         | 110 changes
src/components/wrapper/CenterChatPanel.tsx                   |  15 changes
src/components/wrapper/CreateProjectCTA.tsx                  | 120 new
src/components/wrapper/LocationBriefArtifact.tsx             | 721 new (after rewrites)
src/components/wrapper/ProjectArtifactsPanel.tsx             |  78 changes
src/contexts/WrapperUIContext.tsx                            |  45 changes
```

## Git Commits

```
c7a69a5 feat(location-brief): Round 2 — tabular tiles + condensed summary toggle + light theme (16:01)
3b53789 Rework location brief artifact + make right panel draggable (15:12)
5e82a9e feat(landscaper): generate_location_brief universal tool (14:26)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Chat search overlay wired but needs backend thread search endpoint for full-text search across messages.
- [ ] Test location brief with various city/state combinations and property types to validate FRED series coverage and Census data availability.
- [ ] Location brief `force_refresh` path — verify cache invalidation works when FRED release dates pass.
- [ ] Test manifests S11-S13 added (Apr 22) — need to run full agent framework test suite to validate.

## Alpha Readiness Impact

No alpha blocker movement. All 6 original blockers remain resolved. Today's work adds a new pre-project capability (location intelligence) that strengthens the onboarding flow but doesn't change blocker status. OCR pipeline remains the only outstanding gap.

## Notes for Next Session

- The location brief artifact went through two visual iterations today. Final version uses tabular indicator tiles at top with a condensed exec summary below. The hardcoded light palette (explicit hex values) was necessary because CoreUI CSS variables bled dark-mode colors into the artifact.
- The `narrate_brief` prompt was updated to use directional language ("elevated", "softening", "above national average") rather than restating raw numbers already visible in the indicator tiles. This applies only to new briefs or `force_refresh` — cached briefs retain their original narrative.
- Right panel drag-to-resize is implemented on both the `/w/chat` aside and `ProjectArtifactsPanel`. Range is 320–900px with 420px default.
- `CreateProjectCTA` only renders when the location brief has `project_ready: true` (city + state + property_type resolved).
