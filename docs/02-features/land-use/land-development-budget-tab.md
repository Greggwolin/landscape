# Land Development Project Page – Budget Tab Reference

This guide explains every surface that makes up the Land Development “Budget” tab so a downstream AI pair (Claude, ChatGPT, etc.) can reason about the UI, data flows, fields, and APIs without reading source. All paths below are workspace‑relative.

---

## Entry Point & Context

- Route: `/projects/[projectId]?tab=budget` renders `src/app/projects/[projectId]/components/tabs/BudgetTab.tsx`, which simply mounts `src/components/budget/BudgetContainer.tsx` with the numeric `projectId`.
- `BudgetContainer` owns the sub‑tab state (`grid`, `timeline`, `assumptions`, `analysis`) and swaps in:
  | Sub-tab Label        | Component                                   | Purpose |
  |---------------------|----------------------------------------------|---------|
  | Budget Grid         | `BudgetGridTab`                              | Inline editable spreadsheet + mini timeline |
  | Timeline View       | `TimelineTab`                                | Full-width Gantt (placeholder today) |
  | Assumptions         | `AssumptionsTab`                             | Project-level budget assumptions form |
  | Analysis            | `AnalysisTab`                                | Future rollups/variance dashboards |
  | Cost Categories     | (nested inside `BudgetGridTab` only)         | Category templates + hierarchy editor |

> **Note:** The “Cost Categories” tab lives inside `BudgetGridTab` because only Land Development projects expose the template/categorization workflow. `BudgetGridTab` also detects the project’s type via `/api/projects/{id}` to gate Land Development features (`LAND_DEVELOPMENT_SUBTYPES`).

---

## Shared Data Models

### Budget Items

`src/components/budget/ColumnDefinitions.tsx` defines the canonical `BudgetItem`. All API payloads feeding the grid must normalize into these fields (see `useBudgetData`).

```ts
interface BudgetItem {
  fact_id: number;              // Primary key for updates/deletes
  project_id?: number;
  container_id?: number | null; // Scope (Area/Phase) for filtering and Gantt
  container_name?: string | null;
  container_display?: string | null;
  category_id: number;          // Legacy flat category id
  category_l1_id?: number | null; // Level 1..4 hierarchy (names mirror *_name props)
  category_l2_id?: number | null;
  category_l3_id?: number | null;
  category_l4_id?: number | null;
  category_l1_name?: string | null;
  category_l2_name?: string | null;
  category_l3_name?: string | null;
  category_l4_name?: string | null;
  category_breadcrumb?: string | null;
  scope?: string | null;        // Acquisition / Stage 1 / Stage 2 / Stage 3…
  qty: number | null;
  rate: number | null;
  amount: number | null;        // qty * rate (auto recalculated on inline edits)
  uom_code: string | null;      // ‘EA’, ‘AC’, ‘LF’, ‘LOT’, etc.
  notes: string | null;         // User-facing description
  start_period: number | null;  // Month index (0-based from base year)
  periods_to_complete: number | null;
  start_date?: string | null;
  end_date?: string | null;
  vendor_name?: string | null;
  confidence_level?: string | null;
  escalation_rate?: number | null;
  contingency_pct?: number | null;
  timing_method?: string | null;
  funding_id?: number | null;
  curve_id?: number | null;
  milestone_id?: number | null;
  cf_start_flag?: boolean | null;
}
```

### Container Metadata

- `useContainers` (`src/hooks/useContainers.ts`) retrieves `/api/projects/{id}/containers` and flattens the tree into Areas (level 1), Phases (level 2), and Parcels (level 3) with acreage/unit/cost statistics. Filters, modals, and labels rely on this hook and `useProjectConfig` to present human-friendly names (“Village”, “Phase”, etc.).

### Cost Category Tree

- `useBudgetCategories` (`src/hooks/useBudgetCategories.ts`) exposes both flat lists and trees from `/api/budget/categories` and `/api/budget/categories/tree`. It also surfaces CRUD helpers and template application for the “Cost Categories” workflow.

---

## Budget Grid Sub-Tab (`src/components/budget/BudgetGridTab.tsx`)

### Layout & Controls

1. **Sub-tab navigation bar** (CoreUI `CNav`): Grid, Timeline, Assumptions, Analysis, Cost Categories.
2. **Filters accordion** (`FiltersAccordion`):
   - Reads Areas/Phases via `useContainers`.
   - Provides multi-select “tile” filters with vivid color palettes and a `Clear Filters` badge.
   - Filtering logic is handled inside `BudgetGridTab` by computing the allowed `container_id` list before passing `data` into the grid.
3. **Mode selector** (`ModeSelector`): toggles `napkin`, `standard`, `detail`.
4. **Toolbar actions**:
   - Timeline toggle switch (`showGantt`) only appears if at least one item has date/period data.
   - `+ Quick Add Category` opens `QuickAddCategoryModal` for rapid category creation with minimal fields.
   - `+ Add Item` opens `BudgetItemModalV2`.
5. **Incomplete Categories Reminder** (`IncompleteCategoriesReminder`):
   - Amber alert banner showing count of incomplete categories (created via quick-add).
   - Only appears if incomplete categories are actively used in budget items.
   - Expandable details show category name, usage count, missing fields, and days since creation.
   - Actions: "Complete Now" (opens admin panel), "Dismiss for 7 days".

### Data Fetching & Mutations

- `useBudgetData(projectId)` (under `src/components/budget/hooks/`) calls `/api/budget/gantt?projectId={id}` and normalizes raw fields (handles camelCase/snake_case, derives `start_period`/`periods_to_complete` when only dates exist).
- Mutations:
  - `updateItem(factId, patch)` → `PUT /api/budget/gantt/items/{factId}`
  - `createItem(payload)` → `POST /api/budget/gantt/items`
  - `deleteItem(factId)` → `DELETE /api/budget/gantt/items/{factId}`
- Inline edits are constrained to whitelisted fields (`qty`, `rate`, `notes`, category ids, timing fields, etc.) so backend validations stay tight.

### Grid Rendering (`BudgetDataGrid`)

- Powered by `@tanstack/react-table`, fed with column definitions from `getColumnsByMode`.
- `useBudgetGrouping` supplies optional category grouping:
  - State persists in `localStorage` per project.
  - Builds a 4-level tree (L1–L4 plus synthetic “(Uncategorized)”).
  - `GroupRow` renders subtotal rows with variance badges, child counts, and expand/collapse affordances.
  - `CategoryEditorRow` (expandable row) lets users reassign L1–L4 hierarchies with cascading dropdowns, respecting mode (Napkin=only L1, Standard=up to L2, Detail=up to L4).
- `useBudgetVariance` fetches `/api/budget/variance/{projectId}` (cached 30s) so grouped parents can show reconciled vs. unreconciled deltas.
- `ExpandableDetailsRow` injects additional inline form fields:
  - Standard mode: timing, escalation, contingency, vendor, etc.
  - Detail mode: adds date, funding, milestone, and cash-flow flags.
- `TimelineChart` (optional right column) draws a mini SVG Gantt to sync selection with the table.

### Column Sets by Mode

| Mode     | Column Summary | Editing UX |
|----------|----------------|------------|
| Napkin   | Phase (dropdown), Category (single-select), Description (template-enabled text), Qty, UOM, Rate, Amount, Start, Duration. | Fully inline; description field can pull from unit-cost templates. Phase dropdown shows "Project-Level", Areas (e.g., "Area 1"), and Phases (e.g., "Phase 2.1"). |
| Standard | Same as Napkin but the Category column becomes a clickable stack of colored dots to open the category editor, and a Variance column (`Var`) is injected after Amount. Timing fields relocate to the always-visible expandable row. Health Widget and Confidence columns removed. | Inline edits for qty/rate/notes/UOM; category edits via `CategoryEditorRow`. |
| Detail   | Inherits Standard columns. Expandable row grows to include raw dates, funding IDs, milestone IDs, `cf_start_flag`, etc. | Inline editing extends to detail-only fields via expandable row. |

### Item Modal (`BudgetItemModalV2`)

- Triggered for `+ Add Item` (always) and row double-click (for Standard/Detail modes).
- Fetches:
  - Containers `/api/projects/{id}/containers` → flattened for drop-down (project-wide, areas, phases).
  - Project config `/api/projects/{id}/config` → contextual labels for "Level 1/2".
  - Unit cost templates `/api/unit-costs/templates?category_id={L1}` for auto-complete suggestions.
- Three-row layout:
  1. Container selector + cascading category picker (`CategoryCascadingDropdown`).
  2. Vendor/source + description field with datalist + template usage counter.
  3. Qty/UOM/Rate/Total + Start Period + Duration.
- Custom item descriptions prompt confirmation before saving (in create mode) to avoid polluting template statistics.

### Quick-Add Category Modal (`QuickAddCategoryModal`)

**Purpose**: Rapid category creation without leaving budget grid workflow.

- **Trigger**: `+ Quick Add Category` button in toolbar.
- **Required Fields**:
  - Name (free text)
  - Level (1-4 dropdown)
- **Optional Fields**:
  - Parent category (cascading dropdown filtered by level-1)
  - Auto-selected project_id from context
- **Auto-Generated**:
  - Category code (sanitized from name + parent code)
  - Sets `is_incomplete=true` flag
  - Sets `created_from='budget_quick_add'`
- **API**: `POST /api/financial/budget-categories/quick-add/`
- **Completion Tracking**:
  - Missing fields: description, icon, color, parent (for L2-4)
  - Tracked in `core_category_completion_status` table
  - Reminder banner appears if category used in budget
- **Validation**:
  - Warning (not error) if L2-4 created without parent
  - Allows submission to avoid blocking workflow

**Related Components**:
- `IncompleteCategoriesReminder` - Shows amber banner for incomplete categories
- Admin → Preferences → Category Taxonomy - Where completion happens

---

## Timeline View (`src/components/budget/TimelineTab.tsx`)

- Placeholder implementation today: shows an info alert describing the planned full-width Gantt (period markers, scope colors, interactive bars) and a dashed container for design reference.
- The actual mini timeline currently lives inside the Grid tab via `TimelineChart`. When Timeline View is implemented it will likely reuse the same `/api/budget/gantt` data set but render independently at full width.

---

## Assumptions Tab (`src/components/budget/AssumptionsTab.tsx`)

- Local state only (no API yet). Fields:
  - Default confidence level (High/Medium/Low/Conceptual) which implicitly maps to contingency %.
  - Annual escalation rate (%).
  - Budget start period (month index).
  - Total project duration (months, capped at 240).
- Save button simulates async persistence; replace with a real endpoint when available.
- Operates under the assumption these values will pre-fill future budget item defaults and timeline scales.

---

## Analysis Tab (`src/components/budget/AnalysisTab.tsx`)

- Another placeholder but design intent is called out explicitly in the alert:
  - Cost variance reports (Original vs Current vs Forecast).
  - Rollups by scope/category.
  - Burn-rate charts.
  - Commitment tracking.
- When built, it should re-use the same budget facts plus aggregated finance tables (`core_fin_budget_version`, `core_fin_fact_budget`) already exposed in `/api/fin/budgets`.

---

## Cost Categories Tab (`src/components/budget/CostCategoriesTab.tsx`)

### Template Management

- Loads available templates on mount via `GET /api/budget/category-templates`.
- Applying a template posts back to `/api/budget/category-templates` with `{ project_id, template_name, project_type_code, overwrite_existing }`. Conflicts (409) trigger a confirm dialog before resubmitting with `overwrite_existing: true`.
- UI affordances:
  - Template selector with counts.
  - “Apply Template” + “Edit Template” buttons.
  - “+ Create New Template” button launches `CreateTemplateModal`.

### Category Tree Management

- `CategoryTreeManager` renders the 4-level hierarchy with expand/collapse, inline badges, and CRUD actions.
- Uses `useBudgetCategories` actions:
  - `createCategory`, `updateCategory`, `deleteCategory` call the corresponding REST endpoints (same `/api/budget/categories` namespace) and refresh the tree on success.
  - Form enforces max depth (4 levels) and stores metadata such as code, description, color hex, icon, sort order.
- Delete requires a two-tap confirmation (double-click or second click within 3 seconds) and reports hook errors inline.

### Template & Category Modals

- `TemplateEditorModal` (when clicking “Edit Template”) lets administrators tweak templates for a specific `project_type_code`; after save it refreshes both the dropdown and the tree.
- `CreateTemplateModal` lets users persist the current project hierarchy as a reusable template.

---

## Supporting Hooks & Utilities

| Hook / Utility | Responsibility |
|----------------|----------------|
| `useBudgetGrouping` (`src/hooks/useBudgetGrouping.ts`) | Builds/maintains grouped category trees, expanded-state persistence, uncategorized handling. |
| `useBudgetVariance` (`src/hooks/useBudgetVariance.ts`) | Fetches and formats variance data, exposes helpers like `getCategoryVariance`/`formatVariance`. |
| `FiltersAccordion` (`src/components/budget/FiltersAccordion.tsx`) | Presents Area/Phase filters with CoreUI badges and color blocks, ties into project labels via `useProjectConfig`. |
| `TimelineChart` (`src/components/budget/custom/TimelineChart.tsx`) | Simple SVG Gantt view that respects `start_period`/`periods_to_complete` and scope colors. |
| `ModeSelector` (`src/components/budget/ModeSelector.tsx`) | CoreUI button group that toggles modes; `BudgetGridTab` stores the active value in state. |

---

## API Surface Summary

| Endpoint | Method(s) | Used by | Notes |
|----------|-----------|---------|-------|
| `/api/budget/gantt?projectId={id}` | GET | `useBudgetData` | Returns budget facts used across grid + timelines. |
| `/api/budget/gantt/items` | POST | `BudgetGridTab` (modal save) | Creates new budget facts; payload mirrors `BudgetItem` subset. |
| `/api/budget/gantt/items/{factId}` | PUT/DELETE | `BudgetGridTab` | Partial updates + deletions. Supports all BudgetItem fields including `container_id`, expandable row fields. |
| `/api/projects/{id}` | GET | `BudgetGridTab` | to derive `project_type_code`. |
| `/api/projects/{id}/containers` | GET | Filters, modal, PhaseCell | Returns hierarchical tree with numeric container_id values. Optional `includeCosts=true` adds acreage/unit/cost rollups. |
| `/api/projects/{id}/config` | GET | Modal | Supplies level labels (Area, Phase, Parcel). |
| `/api/budget/categories` & `/api/budget/categories/tree` | GET/POST/PUT/DELETE | Category tree + editor | Accepts `project_id`, `template_name`, `project_type_code`. |
| `/api/budget/category-templates` | GET/POST | Cost Categories tab | Template metadata + apply endpoint (with overwrite support). |
| `/api/unit-costs/templates` | GET/PATCH | Item modal & description autocomplete | `PATCH` increments template usage counts after selection. |
| `/api/budget/variance/{projectId}` | GET | `useBudgetVariance` | Supports `min_variance_pct` query param. |

---

## Implementation Hotspots

- `src/components/budget/BudgetGridTab.tsx` — orchestrates state, filters, sub-tabs, modal, timeline toggle, and area/phase filters.
- `src/components/budget/BudgetDataGrid.tsx` — renders the spreadsheet, grouping, variance badges, expandable details, and inline editing plumbing.
- `src/components/budget/custom/*` — small utilities (timeline SVG, category editor row, group row, colored dot indicator, editable cell, etc.).
- `src/components/budget/CostCategoriesTab.tsx` & `CategoryTreeManager.tsx` — the entirety of cost-category CRUD + template UX.
- `src/components/budget/AssumptionsTab.tsx` & `AnalysisTab.tsx` — scaffolding ready for real persistence/analytics.

Keep this document nearby when prompting another model so it can trace responsibilities quickly and know which API/contracts to honor.
