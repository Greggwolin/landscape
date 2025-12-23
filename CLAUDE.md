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
         │  280 tables           │
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
│   │   ├── documents/        # DMS
│   │   ├── knowledge/        # RAG/embeddings
│   │   ├── market_intel/     # Market data
│   │   └── ...
│   └── manage.py
│
├── services/                 # Python microservices
│   ├── financial_engine_py/  # numpy-financial calculations
│   └── market_ingest_py/     # Market data ingestion
│
├── migrations/               # Database migrations (36 files)
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

Three UI modes controlling field visibility:

| Mode     | Fields Shown | Use Case |
|----------|--------------|----------|
| Napkin   | 7 fields     | Quick feasibility |
| Standard | 11 fields    | Working analysis |
| Detail   | 15+ fields   | Institutional underwriting |

Mode selector appears in budget grid and other data-heavy components.

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
- Handsontable exists in legacy "Budget Grid Dark" - do not extend
- AG Grid, Glide Data Grid are installed but not preferred

### Styling

- **Tailwind CSS** - Primary styling approach
- **CSS variables** - Theme tokens in `src/styles/tokens.css`
- **Dark mode** - Supported via CoreUI theme provider
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

## Active Development Areas

### Current Focus (as of last update)

1. **Waterfall engine** - Financial waterfall calculations
2. **Zonda integration** - Market data ingestion
3. **DMS improvements** - Document extraction pipeline
4. **Landscaper-native UI** - AI-first interface redesign
5. **Lifecycle tiles** - Navigation redesign

### Known Technical Debt

- 50 TODO/FIXME markers across 40 files
- Multiple grid libraries need consolidation
- SWR + React Query both in use (standardize on React Query)
- Some MUI components mixed with CoreUI

### RAG/Knowledge System

- Embeddings in `knowledge_embeddings` table (pgvector)
- ~550+ document embeddings
- Sync processing endpoint: `POST /api/knowledge/documents/{doc_id}/process/`
- Claude integration for chat/analysis

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
2. Use CoreUI components as base
3. Follow PascalCase naming
4. Add 'use client' directive if using hooks/state
5. Implement all three complexity modes if data-heavy

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
- `docs/11-implementation-status/` - Current status

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

*Last updated: 2025-12-19*
*Maintainer: Update when architecture decisions change*
