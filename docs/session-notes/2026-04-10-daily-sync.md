# Daily Sync — April 10, 2026

**Date**: Thursday, April 10, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### No commits today (last commit: April 8)

All work today is **uncommitted WIP** — a major refactor of the Ingestion Workbench field status model.

### Features Added / Progressed

- **Four-status classification model** — Backend now classifies extraction staging rows at read time into `new` (no existing value), `match` (extracted = existing), `conflict` (extracted ≠ existing), and `pending` (fallback). Replaces client-side `detectConflicts()` which was fragile and produced phantom conflicts.
- **Conflict resolution UI** — Inline side-by-side display of extracted vs existing values. Click-to-resolve (choose "extracted" or "existing"). New `resolveConflict` mutation calls `POST .../extraction-staging/{id}/resolve/`.
- **Bulk accept mutations** — `acceptAllMatches` (bulk-accept rows where extracted = DB) and `acceptAllNew` (bulk-accept rows with no existing value). Scoped by section.
- **New ingestion components** — Extracted from monolithic IngestionWorkbench.tsx into:
  - `IngestionRightPanel.tsx` (188 lines) — orchestrates right panel layout
  - `ExtractionSummary.tsx` (240 lines) — status counts and summary stats
  - `ExtractionDiffPanel.tsx` (233 lines) — extracted vs existing diff view
- **LandscaperChatThreaded `setInputText`** — New imperative handle method allows parent components to pre-fill chat input without sending (for "discuss" buttons on conflict rows).

### Technical Debt Addressed

- Removed `detectConflicts()` function (~30 lines) — phantom conflict logic was a recurring source of bugs
- Simplified `FieldRow` component — removed `allRowsForKey` prop, `isPhantomConflict` logic, `effectiveStatus` indirection
- Cleaned up CSS status classes — replaced ad-hoc `fd-ok`/`fd-warn`/`fd-danger` with semantic `fd-new`/`fd-match`/`fd-pending`/`fd-conflict`/`fd-accepted`
- `StagingRow` type updated with `existing_value`, `existing_source`, `target_table`, `target_field` fields from backend

### Bugs Fixed

- Phantom conflict display eliminated — conflicts with no competing values no longer show misleading "⚠ Conflict — 0 values" UI

## Files Modified (Uncommitted)

```
 src/app/projects/[projectId]/components/tabs/IngestionWorkbench.tsx  | 628 +++ --- (major refactor)
 src/components/landscaper/LandscaperChatThreaded.tsx                 |   6 +-  (setInputText handle)
 src/hooks/useExtractionStaging.ts                                    | 150 +++ --- (four-status model)
 src/styles/ingestion-workbench.css                                   | 623 +++ (new status styles)
```

### New Files (Untracked)

```
 src/components/ingestion/ExtractionDiffPanel.tsx   (233 lines)
 src/components/ingestion/ExtractionSummary.tsx      (240 lines)
 src/components/ingestion/IngestionRightPanel.tsx     (188 lines)
```

**Total: 4 modified, 3 new — ~962 insertions, ~445 deletions**

## Git Commits (Last 3 Days)

```
0dab080 fix(dms): remount UploadStagingProvider on project change (#3) (Gregg Wolin, 2 days ago)
09dfa5a fix(ci): use neondb_owner role across Neon scripts (Gregg Wolin, 2 days ago)
d564550 fix(ci): use 'production' as Neon parent branch, not 'main' (Gregg Wolin, 2 days ago)
```

## Active To-Do / Carry-Forward

- [ ] **Four-status backend endpoint** — The frontend mutations (`resolveConflict`, `acceptAllMatches`, `acceptAllNew`) reference backend endpoints (`/resolve/`, `/accept-all-matches/`, `/accept-all-new/`) that may not be implemented yet. Verify `workbench_views.py` has these routes before testing.
- [ ] **Commit four-status refactor** — Large uncommitted diff (962 insertions). Should be committed once backend endpoints confirmed working.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Worktree directories exist (`.claude/worktrees/`) — clean up stale worktrees when convenient.

## Alpha Readiness Impact

No alpha blocker movement today. The four-status model improves the Ingestion Workbench UX significantly (clearer field states, better conflict resolution) but was already listed as PARTIAL in the alpha assessment. This work moves it closer to full readiness.

## Notes for Next Session

1. **Backend verification needed** — The frontend four-status code expects `resolve/`, `accept-all-matches/`, and `accept-all-new/` endpoints on the workbench API. Check `workbench_views.py` for these routes. If missing, they need to be created before the frontend refactor can be tested end-to-end.
2. **CSS is substantial** — `ingestion-workbench.css` grew by 623 lines. May want to review for redundancy or split into component-scoped styles.
3. **The `match` status with "= DB" badge** is a nice UX touch — lets users quickly see which extracted values already agree with the database, enabling confident bulk-accept.
4. **`setInputText` on LandscaperChatThreaded** — Wired but likely not yet called from any conflict row "discuss" button. Wire that up when ready.
