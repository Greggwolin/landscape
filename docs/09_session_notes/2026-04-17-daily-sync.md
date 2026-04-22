# Daily Sync — April 17, 2026

**Date**: Thursday, April 17, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **P1 Analysis Tools (8 new, 233→241):** `list_projects_summary`, `get_deal_summary`, `get_data_completeness`, `calculate_project_metrics`, `calculate_cash_flow`, `generate_report_preview`, `export_report`, `list_available_reports` — closes the gap between CRUD tools and actual analytical capability in Landscaper
- **Thread Search Endpoint:** New `GET /api/landscaper/threads/search/` with full-text search across thread titles and messages (119 lines in `views.py`)
- **`generate_map_artifact` Tool:** Interactive MapLibre maps rendered in artifacts panel, with pin-placement input mode for projects missing coordinates
- **Test Agent Framework Expansion:** Added scenarios S5 (map artifact), S6 (unassigned threads), S8 (ingestion tools), S10 (negative testing) — now covers 8 scenarios total
- **Wrapper Sidebar Simplification:** Removed project selector dropdown, wired recent projects list directly (net -227 lines)

### Bugs Fixed
- **5 Missing Tool Schemas:** Closed handler/schema drift — 5 tool handlers existed without matching schema definitions in `tool_schemas.py`
- **Mutation Service:** `pending_mutations.project_id` made nullable, `mutation_type` check constraint dropped — fixes for unassigned thread context

### Technical Debt Addressed
- **Calibration Reports Gitignored:** Removed 20+ JSON report files from tracking, added `tests/agent_framework/reports/` to `.gitignore`
- **Tool Inventory Regenerated:** HTML + MD inventory docs updated twice (228→233→241)

### Documentation
- **Landscaper Tool Gap Analysis:** New doc at `docs/02-features/landscaper-tool-gap-analysis.md` (352 lines) — systematic audit of 233 tools mapping gaps between CRUD capability and analyst-level functionality
- **CLAUDE.md:** Updated 3 times today (tool count, generate_map_artifact, P1 tools)
- **Nightly Health Check:** `docs/daily-context/2026-04-17-nightly-health-check.md` generated early AM

## Files Modified

Key files (excluding report JSONs removed):

| File | Change |
|------|--------|
| `backend/apps/landscaper/tools/analysis_tools.py` | +796 (new file, 8 P1 tools) |
| `backend/apps/landscaper/tool_schemas.py` | +188 (schemas for 8 P1 + 5 missing) |
| `backend/apps/landscaper/tool_registry.py` | +14 (register new tools) |
| `backend/apps/landscaper/views.py` | +119 (thread search) |
| `backend/apps/landscaper/urls.py` | +13 |
| `backend/apps/landscaper/services/mutation_service.py` | +55 |
| `tests/agent_framework/scenario_s5.py` | +373 (new) |
| `tests/agent_framework/scenario_s6.py` | +331 (new) |
| `tests/agent_framework/scenario_s8.py` | +401 (new) |
| `tests/agent_framework/scenario_s10.py` | +416 (new) |
| `docs/02-features/landscaper-tool-gap-analysis.md` | +352 (new) |
| `src/components/wrapper/WrapperSidebar.tsx` | -227 (simplified) |

## Git Commits (10 today)

```
810bfa0 docs: update CLAUDE.md tool count 233→241 after P1 analysis tools
44fe2b1 feat: P1 analysis tools — 8 new Landscaper tools (233→241)
0478a47 feat(landscaper): add thread search endpoint
206a130 chore: gitignore calibration reports + add tool gap analysis doc
8cddd62 feat: test agent framework (S1-S6, S8, S10) + Phase 0 bug fixes + dynamic project delete
9e0eb8f refactor(wrapper): remove project selector, wire recent projects
2a2f55d docs: regenerate Landscaper tool inventory (228 → 233)
d6481ce fix(landscaper): add 5 missing tool schemas — close handler/schema drift
a07e568 docs: regenerate Landscaper tool inventory (228 tools)
1c7754d docs: CLAUDE.md sync — tool count 233, generate_map_artifact documented
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Tool gap analysis identified remaining P2/P3 gaps (scenario comparison, what-if, portfolio tools) — prioritize for next session
- [ ] Test agent framework scenarios S5/S6/S8/S10 need calibration runs against live backend
- [ ] Excel audit phases 4-7 still pending (waterfall classifier, Python replication, S&U balance, trust score, HTML report)

## Alpha Readiness Impact

No alpha blocker movement today — all 6 original blockers were already resolved. Today's work strengthens the conversational-first experience (P1 analysis tools close the biggest gap identified in the tool gap analysis). The Landscaper can now compute metrics, generate cash flows, and trigger report exports directly from chat — significant UX improvement for alpha testers.

## Notes for Next Session

1. **P1 tools are registered but untested end-to-end** — the 8 analysis tools call backend endpoints that exist, but the full round-trip (Landscaper chat → tool → endpoint → response → formatted output) should be verified with real project data
2. **Thread search is new** — no frontend wiring yet. The `/w/` chat interface should eventually have a search box that hits this endpoint
3. **Tool gap P2 candidates** to discuss: scenario comparison (`compare_scenarios`), sensitivity analysis (`run_sensitivity`), and the "project health check" composite tool
4. **Wrapper sidebar is simpler now** — removed the CSelect project picker, just shows recent projects. If user feedback says they need search/filter, may need to add it back differently
