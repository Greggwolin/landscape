# Daily Sync — March 30, 2026

**Date**: Sunday, March 30, 2026
**Generated**: Nightly automated sync
**Branch**: `alpha15`
**Version**: v0.1.14 (HEAD at `7a6a9d4`)

---

## Work Completed Today

No commits today (Sunday). All changes are uncommitted on the `alpha15` branch.

### Features Added / In Progress

- **Portfolio analysis scaffolding** (NEW) — Full Django model layer for portfolio-level underwriting: `Portfolio`, `PortfolioMember`, `PortfolioWaterfallTier`, `PortfolioResult` models (357 lines). Serializers (160 lines), ViewSets (228 lines), URL registration complete. Endpoints: `/api/portfolios/`, `/api/portfolio-results/`. Underwriting mode only.

- **Sources & Uses report rewrite** (`rpt_01_sources_and_uses.py`) — Major rewrite (~842 insertions, 410 deletions). Now branches by property type: LAND → equity + net revenue = costs + distributions (construction loan as pass-through); MF+ → equity + loan + NOI + sale = costs + DS + payoff + distributions. Removed treemap chart approach in favor of unified table with embedded section headers.

### Bugs Fixed / Polish

- **Rent roll PDF layout** (`rpt_07a_rent_roll_standard.py`) — Column widths tightened to fit portrait page (was overflowing). Summary row "X units" label moved from col 0 to col 1. Occupancy row similarly shifted. Occupancy row now uses `subtotal` style instead of blank.

### Documentation Updated

- Health report generated (`health-2026-03-30_0802.json`) — 4 agents ran. CoreUI compliance auditor: FAIL (6,942 violations, same baseline). Django route enforcer: PASS. CLAUDE.md sync: PASS. Dead tool detector: FAIL (2 dead table refs in `appraisal_knowledge_tools.py` — `tbl_knowledge_entity`, `tbl_knowledge_fact`).
- `PART5_INSTRUCTIONS.md` added to `docs/daily-context/`.

### Health Report Summary

| Agent | Status | Notes |
|-------|--------|-------|
| CoreUI Compliance | FAIL | 6,942 violations (baseline — no regression) |
| Django Route Enforcer | PASS | 0 new Next.js violations |
| CLAUDE.md Sync | PASS | No stale files |
| Extraction Queue | SKIP | Table not found |
| Dead Tool Detector | FAIL | 2 dead table refs in appraisal_knowledge_tools.py |
| Allowed Updates Auditor | PASS | 0 mismatches |

## Files Modified (Uncommitted)

```
backend/apps/financial/models.py                    |    6 +  (portfolio import)
backend/apps/financial/urls.py                      |    5 +  (portfolio routes)
backend/apps/financial/models_portfolio.py          |  357 +  (NEW)
backend/apps/financial/serializers_portfolio.py     |  160 +  (NEW)
backend/apps/financial/views_portfolio.py           |  228 +  (NEW)
backend/apps/reports/generators/rpt_01_sources_and_uses.py | +842 -410
backend/apps/reports/generators/rpt_07a_rent_roll_standard.py | 8 +-
docs/UX/health-reports/health-2026-03-30_0802.json  |  NEW
docs/daily-context/PART5_INSTRUCTIONS.md             |  NEW
```

## Git Commits (Today)

None — Sunday. Last commit was `7a6a9d4` (v0.1.14 bump, ~31 hours ago).

## Active To-Do / Carry-Forward

- [ ] **Portfolio analysis** — Models/API scaffolded, no frontend yet. Needs: migration, UI components, financial engine integration.
- [ ] **S&U report** — Rewrite looks complete but needs testing with both LAND and MF project types.
- [ ] **Dead tool refs** — `appraisal_knowledge_tools.py` references `tbl_knowledge_entity` and `tbl_knowledge_fact` which don't exist in DB. Either create tables or update tool to use correct table names.
- [ ] **Re-run demo project clones on host:** `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] **PropertyTab.tsx floor plan double-counting fix** (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] **Operations GET migration** — P&L calculation (1,303-line route) still on legacy Next.js. Save endpoints already on Django.
- [ ] **CoreUI compliance baseline** — 6,942 violations (stable). Not blocking alpha but needs triage plan.

## Alpha Readiness Impact

No movement on the 6 alpha blockers today (items 1-4 already resolved, item 5 OCR pipeline still pending, item 6 PDF reports resolved). The portfolio feature is new scope beyond alpha — underwriting mode only.

## Notes for Next Session

1. **Portfolio models need a Django migration** before they'll work. Run `makemigrations financial` + `migrate` after review.
2. **S&U report rewrite is substantial** — the property-type branching (LAND vs MF+) changes the entire data flow. Test with Peoria Lakes (LAND) and Chadron Terrace (MF) before committing.
3. **Rent roll PDF fix** is low-risk polish — column width + label positioning only.
4. **Dead tool detector** flags in `appraisal_knowledge_tools.py` have been present since at least Mar 20. Should be triaged — either the knowledge entity/fact tables need creation or the tools need updating to use the correct tables.
