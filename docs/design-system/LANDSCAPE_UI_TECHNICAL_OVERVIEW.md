# Landscape Application - UI Technical Documentation
February 18, 2026

## Table of Contents
- [1. Navigation Architecture](#1-navigation-architecture)
  - [1.1 Primary Navigation](#11-primary-navigation)
  - [1.2 Project Navigation Layer](#12-project-navigation-layer)
  - [1.3 Ancillary Navigation Surfaces](#13-ancillary-navigation-surfaces)
  - [1.4 Route Structure](#14-route-structure)
  - [1.5 Project Context Switching](#15-project-context-switching)
  - [1.6 Tab Implementations](#16-tab-implementations)
  - [1.7 Header and Breadcrumb Patterns](#17-header-and-breadcrumb-patterns)
  - [1.8 Complexity Mode System (Basic/Standard/Advanced)](#18-complexity-mode-system-basicstandardadvanced)
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

## Recent Changes Summary (Since February 8, 2026)

### Major Additions
1. **Folder Tabs + Resizable Project Layout** — `ActiveProjectBar`, split `ProjectLayoutClient`, `FolderTabs`, and `ProjectContentRouter`.
2. **Landscaper Panel Enhancements** — Collapsible/resizable left panel with file drop handling and extraction badges.
3. **Knowledge Library (AdminModal)** — Landscaper admin panel with faceted filters, scoped chat, batch download, and upload.
4. **DMS Enhancements** — Project-level doc type management, tag input + subtype tagging, extraction mappings admin rewrite; global `/dms` removed.
5. **Project Metadata Pills** — Property type tokens + analysis badges surfaced in `ActiveProjectBar`.

### Navigation/Route Changes
- Project navigation now uses `?folder=` + `?tab=` query params (FolderTabs).
- Global `/dms` route removed; document management is project-scoped (`/projects/[projectId]/documents`) and Knowledge Library lives in the AdminModal.
- `ProjectModeContext` is deprecated; complexity tiers use Basic/Standard/Advanced, while the Assumptions page retains Napkin/Mid/Pro tiers.

---

## 1. Navigation Architecture

### 1.1 Primary Navigation
- **Component:** `TopNavigationBar` (`src/app/components/TopNavigationBar.tsx:1`)
- **Pattern:** Sticky horizontal bar at the top of every page rendered through `NavigationLayout`.
- **Structure:**
  - Left: Inverted Landscape logo linking to `/`.
  - Right cluster: Global nav links (`GLOBAL_NAV_LINKS` → Dashboard `/dashboard`), theme toggle, bug reporter icon (admin only), Help toggle, Settings (opens AdminModal), `UserMenuDropdown`.
  - Uses `usePathname` to highlight the active link, inline hover handlers to emulate pill hover states, and CSS variables defined in `src/styles/tokens.css` for color (58 px tall, `z-index` 50, border bottom `var(--nav-border)`).
- **Interaction notes:**
  - Theme toggle is driven by `CoreUIThemeProvider` context and updates `data-theme` attributes globally.
  - Bug reporter button integrates with `IssueReporter` context to provide contextual hints when no element has been targeted.
  - The Settings button opens the AdminModal (Landscaper config, Knowledge Library, extraction mappings).
  - Drop-down components rely on the shared `useOutsideClick` hook to close on blur.
- **Responsive behavior:** Flex container with wrapping disabled; on narrow screens the items compress horizontally (no hamburger yet) → the "clumsy" behavior stems from scroll overflow once width < ~1100px.

```
+---------------------------------------------------------------------+
| LOGO | Dashboard | Theme | Bug | Help | Settings | User ▾ |
+---------------------------------------------------------------------+
```

### 1.2 Project Navigation Layer
- **Components:** `ActiveProjectBar` + `ProjectLayoutClient` + `FolderTabs`.
- **Scope:** Injected for all `/projects/[projectId]` routes via `projects/[projectId]/layout.tsx:1`.
- **Layout:**
  - `ActiveProjectBar` (sticky at `top: 58px`) with project selector, property type pill, analysis badges, and `VersionBadge`.
  - `ProjectLayoutClient` renders a resizable split:
    - Left: `LandscaperPanel` (collapsible to icon strip).
    - Right: `FolderTabs` (two-row folder/subtab navigation) + content area.
- **State sources:**
  - Folder/tab selection is stored in URL query params (`?folder=` + `?tab=`) via `useFolderNavigation`.
  - Folder definitions come from `folderTabConfig.ts` with analysis-type gating and property-type filters.
  - `ProjectModeContext` remains for legacy compatibility but the project mode toggle is no longer surfaced in UI.

### 1.3 Ancillary Navigation Surfaces
- **Sandbox / Developer links:** Prototype routes still exist (Budget Grid, GIS test, Document Review, etc.), but there is no active Sandbox dropdown in the top nav. `SANDBOX_PAGES` remains defined in `src/app/components/navigation/constants.ts`.
- **Admin nav:** `AdminNavBar` (`src/app/components/AdminNavBar.tsx:1`) mirrors the tab bar for `/admin/*` routes. It is sticky at `top:58px` and exposes Preferences, Benchmarks, Cost Library, **Users**, and DMS Admin.
- **AdminModal (Settings button):** Opens the Landscaper admin panel with Knowledge Library, Extraction Mappings, and model configuration in accordion sections.
- **Preferences nav:** `PreferencesContextBar` (`src/app/components/PreferencesContextBar.tsx:1`) is a simplified copy of the project selector bar and keeps the `tab` query string in sync.
- **Legacy vertical nav:** `src/app/components/layout/vertical/Navigation.tsx` still ships the Materio sidebar (MUI + `@menu/vertical-menu`). It is only mounted inside older prototype pages such as `/projects/[projectId]/overview`.
- **Route-level wrappers:** `NavigationLayout` (`src/app/components/NavigationLayout.tsx:1`) wraps the entire app (see `src/app/layout.tsx:1`) and can hide navigation for future auth/marketing routes via `hideNavigation` prop.

### 1.4 Route Structure

**Note on Dual-Access Pattern:** Several features can be accessed BOTH via FolderTabs (`/projects/[projectId]?folder=X&tab=Y`) AND as standalone routes. This enables deep links and focused workflows:
- **Budget**: Folder tab (`folder=budget`) or route (`/projects/[projectId]/budget`)
- **Valuation/Feasibility**: Folder tab (`folder=valuation` or `feasibility`) or route (`/projects/[projectId]/valuation`)
- **Capitalization**: Folder tab (`folder=capital`) or route (`/projects/[projectId]/capitalization/*`)
- **Documents**: Folder tab (`folder=documents`) or route (`/projects/[projectId]/documents`)

Representative tree of `src/app` (pages without `page.tsx` are omitted):

```
/ (redirects to /dashboard)
├── dashboard (redesigned with filter tiles + map)
├── planning (standalone, defaults to project 7)
├── reports
├── rent-roll
├── documents
│   └── review
├── ai-document-review
├── market, market-assumptions, inventory
├── projects
│   ├── [projectId]
│   │   ├── page (folder/tab host - uses ?folder & ?tab)
│   │   ├── layout (ActiveProjectBar + ProjectLayoutClient)
│   │   ├── capitalization/ (NEW)
│   │   │   ├── page (index)
│   │   │   ├── equity/page
│   │   │   ├── debt/page
│   │   │   └── operations/page
│   │   ├── documents/page.tsx (project DMS)
│   │   ├── budget (standalone budget page with scope/stage filters)
│   │   ├── valuation (standalone valuation page - three approaches)
│   │   ├── assumptions (standalone assumptions editor)
│   │   ├── settings (project settings page)
│   │   ├── investment-committee
│   │   └── project/ (summary, planning, budget, sales, dms)
│   └── setup (project creation wizard)
├── admin
│   ├── preferences
│   ├── benchmarks
│   │   └── cost-library
│   ├── users
│   └── dms/templates
├── preferences (global tabs → product library & taxonomy)
├── settings
│   ├── taxonomy (land use taxonomy manager)
│   └── budget-categories (budget category management)
├── growthrates (Materio version)
├── growthrates-original
├── growthratedetail
├── growthratesmanager
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
- **Project routes:** `/projects/[projectId]/*` (folder host, budget, valuation, assumptions, settings, capitalization, documents, project/*)
- **Prototype routes:** `/prototypes/[prototypeId]`
- **Legacy routes:** `/lease/[id]`, `/property/[id]`, `/properties/[id]/analysis`

### 1.5 Project Context Switching
- **Provider:** `ProjectProvider` (`src/app/components/ProjectProvider.tsx:1`) wraps the entire app in `src/app/layout.tsx:12`. It loads `/api/projects` through SWR, caches results, and stores the last project ID in `localStorage` (`activeProjectId`).
- **Selection surfaces:**
  - `ActiveProjectBar` dropdown (primary way during project work).
  - `Dashboard` project accordion rows call `selectProject(project_id)` then push `/projects/{id}` (`src/app/dashboard/page.tsx`).
  - `NewProjectModal` (`src/app/components/NewProjectModal.tsx:1`) refreshes projects, selects the new ID, and navigates the user to `/projects/{id}` after creation.
- **Persistence:** Provider rehydrates from storage on mount and automatically falls back to the first project returned by `/api/projects` if the stored ID is missing.
- **Propagation:** `useProjectContext` is consumed by DMS, Planning, and numerous tab components to show project-specific data. Outside `/projects/*` routes there is no visible selector, so users must return to a project page to change context.

### 1.6 Tab Implementations
| Surface | Component / File | Behavior |
| --- | --- | --- |
| Folder tabs | `FolderTabs` (`src/components/navigation/FolderTabs.tsx`) | Two-row folder/subtab navigation; selection is synced to `?folder=` + `?tab=` via `useFolderNavigation`. |
| Folder config | `createFolderConfig` (`src/lib/utils/folderTabConfig.ts`) | Generates the 7-folder set with analysis-type gating and property-type filters. |
| Project content router | `ProjectContentRouter` (`src/app/projects/[projectId]/ProjectContentRouter.tsx`) | Maps folder/tab combos to tab components (Property/Planning/Budget/etc.). |
| Budget subtabs | `BudgetGridTab` (`src/components/budget/BudgetGridTab.tsx:36`) uses `useState<'grid' \| ...>` plus CoreUI `CNav` for grouping toggle inside the card. |
| Admin nav | `AdminNavBar` (see above) uses Next `<Link>` objects with pure CSS for active state. |
| Preferences | `PreferencesContextBar` controls `?tab=` query, rendering dynamic imports per tab. |
| **Operations** | `OperationsTab` (`src/app/projects/[projectId]/components/tabs/OperationsTab.tsx:1`) **renders different UIs based on project type:** For `DEV` projects → `OpExHierarchy` (Chart of Accounts). For `MF` projects → `NestedExpenseTable` with benchmarks. For other types → "Coming Soon" placeholder. |
| Planning | `PlanningTab` wraps `PlanningContent` for `DEV` projects; shows educational card for other types. |
| Sales & Absorption | `SalesTab` renders `SalesContent` for `DEV` projects, otherwise shows guidance card. `SalesContent` orchestrates area/phase filters, pricing tables, inventory gauges, and parcel sales grid. |
| Property | `PropertyTab` handles property details, market, and rent roll subtabs (controlled by `activeTab`). |
| Valuation | `ValuationTab` has sub-tabs (Sales Comparison/Cost/Income) using button toggles; Sales Comparison is the primary active view. |
| Feasibility | `FeasibilityTab` has sub-tabs (Feasibility/Cash Flow/Returns/Sensitivity) with partial implementations. |
| Capitalization | `CapitalizationTab` hosts the capitalization workspace (equity, debt, developer operations). |
| Reports | `ReportsTab` renders report-type selector and scenario toggle; embeds `PropertySummaryView`. |
| Documents | `DocumentsTab` embeds `DMSView` scoped to active project. |
| Document Review | Uses Radix Tabs (`src/app/documents/review/page.tsx:37`) for queue / detail / analytics; default tab is "queue". |
| Project-specific prototypes | Smaller surfaces reuse `LandscapeButton` toggles (e.g., `/projects/[projectId]/budget/page.tsx:27`). |

**Folder Tab Sets by Property Type**

`createFolderConfig` (`src/lib/utils/folderTabConfig.ts`) generates a 7-folder configuration, with visibility gated by analysis tiles and project type:

| Project Type | Folders (base order) | Notes |
| --- | --- | --- |
| **Development** (`DEV`, `MPC`, `Subdivision`, etc.) | Home, Property, Budget, Feasibility, Capital, Reports, Documents | Budget/Feasibility visibility can be toggled by analysis tile configuration. |
| **Income / Multifamily** (`MF`, `OFF`, `RET`, `IND`, `MXU`, `HTL`) | Home, Property, Operations, Valuation, Capital, Reports, Documents | Operations/Valuation visibility can be toggled by analysis tile configuration. |

### 1.7 Header and Breadcrumb Patterns
- **Standard header:** `PageHeader` (`src/components/ui/PageHeader.tsx:1`) renders a breadcrumb ordered list plus action slots. Only a handful of prototype pages import it today; most major screens still craft headers manually.
- **Dynamic breadcrumbs:** `DynamicBreadcrumb` (`src/app/components/DynamicBreadcrumb.tsx:1`) adapts copy (Area/Phase/Parcel vs Property/Building/Unit) based on `useProjectConfig`. Currently used in the breadcrumb demo and GIS planning cards; production screens have not wired it in yet.
- **Ad-hoc breadcrumbs:**
  - Project Documents renders its own header/breadcrumbs inside `DMSView` (`src/components/dms/DMSView.tsx`).
  - Land Use Taxonomy page ships its own CSS/HTML breadcrumb (`src/app/settings/taxonomy/page.tsx:90`).
- **Color hierarchy:** `docs/HEADER_COLOR_HIERARCHY.md` defines the header palette backed by CSS variables in `src/styles/tokens.css`. The design tokens are already applied in `BudgetDataGrid`, `BenchmarkAccordion`, and other components to standardize header backgrounds.

### 1.8 Complexity Mode System (Basic/Standard/Advanced)

The Complexity Mode system controls field density and UI depth inside specific tabs (Operations, Assumptions, Configure Columns). It is not a route-level mode.

**Provider:** `ComplexityModeProvider` (`src/contexts/ComplexityModeContext.tsx`)

**Key Features:**
- Global mode with per-tab overrides (`globalMode`, `tabModes`).
- Persists to localStorage per project (`complexity_mode_{projectId}`).
- Exposes user capability flags for gated features.

**Context Interface (abridged):**
```typescript
{
  globalMode: 'basic' | 'standard' | 'advanced';
  setGlobalMode: (mode: ComplexityTier) => void;
  tabModes: Record<string, ComplexityTier>;
  setTabMode: (tab: string, mode: ComplexityTier) => void;
  getEffectiveMode: (tab: string) => ComplexityTier;
}
```

**Used By:**
- `OperationsTab` and rent roll configuration (column density and visibility).
- `ConfigureColumnsModal` and other field-density toggles.
- The Assumptions page uses its own Napkin/Mid/Pro tiers (legacy) and is not wired to `ComplexityModeContext`.
- `ProjectModeContext` is deprecated and no longer drives navigation.

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
- Full-width `ActiveProjectBar` across the top for project selection + metadata pills.
- `ProjectLayoutClient` split panel: Landscaper panel on the left, FolderTabs + content on the right.
- Tab host component `src/app/projects/[projectId]/page.tsx` reads `?folder=` + `?tab=` and renders content via `ProjectContentRouter`.
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
 - `FolderTabs` + `ProjectContentRouter` – primary navigation + routing.
 - `LandscaperPanel` – resizable/collapsible left panel with document drop support.

**Data Sources:**
- Each tab fetches its own API slice (`/api/projects/{id}/details`, `/api/budget/...`, `/api/parcels`, etc.).
- Shared contexts: `useProjectContext`, `ComplexityModeProvider`, `ScenarioProvider` (inside some tabs).

**Interactions:**
- Tab switching rewrites `?folder` + `?tab` query params (no `history.replace`, so each click pushes a new entry).
- Many modals (`BudgetItemModalV2`, `NewProjectModal`, scenario modals) are local to tabs.

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

### Planning (`/planning`, `/projects/[projectId]?folder=property&tab=land-use`)
**Purpose:** Manage Areas/Phases/Parcels for land development projects.

**Layout:**
- Standalone `/planning` defaults to project ID 7 (Peoria Lakes) and wraps `PlanningContent` inside a full-height container with neutral background.
- Project tab version shares the same component when property type code is `DEV`, otherwise displays a message.

**Key Components:**
- `PlanningContent` (`src/app/components/Planning/PlanningContent.tsx:1`): orchestrates parcel/phase fetching via SWR, area cards, filtering, and inline editing interactions for active planning workflows.
- `PlanningOverviewControls`, `CollapsibleSection`.
- Legacy `PlanningWizard` components are now archived under `src/app/_archive/components/PlanningWizard/` and are not part of the active planning runtime.

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

### Documents (Project DMS) (`/projects/[projectId]/documents`, `/projects/[projectId]?folder=documents&tab=documents`, `/documents/review`)
**Purpose:** Project-scoped document management and AI review. The global `/dms` route has been removed; cross-project search now lives in the Knowledge Library inside AdminModal.

**Layout:**
- Project DMS uses a full-height container with `DMSView` as the primary surface.
- `DocumentsTab` inside projects renders `DMSView` scoped to the active project.
- Upload UI splits between `Dropzone`, `Queue`, and profile metadata.
- Knowledge Library (AdminModal → Landscaper) provides cross-project discovery with facets, scoped chat, and batch download.

**Key Components:**
- `DMSView` (`src/components/dms/DMSView.tsx:1`) – shared logic for project document management.
- `AccordionFilters`, `FilterDetailView`, `Dropzone`, `Queue`, `ProfileForm`.
- `KnowledgeLibraryPanel`, `ExtractionMappingAdmin` (AdminModal).

**Recent Changes (Feb 2026):**
- Doc type remap to DMS template vocabulary and extraction mapping rewrite.
- Tag system + subtype tagging, project-level custom document types.
- "+ Add Type" UI on project DMS, global `/dms` route removed.

**Data Sources:**
- Document types from `/api/dms/templates/doc-types` (project_id + workspace).
- Counts from `/api/dms/filters/counts`.
- Filter detail results from `/api/dms/search`.
- Tag and doc-type endpoints from `/api/dms/tags/*` and `/api/dms/projects/{id}/doc-types/`.

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

**Purpose:** Manage multifamily operating expenses with complexity mode support (Basic/Standard/Advanced).

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
**Children:** Logo, nav links (Dashboard), theme toggle, bug reporter, Help toggle, Settings (AdminModal), `UserMenuDropdown`.
**Styling:** Inline CSS using CSS variables for nav background/borders defined in `tokens.css`.

### ActiveProjectBar
**File:** `src/app/projects/[projectId]/components/ActiveProjectBar.tsx`
**Purpose:** Full-width sticky project selector bar under the top nav.
**Used By:** `ProjectLayoutClient`.
**Features:**
- Project selector dropdown
- Property type pill + analysis badges
- `VersionBadge` on the right

### ProjectLayoutClient
**File:** `src/app/projects/[projectId]/ProjectLayoutClient.tsx`
**Purpose:** Resizable split layout for project workspaces.
**Children:** `ActiveProjectBar`, `LandscaperPanel`, `FolderTabs`, content area.
**Features:**
- Collapsible left Landscaper panel
- Drag handle for resizing
- Folder/tab navigation via query params

### FolderTabs
**File:** `src/components/navigation/FolderTabs.tsx`
**Purpose:** Two-row folder/subtab navigation for project workflows.
**Features:**
- Folder row with color-coded indicators
- Subtab row scoped to active folder
- Badge states for extraction (processing/error/pending)

### LandscapeButton
**File:** `src/components/ui/landscape/LandscapeButton.tsx:1`
**Purpose:** Wrapper around `CButton` with optional icon, loading state.
**Props Interface:** Extends `CButtonProps` with `loading`, `icon`, `iconRight`.
**Used By:** DMS tabs, Budget prototypes, `BudgetPage` header actions, Document breadcrumbs, etc.
**Styling:** Relies on CoreUI theme so it stays consistent regardless of global scheme.

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
- ActiveProjectBar: sticky below top nav (`top: 58px`), full width, z-index 40
- Main content area: padding varies by page (inconsistent - see below)
- FolderTabs: two-row nav with folder color indicators (`folder-tabs.css`)

**Pages with Correct Padding:**
- `/dashboard` - `CContainer fluid` with `p-4` (16px all sides)
- `/admin/*` pages - Consistent `p-4` padding

**Pages with Inconsistent Padding:**
- `/projects/[projectId]` - Mixed inline styles and utility classes
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
- **ProjectModeProvider** (`src/contexts/ProjectModeContext.tsx`) **Deprecated**: retained for backward compatibility; no longer drives navigation.
- **ScenarioProvider** (`src/contexts/ScenarioContext.tsx:1`): loads `/api/financial/scenarios`, exposes CRUD methods.
- **AuthContext** (`src/contexts/AuthContext.tsx`) **NEW**: manages authentication state, JWT tokens, user info.
- **Project Config Hook** (`src/hooks/useProjectConfig.ts:1`): uses SWR to fetch labeling and container hierarchy.
- **User Tier Hook** (`src/hooks/useUserTier.ts`) **NEW**: determines user subscription tier for feature gating.

### Local State Patterns
- `useState` for tab selection (Project, DMS, Document Review) with occasional URL sync.
- `React Hook Form` + Zod for complex forms (New Project, Product Library, DMS profile forms, User Management modals).
- `useEffect` watchers for `localStorage` synchronization (Budget mode, Complexity mode, theme).

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
5. Modal closes, ActiveProjectBar shows the new project as active.

### Navigate Between Projects
1. User opens any `/projects/{id}` route and uses the dropdown inside `ActiveProjectBar`.
2. `selectProject(newId)` updates context & localStorage.
3. Router pushes `/projects/{newId}` and preserves folder/tab context via `getProjectSwitchUrl` when possible.
4. Downstream components consuming `useProjectContext` re-render.

### Access Budget Data
1. From FolderTabs, user clicks the Budget folder (and subtab).
2. Router navigates to `/projects/{id}?folder=budget&tab=budget` (or `/projects/{id}/budget` if using the standalone route).
3. `BudgetGridTab` mounts and loads data through `useBudgetData(projectId)`.
4. User toggles modes, grouping, filters, or opens `BudgetItemModalV2` for editing.

### Upload Document
1. From `/projects/{id}/documents` or Documents folder tab, user selects the "Upload" tab.
2. `Dropzone` accepts drag-and-drop or file dialog, populating `uploadedFiles` state.
3. Each file flows through statuses (pending → uploading → processing → completed).
4. Toast notification confirms "Profile Updated!" on save.

### Delete Documents (NEW)
1. User checks document checkboxes in accordion filters.
2. Delete button becomes enabled when `checkedDocIds.size > 0`.
3. User clicks delete, confirmation dialog shows count.
4. Documents deleted via DELETE `/api/dms/docs/[id]`.
5. Toast notification confirms deletion.

---

## 6A. API Routes Reference

### Project APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects` | GET/POST | List all projects or create new |
| `/api/projects/[projectId]` | GET/PUT | Fetch/update project details |
| `/api/projects/[projectId]/config` | GET | Fetch project configuration |
| `/api/projects/minimal` | GET | Fetch minimal project list |

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
- **Basic:** High-level, simplified view (minimal fields)
- **Standard:** Balanced view with commonly-used fields
- **Advanced:** Comprehensive view with all available fields

### Implementation

**Provider:** `ComplexityModeProvider` (`src/contexts/ComplexityModeContext.tsx`)

**Storage:**
- Global mode + per-tab overrides stored in `localStorage` (`complexity_mode_{projectId}`)

**Context Interface:**
```typescript
{
  globalMode: 'basic' | 'standard' | 'advanced';
  setGlobalMode: (mode: ComplexityTier) => void;
  tabModes: Record<string, ComplexityTier>;
  setTabMode: (tabId: string, mode: ComplexityTier) => void;
  getEffectiveMode: (tabId: string) => ComplexityTier;
}
```

### Current Usage
- Operations tab uses complexity tiers for expense hierarchy density.
- Rent roll Configure Columns modal uses tiers for default column sets.
- Assumptions page retains its own Napkin/Mid/Pro tiers (legacy).

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
- **Custom overlays:** AdminModal (Settings) and Help panel toggled from `TopNavigationBar`.
- **User Modals:** `AddUserModal`, `EditUserModal`, `ResetPasswordModal`, `DeleteUserModal`

### Toast Notifications (Enhanced)
- **Radix Toast:** Used throughout app via `useToast` hook.
- **DMS Toast (NEW):** Custom inline toast for "Profile Updated!" feedback.

### Folder Tabs
- **FolderTabs:** Two-row folder/subtab navigation with:
  - Color-coded folder indicators
  - Subtab badges for extraction status
  - CSS-variable driven theming (no hardcoded colors)

---

## 8. Responsive Behavior

### Breakpoint Strategy
- **Desktop-first:** Layouts are designed for 1440 px wide monitors.
- **Tailwind Media Queries:** Many grids use `md:grid-cols-2` or `lg:grid-cols-4`.
- **MUI Breakpoints:** Prototypes leverage `md`, `lg` props for column spans.

### Component-specific Notes
- **TopNavigationBar:** Stays sticky across breakpoints but lacks collapse mechanism.
- **ActiveProjectBar:** Long project names can overflow the selector on narrow screens.
- **FolderTabs:** Folder row can overflow horizontally on small widths; no scroll affordance yet.
- **Landscaper Panel:** Collapses automatically when resized below the threshold.
- **Dashboard (NEW):** Uses `lg:grid-cols-[minmax(420px,520px)_1fr]` for responsive project list/map split.
- **Tables:** CoreUI tables add `responsive` wrappers for horizontal scroll.

---

## 9. Performance Considerations

- **Code Splitting:** Next.js App Router automatically code-splits per route.
- **Data Virtualization:** `BudgetDataGrid` uses TanStack Table and optional virtualization for rows.
- **Caching:** SWR caches project lists, parcels, phases, and scenarios.
- **React Query** – ready for adoption but not yet widely used.
- **Polling:** Some components read localStorage for mode preferences (ComplexityModeContext, budget grid).
- **MapLibre:** GIS components load map tiles lazily and clean up map instances on component unmount.
- **Lazy Data Fetches:** Accordion filters fetch document lists only when expanded.

---

## 10. Accessibility

- **Focus Styles:** `src/app/globals.css` enforces custom `outline` and `box-shadow` for `:focus-visible`.
- **ARIA / Semantics:**
  - `PageHeader` uses `<nav aria-label="breadcrumb">` and `aria-current` markers.
  - `TopNavigationBar` buttons carry `aria-label`s for theme and bug reporter.
  - `FolderTabs` uses `role="tablist"`/`role="tab"` for folder and subtab rows.
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
│   │   ├── PreferencesContextBar.tsx
│   │   ├── OpExHierarchy.tsx (Chart of Accounts for DEV)
│   │   ├── navigation/ (UserMenuDropdown, constants)
│   │   ├── dashboard/ (UserTile, DashboardMap)
│   │   ├── Planning/ (PlanningContent, CollapsibleSection, etc.)
│   │   ├── GIS/ (GISSetupWorkflow, PlanNavigation, etc.)
│   │   └── layout/vertical/ (Materio sidebar)
│   ├── dashboard/page.tsx (REDESIGNED)
│   ├── planning/page.tsx
│   ├── reports/page.tsx
│   ├── rent-roll/page.tsx
│   ├── documents/review/page.tsx
│   ├── projects
│   │   ├── [projectId]
│   │   │   ├── layout.tsx (ActiveProjectBar + ProjectLayoutClient)
│   │   │   ├── page.tsx (folder/tab host)
│   │   │   ├── ProjectLayoutClient.tsx
│   │   │   ├── ProjectContentRouter.tsx
│   │   │   ├── capitalization/ (NEW)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── equity/page.tsx
│   │   │   │   ├── debt/page.tsx
│   │   │   │   └── operations/page.tsx
│   │   │   ├── documents/page.tsx
│   │   │   ├── budget/page.tsx
│   │   │   ├── valuation/page.tsx
│   │   │   ├── assumptions/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── investment-committee/page.tsx
│   │   │   └── components/ (ActiveProjectBar, tabs)
│   │   └── setup/page.tsx
│   ├── admin
│   │   ├── benchmarks/page.tsx
│   │   ├── benchmarks/cost-library/page.tsx
│   │   ├── preferences/page.tsx
│   │   ├── users/page.tsx
│   │   └── dms/templates/page.tsx
│   └── ...
├── components
│   ├── budget/ (BudgetDataGrid, BudgetGridTab, modals, hooks)
│   ├── dms/ (DMSView, Dropzone, Queue, ProfileForm, AccordionFilters)
│   ├── navigation/FolderTabs.tsx
│   ├── landscaper/ (LandscaperPanel, CollapsedLandscaperStrip)
│   ├── admin/knowledge-library/ (KnowledgeLibraryPanel, filters, chat)
│   ├── capitalization/ (CapitalizationSubNav, DeveloperFeesTable, LoanScheduleGrid, etc.)
│   ├── projects/tiles/ (tileConfig.ts)
│   ├── ui/ (PageHeader, SemanticCategoryChip, toast)
│   ├── map/ (ProjectTabMap, MapOblique)
│   ├── sales/ (PhaseTiles, PricingTable, ParcelSalesTable)
│   ├── auth/ (NEW)
│   │   └── ProtectedRoute.tsx
│   └── ...
├── contexts
│   ├── ComplexityModeContext.tsx
│   ├── ProjectModeContext.tsx (deprecated)
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
