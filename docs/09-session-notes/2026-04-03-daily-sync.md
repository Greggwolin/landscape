# Daily Sync — April 3, 2026

**Date**: Thursday, April 3, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

**No new commits on April 3.** Last commit was `d161a46` (v0.1.17 bump, April 2). However, substantial uncommitted work exists from April 2 sessions (22 files changed, +826 / -300 lines). Summary of uncommitted work below.

### Features Added or Progressed

- **Ingestion Workbench "Finish Later" + Draft Resume** — Replaced destructive-only cancel with 3-way choice (Go Back / Finish Later / Discard & Delete). Floating resume banner at bottom-right detects paused `draft` intake sessions, shows doc name, and offers Resume or Dismiss buttons. `IntakeStartView.get()` now returns `docName` via `select_related('doc')`.
- **DMS Doc Type Reassignment Endpoint** — New `POST /api/dms/projects/{pid}/doc-types/{id}/reassign/` (Django) reassigns all documents from one doc type to another before filter deletion. Case-insensitive matching. Frontend wired with reassignment modal that appears when deleting a filter that has documents.
- **Doc Type Combobox** — New `DocTypeCombobox.tsx` component for autocomplete selection from all template doc types. New `GET /api/dms/templates/all-doc-types` Next.js endpoint serves deduplicated doc types across templates.
- **IntakeChoiceModal Doc Type Selector** — Fetches project doc types on open, pre-selects based on auto-detection, allows user override before starting ingestion.
- **Brokerage Research Agent Enhancements** — Major rewrite of CW column mapping (`CW_COLUMN_MAP`) with dynamic unit resolution, support for direct/sublet vacancy, weighted avg net rent, and more granular absorption metrics. New brokerage PDF data directory.

### Bugs Fixed

- **Navigation guard message updated** — BeforeUnload dialog now says "Use Finish Later to save progress" instead of generic "Changes will be lost."
- **Workbench phantom conflict handling** — Carried forward from v0.1.17 commit.

### Documentation Updated

- Session log (`docs/daily-context/session-log.md`) — 3 new entries: Ingestion Workbench Finish Later, Market Agents Round 2, Agent Architecture Phase 0.

### Known Issues Introduced or Discovered

- Race condition when rejecting staging rows during active extraction (user-reported "gets stuck").
- Brokerage agent `_extract_market_data` needs wiring to parse extracted tables into `tbl_research_financial_data` records.

### Pending/Incomplete Work

- Guide content rewrite (`guideContent.ts`) — 332 lines changed, unclear if complete.
- Ingestion workbench CSS tweaks — 16 lines changed.

## Files Modified (Uncommitted)

```
backend/apps/documents/tag_views.py                (+44)
backend/apps/documents/urls.py                     (+2)
backend/apps/landscaper/views.py                   (+3, -1)
services/market_agents/.../brokerage_research_agent.py (+118)
src/app/projects/[projectId]/ProjectLayoutClient.tsx (+159)
src/app/projects/[projectId]/.../IngestionWorkbenchPanel.tsx (+4)
src/app/projects/[projectId]/.../IngestionWorkbench.tsx (+19)
src/components/dms/DMSView.tsx                     (+210)
src/components/dms/filters/AccordionFilters.tsx    (+66)
src/components/intelligence/IntakeChoiceModal.tsx  (+87)
src/data/guideContent.ts                           (+332, -300 rewrite)
src/styles/ingestion-workbench.css                 (+16)
docs/daily-context/session-log.md                  (+58)
```

**New files (untracked):**
```
src/components/dms/filters/DocTypeCombobox.tsx
src/app/api/dms/templates/all-doc-types/route.ts
services/market_agents/data/brokerage/ (PDF data directory)
scripts/guide/gen_ch5_pdf.py
```

## Git Commits (Last 3 Days)

```
d161a46 chore: bump version to v0.1.17 (Apr 2)
a65dd82 fix: Census BPS agent CSV rewrite, async extraction, phantom conflict handling (Apr 2)
1a19fee chore: bump version to v0.1.16 (Apr 2)
dfc1f87 Add market intelligence agent fleet (8 new research agents + orchestrator upgrades) (Apr 2)
8e5ec78 docs: nightly health check 2026-04-02 (Apr 2)
22dfa3f Update marketing site to CoreUI dark theme tokens (Apr 1)
bce59bd Add static marketing site (Apr 1)
e627800 chore: bump version to v0.1.15 (Apr 1)
f058293 fix: add missing transformDjangoResponse shared module (Apr 1)
9e74a0a feat: S&U report rewrite, portfolio models, cash flow fixes (Apr 1)
3b9a97b fix: waterfall promote recalc, MF acquisition at time=0, persist results (Apr 1)
e9ed55c docs: nightly sync 2026-03-30 (Mar 31)
```

## Active To-Do / Carry-Forward

- [ ] **Uncommitted work (22 files)** — DMS reassignment, doc type combobox, finish-later flow, brokerage agent, guide content rewrite. Needs commit.
- [ ] **Re-run demo project clones on host:** `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] **PropertyTab.tsx floor plan double-counting fix** (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] **Staging race condition** — User reported "gets stuck" when rejecting staging rows during active extraction. Likely polling/optimistic update interaction.
- [ ] **Brokerage agent table→DB wiring** — PDF table extraction works but `_extract_market_data` needs wiring to parse into `tbl_research_financial_data`.
- [ ] **Agent infrastructure Phase 1** — Django-Q2 install, agents app scaffold, Redfin comp scan proof-of-concept (prompts drafted).

## Alpha Readiness Impact

No movement on formal alpha blockers today. The DMS doc type management improvements (reassignment, combobox, finish-later) strengthen the Document Upload & Extraction workflow (Step 2-3 in alpha readiness). The extraction pipeline remains the primary open blocker (scanned PDF/OCR not implemented).

**Overall: ~90% alpha-ready** (unchanged).

## Notes for Next Session

1. **22 files uncommitted** — Review and commit the DMS + ingestion workbench changes. Consider splitting into 2 commits: (a) DMS filter management (reassign endpoint, combobox, delete-with-docs modal), (b) Ingestion finish-later + resume banner.
2. **Agent architecture decision pending** — Phase 0 discovery complete, CC prompts drafted. Next step is Phase 1 execution (Django-Q2 + agents app). Confirm Railway billing supports worker process.
3. **Brokerage agent** — Table extraction proven on C&W MarketBeat PDFs. Next: wire `_extract_market_data` to persist structured data.
4. **Guide content** — Major rewrite in progress. Verify completeness before committing.
