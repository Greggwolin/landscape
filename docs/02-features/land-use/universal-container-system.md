# Universal Container System Overview

This document describes the schema objects, API routes, and data contracts that support the universal container architecture. The goal is to decouple the domain vocabulary ("Plan Area → Phase → Parcel", "Property → Building → Unit", etc.) from the underlying storage so that any asset type can share the same budgeting and analytics workflows.

## Database Migrations

All schema changes live under `db/migrations/` with paired `*.up.sql` and `*.down.sql` files. Apply them in order to create the new foundation:

1. **001_create_universal_containers**
   - Adds `landscape.tbl_container` with three container levels and parent/child integrity constraints.
   - Adds `landscape.tbl_project_config` for per-project label customization.
   - Indexes support hierarchy traversal by project and level.

2. **002_enhance_core_fin_tables**
   - Links budget and actual facts to containers.
   - Adds workflow fields (confidence, vendor linkage, escalation, contingencies, commitments).
   - Enforces value ranges for `confidence_level` and indexes the new columns for reporting.

3. **003_create_tagging_system**
   - Creates `landscape.core_fin_fact_tags` for flexible tagging with both full-chip and compact-bar states.

4. **004_create_calculation_periods**
   - Adds `landscape.tbl_calculation_period` and `landscape.tbl_budget_timing` for the timing engine foundation.

5. **005_create_project_settings**
   - Introduces `landscape.tbl_project_settings` to centralize defaults such as currency, inflation, and analysis windows.

Sample bootstrap SQL lives in `docs/sql/universal_container_system.sql` and demonstrates how to seed configurations, containers, periods, and defaults for an example land development project.

## TypeScript Contracts

Shared interfaces live in `src/types/containers.ts` and cover:

- `Container` and recursive `ContainerNode`
- `ProjectConfig` and `ProjectSettings`
- `BudgetTag`, `EnhancedBudgetFact`, `CalculationPeriod`, and `BudgetTiming`

These types are re-exported from `src/types/index.ts` so application code can `import { ContainerNode } from '@/types'`.

## API Surface

New App Router API endpoints expose the universal data model:

- `GET /api/projects/:projectId/containers` → hierarchical container tree
- `GET /api/projects/:projectId/config` → project labels and financial defaults
- `GET /api/projects/:projectId/periods` → ordered calculation periods
- `POST /api/projects/:projectId/calculate` → lightweight aggregation of budget totals by container and period
- `GET /api/projects/:projectId/cash-flow` → time-phased budget rollup across periods
- `GET /api/budget-items/:factId/tags` and `POST /api/budget-items/:factId/tags` → manage per-fact tags with add/update/remove semantics
- `PUT /api/budget-items/:factId/tags/:tagId/toggle` → flip compact/expanded tag UI state
- `GET /api/budget-items/search?tags=...&factType=...` → tag-based fact lookup that requires all requested tags

Each endpoint returns JSON payloads aligned with the shared interfaces so the UI can dynamically render the correct labels and hierarchies for any asset type.

## Next Steps

- Wire these APIs into the Planning Wizard and budgeting UI components so that labels, hierarchies, and timing grids become project-driven.
- Implement the full timing engine that expands container-level assumptions into periodized cash flows.
- Extend the `POST /api/projects/:projectId/calculate` handler to orchestrate downstream calculations (interest carry, AI insights, demand thermometer) once those modules are in place.
