# Daily Sync — 2026-07-21

**Date**: Monday, July 21, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **`get_budget_rollup` Landscaper tool** (`8a0c3629`, `63a70cc6`, `5bf28f37`, `7a7db6e2`) — New project-scoped budget category rollup tool: category names, row counts, summed amounts, percent of total, top-two concentration, and grand total from `core_fin_fact_budget` joined to `core_unit_cost_category`. Registered in `LAND_ONLY_TOOLS` + `INCOME_PROPERTY_TOOLS`. Includes sourced share percentages (fabrication guard tested), stabilized reply opening, and pre-tool narration stripped from final replies. Advertised tool count: 273 → 274.
- **`get_deal_summary` expansion** (`3b332ee3`) — Now covers budget rollup, absorption timeline, and returns data in addition to core deal metrics. +130 lines in `analysis_tools.py`. New test: `test_deal_summary_briefing_coverage.py` (66 lines).
- **Demo question battery runner** (`c3419e7e`, `bbb39f04`, `e942af3a`) — `scripts/battery/run_battery.py` (+682 lines) with `questions.yaml` (56 questions across 10 families A–J). Runs against production Landscaper API: one fresh thread per question, streamed response parsing, automatic thread archival after each run. README with usage docs. Fixes for streamed response parsing and retry/thread cleanup.

### Bugs Fixed
- **CORS `X-Landscape-Stream` header** (`73e788ec`, PR #187) — Added custom header to `CORS_ALLOW_HEADERS` in Django settings so chat messages POST works with streaming.
- **Land sales JSON serialization** (`e190fa94`) — Fixed `Decimal`/`date` serialization in `tool_executor.py` land sales tool (+18 lines).
- **Absorption summary read overhaul** (`a2452483`) — Rewrote `get_deal_summary` absorption reads in `analysis_tools.py` to handle edge cases (+146/−53 lines).

### Technical Improvements
- **Fabrication guard figure-trace instrumentation** (`d04870ea`) — Every $/% figure in a Landscaper reply must now trace to a tool-returned number. Instrumented in `ai_handler.py` (+74 lines) with expanded tests (+34 lines).
- **Reply cleanliness** (`7a7db6e2`) — Pre-tool narration ("Let me look that up...") now stripped from final replies before delivery.

## Files Modified

```
backend/apps/landscaper/ai_handler.py                       (6 commits)
backend/apps/landscaper/tool_executor.py                     (3 commits)
backend/apps/landscaper/tool_schemas.py                      (2 commits)
backend/apps/landscaper/tool_registry.py                     (1 commit)
backend/apps/landscaper/tools/analysis_tools.py              (2 commits)
backend/apps/landscaper/tests/test_budget_rollup_tool.py     (2 commits, new)
backend/apps/landscaper/tests/test_fabrication_guard.py      (3 commits)
backend/apps/landscaper/tests/test_deal_summary_briefing_coverage.py (1 commit, new)
backend/config/settings.py                                   (1 commit)
scripts/battery/run_battery.py                               (3 commits, new)
scripts/battery/questions.yaml                               (1 commit, new)
scripts/battery/README.md                                    (1 commit, new)
.gitignore                                                   (1 commit)
```

## Git Commits (13 today)

```
7a7db6e2 Discard pre-tool narration from final replies
5bf28f37 Stabilize budget rollup reply opening
63a70cc6 Source budget rollup share percentages
8a0c3629 Add budget category rollup tool
e190fa94 Fix land sales tool JSON serialization
a2452483 Fix land deal absorption summary reads
d04870ea instrument fabrication guard figure trace
e942af3a fix: retry battery thread cleanup
bbb39f04 fix: parse streamed battery responses
c3419e7e feat: add demo question battery runner
3b332ee3 feat(landscaper): make get_deal_summary cover budget/absorption/returns
8bcb11b8 docs: nightly health check 2026-07-21
73e788ec fix(cors): allow X-Landscape-Stream header so chat messages POST works (#187)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Run the demo question battery against production (`--execute --reps 3`) and review pass rates across all 10 question families.
- [ ] `tbl_opex_accounts` is phantom (discovered CU6, candidate CU7) — still 500s property-summary.pdf / cash-flow.pdf independently of the CRE join fix.

## Alpha Readiness Impact

No alpha blocker movement today. The new `get_budget_rollup` tool and expanded `get_deal_summary` improve Landscaper's analytical completeness for land dev projects. The fabrication guard hardening reduces false-positive financial figure fabrication risk. The demo battery runner provides a repeatable QA surface for validating Landscaper response quality at scale.

## Notes for Next Session

- The battery runner is ready for its first production run — needs `LANDSCAPE_API_URL` and credentials configured.
- `get_budget_rollup` is live and gated to LAND_ONLY + INCOME_PROPERTY projects. Test with Peoria Meadows (project 9) and Chadron Terrace (project 17).
- The fabrication guard figure-trace is instrumented but may need tuning if false positives appear on legitimate replies that reference previously-stated figures.
- Pre-tool narration stripping (`7a7db6e2`) changes the conversational feel — monitor user reactions.
