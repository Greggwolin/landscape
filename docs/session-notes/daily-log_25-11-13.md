# Daily Delivery Log

> Times use Pacific Time. Backfilled entries rely on commit metadata or session notes; update the timestamp when you have a precise record for a new day.

## Update Instructions
- Append the newest day at the top so the most recent work stays visible.
- Keep the format: heading with date/time, 2–3 sentence narrative, then bullet lists for touched files and source notes.
- Add or remove bullet points as useful, but prefer grouping files by feature instead of copying entire diffs.
- When multiple efforts land on the same day, log them as separate headings with distinct times so future updates can slot in chronologically.

### Entry Template
```
### YYYY-MM-DD HH:MM PT
Narrative describing what changed since the prior entry.
**Files Updated**
- `path/to/file` — what changed
**Sources**
- `docs/session-notes/...`
```

---
### 2025-11-10 18:04 PT
Implemented the milestone/dependency system plus CPM-driven timeline API so downstream delays flow automatically: added the milestone/dependency/log/drop queue schema, built the graph + forward/backward passes with float/critical path, and wired both POST/GET `/api/projects/[projectId]/timeline/calculate` to the new engine with preview/dry-run support.
**Files Updated**
- `db/migrations/015_milestone_dependency_system.sql` — milestone/dependency schemas, timeline log, recalculation queue, and validation triggers
- `src/lib/timeline-engine/cpm-calculator.ts` — dependency graph builder, cycle detection, forward/backward passes, float/critical-path, and persistence
- `src/app/api/projects/[projectId]/timeline/calculate/route.ts` — new Next.js handler calling the engine with dry-run overrides and better error handling
**Sources**
- `docs/session-notes/2025-11-10-budget-phase-column-fixes.md`

### 2025-11-09 18:33 PT
Fixed database schema mismatch between API/frontend expectations and actual database structure for the unit cost category taxonomy—migrated from development-stage enums to lifecycle-based junction tables, updated 6 files to query the new schema with ARRAY_AGG and JSONB tags, and corrected filtering logic so both Cost Library and Admin Preferences pages load data.
**Files Updated**
- `src/app/api/unit-costs/categories/route.ts` — rewrote SQL to join junction table, use ARRAY_AGG for lifecycle_stages, cast JSONB tags
- `src/app/api/unit-costs/templates/route.ts` — changed table name to core_unit_cost_item, aliased item_id as template_id
- `src/app/api/unit-costs/templates/helpers.ts` — updated column references from template_id to item_id
- `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` — fixed category filtering to use tags array
- `src/app/admin/preferences/components/UnitCostCategoryManager.tsx` — fixed filtering for lifecycle_stages array
- `src/lib/unitCostFallback.ts` — updated fallback data structure to match new schema
**Sources**
- `docs/session-notes/2025-11-09-category-taxonomy-schema-migration-fixes.md`
### 2025-11-08 14:16 PT
Consolidated Land Use taxonomy workflow so product management happens in-context: widened the products column, added a full-width "Add Product" CTA, removed the redundant Product Library accordion, and auto-selected the first type when families load so the 3-column hierarchy renders without extra clicks.
**Files Updated**
- `src/app/settings/taxonomy/page.tsx` — preload the first family/type so the products panel opens automatically.
- `src/components/taxonomy/ProductsList.tsx` — replaced the tiny icon action with the new full-width +Add Product button.
- `src/app/admin/preferences/page.tsx` — removed the Product Library tile from the System Preferences list.
- `src/app/settings/taxonomy/taxonomy.css` — expanded the products column width (260px → 380px) for readability.
**Sources**
- `docs/session-notes/2025-11-08-land-use-taxonomy-products-panel-enhancements.md`
### 2025-11-07 08:00 PT
Centralized brand/surface color tokens and refreshed the entire top navigation stack so light/dark themes stay in sync: introduced `tokens.css`, wired Tailwind via `withVar`, mapped CoreUI variables, and updated nav components (including logo assets) to consume the new `--nav-*` system.
**Files Updated**
- `src/styles/tokens.css` — single source of truth for light/dark brand, surface, text, overlay, parcel, and chip colors.
- `src/app/globals.css` & `tailwind.config.js` — imported the tokens and exposed them as Tailwind utilities.
- `src/styles/coreui-theme.css` — bridged CoreUI header/sidebar variables to the token set.
- `src/components/scenarios/ScenarioChipManager.tsx`, `src/app/components/TopNavigationBar.tsx`, `src/app/components/navigation/*` — refactored chips, nav bar, and dropdowns to use `--nav-*` variables.
- `public/logo-color.png` — added the light-mode logo referenced by the navigation.
**Sources**
- `docs/session-notes/2025-11-07 - ThemeTokenization & top nav refresh.md`
### 2025-11-07 09:00 PT
Added visual container filters to Budget and Sales so analysts can pivot by Area/Phase, including cost rollups, cascading highlights, uncategorized fixes, and responsive tiles.
**Files Updated**
- `src/components/budget/FiltersAccordion.tsx` — new accordion with Area/Phase tiles and responsive color system.
- `src/components/budget/BudgetGridTab.tsx` & `src/hooks/useBudgetGrouping.ts` — integrated filter state, kept project-level rows visible, and surfaced uncategorized groups.
- `src/hooks/useContainers.ts` — new hook to flatten the hierarchy and attach cost stats.
- `src/app/api/projects/[projectId]/containers/route.ts` — added `includeCosts` plus recursive aggregation of `direct_cost`, `child_cost`, and `total_cost`.
- `src/components/sales/PhaseTiles.tsx` & `src/components/shared/AreaTiles.tsx` — reused the tile system inside Sales & Absorption.
**Sources**
- `docs/session-notes/2025-11-07-area-phase-filter-tiles-implementation.md`
### 2025-11-07 10:00 PT
Redesigned the budget item modal into a compact 3-row layout that understands the unit cost template taxonomy, period-based timing, vendor tracking, and the four-level category hierarchy; this included DB work and API/type updates.
**Files Updated**
- `migrations/015_add_budget_period_fields.sql` & `backend/apps/financial/models.py` — added `start_period`, `periods`, `end_period`, vendor, qty/rate precision, plus trigger logic.
- `src/components/budget/BudgetItemModalV2.tsx` (new) & `src/components/budget/BudgetGridTab.tsx` — replaced the legacy modal and hooked up the new payload.
- `src/components/budget/ColumnDefinitions.tsx` & `src/components/budget/hooks/useBudgetData.ts` — extended the item model and normalization for vendor + period fields.
- `src/app/api/budget/items/route.ts` & `src/app/api/budget/gantt/items/route.ts` — accepted category hierarchy, vendor, and period numbers when creating items.
**Sources**
- `docs/session-notes/2025-11-07-budget-modal-redesign-implementation.md`
### 2025-11-07 11:00 PT
Followed up with container data hygiene for Project 7 so the modal only surfaces valid Villages/Phases, the API filters by `is_active`, and UI polish (labels, placeholders, widths) matches the new design.
**Files Updated**
- `migrations/016_cleanup_project7_containers_v2.sql` — soft-deactivated duplicate containers and re-sorted the valid hierarchy.
- `src/app/api/projects/[projectId]/containers/route.ts` — filtered responses to active containers only.
- `src/components/budget/BudgetItemModalV2.tsx` — limited the dropdown to levels 1–2, adjusted placeholders, and narrowed inputs.
- `src/components/budget/CategoryCascadingDropdown.tsx` — added the `hideLabels` option referenced by the modal.
**Sources**
- `docs/session-notes/2025-11-07-budget-modal-container-fixes.md`
### 2025-11-07 12:00 PT
Introduced the three-stage (Entitlements, Engineering, Development) taxonomy to Unit Costs across DB, Django, and frontend so templates and categories can be filtered per lifecycle stage.
**Files Updated**
- `backend/apps/financial/migrations/0015_unit_cost_development_stages.sql` — added the `development_stage` field, constraints, indexes, and seed data.
- `backend/apps/financial/models_benchmarks.py`, `serializers_unit_costs.py`, `views_unit_costs.py` — surfaced the stage in serializers and exposed grouped endpoints.
- `src/app/api/unit-costs/categories-by-stage/route.ts` & `src/app/api/unit-costs/templates-by-stage/route.ts` — new Next.js proxies for the Django endpoints.
- `src/types/benchmarks.ts`, `src/app/admin/benchmarks/page.tsx`, `src/app/benchmarks/unit-costs/page.tsx` — added stage-aware types, dashboard tiles, and tab navigation.
**Sources**
- `docs/session-notes/2025-11-07-unit-cost-development-stages-implementation.md`
### 2025-11-07 13:00 PT
Extended the Stage 1/2 Unit Cost tables with inline editing so quick changes don’t require modals—added reusable inline cell components and patched the benchmarks page to save via PATCH calls.
**Files Updated**
- `src/components/benchmarks/unit-costs/InlineEditableCell.tsx` & `InlineEditableUOMCell.tsx` — new components handling focus state, validation, and optimistic saves.
- `src/app/benchmarks/unit-costs/page.tsx` — wired the inline editors, currency/date formatters, and save handler.
**Sources**
- `docs/session-notes/2025-11-07-unit-cost-inline-editing-implementation.md`
### 2025-11-07 14:00 PT
Delivered full CRUD for Stage 1/2 unit cost templates with a reusable modal, category fetching, and action handlers so analysts can add, edit, or delete soft-cost templates without leaving the table view.
**Files Updated**
- `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx` — new modal with validation, defaults, and responsive layout.
- `src/app/benchmarks/unit-costs/page.tsx` — modal state, category loader, CRUD handlers, and polished buttons for the Stage 1/2 tables.
**Sources**
- `docs/session-notes/2025-11-07-unit-cost-ui-enhancements-implementation.md`
### 2025-11-07 15:00 PT
Chased down the 500s that were breaking inline edits by updating the Neon SQL usage, fixing `RETURNING` clauses, and ensuring server-side endpoints have the correct Django API URL.
**Files Updated**
- `src/app/api/unit-costs/categories-by-stage/route.ts` & `templates-by-stage/route.ts` — converted to tagged template literals and direct array iteration.
- `src/app/api/unit-costs/templates/[id]/route.ts` — split UPDATE + SELECT flows so aliases resolve correctly and patched all `.rows` references.
- `.env.local` — added `DJANGO_API_URL` for server-side fetchers.
**Sources**
- `docs/session-notes/2025-11-07-inline-editing-500-error-fix.md`
### 2025-11-07 16:00 PT
Brought the Taxonomy and Benchmarks pages into the floating-card layout standard, added a type color picker, and wired the Global Preferences nav item to the taxonomy screen for quick access.
**Files Updated**
- `src/app/settings/taxonomy/page.tsx` & `src/app/settings/taxonomy/taxonomy.css` — applied the tertiary background/card pattern.
- `src/app/admin/benchmarks/page.tsx` — refactored the layout and colors to use CoreUI tokens.
- `src/components/taxonomy/FamilyDetails.tsx` — added the color picker alongside the code field.
- `src/app/components/navigation/constants.ts` — linked “Global Preferences” to `/settings/taxonomy`.
**Sources**
- `docs/session-notes/2025-11-07-taxonomy-benchmark-layout-navigation.md`
### 2025-11-07 17:00 PT
Documented the combined RY_005/RY_005b workstreams, updated Implementation Status, and captured both migrations plus modal changes so future AI runs have the stitched context in one place.
**Files Updated**
- `docs/session-notes/2025-11-07-session-summary.md` — consolidated narrative for the redesign and cleanup sessions.
- `docs/11-implementation-status/IMPLEMENTATION_STATUS.md` — added the budget modal/container completion entry.
**Sources**
- `docs/session-notes/2025-11-07-session-summary.md`
### 2025-11-05 09:00 PT
Realigned dashboard vs profile project type displays by correcting the underlying data for projects 11 and 18, then logged the work so Implementation Status stays current.
**Files Updated**
- `landscape.tbl_project` (via SQL) — updated `project_type_code` to match the recorded analysis type for the two mismatched projects.
- `docs/11-implementation-status/IMPLEMENTATION_STATUS.md` — captured the fix under recent updates.
- `docs/session-notes/2025-11-05-project-type-data-consistency-fix.md` — wrote the investigation and verification details.
**Sources**
- `docs/session-notes/2025-11-05-project-type-data-consistency-fix.md`
### 2025-11-05 10:30 PT
Restored the legacy Peoria Lakes market assumptions experience as a sandbox route so analysts can review the imported Excel model, adding a dropdown link and fixing the lingering import path.
**Files Updated**
- `src/app/market-assumptions/page.tsx` — new client page that renders the legacy `MarketAssumptions` module with project 7 selected.
- `src/app/components/navigation/constants.ts` — added the “Market Assumptions (Peoria Lakes)” item inside the Sandbox dropdown.
- `src/app/components/MarketAssumptions.tsx` — corrected the `processUOMOptions` import path uncovered by Turbopack.
**Sources**
- `docs/session-notes/2025-11-07 - ThemeTokenization & top nav refresh.md` (see “Market Assumptions Sandbox Consolidation” section)
### 2025-11-03 10:00 PT
Completed phases 4–7 of the budget variance program—built the reconciliation modal, edit guards with tooltips, the health widget, and tied everything into the variance alert flow so reconciling gaps is guided end-to-end.
**Files Updated**
- `src/components/budget/ReconciliationModal.tsx`, `BudgetDataGrid.tsx`, `custom/GroupRow.tsx` — wired the three reconciliation modes and warning badges.
- `src/hooks/useEditGuard.ts` & `src/components/budget/EditConfirmationDialog.tsx` — added the guard + confirmation UX for edits that introduce variances.
- `src/components/budget/BudgetHealthWidget.tsx` & `src/components/budget/BudgetGridTab.tsx` — surfaced the dashboard widget and quick actions.
**Sources**
- `docs/session-notes/2025-11-03-budget-variance-implementation-phases-4-7.md`
### 2025-11-02 09:00 PT
Finished Phase 5 of the budget category hierarchy rollout by wiring the four-level taxonomy into the grid, normalization pipeline, and API payloads so every line item carries a breadcrumb.
**Files Updated**
- `src/components/budget/ColumnDefinitions.tsx` — extended the `BudgetItem` type with `category_l1_id`…`category_l4_id` and breadcrumb display.
- `src/components/budget/hooks/useBudgetData.ts` — normalized the incoming API payload to hydrate the new fields.
- `src/app/api/budget/items/route.ts` & `src/app/api/budget/items/[projectId]/route.ts` — accepted/returned the category hierarchy and built SQL breadcrumb strings.
**Sources**
- `docs/session-notes/2025-11-02-budget-category-phase-5-completion.md`
### 2025-11-02 13:00 PT
Updated the Architecture + Database docs with Migration 013 details and checked in the missing budget component files so the documentation center tiles resolve without 500s.
**Files Updated**
- `docs/09-technical-dd/02-architecture/system-architecture.md`, `docs/05-database/DATABASE_SCHEMA.md`, `docs/05-database/TABLE_INVENTORY.md`, `docs/05-database/README.md` — captured the `project_type_code` rename, constraints, and recent updates.
- `src/app/documentation/page.tsx` — refreshed the documentation center tiles with current timestamps/descriptions.
- `src/components/budget/` (23 files) — added the full component suite (AnalysisTab, BudgetContainer, etc.) so Turbopack stops complaining about missing modules.
**Sources**
- `docs/session-notes/2025-11-02-migration-013-documentation-update.md`
### 2025-10-30 09:00 PT
Implemented the DMS AI extraction stack: nine synthetic document generators, three extractor engines with confidence scoring + validation YAML, a pytest suite, and deep documentation so PDFs/XLSX ingest cleanly without hallucinations.
**Files Updated**
- `backend/apps/documents/testing/generators/*` — base generator plus rent roll, operating, and parcel table factories across three quality tiers.
- `backend/apps/documents/extractors/*` & `specs/{headers,validators}/*.yaml` — extractor implementations with header canonicalization and rules per document type.
- `backend/apps/documents/tests/test_basic_extraction.py`, `demo_extraction.py`, `example_integration.py` — regression coverage and demo scripts.
- `backend/apps/documents/DMS_README.md`, `IMPLEMENTATION_SUMMARY.md`, `QUICK_START.md`, `docs/session-notes/2025-10-30-dms-ai-extraction-implementation.md` — documentation for the new pipeline.
**Sources**
- `docs/session-notes/2025-10-30-dms-ai-extraction-implementation.md`
### 2025-10-30 13:00 PT
Shipped the Landscaper Training workspace by consolidating the review queue, detail view, and analytics into a single tabbed experience, adding correction logging tables, and exposing queue/review/correct/commit APIs.
**Files Updated**
- `src/app/documents/review/page.tsx` & `src/app/components/navigation/constants.ts` — unified the UI and linked it from the gear menu.
- `backend/apps/documents/migrations/021_add_correction_logging_simplified.sql` — added the correction log + warnings tables and extra queue metadata.
- `src/app/api/extractions/{queue, [id]/review, [id]/correct, [id]/commit}/route.ts` plus `src/app/api/corrections/analytics/route.ts` — Next.js endpoints for the training workflow.
- Removed legacy pages (`src/app/documents/review/[id]/page.tsx`, `src/app/documents/analytics/page.tsx`) now that the combined view exists.
**Sources**
- `docs/session-notes/2025-10-30-landscaper-training-implementation.md`
### 2025-10-29 08:08 PT
Fixed comparable sales plotting by pulling real lat/lon from the database, cleaned up the Property tab layout, tweaked default map camera values, and partially addressed the fitBounds quirks.
**Files Updated**
- `src/app/api/projects/[projectId]/valuation/comps/map/route.ts` — returned actual comp coordinates instead of mock offsets.
- `src/app/projects/[projectId]/components/tabs/PropertyTab.tsx` — condensed the unit mix layout and embedded the map alongside the table.
- `src/components/map/MapOblique.tsx`, `ProjectTabMap.tsx`, `ValuationSalesCompMap.tsx` — adjusted zoom/pitch/bearing defaults, marker styles, and fitBounds padding/behavior.
**Sources**
- `docs/session-notes/2025-10-29-maplibre-coordinate-fixes.md`
### 2025-10-28 08:46 PT
Delivered Phase 1–2 of the Valuation tab’s interactive adjustments: added `AIAdjustmentSuggestion` to Django, enhanced existing models with user-adjustment fields, and exposed the API hooks needed for ComparablesGrid to reconcile AI vs analyst changes.
**Files Updated**
- `backend/apps/financial/models_valuation.py` — new AI suggestion model plus additional fields on `SalesCompAdjustment`.
- `backend/apps/financial/serializers_valuation.py` / views (per session note) — surfaced the new data to the API consumers.
- Supporting docs: `docs/valuation-tab-interactive-adjustments-SESSION-COMPLETE.md` — reference for future ComparablesGrid work.
**Sources**
- `docs/valuation-tab-interactive-adjustments-SESSION-COMPLETE.md`
### 2025-10-26 12:00 PT
Started the custom inflation schedule modal for project tabs—StepRateTable renders and the modal opens, but focus management, dynamic step add/remove logic, and save/cancel behavior still need debugging before release.
**Files Updated**
- `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx` — hosts the modal entry point and state machine.
- `src/app/prototypes/multifam/rent-roll-inputs/components/StepRateTable.tsx` — renders the per-step inputs that require the pending fixes.
- `src/types/assumptions.ts` — supporting typings for the inflation steps.
**Sources**
- `docs/session-notes/2025-11-07 - ThemeTokenization & top nav refresh.md` (see “Custom Inflation Rate Mechanism” section)
### 2025-10-25 10:00 PT
Taught the Project Overview page to detect multifamily properties and hand them off to the underwriting prototype instead of duplicating UI, so MF projects land on the right experience automatically.
**Files Updated**
- `src/app/projects/[projectId]/overview/page.tsx` — added property-type detection, redirect, and fallback tab definitions for non-MF projects.
**Sources**
- `docs/session-notes/2025-10-25-multifamily-overview-integration.md`
### 2025-10-25 14:00 PT
Delivered ARGUS-quality PDF reporting (property summary, rent roll, annual cash flow) and tucked the legacy navigation tiles into a collapsible “Legacy” section so older pages stay reachable without cluttering the main nav.
**Files Updated**
- `backend/apps/reports/generators/cash_flow.py`, `templatetags/report_filters.py`, `templates/reports/cash_flow.html`, `static/reports/styles.css` — annualized outputs, intcomma filter, Helvetica styling, portrait/landscape handling.
- `backend/scripts/cleanup_chadron_units.py` — aligned Chadron unit counts before generating reports.
- `src/components/reports/PropertySummaryView.tsx` & `src/app/projects/[projectId]/components/tabs/ReportsTab.tsx` — interactive report viewer and type selector.
- `src/app/components/Navigation.tsx` — new collapsible “Legacy” section with links to the historical assumptions/market intel pages.
**Sources**
- `docs/session-notes/2025-10-25-pdf-reports-navigation.md`
### 2025-10-24 09:00 PT
Wrapped the CoreUI Modern theme rollout: installed the React/CoreUI packages, added the theme provider + toggle, restructured navigation/header components, and built the new project overview scaffolding.
**Files Updated**
- `src/styles/coreui-theme.css` — CoreUI Modern overrides for colors, borders, typography, and shadows.
- `src/app/components/CoreUIThemeProvider.tsx`, `ThemeToggle.tsx`, `Navigation.tsx`, `Header.tsx`, `layout.tsx` — wired theme state and reorganized the nav stack.
- `src/app/projects/[projectId]/overview/page.tsx`, `src/app/components/MapView.tsx`, `src/types/propertyTypes.ts` — new overview experience and supporting components.
**Sources**
- `docs/session-notes/2025-10-24-coreui-modern-implementation-complete.md`
### 2025-10-24 11:00 PT
Consolidated the multifamily rent roll stack onto Django by introducing a typed API client, enriching serializers with unit fields, and deleting the duplicate Next.js API routes.
**Files Updated**
- `src/lib/api/multifamily.ts` — new TypeScript client covering Units, Unit Types, Leases, and Turns.
- `src/app/rent-roll/components/RentRollGrid.tsx` & `FloorplansGrid.tsx` — switched to the client fetchers and removed Neon-specific calls.
- `backend/apps/multifamily/serializers.py` — included unit metadata on lease responses.
- Removed `src/app/api/multifamily/*` now that all CRUD flows go through Django.
**Sources**
- `docs/session-notes/2025-10-24-multifam-django-consolidation.md`
### 2025-10-24 14:00 PT
Finalized the rent roll AI ingestion (session GR09) by fixing header detection for the Chadron workbook, re-running the extraction to hit 95%+ confidence, and documenting the test outcomes for future reference.
**Files Updated**
- `backend/services/extraction/rent_roll_extractor.py` — expanded the header search range so skiprows 6 scenarios parse correctly.
- `docs/rent-roll-ingestion-session-GR09-complete.md` — captured the verification data and tuning notes.
**Sources**
- `docs/rent-roll-ingestion-session-GR09-complete.md`
### 2025-10-23 10:00 PT
Extended the multifamily rent roll prototype with the 17-field chooser modal, input/calc badges, condensed layout, KPI tiles, and the unit notes modal so underwriting workflows stay focused.
**Files Updated**
- `src/app/prototypes/multifam/rent-roll-inputs/page.tsx` — houses the field chooser modal, badge legend, KPI grid, and supporting helpers.
**Sources**
- `docs/session-notes/2025-10-23-multifam-rent-roll-prototype.md`
### 2025-10-22 09:00 PT
Built the automated documentation update workflow (Claude slash command, permissions, guides) and refreshed the Documentation Center + Implementation Status so new Django/Finance work is discoverable.
**Files Updated**
- `.claude/commands/update-docs.md` & `.claude/commands/README.md` — defined the 10-step workflow and command catalog.
- `docs/DOCUMENTATION_UPDATE_WORKFLOW.md` — standalone reference for running the automation.
- `src/app/documentation/page.tsx` — added ten new tiles (status + technical) and refreshed copy/dates.
- `docs/11-implementation-status/IMPLEMENTATION_STATUS.md` — logged the documentation system completion.
- `.claude/settings.local.json` — expanded allowed git commands for the automation.
**Sources**
- `docs/session-notes/2025-10-22-documentation-system.md`
### 2025-10-10 15:09 PT
Resolved the market intelligence NAV issues by correcting Peoria/Maricopa FIPS codes, fixing ACS series categories, re-ingesting population/income data, and updating the Market page tiles so city/county stats align.
**Files Updated**
- `Documentation/App-Development-Status.md` & `services/market_ingest_py/README.md` — documented the ingestion fixes.
- `src/app/market/page.tsx` & `src/app/market/components/CombinedTile.tsx` — added county-level series to KPIs and polished labels.
- Database: `public.geo_xwalk`, `public.market_series`, `public.market_data` — corrected codes and loaded 48 ACS data points.
**Sources**
- `docs/session-notes/2025-10-10-market-intelligence-fixes.md`
