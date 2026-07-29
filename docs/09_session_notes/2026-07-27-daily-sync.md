# Daily Sync — 2026-07-27

**Date**: Sunday, July 27, 2026
**Generated**: Nightly automated sync (23:30 MST)

---

## Work Completed July 27

### Features Added

- **Budget variance review tool — CB2 §3 (#220, 78e3d3d6):** New `review_budget_variance` Landscaper tool that compares a project's budget line items against the firm's other deals. Backend: `variance_service.py` (+376 lines) computes per-category variance with peer percentile rankings; `variance_artifact_builder.py` (+170 lines) renders a structured artifact with flagged outliers. Executor registered in `tool_executor.py` (+92 lines). Schema added to `tool_schemas.py`. Gate: added to `LAND_ONLY_TOOLS` and `INCOME_PROPERTY_TOOLS` in `tool_registry.py`. Tests: `test_budget_variance.py` (+238 lines). Total: +929/-1 across 7 files. Tool count: **285 registered / 282 advertised** (was 284/281).

- **Clarification artifact Phase 3b — Apply button + review state + modal-target launch (#219, e71177ff):** `ClarificationArtifact.tsx` expanded (+335/-57 lines) with an Apply button that commits the user's selected option, a review state showing what was applied, and modal-target launch that opens the relevant designed form (via `open_input_modal`) when the clarification resolves to a data-entry screen. `ArtifactWorkspacePanel.tsx` updated (+1 line).

- **SS18 — drape-by-chat false-success fix + chat UX (#218, 4ce4ccc8):** The SS16 `control_map_overlay` tool had a silent false-success bug: persist actions (set_opacity, scale, rotate, set_warp_mode, lock, unlock) drove the idle EDIT editor on the front-end with no visible change, yet the model reported success. Fix splits actions into two classes:
  - **PERSIST actions** now applied + persisted SERVER-SIDE directly to `tbl_project_overlay` behind ownership check. Returns `applied=True` with real new value; works even when user is not on the map page.
  - **GEOMETRIC actions** (drape / fit / nudge / save) still route through the front-end bridge (return `applied=False` with bridge command).
  - New helpers: `_user_can_write_project()`, `_fetch_project_overlays()`, server-side PATCH per persist action.
  - Thread sidebar race fix (UX-B): `useLandscaperThreads.ts` dispatches `landscaper:threads-changed` CustomEvent on new thread creation so `/w/` sidebar refreshes immediately.
  - Tests expanded: `test_control_map_overlay.py` (+194/-? lines). Total: +433/-142 across 6 files.

### Infrastructure / DevOps

- **FB-304 recurrence guard — commit-msg hook (f0c8269c):** New `.husky/commit-msg` hook (+46 lines) blocks source code from being committed under a `docs: nightly health check` message — prevents the FB-304 class of bug (unintended source in nightly-docs commits). `fb304-deny-regex.sh` helper (+16 lines). `commit-generated-docs.sh` updated to set the message in a way the hook can match.

### Documentation

- **PROJECT_INSTRUCTIONS.md** — updated (uncommitted, left for review): v4.7.2 → v4.7.3. New §10.7 (Date stamps must be verified against the system clock — HARD RULE) with six sub-rules. Triggered by a 2026-07-27 audit finding two feature memos carrying a template's `11/19/2024` for nine months. Anti-pattern bullet added to §6; success metric to §20.

## Files Modified (committed today)

```
 .husky/commit-msg                                  |  46 +++
 backend/apps/landscaper/ai_handler.py              |  12 +-
 backend/apps/landscaper/services/variance_service.py | 376 ++++++++++++
 backend/apps/landscaper/tests/test_budget_variance.py | 238 ++++++++
 backend/apps/landscaper/tests/test_control_map_overlay.py | 194 ++++---
 backend/apps/landscaper/tool_executor.py           |  92 +++++
 backend/apps/landscaper/tool_registry.py           |   4 +
 backend/apps/landscaper/tool_schemas.py            |  50 +-
 backend/apps/landscaper/tools/map_tools.py         | 306 +++++++---
 backend/apps/landscaper/tools/variance_artifact_builder.py | 170 ++++++
 docs/09_session_notes/2026-07-26-daily-sync.md     |  87 ++--
 scripts/nightly/commit-generated-docs.sh           |   6 +-
 scripts/nightly/fb304-deny-regex.sh                |  16 +
 src/components/map-tab/MapTab.tsx                  |  37 +-
 src/components/wrapper/ArtifactWorkspacePanel.tsx  |   1 +
 src/components/wrapper/CenterChatPanel.tsx         |  14 +-
 src/components/wrapper/ClarificationArtifact.tsx   | 391 ++++++++++---
 src/hooks/useLandscaperThreads.ts                  |  12 +
 18 files changed, 1822 insertions(+), 230 deletions(-)
```

## Git Commits (today)

```
78e3d3d6 feat(landscaper): budget variance review vs the firm's other deals (CB2 §3) (#220)
e71177ff feat(clarification): Apply button + review state + modal-target launch (Phase 3b) (#219)
4ce4ccc8 SS18 — drape-by-chat applies for real; no false success (+ chat UX) (#218)
f0c8269c chore(git): FB-304 recurrence guard — commit-msg hook blocks source in nightly-docs commits
439cefff docs: nightly health check 2026-07-27
```

## Uncommitted Changes

```
 M docs/PROJECT_INSTRUCTIONS.md    (v4.7.3 — date-stamp verification rule §10.7)
```

Left for developer review per nightly sync policy (curated source-of-truth doc).

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] `tool_schemas.py` header claims "Tool count: 245" — actual advertised count is 282. Header is stale.
- [ ] 51 advertised schemas have no registered executor (see nightly scan output). These are legacy schemas that were never wired or whose executors were removed — should be cleaned up or wired.

## Alpha Readiness Impact

No alpha blocker movement today. All work was feature expansion (budget variance, clarification UX, drape-chat hardening) and infrastructure (FB-304 guard). The remaining alpha blocker (scanned-PDF / OCR pipeline) is unchanged.

## Notes for Next Session

1. **Tool count is now 285 registered / 282 advertised.** The `review_budget_variance` tool was added today. CLAUDE.md should be updated (noted below as curated doc left for review).
2. **Clarification artifacts are now Phase 3b complete** — Apply button, review state, and modal-target launch all shipped. The full clarification flow (open → select → apply → see result) is end-to-end.
3. **SS18 fixed the drape false-success class** — persist actions now go server-side. This was a silent-failure bug where the model reported success but nothing happened on screen.
4. **PROJECT_INSTRUCTIONS.md v4.7.3 is uncommitted** — new date-stamp rule §10.7. Needs review + commit + paste into Cowork project settings per §0.4.
