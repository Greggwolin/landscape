# Daily Sync — July 19, 2026

**Date**: Saturday, July 19, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### 1. Chat Surface Restored as Primary Project Shell (PR #181)

- `ba0c0c83` — Reverts the studio funnel (#135). The `/w/` chat surface with right artifacts panel is now the working project surface again; `/studio/[projectId]` demoted to a deterministic fallback reachable by direct URL only.
- `/w/projects/[projectId]` layout restored with full provider stack (ProjectContextShell, WrapperChatProvider, ModalRegistryProvider with 17 registered designed forms, WrapperProjectProvider, LandscapeCommandSubscriber).
- Reports and map page bodies restored (gutted to null stubs by #165 while the funnel was in place).
- `thread_service.get_or_create_active_thread` now excludes archived threads — fixes an unrecoverable "No active thread" state.

### 2. Waterfall / Cash Flow Correctness Fixes (PR #178)

- `2e1de3ae` — Waterfall equity basis now takes financing at full signed value and folds acquisition-month loan funding into period-0 equity (was charging full purchase price as equity — audit C5).
- Value-add envelope: new cost-renovation section ensures renovation + relocation spend reaches leveraged CF and waterfall consumers.
- DCF monthly: IRR/EM/PV/total_cash_flow now net renovation Cap-X (previously display-only; CFBD equaled NOI).
- Labels corrected: "Unlevered IRR (property)" vs "Levered IRR (equity)".

### 3. Landscaper Heartbeat Streaming (PRs #175 + #177)

- `9e31a9d4` — Tool-running turns emitted zero bytes until the full loop completed. Railway's edge proxy terminated silent connections at ~30s, producing 503s on turns measured at 29–31s. Fix: `StreamingHttpResponse` with 5s whitespace heartbeats on a worker thread. Leading whitespace is legal JSON so clients are unchanged.
- Also repaired 22 tool handler signatures (missing `thread_id`/`user_id` kwargs) — including `query_platform_knowledge` (RAG), land-use taxonomy tools, cost library, and IREM benchmarks. All 22 were failing 100% of the time when invoked.
- `583653ba` — Emit the opening heartbeat immediately (not after first 5s interval).

### 4. Property Tab — Floor Plan & Unit Persistence (PRs #173 + #174)

- `9eb2ad97` — Persist floor-plan and unit edits; lock matrix when rent roll exists.
- `60bedb93` — PATCH only changed fields on plan/unit saves (was sending full payload causing overwrite conflicts); fix narrative fetch 401/404.

### 5. Operating Statement Fixes (PRs #176 + #179 + #180)

- `5b12a150` — OM doc detection handles underscore-delimited names + real `doc_type` taxonomy.
- `fbce6951` — Basis labels on NOI/rent figures + discriminator-aware operating statement report generator (RPT_09). Report now respects T-12 vs F-12 vs current_proforma subtype.
- `b154b993` — Expense column captions on live statement ($/Unit/Yr) — was reusing revenue header, so expense rows showed annual per-unit dollars under a monthly column. Also deleted 2,406 lines of dead property/operations component copies.

### 6. Server-Side OS Artifact Render + Optimistic Chat Echo

- `e4444bbf` — Operating-statement turns ran 60–83s because the model hand-composed the artifact table. New `os_artifact_builder.py` builds the artifact server-side in guard-canonical shape; the model just announces it. Degrades to legacy model-composed path on failure.
- Fixed three defects found during verification: (a) internal RequestFactory call lacked credentials (401), (b) section iteration assumed list (was dict with "rows" key), (c) management fee + replacement reserves double-counted.
- Optimistic message echo: user's sent message now renders immediately before any network work.

### 7. Loan Tool Full-Form Coverage (PR #182)

- `ed8edf8c` — Schema never advertised the executor's create path, and 11 fields were missing from both schema and whitelist (closing costs, recourse, index rate, reserve inflator, structure fields). All 73 whitelist entries verified against live `tbl_loan`.

## Files Modified (11 commits, ~3,600+ lines changed)

```
backend/apps/calculations/services.py                         |  83 +++++--
backend/apps/financial/services/dcf_calculation_service.py     |  30 ++-
backend/apps/financial/services/income_property_cashflow_service.py | 60 ++++++
backend/apps/landscaper/ai_handler.py                          |  18 +-
backend/apps/landscaper/services/thread_service.py             |   6 +-
backend/apps/landscaper/tests/test_heartbeat_streaming.py      | 132 ++++++++++++
backend/apps/landscaper/tool_executor.py                       |  92 +++++++-
backend/apps/landscaper/tool_schemas.py                        |  20 +-
backend/apps/landscaper/tools/os_artifact_builder.py           | 187 +++++++++++++++++ (NEW)
backend/apps/landscaper/tools/tests/test_os_artifact_builder.py | 100 +++++++++ (NEW)
backend/apps/landscaper/views.py                               |  97 +++++++++
backend/apps/reports/generators/rpt_09_operating_statement.py  |  45 ++++-
docs/PROJECT_INSTRUCTIONS.md                                   |  13 +-
src/app/w/projects/[projectId]/layout.tsx                      | 116 +++++-----
src/app/w/projects/[projectId]/map/page.tsx                    |  44 ++--
src/app/w/projects/[projectId]/reports/page.tsx                |  35 +--
src/components/capitalization/WaterfallResults.tsx              |   4 +-
src/components/operations/OperatingStatement.tsx                |  14 +-
src/components/operations/index.ts                             |   1 -
src/components/valuation/income-approach/DCFView.tsx            |   2 +-
src/components/valuation/income-approach/ValueTiles.tsx         |   2 +-
src/hooks/useLandscaperThreads.ts                              |  62 ++++-
+ multiple dead component deletions (~2,406 lines removed)
```

## Git Commits

```
e4444bbf perf(landscaper): server-side OS artifact render + optimistic chat echo
ed8edf8c feat(landscaper): loan tool covers full form — advertise upsert + 11 missing fields (#182)
ba0c0c83 fix(wrapper): restore the /w/ chat surface as the project default (#181)
b154b993 fix(operations): expense column captions on live statement ($/Unit/Yr) + retire dead components (#180)
fbce6951 fix(labels): basis labels on NOI/rent figures + discriminator-aware OS report (#179)
2e1de3ae fix(returns): waterfall equity basis, renovation Cap-X in cash flows, basis labels (#178)
583653ba fix(landscaper): emit the opening heartbeat immediately (#177)
5b12a150 fix(property): OM doc detection handles underscore-delimited names + real doc_type taxonomy (#176)
9e31a9d4 fix(landscaper): heartbeat-stream chat responses; repair 22 tool signatures (#175)
60bedb93 fix(property): PATCH only changed fields on plan/unit saves; fix narrative fetch 401/404 (#174)
9eb2ad97 fix(property): persist floor-plan and unit edits; lock matrix when rent roll exists (#173)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF seam exists (`auto_classifier.py`) but binaries not provisioned and flag not enabled.
- [ ] Verify `tbl_opex_accounts` fix (#169) resolved property-summary/cash-flow 500s on project 17.
- [ ] `feature/design-shell` branch in-flight — design reference assets + WIP styling.
- [ ] Stale local branches to clean up (e.g., `feature/map-sales-match-market` already squash-merged).

## Alpha Readiness Impact

No alpha blocker movement. The heartbeat streaming fix (#175/#177) eliminates a class of Railway edge-proxy 503s on tool-running turns — a reliability issue that would have affected every alpha tester. The waterfall equity basis fix (#178) corrects IRR/EM calculations that were overstating equity required (audit C5). The chat surface restoration (#181) is a product-direction decision, not an alpha readiness change. Alpha readiness remains at ~92%.

## Notes for Next Session

- **22 tool signatures repaired** — these were silently failing 100% of the time. RAG (`query_platform_knowledge`), land-use taxonomy, cost library, and IREM benchmarks are now functional. Worth verifying live.
- **Server-side OS artifact builder** — if defects appear in OS artifact rendering, check `os_artifact_builder.py` first. Degrades gracefully to the legacy model-composed path.
- **Waterfall equity math** — verify on project 17 that leveraged IRR/EM now match hand calculations. The fix was significant (full purchase price → net-of-financing equity basis).
- **Heartbeat streaming** — monitor Railway logs for the 5s heartbeat pattern. If turns still 503, check whether the edge proxy respects chunked transfer encoding on the new `StreamingHttpResponse`.
