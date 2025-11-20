# Button Inventory

Inventory of every button defined inside the Next.js app directory (`src/app`) plus the supporting taxonomy and AI review modals that render inside those pages. Routes are grouped by their folder path so it is clear which page exposes each control. Styling notes call out whether the button uses Tailwind utility classes, inline styles, Material UI, or custom CSS classes (and where those classes live).

> **Methodology:** searched for `<button` and `Button` usages across `src/app/**/*.tsx` and `src/components/taxonomy/*.tsx`, then reviewed each file to understand the label, intent, and styling hook. Component-specific sections (DocumentReview modal, Taxonomy manager, Rent Roll prototype header components) are listed after the route that instantiates them.

## Styling Summary

- **Tailwind-based controls:** 38 button surfaces rely on Tailwind utility classes (page-level CTAs, modals, and prototype interactions).
- **Custom CSS/inline styles:** 7 buttons (assumption toggle pills and the taxonomy manager’s `.btn-*` / `.type-expand-btn` elements) depend on bespoke CSS rules or inline overrides rather than Tailwind.
- **Material UI buttons:** 3 CTAs (`/budget-grid` back link, the rent-roll upload CTA, and the prototype header upload) are implemented with MUI’s `<Button>` component.

---

## `/ai-document-review` — `src/app/ai-document-review/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `🤖 Start AI Document Review` | Launches the AI modal for the selected project. | Tailwind classes `mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium`. |

### DocumentReview modal — `src/app/components/AI/DocumentReview.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `Retry` / `Close` | Error overlay actions. | Tailwind `px-4 py-2 bg-blue-600 text-white` (retry) and `bg-gray-300 text-gray-700` (close). |
| Header close (`✕`) | Dismisses the modal. | Minimal button with `text-gray-400 hover:text-gray-600`. |
| Footer `Cancel` / `Apply Changes` | Cancels or commits confirmed edits. | `Cancel` uses border-only styles, `Apply Changes` uses `px-6 py-2 bg-blue-600 text-white rounded-md` with spinner + `disabled:*` Tailwind utilities. |
| Suggestion actions (`More/Less`, `Confirm`, `Edit`, `Pass`, `Reset`) | Expand cards and capture review decisions. | Inline Tailwind classes per button (`text-gray-400` for toggle, `bg-green-600` confirm, `bg-blue-600` edit, `bg-yellow-600` pass, `bg-gray-500` reset). |
| Edit form actions (`Ask AI to Re-analyze`, `Save Edit`, `Cancel`) | When editing a suggestion. | Purple/blue/gray Tailwind classes with disabled states on the AI button. |
| AI revision actions (`✅ Accept AI Revision`, `❌ Keep My Value`) | When AI proposes new value. | Green/gray Tailwind buttons defined inside the revision card. |

---

## `/admin/benchmarks` — `src/app/admin/benchmarks/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| Accordion headers (`Commission`, `Absorption`) | Expand/collapse benchmark sections. | Tailwind + inline style: `flex w-full ... hover:bg-surface-card/80` with `style={{ backgroundColor: 'var(--surface-card-header)' }}`. |

---

## `/benchmarks/unit-costs` — `src/app/benchmarks/unit-costs/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| Stage tabs | Switches Stage 1/2/3 views. | `className="px-4 py-3 text-sm font-medium border-b-2 transition-colors"` with inline colors via CoreUI CSS variables. |
| `+ Add` (table header) | Adds a new unit-cost template row. | Small Tailwind pill `px-2 py-0.5 rounded text-xs font-medium` with inline `backgroundColor: var(--cui-primary)`. |
| Row `Edit` / `Delete` | Per-template actions. | Text buttons (`text-xs transition-colors hover:underline`) with inline color (`var(--cui-primary)` / `var(--cui-danger)`). |
| Empty-state `+ Add First Template` | CTA when no templates exist. | Tailwind `mt-4 px-4 py-2 rounded text-sm font-medium` + inline brand colors. |

---

## `/breadcrumb-demo` — `src/app/breadcrumb-demo/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| Scenario depth pills (`Project Only`, `+ Level 1`, etc.) | Toggle the breadcrumb scenario shown in the demo. | Tailwind template literal toggles `px-4 py-2 rounded text-sm font-medium transition-colors` with active state `bg-blue-600 text-white`, inactive `bg-gray-800 text-gray-300 hover:bg-gray-700`. |

---

## `/budget-grid` — `src/app/budget-grid/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `← Back to Budget` (MUI `<Button>`) | Returns to `/budget`. | Material UI `variant="outlined" size="small"` leveraging MUI theming (no Tailwind). |

---

## `/documentation` — `src/app/documentation/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| Category filters (`All`, `Market`, etc.) | Filters the documentation listings. | Tailwind `px-4 py-2 rounded-lg text-sm font-medium border` plus inline `backgroundColor`/`color` toggled via CSS variables (active state uses `var(--cui-primary)`). |
| Document tiles | Entire tile is a button opening docs. | `className="group rounded-lg p-5 text-left transition-all border"` and inline `style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)' }}`. |

---

## `/documents/review` — `src/app/documents/review/page.tsx`

`Button` comes from `@/components/ui/button` (Tailwind-based). Key usages:

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `Upload Documents` (header + empty state) | Opens file input / links to `/dms?tab=upload`. | Default button component (`size="lg"` in header, default in empty state) with standard Tailwind theme. |
| Queue cards (`Card` click) | Buttons are not rendered per card—the card itself is clickable. |
| Detail tab `Back to Queue` | Ghost variant with icon. | `<Button variant="ghost" className="mb-4">`. |
| Field-level `Edit` | Opens correction modal. | `<Button size="sm" variant="outline">` with icon. |
| Footer `Refresh` / `Commit to Database` | Re-fetch data or persist corrections. | Outline button with `Save` icon and primary button (`disabled` when saving). |

---

## `/gis-simple-test` — `src/app/gis-simple-test/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `🚀 Run API Tests` | Executes mock API test suite. | Tailwind template literal toggled by `isRunning`: active `bg-blue-600 hover:bg-blue-700`, disabled `bg-gray-600 cursor-not-allowed`. |

---

## `/gis-test` — `src/app/gis-test/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| Component selector cards | Choose which GIS component to render. | Tailwind template literal applying `p-4 rounded-lg border-2 transition-all` with active state (`border-blue-500 bg-blue-900/20 text-blue-300`) vs inactive (`border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500`). |

---

## `/market` — `src/app/market/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `Refresh Data` | Queues a new market ingestion job. | Tailwind `bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white px-4 py-2 rounded-md text-sm font-medium`. Status message rendered underneath. |

---

## `/projects/[projectId]/assumptions` — `src/app/projects/[projectId]/assumptions/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `Napkin`, `Mid`, `Kitchen Sink` | Global complexity toggle. | Uses `.toggle-btn`/`.toggle-btn.active` styles defined in `src/app/styles/assumptions.css` (rounded pills with colored borders, hover state, and field-count badges). |

---

## `/projects/[projectId]/overview` — `src/app/projects/[projectId]/overview/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| Tab buttons (Overview/Financial/etc.) | Switch main tab content. | Tailwind `px-4 py-3 text-sm font-medium transition-colors` with inline border color tied to `var(--cui-primary)`. |
| `View` (recent document rows) | Opens document preview. | Tailwind `px-3 py-1 text-xs rounded` plus inline border/background using CoreUI CSS variables. |

---

## `/projects/[projectId]/valuation` — `src/app/projects/[projectId]/valuation/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| Header `Refresh` | Refetches valuation data. | Tailwind base `px-4 py-2 text-sm font-medium rounded` plus inline colors referencing `var(--cui-*)` tokens; hover handlers tweak inline `backgroundColor`. |
| Tab strip buttons | Switch between valuation tabs. | Tailwind `px-5 py-3 text-sm font-medium transition-colors` with inline `style` controlling colors, borders, opacity, and cursor. |
| Error state `Try Again` | Appears when API call fails. | Tailwind `px-4 py-2 text-sm font-medium rounded` with inline `backgroundColor: var(--cui-danger)` and white text. |

## `/properties/[id]/analysis` — `src/app/properties/[id]/analysis/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `← Back to Properties` | Navigates back via `window.history.back()`. | Tailwind text button `text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1`. |
| `Show/Hide Advanced Options` | Toggles analysis mode. | Tailwind `px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800 text-gray-300`. |
| `Recalculate` | Appears in floating warning when inputs change. | Tailwind `px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700`. |

---

## `/prototypes/multifam/rent-roll-inputs` — `src/app/prototypes/multifam/rent-roll-inputs/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `Add/Edit Notes` | Opens prototype notes modal. | Tailwind template literal toggling between `bg-blue-700` and `bg-gray-700`, `text-white text-sm rounded`, with animated ping indicator when notes exist. |
| Floor plan actions (`Edit`, `Save`, `Cancel`) | Row-level editing in the floor-plan matrix. | Tailwind `px-2 py-1 text-xs` buttons with gray/blue backgrounds. |
| Rent roll header actions (`Configure Columns`, `+ Add Unit`) | Column chooser modal + unit addition. | Tailwind `px-3 py-1.5` buttons; gray variant for configuring columns (with icon), blue variant for adding units. |
| Unit table actions (`Edit`, `Save`, `Cancel`) | Row-level editing in detailed rent roll. | Tailwind `px-2 py-1 text-xs` buttons w/ gray, blue backgrounds and hover states. |
| Field chooser modal close (`✕`), `Reset to Defaults`, `Done` | Manage visible columns. | Close: `text-gray-400 hover:text-white`; footer buttons use tailwind `px-3/4 py-1.5` with gray and blue variants. |
| Notes modal buttons (`Clear Notes`, `Cancel`, `Save Notes`) | Manage prototype notes. | Tailwind `px-4 py-2 text-sm` with gray backgrounds and blue primary, includes `disabled:opacity-50` when saving. |

### Rent Roll prototype header components

| Component | Buttons | Styling / Notes |
| --- | --- | --- |
| `PageHeader` (`src/app/prototypes/multifam/rent-roll-inputs/components/PageHeader.tsx`) | Material UI `<Button>` labeled `Upload Rent Roll`. | `variant="contained"` with `startIcon={<UploadIcon />}`; disabled state shows `Processing...`. |
| `ModeToggle` (`src/components/shared/ModeToggle.tsx`) | `basic`, `standard`, `advanced` pills. | Tailwind classes computed from props (dark theme uses `bg-gray-800` container, active buttons `bg-gray-900 text-white shadow-lg`, inactive `text-gray-400 hover:bg-gray-700`). |
| `TabBar` (`src/app/prototypes/multifam/rent-roll-inputs/components/TabBar.tsx`) | `Rent Roll & Unit Mix`, `Operating Expenses`, `Market Rates`, `Capitalization`. | Tailwind `px-6 py-3 text-sm font-medium` with active state `text-white` and a pseudo underline (`absolute bottom-0 h-0.5 bg-white`). |

### `/prototypes/multifam/rent-roll-inputs/content/page.tsx`

This route renders the same rent-roll content component directly. All buttons listed above reappear with identical Tailwind classes (floor-plan actions, rent-roll header, field chooser, notes modal, etc.) in `src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx` lines 627–980.

---

## `/rent-roll` — `src/app/rent-roll/page.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| `Upload Rent Roll` (MUI `<Button>`) | Triggers file upload for rent rolls. | Material UI `variant="contained"` with `startIcon={<UploadIcon />}` and `disabled` state text `Processing...`. |

---

## `/settings/taxonomy` — `src/app/settings/taxonomy/page.tsx` + `src/components/taxonomy/*.tsx`

| Button | Context | Styling / Notes |
| --- | --- | --- |
| Header `📥 Import` / `📤 Export` | Currently disabled actions. | `.btn-secondary` class from `src/app/settings/taxonomy/taxonomy.css` (bordered pill, hover + disabled states). |
| Family tree toolbar (`Edit`, `Delete`, `Add`) | Manage land-use families. | `.edit-button` class (borderless icon buttons with hover background) in `FamilyTree.tsx`. |
| Type section (`Edit Type`, `Delete Type`, `+ Add Type`, `→` expand) | Manage property types. | `.btn-edit`, `.btn-secondary`, `.type-expand-btn` classes defined in `taxonomy.css`; mix of icon buttons and CTA pill. |
| Product panel (`×` close, `+ Add Product`, empty-state CTA) | Manage lot products. | `.btn-icon` for close, inline-styled full-width button using CoreUI colors for adds. |
| Product card actions (`Edit`, `Delete`) | Per-product actions. | `.btn-edit` icon buttons (CoreUI primary color). |
| Modal `Cancel` / `Save` buttons (families/types/products) | Form footers inside inline modals. | Inline styles (neutral `border: 1px solid #ccc` white buttons, and blue `backgroundColor: '#3b82f6'` or `var(--cui-primary)` for saves). |

All taxonomy-specific classes live in `src/app/settings/taxonomy/taxonomy.css`, which sets spacing, colors, hover states, and disabled behavior.

This inventory provides the per-page button surfaces plus custom component buttons that ship with those routes. Shared design tokens and styles are referenced next to each entry so future styling work can trace where a given look-and-feel originates. If additional shared components outside `src/app` introduce buttons later, re-run the same search to append them here. 
