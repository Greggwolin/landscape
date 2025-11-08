# GrowthRates (Materio UI) Overview  
_Last updated: 2025-11-02_

## Purpose

`GrowthRates` is the Materio-inspired, analyst-facing assumptions dashboard. It consolidates:

1. **Growth Rate Assumptions** (development costs, price appreciation, sales absorption).  
2. **Market Pricing** (per land-use type).  
3. **Inflation / UOM Context** (reference data for building pro forma inputs).

The component gives analysts a single screen to review and tweak growth assumptions, visualize impacts, and edit land pricing with inline validation. It relies on the Next.js API layer, which talks to Neon (PostgreSQL) for persisted data, but falls back gracefully to defaults when no project data exists.

## Location

```
src/app/components/GrowthRates.tsx
```

sandbox page:

```
src/app/growthrates/page.tsx
```

### Related assets

* `GrowthRates-Original.tsx` — legacy/table-first version.  
* `GrowthRateDetail/index.tsx` — modal for step-by-step custom curves (currently inline-only).  
* `types/growth-rates.ts` — TypeScript definitions for the Materio component.  
* `lib/validation/growth-rates.ts` — validation helpers consumed by the API.

## Data flow

```
GrowthRates (client component)
 ├─ fetch /api/assumptions/growth-rates?project_id=…
 │    → SELECT from landscape.tbl_assumptionrule (fallback to DEFAULT_GROWTH_RATE_ASSUMPTIONS)
 │
 ├─ fetch /api/market-pricing?project_id=…
 │    → SELECT from landscape.core_fin_pricing (project-specific land pricing)
 │
 ├─ fetch /api/landuse/active-types?project_id=…
 │    → SELECT from land-use tables (active types & metadata)
 │
 └─ fetch /api/fin/uoms
      → SELECT from finance/unit-of-measure tables
```

The component issues these calls in parallel within `useEffect` hooks. Responses hydrate local React state slices:

* `assumptions` (growth rate cards)
* `pricingData` & `originalPricingData` (market pricing grid)
* `activeLandUseTypes`
* `uomOptions`

On save:

```
PUT /api/assumptions/growth-rates
  → UPDATE landscape.tbl_assumptionrule

PUT /api/market-pricing
  → UPSERT landscape.core_fin_pricing
```

### API routes referenced

| Route                                            | Method | Description                                         | Tables touched                                        |
|-------------------------------------------------|--------|-----------------------------------------------------|-------------------------------------------------------|
| `/api/assumptions/growth-rates`                 | GET    | Load project/global growth assumptions             | `landscape.tbl_assumptionrule`                        |
| `/api/assumptions/growth-rates`                 | PUT    | Update a specific assumption rule                  | `landscape.tbl_assumptionrule`                        |
| `/api/market-pricing`                           | GET    | Load land pricing data (project scoped)            | `landscape.core_fin_pricing` (and joins)              |
| `/api/market-pricing`                           | PUT    | Persist edited pricing rows                        | `landscape.core_fin_pricing`                          |
| `/api/landuse/active-types`                     | GET    | Provide active land-use families/types             | `landscape.lu_family`, `landscape.lu_type`            |
| `/api/fin/uoms`                                 | GET    | Enumerate unit-of-measure codes                    | `landscape.core_fin_uom`                              |

All API handlers rely on the shared `sql` helper (Neon client) defined in `src/lib/db.ts`.

## UI structure

```
<ThemeProvider materioTheme>
  <Stack spacing=3>
    <GrowthRateCard />  // per assumption category (Development Costs, etc.)
    <LandPricingCard /> // tabular editor w/ inflation options & UOMs
  </Stack>
</ThemeProvider>
```

### Growth rate cards

* Rendered with MUI `Card` + `Tabs`.
* Each card has:
  - Summary chip (global rate, IRR impact, etc.)
  - Expand/collapse for “Analysis Impact” section (bar chart, summary metrics).
  - Tabs per custom scenario (Custom 1/2/3, History, Sensitivity).
  - Buttons for `Edit`, `Save`, `Cancel`.
* Inline editing is tracked in `editingSteps`, `customSteps`, `editMode`.

### Market pricing card

* MUI table styled via `CompactTable`.
* Editable columns:
  - Land use type (read-only)
  - Lot size / price inputs (with localized formatting)
  - Inflation source (select)
* `hasUnsavedChanges` toggles the `Save` button state.
* UOM dropdown uses `uomOptions` from `/api/fin/uoms`.

## State management

The component is intentionally verbose but keeps state slices scoped:

* `assumptions` — array of `GrowthRateAssumption`.
* `customNames`, `editingNames` — mapping of card/tab to custom labels.
* `customSteps`, `editingSteps` — store user edits per assumption.
* `pricingData`, `originalPricingData` — track dirty fields for land pricing.
* `showAnalysisImpact` — toggle analysis detail sections.
* `loading`, `landPricingLoading`, `error`, `landPricingError`, `hasUnsavedChanges` — UI status flags.

## Validation / Formatting

* Numeric fields leverage helper functions (`formatCurrency`, `parseCurrency`, `formatNumber`).
* The API handles deep validation (via `lib/validation/growth-rates.ts`).
* UI ensures:
  - Steps display contiguous periods (auto-calculated `thru` fields).
  - Land pricing entries convert localized strings back to floats before calling the API.

## Known gaps / TODOs

1. **Project selector integration** – Component defaults to `projectId = null`, requiring parent context to pass the actual ID.
2. **Save flows** – Growth rate card saves currently send whole assumption payloads; incremental updates or diff-based saves are on the roadmap.
3. **History & Sensitivity tabs** – Presentational only; backend integration for analytics is pending.
4. **Undo / Cancel** – Inline editing has basic cancel behavior, but unsaved changes across multiple tabs aren’t centrally tracked.
5. **Access control** – No auth gating; assume upstream middleware enforces permissions.
6. **Dragging/Order** – Step order is fixed; dragging to reorder steps is a future enhancement.

## Suggested next steps (for Claude / design discussion)

* Introduce a top-level project picker to drive `projectId`.
* Add mutation feedback (toasts/snackbars) on successful or failed saves.
* Provide historical charts on the `History` tab using our analytics API (once defined).
* Integrate `GrowthRatesManager` for CRUD of reusable sets and allow switching between them in the Materio UI.
* Consider server components or SWR for data fetching to cache API responses between tab switches.

## Supporting scripts & docs

* `docs/components/GrowthRateDetail.md` _(future)_ — planned dedicated doc for the modal when implemented server-side.
* `scripts/seed-growth-rates.mjs` — removed; growth assumptions are now seeded via the API or the Materio UI itself.
* `docs/03-api-reference/budget_grid_api_spec.md` — adjacent spec for budget-related APIs that share growth/market data patterns.

This overview should give Claude (and other collaborators) the context needed to iterate on UX, validation, and backend contracts for the Materio growth rates experience.
