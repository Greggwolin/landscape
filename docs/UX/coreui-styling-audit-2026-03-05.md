# CoreUI Styling Compliance Audit — Landscape Platform

**Date:** 2026-03-05
**Purpose:** Comprehensive guide for a styling agent to bring the app to 100% CoreUI compliance.
**Builds on:** `badge-contrast-audit.md` (Feb 21), `ui_consistency_audit_pass_a_2025-11-05.md` (Nov 2025)

---

## Executive Summary

**6,479 violations across 387 files.** After filtering out archived, orphaned, and prototype code, **the active production codebase has ~5,800 violations across ~340 files.** The styling agent should focus exclusively on active files.

| Category | Total Files | Active | Inactive | Severity |
|---|---|---|---|---|
| Inline `style={{}}` attributes | 376 | ~350 | ~26 | HIGH — blocks theming |
| Hardcoded hex colors in CSS | 27 | 13 | 8 (+6 token-definition files) | MEDIUM — bypasses tokens |
| MUI component imports | 25 | 13 | 12 | HIGH — competing design system |

No forbidden Tailwind patterns (`bg-slate-*`, `bg-gray-*`, `dark:`) or raw Radix UI imports detected — those are clean.

### Active vs. Inactive Classification

Throughout this audit, files are tagged **ACTIVE** or **INACTIVE**:

- **ACTIVE** = imported by production routes, rendered in the live app, part of the navigation/layout system
- **INACTIVE** = in `_archive/` or `prototypes/` folders, orphaned (zero imports), has backup suffix (`.old2`, `-Original`), dev-only sandbox pages, or legacy MUI theme infrastructure in `src/themes/`

**Inactive files are candidates for deletion**, not migration. The styling agent should skip them entirely.

---

## 1. MUI COMPONENT REMOVAL (Priority 1)

> **Note:** MUI was deprecated from Landscape months ago. These are residual imports that need cleanup.

**25 files still import `@mui/*`:** 13 are in active production code, 12 are dead (archived, orphaned, or superseded). The styling agent should focus on the 13 active files. The 12 inactive files are candidates for deletion.

### ACTIVE FILES — Must Migrate (13 files)

These are imported by active routes, rendered in the production UI, or part of the live navigation/layout system.

| File | MUI Imports | CoreUI Replacement | Why Active |
|---|---|---|---|
| `src/app/components/Budget/BudgetGrid.tsx` | Card, CardContent, FormControl, InputLabel, Select, Checkbox, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress (27 imports) | CCard/CCardBody, CFormSelect, CFormCheck, CFormInput, CButton, CModal/CModalHeader/CModalBody/CModalFooter, CToast, CAlert, CSpinner | Imported by BudgetContainer.tsx in project workflow |
| `src/app/components/GrowthRatesManager/index.tsx` | Card, CardContent, Typography, Button, Tabs, TabPanel, TextField, FormControl, Select, IconButton, Dialog (18 imports) | CCard, CButton, CTabs/CTabPane, CFormInput, CFormSelect, CModal | Imported by `/growthratesmanager` page |
| `src/app/components/layout/shared/UserDropdown.tsx` | Tooltip, IconButton, Badge, Avatar, Popper, Fade, Divider, MenuItem, Typography (12 imports) | CTooltip, CButton, CBadge, CAvatar, CDropdown/CDropdownMenu/CDropdownItem | Imported by NavbarContent.tsx — renders on every page |
| `src/app/budget-grid/page.tsx` | Card, CardContent, Typography, FormControl, InputLabel, Select, TextField, Button (9 imports) | CCard/CCardBody, CFormSelect, CFormInput, CButton | Accessible at `/budget-grid` route (legacy but live) |
| `src/app/components/layout/vertical/Navigation.tsx` | styled, useTheme | CoreUI CSS vars + className | Core routing element — 14 files import this |
| `src/app/components/layout/vertical/VerticalMenu.tsx` | Chip, useTheme | CBadge, CoreUI CSS vars | Used by Navigation.tsx — core sidebar menu |
| `src/app/components/layout/vertical/NavbarContent.tsx` | IconButton | CButton | Renders ModeDropdown + UserDropdown in navbar |
| `src/app/components/layout/shared/ModeDropdown.tsx` | Tooltip, IconButton | CTooltip, CButton | Theme toggle — imported by NavbarContent.tsx |
| `src/app/components/GrowthRates.tsx` | Multiple MUI + @mui/x-charts BarChart | CoreUI + recharts | Imported by `/growthrates` page (primary version) |
| `src/app/rent-roll/page.tsx` | Button, Upload Icon | CButton + lucide-react icon | Active multifamily workflow at `/rent-roll` |
| `src/components/extraction/StagingModal.tsx` | Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert (5 imports) | CModal/CModalHeader/CModalBody/CModalFooter, CButton, CAlert | Core document staging UI — used by rent-roll page |
| `src/components/sales/SaleCalculationModal.tsx` | Dialog, Icons | CModal | Active sales comparison workflow — used by ParcelSalesTable |
| `src/components/sales/SaveBenchmarkModal.tsx` | Multiple MUI | CModal, CForm* | Nested modal in SaleCalculationModal — active sales workflow |

### INACTIVE FILES — Delete or Ignore (12 files)

These are archived, orphaned (zero imports), or superseded by CoreUI infrastructure. Recommend deletion during cleanup.

| File | MUI Imports | Why Inactive |
|---|---|---|
| `src/app/_archive/prototypes/multifam/rent-roll-inputs/components/PageHeader.tsx` | Button, Upload Icon | In `_archive/prototypes/` folder |
| `src/app/_archive/prototypes/multifam/rent-roll-inputs/page.tsx` | Snackbar, Alert | In `_archive/prototypes/` folder |
| `src/app/components/GrowthRates-Original.tsx` | Multiple MUI + Charts | `-Original` suffix = backup copy; only imported by dev sandbox route |
| `src/app/components/MarketAssumptionsNative.tsx` | Multiple MUI + Icons | **Orphaned** — zero imports found anywhere in codebase |
| `src/app/components/ThemeRegistry.tsx` | ThemeProvider, CssBaseline | **Commented out** in layout.tsx — superseded by CoreUIThemeProvider |
| `src/app/components/theme/index.tsx` | ThemeProvider, CssBaseline, deepmerge, AppRouterCacheProvider, useColorScheme (6 imports) | Legacy MUI theme provider — not used in app initialization |
| `src/app/components/theme/ModeChanger.tsx` | useColorScheme | Only used by `src/themes/current/index.tsx` which is itself unused |
| `src/themes/current/index.tsx` | ThemeProvider, CssBaseline, deepmerge, AppRouterCacheProvider, useColorScheme (6 imports) | Legacy MUI theme infrastructure in `src/themes/` — app uses CoreUIThemeProvider |
| `src/themes/current/ModeChanger.tsx` | useColorScheme | Duplicate in legacy themes folder — never imported |
| `src/app/components/upgrade-to-pro-button/index.tsx` | Tooltip, Card, CardHeader, CardContent, Typography, Button (7 imports) | **Orphaned** — Materio template leftover, zero imports |
| `src/app/components/stepper-dot/index.tsx` | StepIconProps type | **Orphaned** — zero imports, template artifact |
| `src/app/components/layout/shared/search/index.tsx` | IconButton | Part of legacy layout system — search component never rendered in modern nav |

### MUI → CoreUI Component Map

| MUI Component | CoreUI Replacement |
|---|---|
| `<Card>` / `<CardContent>` | `<CCard>` / `<CCardBody>` |
| `<Button>` / `<IconButton>` | `<CButton>` |
| `<TextField>` | `<CFormInput>` |
| `<Select>` / `<FormControl>` | `<CFormSelect>` |
| `<Checkbox>` | `<CFormCheck>` |
| `<Dialog>` / `DialogTitle` / `DialogContent` / `DialogActions` | `<CModal>` / `<CModalHeader>` / `<CModalBody>` / `<CModalFooter>` |
| `<Tabs>` / `<TabPanel>` | `<CTabs>` / `<CTabPane>` |
| `<Snackbar>` / `<Alert>` | `<CToast>` / `<CAlert>` |
| `<CircularProgress>` | `<CSpinner>` |
| `<Tooltip>` | `<CTooltip>` |
| `<Badge>` | `<CBadge>` |
| `<Avatar>` | `<CAvatar>` |
| `<Chip>` | `<CBadge>` |
| `<Typography>` | Semantic HTML (`<h1>`–`<h6>`, `<p>`, `<span>`) with CoreUI classes |
| `<Divider>` | `<hr>` or CoreUI utility class |
| `<Popper>` / `<Fade>` | `<CDropdown>` or Radix primitive |
| `<MenuItem>` | `<CDropdownItem>` |
| `ThemeProvider` / `CssBaseline` | **Delete** — `CoreUIThemeProvider` handles |
| `useColorScheme` | `useColorModes()` from `@coreui/react` |
| `styled()` | CSS vars + className (no styled-components pattern) |
| `useTheme` | CSS vars `var(--cui-*)` |

---

## 2. INLINE STYLE ELIMINATION (Priority 1)

**4,554+ instances across 376 files.** These block theme switching and prevent centralized styling.

### ACTIVE — Top 30 Worst Offenders (Must Fix)

All files below are confirmed imported by active production routes.

| File | Count | Domain |
|---|---|---|
| `components/tabs/PropertyTab.tsx` | 227 | Property details — via ProjectContentRouter |
| `components/tabs/ProjectTab.tsx` | 124 | Project summary — via ProjectContentRouter |
| `valuation/income-approach/DCFView.tsx` | 93 | DCF analysis — via IncomeApproachContent |
| `benchmarks/BenchmarkAccordion.tsx` | 90 | Cost benchmarks — via BenchmarksPanel |
| `valuation/income-approach/DirectCapView.tsx` | 84 | Direct cap — via IncomeApproachContent |
| `Planning/PlanningContent.tsx` | 68 | Planning — via PlanningTab |
| `valuation/components/ComparablesGrid.tsx` | 67 | Comparable sales — via SalesComparisonPanel |
| `components/tabs/MarketSupplySubTab.tsx` | 64 | Market supply — via MarketTab |
| `valuation/components/ReconciliationPanel.tsx` | 59 | Reconciliation — via ValuationTab |
| `property/PhysicalDescription.tsx` | 57 | Physical description — via PropertyPage |
| `NewProjectModal.tsx` | 57 | Project creation — via dashboard/page |
| `dms/DMSView.tsx` | 53 | Document mgmt — via ValuationTab |
| `dms/ProjectMediaGallery.tsx` | 50 | Media gallery — via DMSView |
| `capitalization/WaterfallResults.tsx` | 50 | Cap waterfall — via capitalization flows |
| `components/tabs/LocationSubTab.tsx` | 50 | Location — via MarketTab |
| `valuation/components/IndicatedValueSummary.tsx` | 44 | Value summary — via ValuationTab |
| `valuation/income-approach/AssumptionsPanel.tsx` | 42 | Assumptions — via income approach |
| `analysis/validation/ValidationReport.tsx` | 42 | Validation — via analysis flows |
| `components/tabs/MarketTab.tsx` | 42 | Market — via ProjectContentRouter |
| `income-approach/RentScheduleGrid.tsx` | 38 | Rent schedule — via income approach |
| `operations/OperatingIncomeCard.tsx` | 37 | Operating income — via operations flows |
| `admin/UserManagementPanel.tsx` | 37 | Admin users — via admin pages |
| `valuation/components/ComparableCard.tsx` | 36 | Comp card — via ComparablesGrid |
| `analysis/SfCompsTile.tsx` | 35 | SF comps — via analysis flows |
| `sales/ParcelSalesTable.tsx` | 34 | Parcel sales — via sales comparison |
| `capitalization/LoanScheduleGrid.tsx` | 34 | Loan schedule — via capitalization |
| `dms/list/DocumentAccordion.tsx` | 33 | Doc accordion — via DocumentTable |
| `operations/OperatingExpensesSection.tsx` | 32 | OpEx — via operations |
| `operations/sections/ValueAddSection.tsx` | 31 | Value-add — via operations |
| `operations/NOISummaryBar.tsx` | 30 | NOI summary — via operations |

### INACTIVE — Inline Style Files to Skip

These files also have high inline style counts but are not in production code. Delete or ignore.

| File | Count | Why Inactive |
|---|---|---|
| `valuation/components/ComparablesGrid.old2.tsx` | 64 | `.old2` backup suffix — zero imports |
| `_archive/components/PlanningWizard/PhaseCanvasInline.tsx` | 36 | In `_archive/` folder |
| `_archive/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx` | 34 | In `_archive/prototypes/` folder |
| All other `_archive/` files (~47 total) | varies | Entire `_archive/` directory is inactive |
| `*.old2.tsx`, `*.bak` files in budget/ | varies | Backup copies, zero imports |

### Common Inline Style Patterns to Replace

| Inline Pattern | CoreUI/CSS Replacement |
|---|---|
| `style={{ color: 'var(--cui-secondary-color)' }}` | `className="text-secondary"` or CSS class with `color: var(--cui-secondary-color)` |
| `style={{ fontWeight: 600 }}` | `className="fw-semibold"` |
| `style={{ fontSize: '0.875rem' }}` | `className="small"` or `className="fs-7"` |
| `style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}` | `className="bg-body-tertiary"` |
| `style={{ borderBottom: '1px solid var(--cui-border-color)' }}` | `className="border-bottom"` |
| `style={{ padding: '1rem' }}` | `className="p-3"` |
| `style={{ display: 'flex', gap: '0.5rem' }}` | `className="d-flex gap-2"` |
| `style={{ marginBottom: '1rem' }}` | `className="mb-3"` |
| `style={{ opacity: 0.7 }}` | `className="text-body-secondary"` or custom utility |

### Migration Strategy

1. For layout properties (flex, gap, padding, margin): use CoreUI utility classes (`d-flex`, `gap-2`, `p-3`, `mb-3`)
2. For colors referencing `var(--cui-*)`: use CoreUI's built-in text/bg classes (`text-primary`, `bg-body-tertiary`)
3. For typography (fontWeight, fontSize): use CoreUI typography utilities (`fw-semibold`, `fs-7`, `small`)
4. For borders: use CoreUI border utilities (`border-bottom`, `border-top`)
5. For component-specific styling that can't use utilities: create CSS module or add to component's `.css` file using `var(--cui-*)` tokens

---

## 3. HARDCODED HEX COLORS IN CSS (Priority 2)

**961 instances across 27 CSS files.** All should reference `var(--cui-*)` tokens.

### ACTIVE Files Requiring Migration (Excluding Token Definitions)

Token definition files (`coreui-theme.css`, `tokens.css`) are ACCEPTABLE — they define the design tokens. Everything else must consume tokens, not define raw hex.

| CSS File | Hex Count | Imported By | Notes |
|---|---|---|---|
| `src/styles/folder-tabs.css` | 31 | ProjectLayoutClient.tsx | Tab styling hardcoded |
| `src/styles/budget-color-audit.css` | 23 | app/layout.tsx | #ffffff, #0b1220, #0f172a, etc. |
| `src/styles/ingestion-workbench.css` | 9 | IngestionWorkbench | Ingestion UI |
| `src/styles/operations-tab.css` | 8 | OperationsTab.tsx | Operations tab |
| `src/styles/narrative-editor.css` | 8 | NarrativeCanvas.tsx | Narrative editor |
| `src/styles/style-catalog.css` | 7 | StyleCatalogContent.tsx | Style documentation |
| `src/styles/navigation.css` | 5 | app/layout.tsx | Navigation |
| `src/components/location-intelligence/location-map.css` | 109 | LocationIntelligenceCard.tsx | Map colors (may need exceptions) |
| `src/components/map-tab/map-tab.css` | 99 | MapTab.tsx | GIS styling (may need exceptions) |
| `src/components/phases/phase-transition.css` | 74 | PhaseTransition.tsx | Phase styling |
| `src/components/diligence/diligence-blocks.css` | 71 | DiligenceBlocks.tsx | Diligence blocks |
| `src/components/budget/BudgetDataGrid.css` | 32 | BudgetDataGrid.tsx | Grid defines `--ls-grid-*` with hex |

### INACTIVE CSS Files — Delete (8 files, zero imports)

| CSS File | Hex Count | Notes |
|---|---|---|
| `src/styles/property.css` | 65 | **Orphaned** — zero imports |
| `src/styles/lease.css` | 38 | **Orphaned** — also redefines `:root --primary` |
| `src/styles/horizon-dark.css` | 16 | **Orphaned** — legacy dark grid theme |
| `src/styles/scenarios.css` | — | **Orphaned** — duplicates dark tokens |
| `src/styles/parcel-tiles.css` | — | **Orphaned** — 43 `!important` rules |
| `src/components/budget/BudgetGantt.css` | 53 | **Orphaned** — zero imports |
| `src/components/budget/SimpleBudgetGrid.css` | 17 | **Orphaned** — zero imports |
| `src/components/budget/BasicBudgetTable.css` | 16 | **Orphaned** — zero imports |

### Exceptions (May Need Custom Colors)

Map/GIS components (`location-map.css`, `map-tab.css`) legitimately need color values that don't map to UI tokens (marker fills, heatmap gradients, etc.). These should still be extracted into CSS custom properties for maintainability but don't need to be CoreUI vars.

---

## 4. CSS VARIABLE NAMING CONSOLIDATION (Priority 2)

### Current State: Four Parallel Systems

| Prefix | Source | Count | Status |
|---|---|---|---|
| `--cui-*` | CoreUI official | 334+ usages of `--cui-body-color` alone | CANONICAL — keep |
| `--*` (bare) | Project custom / Tailwind | `--border`, `--radius`, `--primary` (undefined or colliding) | MIGRATE to `--cui-*` |
| `--ls-*` | Component-specific | `--ls-grid-bg`, `--ls-grid-border`, etc. | MIGRATE to `--cui-*` mapping |
| `--tw-*` | Tailwind internals | Generated | LEAVE (Tailwind managed) |

### Token Collisions (From Nov 2025 Audit)

| Token | Source A | Source B | Impact |
|---|---|---|---|
| `--primary` | Tailwind expects `hsl(var(--primary))` | `lease.css` redefines to `#6366f1` | Lease page shifts global palette |
| `--border` | Tailwind expects `hsl(var(--border))` | Not defined anywhere | shadcn primitives fall back to browser defaults |
| `--radius` | Tailwind expects `var(--radius)` | Not defined | Components default to 0.375rem |
| `bg-gray-900` | Tailwind utility (expects #111827) | `coreui-theme.css:257` forces white via `!important` | Breaks contrast in light theme |
| `text-white` | Tailwind utility | `coreui-theme.css:302` forces near-black via `!important` | Unreadable buttons/badges in light theme |

### Fix: Bridge File

Create `src/styles/token-bridge.css` mapping Tailwind expectations to CoreUI vars:
```
:root {
  --border: var(--cui-border-color);
  --primary: var(--cui-primary);
  --radius: 0.375rem;
  /* etc. */
}
```

---

## 5. DARK MODE INCONSISTENCIES (Priority 2)

### Three Competing Selectors

| Selector | Where Used | Should Be |
|---|---|---|
| `[data-coreui-theme="dark"]` | `coreui-theme.css` (correct) | CANONICAL |
| `[data-theme="dark"]` | Scattered components | MIGRATE → `[data-coreui-theme="dark"]` |
| `.dark` / `.dark-theme` | Tailwind classes | MIGRATE → `[data-coreui-theme="dark"]` |

### `!important` Overrides Blocking Dark Mode

**61 `!important` rules in `coreui-theme.css` alone.** Key offenders:

| Rule | Line | Impact |
|---|---|---|
| `.light-theme .bg-*` cascade | coreui-theme.css:247 | Rewrites entire Tailwind palette |
| `.light-theme .text-*` cascade | coreui-theme.css:302 | Forces white text to near-black |
| `.parcel-inline-select/input` | globals.css:33 | Forces light scheme on all matching inputs |
| `.parcel-tile*` declarations | parcel-tiles.css:3 | 43 `!important` rules blocking tokens |

---

## 6. BADGE / PILL / CHIP COMPLIANCE (Priority 3)

**299 instances across 62 files.** Full inventory in `badge-contrast-audit.md`.

### Summary by Color Method

| Method | Instances | Dark Mode Fix |
|---|---|---|
| Semantic (via `SemanticBadge`) | ~40 | Fix at theme level (centralized) |
| Raw CoreUI (`CBadge color="X"`) | ~100 | Fix at theme level |
| Dynamic Maps (JS object → CoreUI color) | ~30 (8 maps) | Audit each map |
| CSS Variable (`PropertyTypeBadge`) | ~4 | Fix token definitions |
| Hardcoded Tailwind pills | ~13 | Must fix per-instance |
| Raw Bootstrap `.badge` class | ~4 | Replace with `CBadge` |

### High-Risk Dark Mode Badges

| Variant | Issue | Instances |
|---|---|---|
| `success` (green) | Washes out on dark surfaces | ~15 |
| `info` (cyan) | Lacks contrast on dark | ~12 |
| `warning` (yellow) | Text disappears on dark | ~10 |
| `light` + `textColor="dark"` | Invisible on dark surface | ~6 |
| `dark` | Invisible on dark surface | ~5 |

### Tailwind Pills Bypassing CoreUI (Must Convert)

| Location | Current Classes | Fix |
|---|---|---|
| DevStatus — warning | `bg-yellow-100 text-yellow-800` | `<CBadge color="warning">` |
| DevStatus — error | `bg-red-100 text-red-800` | `<CBadge color="danger">` |
| DevStatus — info | `bg-blue-100 text-blue-800` | `<CBadge color="info">` |
| DevStatus — feature | `bg-purple-100 text-purple-800` | `<CBadge color="primary">` |
| CompletenessModal — complete | `bg-green-100 text-green-700` | `<CBadge color="success">` |
| CompletenessModal — partial | `bg-yellow-100 text-yellow-700` | `<CBadge color="warning">` |
| CompletenessModal — missing | `bg-red-100 text-red-700` | `<CBadge color="danger">` |
| DocumentReview — entity tags | `bg-blue-100 text-blue-700` | `<SemanticBadge>` |
| DMS ResultsTable — tags | `bg-blue-100 text-blue-800` | `<SemanticBadge>` |
| PlatformKnowledgeModal — source | `border-blue-200 bg-blue-50` | `<CBadge color="info">` |
| New Project LandscaperPanel | `bg-emerald-100 text-emerald-700` | `<CBadge color="success">` |

---

## 7. PROVIDER & STYLESHEET LOAD ORDER (Priority 2)

### Current (Wrong)

```
globals.css → coreui-theme.css  (Tailwind loads before CoreUI tokens)
QueryProvider → CoreUIThemeProvider → ProjectProvider → IssueReporterProvider
```

### Correct

```
coreui-theme.css → globals.css  (CoreUI base first, Tailwind overrides second)
CoreUIThemeProvider → QueryProvider → ProjectProvider → IssueReporterProvider
```

### Additional Issues

- Property page re-wraps `<ProjectProvider>` — causes double SWR fetch
- `ComplexityModeProvider` wraps late in projects route — needs tokens from outer theme
- `lease.css` redefines `:root` tokens that bleed across the app when bundle loads

Patches exist in `docs/UX/patches/pass_a/` (4 diff files from Nov 2025 audit).

---

## 8. COMPLETE PAGE/COMPONENT INVENTORY

### ACTIVE Pages (~40 routes)

**Core App:**
- `/` — Home/Dashboard
- `/login`, `/register`, `/forgot-password`, `/reset-password` — Auth
- `/projects` — Project list
- `/projects/[projectId]` — Main project view (hub for all tabs)
- `/projects/[projectId]/settings`, `/assumptions`, `/budget`, `/documents`
- `/projects/[projectId]/capitalization/debt`, `/equity`
- `/projects/[projectId]/project/budget`, `/dms`, `/planning`, `/sales`, `/summary`
- `/rent-roll` — Multifamily rent roll
- `/planning`, `/market`, `/market-assumptions`
- `/contacts`, `/dashboard`, `/reports`

**Admin:**
- `/admin/benchmarks`, `/admin/benchmarks/cost-library`
- `/admin/preferences`, `/admin/users`
- `/admin/dms/templates`, `/admin/feedback`, `/admin/changelog`

**Settings:**
- `/settings/profile`, `/settings/taxonomy`, `/settings/contact-roles`, `/settings/budget-categories`
- `/preferences`, `/preferences/layout`

**Active Standalone (linked from navigation):**
- `/test-coreui` — Theme Demo (linked in Navigation.tsx)
- `/growthrates`, `/growthratedetail`, `/growthratesmanager` — Growth rate management
- `/onboarding` — User onboarding flow
- `/ai-document-review`, `/documents/review` — Document review

### INACTIVE Pages (~18 routes) — Skip / Delete

These are dev sandbox pages not linked from main navigation, or prototype routes.

| Route | Why Inactive |
|---|---|
| `/budget-grid` | Legacy standalone page — not linked from nav |
| `/budget-grid-v2` | Legacy standalone page — not linked from nav |
| `/db-schema` | Dev-only debugging tool |
| `/map-debug` | Dev-only debugging tool |
| `/gis-simple-test` | Dev-only test page |
| `/breadcrumb-demo` | Dev-only demo page |
| `/growthrates-original` | Sandbox for `-Original` backup component |
| `/inventory` | Legacy standalone page |
| `/prototypes-multifam` | Prototype page |
| `/api/prototypes/*` | Prototype API routes |
| All routes under `_archive/` | Archived prototypes (47 files) |

### Folder Tab System (Dynamic)

**Row 1 — Main Folders:**

| Folder | Dev Mode Label | Income Mode Label |
|---|---|---|
| `home` | Project | Project |
| `property` | (hidden for dev) | Property |
| `budget` / `operations` | Budget | Operations |
| `feasibility` / `valuation` | Feasibility | Valuation |
| `capital` | Capitalization | Capitalization |

**Row 2 — Sub-Tabs per Folder:**

| Folder | Sub-Tabs (Income) | Sub-Tabs (Land Dev) |
|---|---|---|
| property | Location, Market Supply, Property Details, Rent Roll, Acquisition | Market, Land Use, Parcels |
| operations/budget | Budget, Sales | Budget, Sales |
| valuation/feasibility | Sales Comparison, Cost, Income, Cash Flow, Reconciliation | Comparable Sales, Market Comps, Cost |
| capital | Equity, Debt | Equity, Debt |

### Modal/Dialog Components (68 files)

**Budget:** BudgetItemModalV2, CreateTemplateModal, QuickAddCategoryModal, TemplateEditorModal
**DMS:** DeleteConfirmModal, DocumentChatModal, MediaPickerModal, MediaPreviewModal, PlatformKnowledgeModal, RenameModal, UploadCollisionModal
**Landscaper:** DataTableModal, CreateDynamicColumnModal, ExtractionReviewModal, ScenarioSaveModal
**Admin:** AdminModal, PicklistItemModal, ReportTemplateEditorModal, CreateTagModal, DeleteUOMModal
**Valuation:** SalesCompDetailModal, PendingRenoOffsetModal
**Projects:** NewProjectOnboardingModal, AddContactModal
**Sales:** SaleCalculationModal, SaveBenchmarkModal
**Extraction:** StagingModal
**Market:** AddCompetitorModal
**Rent Roll:** FloorplanUpdateDialog
**Tabs:** ConfigureColumnsModal

### Component Directories (380+ files)

| Directory | Files | Key Components |
|---|---|---|
| `budget/` | 38-41 | BudgetGrid, CategoryManager, TemplateSystem, ModeSelector, TimelineView |
| `dms/` | 36 | Upload, DocumentTable, Preview, MediaGallery, VersionHistory, TagManager |
| `landscaper/` | 29 | Chat, ActivityFeed, MutationCards, ExtractionReview, ScenarioHistory |
| `operations/` | 29 | IncomeStatement, Revenue, Expenses, ValueAdd, Treemap, SummaryBars |
| `valuation/` | 28 | SalesComp, CostApproach, IncomeApproach, DCF, Reconciliation |
| `admin/` | 23 | CostLibrary, Preferences, UserManagement |
| `ui/` | 24 | Base primitives + Landscape-specific variants |
| `projects/` | 15 | ProjectCreation, Onboarding, Contacts |
| `benchmarks/` | 13 | UnitCosts, CostLibrary, InlineEditable |
| `map-tab/` | 12 | GIS, Markers, Layers, Boundaries |
| `sales/` | 12 | Absorption, Comparables, PricingTable |
| `capitalization/` | 8 | Debt/Equity, Partners, Waterfall |
| `location-intelligence/` | 9 | Demographics, MarketRings, Competitive |
| `analysis/` | 11 | CashFlow, ValidationReport |
| `ingestion/` | 7 | WorkbenchChat, Milestones, FieldTable |
| `land-use/` | 5 | Classification, Family/Type/Product |
| `contacts/` | 5 | ContactCards, Roles |
| `ic/` | 4 | InvestmentCommittee |

### Navigation Components

- `FolderTabs.tsx` — Row 2 sub-tab nav
- `ActiveProjectBar.tsx` — Row 1 folder tiles
- `ProjectSubNav.tsx` — Project-level sub-nav
- `LandscaperPanel.tsx` — Left sidebar (320px / 64px collapsed)
- `CollapsedLandscaperStrip.tsx` — Collapsed state

---

## 9. CSS FILES INVENTORY (49 total)

### ACTIVE — Token Source Files (Keep As-Is)

| File | Hex Count | Notes |
|---|---|---|
| `src/styles/coreui-theme.css` | 155 | TOKEN SOURCE — defines design tokens. 61 `!important` rules need cleanup but hex values are acceptable here |
| `src/styles/tokens.css` | 112 | TOKEN SOURCE — extended token definitions. Acceptable |

### ACTIVE — CSS Files Requiring Migration (13 files)

These are imported by active production components. Hex values must be replaced with `var(--cui-*)` tokens.

**In `/src/styles/` (8 files):**

| File | Hex Count | Imported By | Notes |
|---|---|---|---|
| `folder-tabs.css` | 31 | ProjectLayoutClient.tsx | Tab styling hardcoded |
| `budget-color-audit.css` | 23 | app/layout.tsx | #ffffff, #0b1220, etc. |
| `ingestion-workbench.css` | 9 | IngestionWorkbench components | Ingestion UI |
| `operations-tab.css` | 8 | OperationsTab.tsx | Operations tab |
| `narrative-editor.css` | 8 | NarrativeCanvas.tsx | Narrative editor |
| `style-catalog.css` | 7 | StyleCatalogContent.tsx | Style documentation |
| `navigation.css` | 5 | app/layout.tsx | Navigation |
| `globals.css` | — | app/layout.tsx | Forces light color scheme on inputs, `!important` |

**In `/src/components/` (5 files):**

| File | Hex Count | Imported By | Notes |
|---|---|---|---|
| `location-intelligence/location-map.css` | 109 | LocationIntelligenceCard.tsx | Map colors — may need exceptions for markers/heatmaps |
| `map-tab/map-tab.css` | 99 | MapTab.tsx | GIS styling — may need exceptions |
| `phases/phase-transition.css` | 74 | PhaseTransition.tsx | Phase UI |
| `diligence/diligence-blocks.css` | 71 | DiligenceBlocks.tsx | Diligence UI |
| `budget/BudgetDataGrid.css` | 32 | BudgetDataGrid.tsx | Grid defines `--ls-grid-*` with hex |

**Active but minor (5 files, low hex count):**

| File | Hex Count | Notes |
|---|---|---|
| `land-use/land-use-picker.css` | 2 | Land use picker |
| `help/help-landscaper-panel.css` | 2 | Help panel |
| `sales/SaleDetailForm.css` | 1 | Sales |
| `sales/PricingTable.css` | 1 | Pricing |
| `alpha/alpha-flyout.css` | 1 | Alpha flyout |

**Active — needs `!important` cleanup:**

| File | `!important` Count | Notes |
|---|---|---|
| `coreui-theme.css` | 61 | Light-theme `.bg-*` / `.text-*` cascades rewrite Tailwind palette |
| `globals.css` | 23 | Parcel-inline-select/input forces light scheme |
| `color-guard.css` | — | GUARD FILE — intentional red flags, leave as-is |
| `channel-modal.css` | — | 1 hex fallback (#8b5cf6 for `--cui-purple`) |
| `assumptions.css` | — | Imported by assumptions/page.tsx (NOT in src/styles/) |
| `resizable-panel.css` | — | Layout structure — check for violations |

### INACTIVE — CSS Files to Delete (8 files)

These have **zero imports** anywhere in the codebase. They are orphaned dead code.

| File | Hex Count | Evidence |
|---|---|---|
| `src/styles/property.css` | 65 | **Orphaned** — zero imports found |
| `src/styles/lease.css` | 38 | **Orphaned** — zero imports found. Also redefines `:root --primary` which would bleed globally |
| `src/styles/horizon-dark.css` | 16 | **Orphaned** — legacy dark grid theme, zero imports |
| `src/styles/scenarios.css` | — | **Orphaned** — zero imports, duplicates dark theme tokens |
| `src/styles/parcel-tiles.css` | — | **Orphaned** — zero imports, had 43 `!important` rules |
| `src/components/budget/SimpleBudgetGrid.css` | 17 | **Orphaned** — zero imports |
| `src/components/budget/BasicBudgetTable.css` | 16 | **Orphaned** — zero imports |
| `src/components/budget/BudgetGantt.css` | 53 | **Orphaned** — zero imports |

---

## 10. GRID/TABLE LIBRARY STATUS

| Library | Current Usage | Target |
|---|---|---|
| TanStack Table | Budget grid, data tables | PREFERRED — expand |
| AG-Grid Community v34 | Rent roll only | KEEP — rent roll only |
| Handsontable | Legacy "Budget Grid Dark" | DO NOT EXTEND — migrate when possible |
| MUI DataGrid | None found | CORRECT — should stay at zero |

---

## 11. RECOMMENDED EXECUTION ORDER

### Phase 1: Foundation (Do First)

1. Fix provider/stylesheet load order (apply patches from `docs/UX/patches/pass_a/`)
2. Create token bridge file (`token-bridge.css`)
3. Standardize dark mode selector to `[data-coreui-theme="dark"]`

### Phase 2: Component Library Cleanup

4. Remove MUI imports from 13 ACTIVE files — replace with CoreUI (see Section 1)
5. Delete 12 INACTIVE MUI files (archived/orphaned)
6. Convert Tailwind-only pills to `CBadge` (13 instances)
7. Replace raw Bootstrap `.badge` with `CBadge` (4 instances)

### Phase 3: Inline Style Migration

8. Start with top 27 ACTIVE worst offenders (listed in Section 2)
9. Convert layout properties to CoreUI utility classes
10. Convert color references to CoreUI text/bg classes
11. Move remaining component-specific styles to CSS files

### Phase 4: CSS Token Migration

12. **Delete 8 orphaned CSS files** (property.css, lease.css, horizon-dark.css, scenarios.css, parcel-tiles.css, SimpleBudgetGrid.css, BasicBudgetTable.css, BudgetGantt.css)
13. Migrate hardcoded hex in 13 ACTIVE CSS files (see Section 9)
14. Migrate hex in component CSS files
15. Remove `!important` overrides (target 80% reduction)

### Phase 5: Polish

16. Audit dynamic color maps (8 maps) for dark mode safety
17. Tune CoreUI dark theme token overrides for badge contrast
18. Fix `light` + `textColor="dark"` badge pattern
19. Verify map/GIS colors work in both themes
20. Visual spot-check all pages in light + dark mode

---

## 12. VISUAL SPOT-CHECK ROUTES

After each phase, verify these routes in both light and dark mode:

| Route | What to Check |
|---|---|
| `/dashboard` | Cards, badges, navigation |
| `/projects` | Project list, type badges, creation modal |
| `/projects/[id]?folder=home` | Project tab, context bar, summary cards |
| `/projects/[id]?folder=property&tab=rent-roll` | Rent roll grid, status badges |
| `/projects/[id]?folder=property&tab=location` | Location sub-tab, map |
| `/projects/[id]?folder=operations&tab=budget` | Budget grid, category tree, mode selector |
| `/projects/[id]?folder=valuation&tab=sales-comparison` | Comp grid, adjustment matrix |
| `/projects/[id]?folder=valuation&tab=income` | DCF view, direct cap |
| `/projects/[id]?folder=valuation&tab=reconciliation` | Reconciliation panel |
| `/projects/[id]?folder=capital&tab=debt` | Loan schedule, waterfall |
| `/rent-roll` | AG-Grid theming |
| `/admin/preferences` | Badge inventory, UOM, categories |
| `/admin/feedback` | Status/category badges |
| `/contacts` | Contact type badges, filter pills |
| `/settings/taxonomy` | Taxonomy management |
| Landscaper panel (any page) | Chat, extraction review, mutation cards |

---

## 13. FULL INACTIVE FILES INVENTORY (Deletion Candidates)

Everything below should be deleted or ignored by the styling agent. Total: ~70 files.

### `src/app/_archive/` Directory (47 files)

Entire directory is inactive — no files are imported by production code.

| Subdirectory | Files | Contents |
|---|---|---|
| `_archive/components/PlanningWizard/` | 17 | Legacy planning wizard |
| `_archive/prototypes/[prototypeId]/` | 3 | Prototype routes |
| `_archive/prototypes/multifam/rent-roll-inputs/` | 21 | MF rent roll prototype |
| `_archive/src-prototypes/` | 3 | Source prototypes |
| `_archive/components-studio/` | 3 | Studio components |

### Legacy MUI Theme Infrastructure (5 files)

| File | Why Inactive |
|---|---|
| `src/themes/current/index.tsx` | Superseded by CoreUIThemeProvider |
| `src/themes/current/ModeChanger.tsx` | Never imported |
| `src/app/components/ThemeRegistry.tsx` | Commented out in layout.tsx |
| `src/app/components/theme/index.tsx` | Not used in app initialization |
| `src/app/components/theme/ModeChanger.tsx` | Only imported by unused theme file |

### Orphaned Components (4 files — zero imports)

| File | Notes |
|---|---|
| `src/app/components/MarketAssumptionsNative.tsx` | Zero imports anywhere |
| `src/app/components/upgrade-to-pro-button/index.tsx` | Materio template leftover |
| `src/app/components/stepper-dot/index.tsx` | Template artifact |
| `src/app/components/layout/shared/search/index.tsx` | Legacy layout system |

### Orphaned CSS Files (8 files — zero imports)

| File | Hex Count | Notes |
|---|---|---|
| `src/styles/property.css` | 65 | Zero imports |
| `src/styles/lease.css` | 38 | Zero imports, redefines `:root --primary` |
| `src/styles/horizon-dark.css` | 16 | Zero imports, legacy grid theme |
| `src/styles/scenarios.css` | — | Zero imports |
| `src/styles/parcel-tiles.css` | — | Zero imports, 43 `!important` rules |
| `src/components/budget/SimpleBudgetGrid.css` | 17 | Zero imports |
| `src/components/budget/BasicBudgetTable.css` | 16 | Zero imports |
| `src/components/budget/BudgetGantt.css` | 53 | Zero imports |

### Backup/Legacy Files (3+ files)

| File | Notes |
|---|---|
| `src/app/projects/[projectId]/valuation/components/ComparablesGrid.old2.tsx` | `.old2` suffix, zero imports |
| `src/app/components/GrowthRates-Original.tsx` | `-Original` suffix, only used by dev sandbox |
| Any `*.bak` files in budget/ | Backup copies |

### Dev-Only Sandbox Pages (8 routes)

| Route | Notes |
|---|---|
| `/budget-grid` | Legacy standalone page |
| `/budget-grid-v2` | Legacy standalone page |
| `/db-schema` | Dev debugging |
| `/map-debug` | Dev debugging |
| `/gis-simple-test` | Dev test |
| `/breadcrumb-demo` | Dev demo |
| `/growthrates-original` | Sandbox for backup component |
| `/prototypes-multifam` | Prototype |

---

## 14. FILES REFERENCED

### Existing Audits (Incorporated)

- `badge-contrast-audit.md` — Badge/pill/chip inventory (299 instances, 62 files)
- `docs/UX/ui_consistency_audit_pass_a_2025-11-05.md` — Token/provider/specificity audit
- `docs/UX/patches/pass_a/` — 4 patch diffs (provider order, token bridge, scoped globals, component tokens)
- `docs/audits/GRID_COMPONENT_INVENTORY.md` — Grid/table library inventory

### Key Source Files

- `src/styles/coreui-theme.css` — Primary token definitions
- `src/styles/tokens.css` — Extended token definitions
- `src/app/layout.tsx` — Provider/stylesheet load order
- `src/components/ui/` — Base primitives (24 files)
- `src/components/ui/landscape/` — Landscape-specific variants
- `tailwind.config.js` — Tailwind theme extensions with undefined vars

---

*Generated 2026-03-05. Next audit should verify Phase 1-2 completion.*
