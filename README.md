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

✅ **Standardized Project Types** - 7 official project type codes (Migration 013 - Nov 2025)
✅ **Universal Container System** - Production-ready flexible hierarchy (Area/Phase/Parcel OR Property/Building/Unit)
✅ **Comprehensive Data Layer** - 324 tables + 42 views in PostgreSQL
✅ **Unit-Level Multifamily** - Lease tracking, turn analysis, occupancy reporting
✅ **Lease Management** - Escalations, recoveries, percentage rent, rollover analysis
✅ **Dependency Engine** - Automated timeline calculation with circular detection
✅ **S-Curve Distribution** - 4 profiles for cost/revenue timing
✅ **GIS Integration** - Boundary mapping, parcel selection, AI document extraction
✅ **Market Intelligence** - Census ACS, BLS, FRED, FHFA data integration
✅ **Budget Grid** - Spreadsheet-like interface with inline editing
✅ **CI/CD Pipeline** - Neon branching + Vercel deployment automation

## 📚 Documentation

**All documentation is now centralized in the [/docs/](docs/) directory.**

### Quick Links

- **[Complete Documentation Index](docs/README.md)** - Master navigation guide
- **[CHANGELOG](archive/docs/CHANGELOG.md)** - Version history and recent changes
- **[Migration 013 Report](archive/docs/MIGRATION_013_EXECUTION_REPORT.md)** - Project type code standardization (Nov 2025)
- **[Django Backend Implementation](docs/DJANGO_BACKEND_IMPLEMENTATION.md)** - Django setup & admin panel
- **[Developer Guide](docs/00-getting-started/DEVELOPER_GUIDE.md)** - Setup and installation
- **[Quick Start Guide](docs/00-getting-started/QUICK_START_FINANCIAL_ENGINE.md)** - Get running in 5 minutes
- **[Financial Engine Status](docs/00_overview/IMPLEMENTATION_STATUS.md)** - Financial modeling status
- **[Database Schema](docs/05-database/DATABASE_SCHEMA.md)** - Complete schema reference
- **[API Reference](docs/03-api-reference/API_REFERENCE_PHASE2.md)** - API documentation
- **[DevOps Guide](docs/06-devops/DEVOPS_GUIDE.md)** - Deployment and operations
- **[Django Admin Guide](backend/ADMIN_ACCESS.md)** - Admin panel access

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
- **Next.js 15.5.0** with Turbopack
- **React 19.1.0** + TypeScript 5.x
- **Tailwind CSS 3.4.17** for styling
- **Material-UI 7.3.1** (DataGrid, Charts, DatePickers)
- **MapLibre GL 5.7.3** for GIS mapping
- **Handsontable 16.0.0** for budget grids

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

> **Note**: For a complete `/src/app` directory tree with all 35+ API routes, 15+ pages, and 25+ component categories, see [App-Development-Status.md](Documentation/App-Development-Status.md#application-file-structure)

## 🗄 Database Architecture

### Schemas
- **`landscape`** (ACTIVE) - 324 tables, 42 views - All application data
- **`land_v2`** (LEGACY) - 2 tables - Zoning glossary only (unused)

### Recent Additions (Migration 008 - Oct 14, 2025)

**Multifamily Property Tracking**:
- `tbl_multifamily_unit` - Unit inventory (8 sample units)
- `tbl_multifamily_lease` - Lease agreements (4 sample leases)
- `tbl_multifamily_turn` - Turn tracking (1 sample turn)
- `tbl_multifamily_unit_type` - Unit type master data (3 types)
- 5 reporting views for occupancy, expirations, turn metrics

## 📡 API Endpoints

### Multifamily (NEW)
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

See [Documentation/App-Development-Status.md](Documentation/App-Development-Status.md) for complete API reference.

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run API tests
npm run test:api

# Load test fixtures
./scripts/load-fixtures.sh
```

**Test Data Available**:
- Project 7 (Peoria Lakes Phase 1) - MPC with dependencies
- Project 8 (Carney Power Center) - Retail power center
- Project 9 (Peoria Lakes) - Multifamily sample (8 units, 4 leases)

## 📚 Documentation

- **[App-Development-Status.md](Documentation/App-Development-Status.md)** - Comprehensive development reference (2,300+ lines)
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Project status and roadmap
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Onboarding guide
- **[DEVOPS_GUIDE.md](project-docs/DEVOPS_GUIDE.md)** - CI/CD and deployment
- **[API_REFERENCE_PHASE2.md](project-docs/API_REFERENCE_PHASE2.md)** - API documentation

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

- SQL migrations live under `db/migrations/` with paired `*.up.sql` and `*.down.sql` files.
- Seed helpers and sample data for testing are in `docs/sql/universal_container_system.sql`.
- Architectural notes, API endpoints, and data contracts are documented in `docs/universal-container-system.md`.

## Market Assumptions Persistence

- Create table (run in Neon): `docs/sql/market_assumptions.sql`
- API:
  - `GET /api/assumptions?project_id=7`
  - `POST /api/assumptions` with `{ project_id, commission_basis, demand_unit, uom }`

# Optional (use at your own risk):
# 1) Remove quarantine flags (post-install)
xattr -dr com.apple.quarantine ~/Library/Caches/ms-playwright
# 2) Ad-hoc sign cached Chromium app bundles (deep) to stabilize helpers
#   Note: this is not notarized; may still fail under strict sandbox.
find "$HOME/Library/Caches/ms-playwright" -type d -name "*.app" -maxdepth 3 -exec codesign --force --deep --sign - {} \;
