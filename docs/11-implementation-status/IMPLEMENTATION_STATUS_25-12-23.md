# Landscape Implementation Status

**Version:** 7.1
**Last Updated:** 2025-12-23
**Purpose:** Comprehensive implementation status reference for AI context

---

## 🆕 Recent Updates (December 23, 2025)

### Git Consolidation & Branch Merge (Dec 23, 2025) ⭐ NEW
- ✅ **Feature Branch Merged** - `feature/landscaper-panel-restructure` → `work` (25 commits)
- ✅ **299 Files Consolidated** - Knowledge extraction, Landscaper, Market Intel, Developer Ops, Onboarding
- ✅ **Migrations Applied** - `knowledge.0002_doc_processing_queue` verified
- ✅ **Backup Created** - `backup-landscaper-panel-20251223` for safety
- 🎯 Status: Complete - Clean working tree on `work` branch

### BUG-001 Fixed: Multifamily Lease Query (Dec 23, 2025) ⭐ NEW
- ✅ **Bug Fixed** - "Expiring soon" query was comparing field to itself (always true)
- ✅ **Correct Filter** - Now uses 90-day window: `date.today()` to `date.today() + timedelta(days=90)`
- 📁 File Modified: `backend/apps/multifamily/views.py:161-165`
- 📖 Commit: `89da8d3`
- 🎯 Status: Complete - Pushed to origin/work

### Extraction History Approval Workflow (Dec 23, 2025) ⭐ NEW
- ✅ **Backend API** - 3 new Django endpoints for extraction status management
  - `PATCH .../extractions/{id}/status/` - Single extraction status update
  - `POST .../extractions/bulk-status/` - Bulk update multiple extractions
  - `POST .../extractions/approve-high-confidence/` - One-click approve all ≥90% confidence
- ✅ **Frontend UI** - Complete approval workflow in ExtractionHistoryReport
  - Row selection checkboxes for bulk operations
  - Status filter buttons (All/Pending/Accepted/Applied/Rejected)
  - Confidence-based action buttons (Approve for ≥90%, Accept for <90%)
  - Bulk actions toolbar (Accept/Reject Selected)
  - Row styling by status (green for applied, gray for rejected)
- ✅ **Database Writes** - ExtractionWriter integration for "applied" status
- 📁 Files Modified:
  - `backend/apps/knowledge/views/extraction_views.py` (+450 lines)
  - `backend/apps/knowledge/urls.py` (3 routes)
  - `src/hooks/useExtractionHistory.ts` (API wrappers)
  - `src/components/reports/ExtractionHistoryReport.tsx` (complete rewrite)
- 🎯 Status: Complete - Branch: work

### Lynn Villa Multi-Scenario OpEx Parser Proof (Dec 23, 2025) ⭐ NEW
- ✅ **Scenario-Aware Parsing** - Extracted T3 Annualized, Current Rent Roll Pro Forma, and Post-Reno Market Rent Pro Forma columns from Lynn Villa OM (page 26)
- ✅ **Artifacts** - Normalized outputs saved to `docs/opex/lynn_villa_scenarios_parsed.json` and `.csv`; proof note at `docs/opex/Project42_MultiScenario_ParserProof.md`; screenshot captured
- 🎯 Status: Read-only parser validated; ready to wire persistence/active discriminator in next phase

---

## Recent Updates (December 3 - December 21, 2025)

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

### Developer Operations & Capitalization (Dec 20-21, 2025)
- ✅ **Developer Ops Models/APIs** - Fees, overhead items CRUD + serializers and routes
- ✅ **Capitalization UI** - Waterfall distributions, overhead table, developer fee modal
- ✅ **Budget Hooks** - `useDeveloperOperations.ts` for fee/overhead data flows
- 📁 Files Created: `src/app/api/developer-operations/*`, `src/components/capitalization/*`
- 🎯 Status: In Progress - Data model in place, UI wired; validations & analytics next

### Project Onboarding + Readiness (Dec 20-21, 2025)
- ✅ **New Onboarding Flow** - Channel tabs, drop zone, field table, readiness display
- ✅ **Project Context UI** - Simplified channel view and model readiness component
- 📁 Files Created: `src/components/projects/onboarding/*`
- 🎯 Status: In Progress - UX live; data hooks in early use

### Market Intelligence Enhancements (Dec 20-21, 2025)
- ✅ **Competitor APIs/UI** - CRUD, exclusions, nearby search, pricing by lot width, sync radius
- ✅ **Market Components** - Competitive projects panel, add competitor modal, GIS map updates
- 📁 Files Created: `src/app/api/projects/[projectId]/market/competitors/*`, `src/components/market/*`, `src/components/map/PropertyTabMapWithComps.tsx`
- 🎯 Status: In Progress - Data plumbing complete; scoring/insights next

### Landscaper Phase 3 - Real Data & AI Wiring (Dec 19, 2025)
- ✅ **Chat API Connection** - Next.js proxy routes to Django `/api/projects/{id}/landscaper/chat/`
- ✅ **Request/Response Transform** - Frontend `{ message }` ↔ Django `{ content }` format conversion
- ✅ **Activity Feed Model** - New `ActivityItem` Django model with status, confidence, highlights
- ✅ **Activity Feed ViewSet** - GET/POST activities, mark_read, mark_all_read actions
- ✅ **Frontend Hooks** - `useActivityFeed.ts` with React Query, optimistic updates, 60s auto-refresh
- ✅ **Field Highlighting** - `useFieldHighlight.tsx` hook reads `?highlight=` params, auto-clears after 5s
- ✅ **Context-Aware Prompts** - System prompts by property type (land, multifamily, office, retail, industrial)
- ✅ **Database Migration** - Created `landscape.landscaper_activity` table with indexes
- 📖 Documentation: [2025-12-19-landscaper-phase3-wiring.md](../session-notes/2025-12-19-landscaper-phase3-wiring.md)
- 🎯 Status: Complete - Landscaper data pipeline operational

### Landscaper Phase 1 & 2 - Panel Integration (Dec 18, 2025)
- ✅ **30/70 Split Layout** - Landscaper panel in right column, project content in left
- ✅ **Chat Component** - `LandscaperChat.tsx` with message history, auto-scroll
- ✅ **Activity Feed UI** - `ActivityFeed.tsx` with expandable items, status indicators
- ✅ **Tile Navigation Restructure** - 7 static tiles, contextual labels (Development/Operations)
- 🎯 Status: Complete - UI layout and navigation in place

### Zonda Subdivision Ingestion Tool (Dec 3, 2025)
- ✅ **Python Parser** - Excel parser with product code parsing (45x115 → width=45, depth=115)
- ✅ **Tested & Working** - Imported 704 records from Phoenix Nov 2025 data
- 🎯 Status: Complete

### HBACA Market Activity Ingestion Tool (Dec 3, 2025)
- ✅ **Python Parser** - Excel parser with month-name detection, jurisdiction mapping
- ✅ **Tested & Working** - Imported 9,392 permit records covering Phoenix MSA
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
| Document Extraction | 🔄 In Progress | Registry-based, batched extraction + validation UI |
| Extraction Approval Workflow | ✅ Complete | Confidence-based approve/accept/apply/reject (Dec 23) |
| Real AI Responses | 📋 Planned | Claude API integration (partial) |

### Multifamily
| Feature | Status | Notes |
|---------|--------|-------|
| Lease Summary | ✅ Complete | BUG-001 fixed (Dec 23) - correct expiring soon count |
| Rent Roll Extraction | 🔄 In Progress | Chunked extraction working |
| Unit Management | ✅ Complete | CRUD with floorplan sync |

### Document Extraction
| Feature | Status | Notes |
|---------|--------|-------|
| Rent Roll | 🔄 In Progress | Chunked extraction (Python + Claude) |
| T12/Operating | 🔄 In Progress | Registry field coverage expanding |
| Parcel Table | ✅ Complete | Land dev specific |
| Field Registry | ✅ Complete | 150+ fields defined; registry served via API |

---

## Bug Fixes (December 2025)

| Bug ID | Description | Status | Commit |
|--------|-------------|--------|--------|
| BUG-001 | Multifamily expiring_soon query self-comparison | ✅ Fixed | `89da8d3` |
| BUG-002 | Extraction commit endpoint incomplete | 🔄 Blocked | Design needed |

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

### Knowledge / Extraction
```
POST    /api/knowledge/projects/{project_id}/extract/
POST    /api/knowledge/projects/{project_id}/extract-all/
GET     /api/knowledge/projects/{project_id}/extractions/
GET     /api/knowledge/projects/{project_id}/extractions/pending/
POST    /api/knowledge/projects/{project_id}/extractions/{id}/validate/
POST    /api/knowledge/projects/{project_id}/extractions/{id}/validate-v2/
POST    /api/knowledge/projects/{project_id}/extractions/bulk-validate/
PATCH   /api/knowledge/projects/{project_id}/extractions/{id}/status/      # NEW - Single status update
POST    /api/knowledge/projects/{project_id}/extractions/bulk-status/      # NEW - Bulk status update
POST    /api/knowledge/projects/{project_id}/extractions/approve-high-confidence/  # NEW - Approve ≥90%
GET     /api/knowledge/projects/{project_id}/extraction-history/           # Extraction history report
GET     /api/knowledge/projects/{project_id}/extraction-history/{field}/   # Field version history
POST    /api/knowledge/documents/{doc_id}/extract-batched/
POST    /api/knowledge/documents/{doc_id}/extract-rent-roll/
GET     /api/knowledge/documents/{doc_id}/status/
POST    /api/knowledge/documents/{doc_id}/process/
GET     /api/knowledge/documents/{doc_id}/classify/
GET     /api/knowledge/field-registry/
```

### Developer Operations
```
GET/POST /api/developer-operations/fees/
GET/PUT  /api/developer-operations/fees/{id}/
GET/POST /api/developer-operations/overhead/
GET/PUT  /api/developer-operations/overhead/{id}/
```

### Projects / Market Competitors
```
GET/POST /api/projects/{projectId}/market/competitors/
GET/PUT  /api/projects/{projectId}/market/competitors/{competitorId}/
POST     /api/projects/{projectId}/market/competitors/exclusions/
GET      /api/projects/{projectId}/market/competitors/nearby/
GET      /api/projects/{projectId}/market/competitors/pricing-by-lot-width/
POST     /api/projects/{projectId}/market/competitors/sync-radius/
```

### Landscaper
```
GET/POST /api/projects/{id}/landscaper/chat/        - Chat history & send
GET/POST /api/projects/{id}/landscaper/activities/  - Activity feed
POST     /api/projects/{id}/landscaper/activities/{id}/mark-read/
POST     /api/projects/{id}/landscaper/activities/mark-all-read/
GET      /api/projects/{id}/landscaper/variances/   - Variance analysis
```

### Multifamily
```
GET      /api/multifamily/leases/by_project/{id}/   - Leases with expiring_soon (FIXED)
GET      /api/multifamily/leases/expirations/{id}/  - Configurable expiration window
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

### Immediate
1. **BUG-002: Extraction Commit Endpoint** - Needs design clarification for table mapping
2. **FEAT-001: Claude API Full Integration** - Remove remaining mocked responses

### Near-term (Phase 4-6)
1. **Document Extraction → Activity Generation** - Create activities when extraction completes
2. **Field Highlighting Integration** - Use highlight params in budget grid, rent roll
3. **Budget Change Activities** - Generate activities on significant changes

### Medium-term
1. **FEAT-003: Rent Roll Bulk Validation** - Writer to `tbl_mf_unit`
2. **Activity Filtering** - Filter by type, status, date
3. **Notification System** - Email/push for high-priority activities

---

## File Counts

| Directory | Files | Description |
|-----------|-------|-------------|
| `src/app/api/` | 395 | API routes (Next.js) |
| `src/components/` | 270 | React components |
| `backend/apps/` | 519 | Django applications/files |
| `migrations/` | 95 | Database migrations (SQL + Django) |
| `docs/` | 855 | Documentation |

---

*Last updated: 2025-12-23 by documentation update workflow*
