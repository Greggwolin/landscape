# Daily Sync — 2026-03-16

**Date**: Sunday, March 16, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **Interactive User Guide** (`63973ae`) — Full chapter-based user guide with PDF chapter navigation, sidebar, print support, guide modal, and dedicated `/guide` route. 20 chapters + 4 appendices with individual chapter PDFs. New components: `GuideClient.tsx`, `GuideContent.tsx`, `GuideModal.tsx`, `GuidePrintButton.tsx`, `GuideScreenshot.tsx`, `GuideSection.tsx`, `GuideSidebar.tsx`. Content data in `src/data/guideContent.ts` (866 lines). Guide modal context added for in-app help integration.

### Bugs Fixed
- **Land Acquisition excluded from periodic cash flow columns** (`9d85ebf`) — Fixed `land_dev_cashflow_service.py` to exclude Land Acquisition costs from periodic columns; updated `CashFlowTable.tsx` and `LeveragedCashFlow.tsx` frontend aggregation; added exclusion flag in `cashflow/aggregation.ts`.

### Deployment / DevOps
- **Railway Python build pipeline** (`a542dec` through `81f72ca`, 9 commits) — Extended debugging and fixing of Railway deployment for Django backend. Progression: added `runtime.txt` → `nixpacks.toml` → removed invalid pip nix package → python312Full → ensurepip → venv for PEP 668 compliance → migrate timing → setuptools for pkg_resources → finally upgraded simplejwt to 5.4.0 to drop the `pkg_resources` dependency entirely.

### Documentation & Cleanup
- **Nightly health check** (`0da5f28`) — Committed all previously-uncommitted changes from 3/15: 40+ stale markdown files archived, 15+ temp scripts archived, API route normalization across 100+ files, new income approach components (ExpenseCompsView, RentCompsView), IncomeApproachContent refactor, RentRollGrid update, financial engine fixes, tiptap extension updates, coreui-theme.css additions. Health report JSON added.
- **Version bump** (`07f1ea0`) — v0.1.03

### Branch Activity
- `alpha-prep` branch active; merged from `origin/main` (`2e6d431`)
- Main merge from `feature/alpha-prep` (`a9c1fe4`)

## Files Modified

**15 commits today**, touching:
- 43 files in User Guide commit (new feature)
- 4 files in cash flow fix
- ~7 files across Railway deployment fixes (nixpacks.toml, Procfile, railway.json, requirements.txt, runtime.txt)
- 223 files in the health check commit (bulk of yesterday's uncommitted work)
- 2 files in version bump

## Git Commits

```
2e6d431 Merge origin/main into alpha-prep (6h ago)
63973ae feat: add interactive User Guide with chapter navigation (6h ago)
9d85ebf fix: exclude Land Acquisition from periodic cash flow columns (6h ago)
81f72ca fix: upgrade simplejwt to 5.4.0 (drops pkg_resources dependency) (10h ago)
87eccd4 fix: add setuptools to requirements.txt for pkg_resources (10h ago)
27da79f fix: disable Nixpacks auto-detected build phase (11h ago)
7fde2f5 fix: install setuptools for pkg_resources module (11h ago)
1b988fa fix: move migrate to start time, use venv paths everywhere (11h ago)
8d4beb6 fix: use venv for pip install on Railway (PEP 668 compliance) (11h ago)
13caa46 fix: use ensurepip to bootstrap pip before installing requirements (11h ago)
31f08e3 fix: use python312Full to include pip in Railway build (11h ago)
427eee2 fix: remove invalid 'pip' nix package from nixpacks.toml (11h ago)
fd2ace2 fix: add nixpacks.toml to force Python build on Railway (11h ago)
a542dec fix: add runtime.txt to backend for Railway Python detection (12h ago)
07f1ea0 chore: bump version to v0.1.03 (12h ago)
a9c1fe4 Merge feature/alpha-prep into main (12h ago)
0da5f28 docs: nightly health check 2026-03-16 (12h ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Verify Railway deployment is stable after the simplejwt upgrade — the 9-commit debugging chain suggests environment may still be fragile.
- [ ] Income approach refactor (committed in health check) — verify ExpenseCompsView and RentCompsView render correctly in deployed app.

## Alpha Readiness Impact

No direct alpha blocker movement today. The User Guide is a significant UX addition for alpha testers but isn't on the blocker list. The cash flow fix (Land Acquisition exclusion) improves financial accuracy but doesn't resolve any of the 6 alpha blockers. Railway deployment stabilization is foundational infrastructure for alpha deployment.

**Alpha blockers unchanged:**
1. Reconciliation frontend — still stubbed
2. Operations save migration — still on legacy Next.js
3. Reports project scoping — still hardcoded to project 17
4. Waterfall calculate endpoint — still 404
5. Extraction pipeline (OCR) — still not implemented
6. PDF report generation — report specs written (3/15), generator not started

## Notes for Next Session

1. **Railway deployment took 9 commits to stabilize** — final fix was upgrading simplejwt to 5.4.0 to eliminate the `pkg_resources` dependency entirely. Worth monitoring next deploy for regressions.
2. **User Guide is live at `/guide`** — 20 chapters + appendices with PDF chapter downloads. GuideModal can be triggered in-app for contextual help.
3. **Branch is `alpha-prep`** — merged to/from main today. Working tree is clean.
4. **Yesterday's massive uncommitted changes are now committed** via the health check commit (`0da5f28`) — 223 files including the income approach refactor, API route normalization, and repo cleanup.
