# Page Inventory & Cleanup Audit

> **Generated:** 2026-02-07
> **Scope:** All `page.tsx` and `layout.tsx` files in `src/app/`
> **Mode:** Read-only audit — no files modified or deleted

---

## 1. Route Inventory

### Status Legend

| Status | Meaning |
|--------|---------|
| **ACTIVE** | Linked from navigation, folder tabs, or settings menus. Production-ready. |
| **SANDBOX** | Linked only from the Sandbox dropdown (developer/prototype reference). |
| **PROTOTYPE** | Functional but hardcoded data, narrow use case, or experimental UI. |
| **LEGACY** | Superseded by newer routes but still functional. |
| **REDIRECT** | Redirects to another route immediately. |
| **DEAD** | No inbound links from any navigation surface. Orphaned. |

---

### 1A. Top-Level Routes (outside `/projects/`)

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 1 | `/` | ACTIVE | Root | Landing / redirect to dashboard |
| 2 | `/login` | ACTIVE | Auth flow | Login page |
| 3 | `/register` | ACTIVE | Auth flow | Registration page |
| 4 | `/forgot-password` | ACTIVE | Auth flow | Password reset request |
| 5 | `/reset-password` | ACTIVE | Auth flow | Password reset completion |
| 6 | `/dashboard` | ACTIVE | Global nav | Main dashboard |
| 7 | `/dms` | ACTIVE | Global nav | Global document management |
| 8 | `/preferences` | ACTIVE | User menu | User preferences (has own layout) |
| 9 | `/onboarding` | ACTIVE | Auth flow | Two-phase onboarding (survey → chat) |
| 10 | `/contacts` | ACTIVE | Settings | Full CRUD contacts management |
| 11 | `/planning` | SANDBOX | Sandbox dropdown | Planning view (Peoria Lakes) |
| 12 | `/market` | SANDBOX | Sandbox dropdown | Market intel dashboard |
| 13 | `/inventory` | SANDBOX | Sandbox dropdown | Inventory view |
| 14 | `/market-assumptions` | SANDBOX | Sandbox dropdown | Market assumptions (Peoria Lakes) |
| 15 | `/growthrates` | SANDBOX | Sandbox dropdown | Growth rates (Materio style) |
| 16 | `/growthrates-original` | SANDBOX | Sandbox dropdown | Growth rates (original style) |
| 17 | `/growthratedetail` | SANDBOX | Sandbox dropdown | Growth rate detail view |
| 18 | `/growthratesmanager` | SANDBOX | Sandbox dropdown | Growth rates CRUD manager |
| 19 | `/budget-grid` | SANDBOX | Sandbox dropdown | Budget grid v1 |
| 20 | `/budget-grid-v2` | SANDBOX | Sandbox dropdown | Budget grid v2 |
| 21 | `/db-schema` | SANDBOX | Sandbox dropdown | Database schema explorer |
| 22 | `/dev-status` | SANDBOX | Sandbox dropdown | Development status tracker |
| 23 | `/documentation` | SANDBOX | Sandbox dropdown | Documentation center |
| 24 | `/ai-document-review` | SANDBOX | Sandbox dropdown | AI document review interface |
| 25 | `/documents/review` | SANDBOX | Sandbox + Settings | Document review / Landscaper training |
| 26 | `/test-coreui` | SANDBOX | Sandbox dropdown | CoreUI component playground |
| 27 | `/breadcrumb-demo` | SANDBOX | Sandbox dropdown | Breadcrumb UI demo |
| 28 | `/gis-simple-test` | SANDBOX | Sandbox dropdown | Simple GIS test page |
| 29 | `/map-debug` | SANDBOX | Sandbox dropdown | Map debug tools |
| 30 | `/prototypes` | SANDBOX | Sandbox dropdown | Prototypes hub index |
| 31 | `/prototypes-multifam` | SANDBOX | Sandbox dropdown | Multifamily prototypes index |
| 32 | `/prototypes/[prototypeId]` | SANDBOX | Prototypes hub | Individual prototype page |
| 33 | `/prototypes/multifam/rent-roll-inputs` | SANDBOX | Sandbox dropdown | Rent roll input prototype |
| 34 | `/prototypes/multifam/rent-roll-inputs/content` | SANDBOX | Internal link | Rent roll content sub-page |
| 35 | `/rent-roll` | PROTOTYPE | None direct | Rent roll analysis (multifamily, standalone) |
| 36 | `/diligence` | PROTOTYPE | None direct | Diligence blocks (hardcoded project 17) |
| 37 | `/ingestion` | PROTOTYPE | None direct | Document ingestion HITL (hardcoded project 17) |
| 38 | `/phases` | PROTOTYPE | None direct | Phase transition builder (hardcoded project 17) |
| 39 | `/reports` | PROTOTYPE | None direct | Financial reports (hardcoded property 17) |
| 40 | `/lease/[id]` | PROTOTYPE | None direct | Lease detail page |
| 41 | `/property/[id]` | DEAD | None | 9-tab property analyzer — no inbound links |
| 42 | `/parcel-test` | DEAD | None | MapLibre GIS demo with Pinal County parcels |
| 43 | `/properties/[id]/analysis` | DEAD | None | Property analysis sub-route |

---

### 1B. Admin Routes (`/admin/`)

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 44 | `/admin/preferences` | ACTIVE | Settings menu | System preferences admin |
| 45 | `/admin/benchmarks` | ACTIVE | Settings menu | Benchmarks admin hub |
| 46 | `/admin/benchmarks/cost-library` | ACTIVE | Admin benchmarks | Unit cost library |
| 47 | `/admin/dms/templates` | ACTIVE | Settings + Sandbox | DMS template admin |
| 48 | `/admin/changelog` | ACTIVE | Admin nav | Changelog viewer |
| 49 | `/admin/feedback` | ACTIVE | Admin nav | Feedback management |
| 50 | `/admin/users` | ACTIVE | Admin nav | User management |

---

### 1C. Settings Routes (`/settings/`)

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 51 | `/settings/profile` | ACTIVE | User menu | Profile settings |
| 52 | `/settings/budget-categories` | ACTIVE | Settings | Budget category management |
| 53 | `/settings/taxonomy` | ACTIVE | Settings | Land use taxonomy editor |
| 54 | `/settings/contact-roles` | ACTIVE | Settings | Contact role definitions |
| 55 | `/benchmarks/products` | ACTIVE | Settings / admin | Product benchmarks |
| 56 | `/benchmarks/unit-costs` | ACTIVE | Settings / admin | Unit cost benchmarks |

---

### 1D. Project-Scoped Routes (`/projects/[projectId]/`)

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 57 | `/projects/setup` | SANDBOX | Sandbox dropdown | Project setup wizard |
| 58 | `/projects/[projectId]` | ACTIVE | Folder tabs (home) | Project home (folder tab root) |
| 59 | `/projects/[projectId]/overview` | ACTIVE | Folder tabs | Project overview / summary |
| 60 | `/projects/[projectId]/budget` | ACTIVE | Folder tabs | Budget grid |
| 61 | `/projects/[projectId]/documents` | ACTIVE | Folder tabs | Document management (DMSView) |
| 62 | `/projects/[projectId]/napkin` | ACTIVE | Folder tabs | Napkin mode feasibility |
| 63 | `/projects/[projectId]/napkin/waterfall` | ACTIVE | Napkin nav | Napkin waterfall view |
| 64 | `/projects/[projectId]/settings` | ACTIVE | Project menu | Project-level settings |
| 65 | `/projects/[projectId]/assumptions` | SANDBOX | Sandbox dropdown | Project assumptions editor |
| 66 | `/projects/[projectId]/acquisition` | ACTIVE | Folder tabs (property) | Acquisition costs |
| 67 | `/projects/[projectId]/results` | ACTIVE | Folder tabs | Results / returns summary |
| 68 | `/projects/[projectId]/opex` | ACTIVE | Folder tabs | Operating expenses |
| 69 | `/projects/[projectId]/opex-accounts` | ACTIVE | Internal link | OpEx account detail |
| 70 | `/projects/[projectId]/valuation` | ACTIVE | Folder tabs | Valuation hub |
| 71 | `/projects/[projectId]/valuation/income-approach` | ACTIVE | Folder tabs | Income approach valuation |

#### Planning sub-routes (own layout with subtabs)

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 72 | `/projects/[projectId]/planning/market` | ACTIVE | Planning layout tabs | Market analysis |
| 73 | `/projects/[projectId]/planning/land-use` | ACTIVE | Planning layout tabs | Land use & parcels |
| 74 | `/projects/[projectId]/planning/budget` | ACTIVE | Planning layout tabs | Planning budget |

#### Development sub-routes (own layout with subtabs)

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 75 | `/projects/[projectId]/development/phasing` | ACTIVE | Development layout tabs | Phasing & timing |
| 76 | `/projects/[projectId]/development/budget` | ACTIVE | Development layout tabs | Development budget |

#### Capitalization sub-routes

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 77 | `/projects/[projectId]/capitalization/equity` | ACTIVE | Folder tabs | Equity structure |
| 78 | `/projects/[projectId]/capitalization/debt` | ACTIVE | Folder tabs | Debt structure |
| 79 | `/projects/[projectId]/capitalization/operations` | ACTIVE | Folder tabs | Cap operations |
| 80 | `/projects/[projectId]/capitalization/waterfall` | ACTIVE | Folder tabs | Capital waterfall |

#### Analysis sub-routes

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 81 | `/projects/[projectId]/analysis` | ACTIVE | Folder tabs | Analysis hub |
| 82 | `/projects/[projectId]/analysis/market-data` | ACTIVE | Analysis nav | Market data analysis |
| 83 | `/projects/[projectId]/analysis/sensitivity` | ACTIVE | Analysis nav | Sensitivity analysis |

#### "Project" tab sub-routes (folder tab → project content)

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 84 | `/projects/[projectId]/project/summary` | ACTIVE | Folder tabs (home) | Project summary dashboard |
| 85 | `/projects/[projectId]/project/budget` | ACTIVE | Folder tabs | Budget grid with lifecycle tabs |
| 86 | `/projects/[projectId]/project/dms` | ACTIVE | Folder tabs | Document management |
| 87 | `/projects/[projectId]/project/planning` | ACTIVE | Folder tabs | Parcel & land use planning |
| 88 | `/projects/[projectId]/project/sales` | ACTIVE | Folder tabs | Sales absorption |

#### Potentially redundant / legacy project routes

| # | Route | Status | Nav Source | Description |
|---|-------|--------|-----------|-------------|
| 89 | `/projects/[projectId]/documents/files` | REDIRECT | None | Redirects to `/projects/[projectId]/documents` |
| 90 | `/projects/[projectId]/landscaper` | LEGACY | None direct | Standalone Landscaper page (Phase 1). Superseded by embedded panel. |
| 91 | `/projects/[projectId]/sales-marketing` | LEGACY | None direct | Sales content page. Migrated from `/project/sales`. |
| 92 | `/projects/[projectId]/validation` | DEAD | None | Validation/debug report. Dev-only tool. |

---

## 2. Layout Templates

### 2A. Layout Hierarchy

```
src/app/layout.tsx (Root)
├── All providers: Query, Auth, CoreUI Theme, Toast, Project, IssueReporter
├── NavigationLayout wrapper (global nav bar)
│
├── src/app/preferences/layout.tsx
│   └── PreferencesContextBar (pill tab navigation)
│
└── src/app/projects/[projectId]/layout.tsx (Project)
    ├── ComplexityModeProvider + ProjectModeProvider
    ├── ProjectLayoutClient (two-column resizable split)
    │   ├── Left: StudioProjectBar + LandscaperPanel (collapsible)
    │   └── Right: FolderTabs + content area
    │
    ├── src/app/projects/[projectId]/capitalization/layout.tsx
    │   └── Pass-through wrapper (no visual chrome)
    │
    ├── src/app/projects/[projectId]/development/layout.tsx
    │   └── Subtab navigation: Phasing & Timing | Budget
    │
    ├── src/app/projects/[projectId]/napkin/layout.tsx
    │   └── Minimal wrapper (prevents child remounts)
    │
    └── src/app/projects/[projectId]/planning/layout.tsx
        └── CCard with header + CNav subtabs: Market | Land Use | Budget
```

### 2B. Layout Details

| Layout | Location | Visual Pattern | Providers Added |
|--------|----------|----------------|-----------------|
| **Root** | `src/app/layout.tsx` | Global nav bar, full-page wrapper | QueryProvider, AuthProvider, CoreUIThemeProvider, ToastProvider, ProjectProvider, IssueReporterProvider |
| **Preferences** | `src/app/preferences/layout.tsx` | Context bar with pill tabs above content | None (client component) |
| **Project** | `src/app/projects/[projectId]/layout.tsx` | Two-column resizable: Landscaper \| Folder Tabs + Content | ComplexityModeProvider, ProjectModeProvider |
| **Capitalization** | `.../capitalization/layout.tsx` | Pass-through `<div>` — no visual chrome | None |
| **Development** | `.../development/layout.tsx` | Sticky subtab bar (Phasing \| Budget) | None (client, uses `useParams`) |
| **Napkin** | `.../napkin/layout.tsx` | Minimal `app-content` div wrapper | None (client) |
| **Planning** | `.../planning/layout.tsx` | CCard with header + CNav underline tabs (Market \| Land Use \| Budget) | None (client, uses `useParams`) |

### 2C. Visual Pattern Summary

- **Root layout** provides all global providers in a fixed nesting order
- **Project layout** introduces the resizable split-panel architecture with Landscaper on the left
- **Development** and **Planning** layouts add their own subtab navigation (different styles: sticky `nav-tabs` vs CCard `underline-border`)
- **Capitalization** layout is effectively a no-op pass-through
- **Napkin** layout is a stability wrapper only

---

## 3. Landscaper Panel Integration

### 3A. Architecture

The Landscaper is a **resizable sidebar panel** embedded in the project layout, not a standalone page or modal.

**Key component:** `ProjectLayoutClient.tsx` (v3.0)

```
┌──────────────────────────────────────────────────────────┐
│  StudioProjectBar (project selector + collapse toggle)   │
├───────────────┬──────────────────────────────────────────┤
│  Landscaper   │  FolderTabs (Row 1: folders)             │
│  Panel        │  SubTabs   (Row 2: contextual)           │
│  (resizable)  ├──────────────────────────────────────────┤
│               │                                          │
│  280px-50%    │  Content Area ({children})               │
│  width range  │                                          │
│               │                                          │
│  Collapses    │                                          │
│  to icon      │                                          │
│  strip        │                                          │
└───────────────┴──────────────────────────────────────────┘
```

### 3B. Panel Behavior

| Property | Value |
|----------|-------|
| Default width | 320px |
| Minimum width | 280px |
| Maximum width | 50% of viewport |
| Collapse threshold | <100px drag → auto-collapse |
| Collapsed state | `CollapsedLandscaperStrip` (icon strip) |
| Resize handle | Draggable splitter between panels |
| Persistence | Width stored in localStorage |

### 3C. Props & Context Flow

```
ProjectLayoutClient
  ├── projectId (from URL params)
  ├── useFolderNavigation() → activeFolder, activeTab
  ├── useResizablePanel() → width, collapsed, handlers
  ├── FileDropProvider + LandscaperCollisionProvider
  │
  └── LandscaperPanel receives:
      ├── projectId
      ├── activeTab (from folder navigation)
      ├── isCollapsed / onToggleCollapse
      └── File drop context (for document upload)
```

### 3D. Landscaper Panel Availability

| Scope | Available? | Notes |
|-------|-----------|-------|
| `/projects/[projectId]/*` | ✅ Yes | Embedded via ProjectLayoutClient |
| `/dashboard` | ❌ No | No project context |
| `/dms` | ❌ No | Global DMS, no project scope |
| `/admin/*` | ❌ No | Admin pages, no project context |
| `/settings/*` | ❌ No | Settings, no project context |
| Top-level sandbox pages | ❌ No | No project layout wrapping them |
| `/projects/[projectId]/landscaper` | ⚠️ Legacy | Opens LandscaperChatModal (Phase 1 approach). Redundant with embedded panel. |

### 3E. Standalone Landscaper Page (Legacy)

`/projects/[projectId]/landscaper/page.tsx` exists as a **Phase 1 artifact**. It opens `LandscaperChatModal` as a modal dialog rather than using the current embedded panel approach. This route is **not linked** from any navigation surface and is superseded by the panel in `ProjectLayoutClient`.

---

## 4. Folder Tab Navigation System

### 4A. Configuration

Defined in `src/lib/utils/folderTabConfig.ts`. Generates 8 folder tabs dynamically based on project type:

| Position | Folder ID | Label (Land Dev) | Label (Income) | SubTabs (Land Dev) | SubTabs (Income) |
|----------|-----------|-------------------|-----------------|---------------------|-------------------|
| 1 | `home` | Project | Project | — | — |
| 2 | `property` | Property | Property | market, land-use, parcels, acquisition | details, acquisition, market, rent-roll |
| 3 | `budget` / `operations` | Development / Sales | Operations | budget, sales | — |
| 4 | `feasibility` / `valuation` | Feasibility / Valuation | Valuation | cashflow, returns, sensitivity | sales-comparison, cost, income |
| 5 | `capital` | Capitalization | Capitalization | equity, debt | equity, debt |
| 6 | `reports` | Reports | Reports | summary, export | summary, export |
| 7 | `documents` | Documents | Documents | — | — |
| 8 | `map` | Map | Map | — | — |

### 4B. URL Pattern

```
/projects/[projectId]?folder=property&tab=land-use
```

Managed by `useFolderNavigation` hook. Folder + tab state stored in URL query params.

---

## 5. Navigation Surfaces

### 5A. Global Navigation

Defined in `src/app/components/navigation/constants.ts`:

- **Global Nav Links (Tier 1):** Dashboard (`/dashboard`), Documents (`/dms`)
- **Sandbox Dropdown:** 25+ developer/prototype links (see Section 1A, SANDBOX status)
- **Settings Menu:** System Preferences, Benchmarks, Landscaper Config, Landscaper Training, DMS Admin
- **User Menu:** Profile, Account Settings

### 5B. In-Project Navigation

- **Folder Tabs:** 8-folder ARGUS-style stacked tabs (see Section 4)
- **Layout Subtabs:** Development (2 tabs), Planning (3 tabs)
- **Tile Config:** Legacy tile navigation (8 tiles) — replaced by folder tabs

---

## 6. Dead Route Candidates

Routes with **no inbound navigation links** from any surface. These are candidates for cleanup.

| Route | Status | Reason | Recommendation |
|-------|--------|--------|----------------|
| `/property/[id]` | DEAD | 9-tab property analyzer. No links from any nav. Top-level route duplicates project-scoped functionality. | **Remove** — functionality exists within project context |
| `/parcel-test` | DEAD | MapLibre GIS demo with Pinal County parcels. Developer test page. | **Remove** — test artifact, GIS functionality lives in map pages |
| `/properties/[id]/analysis` | DEAD | Property analysis sub-route. No parent page links to it. | **Remove** — orphaned |
| `/projects/[projectId]/documents/files` | REDIRECT | Immediately redirects to parent `/documents`. | **Remove** — unnecessary redirect shim |
| `/projects/[projectId]/landscaper` | LEGACY | Phase 1 standalone modal approach. Superseded by embedded panel in ProjectLayoutClient. | **Remove** — replaced by panel architecture |
| `/projects/[projectId]/validation` | DEAD | Debug/validation report. Dev-only tool with no nav links. | **Keep as dev tool** or move to `/admin/` |
| `/projects/[projectId]/sales-marketing` | LEGACY | Migrated from `/project/sales`. Content duplicated at new location. | **Remove** — duplicated at `/project/sales` |

### 6A. Prototype Routes (Not Dead, But Limited)

These routes are functional but hardcoded to specific projects (typically project 17 / Chadron Terrace). They support `?projectId=` overrides but are not wired into standard navigation:

| Route | Notes |
|-------|-------|
| `/diligence` | Multifamily diligence blocks (Iteration B) |
| `/ingestion` | Document ingestion HITL with CopilotKit |
| `/phases` | Phase transition builder (Iteration C) |
| `/reports` | Financial reports with scenario toggle |
| `/rent-roll` | Rent roll analysis (standalone) |
| `/lease/[id]` | Lease detail page |

**Recommendation:** These are active prototypes. Keep but consider consolidating into `/prototypes/` when stable.

---

## 7. Summary Statistics

| Metric | Count |
|--------|-------|
| **Total `page.tsx` files** | 92 |
| **Total `layout.tsx` files** | 7 |
| **ACTIVE routes** | 58 |
| **SANDBOX routes** (dev dropdown only) | 20 |
| **PROTOTYPE routes** | 6 |
| **LEGACY routes** | 2 |
| **REDIRECT routes** | 1 |
| **DEAD routes** | 3 |
| **Recommended for removal** | 7 |
| **Folder tab folders** | 8 |
| **Folder tab subtabs** | ~18 (varies by project type) |
| **Navigation providers in root layout** | 6 |
| **Layouts with subtab navigation** | 2 (Development, Planning) |
| **Layouts that are pass-through/minimal** | 2 (Capitalization, Napkin) |

### Route Distribution by Area

| Area | Count |
|------|-------|
| Auth pages (`/login`, `/register`, etc.) | 4 |
| Admin pages (`/admin/*`) | 6 |
| Settings pages (`/settings/*`, `/benchmarks/*`) | 6 |
| Project-scoped pages (`/projects/[projectId]/*`) | 36 |
| Top-level standalone pages | 27 |
| Prototype pages (`/prototypes/*`) | 4 |
| Global utility pages (`/dashboard`, `/dms`, etc.) | 9 |

---

## 8. Architectural Notes

### 8A. Dual Route Pattern

Many features exist at **two route levels**:
- **Top-level:** `/rent-roll`, `/reports`, `/market` — standalone, sometimes hardcoded
- **Project-scoped:** `/projects/[projectId]/...` — contextualized, production-ready

This is a natural consequence of prototyping at top level then migrating into project scope. The top-level versions should be archived or moved to `/prototypes/` once their project-scoped equivalents are stable.

### 8B. Folder Tab vs. Path Routing

The codebase uses **two navigation paradigms simultaneously**:
1. **Query-param tabs:** `?folder=property&tab=land-use` (folder tab system)
2. **Path-based routes:** `/projects/[projectId]/planning/market` (layout subtabs)

Both work, but the query-param approach is the intended primary pattern per `folderTabConfig.ts`. The path-based routes under `/planning/`, `/development/`, and `/capitalization/` predate the folder tab system and have their own layout files with subtab navigation.

### 8C. Landscaper Integration Gap

The Landscaper panel is only available within `/projects/[projectId]/*` routes. There is no Landscaper access from:
- Global dashboard
- Global DMS
- Admin/Settings pages
- Standalone prototype pages

If Landscaper should be available globally (not just in project context), it would need to be lifted to the root layout or a new global panel architecture.

---

*End of audit. No files were modified or deleted during this analysis.*
