# Knowledge Library — Landscaper Admin Panel Integration

**Date**: February 13, 2026
**Duration**: ~4 hours
**Focus**: Adding Knowledge Library as an accordion section in the Landscaper admin panel with faceted search, progressive fallback, and document management

---

## Summary

Added a comprehensive Knowledge Library panel to the Landscaper admin section inside AdminModal. This replaces the global /dms page as the primary interface for searching, browsing, and managing Landscaper's document knowledge base. Features cascading faceted filters (5 dimensions), Landscaper-powered chat interface scoped to filtered document sets, document preview via DocumentChatModal, batch download, and drag-and-drop upload.

## Major Accomplishments

### 1. Database — doc_geo_tag Table ✅
Created independent geographic tagging for documents:
- New table `landscape.doc_geo_tag` with `doc_id`, `geo_level` (country/region/state/msa/county/city), `geo_value`, `geo_source` (inferred/ai_extracted/user_assigned)
- Unique constraint on (doc_id, geo_level, geo_value)
- Two indexes: doc_id lookup and (geo_level, geo_value) composite
- Django model `DocGeoTag` added to `apps/knowledge/models.py` (managed=False)

### 2. Django Backend — Knowledge Library API ✅
Four new endpoints added to the knowledge app:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/knowledge/library/facets/` | GET | Cascading faceted filter counts with AND/OR logic |
| `/api/knowledge/library/search/` | POST | Document search with progressive fallback (levels 0-5) |
| `/api/knowledge/library/batch-download/` | POST | ZIP download of selected documents |
| `/api/knowledge/library/upload/` | POST | Multi-file upload with auto-classification stub |

**Progressive Search Fallback Logic:**
- Level 0: All active filters
- Level 1: Drop geography filters
- Level 2: Drop format filter
- Level 3: Drop document type filter
- Level 4: Drop property type filter
- Level 5: Full library scan (no filters)

### 3. Geo-Tag Backfill Command ✅
Created `python manage.py backfill_geo_tags`:
- Copies project state/city/county into doc_geo_tag for all project-associated documents
- Idempotent (uses ON CONFLICT DO NOTHING)
- Supports `--dry-run` flag
- Sets geo_source = 'inferred' for project-inherited tags

### 4. Frontend — Knowledge Library Components ✅
Seven new components in `src/components/admin/knowledge-library/`:

| Component | Purpose |
|-----------|---------|
| `KnowledgeLibraryPanel.tsx` | Main orchestrator — manages state for filters, facets, chat, selection, preview |
| `SourceToggle.tsx` | Three-button toggle: All / My Documents / Platform Knowledge |
| `FilterColumns.tsx` | 5-column cascading faceted filters (Geography, Property Type, Format, Doc Type, Project) |
| `CounterBar.tsx` | Scope count display + batch download + clear filters |
| `KnowledgeChatPanel.tsx` | Landscaper chat scoped to active filters with progressive search feedback |
| `DocResultCard.tsx` | Document result cards with checkbox, icon, metadata, preview button |
| `UploadDropZone.tsx` | Drag-and-drop upload area |
| `knowledge-library.css` | All styles using CoreUI CSS variables only |

### 5. LandscaperAdminPanel Integration ✅
- Knowledge Library added as accordion section #2 (between Extraction Mappings and Model Configuration)
- Dynamically imported with `ssr: false`
- Uses `BookOpen` icon from lucide-react
- Follows exact same accordion expand/collapse pattern as Extraction Mappings

## Files Modified

### New Files Created:
- `migrations/20260213_create_doc_geo_tag.sql`
- `backend/apps/knowledge/services/knowledge_library_service.py`
- `backend/apps/knowledge/views/knowledge_library_views.py`
- `backend/apps/knowledge/management/commands/backfill_geo_tags.py`
- `src/components/admin/knowledge-library/KnowledgeLibraryPanel.tsx`
- `src/components/admin/knowledge-library/SourceToggle.tsx`
- `src/components/admin/knowledge-library/FilterColumns.tsx`
- `src/components/admin/knowledge-library/CounterBar.tsx`
- `src/components/admin/knowledge-library/KnowledgeChatPanel.tsx`
- `src/components/admin/knowledge-library/DocResultCard.tsx`
- `src/components/admin/knowledge-library/UploadDropZone.tsx`
- `src/components/admin/knowledge-library/knowledge-library.css`

### Files Modified:
- `backend/apps/knowledge/models.py` — Added DocGeoTag model
- `backend/apps/knowledge/urls.py` — Added 4 Knowledge Library URL patterns
- `src/components/admin/LandscaperAdminPanel.tsx` — Added Knowledge Library section

## Styling
- ALL styling uses CoreUI CSS variables (`var(--cui-body-bg)`, `var(--cui-border-color)`, etc.)
- Zero Tailwind utility classes in new files
- Dark and light mode compatible

## Verification
- `npm run build` passes with no TypeScript errors
- `grep` confirms zero Tailwind classes in knowledge-library directory
- All expected files exist in correct locations

## Next Steps
- Run migration on database: `psql -f migrations/20260213_create_doc_geo_tag.sql`
- Backfill existing documents: `python manage.py backfill_geo_tags`
- Implement AI auto-classification on upload (currently returns stub)
- Add real R2 file download in batch-download endpoint
- Remove global /dms route once Knowledge Library is validated
