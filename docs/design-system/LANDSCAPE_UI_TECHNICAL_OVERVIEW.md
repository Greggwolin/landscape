# Landscape Application - UI Technical Documentation
December 11, 2025

## Table of Contents
- [1. Navigation Architecture](#1-navigation-architecture)
  - [1.1 Primary Navigation](#11-primary-navigation)
  - [1.2 Project Navigation Layer](#12-project-navigation-layer)
  - [1.3 Ancillary Navigation Surfaces](#13-ancillary-navigation-surfaces)
  - [1.4 Route Structure](#14-route-structure)
  - [1.5 Project Context Switching](#15-project-context-switching)
  - [1.6 Tab Implementations](#16-tab-implementations)
  - [1.7 Header and Breadcrumb Patterns](#17-header-and-breadcrumb-patterns)
  - [1.8 Project Mode System (Napkin/Standard)](#18-project-mode-system-napkinstandard)
- [2. Page Inventory](#2-page-inventory)
- [3. Component Architecture](#3-component-architecture)
- [4. Styling System](#4-styling-system)
- [5. State Management](#5-state-management)
- [6. Key User Flows](#6-key-user-flows)
- [7. Interactive Elements Catalog](#7-interactive-elements-catalog)
- [8. Responsive Behavior](#8-responsive-behavior)
- [9. Performance Considerations](#9-performance-considerations)
- [10. Accessibility](#10-accessibility)
- [Appendix A: File Structure](#appendix-a-file-structure)
- [Appendix B: UI Dependencies](#appendix-b-ui-dependencies)

---

## Recent Changes Summary (Since November 23, 2025)

### Major Additions
1. **User Management System** (`/admin/users`) - Full CRUD user management with modals for add/edit/delete/password reset
2. **Napkin Mode System** - New project mode with `ProjectModeProvider` and `LifecycleTileNav` for simplified workflows
3. **Dashboard Redesign** - Complete overhaul with filter tiles, project accordion, and integrated map
4. **NapkinWaterfallForm** - Redesigned waterfall form with IRR/EM toggle and structured tile layout
5. **DMS Improvements** - Multi-select deletion, toast notifications, multi-filter expansion

### Project Type Code Change
- **LAND → DEV**: All project type codes renamed from `LAND` to `DEV` (Development) in database and frontend

### New Routes
- `/projects/[projectId]/napkin` - Napkin mode entry point
- `/projects/[projectId]/napkin/waterfall` - Napkin waterfall analysis
- `/projects/[projectId]/napkin/analysis` - Napkin analysis page
- `/projects/[projectId]/napkin/documents` - Napkin documents view
- `/admin/users` - User management system
- `/projects/[projectId]/capitalization` - Capitalization index page

### New Components
- `LifecycleTileNav` - Colored tile navigation for project modes
- `ProjectModeProvider` - Context for napkin/standard mode switching
- `NapkinAnalysisPage` - Napkin analysis landing with RLV, pricing panels
- `WaterfallResults` - Waterfall calculation results display
- `UserModals` (Add/Edit/Reset/Delete) - User management modals

---

## 1. Navigation Architecture

### 1.1 Primary Navigation
- **Component:** `TopNavigationBar` (`src/app/components/TopNavigationBar.tsx:1`)
- **Pattern:** Sticky horizontal bar at the top of every page rendered through `NavigationLayout`.
- **Structure:**
  - Left: Inverted Landscape logo linking to `/`.
  - Right cluster: Global nav links (`GLOBAL_NAV_LINKS` → Dashboard `/dashboard`, Documents `/dms`), "Landscaper AI" trigger, `SandboxDropdown`, `UserMenuDropdown`, `SettingsDropdown`, theme toggle, bug reporter icon.
  - Uses `usePathname` to highlight the active link, inline hover handlers to emulate pill hover states, and CSS variables defined in `src/styles/tokens.css` for color (58 px tall, `z-index` 50, border bottom `var(--nav-border)`).
- **Interaction notes:**
  - Theme toggle is driven by `CoreUIThemeProvider` context and updates `data-theme` attributes globally.
  - Bug reporter button integrates with `IssueReporter` context to provide contextual hints when no element has been targeted.
  - Drop-down components rely on the shared `useOutsideClick` hook to close on blur.
- **Responsive behavior:** Flex container with wrapping disabled; on narrow screens the items compress horizontally (no hamburger yet) → the "clumsy" behavior stems from scroll overflow once width < ~1100px.

```
+---------------------------------------------------------------------+
| LOGO | Dashboard | Documents | AI | Sandbox ▾ | User ▾ | Settings ▾ |
|                                                    Theme | Bug 🐞    |
+---------------------------------------------------------------------+
```

### 1.2 Project Navigation Layer
- **Component:** `ProjectContextBar` (`src/app/components/ProjectContextBar.tsx:1`).
- **Scope:** Automatically injected for all `/projects/[projectId]` routes via `projects/[projectId]/layout.tsx:1` under the global navigation.
- **Layout:** Sticky bar positioned at `top: 58px`, height 56 px, `z-index` 40.
  - Left: `<select>` bound to `useProjectContext`; selecting pushes `/projects/{id}` and persists via `ProjectProvider`.
  - Center: **Mode toggle** (Napkin/Standard) using `useProjectMode` context.
  - Right: **LifecycleTileNav** component showing colored navigation tiles based on project type and mode.
- **State sources:**
  - Tab selection is read from the URL path using `usePathname` for tile-based navigation.
  - Mode (Napkin/Standard) determined by URL path (`/napkin` segment).
  - Tab-specific complexity modes (Napkin/Standard/Detail for data granularity) saved through `usePreference` (database-backed).
- **Changes since Nov 23:**
  - Added `LifecycleTileNav` component for visual tile-based navigation
  - Integrated `ProjectModeProvider` for napkin/standard mode switching
  - Mode toggle button added to switch between napkin and standard workflows

### 1.3 Ancillary Navigation Surfaces
- **Sandbox / Developer links:** `SandboxDropdown` (`src/app/components/navigation/SandboxDropdown.tsx:1`) lists every prototype route (Budget Grid, GIS test, Document Review, etc.). It is the only entry point to most prototypes.
- **Admin nav:** `AdminNavBar` (`src/app/components/AdminNavBar.tsx:1`) mirrors the tab bar for `/admin/*` routes. It is sticky at `top:58px` and exposes Preferences, Benchmarks, Cost Library, **Users**, and DMS Admin.
- **Preferences nav:** `PreferencesContextBar` (`src/app/components/PreferencesContextBar.tsx:1`) is a simplified copy of `ProjectContextBar` that sits directly under the top bar (no offset) and keeps the `tab` query string in sync.
- **Legacy vertical nav:** `src/app/components/layout/vertical/Navigation.tsx` still ships the Materio sidebar (MUI + `@menu/vertical-menu`). It is only mounted inside older prototype pages such as `/projects/[projectId]/overview`.
- **Route-level wrappers:** `NavigationLayout` (`src/app/components/NavigationLayout.tsx:1`) wraps the entire app (see `src/app/layout.tsx:1`) and can hide navigation for future auth/marketing routes via `hideNavigation` prop.

### 1.4 Route Structure

**Note on Dual-Access Pattern:** Several features can be accessed BOTH as tabs within `/projects/[projectId]?tab=X` AND as standalone routes. This pattern provides deep-linking and focused workflows:
- **Budget**: Tab (`?tab=budget`) or route (`/projects/[projectId]/budget`)
- **Valuation**: Tab (`?tab=valuation`) or route (`/projects/[projectId]/valuation`)
- **Operations (OpEx)**: Tab (`?tab=operations`) or routes (`/projects/[projectId]/opex`, `/opex-accounts`)
- **Planning**: Tab (`?tab=planning`) or route (`/planning` - hardcoded to project 7)

**Note on Project Modes:** Projects can operate in two modes:
- **Standard Mode**: Full project workflow at `/projects/[projectId]/*`
- **Napkin Mode**: Simplified analysis workflow at `/projects/[projectId]/napkin/*`

Representative tree of `src/app` (pages without `page.tsx` are omitted):

```
/ (redirects to /dashboard)
├── dashboard (redesigned with filter tiles + map)
├── dms
├── planning (standalone, defaults to project 7)
├── reports
├── rent-roll
├── documents
│   └── review
├── ai-document-review
├── market, market-assumptions, inventory
├── projects
│   ├── [projectId]
│   │   ├── page (tab host - renders based on ?tab= query param)
│   │   ├── layout (injects ProjectContextBar + ComplexityModeProvider + ProjectModeProvider)
│   │   ├── napkin/ (NEW - Napkin mode)
│   │   │   ├── page (napkin analysis landing)
│   │   │   ├── layout (napkin-specific layout)
│   │   │   ├── analysis/page
│   │   │   ├── waterfall/page
│   │   │   └── documents/page
│   │   ├── capitalization/ (NEW)
│   │   │   ├── page (index)
│   │   │   ├── equity/page
│   │   │   ├── debt/page
│   │   │   └── operations/page
│   │   ├── overview (legacy Materio page)
│   │   ├── budget (standalone budget page with scope/stage filters)
│   │   ├── valuation (standalone valuation page - three approaches)
│   │   ├── assumptions (standalone assumptions editor)
│   │   ├── settings (project settings page)
│   │   ├── opex (multifamily operating expenses editor)
│   │   └── opex-accounts (Chart of Accounts hierarchy viewer)
│   └── setup (project creation wizard)
├── admin
│   ├── preferences
│   ├── benchmarks
│   │   └── cost-library
│   ├── users (NEW - User Management System)
│   └── dms
│       └── templates
├── preferences (global tabs → product library & taxonomy)
├── settings
│   ├── taxonomy (land use taxonomy manager)
│   └── budget-categories (budget category management)
├── benchmarks
│   ├── unit-costs
│   └── products
├── growthrates (Materio version)
├── growthrates-original
├── growthratedetail
├── growthratesmanager
├── prototypes
│   ├── page (prototypes hub)
│   ├── [prototypeId] (dynamic prototype routes)
│   └── multifam
│       └── rent-roll-inputs
│           ├── page (main rent roll prototype)
│           └── content (nested content page)
├── prototypes-multifam (multifamily prototypes index)
├── lease/[id] (legacy lease detail)
├── property/[id] (legacy property detail)
├── properties/[id]/analysis (legacy property analysis)
├── gis-test, gis-simple-test, map-debug, parcel-test
├── db-schema (database schema viewer)
├── test-coreui (CoreUI testing page)
└── misc sandbox routes: budget-grid(+v2), breadcrumb-demo, documentation, dev-status, etc.
```

**Dynamic segments:**
- **Project routes:** `/projects/[projectId]/*` (tab host, budget, valuation, assumptions, settings, opex, opex-accounts, overview, napkin/*)
- **Prototype routes:** `/prototypes/[prototypeId]`
- **Legacy routes:** `/lease/[id]`, `/property/[id]`, `/properties/[id]/analysis`

### 1.5 Project Context Switching
- **Provider:** `ProjectProvider` (`src/app/components/ProjectProvider.tsx:1`) wraps the entire app in `src/app/layout.tsx:12`. It loads `/api/projects` through SWR, caches results, and stores the last project ID in `localStorage` (`activeProjectId`).
- **Selection surfaces:**
  - `ProjectContextBar` dropdown (primary way during project work).
  - `Dashboard` project accordion rows call `selectProject(project_id)` then push `/projects/{id}` (`src/app/dashboard/page.tsx`).
  - `NewProjectModal` (`src/app/components/NewProjectModal.tsx:1`) refreshes projects, selects the new ID, and navigates the user to `/projects/{id}` after creation.
- **Persistence:** Provider rehydrates from storage on mount and automatically falls back to the first project returned by `/api/projects` if the stored ID is missing.
- **Propagation:** `useProjectContext` is consumed by DMS, Planning, and numerous tab components to show project-specific data. Outside `/projects/*` routes there is no visible selector, so users must return to a project page to change context.

### 1.6 Tab Implementations
| Surface | Component / File | Behavior |
| --- | --- | --- |
| Project tiles | `LifecycleTileNav` (`src/components/projects/LifecycleTileNav.tsx`) | Colored tiles using URL path navigation; tiles differ by property type (DEV vs Income) and mode (Napkin vs Standard). |
| Project tabs | `ProjectContextBar` (`src/app/components/ProjectContextBar.tsx:1`) | Stateless buttons hooked to URL query; displays `ModeChip`s driven by `usePreference`. |
| DMS tabs | `LandscapeButton` pills in `src/app/dms/page.tsx` (also exported in `DMSView`) | Manual state stored in `useState<TabType>`; optionally synchronized with `?tab` on first load. |
| Budget subtabs | `BudgetGridTab` (`src/components/budget/BudgetGridTab.tsx:36`) uses `useState<'grid' \| ...>` plus CoreUI `CNav` for grouping toggle inside the card. |
| Admin nav | `AdminNavBar` (see above) uses Next `<Link>` objects with pure CSS for active state. |
| Preferences | `PreferencesContextBar` controls `?tab=` query, rendering dynamic imports per tab. |
| **Operations** | `OperationsTab` (`src/app/projects/[projectId]/components/tabs/OperationsTab.tsx:1`) **renders different UIs based on project type:** For `DEV` projects → `OpExHierarchy` (Chart of Accounts). For `MF` projects → `NestedExpenseTable` with benchmarks. For other types → "Coming Soon" placeholder. |
| Planning | `PlanningTab` wraps `PlanningContent` for `DEV` projects; shows educational card for other types. |
| Sales & Absorption | `SalesTab` renders `SalesContent` for `DEV` projects, otherwise shows guidance card. `SalesContent` orchestrates area/phase filters, pricing tables, inventory gauges, and parcel sales grid. |
| Property | `PropertyTab` shows multifamily rent roll interface with Floor Plan Matrix, Comparable Rentals, Detailed Rent Roll sections (currently mock data). |
| Valuation | `ValuationTab` has sub-tabs (Sales Comparison/Cost/Income) using button toggles; only Sales Comparison is active. |
| Feasibility | `FeasibilityTab` has sub-tabs (Sales Comparison/Residual/Cash Flow) - all currently disabled/placeholder. |
| Capitalization | `CapitalizationTab` - placeholder for future capitalization modeling. |
| Reports | `ReportsTab` renders report-type selector and scenario toggle; embeds `PropertySummaryView`. |
| Documents | `DocumentsTab` embeds `DMSView` scoped to active project. |
| Document Review | Uses Radix Tabs (`src/app/documents/review/page.tsx:37`) for queue / detail / analytics; default tab is "queue". |
| Project-specific prototypes | Many smaller surfaces reuse `LandscapeButton` toggles (e.g., `/projects/[projectId]/budget/page.tsx:27`). |

**Tab Sets by Property Type**

`getTabsForPropertyType` (`src/lib/utils/projectTabs.ts:1`) returns two canonical configurations:

| Project Type | Tabs (in order) | Notes |
| --- | --- | --- |
| **Development** (`DEV`, `MPC`, `Subdivision`, etc.) | `project`, `planning`, `budget`, `operations`, `sales`, `feasibility`, `capitalization`, `reports`, `documents` | Sales & Absorption and Feasibility are only wired for land workflows today. |
| **Income / Multifamily** (`MF`, `OFF`, `RET`, `IND`, `MXU`, `HTL`) | `project`, `property`, `operations`, `valuation`, `capitalization`, `reports`, `documents` | Property/Operations/Valuation tabs are the only ones with meaningful UI; other commercial-specific tabs are placeholders pending requirements. |

**LifecycleTileNav Tile Sets** (`src/components/projects/LifecycleTileNav.tsx`)

| Mode | Property Type | Tiles |
| --- | --- | --- |
| Standard | DEV | Home, Planning, Budget, Sales, Analysis, Reports, Documents, Capitalization (Pro) |
| Standard | Income (MF, OFF, etc.) | Home, Property, Operations, Valuation, Capitalization (Pro), Reports, Documents |
| Napkin | All | Home, Analysis, Documents |

### 1.7 Header and Breadcrumb Patterns
- **Standard header:** `PageHeader` (`src/components/ui/PageHeader.tsx:1`) renders a breadcrumb ordered list plus action slots. Only a handful of prototype pages import it today; most major screens still craft headers manually.
- **Dynamic breadcrumbs:** `DynamicBreadcrumb` (`src/app/components/DynamicBreadcrumb.tsx:1`) adapts copy (Area/Phase/Parcel vs Property/Building/Unit) based on `useProjectConfig`. Currently used in the breadcrumb demo and GIS planning cards; production screens have not wired it in yet.
- **Ad-hoc breadcrumbs:**
  - DMS documents tab outputs `Home > Projects > {Project Name}` using `LandscapeButton`s (`src/app/dms/page.tsx:306`).
  - Land Use Taxonomy page ships its own CSS/HTML breadcrumb (`src/app/settings/taxonomy/page.tsx:90`).
- **Color hierarchy:** `docs/HEADER_COLOR_HIERARCHY.md` defines the header palette backed by CSS variables in `src/styles/tokens.css`. The design tokens are already applied in `BudgetDataGrid`, `BenchmarkAccordion`, and other components to standardize header backgrounds.

### 1.8 Project Mode System (Napkin/Standard)

**NEW Section - Added December 2025**

The Project Mode system allows users to switch between two workflow complexity levels:

- **Napkin Mode:** Simplified, high-level analysis workflow for quick feasibility assessments
- **Standard Mode:** Full-featured workflow with all project management capabilities

**Provider:** `ProjectModeProvider` (`src/contexts/ProjectModeContext.tsx`)

**Key Features:**
- Mode determined by URL path (`/napkin` segment)
- Automatic mode switching via `setMode()` or `toggleMode()`
- Persists across page navigations within the same project

**Context Interface:**
```typescript
{
  mode: 'napkin' | 'standard';
  setMode: (mode: ProjectMode) => void;
  toggleMode: () => void;
}
```

**Used By:**
- `LifecycleTileNav` - Determines which tiles to display
- `ProjectContextBar` - Shows mode toggle button
- `/projects/[projectId]/napkin/*` pages - Auto-set to napkin mode

**Napkin Mode Routes:**
| Route | Component | Purpose |
| --- | --- | --- |
| `/projects/[projectId]/napkin` | `NapkinPage` | Napkin mode landing with Property/Project tabs |
| `/projects/[projectId]/napkin/analysis` | `NapkinAnalysisPage` | RLV summary, pricing panels, Landscaper |
| `/projects/[projectId]/napkin/waterfall` | `NapkinWaterfallPage` | Waterfall analysis with `NapkinWaterfallForm` |
| `/projects/[projectId]/napkin/documents` | Documents view | Project-scoped document management |

---

## 2. Page Inventory
For each page, the summary reflects the current code in `/src` as of this snapshot. Routes reachable only through the sandbox dropdown are marked as **prototype** but still documented when they influence workflow decisions.

### Dashboard (`/dashboard`)
**Purpose:** Landing experience after `/` auto-redirect. Shows overall project list, highlights, and an entry point for creating or selecting projects.

**Layout (Redesigned November 2025):**
- Top: Sticky card with project count filter tiles (All, Development, Multifamily, Commercial, Retail, Office, Industrial)
- Left column: Project accordion with expandable list, sorted by last accessed time
- Right column: Interactive map with project markers
- Bottom left: `UserTile` for AI chat input

**Key Components:**
- `ProjectCountTiles` – clickable filter tiles showing count per property type
- `ProjectAccordion` – collapsible list with project details, type badges, location
- `DashboardMap` (`src/app/components/dashboard/DashboardMap.tsx`) – MapLibre-based map showing project markers
- `UserTile` (`src/app/components/dashboard/UserTile.tsx`) – chat-like input for Landscaper AI
- `NewProjectModal` – toggled by clicking "+ New Project" button

**Data Sources:**
- `useProjectContext` for list of projects (SWR-loaded from `/api/projects`).
- Map component consumes same context data plus geocoding utilities.
- Last accessed timestamps stored in `localStorage` for sorting

**User Interactions:**
- Filter tile click: Toggles property type filter (or "All" to clear)
- Accordion row click: Selects project, records access timestamp, navigates to project
- New project button: Opens modal (multi-step form using React Hook Form and Zod validation)

**Property Type Codes:**
- `DEV` (Development), `MF` (Multifamily), `OFF` (Office), `RET` (Retail), `IND` (Industrial), `HTL` (Hotel), `MXU` (Mixed-Use)

### Project Workspace (`/projects/[projectId]`)
**Purpose:** Multi-tab workspace acting as the "Project Overview" area called out in requirements.

**Layout:**
- `ProjectContextBar` across the top for project + tab selection + mode toggle.
- `LifecycleTileNav` for visual navigation tiles (colored, route-based).
- Tab host component `src/app/projects/[projectId]/page.tsx` reads `?tab=` and renders one of the imported tab modules.
- Each tab uses CoreUI cards, grid layouts, or custom tables depending on domain. The available tabs depend on property type:
  - **Development projects** expose `Planning`, `Budget`, `Sales`, `Feasibility`, `Capitalization`, `Reports`, `Documents`, plus legacy `Sources/Uses/GIS`.
  - **Multifamily/Income-type projects** expose `Property`, `Operations`, `Valuation`, `Capitalization`, `Reports`, `Documents`. Other commercial project types still reuse these income templates until feature work lands.

**Key Components:**
- `ProjectTab` (massive detail view with contact sections, location editing, inflation schedule modal, etc.).
- `PlanningTab` – wraps `PlanningContent` for DEV projects, otherwise shows an educational card.
- `BudgetTab` – thin wrapper around `BudgetContainer` (see Budget section).
- `SalesTab`, `OperationsTab`, etc. – mostly prototypes with placeholder data but still shipping UI.
- `ReportsTab` – described later.
- `DocumentsTab` – embeds `DMSView` scoped to the active project.

**Data Sources:**
- Each tab fetches its own API slice (`/api/projects/{id}/details`, `/api/budget/...`, `/api/parcels`, etc.).
- Shared contexts: `useProjectContext`, `ComplexityModeProvider`, `ProjectModeProvider`, `ScenarioProvider` (inside some tabs).

**Interactions:**
- Tab switching rewrites `?tab` query (no `history.replace`, so each click pushes a new entry).
- Mode toggle switches between `/projects/{id}` (standard) and `/projects/{id}/napkin` (napkin).
- Many modals (`BudgetItemModalV2`, `NewProjectModal`, scenario modals) are local to tabs.

### Napkin Mode (`/projects/[projectId]/napkin`)

**NEW Page - Added November 2025**

**Purpose:** Simplified analysis workflow for quick feasibility assessments without full project data entry.

**Layout:**
- `CNav` tabs for Property/Project switching
- Property tab: `NapkinAnalysisPage` with RLV summary, pricing panels
- Project tab: Project overview information

**Key Components:**
- `NapkinAnalysisPage` (`src/components/napkin/NapkinAnalysisPage.tsx`) - Main analysis interface
- `RlvSummaryCard` - Residual land value summary
- `NapkinSfdPricing`, `NapkinAttachedPricing` - Product pricing panels
- `MdrPanel`, `CommercialPanel`, `InfrastructurePanel` - Product type panels
- `LandscaperPanel` - AI chat integration
- `PromoteModal` - Modal to promote napkin analysis to full project

**Data Sources:**
- Uses `useProjectContext` for project data
- Pricing data from `/api/projects/{id}/napkin` endpoints

### Napkin Waterfall (`/projects/[projectId]/napkin/waterfall`)

**NEW Page - Added December 2025**

**Purpose:** Waterfall distribution analysis in napkin mode.

**Layout:**
- Split view: `NapkinWaterfallForm` (left) + `WaterfallResults` (right)
- Form includes IRR/Equity Multiple toggle
- Results show period-by-period distributions

**Key Components:**
- `NapkinWaterfallForm` (`src/components/capitalization/NapkinWaterfallForm.tsx`)
  - Waterfall type toggle (IRR / Equity Mult / IRR + EM)
  - IRR hurdle table with tier inputs
  - Equity multiples table
  - Period inputs (investment, sale proceeds, cash flow)
- `WaterfallResults` (`src/components/capitalization/WaterfallResults.tsx`)
  - Period-by-period distribution table
  - Pref/Hurdle/Residual columns by mode
  - Cumulative accrued tracking

**Data Sources:**
- `/api/projects/{id}/waterfall/napkin` - Save/load waterfall inputs
- `/api/projects/{id}/waterfall/calculate` - Calculate distributions

### User Management (`/admin/users`)

**NEW Page - Added November 2025**

**Purpose:** Full CRUD user management for administrators.

**Layout:**
- Table of all users with columns: Name, Email, Role, Active status, Actions
- Action buttons: Add User, Refresh
- Row actions: Edit, Reset Password, Delete

**Key Components:**
- `AdminUsersContent` - Main page component
- `AddUserModal` - Create new user form
- `EditUserModal` - Edit existing user
- `ResetPasswordModal` - Reset user password
- `DeleteUserModal` - Confirm user deletion

**Data Sources:**
- `/api/admin/users` endpoints via `@/lib/api/admin-users`
- Protected by `ProtectedRoute` component

**User Interactions:**
- Add user: Opens modal with form fields (name, email, role, password)
- Edit: Opens modal with pre-filled user data
- Reset password: Opens modal to set new password
- Delete: Confirmation dialog before deletion
- Activate/Deactivate: Toggle user active status inline

### Budget (`/projects/[projectId]?tab=budget`, `/projects/[projectId]/budget`, `/budget-grid`, `/budget-grid-v2`)
**Purpose:** Provide grid, timeline, and analysis views of development budgets.

**Layout & Tabs:**
- Inside the main tab: `BudgetContainer` -> `BudgetGridTab` (default) plus placeholders for `TimelineTab`, `AssumptionsTab`, `AnalysisTab`.
- Standalone `/projects/[projectId]/budget` route renders `BudgetGridWithTimeline` with additional scopes (Project/Area/Phase) and Stage filters.
- Legacy `/budget-grid` and `/budget-grid-v2` pages mount MUI-based prototypes and rely on manual project selectors.

**Key Components:**
- `BudgetGridTab` (`src/components/budget/BudgetGridTab.tsx:36`): orchestrates mode selection, filters, container filters, and orchestrates `BudgetDataGrid`.
- `BudgetDataGrid` (`src/components/budget/BudgetDataGrid.tsx:1`): TanStack table with optional grouping, inline editing, custom expandable rows, virtualization per mode.
- `BudgetItemModalV2`, `QuickAddCategoryModal`, `TimelineChart`, `FiltersAccordion`, `AssumptionsTab`, `AnalysisTab`.
- `TimingEscalationTile`, `CostControlsTile` - New tiles for budget controls

**Data Sources:**
- `useBudgetData` hook fetches `/api/budget/gantt?projectId=` and normalizes rows.
- `BudgetDataGrid` optionally fetches variance data via `useBudgetVariance` hook and category metadata through `useBudgetGrouping`.
- Container filters rely on `/api/projects/{id}/containers` via `useContainers`.

**Interactions:**
- Mode selector persists per project in `localStorage`.
- Group button toggles aggregated view (persisted preference via `useBudgetGrouping`).
- Inline editing triggers `onInlineCommit` to call `/api/budget/gantt/items/{factId}` (see hook).
- Timeline toggle shows `TimelineChart`; `TimelineTab` placeholder describes future Gantt layout.

### Planning (`/planning`, `/projects/[projectId]?tab=planning`)
**Purpose:** Manage Areas/Phases/Parcels for land development projects.

**Layout:**
- Standalone `/planning` defaults to project ID 7 (Peoria Lakes) and wraps `PlanningContent` inside a full-height container with neutral background.
- Project tab version shares the same component when property type code is `DEV`, otherwise displays a message.

**Key Components:**
- `PlanningContent` (`src/app/components/Planning/PlanningContent.tsx:1`): orchestrates parcel/phase fetching via SWR, area cards, filtering, editing modals, and integration with `PlanningWizard` components.
- `PlanningOverviewControls`, `CollapsibleSection`, `ParcelDetailCard`, etc.

**Data Sources:** `/api/parcels?project_id=`, `/api/phases?project_id=`, `useProjectConfig` for naming, `window` events for cross-component refresh.

### Reports (`/reports`, `/projects/[projectId]?tab=reports`)
**Purpose:** Provide financial reporting outputs and PDF exports.

**Layout:**
- `/reports` page has static property ID 17 for now; header includes scenario selector and embeds `PropertySummaryView`.
- Project `ReportsTab` adds a report-type selector (Property Summary / Cash Flow / Rent Roll) and scenario toggle.

**Key Components:**
- `PropertySummaryView` (`src/components/reports/PropertySummaryView.tsx:1`): fetches metrics from backend (`${NEXT_PUBLIC_BACKEND_URL}/api/reports/calculate/noi/{property}`) and renders metric cards + CoreUI table.
- CoreUI components for buttons, nav pills.

**Data Sources:** remote backend service; scenario toggles simply change query parameter.

### Sales & Absorption (`/projects/[projectId]?tab=sales`)
**Purpose:** Dedicated land-development workspace for managing lot inventory, pricing, and absorption assumptions.

**Layout:**
- Entire view comes from `SalesContent` (`src/components/sales/SalesContent.tsx`) wrapped by `SalesTab`. Non-DEV projects see an educational card explaining why the tab is unavailable.
- Page body is split into stacked `CollapsibleSection`s:
  - **Annual Inventory Gauge** – top section displaying `AnnualInventoryGauge` visualization for selected project.
  - **Areas & Phases vs Land Use Pricing** – two-column grid (5/12 + 7/12). Left column contains `AreaTiles` and custom `PhaseTiles` so users can multi-select geography; right column renders the `PricingTable` filtered by phase selection.
  - **Parcel Sales Table** – full-width section with `ParcelSalesTable` summarizing absorption pipeline.

**Key Components:**
- `AreaTiles` (`src/components/shared/AreaTiles.tsx`) & `PhaseTiles` (`src/components/sales/PhaseTiles.tsx`) reuse the planning tile pattern with cost overlays when `showCosts` is true.
- `PricingTable` (`src/components/sales/PricingTable.tsx`) – shows land-use specific price ladders with filtering by phase.
- `ParcelSalesTable` (`src/components/sales/ParcelSalesTable.tsx`) – detailed grid of parcels, status, buyer, price, absorption month.
- `SaleCalculationModal` – modal for calculating individual parcel sales.

### Documents (DMS) (`/dms`, `/projects/[projectId]?tab=documents`, `/documents/review`)
**Purpose:** Document management and AI review.

**Layout:**
- `/dms` page uses a vertical flex container occupying the viewport.
  - Top: `LandscapeButton`-based tabs (Documents / Upload).
  - Document tab includes toolbar, filter accordions (two columns), detail panel when accordion items clicked, and `ProfileForm` for metadata.
  - Upload tab splits the screen between `Dropzone`, `Queue`, and profile editor.
- `DocumentsTab` inside projects renders `DMSView` with `hideHeader=false`, so it duplicates the same UI but respects the active project from context.

**Key Components:**
- `DMSView` (`src/components/dms/DMSView.tsx:1`) – shared logic used in both contexts.
- `AccordionFilters`, `FilterDetailView`, `Dropzone`, `Queue`, `ProfileForm`.

**Recent Changes (December 2025):**
- **Multi-select deletion**: Checkbox selection enables delete button, supports batch deletion
- **Toast notifications**: Replaced `alert()` with non-blocking toast for "Profile Updated!"
- **Multi-filter expansion**: Changed from single `expandedFilter` to `expandedFilters` Set
- **Document row highlighting**: Selected/checked documents show blue background
- **Profile form simplification**: Removed versioning label, moved date inline with name

**Data Sources:**
- Document types from `/api/dms/templates/doc-types` (project_id + workspace).
- Counts from `/api/dms/filters/counts`.
- Filter detail results from `/api/dms/search`.

### Capitalization (`/projects/[projectId]/capitalization/*`)

**Purpose:** Manage project capitalization including equity, debt, and developer operations.

**Routes:**
- `/projects/[projectId]/capitalization` - Index page
- `/projects/[projectId]/capitalization/equity` - Equity structure
- `/projects/[projectId]/capitalization/debt` - Debt facilities
- `/projects/[projectId]/capitalization/operations` - Developer operations

**Key Components:**
- `CapitalizationSubNav` - Sub-navigation for capitalization pages
- `DeveloperFeesTable` - Developer fee management
- `ManagementOverheadTable` - Overhead expense tracking
- `WaterfallDistributionTable` - Waterfall distribution display

### GIS / Map Views (`/gis-test`, `/gis-simple-test`, `/map-debug`, `/parcel-test`)
**Purpose:** Support GIS ingestion, parcel navigation, and debugging workflows.

**Key Components:**
- `GISSetupWorkflow`, `ProjectStructureChoice`, `PropertyPackageUpload`, and `PlanNavigation` (`src/app/components/GIS/PlanNavigation.tsx:1`).
- `GISMap` (`src/app/components/MapLibre/GISMap.tsx:1`) – MapLibre integration with tile sources, parcel selection, geocoding, and selection modes.
- `MapOblique` (`src/components/map/MapOblique.tsx`) - Oblique aerial imagery integration
- `ProjectTabMap` (`src/components/map/ProjectTabMap.tsx`) - Map for Property tab rentals

**Data Sources:** `/api/gis/plan-parcels`, `/api/projects/{id}/choose-structure`, `/api/ai/ingest-property-package`, etc.

### Admin Pages
1. **Global Benchmarks** (`/admin/benchmarks`):
   - Uses `AdminNavBar` + split-pane layout.
   - Loads benchmark registry (`/api/benchmarks`), sale benchmarks, AI suggestions, absorption velocity, and unit-cost templates in parallel.
   - Contains `BenchmarkAccordion`, `GrowthRateCategoryPanel`, `AbsorptionVelocityPanel`, `BenchmarksFlyout`, `AddBenchmarkModal`.
2. **Cost Library** (`/admin/benchmarks/cost-library`):
   - Houses `UnitCostsPanel` for editing unit cost templates.
3. **DMS Templates Admin** (`/admin/dms/templates`):
   - CRUD form for document templates. Uses CoreUI forms and interacts with `/api/dms/templates`.
4. **Admin Preferences** (`/admin/preferences`):
   - Contains `UnitOfMeasureManager` for UOM CRUD operations.
5. **User Management** (`/admin/users`) **NEW**:
   - Full CRUD user management with add/edit/delete/password reset modals.

### Operating Expenses - Multifamily (`/projects/[projectId]/opex`, `/projects/[projectId]?tab=operations`)

**Purpose:** Manage multifamily operating expenses with complexity mode support (Napkin/Standard/Detail).

**Dual Access:**
- **Tab:** Accessible via `?tab=operations` for `MF` projects (renders `OperationsTab` with `NestedExpenseTable`)
- **Standalone Route:** `/projects/[projectId]/opex` provides focused operating expense editor

**Layout (Operations Tab - MF projects):**
- Summary metrics bar (4 tiles: Total OpEx, Per Unit, Per SF, Expense Ratio)
- Two-column grid:
  - Left (2/3): `NestedExpenseTable` with hierarchical expense rows
  - Right (1/3): `BenchmarkPanel` showing market comparison
- Restore notice banner (when reverting to previous mode)
- Unsaved changes floating action button

**Key Components:**
- `NestedExpenseTable` (`src/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx`) - hierarchical expense table with expand/collapse, inline editing, category filters
- `BenchmarkPanel` (`src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx`) - market benchmark comparison

**For DEV Projects:** Operations tab shows `OpExHierarchy` component instead (Chart of Accounts view).

---

## 3. Component Architecture
This section highlights the principal layout/navigation/data components referenced elsewhere.

### NavigationLayout
**File:** `src/app/components/NavigationLayout.tsx:1`
**Purpose:** Provides the universal flex column shell with optional ability to hide navigation.

```typescript
interface NavigationLayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
}
```
**Used By:** Wrapped around every page inside `src/app/layout.tsx`.
**Children:** `TopNavigationBar` + `<main>{children}</main>`.
**Styling:** Tailwind `flex min-h-screen flex-col`; theme colors inherited from `CoreUIThemeProvider`.

### TopNavigationBar
**File:** `src/app/components/TopNavigationBar.tsx:1`
**Purpose:** Tier-1 navigation with contextual tools.
**Props Interface:** None (functional component using hooks).
**Used By:** `NavigationLayout`.
**Children:** Logo, nav links, `SandboxDropdown`, `UserMenuDropdown`, `SettingsDropdown`, theme toggle, bug reporter, `LandscaperChatModal`.
**Styling:** Inline CSS using CSS variables for nav background/borders defined in `tokens.css`.

### ProjectContextBar
**File:** `src/app/components/ProjectContextBar.tsx:1`
**Purpose:** Tier-2 navigation for project-specific work.
**Props:** `projectId: number`.
**Used By:** `projects/[projectId]/layout.tsx`.
**Children:** `<select>` for project selection, mode toggle button, `LifecycleTileNav` for tile navigation.
**Styling:** Sticky bar with manual inline colors referencing CoreUI semantic vars.

### LifecycleTileNav (NEW)
**File:** `src/components/projects/LifecycleTileNav.tsx`
**Purpose:** Visual tile-based navigation for project workflows.
**Props:**
```typescript
interface LifecycleTileNavProps {
  projectId: string;
  propertyType?: string;
}
```
**Used By:** `ProjectContextBar`
**Features:**
- Colored tiles (140px × 81px) with hover effects
- Different tile sets for Standard vs Napkin mode
- Different tile sets for DEV vs Income property types
- Pro-only tiles (Capitalization) hidden for non-pro users
- Active tile border highlighting

### ProjectModeProvider (NEW)
**File:** `src/contexts/ProjectModeContext.tsx`
**Purpose:** Context for managing napkin/standard project modes.
**Used By:** Project layout, all project pages
**Features:**
- URL-based mode detection (`/napkin` segment)
- Mode switching via router navigation
- `useProjectMode` hook for consuming context

### LandscapeButton
**File:** `src/components/ui/landscape/LandscapeButton.tsx:1`
**Purpose:** Wrapper around `CButton` with optional icon, loading state.
**Props Interface:** Extends `CButtonProps` with `loading`, `icon`, `iconRight`.
**Used By:** DMS tabs, Budget prototypes, `BudgetPage` header actions, Document breadcrumbs, etc.
**Styling:** Relies on CoreUI theme so it stays consistent regardless of global scheme.

### ModeChip
**File:** `src/components/ui/ModeChip.tsx:1`
**Purpose:** Visual indicator of Napkin/Standard/Detail complexity modes.
**Props:** `mode: 'napkin' | 'standard' | 'detail'`.
**Used By:** `ProjectContextBar` tab items.
**Styling:** `CTooltip` + small square colored via CSS variables.

### Napkin Components (NEW)

**NapkinAnalysisPage**
- **File:** `src/components/napkin/NapkinAnalysisPage.tsx`
- **Purpose:** Main napkin analysis interface
- **Features:** RLV summary, pricing panels, Landscaper chat, promote modal

**NapkinWaterfallForm**
- **File:** `src/components/capitalization/NapkinWaterfallForm.tsx`
- **Purpose:** Waterfall input form with IRR/EM toggle
- **Features:** Tier-based hurdle rates, equity multiples, period inputs, save state management

**WaterfallResults**
- **File:** `src/components/capitalization/WaterfallResults.tsx`
- **Purpose:** Display waterfall calculation results
- **Features:** Period table, distribution breakdown, cumulative tracking

### Budget Stack
- **BudgetDataGrid** (`src/components/budget/BudgetDataGrid.tsx:1`): Table built with TanStack Table and inline virtualization.
- **BudgetGridTab**: orchestrates filter state, mode persistence, hooking `useBudgetData`.
- **TimingEscalationTile**, **CostControlsTile** (NEW): Budget control tiles
- **Hooks:** `useBudgetData`, `useBudgetGrouping`, `useBudgetVariance`, `useContainers` for data & preferences.
- **Modals:** `BudgetItemModalV2`, `QuickAddCategoryModal`, `ConfigureColumnsModal`.

### DMS Components

**DMSView**
- **File:** `src/components/dms/DMSView.tsx`
- **Recent Changes:**
  - `checkedDocIds` state (Set<number>) for multi-select
  - `expandedFilters` (Set<string>) for multi-accordion expansion
  - Toast notification system for save feedback

**AccordionFilters**
- **File:** `src/components/dms/filters/AccordionFilters.tsx`
- **Recent Changes:**
  - Document row highlighting for selected/checked items
  - Removed version label from document rows
  - Date moved inline with document name
  - Description display below document name

---

## 4. Styling System

### Frameworks
- **Tailwind CSS 3.4** – utility classes applied throughout components (`tailwind.config.js` extends palette with CSS variables).
- **CoreUI 5** – provides the base token system (`var(--cui-*)`) and components (cards, buttons, tables).
- **MUI 7** – used by Materio prototypes and specific pages such as `/budget-grid`, `/projects/[projectId]/overview`.
- **Custom CSS:**
  - `src/app/globals.css` imports Tailwind layers plus custom overrides (table header backgrounds, focus indicators, planning tile specificity).
  - `src/styles/tokens.css` defines brand, surface, text, nav, and chip variables with light/dark scopes.
  - `src/styles/component-patterns.css` centralizes repeated patterns (accordion headers, planning tiles, budget rows, stat cards).

### Theme System
- `CoreUIThemeProvider` toggles `data-theme` and `data-coreui-theme`, ensuring CoreUI + custom CSS stay in sync.
- Dark mode defaults to `dark` on first load and persists to `localStorage('coreui-theme')`.
- Header color hierarchy documented in `docs/HEADER_COLOR_HIERARCHY.md` keeps `--surface-card-header` / `--surface-subheader` consistent.

### Design Tokens & Access
- Components reference CSS variables via inline styles (`style={{ backgroundColor: 'var(--cui-body-bg)' }}`) or Tailwind `text-[color]` classes.
- Tailwind config exposes extended colors bridging tokens to utilities (e.g., `bg-surface-card` resolves to `var(--surface-card)`).
- Spacing: mixture of Tailwind (`px-6 py-4`, `gap-3`) and CoreUI spacing tokens.
- Typography: CoreUI base fonts plus Tailwind `text-sm`, `font-semibold` classes.

### Layout Consistency Status

**Canonical Values:**
- TopNavigationBar: height 58px, padding 0 16px, z-index 50
- ProjectContextBar: height 56px, top offset 58px, z-index 40
- Main content area: padding varies by page (inconsistent - see below)
- LifecycleTileNav tiles: 140px × 81px, gap 12px (0.75rem)

**Pages with Correct Padding:**
- `/dashboard` - `CContainer fluid` with `p-4` (16px all sides)
- `/projects/[projectId]/napkin/*` - Uses `d-flex flex-column gap-3`
- `/admin/*` pages - Consistent `p-4` padding

**Pages with Inconsistent Padding:**
- `/projects/[projectId]` (standard mode) - Mixed inline styles and utility classes
- `/dms` - Uses custom flex layout without standardized padding
- `/reports` - Varies based on tab content

**CSS Files Controlling Layout:**
- `src/app/globals.css` - Global resets, scrollbar styling
- `src/styles/tokens.css` - CSS variables for colors, spacing
- `src/app/layout.tsx` - Root flex container

**Recommended Fix:**
Create a `PageContainer` component or standardized CSS class that enforces:
```css
.page-content {
  padding: 1rem;
  max-width: 100%;
  overflow-x: hidden;
}
```

### Responsive Breakpoints
- Tailwind defaults (`sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`) used frequently (e.g., Dashboard stat cards, GIS grid).
- MUI components rely on theme breakpoints for card layouts.

---

## 5. State Management

### Global Providers (see `src/app/layout.tsx:7`)
1. **QueryProvider** (`src/app/components/QueryProvider.tsx:1`)
   - Wraps `@tanstack/react-query` client with 30s stale time & disabled refetch on focus.
2. **CoreUIThemeProvider** – theme toggles described earlier.
3. **ToastProvider** – Radix toast wrapper for consistent notifications (exported from `src/components/ui/toast`).
4. **ProjectProvider** – handles project list and active context.
5. **AuthProvider** – Authentication context with JWT token management.
6. **IssueReporterProvider** – houses bug reporter state.
7. **NavigationLayout** – inserted after providers.

### Contexts
- **ComplexityModeProvider** (`src/contexts/ComplexityModeContext.tsx:1`): persists per-project global/tab complexity modes with localStorage, auto-saves after 1 second of inactivity.
- **ProjectModeProvider** (`src/contexts/ProjectModeContext.tsx`) **NEW**: manages napkin/standard mode based on URL path.
- **ScenarioProvider** (`src/contexts/ScenarioContext.tsx:1`): loads `/api/financial/scenarios`, exposes CRUD methods.
- **AuthContext** (`src/contexts/AuthContext.tsx`) **NEW**: manages authentication state, JWT tokens, user info.
- **Project Config Hook** (`src/hooks/useProjectConfig.ts:1`): uses SWR to fetch labeling and container hierarchy.
- **User Tier Hook** (`src/hooks/useUserTier.ts`) **NEW**: determines user subscription tier for feature gating.

### Local State Patterns
- `useState` for tab selection (Project, DMS, Document Review) with occasional URL sync.
- `React Hook Form` + Zod for complex forms (New Project, Product Library, DMS profile forms, User Management modals).
- `useEffect` watchers for `localStorage` synchronization (Budget mode, Project mode, theme).

### Data Fetching
- **SWR** (`useSWR`) for `/api/projects`, `/api/parcels`, `/api/phases`, `/api/projects/{id}/config`, `/api/financial/scenarios`.
- **React Query** – ready to adopt but not widely used yet.
- **Direct fetch** for module-scoped requests (Budget items, DMS filters, Benchmarks data, GIS APIs).
- **Backend proxies** – `PropertySummaryView` uses `NEXT_PUBLIC_BACKEND_URL`, GIS ingestion hits `/api/ai/ingest-property-package`.

---

## 6. Key User Flows

### Create New Project
1. User opens Dashboard and clicks the "+ New Project" button.
2. `NewProjectModal` (`src/app/components/NewProjectModal.tsx:1`) opens with multi-section form tabs (Asset Type, Configure, Location, Property Data, Path Selection).
3. Form validations are enforced with Zod schema; file uploads restricted to approved extensions.
4. On submit, form payload hits `/api/projects` and, upon success, `refreshProjects()` + `selectProject(projectId)` + `router.push(/projects/{id})` run sequentially.
5. Modal closes, ProjectContextBar shows the new project as active.

### Navigate Between Projects
1. User opens any `/projects/{id}` route and uses the dropdown inside `ProjectContextBar`.
2. `selectProject(newId)` updates context & localStorage.
3. Router pushes `/projects/{newId}` (without preserving `?tab`).
4. Downstream components consuming `useProjectContext` re-render.

### Switch Project Mode (NEW)
1. User clicks mode toggle button in `ProjectContextBar`.
2. `toggleMode()` from `useProjectMode` context fires.
3. Router navigates between `/projects/{id}` and `/projects/{id}/napkin`.
4. `LifecycleTileNav` updates to show appropriate tile set.
5. Page content changes to napkin or standard workflow.

### Access Budget Data
1. From ProjectContextBar, user clicks the Budget tile.
2. Router navigates to `/projects/{id}/budget` or tile route.
3. `BudgetGridTab` mounts and loads data through `useBudgetData(projectId)`.
4. User toggles modes, grouping, filters, or opens `BudgetItemModalV2` for editing.

### Upload Document
1. From `/dms` or Documents tab, user selects the "Upload" tab.
2. `Dropzone` accepts drag-and-drop or file dialog, populating `uploadedFiles` state.
3. Each file flows through statuses (pending → uploading → processing → completed).
4. Toast notification confirms "Profile Updated!" on save.

### Delete Documents (NEW)
1. User checks document checkboxes in accordion filters.
2. Delete button becomes enabled when `checkedDocIds.size > 0`.
3. User clicks delete, confirmation dialog shows count.
4. Documents deleted via DELETE `/api/dms/docs/[id]`.
5. Toast notification confirms deletion.

### Run Waterfall Analysis (NEW)
1. User navigates to `/projects/{id}/napkin/waterfall`.
2. Selects waterfall type (IRR / Equity Mult / IRR + EM).
3. Enters hurdle rates and equity multiples in input tables.
4. Enters period data (investment, sale proceeds, cash flow).
5. Clicks "Run Waterfall" button.
6. `WaterfallResults` displays period-by-period distributions.

---

## 6A. API Routes Reference

### Project APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects` | GET/POST | List all projects or create new |
| `/api/projects/[projectId]` | GET/PUT | Fetch/update project details |
| `/api/projects/[projectId]/config` | GET | Fetch project configuration |
| `/api/projects/minimal` | GET | Fetch minimal project list |

### Waterfall APIs (NEW)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/[projectId]/waterfall/napkin` | GET/POST | Fetch/save napkin waterfall inputs |
| `/api/projects/[projectId]/waterfall/calculate` | POST | Calculate waterfall distributions |

### User Management APIs (NEW)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/users` | GET/POST | List/create users |
| `/api/admin/users/[id]` | PUT/DELETE | Update/delete user |
| `/api/admin/users/[id]/password` | PUT | Reset user password |
| `/api/admin/users/[id]/activate` | PUT | Activate user |
| `/api/admin/users/[id]/deactivate` | PUT | Deactivate user |

### DMS APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dms/docs` | GET/POST | List/create documents |
| `/api/dms/docs/[id]` | GET/PATCH/DELETE | Get/update/delete document |
| `/api/dms/templates/doc-types` | GET | Fetch document type templates |
| `/api/dms/filters/counts` | GET | Fetch filter counts |
| `/api/dms/search` | GET | Search documents by filter |

### Budget APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/budget/gantt` | GET | Fetch budget gantt data |
| `/api/budget/gantt/items/[factId]` | PUT | Update individual budget item |
| `/api/budget/assumptions` | GET/POST | Fetch/save budget assumptions |

### Operating Expense APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/[projectId]/operating-expenses/hierarchy` | GET | Fetch Chart of Accounts |
| `/api/projects/[projectId]/opex` | GET/POST | Fetch or save operating expenses |

---

## 6B. Complexity Mode System

### Overview

The Complexity Mode system allows users to switch between three levels of detail across multiple tabs:
- **Napkin Mode:** High-level, simplified view (minimal fields)
- **Standard Mode:** Balanced view with commonly-used fields
- **Detail Mode:** Comprehensive view with all available fields

**Note:** This is different from Project Mode (Napkin/Standard), which controls the overall workflow. Complexity Mode controls field visibility within tabs.

### Implementation

**Provider:** `ComplexityModeProvider` (`src/contexts/ComplexityModeContext.tsx`)

**Storage:**
- Global mode stored in `localStorage` (`complexity_mode_{projectId}`)
- Tab-specific modes stored via `usePreference` hook (database-backed)

**Context Interface:**
```typescript
{
  globalMode: 'napkin' | 'standard' | 'detail';
  setGlobalMode: (mode: ComplexityTier) => void;
  getTabMode: (tabId: string) => ComplexityTier;
  setTabMode: (tabId: string, mode: ComplexityTier) => void;
}
```

### Tabs Supporting Complexity Modes

| Tab | Mode Support | Storage | Component |
|-----|-------------|---------|-----------|
| **Project** | ✅ Yes | `usePreference` | Shows `ModeChip` in tab button |
| **Planning** | ✅ Yes | `usePreference` | Shows `ModeChip` in tab button |
| **Budget** | ✅ Yes | `localStorage` | Shows `ModeChip` in tab button |
| **Operations** | ✅ Yes | `usePreference` | Shows `ModeChip` in tab button |
| **Property** | ✅ Yes | `usePreference` | Shows `ModeChip` in tab button |
| **Valuation** | ✅ Yes | `usePreference` | Shows `ModeChip` in tab button |
| **Sales** | ✅ Yes | `usePreference` | Shows `ModeChip` in tab button |

---

## 7. Interactive Elements Catalog

### Buttons
- **Primary (filled):** Usually `LandscapeButton` with `color="primary"`.
- **Secondary:** `LandscapeButton` or `CButton` with `variant="outline"` or `ghost` when nested in tab lists.
- **Danger:** CoreUI `CButton color="danger"` used in modals (e.g., delete template) with strong red backgrounds.

### Form Inputs
- **Text inputs:** CoreUI `CFormInput` for Budget/Assumptions, `Input` from shadcn/ui in Document Review.
- **Number inputs:** Global CSS removes spinners; tailwind classes enforce consistent typography.
- **Selects:** `<select>` native elements in navigation bars, `CFormSelect` for forms.

### Tables / Grids
- **CoreUI tables:** Dashboard, Reports, DMS detail lists.
- **TanStack tables:** `BudgetDataGrid` handles virtualization, column grouping, inline editing.
- **MUI tables:** `BudgetGrid` prototype uses `Table`, `TableRow`, etc.

### Modals / Dialogs
- **CoreUI `CModal`:** Budget item editor, Quick Add Category, general info modals.
- **Radix Dialog:** Document Review uses `CorrectionModal` (shadcn) for editing fields.
- **Custom overlays:** `LandscaperChatModal` is controlled by `TopNavigationBar` state.
- **User Modals (NEW):** `AddUserModal`, `EditUserModal`, `ResetPasswordModal`, `DeleteUserModal`

### Toast Notifications (Enhanced)
- **Radix Toast:** Used throughout app via `useToast` hook.
- **DMS Toast (NEW):** Custom inline toast for "Profile Updated!" feedback.

### Navigation Tiles (NEW)
- **LifecycleTileNav:** Colored tiles (140×81px) with:
  - Background colors per tile type
  - Hover opacity/transform effects
  - Active state border highlighting
  - Pro-only feature gating

---

## 8. Responsive Behavior

### Breakpoint Strategy
- **Desktop-first:** Layouts are designed for 1440 px wide monitors.
- **Tailwind Media Queries:** Many grids use `md:grid-cols-2` or `lg:grid-cols-4`.
- **MUI Breakpoints:** Prototypes leverage `md`, `lg` props for column spans.

### Component-specific Notes
- **TopNavigationBar:** Stays sticky across breakpoints but lacks collapse mechanism.
- **ProjectContextBar:** Buttons overflow horizontally on <1200 px; no scroll container provided.
- **LifecycleTileNav (NEW):** Tiles have `flexShrink: 0` and overflow horizontally when space constrained.
- **Dashboard (NEW):** Uses `lg:grid-cols-[minmax(420px,520px)_1fr]` for responsive project list/map split.
- **Tables:** CoreUI tables add `responsive` wrappers for horizontal scroll.

---

## 9. Performance Considerations

- **Code Splitting:** Next.js App Router automatically code-splits per route.
- **Data Virtualization:** `BudgetDataGrid` uses TanStack Table and optional virtualization for rows.
- **Caching:** SWR caches project lists, parcels, phases, and scenarios.
- **React Query** – ready for adoption but not yet widely used.
- **Polling:** Some components poll localStorage (`ProjectContextBar` for budget mode).
- **MapLibre:** GIS components load map tiles lazily and clean up map instances on component unmount.
- **Lazy Data Fetches:** Accordion filters fetch document lists only when expanded.

---

## 10. Accessibility

- **Focus Styles:** `src/app/globals.css` enforces custom `outline` and `box-shadow` for `:focus-visible`.
- **ARIA / Semantics:**
  - `PageHeader` uses `<nav aria-label="breadcrumb">` and `aria-current` markers.
  - `TopNavigationBar` buttons carry `aria-label`s for theme and bug reporter.
  - `ModeChip` exposes `role="status"` + `aria-label`.
  - `Tabs` in Document Review use Radix (with keyboard nav + ARIA attributes out of the box).
- **Screen Reader Considerations:** Many buttons rely on iconography without `aria-label`; those should be wrapped as part of future updates.
- **Color Contrast:** Tokens defined in `tokens.css` are tuned for dark/light parity.
- **Keyboard Navigation:** Drop-downs close on outside click but not on `Esc`; consider adding key handlers.

---

## Appendix A: File Structure

```
src/
├── app
│   ├── layout.tsx
│   ├── page.tsx (redirect)
│   ├── components
│   │   ├── NavigationLayout.tsx
│   │   ├── TopNavigationBar.tsx
│   │   ├── ProjectContextBar.tsx
│   │   ├── OpExHierarchy.tsx (Chart of Accounts for DEV)
│   │   ├── navigation/ (SandboxDropdown, UserMenuDropdown, SettingsDropdown)
│   │   ├── dashboard/ (UserTile, DashboardMap)
│   │   ├── Planning/ (PlanningContent, CollapsibleSection, etc.)
│   │   ├── GIS/ (GISSetupWorkflow, PlanNavigation, etc.)
│   │   └── layout/vertical/ (Materio sidebar)
│   ├── dashboard/page.tsx (REDESIGNED)
│   ├── dms/page.tsx
│   ├── planning/page.tsx
│   ├── reports/page.tsx
│   ├── rent-roll/page.tsx
│   ├── documents/review/page.tsx
│   ├── projects
│   │   ├── [projectId]
│   │   │   ├── layout.tsx (includes ProjectModeProvider)
│   │   │   ├── page.tsx (tab host)
│   │   │   ├── napkin/ (NEW - Napkin mode routes)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── analysis/page.tsx
│   │   │   │   ├── waterfall/page.tsx
│   │   │   │   ├── documents/page.tsx
│   │   │   │   └── components/ (PropertyTab, ProjectTab)
│   │   │   ├── capitalization/ (NEW)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── equity/page.tsx
│   │   │   │   ├── debt/page.tsx
│   │   │   │   └── operations/page.tsx
│   │   │   ├── budget/page.tsx
│   │   │   ├── valuation/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── opex/page.tsx
│   │   │   └── components/tabs/
│   │   └── setup/page.tsx
│   ├── admin
│   │   ├── benchmarks/page.tsx
│   │   ├── benchmarks/cost-library/page.tsx
│   │   ├── preferences/page.tsx
│   │   ├── users/page.tsx (NEW)
│   │   │   └── components/UserModals.tsx (NEW)
│   │   └── dms/templates/page.tsx
│   └── ...
├── components
│   ├── budget/ (BudgetDataGrid, BudgetGridTab, modals, hooks)
│   ├── dms/ (DMSView, Dropzone, Queue, ProfileForm, AccordionFilters)
│   ├── capitalization/ (NEW)
│   │   ├── NapkinWaterfallForm.tsx
│   │   ├── WaterfallResults.tsx
│   │   ├── CapitalizationSubNav.tsx
│   │   ├── DeveloperFeesTable.tsx
│   │   └── ManagementOverheadTable.tsx
│   ├── napkin/ (NEW)
│   │   ├── NapkinAnalysisPage.tsx
│   │   ├── RlvSummaryCard.tsx
│   │   ├── NapkinSfdPricing.tsx
│   │   ├── NapkinAttachedPricing.tsx
│   │   ├── LandscaperPanel.tsx
│   │   └── PromoteModal.tsx
│   ├── projects/ (NEW)
│   │   ├── LifecycleTileNav.tsx
│   │   └── InflationRateDisplay.tsx
│   ├── ui/ (PageHeader, LandscapeButton, ModeChip, toast)
│   ├── map/ (ProjectTabMap, MapOblique)
│   ├── sales/ (PhaseTiles, PricingTable, ParcelSalesTable)
│   ├── auth/ (NEW)
│   │   └── ProtectedRoute.tsx
│   └── ...
├── contexts
│   ├── ComplexityModeContext.tsx
│   ├── ProjectModeContext.tsx (NEW)
│   ├── ScenarioContext.tsx
│   └── AuthContext.tsx (NEW)
├── hooks
│   ├── useUserPreferences.ts
│   ├── useProjectConfig.ts
│   ├── useContainers.ts
│   ├── useUserTier.ts (NEW)
│   └── useDeveloperOperations.ts (NEW)
├── lib
│   ├── utils/projectTabs.ts
│   ├── api/user-preferences.ts
│   └── api/admin-users.ts (NEW)
├── styles
│   ├── tokens.css
│   ├── component-patterns.css
│   └── app/globals.css
└── docs
    ├── HEADER_COLOR_HIERARCHY.md
    └── design-system/LANDSCAPE_UI_TECHNICAL_OVERVIEW.md
```

---

## Appendix B: UI Dependencies

| Package | Purpose |
| --- | --- |
| `@coreui/react`, `@coreui/icons-react`, `@coreui/coreui` | Primary component + token library used across Dashboard, tabs, tables. |
| `@mui/material`, `@mui/icons-material`, `@menu/vertical-menu` | Materio theme components powering Budget Grid prototype and legacy overview pages. |
| `@radix-ui/react-*` (tabs, select, dialog, toast, tooltip) | Interaction primitives used in Document Review, shadcn-based components. |
| `@tanstack/react-table`, `@tanstack/react-virtual` | Budget grid table and virtualization. |
| `@tanstack/react-query` | Query provider (ready for adoption). |
| `swr` | Data fetching for projects, planning, scenarios. |
| `maplibre-gl`, `@types/maplibre-gl`, `@turf/turf` | GIS map rendering, geometry utilities. |
| `@hookform/resolvers`, `react-hook-form`, `zod` | Complex form validation (NewProjectModal, Product Library, User Management). |
| `lucide-react`, `@coreui/icons` | Iconography for nav, buttons, analytics. |
| `tailwindcss`, `@tailwindcss/forms`, `@tailwindcss/typography`, `tailwindcss-animate` | Utility classes, form normalization, animation. |
| `@heroicons/react` | Occasional icons in DMS and Planning surfaces. |
| `@uploadthing/react`, `react-dropzone` | File upload experiences in DMS. |

All other dependencies in `package.json` either serve backend API calls (e.g., `pdf-parse`, `xlsx`) or non-UI prototypes (benchmarks importers).
