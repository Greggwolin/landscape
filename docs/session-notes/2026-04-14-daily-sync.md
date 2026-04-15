# Daily Sync — April 14, 2026

**Date**: Tuesday, April 14, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Commit: `2c66848` — "docs: nightly health check 2026-04-14" (08:01 MST)

Single commit today — the morning nightly sync for April 13's work. It rolled in the April 13 daily sync note, the `open_input_modal` Landscaper tool (`modal_tools.py`, registry/executor/schema wiring, `views.py` recent-threads endpoint), the Cowork unified-wrapper scaffold under `src/app/w/` and `src/components/wrapper/`, badge/chip consolidation (MediaBadges, StatusBadge, ExtractionFilterToggles), the excel-model-audit skill doc, and CLAUDE.md updates. See yesterday's sync for the detailed breakdown.

### Uncommitted Work in Progress (today's active development)

**Excel Model Audit Pipeline — Phases 1–3 landed (NEW, untracked)**
- New package `backend/apps/knowledge/services/excel_audit/` with `__init__.py`, `loader.py`, `classifier.py`, `structural_scan.py`, `formula_integrity.py`, `assumption_extractor.py`. This is the server-side port of the Cowork `excel-model-audit` skill — classification (flat / assumption_heavy / full_model), structural scan, formula integrity, and labeled-assumption extraction into `ai_extraction_staging` with `source: excel_audit`.
- New Landscaper tool file `backend/apps/landscaper/tools/excel_audit_tools.py` — registers 4 tools: `classify_excel_file`, `run_structural_scan`, `run_formula_integrity`, `extract_assumptions`. Tool count remains 232 per CLAUDE.md (previous value already accounted for these).
- `backend/apps/landscaper/tool_schemas.py` +74 lines — schemas for the 4 new excel_audit tools.
- `backend/apps/landscaper/tool_executor.py` +1 line — excel_audit dispatch wiring.
- CLAUDE.md updated with a new "Excel Model Audit Pipeline" section documenting location, tier-based routing (Phase 0), and the locked scope (universal Landscaper tool, scenario mode against DB inputs only — no LibreOffice what-if, no project-creation gate). Phases 4–7 (waterfall replication, Python math verification, Sources & Uses, trust score, HTML report) are explicitly follow-on work.
- Specification doc: `docs/14-specifications/chat-canvas-and-excel-audit.md` (untracked).

**Cowork Unified Wrapper UI — continued buildout (uncommitted)**
- Heavy ongoing work in `src/app/w/**`: `layout.tsx` (+87), `projects/page.tsx` (+165), `projects/[projectId]/page.tsx` (+149 / −), `tools/page.tsx` (+83), `admin/page.tsx` (+47), plus `documents/`, `map/`, `reports/`, `help/`, `landscaper-ai/` pages.
- New wrapper components (untracked): `CenterChatPanel.tsx`, `RightContentPanel.tsx`, plus `wrapper/admin/` (BenchmarksPanelNew, DmsAdminPanelNew, PreferencesPanelNew, UsersPanelNew) and `wrapper/documents/` (DocumentsPanel, DocumentDetailPanel, MediaPanel).
- New context: `src/contexts/WrapperUIContext.tsx` (untracked) — third wrapper context alongside the committed WrapperProjectContext / WrapperChatContext / ModalRegistryContext.
- Modified: `src/components/wrapper/WrapperSidebar.tsx` (+589/−, big refactor), `ProjectContentWrapper.tsx` (+26/−).
- Stylesheet churn: `src/styles/wrapper.css` +1066 lines.

**Market Intelligence — University of Michigan consumer sentiment agent (NEW, untracked)**
- `services/market_ingest_py/market_ingest/umich_client.py` — new UMich data client.
- `services/market_agents/market_agents/agents/umich_sentiment_agent.py` — new agent.
- Wired into `services/market_agents/market_agents/orchestrator.py` (+3) and `config.py` (+9); `pyproject.toml` (+1) for new dependency.

**Landscaper chat panel touch-up**
- `src/components/landscaper/LandscaperChatThreaded.tsx` (+5 lines).

**Map canvas tweak**
- `src/components/map-tab/MapCanvas.tsx` (+10 lines).

**Unit costs inline editing**
- Small edits across `src/components/benchmarks/unit-costs/` — `UnitCostsPanel.tsx` (+20/−), three InlineEditable* cells (+2/− each).

## Files Modified

See "Uncommitted Work in Progress" above. Summary:
- 26 modified files (1,899 insertions / 539 deletions)
- 21 untracked files (6 excel_audit service modules, 1 excel_audit tools file, 1 spec doc, 2 market_agents files, 10 wrapper components/contexts, 1 new wrapper context)

## Git Commits

```
2c66848  docs: nightly health check 2026-04-14  (08:01 MST)
```

(Prior 3 days for reference)
```
4219e6f  docs: nightly health check 2026-04-13
b21788e  docs: nightly health check 2026-04-12
```

## Active To-Do / Carry-Forward

- [ ] **Excel Audit Phases 4–7** — waterfall classification, Python replication of waterfall + debt math, Sources & Uses verification, trust score, HTML audit report rendering. Phase 0–3 modules landed (loader/classifier/structural_scan/formula_integrity/assumption_extractor); next turn is the verification + reporting layer.
- [ ] **Cowork Unified Wrapper** — substantial uncommitted scaffolding across `src/app/w/**` and `src/components/wrapper/**` plus new WrapperUIContext. Decide when to commit a coherent checkpoint vs. keep iterating.
- [ ] **UMich sentiment agent** — untracked; needs smoke test + commit once orchestrator wiring is verified.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No movement on the six alpha blockers today. All six remain in their prior state:
1–4, 6: already resolved.
5. **Extraction pipeline — scanned PDF / OCR** — still open (OCRmyPDF identified but not integrated).

Today's work was additive (Excel audit pipeline, Cowork wrapper UI, market sentiment agent) rather than blocker-clearing. Overall alpha readiness stays at ~90%.

## Notes for Next Session

- The excel_audit pipeline is partially built. If you resume, the next modules are the waterfall classifier + Python replicator + S&U checker. The scope doc `docs/14-specifications/chat-canvas-and-excel-audit.md` has the locked boundaries (no LibreOffice what-if, no project-creation gate).
- Cowork wrapper has grown large uncommitted. Consider a staging commit to checkpoint before more refactoring — the delta against HEAD is now 1,899+ lines.
- The nightly sync tool count line in CLAUDE.md already reflects 232 including the 4 excel_audit tools. Do not double-count when adding more tools in Phase 4.
- UMich sentiment agent is net-new market intel. Verify FRED/orchestrator integration pattern matches existing agents before committing.
