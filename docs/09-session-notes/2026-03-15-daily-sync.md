# Daily Sync — 2026-03-15

**Date**: Saturday, March 15, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **Project list API enhancement** (`6890fd2`) — Added `total_residential_units` and `gross_sf` computed fields to the project list serializer and viewset, giving the dashboard richer summary data without extra API calls

### Documentation
- **Nightly health check** (`ff0ef68`) — Health report JSON, deploy skill/commands, user login credentials docs
- **Report discovery specs** — 20 report specification markdown files (`RPT_01` through `RPT_20`) covering Sources & Uses, Debt Summary, Loan Budget, Equity Waterfall, Assumptions, Project Summary, Rent Roll, Unit Mix, Operating Statement, Direct Cap, Sales Comparison, Leveraged CF, DCF Returns, Parcel Table, Budget Cost Summary, Sales Schedule, Monthly/Annual/Phase Cashflow, and Budget vs Actual
- **Screen export inventory** — `SCREEN_EXPORT_INVENTORY.md` cataloging exportable views
- **Session note for 3/14** — Previous day's sync committed

### Repo Cleanup (Uncommitted)
- **40+ stale markdown files deleted** from repo root — old handoff docs, dependency traces, smoke test reports, phase completion reports, analysis docs that had accumulated over months
- **15+ temp scripts deleted** — `capture_*.js`, `query_dms*.js`, `test-*.js`, `debug-*.js`, shell scripts, CSV files, HTML mockups
- **Archive directories created** — `archive/stale-md-cleanup-2026-03-15/` and `archive/temp-scripts-cleanup-2026-03-15/`

### Code Changes (Uncommitted)
- **API route normalization** — Minor changes across 100+ legacy Next.js API route files (likely import path fixes or error handling consistency)
- **IncomeApproachContent.tsx** — Major refactor (404 lines changed)
- **RentRollGrid.tsx** — Significant update (177 lines changed)
- **ContactCard.tsx** — Rework (106 lines changed)
- **TaxonomySelector.tsx** — Update (69 lines changed)
- **New components** — `ExpenseCompsView.tsx` and `RentCompsView.tsx` added to income approach
- **UnitCostsPanel.tsx** — 60-line update
- **StagingModal.tsx** — 57-line update
- **Tiptap extensions** — InlineComment.ts and TrackChanges.ts both updated (~60 lines each)
- **Financial engine** — Small fixes across cashflow costs, engine, periods, revenue, s-curve allocation
- **CSS** — 6 lines added to coreui-theme.css

### Technical Debt Addressed
- Massive root-level file cleanup removing months of accumulated temp files and stale docs
- Archive strategy established with date-stamped archive folders

## Files Modified

**Committed:**
- `backend/apps/projects/serializers.py` (+17)
- `backend/apps/projects/views.py` (+23/-4)
- 28 documentation/report files (+5,231 lines)

**Uncommitted:**
- ~214 files changed: +1,078 insertions, -26,722 deletions (bulk of deletions = stale file cleanup)

## Git Commits

```
47b24af Merge origin/main into feature/alpha-prep (5 hours ago)
6890fd2 feat: add total_residential_units and gross_sf to project list API (5 hours ago)
ff0ef68 docs: nightly health check 2026-03-15 (12 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Large uncommitted working tree (~214 files) — needs review and selective commit. Root cleanup and code changes should likely be separate commits.
- [ ] Income approach refactor (IncomeApproachContent.tsx, new ExpenseCompsView/RentCompsView) — verify integration before committing.

## Alpha Readiness Impact

No direct alpha blocker movement today. The project list API enhancement supports a better dashboard experience but isn't on the critical path. The 20 report spec markdowns are groundwork for **Alpha Blocker #6 (PDF report generation)** — defining what each report needs before building the generator.

The repo cleanup reduces noise but doesn't change functional status.

## Notes for Next Session

1. **Uncommitted changes are substantial** — 214 files modified, dominated by root-level cleanup deletions and widespread API route tweaks. These should be reviewed and committed in logical groups (cleanup commit, API normalization commit, income approach refactor commit, etc.)
2. **New income approach components** — ExpenseCompsView.tsx and RentCompsView.tsx are untracked; need to verify they're wired into IncomeApproachContent correctly before committing
3. **Report specs are ready** — 20 report definition docs provide the blueprint for building the PDF generation pipeline (Alpha Blocker #6)
4. **Branch is `feature/alpha-prep`** — merged from origin/main today; working on alpha readiness track
