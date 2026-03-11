# Landscape - AI-Powered Real Estate Analytics Platform

> **Purpose:** This file provides persistent context for Claude Code sessions. Read automatically at session start.

---

## Project Overview

Landscape is an AI-powered real estate analytics platform targeting land developers and commercial real estate professionals. It's positioned as a modern alternative to ARGUS, with emphasis on:

- **Progressive complexity:** "Napkin to tablecloth" - simple inputs that can grow into institutional-grade analysis
- **AI-native features:** Document extraction, market intelligence, persistent knowledge base
- **Universal container architecture:** Same data model works across all property types (land dev, multifamily, office, retail, industrial)

**Primary test project:** Peoria Lakes MPC (Master Planned Community) - 42 parcels across 4 areas and 8 phases.

---

## Architecture

### Hybrid Stack

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 15.5 Frontend (React 18, TypeScript)           │
│  - UI components, client routing                        │
│  - Port 3000                                            │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────────┐     ┌─────────────────────┐
│  Next.js API      │     │  Django Backend     │
│  (Legacy routes)  │     │  (Primary target)   │
│  src/app/api/     │     │  Port 8000          │
└────────┬──────────┘     └──────────┬──────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
         ┌───────────────────────┐
         │  Neon PostgreSQL      │
         │  Database: land_v2    │
         │  Schema: landscape    │
         │  324 tables           │
         └───────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────────┐
│ Python Services │    │ Python Fin Engine   │
│ market_ingest   │    │ IRR, NPV, DSCR      │
│ financial_engine│    │ numpy-financial     │
└─────────────────┘    └─────────────────────┘
```

### Critical Rule: API Development

**All new API endpoints go to Django backend, not Next.js.**

- Django location: `backend/apps/`
- Next.js routes (`src/app/api/`) are legacy and being migrated
- Django OpenAPI docs: `http://localhost:8000/api/docs/`
- Django admin: `http://localhost:8000/admin/` (admin/admin123)

### Database Access

- **No ORM** - raw SQL with tagged template literals
- Connection: `src/lib/db.ts` using `@neondatabase/serverless`
- Database: `land_v2` on Neon PostgreSQL
- Schema: `landscape` (set via search_path)
- Types: `src/types/database.ts` (~57k lines of generated types)

```typescript
// Example pattern - raw SQL, not ORM
import { sql } from '@/lib/db';

const projects = await sql`
  SELECT * FROM tbl_project
  WHERE is_active = true
  ORDER BY updated_at DESC
`;
```

---

## Directory Structure

```
landscape/
├── src/                      # Next.js frontend
│   ├── app/                  # App Router pages + API routes (legacy)
│   │   ├── api/              # 313 route files (migrating to Django)
│   │   └── projects/         # Project-scoped pages
│   ├── components/           # React components
│   │   ├── ui/               # Base primitives (shadcn-style)
│   │   ├── budget/           # Budget grid (41 files)
│   │   ├── capitalization/   # Capital structure
│   │   ├── dms/              # Document management
│   │   ├── landscaper/       # AI chatbot
│   │   ├── map/              # GIS/mapping
│   │   └── sales/            # Sales absorption
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utilities, db connection
│   ├── types/                # TypeScript definitions
│   └── styles/               # CSS, tokens
│
├── backend/                  # Django REST API
│   ├── apps/
│   │   ├── projects/         # Project CRUD
│   │   ├── containers/       # Universal hierarchy
│   │   ├── financial/        # Budget, actuals, variance
│   │   ├── calculations/     # Python financial engine wrapper
│   │   ├── documents/        # DMS + extraction pipeline
│   │   ├── knowledge/        # RAG/embeddings (40+ service files)
│   │   ├── market_intel/     # Market data
│   │   └── ...
│   └── manage.py
│
├── services/                 # Python microservices
│   ├── financial_engine_py/  # numpy-financial calculations
│   └── market_ingest_py/     # Market data ingestion
│
├── migrations/               # Database migrations (36+ files)
├── scripts/                  # Node.js/bash utilities (77 files)
├── docs/                     # Documentation (numbered 00-14)
├── tests/                    # Playwright E2E tests
└── .claude/                  # Claude Code config
    ├── commands/             # Slash commands
    └── plans/                # Session plans
```

---

## Core Concepts

### Universal Container System

The container system replaces rigid property-type-specific hierarchies with a flexible tree structure:

```
Project
└── Container (Level 1) - e.g., "Area" or "Building"
    └── Container (Level 2) - e.g., "Phase" or "Floor"
        └── Container (Level 3) - e.g., "Parcel" or "Unit"
```

**Key tables:**
- `tbl_container` - Hierarchical tree with `parent_id`
- `tbl_project_config` - Configurable level labels per project

**Labels are configurable per project:**
| Property Type | Level 1 | Level 2 | Level 3 |
|---------------|---------|---------|---------|
| Land Dev      | Area    | Phase   | Parcel  |
| Multifamily   | Building| Floor   | Unit    |
| Office        | Building| Floor   | Suite   |

### Progressive Complexity Modes

Removed from UI. Landscaper now manages complexity contextually based on available data. Do not reference napkin/standard/detail modes in new code. CLAUDE.md references to these modes are retained for historical context only.

### Project Type Codes

```
LAND - Land Development (primary focus)
MF   - Multifamily
OFF  - Office
RET  - Retail
IND  - Industrial
HTL  - Hotel
MXU  - Mixed Use
```

---

## UI Conventions

### Component Libraries (Priority Order)

1. **CoreUI React** (`@coreui/react`) - Primary design system
2. **Radix UI** - Interaction primitives (dialog, dropdown, tabs)
3. **Custom components** - `src/components/ui/` (shadcn-style)
4. **MUI** - Data grids only, avoid for general UI

### Data Tables

**Use TanStack Table** (`@tanstack/react-table`) for all new table implementations.

- Existing: Budget grid uses TanStack with optional virtualization
- AG-Grid Community v34+ is used in the Rent Roll grid — extend only when needed for that component
- Handsontable exists in legacy "Budget Grid Dark" - do not extend

### Tabular Data Formatting Rules

All table and grid components must follow:

1. **Size columns to cell content only** — Column width is driven by the widest cell value, never by the header text. Headers wrap to fit whatever width the content dictates.
2. **Multi-word headers wrap** — headers with 2+ words render on multiple lines; the header never forces a column wider than its content requires.
3. **Implementation by library:**
   - **AG-Grid:** `autoSizeStrategy={{ type: 'fitCellContents', skipHeader: true }}`, `wrapHeaderText: true`, `autoHeaderHeight: true`, no fixed `width` (use `minWidth` only). CSS: `.ag-header-cell-label { white-space: normal }`
   - **TanStack Table:** column `size` = `undefined`, CSS `white-space: normal` on `<th>`, browser layout algorithm sizes to content.
   - **CoreUI / HTML:** `table-layout: auto`, `white-space: normal` on `<th>`, `white-space: nowrap` on `<td>`.
4. **Exception:** Pinned utility columns may use fixed `width` + `maxWidth`.

### Styling

- **CoreUI CSS variables** — always use `var(--cui-*)` tokens; never hardcode hex colors
- **Tailwind CSS** — secondary styling; forbidden patterns: `bg-slate-*`, `bg-gray-*`, `dark:` variants
- **Dark mode** — supported via CoreUI theme provider; use CSS vars so it works automatically
- Path aliases: `@/*` → `./src/*`

### File Naming

```
Components:     PascalCase.tsx      (BudgetGridTab.tsx)
Client comps:   *Client.tsx         (MapClient.tsx)
Hooks:          useCamelCase.ts     (useContainers.ts)
API routes:     route.ts            (in folder structure)
Types:          kebab-case.ts       (budget-item.ts)
```

### Layout Pattern

Three-panel macro-to-micro flow:
1. Summary cards (top) - KPIs and totals
2. Detail tables (middle) - Filterable data grids
3. Individual records (modal/drawer) - Edit forms

---

## Key Commands

### Development

```bash
# Frontend (Next.js)
npm run dev              # Dev server on port 3000 (Turbopack)
npm run build            # Production build
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix linting

# Backend (Django)
cd backend
./venv/bin/python manage.py runserver 8000
./venv/bin/python manage.py migrate

# Both servers needed for full functionality
```

### Database

```bash
npm run db:migrate                    # Run migrations
npm run db:validate:schema            # Validate schema
npm run schema:md                     # Generate schema docs
npm run db:bootstrap:containers       # Bootstrap container data
```

### Testing

```bash
npm run test              # Theme tokens + contrast tests
npm run test:ui           # Playwright UI mode
npm run test:headless     # Playwright headless
```

### Seeding

```bash
npm run db:seed:growth-rates
npm run db:seed:market-series
npm run seed:unitcosts:benchmark
```

---

## Database Schema Patterns

### Table Prefixes

| Prefix | Domain |
|--------|--------|
| `tbl_` | Core entities (project, container, parcel, phase) |
| `core_fin_fact_` | Financial facts (budget, actual) |
| `tbl_budget_` | Budget categories, templates |
| `tbl_lease_` | Lease management |
| `tbl_unit_` | Multifamily units |
| `tbl_sale_` | Sales and absorption |
| `tbl_document_` | Document management |
| `tbl_market_` | Market intelligence |
| `lkp_` | Lookup/reference tables |
| `lu_` | Land use taxonomy |
| `fact_` | Fact tables |

### Key Entity Tables

```sql
-- Core hierarchy
tbl_project              -- Project master
tbl_container            -- Universal hierarchy (preferred)
tbl_parcel               -- Legacy parcel inventory (still supported)
tbl_phase                -- Legacy phase hierarchy (still supported)

-- Financial
core_fin_fact_budget     -- Budget line items (with container_id)
core_fin_fact_actual     -- Actual costs (with container_id)

-- Land use taxonomy
lu_family                -- Level 1: Family (e.g., Residential)
lu_type                  -- Level 2: Type (e.g., Single Family)
lu_product               -- Level 3: Product (e.g., 50' Lot)
```

### Migration Conventions

- Location: `migrations/` directory
- Naming: `NNN_description.sql` (e.g., `017_add_land_use_labels.sql`)
- Always include rollback section
- Test on Peoria Lakes project before committing

---

## API Patterns

### Django Endpoints (Current)

```
/api/projects/                         # List/Create
/api/projects/:id/                     # CRUD
/api/projects/:id/containers/          # Hierarchical tree
/api/containers/                       # CRUD
/api/containers/by_project/:id/        # Tree by project
/api/budget-items/                     # CRUD
/api/budget-items/by_project/:id/      # With summary
/api/budget-items/rollup/:id/          # Aggregations
/api/actual-items/variance/:id/        # Variance report
/api/calculations/irr/                 # Financial calcs
/api/calculations/npv/
/api/calculations/dscr/
/api/multifamily/units                 # Unit CRUD
/api/multifamily/leases                # Lease CRUD
/api/multifamily/turns                 # Turn tracking
/api/knowledge/documents/{doc_id}/process/  # Sync doc processing
```

### Next.js Routes (Legacy - Reference Only)

```
/api/projects                          # Being migrated
/api/budget/gantt                      # Budget grid data
/api/budget/categories/tree            # Category hierarchy
/api/projects/:id/containers           # Container tree
```

### Response Patterns

Django uses DRF serializers with consistent envelope:

```json
{
  "count": 42,
  "results": [...],
  "summary": {
    "total_budget": 1500000,
    "total_actual": 1200000
  }
}
```

---

## Alpha Readiness Assessment (Audited 2026-02-15)

### Target Workflow: MF Appraiser Valuation

**Overall Status: ~70% Alpha-Ready** — Core valuation workflow functional, key gaps in reconciliation UI and reports.

### Feature Status by Workflow Step

| Step | Feature | Status | Key Gap |
|------|---------|--------|---------|
| 1 | Project Creation | ✅ WORKS | No Landscaper during creation |
| 2 | Document Upload & Extraction | ⚠️ PARTIAL | Async pipeline orchestration unclear; scanned PDFs require OCR preprocessing |
| 3 | Document Management | ✅ WORKS | Full DMS with 30+ API routes |
| 4 | Property Tab | ✅ WORKS | Rent roll, units, leases complete |
| 5 | Market / GIS | ⚠️ PARTIAL | Demographics incomplete, GIS persistence partial |
| 6 | Operations Tab | ⚠️ PARTIAL | Save endpoint still on legacy Next.js |
| 7 | Landscaper Chat | ✅ WORKS | 210+ tools, thread-based, mutations |
| 8 | Sales Comparison | ✅ WORKS | Full grid + adjustments + map |
| 9 | Cost Approach | ✅ WORKS | Land + improvements + depreciation |
| 10 | Income Approach | ✅ WORKS | Direct Cap + DCF, 3 NOI bases |
| 11 | Reconciliation | 🔧 STUBBED | Backend done, frontend placeholder only |
| 12 | Capitalization | ⚠️ PARTIAL | Waterfall calc endpoint missing (404) |
| 13 | Reports | 🔧 STUBBED | Hardcoded to project 17, no PDF gen |
| 14 | Knowledge Base | ⚠️ PARTIAL | RAG works, pgvector Phase 2, no Library UI |

### Alpha Blockers (Priority Order)

1. **Reconciliation frontend** — Build `ReconciliationPanel.tsx` (backend ready)
2. **Operations save migration** — Move to Django from legacy Next.js route
3. **Reports project scoping** — Remove hardcoded project 17
4. **Waterfall calculate endpoint** — Wire to financial engine
5. **Extraction pipeline** — Ingestion Workbench implemented and committed. Known gap: scanned PDF / OCR pipeline not yet implemented (OCRmyPDF identified as preferred solution).
6. **PDF report generation** — At minimum property summary

### Known Technical Debt

- 50 TODO/FIXME markers across 40 files
- Multiple grid libraries need consolidation (TanStack preferred for new; AG-Grid retained in rent roll)
- SWR + React Query both in use (standardize on React Query)
- Some MUI components mixed with CoreUI
- Operations save endpoint on legacy Next.js (being migrated)
- Reports page hardcoded to project 17
- Waterfall calc endpoint called but doesn't exist (404)
- pgvector column commented out in Knowledge embeddings model
- Scanned PDF / OCR pipeline not yet implemented (OCRmyPDF identified as preferred solution)

### Navigation Architecture

- **8-folder ARGUS-style tabs** with dynamic sub-tabs per property type
- URL-driven state: `/projects/[id]?folder={folder}&tab={tab}`
- `ProjectContentRouter` maps folder/tab combos to components
- `folderTabConfig.ts` generates tabs per property type + analysis type
- Two-row folder tabs with badge support (processing/error/pending)

### Landscaper Architecture

- **Left panel** (320px, collapsible to 64px strip)
- Claude AI with **217 registered tools** (`@register_tool` decorator) — includes 5 ingestion-specific tools added Mar 2026
- Level 2 Autonomy: propose mutations → user confirm/reject
- Thread-based chat with per-page context awareness
- RAG: DB-first queries → embedding retrieval → AI response
- Activity feed + extraction logs + scenario management
- **Silent failure risk:** ALLOWED_UPDATES field mappings must match actual DB column names exactly — always verify tool writes against the DB directly, not just API response codes
- **Comp tools:** Use unified comparables table with `property_type` discriminator — not separate land/MF tables

### Ingestion Workbench (Implemented — Mar 2026)

The Ingestion Workbench is a fully implemented split-panel modal replacing MappingScreen and the old `dms_extract_queue` intake flow.

**Layout:** 380px Landscaper chat (left) + field review table (right), 1200px wide modal

**Entry flow:**
1. File drop → `IntakeChoiceModal` (client-side classification, file not yet uploaded)
2. "Structured Ingestion" selected → file uploads to UploadThing immediately → Workbench opens
3. Extraction triggers knowledge service pipeline (`ai_extraction_staging`) — bypasses old `dms_extract_queue` entirely
4. User reviews fields → commits → DMS record created, fields written to project tables
5. Cancel / X close → abandon endpoint called (bulk-reject staging rows, mark session abandoned) + UploadThing file deleted + `core_doc` soft-deleted

**Field status model:** `accepted` (green) / `pending` (yellow) / `conflict` (orange) / `waiting` (gray) / `empty` (light gray)

**Tile tabs:** Property-type-aware. Multifamily: Project / Property / Operations / Valuation / All. Land Dev: Project / Planning / Budget / Valuation / All. Each tab shows field count badge.

**Field scoping:** Workbench shows only fields from the current `doc_id`, not all pending project staging rows.

**Quote stripping:** `_clean_extracted_value()` in `extraction_service.py` strips wrapping quotes before staging INSERT. `_strip_wrapping_quotes()` in `workbench_views.py` cleans existing data on read.

**Landscaper integration:** `pageContext="ingestion"` with 5 dedicated tools + live `<ingestion_state>` block injected into system prompt. Tools: `get_ingestion_staging`, `update_staging_field`, `approve_staging_field`, `reject_staging_field`, `explain_extraction`.

**Source citation:** `source_snippet` populated at 87.5% coverage (batched extraction path). `source_page` not yet populated — extraction prompt does not request page numbers (post-alpha backlog).

**Key files:**
- `src/contexts/WorkbenchContext.tsx` — state bridge
- `src/app/.../tabs/IngestionWorkbench.tsx` — main panel component
- `src/app/.../IngestionWorkbenchPanel.tsx` — pass-through wrapper
- `src/components/intelligence/IntakeChoiceModal.tsx` — entry point
- `src/hooks/useExtractionStaging.ts` — staging data + mutations
- `backend/apps/knowledge/views/workbench_views.py` — list, update, commit, abandon endpoints
- `backend/apps/landscaper/tools/ingestion_tools.py` — 5 ingestion tools (NEW)
- `src/app/api/dms/documents/[id]/delete/route.ts` — UploadThing delete + core_doc soft-delete

**MappingScreen:** Deleted. Removed from `IntelligenceTab.tsx`. Draft sessions show "In Progress" badge.

**Known gaps (post-alpha):**
- `source_page` never populated by extraction pipeline
- `intake_session_id` not on `ai_extraction_staging` (uses `doc_id` filter instead — Option B deferred)
- `rent_comp_name` field registry bug: tenant names from rent rolls misclassified as rent comparable names
- Implicit authority auto-resolution wired at schema level (`ingestion_source_authority` table exists) but logic not implemented

### PDF / OCR Handling

Two distinct failure modes — treat separately:

| Problem | Symptom | Solution |
|---------|---------|---------|
| Scanned PDF | Extraction returns empty or near-zero confidence | OCRmyPDF preprocessing before ingestion |
| Complex native PDF | Low confidence on specific fields (tables, columns) | Layout-aware LLM prompting on retry |

**Landscaper behavior:** Must detect and surface the problem to the user rather than silently returning empty placeholders. Large files must be chunked with user notification if only partial extraction was possible.

**Recommended stack:** OCRmyPDF (add text layer) + Ghostscript (compression). Integration point: `backend/apps/documents/` before `core_doc_text` ingestion step.

### RAG/Knowledge System

- Knowledge entity/fact system (subject-predicate-object triples)
- OpenAI ada-002 embeddings (1536-dim) — generation works
- pgvector table ready but vector column commented out (Phase 2)
- RAG retrieval integrated with Landscaper chat
- 40+ service files in `backend/apps/knowledge/services/`
- Cross-project search backend exists, no REST endpoint yet
- Sync processing: `POST /api/knowledge/documents/{doc_id}/process/`

### Valuation Engine Status

- **Sales Comparison:** Full CRUD, adjustment matrix, property-type-specific tables
- **Cost Approach:** Marshall & Swift factors, 3 depreciation types, container cost metadata
- **Income Approach:** 3 NOI bases (F-12 Current/Market/Stabilized), DCF monthly for MF
- **Reconciliation:** Backend complete (weights, narrative versioning), no frontend
- **Financial Engine:** `services/financial_engine_py/` with IRR/NPV/DSCR/waterfall tests
- **Construction Loan Engine:** Phase 6A complete (draw-repay-redraw validated); Phase 6B land dev conversational parsing complete

---

## Deployment (Alpha)

### Architecture

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  Vercel                      │     │  Railway                     │
│  Next.js 15.5 frontend       │────▶│  Django REST backend         │
│  + legacy API routes         │     │  Gunicorn + WhiteNoise       │
│  (src/app/api/*)             │     │  (backend/)                  │
└──────────┬───────────────────┘     └──────────┬───────────────────┘
           │                                     │
           └──────────┬──────────────────────────┘
                      ▼
           ┌───────────────────────┐
           │  Neon PostgreSQL      │
           │  Database: land_v2    │
           │  (shared by both)     │
           └───────────────────────┘
```

### Vercel (Frontend + Legacy API)

- **What runs:** Next.js app (pages, components, API routes under `src/app/api/`)
- **Config files:** `vercel.json` (cron only), `nixpacks.toml` (libgl1 for server-side image processing)
- **Build:** `npm run build` (Turbopack)
- **Key env vars required on Vercel:**
  - `DATABASE_URL` — Neon PostgreSQL connection string
  - `NEXT_PUBLIC_DJANGO_API_URL` — Railway Django URL (e.g., `https://landscape-production.up.railway.app`)
  - `DJANGO_API_URL` — Same as above (server-side variant)
  - `OPENAI_API_KEY` — Used by knowledge/extraction services
  - `ANTHROPIC_API_KEY` — Used by Landscaper
  - `UPLOADTHING_SECRET` — File upload service
- **CORS note:** The Vercel production URL must be added to Django's `CORS_ALLOWED_ORIGINS` env var on Railway

### Railway (Django Backend)

- **What runs:** Django REST API (all `/api/` endpoints under `backend/apps/`)
- **Config files:** `backend/railway.json`, `backend/Procfile`
- **Build:** Nixpacks auto-detects Python, installs `backend/requirements.txt`
- **Start command:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
- **Release command:** `python manage.py migrate` (runs automatically on deploy via Procfile)
- **Static files:** WhiteNoise serves Django static files (admin, API docs)
- **Key env vars required on Railway:**
  - `DATABASE_URL` — Same Neon PostgreSQL connection string
  - `ALLOWED_HOSTS` — `.railway.app,localhost,127.0.0.1` (default includes `.railway.app`)
  - `CORS_ALLOWED_ORIGINS` — Must include the Vercel production URL
  - `OPENAI_API_KEY` — Used by extraction/knowledge services
  - `ANTHROPIC_API_KEY` — Used by Landscaper AI
  - `SECRET_KEY` — Django secret key (generate unique for production)
  - `DEBUG` — Set to `False` for production

### What Runs Where

| Component | Vercel | Railway | Notes |
|-----------|--------|---------|-------|
| Frontend (React pages) | ✅ | — | All UI rendering |
| Legacy API routes (`src/app/api/dms/`, etc.) | ✅ | — | Direct Neon DB queries |
| Django REST API (`/api/projects/`, `/api/containers/`, etc.) | — | ✅ | Primary API target |
| Landscaper chat | — | ✅ | 217 tools, Claude AI |
| Knowledge/extraction pipeline | — | ✅ | Document processing |
| Ingestion Workbench API | — | ✅ | `workbench_views.py` |
| Financial engine (IRR/NPV/DSCR) | — | ✅ | Python calculations |
| Cron jobs (`/api/cron/*`) | ✅ | — | Vercel Cron |
| Static files (Django admin, Swagger) | — | ✅ | WhiteNoise |

### Deployment Checklist

1. [ ] Set all env vars on Vercel (especially `NEXT_PUBLIC_DJANGO_API_URL` pointing to Railway)
2. [ ] Set all env vars on Railway (especially `CORS_ALLOWED_ORIGINS` including Vercel URL)
3. [ ] Verify Railway deploy succeeds (check `python manage.py migrate` in release logs)
4. [ ] Verify Vercel build succeeds (`npm run build`)
5. [ ] Test DMS upload flow end-to-end (hits both Vercel API route + Railway extraction)
6. [ ] Test Landscaper chat (hits Railway Django exclusively)
7. [ ] Confirm `/api/docs/` Swagger UI accessible on Railway URL

### Known Alpha Deployment Limitations

- **Scanned PDF/OCR:** Not implemented. Extraction returns empty on scanned documents. Documented for testers.
- **`source_page` field:** Never populated by extraction pipeline. Deferred to post-alpha.
- **DMS API split:** Some DMS routes on Vercel (legacy Next.js), others on Railway (Django). Functional but architecturally inconsistent — migration deferred to post-alpha.

---

## Environment Variables

Required in `.env.local`:

```bash
DATABASE_URL=postgresql://...          # Neon PostgreSQL (land_v2 database)
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000

# AI Services
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Optional
ZILLOW_API_BASE_URL=https://api.zillow.com
ZILLOW_API_KEY=...
UPLOADTHING_SECRET=...
```

---

## Testing Checklist

Before committing changes:

1. [ ] `npm run lint` passes
2. [ ] `npm run build` succeeds
3. [ ] Test with Peoria Lakes project
4. [ ] Django migrations applied if schema changed
5. [ ] API changes documented in relevant README

---

## Common Tasks

### Adding a New Django Endpoint

1. Create/update model in `backend/apps/{app}/models.py`
2. Create serializer in `serializers.py`
3. Create viewset in `views.py`
4. Register routes in `urls.py`
5. Run migrations if model changed
6. Test via `/api/docs/` Swagger UI

### Adding a New React Component

1. Create in appropriate `src/components/{domain}/` folder
2. Use CoreUI components as base; CSS vars only (no hardcoded hex)
3. Follow PascalCase naming
4. Add 'use client' directive if using hooks/state
5. Implement all three complexity modes if data-heavy
6. Follow tabular formatting rules if component includes a grid/table

### Adding a New Landscaper Tool

1. Add function with `@register_tool` decorator in appropriate tools file
2. Verify ALLOWED_UPDATES field names match actual DB column names exactly
3. Write a test that confirms the value was written to the DB (not just API 200)
4. Update tool count in this file under Landscaper Architecture
5. Run server restart after changes

### Modifying Database Schema

1. Create migration file in `migrations/`
2. Include UP and DOWN (rollback) sections
3. Run `npm run db:migrate`
4. Update `src/types/database.ts` if needed
5. Update Django models if applicable

---

## Reference Documents

In-repo documentation (check `docs/` folder):

- `docs/00-getting-started/` - Developer onboarding
- `docs/01-architecture/` - System design
- `docs/02-features/` - Feature documentation
- `docs/03-api-reference/` - API documentation
- `docs/05-database/` - Database schema
- `docs/00_overview/status/` - Current status

Key standalone files:

- `KNOWN_ISSUES.md` - Active issues and workarounds
- `README.md` - Project overview and quick start

---

## Session Start Checklist

When starting a new Claude Code session:

1. Verify both servers running (Next.js :3000, Django :8000)
2. Check current git branch
3. Review recent commits for context
4. Run `npm run lint` to check baseline
5. Ask about current focus area if unclear

---

## Working Style

### Clarification Before Execution

Before starting any task:
1. Analyze the prompt for ambiguity, missing context, or potential conflicts with existing code
2. If unclear: Ask specific clarifying questions before proceeding
3. If clear: State your interpretation briefly, then execute

Do NOT ask clarifying questions when:
- The task is straightforward and well-defined
- All necessary context is in this CLAUDE.md or the codebase
- The prompt references existing patterns to follow

DO ask clarifying questions when:
- Multiple valid interpretations exist
- The task conflicts with established conventions
- Required information (table names, component locations, etc.) is missing
- The scope is ambiguous (e.g., "fix the budget" - which aspect?)

### ⚠️ Mandatory: Downstream Impact Analysis (Before ANY Code Change)

**This is non-negotiable.** Before modifying any file, function, API endpoint, database query, type definition, or component, you MUST trace downstream dependencies and flag potential breakage. This app has deep interdependencies — "simple" changes routinely cascade into broken features elsewhere.

**Before writing or modifying code:**

1. **Trace consumers** — Identify every file/component/endpoint that imports, calls, or depends on what you're changing. Use grep/search, not assumptions.
2. **Trace data flow** — If changing a query, API response shape, type definition, or DB column: find every consumer of that data downstream (components, hooks, other APIs, Landscaper tools, financial engine inputs).
3. **Flag risk explicitly** — Before executing, state: "This change touches X. Downstream consumers include: [list]. Risk areas: [list]. I will verify [specific things] after the change."
4. **Test the chain, not just the change** — After modifying code, verify that downstream features still work. A 200 response from the changed endpoint is not sufficient — check that the UI components consuming it still render correctly and that calculated values (IRR, NPV, cash flows, budgets) are still correct.
5. **Watch for silent failures** — Many parts of this app fail silently (empty renders, missing data, stale cache). Actively check for these, don't wait for errors.

**High-risk zones that break easily (non-exhaustive):**

- `core_fin_fact_budget` / `core_fin_fact_actual` — Changes ripple into budget grid, variance analysis, cash flow, waterfall, and financial engine calcs
- Container hierarchy (`tbl_container`) — Affects rollups, budget aggregation, sales absorption, and Landscaper context
- API response shapes — Frontend hooks (SWR/React Query) and Landscaper tools both consume these; shape changes break both
- Type definitions (`src/types/`) — Changing types without updating all consumers causes silent TypeScript build failures or runtime undefined access
- Financial engine inputs — IRR/NPV/DSCR/cash flow calculations depend on specific data shapes; upstream changes produce wrong numbers without errors
- Landscaper tool field mappings (`ALLOWED_UPDATES`) — Must match actual DB columns exactly or writes silently fail
- SQL queries with JOINs — Adding/removing columns or changing WHERE clauses can break aggregation logic in rollup endpoints

**If you're unsure about downstream impact:** Ask before proceeding. A 5-second question is cheaper than a multi-hour debugging session to fix cascading breakage.

---

*Last updated: 2026-03-11*
*Last audit: 2026-02-15 — Alpha Readiness Assessment (14-step workflow audit)*
*Landscaper tool count: 217*
*Maintainer: Update when architecture decisions change. Never let this file fall more than one session behind.*