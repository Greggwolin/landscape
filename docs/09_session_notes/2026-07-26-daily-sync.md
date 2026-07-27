# Daily Sync — 2026-07-26

**Date**: Saturday, July 26, 2026
**Generated**: Nightly automated sync (updated 23:30 MST)

---

## Work Completed July 26

### Features Added

- **SS16 — `control_map_overlay` chat-driven drape control (#216, 6ab040a3):** New Landscaper tool that lets the user drive the site-plan drape workflow from chat — drape / fit-to-target / set-opacity / scale / rotate / set-warp-mode / nudge / lock / unlock / save. Thin bridge: tool returns an `overlay_command`; `CenterChatPanel` latches + navigates + fires a `landscaper:control_map_overlay` CustomEvent; `MapTab` drains it via the same seam as `extract_plan_image`. Registered UNIVERSAL + map page context. New front-end `drapeCommandBridge.ts` (latch + `resolveDrapeTargetGeometry` + `nudgeCorners`). Tests: tool payload/validation (pytest, 13) + bridge target-resolution/nudge/latch (jest, 8). +632 lines across 9 files.

- **SS15 — TPS overlay read-only parity (#214, 8a3fc8c6):** Saved TPS-warped overlays now render warped in the read-only map view (previously displayed un-warped). `tpsOverlay.ts` expanded with `applyTpsWarpToImage()` for read-only rendering. +162 lines across 3 files.

### Bugs Fixed / In Progress (uncommitted on `fix/drapechat-false-success`)

- **SS18 — drape chat false-success fix (WIP, +281/-100 lines):** The SS16 `control_map_overlay` tool had a silent false-success bug: persist actions (set_opacity, scale, rotate, set_warp_mode, lock, unlock) drove the idle EDIT editor on the front-end — no visible change, no persistence — yet the model still reported success. Fix splits actions into two classes:
  - **PERSIST actions** (set_opacity / scale / rotate / set_warp_mode / lock / unlock): now applied + persisted SERVER-SIDE directly to `tbl_project_overlay` behind an ownership check. Returns `applied=True` with real new value; works even when the user is NOT on the map page.
  - **GEOMETRIC actions** (drape / fit / nudge / save): still route through the front-end bridge (return `applied=False` with bridge command). Message says "map opened for placement" — never a fabricated "Done."
  - New helpers: `_user_can_write_project()`, `_fetch_project_overlays()`, server-side PATCH for each persist action.
  - Thread sidebar race fix (UX-B): `useLandscaperThreads.ts` now dispatches `landscaper:threads-changed` CustomEvent on new thread creation so the `/w/` sidebar list refreshes immediately (was race-prone on count-delta trigger).

### Files Modified (committed)

```
SS16 (#216, 9 files, +632/-4):
  backend/apps/landscaper/tests/test_control_map_overlay.py | 103 +++
  backend/apps/landscaper/tool_registry.py                  |   5 +
  backend/apps/landscaper/tool_schemas.py                   |  52 +++
  backend/apps/landscaper/tools/map_tools.py                | 124 +++
  src/components/map-tab/MapTab.tsx                         | 120 +++
  src/components/wrapper/CenterChatPanel.tsx                |  18 +++
  src/lib/gis/drapeCommandBridge.test.ts                    |  93 +++
  src/lib/gis/drapeCommandBridge.ts                         | 112 +++
  CLAUDE.md                                                 |   9 +-

SS15 (#214, 3 files, +162/-15):
  src/components/map-tab/MapTab.tsx  |  59 ++++++++---
  src/lib/gis/tpsOverlay.test.ts     |  32 +++
  src/lib/gis/tpsOverlay.ts          |  86 +++++++++++++-
```

### Files Modified (uncommitted — branch `fix/drapechat-false-success`)

```
5 files, +281/-100:
  backend/apps/landscaper/tool_schemas.py    |  12 +-
  backend/apps/landscaper/tools/map_tools.py | 306 +++++++++------
  src/components/map-tab/MapTab.tsx          |  37 +--
  src/components/wrapper/CenterChatPanel.tsx |  14 +-
  src/hooks/useLandscaperThreads.ts          |  12 ++
```

## Work Completed July 25 (from earlier sync run)

### Features Added

- **Clarification artifact Phase 2 — frontend renderer (#215, e0c8120c, late Jul 24):** `ClarificationArtifact.tsx` (373 lines) — stepped card renderer for the clarification artifact type.

- **Clarification artifact Phase 3a — apply endpoint (#217, 59261f98, Jul 25):** Backend write-back + engine-delta impact for clarification answers. `POST /api/landscaper/clarification/apply/` — 17 tests including live integration round-trip.

## Git Commits (chronological, Jul 25–26)

```
e0c8120c feat(landscaper): stepped ClarificationArtifact renderer (Phase 2) (#215) — 2026-07-24 21:39
ae032328 docs: nightly health check 2026-07-25 — 2026-07-25 08:01
59261f98 feat(landscaper): clarification apply endpoint (Phase 3a) (#217) — 2026-07-25 10:44
7d1da291 docs: nightly health check 2026-07-26 — 2026-07-26 08:14
8a3fc8c6 fix(map): render saved TPS overlays warped in read-only view (SS15) (#214) — 2026-07-26 10:00
6ab040a3 feat(landscaper): wire drape workflow to chat via the command bridge (SS16) (#216) — 2026-07-26 10:00
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Clarification artifact Phase 3b — frontend Apply button wiring (connect ClarificationArtifact.tsx to the new POST endpoint).
- [ ] Clarification artifact — modal write-back path (for steps that target designed forms rather than direct tool writes).
- [ ] TPS warp — test with real site plans to validate accuracy at scale.
- [ ] SS18 `fix/drapechat-false-success` — 5-file uncommitted diff (+281/-100) ready for review + commit. Server-side persist actions, false-success fix, thread sidebar race fix.

## Alpha Readiness Impact

No alpha blocker movement. SS16 adds tool 284/281 (registered/advertised) — CLAUDE.md already updated in the SS16 commit. SS15 is a rendering correctness fix. SS18 (WIP) is a truthfulness fix for the SS16 tool — no new tools added.

## Notes for Next Session

- **SS18 branch is WIP:** `fix/drapechat-false-success` has 5 files modified with a substantial refactor of `control_map_overlay` (split into persist vs. geometric action classes, server-side PATCH for persist actions). Needs review, tests, and commit. The branch is at parity with main (0 commits ahead) — all changes are in the working tree.
- **Thread sidebar race (UX-B):** `useLandscaperThreads.ts` dispatches `landscaper:threads-changed` on thread creation. Verify the `/w/layout.tsx` sidebar listener picks it up.
- **Clarification arc:** Phase 3b (frontend Apply button wiring) still pending.
