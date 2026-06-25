# Daily Sync — June 24, 2026

**Date**: 2026-06-24
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added / Progressed

1. **Studio shell — initial build (`/studio/[projectId]`)** — 4 commits built the new isolated project surface: collapsible two-level left rail generated from `createFolderConfig`, reused `CenterChatPanel` in center, `ProjectContentRouter` output in right panel. Components: `StudioShell.tsx` (+304 lines), `StudioSidebar.tsx` (+385 lines), route files under `src/app/studio/[projectId]/`. Artifact access moved from left rail to right-panel header for cleaner layout. (`c02c92b1`, `927c5e02`)

2. **Chat-driven screen navigation (`navigate_to_screen` tool)** — New Landscaper tool lets chat drive the studio right panel. Folder-based routing: "show me the budget" → `navigate_to_screen('budget')` opens the live editable budget grid inline, not a modal or artifact. Studio subscriber in `landscape-command-bus.ts` bridges tool output → panel. `WrapperSidebar.tsx` gained +235 lines for `/w/` layout bridge. (`7abed8fb`)

3. **Budget fabrication guard + S17 regression test** — New scenario `scenario_s17_budget.py` (+106 lines) asserts that Landscaper reads budget via `get_budget_items` and returns real totals ($40,244,250 for Peoria Meadows), never fabricated figures. Calibration + test modes. (`1ce7bbb6`)

### Bugs Fixed / Guards Added

4. **Generalized no-fabrication guard** — Extended the budget-specific fabrication guard to ALL financial figures: IRR, NPV, equity multiple, promote, pref, hurdle, profit, invested capital, returns, cash flow, rent, cap rate, value. Requires `calculate_*` tools; says so plainly when calculation can't run. Scale-sanity tell prevents shipping numbers wildly out of proportion (e.g., $278M profit on a $40M project). (+11 lines in `ai_handler.py`) (`6858608e`)

5. **NAV-vs-DATA routing fix** — "Show me the budget" now correctly routes to `navigate_to_screen('budget')` (the live editable form) instead of `create_artifact` / `render_report_as_artifact` (read-only summary). `open_input_modal` reserved exclusively for single-record edits. Inherently-computed views (equity waterfall, location brief, cash flow) remain the exception. (`54b5a523`, `6d3e941d`)

## Git Commits (7 today)

```
6d3e941d fix(studio): 'show me the budget' opens the live editable budget form, not an artifact
6858608e fix(landscaper): generalize no-fabrication guard to all financial figures
54b5a523 fix(studio): open screens in the panel via navigate_to_screen, not a modal
1ce7bbb6 feat(studio): budget-fabrication guard + regression test (pairs with chat-nav 7abed8fb)
7abed8fb feat(studio): chat drives the screens — navigate_to_screen tool + studio subscriber
927c5e02 feat(studio): move artifact access from left rail to right-panel header
c02c92b1 feat(studio): isolated /studio left-nav shell — folder tree + artifacts + declutter
```

## Files Modified (Committed)

```
 CLAUDE.md                                         |   4 +-
 backend/apps/landscaper/ai_handler.py             |  45 ++-
 backend/apps/landscaper/tool_registry.py          |   1 +
 backend/apps/landscaper/tool_schemas.py           |  30 ++
 backend/apps/landscaper/tools/navigation_tools.py |  43 +++
 src/app/components/CoreUIThemeProvider.tsx         |   5 +-
 src/app/components/NavigationLayout.tsx            |   7 +-
 src/app/studio/[projectId]/layout.tsx             |  88 +++++
 src/app/studio/[projectId]/page.tsx               |  32 ++
 src/app/w/layout.tsx                              |  19 +-
 src/components/studio/StudioShell.tsx             | 304 +++++++++++++++++
 src/components/studio/StudioSidebar.tsx           | 385 ++++++++++++++++++++++
 src/components/wrapper/CenterChatPanel.tsx        |   7 +
 src/components/wrapper/WrapperSidebar.tsx         | 235 ++++++++++++-
 src/lib/landscape-command-bus.ts                  |  11 +
 src/styles/studio.css                             |  56 ++++
 tests/agent_framework/run.py                      |   6 +
 tests/agent_framework/scenario_s17_budget.py      | 106 ++++++
 18 files changed, 1374 insertions(+), 10 deletions(-)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Studio shell is functional but early — needs testing across property types and edge cases (empty projects, projects with no budget data, etc.)
- [ ] `navigate_to_screen` tool only covers folder-level routing; sub-tab routing (e.g., "show me the income approach") not yet wired
- [ ] S17 budget fabrication test needs calibration run against live Landscaper endpoint

## Alpha Readiness Impact

No alpha blockers moved. Today's work is additive (new Studio surface) and defensive (fabrication guards). The fabrication guard is a significant quality improvement — prevents Landscaper from inventing financial figures, which was a real risk observed in testing.

## Notes for Next Session

- The Studio shell (`/studio/[projectId]`) is a third navigation surface coexisting with `/w/` and `/projects/[id]`. It's not meant to replace either — it's an experiment in putting the folder/tab tree alongside the chat panel.
- The generalized no-fabrication guard in `ai_handler.py` is ~45 lines of BASE_INSTRUCTIONS. If it proves stable, the older budget-only guard text can be consolidated.
- `StudioSidebar.tsx` (not `StudioLeftNav.tsx`) is the correct component name — CLAUDE.md's Studio shell paragraph references the wrong filename.
- `navigate_to_screen` is the 3rd tool in `navigation_tools.py` (joining `navigate_to_project` and `navigate_to_dashboard`). Tool count should be updated in CLAUDE.md.
