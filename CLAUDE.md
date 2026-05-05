# Landscape - AI-Powered Real Estate Analytics Platform

> **Purpose:** This file provides persistent context for Claude Code sessions. Read automatically at session start.

---

## Project Rules (Canonical)

> **Read at session start, alongside this file.** Behavioral rules — communication style, CC prompt structure, anti-patterns, dual-output spec delivery, downstream-impact analysis, token economy, tool verification, PDF/OCR protocol — live in a single canonical file shared across all Claude systems (Claude Code, Cowork, Claude.ai, Claude Design):
>
> **`/landscape/docs/PROJECT_INSTRUCTIONS.md`**
>
> **Division of responsibility:**
>
> - **This file (`CLAUDE.md`)** — codebase facts: architecture, schema, alpha status, current Landscaper tool count, recent decisions. Updated session-by-session.
> - **`PROJECT_INSTRUCTIONS.md`** — behavioral rules and cross-system policy. Updated when policy changes.
>
> When the two files disagree on a behavioral rule, `PROJECT_INSTRUCTIONS.md` wins. When they disagree on a codebase fact (file path, table name, tool count, alpha status), `CLAUDE.md` wins.
>
> **Editing discipline.** When `PROJECT_INSTRUCTIONS.md` is edited, the editor must also mirror the change into Cowork project settings and Claude.ai project knowledge. The repo file is the source of truth; the other two are mirrors.

---

## Project Overview

Landscape is an AI-powered real estate analytics platform targeting land developers and commercial real estate professionals. It's positioned as a modern alternative to ARGUS, with emphasis on:

- **Progressive complexity:** "Napkin to tablecloth" - simple inputs that can grow into institutional-grade analysis
- **AI-native features:** Document extraction, market intelligence, persistent knowledge base
- **Universal container architecture:** Same data model works across all property types (land dev, multifamily, office, retail, industrial)

**Primary test project:** Peoria Meadows MPC (Master Planned Community) - 42 parcels across 4 areas and 8 phases.

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
│ market_agents   │    │ numpy-financial     │
│ financial_engine│    │                     │
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
│   ├── market_ingest_py/     # Market data ingestion
│   └── market_agents/        # AI market research agents (FRED, orchestrator, Discord)
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

### Interior Padding Standard (CCard Sections)

All assumption/form panels inside CCards must follow the Loan Card padding standard:

| Element | Padding/Gap | Reference |
|---------|------------|-----------|
| Card body | `padding: 0` (content fills card) | `.loan-card .card-body` |
| Card header | `padding: 8px 12px` | `.loan-card .card-header` |
| Section grid (outer) | `padding: 8px; gap: 8px` | `.loan-assumptions-grid` |
| Column internal gap | `gap: 8px` | `.loan-assumptions-column` |
| Section header | `padding: 6px 12px` | `.loan-assumption-header` |
| Form row | `padding: 2px 8px` | `.loan-assumption-row` |
| Input fields | `padding: 3px 6px; height: 28px` | `.loan-assumption-row input` |

**Key principles:** Compact density. Labels and values use `justify-content: space-between` within tight columns. No excess margin. Section borders use `var(--cui-border-color)`.

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
- Test on Peoria Meadows project before committing
- `*.sql` is gitignored globally; new migrations need `git add -f` (a `!migrations/*.sql` unignore was tried and reverted in `LSCMD-GITIGNORE-CLEANUP-0501-DA44` — it surfaced ~60 inert historical SQL files with real code/doc references)

---

## Feedback Tracker + Daily Brief

### Purpose

Captures `#FB`-tagged messages from the Help panel for tracking, surfaces open items in a nightly HTML brief, and supports lifecycle management (open → in_progress → closed) via Django management commands.

### Table: `landscape.tbl_feedback`

| Column | Purpose |
|--------|---------|
| `id` | Sequential PK; rendered publicly as `FB-{id}` (e.g., FB-247) |
| `created_at` | When the feedback was reported |
| `user_id`, `user_name`, `user_email` | Reporter (when known) |
| `page_context` | Where in the app it was reported (e.g., `Help > Documents`) |
| `project_id`, `project_name` | Project context (when known) |
| `message_text` | The feedback content (with `#FB` tag stripped) |
| `status` | Lifecycle: `open` \| `in_progress` \| `addressed` \| `closed` \| `wontfix` \| `duplicate` |
| `source` | Capture origin: `help_panel` (live) \| `backfill` (historical) \| `manual` |
| `addressed_at`, `closed_at`, `started_at` | Lifecycle timestamps |
| `resolved_by_commit_sha`, `resolved_by_commit_url` | Set by auto-resolution from commit messages |
| `resolution_notes`, `duplicate_of_id` | Set by `close_feedback` CLI |
| `in_progress_branch`, `in_progress_session_slug` | Set by `start_feedback` CLI |
| `discord_message_id`, `discord_posted_at` | Discord webhook bookkeeping |
| `source_help_message_id` | For `backfill` rows: FK to `tbl_help_message.id` so the original LLM reply can be surfaced in the brief |

### Capture path

`POST /api/landscaper/help/chat/` — when `#FB` is detected:
1. Forwards the feedback to a Discord webhook (`LANDSCAPER_FEEDBACK_WEBHOOK_URL`)
2. Inserts a row into `tbl_feedback` with `source='help_panel'`
3. Bypasses `get_help_response()` (LLM) entirely
4. Returns `"Feedback received, thanks! (FB-N)"` so the user has a public reference

### Management commands

| Command | Purpose |
|---------|---------|
| `python manage.py list_feedback [--status open] [--limit 50]` | Print open (or filtered) FB items to stdout |
| `python manage.py close_feedback FB-N --note "..." [--status closed\|wontfix\|duplicate] [--duplicate-of N]` | Close an item; allows transitioning from `open` or `in_progress` |
| `python manage.py start_feedback FB-N --branch <branch> --session <slug>` | Flip an item to `in_progress` and stamp the branch + session working on it |

Both bare ID (`123`) and `FB-N` form (`FB-123`) are accepted.

### Auto-resolution

Commit messages matching the regex `(?i)\b(?:fixes|closes|resolves)\s+FB-(\d+)\b` are parsed by the brief generator. Matched rows flip from `open` to `addressed` with `resolved_by_commit_sha` populated. Examples that fire auto-resolution:

- `fix(docs): closes FB-282 — thumbnail loader uses correct CDN`
- `feat: resolves FB-188 by gating county selector behind Phoenix MSA check`

### Daily Brief

| Property | Value |
|----------|-------|
| Generator | `scripts/brief/generate_daily_brief.py` |
| Schedule | Nightly 23:30 local via launchd (`~/Library/LaunchAgents/com.landscape.daily-brief.plist`) |
| Output | `~/.../OneDrive/.../Landscape app/daily-brief/YYYY-MM-DD-brief.html` + `current.html` |
| Sections (in order) | Summary · Work In Progress · Today's Sessions (rolling 3-day) · Open Feedback · Resolved Recently · Parallel Sessions · Uncommitted · System Status |

### Manual labels (read by the brief)

- `.claude/branch-labels.json` — per-branch `{title, description, cowork_chat, status_note}`. WIP section enumerates branches ahead of `main` and looks each up.
- `.claude/sessions.json` — rolling list of `{date, topic, cowork_chat, cc_session}` entries. Today's Sessions filters to last 3 days.

Both files are hand-maintained for now. Append entries when starting new branches or sessions.

### Page tag mapping

Brief renders `page_context` values via `PAGE_TAG_MAP` in the generator. Strip the `Help > ` prefix, look up the remainder. Fallback: title-case the slug. Hardcoded for v1; should move to a lookup table later.

### Known data state

282 `backfill` rows seeded from historical `tbl_help_message` user messages (Feb-19-onward demo + real-feedback mix). Brief filters them out of Section 1 by default; surface only via `list_feedback --status open --source backfill` (CLI flag not yet implemented but query is straightforward).

### Spec

Full design lives in `Landscape app/LANDSCAPE_DAILY_BRIEF_SPEC.md` (OneDrive workspace folder). Plain-English version: `Landscape app/LANDSCAPE_DAILY_BRIEF_OVERVIEW.html`.

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

## Alpha Readiness Assessment (Audited 2026-04-30)

### Target Workflow: MF Appraiser Valuation

**Overall Status: ~92% Alpha-Ready on the legacy `/projects/[id]` surface.** Core valuation workflow functional; reconciliation, reports, and operations save complete. Demographics + location intelligence promoted to working with caveats. Known remaining alpha gap is the scanned-PDF / OCR pipeline. The chat-first `/w/` surface is the active design target but is not the alpha shipping surface — alpha is measured against the legacy folder/tab UI.

### Feature Status by Workflow Step

| Step | Feature | Status | Key Gap |
|------|---------|--------|---------|
| 1 | Project Creation | ✅ WORKS | Landscaper now supports pre-project chat with location-brief tool; full project-creation handoff still has gaps |
| 2 | Document Upload & Extraction | ⚠️ PARTIAL | Ingestion Workbench shipped; scanned-PDF / OCR pipeline still not implemented (OCRmyPDF identified as preferred) |
| 3 | Document Management | ✅ WORKS | Full DMS + 4 Landscaper management tools (rename, profile-update, move, reprocess) |
| 4 | Property Tab | ✅ WORKS | Rent roll, units, leases complete |
| 5 | Market / GIS | ✅ WORKS | Geo auto-seeding for US cities (Mar 2026), on-demand state-level demographics loading, μSA support, location brief tool. Caveat: ACS data lags 2–3 years and underreports in resort/luxury markets |
| 6 | Operations Tab | ✅ WORKS | Full P&L migrated to Django (GET + save); new `get_operating_statement` Landscaper tool renders P&L as an artifact |
| 7 | Landscaper Chat | ✅ WORKS | ~268 tools (artifacts system + get_operating_statement added Apr 25–30); thread-based with unassigned (pre-project) threads, tightened firing discipline, cross-property fabrication blocked |
| 8 | Sales Comparison | ✅ WORKS | Full grid + adjustments + map |
| 9 | Cost Approach | ✅ WORKS | Land + improvements + depreciation |
| 10 | Income Approach | ✅ WORKS | Direct Cap + DCF, 3 NOI bases + expense comps |
| 11 | Reconciliation | ✅ WORKS | Weights, narrative versioning, IndicatedValueSummary |
| 12 | Capitalization | ✅ WORKS | Waterfall calc endpoint wired (Next.js proxy → Django → Python engine) |
| 13 | Reports | ✅ WORKS | 20 generators with real SQL + PDF/Excel export; all generators produce preview data with graceful degradation |
| 14 | Knowledge Base | ⚠️ PARTIAL | RAG works (3-source retrieval including cost library + benchmarks), pgvector Phase 2, no Library UI |
| 15 | Artifacts System | ✅ WORKS | Phases 1–5 shipped Apr 25–30: storage, tools, renderer, right-panel workspace, firing rules, dependency cascades, chat cards, real update path, OS guard with three-subtype taxonomy + single-table mandate + canonical 3-col shape, universal tabular formatting standard (parens negatives, em-dash zero, no $, bold subtotals/grand totals, numeric-only rules, indent depths, section-divider merge with column labels) |

### Alpha Blockers (Priority Order)

1. ~~**Reconciliation frontend**~~ — ✅ RESOLVED (Feb 21). ReconciliationPanel + IndicatedValueSummary built.
2. ~~**Operations save migration**~~ — ✅ RESOLVED (Mar 27). Django endpoints created (`views_operations.py`), frontend hooks + OperationsTab updated to call Django. GET (P&L) still on legacy Next.js — separate migration task.
3. ~~**Reports project scoping**~~ — ✅ RESOLVED (Mar 27). All 20 generators have real SQL with graceful degradation. PDF export via reportlab + Excel export via openpyxl. `data_readiness` flags updated (migration 0006).
4. ~~**Waterfall calculate endpoint**~~ — ✅ RESOLVED (verified Mar 27). Endpoint is fully wired: Next.js proxy → Django calculations app → Python financial engine. Was incorrectly flagged as 404.
5. **Extraction pipeline** — Ingestion Workbench implemented and committed. Known gap: scanned PDF / OCR pipeline not yet implemented (OCRmyPDF identified as preferred solution).
6. ~~**PDF report generation**~~ — ✅ RESOLVED (Mar 25). reportlab PDF export + openpyxl Excel export in preview_base.py. Lazy import for Railway compatibility.

### Known Technical Debt

- 50 TODO/FIXME markers across 40 files
- Multiple grid libraries need consolidation (TanStack preferred for new; AG-Grid retained in rent roll)
- SWR + React Query both in use (standardize on React Query)
- Some MUI components mixed with CoreUI
- ~~Operations GET endpoint~~ — RESOLVED (Apr 1). P&L GET migrated to Django (`views_operations.py`, +958 lines). Legacy Next.js route retained as dead code pending production confirm
- Reports system complete: 20 generators with real SQL + PDF/Excel export; data_readiness flags updated
- pgvector column commented out in Knowledge embeddings model
- Scanned PDF / OCR pipeline not yet implemented (OCRmyPDF identified as preferred solution)
- Code-side cross-property entity guard (post-alpha) — `e27123e` added the BASE_INSTRUCTIONS rule blocking Landscaper from fabricating data across mismatched property names (finding #10), but the entity creation path still permits a `canonical_name` that conflates two property names (e.g. "BROWNSTONE APARTMENTS (CHADRON TERRACE)"). Add a server-side guard in the entity write path so the prompt rule is backed by code enforcement

### Navigation Architecture

The application has two coexisting navigation surfaces. Active development is on the chat-first surface; the legacy folder/tab surface is retained but no longer the design target.

**Primary (chat-first / unified UI) — `/w/` route layer.** This is the target experience and the active line of work on `feature/unified-ui`. Three-panel shell: left sidebar (project list + recent threads), center Landscaper chat, right context-aware artifacts/content panel. Routes include `/w/projects`, `/w/projects/[projectId]`, `/w/chat`, `/w/chat/[threadId]`, `/w/admin`, `/w/help`, `/w/tools`, `/w/landscaper-ai`. See the "Chat Canvas / Unified UI" section below for component-level detail.

**Legacy (folder/tab) — `/projects/[id]` route.** The original ARGUS-style 8-folder layout with two-row tabs and `?folder={folder}&tab={tab}` URL state. `ProjectContentRouter.tsx` still maps folder/tab combos to legacy components, and `FolderTabs.tsx` and `useFolderNavigation.ts` are still wired. The `folderTabConfig.ts` config file no longer exists — only a stranded test (`folderTabConfig.test.ts`) references it. Post-login lands here today; cutover to `/w/` as the default destination is pending.

**Implication for new work:** new product surfaces should be built into the `/w/` shell (with right-panel artifacts and Landscaper as the primary navigation), not as new folders/tabs in the legacy layout.

### Landscaper Architecture

- **Center panel in the chat-first UI** (`/w/` shell). Landscaper is the primary navigation surface — sidebar on the left, Landscaper chat in the center, artifacts/content on the right. In the legacy `/projects/[id]` layout, Landscaper still renders as a left flyout panel (320px, collapsible to a 64px strip), but new surfaces should target the chat-first layout.
- Claude AI with **264 registered, 261 advertised** (`@register_tool` decorator + dict-based registration, verified via registry inspection; 3 LoopNet tools registered but not advertised — see deferral note below; +2 this session: `run_sources_uses` Phase 6 + `compute_trust_score` Phase 7) — includes 5 ingestion-specific tools + 3 parcel import tools + 4 appraisal knowledge tools added Mar 2026 + `update_land_use_pricing` + `open_input_modal` + 5 excel_audit tools added Apr 2026 + `generate_map_artifact` (interactive MapLibre maps in artifacts panel, with pin-placement input mode for projects missing coordinates) + 8 P1 analysis tools added Apr 2026 (`list_projects_summary`, `get_deal_summary`, `get_data_completeness`, `calculate_project_metrics`, `calculate_cash_flow`, `generate_report_preview`, `export_report`, `list_available_reports`) + 3 P2 analysis tools added Apr 2026 (`get_demographics`, `calculate_waterfall`, `calculate_mf_cashflow`) + 6 CRUD gap fixes Apr 21 (3 expense comparable tools, 3 acquisition event tools) + 4 DMS management tools Apr 21 (`rename_document`, `update_document_profile`, `move_document_to_folder`, `reprocess_document`) + ~~3 LoopNet deal-sourcing tools Apr 21~~ **DEFERRED 2026-04-25 (gx14)** — Akamai SCF challenge hard-blocks LoopNet from datacenter IPs (Railway egress), and Crexi recon found the public JSON API gates filters behind auth + Google Place IDs. Schemas removed from `tool_schemas.py`; `loopnet_tools.py` and the `loopnet-mcp` Railway service remain for revival once a paid feed (ATTOM/Reonomy) is procured post-alpha + 3 cost-taxonomy tools Apr 21 (`delete_budget_category` soft-delete with child-safety check, `get_category_lifecycle_stages` and `update_category_lifecycle_stages` for the `core_category_lifecycle_stages` junction against `VALID_ACTIVITIES` = Acquisition/Planning & Engineering/Improvements/Operations/Disposition/Financing). Same commit added Source 3 to `query_platform_knowledge` RAG retrieval — ILIKE text-match bridge into `core_unit_cost_item` and `tbl_global_benchmark_registry` so cost library + benchmark data surface alongside document chunks + `generate_location_brief` Apr 23 — universal, pre-project, property-type-aware economic brief (Nominatim geocoding + FRED + Census ACS 5-Year 2023 + Anthropic narrative). Renders in right artifacts panel on `/w/chat` unassigned routes. Persistent cache in `landscape.tbl_location_brief` keyed on `(user_id, location_key, depth)` with release-schedule invalidation (FRED `next_release`, ACS annual Dec 15 drop). Depth tiers: condensed (~1400 tok) / standard (~2400) / comprehensive (~4000). Registered in both `UNIVERSAL_TOOLS` and `UNASSIGNED_SAFE_TOOLS`
- **Location brief firing discipline** (Apr 25, S7 v2 verified): `generate_location_brief` fires ONLY on explicit artifact-noun triggers (brief, report, overview, profile, snapshot, summary). Soft asks ("how's the market", "tell me about [city]") trigger an OFFER pattern with template phrase ("I can pull together a location brief... would you like that?"), not autonomous generation. Context-only statements ("I'm evaluating a deal in...") trigger a follow-up question, not a brief. Rules live in `tool_schemas.py` description + `BASE_INSTRUCTIONS` "LOCATION BRIEF — STRICT FIRE/OFFER RULES" section in `ai_handler.py`. Verified by S7 v2 calibration: 91% pass rate (32/35), all 4 category thresholds met. Same discipline should apply to any future artifact-generating tool — do not write tool descriptions like "use when the user asks about X" without an explicit-trigger constraint.
- Level 2 Autonomy: propose mutations → user confirm/reject
- Thread-based chat with per-page context awareness
- RAG: DB-first queries → embedding retrieval → AI response
- Activity feed + extraction logs + scenario management
- **Silent failure risk:** ALLOWED_UPDATES field mappings must match actual DB column names exactly — always verify tool writes against the DB directly, not just API response codes
- **Comp tools:** Use unified comparables table with `property_type` discriminator — not separate land/MF tables
- **Unassigned threads:** Backend supports `project_id IS NULL` threads (pre-project chat). Most tools require project context and will fail gracefully; only `UNIVERSAL_TOOLS` work without a project. See `docs/02-features/chat-canvas-tool-gaps.md` for full audit.

### Chat Canvas / Unified UI

The chat-first navigation layer is the primary target experience. The legacy ARGUS-style 8-folder layout is retained but no longer the design target. Active development happens on `feature/unified-ui`; merge to main is pending. Until cutover, post-login still lands on the legacy `/dashboard` route.

**Route structure:** `/w/` prefix — `src/app/w/layout.tsx` (shell), `/w/projects/` (project list), `/w/projects/[projectId]/` (project view), `/w/chat/` (unassigned chat), `/w/chat/[threadId]/` (specific thread).

**Layout components** (`src/components/wrapper/`):
- `PageShell.tsx` — outer 3-panel frame (sidebar + center + right)
- `WrapperSidebar.tsx` — left nav with project list + recent threads
- `CenterChatPanel.tsx` — Landscaper chat with thread-aware header
- `RightContentPanel.tsx` — context-aware right panel (project content, artifacts, docs)
- `ProjectHomepage.tsx` — project landing page with tile grid
- `ProjectArtifactsPanel.tsx` — collapsible artifacts panel with toggle
- `ProjectContentWrapper.tsx` — bridges wrapper layout to existing project components
- `WrapperUIContext.tsx` — panel visibility state (sidebar, right panel, artifacts)

**Key features:**
- Hamburger (☰) toggles for panel visibility
- Property type badges on project tiles (rectangular, 4px radius, uppercase)
- Thread titles displayed in chat header
- Chat background: `#1A1E28`
- Modal bridge system (`src/components/wrapper/modals/`) for acquisition, reconciliation modals
- DocumentsPanel refactor in `src/components/wrapper/documents/` (+630 lines)
- URL-based thread identity: `/w/chat/[threadId]` routes drive thread selection via `useLandscaperThreads` hook (Apr 22)
- Chat search overlay (`ChatSearchOverlay.tsx`) — search across thread history from center panel
- Collapsible sidebar sections (Projects / Recent Threads) with persistent toggle state
- 10 workflow recipes injected into Landscaper system prompt (`ai_handler.py`) for guided multi-step workflows
- Draggable right panel width (320–900px, 420px default, left-edge handle) on `/w/chat` aside and `ProjectArtifactsPanel` (Apr 23)
- `LocationBriefArtifact.tsx` — renders `generate_location_brief` output with tabular indicator tiles + condensed exec summary toggle; hardcoded light palette avoids dark-mode bleed (Apr 23)
- `CreateProjectCTA.tsx` — contextual "Create Project" prompt shown when location brief resolves city/state/property type

**Backend support** (migration `0003_unassigned_threads.sql`):
- `landscaper_thread.project_id` now nullable — enables pre-project conversations
- `tool_registry.py` routes only `UNIVERSAL_TOOLS` to unassigned threads
- `thread_service.py` updated to handle null project context
- `ai_handler.py` skips project lookup for unassigned threads

### Artifacts System (Implemented incrementally — Apr 2026)

Persistent, versioned visual outputs that render in the right panel of the chat-first UI. Artifacts replace one-shot inline tool output with a durable, addressable, dependency-aware surface. Phases 1 through 4.5 shipped between Apr 25–30, 2026.

**Phase 1 — Storage + tools + REST.** New tables for artifacts and version history. New Landscaper tools: `create_artifact`, `update_artifact`, `get_artifact_history`, `restore_artifact_state`, `find_dependent_artifacts`. REST endpoints for read, create, update, version restore.

**Phase 2 — Renderer.** `ArtifactRenderer` component, type definitions, hook for retrieval, dedicated test route. Single component dispatches to per-artifact-type sub-renderers (location brief, operating statement, map, Excel audit, etc.).

**Phase 3 — Right-panel workspace.** Artifact state + auto-open dispatch wired into the `/w/` shell. New artifacts surface in the right panel automatically when Landscaper creates them; existing artifacts are addressable from the sidebar.

**Phase 4 — Firing rules + cascades + chat cards + real update path.** System-prompt firing rules govern when Landscaper auto-creates an artifact vs. asking. Dependency hooks let one artifact trigger refresh of dependent artifacts. Chat cards render compact previews inline in the chat thread that link to the full artifact in the right panel. Update path is real (not append-only) — artifacts can mutate in place with version history retained.

**Phase 4.5 — Firing discipline + new tool + flat rendering.** Tightened firing rules to reduce false-positive auto-creation. New tool `get_operating_statement` (P&L pulled and rendered as an artifact). "Flat" rendering mode for tabular artifacts that don't need a custom visual.

**Phase 5 (Apr 30, 2026) — Operating-statement guard + tabular formatting standard (Item #1 from F4 handoff).** Hard programmatic enforcement of operating-statement rendering spec, plus a universal tabular formatting standard that applies to every tabular artifact going forward.

*Operating-statement guard* (`backend/apps/artifacts/operating_statement_guard.py`). Three-subtype taxonomy: `t12` (pure historical), `f12_proforma` (T-12 trended forward via project growth assumptions; ~90% of "show me a proforma" requests), `current_proforma` (asking/market rents). Rules enforced on `create_artifact` for any artifact whose title contains operating-statement keywords:
- **Subtype declaration required** — `create_artifact` accepts an `artifact_subtype` enum field; missing/invalid → `subtype_required` / `invalid_subtype` rejection.
- **Single-table mandate** — exactly one top-level `table` block; no top-level `section` blocks (would render duplicate headings); no multiple sibling tables. Rejection codes: `section_block_in_os`, `multiple_tables_in_os`.
- **Canonical 3-column shape** — `line` / `annual` / `per_unit`. Forbidden columns: `units`, `rate`, `per_sf`. Rates go INLINE in line labels (e.g., "Less: Physical Vacancy (9.7%)", "Management Fee (3.0%)"). Unit counts belong on a Rent Roll artifact. Rejection codes: `os_table_missing_required_columns`, `os_table_forbidden_columns`.
- **Property-metadata blocked** — `kv_grid` pairs whose label matches `units`, `square feet`, `year built`, `address`, `apn`, `parcel`, `zoning`, `stories` are rejected (`property_metadata_in_os`). Property name and reporting period remain allowed (carried in the title).
- **T-12-only content rules** — unit-type rows (1BR/1BA, Studio, etc. via regex `_UNIT_TYPE_ROW_REGEX`) and forbidden columns (Market Rent / Asking Rent / Pro-Forma Rent) rejected for T-12 only; allowed for F-12 and current_proforma.
- **Source-data presence** — T-12 needs operations data (`core_fin_fact_actual` rows OR an extracted operating-statement / OM / financial-model / appraisal / diligence doc via doc_type pattern, OR fallback to any `core_doc` with `core_doc_text` content). Current_proforma additionally needs market-rent data (`tbl_multifamily_unit.market_rent > 0` OR `tbl_rent_roll_unit.market_rent > 0` OR `tbl_multifamily_unit_type.market_rent > 0` OR rent-roll/OM/market-study doc). Missing → rejection with `suggested_user_question` field that LS relays verbatim to the user instead of fabricating.
- All rejections carry `code`, `subtype`, `missing`, `guidance`, `suggested_user_question` so the model's retry-on-error path in BASE_INSTRUCTIONS can recover with a clean user-facing question.

*Universal tabular formatting standard* (renderer-side — `src/components/wrapper/ArtifactRenderer.tsx`, `ArtifactRenderer.module.css`). Applies to every table-block artifact, not just operating statements:
- **Number format:** `formatCellValue` helper. Positives `1,234` (thousand separators); negatives `(1,234)` (parens, no minus); zero/null `—` (em dash); no decimals; no `$` symbol. Same helper applied to `kv_grid` pair values.
- **Bold + rules:** `detectRowRole(row, columns)` and `detectPairRole(label)` heuristics classify rows/pairs as `subtotal` (Gross Potential Rent, Effective Gross Income, Total Operating Expenses, etc.) or `grand_total` (Net Operating Income). Subtotals get bold + top rule on numeric cells; grand totals get bold + top + bottom rule. Anti-keywords (`per unit`, `per sf`, `expense ratio`, `ratio`) prevent false-positive bolding on summary metrics.
- **Section dividers + indent:** `classifyRow` returns `'section_divider' | 'subsection' | 'subtotal' | 'grand_total' | 'line_item'`. `_isLabelOnlyRow` heuristic distinguishes label-only rows (only the label cell populated) from line items. Stateful `inSubsection` tracking sets line-item depth (1 if directly under a section, 2 if under a subsection). CSS `.depth1` / `.depth2` apply `padding-left` to the label cell with drift-cell-aware fallback.
- **Single column-label row:** when the artifact has section_divider rows, the standalone `<thead>` is suppressed. Only the FIRST section_divider carries the column labels (Annual / $/Unit) in numeric cells with bottom-border underline. Subsequent dividers (Operating Expenses after Income) get `.sectionDividerNoHeader` class — section name only, blank numeric cells, no underline.
- **Numeric-only borders:** all bottom/top rules (section_divider header underline; subtotal top rule; grand-total top + bottom rule) apply only to numeric cells via `:not(:first-child)` + `.driftCell + td` overrides. The label cell never carries a border.
- **Subsection rows:** label-only rendering with blank (not em-dash) numeric cells. Em-dash placeholders only appear on line-item rows where the value is genuinely zero/null.
- **Tabular formatting memory** (Cowork-side): `feedback_tabular_artifact_formatting.md` codifies the standard so future Cowork sessions apply the same rules to new artifact types without re-litigation.

*BASE_INSTRUCTIONS migration pending.* The Pass-5+ guard rules supersede ~80 lines of T-12 strict content rules currently in `backend/apps/landscaper/ai_handler.py`. Removing those lines would drop BASE_INSTRUCTIONS back under the 15K soft ceiling; deferred until Pass 5 is observed stable in production.

*Header buttons + drag handle (Pass 5).* `ArtifactRenderer` Edit/Pin/Save-version buttons converted to icon-only with tooltips so the title stops getting truncated when the panel is narrow. Drag handle on the artifact panel's left edge made discoverable: 6px wide with `var(--cui-border-color)` background at 0.5 opacity, hover state to `var(--cui-primary)` at full opacity. Function unchanged — only visibility.

**Pattern for new tools:** any tool whose output is a durable visual or report should produce an artifact, not return a JSON blob inline. Follow the same explicit-trigger discipline used by `generate_location_brief` (see Landscaper Architecture above) when writing the tool description. For tabular artifacts, the renderer's universal formatting (number format, bold rules, borders, section dividers, indent depths) applies for free — no per-artifact CSS work needed unless the artifact has unique structural rules requiring schema-level enforcement (like the OS guard).

Server-side port of the Cowork `excel-model-audit` skill. Purpose: on any Excel upload, Landscaper can (a) classify the workbook, (b) run formula-integrity checks, (c) extract labeled assumptions to `ai_extraction_staging` with `source: excel_audit`, (d) Python-replicate waterfall + debt math to verify Excel's computed values, and (e) render an HTML audit report.

**Location:** `backend/apps/knowledge/services/excel_audit/` (pipeline modules) + `backend/apps/landscaper/tools/excel_audit_tools.py` (tool wrappers).

**Tier-based routing (Phase 0):** `flat` (tabular, no meaningful formulas) / `assumption_heavy` (labeled inputs across sheets) / `full_model` (waterfall/debt/CF). Landscaper calls `classify_excel_file(doc_id)` first, then decides how deep to audit.

**Scope locked in (gx27–gx31):** Universal Landscaper tool, works pre- and post-project. Scenario mode runs against DB inputs via Landscape financial engine only — LibreOffice-backed what-if on the uploaded workbook is deferred. Project creation gate (Excel-vs-engine cross-comparison) is explicitly out of scope.

**Phases implemented (as of Apr 27, 2026):** 0 (classifier), 1 (structural_scan), 2 (formula_integrity — 2a error cells, 2b broken refs, 2c hardcoded overrides, 2e range consistency), **2f (downstream impact tracer — `impact_tracer.py`; BFS forward from errors to headline outputs IRR/EM/DSCR/net CF, auto-run for `full_model` tier; returns `impact_summary` with `errors_reaching_headline` vs `errors_quarantined`)**, 3 (assumption_extractor), 4 (waterfall_classifier), **6 (sources_uses — `sources_uses.py`; locates S&U schedule via label anchors, balance check within $1, gap > $100 flagged as finding)**, **7 partial (`trust_score.py` aggregator — weighted 0-100 score across all persisted phases; profile-aware per skill spec; v3-style verdict block in `ExcelAuditArtifact.tsx`; HTML report file generation deferred)**. Phase 5 (Python waterfall replication) is the only major follow-on piece — when it lands, trust score's `python_replication` component goes from 0% to up-to-100% and the headline status flips from `partial` → `verified`.

**Phase 4 (waterfall classifier) added Apr 2026.** Tool: `classify_waterfall(doc_id)`. Returns `waterfall_type` enum (`tiered_irr_hurdle` | `pref_then_split` | `pref_catchup_split` | `em_hurdle` | `hybrid` | `custom` | `none`), tier list with hurdles + LP/GP splits + `source_cells` map keyed to `Sheet!Cell` refs, plus pref rate/compounding and sponsor co-invest %. Persists opportunistically to new `tbl_excel_audit` table (with `tbl_excel_audit_finding` for severity-tagged caveats). Phase 5 (Python waterfall replication) is the only remaining major piece — Phases 6 (sources_uses) and partial 7 (trust_score) are implemented, despite older footer language to the contrary.

**Apr 15 hardening:** Phase 2e false-positive rate reduced ~92% via tighter heuristics in `formula_integrity.py`. Loader hardened to accept HTTPS UploadThing URIs in addition to `ut://` refs, and `LandscaperPanel.tsx` now falls back to a direct Excel drop path when doc metadata is unavailable. Excel audit tools registered in `UNIVERSAL_TOOLS` (`tool_registry.py`) — Landscaper can invoke `classify_excel_file` / `run_structural_scan` / `run_formula_integrity` / `extract_assumptions` / `classify_waterfall` from any page, not just the Ingestion Workbench.

### Ingestion Workbench (Implemented — Mar 2026)

The Ingestion Workbench is a fully implemented split-panel modal replacing MappingScreen and the old `dms_extract_queue` intake flow.

**Layout:** 380px Landscaper chat (left) + field review table (right), 1200px wide modal

**Entry flow:**
1. File drop → `IntakeChoiceModal` (client-side classification, file not yet uploaded)
2. "Structured Ingestion" selected → file uploads to UploadThing immediately → Workbench opens
3. Extraction triggers knowledge service pipeline (`ai_extraction_staging`) — bypasses old `dms_extract_queue` entirely
4. User reviews fields → commits → DMS record created, fields written to project tables
5. Cancel / X close → abandon endpoint called (bulk-reject staging rows, mark session abandoned) + UploadThing file deleted + `core_doc` soft-deleted

**Field status model (four-status, WIP):** Backend now classifies rows at read time into `new` / `match` / `conflict` / `pending`, replacing client-side `detectConflicts()`. Terminal statuses: `accepted` / `rejected`. New `existing_value` and `existing_source` fields on staging rows enable inline conflict resolution (choose extracted vs existing). New mutations: `resolveConflict`, `acceptAllMatches`, `acceptAllNew`.

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
- `src/hooks/useExtractionStaging.ts` — staging data + mutations (four-status model, conflict resolution, bulk accept)
- `src/components/ingestion/IngestionRightPanel.tsx` — refactored right panel (extraction summary + diff + field table)
- `src/components/ingestion/ExtractionSummary.tsx` — extraction summary stats
- `src/components/ingestion/ExtractionDiffPanel.tsx` — extracted vs existing diff view
- `backend/apps/knowledge/views/workbench_views.py` — list, update, commit, abandon, resolve endpoints
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

### Demographics / Location Intelligence

**Data source:** US Census ACS 5-Year Estimates (vintage 2023) at block group level, with TIGER/Line 2023 block group boundaries. Area-weighted aggregation via PostGIS for 1, 3, and 5-mile radius rings.

**On-demand loading:** Demographics are loaded per-state on first use. When a project is created in a new state, the system automatically triggers background download of TIGER shapefiles + Census API data. The map page also has a "Load Demographics" button if data isn't available. Loading takes ~1 min for small states (ID: ~1,284 block groups) and ~10-15 min for large states (TX: ~15,800 block groups).

**Backend endpoints:**
- `GET /api/v1/location-intelligence/demographics/state-coverage/?state=ID` — check if state data is loaded
- `POST /api/v1/location-intelligence/demographics/load-state/` — trigger background load (`{"state": "TX"}`)

**Geo auto-seeding (Mar 2026):** `geo_xwalk` records are now auto-created on first Location tab load for any US city. The system resolves the full geographic hierarchy (US → State → MSA/μSA → County → City) via Census Bureau APIs. Micropolitan Statistical Areas (μSAs) are supported throughout the stack — `cbsa_lookup.py` has `COUNTY_TO_MICRO` dict + `get_cbsa_or_micro()`, and the Location tab dynamically swaps the T2 tier label for μSA markets. Key files: `src/lib/geo/bootstrap.ts`, `src/lib/geo/constants.ts`, `services/market_ingest_py/market_ingest/cbsa_lookup.py`.

**County parcel selector:** Only visible for Arizona projects (Phoenix MSA). Supports Maricopa and Pinal County tax parcel overlays via external ArcGIS tile services.

**Known data limitations (important for Landscaper context):**
- ACS 5-Year estimates average over 2019-2023. They lag current market conditions by 2-3 years and do not reflect recent appreciation or market shifts.
- Census block groups in rural and resort areas are geographically large. A single block group may span a high-value resort town AND surrounding rural land, diluting median values significantly.
- Census median home value caps at approximately $2M and systematically underreports in ultra-high-value markets. Zillow/Redfin listings will show substantially higher values than Census medians.
- Area-weighted aggregation means block groups with larger land area exert more influence on ring totals, which can further dilute values in mountainous or rural terrain where block groups cover large unpopulated areas.
- For accurate current market values in resort and luxury markets, Landscaper should recommend supplementing Census demographics with MLS data, Zillow/Redfin estimates, or local appraisal sources.

### RAG/Knowledge System

- Knowledge entity/fact system (subject-predicate-object triples)
- OpenAI ada-002 embeddings (1536-dim) — generation works
- pgvector table ready but vector column commented out (Phase 2)
- RAG retrieval integrated with Landscaper chat
- 40+ service files in `backend/apps/knowledge/services/`
- Cross-project search backend exists, no REST endpoint yet
- Sync processing: `POST /api/knowledge/documents/{doc_id}/process/`
- CoStar sale comp extractor: `backend/apps/knowledge/services/costar_extractor.py` — specialized extraction pipeline for CoStar export PDFs, routes through `extraction_service.py` with dedicated field mappings and `extraction_writer.py` for DB persistence

### Valuation Engine Status

- **Sales Comparison:** Full CRUD, adjustment matrix, property-type-specific tables
- **Cost Approach:** Marshall & Swift factors, 3 depreciation types, container cost metadata
- **Income Approach:** 3 NOI bases (F-12 Current/Market/Stabilized), DCF monthly for MF, expense comparables CRUD
- **Reconciliation:** Complete — weights, narrative versioning, IndicatedValueSummary panel
- **Financial Engine:** `services/financial_engine_py/` with IRR/NPV/DSCR/waterfall tests
- **Construction Loan Engine:** Phase 6A complete (draw-repay-redraw validated); Phase 6B land dev conversational parsing complete
- **Portfolio Analysis:** (WIP) Django models scaffolded — `Portfolio`, `PortfolioMember`, `PortfolioWaterfallTier`, `PortfolioResult` in `models_portfolio.py`. ViewSets + serializers + URL registration complete. Underwriting mode only.

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
| Landscaper chat | — | ✅ | 220 tools, Claude AI |
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
3. [ ] Test with Peoria Meadows project
4. [ ] Django migrations applied if schema changed
5. [ ] API changes documented in relevant README

---

## Common Tasks

### Documenting a Session ("Document" Command)

When the user says **"Document"** (standalone or as part of a message), **prepend** an entry to the top of `docs/daily-context/session-log.md` (newest first). Follow this exact format:

```markdown
## [Task Name] — YYYY-MM-DD

**What was discussed:**
- (2-4 bullet summary of topics covered, decisions made, code written)

**Open items:**
- (anything unfinished, blocked, or explicitly deferred — or "None" if clean)

---
```

**Rules:**
1. **Task Name** — Ask the user for a short name (e.g., "Loan Scope UI", "Cash Flow Stacking"). This is what they'll scan for in the log.
2. **Date** — Use today's date.
3. **Discussed** — Concise. Focus on what changed (files touched, features added, bugs fixed, decisions made). No filler.
4. **Open items** — Anything the user said they'd come back to, anything that broke and wasn't fixed, or next steps that were discussed but not started.
5. **Prepend only** — Never overwrite or edit prior entries. New entries go at the top (newest first).
6. **Keep it tight** — Each entry should be scannable in 10 seconds.

**Note — nightly automated syncs:** Separately from the user-invoked `Document` command, an automated nightly sync writes one dated file per day to `docs/09_session_notes/YYYY-MM-DD-daily-sync.md`. Those files are machine-generated; do not prepend to them or confuse them with the `session-log.md` stream described above.

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
5. Target the chat-first `/w/` shell for new product surfaces — render content panels inside `RightContentPanel` or as artifacts where applicable
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

*Last updated: 2026-05-01 (release cut, afternoon — Session: LSCMD-RELEASE-CUT-0501-DA4) — Cut release of chat-first UI to production: force-pushed `feature/unified-ui` to `main` after archiving previous main as `Alpha18-UI`; Vercel + Railway redeploying. Working branch is now `chat-artifacts`; `feature/unified-ui` deleted. Earlier same day (chat hx, Friday morning), F-12 server-derivation work HELD pending discriminator-aware redesign. Round-2 commit (mgmt-fee fix + T-12/F-12 unified composer) was DRAFTED but not committed; Gregg caught a more fundamental architectural error before the merge. Discovery: `tbl_operating_expenses.statement_discriminator` already encodes a scenario taxonomy (`T3_ANNUALIZED` priority 1 / `T12` priority 2 / `T-12` priority 3 / `CURRENT_PRO_FORMA` priority 4 / `BROKER_PRO_FORMA` priority 5 / year strings) plus an `active_opex_discriminator` switcher on `tbl_project`. The legacy folder/tab UI surfaces this as a scenario picker; the chat-first `/w/` layer hadn't yet, and `get_proforma` ignored the entire system. Implication: rendering an artifact labeled "T-12" against data whose discriminator is `CURRENT_PRO_FORMA` (which is what Chadron actually has — extracted from OM page 17 "Current" column, NOT a real T-12) is a content error, not just a naming one. The "T-12 × growth = F-12" model I built fundamentally conflicts with how the system models projections (it stores them as separate discriminators, not transforms). Procedural failure: the discriminator code was in a file I had already opened (`backend/apps/financial/views_operations.py` — `SCENARIO_PRIORITY_MAP`, `available_scenarios`, `active_opex_discriminator`); skimming past it cost two sessions of work. New rule §17.7 in `docs/PROJECT_INSTRUCTIONS.md` (Schema audit before architectural proposals) added to prevent recurrence; new high-risk zone §17.8 added for the discriminator system. PROJECT_INSTRUCTIONS.md bumped to v4.1; needs to be mirrored to Cowork project settings + Claude project knowledge per §0.4. Branch state: `feature/unified-ui` active. Yesterday's commit `fae31fe` (round-1 F-12 server-derivation) is on the branch but the artifact it produces is mislabeled; should be reverted or the tool must be rewritten to be discriminator-aware before merge to main. Tool count after revert: ~270 (drop `get_proforma`). Round-2 changes (mgmt-fee fix + T-12 path) live in the working tree but uncommitted — should be discarded as part of the rewrite. Carryover: rent-roll guard still queued; `current_proforma` server-derived path no longer the right framing — replaced by "discriminator-aware operating statement" architecture. Prior session-log entry: Artifacts Phase 5 (OS guard + universal tabular formatting standard) shipped between commits `c2d18dd` and `f21f2bf`. BASE_INSTRUCTIONS T-12 strict content rules (~80 lines) still superseded but not yet removed.*
*Phase 1 of discriminator-aware operating-statement design shipped 2026-05-01 evening (chat DA, sessions LSCMD-OS-PHASE1-IMPL-0501-DA30 + LSCMD-OS-PHASE1-RETEST-0501-DA36, commit `13346bf` on `chat-artifacts`). New tool `save_user_vocab` (per-user phrasing → canonical-value mappings; universal pattern across resolution domains; first domain `operating_statement_scenario`). Modified `get_operating_statement` v2: accepts literal `scenario` OR `user_phrasing`; consults `tbl_user_scenario_vocab` for learned mappings; returns `code='ambiguous_scenario'` with `available_scenarios` block when no mapping exists; response includes `scenario_resolved`, `scenario_resolution_source`, and `rendering_label` (the honest title for the artifact). New table `landscape.tbl_user_scenario_vocab` (migration `20260501_user_scenario_vocab.up.sql`). New OS guard rule `_check_label_data_consistency` rejects subtype-vs-title scenario-keyword mismatches (closes the Chadron failure). BASE_INSTRUCTIONS adds two universal sections: "OPERATING STATEMENT — DISCRIMINATOR HONESTY" and "ASSUMPTION CHOICES — SURFACE WITH PROVENANCE" (the second applies platform-wide to any input with multiple sources). Production audit during live verify: `default` is the dominant `statement_discriminator` tag (945 rows / 63 projects), `POST_RENO_PRO_FORMA` exists too — both added to label map / epistemic-status map / validator allow-list with honest labeling (`default` → "Default (untagged)" / status `unknown`, NOT dressed up as a specific scenario). Spec at `Landscape app/SPEC-OS-DiscriminatorAware-DA-2026-05-01.md` (technical) + `.html` (plain-English). Two non-blocking follow-ups from live verify: (a) `.gitignore` `**/migrations/*.sql` unignore was too broad — exposed ~140 untracked historical SQL files in `git status`; need narrower pattern + per-file decision; (b) `_normalize_phrase` in `vocab_tools.py` doesn't strip stop words ("show me", "the", "again") so vocab-lookup hit rate is lower than design intent — small fix queued. Phase 2 (ephemeral artifacts + inline cell edit live recalc) queued separately.*
*Universal Archive Pattern Phase 1a shipped 2026-05-05 (chat PV, CC handoff session LSCMD-UNIV-ARCHIVE-PHASE1A-PV05-2026-05-05, commit `294271e` on `chat-artifacts`). Chat threads end-to-end soft-archive layer: new columns `is_archived` / `archived_at` / `archived_by_user_id` on `landscape.landscaper_chat_thread` (migration `20260505_thread_archive_fields.up.sql` + Django state-only `0004_thread_archive_fields.py`); DELETE on a thread defaults to soft-archive, `?force=true` triggers hard delete with message-row CASCADE; new POST `/restore/` un-archives; list/recent endpoints accept `?archived=true` and `?include_archived=true`. Frontend: `useLandscaperThreads` hook gains `archiveThread` / `restoreThread` / `deleteThreadPermanently` (with `deleteThread` retained as a soft-archive alias for back-compat with the legacy `ThreadList.tsx` confirm flow); sidebar gets a new "Archived (N)" collapsible section below "Threads," default collapsed; live thread rows expose hover-revealed archive icon, archived rows expose restore + trash icons (trash gates on `window.confirm`). Two implementation gaps surfaced during CC verify and were fixed inline in the same commit (CC echoed back as scope-deviation flags): (1) `backend/apps/landscaper/urls.py` — the existing `landscaper/threads/<uuid:pk>/` pattern only wired GET + PATCH; CC added `'delete': 'destroy'` to that pattern + a new pattern for `landscaper/threads/<uuid:pk>/restore/`. (2) `ChatThreadViewSet.get_queryset` — the new `is_archived` filter excluded archived rows from action methods too, so `restore` and `?force=true` 404'd; CC added carve-outs. **New high-risk zone (codify for Phase 1b):** when adding new ViewSet behavior to existing endpoints in this codebase, also verify URL routing (we use explicit method-mapping, not a DRF router) AND queryset-filter interactions with action methods that need to find filtered-out rows. Spec: `Landscape app/SPEC-Universal-Archive-Pattern-PV-2026-05-05.md` (+ `.html` plain-English companion). Phases 1b (comps + contacts), 2 (project archive + cascade), 3 (project deletion wizard with 4-toggle retention) queued.*
*Landscape command bus pattern shipped 2026-05-05 (chat PV, branch `chat-artifacts`). Solves the structural failure where the global chat panel (in `/w/` layout shell) couldn't reach UI surfaces mounted in child layouts (e.g., `ModalRegistryProvider` lives in `/w/projects/[projectId]/layout.tsx`). React context flows down the tree, so the chat panel's direct `useModalRegistrySafe()` call returned null on every project route — silently dropping every chat-driven `open_input_modal` command. New module `src/lib/landscape-command-bus.ts` exposes typed `emitLandscapeCommand(command, payload)` and `useLandscapeCommand(command, handler)` APIs backed by a module-level listener registry (no React context needed at the root). New component `src/components/wrapper/LandscapeCommandSubscriber.tsx` mounted inside `ModalRegistryProvider` listens for `open_modal` commands and dispatches to the registry locally. `CenterChatPanel.tsx` swapped its direct registry call for `emitLandscapeCommand('open_modal', ...)`. `LandscaperPanel.tsx` (legacy `/projects/*` chat surface) NOT migrated this commit — it works today because it's mounted inside the provider's tree on the legacy route — but should migrate for consistency in a follow-on. **Adding a new chat-driven UI command:** add the command + payload type to `LandscapeCommandPayloadMap`, emit from any caller, mount a subscriber inside whatever provider's scope can handle it. **High-risk note:** any chat-driven UI behavior that needs cross-tree dispatch should use the bus, not direct context — the failure mode that produced this regression (S14 Phase 4 modal handoff appearing to pass at the backend layer while never rendering on the frontend) was latent for weeks.*
*Multi-tool turn continuation mechanism shipped 2026-05-05 (chat PV, branch `chat-artifacts`). Tool loop in `ai_handler.py` previously exited silently when a multi-tool turn cut off mid-chain at MAX_TOKENS=4096; S16 phases 3, 8, 9 (each fires 2-3 tool calls in a single response: `get_operating_statement` → optional `save_user_vocab` → `create_artifact`) had been failing 30-40% of the time as the synonym dictionary grew through PU58 → PU61. Bumping MAX_TOKENS to 6144 (PU62-era attempt) caused Django RemoteDisconnected — wrong knob. New mechanism: classifier `_classify_max_tokens_cutoff` returns one of four scenarios (`MID_CHAIN_CONTINUE`, `MID_TOOL_USE_RESTART`, `POST_TOOL_TRUNCATED`, `LONG_ANSWER_TRUNCATED`); inline handlers fire on both the initial response and the in-loop continuation; `MAX_CONTINUATION_ATTEMPTS = 2` cap shared across both paths; truncation marker appended to `final_content` when cutoff is accepted rather than continued. `help_handler.py` confirmed not in scope (single-call, no tool loop). MAX_TOKENS stays at 4096 — the continuation mechanism makes that sufficient without touching Django's request-buffer ceiling. Spec: `Landscape app/SPEC-Multi-Tool-Continuation-PV-2026-05-05.md` (+ `.html` plain-English companion). Test coverage: existing S16 calibration suite is the regression check (target ≥95% pass rate vs 60-70% baseline); dedicated S17 scenario for forced-cutoff edge cases queued as a follow-on.*
*DMS restructure shipped 2026-05-04 → 2026-05-05 (chat qm spec, CC handoff session LSCMD-DMS-RESTRUCTURE-0504-qm08, branch `chat-artifacts`). Per-project documents migrated out of the dedicated `/w/projects/[id]/documents` page into a right-panel toggle (Artifacts | Documents) in `ProjectArtifactsPanel`, eliminating the navigation-swallow bug that reset the center chat to "New conversation" and unmounted the right-panel artifact context. The documents route is preserved as a 30-line redirect for cached URLs (flips `WrapperUIContext.projectRightPanelView` to `'documents'` then `router.replace`s to project root). Knowledge Library promoted out of the legacy `AdminModal` "Landscaper" tab into a first-class top-level route at `/w/platform-knowledge` — sidebar item renamed `documents` → `platform-knowledge`, label "Documents" → "Platform Knowledge"; Extraction Mappings stays in the legacy AdminModal. Two new universal Landscaper tools added: `find_documents` (metadata + free-text cross-project search) and `summarize_document_library` (facet counts) — both wrap the existing `knowledge_library_service` and are registered in `UNIVERSAL_TOOLS` + `UNASSIGNED_SAFE_TOOLS` so they fire pre-project on the new Platform Knowledge page. `DocumentDetailPanel` gained a working preview pane (PDF iframe / image) and Open-externally + Download buttons via a lazy fetch of `storage_uri` from `/api/dms/docs/[id]`. Spec at `Landscape app/SPEC-DMS-Restructure-PlainEnglish-qm-2026-05-04.html`. Verified: `npm run build` green, both new tools present in `TOOL_REGISTRY` (introspected via `apps.landscaper.tool_executor.TOOL_REGISTRY`, NOT `_TOOLS_REGISTRY` — the handoff prompt's symbol name was wrong), all `/w/*` routes resolve to auth-redirect (no 404). One v1 limitation flagged: panel toggle state lives in `WrapperUIContext` only and does NOT survive a full page reload — acceptable for v1, revisit if users complain.*
*Last audit: 2026-04-30 — Alpha Readiness Assessment (15-step workflow audit, includes Artifacts system)*
*Landscaper tool count: **273 registered** (+`find_documents` + `summarize_document_library` from DMS restructure 2026-05-04; +`save_user_vocab` from chat DA Phase 1 ship; +5 artifact tools and `get_operating_statement` added Apr 25–30; 3 LoopNet tools registered but not advertised — gx14 deferral). `get_proforma` was added in `fae31fe` then reverted (chat hx) as not discriminator-aware; superseded by the discriminator-honesty redesign that shipped chat DA. Excel audit phases implemented: 0, 1, 2, 2f, 3, 4, 6, 7-partial. Phase 5 (Python waterfall replication) is the only remaining major piece.*
*Reports catalog: 20 generators with real SQL (10 rewritten with shared pdf_base module, PDF/Excel export via reportlab + openpyxl)*
*Maintainer: Update when architecture decisions change. Never let this file fall more than one session behind.*