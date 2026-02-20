# DMS System Audit Report

**Date:** 2026-02-19
**Auditor:** Claude Code (Opus 4.6)
**Branch:** feature/alpha-prep
**Scope:** Full-stack DMS audit -- frontend, backend, database, processing pipeline, Landscaper integration

---

## Executive Summary

The DMS is a **comprehensive, production-approaching system** with
31 frontend components, 35+ API endpoints (Next.js + Django),
21 database tables, and a multi-stage document processing pipeline.

Core document management workflows (upload, profile, search, delete,
version, media extraction) are functional. Key gaps exist in version
history UI, template/attribute management UI, collision-to-Landscaper
routing, and async background processing.

The system is approximately **75% alpha-ready** for the MF appraiser
valuation workflow.

---

## Feature Status Matrix

### Frontend UI Features

| Feature | Status | Component | File Path | Notes |
|---------|--------|-----------|-----------|-------|
| Document upload (drag-drop) | [OK] WORKS | Dropzone | `src/components/dms/upload/Dropzone.tsx` | SHA256 hash, collision check, 32MB max, 10 files/batch |
| Document list (accordion) | [OK] WORKS | AccordionFilters | `src/components/dms/filters/AccordionFilters.tsx` | 2-column layout, count badges, expand-to-load |
| Document preview panel | [OK] WORKS | DocumentPreviewPanel | `src/components/dms/views/DocumentPreviewPanel.tsx` | Metadata, profile, actions, version badge |
| Document profile editing | [OK] WORKS | ProfileForm | `src/components/dms/profile/ProfileForm.tsx` | 7 fields: type, desc, tags, date, parties, amount |
| Filter panel (doc types) | [OK] WORKS | AccordionFilters | `src/components/dms/filters/AccordionFilters.tsx` | Custom type creation via "+ Add Type" inline |
| Search functionality | [OK] WORKS | SearchBox | `src/components/dms/search/SearchBox.tsx` | 300ms debounce, clear button |
| Bulk selection | [OK] WORKS | DMSView | `src/components/dms/DMSView.tsx` | Multi-select via checkboxes |
| Bulk delete (trash) | [OK] WORKS | DMSView | `src/components/dms/DMSView.tsx` | Soft delete with restore |
| Trash bin & restore | [OK] WORKS | DMSView | `src/components/dms/DMSView.tsx` | View trash, restore, permanent delete |
| Version display (badge) | [OK] WORKS | DocumentPreviewPanel | `src/components/dms/views/DocumentPreviewPanel.tsx` | Shows V1, V2, etc. as badge |
| Version history timeline | [X] MISSING | -- | -- | No timeline component; only current version badge |
| Collision modal | [!] ORPHANED | UploadCollisionModal | `src/components/dms/modals/UploadCollisionModal.tsx` | Defined but flow moved to LandscaperCollisionContext |
| Project selector (global DMS) | [OK] WORKS | ProjectSelector | `src/components/dms/filters/ProjectSelector.tsx` | Cross-project selection |
| Chat button per document | [OK] WORKS | DocumentPreviewPanel | `src/components/dms/views/DocumentPreviewPanel.tsx` | Opens DocumentChatModal |
| Document chat modal | [OK] WORKS | DocumentChatModal | `src/components/dms/modals/DocumentChatModal.tsx` | Suggested questions, RAG-scoped |
| Media preview/actions | [OK] WORKS | MediaPreviewModal | `src/components/dms/modals/MediaPreviewModal.tsx` | Filter by type, bulk actions, lightbox |
| Media badge chips | [OK] WORKS | MediaBadgeChips | `src/components/dms/MediaBadgeChips.tsx` | Color-coded by type, animated scan |
| Template management UI | [X] MISSING | -- | -- | Backend exists, no frontend |
| Attribute management UI | [X] MISSING | -- | -- | Backend exists, no frontend |
| Rename modal | [OK] WORKS | RenameModal | `src/components/dms/modals/RenameModal.tsx` | Enter to confirm |
| Delete confirm modal | [OK] WORKS | DeleteConfirmModal | `src/components/dms/modals/DeleteConfirmModal.tsx` | Shows doc names, supports bulk |

### Backend API Features -- Document CRUD

| Feature | Status | Stack | Notes |
|---------|--------|-------|-------|
| Create document | [OK] | Both | SHA256 dedup, tag tracking |
| Get document (single) | [OK] | Both | Separate system/profile objects |
| List documents | [OK] | Both | Filters: project, type, status |
| Update document profile | [OK] | Both | Audit trail via dms_profile_audit |
| Delete document (soft) | [OK] | Django | Soft delete (deleted_at) |
| Restore from trash | [OK] | Django | Clears deleted_at |
| Permanent delete | [OK] | Django | Cascades: facts, embeddings, media |
| Bulk delete | [X] | -- | Only single-doc delete supported |
| Rename document | [OK] | Django | |
| Document chat | [OK] | Both | Document-scoped RAG |

### Backend API Features -- Search & Filters

| Feature | Status | Stack | Notes |
|---------|--------|-------|-------|
| Search documents | [OK] | Next.js | Meilisearch + database fallback |
| Get filter counts | [OK] | Next.js | doc_type counts + smart filters |
| Get templates | [!] | Next.js | Read-only, no CRUD |
| Create/update template | [X] | -- | No endpoint |
| Get attributes | [!] | Next.js | Template attrs returned with profile |
| Create/update attributes | [X] | -- | No endpoint |

### Backend API Features -- Versioning & Collision

| Feature | Status | Stack | Notes |
|---------|--------|-------|-------|
| Check collision | [OK] | Django | SHA256 + filename match |
| Upload new version | [OK] | Django | Preserves extractions, supersedes embeddings |
| Link as version (drag) | [X] | -- | No drag-to-link endpoint |
| Get version history | [X] | -- | Versions created but no list endpoint |

### Backend API Features -- Extraction & Media

| Feature | Status | Stack | Notes |
|---------|--------|-------|-------|
| Get staging data | [OK] | Django | Extracted data for review |
| Commit staging data | [OK] | Django | Creates MF Unit/Lease records |
| Media scan | [OK] | Django | Detect embedded images |
| Media extract | [OK] | Django | Extract actual images |
| Media classify | [OK] | Django | AI classification |
| Media actions | [OK] | Django | save/extract/both/ignore |
| Media list | [OK] | Django | With scan status |

### Backend API Features -- Tags & Doc Types

| Feature | Status | Stack | Notes |
|---------|--------|-------|-------|
| Tag CRUD | [OK] | Django | Workspace-scoped, fuzzy suggest |
| Tag suggest | [OK] | Django | Trigram similarity + Levenshtein |
| Project doc types | [OK] | Django | Project-level overrides |

---

## Working Features

### Fully Functional

1. **Document Upload Pipeline** -- Drag-drop upload with SHA256 hashing, collision detection, UploadThing storage, extraction queue creation, and async RAG processing (fire-and-forget).

2. **Document Management CRUD** -- Create, read, update profile, rename, soft delete, restore from trash, permanent delete. Full audit trail via `dms_profile_audit` table.

3. **Document Search** -- Full-text search with Meilisearch primary and PostgreSQL `mv_doc_search` materialized view fallback. Faceting by doc_type, discipline, status, project_name.

4. **Document Filtering** -- Accordion-based doc type filters with count badges. Custom doc type creation. Smart filters from `core_doc_smartfilter` table.

5. **Document Preview Panel** -- Right-side panel showing metadata, profile fields, action buttons, version badge, and chat trigger.

6. **Document Profile Editing** -- 7-field form (type, description, tags, date, parties, amount) with template attribute integration.

7. **Document Chat** -- Per-document AI chat using document-scoped RAG. Suggested questions. Separate endpoint from main Landscaper.

8. **Media Asset Pipeline** -- Full scan --> extract --> classify --> link workflow. 14 classification types. Bulk actions. Lightbox preview. Badge chips with animated scanning state.

9. **Tag System** -- Workspace-scoped tags with CRUD, fuzzy suggest (trigram similarity), usage counts, and document assignment.

10. **Trash Bin** -- Soft delete with dedicated trash view, bulk restore, and permanent delete with cascade cleanup.

11. **Extraction Pipeline** -- 5 registered extractors (RentRoll, Operating, Parcel, MarketResearch, SectionDetector). PyMuPDF + pdfplumber for PDFs. Confidence scoring. Validation warnings.

12. **RAG/Embedding Pipeline** -- OpenAI ada-002 embeddings (1536-dim). Semantic chunking (1500 char target, table-aware). pgvector similarity search. Cross-project global knowledge retrieval.

13. **Extraction Staging & Commit** -- Extracted data staged for user review with confidence scores. Commit creates MultifamilyUnit/MultifamilyLease records. Rollback via ExtractionCommitSnapshot.

---

## Partial/Buggy Features

1. **Collision Handling** -- Detection works (SHA256 + filename). `UploadCollisionModal.tsx` exists but is orphaned -- collision flow was moved to `LandscaperCollisionContext` which builds chat-ready messages but is **not wired** to Landscaper chat. Currently collisions are detected but the resolution UX is incomplete.

2. **Version Upload** -- Django endpoint exists (`POST /api/documents/projects/:pid/docs/:did/version/`) and correctly increments version, preserves extractions, and supersedes embeddings. **But no frontend trigger exists** -- no version upload button or drag-to-link UI.

3. **Upload Tab** -- `DMSView.tsx` line 635 links to `?tab=upload` but no corresponding page/component exists for a dedicated upload tab view.

4. **Queue "View Document" Button** -- `Queue.tsx` line 181: `TODO: Open document details` -- button present but not wired.

5. **Download Button** -- Falls back to `alert("Download not available")` if `storage_uri` is missing (DocumentPreviewPanel line 121).

6. **Async Processing** -- `management/commands/process_extractions.py` is broken -- imports non-existent `services.extraction.extraction_worker`. Queue exists but no background worker processes it. All extraction is synchronous.

7. **DMS Landscaper Panel** -- Intent detection works (document_filter vs ai_query) but DMS-page Landscaper receives **NO extraction tools** -- only benchmarks/knowledge. No document metadata injected into context.

8. **Search Page** -- SearchBox component exists but no dedicated search results page. Search is embedded in DMSView accordion flow.

---

## Not Implemented

| Feature | Designed | Gap Description |
|---------|----------|-----------------|
| Version history timeline | Yes | No `DocumentVersionHistory.tsx` component. Only current version badge shown. No endpoint to list version history. |
| Template management UI | Yes | Backend tables exist (`dms_templates`, `dms_attributes`, `dms_template_attributes`). No CRUD endpoints or frontend. |
| Attribute management UI | Yes | `dms_attributes` table has full schema (key, type, validation, enum values). No management interface. |
| Collision --> Landscaper chat | Yes | `LandscaperCollisionContext.buildCollisionMessage()` generates chat-ready text. Not wired -- modal-based only. |
| Drag-to-link versioning | Yes | No UI for dragging a document onto another to create version link. |
| Template auto-apply on project creation | Yes | No automation to assign default template when project is created. |
| AI doc_type refinement | Yes | Auto-classifier runs at upload. No Landscaper feedback loop for validation. |
| Version diff notes | Yes | `doc_extracted_facts` tracks per-version facts with superseded_at. No diff UI. |
| Original filename preservation | Yes | Stored as `doc_name` (mutable). No separate `original_filename` column. |
| Cross-project document search | Yes | Global Landscaper has no extraction tools. Platform knowledge queries only. |
| Proactive extraction notifications | Yes | No push notification when extraction completes. No "review ready" banner. |
| OCR for scanned PDFs | Yes | Not implemented. Only text-based PDFs work. |
| Bulk delete API | Yes | Only single-document delete endpoint exists. |
| `document_sections` table | Partial | Referenced in section detection code. Migration `082_document_tables.sql` creates `document_tables` but not `document_sections`. |

---

## Database Status

### Table Inventory (21 core tables + 3 views)

| Category | Table | Purpose | Status |
|----------|-------|---------|--------|
| **Core** | `core_doc` | Central document record | [OK] Active -- 30+ columns |
| **Templates** | `dms_templates` | Doc type templates per workspace/project | [OK] Schema ready |
| **Templates** | `dms_attributes` | Custom field definitions | [OK] Schema ready |
| **Templates** | `dms_template_attributes` | Template <=> attribute junction | [OK] Schema ready |
| **Templates** | `dms_workspaces` | Logical doc grouping | [OK] Schema ready |
| **Processing** | `dms_extract_queue` | Extraction job queue | [OK] Active |
| **Processing** | `dms_profile_audit` | Profile change audit trail | [OK] Active |
| **Media** | `core_doc_media` | Extracted images/maps/charts | [OK] Active |
| **Media** | `core_doc_media_link` | Polymorphic entity <=> media links | [OK] Active |
| **Media** | `lu_media_classification` | 14 media type classifications | [OK] Seeded |
| **Extraction** | `tbl_extraction_mapping` | Configurable field mappings | [OK] Active |
| **Extraction** | `tbl_extraction_log` | Extraction attempt audit | [OK] Active |
| **Extraction** | `document_tables` | Structured table extraction from PDFs | [OK] Schema ready |
| **Knowledge** | `doc_extracted_facts` | Cumulative facts across versions | [OK] Active |
| **Geo** | `doc_geo_tag` | Geographic tagging for faceted search | [OK] Active |
| **Tags** | `dms_doc_tags` | Workspace-scoped tags | [OK] Active |
| **Tags** | `dms_doc_tag_assignments` | Doc <=> tag junction | [OK] Active |
| **Tags** | `dms_project_doc_types` | Project-level doc type overrides | [OK] Active |
| **Relationships** | `tbl_document_project` | Multi-project doc attachment | [OK] Active |
| **Audit** | `ai_correction_log` | User corrections to AI extractions | [OK] Active |
| **Audit** | `extraction_commit_snapshot` | Pre-commit rollback snapshots | [OK] Active |
| **View** | `mv_doc_search` | Full-text search materialized view | [OK] Active |
| **View** | `vw_doc_media_summary` | Media badge count aggregation | [OK] Active |
| **View** | `vw_extraction_mapping_stats` | Extraction effectiveness metrics | [OK] Active |

### Schema Column Verification

| Column/Table | Expected | Found | Notes |
|--------------|----------|-------|-------|
| `core_doc.version_no` | [OK] | [OK] INT default 1 | |
| `core_doc.parent_doc_id` | [OK] | [OK] BIGINT nullable | Self-ref FK for versioning |
| `core_doc.sha256_hash` | [OK] | [OK] VARCHAR(64) NOT NULL | Deduplication |
| `core_doc.original_filename` | [OK] | [X] | Stored as `doc_name` (mutable) |
| `core_doc.dms_template_id` | [OK] | [X] | Templates reference projects, not docs directly |
| `core_doc.notes` | [OK] | [X] | Use `profile_json` JSONB instead |
| `tbl_project.dms_template_id` | [OK] | [X] | No FK on project table |
| `document_tables` | [OK] | [OK] | Migration 082 creates it |
| `document_sections` | [OK] | [X] | Not found as separate table |

---

## Processing Pipeline Status

### Extractors

| Extractor | File | Doc Types | Status |
|-----------|------|-----------|--------|
| RentRollExtractor | `backend/apps/documents/extractors/rentroll.py` | PDF, Excel, CSV | [OK] Active |
| OperatingExtractor | `backend/apps/documents/extractors/operating.py` | PDF, Excel, CSV | [OK] Active |
| ParcelTableExtractor | `backend/apps/documents/extractors/parcel_table.py` | PDF, Excel, CSV | [OK] Active |
| MarketResearchExtractor | `backend/apps/documents/extractors/market_research.py` | PDF, Excel | [OK] Active |
| DocumentSectionDetector | `backend/apps/documents/extractors/document_classifier.py` | PDF | [OK] Rule-based |

### Text Extraction

| Format | Method | Status |
|--------|--------|--------|
| PDF (text) | PyMuPDF (fitz) | [OK] Works |
| PDF (tables) | pdfplumber | [OK] Works -- `[TABLE]...[/TABLE]` markers |
| PDF (scanned/OCR) | -- | [X] Not supported |
| DOCX | python-docx | [OK] Works |
| XLSX | openpyxl | [OK] Works |
| CSV/TXT/MD/JSON | Native file read | [OK] Works |
| Legacy .xls | -- | [X] Not supported |

### Embedding Pipeline

| Component | Status | Details |
|-----------|--------|---------|
| Chunking | [OK] | Semantic sentence-aware, 1500 char target, 200 char overlap, table-aware |
| Embedding generation | [OK] | OpenAI ada-002, 1536-dim, batch support |
| Vector storage | [OK] | pgvector in `knowledge_embeddings` table |
| Vector search | [OK] | Project-scoped + global, 0.7 similarity threshold |
| Cross-project RAG | [OK] | `global_knowledge.py` retrieves across all projects |
| pgvector Django ORM | [!] | Vector column commented out in model (Phase 2), uses raw SQL |

---

## Landscaper Integration Status

| Integration Point | Status | Notes |
|-------------------|--------|-------|
| Document reading tools | [OK] | `get_project_documents`, `get_document_content`, `get_document_assertions`, `ingest_document` |
| Rent roll extraction workflow | [OK] | Deep integration: column analysis --> mapping --> delta computation --> commit |
| Document-scoped chat | [OK] | Dedicated endpoint with excellent context injection (doc metadata, facts, chunks) |
| Knowledge fact query | [OK] | `get_knowledge_entities/facts` tools available on documents page |
| Page context routing | [OK] | Tool gating by page_context, keyword-based extraction tool auto-enable |
| Collision --> chat routing | [!] | `LandscaperCollisionContext` exists with `buildCollisionMessage()` but not wired |
| Document profiling assistance | [X] | Auto-classifier separate from Landscaper; no feedback loop |
| Document summarization | [~] | User can ask in chat; no AI-initiated summaries |
| Cross-project document search | [X] | Global DMS Landscaper gets benchmarks/knowledge only, no extraction tools |
| Proactive notifications | [X] | No push when extraction completes |
| Document metadata injection | [X] | Current doc/extraction status not passed to Landscaper system prompt |

---

## Recommended Fixes (Priority Order)

### Critical (Alpha Blockers)

1. **Wire collision resolution** -- Connect `LandscaperCollisionContext` to Landscaper chat OR restore standalone collision modal with proper UX. Currently collisions are detected but users have no resolution path.

2. **Add version history endpoint** -- Create `GET /api/documents/projects/:pid/docs/:did/versions/` that queries `core_doc WHERE parent_doc_id = :did` to list version chain. Frontend can then render timeline.

3. **Fix async processing** -- Either fix `management/commands/process_extractions.py` (currently imports non-existent module) or add Django-RQ/Celery for background extraction. Current synchronous processing blocks upload flow.

### High Priority

4. **Build version history UI** -- Create `DocumentVersionHistory.tsx` component showing version chain with dates, who uploaded, and what was extracted per version.

5. **Add bulk delete endpoint** -- Accept array of `doc_ids` in single request. Frontend already supports bulk selection.

6. **Wire Queue "View Document"** -- Fix TODO at `Queue.tsx:181` to navigate to document preview after upload.

7. **Inject document metadata into Landscaper** -- When on documents page, pass current document ID, extraction status, and doc_type confidence to Landscaper system prompt.

### Medium Priority

8. **Build template management UI** -- CRUD interface for `dms_templates` + `dms_attributes`. Backend schema is complete.

9. **Add `original_filename` column** -- `core_doc.doc_name` is mutable (rename changes it). Add immutable `original_filename` for audit trail.

10. **Add cross-project doc search to DMS Landscaper** -- Add `search_user_documents` tool to global Landscaper context with optional project filter.

11. **OCR support** -- Add Tesseract or EasyOCR fallback for scanned PDFs. Check for empty text extraction and trigger OCR pipeline.

12. **Build search results page** -- Dedicated page using SearchBox + ResultsTable + Facets components (all exist but aren't composed).

### Low Priority

13. **Template auto-apply** -- On project creation, auto-assign default template from `dms_templates WHERE isDefault = true`.

14. **Extraction completion notifications** -- Emit event when extraction finishes so Landscaper can proactively offer "Your rent roll extraction is ready for review."

15. **Document type refinement loop** -- After auto-classification, let Landscaper validate and refine doc_type with user confirmation.

16. **Add `document_sections` table** -- Create migration for structured section storage (separate from `document_tables`).

---

## Configuration Notes

### Required Environment Variables

```bash
# .env.local (Next.js)
DATABASE_URL=postgresql://...              # Neon PostgreSQL (land_v2)
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000

# AI Services (required for extraction + embeddings)
OPENAI_API_KEY=...                          # Embeddings (ada-002)
ANTHROPIC_API_KEY=...                       # Landscaper chat (Claude)

# File Storage (required for uploads)
UPLOADTHING_SECRET=...                      # UploadThing file storage
```

### Server Requirements

- **Next.js** on port 3000 (Turbopack dev server)
- **Django** on port 8000 (runserver)
- Both servers must be running for full DMS functionality
- Django serves all document CRUD endpoints
- Next.js serves search, filter counts, and document creation

### Database Requirements

- PostgreSQL with `pgvector` extension enabled
- Schema: `landscape` with search_path configured
- Materialized view `mv_doc_search` must be refreshed after bulk operations
- `lu_media_classification` must be seeded (14 classification types)

### File Storage

- UploadThing for frontend uploads (Dropzone component)
- Django `default_storage` for backend uploads (configurable: S3, local, GCS)
- Storage URIs stored in `core_doc.storage_uri`
- Media assets stored separately with `core_doc_media.storage_uri`

---

## Component Tree

```
DMSView.tsx (root orchestrator, 1078 lines)
|-- AccordionFilters.tsx (left + right columns, 569 lines)
|   |-- Dropzone.tsx (per-filter upload, 480 lines)
|   \-- MediaBadgeChips.tsx (media summary badges, 279 lines)
|-- DocumentPreviewPanel.tsx (right panel, 404 lines)
|   |-- DocumentChatModal.tsx (per-doc AI chat, 235 lines)
|   |-- RenameModal.tsx (109 lines)
|   \-- DeleteConfirmModal.tsx (237 lines)
|-- ProfileForm.tsx (edit metadata, 346 lines)
|   \-- TagInput.tsx (tag widget)
|-- DeleteConfirmModal.tsx (bulk + single)
|-- RestoreConfirmModal.tsx (trash recovery)
|-- RenameModal.tsx
|-- MediaPreviewModal.tsx (518 lines)
|   \-- MediaCard.tsx (per-asset, 234 lines)
|-- SearchBox.tsx (81 lines)
|-- ProjectSelector.tsx (global DMS, 105 lines)
\-- [Orphaned] UploadCollisionModal.tsx (143 lines)

Supporting:
|-- DmsLandscaperPanel.tsx (intent detection, 420 lines)
|-- ProjectMediaGallery.tsx
|-- DocumentTable.tsx
|-- DocumentAccordion.tsx (334 lines)
|-- PlatformKnowledgeTable.tsx
|-- PlatformKnowledgeAccordion.tsx
|-- PlatformKnowledgeChatModal.tsx
|-- PlatformKnowledgeModal.tsx
|-- PlatformKnowledgeProfileForm.tsx
|-- MediaPickerModal.tsx
|-- Facets.tsx
|-- ResultsTable.tsx
|-- ColumnChooser.tsx
\-- DMSLayout.tsx (shared 3-panel wrapper)
```

---

## API Endpoint Summary

### Next.js Routes (14 endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/dms/docs | Create document |
| GET | /api/dms/docs | List documents |
| GET | /api/dms/docs/[id] | Get single document |
| POST | /api/dms/upload | Upload file + optional extraction |
| GET | /api/dms/search | Search (URL params) |
| POST | /api/dms/search | Full-text search with facets |
| GET | /api/dms/documents/[id]/profile | Get profile + template |
| PATCH | /api/dms/documents/[id]/profile | Update profile |
| GET | /api/dms/filters/counts | Filter counts + smart filters |
| GET | /api/projects/[pid]/documents | Project documents with processing status |
| GET | /api/projects/[pid]/documents/[did]/content | Document content |
| GET | /api/projects/[pid]/documents/count | Document count |
| POST | /api/projects/[pid]/dms/docs/[did]/chat | Document chat |
| DELETE | /api/projects/[pid]/dms/docs/[did]/delete | Delete (proxy to Django) |

### Django Routes (35+ endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | /api/documents/ | List/Create documents |
| GET/PUT/PATCH/DELETE | /api/documents/:id/ | Document CRUD |
| GET | /api/documents/by_project/:pid/ | Project docs with summary |
| POST | /api/documents/upload/ | File upload |
| GET | /api/documents/staging/:did/ | Get staged extraction data |
| POST | /api/documents/staging/:did/commit/ | Commit extraction to production |
| POST | /api/documents/projects/:pid/check-collision/ | Collision detection |
| POST | /api/documents/projects/:pid/docs/:did/version/ | Upload new version |
| DELETE | /api/documents/projects/:pid/docs/:did/delete/ | Soft delete |
| PATCH | /api/documents/projects/:pid/docs/:did/rename/ | Rename |
| POST | /api/documents/projects/:pid/docs/:did/restore/ | Restore from trash |
| DELETE | /api/documents/projects/:pid/docs/:did/permanent-delete/ | Permanent delete |
| POST | /api/documents/:did/media/scan/ | Scan for media |
| POST | /api/documents/:did/media/extract/ | Extract media |
| POST | /api/documents/:did/media/classify/ | Classify media |
| POST | /api/documents/:did/media/reclassify/ | Reclassify media |
| GET | /api/documents/:did/media/ | List media |
| POST | /api/documents/:did/media/actions/ | Submit media actions |
| POST | /api/documents/:did/media/reset/ | Reset media state |
| POST | /api/media/:mid/reclassify/ | Reclassify single media |
| POST | /api/media/:mid/discard/ | Discard media |
| POST | /api/documents/media/links/ | Create/list media links |
| DELETE | /api/documents/media/links/:lid/ | Delete media link |
| PATCH | /api/documents/media/links/reorder/ | Reorder media links |
| GET | /api/documents/media/available/ | List available media |
| GET | /api/documents/tags/ | List tags |
| POST | /api/documents/tags/ | Create tag |
| PUT | /api/documents/tags/:tid/ | Update tag |
| DELETE | /api/documents/tags/:tid/ | Delete tag |
| GET | /api/documents/tags/suggest/ | Tag suggestions (fuzzy) |
| POST | /api/documents/:did/tags/ | Assign tags |
| DELETE | /api/documents/:did/tags/:tid/ | Remove tag |
| GET | /api/documents/projects/:pid/doc-types/ | List project doc types |
| POST | /api/documents/projects/:pid/doc-types/ | Create project doc type |
| PUT/DELETE | /api/documents/projects/:pid/doc-types/:pk/ | Update/delete doc type |
| GET/POST | /api/folders/ | Folder CRUD |
| GET | /api/folders/tree/ | Folder tree |

---

*Report generated: 2026-02-19*
*Total components reviewed: 31*
*Total API endpoints documented: 49+*
*Total database tables documented: 21 + 3 views*
*Total code files analyzed: 50+*
