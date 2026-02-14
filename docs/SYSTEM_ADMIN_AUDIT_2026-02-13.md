# System Administration Audit
**Date:** 2026-02-13  
**Audited by:** Codex

## 1. Route Inventory

| File path | Route URL | `page.tsx` route | Notes |
|---|---|---|---|
| `src/app/admin/benchmarks/page.tsx` | `/admin/benchmarks` | Yes | Admin benchmark library page |
| `src/app/admin/benchmarks/cost-library/page.tsx` | `/admin/benchmarks/cost-library` | Yes | Unit Cost Library page |
| `src/app/admin/changelog/page.tsx` | `/admin/changelog` | Yes | Admin changelog manager |
| `src/app/admin/dms/templates/page.tsx` | `/admin/dms/templates` | Yes | DMS template admin |
| `src/app/admin/feedback/page.tsx` | `/admin/feedback` | Yes | Feedback queue |
| `src/app/admin/preferences/page.tsx` | `/admin/preferences` | Yes | System preferences |
| `src/app/admin/users/page.tsx` | `/admin/users` | Yes | User management |
| `src/app/preferences/page.tsx` | `/preferences` | Yes | Query-param tabbed global preferences |
| `src/app/settings/budget-categories/page.tsx` | `/settings/budget-categories` | Yes | Budget category management |
| `src/app/settings/contact-roles/page.tsx` | `/settings/contact-roles` | Yes | Contact role management |
| `src/app/settings/profile/page.tsx` | `/settings/profile` | Yes | Profile/account settings |
| `src/app/settings/taxonomy/page.tsx` | `/settings/taxonomy` | Yes | Taxonomy manager |

Meaningful layout note:
- `src/app/preferences/layout.tsx` injects `PreferencesContextBar` across `/preferences` content.

## 2. Navigation Components

### 2.1 AdminNavBar
File: `src/app/components/AdminNavBar.tsx`

Tabs/links exposed:

| Label | Href | Conditional logic |
|---|---|---|
| Preferences | `/admin/preferences` | Always shown |
| Benchmarks | `/admin/benchmarks` | Always shown |
| Cost Library | `/admin/benchmarks/cost-library` | Always shown |
| DMS Admin | `/admin/dms/templates` | Always shown |
| Feedback | `/admin/feedback` | Only shown when `is_admin` or `role === 'admin'` |

Behavior notes:
- Active tab logic special-cases `/admin/benchmarks` and `/admin/benchmarks/cost-library` so both can be highlighted correctly.
- Uses auth context to filter admin-only tab(s).

### 2.2 PreferencesContextBar
File: `src/app/components/PreferencesContextBar.tsx`

Tabs come from `src/lib/utils/preferencesTabs.ts`:
- `products` -> `Product Library`
- `taxonomy` -> `Land Use Manager`

Tab state:
- Query-param driven (`/preferences?tab=...`).
- `router.push('/preferences?tab=${tabId}')` on tab click.
- Internal default fallback is `unit-costs`, but `/preferences` route immediately redirects legacy `unit-costs` and `benchmarks` tabs to admin routes.

### 2.3 Other Admin Navigation

Global/nav surfaces that link into admin/settings territory:

1. `src/app/components/Navigation.tsx`
- `DMS Admin` -> `/admin/dms/templates`
- `Preferences` -> `/admin/preferences`
- `Benchmarks` -> `/admin/benchmarks`

2. `src/app/components/navigation/UserMenuDropdown.tsx`
- `Profile Settings` -> `/settings/profile`
- `User Management` -> `/admin/users` (admin only)

3. `src/app/components/navigation/constants.ts`
- `SETTINGS_ACTIONS`: System Preferences, Benchmarks, DMS Admin, Landscaper Configuration, Landscaper Training
- `Landscaper Configuration` has no `href` (inferred placeholder/navigation gap)
- `SANDBOX_PAGES` includes `DMS Admin` -> `/admin/dms/templates`

4. `src/app/components/TopNavigationBar.tsx` + `src/app/components/NavigationLayout.tsx`
- Settings icon opens global `AdminModal` (panel navigation, not route navigation)

5. `src/components/admin/AdminModal.tsx`
- Internal panel tabs: Preferences, Benchmarks, Cost Library, DMS Admin, Report Configurator, Users, Landscaper.
- These are modal panel switches, not URL routes.

## 3. Page-by-Page Audit

### 3.1 Global Benchmarks — `/admin/benchmarks`
#### Identity
- Heading: `Global Benchmarks`
- Route: `/admin/benchmarks`
- Parent nav: `AdminNavBar` (Benchmarks tab)

#### Layout & Structure
- Uses `AdminNavBar` + large card container.
- Split-pane layout with draggable vertical divider.
- Left pane: category accordions/cards.
- Right pane: `BenchmarksFlyout` (selection details + landscaper analysis).
- Category panels act as sub-sections (growth rates, transaction cost, absorption, etc.).

#### Functional Content
- Primary role: global benchmark CRUD + growth rates + absorption velocity + AI suggestions context.
- Main components:
  - `src/components/benchmarks/BenchmarkAccordion.tsx`
  - `src/components/benchmarks/GrowthRateCategoryPanel.tsx`
  - `src/components/benchmarks/absorption/AbsorptionVelocityPanel.tsx`
  - `src/components/benchmarks/AddBenchmarkModal.tsx`
  - `src/components/benchmarks/BenchmarksFlyout.tsx`
  - `src/components/benchmarks/LandscaperPanel.tsx`
- Frontend endpoints (component tree):
  - `/api/benchmarks`
  - `/api/sale-benchmarks/global`
  - `/api/benchmarks/ai-suggestions`
  - `/api/benchmarks/absorption-velocity`
  - `/api/benchmarks/growth-rates`
  - `/api/benchmarks/growth-rates/{setId}`
  - `/api/unit-costs/templates`
  - `/api/landscaper/global/chat` (via `useLandscaper` in `LandscaperPanel`)
- Backend trace highlights:
  - `/api/sale-benchmarks/global` -> Django `apps.sales_absorption.urls` -> `global_sale_benchmarks` in `backend/apps/sales_absorption/views.py`
  - `/api/benchmarks/absorption-velocity` -> Next proxy -> Django `AbsorptionVelocityViewSet` (`backend/apps/benchmarks/urls.py` and also registered in `apps.sales_absorption.urls`)
  - `/api/benchmarks`, `/api/benchmarks/growth-rates` -> Next route handlers with direct SQL
- Discernible DB tables:
  - `landscape.tbl_global_benchmark_registry`
  - `landscape.tbl_benchmark_unit_cost`
  - `landscape.tbl_benchmark_transaction_cost`
  - `landscape.tbl_benchmark_contingency`
  - `landscape.tbl_sale_benchmarks`
  - `landscape.core_fin_growth_rate_sets`
  - `landscape.core_fin_growth_rate_steps`

#### Placeholders / Coming Soon
- Explicit placeholder:
  - `Impact Analysis Chart Placeholder` in `BenchmarksFlyout`.
- Explicit placeholder content (TODO/static mock data):
  - `LandscaperPanel` insights/activity sections are hard-coded and marked TODO.
- Inferred placeholders:
  - `Edit`, `Copy`, `Export` buttons in flyout render but have no action handlers.

#### Styling Notes
- Uses custom surface/token styling and utility classes (not CoreUI cards/tables).
- Visually aligned with newer benchmark UI language, but differs from CoreUI-heavy admin pages.

### 3.2 Unit Cost Library — `/admin/benchmarks/cost-library`
#### Identity
- Heading: `Unit Cost Library`
- Route: `/admin/benchmarks/cost-library`
- Parent nav: linked by `AdminNavBar` Cost Library tab

#### Layout & Structure
- Single card shell with header + embedded `UnitCostsPanel`.
- `UnitCostsPanel` provides internal cost-type tabs (`Hard`, `Soft`, `Deposits`, `Other`), filters, and editable grids.

#### Functional Content
- Primary role: CRUD on unit-cost template items and category-scoped cost libraries.
- Main component:
  - `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx`
- Frontend endpoints:
  - `/api/unit-costs/templates`
  - `/api/unit-costs/templates/{id}`
  - `/api/unit-costs/categories`
  - `/api/measures?systemOnly=true`
  - Category/tag manager paths in component tree: `/api/unit-costs/tags`, `/api/unit-costs/categories/{id}/add-tag`, `/remove-tag`, `/deletion-impact`
- Backend trace highlights:
  - `src/app/api/unit-costs/templates/*` mixes Django pass-through and SQL fallback.
  - `src/app/api/unit-costs/categories/*` mixes Django pass-through and SQL fallback.
  - `/api/measures` is Next SQL route (`landscape.tbl_measures`).
- Discernible DB tables:
  - `landscape.core_unit_cost_item`
  - `landscape.core_unit_cost_template`
  - `landscape.core_unit_cost_category`
  - `landscape.core_category_lifecycle_stages`
  - `landscape.tbl_measures`

#### Placeholders / Coming Soon
- No explicit coming-soon labels found on this route.

#### Styling Notes
- Newer custom benchmark styling, not CoreUI.
- Route page itself does not render `AdminNavBar` (navigation consistency gap).

### 3.3 Changelog Management — `/admin/changelog`
#### Identity
- Heading: `Changelog Management`
- Route: `/admin/changelog`
- Parent nav: no direct tab/link in `AdminNavBar` (orphaned from primary admin tabs)

#### Layout & Structure
- Uses `AdminNavBar`, CoreUI card/table patterns, modal for add/edit.
- Wrapped in `ProtectedRoute requireAdmin`.

#### Functional Content
- Primary role: CRUD changelog entries.
- Frontend endpoints:
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/changelog/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/changelog/{id}/`
- Backend trace:
  - `backend/config/urls.py` includes `apps.feedback.urls`.
  - `backend/apps/feedback/urls.py` registers `changelog` router.
  - `backend/apps/feedback/views.py` -> `ChangelogViewSet`.
- Discernible table:
  - `landscape.tbl_changelog`

#### Placeholders / Coming Soon
- None explicit or inferred.

#### Styling Notes
- Mostly CoreUI with minor inline styles.

### 3.4 DMS Templates Admin — `/admin/dms/templates`
#### Identity
- Heading: `Document Templates`
- Route: `/admin/dms/templates`
- Parent nav: `AdminNavBar` DMS tab, plus global `Navigation.tsx` links

#### Layout & Structure
- Standalone page with simple card/list + modal form.
- No `AdminNavBar` rendered within this route component.

#### Functional Content
- Primary role: CRUD DMS template definitions scoped by workspace.
- Frontend endpoints:
  - `/api/dms/templates?workspace_id=...`
  - `/api/dms/templates/{id}`
- Backend trace:
  - Next handlers in:
    - `src/app/api/dms/templates/route.ts`
    - `src/app/api/dms/templates/[id]/route.ts`
  - Direct SQL to `landscape.dms_templates`.
- Discernible table:
  - `landscape.dms_templates`

#### Placeholders / Coming Soon
- No explicit coming-soon labels on this page.

#### Styling Notes
- Tailwind-style light/dark gray palette, not CoreUI; visually distinct from other admin pages.
- Missing in-page `AdminNavBar` is a navigation/style inconsistency.

### 3.5 Feedback Queue — `/admin/feedback`
#### Identity
- Heading: `Feedback Queue`
- Route: `/admin/feedback`
- Parent nav: `AdminNavBar` Feedback (admin-only)

#### Layout & Structure
- `AdminNavBar` + CoreUI card/table + detail modal.
- `ProtectedRoute requireAdmin`.

#### Functional Content
- Primary role: review and status updates for tester feedback.
- Frontend endpoints:
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/feedback/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/feedback/{id}/` (PATCH)
- Backend trace:
  - `backend/apps/feedback/urls.py` -> `TesterFeedbackViewSet`.
- Discernible table:
  - `landscape.tester_feedback`

#### Placeholders / Coming Soon
- None explicit or inferred.

#### Styling Notes
- CoreUI style is consistent with changelog/admin table pages.

### 3.6 System Preferences — `/admin/preferences`
#### Identity
- Heading: `System Preferences`
- Route: `/admin/preferences`
- Parent nav: `AdminNavBar` Preferences

#### Layout & Structure
- `AdminNavBar` + card container + accordion sections.
- Sections (accordion):
  - Pro Features
  - Unit Cost Categories
  - Land Use Taxonomy Manager
  - Units of Measure Manager
  - System Picklists

#### Functional Content
- Primary role: system-level taxonomy, UOM, picklist, and tier settings.
- Components:
  - `src/app/admin/preferences/components/UnitCostCategoryManager.tsx`
  - `src/app/admin/preferences/components/UnitOfMeasureManager.tsx`
  - `src/components/admin/SystemPicklistsAccordion.tsx`
  - `src/app/settings/taxonomy/page.tsx` (embedded)
  - `src/hooks/useUserTier.ts` (Pro/Analyst tier)
- Frontend endpoints (component tree):
  - `/api/users/tier/`
  - `/api/unit-costs/categories`
  - `/api/unit-costs/tags`
  - `/api/unit-costs/categories/{id}/add-tag`
  - `/api/unit-costs/categories/{id}/remove-tag`
  - `/api/unit-costs/categories/{id}/deletion-impact`
  - `/api/admin/measures`
  - `/api/admin/measures/{code}`
  - `/api/admin/uom/reorder`
  - `/api/admin/picklists/{type}`
  - `/api/admin/picklists/{type}/{id}`
  - `/api/admin/picklist-display`
  - `/api/picklists/property-subtypes`
  - `/api/taxonomy/families`, `/api/taxonomy/types`, `/api/taxonomy/products`
  - `/api/planning-standards`
- Backend trace highlights:
  - `/api/users/tier/` -> Django `apps.users.urls` -> `user_tier_settings` in `backend/apps/users/views.py`
  - Picklist/UOM/taxonomy/planning standards are Next API routes with SQL and/or Django bridge behavior.
- Discernible DB tables:
  - `landscape.user_settings`
  - `landscape.tbl_measures`
  - `landscape.tbl_system_picklist`
  - `landscape.lu_picklist_display_config`
  - `landscape.lu_property_subtype`
  - `lu_family`, `lu_type`, `res_lot_product`, `type_lot_product`
  - `landscape.core_planning_standards`

#### Placeholders / Coming Soon
- Explicit placeholders inherited from embedded taxonomy manager:
  - Disabled `Import` and `Export` buttons.

#### Styling Notes
- Mixed CoreUI token card shell + embedded custom taxonomy styling.

### 3.7 User Management — `/admin/users`
#### Identity
- Heading: `User Management`
- Route: `/admin/users`
- Parent nav: admin-only link in `UserMenuDropdown`; also represented by non-route `Users` tab in `AdminModal`

#### Layout & Structure
- Standalone table with modals (Add/Edit/Reset Password/Delete).
- `ProtectedRoute requireAdmin`.

#### Functional Content
- Primary role: user CRUD + activation/deactivation + password reset.
- Components:
  - `src/app/admin/users/components/UserModals.tsx`
  - `src/lib/api/admin-users.ts`
- Frontend endpoints (direct Django in API client):
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/auth/users/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/auth/users/{id}/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/auth/users/{id}/set_password/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/auth/users/{id}/activate/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/auth/users/{id}/deactivate/`
- Backend trace:
  - `backend/apps/projects/urls_auth.py` router `users` -> `UserManagementViewSet`
  - `backend/apps/projects/views_auth.py` methods include `set_password`, `activate`, `deactivate`

#### Placeholders / Coming Soon
- None explicit or inferred.

#### Styling Notes
- Dark Tailwind-style table, not CoreUI; inconsistent with admin route set.
- No `AdminNavBar` on this admin route.

### 3.8 Global Preferences (Tabbed) — `/preferences`
#### Identity
- Heading: none in route wrapper; child panels provide headings.
- Route: `/preferences`
- Parent nav: `PreferencesContextBar` via `src/app/preferences/layout.tsx`

#### Layout & Structure
- Query-param tab routing (`?tab=products|taxonomy`).
- Redirect behavior:
  - `?tab=unit-costs` -> `/admin/benchmarks/cost-library`
  - `?tab=benchmarks` -> `/admin/benchmarks`
  - no `tab` -> `/preferences?tab=products`
- Renders one of:
  - `src/components/benchmarks/products/ProductLibraryPanel.tsx`
  - `src/app/settings/taxonomy/page.tsx`

#### Functional Content
- Product library + taxonomy management surface.
- Frontend endpoints (component tree):
  - `/api/products`
  - `/api/products/{id}`
  - `/api/land-use/types`
  - `/api/planning-standards`
  - `/api/taxonomy/families`, `/api/taxonomy/types`, `/api/taxonomy/products`

#### Placeholders / Coming Soon
- Explicit placeholders inherited from taxonomy child route:
  - Disabled `Import`/`Export` buttons.

#### Styling Notes
- Styling depends on active child panel; mixed custom styles.

### 3.9 Budget Category Management — `/settings/budget-categories`
#### Identity
- Heading: `Budget Category Management`
- Route: `/settings/budget-categories`
- Parent nav: no direct global/admin nav link found

#### Layout & Structure
- CoreUI card layout with:
  - Project selector
  - Internal tab set: `Templates` and `Custom Categories`
- Custom tab disabled until project selected.

#### Functional Content
- Primary role: project budget taxonomy templating + custom hierarchy CRUD.
- Components:
  - `src/components/budget/CategoryTemplateManager.tsx`
  - `src/components/budget/CategoryTreeManager.tsx`
  - `src/hooks/useBudgetCategories.ts`
- Frontend endpoints:
  - `/api/projects/minimal`
  - `/api/budget/category-templates`
  - `/api/budget/categories/tree`
  - `/api/budget/categories`
  - `/api/budget/categories/{id}`
- Backend trace:
  - All above are Next API route handlers with direct SQL.
- Discernible DB tables:
  - `landscape.tbl_project`
  - `landscape.core_budget_category`
  - `landscape.core_fin_fact_budget`
  - `landscape.core_unit_cost_category` (template sources)

#### Placeholders / Coming Soon
- Inferred placeholder pattern:
  - Uses blocking browser `alert()` for success in template application (legacy UX pattern, not integrated app notification flow).

#### Styling Notes
- CoreUI page structure; mostly consistent within settings pages.

### 3.10 Contact Roles — `/settings/contact-roles`
#### Identity
- Heading: `Contact Roles`
- Route: `/settings/contact-roles`
- Parent nav: no direct global/admin nav link found

#### Layout & Structure
- CoreUI card/table with filter row and CRUD modal.
- No explicit `ProtectedRoute` wrapper in this page component.

#### Functional Content
- Primary role: CRUD role definitions + visibility toggles.
- API client component:
  - `src/lib/api/contacts.ts`
- Frontend endpoints (direct Django base URL in client):
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/contact-roles/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/contact-roles/{id}/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/contact-roles/{id}/visibility/`
- Backend trace:
  - `backend/apps/contacts/urls.py` router `contact-roles`
  - `backend/apps/contacts/views.py` -> `ContactRoleViewSet` + `visibility` action
- Discernible table:
  - `tbl_contact_role`

#### Placeholders / Coming Soon
- No explicit or inferred placeholders found.

#### Styling Notes
- CoreUI patterns; consistent with settings/admin table style.

### 3.11 Profile Settings — `/settings/profile`
#### Identity
- Heading: `Profile Settings`
- Route: `/settings/profile`
- Parent nav: `UserMenuDropdown`

#### Layout & Structure
- Sectioned form layout (personal info, account info, security, danger zone).
- Wrapped with `ProtectedRoute` (authenticated, not admin-only).

#### Functional Content
- Primary role: user profile updates, password change, logout.
- Frontend endpoints:
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/auth/profile/` (via `AuthContext.updateProfile`)
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/auth/password-change/`
  - `${NEXT_PUBLIC_DJANGO_API_URL}/api/auth/logout/` (via `AuthContext.logout`)
- Backend trace:
  - `backend/apps/projects/urls_auth.py` -> `UserProfileView`, `PasswordChangeView`, `UserLogoutView`

#### Placeholders / Coming Soon
- No explicit or inferred placeholders found.

#### Styling Notes
- Tailwind-style dark design; differs from CoreUI-heavy settings routes.

### 3.12 Land Use Taxonomy — `/settings/taxonomy`
#### Identity
- Page title context: Land Use Taxonomy manager (`FamilyTree`, `FamilyDetails`, `ProductsList`).
- Route: `/settings/taxonomy`
- Parent nav: embedded from `/admin/preferences` and `/preferences`; no first-class top-nav link found.

#### Layout & Structure
- Custom three-column layout:
  - left: families
  - center: family/type details
  - right: products list (when type selected)
- Uses local stylesheet `src/app/settings/taxonomy/taxonomy.css`.

#### Functional Content
- Primary role: CRUD family/type/product taxonomy and planning standard defaults.
- Components:
  - `src/components/taxonomy/FamilyTree.tsx`
  - `src/components/taxonomy/FamilyDetails.tsx`
  - `src/components/taxonomy/ProductsList.tsx`
- Frontend endpoints:
  - `/api/taxonomy/families`
  - `/api/taxonomy/families/{id}`
  - `/api/taxonomy/types`
  - `/api/taxonomy/types/{id}`
  - `/api/taxonomy/products`
  - `/api/taxonomy/products/{id}`
  - `/api/planning-standards`
- Backend trace:
  - Next API taxonomy handlers are SQL-backed.
  - Planning standards route supports SQL and Django fallback.
- Discernible DB tables:
  - `lu_family`
  - `lu_type`
  - `res_lot_product`
  - `type_lot_product`
  - `landscape.core_planning_standards`

#### Placeholders / Coming Soon
- Explicit placeholders:
  - Disabled `Import` and `Export` actions in header.

#### Styling Notes
- Custom CSS and non-CoreUI layout; clearly different visual language.

## 4. Landscaper Admin — Deep Dive

Admin surface location:
- Not a route under `src/app/admin/*`.
- Exposed as `Landscaper` tab inside `src/components/admin/AdminModal.tsx`.
- Main panel: `src/components/admin/LandscaperAdminPanel.tsx`.

### Sections/Tabs in Landscaper Panel
- `AI Extraction Mappings` (available, expanded by default)
- `Model Configuration` (explicit `Coming Soon`)
- `Extraction History / Logs` (explicit `Coming Soon`)
- `Training Feedback` (explicit `Coming Soon`)

### Mapping Interface (Extraction Mapping CRUD)
Component: `src/components/admin/ExtractionMappingAdmin.tsx`

Capabilities:
- List mappings with filtering/search
- Toggle active state
- Add/edit/delete mappings
- Stats mode (`showStats`)
- Filter dimensions: document type, confidence, target table, active status

Frontend endpoints (direct Django base URL):
- `GET /api/landscaper/mappings/`
- `GET /api/landscaper/mappings/stats/`
- `GET /api/landscaper/mappings/document-types/`
- `GET /api/landscaper/mappings/target-tables/`
- `POST /api/landscaper/mappings/`
- `PUT /api/landscaper/mappings/{mapping_id}/`
- `DELETE /api/landscaper/mappings/{mapping_id}/`

Django trace:
- `backend/config/urls.py` includes `path("api/", include('apps.landscaper.urls'))`
- `backend/apps/landscaper/urls.py` maps `landscaper/mappings/*`
- `backend/apps/landscaper/views.py` -> `ExtractionMappingViewSet`

Discernible DB tables/views:
- `landscape.tbl_extraction_mapping`
- `landscape.tbl_extraction_log`
- `landscape.vw_extraction_mapping_stats`

### Placeholder Inventory on Landscaper Admin
- Explicit placeholders:
  - Model Configuration: Coming Soon
  - Extraction History / Logs: Coming Soon
  - Training Feedback: Coming Soon
- Inferred placeholder:
  - Only one section is functional; remaining panel structure is navigation shell for future modules.

### Relationship to Global DMS (`/dms` / `DMSView`)
- No direct route-level coupling, but functional coupling exists through Landscaper AI stack:
  - DMS panels (`src/components/dms/panels/DmsLandscaperPanel.tsx`) call `useLandscaper` with `activeTab: 'dms'`.
  - Benchmarks side panel also uses `useLandscaper` with `activeTab: 'benchmarks'`.
- Extraction mappings in `tbl_extraction_mapping` are used by Landscaper/knowledge tool execution paths (`backend/apps/landscaper/tool_executor.py`, `backend/apps/knowledge/services/opex_utils.py`), affecting how extracted data is mapped/normalized.

## 5. DMS Admin — Deep Dive

### Admin DMS Route(s)
- `src/app/admin/dms/templates/page.tsx` -> `/admin/dms/templates`

### DMS Template Management Interface
- CRUD UI for templates (name, description, doc type options, default flag).
- Workspace-aware (`workspace_id` from `ProjectProvider`, fallback 1).

Frontend endpoints:
- `/api/dms/templates`
- `/api/dms/templates/{id}`

Next API implementation:
- `src/app/api/dms/templates/route.ts` (GET/POST)
- `src/app/api/dms/templates/[id]/route.ts` (PATCH/DELETE)
- DB table: `landscape.dms_templates`

### Connection to Global `/dms`
Global DMS files:
- `src/app/dms/page.tsx`
- `src/components/dms/DMSView.tsx`

Shared dependency:
- `/api/dms/templates/doc-types` is used by DMS search/profile/filter surfaces (`DMSView`, `DocTypeFilters`, profile forms).
- `src/app/api/dms/templates/doc-types/route.ts` reads from `landscape.dms_templates`.

### Connection to Landscaper Admin / Landscaper Features
- DMS includes Landscaper chat integrations (`DmsLandscaperPanel`, document chat flows).
- DMS calls project-specific Landscaper chat endpoint (`/api/projects/{projectId}/landscaper/chat`) in table/chat components.
- DMS landscaping context and admin extraction mappings converge in backend extraction/tooling behavior.

### DMS Placeholder Inventory
In DMS-adjacent UI (`src/components/dms/DMSView.tsx`):
- Explicit placeholder:
  - `Move/Copy coming soon` alert.
- Explicit disabled control:
  - `Email copy` action button disabled.

## 6. Cross-Reference Map

### Admin Data -> Project/App Behavior
1. Extraction mappings (`/admin` modal Landscaper panel)
- Controls `tbl_extraction_mapping` rules.
- Used by Landscaper/knowledge extraction tooling, affecting mapped fields and downstream project data writes.

2. Unit Cost Library + categories (`/admin/benchmarks/cost-library`, `/admin/preferences`)
- Feeds budget editing/suggestion flows.
- Example usage: `src/components/budget/custom/EditableCell.tsx` calls `/api/unit-costs/templates` for template autocomplete in project budget workflows.

3. Planning standards + taxonomy (`/settings/taxonomy`, `/preferences`)
- Shared by product library and taxonomy modules via `/api/planning-standards` and `/api/taxonomy/*`.
- These values propagate into planning assumptions and product definitions used in project contexts.

4. Pro Features tier (`/admin/preferences`)
- `/api/users/tier/` updates `user_settings.tier_level` and is documented in UI as enabling access to Capitalization features.

5. DMS templates (`/admin/dms/templates`)
- Directly drives global DMS doc-type filter/profiling behavior through `/api/dms/templates/doc-types`.

### Orphaned or Weakly Reachable Routes
- `/admin/changelog`: route exists but no link from `AdminNavBar`, `Navigation`, or user menu.
- `/settings/budget-categories`: no link found in primary navigation surfaces.
- `/settings/contact-roles`: no link found in primary navigation surfaces.
- `/settings/taxonomy`: used as embedded panel and direct route, but not directly linked by global nav.

### Navigation Links Pointing to Missing/Weak Targets
- `Landscaper Configuration` action in `src/app/components/navigation/constants.ts` has no `href`.
- Taxonomy breadcrumb links to `/settings`, but no `/settings/page.tsx` route exists.

### Next API vs Direct Django (migration/consistency notes)
- Mixed strategy across admin surfaces:
  - Direct Django calls from UI (feedback/changelog/users/contact-roles/landscaper mappings/profile/password).
  - Next route handlers for many others (benchmarks, unit costs, taxonomy, DMS templates, budget categories).
- This split creates migration candidates where domain ownership is inconsistent for admin APIs.

## 7. Issues & Observations

- Orphaned routes:
  - `/admin/changelog`, `/settings/budget-categories`, `/settings/contact-roles`, `/settings/taxonomy` are not discoverable from main admin nav surfaces.

- Broken/weak links:
  - `Landscaper Configuration` settings action has no target URL.
  - `/settings/taxonomy` breadcrumb points to nonexistent `/settings` route.
  - `useLandscaper` calls `/api/landscaper/global/chat`, but no local Next route handler exists at `src/app/api/landscaper/global/chat/route.ts`.

- Style inconsistencies:
  - Admin routes mix three UI languages: CoreUI (`/admin/feedback`, `/admin/changelog`, `/settings/*`), custom tokenized benchmark UI (`/admin/benchmarks*`), and dark Tailwind-like panels (`/admin/users`, `/admin/dms/templates`, `/settings/profile`).
  - Several admin routes do not render `AdminNavBar` (`/admin/benchmarks/cost-library`, `/admin/dms/templates`, `/admin/users`).

- Placeholder inventory summary:
  - Explicit placeholders:
    - Landscaper panel: 3 Coming Soon sections.
    - Benchmarks flyout: Impact Analysis Chart Placeholder.
    - Taxonomy manager: disabled Import/Export.
    - DMS view: Move/Copy coming soon + disabled Email copy.
    - LandscaperPanel TODO sections with static mock insights/activity.
  - Inferred placeholders:
    - Benchmarks flyout action buttons (`Edit`, `Copy`, `Export`) with no handlers.
    - `Landscaper Configuration` settings action without href.

- Missing functionality/risks:
  - Inconsistent admin route discoverability and mixed auth gating patterns may cause hidden-but-live admin screens.
  - Duplicate `benchmarks/absorption-velocity` registrations in backend URL includes (`apps.benchmarks` and `apps.sales_absorption`) raise endpoint ownership ambiguity.
