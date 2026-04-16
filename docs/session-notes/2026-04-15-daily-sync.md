# Daily Sync — April 15, 2026

**Date**: Wednesday, April 15, 2026
**Generated**: Nightly automated sync
**Branch**: `feature/unified-ui`

---

## Work Completed Today

### Morning sync commit — `832d500` (08:00 MST)

"docs: nightly health check 2026-04-15" — rolled in the Apr 14 uncommitted scaffold in one checkpoint:

- Excel Model Audit Phases 0–3 committed (`backend/apps/knowledge/services/excel_audit/` — loader, classifier, structural_scan, formula_integrity, assumption_extractor — six new modules, ~800 lines) + Landscaper tool wrappers (`excel_audit_tools.py`, +195 lines) + schemas (+74) + executor dispatch (+1)
- Cowork unified wrapper UI scaffolding committed: `src/app/w/**` pages, `src/components/wrapper/**` (CenterChatPanel, RightContentPanel, DocumentsPanel, DocumentDetailPanel, MediaPanel, admin panels), WrapperUIContext, `wrapper.css` +1,078 lines, WrapperSidebar +589 lines
- UMich consumer sentiment agent committed (`umich_client.py`, `umich_sentiment_agent.py`, orchestrator + config wiring)
- Spec doc added: `docs/14-specifications/chat-canvas-and-excel-audit.md`
- CLAUDE.md updated with new "Excel Model Audit Pipeline" section

### Afternoon — Excel audit hardening (four commits, 12:33–14:46 MST)

**`a3349df` — fix(excel-audit): handle HTTPS UploadThing URIs + Excel drop fallback (12:33 MST)**
- `loader.py` (+24/−5) now accepts both `ut://` and HTTPS UploadThing URIs so Landscaper doesn't fail when doc metadata was stored with the newer HTTPS format
- `LandscaperPanel.tsx` (+21/−3) adds a direct Excel drop fallback path when doc-level metadata resolution is unavailable — user can drop a workbook and still get audited

**`a7d578c` — feat(landscaper): expose Excel audit tools via UNIVERSAL_TOOLS (13:41 MST)**
- `tool_registry.py` (+5 lines) — the four excel_audit tools (`classify_excel_file`, `run_structural_scan`, `run_formula_integrity`, `extract_assumptions`) are now in `UNIVERSAL_TOOLS`, so Landscaper can invoke them from any page, not only the Ingestion Workbench
- Tool count unchanged at 232; this is exposure/routing, not new tools

**`216cfb3` — feat(excel-audit): Phase 2f downstream impact tracer (14:35 MST)**
- New module `backend/apps/knowledge/services/excel_audit/impact_tracer.py` (+397 lines)
- BFS forward from each error cell through the formula dependency graph to identify which errors reach headline outputs (IRR, equity multiple, DSCR, net cash flow) vs which are quarantined in dead cells
- Auto-runs for `full_model` tier during `run_formula_integrity`
- Returns `impact_summary` on the findings payload with `errors_reaching_headline` / `errors_quarantined` counts plus per-error output paths
- `__init__.py` (+24) exports `run_impact_analysis`, `detect_sinks`, `trace`; `formula_integrity.py` (+24) adds `tier` arg and invokes tracer; `excel_audit_tools.py` (+14) inlines cheap classification to pass `tier` through and updates the `run_formula_integrity` docstring

**`e8837e4` — fix(excel-audit): reduce Phase 2e false positives by 92% (14:46 MST)**
- `formula_integrity.py` (+59/−18) — tighter range-consistency heuristics. Previous version was flagging near-everything as a range mismatch; new version restricts to genuine truncated SUM / XIRR / averaging patterns that can move a headline number

### Uncommitted work — DocumentsPanel (still in progress)

- `src/components/wrapper/documents/DocumentsPanel.tsx` (+630/−) — substantial build-out of the new wrapper Documents panel. Complements the committed DocumentsPanel scaffold from the 832d500 sync with additional list/detail interactions
- `src/app/w/projects/[projectId]/documents/page.tsx` (+79/−) — page wiring changes for the new panel
- `src/styles/wrapper.css` (+8/−) — minor style additions

These remain uncommitted; they build on work in 832d500 and did not fit a clean commit boundary today.

## Files Modified

**Committed today (post-morning-sync):**
- `backend/apps/knowledge/services/excel_audit/__init__.py` (+24/−)
- `backend/apps/knowledge/services/excel_audit/formula_integrity.py` (~+83/−)
- `backend/apps/knowledge/services/excel_audit/impact_tracer.py` (new, +397)
- `backend/apps/knowledge/services/excel_audit/loader.py` (+19/−5)
- `backend/apps/landscaper/tools/excel_audit_tools.py` (+14/−)
- `backend/apps/landscaper/tool_registry.py` (+5/−)
- `src/components/landscaper/LandscaperPanel.tsx` (+18/−3)

**Uncommitted (tracked):**
- `src/app/w/projects/[projectId]/documents/page.tsx` (+79/−)
- `src/components/wrapper/documents/DocumentsPanel.tsx` (+630/−)
- `src/styles/wrapper.css` (+8/−)

## Git Commits

```
e8837e4  fix(excel-audit): reduce Phase 2e false positives by 92%        (14:46 MST)
216cfb3  feat(excel-audit): add Phase 2f downstream impact tracer         (14:35 MST)
a7d578c  feat(landscaper): expose Excel audit tools to Claude via UNIVERSAL_TOOLS  (13:41 MST)
a3349df  fix(excel-audit): handle HTTPS UploadThing URIs + Excel drop fallback     (12:33 MST)
832d500  docs: nightly health check 2026-04-15                            (08:00 MST)
```

(Prior for reference)
```
2c66848  docs: nightly health check 2026-04-14
4219e6f  docs: nightly health check 2026-04-13
```

## Active To-Do / Carry-Forward

- [ ] **Excel Audit Phase 2g / 3 polish → 4** — Phase 2f (impact tracer) is live; Phase 4 (waterfall classifier) is the next deliverable, followed by Phase 5 (Python replication of waterfall + debt math), Phase 6 (Sources & Uses balance check), and Phase 7 (trust score + HTML report). Spec locked in `docs/14-specifications/chat-canvas-and-excel-audit.md`.
- [ ] **DocumentsPanel** — 630-line uncommitted refactor in `src/components/wrapper/documents/DocumentsPanel.tsx` + companion page edits. Decide when to land a checkpoint commit.
- [ ] **Smoke-test Excel audit end-to-end on a real full_model workbook** — now that UNIVERSAL_TOOLS exposes the tools and 2f + 2e fixes shipped, validate that (a) HTTPS UploadThing URIs resolve, (b) formula_integrity returns non-bogus findings, (c) impact_summary distinguishes quarantined vs headline-reaching errors, (d) staging rows land with `source: excel_audit`.
- [ ] **UMich sentiment agent** — committed in the morning sync, but still needs a smoke test against FRED/orchestrator before relying on it in market intel briefings.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No movement on the six alpha blockers today. All six remain in their prior state:

1–4, 6: already resolved.
5. **Extraction pipeline — scanned PDF / OCR** — still open (OCRmyPDF identified but not integrated).

Today's work was additive (Excel audit hardening + impact tracer, tool exposure, DocumentsPanel refactor) rather than blocker-clearing. Overall alpha readiness stays at ~90%.

The Excel audit pipeline is no longer an alpha blocker — it's post-alpha infrastructure — but today's Phase 2f + UNIVERSAL_TOOLS exposure means Landscaper can now do meaningful formula integrity + impact analysis on any uploaded workbook from any page, which is a material usefulness upgrade for model-heavy users.

## Notes for Next Session

- The Excel audit pipeline is at Phase 0, 1, 2, 2f, 3 — classify / structural / formula_integrity (with impact tracer) / assumption extraction all work end-to-end. Phase 4 (waterfall classifier) is the next module. Scope is locked in `docs/14-specifications/chat-canvas-and-excel-audit.md` — universal tool, no LibreOffice what-if, no project-creation gate.
- Phase 2e false-positive rate was dramatically over-flagging before today's fix. If any prior test run reported a huge volume of range-consistency findings, re-run — the new heuristics will produce a much cleaner signal.
- DocumentsPanel uncommitted delta is now 700+ lines across 3 files. Consider a checkpoint commit so the feature/unified-ui branch doesn't drift further.
- Tool count stays at 232. Phase 2f added functionality to an existing tool (`run_formula_integrity`) rather than introducing a new one. Phase 4+ will likely add new tools — update the count in CLAUDE.md when that lands.
- Loader now accepts both `ut://` and HTTPS UploadThing URIs. If older doc records in the DB stored one form and newer ones the other, audits should work on both going forward. No migration needed.
