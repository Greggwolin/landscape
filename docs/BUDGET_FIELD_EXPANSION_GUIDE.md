# Budget Field Expansion – Master Guide

**Initiatives:** QW82 Phase 1 (Nov 15‑17 2025) + LD19 follow-ups  
**Status:** ✅ Production Ready (ARGUS Developer/EstateMaster parity)  
**Scope:** Implementation, API coverage, verification, quick-add workflow, timing/layout/theme milestones, and testing.

---

## 1. Executive Overview

- **Objective:** Expand the land-development budget tab to support 49 fields across Napkin, Standard, and Detail modes with progressive disclosure.
- **Sessions:** QW82 introduced schema/CRUD coverage; LD19 finished mode persistence + property-type filtering.
- **Core Outcomes:**
  - All 49 database columns created (`core_fin_fact_budget`), renamed `periods` → `periods_to_complete`, added indexes and comments.
  - Django models/serializers now expose every field and enforce enum choices.
  - Next.js grid, API proxies, and layout/UX aligned with CoreUI theming + complexity selector persistence.

Reference migrations/files:  
`backend/migrations/002_budget_field_expansion.sql`, `backend/apps/financial/models.py`, `backend/apps/financial/serializers.py`, `src/types/budget.ts`, `src/components/budget/*`.

---

## 2. Field Granularity & Modes

| Mode | Inline Fields | Expandable Groups | Total Fields | Use Case |
| --- | --- | --- | --- | --- |
| **Napkin** | 9 | – | 9 | Rapid estimates |
| **Standard** | 10 | Group 1: Timing & Escalation (7)<br>Group 2: Cost Controls (6)<br>Group 3: Classification (5) | 28 | Professional budgeting |
| **Detail** | 10 | Standard groups + Group 4: Advanced Timing/CPM (11)<br>Group 5: Financial Controls (10)<br>Group 6: Period Allocation (5)<br>Group 7: Documentation & Audit (11) | 49 | ARGUS-level controls |

See `src/components/budget/config/fieldGroups.ts` for exact definitions, help text, dependencies, and property-type filters (land-development hides 11 CPM fields in Detail mode).

---

## 3. API & Data Path

### Flow
```
React Grid (BudgetDataGrid / ExpandableDetailsRow)
    → Next.js API /api/budget/item/[factId] (proxy + SQL fallback)
    → Django REST API /api/budget-items/{id}/
    → BudgetItem model → PostgreSQL landscape.core_fin_fact_budget
```

### Coverage Checklist
- Django model + serializer expose all 49 fields with PATCH support.
- Next.js proxy forwards request bodies verbatim; SQL fallback handles targeted updates (e.g., for timing widgets).
- Typescript types (`BudgetItem`, enums) enumerate all dropdown choices to keep UI + API in sync.
- Validation ensures inline, Standard, and Detail edits persist reliably (see “Timing & Escalation fixes” for recent whitelist updates).

---

## 4. Schema & Verification

- **Migration highlights (QW82 Phase 1):**
  - Added/renamed every field supporting escalation, CPM metrics, funding controls, documentation, and auditing.
  - Introduced indexes on `status`, `approval_status`, `is_critical`, `funding_id`, `milestone_id`.
  - Documented columns via PostgreSQL comments for auto-generated schema dumps.
- **Verification:**
  - `psql` inspection script confirms all columns exist.
  - `BUDGET_FIELD_VERIFICATION_COMPLETE.md` (archived) validated CRUD operations, Next.js proxy behavior, and UI wiring.
  - Manual queries sample:
    ```sql
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'landscape'
      AND table_name = 'core_fin_fact_budget'
    ORDER BY ordinal_position;
    ```

---

## 5. Quick-Add Category Workflow

- **Target Table:** `landscape.core_budget_category` with hierarchical `category_l1_id`‑`category_l4_id`.
- **New Columns:** `is_incomplete`, `created_from`, `reminder_dismissed_at`, `last_reminded_at`.
- **Completion Tracker:** `core_category_completion_status` stores missing attributes (description, icon, color, parent).
- **Back-end Enhancements:**
  - `BudgetCategory` model gained helper methods (`is_complete`, `mark_complete`, `dismiss_reminders`, etc.).
  - `QuickAddCategorySerializer` accepts minimal inputs (name, level, optional parent) and seeds categories with `created_from='budget_quick_add'`.
  - Reminder endpoints surface incomplete categories tied to active budget usage; reminders snooze for seven days when dismissed.
- **Front-end:** Grid integrates quick-add to avoid breaking workflow while Landscaper AI reminds users to finish metadata later.

---

## 6. Timing & Escalation Enhancements

- **Editable Field Whitelist:** `BudgetGridTab.tsx` now allows `escalation_method`, `timing_method`, `curve_profile`, and `curve_steepness`.
- **Gantt API Updates:** `/api/budget/gantt/items/[factId]` handles new timing fields with dedicated SQL updates.
- **Trigger Fix:** `trg_calculate_end_period` now uses `periods_to_complete` to compute `end_period`, resolving S‑curve updates.
- **Conditional Visibility:** ExpandableDetailsRow hides curve/milestone-specific fields unless `timing_method` matches.
- **Dependencies Link:** Milestone mode displays computed `dependency_count` link within timing group for future modal hook-up.

---

## 7. Layout & Theme Evolution

### Layout Versions
1. **v2.3 – 3-Column Compact:** Switched from two to three columns, introduced `fullWidth` property for notes/internal memo, reorganized field grouping (Timing, Cost Controls, Classification).
2. **v2.4 – Ultra-Compact Single Row:** Added `colWidth: 'auto'`, shortened labels/options for 7 timing fields, reduced padding/gaps, but deemed too tight.
3. **v2.5 – Readability Fix:** Reverted to 3-column layout, clarified labels (“Distribution”, “Escalation Timing”), restored help text, fixed trigger referencing.
4. **v2.6 – Balanced Inline:** Re-optimized single-row layout with more spacing, dependency link for milestone mode; tracked unresolved dropdown bug before whitelist fix.

### Theme Fixes
- **Budget Grid Dark Mode:** Replaced hardcoded Bootstrap `bg-*` classes with CSS variables for accordion headers, enforced `variant="outline"` on mode selector, adjusted CoreUI theme overrides.
- **Budget Page Styles:** Removed inline hex colors and `prefers-color-scheme` hacks; entire page now consumes `--cui-*` tokens for cards, tabs, summary chips, and hover states.

Refer to `src/components/budget/custom/ExpandableDetailsRow.tsx`, `ModeSelector.tsx`, `GroupRow.tsx`, and `src/styles/coreui-theme.css` for implementation details.

---

## 8. Testing Protocol

### 30-Second Smoke Test (Console)
```javascript
const factId = 123;

await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ escalation_method: 'through_duration' })
});

await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ percent_complete: 45.5 })
});
// Refresh grid and verify persistence.
```

### Comprehensive Checklist Highlights
1. **Mode Selector:** Buttons show “Napkin (9)”, “Standard (28)”, “Detail (49)” with correct colors and active state.
2. **Napkin Inline Editing:** Qty/UOM/Rate/Amount/Start/Duration edits fire PUT requests and persist after reload.
3. **Standard Timing Group:** Changing `timing_method` toggles S‑curve fields; slider/badge updates `curve_steepness`.
4. **Cost Controls & Classification:** Dropdowns/checkbox persist; deleting committed items returns expected API error.
5. **Detail CPM Metrics:** Baseline/Actual/Status/Critical fields editable in Detail mode, hidden for land projects as required.
6. **Financial Controls & Allocation:** Dropdowns + percentages validate input ranges; read-only totals match backend calculations.
7. **Documentation/Audit Fields:** Bid info, change orders, approval metadata display with computed/readonly badges.
8. **Quick-Add Reminder:** Trigger incomplete category reminder by creating category via grid and leaving metadata blank; verify dismissal timer.

---

## 9. Theme/UX Regression Tests

- Toggle light/dark themes to ensure accordion headers, GroupRow backgrounds, and buttons honor `--cui-*` tokens.
- Validate tags, cards, and summary panels for consistent colors per `landscape_ui_colors_inventory.md`.
- Confirm localStorage-driven mode persistence works after layout/theme refactors.

---

## 10. Future Opportunities

- Build dependencies modal triggered by `dependency_count` link for milestone mode.
- Complete SQL-backed period allocation preview grid.
- Automate Playwright coverage for inline editing, mode switching, and theme toggles.
- Integrate Landscaper AI suggestions with quick-add reminder data to auto-fill missing category metadata.

---

**Legacy documents moved to `docs/09_session_notes/archive/` for history:**
`BUDGET_FIELD_API_STATUS.md`, `BUDGET_FIELD_EXPANSION_IMPLEMENTATION.md`, `BUDGET_FIELD_LAYOUT_ULTRA_COMPACT.md`, `BUDGET_FIELD_LAYOUT_UPDATE.md`, `BUDGET_FIELD_TESTING_GUIDE.md`, `BUDGET_FIELD_VERIFICATION_COMPLETE.md`, `BUDGET_GRANULARITY_SYSTEM.md`, `BUDGET_GRID_DARK_MODE_FIXES.md`, `BUDGET_LAYOUT_FIXES_v2.5.md`, `BUDGET_LAYOUT_FIXES_v2.6.md`, `BUDGET_PAGE_DARK_MODE_FIXES.md`, `BUDGET_QUICK_ADD_CATEGORY_IMPLEMENTATION.md`, `BUDGET_TIMING_FIELDS_COMPLETE.md`, `QW82_PHASE1_MIGRATION_COMPLETE.md`.
