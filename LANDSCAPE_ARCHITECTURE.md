# Landscape Platform Architecture

> **Purpose:** Comprehensive technical map of the Landscape codebase for developers and AI assistants.
> **Generated:** 2026-01-22
> **Database:** Neon PostgreSQL (`land_v2` database, `landscape` schema, 253 tables)

---

## Section 1: Repository Structure

Landscape is a **monorepo** containing a Next.js frontend and Django backend in a single repository.

```
landscape/
├── src/                          # Next.js 15.5 Frontend (React 18, TypeScript)
│   ├── app/                      # App Router (pages + API routes)
│   ├── components/               # React components by domain
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities, DB connection, services
│   ├── contexts/                 # React context providers
│   ├── types/                    # TypeScript type definitions
│   └── styles/                   # CSS, Tailwind, design tokens
│
├── backend/                      # Django 5.0 REST API
│   ├── apps/                     # Django applications (18 apps)
│   ├── config/                   # Django settings, URLs
│   ├── services/                 # Shared Python services
│   └── tools/                    # CLI utilities
│
├── services/                     # Python microservices
│   ├── financial_engine_py/      # numpy-financial IRR/NPV/DCF calculations
│   └── market_ingest_py/         # Market data ingestion pipelines
│
├── migrations/                   # SQL migrations (75 files)
├── scripts/                      # Node.js/Bash utilities (82 files)
├── docs/                         # Documentation (numbered 00-14)
├── tests/                        # Playwright E2E tests
└── .claude/                      # Claude Code configuration
    ├── commands/                 # Slash commands
    └── plans/                    # Session plans
```

### Key Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies, npm scripts |
| `next.config.ts` | Next.js configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `tsconfig.json` | TypeScript configuration |
| `backend/config/settings.py` | Django settings |
| `backend/requirements.txt` | Python dependencies |
| `.env.local` | Environment variables (frontend) |
| `backend/.env` | Environment variables (backend) |

---

## Section 2: Frontend Architecture (Next.js)

### 2.1 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # 367 API routes (legacy, migrating to Django)
│   ├── projects/[projectId]/     # Project detail pages
│   ├── dashboard/                # Main dashboard
│   ├── dms/                      # Document Management System
│   ├── admin/                    # Admin pages
│   ├── settings/                 # User settings
│   ├── components/               # Page-level components
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Home page
│
├── components/                   # Reusable components by domain
│   ├── landscaper/               # AI chat components (18 files)
│   ├── budget/                   # Budget grid components (41 files)
│   ├── dms/                      # Document management (16 subdirs)
│   ├── map/                      # GIS/mapping components
│   ├── studio/                   # Studio mode components
│   ├── operations/               # Operating expense components
│   ├── sales/                    # Sales absorption components
│   ├── napkin/                   # Quick analysis mode
│   └── ui/                       # Base primitives (shadcn-style)
│
├── hooks/                        # Custom hooks (38 files)
├── lib/                          # Utilities (41 files)
├── contexts/                     # React contexts (4 files)
├── types/                        # TypeScript definitions (24 files)
└── styles/                       # CSS files (19 files)
```

### 2.2 Key Pages by Domain

**Core Navigation**
| Page | Path | File |
|------|------|------|
| Dashboard | `/dashboard` | `src/app/dashboard/page.tsx` |
| Document Management | `/dms` | `src/app/dms/page.tsx` |
| Project List | `/projects` | `src/app/projects/page.tsx` |

**Project Detail Pages** (`/projects/[projectId]/...`)
| Page | Path Suffix | File |
|------|-------------|------|
| Project Overview | `/` | `src/app/projects/[projectId]/page.tsx` |
| Studio Mode | `/studio` | `src/app/projects/[projectId]/studio/` |
| Budget | `/budget` | `src/app/projects/[projectId]/budget/` |
| Valuation | `/valuation` | `src/app/projects/[projectId]/valuation/` |
| Documents | `/documents` | `src/app/projects/[projectId]/documents/` |
| Analysis | `/analysis` | `src/app/projects/[projectId]/analysis/` |
| Capitalization | `/capitalization` | `src/app/projects/[projectId]/capitalization/` |
| Planning | `/planning` | `src/app/projects/[projectId]/planning/` |
| Napkin Mode | `/napkin` | `src/app/projects/[projectId]/napkin/` |

**Admin Pages**
| Page | Path | File |
|------|------|------|
| Benchmarks | `/admin/benchmarks` | `src/app/admin/` |
| DMS Templates | `/admin/dms/templates` | `src/app/admin/dms/` |
| Settings | `/settings` | `src/app/settings/` |

### 2.3 Key Components by Domain

**AI/Landscaper Chat**
| Component | Path | Purpose |
|-----------|------|---------|
| `LandscaperPanel` | `src/components/landscaper/LandscaperPanel.tsx` | Main chat panel (28KB) |
| `ChatInterface` | `src/components/landscaper/ChatInterface.tsx` | Message interface |
| `ChatMessageBubble` | `src/components/landscaper/ChatMessageBubble.tsx` | Message rendering |
| `ExtractionReviewModal` | `src/components/landscaper/ExtractionReviewModal.tsx` | Document extraction review |
| `MutationProposalCard` | `src/components/landscaper/MutationProposalCard.tsx` | AI mutation proposals (Level 2 autonomy) |

**Budget & Financial**
| Component | Path | Purpose |
|-----------|------|---------|
| `BudgetGridTab` | `src/components/budget/BudgetGridTab.tsx` | Main budget grid (22KB) |
| `BudgetDataGrid` | `src/components/budget/BudgetDataGrid.tsx` | Data grid with TanStack Table |
| `GanttChart` | `src/components/budget/GanttChart.tsx` | Timeline visualization |
| `BudgetItemModal` | `src/components/budget/BudgetItemModal.tsx` | Line item editor |

**Document Management**
| Component | Path | Purpose |
|-----------|------|---------|
| `DMSView` | `src/components/dms/DMSView.tsx` | Main DMS view (26KB) |
| `DocumentChatModal` | `src/components/dms/modals/DocumentChatModal.tsx` | Chat with document |
| `DmsLandscaperPanel` | `src/components/dms/panels/DmsLandscaperPanel.tsx` | DMS chat panel |

**Maps & GIS**
| Component | Path | Purpose |
|-----------|------|---------|
| `ProjectTabMap` | `src/components/map/ProjectTabMap.tsx` | Project location map |
| `MapOblique` | `src/components/map/MapOblique.tsx` | Oblique imagery view |
| `ValuationSalesCompMap` | `src/components/map/ValuationSalesCompMap.tsx` | Sales comparables map |

**Studio Mode (New)**
| Component | Path | Purpose |
|-----------|------|---------|
| `TileGrid` | `src/components/studio/TileGrid.tsx` | Tile-based navigation |
| `LandscaperPanel` | `src/components/studio/LandscaperPanel.tsx` | Studio chat panel |
| `ViewModeToggle` | `src/components/studio/ViewModeToggle.tsx` | Mode switcher |

**UI Primitives**
| Component | Path | Purpose |
|-----------|------|---------|
| `button` | `src/components/ui/button.tsx` | Button component |
| `dialog` | `src/components/ui/dialog.tsx` | Modal dialog (Radix) |
| `select` | `src/components/ui/select.tsx` | Select dropdown |
| `tabs` | `src/components/ui/tabs.tsx` | Tab navigation |
| `toast` | `src/components/ui/toast.tsx` | Toast notifications |

### 2.4 State Management

**React Contexts** (`src/contexts/`)
| Context | File | Purpose |
|---------|------|---------|
| `AuthContext` | `AuthContext.tsx` | User authentication state |
| `ComplexityModeContext` | `ComplexityModeContext.tsx` | Napkin/Standard/Detail mode |
| `ProjectModeContext` | `ProjectModeContext.tsx` | Current project context |
| `ScenarioContext` | `ScenarioContext.tsx` | Scenario comparison state |

**Data Fetching**
- **React Query** (`@tanstack/react-query`) - Primary data fetching
- **SWR** - Legacy, being phased out
- Custom hooks wrap API calls with caching/revalidation

### 2.5 API Communication

**Database Connection** (`src/lib/db.ts`)
```typescript
import { neon } from '@neondatabase/serverless';
export const sql = neon(process.env.DATABASE_URL);
// Used for raw SQL in Next.js API routes (legacy pattern)
```

**Django API Calls**
```typescript
// Frontend calls Django via NEXT_PUBLIC_DJANGO_API_URL
const response = await fetch(`${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/projects/`);
```

**Key API Hooks** (`src/hooks/`)
| Hook | File | Purpose |
|------|------|---------|
| `useLandscaper` | `useLandscaper.ts` | AI chat state & API |
| `useBudgetCategories` | `useBudgetCategories.ts` | Budget category tree |
| `useContainers` | `useContainers.ts` | Container hierarchy |
| `useOperationsData` | `useOperationsData.ts` | Operating expenses |
| `useSalesAbsorption` | `useSalesAbsorption.ts` | Sales/absorption data |
| `useIncomeApproach` | `useIncomeApproach.ts` | Income approach valuation |

---

## Section 3: Backend Architecture (Django)

### 3.1 Directory Structure

```
backend/
├── config/                       # Django project configuration
│   ├── settings.py               # Main settings
│   ├── urls.py                   # Root URL routing
│   └── wsgi.py                   # WSGI entry point
│
├── apps/                         # Django applications (18 apps)
│   ├── projects/                 # Project CRUD, auth
│   ├── containers/               # Universal container hierarchy
│   ├── financial/                # Budget, actuals, valuation
│   ├── landscaper/               # AI chat handler (main AI logic)
│   ├── knowledge/                # RAG, embeddings, extraction
│   ├── documents/                # Document management
│   ├── calculations/             # Financial calculation wrapper
│   ├── benchmarks/               # Benchmark data
│   ├── sales_absorption/         # Sales tracking
│   ├── multifamily/              # Multifamily-specific
│   ├── commercial/               # Commercial property
│   ├── landuse/                  # Land use taxonomy
│   ├── gis/                      # Geographic data
│   ├── market_intel/             # Market intelligence
│   ├── reports/                  # Report generation
│   ├── users/                    # User settings
│   ├── acquisition/              # Acquisition tracking
│   └── contacts/                 # Contact management
│
├── services/                     # Shared services
└── tools/                        # CLI utilities
```

### 3.2 Django Apps Overview

| App | Purpose | Key Models |
|-----|---------|------------|
| `projects` | Project CRUD, user auth | `Project`, `User`, `Preference` |
| `containers` | Universal hierarchy | `Container`, `Division` |
| `financial` | Budget/actual/valuation | `BudgetItem`, `ActualItem`, `SalesComparable` |
| `landscaper` | AI chat interface | `ChatMessage`, `ExtractionMapping` |
| `knowledge` | RAG/extraction pipeline | `Entity`, `Fact`, `Insight`, `Embedding` |
| `documents` | Document storage | `Document`, `Folder`, `Attribute` |
| `calculations` | Financial calculations | Wrapper for Python engine |
| `benchmarks` | Benchmark data | `AbsorptionVelocity`, `BuilderCommunity` |
| `sales_absorption` | Sales tracking | `SalesBenchmark`, `AbsorptionDetail` |
| `multifamily` | MF-specific models | `Unit`, `UnitType`, `Lease` |
| `landuse` | Land use taxonomy | `LuFamily`, `LuType`, `LuProduct` |
| `market_intel` | Market data | `MarketActivity`, `CompetitiveProject` |
| `contacts` | Contact management | `Contact`, `Cabinet` |

### 3.3 API Endpoints

**Authentication**
```
POST /api/token/                    # JWT token obtain
POST /api/token/refresh/            # JWT token refresh
POST /api/auth/register/            # User registration
POST /api/auth/login/               # User login
```

**Projects**
```
GET  /api/projects/                 # List projects
POST /api/projects/                 # Create project
GET  /api/projects/{id}/            # Get project
PUT  /api/projects/{id}/            # Update project
DELETE /api/projects/{id}/          # Delete project
```

**Containers**
```
GET  /api/containers/               # List containers
GET  /api/containers/by_project/{id}/  # Tree by project
POST /api/containers/               # Create container
```

**Financial/Budget**
```
GET  /api/budget-items/             # List budget items
GET  /api/budget-items/by_project/{id}/  # By project with rollups
POST /api/budget-items/             # Create budget item
GET  /api/actual-items/variance/{id}/    # Variance report
GET  /api/budget/variance/{id}/     # Variance summary
```

**Valuation**
```
GET  /api/valuation/sales-comps/    # Sales comparables
POST /api/valuation/sales-comps/    # Add comparable
GET  /api/valuation/income-approach-data/{id}/  # Income approach
POST /api/valuation/income-approach-data/{id}/update/  # Update assumptions
GET  /api/valuation/hbu/            # Highest & Best Use analysis
```

**Landscaper AI Chat**
```
GET  /api/projects/{id}/landscaper/chat/     # Get chat history
POST /api/projects/{id}/landscaper/chat/     # Send message (AI response)
GET  /api/projects/{id}/landscaper/activities/  # Activity feed
GET  /api/landscaper/mappings/               # Extraction mappings
POST /api/landscaper/mutations/{id}/confirm/ # Confirm mutation
```

**Knowledge/Extraction**
```
POST /api/knowledge/projects/{id}/extract/   # Extract from project
POST /api/knowledge/documents/{id}/extract/  # Extract from document
GET  /api/knowledge/projects/{id}/extractions/  # List extractions
POST /api/knowledge/chat/{id}/               # Knowledge chat
GET  /api/knowledge/platform/query/          # Query platform knowledge
GET  /api/knowledge/benchmarks/expense/      # Expense benchmarks
```

**Documents**
```
GET  /api/dms/documents/            # List documents
POST /api/dms/documents/            # Upload document
GET  /api/dms/documents/{id}/       # Get document
POST /api/dms/documents/{id}/process/  # Process document
```

### 3.4 Services Layer

**Key Service Files** (`backend/apps/knowledge/services/`)
| Service | File | Purpose |
|---------|------|---------|
| `landscaper_ai` | `landscaper_ai.py` | Main AI chat logic |
| `extraction_service` | `extraction_service.py` | Document extraction (117KB) |
| `extraction_writer` | `extraction_writer.py` | Write extractions to DB |
| `platform_knowledge_retriever` | `platform_knowledge_retriever.py` | RAG for platform knowledge |
| `user_knowledge_retriever` | `user_knowledge_retriever.py` | RAG for user's past work |
| `document_classifier` | `document_classifier.py` | Classify document types |
| `embedding_service` | `embedding_service.py` | OpenAI embeddings |

**Landscaper Services** (`backend/apps/landscaper/`)
| File | Size | Purpose |
|------|------|---------|
| `ai_handler.py` | 220KB | Main AI handler with system prompts |
| `tool_executor.py` | 443KB | Tool execution for Claude tools |
| `views.py` | 34KB | API views for chat |
| `opex_mapping.py` | 10KB | Operating expense mapping |

---

## Section 4: AI Integration Points

### 4.1 Landscaper Chat (Main AI Interface)

**Architecture**
```
Frontend                          Backend
────────────────────────────────────────────────────
LandscaperPanel.tsx               ai_handler.py
       │                               │
useLandscaper hook  ─────────>  ChatMessageViewSet
       │                               │
  POST /api/projects/{id}/       get_landscaper_response()
       /landscaper/chat/               │
                                 Claude API (Anthropic)
                                       │
                                 tool_executor.py
                                 (execute tool calls)
```

**Endpoint**: `POST /api/projects/{id}/landscaper/chat/`
**Handler**: `backend/apps/landscaper/views.py` → `ChatMessageViewSet.create()`
**AI Handler**: `backend/apps/landscaper/ai_handler.py` → `get_landscaper_response()`

**System Prompts** (defined in `ai_handler.py` lines 4190-4299)

The AI uses property-type-specific prompts. Each prompt includes:
1. Property type expertise (land dev, multifamily, office, retail, industrial)
2. Base instructions for response style and tool usage

**Multifamily System Prompt:**
```
You are Landscaper, an AI assistant specialized in multifamily real estate analysis.

Your expertise includes:
- Rent roll analysis and income optimization
- Operating expense benchmarking
- Cap rate analysis and valuation
- Unit mix optimization
- Renovation ROI analysis
- Market rent comparables
- NOI projections and stabilization

When analyzing properties:
- Focus on rent per square foot and rent growth
- Analyze operating expense ratios
- Review comparable sales and cap rates
- Consider renovation potential and value-add opportunities
- Evaluate occupancy trends and lease terms

RESPONSE STYLE - Be concise:
- 1-2 sentences for routine updates
- Don't narrate your thinking or explain what you're checking
- Just do the task and confirm what you did
- Only ask questions if truly necessary

[Additional instructions for document reading, field updates, rental comps, operating expenses...]
```

**Land Development System Prompt:**
```
You are Landscaper, an AI assistant specialized in land development real estate analysis.

Your expertise includes:
- Land acquisition and pricing analysis
- Development budgets and cost estimation
- Absorption rate forecasting and market velocity
- Lot pricing strategies and builder negotiations
- Infrastructure costs (grading, utilities, streets)
- Entitlement and zoning considerations
- Phase-by-phase development planning

When analyzing projects:
- Focus on land basis and development margin
- Consider absorption rates from comparable subdivisions
- Analyze builder takedown schedules
- Review infrastructure cost benchmarks
- Evaluate entitlement risk and timeline

[Base instructions...]
```

**AI Provider**: Anthropic Claude API
**Model**: Configured via `CLAUDE_MODEL` constant
**Tools**: 40+ tools defined in `LANDSCAPER_TOOLS` array for:
- Field updates (`update_project_field`, `bulk_update_fields`)
- Document reading (`get_document_content`, `ingest_document`)
- Operating expenses (`update_operating_expenses`)
- Rental comps (`update_rental_comps`)
- Unit/lease management (`update_units`, `update_leases`)
- Knowledge graph (`get_knowledge_entities`, `get_knowledge_facts`)
- Income analysis (`analyze_loss_to_lease`, `calculate_year1_buyer_noi`)

### 4.2 Document Extraction / RAG

**Pipeline**
```
Document Upload
      │
      ▼
Document Classifier ──────> Classify as OM, T-12, Rent Roll, etc.
      │
      ▼
Text Extraction ──────────> Extract text (PDF, Excel, images)
      │
      ▼
Chunking Service ─────────> Split into chunks
      │
      ▼
Embedding Service ────────> OpenAI embeddings
      │
      ▼
knowledge_embeddings ─────> Store in pgvector
      │
      ▼
Extraction Service ───────> AI extracts structured data
      │
      ▼
Database Tables ──────────> Populate project fields
```

**Key Files**
| File | Purpose |
|------|---------|
| `knowledge/services/document_classifier.py` | Classify document types |
| `knowledge/services/text_extraction.py` | Extract text from documents |
| `knowledge/services/chunking.py` | Split documents into chunks |
| `knowledge/services/embedding_service.py` | Generate OpenAI embeddings |
| `knowledge/services/extraction_service.py` | AI-powered extraction |
| `knowledge/services/rag_retrieval.py` | RAG query logic |

**Platform Knowledge RAG**
- Table: `tbl_platform_knowledge`, `tbl_platform_knowledge_chunks`
- Service: `platform_knowledge_retriever.py`
- Triggered when user asks valuation methodology questions
- Uses similarity threshold of 0.65 for chunk retrieval

### 4.3 Other AI Touchpoints

**Document Chat**
- Endpoint: `POST /api/knowledge/projects/{id}/docs/{doc_id}/chat/`
- Handler: `knowledge/views/chat_views.py` → `document_chat()`
- Scoped to specific document content

**CopilotKit Integration**
- Components in `src/components/copilot/`
- Lightweight integration, not primary AI interface

---

## Section 5: Database

### 5.1 Database Configuration

- **Type**: PostgreSQL 15+ on Neon Serverless
- **Database Name**: `land_v2`
- **Schema**: `landscape`
- **Total Tables**: 253
- **Connection**: `@neondatabase/serverless` (frontend), `dj_database_url` (Django)

### 5.2 Key Tables by Domain

**Projects & Properties (~15 tables)**
| Table | Purpose |
|-------|---------|
| `tbl_project` | Project master record |
| `tbl_project_config` | Project-level configuration |
| `tbl_project_settings` | User preferences per project |
| `tbl_container` | Universal hierarchy (replaces parcel/phase) |
| `tbl_division` | Division groupings |
| `tbl_parcel` | Legacy parcel data (still supported) |
| `tbl_phase` | Legacy phase data (still supported) |
| `tbl_property_acquisition` | Acquisition details |
| `tbl_project_assumption` | Project assumptions |

**Financial (~25 tables)**
| Table | Purpose |
|-------|---------|
| `core_fin_fact_budget` | Budget line items |
| `core_fin_fact_actual` | Actual costs |
| `core_fin_category` | Category hierarchy |
| `core_fin_uom` | Units of measure |
| `core_fin_growth_rate_sets` | Growth rate sets |
| `core_fin_growth_rate_steps` | Growth rate steps |
| `core_fin_funding_source` | Funding sources |
| `tbl_finance_structure` | Finance structure |
| `tbl_debt_facility` | Debt facilities |
| `tbl_equity_structure` | Equity structure |
| `tbl_waterfall` | Waterfall distributions |

**Valuation (~15 tables)**
| Table | Purpose |
|-------|---------|
| `tbl_sales_comparables` | Sales comparables |
| `tbl_sales_comp_adjustments` | Comparable adjustments |
| `tbl_rental_comparable` | Rental comparables |
| `tbl_income_approach` | Income approach data |
| `tbl_valuation_reconciliation` | Value reconciliation |
| `tbl_hbu_analysis` | Highest & Best Use |
| `tbl_property_attribute_def` | Property attributes |

**Multifamily (~10 tables)**
| Table | Purpose |
|-------|---------|
| `tbl_multifamily_unit` | Individual units |
| `tbl_multifamily_unit_type` | Unit type mix |
| `tbl_multifamily_lease` | Lease records |
| `tbl_multifamily_property` | Property details |
| `tbl_rent_roll` | Rent roll header |
| `tbl_rent_roll_unit` | Rent roll units |

**Documents (~20 tables)**
| Table | Purpose |
|-------|---------|
| `core_doc` | Document master |
| `core_doc_folder` | Folder structure |
| `core_doc_text` | Extracted text |
| `dms_assertion` | Extracted assertions |
| `dms_workspaces` | Document workspaces |
| `dms_templates` | Document templates |
| `ai_extraction_staging` | Extraction staging |
| `tbl_extraction_log` | Extraction history |
| `tbl_extraction_mapping` | Field mappings |

**Knowledge/AI (~10 tables)**
| Table | Purpose |
|-------|---------|
| `knowledge_embeddings` | Document embeddings (pgvector) |
| `knowledge_entities` | Knowledge graph entities |
| `knowledge_facts` | Knowledge graph facts |
| `knowledge_insights` | AI-discovered insights |
| `knowledge_sessions` | Chat sessions |
| `landscaper_chat_message` | Chat messages |
| `landscaper_activity` | Activity feed |
| `tbl_platform_knowledge` | Platform knowledge docs |
| `tbl_platform_knowledge_chunks` | Platform knowledge chunks |

**Land Use Taxonomy (~15 tables)**
| Table | Purpose |
|-------|---------|
| `lu_family` | Level 1: Family (Residential, Commercial) |
| `lu_type` | Level 2: Type (Single Family, Retail) |
| `lu_subtype` | Level 3: Subtype (Detached, Strip Center) |
| `lu_res_spec` | Residential specifications |
| `lu_com_spec` | Commercial specifications |
| `type_lot_product` | Lot product definitions |

**Benchmarks (~10 tables)**
| Table | Purpose |
|-------|---------|
| `bmk_absorption_velocity` | Absorption benchmarks |
| `bmk_builder_communities` | Builder community data |
| `bmk_builder_plans` | Builder plan data |
| `bmk_resale_closings` | Resale closing data |
| `tbl_sale_benchmarks` | Sale benchmarks |
| `tbl_global_benchmark_registry` | Global benchmark registry |

**Remaining ~130 tables** include:
- Operating expenses (`tbl_operating_expense`, `tbl_opex_*`)
- Market data (`market_*`, `tbl_market_*`)
- Leasing (`tbl_lease_*`, `tbl_cre_*`)
- GIS (`gis_*`)
- System (`django_*`, `auth_*`)
- Lookups (`lkp_*`, `core_lookup_*`)

### 5.3 Schema Reference

- Rich schema JSON: `docs/schema/landscape_rich_schema_2026-01-20.json` (2.9MB)
- Compact schema: `docs/schema/landscape_schema_2026-01-20.json` (23KB)
- TypeScript types: `src/types/database.ts` (1930 lines)

---

## Section 6: Data Flow Diagrams

### 6.1 Landscaper Chat Query

```
┌─────────────────┐
│ User types      │
│ message in      │
│ LandscaperPanel │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ useLandscaper hook (src/hooks/useLandscaper.ts)                         │
│ - Constructs request with projectId, messages, activeTab                │
│ - Manages loading/error state                                           │
└────────┬────────────────────────────────────────────────────────────────┘
         │ POST /api/projects/{id}/landscaper/chat/
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Django: ChatMessageViewSet.create() (backend/apps/landscaper/views.py)  │
│ - Validates request                                                     │
│ - Builds project context                                                │
│ - Calls get_landscaper_response()                                       │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ ai_handler.get_landscaper_response() (backend/apps/landscaper/         │
│                                        ai_handler.py)                   │
│ - Selects system prompt by project type                                 │
│ - Adds platform knowledge context (RAG) if valuation query              │
│ - Adds user knowledge context if applicable                             │
│ - Calls Anthropic Claude API with messages + tools                      │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Claude API (Anthropic)                                                  │
│ - Processes with system prompt + context                                │
│ - May return tool_use blocks                                            │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Tool Execution Loop (if tool_use returned)                              │
│ tool_executor.py executes each tool:                                    │
│ - update_project_field → SQL UPDATE                                     │
│ - get_document_content → Read from core_doc_text                        │
│ - update_operating_expenses → INSERT/UPDATE tbl_operating_expense       │
│ - etc.                                                                  │
│ Results sent back to Claude for final response                          │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Response returned to frontend                                           │
│ {                                                                       │
│   content: "Updated the cap rate to 5.5%...",                           │
│   metadata: { model, tokens, tool_calls },                              │
│   field_updates: [{ table, field, old_value, new_value }]               │
│ }                                                                       │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ useLandscaper emits events for UI refresh                               │
│ emitMutationComplete() triggers data refetch                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Document Upload & Extraction

```
┌─────────────────┐
│ User uploads    │
│ file via DMS    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ DMSView component (src/components/dms/DMSView.tsx)                      │
│ - File upload handler                                                   │
│ - Calls upload API                                                      │
└────────┬────────────────────────────────────────────────────────────────┘
         │ POST /api/dms/documents/
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Django: Document upload (backend/apps/documents/views.py)               │
│ - Stores file (local or S3)                                             │
│ - Creates core_doc record                                               │
│ - Queues for processing                                                 │
└────────┬────────────────────────────────────────────────────────────────┘
         │ POST /api/knowledge/documents/{id}/process/
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Document Processing Pipeline (backend/apps/knowledge/services/)         │
│                                                                         │
│ 1. document_classifier.py → Classify as OM, T-12, Rent Roll, etc.       │
│ 2. text_extraction.py → Extract text (PDF/Excel/Image)                  │
│ 3. chunking.py → Split into semantic chunks                             │
│ 4. embedding_service.py → Generate OpenAI embeddings                    │
│ 5. Store in knowledge_embeddings (pgvector)                             │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Extraction Service (extraction_service.py)                              │
│ - Uses field_registry to know what to extract                           │
│ - Calls Claude to extract structured data                               │
│ - Creates extraction records with confidence scores                     │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Extraction Writer (extraction_writer.py)                                │
│ - Writes to target tables (tbl_project, tbl_multifamily_unit, etc.)     │
│ - Creates dms_assertion records for provenance                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Project Data Load

```
┌─────────────────┐
│ User navigates  │
│ to project page │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Project Layout (src/app/projects/[projectId]/layout.tsx)                │
│ - Server component fetches project data                                 │
│ - Wraps children with ProjectProvider                                   │
└────────┬────────────────────────────────────────────────────────────────┘
         │ Multiple parallel fetches
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ React Query / Custom Hooks                                              │
│ - useContainers() → GET /api/containers/by_project/{id}/                │
│ - useBudgetCategories() → GET /api/budget-items/by_project/{id}/        │
│ - useOperationsData() → GET /api/financial/...                          │
│ - useSalesAbsorption() → GET /api/sales_absorption/...                  │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Django ViewSets (backend/apps/*/views.py)                               │
│ - Query database with DRF serializers                                   │
│ - Apply permissions, filtering                                          │
│ - Return JSON response                                                  │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PostgreSQL (Neon)                                                       │
│ - Execute queries                                                       │
│ - Return data                                                           │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Data cached in React Query                                              │
│ - Stale time, refetch on focus                                          │
│ - Components re-render with data                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Section 7: Environment & Configuration

### 7.1 Environment Variables

**Frontend (`.env.local`)**
```bash
# Database (for Next.js API routes - legacy)
DATABASE_URL=postgresql://user:password@host:5432/land_v2

# Django API URL
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional External APIs
ZILLOW_API_BASE_URL=https://api.zillow.com
ZILLOW_API_KEY=...
UPLOADTHING_SECRET=...
```

**Backend (`backend/.env`)**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/land_v2

# Django Settings
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### 7.2 Service Configuration

| Service | Default Port | Purpose |
|---------|--------------|---------|
| Next.js | 3000 | Frontend dev server |
| Django | 8000 | Backend API |
| PostgreSQL | 5432 | Database (Neon hosted) |

### 7.3 Development Setup

```bash
# Terminal 1: Frontend
npm run dev                    # Starts Next.js on :3000 (Turbopack)

# Terminal 2: Backend
cd backend
source venv/bin/activate
python manage.py runserver 8000

# Both servers needed for full functionality
```

**Key npm Scripts:**
```bash
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix linting
npm run db:migrate       # Run SQL migrations
npm run test             # Run tests
```

---

## Section 8: Quick Reference

### Where to Find...

| Feature | Frontend Path | Backend Path | Database Table |
|---------|---------------|--------------|----------------|
| **Landscaper Chat** | `src/components/landscaper/LandscaperPanel.tsx` | `backend/apps/landscaper/ai_handler.py` | `landscaper_chat_message` |
| **System Prompts** | - | `backend/apps/landscaper/ai_handler.py` (line 4190) | - |
| **Tool Definitions** | - | `backend/apps/landscaper/ai_handler.py` (line 306) | - |
| **Tool Executor** | - | `backend/apps/landscaper/tool_executor.py` | - |
| **Document Upload** | `src/components/dms/DMSView.tsx` | `backend/apps/documents/views.py` | `core_doc` |
| **Document Extraction** | - | `backend/apps/knowledge/services/extraction_service.py` | `ai_extraction_staging` |
| **RAG/Embeddings** | - | `backend/apps/knowledge/services/rag_retrieval.py` | `knowledge_embeddings` |
| **Budget Grid** | `src/components/budget/BudgetGridTab.tsx` | `backend/apps/financial/views.py` | `core_fin_fact_budget` |
| **Valuation** | `src/app/projects/[projectId]/valuation/` | `backend/apps/financial/views_valuation.py` | `tbl_sales_comparables` |
| **Project List** | `src/app/projects/page.tsx` | `backend/apps/projects/views.py` | `tbl_project` |
| **Container Tree** | - | `backend/apps/containers/views.py` | `tbl_container` |
| **Operating Expenses** | `src/components/operations/` | `backend/apps/financial/` | `tbl_operating_expense` |
| **Unit Mix** | `src/components/landscaper/UnitMixAccordion.tsx` | `backend/apps/multifamily/` | `tbl_multifamily_unit_type` |
| **Rent Roll** | - | `backend/apps/knowledge/services/extraction_service.py` | `tbl_rent_roll_unit` |
| **Platform Knowledge** | - | `backend/apps/knowledge/services/platform_knowledge_retriever.py` | `tbl_platform_knowledge_chunks` |
| **Map/GIS** | `src/components/map/ProjectTabMap.tsx` | `backend/apps/gis/views.py` | `gis_project_boundary` |
| **Auth Context** | `src/contexts/AuthContext.tsx` | `backend/apps/projects/views_auth.py` | `auth_user` |
| **User Preferences** | `src/hooks/useUserPreferences.ts` | `backend/apps/users/views.py` | `tbl_user_preference` |

### File Size Reference (Large Files)

| File | Size | Purpose |
|------|------|---------|
| `backend/apps/landscaper/tool_executor.py` | 443KB | Tool execution logic |
| `backend/apps/landscaper/ai_handler.py` | 220KB | AI handler + system prompts |
| `backend/apps/knowledge/services/extraction_service.py` | 117KB | Document extraction |
| `src/types/database.ts` | 57KB | TypeScript DB types |
| `src/app/components/GrowthRates.tsx` | 94KB | Growth rates component |
| `backend/apps/financial/views_valuation.py` | 40KB | Valuation views |

### Common Debugging Locations

| Issue | Where to Look |
|-------|---------------|
| AI not responding | `backend/apps/landscaper/ai_handler.py` - check API key, model config |
| Tool execution failed | `backend/apps/landscaper/tool_executor.py` - check tool function |
| Extraction not working | `backend/apps/knowledge/services/extraction_service.py` |
| Budget data wrong | `backend/apps/financial/views.py` - check serializers |
| Container tree issues | `backend/apps/containers/views.py` |
| Auth problems | `src/contexts/AuthContext.tsx`, `backend/apps/projects/views_auth.py` |

---

## Appendix: Technology Stack

### Frontend
- **Framework**: Next.js 15.5 (App Router, React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, CoreUI React
- **UI Components**: CoreUI, Radix UI primitives, shadcn-style components
- **Data Fetching**: React Query (`@tanstack/react-query`)
- **Data Tables**: TanStack Table (`@tanstack/react-table`)
- **Maps**: MapLibre GL, Leaflet
- **Charts**: Recharts, Victory

### Backend
- **Framework**: Django 5.0 + Django REST Framework
- **Language**: Python 3.11+
- **Authentication**: SimpleJWT
- **API Documentation**: drf-spectacular (OpenAPI/Swagger)
- **Database ORM**: Django ORM (for Django models)

### Database
- **Database**: PostgreSQL 15+ on Neon Serverless
- **Extensions**: pgvector (embeddings)
- **Frontend Connection**: `@neondatabase/serverless` (raw SQL)
- **Backend Connection**: Django ORM + dj_database_url

### AI/ML
- **Chat AI**: Anthropic Claude (via `anthropic` SDK)
- **Embeddings**: OpenAI `text-embedding-3-small`
- **Vector Store**: pgvector in PostgreSQL

### Infrastructure
- **Hosting**: Vercel (frontend), TBD (backend)
- **Database**: Neon PostgreSQL
- **File Storage**: Local / UploadThing

---

*Last updated: 2026-01-22*
*Generated by Claude Code architecture audit*
