# Daily Sync — 2026-03-31

**Date**: Monday, March 31, 2026
**Generated**: Nightly automated sync
**Version**: v0.1.15 (bumped today)

---

## Work Completed Today

### Features Added / Progressed

- **alpha15 merged to main** (`3f11fa9`) — Merged feature branch containing portfolio scaffolding, S&U report rewrite, and cash flow fixes
- **Version bumped to v0.1.15** (`e627800`)
- **Marketing site** (`bce59bd`, `22dfa3f`) — New static marketing site added under `marketing-site/` with index, about, and resources pages. Styled with CoreUI dark theme tokens.
- **Waterfall persist results + promote recalc** (`3b9a97b`) — Waterfall calculation results now persisted to DB. New `/waterfall/last-result/` endpoint. Promote recalc logic added. MF acquisition cost flows to time=0 in waterfall. Equity page updated with recalc triggers.
- **transformDjangoResponse shared module** (`f058293`) — Extracted 148-line shared module for transforming Django API responses in the waterfall flow.
- **S&U report rewrite** (`9e74a0a`) — Property-type branching for Sources & Uses report: LAND (equity + net revenue = costs + distributions) vs MF+ (equity + loan + NOI + sale = costs + DS + payoff + distributions). Treemap replaced with unified section-header table. ~1,715 lines rewritten.
- **Portfolio analysis models scaffolded** (`9e74a0a`) — Django models: `Portfolio`, `PortfolioMember`, `PortfolioWaterfallTier`, `PortfolioResult` (357 lines models + 160 serializers + 228 views). URL registration at `/api/portfolios/` and `/api/portfolio-results/`.
- **Income property cash flow service** (`9e74a0a`) — New 64-line service file for income property cash flow calculations.
- **Landscaper feedback utils** (`9e74a0a`) — New `feedback_utils.py` (61 lines) for Landscaper feedback handling.

### Bugs Fixed

- **Waterfall promote recalc** (`3b9a97b`) — Fixed waterfall calculation not persisting and missing promote recalc trigger.
- **MF acquisition at time=0** (`3b9a97b`) — Acquisition cost now correctly placed at time=0 in waterfall cash flow.
- **Missing transformDjangoResponse** (`f058293`) — Shared module was referenced but not committed; now added.

### Uncommitted Work In Progress (18 files, +912 lines)

- **Landscaper tool executor refactor** — New `tool_executor.py` (201 lines), updates to `ai_handler.py` (+75 lines), `mutation_service.py`, `tool_registry.py`, `tool_schemas.py` (+53 lines). Appears to be a refactor of how Landscaper tools are dispatched.
- **Map layer enhancements** — `MapCanvas.tsx` (+124 lines), `MapTab.tsx` (+149 lines), new constants and types for map features. Likely new overlay or layer controls.
- **Leveraged cash flow UI** — `LeveragedCashFlow.tsx` (+111 lines), continued `WaterfallConfigForm.tsx` refinement (+59 lines).
- **S&U report continued** — `rpt_01_sources_and_uses.py` (+105 lines additional refinement beyond committed version).
- **Sales content** — Minor updates to `SalesContent.tsx`.
- **Location intelligence** — Small addition to `views.py`.

---

## Files Modified (Committed)

```
marketing-site/about.html             |  69 ++++++
marketing-site/assets/logo-invert.png | Bin 0 -> 619111 bytes
marketing-site/index.html             | 154 ++++++++++++
marketing-site/resources.html         | 223 +++++++++++++++++
marketing-site/style.css              | 449 ++++++++++++++++++++++++++++++++++  (+ 51 update)
package.json / package-lock.json      |   6 (version bump)
backend/apps/calculations/ (adapters + services + views) | ~170
backend/apps/financial/ (models_portfolio + serializers + views + urls) | ~750
backend/apps/landscaper/feedback_utils.py | 61
backend/apps/reports/generators/ (rpt_01, 07a, 15, 17) | ~1,730
src/components/ (cashflow, income-approach) | ~46
src/app/.../waterfall/ (calculate, last-result, transformDjangoResponse) | ~353
migrations/20260331_waterfall_persist_results.sql | 15
CLAUDE.md | 6
```

## Git Commits

```
22dfa3f Update marketing site to CoreUI dark theme tokens (3 hours ago)
bce59bd Add static marketing site (4 hours ago)
e627800 chore: bump version to v0.1.15 (7 hours ago)
3f11fa9 Merge alpha15 into main (7 hours ago)
f058293 fix: add missing transformDjangoResponse shared module (7 hours ago)
9e74a0a feat: S&U report rewrite, portfolio models, cash flow fixes (7 hours ago)
3b9a97b fix: waterfall promote recalc, MF acquisition at time=0, persist results (7 hours ago)
e9ed55c docs: nightly sync 2026-03-30 (11 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] **Uncommitted Landscaper tool executor refactor** — 5 files modified, needs review and commit
- [ ] **Uncommitted map layer enhancements** — MapCanvas/MapTab significant additions, needs commit
- [ ] **Uncommitted leveraged cash flow UI** — LeveragedCashFlow.tsx expansion, needs commit
- [ ] **Portfolio models need migration** — `models_portfolio.py` committed but migration not yet run
- [ ] **Operations GET migration** — P&L calculation (1,303-line route) still on legacy Next.js
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline not yet implemented

## Alpha Readiness Impact

- **Waterfall calculate endpoint** — Already marked ✅ RESOLVED. Today's work improved it further with persist results and promote recalc logic, making the capitalization flow more robust.
- **Portfolio analysis** — New scaffolding (models + serializers + views + URLs). Not an alpha blocker but moves toward post-alpha feature set.
- **Marketing site** — New external-facing asset, not related to alpha workflow but important for positioning.
- **No alpha blocker status changes** — Remaining blockers (extraction/OCR pipeline) unchanged.

## Notes for Next Session

- Large uncommitted diff (18 files, +912 lines) across Landscaper, map, capitalization, and reports. Likely needs review and selective commit.
- `CC_VERIFY_ACQUISITION_CASHFLOW.md` and `CC_VERIFY_ACQUISITION_PICKLIST.md` are untracked files in repo root — appear to be Claude Code prompt artifacts, may want to gitignore or move to docs/cc-prompts/.
- The `docs/cc-prompts/` directory is also untracked — new directory for storing Claude Code prompts.
- `.claude/worktrees/` directory present — leftover from parallel agent work, should be cleaned up.
