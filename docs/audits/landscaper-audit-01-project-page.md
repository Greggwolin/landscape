# Landscaper Audit: Project Page
**Date:** February 9, 2026
**Auditor:** Codex
**Page:** Project Overview / Home (Project Shell Across Folder Tabs)
**Audit #:** 1

---

## 1. Frontend
FRONTEND REPORT — Project Page
================================
Component: `src/app/projects/[projectId]/ProjectLayoutClient.tsx:311` mounts `LandscaperPanel`; `src/components/landscaper/LandscaperPanel.tsx:927` mounts `LandscaperChatThreaded`; `src/hooks/useLandscaperThreads.ts:165` sends chat requests.

page_context value:
1. `ProjectLayoutClient` computes full context as `"${currentFolder}/${currentTab}"` (`src/app/projects/[projectId]/ProjectLayoutClient.tsx:250`).
2. But it passes only `activeTab={currentFolder}` to `LandscaperPanel` (`src/app/projects/[projectId]/ProjectLayoutClient.tsx:313`).
3. `LandscaperPanel` sends `pageContext || activeTab` to threaded chat (`src/components/landscaper/LandscaperPanel.tsx:929`).
4. Effective value sent to backend is folder-only context (`home`, `property`, `operations`, `valuation`, `capital`, `reports`, `documents`, `map`) instead of folder/subtab.

API endpoint called:
1. Thread list/create: `${NEXT_PUBLIC_DJANGO_API_URL}/api/landscaper/threads/` (`src/hooks/useLandscaperThreads.ts:195`, `src/hooks/useLandscaperThreads.ts:251`).
2. Thread messages: `${NEXT_PUBLIC_DJANGO_API_URL}/api/landscaper/threads/{thread_id}/messages/` (`src/hooks/useLandscaperThreads.ts:220`, `src/hooks/useLandscaperThreads.ts:373`).
3. New thread: `${NEXT_PUBLIC_DJANGO_API_URL}/api/landscaper/threads/new/` (`src/hooks/useLandscaperThreads.ts:296`).

Payload fields:
1. Thread create POST body: `project_id`, `page_context`, `subtab_context` (`src/hooks/useLandscaperThreads.ts:255`).
2. Send message POST body: `content`, `page_context` (`src/hooks/useLandscaperThreads.ts:378`).
3. No `document_id` in project-shell threaded message payload.

Document context:
1. Chat thread bootstrap includes `project_id` and `page_context` (`src/hooks/useLandscaperThreads.ts:255`).
2. Per-message payload includes `page_context` only (`src/hooks/useLandscaperThreads.ts:378`).
3. `document_id` is not sent by project-shell threaded chat.

Any hardcoded scoping:
1. Yes: Project shell currently scopes AI context to folder-level only because `pageContext` (folder/subtab) is not passed into `LandscaperPanel`; only `activeTab=currentFolder` is used (`src/app/projects/[projectId]/ProjectLayoutClient.tsx:250`, `src/app/projects/[projectId]/ProjectLayoutClient.tsx:313`, `src/components/landscaper/LandscaperPanel.tsx:929`).
2. `subtab_context` is supported by API contracts but not provided from project shell (`src/components/landscaper/LandscaperPanel.tsx:75`, `src/hooks/useLandscaperThreads.ts:257`).
3. Legacy proxy route still exists (`src/app/api/projects/[projectId]/landscaper/chat/route.ts:51`) but project shell threaded chat bypasses it.

## 2. Backend Routing
BACKEND ROUTING REPORT — Project Page
=======================================
View class: `ThreadMessageViewSet` in `backend/apps/landscaper/views.py:1137`.

Handler function: `ThreadMessageViewSet.create` in `backend/apps/landscaper/views.py:1177`.

Permission classes:
1. `ThreadMessageViewSet.permission_classes = [AllowAny]` (`backend/apps/landscaper/views.py:1151`).
2. `ChatThreadViewSet.permission_classes = [AllowAny]` (`backend/apps/landscaper/views.py:974`).
3. Legacy `ChatMessageViewSet.permission_classes = [AllowAny]` (`backend/apps/landscaper/views.py:51`).

CSRF status:
1. Thread/chat DRF views are not decorated with `@csrf_exempt`.
2. Effective protection is weak because endpoints are `AllowAny` and no authenticated gate is required.
3. Canonical knowledge chat endpoint is explicitly CSRF-exempt: `@csrf_exempt` on `chat` (`backend/apps/knowledge/views/chat_views.py:37`).

page_context received:
1. Read from request body in thread message create (`backend/apps/landscaper/views.py:1203`).
2. Passed directly into `get_landscaper_response(..., page_context=page_context)` (`backend/apps/landscaper/views.py:1254`).

System prompt selected:
1. `get_landscaper_response` builds prompt via `get_system_prompt(project_type)` (`backend/apps/landscaper/ai_handler.py:4914`).
2. Prompt selection key is project type mapping, not page context (`backend/apps/landscaper/ai_handler.py:4734`, `backend/apps/landscaper/ai_handler.py:4751`).
3. `page_context` is used for tool filtering and alpha-help behavior, not main prompt variant (`backend/apps/landscaper/ai_handler.py:5006`, `backend/apps/landscaper/ai_handler.py:5014`, `backend/apps/landscaper/ai_handler.py:4977`).

System prompt summary:
1. The base/system prompt is property-type-specific (land, multifamily, office, retail, industrial, default) and then appends strict style instructions.
2. Instructions explicitly require plain text output, no markdown, concise responses, and project-document-centric document reading behavior.
3. Prompt does not provide a dedicated “Project Home vs Property vs Operations” behavioral split; that distinction is primarily in tool filtering.

## 3. Tool Availability
TOOL AVAILABILITY REPORT — Project Page
==========================================
Tool registry exists: Yes (`backend/apps/landscaper/tool_registry.py:1`).

Tool filtering active: Yes. `ai_handler` normalizes `page_context` and filters tools through `get_tools_for_page` before sending tools to Claude (`backend/apps/landscaper/ai_handler.py:5006`, `backend/apps/landscaper/ai_handler.py:5014`, `backend/apps/landscaper/ai_handler.py:5020`).

Total tools available on this page:
1. Project shell is context-variable by folder tab.
2. Income-property shell: 63 unique tools across tabs.
3. Land-development shell: 58 unique tools across tabs.
4. Home tab only: 8 tools (`UNIVERSAL_TOOLS` + `mf_home`/`land_home`).

Total tools in system: 112 unique tool names represented in registry unions (`UNIVERSAL_TOOLS`, `EXTRACTION_TOOLS`, `ADMIN_TOOLS`, and `PAGE_TOOLS`) (`backend/apps/landscaper/tool_registry.py:15`, `backend/apps/landscaper/tool_registry.py:23`, `backend/apps/landscaper/tool_registry.py:37`, `backend/apps/landscaper/tool_registry.py:59`).

### Income Property project shell (folder contexts)
| Folder context sent | Normalized context | Tool count |
|---|---|---:|
| `home` | `mf_home` | 8 |
| `property` | `mf_property` | 20 |
| `operations` | `mf_operations` | 11 |
| `valuation` | `mf_valuation` | 17 |
| `capital` | `mf_capitalization` | 11 |
| `reports` | `reports` | 7 |
| `documents` | `documents` | 15 |
| `map` | `map` | 7 |

Unique tools across this shell: **63**

1. `acknowledge_insight` — Acknowledge an AI insight (MUTATION).
2. `bulk_update_fields` — Update multiple fields at once. Use when you need to make several related updates.
3. `get_field_schema` — Get metadata about available fields including data types, valid values, and whether they're editable.
4. `get_knowledge_insights` — Get AI-discovered insights.
5. `get_project_contacts_v2` — Get all contacts assigned to this project with their roles.
6. `get_project_fields` — Retrieve current values of specific project fields to check before updating.
7. `search_cabinet_contacts` — Search for existing contacts in the cabinet.
8. `update_project_field` — Update a project field.
9. `delete_rental_comparable` — Delete a rental comparable.
10. `get_acquisition` — Get property acquisition assumptions for the project.
11. `get_attribute_definitions` — Get the available property attribute definitions.
12. `get_leases` — Get lease records for a property.
13. `get_property_attributes` — Get all property attributes for this project.
14. `get_rental_comparables` — Get rental comparables for the project.
15. `get_unit_types` — Get unit type mix for a multifamily property.
16. `get_units` — Get individual unit details for a multifamily property.
17. `update_acquisition` — Update property acquisition assumptions for the project.
18. `update_improvement_attribute` — Update a single improvement attribute.
19. `update_leases` — Add or update lease records for a property.
20. `update_property_attributes` — Update property attributes for this project.
21. `update_rental_comparable` — Add or update a rental comparable.
22. `update_site_attribute` — Update a single site attribute.
23. `update_unit_types` — Add or update unit types for a multifamily property.
24. `update_units` — Add or update individual units for a multifamily property.
25. `get_revenue_other` — Get other (non-rent) revenue assumptions for the project.
26. `get_revenue_rent` — Get rent revenue assumptions for the project.
27. `get_vacancy_assumptions` — Get vacancy and loss assumptions for the project.
28. `update_operating_expenses` — Add or update operating expenses for the project.
29. `update_revenue_other` — Update other (non-rent) revenue assumptions for the project.
30. `update_revenue_rent` — Update rent revenue assumptions for the project.
31. `update_vacancy_assumptions` — Update vacancy and loss assumptions for the project.
32. `analyze_loss_to_lease` — Calculate Loss to Lease for a multifamily property.
33. `calculate_year1_buyer_noi` — Calculate realistic Year 1 NOI for a buyer.
34. `check_income_analysis_availability` — Check if Loss to Lease and Year 1 Buyer NOI analyses are available.
35. `compute_cashflow_expression` — Evaluate safe math expressions against cached cash flow results.
36. `delete_sales_comparable` — Delete a sales comparable and its adjustments.
37. `get_cashflow_results` — Read authoritative cash flow / DCF assumptions and results.
38. `get_market_assumptions` — Get market assumptions for this project.
39. `get_sales_comp_adjustments` — Get adjustments for a specific sales comparable.
40. `get_sales_comparables` — Get sales comparables for the project.
41. `update_cashflow_assumption` — Update a cashflow/DCF assumption.
42. `update_market_assumptions` — Update market assumptions for a product type.
43. `update_sales_comp_adjustment` — Add or update a sales comp adjustment.
44. `update_sales_comparable` — Add or update a sales comparable.
45. `delete_loan` — Delete a loan.
46. `get_equity_structure` — Retrieve equity structure for a project.
47. `get_loans` — Retrieve loans for a project.
48. `get_waterfall_tiers` — Retrieve waterfall tiers for a project.
49. `update_equity_structure` — Create or update equity structure.
50. `update_loan` — Create or update a loan.
51. `update_waterfall_tiers` — Create or update waterfall tiers.
52. `get_budget_items` — Retrieve budget line items for a project.
53. `extract_and_save_contacts` — Extract contacts from document content and save to cabinet + project.
54. `get_document_assertions` — Get structured assertions extracted from documents.
55. `get_document_content` — Get full extracted text content from a document.
56. `get_extraction_corrections` — Get AI extraction correction history.
57. `get_extraction_results` — Get AI extraction results.
58. `get_knowledge_entities` — Get knowledge entities from the knowledge graph.
59. `get_knowledge_facts` — Get knowledge facts from the knowledge graph.
60. `get_project_documents` — List project documents and extraction readiness.
61. `ingest_document` — Auto-populate project fields from a document.
62. `log_extraction_correction` — Log user correction to an AI extraction.
63. `update_extraction_result` — Update extraction result status.

### Land Development project shell (folder contexts)
| Folder context sent | Normalized context | Tool count |
|---|---|---:|
| `home` | `land_home` | 8 |
| `property` | `land_planning` | 22 |
| `budget` | `land_budget` | 9 |
| `feasibility` | `land_valuation` | 11 |
| `capital` | `land_capitalization` | 11 |
| `reports` | `reports` | 7 |
| `documents` | `documents` | 15 |
| `map` | `map` | 7 |

Unique tools across this shell: **58**

1. `acknowledge_insight` — Acknowledge an AI insight.
2. `bulk_update_fields` — Update multiple fields.
3. `get_field_schema` — Get field metadata.
4. `get_knowledge_insights` — Get AI-discovered insights.
5. `get_project_contacts_v2` — Get project contacts.
6. `get_project_fields` — Retrieve project field values.
7. `search_cabinet_contacts` — Search cabinet contacts.
8. `update_project_field` — Update a project field.
9. `delete_area` — Delete planning area.
10. `delete_milestone` — Delete milestone.
11. `delete_parcel` — Delete parcel.
12. `delete_phase` — Delete phase.
13. `get_areas` — Retrieve areas.
14. `get_land_use_families` — Retrieve land-use families.
15. `get_land_use_types` — Retrieve land-use types.
16. `get_milestones` — Retrieve milestones.
17. `get_parcels` — Retrieve parcels.
18. `get_phases` — Retrieve phases.
19. `get_residential_products` — Retrieve residential products.
20. `update_area` — Create/update area.
21. `update_land_use_family` — Create/update land-use family.
22. `update_land_use_type` — Create/update land-use type.
23. `update_milestone` — Create/update milestone.
24. `update_parcel` — Create/update parcel.
25. `update_phase` — Create/update phase.
26. `update_residential_product` — Create/update residential product.
27. `delete_budget_item` — Delete budget line item.
28. `get_budget_categories` — Retrieve budget categories.
29. `get_budget_items` — Retrieve budget line items.
30. `update_budget_category` — Create/update budget category.
31. `update_budget_item` — Create/update budget item.
32. `compute_cashflow_expression` — Evaluate math expressions on cashflow output.
33. `get_cashflow_results` — Retrieve cashflow/DCF output.
34. `get_market_assumptions` — Retrieve market assumptions.
35. `update_cashflow_assumption` — Update cashflow assumption.
36. `update_market_assumptions` — Update market assumptions.
37. `delete_loan` — Delete loan.
38. `get_equity_structure` — Retrieve equity structure.
39. `get_loans` — Retrieve loans.
40. `get_waterfall_tiers` — Retrieve waterfall tiers.
41. `update_equity_structure` — Update equity structure.
42. `update_loan` — Update loan.
43. `update_waterfall_tiers` — Update waterfall tiers.
44. `get_unit_types` — Retrieve unit types.
45. `extract_and_save_contacts` — Extract and save contacts.
46. `get_document_assertions` — Retrieve document assertions.
47. `get_document_content` — Retrieve document content.
48. `get_extraction_corrections` — Retrieve extraction corrections.
49. `get_extraction_results` — Retrieve extraction results.
50. `get_knowledge_entities` — Retrieve knowledge entities.
51. `get_knowledge_facts` — Retrieve knowledge facts.
52. `get_project_documents` — Retrieve project documents.
53. `ingest_document` — Ingest document into project fields.
54. `log_extraction_correction` — Log extraction correction.
55. `update_extraction_result` — Update extraction result.
56. `get_property_attributes` — Retrieve property attributes.
57. `update_property_attributes` — Update property attributes.
58. `update_site_attribute` — Update site attribute.

Tools that SHOULD be available but are NOT (project shell):
1. Global DMS document search/retrieval tool in project context — required for persistent knowledge across portfolio/organization; current project shell tool sets do not expose global-doc retrieval (`backend/apps/landscaper/tool_registry.py:59`, `backend/apps/landscaper/tool_registry.py:269`).
2. `search_irem_benchmarks` in project valuation contexts — present in non-project contexts (`dms`, `benchmarks`) but not available in project shell valuation tabs (`backend/apps/landscaper/tool_registry.py:106`, `backend/apps/landscaper/tool_registry.py:277`).
3. Subtab-specific tool sets (`land_schedule` vs `land_budget`) are not reachable from project shell because `subtab_context` is not passed (`backend/apps/landscaper/tool_registry.py:322`, `src/hooks/useLandscaperThreads.ts:257`, `src/components/landscaper/LandscaperPanel.tsx:929`).

Tools that ARE available but SHOULD NOT be (in current form):
1. `get_knowledge_insights` on home contexts without project scoping in SQL (`backend/apps/landscaper/tool_registry.py:63`, `backend/apps/landscaper/tool_executor.py:9578`).
2. `get_knowledge_entities` / `get_knowledge_facts` on documents context without project/organization filters in SQL (`backend/apps/landscaper/tool_registry.py:227`, `backend/apps/landscaper/tool_executor.py:9460`, `backend/apps/landscaper/tool_executor.py:9521`).

## 4. Data Access & Knowledge Scope
DATA ACCESS REPORT — Project Page
====================================

| Data Source | Accessible? | How | Code Reference |
|-------------|-------------|-----|----------------|
| Project documents (`core_doc` where `project_id = active`) | Yes | `get_project_documents`, `get_document_content` with explicit project filter | `backend/apps/landscaper/tool_executor.py:10186`, `backend/apps/landscaper/tool_executor.py:10316` |
| Global DMS documents (`core_doc` where `project_id IS NULL`) | No (from project shell) | No project-shell tool queries `core_doc` without project filter | `backend/apps/landscaper/tool_executor.py:10186`, `backend/apps/knowledge/services/embedding_storage.py:111` |
| Cross-project documents (other projects’ `core_doc`) | No (for doc content/RAG) | Doc lookup and embedding RAG both constrained by `project_id` | `backend/apps/landscaper/tool_executor.py:10316`, `backend/apps/knowledge/services/embedding_storage.py:111` |
| Platform Knowledge (`tbl_platform_knowledge*`) | Yes (conditional injection) | `_needs_platform_knowledge` trigger then `_get_platform_knowledge_context` retrieval | `backend/apps/landscaper/ai_handler.py:163`, `backend/apps/landscaper/ai_handler.py:358`, `backend/apps/knowledge/services/platform_knowledge_retriever.py:212` |
| IREM Benchmarks (`opex_benchmark`) | Not available in project-shell tool set | Tool exists (`search_irem_benchmarks`) but is only assigned to non-project contexts | `backend/apps/landscaper/tool_executor.py:6914`, `backend/apps/landscaper/tool_registry.py:269`, `backend/apps/knowledge/services/benchmark_service.py:11` |
| RAG Embeddings (`knowledge_embeddings`) | Yes (project-scoped) | `search_similar(..., project_id=...)` joins docs and filters `d.project_id = %s` | `backend/apps/knowledge/services/rag_retrieval.py:282`, `backend/apps/knowledge/services/embedding_storage.py:109` |
| Structured project data (`tbl_project` and related project tables) | Yes | `get_project_context(project_id)` appended to system prompt | `backend/apps/landscaper/ai_handler.py:4924`, `backend/apps/knowledge/services/project_context.py:114` |

Document retrieval filter logic:
1. `get_project_documents`: `WHERE d.project_id = %s` (`backend/apps/landscaper/tool_executor.py:10186`).
2. `get_document_content` access check: `WHERE d.doc_id = %s AND d.project_id = %s` (`backend/apps/landscaper/tool_executor.py:10316`).
3. Embedding search for doc chunks: `JOIN landscape.core_doc d ... WHERE d.project_id = %s` (`backend/apps/knowledge/services/embedding_storage.py:110`).

Additional scope finding (security relevant):
1. `get_knowledge_insights` does not filter by `project_id` (`backend/apps/landscaper/tool_executor.py:9578`).
2. `get_knowledge_entities` and `get_knowledge_facts` do not filter by `project_id` (`backend/apps/landscaper/tool_executor.py:9460`, `backend/apps/landscaper/tool_executor.py:9521`).

Gap analysis — what SHOULD be accessible but isn't:
1. Global DMS documents (organization-level knowledge corpus) — required for persistent knowledge engine behavior and cross-project learning.
2. Cross-project comparable documents with geography/property-type relevance — needed for faster benchmarking and market context on project home/valuation tabs.
3. IREM benchmark query tool on project valuation/operations contexts — currently only available in non-project contexts despite relevance.

## 5. Response Formatting
RESPONSE FORMATTING REPORT — Project Page
=============================================
Frontend renderer: `ChatMessageBubble` renders plain text in a `<div style={{ whiteSpace: 'pre-wrap' }}>` after running `processLandscaperResponse(...)` (`src/components/landscaper/ChatMessageBubble.tsx:33`, `src/components/landscaper/ChatMessageBubble.tsx:51`).

Markdown support: No. Markdown is stripped/sanitized before display (`src/utils/formatLandscaperResponse.ts:20`, `src/utils/formatLandscaperResponse.ts:22`, `src/utils/formatLandscaperResponse.ts:34`).

Line break handling: Yes. Newlines are preserved via `whiteSpace: 'pre-wrap'` (`src/components/landscaper/ChatMessageBubble.tsx:51`).

System prompt formatting rules:
1. Explicitly forbids markdown (`**`, headers, code fences).
2. Requires plain text with line breaks only.
3. Instructs concise responses and no “thinking narration”.
References: `backend/apps/landscaper/ai_handler.py:4468`, `backend/apps/landscaper/ai_handler.py:4473`, `backend/apps/landscaper/ai_handler.py:4475`.

Known formatting issues:
1. Rich markdown formatting is intentionally removed, so structured analytical responses can degrade into dense plain text.
2. The frontend applies post-processing regex that may over-strip language patterns in assistant responses (`src/utils/formatLandscaperResponse.ts:56`).

## 6. Thread Management
THREAD MANAGEMENT REPORT — Project Page
==========================================
Thread model:
1. `ChatThread` (`landscape.landscaper_chat_thread`) with key fields `project`, `page_context`, `subtab_context`, `is_active` (`backend/apps/landscaper/models.py:25`, `backend/apps/landscaper/models.py:56`).
2. `ThreadMessage` (`landscape.landscaper_thread_message`) linked by `thread_id` (`backend/apps/landscaper/models.py:107`, `backend/apps/landscaper/models.py:126`).

Thread scope:
1. Per-project + per-page_context active-thread model (`backend/apps/landscaper/services/thread_service.py:58`).
2. `subtab_context` exists in schema/service but project shell doesn’t pass it, so practical scope is per-project-per-folder (`backend/apps/landscaper/models.py:61`, `src/hooks/useLandscaperThreads.ts:257`).

History loaded into context:
1. Thread message create loads up to 50 chronological messages: `thread.messages.order_by('created_at')[:50]` (`backend/apps/landscaper/views.py:1217`).
2. Additional cross-thread embedding context is fetched via `EmbeddingService.get_thread_context_for_rag(..., max_results=3)` (`backend/apps/landscaper/views.py:1242`).

Thread persistence:
1. Persisted in database (`ChatThread`, `ThreadMessage`, `ChatEmbedding` models) (`backend/apps/landscaper/models.py:25`, `backend/apps/landscaper/models.py:107`, `backend/apps/landscaper/models.py:162`).

Long-thread degradation risk:
1. Mitigated partially by 50-message cap.
2. Risk remains due large tool menus on some tabs + large structured context injection + additional retrieved context.
3. Existing alpha-readiness note about long-thread reliability is consistent with this architecture.

New thread creation:
1. UI has `New` button in `ThreadList` (`src/components/landscaper/ThreadList.tsx:176`).
2. Calls `startNewThread()` in `LandscaperChatThreaded` (`src/components/landscaper/LandscaperChatThreaded.tsx:274`).
3. Backend closes existing active thread then creates a new one (`backend/apps/landscaper/views.py:1105`, `backend/apps/landscaper/services/thread_service.py:171`).

## 7. Issues Found

| # | Severity | Issue | Impact | Suggested Fix |
|---|----------|-------|--------|---------------|
| 1 | CRITICAL | Chat/thread endpoints are `AllowAny` in project and thread APIs. | Unauthenticated read/write access risk; blocks safe alpha testing. | Enforce `IsAuthenticated` + tenant/project authorization checks on all chat/thread endpoints. |
| 2 | CRITICAL | Canonical knowledge chat endpoint is CSRF-exempt and has no auth enforcement. | Direct unauthenticated access path to chat orchestration. | Remove public exposure or enforce auth middleware/decorators; keep CSRF-exempt only with signed token auth if required. |
| 3 | CRITICAL | Project-shell document access is strictly project-scoped (`core_doc.project_id = active`) with no global/cross-project retrieval path. | Persistent knowledge engine objective is blocked on project pages. | Add explicit organization/global retrieval mode with permission-aware filters and citations. |
| 4 | HIGH | Project shell computes folder/subtab `pageContext`, but only folder is sent to Landscaper. | Tooling/prompt behavior can’t specialize by subtab; wrong tool set for fine-grained contexts. | Pass full `pageContext` and `subtab_context` from `ProjectLayoutClient` through `LandscaperPanel` to thread APIs. |
| 5 | HIGH | Main system prompt is project-type based, not page-context based. | “Home vs Property vs Operations” behavioral differences rely mostly on tools; prompt guidance is too generic. | Add page-context prompt overlays (home/property/ops/valuation/etc.) in `ai_handler`. |
| 6 | CRITICAL | `get_knowledge_insights` / `get_knowledge_entities` / `get_knowledge_facts` SQL lacks project/tenant filters. | Potential cross-project data leakage through tools available in project shell contexts. | Add project/cabinet/organization filters and row-level authorization in these tool queries. |
| 7 | HIGH | IREM benchmark tooling is not available in project-shell valuation/operations contexts. | Users cannot benchmark in-context during normal project analysis flow. | Expose `search_irem_benchmarks` on relevant project contexts with guardrails/citations. |
| 8 | MEDIUM | Thread model has `subtab_context` and `closed_at` semantics, but no idle timeout workflow is implemented. | Thread lifecycle hygiene depends on manual “new thread” usage; context may bloat over time. | Implement server-side inactivity closure policy and explicit archival strategy. |
| 9 | MEDIUM | Plain-text-only rendering strips markdown and heavily sanitizes assistant output. | Reduced readability for complex analyses and tabular responses. | Introduce safe markdown rendering mode for assistant output with strict allowlist. |

Severity levels:
- CRITICAL: Blocks alpha testing
- HIGH: Degrades user experience significantly
- MEDIUM: Functional but suboptimal
- LOW: Cosmetic or minor

## 8. Recommendations
1. Lock down security first: replace `AllowAny`, enforce authz on project/thread/global endpoints, and close unauthenticated canonical chat paths.
2. Restore context fidelity: pass full `folder/tab` context and `subtab_context` from project shell to backend; update normalization to use both.
3. Implement scoped knowledge tiers for project shell: project docs + optional org/global docs + optional comparable-project docs, all permission-gated and source-cited.
4. Add page-specific prompt overlays so behavior changes with Home/Property/Operations/Valuation/Capital/Documents/Map, not only project type.
5. Fix knowledge-graph scoping immediately (`knowledge_insights/entities/facts`) to prevent cross-project leakage.
6. Add benchmark + platform knowledge tooling where it is naturally needed in project workflows (valuation/ops), not only non-project pages.
7. Add thread lifecycle controls (idle closure, summary thresholds, context compaction) before outside alpha to reduce long-thread degradation.
