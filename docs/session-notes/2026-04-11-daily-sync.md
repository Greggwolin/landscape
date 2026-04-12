# Daily Sync — April 11, 2026

**Date**: Friday, April 11, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Commit: `9642d2c` — "docs: nightly health check 2026-04-11"

This commit landed the **Ingestion Workbench four-status model refactor** that was WIP on April 10, plus nightly health check artifacts and documentation updates.

### Features Added / Progressed

- **Four-status field classification committed** — Backend now classifies extraction staging rows at read time into `new`/`match`/`conflict`/`pending`, replacing fragile client-side `detectConflicts()`. Eliminates phantom conflict bugs.
- **Conflict resolution UI** — Inline extracted-vs-existing display with click-to-resolve. New `resolveConflict` mutation calls `POST .../extraction-staging/{id}/resolve/`.
- **Bulk accept mutations** — `acceptAllMatches` and `acceptAllNew` for efficient triage of non-conflicting fields.
- **Component extraction** — Monolithic IngestionWorkbench.tsx split into three focused components:
  - `IngestionRightPanel.tsx` (188 lines) — orchestrates right panel layout
  - `ExtractionSummary.tsx` (240 lines) — status counts and summary stats
  - `ExtractionDiffPanel.tsx` (233 lines) — extracted vs existing diff view
- **LandscaperChatThreaded `setInputText`** — Imperative handle for pre-filling chat input from conflict "discuss" buttons.

### Documentation Updated

- CLAUDE.md — Updated Ingestion Workbench section with four-status model details, new component file listings, resolve endpoints
- `IMPLEMENTATION_STATUS_3-8-26.md` — Updated latest section header for four-status model
- `docs/session-notes/2026-04-10-daily-sync.md` — Created (yesterday's WIP captured)
- `docs/UX/health-reports/health-2026-04-11_0800.json` — Nightly health check

### Technical Debt Addressed

- Removed `detectConflicts()` function — source of phantom conflict bugs
- Simplified `FieldRow` component (removed `allRowsForKey`, `isPhantomConflict`, `effectiveStatus`)
- CSS status classes cleaned up: semantic `fd-new`/`fd-match`/`fd-pending`/`fd-conflict`/`fd-accepted`

### Health Check Results (April 11)

| Agent | Status | Notes |
|-------|--------|-------|
| CoreUI Compliance | FAIL | 6,979 violations (5,124 inline styles, 843 forbidden Tailwind) — long-standing debt |
| Django API Route Enforcer | PASS | No new Next.js API routes |
| CLAUDE.md Sync Checker | PASS | No stale files |
| Extraction Queue Monitor | SKIP | Table not found |
| Dead Tool Detector | FAIL | 2 dead table refs in `appraisal_knowledge_tools.py` (`tbl_knowledge_entity`, `tbl_knowledge_fact`) |
| Allowed Updates Auditor | PASS | No mismatches |

## Files Modified

```
 .claude/worktrees/bold-lumiere                                    |   1 +
 .claude/worktrees/elastic-hermann                                 |   1 +
 .claude/worktrees/elegant-cori                                    |   1 +
 .claude/worktrees/serene-easley                                   |   1 +
 CLAUDE.md                                                         |  11 +-
 docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md                  |  15 +-
 docs/UX/health-reports/health-2026-04-11_0800.json                |  73 +++
 docs/session-notes/2026-04-10-daily-sync.md                       |  80 +++
 src/app/.../tabs/IngestionWorkbench.tsx                            | 628 +++---
 src/components/ingestion/ExtractionDiffPanel.tsx                   | 233 +++
 src/components/ingestion/ExtractionSummary.tsx                     | 240 +++
 src/components/ingestion/IngestionRightPanel.tsx                   | 188 +++
 src/components/landscaper/LandscaperChatThreaded.tsx               |   6 +-
 src/hooks/useExtractionStaging.ts                                 | 150 ++-
 src/styles/ingestion-workbench.css                                | 623 +++
 15 files changed, 1800 insertions(+), 451 deletions(-)
```

## Git Commits

```
9642d2c docs: nightly health check 2026-04-11 (Gregg Wolin, 15 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] **Four-status backend endpoints** — Frontend mutations (`resolveConflict`, `acceptAllMatches`, `acceptAllNew`) reference backend endpoints (`/resolve/`, `/accept-all-matches/`, `/accept-all-new/`). Verify `workbench_views.py` has these routes implemented and tested.
- [ ] **Dead tool refs** — `appraisal_knowledge_tools.py` references `tbl_knowledge_entity` and `tbl_knowledge_fact` which don't exist in current schema. Fix or stub.
- [ ] **CoreUI compliance debt** — 6,979 violations. Not blocking alpha but worth tracking. Inline styles (5,124) are the biggest bucket.
- [ ] **`setInputText` wiring** — Imperative handle exists on LandscaperChatThreaded but no conflict row "discuss" button calls it yet.
- [ ] **Stale worktree dirs** — `.claude/worktrees/` has 4 entries. Clean up when convenient.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement today. The four-status model refactor is now **committed** (was WIP yesterday), which solidifies the Ingestion Workbench's field classification and conflict resolution UX. Still listed as PARTIAL pending backend endpoint verification.

## Notes for Next Session

1. **Backend verification is the priority** — Test the `resolve`, `accept-all-matches`, and `accept-all-new` endpoints in `workbench_views.py`. If missing, implement them before end-to-end testing.
2. **Dead tool detector flags** — The `tbl_knowledge_entity` / `tbl_knowledge_fact` references in `appraisal_knowledge_tools.py` are a real issue. These tools will fail at runtime. Either create the tables or update the tools to use the correct table names.
3. **CSS review** — `ingestion-workbench.css` is now 623+ lines. Consider splitting into component-scoped files if it keeps growing.
