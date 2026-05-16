# Landscape - Real Estate Development Financial Engine

A comprehensive Next.js application for land development and income property financial modeling with **ARGUS-level sophistication**.

## 🎯 Overview

Landscape provides enterprise-grade financial modeling capabilities for:
- **Land Development (LAND)** - Master-planned communities, subdivisions, and land entitlement with phasing, absorption, and lot sales
- **Multifamily (MF)** - Apartment communities with unit-level tracking, lease management, turns, and occupancy analysis
- **Office (OFF)** - Office buildings and business parks
- **Retail (RET)** - Shopping centers and retail properties
- **Industrial (IND)** - Warehouses, distribution centers, and industrial facilities
- **Hotel (HTL)** - Hotels and hospitality properties
- **Mixed-Use (MXU)** - Combined land + income + multifamily modeling

### Key Features

- **Project type codes** — 7 standardized codes (LAND, MF, OFF, RET, IND, HTL, MXU)
- **Universal hierarchy** — Flexible tree backed by `tbl_division` (Area/Phase/Parcel OR Property/Building/Unit). See `/landscape/CLAUDE.md` for the Nov 2025 rename history (`tbl_container` → `tbl_division`).
- **Multifamily** — Unit inventory, lease tracking, turn analysis, occupancy reporting
- **Lease management** — Escalations, recoveries, percentage rent, rollover analysis
- **Timeline engine** — Dependency-based scheduling with circular detection
- **S-Curve distribution** — 4 profiles for cost/revenue timing
- **GIS** — Boundary mapping, parcel selection, AI document extraction (native PDFs only; scanned-PDF OCR pipeline is outstanding)
- **Market intelligence** — Census ACS, BLS, FRED, FHFA integration
- **Budget grid** — Spreadsheet-style interface with inline editing
- **CI/CD** — Vercel deploys; Neon branching is set up but the per-PR preview database step is currently failing (see Testing section)

> Alpha status, not "production-ready." For current state, see `docs/09_session_notes/` (nightly automated daily syncs) — that stream is the source of truth for what's actually shipped vs. WIP.

## 📚 Documentation

All documentation lives under [/docs/](docs/).

### Quick Links

- **[Documentation index](docs/README.md)** — Top-level navigation
- **[Project instructions](docs/PROJECT_INSTRUCTIONS.md)** — Canonical rules shared across Claude systems (Cowork, Claude.ai, Claude Code)
- **[Developer guide](docs/00-getting-started/DEVELOPER_GUIDE.md)** — Setup and installation
- **[Quick start](docs/00-getting-started/QUICK_START_FINANCIAL_ENGINE.md)** — Get running fast
- **[Daily syncs](docs/09_session_notes/)** — Nightly automated status notes (CANONICAL recent state)
- **[Database schema](docs/05-database/DATABASE_SCHEMA.md)** — Schema reference
- **[API reference](docs/03-api-reference/API_REFERENCE_PHASE2.md)** — API documentation
- **[DevOps guide](docs/06-devops/DEVOPS_GUIDE.md)** — Deployment and operations
- **[Django admin guide](backend/ADMIN_ACCESS.md)** — Admin panel access
- **[CLAUDE.md](CLAUDE.md)** — Architecture facts, alpha readiness, high-risk zones (kept current session-by-session)

### Documentation Structure

```
docs/
├── 00-getting-started/      # Developer onboarding
├── 01-architecture/         # System design
├── 02-features/             # Feature documentation
│   ├── financial-engine/    # Financial modeling
│   ├── rent-roll/           # Rent roll interface
│   ├── dms/                 # Document management
│   ├── gis/                 # GIS & mapping
│   └── land-use/            # Land use management
├── 03-api-reference/        # API docs
├── 04-ui-components/        # UI documentation
├── 05-database/             # Database schema
├── 06-devops/               # DevOps & CI/CD
├── 07-testing/              # Testing docs
├── 08-migration-history/    # Historical records
└── 09-technical-dd/         # Due diligence
```

## 📦 Archive

Historical documentation and deprecated code is stored in `/archive/` for reference but is not actively maintained. This includes:

- **Phase completion documents** - Historical implementation status reports
- **Migration iterations** - SQL script iterations and experiments
- **Implementation reports** - Detailed phase and feature completion documentation
- **Setup guides** - Legacy machine setup instructions
- **Zip backups** - Historical code archives

> **Note:** If you need to reference historical implementation details, check the `/archive/` directory first. These files are gitignored and not deployed to production.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (Neon serverless)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd landscape

# Install dependencies
pnpm install  # or npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and API keys

# Run database migrations
./scripts/run-migrations.sh main

# Start development server
pnpm dev  # or npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Utility scripts
- `./scripts/git-push.sh "message"` stages all changes, updates `docs/session-notes`, commits, and pushes.

## 📊 Technology Stack

### Frontend
- **Next.js ^15.5.9** with Turbopack
- **React 18.2.0** + TypeScript 5.x
- **Tailwind CSS ^3.4.17** for styling
- **CoreUI React ^5.9.1** as the primary design system
- **Material-UI** (DataGrid only — being phased out of general UI)
- **MapLibre GL** for GIS mapping
- **AG-Grid Community** (rent roll) + **TanStack Table** (preferred for new grids)

> Always defer to `package.json` for the authoritative dependency versions — the list above can drift.

### Backend
- **Django 5.0.1** with Django REST Framework 3.14.0 ⭐ NEW (Oct 22, 2025)
- **Neon PostgreSQL** (serverless)
- **324 tables + 42 views** in `landscape` schema
- **Direct `pg` 8.13.1** + `@neondatabase/serverless` connections
- **Next.js App Router** API routes (legacy, being replaced)
- **Django Admin Panel** with smart dropdown fields

### AI/ML
- **Claude 3.5 Sonnet** (Anthropic) for document extraction
- **OpenAI GPT-4** for analysis
- **Python 3.12** market ingestion engine

## 📁 Project Structure

```
landscape/
├── backend/                           # Django Backend (NEW - Oct 22, 2025) ⭐
│   ├── config/                        # Django settings
│   ├── db_backend/                    # Custom PostgreSQL backend
│   ├── apps/                          # Django applications
│   │   ├── projects/                  # Projects app (COMPLETE)
│   │   ├── containers/                # Containers hierarchy app (COMPLETE)
│   │   ├── financial/                 # Budget/Actuals tracking (COMPLETE)
│   │   └── calculations/              # Python financial engine wrapper (COMPLETE)
│   ├── manage.py                      # Django CLI
│   ├── requirements.txt               # Python dependencies
│   ├── README.md                      # Backend documentation
│   └── ADMIN_ACCESS.md                # Admin panel guide
├── src/
│   ├── app/
│   │   ├── api/                       # Next.js API routes (legacy)
│   │   │   ├── multifamily/           # Multifamily APIs
│   │   │   ├── leases/                # Income property leases
│   │   │   ├── parcels/               # Parcel CRUD
│   │   │   └── projects/              # Project APIs
│   │   ├── components/                # React components
│   │   └── market/                    # Market intelligence page
│   ├── lib/                           # Utilities and libraries
│   │   ├── financial-engine/          # Calculation engines
│   │   └── db.ts                      # Database connection
│   └── types/                         # TypeScript definitions
├── docs/                              # Documentation
│   ├── DJANGO_BACKEND_IMPLEMENTATION.md  # Django backend guide (NEW) ⭐
│   ├── 00-getting-started/            # Setup guides
│   ├── 02-features/                   # Feature docs
│   └── 05-database/                   # Database schema
├── migrations/                        # Database migrations (001-008)
├── scripts/                           # Deployment and utility scripts
└── services/
    ├── financial_engine_py/           # Python calculation engine ⭐
    └── market_ingest_py/              # Python market data CLI
```

> For a current snapshot of routes, pages, and components, browse `src/app/` directly — the old `Documentation/App-Development-Status.md` reference was removed because the file no longer exists.

## 🗄 Database Architecture

### Schemas
- **`landscape`** (ACTIVE) - 324 tables, 42 views - All application data
- **`land_v2`** (LEGACY) - 2 tables - Zoning glossary only (unused)

### Recent work

For per-day change details, see `docs/09_session_notes/`. The "Migration 008 multifamily" line that used to live here was from October 2025 and has been superseded many times over; the multifamily tables (`tbl_multifamily_unit`, `tbl_multifamily_lease`, `tbl_multifamily_turn`, `tbl_multifamily_unit_type`) are now part of the standard schema, not "recent."

## 📡 API Endpoints (selected)

### Multifamily
- `GET/POST /api/multifamily/units` - Unit CRUD
- `GET/POST /api/multifamily/leases` - Lease management
- `GET/POST /api/multifamily/turns` - Turn tracking
- `GET /api/multifamily/reports/occupancy` - Occupancy analysis
- `GET /api/multifamily/reports/expirations` - Lease expirations

### Projects & Planning
- `GET /api/projects` - List all projects
- `GET/POST /api/parcels` - Parcel management
- `GET /api/phases` - Phase hierarchy

### Financial
- `GET /api/budget/items` - Budget line items
- `POST /api/projects/[id]/timeline/calculate` - Timeline calculation
- `GET /api/leases` - Lease management

See [`docs/03-api-reference/API_REFERENCE_PHASE2.md`](docs/03-api-reference/API_REFERENCE_PHASE2.md) for the documented API surface, or browse `backend/apps/*/urls.py` (Django) and `src/app/api/` (legacy Next.js routes) for the live endpoint list.

## 🧪 Testing

```bash
# Theme tokens + design-token contrast (default `npm test`)
npm test

# Playwright UI mode (interactive)
npm run test:ui

# Playwright headless
npm run test:headless
```

> **Heads-up — `npm test` is not green on a stock checkout.** The default `test` script runs the Jest token suite (passes) followed by the Playwright contrast suite (`tests/e2e/contrast.e2e.spec.ts`). The Playwright suite requires the Chromium browser binary, which is not automatically installed. On a clean clone you'll need:
>
> ```bash
> npx playwright install chromium
> ```
>
> Until that runs (or the Playwright step is excluded from the default), `npm test` will fail at the contrast suite even though the underlying styling is fine. No `npm run test:api` script exists; ignore older docs that reference one.

### Reference projects in the database

- Project 7 — Peoria Lakes Phase 1 — Master-planned community with dependencies
- Project 9 — Peoria Meadows — Land development demo (canonical test project)
- Project 17 — Chadron Terrace — Multifamily demo
- Project 8 — Carney Power Center — Retail power center

Demo provisioning for new alpha testers is automated via the `clone_demo_projects` Django management command (clones Chadron Terrace + Peoria Meadows into each new alpha-tester account on first login).

## 🔧 Development

### Database Schema Cheat Sheet

```bash
# Generate live schema markdown
DATABASE_URL=postgres://... npm run schema:md
# Output: docs/db-schema.md
```

**Database Info**:
- Host: `ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech`
- Database: `land_v2`
- Active Schema: `landscape` (324 tables, 42 views)
- Legacy Schema: `land_v2` (2 tables - unused)

**Connection Methods**:
- `@neondatabase/serverless` - Serverless SQL queries (most APIs)
- `pg` 8.13.1 - Direct PostgreSQL Pool (multifamily APIs)
- See `src/lib/db.ts` for connection helpers

**Note**: Prisma is not used. All database access is via direct SQL queries.

### Universal Container System

The hierarchy is backed by `tbl_division` (renamed from `tbl_container` in migration 025, Nov 2025). Migrations live under `migrations/` and `backend/db/migrations/` with paired `*.up.sql` and `*.down.sql` files. For the full rename history, lingering column-name drift, and high-risk-zone notes, see `/landscape/CLAUDE.md` § "Universal Container System."

## Playwright on macOS — optional workarounds

If Playwright Chromium fails to launch on macOS due to system sandboxing:

```bash
# Optional, use at your own risk:
# 1) Remove quarantine flags (post-install)
xattr -dr com.apple.quarantine ~/Library/Caches/ms-playwright
# 2) Ad-hoc sign cached Chromium app bundles to stabilize helpers (not notarized)
find "$HOME/Library/Caches/ms-playwright" -type d -name "*.app" -maxdepth 3 \
  -exec codesign --force --deep --sign - {} \;
```

Helper scripts also live in `scripts/`:
- `npm run pw:diag` — diagnose Playwright Chromium issues on Sonoma
- `npm run pw:use-bundled` — switch to bundled Chromium
- `npm run pw:use-system` — switch to system Chromium
