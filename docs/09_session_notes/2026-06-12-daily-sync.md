# Daily Sync — June 12, 2026

**Date**: Thursday, June 12, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### No Commits Today

No commits landed on June 12. All work below is uncommitted (unstaged or staged).

### Uncommitted Work In Progress (New Since Jun 11 Sync)

Significant uncommitted changes across 16 files (+171, -54 lines). Key themes: **FB-315 operating-statement % EGI column**, **FB-313 feedback + Help UX fixes**, **auth-header hardening across reports + knowledge-library**, and **admin-aware sidebar** (carried from Jun 10).

#### 1. Operating Statement — % EGI Column (FB-315)

ARGUS-style expense-ratio column added to operating-statement artifacts and the RPT_09 report generator.

- **`operating_statement_guard.py`** — `pct_egi` added as a 4th optional column key (alongside `line` / `annual` / `per_unit`). Guard guidance text updated.
- **`rpt_09_operating_statement.py`** — Report generator rewritten from 3-column `% of GPR` shape to 4-column `Line / Annual / $/Unit / % EGI` shape. Helper `_row()` function computes per-unit and % EGI in one place. Section renamed from "Income & Expense Waterfall" to "Income & Expense Statement". Added "Total Operating Expenses" subtotal row.
- **`artifact_adapter.py`** — `percent` format type added to the column format whitelist; `percentage` → `percent` alias so generators and renderer use the same vocabulary.
- **`ArtifactRenderer.tsx`** — `formatCellValue` extended with `percent` format: `42.1%` display, parens negatives `(3.2%)`, em-dash zero. String-path also handles pre-formatted `%` suffix stripping.
- **`artifact.ts`** — `TableColumn.format` union type extended with `'percent'`.

#### 2. Feedback + Help UX Fixes (FB-313)

- **`feedback_utils.py`** — Empty-after-strip guard: `capture_feedback` now returns `None` (skipping Discord + DB insert) when the stripped text is blank. Prevents ghost feedback rows from bare `#FB` messages.
- **`views_help.py`** — Matching empty-after-strip guard in the Help chat view: if the message is *only* `#FB` with no content, the endpoint returns a user-facing ack ("I see the #FB tag but no message…") instead of creating a blank feedback row.
- **`HelpLandscaperContext.tsx`** — `buildCurrentPage()` function extended to handle `/w/` shell routes. Previously all chat-first UI pages fell through to `undefined`, tagging every Help submission as "general". Now properly resolves: `/w/projects/17/reports` → `"reports"`, `/w/chat` → `"chat"`, `/w/dashboard` → `"home"`, etc.

#### 3. Auth-Header Hardening

- **`useReports.ts`** — All 7 `fetch()` calls to Django report endpoints now include `getAuthHeaders()`. Fixes silent 401s when session cookies weren't forwarded.
- **`DocClassificationBar.tsx`** — All 4 mutation calls (PATCH doc_type, PATCH property_type, DELETE geo-tag, POST geo-tag) now include auth headers.
- **`KnowledgeLibraryPanel.tsx`** — Library search POST now includes auth headers.
- **`UploadDropZone.tsx`** — Library upload POST now includes auth headers (note: no `Content-Type` header — browser sets multipart boundary for FormData).

#### 4. Admin-Aware Sidebar (Carried from Jun 10)

- **`WrapperSidebar.tsx`** — `isAdmin` prop filters nav: admin users see dedicated "Feedback" link; non-admins see "Help / Feedback" label.
- **`src/app/w/layout.tsx`** — Passes `isAdmin={user?.is_staff === true}` to sidebar.

#### 5. CLAUDE.md Updates (Carried from Jun 9)

Technical debt section updated (TypeScript errors + pytest suite marked RESOLVED). Last-audit footer updated to Jun 9.

## Files Modified

```
Staged (from prior syncs, not yet committed):
  docs/09_session_notes/2026-06-10-daily-sync.md    |  68 +++
  docs/09_session_notes/2026-06-11-daily-sync.md    |  81 +++

Unstaged (WIP):
  CLAUDE.md                                         |   7 +-
  backend/apps/artifacts/operating_statement_guard.py|  18 +-
  backend/apps/landscaper/feedback_utils.py          |  11 +
  backend/apps/landscaper/views_help.py              |  28 +
  backend/apps/reports/artifact_adapter.py           |   7 +-
  backend/apps/reports/generators/rpt_09_operating_statement.py | 52 +-
  docs/daily-context/session-log.md                  |  24 +
  src/app/w/layout.tsx                               |   1 +
  src/components/admin/knowledge-library/DocClassificationBar.tsx | 8 +-
  src/components/admin/knowledge-library/KnowledgeLibraryPanel.tsx | 2 +-
  src/components/admin/knowledge-library/UploadDropZone.tsx | 2 +
  src/components/wrapper/ArtifactRenderer.tsx         |  17 +-
  src/components/wrapper/WrapperSidebar.tsx           |  18 +
  src/contexts/HelpLandscaperContext.tsx              |  14 +
  src/hooks/useReports.ts                            |  14 +-
  src/types/artifact.ts                              |   2 +-

Untracked:
  docs/09_session_notes/2026-06-09-daily-sync.md     (from Jun 9 sync, never staged)
  docs/09_session_notes/2026-06-12-daily-sync.md     (this file)
  reference/images/screenshots/capture-*/             (3 capture output dirs)
```

## Git Commits

None today.

## Active To-Do / Carry-Forward

- [ ] **Commit accumulated work.** 4 nightly syncs (Jun 9–12) + CLAUDE.md + session-log.md are staged or ready. The FB-315 / FB-313 / auth-header / sidebar changes span 16 files and should be committed as one or two focused commits.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline remains unimplemented (alpha blocker)
- [ ] ESLint `ignoreDuringBuilds` still true — separate cleanup from TS gate
- [ ] ~30 backend tests still quarantined (skipped) from Jun 9 cleanup

## Alpha Readiness Impact

No alpha blocker movement today. The FB-315 operating-statement work improves artifact quality (closer to ARGUS parity) but doesn't change the blocker count. Auth-header hardening fixes potential silent 401s in production — a deployment correctness issue, not an alpha blocker.

## Notes for Next Session

- **Commit backlog is growing.** 4 nightly sync files, CLAUDE.md updates, session-log entry, and meaningful code changes (FB-315, FB-313, auth headers) are all uncommitted. Suggested commit strategy:
  1. `git add -A docs/ CLAUDE.md` → `git commit -m "docs: nightly sync Jun 9–12"`
  2. Stage FB-315 files → `git commit -m "feat(artifacts): add % EGI column to operating statement (FB-315)"`
  3. Stage FB-313 files → `git commit -m "fix(feedback): empty #FB guard + /w/ page context (FB-313)"`
  4. Stage auth-header files → `git commit -m "fix(auth): add auth headers to reports + knowledge-library fetches"`
  5. Stage sidebar files → `git commit -m "feat(sidebar): admin-aware feedback nav"`
- The `pct_egi` column is optional in the guard — existing operating-statement artifacts without it will still validate.
