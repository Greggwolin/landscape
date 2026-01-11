# Landscaper AI - Current State Briefing

Created: 2025-12-24
Last Modified: 2025-12-24

## 1) EXEC SUMMARY (10-20 bullets)
- New since last handoff: extraction approval workflow (bulk status + high-confidence approve) wired into Django + report UI (`backend/apps/knowledge/views/extraction_views.py`, `src/components/reports/ExtractionHistoryReport.tsx`).
- New since last handoff: Landscaper panel now drives UploadThing upload + synchronous processing + batched extraction + review modal (`src/components/landscaper/LandscaperPanel.tsx`).
- New since last handoff: Knowledge RAG stack (schema context + DB-first intent + pgvector search) exists in `backend/apps/knowledge/services/*` but is not the primary chat path for the UI.
- Working end-to-end (document pipeline): UploadThing -> `landscape.core_doc` -> `doc_processing_queue`/`process/` -> chunking -> embeddings -> `knowledge_embeddings` (`src/lib/dms/uploadthing.ts`, `src/app/api/dms/docs/route.ts`, `backend/apps/knowledge/services/document_processor.py`).
- Working end-to-end (chat storage): /api/projects/{id}/landscaper/chat persists to `landscape.landscaper_chat_message` (`backend/apps/landscaper/views.py`, `backend/apps/landscaper/models.py`).
- Partial: Landscaper chat in the panel uses Next proxy + Django; tool executor can pull DMS extractions, but it is not the RAG path (`src/hooks/useLandscaper.ts`, `backend/apps/landscaper/tool_executor.py`).
- Partial: Activity feed endpoints exist in Django, but frontend proxies for mark-read/mark-all-read are missing and fallback mock data is used on error (`src/hooks/useActivityFeed.ts`, `src/components/landscaper/ActivityFeed.tsx`).
- Partial: Extraction review UI exists (modal + validation), but multi-agent studio/agent dashboards are mostly stubbed (`src/components/landscaper/ExtractionReviewModal.tsx`, `src/app/projects/[projectId]/components/landscaper/COODashboard.tsx`).
- Stubbed: Agent dashboards and decisions are hardcoded; agentId does not alter prompts or retrieval (`src/app/projects/[projectId]/components/landscaper/COODashboard.tsx`).
- Stubbed: "Greenhouse" panel is referenced only in CSS; no component found (`src/styles/channel-modal.css`).
- Broken/unstable: `UnifiedSidebar` is imported but missing from repo (`src/app/projects/[projectId]/components/landscaper/ProjectLayoutClient.tsx`).
- Broken/unstable: Mark-read/mark-all-read endpoints used by UI do not exist in Next API routes.
- Risk: RAG search is not project-scoped (embeddings are tagged with project_id but `search_similar` does not filter on entity_ids) (`backend/apps/knowledge/services/embedding_storage.py`).
- UX gaps: `ChatInterface` and `AdviceAdherencePanel` hardcode localhost URLs; no auth; delete chat is a stub (`src/components/landscaper/ChatInterface.tsx`, `src/components/landscaper/AdviceAdherencePanel.tsx`, `src/app/api/projects/[projectId]/landscaper/chat/route.ts`).
- Navigation: Global top nav is still active via `NavigationLayout` and not removed across project routes (`src/app/components/NavigationLayout.tsx`).

---

## 2) REPO DIFF + TIMELINE

**Branch**
- Current branch: `work` (ahead 2) per `git status -sb`.

**Latest commits relevant to landscaper/knowledge/rag/ingestion/documents/agents**
- `b7c4e92` feat(knowledge): add extraction approval workflow
- `92651cc` merge: landscaper panel restructure with extraction platform
- `6f34007` assets: add landscaper and greenhouse icons
- `bb23e23` docs: add field registry and architecture documentation
- `ce0ecd5` feat(projects): add landscaper workspace components and update tabs
- `9edf8aa` feat(admin): add extraction mapping and landscaper admin panels
- `927a88b` feat(landscaper): enhance panel with extraction review components
- `9fa6e51` feat(backend): update knowledge extraction and landscaper services
- `4cacda7` feat(landscaper): Phase 6 - complete chat interface with message persistence
- `35da8a4` feat: implement Landscaper Panel with 30/70 split layout (Phase 1)
- `36d35d9` feat: add Zonda subdivision ingestion tool
- `b00a005` feat: add Redfin Python ingestion tool for unified pipeline

**Baseline commit for diff**
- Commit message "Landscaper-native UI scaffold complete" not found in `git log --grep`.
- Earliest commit adding `src/app/projects/[projectId]/components/landscaper/*` is `ce0ecd5`.
- Changes since `ce0ecd5` (high-level):
  - Added panel extraction review UI and batching (`927a88b`, `92651cc`).
  - Added extraction history approval workflow and endpoints (`b7c4e92`).
  - Added admin panels for extraction mappings (`9edf8aa`).
  - Added knowledge extraction services and RAG tooling (`9fa6e51`, `6ec162b`, `69b087b`).
  - Added Landscaper/Greenhouse icons (`6f34007`).

---

## 3) ARCHITECTURE MAP (CURRENT)

**Text diagram**
Upload -> Storage (UploadThing) -> DB metadata (core_doc) -> extraction -> chunking -> embeddings (pgvector) -> retrieval -> chat response

**Modules and entrypoints**
- Upload
  - UploadThing router + metadata capture: `src/lib/dms/uploadthing.ts`
  - DMS dropzone: `src/components/dms/upload/Dropzone.tsx`
  - Landscaper panel uploader: `src/components/landscaper/LandscaperPanel.tsx`
  - Simple upload endpoint: `src/app/api/dms/upload/route.ts`

- Storage + metadata
  - Document creation + dedupe + ingestion history: `src/app/api/dms/docs/route.ts`
  - Storage fields: `landscape.core_doc.storage_uri`, `sha256_hash`, `project_id`

- Extraction (DMS queue path)
  - Queue table: `landscape.dms_extract_queue` (inserted in `src/app/api/dms/docs/route.ts`)
  - Worker: `backend/services/extraction/extraction_worker.py`
  - Extractors: `backend/services/extraction/rent_roll_extractor.py`, `backend/services/extraction/pdf_rent_roll_extractor.py`

- Text extraction + chunking
  - Text extraction: `backend/apps/knowledge/services/text_extraction.py`
  - Chunking: `backend/apps/knowledge/services/chunking.py`
  - Orchestrator: `backend/apps/knowledge/services/document_processor.py`

- Embeddings (pgvector)
  - Embedding storage + search: `backend/apps/knowledge/services/embedding_storage.py`
  - Table: `landscape.knowledge_embeddings` (`backend/apps/knowledge/models.py`)

- Retrieval (DB-first + RAG)
  - RAG assembly + priority order: `backend/apps/knowledge/services/rag_retrieval.py`
  - Query templates + intent detection: `backend/apps/knowledge/services/query_builder.py`
  - Schema context: `backend/apps/knowledge/services/schema_context.py`

- Chat response
  - UI chat path (used by panel): `src/app/api/projects/[projectId]/landscaper/chat/route.ts` -> `backend/apps/landscaper/views.py` -> `backend/apps/landscaper/ai_handler.py`
  - RAG chat path (not wired to UI): `backend/apps/knowledge/views/chat_views.py` -> `backend/apps/knowledge/services/landscaper_ai.py`

---

## 4) LANDSCAPER CHAT / AGENT LENSING

**Frontend routes**
- Chat proxy: `src/app/api/projects/[projectId]/landscaper/chat/route.ts`
- Search proxy: `src/app/api/projects/[projectId]/landscaper/search/route.ts` -> `/api/knowledge/chat/{projectId}/search/`
- Activity feed proxy: `src/app/api/projects/[projectId]/landscaper/activities/route.ts`

**Backend routes**
- `/api/projects/{project_id}/landscaper/chat/` and activities: `backend/apps/landscaper/urls.py`, `backend/apps/landscaper/views.py`
- RAG chat: `/api/knowledge/chat/{project_id}/...` (`backend/apps/knowledge/views/chat_views.py`)

**Request/response shapes**
- UI POST -> Next proxy transforms `{ message }` to Django `{ content }` (`src/app/api/projects/[projectId]/landscaper/chat/route.ts`).
- Django chat response includes `user_message` + `assistant_message` (`backend/apps/landscaper/views.py`).
- Hook expects `messageId`, `content`, `metadata`, `fieldUpdates` (`src/hooks/useLandscaper.ts`).

**Auth and scoping**
- Django chat uses `AllowAny` (no auth enforcement) (`backend/apps/landscaper/views.py`).
- Project scoped via URL param; messages stored in `landscape.landscaper_chat_message` (`backend/apps/landscaper/models.py`).

**Message storage + retrieval**
- Stored in `landscape.landscaper_chat_message` with `project_id`, `role`, `content`, `metadata` (`backend/apps/landscaper/models.py`).
- `list()` returns last 100 messages ordered by timestamp (`backend/apps/landscaper/views.py`).

**Agent lensing**
- No per-agent lens in API; agentId is UI-only (`src/app/projects/[projectId]/components/landscaper/AgentChat.tsx`).
- Only prompt "lens" is project_type -> prompt category in `backend/apps/landscaper/ai_handler.py` (`SYSTEM_PROMPTS`).

---

## 5) DB-FIRST CONTEXT + RAG FALLBACK (IF PRESENT)

**Exists**
- DB-first query layer: `backend/apps/knowledge/services/query_builder.py`
- Schema context builder: `backend/apps/knowledge/services/schema_context.py`
- Priority order: `backend/apps/knowledge/services/rag_retrieval.py` (DB -> docs -> general)

**Priority + intent detection (excerpt)**
```py
# backend/apps/knowledge/services/rag_retrieval.py
Context Priority:
1. Database queries (live project data) - PRIMARY
2. Document embeddings (uploaded files) - SECONDARY
3. General knowledge - FALLBACK
```

**Intent detection**
- Regex patterns in `INTENT_PATTERNS` map queries -> template key (`backend/apps/knowledge/services/query_builder.py`).

**Query templates + tables**
- `parcel_count`, `parcel_summary`, `parcel_by_type` -> `landscape.tbl_parcel`
- `container_summary`, `area_list`, `phase_list` -> `landscape.tbl_area`, `landscape.tbl_phase`, `landscape.tbl_parcel`
- `budget_total`, `budget_by_category`, `budget_by_activity` -> `landscape.core_fin_fact_budget` (+ `core_lookup_item`)
- `land_use_pricing` -> `landscape.land_use_pricing`
- `project_details` -> `landscape.tbl_project`
- TODO/bug: intent references `container_list` but template is missing (see `RESULT_FORMATTERS` vs `QUERY_TEMPLATES` in `backend/apps/knowledge/services/query_builder.py`).

**Example questions -> exact context artifacts**
- Q: "How many parcels?"
  ```text
  The project has {count} parcels defined in the database.
  ```
  from `_format_parcel_count` in `backend/apps/knowledge/services/query_builder.py`.
- Q: "Show pricing by land use."
  ```text
  Land Use Pricing:
  - {lu_type} - {product}: ${price} per {uom} ({growth}% growth)
  ```
  from `_format_land_use_pricing` in `backend/apps/knowledge/services/query_builder.py`.
- Q: "What is this project?"
  ```text
  Project: {project_name}
  - Type: {project_type_code}
  - Location: {city}, {county} County, {state}
  ```
  from `_format_project_details` in `backend/apps/knowledge/services/query_builder.py`.

**Document chunk context artifact**
```text
[From: {doc_name} (relevance: 85%)]
{chunk_text}
```
from `backend/apps/knowledge/services/rag_retrieval.py`.

**How artifacts are composed into the model prompt**
- `backend/apps/knowledge/services/landscaper_ai.py` builds a system prompt with sections:
  - `PROJECT DATA`
  - `QUERY RESULT`
  - `DOCUMENT EXCERPTS`
  - `AVAILABLE DATA TYPES`

---

## 6) INGESTION FLOWS (DOCUMENTS + MARKET DATA + OTHER)

### A) Documents (DMS + Knowledge)
**Trigger**
- User upload via DMS dropzone or Landscaper panel (`src/components/dms/upload/Dropzone.tsx`, `src/components/landscaper/LandscaperPanel.tsx`).

**Queue/async mechanism**
- DMS extract queue: `landscape.dms_extract_queue` processed by `backend/services/extraction/extraction_worker.py` (manual/cron/Celery).
- RAG processing queue: `landscape.doc_processing_queue` in `backend/apps/knowledge/services/document_processor.py` (manual/cron), plus synchronous `/process/` endpoint.

**Storage locations**
- UploadThing returns URL -> stored in `landscape.core_doc.storage_uri` (`src/app/api/dms/docs/route.ts`).
- DMS extracts stored in `landscape.dms_extract_queue.extracted_data`.
- Knowledge embeddings stored in `landscape.knowledge_embeddings`.

**Output tables written**
- `landscape.core_doc`, `landscape.ai_ingestion_history`, `landscape.dms_extract_queue`
- `landscape.doc_processing_queue`, `landscape.knowledge_embeddings`
- Staged AI extractions: `landscape.ai_extraction_staging` (`backend/apps/knowledge/views/extraction_views.py`)

**Failure modes + logs**
- DMS worker marks job/doc `failed` and logs via stdout in `backend/services/extraction/extraction_worker.py`.
- Knowledge processor marks `core_doc.processing_status` with error and logs via `logger` in `backend/apps/knowledge/services/document_processor.py`.
- Landscaper panel shows drop notice errors but does not surface server logs (`src/components/landscaper/LandscaperPanel.tsx`).

**Admin/review UI**
- Extraction review modal and validation UI: `src/components/landscaper/ExtractionReviewModal.tsx`, `src/components/landscaper/ExtractionValidation.tsx`.
- Extraction history approval workflow: `src/components/reports/ExtractionHistoryReport.tsx`.

### B) Market data (macro/micro series)
**Trigger**
- CLI: `poetry run market-ingest ...` (`services/market_ingest_py/README.md`).

**Queue/async**
- Synchronous CLI execution; no queue service in repo.

**Storage**
- `public.market_data`, `public.market_series`, `public.market_fetch_job`, `landscape.ai_ingestion_history` (`services/market_ingest_py/README.md`).

**Failure modes + logs**
- Logs via loguru; failures noted in CLI output and `market_fetch_job` status.

**Admin/review UI**
- No dedicated UI found; appears backend-only.

### C) Other ingestion (Zonda/HBACA/Redfin)
**Trigger**
- Python tooling in `backend/tools/market_ingest/*` (Zonda/HBACA).
- Redfin scripts and docs (`docs/architecture/ingestion_builder_redfin_v1.md`, `b00a005`).

**Storage**
- Zonda -> `landscape.zonda_subdivisions`
- HBACA -> `landscape.market_activity`
- Redfin -> `landscape.bmk_resale_closings` (per status docs)

**Review UI**
- No dedicated UI located; appears script-driven.

---

## 7) STORAGE + FILES

**UploadThing integration**
- Upload router: `src/lib/dms/uploadthing.ts` (headers capture `projectId`, `workspaceId`, doc metadata).
- Client helpers: `src/lib/uploadthing.ts`.
- Stored file URL -> `landscape.core_doc.storage_uri` (`src/app/api/dms/docs/route.ts`).
- Reprocessing supported:
  - Knowledge: `/api/knowledge/documents/{doc_id}/reprocess/` proxied by `src/app/api/dms/docs/[id]/reprocess/route.ts`.
  - Batch queue: `queue_document_for_processing` in `backend/apps/knowledge/services/document_processor.py`.

**Local file storage**
- DMS extraction worker supports local file paths if `storage_uri` is non-HTTP (`backend/services/extraction/extraction_worker.py`).

**Document-to-project association**
- `core_doc.project_id` is required and enforced in upload metadata + insert (`src/app/api/dms/docs/route.ts`).
- RAG search does not filter by project_id at query time (risk noted above).

---

## 8) UI INTEGRATION STATUS

**Current UI state**
- Primary project layout uses LandscaperPanel in 30/70 split: `src/app/projects/[projectId]/ProjectLayoutClient.tsx`.
- Landscaper modal route: `/projects/[projectId]/landscaper` (`src/app/projects/[projectId]/landscaper/page.tsx`).

**AgentSidebar + Greenhouse + modals**
- `AgentSidebar` is deprecated and uses static agent data (`src/app/projects/[projectId]/components/landscaper/AgentSidebar.tsx`).
- Agent dashboards (COO/Studio/Chat) are stubbed with local state (`src/app/projects/[projectId]/components/landscaper/COODashboard.tsx`, `StudioPanel.tsx`).
- "Greenhouse" panel not found; only CSS classes exist (`src/styles/channel-modal.css`).

**Known UX gaps**
- Chat modal uses direct `http://localhost:8000` (no proxy or env) (`src/components/landscaper/ChatInterface.tsx`).
- AdviceAdherencePanel uses direct `http://localhost:8000` (`src/components/landscaper/AdviceAdherencePanel.tsx`).
- Chat delete is stubbed in Next route (`src/app/api/projects/[projectId]/landscaper/chat/route.ts`).
- Activity feed fallbacks are hardcoded; mark-read proxies missing.
- Sticky left panel height is hardcoded in `ProjectLayoutClient` and may not match layout for smaller screens.

**Top nav removal**
- Not removed globally; `NavigationLayout` still renders `TopNavigationBar` for most routes (`src/app/components/NavigationLayout.tsx`).

---

## 9) KNOWN LANDMINES + NEXT 5 PRIORITIES

**Top blockers / landmines**
- Missing `UnifiedSidebar` component (import breaks agent layout) (`src/app/projects/[projectId]/components/landscaper/ProjectLayoutClient.tsx`).
- Activity feed mark-read endpoints not proxied; UI calls `/api/projects/.../mark-read` which does not exist in Next.
- RAG search is not project-scoped, risking cross-project document leakage (`backend/apps/knowledge/services/embedding_storage.py`).
- Chat modal hardcodes localhost and bypasses Next proxies; breaks in non-local environments.
- RAG/DB-first chat is not wired to the main Landscaper panel (two parallel chat stacks).

**Next 5 priorities (ordered)**
1) Wire a single chat path: decide between `/api/projects/.../landscaper/chat/` vs `/api/knowledge/chat/...` and unify RAG + tool execution.
2) Add Next proxies for activity mark-read/mark-all-read or update hooks to hit Django directly.
3) Add project_id filtering in RAG search (use `entity_ids` in `knowledge_embeddings` or join `core_doc`).
4) Fix/implement `UnifiedSidebar` or remove agent layout imports; ensure agent UI is reachable and non-breaking.
5) Remove hardcoded localhost URLs and route through `NEXT_PUBLIC_DJANGO_API_URL` or Next API.

