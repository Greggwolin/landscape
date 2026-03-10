# Daily Sync — March 10, 2026

**Date**: Tuesday, March 10, 2026  
**Generated**: Nightly automated sync  

---

## Work Completed Today

No commits landed today. Active WIP (328 insertions across 8 files, unstaged):

### Features In Progress

**Management Fee Ingestion Override System** (Operations Tab)  
The most substantial change — a complete overhaul of how management fees are rendered and computed when sourced from document extraction vs. user input.

- `management_fee_source` assumption key now tracks the fee's origin (`ingestion`, `user_modified`, or `user`)
- New `userOverrodeMgmtFee` flag: when a user edits over ingested data, source flips to `user_modified`
- `OperatingStatement.tsx`: new `isMgmtFee` rendering path — ingested fees display as read-only $/unit with a derived-% badge; no-ingestion fees show the standard percentage input
- Operations route: `effectiveMgmtFeePct` ensures post-reno uses the correct rate (user override → assumption pct; ingested → derived pct)
- `useOperationsData.ts`: management fee update path now correctly computes `total = pct × EGI` instead of treating it like a per-unit opex row
- LTL column shows "% of EGI" label for management fee rows

**Market Geography Django Model** (`backend/apps/market_intel/models.py`)  
132-line new model added for the market intelligence time-series schema:

- `MarketGeography` — hierarchical geo dimension: national → state → MSA → county → city → ZIP → submarket → custom
- Self-referencing `parent_geography` FK, CBSA/FIPS codes, lat/lng
- `managed = False`, maps to `tbl_market_geography`
- Part of the three-table normalized market data design added with the Mar 10 alpha-prep session

**Operations API Routes** (legacy Next.js, still not migrated)  
- `inputs/route.ts`: +23 lines — likely management fee source persistence on save
- `settings/route.ts`: +36 lines — settings endpoint additions

**UX Health Report**  
- `docs/UX/health-reports/health-2026-03-10_0800.json` — automated daily health check generated

---

## Files Modified (Uncommitted)

```
backend/apps/market_intel/models.py                | 132 +++++++++++++++++++++
src/app/api/projects/[projectId]/operations/inputs/route.ts |  23 ++++
src/app/api/projects/[projectId]/operations/route.ts        |  53 +++++++--
src/app/api/projects/[projectId]/operations/settings/route.ts |  36 +++++-
src/components/operations/OperatingStatement.tsx            |  44 ++++++-
src/components/operations/types.ts                          |   3 +
src/hooks/useOperationsData.ts                              |  46 +++++--
src/styles/operations-tab.css                               |  16 +++
8 files changed, 328 insertions(+), 25 deletions(-)
```

Untracked:
```
docs/UX/health-reports/health-2026-03-10_0800.json
```

---

## Git Commits

No commits on March 10. Most recent commits (for context):

- `485f80c` — fix: renovation cost basis toggle + ops chart splitter + shared file deletion guard *(16h ago)*
- `8ab3f58` — alpha-prep: full working state commit before main merge *(18h ago)*
- `c3b6e2c` — docs: update documentation center and status pages for Mar 7, 2026 *(3 days ago)*

---

## Active To-Do / Carry-Forward

- **Commit today's ops/market_intel work** — 8 files ready, needs commit message
- **Operations save migration (Alpha Blocker #2)** — today's work added more logic to legacy Next.js routes (`src/app/api/projects/[projectId]/operations/`). These should eventually migrate to Django. Not urgent to block alpha but the technical debt grows with each session.
- **Management fee user-override persistence** — `management_fee_source` assumption key needs a save path wired through `inputs/route.ts`; verify the round-trip (save → reload shows correct source state)
- **MarketGeography model** — no migration file yet. Will need `migrations/NNN_add_market_geography.sql` before it can be used
- **Market time-series models** — only `MarketGeography` is visible; the companion `MarketSeries` and `MarketDataPoint` models referenced in the comment ("Three-table normalized design") may be in the same diff but below the 60-line read limit

---

## Alpha Readiness Impact

No movement on alpha blockers today. Status unchanged from CLAUDE.md:

| Blocker | Status |
|---------|--------|
| #1 Reconciliation frontend | ✅ Done (Feb 21) |
| #2 Operations save migration | 🔴 Still on legacy Next.js — worsened by today's additions |
| #3 Reports project scoping | 🔴 No movement |
| #4 Waterfall calculate endpoint | 🔴 No movement |
| #5 OCR pipeline | 🔴 No movement |
| #6 PDF report generation | 🔴 No movement |

Overall alpha readiness: ~70% (unchanged). Today's operations work improves extraction fidelity but doesn't close any blockers.

---

## Notes for Next Session

1. **Commit today's work first** — the 8 modified files are coherent and ready. Suggested message: `feat: management fee ingestion override + market geography model`

2. **Verify management fee round-trip** — the `management_fee_source` assumption key is new; confirm it saves correctly via `inputs/route.ts` and that reloading the ops tab restores the correct state (ingestion badge vs. percentage input).

3. **Check MarketGeography migration** — model is in place but there's no corresponding SQL migration. Run `manage.py makemigrations` or create a manual migration before deploying.

4. **MarketSeries / MarketDataPoint** — the models.py diff was truncated; confirm the companion tables in the three-table design are also present in the file.

5. **Operations save migration (Blocker #2)** — consider a dedicated session to migrate the operations family of routes to Django. The legacy Next.js routes (`operations/route.ts`, `operations/inputs/route.ts`, `operations/settings/route.ts`) grow every session and will be harder to migrate the longer they're left.
