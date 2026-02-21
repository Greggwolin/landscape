# Badge / Pill / Chip Contrast Audit — Full Inventory

**Purpose:** Identify every badge instance app-wide so CoreUI color tokens can be tuned for light + dark mode legibility.

**Methodology:** Direct codebase grep of all CBadge, SemanticBadge, PropertyTypeBadge, StatusChip, and MediaBadgeChips usage across 62 files (~299 instances).

---

## Classification Key

| Color Method | Description | Dark-Mode Risk |
|---|---|---|
| **Semantic** | Goes through `SemanticBadge` → `resolveSemanticVariant()` → CoreUI variant | Fix at theme level (centralized) |
| **Raw CoreUI** | Direct `CBadge color="X"` — no abstraction layer | Fix at theme level but must audit each usage for `textColor` overrides |
| **Dynamic Map** | Uses a JS object to pick CoreUI color (e.g., `STATUS_COLORS[item.status]`) | Same as Raw, but map values need auditing |
| **CSS Variable** | Uses inline `style` with CSS vars (PropertyTypeBadge) | Fix at token level in `tokens.css` |
| **Hardcoded** | Inline hex/rgb values | Must fix per-instance |

---

## 1. PROJECT PAGE (Header / Context Bar / Activity)

### Active Project Bar
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Project bar — perspective selector | Raw CoreUI | `info` | Perspective label (e.g., "Appraiser") | default |
| Project bar — purpose selector | Raw CoreUI | `primary` | Purpose label (e.g., "Valuation") | default |

### Project Context Bar
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Context bar — project type | CSS Variable | `PropertyTypeBadge` (token-driven) | Property type code (MF, LAND, etc.) | rounded-pill |

### Dashboard — Project Cards
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Project card — type indicator | CSS Variable | `PropertyTypeBadge` | Property type | rounded-pill |

### Dashboard — Triage Modal
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Document triage — confidence | Raw CoreUI | `success` | "High confidence" | default |

---

## 2. PROPERTY TAB — RENT ROLL

| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Rent Roll table — status column | Semantic | `intent="status"` / `value={occupancyStatus}` | Occupied, Vacant, Notice, etc. | default |

---

## 3. PROPERTY TAB — PHYSICAL DESCRIPTION

| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Physical Description — header | Semantic | `intent="status"` / `value="physical-complete-{level}"` | "X% complete" | default |

---

## 4. PROPERTY TAB — FLOOR PLAN MATRIX

| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Floor Plan Matrix — header | Semantic | `intent="category"` / `value={dataSource}` | "From Rent Roll" or "From Unit Types" | default |

---

## 5. BUDGET GRID

| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Expandable details row — field count | Raw CoreUI | `warning` (standard mode) / `danger` (detail mode) | Field count number | default |

---

## 6. LANDSCAPER PANEL

### Unit Mix Accordion
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Unit mix header — type count | Raw CoreUI | `primary` | "X types" | rounded-pill |
| Unit mix header — unit count | Raw CoreUI | `info` | "X total units" | rounded-pill |
| Unit mix header — accepted state | Raw CoreUI | `success` | "accepted" | rounded-pill |
| Unit mix row — confidence | Dynamic Map | `getConfidenceColor(confidence)` | "X% conf" | rounded-pill |

### Extraction Queue
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Queue header — actionable count | Raw CoreUI | `warning` | Count number | rounded-pill |
| Queue row — document status | Dynamic Map | `statusBadgeColor(item.status)` | Status text | sm |

### Extraction Review Modal
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Summary bar — pending count | Raw CoreUI | `warning` | "X pending" | rounded-pill |
| Summary bar — conflict count | Raw CoreUI | `danger` | "X conflicts" | rounded-pill |
| Summary bar — validated count | Raw CoreUI | `info` | "X validated" | rounded-pill |
| Category accordion — item count | Raw CoreUI | `primary` | Count number | rounded-pill |
| Category accordion — conflict count | Raw CoreUI | `danger` | "X conflicts" | rounded-pill |
| Category accordion — accepted count | Raw CoreUI | `success` | "X accepted" | rounded-pill |
| Footer — unresolved conflict count | Raw CoreUI | `warning` | "X conflicts to resolve" | rounded-pill |

### Extraction Field Row
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Field row — confidence percentage | Dynamic Map | `getConfidenceColor(field.confidence)` | "X%" | rounded-pill, sm |

### Field Mapping Interface
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Mapping header — mapped count | Raw CoreUI | `success` | "X mapped" | default |
| Mapping header — skipped count | Raw CoreUI | `secondary` | "X skipped" | default |
| Mapping header — new columns | Raw CoreUI | `info` | "X new columns" | default |
| Mapping row — new column indicator | Raw CoreUI | `info` | "New Column" | default |

### Mutation Proposal Card
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Proposal header — pending count | Raw CoreUI | `dark` | Count number | rounded-pill |
| Proposal header — high-risk count | Raw CoreUI | `danger` | "X high-risk" | rounded-pill |
| Proposal row — risk indicator | Raw CoreUI | `danger` | "High Risk" | sm |

### Scenario History Panel
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Scenario card — status | Dynamic Map | `statusColor(scenario.status)` | Status text | default |
| Scenario card — tags | Raw CoreUI | `light` + `textColor="dark"` | Tag text | default |

### KPI Definition Manager
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| KPI list — ordinal number | Raw CoreUI | `primary` | Index number | rounded-pill |

### Advice Adherence Panel
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Panel header — variance count | Semantic | `intent="status"` / `value="secondary"` | Count number | default |

### Landscaper Instructions Panel
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Instruction row — type | Dynamic Map | `TYPE_COLORS[instruction_type]` | Instruction type | sm |
| Instruction row — scope (project) | Raw CoreUI | `dark` | "Project" | sm |
| Instruction row — scope (global) | Raw CoreUI | `light` + `textColor="dark"` | "Global" | sm |
| Instruction row — inactive | Raw CoreUI | `danger` | "Inactive" | sm |

### Media Summary Card
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Media summary — type badges | Dynamic Map | `info.badge_color` (from API data) | "X Photos", "X Plans", etc. | rounded-pill |

---

## 7. ACQUISITION LEDGER

| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Ledger — applied to purchase | Semantic | `intent="action-state"` / `value="yes"/"no"` | Yes/No | default |
| Ledger — conditional status | Semantic | `intent="action-state"` / `value="conditional"/"firm"` | Conditional/Firm | default |

---

## 8. SALES TAB

| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Sales content — clear filters | Raw CoreUI | `secondary` | "Clear Filters" | default |
| Transaction column — parcel count | Raw CoreUI | `secondary` | "X parcels" | default |

---

## 9. ANALYSIS / CASH FLOW

| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Cash flow — select all | Raw CoreUI | `secondary` | "Select All" | default |
| Validation report — clear filters | Raw CoreUI | `secondary` | "Clear Filters" | default |

---

## 10. DOCUMENT MANAGEMENT

### Document Card (Ingestion)
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Document card — processing status | Dynamic Map | `config.badgeColor` | Status text | rounded-pill |

### Media Badge Chips (DMS Filters)
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Accordion filters — media type chips | Hardcoded in component | `primary`/`success`/`danger`/`warning`/`info`/`secondary` | Photo/Plan/Map/Chart/Rendering/Other counts | rounded-pill |

---

## 11. CONTACTS PAGE

| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Filter buttons — count | Semantic | `intent="navigation-meta"` / `value="active"/"inactive"` | Filter count | default |
| Contact table — type | Semantic | `intent="category"` / `value={contact_type}` | Contact type | default |
| Relationship manager — count | Raw CoreUI | `secondary` | Relationship count | default |
| Relationship manager — type icon | Dynamic Map | `CONTACT_TYPE_COLORS[type]` | Icon badge | default |

---

## 12. ADMIN PAGES

### Changelog
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Entry row — published | Raw CoreUI | `success` | "Published" | default |
| Entry row — draft | Raw CoreUI | `secondary` | "Draft" | default |

### Feedback
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Detail — module name | Raw CoreUI | `dark` | Module name | default |
| Detail — category | Dynamic Map | `CATEGORY_COLORS[category]` | Category label | default |
| Table row — status | Dynamic Map | `STATUS_COLORS[status]` | Status label | default |
| Table row — category | Dynamic Map | `CATEGORY_COLORS[category]` | Category label | default |
| Table row — report count | Raw CoreUI | `primary` | Count number | default |

### Contact Roles
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Role table — display order | Raw CoreUI | `light` + `textColor="dark"` | Order number | default |
| Role table — category | Dynamic Map | `ROLE_CATEGORY_COLORS[category]` | Category name | default |
| Role table — active status | Raw CoreUI | `success`/`secondary` | "Active"/"Hidden" | default |

### Preferences — UOM
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| UOM legend — active | Raw CoreUI | `success` | "Active" | rounded-pill |
| UOM legend — inactive | Raw CoreUI | `secondary` | "Inactive" | rounded-pill |
| UOM row — inactive label | Raw CoreUI | `secondary` | "Inactive" | sm |
| UOM row — measure category | Semantic | `intent="category"` / `value={measure_category}` | Category name | default |
| UOM row — usage contexts | Semantic | `intent="category"` / `value={context}` | Context label | default |

### Preferences — Categories
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Category detail — tags | Semantic | `intent="user-tag"` / `value={tag_name}` | Tag name | default |
| Add category modal — tags | Semantic | `intent="user-tag"` / `value={tag_name}` | Tag name | default |

### Preferences — Picklist Editor
| Location | Color Method | Variant/Value | Displays | Shape |
|---|---|---|---|---|
| Picklist — non-property parent | Raw CoreUI | `secondary` | Parent code | rounded-pill |

---

## HIGH-RISK DARK-MODE ITEMS (Priority Fix List)

These are the badges most likely to have contrast issues based on your screenshots:

| CoreUI Variant | Issue in Dark Mode | Instance Count | Fix Location |
|---|---|---|---|
| `success` (green) | Green BG + white text washes out on dark surfaces | ~15 | `--cui-success` / `--cui-success-rgb` in tokens.css |
| `info` (cyan) | Cyan BG lacks contrast on dark | ~12 | `--cui-info` / `--cui-info-rgb` |
| `warning` (yellow) | Yellow BG + dark text — text disappears on dark | ~10 | `--cui-warning` + needs `textColor` override |
| `light` + `textColor="dark"` | Light BG on dark surface = invisible | ~6 | Needs complete rethink for dark mode |
| `dark` | Dark BG on dark surface = invisible | ~5 | Needs lighter dark-mode variant |
| Dynamic Maps | Uncontrolled — whatever the map returns | ~8 maps | Must audit each map's color values |
| `PropertyTypeBadge` | CSS var-driven — depends on token resolution | ~4 | Check `--prop-type-*` vars in dark mode |

---

## 13. TAILWIND-ONLY BADGES (No CoreUI Involvement)

These bypass CoreUI entirely — theme variable fixes won't reach them.

### Production Pages — Hardcoded Light-Mode Tailwind

| Location | Classes | Displays | Dark-Mode Risk |
|---|---|---|---|
| DevStatus — warning pills | `bg-yellow-100 text-yellow-800 border-yellow-200` | Warning labels | HIGH — no dark variant |
| DevStatus — error pills | `bg-red-100 text-red-800 border-red-200` | Error labels | HIGH — no dark variant |
| DevStatus — info pills | `bg-blue-100 text-blue-800 border-blue-200` | Info labels | HIGH — no dark variant |
| DevStatus — feature pills | `bg-purple-100 text-purple-800 border-purple-200` | Feature labels | HIGH — no dark variant |
| CompletenessModal — complete | `bg-green-100 text-green-700` | "Complete" | HIGH — no dark variant |
| CompletenessModal — partial | `bg-yellow-100 text-yellow-700` | "Partial" | HIGH — no dark variant |
| CompletenessModal — missing | `bg-red-100 text-red-700` | "Missing" | HIGH — no dark variant |
| DocumentReview — entity tags | `bg-blue-100 text-blue-700` | Entity type tags | HIGH — no dark variant |
| DMS ResultsTable — tags | `bg-blue-100 text-blue-800` | Search result tags | HIGH — no dark variant |
| PlatformKnowledgeModal — source | `border-blue-200 bg-blue-50 text-blue-700` | Source indicator | HIGH — no dark variant |
| PropertyTab — detail indicator | `bg-blue-900/30 text-blue-300 border-blue-700/40` | Detail badge | LOW — dark-first design |
| ColumnChooser — field type | `bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300` | Column type | OK — has dark variant |
| New Project LandscaperPanel | `bg-emerald-100 text-emerald-700` | Status chip | HIGH — no dark variant |

### Production Pages — Raw Bootstrap `.badge` Class

| Location | Classes | Displays | Dark-Mode Risk |
|---|---|---|---|
| LoanCard — loan structure | `badge bg-primary` / `badge bg-success` | "TERM" / "REVOLVING" | MEDIUM — uses Bootstrap vars |
| ProjectTabMap — label | `badge bg-light text-dark` | Map label | HIGH — same as `light`+`textColor="dark"` |
| SalesCompDetailModal — comp number | `badge bg-danger` | "Comp X" | MEDIUM — uses Bootstrap vars |
| PlatformKnowledgeChatModal — year | `badge bg-secondary` | Publication year | LOW — secondary is usually fine |

### BudgetGridDark — Dark-Mode-Only Tailwind (Inverse Problem)

| Location | Classes | Displays | Risk |
|---|---|---|---|
| Grid header — filter pills | `bg-blue-900/40 text-blue-300 border-blue-700` | Filter tags | Would break in LIGHT mode |
| Grid header — status pills | `bg-green-900/40 text-green-300 border-green-700` | Status tags | Would break in LIGHT mode |
| Grid header — category pills | `bg-orange-900/40 text-orange-300 border-orange-700` | Category tags | Would break in LIGHT mode |
| Grid header — type pills | `bg-purple-900/40 text-purple-300 border-purple-700` | Type tags | Would break in LIGHT mode |

### Non-Badge Decorative Elements (Low Priority)

Small status dots and avatar circles that don't carry text — contrast is less critical:

- Navigation.tsx — 2.5px status dots (`rounded-full bg-current`)
- DMS upload Queue — upload state dots (`bg-green-500`, `bg-red-500`)
- ProjectSetupWizard — step dot (`bg-blue-500`)
- UserManagementPanel — avatar circles (`bg-blue-600`)
- Admin users page — avatar circles (`bg-blue-600`)
- NewProjectDropZone — animation dots (`bg-amber-500/20`, `bg-green-500`, `bg-red-500/10`)

---

## RECOMMENDED FIX STRATEGY

1. **CoreUI theme overrides** — In your dark mode CSS (`:root[data-coreui-theme="dark"]`), override `--cui-success`, `--cui-info`, `--cui-warning`, etc. with higher-contrast versions. This fixes ~80% of badges in one shot.

2. **`light` + `textColor="dark"` pattern** — This is fundamentally broken in dark mode. Either swap to `secondary` in dark mode or add a CSS override that inverts the logic.

3. **Dynamic Maps** — Audit these 8 color maps: `ROLE_CATEGORY_COLORS`, `CATEGORY_COLORS`, `STATUS_COLORS`, `CONTACT_TYPE_COLORS`, `TYPE_COLORS`, `getConfidenceColor()`, `statusBadgeColor()`, `statusColor()`. Each needs dark-mode-safe values.

4. **Semantic badges** — These are already centralized through `resolveSemanticVariant()`. Once you fix the CoreUI theme variables, all ~40 semantic badges auto-fix.

5. **PropertyTypeBadge** — Check `--prop-type-{code}-bg` and `--prop-type-{code}-text` tokens in dark mode context.

6. **Tailwind hardcoded pills (~13 instances, HIGH priority)** — These use patterns like `bg-green-100 text-green-700` with no `dark:` variants. Two options: (a) add `dark:` variants to each instance (e.g., `dark:bg-green-900 dark:text-green-300`), or (b) refactor them to use CoreUI's CBadge so they inherit theme fixes automatically. Option (b) is better long-term but more work.

7. **Raw Bootstrap `.badge` class (~4 instances)** — Replace with `CBadge` component for consistency. The `badge bg-light text-dark` in ProjectTabMap and `badge bg-primary`/`bg-success` in LoanCard are the worst offenders.

8. **BudgetGridDark (~4 instances)** — These are the inverse problem: dark-only Tailwind that breaks in light mode. If this page is supposed to support both themes, each needs `dark:` / light-mode counterparts.
