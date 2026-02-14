# DMS Enhancements: Extraction Mapping Doc Types, Tags, Subtype Classifier & DMS Cleanup

**Date**: February 14, 2026
**Duration**: ~6 hours (across 2 continued sessions)
**Focus**: Document type vocabulary alignment, tag system for document subtypes, DMS project-level filter UI, Knowledge Library chat verification, global /dms route removal
**Branch**: `feature/extraction-mapping-doctype-tags`

---

## Summary

Multi-part enhancement to the DMS and AI extraction pipeline. Aligned extraction mapping document types with the DMS template vocabulary, built a tag system for document subtypes, created a subtype classifier service, wired up the "+ Add Type" UI on the project DMS page, removed the deprecated global /dms route (replaced by Knowledge Library), and verified/improved document-scoped Landscaper chat.

## Major Accomplishments

### 1. Extraction Mapping Doc Type Vocabulary Alignment ✅

Remapped all `tbl_extraction_mapping.document_type` values from hardcoded uppercase codes to the template-derived mixed-case vocabulary used by DMS templates:

| Old Code | New Name |
|----------|----------|
| APPRAISAL | Property Data |
| OM | Offering |
| RENT_ROLL | Property Data |
| T12 | Accounting |
| MARKET_STUDY | Market Data |
| LOAN_DOC | Diligence |
| PSA | Agreements |
| INSURANCE | Operations |
| operating_statement | Accounting |
| (+ 6 more) | ... |

- Migration: `20260217_align_extraction_mapping_doc_types.sql`
- Created audit log table `extraction_mapping_doctype_migration_log` for rollback support
- 145 total mappings remapped across 7 document type categories

### 2. Tag System for Document Subtypes ✅

Built a complete tag system bridging document subtypes to user-facing tags:

- **`dms_doc_tags` table**: Tag definitions with workspace scoping, usage counts
- **`dms_doc_tag_assignments` table**: Many-to-many doc-tag relationships
- **`dms_project_doc_types` table**: Project-level custom doc type overrides
- **`applicable_tags` column** on `tbl_extraction_mapping` (JSONB): Tag-based extraction filtering
- Django tag CRUD API: `backend/apps/documents/tag_views.py` (6 endpoints)
- Frontend `TagInput.tsx` component with fuzzy suggest, inline create, pill display

### 3. AI Document Subtype Classifier ✅

Created `ai_document_subtypes` table and `DocumentSubtypeClassifier` service:

- **13 seeded subtypes** covering multifamily (garden, midrise, highrise, student, affordable, senior, mixed-use), land (master planned, infill, build-to-rent), office (suburban, CBD), and retail (strip)
- Each subtype has `detection_patterns` (JSONB), `priority_fields`, `skip_fields`, `special_instructions`
- Pattern-matching scoring with word-boundary detection and count bonuses
- **Extraction pipeline integration**: Auto-assigns subtype tags when confidence ≥ 0.6
- **Ingestion integration**: `ingest_document()` returns `subtype_detected` metadata
- Migration: `20260218_subtype_classifier_tag_bridge.sql`

### 4. Project DMS "+ Add Type" Button ✅

Wired up the frontend UI for adding custom document types to a project:

- **Inline input** (not modal): Enter to create, Escape to cancel
- **Duplicate validation** against existing types (case-insensitive)
- **Django API integration**: `POST /api/dms/projects/{pid}/doc-types/` with Next.js fallback
- **Delete custom types**: × button on hover with confirmation tooltip
- **Template types protected**: Cannot be deleted (no delete button shown)
- Modified: `DMSView.tsx`, `AccordionFilters.tsx`, `AccordionFilters.module.css`

### 5. AI Extraction Mappings Panel Fix ✅

Fixed the Extraction Mappings panel showing "0 mappings" despite dropdown showing counts:

- **Root cause**: `applicable_tags` column missing from `tbl_extraction_mapping` — migration 20260217 had not been run
- **Fix**: Corrected migration type from `TEXT[]` to `JSONB DEFAULT '[]'` (matching Django JSONField), ran both migrations
- **Result**: All 145 mappings now display with proper template-aligned doc type badges

### 6. Extraction Mapping Help Modal ✅

Added a comprehensive help modal to the AI Extraction Mappings panel:

- 5 sections: What This Panel Does, Column Definitions, Impact of Changes, Tags & Filtering, Tips
- Column header tooltips on all 7 columns
- Accessible via ? button in the toolbar

### 7. Knowledge Library Rewrite ✅

Rewrote the `ExtractionMappingAdmin.tsx` component:

- Full CRUD with SWR data fetching
- Filter dropdowns: Doc Type, Table, Confidence, Active Status, Search
- Stats view toggle with usage metrics
- Edit/Create modal with all fields
- Badge colors derived from template doc type vocabulary

### 8. Global /dms Route Removal ✅

Removed the deprecated global DMS page (replaced by Knowledge Library in System Administration > Landscaper):

- **Deleted**: `src/app/dms/` directory (page.tsx + page.module.css)
- **Removed nav links**: From `constants.ts` (GLOBAL_NAV_LINKS), `Navigation.tsx` (sidebar)
- **Removed "Open Global DMS"** link from project DMS header in `DMSView.tsx`
- **Preserved**: All `src/components/dms/` components, all `/api/dms/` routes, DMS admin, project-level DMS

### 9. Document-Scoped Chat Improvement ✅

Verified and improved the document-scoped Landscaper chat:

- **Verified working**: Quick Actions (Summarize, Key Points, etc.) correctly scope to specific document via embeddings
- **Added fallback**: When no embeddings exist, falls back to `core_doc_text` raw extraction (up to 12K chars)
- **Added graceful message**: When document has no content at all, AI tells user it needs processing
- Modified: `backend/apps/knowledge/views/chat_views.py`

## Files Modified

### New Files Created:
- `migrations/20260217_align_extraction_mapping_doc_types.sql`
- `migrations/20260218_subtype_classifier_tag_bridge.sql`
- `backend/apps/documents/tag_views.py`
- `backend/apps/knowledge/services/subtype_classifier.py`

### Files Modified:
- `backend/apps/documents/models.py` — DocTag, DocTagAssignment, ProjectDocType models
- `backend/apps/documents/urls.py` — Tag CRUD routes
- `backend/apps/knowledge/models.py` — AIDocumentSubtype model
- `backend/apps/knowledge/services/__init__.py` — Exports
- `backend/apps/knowledge/services/extraction_service.py` — Subtype classifier integration
- `backend/apps/knowledge/views/chat_views.py` — Fallback text, graceful no-content message
- `backend/apps/landscaper/models.py` — applicable_tags field on ExtractionMapping
- `backend/apps/landscaper/serializers.py` — applicable_tags serialization
- `backend/apps/landscaper/tool_executor.py` — Subtype detection in ingest_document
- `backend/apps/landscaper/views.py` — document_types endpoint merges templates
- `src/components/admin/ExtractionMappingAdmin.tsx` — Full rewrite with SWR, help modal
- `src/components/admin/LandscaperAdminPanel.tsx` — Updated panel integration
- `src/components/admin/knowledge-library/KnowledgeLibraryPanel.tsx` — Inline chat, Quick Actions
- `src/components/admin/knowledge-library/DocResultCard.tsx` — document_key prop
- `src/components/dms/DMSView.tsx` — "+ Add Type" UI, Django API load, removed Global DMS link
- `src/components/dms/filters/AccordionFilters.tsx` — Delete button, custom_id/is_from_template
- `src/components/dms/filters/AccordionFilters.module.css` — Delete button hover styles
- `src/components/dms/profile/TagInput.tsx` — Full rewrite with fuzzy suggest
- `src/app/components/navigation/constants.ts` — Removed /dms from GLOBAL_NAV_LINKS
- `src/app/components/Navigation.tsx` — Removed Document Library sidebar link
- `src/app/documents/review/page.tsx` — Updated redirect from /dms to /dashboard

### Files Deleted:
- `src/app/dms/page.tsx`
- `src/app/dms/page.module.css`
- `src/components/admin/knowledge-library/KnowledgeChatPanel.tsx` (consolidated into KnowledgeLibraryPanel)

## Database Changes

### New Tables:
- `dms_doc_tags` — Tag definitions (tag_id, tag_name, workspace_id, usage_count, subtype_code)
- `dms_doc_tag_assignments` — Document-tag assignments (doc_id, tag_id)
- `dms_project_doc_types` — Project custom doc types (project_id, doc_type_name, is_from_template)
- `ai_document_subtypes` — Subtype definitions with detection patterns (13 seeded)
- `extraction_mapping_doctype_migration_log` — Audit log for doc type remapping

### Modified Tables:
- `tbl_extraction_mapping` — Added `applicable_tags JSONB DEFAULT '[]'`
- `dms_doc_tags` — Added `subtype_code VARCHAR(50)` column

## API Changes

### New Django Endpoints:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dms/tags/` | GET | List tags with optional workspace filter |
| `/api/dms/tags/` | POST | Create new tag |
| `/api/dms/tags/{id}/` | PUT/DELETE | Update/delete tag |
| `/api/dms/tags/suggest/` | GET | Fuzzy tag suggestions (trigram similarity) |
| `/api/dms/documents/{id}/tags/` | GET/POST/DELETE | Document tag assignments |
| `/api/dms/projects/{id}/doc-types/` | GET/POST/DELETE | Project custom doc types |

## Git Activity

### Commits on `feature/extraction-mapping-doctype-tags`:
- `1744020` — Checkpoint before DMS removal + doc chat scoping fix
- `a1a8f0c` — Checkpoint before Knowledge Library fixes

## Next Steps

- Run extraction on remaining unprocessed documents to populate embeddings
- Test subtype classifier with real document uploads
- Add tag filtering to Knowledge Library facets
- Consider auto-tagging on document upload based on subtype classification
- Migrate remaining Next.js API routes to Django
