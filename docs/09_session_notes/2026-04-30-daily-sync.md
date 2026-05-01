# Daily Sync — April 30, 2026

**Date**: Wednesday, April 30, 2026
**Generated**: Nightly automated sync
**Branch**: `feature/unified-ui`

---

## Work Completed Today

### Features Added
- **F-12 Proforma server-derivation** (`fae31fe`) — New `get_proforma` Landscaper tool that composes an F-12 proforma server-side from T-12 operations data + project growth rates (`core_fin_growth_rate_sets`). Eliminates LLM-composed proformas that had 5 composition bugs (collapsed expense detail, phantom lines, wrong unit-mix counts, blank commercial line, no fidelity guard). Defaults to 3%/3% income/expense growth if rates unset. Vacancy/credit/concessions/management-fee percentages preserved with values recomputed from grown GPR/EGI. Replacement reserves per-unit grows by expense rate. Added to `INCOME_PROPERTY_TOOLS`. BASE_INSTRUCTIONS routes model to use `get_proforma` instead of composing. 10 test cases in `test_proforma_tools.py`.

### Also Committed Today (rolling 3-day window, today's commits)
- **Artifacts Phase 5 OS guard + tabular formatting** (`c2d18dd` through `f21f2bf`) — Operating-statement guard with three-subtype taxonomy (`t12`, `f12_proforma`, `current_proforma`), single-table mandate, canonical 3-col shape, property-metadata blocker, source-data presence checks. Universal tabular formatting standard (parens negatives, em-dash zero, no $, bold subtotals/grand totals, numeric-only borders, section-divider merge with column labels, depth-based indent).
- **Phase 4.5 firing discipline + get_operating_statement** (`7c82cb7`) — Tightened artifact auto-creation rules. New `get_operating_statement` tool renders P&L as artifact.
- **CLAUDE.md staleness audit** (`63775b8`, `1cafcb6`) — Full 15-step alpha readiness re-audit.
- **PROJECT_INSTRUCTIONS.md v4.0 rewrite** (`96a2e5e`) — Unified rules across Cowork, Claude.ai, and Claude Code.

### Uncommitted Changes (4 files)
- `.claude/sessions.json` — session entries appended
- `docs/daily-context/session-log.md` — session log entries
- `src/app/w/layout.tsx` — layout modifications (in progress)
- `src/hooks/useLandscaperThreads.ts` — thread hook updates (in progress)

## Files Modified (Committed)
```
CLAUDE.md                                          |   4 +-
backend/apps/landscaper/ai_handler.py              | 115 ++++-
backend/apps/landscaper/tool_executor.py           |   1 +
backend/apps/landscaper/tool_registry.py           |   1 +
backend/apps/landscaper/tool_schemas.py            |  66 ++-
backend/apps/landscaper/tools/proforma_tools.py    | 561 +++++++++++++++++++++
backend/apps/landscaper/tools/tests/__init__.py    |   0
backend/apps/landscaper/tools/tests/test_proforma_tools.py | 252 +++++++++
```

## Git Commits (Today)
```
fae31fe feat(artifacts): server-derive F-12 proforma from T-12 + growth rates (3 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Rent-roll guard queued — same composition-drift class as the F-12 bugs observed today
- [ ] `current_proforma` server-derived path not yet built (only `t12` and `f12_proforma` done)
- [ ] BASE_INSTRUCTIONS cleanup — ~80 lines of T-12 strict content rules superseded by Phase 5 OS guard, not yet removed (waiting for stability confirmation)
- [ ] Uncommitted changes in `src/app/w/layout.tsx` and `src/hooks/useLandscaperThreads.ts` — review and commit or stash
- [ ] Scanned PDF / OCR pipeline — still the primary alpha blocker

## Alpha Readiness Impact

- **Alpha overall: ~92%** — unchanged from prior audit
- F-12 proforma server-derivation closes a quality gap (LLM composition bugs) but doesn't move the percentage since proforma generation was already functional
- Artifacts system (Phases 1–5) fully shipped — confirmed working in CLAUDE.md audit
- Remaining alpha blocker: scanned-PDF / OCR pipeline

## Notes for Next Session

- The F-12 proforma tool (`get_proforma`) was shipped with a verify-and-ship handoff doc at `Landscape app/F12_VERIFY_AND_SHIP.md`. Live testing on Chadron Terrace recommended.
- The `current_proforma` subtype (asking/market rents) is the natural follow-on — requires market-rent data in `tbl_multifamily_unit` or equivalent.
- Uncommitted layout/thread-hook changes suggest an in-progress UI task was interrupted — check `src/app/w/layout.tsx` and `useLandscaperThreads.ts` diffs before continuing.
- Landscaper tool count now ~269 registered.
