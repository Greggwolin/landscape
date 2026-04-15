# Chat Canvas & Excel Audit Integration — Specification

**Status:** Draft — April 14, 2026
**Owner:** Gregg
**Scope:** Pre-project chat surface, conversational ingestion, Excel audit pipeline, project creation gate
**Related:** `comp-ingestion-workbench-spec.md`, `unified-intake-design.md`, `LANDSCAPER_CURRENT_STATE.md`

---

## 1.0 Overview

### 1.1 Problem
Landscape currently requires a formal project before any meaningful work can happen. Users cannot analyze a pending deal, explore a comparable sale, or discuss a market without first creating a named project — which pollutes the project list with speculative entries and forces premature commitment. Separately, Excel uploads today are parsed as flat text and handed to an LLM with no formula awareness, no cell references, no integrity checks, and no verification that the model's visible numbers are actually correct.

### 1.2 Vision
Two changes, coupled because they share the same chat surface:

1. **Chat canvas.** A new chat can start unassigned (general scratchpad) or scoped to an existing project. Unassigned chats can be promoted into projects mid-conversation. This mirrors the Claude web pattern — chat lives at the user level until scoped.
2. **Excel audit pipeline.** Every Excel upload is classified and routed through a formula-aware audit layer. The audit produces cell-referenced assumptions, verifies formula integrity, and (for financial models) replicates waterfall and debt math in Python. The audit's structured output feeds the ingestion/staging pipeline. Findings surface in chat; a full HTML report is generated on demand.

### 1.3 Success Criteria
1.3.1 User can start a chat with no project selected, upload a file, and get analysis.
1.3.2 Landscaper can spin up a real project from a pre-project chat, with the user curating which artifacts migrate and which chat-discussed values become pending staging rows.
1.3.3 Every extracted value from an Excel file carries a `Sheet!Cell` reference.
1.3.4 Deterministic formula errors in uploaded Excel models are caught before the user acts on the numbers.
1.3.5 For financial models, Landscape's engine reproduces the model's outputs (or explains the delta) before project creation completes.

---

## 2.0 Chat Canvas

### 2.1 Two Chat Scopes
2.1.1 **Unassigned chat.** No project context. Available tools: Landscaper platform knowledge, market data, map, document analysis, Excel audit, web search. Not available: project-scoped CRUD surfaces (Documents nav, Reports nav, Map nav item in the left rail). These links are **hidden** when no project is selected.
2.1.2 **Project-scoped chat.** Project context applied. Full left rail. All tools available. Chat participates in the project's thread history.

### 2.2 Capability vs. Navigation Separation
The left nav links (Documents, Reports, Map) are **persistent surfaces** for project-managed data and must hide when no project is active. The **underlying capabilities** (map rendering, document extraction, comp tables, financial reports) are summonable by Landscaper in any chat. When a user asks "show me a map of the property relative to the nearest major airport" in an unassigned chat, Landscaper invokes the map tool and renders an interactive map in the right-side flyout panel — it does **not** navigate to a Map page. Same pattern for ad-hoc comp tables, rent roll extractions, market data lookups.

### 2.3 Ephemeral Artifacts in Unassigned Chats
Artifacts generated in an unassigned chat (map views, comp tables, extracted PDF data, Excel audit reports) are stored against the chat thread, not a project. They persist for the chat's lifetime. If the chat is deleted, artifacts are deleted.

### 2.4 Project Promotion Flow
2.4.1 User (or Landscaper autonomously) initiates project creation from within an unassigned chat.
2.4.2 Landscaper confirms property type, deal type, and name — pulling from chat context where possible, asking where not.
2.4.3 **Chat disposition prompt** (spec point 2c from design discussion): Landscaper asks "Move this chat into the new project, or keep it here as a general thread?" User chooses. If moved, the thread becomes the project's first chat. If kept, the project gets a link reference back to the originating chat.
2.4.4 **Artifact curation prompt** (spec point 3b): Landscaper presents a checklist of artifacts generated during the chat. "I generated these during our chat: [list]. Which should I save to the new project?" User checks items to migrate. Unchecked items stay chat-scoped.
2.4.5 **Conversational ingestion reconciliation** (spec point 4c): For values discussed in chat but never formally staged, Landscaper creates pending staging rows tagged `source: conversation` distinct from `source: extraction`. User reviews in the Ingestion Workbench and accepts per row.

### 2.5 Data Model Changes
2.5.1 New table `tbl_chat_thread` — existing if Landscaper threads already have this; verify and extend if so.
2.5.2 New nullable column `tbl_chat_thread.project_id` — when NULL, thread is unassigned.
2.5.3 New table `tbl_chat_artifact` — stores ephemeral artifacts keyed to chat threads; has nullable `project_id` populated when artifact is migrated at promotion.
2.5.4 Extend `ai_extraction_staging` with `source_kind` enum: `extraction | conversation`. Default `extraction` for backward compatibility.

### 2.6 UI Changes
2.6.1 **New chat entry point.** "New chat" button at the top of the left rail (matching Claude web pattern from the reference screenshot) opens an unassigned chat.
2.6.2 **Project dropdown in chat header.** When inside a project, the project name is shown; clicking reveals a switcher. When unassigned, the dropdown reads "No project — general chat" with a "Create project from this chat" option.
2.6.3 **Left rail conditional rendering.** Documents / Reports / Map nav items hidden when `project_id` is null. Landscaper chat surface is always visible.
2.6.4 **Right-side flyout panel** carries ephemeral artifacts in unassigned mode. Same component used for project-scoped work, different data source.

---

## 3.0 Excel Audit Pipeline

### 3.1 Three-Tier Routing
On upload, Landscape classifies the file using the audit skill's Phase 1 logic and routes accordingly.

3.1.1 **Tier 1 — Flat data.** No formulas; ≤3 sheets OR no calc-type sheets detected. Examples: rent rolls as exports, parcel lists, budget line exports, unit mix tables. **Action:** skip audit; route to existing extraction → staging pipeline. **Enhancement:** capture `Sheet!Cell` references on every extracted value (closes the post-alpha `source_page` gap for Excel files).

3.1.2 **Tier 2 — Assumption-heavy, non-model.** Formulas present but no Waterfall or Loan sheets. Examples: OMs with financial summary tabs, T-12 with projected columns, budget templates with rollup formulas. **Action:** run Phase 1 (structural scan), Phase 2 (formula integrity), Phase 3 (assumption extraction with cell refs). Skip Phase 4-5. Purpose: ensure the numbers visible in the file are correct before they're ingested.

3.1.3 **Tier 3 — Full financial models.** Waterfall or Loan sheets detected. Examples: proformas, underwriting workbooks. **Action:** full audit — Phases 1 through 7, including Python replication of waterfall math and debt service. Engages delta reconciliation at project creation.

### 3.2 Audit Phases (Server-Side)
Port of the `excel-model-audit` skill into a Django service at `backend/apps/knowledge/services/excel_audit_service.py`. Phases documented in the skill's `SKILL.md`:

3.2.1 Phase 1 — Structural scan (sheet inventory with prefix stripping, external links, VBA, hidden content).
3.2.2 Phase 2 — Formula integrity (hardcoded overrides, error propagation, circulars, repeating-range consistency, range truncation).
3.2.3 Phase 3 — Assumption extraction with cell references.
3.2.4 Phase 4 — Waterfall classification from formula map.
3.2.5 Phase 5 — Python replication of waterfall math.
3.2.6 **Phase 5b (NEW) — Debt replication.** Read loan parameters, replicate period-by-period debt service in Python, compare to model-reported values. Catches the case where a Loan sheet has structurally consistent formulas but wrong interest, amortization, or I/O flip logic.
3.2.7 Phase 6 — Sources & Uses verification.
3.2.8 Phase 7 — Trust score and HTML report (on-demand only — not auto-generated).

### 3.3 Scenario Mode
LibreOffice-backed recalc for what-if scenarios. Dependencies: LibreOffice binary on Railway image, the iterative-calc macro from the skill installed at container startup. Scenario invocations exposed as a Landscaper tool: `run_excel_scenario(doc_id, {cell_ref: new_value})` → returns baseline / scenario / delta table.

### 3.4 Audit Output Flow
3.4.1 Structured output (JSON) — assumption table with `Sheet!Cell` refs, waterfall classification, Python replication results, findings list, trust score.
3.4.2 Structured output feeds the extraction writer — `ai_extraction_staging` rows inherit cell refs as `source_cell`.
3.4.3 HTML report stored as an artifact against the `core_doc` record, rendered in the Ingestion Workbench right panel on demand.
3.4.4 Findings surface as Landscaper chat content — either a quick summary (default) or a full report (on user request per flow 3.5).

### 3.5 Chat UX Flow
3.5.1 User uploads Excel file to chat.
3.5.2 Landscaper runs Phase 1 only (fast — seconds). Reports: "This is a [property type] [tier] model with [N] sheets including [list of classified sheet types]. Full audit with HTML report, or quick summary?"
3.5.3 User chooses. Landscaper runs remaining phases accordingly.
3.5.4 Audit findings delivered in chat. Full HTML report rendered in right-panel flyout only if user requests it.

### 3.6 Data Model Changes
3.6.1 Extend `ai_extraction_staging` with `source_cell` (e.g., `"Assumptions!B47"`) — closes the `source_page` gap for Excel.
3.6.2 New table `tbl_excel_audit` — stores audit results keyed to `doc_id`: tier, trust score, findings JSON, assumption table JSON, waterfall classification JSON, Python replication JSON, report HTML path.
3.6.3 New table `tbl_excel_audit_finding` — denormalized findings with severity, cell ref, category, description, whether feeds outputs.

---

## 4.0 Project Creation Gate

### 4.1 Gate Logic (Tier 3 only)
When a Tier 3 audit has completed and the user initiates project creation, Landscaper attempts to reproduce the model's reported outputs using Landscape's native engine (`services/financial_engine_py/`) with the extracted assumptions as inputs.

### 4.2 Delta Attribution
If the Landscape engine's outputs differ from the model's reported values, Landscaper attributes each delta to one of four buckets:

4.2.1 **Input interpretation.** Landscape read an input differently than intended (e.g., used F-12 NOI instead of stabilized). Resolvable by user clarification.
4.2.2 **Convention.** Compounding frequency, day-count, mid-period vs. end-period timing. Resolvable by configuration flag.
4.2.3 **Structural.** Model has a feature Landscape's engine doesn't support (custom catch-up, clawback, non-standard fee). Not resolvable by input adjustment — requires fallback path.
4.2.4 **Model error.** Audit Phase 2/5 caught a deterministic error in the model; Landscape's output is correct, model is wrong. Disclosed as such.

### 4.3 Gate Resolution (9b — Disclose and Proceed)
Project creation is **not blocked** by unresolved deltas. Landscaper presents an attributed delta report; user acknowledges; project is created with known variances stored on the project record. Variances surface in reports and can be re-engaged later.

### 4.4 Fallback Paths for Structural Deltas
4.4.1 **Excel-backed project.** Project metadata stored normally, but scenario runs route to LibreOffice recalc against the stored Excel model. Landscape engine never runs for this project. Flagged visibly in project metadata.
4.4.2 **Custom waterfall executor.** Port the audit skill's Phase 5 formula-driven waterfall replication into Landscape's financial engine as a non-template path. The engine reads the source model's waterfall formulas and replicates them in Python — deterministic, no LibreOffice dependency, scoped to waterfall math only. Preferred over Excel-backed for waterfall-specific bespoke structures.
4.4.3 **Structural gap accepted.** User acknowledges Landscape can't natively model the variance; project proceeds with the variance disclosed and no fallback runtime (Landscape engine runs with closest-match template, delta stored as "known structural gap").

---

## 5.0 Dependencies

### 5.1 Python
5.1.1 `openpyxl` — already installed.
5.1.2 `scipy` — required for XIRR solver in audit Phase 5. Add to `backend/requirements.txt`.
5.1.3 No new Python deps for Tier 1/2.

### 5.2 System (Railway)
5.2.1 **LibreOffice.** Required for scenario mode only. Approximate image size impact: +500MB. Add via `nixpacks.toml` or custom Dockerfile.
5.2.2 **Iterative-calc macro.** Installed at container startup via `entrypoint.sh` or equivalent. Macro content documented in the skill's `SKILL.md`.
5.2.3 If LibreOffice is deferred, scenario mode is unavailable but audit (Phases 1-7) still works.

### 5.3 Frontend
5.3.1 No new libraries. Chat canvas uses existing Next.js App Router and CoreUI patterns. Right-panel flyout uses existing `IngestionRightPanel` component as reference.

---

## 6.0 Phased Implementation Plan

### 6.1 Phase 1 — Foundation (Chat Canvas, No Audit)
6.1.1 Backend: `tbl_chat_thread.project_id` nullable, `tbl_chat_artifact` table, migration.
6.1.2 Backend: new `/api/chat/threads/` endpoints supporting unassigned mode.
6.1.3 Frontend: "New chat" entry point, conditional left-rail rendering, project switcher in chat header.
6.1.4 Frontend: unassigned chat route (`/chat/[threadId]` outside `/projects/`).
6.1.5 Verification: user can create an unassigned chat, have a conversation with Landscaper, and the chat persists.

### 6.2 Phase 2 — Project Promotion Flow
6.2.1 Backend: `POST /api/chat/threads/{id}/promote/` endpoint — creates project, optionally moves thread, optionally migrates artifacts.
6.2.2 Backend: `source_kind` column on `ai_extraction_staging`.
6.2.3 Landscaper tool: `promote_thread_to_project` — handles the 2c / 3b / 4c sequence.
6.2.4 Verification: user can create a project from an unassigned chat with artifact curation and conversational ingestion reconciliation.

### 6.3 Phase 3 — Excel Audit Service (Tiers 1-2)
6.3.1 Backend: port audit skill Phases 1-3 to `excel_audit_service.py`.
6.3.2 Backend: `tbl_excel_audit` + `tbl_excel_audit_finding` tables.
6.3.3 Backend: `source_cell` column on `ai_extraction_staging`.
6.3.4 Backend: classification router — decides tier on upload.
6.3.5 Backend: `scipy` added to `requirements.txt`.
6.3.6 Integration: existing extraction pipeline calls audit service; staging rows inherit cell refs.
6.3.7 Verification: Excel upload produces audit record with cell-referenced assumptions; flat rent roll bypasses audit.

### 6.4 Phase 4 — Tier 3 Audit (Full Financial Models)
6.4.1 Backend: port audit skill Phases 4-5 (waterfall classification + Python replication) and Phase 5b (debt replication).
6.4.2 Backend: Phase 6 (S&U) and Phase 7 (trust score, HTML report generation on demand).
6.4.3 Integration: Landscaper chat flow per 3.5 — Phase 1 report-back, user chooses quick summary vs. full audit.
6.4.4 Verification: proforma upload produces Python-verified waterfall replication; cell-by-cell match table; HTML report available on demand.

### 6.5 Phase 5 — Project Creation Gate
6.5.1 Backend: Landscape engine invoker that takes extracted assumptions and produces comparable outputs.
6.5.2 Backend: delta attribution service — compares engine output to audit's Python-replicated output and buckets deltas.
6.5.3 Backend: project creation flow records disclosed variances.
6.5.4 Landscaper tool: `reconcile_model_deltas` — delivers attributed delta report to user.
6.5.5 Verification: proforma creates project with disclosed variances; Landscaper can explain each delta.

### 6.6 Phase 6 — Scenario Mode (LibreOffice)
6.6.1 Railway image: LibreOffice installed, iterative-calc macro deployed.
6.6.2 Backend: scenario runner service (spec in skill SKILL.md §Scenario Mode).
6.6.3 Landscaper tool: `run_excel_scenario`.
6.6.4 Verification: user asks "what if exit cap is 5.5%" — Landscaper runs scenario, reports deltas.

### 6.7 Phase 7 — Custom Waterfall Executor (Fallback A Absorption)
6.7.1 Backend: port audit Phase 5 formula-driven waterfall replication into `services/financial_engine_py/` as a non-template path.
6.7.2 Backend: engine router — selects template vs. custom executor per project.
6.7.3 Verification: project with bespoke waterfall runs natively in Landscape engine without LibreOffice.

---

## 7.0 Open Questions

7.1 Does `tbl_chat_thread` already exist, or does Landscaper threading live in a different table? (Verify before Phase 1.)
7.2 Should unassigned chats count against user storage quotas the same way project chats do?
7.3 For Excel-backed projects (fallback 4.4.1), how are scenarios persisted? New Excel file per scenario, or parameterized delta against a single source file?
7.4 Does the current ingestion pipeline's four-status model (new/match/conflict/pending) need extension to accommodate `source: conversation` rows that have no extracted source doc?

---

## 8.0 Decisions Locked In (From Design Discussion)

8.1 **2c** — user decides at promotion whether chat moves into the new project.
8.2 **3b** — user curates artifacts at promotion.
8.3 **4c** — conversationally-discussed values become pending staging rows with `source: conversation`.
8.4 **6a** — LibreOffice on Railway is in scope.
8.5 **6b** — on upload, quick classification first; Landscaper reports tier and asks user about audit depth.
8.6 **7c (refined)** — audit skill primary pre-project; Landscape engine primary post-project; custom waterfall executor as non-LibreOffice fallback.
8.7 **8c** — delta attribution by Landscaper with source-bucketed reconciliation dialogue.
8.8 **9b** — project creation discloses and proceeds; unresolved deltas stored as known variances.

---

*Last updated: 2026-04-14*
