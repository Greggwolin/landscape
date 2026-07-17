# Landscape Frontend — Route Inventory

**Purpose:** scope an external design audit to the pages that are actually reachable in normal use.
**Method:** status is derived from the live navigation/link graph and from imports — not from memory of past sessions. Where reachability could not be confirmed from the graph, the row is marked `unknown` rather than guessed.
**Scope:** every folder under `src/app` that contains a `page.tsx` (76 routes). Inventory only — nothing was refactored or deleted.

**Source signals used:**
- Root shell logic: `src/app/components/NavigationLayout.tsx` (decides which chrome wraps a route).
- Legacy top-nav link set: `src/app/components/navigation/constants.ts` (`GLOBAL_NAV_LINKS`, `SANDBOX_PAGES`, `SETTINGS_ACTIONS`).
- Chat-first nav: `src/app/w/layout.tsx` + `src/components/wrapper/WrapperSidebar.tsx` + `src/lib/utils/folderTabConfig.ts`.
- Legacy project tab bar: `src/app/projects/[projectId]/ProjectLayoutClient.tsx` + `src/components/project/ProjectSubNav.tsx`.

---

## The big picture (read this first)

The application boots into the **chat-first `/w/*` surface** — `src/app/page.tsx` redirects `/` → `/w/dashboard`. That is the live production app.

The **legacy folder/tab surface** (`/dashboard`, `/projects/[projectId]/*`) is still real and reachable, but its global top nav exposes only **one** Tier-1 link: `/dashboard`. Every other top-level route (all the growth-rate pages, both budget grids, the GIS/test pages, market/inventory, etc.) lives in a **developer "Sandbox" dropdown** (`SANDBOX_PAGES`). Those are prototype/reference pages, not production surfaces.

**Implication for the auditor:** the vast majority of the issues a full-repo audit surfaces are on Sandbox, archived, or superseded pages. The active review set is small — see the "Active pages only" list at the very bottom.

---

## Answers to the auditor's specific questions

**1. Which of `growthrates`, `growthrates-original`, `growthratesmanager`, `growthratedetail` is the live one?**
None of them is a production page — all four are in the developer Sandbox dropdown, not in the real nav. Their lineage:
- `/growthrates` → renders `GrowthRates.tsx` (the newest, Materio-styled rebuild). This is the most current of the four.
- `/growthrates-original` → renders `GrowthRates-Original.tsx` (the predecessor `/growthrates` replaced).
- `/growthratesmanager` → renders `GrowthRatesManager/index.tsx` (a separate manager experiment).
- `/growthratedetail` → a standalone detail-view experiment.
All four import `@mui/material`. The production growth-rate editing that ships to users lives **inside the project assumptions flow as a component**, not at any of these standalone routes.

**2. Which of `budget-grid` vs `budget-grid-v2` is live?**
Neither is a production route — both are in the Sandbox dropdown.
- `/budget-grid` → the older version; imports `@mui/material` via `src/app/components/Budget/BudgetGrid.tsx`.
- `/budget-grid-v2` → the newer rewrite; no MUI, built with Tailwind utility classes (`bg-gray-900`, `bg-gray-800`, …).
`budget-grid-v2` supersedes `budget-grid`. The **production** budget UI is the project Budget tab (`/projects/[projectId]/project/budget`), not either standalone page.

**3. Is anything in `src/app/_archive` or `src/app/prototypes-multifam` still imported by active code?**
No. A repo-wide grep for imports of `_archive/*` or `prototypes-multifam/*` from outside those folders returns nothing. `_archive` is fully dead (safe to delete). `prototypes-multifam` is a live route only in the sense that its `page.tsx` still exists and is listed in the Sandbox dropdown; no active code imports it, and it pulls the legacy `Navigation.tsx` component.

**4. Do any active pages still import from `@mui/material`? (grep, not memory)**
Yes — one active path. The project **Sales** tab (`/projects/[projectId]/project/sales`) → `SalesContent` → `ParcelSalesTable` → `SaleCalculationModal` (`src/components/sales/SaleCalculationModal.tsx`) → `@mui/material`, and onward to `SaveBenchmarkModal`. That is the only MUI leak into a production surface found.

Every other `@mui/material` importer is a Sandbox page, an archived page, or an unmounted Materio-template leftover:
```
src/app/_archive/prototypes/multifam/rent-roll-inputs/page.tsx        (archived)
src/app/_archive/prototypes/multifam/rent-roll-inputs/components/PageHeader.tsx (archived)
src/app/budget-grid/page.tsx                                          (sandbox)
src/app/components/Budget/BudgetGrid.tsx                              (sandbox: budget-grid)
src/app/components/GrowthRates.tsx                                    (sandbox: growthrates)
src/app/components/GrowthRates-Original.tsx                           (sandbox: growthrates-original)
src/app/components/GrowthRatesManager/index.tsx                       (sandbox: growthratesmanager)
src/app/components/MarketAssumptionsNative.tsx                        (sandbox: market-assumptions)
src/app/rent-roll/page.tsx                                            (sandbox/prototype)
src/app/components/ThemeRegistry.tsx                                  (unmounted Materio template)
src/app/components/theme/index.tsx                                    (unmounted Materio template)
src/app/components/theme/ModeChanger.tsx                              (unmounted Materio template)
src/app/components/stepper-dot/index.tsx                              (unmounted Materio template)
src/app/components/upgrade-to-pro-button/index.tsx                    (unmounted Materio template)
src/app/components/layout/shared/ModeDropdown.tsx                     (unmounted Materio template)
src/app/components/layout/shared/UserDropdown.tsx                     (unmounted Materio template)
src/app/components/layout/shared/search/index.tsx                     (unmounted Materio template)
src/app/components/layout/vertical/NavbarContent.tsx                  (unmounted Materio template)
src/app/components/layout/vertical/Navigation.tsx                     (unmounted Materio template)
src/app/components/layout/vertical/VerticalMenu.tsx                   (unmounted Materio template)
src/components/extraction/StagingModal.tsx                            (used by rent-roll sandbox + archive only)
src/components/sales/SaleCalculationModal.tsx                         (ACTIVE via Sales tab — see above)
src/components/sales/SaveBenchmarkModal.tsx                           (ACTIVE via SaleCalculationModal)
src/themes/current/index.tsx                                          (unmounted template)
src/themes/current/ModeChanger.tsx                                   (unmounted template)
```

**5. Do any active pages rely on Tailwind utility classes in their markup? (rough count per page)**
Yes, Tailwind utilities are mixed into CoreUI throughout the active surface — this is a systemic pattern, not isolated:
- `/w/*` (chat-first): heavy CoreUI + frequent Tailwind utilities (`flex`, `min-h-screen`, `items-center`, gap/padding utilities) — dozens of occurrences per major view.
- `/dashboard` and `/projects/[projectId]/*`: CoreUI-first with Tailwind utilities sprinkled in (the shell in `NavigationLayout.tsx` itself uses `flex min-h-screen flex-col`).
- `/budget-grid-v2` (sandbox): built almost entirely in Tailwind, including forbidden `bg-gray-*` classes.
Precise per-page counts were not tallied for all 76 routes; the pattern is "present nearly everywhere," so the styling column below marks active pages `CoreUI + Tailwind classes` unless MUI is also present (`mixed`).

**6. Which CSS files in `src/styles/` are imported by active pages, and which are orphaned?**
Imported by active pages / shells:
- `budget-color-audit.css`, `coreui-theme.css`, `navigation.css`, `sales-transactions.css` → root layout (`src/app/layout.tsx`), so global/active.
- `wrapper.css` → `/w` layout + studio shell (active).
- `folder-tabs.css`, `resizable-panel.css` → project layout (active).
- `ingestion-workbench.css`, `operations-tab.css`, `landscaper-review.css`, `narrative-editor.css` → active project tab components.
- `tokens.css` → active (`StatusBadge`, tile config).
- `component-patterns.css` → active (budget filters accordion).
- `studio.css` → `/studio` layout (active).
- `guide-print.css` → `/guide` (active).
- `style-catalog.css` → the StyleCatalog dev reference (dev-only).

Orphaned (imported by nothing — safe-to-delete candidates, verify before removing):
`alpha-assistant.css`, `channel-modal.css`, `channel-pills.css`, `color-guard.css`, `horizon-dark.css`, `lease.css`, `leveraged-cf.css`, `loan-schedule.css`, `parcel-tiles.css`, `property-page.css`, `sales-comparison.css`, `scenarios.css`.
Ambiguous: `property.css` (matched two importers but references are entangled with the `/property` string — confirm manually).

---

## Route table

Status legend: `active` = reachable in normal use · `legacy` = superseded but still routable · `dev/test` = Sandbox/debug/demo · `delete` = dead, safe to remove · `unknown` = reachability not confirmable from the graph.

Wrappers: **W-Bare** = no chrome · **W-Top** = legacy top nav (`TopNavigationBar` via `NavigationLayout`) · **W-Wrap** = chat-first sidebar (`WrapperSidebar`, `src/app/w/layout.tsx`) · **W-Proj** = legacy project tab bar (`ProjectLayoutClient` + `ProjectSubNav`) · **W-Studio** = self-contained studio shell (`src/app/studio/[projectId]/layout.tsx`) · **W-Guide** = guide shell.

### Chat-first surface — `/w/*` (the live app)

| Route | Status | Superseded by | Wrapper | Styling | Entry component |
|---|---|---|---|---|---|
| `/` | active (redirect → `/w/dashboard`) | — | W-Bare | — | `src/app/page.tsx` |
| `/w` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/page.tsx` |
| `/w/dashboard` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/dashboard/page.tsx` |
| `/w/chat` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/chat/page.tsx` |
| `/w/chat/[threadId]` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/chat/[threadId]/page.tsx` |
| `/w/projects` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/projects/page.tsx` |
| `/w/projects/[projectId]` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/projects/[projectId]/page.tsx` |
| `/w/projects/[projectId]/documents` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/projects/[projectId]/documents/page.tsx` |
| `/w/projects/[projectId]/map` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/projects/[projectId]/map/page.tsx` |
| `/w/projects/[projectId]/reports` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/projects/[projectId]/reports/page.tsx` |
| `/w/tools` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/tools/page.tsx` |
| `/w/help` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/help/page.tsx` |
| `/w/landscaper-ai` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/landscaper-ai/page.tsx` |
| `/w/platform-knowledge` | active | — | W-Wrap | CoreUI + Tailwind | `src/app/w/platform-knowledge/page.tsx` |
| `/w/admin` | unknown | — | W-Wrap | CoreUI + Tailwind | `src/app/w/admin/page.tsx` — in the `/w` shell but no inbound link found; confirm |

### Auth

| Route | Status | Superseded by | Wrapper | Styling | Entry component |
|---|---|---|---|---|---|
| `/login` | active | — | W-Bare | CoreUI + Tailwind | `src/app/login/page.tsx` |
| `/register` | active | — | W-Bare | CoreUI + Tailwind | `src/app/register/page.tsx` |
| `/forgot-password` | active | — | W-Bare | CoreUI + Tailwind | `src/app/forgot-password/page.tsx` |
| `/reset-password` | active | — | W-Bare | CoreUI + Tailwind | `src/app/reset-password/page.tsx` |

### Legacy folder/tab surface — top level

| Route | Status | Superseded by | Wrapper | Styling | Entry component |
|---|---|---|---|---|---|
| `/dashboard` | active | — | W-Top | CoreUI + Tailwind | `src/app/dashboard/page.tsx` |
| `/guide` | active | — | W-Guide | CoreUI + Tailwind | `src/app/guide/page.tsx` |
| `/documents/review` | active (admin tool — "Landscaper Training" in settings menu) | — | W-Top | CoreUI + Tailwind | `src/app/documents/review/page.tsx` |
| `/contacts` | unknown | — | W-Top | — | `src/app/contacts/page.tsx` — not in any nav; may be reached from in-page actions; confirm |
| `/reports` | unknown | possibly `/w/projects/[id]/reports` | W-Top | — | `src/app/reports/page.tsx` — not in global nav; confirm |
| `/preferences` | unknown | likely `/admin/preferences` | own layout | — | `src/app/preferences/page.tsx` — has its own layout; likely legacy |
| `/settings/profile` | unknown | possibly `/admin/preferences` | W-Top | — | `src/app/settings/profile/page.tsx` |
| `/settings/taxonomy` | unknown | — | W-Top | — | `src/app/settings/taxonomy/page.tsx` |
| `/settings/budget-categories` | unknown | — | W-Top | — | `src/app/settings/budget-categories/page.tsx` — no inbound link found |
| `/settings/contact-roles` | unknown | — | W-Top | — | `src/app/settings/contact-roles/page.tsx` — no inbound link found |

### Studio surface

| Route | Status | Superseded by | Wrapper | Styling | Entry component |
|---|---|---|---|---|---|
| `/studio/[projectId]` | active | — | W-Studio | CoreUI + Tailwind | `src/app/studio/[projectId]/page.tsx` |

### Admin

| Route | Status | Superseded by | Wrapper | Styling | Entry component |
|---|---|---|---|---|---|
| `/admin/preferences` | active (settings gear menu) | — | W-Top | CoreUI + Tailwind | `src/app/admin/preferences/page.tsx` |
| `/admin/benchmarks` | active (settings gear menu) | — | W-Top | CoreUI + Tailwind | `src/app/admin/benchmarks/page.tsx` |
| `/admin/benchmarks/cost-library` | active | — | W-Top | CoreUI + Tailwind | `src/app/admin/benchmarks/cost-library/page.tsx` |
| `/admin/dms/templates` | active (settings gear + sandbox) | — | W-Top | CoreUI + Tailwind | `src/app/admin/dms/templates/page.tsx` |
| `/admin/feedback` | active (feedback system) | — | W-Top | CoreUI + Tailwind | `src/app/admin/feedback/page.tsx` |
| `/admin/users` | unknown | — | W-Top | — | `src/app/admin/users/page.tsx` — one inbound ref; confirm |
| `/admin/changelog` | unknown | — | W-Top | — | `src/app/admin/changelog/page.tsx` — no inbound link found |

### Legacy project workspace — `/projects/[projectId]/*`

| Route | Status | Superseded by | Wrapper | Styling | Entry component |
|---|---|---|---|---|---|
| `/projects/[projectId]` | active (project home) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/page.tsx` |
| `/projects/[projectId]/project/summary` | active (PROJECT sub-tab) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/project/summary/page.tsx` |
| `/projects/[projectId]/project/planning` | active (PROJECT sub-tab) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/project/planning/page.tsx` |
| `/projects/[projectId]/project/budget` | active (PROJECT sub-tab) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/project/budget/page.tsx` |
| `/projects/[projectId]/project/sales` | active (PROJECT sub-tab) | — | W-Proj | **mixed (CoreUI + Tailwind + MUI)** — MUI via `SaleCalculationModal` | `src/app/projects/[projectId]/project/sales/page.tsx` |
| `/projects/[projectId]/project/dms` | active (PROJECT sub-tab) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/project/dms/page.tsx` |
| `/projects/[projectId]/capitalization/debt` | active (Capitalization tab) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/capitalization/debt/page.tsx` |
| `/projects/[projectId]/capitalization/equity` | active (Capitalization tab) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/capitalization/equity/page.tsx` |
| `/projects/[projectId]/documents` | active (Documents tab) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/documents/page.tsx` |
| `/projects/[projectId]/settings` | active (project settings) | — | W-Proj | CoreUI + Tailwind | `src/app/projects/[projectId]/settings/page.tsx` |
| `/projects/[projectId]/budget` | legacy | `/projects/[projectId]/project/budget` | W-Proj | — | `src/app/projects/[projectId]/budget/page.tsx` — older location; confirm before removing |
| `/projects/[projectId]/assumptions` | unknown | possibly the PROJECT tab set | W-Proj | — | `src/app/projects/[projectId]/assumptions/page.tsx` — reachable in Sandbox (Peoria Lakes); confirm production use |
| `/projects/[projectId]/investment-committee` | unknown | — | W-Proj | — | `src/app/projects/[projectId]/investment-committee/page.tsx` — not in tab config; confirm |
| `/projects/setup` | dev/test (Sandbox dropdown) | — | W-Top | — | `src/app/projects/setup/page.tsx` |

### Developer "Sandbox" / prototype / test pages

| Route | Status | Superseded by | Wrapper | Styling | Entry component |
|---|---|---|---|---|---|
| `/dev-status` | dev/test | — | W-Top | — | `src/app/dev-status/page.tsx` |
| `/documentation` | dev/test | — | W-Top | — | `src/app/documentation/page.tsx` (imports legacy `Navigation.tsx`) |
| `/db-schema` | dev/test | — | W-Top | — | `src/app/db-schema/page.tsx` |
| `/planning` | dev/test (Peoria Lakes demo) | — | W-Top | — | `src/app/planning/page.tsx` |
| `/prototypes-multifam` | legacy/dev (dead-ish) | — | W-Top | — | `src/app/prototypes-multifam/page.tsx` (imports legacy `Navigation.tsx`; no active importers) |
| `/budget-grid` | dev/test | `/budget-grid-v2` (both sandbox) | W-Top | — (MUI) | `src/app/budget-grid/page.tsx` |
| `/budget-grid-v2` | dev/test | — | W-Top | — (Tailwind, incl. `bg-gray-*`) | `src/app/budget-grid-v2/page.tsx` |
| `/market-assumptions` | dev/test | — | W-Top | — (MUI) | `src/app/market-assumptions/page.tsx` |
| `/growthrates` | dev/test | — | W-Top | — (MUI) | `src/app/growthrates/page.tsx` |
| `/growthrates-original` | legacy/dev | `/growthrates` | W-Top | — (MUI) | `src/app/growthrates-original/page.tsx` |
| `/growthratesmanager` | dev/test | — | W-Top | — (MUI) | `src/app/growthratesmanager/page.tsx` |
| `/growthratedetail` | dev/test | — | W-Top | — (MUI) | `src/app/growthratedetail/page.tsx` |
| `/ai-document-review` | dev/test | — | W-Top | — | `src/app/ai-document-review/page.tsx` |
| `/market` | dev/test ("Market Intel" in Sandbox) | — | W-Top | — | `src/app/market/page.tsx` |
| `/inventory` | dev/test | — | W-Top | — | `src/app/inventory/page.tsx` |
| `/rent-roll` | dev/test (prototype) | — | W-Top | — (MUI via `StagingModal`) | `src/app/rent-roll/page.tsx` |
| `/gis-simple-test` | dev/test | — | W-Top | — | `src/app/gis-simple-test/page.tsx` |
| `/map-debug` | dev/test | — | W-Top | — | `src/app/map-debug/page.tsx` |
| `/test-coreui` | dev/test | — | W-Top | — | `src/app/test-coreui/page.tsx` |
| `/breadcrumb-demo` | dev/test | — | W-Top | — | `src/app/breadcrumb-demo/page.tsx` |
| `/dev/artifact-renderer` | dev/test | — | W-Top | — | `src/app/dev/artifact-renderer/page.tsx` — no inbound link |

### Archived — `src/app/_archive/*` (dead; safe to delete)

| Route | Status | Superseded by | Wrapper | Styling | Entry component |
|---|---|---|---|---|---|
| `/_archive/prototypes` | delete | — | W-Top | — | `src/app/_archive/prototypes/page.tsx` |
| `/_archive/prototypes/[prototypeId]` | delete | — | W-Top | — | `src/app/_archive/prototypes/[prototypeId]/page.tsx` |
| `/_archive/prototypes/multifam/rent-roll-inputs` | delete | — | W-Top | — | `src/app/_archive/prototypes/multifam/rent-roll-inputs/page.tsx` |
| `/_archive/prototypes/multifam/rent-roll-inputs/content` | delete | — | W-Top | — | `src/app/_archive/prototypes/multifam/rent-roll-inputs/content/page.tsx` |

> Note on `_archive` routing: whether Next.js actually serves `_archive/*` depends on route config; regardless of routability, no active code imports it, so it is dead for audit purposes.

---

## Active pages only — the auditor's review set

If the auditor reviews only these, they cover the entire live product:

**Chat-first (`/w/*`):** `/w`, `/w/dashboard`, `/w/chat`, `/w/chat/[threadId]`, `/w/projects`, `/w/projects/[projectId]`, `/w/projects/[projectId]/documents`, `/w/projects/[projectId]/map`, `/w/projects/[projectId]/reports`, `/w/tools`, `/w/help`, `/w/landscaper-ai`, `/w/platform-knowledge`.

**Legacy folder/tab (still shipped):** `/dashboard`, `/guide`, `/documents/review`, and the project workspace: `/projects/[projectId]`, `/projects/[projectId]/project/{summary,planning,budget,sales,dms}`, `/projects/[projectId]/capitalization/{debt,equity}`, `/projects/[projectId]/documents`, `/projects/[projectId]/settings`.

**Studio:** `/studio/[projectId]`.

**Admin (settings gear):** `/admin/preferences`, `/admin/benchmarks` (+`/cost-library`), `/admin/dms/templates`, `/admin/feedback`.

**Auth:** `/login`, `/register`, `/forgot-password`, `/reset-password`.

**Confirm-then-include (marked `unknown` above):** `/w/admin`, `/contacts`, `/reports`, `/preferences`, `/settings/*`, `/admin/users`, `/admin/changelog`, `/projects/[projectId]/assumptions`, `/projects/[projectId]/investment-committee`.

**Two cleanup flags worth the auditor's attention:**
1. The project **Sales** tab is the one production surface still pulling in `@mui/material` (via `SaleCalculationModal`) — everything else MUI is sandbox/archived/template.
2. Twelve stylesheets in `src/styles/` are imported by nothing.
