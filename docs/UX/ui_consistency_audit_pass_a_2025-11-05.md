# UI Consistency Audit · Pass A (commit cafa56b · 2025-11-05 21:16:36Z)

## Executive Summary
- Token layers are fragmented across Tailwind defaults (`tailwind.config.js:10`), CoreUI variables (`src/styles/coreui-theme.css:12`), ad-hoc page themes (`src/styles/lease.css:1`, `src/styles/horizon-dark.css:5`), and inline style blocks; many Tailwind tokens resolve to undefined CSS variables (`--border`, `--radius`) so shadcn primitives fall back to browser defaults.
- Specificity wars are driven by CoreUI light/dark overrides with `!important` (`src/styles/coreui-theme.css:247`), global select coercion (`src/app/globals.css:33`), and parcel tile rules (`src/styles/parcel-tiles.css:3`), causing Tailwind utilities such as `bg-gray-900` and `text-white` to mis-render.
- Provider load executes as `QueryProvider` → `CoreUIThemeProvider` → `ProjectProvider` → `IssueReporterProvider` (`src/app/layout.tsx:4`, `src/app/layout.tsx:26`), while nested route layouts introduce duplicated `ProjectProvider` scopes (`src/app/property/[id]/page.tsx:155`) and late `ComplexityModeProvider` (`src/app/projects/[projectId]/layout.tsx:16`), delaying theme state and project data during hydration.
- Recurrent inline `style` blocks hardcode `var(--cui-*)` colors across shared primitives (`src/app/dashboard/page.tsx:96`, `src/app/components/TopNavigationBar.tsx:282`, `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx:1574`), preventing reuse and blocking dark-mode parity.
- Minimal fix path: introduce canonical CSS variable bridge for Tailwind + CoreUI, reorder providers/styles, retire global overrides in favor of token-aware utilities, and port headline components to the canonical palette; scoped diffs are included for Pass A execution.

## A. Provider & Stylesheet Load Order

| Layer | Actual order & source | Recommended order | Notes |
| --- | --- | --- | --- |
| Global CSS imports | `./globals.css` → `@/styles/coreui-theme.css` (`src/app/layout.tsx:3`, `src/app/layout.tsx:4`) | `@/styles/coreui-theme.css` → `./globals.css` (diff `0001-order-providers.diff`) | Load CoreUI base before Tailwind so token bridge can override vendor defaults. |
| Providers (root) | `<QueryProvider>` → `<CoreUIThemeProvider>` → `<ProjectProvider>` → `<IssueReporterProvider>` (`src/app/layout.tsx:26`) | `<CoreUIThemeProvider>` → `<QueryProvider>` → `<ProjectProvider>` → `<IssueReporterProvider>` | Theme should mount outermost to set `data-coreui-theme` before client data fetching; query cache does not depend on theme. |
| Providers (projects route) | `<ComplexityModeProvider>` wraps page children (`src/app/projects/[projectId]/layout.tsx:16`) | Keep, but ensure it receives tokens from outer `CoreUIThemeProvider` after reorder | No change required once root order is fixed. |
| Nested project scope | Property page re-wraps `<ProjectProvider>` (`src/app/property/[id]/page.tsx:155`) | Remove duplicate provider (diff `0001-order-providers.diff`) | Double SWR fetch + localStorage churn during navigation. |
| Page-level styles | Lease module imports `@/styles/lease.css` (`src/app/lease/[id]/page.tsx:6`); property module imports `@/styles/property.css` (`src/app/property/[id]/page.tsx:6`); Horizon dark grid imported in archival views (`src/app/components/Archive/PlanningContentGrid.tsx:8`, `src/app/components/Archive/PlanningContentHot.tsx:9`) | Gate heavy CSS behind route-level layout or CSS Modules to contain scope; ensure canonical tokens exist before per-page overrides | Current `:root` mutations in `lease.css` bleed across the app when bundle loads. |

## B. Token Inventory & Collisions

### Tailwind theme extensions

| Token | Defined in | Current mapping | Observation |
| --- | --- | --- | --- |
| `colors.border` | `tailwind.config.js:11` | `hsl(var(--border))` | `--border` not defined in any global stylesheet; components fall back to default border color. |
| `colors.primary.DEFAULT` | `tailwind.config.js:17` | `hsl(var(--primary))` | No `--primary` in `globals.css`/CoreUI; inline styles substitute `var(--cui-primary)` instead. |
| `colors.primary.foreground` | `tailwind.config.js:18` | `hsl(var(--primary-foreground))` | Missing CSS var; buttons from `src/components/ui/button.tsx:10` render default text color. |
| `colors.secondary.DEFAULT` | `tailwind.config.js:21` | `hsl(var(--secondary))` | Undefined; collisions with `lease.css:2` `--primary` etc when lease bundle loads. |
| `colors.destructive.DEFAULT` | `tailwind.config.js:25` | `hsl(var(--destructive))` | Undefined; destructive buttons revert to Tailwind fallback red. |
| `colors.muted.DEFAULT` | `tailwind.config.js:29` | `hsl(var(--muted))` | Undefined; text classes like `text-muted-foreground` resolve to `currentColor`. |
| `colors.card.DEFAULT` | `tailwind.config.js:41` | `hsl(var(--card))` | Undefined; `bg-card` utilities fall back to white, missing dark-mode swap. |
| `borderRadius.lg` | `tailwind.config.js:46` | `var(--radius)` | No root `--radius`; components default to 0.375rem via Tailwind fallback. |

### CSS variables in use

| Variable | Source | Default value | Usage count | Notes |
| --- | --- | --- | --- | --- |
| `--cui-body-color` | `src/styles/coreui-theme.css:17` | `rgba(37, 42.92, 54.02, 0.95)` | 334 (`rg -o "var(--cui-body-color" src`) | Drives most inline `style` color assignments (dashboard, nav, valuation). |
| `--cui-border-color` | `src/styles/coreui-theme.css:18` | `#dbdfe6` | 289 | Overrides Tailwind `border` utilities when light theme enforces `!important`. |
| `--background` | `src/app/globals.css:9` | `#ffffff` | 2 | Not synchronized with theme toggles; dark mode relies on CoreUI overrides instead. |
| `--primary` | `src/styles/lease.css:2` | `#6366f1` | Lease-only usage | Redefines global `--primary`, colliding with Tailwind expectation. |
| `--rdg-*` | `src/styles/horizon-dark.css:5` | Horizon palette hexes | N/A | Scoped to `.rdg-dark`, but rely on `!important`. |
| `--ag-*` | `src/app/rent-roll/rent-roll-grid.css:3` | RGB values | N/A | Applied with `!important`; safe due to scoped theme class. |
| `--hot-*` | `src/styles/horizon-dark.css:46` | Horizon palette hexes | N/A | Scoped to `.ht-theme-dark`. |

### Custom utility / theme classes

| Class | Source | Purpose |
| --- | --- | --- |
| `.parcel-inline-select`, `.parcel-inline-input` | `src/app/globals.css:33` | Forces light select styling with `!important`, overriding Tailwind form controls globally. |
| `.tnum` | `src/styles/coreui-theme.css:7` | Enables tabular figures for numeric columns. |
| `.lease-*` suite | `src/styles/lease.css:23` etc | Encapsulates lease UI layout/colors; uses global `:root` tokens. |
| `.property-*` suite | `src/styles/property.css:2` | Dark-themed property editor; hardcodes colors on primitives (`input[type="text"]`). |
| `.chip`, `.btn` (scenarios) | `src/styles/scenarios.css:18` | Chip/button styling for scenario manager; duplicates dark theme tokens. |
| `.parcel-tile*` | `src/styles/parcel-tiles.css:3` | High-specificity parcel summaries with pervasive `!important`. |
| `.ag-theme-alpine-dark` overrides | `src/app/rent-roll/rent-roll-grid.css:3` | Align AG Grid with dark palette. |
| `.assumptions-page` | `src/app/styles/assumptions.css:8` | Layout and tone of assumptions workspace; sets dark backgrounds and borders. |

### Collision table

| Token / Selector | Source A | Source B | Winning specificity | Impact |
| --- | --- | --- | --- | --- |
| `bg-gray-900` | Tailwind utility (expected #111827) | `.light-theme .bg-gray-900` (`src/styles/coreui-theme.css:257`) | CoreUI via `!important` | Light theme forces white backgrounds on any element using `bg-gray-900`, breaking contrast cues in cards/alerts. |
| `text-white` | Tailwind utility | `.light-theme .text-white` (`src/styles/coreui-theme.css:302`) | CoreUI via `!important` | White text becomes near-black, causing unreadable buttons and badges. |
| `border` | Tailwind `border` utility | `.light-theme .border` (`src/styles/coreui-theme.css:290`) | CoreUI via `!important` | Adds drop-shadow and fixed color, undermining tokenization of borders (e.g., data tables). |
| `--primary` | Tailwind expectation (`tailwind.config.js:17`) | `:root` override in lease theme (`src/styles/lease.css:2`) | Last-loaded bundle wins | Lease page import shifts global token to purple; other routes inherit unintended palette. |
| `body background` | `body` rule in `globals.css:25` (uses `--background`) | `body` rule in `coreui-theme.css:112` (uses `--cui-body-bg`) | CoreUI load order | Dark mode relies on CoreUI class toggles; Tailwind tokens never update so `bg-background` mismatches actual surface color. |

## C. Global Overrides & `!important` Hotspots

| Rule / Selector | Location | Affected primitives | Risk |
| --- | --- | --- | --- |
| `.light-theme .bg-*` / `.light-theme .text-*` cascade with `!important` | `src/styles/coreui-theme.css:247` | Buttons, cards, badges using Tailwind color utilities | **High** – rewrites entire Tailwind palette, conflicting with dark mode and brand tokens. |
| `.parcel-inline-select`, `.parcel-inline-input` block | `src/app/globals.css:33` | All `<select>`/`<input>` containing `parcel-inline`, plus bare `<option>` elements (`src/app/globals.css:50`) | **High** – forces light color scheme, disables native theming, and leaks into unrelated forms. |
| `.parcel-tile*` declarations with `!important` | `src/styles/parcel-tiles.css:3` | Parcel summary cards, nested text nodes | **High** – prevents responsive adjustments and token adoption. |
| `style jsx global` inflation modal overrides | `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx:1574` | Modal inputs/buttons | **Medium** – global scope limited to modal ID, but `!important` locks theme colors to CoreUI defaults. |
| `style jsx global` AG Grid theme | `src/app/components/UniversalInventory/UniversalInventoryTable.tsx:493` | AG Grid headers, cells | **Medium** – necessary for vendor theming; consider converting to CSS module for clarity. |
| `.ht-theme-dark` `!important` block | `src/styles/horizon-dark.css:46` | Handsontable cells | **Medium** – scoped by theme class; acceptable once tokens align. |
| `.ag-theme-alpine-dark .ag-cell` `!important` | `src/app/rent-roll/rent-roll-grid.css:18` | AG Grid cells | **Low** – limited scope, required to override inline styles. |
| Budget grid padding `!important` | `src/components/budget/custom/BudgetGrid.css:210` | Custom budget inputs | **Low** – targeted to component, minimal blast radius. |

## D. Minimal Patch Plan (see `docs/UX/patches/pass_a/`)

1. **Normalize provider/style order** (`0001-order-providers.diff`)
   - Reorder imports so CoreUI CSS loads before Tailwind and set `<html>` defaults (`src/app/layout.tsx`); move `CoreUIThemeProvider` outermost and drop redundant `ProjectProvider` wrapper on property route (`src/app/property/[id]/page.tsx`).
   - Risk: low—SSR markup changes limited to additional attributes; verify hydration by loading `/projects/1` and `/property/123` after patch.
2. **Bridge Tailwind tokens to CoreUI vars** (`0002-tailwind-theme-unify.diff`)
   - Add `darkMode: ['class', '.dark-theme']` and switch theme colors to `var(--token)` style; populate canonical tokens in `globals.css` and map CoreUI light/dark variables to those tokens (`src/styles/coreui-theme.css`).
   - Introduce sidebar/header aliases for navigation; retain existing CoreUI values to honour UI Standards v1.0.
   - Risk: medium—ensure no `--token` resolves to empty string by running `grep -R "var(--[a-z-]+)"` on generated CSS or visiting components in both themes.
3. **Retire global overrides in favour of scoped tokens** (`0003-scope-globals.diff`)
   - Remove bare `option` override, constrain transition helper, delete CoreUI palette overrides, and convert parcel tile sheet to specificity-neutral selectors.
   - Risk: medium—requires spot-check of light theme surfaces previously covered by `!important`; validate `bg-gray-900` components (e.g., planning tiles) after patch.
4. **Port shared primitives to canonical tokens** (`0004-component-tokens.diff`)
   - Replace inline `var(--cui-*)` usages in the dashboard, landing page, and top nav with Tailwind utilities / new token aliases; ensures cards, tables, and navigation honour theme variables.
   - Risk: medium—depends on Step 2 definitions; confirm typography and contrast via manual QA on `/dashboard` and primary navigation actions.

## E. Validation Checklist

- `npm run lint` and `npm run test` (if configured) to ensure no TypeScript or unit regressions.
- `grep -R "var(--cui" src/app/dashboard/page.tsx src/app/components/TopNavigationBar.tsx` → expect zero matches after Step 4.
- `rg "!important" src/app src/styles | wc -l` → confirm ≥80 % reduction once overrides trimmed.
- Visual spot checks (light & dark toggles) for: `/dashboard`, `/projects/[id]?tab=project`, `/projects/[id]?tab=budget`, `/projects/[id]?tab=valuation`, `/lease/[id]`, `/property/[id]`, `/rent-roll`, `/settings/taxonomy`, `/dms`, `/market`.
- Verify select elements in parcel workflows still render legibly without forced `color-scheme: light`.
- Confirm AG Grid/Handsontable themes unaffected (look for `.ag-theme-alpine-dark`, `.ht-theme-dark`).

## Appendix

### Key commands

```bash
rg -c '!important' src/app src/styles | sort -nr | head
```
```
src/styles/coreui-theme.css:61
src/styles/parcel-tiles.css:43
src/app/globals.css:23
src/styles/horizon-dark.css:16
src/app/rent-roll/rent-roll-grid.css:3
src/components/budget/custom/BudgetGrid.css:3
src/app/projects/[projectId]/components/tabs/ProjectTab.tsx:10
```

```bash
rg -o "var(--cui-[a-z-]+" -N src | cut -d: -f2- | sed 's/.*var(/var(/' | sort | uniq -c | sort -nr | head -n 10
```
```
 334 var(--cui-body-color
 289 var(--cui-border-color
 274 var(--cui-secondary-color
  98 var(--cui-primary
  93 var(--cui-body-bg
  84 var(--cui-tertiary-bg
  73 var(--cui-card-bg
  27 var(--cui-danger
  22 var(--cui-success
  18 var(--cui-sidebar-nav-link-color
```

### Provider graph

```
<html>
  <body>
    QueryProvider (src/app/components/QueryProvider.tsx:11)
      CoreUIThemeProvider (src/app/components/CoreUIThemeProvider.tsx:38)
        ProjectProvider (src/app/components/ProjectProvider.tsx:40)
          IssueReporterProvider (src/components/IssueReporter/IssueReporterProvider.tsx:23)
            NavigationLayout (src/app/components/NavigationLayout.tsx:25)
              children
```

### Token sources

- CoreUI light theme palette: `src/styles/coreui-theme.css:12` – background, card, input, primary, sidebar colors.
- Dark theme palette: `src/styles/coreui-theme.css:63` – mirrors above with dark values.
- Lease overrides: `src/styles/lease.css:1` – resets `:root` tokens to lease palette.
- Property theme: `src/styles/property.css:192` – overrides primitive inputs regardless of scope.
- Scenario chips: `src/styles/scenarios.css:34` – defines chip/button tokens outside Tailwind.

### Inline override hotspots

- Inflation modal global style block: `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx:1574`.
- AG Grid theme injection: `src/app/components/UniversalInventory/UniversalInventoryTable.tsx:493`.

