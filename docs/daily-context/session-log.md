# Landscape Session Log

> Running log of development sessions. Newest first.
> Trigger: Say **"Document"** in any chat to add an entry.
> Claude Projects sessions use header: `Session [code] — [date] — Title (Claude Projects)`

## FB-290 Artifacts Panel Drag Handle — 2026-05-04

**What was discussed:**
- Triaged FB-290 ("artifacts panel width needs to be draggable") — capability already existed (built Apr 23), but visible-handle Pass 5 fix from commit `6f34429` (Apr 25) was applied only to `ProjectArtifactsPanel.tsx`, never to the matching `/w/chat` aside in `src/app/w/layout.tsx`.
- Fix: brought `layout.tsx` lines 421–441 to inline-style parity with `ProjectArtifactsPanel.tsx` lines 83–103 (6px / `var(--cui-border-color)` / 0.5 opacity / hover-to-primary / `title` tooltip).
- Frontend-only, single-file change. No backend, schema, or dependency impact.

**Open items:**
- Sidebar drag handle (`WrapperSidebar.tsx` line 329) uses the same invisible pattern — separate ticket if user reports it.
- `/w/chat` aside render gate excludes `activeArtifactId` (Phase 3 generative artifacts don't open the panel on unassigned threads) — separate ticket.

---

## Chat DA — Discriminator-Aware OS, Right-Panel Fix, Production Stabilization, S14 Testing — 2026-05-01

**What was discussed:**

- **Discriminator-aware operating statement (Phase 1 shipped).** Locked five design questions plus two edge cases plus the broader compositional reframe. Wrote the spec in dual format (tech `.md` + plain-English HTML) at `Landscape app/SPEC-OS-DiscriminatorAware-DA-2026-05-01.{md,html}`. Implemented Phase 1 directly: new `tbl_user_scenario_vocab` migration (universal per-user phrasing → canonical-value table), new `save_user_vocab` tool, `get_operating_statement` v2 with literal-or-phrasing resolution and ambiguous-scenario response path, BASE_INSTRUCTIONS additions for discriminator honesty + surface-with-provenance, OS guard `_check_label_data_consistency` rule. Production audit revealed `default` (945 rows / 63 projects) and `POST_RENO_PRO_FORMA` weren't in my canonical taxonomy — added with honest labeling (`default` → "Default (untagged)" / status `unknown`, NOT dressed up as a specific scenario). Commit `13346bf`. Tool count now ~271.

- **Right-panel artifacts fix.** Project landing page right panel was reverting to a project-documents list when no artifact was active — disorienting. Fixed `ProjectArtifactsPanel.tsx` to fall back to `ArtifactWorkspacePanel`'s empty state (Pinned + Recent + "No artifact selected"). Then per Gregg's pushback (modeled on Claude.ai's Memory/Instructions/Files pattern), added Project Documents back as a collapsible SECTION inside the workspace alongside Pinned, Recent, and Source Pointers. Commits `92ee2bb` + `dea1a68`.

- **Production stabilization.** Vercel builds were failing on every push since April 6 because `JWT_SIGNING_KEY` was set on Production but not on Preview env vars (and turned out also missing for the chat-artifacts pushes). Adding to all environments unblocked builds. Then Phase 1's larger BASE_INSTRUCTIONS pushed multi-tool Anthropic round-trips past gunicorn's default 30s worker timeout — bumped Railway's gunicorn to `--timeout 180` (commit `3f8d31c`). Production now stable end-to-end.

- **Chat panel projects-list fix.** On `/w/projects` (the project list page), the center chat panel was inheriting the last-visited project's chat context via the `lastProjectId` fallback. Per the design intent, that page is for general / unassigned chats. Fixed the layout's projectId computation to pass `undefined` when `pathname === '/w/projects'`. Same fix for projectName/projectLocation/projectTypeCode props.

- **Gitignore noise cleanup (settled with revert).** Earlier in this chat the `!**/migrations/*.sql` unignore from the release cut was exposing ~140 historical files. Multiple cleanup approaches discussed and rejected (deletion was unsafe — investigation revealed real code references like `backend/run_migration.py` reading `016_subdivision_underwriting_v1.sql`). Reverted the unignore entirely; documented the `git add -f` convention.

- **UI testing agent — S14 complete; framework `observe_only` fix landed; S15 in flight at chat close.** Wrote the first of a workflow-test family covering chat-driven equivalents of the legacy alpha18 input screens. S14 = Project Info Input via Chat Workflow (six phases). Process surfaced a chain of real bugs that all got fixed: JWT signing key being silently truncated by Next.js dotenv-expand on the `$5i` substring (fixed by escaping the `$` in `.env.local`), `config.NEXTJS_API_BASE` typo in test (fixed to `NEXTJS_BASE_URL`), missing `assumption_upsert` mutation handler (added), Next.js GET route omitting `total_units` / `gross_sf` / `year_built` / `acquisition_date` from SELECT (added), parallel `city/state/county` and `jurisdiction_*` column families on `tbl_project` getting written inconsistently (option (b) propagation: field_update mutation handler now mirrors writes to both sides, defending against silent divergence). Also discovered: `analysis_type` is a derived/legacy column — `analysis_perspective` is the directly-writable one (Landscaper correctly refused; test was updated). Framework structural defect addressed: `Validator.calibrate(...)` was becoming a hard equality assertion in test mode; added `observe_only=True` flag for stochastic values (tool names, project_id, response length). S14 finalized with 48 checks total (~16 hard outcome assertions, rest observability). S15 — Property Details — was in flight at chat close, CC executing.

**Open items:**

The natural-language and artifact-generation testing thread is in flight. The continuation handoff at `Landscape app/HANDOFF-NextSession-Workflow-Testing-2026-05-01.md` is the canonical pickup document for the next session — it has full context plus prioritized next steps. Highlights:

1. **Framework structural defect (priority 1, gates everything).** `Validator.calibrate(...)` becomes a hard equality assertion in test mode (`tests/agent_framework/validators.py:284`). Any LLM stochasticity (tool name choice, project_id, response length) flips test mode red even when the actual contract is intact. Fix: add `observe_only=True` flag — two-line change to `validators.py` plus pass-through at call sites that record stochastic values. CC has the design ready.

2. **Phase 1 prompt-discipline tweaks.** Model sometimes called `create_artifact` after `get_operating_statement` returned `code='ambiguous_scenario'` (should have stopped and asked the user). Also sometimes fired no tool at all on prompts like "Set the analysis perspective to investment." BASE_INSTRUCTIONS needs a tightening pass to address both. Same lineage as the discriminator-honesty rules.

3. **S15 — Property Details.** Next workflow scenario in the chain. Rent roll / units for MF; parcels / land use for Land Dev. Can be drafted in parallel with item 2 once item 1 lands.

4. **OPENAI_API_KEY missing on Railway.** Pre-existing (visible since at least Apr 12). Embeddings silently fail on Railway, degrading knowledge/RAG queries. Set the env var on Railway.

5. **BASE_INSTRUCTIONS bloat at 17.8K tokens.** ~80 lines of legacy T-12 strict-content rules in `backend/apps/landscaper/ai_handler.py` are superseded by the OS guard and can be removed for context-budget headroom.

6. **`_normalize_phrase` doesn't strip stop words.** "Show me the T-12" and "T-12" don't collapse to the same vocab key, so the silent-resolution path only fires when the model passes a normalized noun consistently. Small fix in `backend/apps/landscaper/tools/vocab_tools.py`.

7. **`/w/` routing restructure deferred.** Drop `/w/` prefix so chat-first lives at root paths; retire legacy folder/tab navigation surface entirely. Investigation surfaced collisions with existing `src/app/page.tsx` and the legacy `src/app/projects/[projectId]/page.tsx`. Multi-hour refactor — its own focused session.

8. **Cosmetic: county suffix normalization.** `bulk_update_fields` writes "Maricopa County"; minimal-create endpoint strips to "Maricopa". Input-layer fix in chat tool description, not a backend bug.

9. **F4 carryover from earlier sessions:** new-thread bug verification (`useLandscaperThreads.ts`), right-panel artifact selector default state on hard refresh, drag-handle resize verification, delete/archive thread UI affordance.

---

## Release Cut — Alpha18 → unified-ui as new main — 2026-05-01

**What was discussed:**
- Archived previous main (legacy folder/tab UI / alpha18 line) as branch `Alpha18-UI` for future hotfix access.
- Promoted `feature/unified-ui` to be the new `main`. Force-pushed to origin after local-beat verification.
- Vercel + Railway auto-deployed from new `main`. Production now serving the chat-first `/w/` shell + Phase 5 artifacts system + F-12 revert.
- Created new working branch `chat-artifacts` off new `main` for the next phase (discriminator-aware operating statements per chat DA).
- `feature/unified-ui` deleted (local + origin) — fully merged into main.

**Open items:**
- Gregg to mirror PROJECT_INSTRUCTIONS v4.1 to Cowork project settings + Claude project knowledge per §0.4 (CC scope ends at the repo).
- Discriminator-aware operating-statement design picks back up on `chat-artifacts` (chat DA, questions 1–5 still open).

---

## Generative Artifacts Item #1 — Source-Check Fix After Live Verify (Cowork chat gx) — 2026-04-30

**What was discussed:**
- Phase 1 guard shipped earlier today as `c2d18dd`. First live test on Chadron Terrace failed: model asked "generate a t12 operating statement" and the guard rejected with `missing_t12_source` even though the project has an OM that produced a successful T-12 composition earlier in the same thread.
- Root cause: my `doc_type` LIKE patterns were too narrow. Found canonical taxonomy in `docs/02-features/financial-engine/data_validation_lists_reference.md` — TitleCase values: Offering Memorandum, Operating Statement, Rent Roll, Appraisal, Site Plan, Financial Model, Legal Document, Survey, Environmental Report, Other. My patterns missed Financial Model, Appraisal, etc., and didn't have a NULL/custom-value catch-all.
- Also confirmed: right-panel UI labels (Diligence, Property Data, Market Data, Leases) are FOLDER names, not doc_type values. Different fields entirely.
- Fix written directly to `/Users/5150east/landscape/backend/apps/artifacts/operating_statement_guard.py`: broadened `doc_type` patterns in both `_has_t12_source` and `_has_market_rent_source` to cover the canonical taxonomy plus folder-style fallbacks; added a permissive last-resort probe joining `core_doc` to `core_doc_text` so any non-deleted doc with extracted text content passes. Test mock counts updated to match new probe sequences (t12 rejection: 2→3 fetchones; current_proforma rejection: 5→6).
- F4 item #2 (new-conversation-appends-to-existing-thread) surfaced as a side effect — every "new" thread the user started in /w/chat appended to the original. Means clean Phase 1 verify can't run until item #2 is fixed. Decision: ship the source-check fix now, then tackle item #2, then come back for clean live verify.
- CC handoff prompt drafted with the new session-name pattern (session ID at top, Step 0 echo-back, ID in commit footer) per the feedback memory established earlier this session.

**Open items:**
- CC commit/build/restart pass for the source-check fix (drafted prompt: `Landscape app/CC_PHASE1_GUARD_SOURCE_FIX.md`).
- F4 item #2 (new-thread-bug) is now blocking clean live-verify. Should be the next focus after the source-check fix ships.
- Phase 2 (multi-source conflict detection) still deferred until Phase 1 is observed in production — and with the broader source-presence check (permissive doc-text fallback), Phase 2's value goes UP because the false-positive rate goes up too.
- BASE_INSTRUCTIONS T-12 strict content rules (~80 lines) still NOT removed. Will migrate when Phase 1 is confirmed stable in production with clean threads.

---

## Generative Artifacts Item #1 — Phase 1 Guard Implemented (Cowork chat gx) — 2026-04-30

**What was discussed:**
- Continuation of chat F4 handoff. Original Item #1 ("programmatic content guard for T-12 artifacts") expanded into a richer behavior: subtype-aware enforcement + no-fabrication contract. Mental model: "Claude.ai reviewing an OM as its only knowledge" — surface conflicts as user choices, never silently pick.
- Locked three-subtype taxonomy: `t12` (pure historical, <10% of traffic), `f12_proforma` (T-12 trended forward via project growth assumptions, ~90% of traffic — the default for "show me a proforma"), `current_proforma` (operating statement at current asking/market rents, explicit ask only).
- Architecture: model declares `artifact_subtype` in `create_artifact` payload, guard cross-checks content matches subtype AND verifies required source data exists. Rejection envelope carries `guard_code` / `subtype` / `missing` / `guidance` / `suggested_user_question` so the model's retry path knows what to ask the user.
- Phasing decision: Phase 1 = subtype declaration + content-shape validation + permissive source-presence check (any source counts). Phase 2 = multi-source conflict detection — DEFERRED. Reasoning: Phase 1 alone fixes ~80% of the bleeding; Phase 2 needs real failure-mode data before material-conflict thresholds can be designed correctly. False positives = noise, false negatives = fabrication leaks.
- User opted out of dual-output spec drafting ("over my head, don't need to see a spec"). Went straight to implementation.
- Code shipped to `feature/unified-ui` (uncommitted, awaiting CC verify-and-ship pass). Files: new `backend/apps/artifacts/operating_statement_guard.py` (~370 lines, full Phase 1 logic + structured error type with envelope-extras helper); new `backend/apps/artifacts/tests/test_operating_statement_guard.py` (SimpleTestCase coverage of detection, subtype declaration, forbidden sections both all-subtypes and T-12-only, forbidden columns, OpEx 5-column shape, source-presence with mocked DB); edits to `services.py` (guard call after generic schema validation, before persistence), `artifact_tools.py` (thread `artifact_subtype` through), `tool_schemas.py` (added `artifact_subtype` enum field with full taxonomy in description).
- CC handoff prompt drafted: `Landscape app/CC_PHASE1_GUARD_VERIFY_AND_SHIP.md`. Includes downstream-impact analysis, schema-column existence check (`core_doc.is_deleted`, `tbl_unit_inventory.market_rent`), test commands, build verification, server restart, commit instructions. CC explicitly told NOT to add Phase 2 and NOT to touch BASE_INSTRUCTIONS in this pass.
- THREAD_STATE.md updated with full design rationale, source-data presence contract per subtype, files-touched manifest for the continuation session, architectural notes (lazy DB import for testability, raw SQL with try/except per probe, `project_id=None` skips source check), and known Phase 1 limitations.

**Open items:**
- CC verify-and-ship pass not yet run. Most likely real-world hiccup: `core_doc.is_deleted` column may have a different name in the live schema. CC instructed to confirm or adjust before running tests.
- Risk to watch: existing `OperationsTab` may generate OpEx artifacts with column keys that don't match the canonical `line/rate/annual/per_unit/per_sf` shape. Live verification will surface.
- Phase 2 spec design (task #4) waiting for Phase 1 to be live. Need real fabrication-failure data before designing conflict-detection thresholds.
- BASE_INSTRUCTIONS T-12 strict content rules (~80 lines) NOT removed in this pass. Migration deferred until Phase 1 confirmed stable in production. Will bring system prompt back under 15K soft ceiling.
- Items #2–#5 from F4 handoff (new-thread bug, right-panel default, draggable resize, delete/archive UI) untouched this session.

---



## Ingestion Workbench "Finish Later" + DMS Filter Endpoints — 2026-04-02

**What was discussed:**
- Implemented "Finish Later" option on Ingestion Workbench cancel — replaces destructive-only cancel with 3-way choice: Go Back, Finish Later (preserves all progress), Discard & Delete
- Updated navigation guard dialog to match: Stay, Save & Leave, Discard & Leave
- Added draft session resume capability — floating banner at bottom-right detects paused `draft` intake sessions, shows doc name, offers Resume or Dismiss
- Enhanced `IntakeStartView.get()` to return `docName` from `core_doc` for resume banner display
- Created `GET /api/dms/templates/all-doc-types` (Next.js) — deduplicated doc type names across all templates for combobox autocomplete
- Created `POST /api/dms/projects/{pid}/doc-types/{id}/reassign/` (Django) — reassigns all documents from one doc type to another before filter deletion, case-insensitive matching
- Both new endpoints verified working in local dev

**Open items:**
- Race condition when rejecting staging rows during active extraction still needs investigation (user reported "gets stuck" — likely polling/optimistic update interaction)

---

## Market Agents Round 2 + Extraction Pipeline Fix — 2026-04-02

**What was discussed:**
- Set up and tested 8 new market intelligence agents (Census BPS, HUD, MBA, KBRA, Trepp, Brokerage Research, Construction Cost, NAIOP)
- Fixed missing `beautifulsoup4` and `pdfplumber` dependencies in `pyproject.toml`
- Fixed FRED API frequency mapping bug — FRED rejects `daily`/`quarterly` as frequency params, only accepts `d`/`q`/`m`; added mapping in `fred_client.py`
- Rewrote seed SQL (`seed_bps_hud_series.sql`) to match actual `market_series` schema columns (`series_code`/`series_name`/`source`/`coverage_level`)
- Created migration `037_research_harvest_tables.sql` for `tbl_research_publication`, `tbl_research_financial_data`, `tbl_research_harvest_log`
- Rewrote Census BPS agent from broken REST API to CSV file downloads from `https://www2.census.gov/econ/bps/Place/West%20Region/`. 25 months backfilled, 17 AZ places + 3 counties, 1,119 rows
- Converted `extract_document_batched` endpoint to async (threading) — returns 202 immediately, runs extraction in background thread to prevent Railway timeout
- Fixed Workbench phantom conflict bug — single-source conflicts with no competing values treated as editable pending
- Brokerage research agent updated with JLL API integration
- Verified pdfplumber table extraction on C&W MarketBeat PDFs — structured submarket tables extract cleanly (vacancy, rent, absorption, cap rates)
- Deployed v0.1.17 — Vercel + Railway both healthy

**Open items:**
- HUD agent skipped — needs free API token registration at huduser.gov
- KBRA, NAIOP, RLB sites return HTTP errors (bot protection) — expected for scraping agents
- Trepp finds 0 articles — CSS selector mismatch with current site structure
- Census BPS agent only covers West Region (Arizona) — adding states requires downloading from other regional subdirectories
- Brokerage agent PDF table extraction works but `_extract_market_data` method needs wiring to parse extracted tables into `tbl_research_financial_data` records

---

## Agent Architecture — Phase 0 Discovery — 2026-04-02

**What was discussed:**
- Completed full Phase 0 discovery audit for production agent infrastructure (user-configurable autonomous tasks running within Vercel/Railway/Neon stack)
- Audited all existing scheduled task patterns (1 Vercel cron, 31 management commands, zero task queue), data pipelines (Redfin, FRED/BLS/Census, market agents, document extraction), and Railway deployment config
- Recommended **Django-Q2** as task queue — uses PostgreSQL as broker (no new infrastructure), adds `worker:` process to Railway Procfile, includes built-in scheduler + Django admin UI
- Proposed 3-table agent schema: `tbl_agent_definition` (config), `tbl_agent_run` (execution log), `tbl_agent_output` (audit trail) — JSONB config per agent type
- Drafted CC prompts for Phase 1 (install Django-Q2, create agents app, wire Redfin comp scan as proof-of-concept) and Phase 2 (REST API + Next.js agent management UI)

**Open items:**
- Railway worker billing — confirm plan tier supports second container for worker process
- Agent scope decision — project-scoped only vs. global agents across projects (schema supports both)
- LLM budget for agents — Phase 1 agents are deterministic; decide if Level 1 agents (report drafter, field validator) should include Claude calls
- Notification channel — Landscaper thread post sufficient for Phase 1, or need email/push?
- CC prompts ready to execute: `cc-prompt-agent-phase1-infrastructure.md`, `cc-prompt-agent-phase2-api-ui.md` (in Landscape app folder)

---

## Tier 1 Open Items — 2026-04-01

**What changed:**
- Rebuilt `LANDSCAPE_TEMPLATES_COWORK_BRIEF.docx` with finalized seed numbers (GPR $1,824K, NOI $1,230K, cap 5.0% → $24.6M) — full spec with schema change, clone API design, and implementation steps
- CC executed `CC_OPERATIONS_GET_MIGRATION.md` — Operations GET (1,303-line P&L route) migrated from Next.js to Django; `useOperationsData.ts` updated to call Django
- CC executed `CC_THREAD_RACE_CONDITION_DEBUG.md` — thread auto-selection race condition fixed; blank thread accumulation resolved

**Open items:**
- Operations GET: legacy Next.js route (`src/app/api/projects/[projectId]/operations/route.ts`) retained as dead code — delete after confirming Django route stable in production

---

## Alpha Cleanup + CLAUDE.md Sync — 2026-03-27

**What changed:**
- Verified all 20 report generators have real SQL with graceful degradation (Mar 25 session log incorrectly claimed 14 were stubs)
- Verified waterfall calc endpoint is fully wired (Next.js proxy → Django → Python engine) — was incorrectly flagged as 404
- Created `backend/apps/reports/migrations/0006_update_data_readiness.py` — updates stale `data_readiness` flags for all 20 report codes
- Migrated Operations save endpoints to Django: created `backend/apps/financial/views_operations.py` (2 views: `operations_inputs`, `operations_settings`), wired in `urls.py`, updated `useOperationsData.ts` and `OperationsTab.tsx` to call Django
- Updated CLAUDE.md: alpha readiness ~90%, Operations save ✅, Reports ✅, Waterfall ✅, corrected reportlab (not WeasyPrint), removed stale tech debt items
- CC verified all 7 checks pass: migration applied, both Django endpoints respond, waterfall not 404, data_readiness flags correct, report preview returns JSON, `npm run build` clean
- Reconciled 24 Claude Projects decision log sessions (Mar 11–25) into this session log

**Open items:**
- Operations GET endpoint (1,303-line P&L route) still on legacy Next.js — separate migration task, not alpha blocker
- Scanned PDF / OCR pipeline not implemented (only remaining alpha blocker)

**Cumulative Unfinished Business:**

🔴 Blocked (needs input or external action):
- Salman Ahmad docs color matching — blocked on: need MF user guide .docx with color metadata uploaded — last touched: 3/24 (from Claude Projects) ⚠️ stale

🟡 In Progress (started but incomplete):
- ~~Operations GET migration~~ — ✅ RESOLVED 4/1: CC executed `CC_OPERATIONS_GET_MIGRATION.md`; Django GET route live, `useOperationsData.ts` updated; legacy Next.js route kept as dead code pending production confirm
- Scanned PDF / OCR pipeline — status: OCRmyPDF identified as solution, not yet implemented — next step: build preprocessing step in `backend/apps/documents/` before `core_doc_text` ingestion — last touched: 3/20
- User guide production — status: MF Operations chapter complete, master outline done — next step: execute `COWORK_USER_GUIDE_BUILD_XK14.md` for full 14-chapter build — last touched: 3/16 (from Claude Projects, session XK) ⚠️ stale
- Conversational UI redesign — status: concept/spec complete, 6 HTML mockups produced — next step: begin Phase 1 layout shell implementation — artifact: `LANDSCAPE_CONVERSATIONAL_UI_CONCEPT_RX.md` — last touched: 3/23 (from Claude Projects, session RX)
- ~~Thread list UI missing from Landscaper panel~~ — ✅ RESOLVED: `ThreadList.tsx` present and integrated in `LandscaperChatThreaded.tsx` (auto-resolved, shipped prior to 4/1)
- ~~Thread auto-selection race condition~~ — ✅ RESOLVED 4/1: CC executed `CC_THREAD_RACE_CONDITION_DEBUG.md`; camelCase mismatch fixed + server-side guard added

🟠 Queued (designed/specified but not started):
- DMS version control — artifact: `CC_DMS_VERSION_CONTROL_XR2.md` — waiting for: CC execution (from Claude Projects, session XR) ⚠️ stale
- Rent comp harvester implementation — artifact: `CC_RENTAL_COMP_HARVESTER_REDFIN_GR30.md` — waiting for: schema migration on `tbl_rental_comparable` + CC execution (from Claude Projects, session GR)
- DMS Intelligence Layer — artifact: `COWORK_DMS_INTELLIGENCE_LAYER_KR17.md` — waiting for: Cowork execution (from Claude Projects, session KR)
- ~~Acquisition picklist migration~~ — ✅ RESOLVED 3/29: shipped in commit `9d510ab` (feat: acquisition event type picklist + CLOSING cost fix)
- Platform Intelligence Agents — artifact: `QWEN_MARKET_INTELLIGENCE_AGENT_PL1.md` — waiting for: Gern/Qwen execution (from Claude Projects, session PL) ⚠️ stale
- Platform knowledge audit — artifact: `CC_PLATFORM_KNOWLEDGE_AUDIT_XK18.md` — waiting for: CC execution (from Claude Projects, session XK) ⚠️ stale
- CoreUI audit — artifact: `COREUI_AUDIT_SKILL.md` — waiting for: OpenClaw/Qwen execution (from Claude Projects, session WX) ⚠️ stale
- ~~Project templates seed~~ — ✅ RESOLVED 4/1: `LANDSCAPE_TEMPLATES_COWORK_BRIEF.docx` rebuilt with finalized numbers

🔵 Verify (completed but unverified):
- Dropzone fix (Landscaper Panel + Content Area) — needs: live test on all tabs — last touched: 3/19
- Redfin SFD pricing fix for land dev — needs: live test on Weyyakin project — last touched: 3/19 (from Claude Projects)
- ~~Equity waterfall input components~~ — ✅ RESOLVED 4/1: `WaterfallConfigForm.tsx` present + actively extended through alpha15 (`3b9a97b`)
- ~~Loan scope UI save round-trip~~ — ✅ RESOLVED 4/1: code-verified — `containerIds` hydrates from `loan.containers` on mount (LoanCard.tsx:401-403), saves via payload (line 509)
- Geo auto-seeding end-to-end — needs: live test with Ketchum project (Census API calls need network) — last touched: 3/20
- Image reclassification — needs: "Rescan All PDFs" to run through updated classification prompt — last touched: 3/19

---

## Session KR — 2026-03-25 — Workflow Optimization (Claude Projects)

**Decisions:** Current workflow is Cowork (~90%), Claude Projects (architecture/strategy/KB), Terminal/CC (mechanical ops + DB). Permission prompts provide zero security value — `--dangerously-skip-permissions` or Auto Mode recommended for CC. Daily session log should be enhanced to include Claude Projects decision context via decision log reconciliation. Daily "unfinished business" prompt needed.

**Open questions:** Unfinished business prompt design (in progress during session)

---

## DB-Driven Report System (20 Reports) — 2026-03-25

**What was discussed:**
- Built and deployed the full DB-driven report system: 20 report definitions seeded into `tbl_report_definition`, property-type routing (LAND sees 13 reports, MF sees 14), 9 report categories, two-panel ReportsTab UI (ReportBrowser + ReportViewer).
- Created `PreviewBaseGenerator` base class with SQL helpers, formatting utilities, and section builders. All 20 generators inherit from it and implement `generate_preview()` returning structured JSON consumed by the React frontend.
- All 20 generators have real SQL queries with graceful degradation. CC verified all 8 success criteria passed.

**Open items:**
- ~~14 generators are stubs~~ — RESOLVED 3/27: all 20 have real SQL
- ~~PDF export pipeline not yet wired~~ — RESOLVED 3/27: reportlab PDF + openpyxl Excel in preview_base.py
- ~~CLAUDE.md needs update~~ — RESOLVED 3/27

---

## Session GX — 2026-03-24 — Acquisition Tab + Picklist Migration (Claude Projects)

**Decisions:** Acquisition Ledger event types migrate from hardcoded to `tbl_system_picklist`. Use existing `parent_id` column for grouping. `event_type` stores picklist codes not display names. "Closing Date" → "Closing" throughout.

**Artifacts:** `COWORK_ACQUISITION_PICKLIST_MIGRATION_GX5.md`

---

## Session VR — 2026-03-24 — ARGUS Report Catalog (Claude Projects)

**Decisions:** 106 reports across 3 ARGUS products (Enterprise 56, Developer 32, EstateMaster 18), ~75 unique after dedup. Three-phase Landscape implementation roadmap: 15 → 40 → 50+ reports.

**Artifacts:** `ARGUS_COMPREHENSIVE_REPORT_CATALOG.md`

---

## 2026-03-24 — ARGUS vs Landscape Technical Brief (Claude Projects)

**Decisions:** Landscape contains all inputs/calculations across 3-app ARGUS suite. ~35 capability rows mapped. Beyond ARGUS: 5 domains (AI/Doc Intelligence, Comparables, DMS, GIS, Platform Architecture). Estimated 85-90% cost reduction.

**Artifacts:** Technical brief (Word doc, 5 sections)

---

## 2026-03-24 — Alpha Tester Emails (Claude Projects)

**Decisions:** Mark Stapp email: avoid "appraisal" framing entirely, describe analytical foundation in plain language. Platform URL: https://landscape-hazel.vercel.app

**Artifacts:** Salman Ahmad email + architecture brief (2 docx files), Mark Stapp email draft

**Open questions:** Salman docs need color matching to MF user guide — pending .docx with color metadata

---

## 2026-03-24 — Cowork Project Instructions (Claude Projects)

**Decisions:** Adapted Claude Project Instructions v2.3 for Cowork. Key changes: §1.1 Capability Boundaries (no terminal/git/DB), CC prompts reframed as drafting, `.cjs` docx pattern added.

**Artifacts:** `COWORK_LANDSCAPE_PROJECT_INSTRUCTIONS_v1.0.md`

---

## 2026-03-23 — HEALTH CHECK FAILURE

**Failed checks:**
- Both servers DOWN — Next.js (port 3000) and Django (port 8000) not responding
- All 14 endpoint checks skipped due to servers being unavailable

**Passing checks:** 0 of 14 passed

**Possible causes:**
- Servers were not started in the Cowork VM environment (this is a sandboxed session — servers need to be launched manually)
- No recent commits suggest breaking changes — last commit was `3f1d84f chore: bump version to v0.1.09` (3 days ago)

---

## Session GV — 2026-03-23 — Altus/ARGUS Competitive Intelligence (Claude Projects)

**Decisions:** ARGUS Intelligence base tier included with every Enterprise subscription; Portfolio Manager and Benchmark Manager are paid add-ons. New CEO Mike Gordon, $800M capital return, Appraisals sold to Newmark. No named individuals in competitive materials.

**Artifacts:** `ALTUS_COMPETITIVE_INTELLIGENCE_UPDATE_GV5.docx`

---

## Session RX — 2026-03-23 — Conversational UI Redesign (Claude Projects)

**Decisions:** Studio tile/tab structure abandoned. Target: three-panel layout (collapsible sidebar, Landscaper chat center, dynamic worksheet right). Proposal cards in chat with "Go ahead/Hold on" confirmation. Float-to-window worksheets (`/projects/[id]/worksheet/[module]`). Phased implementation: Phase 1 layout shell, Phase 2 float-to-window, Phase 3 inline artifacts + Landscaper integration.

**Artifacts:** `LANDSCAPE_CONVERSATIONAL_UI_CONCEPT_RX.md`, 6 interactive HTML mockups

**Open questions:** Implementation not started — concept/spec phase only

---

## 2026-03-22 — Cowork Migration Assessment (Claude Projects)

**Decisions:** Migration from Claude.ai project to Cowork project NOT recommended. Two-workspace model: Claude.ai = primary brain (architecture, judgment, KB queries), Cowork = task execution (batch files, user guide, screenshots).

---

## Geo Auto-Seeding + Micropolitan Support + Location Tab Fixes — 2026-03-20

**What was discussed:**
- Multiple interconnected Location tab bugs traced and fixed: `jurisdiction_city` not syncing with `city` on project profile PATCH, mutation approval UI not rendering in thread-based `ai_handler.py`, state name normalization ("Arizona" vs "AZ") breaking geo_xwalk lookups, and location analysis not persisting on navigation.
- Built a complete auto-seeding system for `geo_xwalk` — any US city now auto-resolves its full geographic hierarchy (US → State → MSA/μSA → County → City) via Census Bureau APIs on first Location tab load. No manual seeding required.
- Added Micropolitan Statistical Area (μSA) support throughout the stack.

**Open items:**
- Test end-to-end with Ketchum project on running dev server (Census API calls need network access)
- Market data ingestion for Micropolitan areas — FRED/BLS series codes for μSAs not yet mapped
- Full Census CBSA delineation file parsing (currently uses hardcoded μSA fallback + dynamic geocoder extraction)

---

## Satellite Imagery Research + Rent Comp Harvester POC — 2026-03-20

**What was discussed:**
- Rent comp harvester POC tested across 4 sessions. Redfin rentals API validated as primary data source — 200-700+ properties per polygon query. Polygon search is only reliable approach.
- Schema migration needed on `tbl_rental_comparable`: missing 10+ columns.
- Satellite absorption concept validated conceptually but not POC-tested. Sentinel-2 sufficient for construction detection.

**Key artifacts:**
- `CC_RENTAL_COMP_HARVESTER_REDFIN_GR30.md` — POC v2 prompt (Redfin rentals API)
- `LANDSCAPE_INTELLIGENT_MARKET_DATA_HARVESTING_CONCEPT.md` — Feature concept doc
- `backend/tools/redfin_ingest/rental_comp_poc_v2.py` — Working POC script

**Open items:**
- Scope rent comp harvester implementation — schema migration, backend service, API endpoint, frontend, Landscaper tool
- Test Redfin rentals API from Railway/production environment
- Evaluate paid API fallback (RentCast, HelloData, Dwellsy API IQ)
- Satellite POC — Maricopa API + Google Earth Engine (future session)

---

## Appraisal Extraction Pipeline — 2026-03-20

**What was discussed:**
- Built end-to-end appraisal/URAR document extraction support for Land Dev projects
- Created 4 new Landscaper tools for appraisal knowledge
- Added URAR-specific extraction prompt hints in `extraction_service.py`

**Open items:**
- `tbl_valuation_reconciliation` lacks unique constraint on `project_id`
- Comparable sales from appraisals not yet routed to structured `tbl_comparables`
- `source_page` still not populated by extraction pipeline
- No REST endpoint to query cross-project market data yet

---

## Session GR — 2026-03-20 — Satellite Imagery + Rent Comp Harvester (Claude Projects)

**Decisions:** Sentinel-2 (10m, free) sufficient for construction detection. Target: Sunbelt horizontal growth (Phoenix, DFW, Houston) — LA dropped. Redfin rentals API validated (231 Hawthorne, 709 Phoenix results). Polygon search only reliable approach. RentCafe/Yardi GA4 = best enrichment. "Appraiser" label too narrow — analytics serve developers, investors, lenders equally.

**Artifacts:** `LANDSCAPE_INTELLIGENT_MARKET_DATA_HARVESTING_CONCEPT.md`, `CC_RENTAL_COMP_HARVESTER_REDFIN_GR30.md`, `backend/tools/redfin_ingest/rental_comp_poc_v2.py`

**Open questions:** Schema migration for `tbl_rental_comparable` not executed. Redfin API needs Railway/production test. Satellite POC not tested.

---

## Session KR — 2026-03-20 — DMS Intelligence Layer Design (Claude Projects)

**Decisions:** Universal document intelligence: any DMS upload auto-analyzed in background, surfaced via flag indicator. Flag click opens Landscaper triage. Screenshot drop zone: drag PNG → modal asks "use on page" or "add to DMS". Minimal friction UX, short naming, defer complexity, reuse infrastructure.

**Artifacts:** `COWORK_DMS_INTELLIGENCE_LAYER_KR17.md` — 12 sections, 5 phases, 6 deliverables

---

## Hierarchy Visibility, Dropzone Restrictions, Parcel Import Tools — 2026-03-19

**What was discussed:**
- Fixed hierarchy toggle not hiding Areas/Phases CCards
- Removed restrictive MIME-type accept filters from all 5 dropzone components
- Built 3 new Landscaper parcel import tools with modeling advisor instructions

**Open items:**
- Workbench tile tab config for land dev parcels — deferred
- `livable_sf` column migration on `tbl_parcel`
- Field registry CSV additions for parcel-level extraction
- Full spreadsheet extraction pipeline integration

---

## Documents Media Gallery — Visibility Fix, Favorites, Classification, Rescan — 2026-03-19

**What was discussed:**
- Fixed gallery clipped by CSS overflow
- Rewrote classification prompt to prioritize real photographs
- Added favorites (localStorage) and skip-deleted rescan option

**Open items:**
- Existing misclassified images need "Rescan All PDFs" run
- Django endpoint for doc 118 media hanging — possible performance issue
- Favorite state is client-side only (localStorage)

---

## Demographics On-Demand Loading + County Selector Fix — 2026-03-19

**What was discussed:**
- Expanded demographic loading from 4 states to all 50 + DC
- Built on-demand loading with polling UI
- Fixed county parcel selector visibility (Phoenix MSA only)

**Open items:**
- Only 5-mile ring visible on map UI (1 and 3-mile data exists in backend)
- Texas demographic data not yet loaded

---

## Dropzone Fix — Landscaper Panel + Content Area — 2026-03-19

**What was discussed:**
- Restored dropzone to LandscaperPanel with react-dropzone + useFileDrop()
- Fixed DropZoneWrapper CSS sizing inside flex parent

**Open items:**
- Needs live testing to confirm both dropzones trigger UnifiedIntakeModal on all tabs
- Verify CollapsedLandscaperStrip auto-expand still works on file drop

---

## 2026-03-19 — Sun Valley Issues + Redfin Fix (Claude Projects)

**Decisions:** Three issues identified: PDF ingestion gap (structured data ignored), missing Location sub-tab on land dev, broken Redfin SFD pricing. Redfin bug root cause: `minYearBuilt` default set to `currentYear - 2` filters out older stock. Full 4-file chain traced. PDF ingestion gap: preference for triage flow where Landscape surfaces categorized findings, user decides what to load.

**Artifacts:** Cowork handoff prompt for Redfin SFD fix (5 verification tests against Weyyakin project)

---

## 2026-03-19 — Interactive Map Navigation Research (Claude Projects)

**Decisions:** 35-tool inventory, 9 interaction patterns compiled. MapLibre GL JS confirmed. Deepblocks = closest analog but analytically shallow. Landscape's analytical depth (DCF, multi-phase hierarchy, time-series cash flow) = distinct whitespace. Click-to-navigate pattern: clicking spatial polygons to navigate hierarchy and edit project data = target UX.

**Artifacts:** Consolidated research document (35 tools, 9 patterns, executive summary)

---

## 2026-03-19 — Teravalis Demo / SAM Site Plan Extraction (Claude Projects)

**Decisions:** SAM (`segment-geospatial` v0.10.7, `vit_b` model, MPS backend) selected for polygon extraction. OpenCV color segmentation rejected (293 noisy polygons). Fastest demo path: obtain shapefiles from Teravalis team → GeoJSON → MapLibre layer → container hierarchy. Mac Mini M4 24GB = target machine.

**Open questions:** SAM extraction script + outputs not yet produced

---

## Intake Modal Fixes + Knowledge Search + Comp Pipeline — 2026-03-18

**What was discussed:**
- Fixed .xlsx upload failure, intake modal closing during form interaction, extraction queue trash button, knowledge intents creating queue entries
- Added RESPONSE STYLE, MANDATORY TOOL USE, AVOIDING REDUNDANCY to Landscaper system prompt
- Made `query_platform_knowledge` search both reference corpus and user-uploaded docs
- Fixed cap rate normalization in `update_sales_comparable`

**Open items:**
- Thread list UI missing from Landscaper panel — no way to browse/switch threads
- Thread auto-selection race condition on mount
- Landscaper response vanishing on refresh — related to thread race condition
- `docs/diagnostics/xlsx-upload-failure-2026-03-18.md` can be deleted

---

## Session ZK — 2026-03-17 — DMS Upload Failure Debug (Claude Projects)

**Decisions:** XLSX drag-drop failing with empty `{}` response from Django. File uploads to UploadThing successfully — failure is in Django document record creation. Hypothesis: missing `doc_type` or serializer validation failure.

**Artifacts:** `CC_DMS_XLSX_UPLOAD_DEBUG_ZK.md`

**Open questions:** Root cause not confirmed — needs Railway log inspection

---

## Session XK — 2026-03-16 — Alpha Documentation + User Guide + Platform Knowledge (Claude Projects)

**Decisions:** Alpha welcome copy finalized (Ferrari-builder analogy). Feedback: #FB tag in Landscaper → Discord. User guide: 14 chapters, 4 parts, PDF-exportable, function-by-function. Route: `/guide` (not `/documentation`). MF Operations chapter = formatting template. Platform knowledge: shared baseline + per-user extensibility, new-user seeding hook.

**Artifacts:** `LANDSCAPE_USER_GUIDE_MASTER_OUTLINE.md`, `COWORK_USER_GUIDE_BUILD_XK14.md`, `CC_PLATFORM_KNOWLEDGE_AUDIT_XK18.md`

**Open questions:** Platform knowledge migration pending Phase 0 audit

---

## 2026-03-16 — Google Stitch MCP / UI Skill Evaluation (Claude Projects)

**Decisions:** UI-UX-Pro-Max skill rejected — no awareness of existing component structure or CoreUI compliance. CoreUI theme token swap recommended for safe visual refresh. Standalone marketing/pitch page identified as safe use case. Key insight: flawless workflow execution more impactful for investor demos than visual rethemes.

---

## 2026-03-15 — Landscaper Toolset Redesign Recovery (Claude Projects)

**Decisions:** Tool filtering re-enabled after "nuclear option" period (Mar 9). Counts reduced from 217 (all tools) to 128-155 (property-type filtered). Landscaper switched from Opus to Sonnet 4. §19 Token Economy added to project instructions. System prompt trim initiated.

---

## Session WB — 2026-03-14 — Silent Write Failure (Site Acres) (Claude Projects)

**Decisions:** Confirmed §17 ALLOWED_UPDATES pattern. Likely cause: field name doesn't match `acres_gross` in `tbl_parcel`. Ownership_type refusal is separate Landscaper guard rail.

**Open questions:** Merge status of prior ALLOWED_UPDATES fix unconfirmed

---

## Session QT — 2026-03-14 — Reports System Design (Claude Projects)

**Decisions:** 20-report master inventory. "Export what I see" screen-level Excel = separate capability. Sources & Uses = foundational priority. TMR Investors Excel format = design reference. Phase 0 pilot: 3 screenshots first. Design all 20 now, wire live data as calculations come online.

**Artifacts:** `COWORK_REPORT_DISCOVERY_AND_DESIGN_QT9.md`

---

## 2026-03-14 — OpenClaw / Qwen Hardware Comparison (Claude Projects)

**Decisions:** PC: i9-9900K, RTX 4070 12GB VRAM, 32GB RAM. Qwen2.5-Coder-7B at Q6/Q8 viable on GPU. 32B requires significant CPU offloading.

**Open questions:** Mac Mini vs PC final recommendation never completed

---

## Session PL — 2026-03-13 — Platform Intelligence Agents (Claude Projects)

**Decisions:** 6 agents designed: Market Intel, Comp Research, Doc Intel, Underwriting, Planning/Regulatory, Portfolio. Market Intelligence is priority #1. Celery absent from codebase — keep agents in existing `market_agents` service. Agents are advisory never authoritative. `agent_insight` + `agent_run_log` = two new core tables. Rule-based Python first; LLM reserved for natural language synthesis only. Gern/Qwen runs locally, writes to Railway PostgreSQL.

**Artifacts:** Architecture spec (Word doc, 10 sections), `QWEN_MARKET_INTELLIGENCE_AGENT_PL1.md`

**Open questions:** UI surface for displaying agent insights

---

## 2026-03-13 — Loan Save Failure Debug (Claude Projects)

**Decisions:** Confirmed `debt_facilities` table (Phase 5 Capitalization) is relevant, not `tbl_loan` (Phase 1). Need HTTP status + response body from DevTools for targeted fix.

**Open questions:** Root cause not identified — awaiting browser DevTools output

---

## Session RJ — 2026-03-12 — Field Catalog Document Scoping (Claude Projects)

**Decisions:** Classification: Option C (input, display-only, calculated). Format matches user manual Chapter 10 MF document. Claude designs, Cowork executes.

**Open questions:** Chapter 10 MF document location disputed

---

## 2026-03-12 — CoStar Comp Search for LA Apartments (Claude Projects)

**Decisions:** MF, arms-length, last 12 months, 5-149 units, year built 1971-2009. 6-city rent control exclusion list (LA, Santa Monica, West Hollywood, Beverly Hills, Inglewood, Culver City). Hawthorne correctly excluded from list.

---

## 2026-03-12 — Project Templates Feature Design (Claude Projects)

**Decisions:** Shadow project pattern: `is_template = true` flag. Templates edited through normal project UI, cloned via deep-copy API. First seed: 50-unit LA MF property (GPR $1,824K, vacancy 5%, NOI $1,230K, 5.0% cap → $24.6M). Management 3% EGI. Replacement reserve $300/unit/yr.

**Artifacts:** `LANDSCAPE_TEMPLATES_COWORK_BRIEF.docx` (needs rebuild with final numbers)

**Open questions:** Per-category growth rate overrides (Prop 13 tax, insurance) — future requirement

---

## DMS Drag-to-Reclassify — 2026-03-11

**What was discussed:**
- Audited the full drag-to-reclassify implementation. Feature is already fully built — no code changes needed.

**Open items:**
- None

---

## Loan Scope UI + Cash Flow Stacking — 2026-03-11

**What was discussed:**
- Added container assignment UI to `LoanCard.tsx` — radio for "Entire Project" + area/phase checkboxes
- Wired `container_ids` into save payload, verified loan stacking in both cash flow services

**Open items:**
- Haven't tested the full save round-trip in browser
- Income property cash flow doesn't filter loans by container (acceptable for MF, may need attention for mixed-use)

---

## Waterfall Fixes — 2026-03-11

**What was discussed:**
- Created session logging system: `docs/daily-context/session-log.md`
- Added "Document" command instructions to CLAUDE.md

**Open items:**
- None

---

## Add Parcel Cascading Taxonomy — 2026-03-11

**What was discussed:**
- Fixed runtime error in `addParcelFromRow`
- Implemented progressive field reveal and cascading taxonomy dropdowns

**Open items:**
- None

---

## Session FH — 2026-03-11 — Cash Flow Pipeline Architecture Doc (Claude Projects)

**Decisions:** No consolidated cash flow pipeline documentation existed — scattered across ~5 prior sessions. Created single authoritative reference covering both project types: DCF, debt service, net cash flow, waterfall, partner distributions.

**Artifacts:** `LANDSCAPE_CASHFLOW_PIPELINE_ARCHITECTURE.md`

**Open questions:** 8 known gaps documented (priority-rated). Reversion PV bug fix convention documented.

---

## Session VF — 2026-03-11 — Equity Waterfall Interface Recovery (Claude Projects)

**Decisions:** Confirmed waterfall input components had been deleted from UI. Located three prior design sessions. Status left pending verification.

**Open questions:** Were deleted input components restored? Status unclear.

---

## Session XR — 2026-03-11 — DMS Version Control Implementation (Claude Projects)

**Decisions:** Full drag-to-link version control designed but never shipped (0 of 4 pieces implemented). CC prompt drafted with mandatory Phase 0 discovery to account for March 7-8 sprint changes.

**Artifacts:** `CC_DMS_VERSION_CONTROL_XR2.md` — 4 phases

**Open questions:** IntakeChoiceModal and UploadStagingContext flagged as regression risks

---

## Session WX — 2026-03-11 — CoreUI Audit Skill for OpenClaw (Claude Projects)

**Decisions:** 9 violation types defined. Skip rules for prototype/preview/legacy files. Specific routes excluded. P1/P2/P3 remediation prioritization.

**Artifacts:** `COREUI_AUDIT_SKILL.md`

---
