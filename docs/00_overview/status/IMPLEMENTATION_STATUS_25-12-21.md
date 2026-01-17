# Landscape Implementation Status

**Version:** 7.1
**Last Updated:** 2026-01-17
**Purpose:** Comprehensive implementation status reference for AI context

---

## 🆕 Recent Updates (January 2026)

### Operations Tab & Income Approach Data Flow Fix (Jan 17, 2026) ⭐ NEW
- ✅ **Data Flow Architecture** - Fixed broken Property → Operations → Income Approach data flow
- ✅ **Operations Tab Read-Only** - Rental income now pulled from Property Tab (read-only with lock icons)
- ✅ **Vacancy Calculation** - Physical vacancy calculated from `occupancy_status` when rent roll exists
- ✅ **Current/Market Columns** - Operations Tab shows both current and market rent columns
- ✅ **NOI Basis Consolidation** - Reduced from 4 bases to 3: F-12 Current, F-12 Market, Stabilized
- ✅ **Value Tiles 3+1** - 3 Direct Cap tiles + DCF placeholder
- ✅ **3-Column P&L** - DirectCapView shows all 3 bases side-by-side with visibility toggles
- 📁 Files Modified:
  - `src/app/api/projects/[projectId]/operations/route.ts` (new data source)
  - `backend/apps/financial/views_income_approach.py` (3-basis calculation)
  - `src/components/operations/RentalIncomeSection.tsx` (read-only)
  - `src/components/operations/VacancyDeductionsSection.tsx` (conditional edit)
  - `src/components/valuation/income-approach/DirectCapView.tsx` (3-column P&L)
  - `src/components/valuation/income-approach/ValueTiles.tsx` (3+1 layout)
  - `src/types/income-approach.ts` (NOIBasis type update)
- 📖 Documentation: [2026-01-17-operations-income-approach-data-flow.md](../09_session_notes/2026-01-17-operations-income-approach-data-flow.md)
- 🎯 Status: Complete - Numbers now tie across all tabs

### Loss to Lease & Year 1 Buyer NOI Tools (Jan 2026)
- ✅ **Loss to Lease Analysis** - Compare current rents to market rents
- ✅ **Year 1 Buyer NOI** - Calculate buyer's first-year NOI with rent growth assumptions
- 📖 Documentation: See commit `4c1963f`
- 🎯 Status: Complete

---

## Previous Updates (December 2025)

### Knowledge Extraction Platform (Dec 20-21, 2025)
- ✅ **New Django App** - `apps.knowledge` with registry-based extraction, classification, and status APIs
- ✅ **Extraction Services** - Batched extractor (`extract_document_batched`), registry writer, rent-roll chunker, document processor, and field registry
- ✅ **Embeddings Pipeline** - Text extraction → chunking → OpenAI embeddings → `knowledge_embeddings` storage
- ✅ **Queueing & Processing** - `doc_processing_queue` table plus synchronous `/process/` endpoint for immediate ingestion
- ✅ **API Coverage** - Project-level extraction listings/validation, document classification, extractable-field previews, reprocess endpoints
- ✅ **Frontend Wiring** - Next.js proxy routes for extractions, pending queue, validation, apply; upload flow calls Python extraction
- 📁 Files Created:
  - `backend/apps/knowledge/*` (models, services, views, migrations 0001-0002, management commands)
  - `src/app/api/projects/[projectId]/extractions/*` (list, validate, apply, pending)
  - `src/components/landscaper/ExtractionValidation.tsx`, `src/components/landscaper/ExtractionReviewModal.tsx`
- 📁 Files Modified:
  - `backend/apps/landscaper/views.py`, `serializers.py`, `urls.py` (integrations)
  - `src/components/landscaper/LandscaperPanel.tsx` (processing + extraction pipeline)
  - `src/lib/ai/unified-extractor.ts`, `src/lib/ai/claude-extractor.ts`
- 🎯 Status: In Progress - Registry/batched extraction operational; AI responses still mocked in some flows

### Developer Operations & Capitalization (Dec 20-21, 2025) ⭐ NEW
- ✅ **Developer Ops Models/APIs** - Fees, overhead items CRUD + serializers and routes
- ✅ **Capitalization UI** - Waterfall distributions, overhead table, developer fee modal
- ✅ **Budget Hooks** - `useDeveloperOperations.ts` for fee/overhead data flows
- 📁 Files Created: `src/app/api/developer-operations/*`, `src/components/capitalization/*`
- 🎯 Status: In Progress - Data model in place, UI wired; validations & analytics next

### Project Onboarding + Readiness (Dec 20-21, 2025) ⭐ NEW
- ✅ **New Onboarding Flow** - Channel tabs, drop zone, field table, readiness display
- ✅ **Project Context UI** - Simplified channel view and model readiness component
- 📁 Files Created: `src/components/projects/onboarding/*`
- 🎯 Status: In Progress - UX live; data hooks in early use

### Market Intelligence Enhancements (Dec 20-21, 2025) ⭐ NEW
- ✅ **Competitor APIs/UI** - CRUD, exclusions, nearby search, pricing by lot width, sync radius
- ✅ **Market Components** - Competitive projects panel, add competitor modal, GIS map updates
- 📁 Files Created: `src/app/api/projects/[projectId]/market/competitors/*`, `src/components/market/*`, `src/components/map/PropertyTabMapWithComps.tsx`
- 🎯 Status: In Progress - Data plumbing complete; scoring/insights next

### Landscaper Phase 3 - Real Data & AI Wiring (Dec 19, 2025) ⭐ NEW
- ✅ **Chat API Connection** - Next.js proxy routes to Django `/api/projects/{id}/landscaper/chat/`
- ✅ **Request/Response Transform** - Frontend `{ message }` ↔ Django `{ content }` format conversion
- ✅ **Activity Feed Model** - New `ActivityItem` Django model with status, confidence, highlights
- ✅ **Activity Feed ViewSet** - GET/POST activities, mark_read, mark_all_read actions
- ✅ **Frontend Hooks** - `useActivityFeed.ts` with React Query, optimistic updates, 60s auto-refresh
- ✅ **Field Highlighting** - `useFieldHighlight.tsx` hook reads `?highlight=` params, auto-clears after 5s
- ✅ **Context-Aware Prompts** - System prompts by property type (land, multifamily, office, retail, industrial)
- ✅ **Database Migration** - Created `landscape.landscaper_activity` table with indexes
- 📁 Files Created:
  - `src/app/api/projects/[projectId]/landscaper/chat/route.ts`
  - `src/app/api/projects/[projectId]/landscaper/activities/route.ts`
  - `src/hooks/useActivityFeed.ts`
  - `src/hooks/useFieldHighlight.tsx`
  - `migrations/037_add_landscaper_activity.sql`
- 📁 Files Modified:
  - `backend/apps/landscaper/models.py` - Added ActivityItem
  - `backend/apps/landscaper/serializers.py` - Added activity serializers
  - `backend/apps/landscaper/views.py` - Added ActivityFeedViewSet
  - `backend/apps/landscaper/urls.py` - Added activity endpoints
  - `backend/apps/landscaper/ai_handler.py` - Context-aware system prompts
  - `src/components/landscaper/ActivityFeed.tsx` - Real data with mock fallback
  - `src/components/landscaper/ActivityFeedItem.tsx` - Updated types
- 📖 Documentation: [2025-12-19-landscaper-phase3-wiring.md](../09_session_notes/2025-12-19-landscaper-phase3-wiring.md)
- 🎯 Status: Complete - Landscaper data pipeline operational

### Landscaper Phase 1 & 2 - Panel Integration (Dec 18, 2025)
- ✅ **30/70 Split Layout** - Landscaper panel in right column, project content in left
- ✅ **Chat Component** - `LandscaperChat.tsx` with message history, auto-scroll
- ✅ **Activity Feed UI** - `ActivityFeed.tsx` with expandable items, status indicators
- ✅ **Tile Navigation Restructure** - 7 static tiles, contextual labels (Development/Operations)
- ✅ **Two-line Labels** - Feasibility/Valuation tile with separator
- ✅ **Property Tile Rename** - Planning → Property
- 📁 Files Created: `src/components/landscaper/` (LandscaperPanel, LandscaperChat, ActivityFeed, ActivityFeedItem, ChatMessageBubble)
- 📁 Files Modified: `src/components/projects/tiles/tileConfig.ts`, `src/components/projects/LifecycleTileNav.tsx`
- 🎯 Status: Complete - UI layout and navigation in place

### Zonda Subdivision Ingestion Tool (Dec 3, 2025)
- ✅ **Python Parser** - Excel parser with product code parsing (45x115 → width=45, depth=115)
- ✅ **Dataclass Schema** - `ZondaSubdivision` with lot dimensions, pricing, inventory, location
- ✅ **Database Migration** - Created `landscape.zonda_subdivisions` table with indexes
- ✅ **CLI Tool** - `run_zonda_ingest.py` with `--dry-run`, `--persist`, `--output json|summary`
- ✅ **Tested & Working** - Imported 704 records from Phoenix Nov 2025 data
- 📁 Files: `backend/tools/zonda_ingest/`, `migrations/029_create_zonda_subdivisions.sql`
- 🎯 Status: Complete

### HBACA Market Activity Ingestion Tool (Dec 3, 2025)
- ✅ **Python Parser** - Excel parser with month-name detection, jurisdiction mapping
- ✅ **Bulk Upsert** - ON CONFLICT handling for idempotent imports
- ✅ **CLI Tool** - `run_hbaca_ingest.py` with `--dry-run`, `--persist`
- ✅ **Tested & Working** - Imported 9,392 permit records covering Phoenix MSA
- 📁 Files: `backend/tools/hbaca_ingest/`, `migrations/028_create_market_activity.sql`
- 🎯 Status: Complete

---

## Feature Status Overview

### Core Platform
| Feature | Status | Notes |
|---------|--------|-------|
| Project Management | ✅ Complete | CRUD, search, filtering |
| Container Hierarchy | ✅ Complete | Universal tree structure |
| Document Management | ✅ Complete | Upload, categorize, preview |
| User Authentication | ✅ Complete | Username-based login |
| Admin Panel | ✅ Complete | User management, system config |

### Financial Engine
| Feature | Status | Notes |
|---------|--------|-------|
| Budget Grid | ✅ Complete | 3-level categories, real-time calc |
| Cash Flow | ✅ Complete | Monthly projections |
| IRR/NPV/DSCR | ✅ Complete | Python financial engine |
| Waterfall | ✅ Complete | Multi-tier promote structure |
| Variance Analysis | ✅ Complete | Budget vs Actual |

### Market Intelligence
| Feature | Status | Notes |
|---------|--------|-------|
| Zonda Integration | ✅ Complete | Supply-side market data |
| HBACA Integration | ✅ Complete | Permit activity pipeline |
| Redfin Comps | ✅ Complete | Housing comparables |
| Market Map | ✅ Complete | GIS visualization |

### AI Features
| Feature | Status | Notes |
|---------|--------|-------|
| Landscaper Panel | ✅ Complete | Chat + Activity Feed UI |
| Chat API | ✅ Complete | Django backend wired |
| Activity Feed | ✅ Complete | Real data infrastructure |
| Context Prompts | ✅ Complete | Property-type aware |
| Document Extraction | 🔄 In Progress | Registry-based, batched extraction + validation UI (Claude mock in some flows) |
| Real AI Responses | 📋 Planned | Claude API integration |

### Document Extraction
| Feature | Status | Notes |
|---------|--------|-------|
| Rent Roll | 🔄 In Progress | Chunked extraction (Python + Claude) |
| T12/Operating | 🔄 In Progress | Registry field coverage expanding |
| Parcel Table | ✅ Complete | Land dev specific |
| Field Registry | ✅ Complete | 150+ fields defined; registry served via API |

---

## Database Schema

### Recent Additions
- `landscape.developer_fee`, `landscape.overhead_item` (via Django dev-ops models/serializers)
- `landscape.knowledge_entities`, `knowledge_facts`, `knowledge_embeddings`, `knowledge_sessions`, `knowledge_interactions`, `knowledge_insights` - Knowledge graph + embeddings
- `landscape.doc_processing_queue` - Document ingestion queue
- `landscape.landscaper_activity` - Activity feed items (Dec 19)
- `landscape.zonda_subdivisions` - Zonda market data (Dec 3)
- `landscape.market_activity` - HBACA permit data (Dec 3)
- `landscape.bmk_resale_closings` - Redfin comps (Dec 2)

### Core Tables
- `tbl_project` - Project master
- `tbl_container` - Universal hierarchy
- `core_fin_fact_budget` - Budget items
- `core_fin_fact_actual` - Actual costs
- `core_doc` - Document storage
- `landscaper_chat_message` - Chat history
- `landscaper_advice` - AI suggestions

---

## API Endpoints

### Knowledge / Extraction (NEW)
```
POST    /api/knowledge/projects/{project_id}/extract/
POST    /api/knowledge/projects/{project_id}/extract-all/
GET     /api/knowledge/projects/{project_id}/extractions/
GET     /api/knowledge/projects/{project_id}/extractions/pending/
POST    /api/knowledge/projects/{project_id}/extractions/{id}/validate/
POST    /api/knowledge/projects/{project_id}/extractions/{id}/validate-v2/
POST    /api/knowledge/projects/{project_id}/extractions/bulk-validate/
POST    /api/knowledge/documents/{doc_id}/extract-batched/
POST    /api/knowledge/documents/{doc_id}/extract-rent-roll/
GET     /api/knowledge/documents/{doc_id}/status/
POST    /api/knowledge/documents/{doc_id}/process/
GET     /api/knowledge/documents/{doc_id}/classify/
GET     /api/knowledge/field-registry/
```

### Developer Operations (NEW)
```
GET/POST /api/developer-operations/fees/
GET/PUT  /api/developer-operations/fees/{id}/
GET/POST /api/developer-operations/overhead/
GET/PUT  /api/developer-operations/overhead/{id}/
```

### Projects / Market Competitors (NEW)
```
GET/POST /api/projects/{projectId}/market/competitors/
GET/PUT  /api/projects/{projectId}/market/competitors/{competitorId}/
POST     /api/projects/{projectId}/market/competitors/exclusions/
GET      /api/projects/{projectId}/market/competitors/nearby/
GET      /api/projects/{projectId}/market/competitors/pricing-by-lot-width/
POST     /api/projects/{projectId}/market/competitors/sync-radius/
```

### Landscaper (NEW)
```
GET/POST /api/projects/{id}/landscaper/chat/        - Chat history & send
GET/POST /api/projects/{id}/landscaper/activities/  - Activity feed
POST     /api/projects/{id}/landscaper/activities/{id}/mark-read/
POST     /api/projects/{id}/landscaper/activities/mark-all-read/
GET      /api/projects/{id}/landscaper/variances/   - Variance analysis
```

### Financial
```
GET/POST /api/budget-items/by_project/{id}/
GET      /api/budget-items/rollup/{id}/
GET      /api/actual-items/variance/{id}/
POST     /api/calculations/irr/
POST     /api/calculations/npv/
POST     /api/calculations/dscr/
```

### Projects
```
GET/POST /api/projects/
GET/PUT/DELETE /api/projects/{id}/
GET      /api/projects/{id}/containers/
GET      /api/projects/{id}/validation-report/
```

---

## Next Development Priorities

### Immediate (Phase 4)
1. **Document Extraction → Activity Generation** - Create activities when extraction completes
2. **Field Highlighting Integration** - Use highlight params in budget grid, rent roll

### Near-term (Phase 5-6)
1. **Claude API Integration** - Real AI responses instead of stubs
2. **Budget Change Activities** - Generate activities on significant changes
3. **Market Data Activities** - Notify when new market data available

### Medium-term
1. **Activity Filtering** - Filter by type, status, date
2. **Activity Search** - Search within activity content
3. **Notification System** - Email/push for high-priority activities

---

## File Counts

| Directory | Files | Description |
|-----------|-------|-------------|
| `src/app/api/` | 395 | API routes (Next.js) |
| `src/components/` | 270 | React components |
| `backend/apps/` | 519 | Django applications/files |
| `migrations/` | 95 | Database migrations (SQL + Django) |
| `docs/` | 853 | Documentation |

---

*Last updated: 2025-12-21 by documentation update workflow*
