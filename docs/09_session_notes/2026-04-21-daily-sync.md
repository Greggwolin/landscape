# Daily Sync — April 21, 2026

**Date**: Monday, April 21, 2026
**Generated**: Nightly automated sync (updated — 17 commits landed today)

---

## Work Completed Today

### Features Added
- **LoopNet MCP Service (f27a739):** Standalone FastAPI microservice for LoopNet scraping — `curl_cffi` primary with `nodriver` (headless Chromium) fallback. Dockerfile, railway.toml, 785 lines of new code in `services/loopnet_mcp/`.
- **LoopNet Deal-Sourcing Tools (4c43ccd):** 3 new Landscaper tools — `loopnet_search_listings`, `loopnet_get_listing_detail`, `loopnet_search_similar`. Requires `LOOPNET_MCP_URL` env on Django Railway service.
- **DMS Management Tools (35114d7):** 4 new Landscaper tools — `rename_document`, `update_document_profile`, `move_document_to_folder`, `reprocess_document`. +346 lines.
- **CRUD Gap Fixes (ef62b2d):** 6 new tools — 3 expense comparable tools (get/update/delete), 3 acquisition event tools (get/create/delete). Also expanded LOAN_COLUMNS 25→65, SALES_COMP_COLUMNS +3, LEASE_COLUMNS +3. +546 lines.
- **Cost Taxonomy Tools + RAG Bridge (879d6a5):** 3 new tools — `delete_budget_category` (soft-delete w/ child-safety), `get_category_lifecycle_stages`, `update_category_lifecycle_stages`. Also added Source 3 to `query_platform_knowledge` RAG — ILIKE text-match bridge into `core_unit_cost_item` and `tbl_global_benchmark_registry`. +365 lines.
- **CoStar Sale Comp Extractor (8a35483):** Specialized extraction pipeline for CoStar PDF exports in `costar_extractor.py` (+391 lines). Integrated into `extraction_service.py` (+196 lines) and `extraction_writer.py` (+85 lines).
- **Page Context Inference (e73d1a7):** Landscaper now infers page context from thread tool history — if user's current page is unknown, system checks what tools were recently used in the thread to determine context. +148 lines.

### Bugs Fixed
- **MF Adapter purchase_price (d477fc9):** Reads from correct source tables instead of wrong column.
- **calculate_waterfall (d5d0e2d):** Delegates to CalculationService instead of manual SQL (removed 120 lines of duplicated logic).
- **S12 test fixes (574f2eb, ad962ad):** period_count fix, dropped stale assertion, added P2 tools to valuation/cap page hints.
- **Demographics (177a77a, 03bb806):** Correct lat/lon column names, ring key mapping fix, tighter error detection patterns.
- **Modal context enrichment (38d4b64):** CenterChatPanel now enriches Landscaper page context when modals open. WrapperUIContext extended with modal tracking.

### UI Refactoring
- **Slot-based WrapperHeader (9685e02):** New component pattern — 6 call-site adoptions across wrapper panels. Eliminates duplicated header code. +180/-155 lines.
- **CSS Token Hygiene (421b4e0):** Major `wrapper.css` refactor — 440-line rewrite. Unified button vocabulary, consistent use of CSS custom properties, header unification across all panels.

### Documentation
- **Tool count update (fe444ca):** CLAUDE.md updated to 257 (mid-day snapshot; final count is 260).

## Files Modified

```
CLAUDE.md                                              |  14 +-
backend/apps/calculations/adapters/multifamily_adapter.py |  47 +-
backend/apps/knowledge/services/costar_extractor.py     | 391 +++
backend/apps/knowledge/services/extraction_service.py   | 196 +-
backend/apps/knowledge/services/extraction_writer.py    | 110 +-
backend/apps/landscaper/ai_handler.py                   | 161 +-
backend/apps/landscaper/tool_executor.py                |1043 +-
backend/apps/landscaper/tool_registry.py                |   4 +
backend/apps/landscaper/tool_schemas.py                 | 308 +-
backend/apps/landscaper/tools/analysis_tools.py         | 143 +-
backend/apps/landscaper/tools/loopnet_tools.py          | 325 +++
services/loopnet_mcp/Dockerfile                         |  48 +++
services/loopnet_mcp/railway.toml                       |  15 +++
services/loopnet_mcp/requirements.txt                   |   7 +++
services/loopnet_mcp/scraper.py                         | 554 +++
services/loopnet_mcp/server.py                          | 161 +++
src/components/wrapper/ArtifactPanel.tsx                 |  71 +-
src/components/wrapper/CenterChatPanel.tsx               | 148 +-
src/components/wrapper/PageShell.tsx                     |  35 +-
src/components/wrapper/ProjectArtifactsPanel.tsx         |  28 +-
src/components/wrapper/ProjectContentWrapper.tsx         |  27 +-
src/components/wrapper/RightContentPanel.tsx             |  24 +-
src/components/wrapper/WrapperHeader.tsx                 |  58 +-
src/components/wrapper/WrapperSidebar.tsx                |  24 +-
src/components/wrapper/admin/BenchmarksPanelNew.tsx      |   2 +-
src/components/wrapper/admin/DmsAdminPanelNew.tsx        |   6 +-
src/components/wrapper/admin/UsersPanelNew.tsx           |   8 +-
src/components/wrapper/documents/DocumentsPanel.tsx      |  18 +-
src/components/wrapper/documents/MediaPanel.tsx          |   2 +-
src/contexts/WrapperUIContext.tsx                        |  13 +
src/styles/wrapper.css                                  | 440 +-
tests/agent_framework/scenario_s12.py                   |   7 +-
tests/agent_framework/validators.py                     |   5 +-
```

## Git Commits (17 today)

```
421b4e0 refactor(unified-ui): CSS refactor — token hygiene, header unification, button vocabulary
9685e02 refactor(unified-ui): slot-based WrapperHeader + 6 call-site adoptions
879d6a5 feat: close cost taxonomy gaps + bridge cost DB into RAG retrieval
fe444ca docs: update tool count to 257 (+3 LoopNet tools)
f27a739 feat: LoopNet MCP service (FastAPI + curl_cffi + nodriver fallback)
4c43ccd feat: LoopNet deal-sourcing tools (3 new Landscaper tools)
35114d7 feat: add 4 DMS management tools to Landscaper
ef62b2d feat: close 5 CRUD coverage gaps — expense comps, acq events, expanded column lists
e73d1a7 feat: infer Landscaper page context from thread tool history
8a35483 feat: CoStar sale comp extractor
38d4b64 fix: enrich Landscaper page context from modal opens
03bb806 fix: demographics ring key mapping + tighten error detection patterns
177a77a fix: get_demographics uses correct lat/lon column names
574f2eb fix: S12 period_count + drop stale hurdle_method assertion
d5d0e2d fix: calculate_waterfall delegates to CalculationService instead of manual SQL
ad962ad fix: S12 page context + add P2 tools to valuation/cap page hints
d477fc9 fix: MF adapter reads purchase_price from correct source tables
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Deploy LoopNet MCP service to Railway — Dockerfile and railway.toml ready but service needs to be created and `LOOPNET_MCP_URL` env var set on Django service.
- [ ] Excel audit phases 4-7 still pending (waterfall classifier, Python replication, S&U balance, trust score, HTML report).
- [ ] Scanned PDF / OCR pipeline not yet implemented (OCRmyPDF identified as preferred solution).
- [ ] Run P2 analysis scenarios (S11/S12/S13) against live data to validate after today's bug fixes.

## Alpha Readiness Impact

No movement on the 6 original alpha blockers (all remain resolved). Today's work significantly expands Landscaper capabilities (244→260 tools) and adds deal-sourcing via LoopNet + CoStar extraction — both valuable for alpha testers working with real market data.

The unified-UI CSS refactor improves visual consistency across the wrapper layout, which matters for alpha polish.

## Notes for Next Session

- **LoopNet MCP deployment:** Service code is complete but needs Railway service creation. Check `services/loopnet_mcp/railway.toml` for config. `CHROME_BIN=/usr/bin/chromium` needed for nodriver fallback.
- **CoStar extractor:** Integrated into extraction pipeline but not tested end-to-end with a real CoStar PDF upload. Should test on a real export file.
- **Page context inference:** New feature at `e73d1a7` — Landscaper now uses thread tool history to infer which page/tab the user is on. This could surface bugs if tool names don't map correctly to page contexts. Monitor.
- **CSS refactor scope:** `wrapper.css` had a 440-line rewrite. If any visual regressions surface in the unified UI panels, start debugging there.
- **Tool count:** CLAUDE.md body says 260, footer now also says 260. Consistent.
