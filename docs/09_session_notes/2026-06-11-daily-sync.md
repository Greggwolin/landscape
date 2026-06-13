# Daily Sync — June 11, 2026

**Date**: Wednesday, June 11, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added

- **Demo screenshot capture tooling** (`3972960a`, `4dd6e29d`, `9fbe8972`). Three commits building out an automated screenshot capture pipeline for demo/marketing purposes:
  - `capture_screenshots.mjs` — Playwright-based script that logs in, navigates the `/w/` shell, and captures full-page screenshots of key surfaces. Capture plan documented in `SCREENSHOT_CAPTURE_PLAN.md`.
  - Fix pass: suppress the Help flyout during capture, wait out "Loading" placeholder text before snapping.
  - `capture_artifact_threads.mjs` — Second script targeting artifact-thread screenshots: navigates to specific chat threads, opens artifacts in the right panel, captures the chat-driven UI with artifacts visible. Outputs to timestamped `capture-artifacts-*` directories.

### Documentation

- **DB table naming convention v1.0** (`beda3985`). New `docs/05-database/DB_TABLE_NAMING_CONVENTION.md` — codifies the prefix registry (`tbl_`, `core_fin_fact_`, `lkp_`, `lu_`, `fact_`), archive-table naming rule, and field-catalog sync rule. 91 lines.

### Uncommitted Work In Progress (Carried from Jun 10)

Two files remain unstaged from a prior session — admin-aware sidebar navigation:
- **`src/app/w/layout.tsx`** — Passes `isAdmin={user?.is_staff === true}` to `WrapperSidebar`.
- **`src/components/wrapper/WrapperSidebar.tsx`** — New `isAdmin` prop: admin users see dedicated "Feedback" link; non-admins see "Help / Feedback" (feedback via Help flyout `#FB`). ~18 lines.

### Still-Staged from Jun 9 Nightly Sync

CLAUDE.md and session-log.md updates from the Jun 9 nightly sync were staged but never committed (no commits landed Jun 10). They're still staged alongside today's work.

## Files Modified

```
Committed today:
  scripts/screenshots/SCREENSHOT_CAPTURE_PLAN.md    |  74 +++
  scripts/screenshots/capture_screenshots.mjs       | 290 +++
  scripts/screenshots/capture_artifact_threads.mjs  | 184 +++
  docs/05-database/DB_TABLE_NAMING_CONVENTION.md     |  91 +++

Staged (from Jun 9 sync, not yet committed):
  CLAUDE.md                                         |   7 +-
  docs/09_session_notes/2026-06-09-daily-sync.md    | 100 +++
  docs/daily-context/session-log.md                 |  24 +

Unstaged (WIP):
  src/app/w/layout.tsx                              |   1 +
  src/components/wrapper/WrapperSidebar.tsx          |  18 +

Untracked:
  docs/09_session_notes/2026-06-10-daily-sync.md
  reference/images/screenshots/capture-*/            (3 capture output dirs)
```

## Git Commits

```
9fbe8972 2026-06-11 14:15 feat(tooling): artifact-thread screenshot capture for chat-driven UI shots
4dd6e29d 2026-06-11 12:26 fix(tooling): screenshot capture — suppress help flyout, wait out Loading placeholders
beda3985 2026-06-11 11:29 docs(db): add table naming convention v1.0 — prefix registry, archive-table rule, field-catalog sync rule
3972960a 2026-06-11 11:28 feat(tooling): demo screenshot capture script + plan
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Commit admin-aware sidebar nav (WrapperSidebar `isAdmin` prop) once verified
- [ ] Commit accumulated staged doc files (Jun 9 sync + Jun 10 sync + Jun 11 sync)
- [ ] Scanned PDF / OCR pipeline remains unimplemented (alpha blocker)
- [ ] ESLint `ignoreDuringBuilds` still true — separate cleanup from TS gate
- [ ] ~30 backend tests still quarantined (skipped) from Jun 9 cleanup

## Alpha Readiness Impact

No movement on alpha blockers today. Today's work was tooling (demo screenshots) and documentation (DB naming conventions). Status unchanged at ~92% alpha-ready.

## Notes for Next Session

- Three nightly sync files (Jun 9, 10, 11) and CLAUDE.md updates are all staged or ready to stage. Consider batching into a single commit: `git commit -m "docs: nightly sync Jun 9–11"`.
- The screenshot capture scripts are functional but the output directories (`capture-*`) are untracked — decide whether to gitignore them or commit selected screenshots for the demo deck.
- The `isAdmin` sidebar feature still references `NAV_ITEMS` entry `id: 'admin-feedback'` — verify that ID exists in the constant before committing.
