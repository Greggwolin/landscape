# Cowork: Unified UI Implementation — Discovery & Build

## ⚠️ BEFORE YOU START
Read this entire prompt thoroughly, then ask any clarifying questions before writing code.
If anything is unclear about:
- The relationship between the existing alpha19 folder-tab layout and the new wrapper layout
- Which components to reuse vs. rebuild
- The discovery deliverable format
- How the new page/panel/header patterns work
- What "no feature left behind" means in this context
...ask first. Do not assume.

⚠️ DO NOT process, import, or write any data to the database during verification steps. Verification is read-only. Confirm pipeline routing by tracing code paths only — do not upload test files or trigger extraction runs.

---

## OBJECTIVE

Build the new Landscape Unified UI wrapper as a parallel layout that can coexist with the existing alpha19 folder-tab layout. **Before writing any code**, complete a discovery phase that maps every production feature, component, API dependency, and interaction pattern from alpha19 into its destination in the new layout — ensuring nothing gets lost in the transition.

---

## CONTEXT

### What Exists Today (alpha19)
The current UI uses `ProjectLayoutClient` with a horizontal folder tab bar:
- **Project** — project-level settings, summary, contacts
- **Property** — physical description, site data, improvements
- **Operations** — parcel table (land dev), rent roll (MF), expense management
- **Valuation** — sales comparison, income approach, cost approach
- **Capitalization** — cap rate analysis, DCF, equity waterfall
- **Reports** — report list, generation
- **Documents** — DMS with category grid, media gallery, intelligence tab
- **Map** — MapLibre canvas with layers, draw/measure tools

Navigation is driven by `folderTabConfig.ts` and `useFolderNavigation.ts` using query params: `/projects/[projectId]?folder=...&tab=...`.

Additionally, there are platform-level surfaces:
- **Dashboard** (`/dashboard`) — project tiles, active jobs
- **AdminModal** — 6-tab modal (Preferences, Benchmarks, Cost Library, DMS Admin, Report Configurator, Users)
- **Landscaper chat panel** — left-side panel in project layout, thread management, tool execution
- **Ingestion Workbench** — floating split-panel modal for document extraction review
- **TopNavigationBar** — global header with logo, nav links, theme toggle, settings, user menu

### What We're Building (Unified UI Wrapper)
A new layout shell with consistent page patterns, replacing the folder-tab navigation with a sidebar-driven architecture. The design prototype is `landscape_unified_wrapper_v4.html`.

**Key patterns in the new layout:**

1. **Left sidebar** (260px, collapsible) — Logo, project selector, +New chat, search, nav items (Projects, Documents, Map, Tools, Reports, Landscaper AI, Admin), thread list, scheduled agents, recent projects, user footer with theme toggle.

2. **Content-first pages** (Projects, Documents, Map, Tools, Reports, Landscaper AI, Admin) — Each page has a `#040506` header bar with a 💬 chat icon that toggles a Landscaper chat panel from the left. Content fills the remaining space. No page titles or subtitle banners — the title is in the header bar.

3. **Chat workspace** (default view) — Three-panel: sidebar + center chat stream + right artifact panel. This is where the existing Landscaper chat and ingestion flows live. Thread switching, artifact cards, extraction workbench all render here.

4. **Documents page** — Full-width DMS content by default. Chat panel appears when user clicks a doc's 💬 icon (each doc gets a persistent thread). Detail panel renders below the doc grid. Status dots (green=extracted, orange=pending, blue=knowledge) on each doc row.

5. **Reports page** — Two-panel: catalog left, preview right. Chat icon in preview header swaps catalog for a chat panel. "Close" badge toggles back.

6. **Admin page** — Tab bar (Preferences, Benchmarks, Cost Library, DMS Admin, Report Config, Users) with chat toggle in header. Sidebar nav goes directly to Preferences tab.

7. **Universal header bar** — Every content panel uses `#040506` background, `1px solid #323a49` bottom border, 46px min-height. Three contiguous dark bars across the top on every view.

8. **Badge/color system** — Comprehensive design spec in `badge-color-system-design-decisions.md` and visual specimen in `ui-artifact-specimen-v4b.html`. Key rules:
    - All proper case (no uppercase anywhere)
    - All badges have `1px solid rgba(255,255,255,0.1)` stroke
    - **6px border radius** for all rectangular badges (badges, tags, counters, toggles). 50% (circle) only for dots, avatars, lifecycle letters.
    - Three variant system: Solid, Soft (18% fill / 30% border dark, 20% fill / 35% border light), Outline
    - Property type colors: updated palette (Land Dev=#3B4F6B Slate, MF=#0DB14B green, HTL=#F37021 orange — MF/HTL swapped from original)
    - Tool type colors: Ocean ramp (Skills=#0E3B6F, Analysis=#1565A8, Reports=#2196C8, Data Sources=#4FC3D8, Document=#0B1D3A, Custom=#B2EBF2). Known issue: Document (Abyss) soft variant nearly invisible on dark — use solid on dark surfaces or bump to lighter navy.
    - Status badges: Active/Complete=success green, Pending=warning amber, Error/Rejected=danger red, Draft=secondary gray
    - Compact letter variant (20x20px single char) for tight spaces
    - Terminology: "badge" is universal. "pill" and "chip" are deprecated. Rename: `StatusChip` → `StatusBadge`, `ExtractionFilterPills` → `ExtractionFilterToggles`, `MediaBadgeChips` → `MediaBadges`
    - Project selector shows property type (solid) + subtype (soft) badges, flexed to fill selector width

9. **Artifact-first data model** — The existing folder-tab pages (Property Details, Rent Roll, Operations, Valuation, Capitalization, etc.) are input collection forms. In the new UI, Landscaper collects inputs through conversation and/or document ingestion. Users never see empty forms. Instead, artifacts appear in the right panel only after Landscaper has enough data to render them — a populated operating statement, a completed comp grid, a valuation summary. The existing tab components are NOT reused in the artifact panel — they are replaced by artifacts that Landscaper produces. The underlying data is the same (same API, same schema), but presentation shifts from "empty form waiting for input" to "populated artifact generated from conversational input."

10. **Modal-on-demand for manual input** — Every modal that currently exists in the app is available to the user by asking Landscaper to show it. User says "let me edit comp 3" or "open the loan inputs" → Landscaper opens the corresponding existing modal. The modal system is context-aware — Landscaper knows which modals are relevant based on the active thread topic and can offer them proactively. This means:
    - All existing input modals stay as-is — no rebuilds
    - Landscaper gets a tool (e.g., `open_input_modal`) that triggers them
    - The Operating Statement is currently inline editing (not a modal) — it needs a modal version built so it follows the same pattern
    - Landscaper can dynamically add/expose additional fields in any open modal if the user asks (e.g., "add a pet rent line" or "show the parking income field")

11. **Contacts page needed** — Each project has its own contacts. Users may also have non-project-specific contacts (verify in codebase). A Contacts page or section needs to be added — likely accessible from the Projects page or as a sub-section within the project workspace.

12. **Chat panel auto-collapse** — On ALL pages where a Landscaper chat panel is open (Documents, Reports, Tools, Map, Admin, Landscaper AI, Projects), if the user drags the chat panel wider and it would cause the right content panel to truncate, the chat panel must auto-collapse to a thin icon bar (Landscaper "L" icon in the header). Clicking the icon re-expands the chat panel to its previous width. This is a universal rule — no page is exempt. Implementation requires measuring the right panel's minimum content width against available space and triggering the collapse when the threshold is crossed.

13. **Help nav item** — Add a "Help" item below Admin in the sidebar navigation. Icon: propeller cap (custom SVG — asset provided separately). Bug report functionality lives inside the Help page or as a sub-action.

14. **Project selector badges** — The project selector box in the sidebar shows property type and subtype as colored badges (using property type color tokens) on a second line below the project name. Badges flex to fill the selector box width. Replaces the old text line ("Multifamily · Active"). Hidden when sidebar is collapsed.

15. **Activity Feed deprecated** — The old Activity Feed from the Landscaper left panel is replaced by thread history. It was never fully developed. Thread history is the better pattern for a chat-focused interface.

---

## PHASE 1: DISCOVERY (Do This First — No Code)

### Deliverable 1A: Production Feature Inventory

Audit every production and active-prototype surface in the alpha19 codebase. Skip anything marked `deprecated` or `archived` in the route table. For each feature, document:

| Field | Description |
|---|---|
| Feature name | Plain-English name (e.g., "Rent Roll Grid", "Expense Manager") |
| Current location | Folder tab + sub-tab (e.g., "Operations → Rent Roll") |
| Component path(s) | React component file(s) that render it |
| Content type | Input form, data grid, chart, map, document viewer, modal, flyout, tile |
| API dependencies | Django endpoints and/or SWR hooks consumed |
| Landscaper tools | Any Landscaper tools that read from or write to this surface |
| Complexity | Simple / Medium / Complex |

**Scope:** Include everything a user can currently interact with in a production project — every tab, sub-tab, tile, flyout, modal, and grid. Include the AdminModal tabs, Dashboard, Landscaper chat, and Ingestion Workbench.

### Deliverable 1B: Unified UI Destination Map

For every item in 1A, specify where it lives in the new Unified UI:

| Field | Description |
|---|---|
| Feature name | Same as 1A |
| Destination page | Which sidebar nav page (Projects, Documents, Map, Tools, Reports, Landscaper AI, Admin, Chat Workspace) |
| Destination location | Where on that page (main content area, chat artifact, right panel, tab within page, modal) |
| Component reuse | "Reuse as-is", "Reuse with wrapper changes", or "Needs new component" |
| Migration notes | Any changes needed (prop adjustments, context provider wrapping, layout adaptation) |

### Deliverable 1C: Orphan Report

List any features from 1A that do NOT have a clear destination in the new layout. For each orphan:
- Why it doesn't map (no equivalent page, incompatible layout, unclear ownership)
- Recommended resolution (create new destination, merge into existing page, defer, deprecate)

### Deliverable 1D: Shared Component Inventory

List every component that will be used by BOTH the old folder-tab layout AND the new wrapper layout during the coexistence period:
- Component path
- Current parent/wrapper assumptions (e.g., expects ProjectLayoutClient context, expects FolderTabs query params)
- Changes needed for dual-layout compatibility (if any)

**STOP after Phase 1.** Do not proceed to Phase 2 until Phase 1 deliverables are reviewed and approved.

---

## PHASE 2: IMPLEMENTATION (After Phase 1 Approval)

### 2A: Branch

Create a dedicated feature branch before writing any code:
```bash
git checkout -b feature/unified-ui
```
All Unified UI work lives on this branch. Do not merge into main until the full page shell is functional and verified against the coexistence rules in 2D.

### 2B: Route Structure

Create a new Next.js route group: `src/app/(wrapper)/` with its own layout. This is a parallel route — the existing `/projects/[projectId]` route and folder-tab layout stay completely untouched.

Routes to create:
```
src/app/(wrapper)/
├── layout.tsx              — Wrapper shell (sidebar + main content area)
├── page.tsx                — Redirects to /projects or chat workspace
├── projects/
│   └── page.tsx            — Projects page
├── projects/[projectId]/
│   ├── layout.tsx          — Project-scoped layout (context providers)
│   ├── page.tsx            — Chat workspace (default)
│   ├── documents/page.tsx  — Documents page
│   ├── map/page.tsx        — Map page
│   ├── tools/page.tsx      — Tools page
│   ├── reports/page.tsx    — Reports page
├── landscaper-ai/
│   └── page.tsx            — Landscaper AI config
├── admin/
│   └── page.tsx            — Admin tabs
```

### 2C: Shared Layout Components

Build the wrapper shell components that every page uses:

| Component | Purpose |
|---|---|
| `WrapperSidebar.tsx` | Left sidebar with nav, threads, agents, project selector |
| `WrapperHeader.tsx` | `#040506` header bar — accepts title, chat toggle callback, optional action buttons |
| `ChatTogglePanel.tsx` | Reusable chat panel with thread list, appears on any page when toggled |
| `PageShell.tsx` | Wraps content pages with header + chat toggle + content area |

### 2D: Page Implementation Order

Build pages in this order (each depends on the previous):

1. **Wrapper shell + sidebar** — Layout, navigation, theme toggle, project selector
2. **Chat workspace** — Mount existing Landscaper chat components in center panel + artifact panel
3. **Projects page** — Project cards grid with header
4. **Documents page** — DMS content, doc chat toggle, status dots, detail panel
5. **Reports page** — Catalog/preview panels, chat swap
6. **Admin page** — Tab bar with existing admin panel content
7. **Tools page** — Tool cards grid with header
8. **Landscaper AI page** — Config panels with header
9. **Map page** — MapLibre mount with header

### 2E: Coexistence Rules

During the transition period, both layouts must work:
- Old layout: `/projects/[projectId]?folder=...&tab=...` — unchanged
- New layout: `/w/projects/[projectId]/...` (or whatever route prefix the wrapper group uses)
- Same Django backend, same API endpoints, same database
- Same Landscaper tools, same extraction pipeline
- Users can switch between layouts (mechanism TBD — could be a user preference or URL)

---

## DESIGN REFERENCE

The prototype HTML file is the source of truth for all visual decisions:
- `landscape_unified_wrapper_v4.html` — current prototype with all page patterns
- `landscape_badge_inventory.html` — badge/pill color reference

All implementation must use CoreUI CSS variables — not hardcoded hex values from the prototype. The prototype uses raw hex for the `#040506` header bars and sidebar because those are fixed (not theme-switched), which is correct.

---

## KEY FILES TO READ

Before starting discovery, read these files to understand the current architecture:

| File | Purpose |
|---|---|
| `LANDSCAPE_UI_TECHNICAL_OVERVIEW.md` | Full page inventory, route table, component paths |
| `CLAUDE.md` | Project rules, alpha readiness, architecture decisions |
| `src/lib/utils/folderTabConfig.ts` | Current folder tab navigation config |
| `src/app/projects/[projectId]/ProjectLayoutClient.tsx` | Current project layout shell |
| `src/components/navigation/FolderTabs.tsx` | Current tab navigation component |
| `src/components/landscaper/LandscaperPanel.tsx` | Current chat panel |
| `src/components/landscaper/LandscaperChat.tsx` | Current chat component |
| `src/styles/tokens.css` | CSS variable definitions |
| `COWORK_CONVERSATIONAL_UI_MAPPING_VX.md` | Prior mapping work (partially outdated — verify against current state) |
| `landscape_unified_wrapper_v4.html` | **Prototype** — visual source of truth for all page layouts, panel patterns, navigation |
| `ui-artifact-specimen-v4b.html` | **Badge specimen** — visual reference for all badge variants, colors, sizing |
| `badge-color-system-design-decisions.md` | **Badge design spec** — property type palette, Ocean tool ramp, variant system, opacity values, naming rules, component rename list |

---

## SUCCESS CRITERIA

Phase 1 complete when:
- [ ] Every production feature has a row in the inventory (1A)
- [ ] Every feature has a destination in the new layout (1B)
- [ ] Orphan report identifies any unmapped features with recommendations (1C)
- [ ] Shared component list identifies dual-layout compatibility needs (1D)
- [ ] Gregg has reviewed and approved all four deliverables

Phase 2 complete when:
- [ ] Wrapper shell renders with sidebar navigation
- [ ] All pages from the prototype are implemented with correct header patterns
- [ ] Chat toggle works on every content page
- [ ] Existing Landscaper chat mounts in the chat workspace
- [ ] DMS page renders with status dots and doc-initiated chat threads
- [ ] Reports page renders with catalog/preview and chat swap
- [ ] Admin tabs render with existing admin panel content
- [ ] No regressions in the existing folder-tab layout
- [ ] `npm run build` passes with no TypeScript errors

---

## DOWNSTREAM IMPACT

**Files being created:**
- New route group `src/app/(wrapper)/` and all child routes
- New components in `src/components/wrapper/`

**Files NOT being modified:**
- `src/app/projects/[projectId]/` — existing layout untouched
- `src/components/navigation/FolderTabs.tsx` — not changed
- `folderTabConfig.ts` — not changed
- Any Django backend code — not changed

**Potential conflicts:**
- Shared context providers (ProjectContext, LandscaperContext) may need to be lifted to a common ancestor if both layouts need them
- SWR cache keys should be identical across both layouts (same API endpoints)
- Theme toggle must work in both layouts

---

## SERVER RESTART
After completing implementation tasks, restart the servers:
```bash
bash restart.sh
```
This restarts both the Next.js app and Django backend.
