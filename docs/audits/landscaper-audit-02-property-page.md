# Landscaper Audit: Property Page
**Date:** February 9, 2026
**Auditor:** Codex
**Page:** Property (Income Property + Land Development variants)
**Audit #:** 2

## Cross-References
- Auth issues: See Audit #1, Issues #1, #2 (`docs/audits/landscaper-audit-01-project-page.md:325`)
- Knowledge graph scoping: See Audit #1, Issue #6 (`docs/audits/landscaper-audit-01-project-page.md:330`)
- Global DMS access gap: See Audit #1, Issue #3 (`docs/audits/landscaper-audit-01-project-page.md:327`)
- Subtab context not passed: See Audit #1, Issue #4 (`docs/audits/landscaper-audit-01-project-page.md:328`)

## 1. Frontend
FRONTEND REPORT — Property Page
================================
Component tree (project shell):
1. Property folder/subtab routing lives in `src/lib/utils/folderTabConfig.ts:137` and `src/app/projects/[projectId]/ProjectContentRouter.tsx:128`.
2. Landscaper panel is mounted at project-shell level in `src/app/projects/[projectId]/ProjectLayoutClient.tsx:311`.
3. Threaded chat wiring is `src/components/landscaper/LandscaperPanel.tsx:927` -> `src/components/landscaper/LandscaperChatThreaded.tsx:100` -> `src/hooks/useLandscaperThreads.ts:165`.

Property subtabs by project type:
1. Income Property (`property` folder): `details`, `acquisition`, `market`, `rent-roll` (+ `renovation` for VALUE_ADD) in `src/lib/utils/folderTabConfig.ts:142`.
2. Land Development (`property` folder): `acquisition`, `market`, `land-use`, `parcels` in `src/lib/utils/folderTabConfig.ts:173`.

`page_context` value sent:
1. Full folder/subtab string is computed (`${currentFolder}/${currentTab}`) in `src/app/projects/[projectId]/ProjectLayoutClient.tsx:250`.
2. But `LandscaperPanel` receives only `activeTab={currentFolder}` in `src/app/projects/[projectId]/ProjectLayoutClient.tsx:313`.
3. `LandscaperPanel` sends `pageContext || activeTab` to chat in `src/components/landscaper/LandscaperPanel.tsx:929`.
4. Effective Property-page value is folder-level `"property"` (not subtab-specific).

API endpoint called:
1. `GET/POST ${NEXT_PUBLIC_DJANGO_API_URL}/api/landscaper/threads/` (`src/hooks/useLandscaperThreads.ts:218`, `src/hooks/useLandscaperThreads.ts:279`).
2. `POST ${NEXT_PUBLIC_DJANGO_API_URL}/api/landscaper/threads/new/` (`src/hooks/useLandscaperThreads.ts:324`).
3. `GET/POST ${NEXT_PUBLIC_DJANGO_API_URL}/api/landscaper/threads/{thread_id}/messages/` (`src/hooks/useLandscaperThreads.ts:245`, `src/hooks/useLandscaperThreads.ts:401`).

Payload fields:
1. Thread create: `project_id`, `page_context`, `subtab_context` (`src/hooks/useLandscaperThreads.ts:283`).
2. Message send: `content`, `page_context` (`src/hooks/useLandscaperThreads.ts:406`).

Document context passed by frontend:
1. `project_id` is sent on thread create (`src/hooks/useLandscaperThreads.ts:283`).
2. Per-message payload has no `document_id` (`src/hooks/useLandscaperThreads.ts:406`).

Hardcoded scoping:
1. Yes: property subtab is not propagated to Landscaper from project shell.
2. `subtab_context` exists in hook contracts but is not provided from `LandscaperPanel` (`src/components/landscaper/LandscaperPanel.tsx:927`, `src/components/landscaper/LandscaperChatThreaded.tsx:23`).

## 2. Backend Routing
BACKEND ROUTING REPORT — Property Page
=======================================
View class: `ThreadMessageViewSet` (`backend/apps/landscaper/views.py:1180`).

Handler function: `ThreadMessageViewSet.create` (`backend/apps/landscaper/views.py:1227`).

Auth/CSRF note:
1. This audit does not re-audit auth posture; see Audit #1 issues #1 and #2.
2. Property routing details below focus on context/tool behavior.

`page_context` received and normalized:
1. Request body `page_context` is read in `backend/apps/landscaper/views.py:1252`.
2. Passed to `get_landscaper_response(..., page_context=...)` in `backend/apps/landscaper/views.py:1301`.
3. Normalization maps `property -> mf_property` (income) or `property -> land_planning` (land) in `backend/apps/landscaper/tool_registry.py:352`.
4. Tool filtering uses normalized context in `backend/apps/landscaper/ai_handler.py:5006`.

System prompt selected:
1. Prompt selection is by project type via `get_system_prompt(project_type)` (`backend/apps/landscaper/ai_handler.py:4734`, `backend/apps/landscaper/ai_handler.py:4914`).
2. `page_context` affects tool filtering, not primary prompt variant (`backend/apps/landscaper/ai_handler.py:5014`).

System prompt summary:
1. Property-page chats use project-type prompts (`land_development` vs `multifamily`) plus shared base instructions (`backend/apps/landscaper/ai_handler.py:4622`).
2. The prompt emphasizes domain expertise and strict response style (plain text, concise, no markdown/thinking narration) via `BASE_INSTRUCTIONS` (`backend/apps/landscaper/ai_handler.py:4459`).
3. There is no dedicated Property-page prompt overlay distinct from Home/Operations; page specialization is mostly tool-set driven.

## 3. Tool Availability
TOOL AVAILABILITY REPORT — Property Page
==========================================
Tool registry exists: Yes (`backend/apps/landscaper/tool_registry.py:1`).

Tool filtering active: Yes (`backend/apps/landscaper/ai_handler.py:5006`, `backend/apps/landscaper/ai_handler.py:5014`).

Total tools in system: 117 (`backend/apps/landscaper/ai_handler.py`, `LANDSCAPER_TOOLS` static list + alpha feedback append).

### Income Property (`mf_property`)
Normalized from `property` when project type is non-land (`backend/apps/landscaper/tool_registry.py:353`).

Total tools on this page context (including universal): 20
1. `bulk_update_fields` — Update multiple fields at once.
2. `delete_rental_comparable` — Delete a rental comparable.
3. `get_acquisition` — Get property acquisition assumptions.
4. `get_attribute_definitions` — Get property attribute definitions.
5. `get_field_schema` — Get metadata about available fields.
6. `get_leases` — Get lease records for a property.
7. `get_project_fields` — Retrieve current values of specific project fields.
8. `get_property_attributes` — Get property attributes for a project.
9. `get_rental_comparables` — Get rental comparables for a project.
10. `get_unit_types` — Get unit type mix for a multifamily property.
11. `get_units` — Get individual unit details for a multifamily property.
12. `update_acquisition` — Update property acquisition assumptions.
13. `update_improvement_attribute` — Update a single improvement attribute.
14. `update_leases` — Add or update lease records for a property.
15. `update_project_field` — Update a single project field.
16. `update_property_attributes` — Update property attributes for a project.
17. `update_rental_comparable` — Add or update a rental comparable.
18. `update_site_attribute` — Update a single site attribute.
19. `update_unit_types` — Add or update unit types for a multifamily property.
20. `update_units` — Add or update individual units for a multifamily property.

Gap analysis (Income Property):
1. Missing delete tools for unit types, units, and leases (only upsert/list exist).
2. No explicit single-record lease/unit delete path from this context tool set.

### Land Development (`land_planning`)
Normalized from `property` when project type is land (`backend/apps/landscaper/tool_registry.py:353`).

Total tools on this page context (including universal): 22
1. `bulk_update_fields` — Update multiple fields at once.
2. `delete_area` — Delete a planning area.
3. `delete_milestone` — Delete a milestone.
4. `delete_parcel` — Delete a parcel.
5. `delete_phase` — Delete a phase.
6. `get_areas` — Get planning areas for a project.
7. `get_field_schema` — Get metadata about available fields.
8. `get_land_use_families` — Retrieve land use families.
9. `get_land_use_types` — Retrieve land use types.
10. `get_milestones` — Get milestones for a project or phase.
11. `get_parcels` — Get parcels for a project, area, or phase.
12. `get_phases` — Get phases for a project or specific area.
13. `get_project_fields` — Retrieve current values of specific project fields.
14. `get_residential_products` — Retrieve residential lot products.
15. `update_area` — Create or update a planning area.
16. `update_land_use_family` — Create or update a land use family.
17. `update_land_use_type` — Create or update a land use type.
18. `update_milestone` — Create or update a milestone.
19. `update_parcel` — Create or update a parcel.
20. `update_phase` — Create or update a phase.
21. `update_project_field` — Update a single project field.
22. `update_residential_product` — Create or update a residential lot product.

Gap analysis (Land Development):
1. Missing `delete_residential_product` even though create/update exists.
2. Land-use taxonomy mutation tools operate on global reference tables from project context (should likely be admin-governed).

## 4. Data Access & Knowledge Scope
DATA ACCESS REPORT — Property Page
====================================

| Data Source | Accessible? | How | Code Reference |
|-------------|-------------|-----|----------------|
| MF unit mix (`tbl_multifamily_unit_type`) | Yes | `get_unit_types` filtered by `project_id` | `backend/apps/landscaper/tool_executor.py:2729` |
| MF units (`tbl_multifamily_unit`) | Yes | `get_units` filtered by `project_id` | `backend/apps/landscaper/tool_executor.py:2839` |
| Leases (`tbl_lease`) | Yes | `get_leases` filtered by `project_id` | `backend/apps/landscaper/tool_executor.py:2955` |
| Rental comps (`tbl_rent_comparable`) | Yes | `get_rental_comparables` filtered by `project_id` | `backend/apps/landscaper/tool_executor.py:3568` |
| Property attributes (`tbl_project` + JSONB attrs) | Yes | `get_property_attributes`/`update_property_attributes` on project row | `backend/apps/landscaper/services/property_tools.py:282` |
| Land hierarchy (`tbl_area`, `tbl_phase`, `tbl_parcel`, `tbl_milestone`) | Yes | Land-planning tools; mostly project-filtered reads | `backend/apps/landscaper/tool_executor.py:4957`, `backend/apps/landscaper/tool_executor.py:5409`, `backend/apps/landscaper/tool_executor.py:5671` |
| Land-use taxonomy (`lu_family`, `lu_type`, `res_lot_product`) | Yes (global) | No `project_id` predicate (shared tables) | `backend/apps/landscaper/tool_executor.py:5960`, `backend/apps/landscaper/tool_executor.py:6083`, `backend/apps/landscaper/tool_executor.py:6215` |
| Project documents (`core_doc`) | Yes (project-scoped) | `get_project_documents` / `get_document_content` enforce `d.project_id = %s` | `backend/apps/landscaper/tool_executor.py:10418`, `backend/apps/landscaper/tool_executor.py:10548` |
| Global/cross-project docs | No (in project context) | No project-shell path without project filter | `backend/apps/landscaper/tool_executor.py:10418` |
| Extraction staging (`ai_extraction_staging`) | Conditionally yes | Extraction tools are added when doc keywords detected; results filtered by `project_id` | `backend/apps/landscaper/tool_registry.py:24`, `backend/apps/landscaper/ai_handler.py:5013`, `backend/apps/landscaper/tool_executor.py:9227` |
| Extraction correction log (`ai_correction_log`) | Yes, but not project-scoped | `get_extraction_corrections` has no project filter | `backend/apps/landscaper/tool_executor.py:9358` |
| Platform knowledge (`tbl_platform_knowledge*`) | Conditional | Injected when methodology trigger fires | `backend/apps/landscaper/ai_handler.py:163`, `backend/apps/landscaper/ai_handler.py:4933`, `backend/apps/knowledge/services/platform_knowledge_retriever.py:212` |
| RAG document embeddings (`knowledge_embeddings`) | Yes (project-scoped) | Similarity search joins `core_doc` and filters by project | `backend/apps/knowledge/services/embedding_storage.py:109` |
| Structured project context injection | Yes | `get_project_context(project_id)` appended to system prompt | `backend/apps/landscaper/ai_handler.py:4924`, `backend/apps/knowledge/services/project_context.py:30` |

Property-page data observations:
1. MF and land planning operational data is broadly accessible for the active project.
2. Land taxonomy tools are globally scoped and mutable from property context.
3. Several land mutation paths do not enforce `project_id` in `UPDATE/DELETE` predicates (details in Issues section).

## 5. Response Formatting
RESPONSE FORMATTING REPORT — Property Page
=============================================
Frontend renderer:
1. Assistant text is post-processed via `processLandscaperResponse()` in `src/components/landscaper/ChatMessageBubble.tsx:35`.
2. Display is plain text with `whiteSpace: pre-wrap` in `src/components/landscaper/ChatMessageBubble.tsx:51`.

Markdown support:
1. Markdown is intentionally stripped in `src/utils/formatLandscaperResponse.ts:14`.
2. Renderer does not use `ReactMarkdown`/`dangerouslySetInnerHTML`.

Line break handling:
1. Yes, visible line breaks are preserved via `pre-wrap` (`src/components/landscaper/ChatMessageBubble.tsx:51`).

System prompt formatting rules:
1. Prompt explicitly instructs no markdown and concise plain-text responses (`backend/apps/landscaper/ai_handler.py:4468`).
2. This behavior is global, not Property-page-specific.

Property-specific formatting findings:
1. No Property-only formatter branch found; behavior is same as Audit #1.

## 6. Thread Management
THREAD MANAGEMENT REPORT — Property Page
==========================================
Thread model:
1. `ChatThread` + `ThreadMessage` persisted in DB (`backend/apps/landscaper/models.py:25`, `backend/apps/landscaper/models.py:107`).
2. Includes `page_context` and optional `subtab_context` fields (`backend/apps/landscaper/models.py:56`, `backend/apps/landscaper/models.py:61`).

Thread scope:
1. Effective scope is per-project + per-folder context (`page_context`), not per-subtab.
2. `ThreadService.get_or_create_active_thread` filters only `project_id`, `page_context`, `is_active` (`backend/apps/landscaper/services/thread_service.py:58`).

History loaded into model context:
1. Backend loads first 50 messages via `order_by('created_at')[:50]` before generating response (`backend/apps/landscaper/views.py:1264`).
2. This is chronological earliest-50, not latest-50.

Thread persistence:
1. Persistent DB-backed threads and messages (not client-only state).

Long-thread degradation risk:
1. High risk in long conversations because recent turns can be excluded once threads exceed 50 messages (`backend/apps/landscaper/views.py:1264`).
2. Additional cross-thread context is only top semantic excerpts (`max_results=3`) via embeddings (`backend/apps/landscaper/views.py:1289`).

New thread creation:
1. UI “New” in thread list triggers `startNewThread` (`src/components/landscaper/ThreadList.tsx:176`, `src/hooks/useLandscaperThreads.ts:321`).
2. Backend closes existing active context thread and creates a new one (`backend/apps/landscaper/services/thread_service.py:171`).

## 7. Issues Found
NEW issues only (Audit #2)

| # | Severity | Issue | Impact | Suggested Fix |
|---|----------|-------|--------|---------------|
| 2.1 | CRITICAL | Land-planning mutations are missing project predicates in multiple write paths (`UPDATE tbl_phase`, `DELETE tbl_phase`, `UPDATE tbl_parcel`, `UPDATE tbl_milestone`). | A user in one project context can modify records from another project if IDs are known/guessed. | Add `AND project_id = %s` (or validated join to project-owned parent) to all write/read-before-write queries. References: `backend/apps/landscaper/tool_executor.py:5269`, `backend/apps/landscaper/tool_executor.py:5378`, `backend/apps/landscaper/tool_executor.py:5524`, `backend/apps/landscaper/tool_executor.py:5778`. |
| 2.2 | HIGH | Land-use taxonomy mutation tools in Property context update global reference tables (`lu_family`, `lu_type`, `res_lot_product`) without project/org scope. | Project-level chat can mutate shared system taxonomy, affecting unrelated projects. | Move these mutations to admin-only context or enforce role + tenant governance; keep project context read-only for taxonomy. References: `backend/apps/landscaper/tool_registry.py:149`, `backend/apps/landscaper/tool_executor.py:5988`, `backend/apps/landscaper/tool_executor.py:6120`, `backend/apps/landscaper/tool_executor.py:6258`. |
| 2.3 | HIGH | Thread prompt assembly uses earliest 50 messages, not most recent 50. | Long Property-page threads lose current context and tool reliability degrades. | Fetch latest N (`order_by('-created_at')[:N]`) then reverse for chronological prompt order. Reference: `backend/apps/landscaper/views.py:1264`. |
| 2.4 | HIGH | `get_extraction_corrections` reads correction history without project filter and can be exposed outside Documents when extraction tools are keyword-enabled. | Potential cross-project leakage of correction/learning data from Property-page chat sessions. | Join/filter corrections by project via `ai_extraction_staging.project_id = active_project_id` and include explicit auth checks. References: `backend/apps/landscaper/tool_executor.py:9358`, `backend/apps/landscaper/ai_handler.py:5013`, `backend/apps/landscaper/tool_registry.py:24`. |
| 2.5 | MEDIUM | Property toolset lacks delete operations for core MF entities (unit types, units, leases) and land residential products. | AI cannot complete full CRUD workflows for Property-page data management. | Add scoped delete tools with confirmations and dependency checks. References: `backend/apps/landscaper/tool_registry.py:70`, `backend/apps/landscaper/tool_registry.py:149`. |

## 8. Recommendations
1. Block alpha on Property page until Issue 2.1 is fixed and covered by tests for cross-project write attempts.
2. Reclassify land-use taxonomy writes as admin-governed operations (or read-only in project chat) before external testing.
3. Fix context-window loading to most-recent messages to stabilize long Property conversations.
4. Apply project scoping to extraction-correction queries before enabling broad extraction-tool access on non-Documents pages.
5. Add missing delete tools for MF and land product records to make Property-page workflows operationally complete.
6. Carry forward Audit #1 cross-cutting fixes (auth, global DMS strategy, subtab propagation) as prerequisites for full Property-page alpha readiness.
