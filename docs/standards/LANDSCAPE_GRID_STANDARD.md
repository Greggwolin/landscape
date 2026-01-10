# Landscape Grid Standard

> **Version:** 1.0
> **Date:** 2026-01-09
> **Purpose:** Define ARGUS-style density and interaction patterns for all Landscape data grids

---

## 1. Overview

This specification establishes a unified visual and interaction standard for all tabular data entry components in Landscape. The goal is to achieve ARGUS Enterprise-level information density while maintaining modern web usability.

**Applies to:**
- Budget grids (BudgetDataGrid, future OpEx grids)
- Rent roll grids (RentRollGrid, FloorplansGrid)
- Sales tables (ParcelSalesTable, PricingTable)
- Capitalization tables (all 7 components)
- Any future editable data grids

**Does NOT apply to:**
- Read-only display tables (CashFlowTable, reports)
- Dashboard summary cards
- Navigation lists

---

## 2. Row Density

### 2.1 Row Heights

| Context | Height | Use Case |
|---------|--------|----------|
| **Standard** | 28px | Default for all data grids |
| **Compact** | 24px | High-density views (100+ rows visible) |
| **Comfortable** | 32px | Touch-friendly or accessibility mode |

**Current state:** Most grids use 36-40px rows
**Target state:** 28px default with user preference toggle

### 2.2 Cell Padding

```css
/* Standard cell padding */
.ls-grid-cell {
  padding: 4px 8px;      /* vertical | horizontal */
  line-height: 1.2;
}

/* Compact mode */
.ls-grid-cell--compact {
  padding: 2px 6px;
  line-height: 1.1;
}
```

### 2.3 Typography

| Element | Font Size | Weight | Font Family |
|---------|-----------|--------|-------------|
| Header text | 11px | 600 (semibold) | System UI / Inter |
| Cell text | 12px | 400 (normal) | System UI / Inter |
| Group row text | 12px | 600 (semibold) | System UI / Inter |
| Totals row | 12px | 700 (bold) | System UI / Inter |

**Numeric alignment:** Right-aligned with tabular figures (`font-variant-numeric: tabular-nums`)

---

## 3. Column Structure

### 3.1 Column Header Groups

ARGUS uses two-tier headers for logical grouping. Example from Expenses grid:

```
┌─────────────────────────────┬───────────────────────────────────┬─────────────────┐
│          General            │             Amount                │     Timing      │
├──────────┬──────────┬───────┼─────────┬─────────┬───────┬───────┼────────┬────────┤
│ Parent   │ Account  │ Name  │How Input│Amount 1 │ Freq  │Amount2│Start   │  Date  │
│ Account  │ Number   │       │         │         │       │       │Date    │        │
└──────────┴──────────┴───────┴─────────┴─────────┴───────┴───────┴────────┴────────┘
```

### 3.2 Column Widths

| Column Type | Min Width | Default | Max Width |
|-------------|-----------|---------|-----------|
| Row number / checkbox | 40px | 40px | 40px |
| Status indicator | 30px | 30px | 30px |
| Short text (code, ID) | 60px | 80px | 120px |
| Medium text (name) | 100px | 150px | 250px |
| Long text (description) | 150px | 200px | 400px |
| Number (amount) | 80px | 100px | 140px |
| Percentage | 60px | 70px | 90px |
| Date | 90px | 100px | 120px |
| Dropdown | 80px | 120px | 200px |

### 3.3 Frozen Columns

First 1-3 columns should be frozen (sticky) for horizontal scrolling:
- Row number (if shown)
- Primary identifier (name, tenant, account)
- Status indicator (if applicable)

---

## 4. Color System

### 4.1 Cell Type Colors (EstateMaster Convention)

| Cell Type | Text Color | Background | Use Case |
|-----------|------------|------------|----------|
| **Input** | `#1a5fb4` (blue) | transparent | User-editable fields |
| **Calculated** | `#2e7d32` (green) | `#f5f5f5` | Computed values |
| **Dropdown** | `#7b1fa2` (purple) | transparent | Select/picker fields |
| **Locked** | `#757575` (gray) | `#eeeeee` | Read-only, disabled |
| **Error** | `#d32f2f` (red) | `#ffebee` | Validation failure |
| **Warning** | `#f57c00` (orange) | `#fff3e0` | Attention needed |

### 4.2 Row States

| State | Background | Border | Notes |
|-------|------------|--------|-------|
| Default (odd) | `#ffffff` | none | Light mode |
| Default (even) | `#fafafa` | none | Zebra striping |
| Hover | `#f5f5f5` | none | Mouse over |
| Selected | `#e3f2fd` | none | Single selection |
| Active/Editing | `#e3f2fd` | `2px solid #1976d2` | Currently editing |
| Group header | `#eceff1` | `1px solid #cfd8dc` | Category grouping |
| Totals | `#e8eaf6` | `2px solid #5c6bc0` top | Summary row |

### 4.3 Dark Mode Equivalents

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Grid background | `#ffffff` | `#1e1e1e` |
| Cell text | `#212121` | `#e0e0e0` |
| Input text (blue) | `#1a5fb4` | `#64b5f6` |
| Calculated (green) | `#2e7d32` | `#81c784` |
| Dropdown (purple) | `#7b1fa2` | `#ba68c8` |
| Row hover | `#f5f5f5` | `#2d2d2d` |
| Selected row | `#e3f2fd` | `#1e3a5f` |
| Border color | `#e0e0e0` | `#424242` |

---

## 5. Interaction Patterns

### 5.1 Edit Mode Triggers

| Action | Result |
|--------|--------|
| Single click on editable cell | Enter edit mode |
| Double click on read-only cell | No action (or show tooltip) |
| F2 key on focused cell | Enter edit mode |
| Enter key while editing | Commit and move down |
| Tab key while editing | Commit and move right |
| Escape key while editing | Cancel changes |

### 5.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Up/Down | Move focus to adjacent row |
| Arrow Left/Right | Move focus to adjacent cell |
| Tab | Move to next editable cell |
| Shift+Tab | Move to previous editable cell |
| Enter | Edit current cell / Commit edit |
| Escape | Cancel edit / Clear selection |
| Ctrl+C | Copy cell value |
| Ctrl+V | Paste into cell |
| Ctrl+Z | Undo last change |
| Ctrl+Shift+Z | Redo |
| Home | Go to first cell in row |
| End | Go to last cell in row |
| Ctrl+Home | Go to first cell in grid |
| Ctrl+End | Go to last cell in grid |
| Space | Toggle checkbox / Open dropdown |

### 5.3 Cell Editor Types

| Data Type | Editor | Trigger | Commit |
|-----------|--------|---------|--------|
| Text | Inline input | Click or type | Blur, Enter, Tab |
| Number | Inline input (numeric) | Click or type | Blur, Enter, Tab |
| Currency | Inline input + formatting | Click or type | Blur, Enter, Tab |
| Percentage | Inline input + % suffix | Click or type | Blur, Enter, Tab |
| Date | Date picker popup | Click | Selection |
| Dropdown | Select popup | Click or Space | Selection |
| Searchable dropdown | Combobox popup | Click or type | Selection |

### 5.4 Auto-Save Behavior

```
User edits cell → 500ms debounce → API PATCH →
  Success: Show subtle checkmark (1s fade)
  Failure: Show error indicator, enable retry
```

- No explicit "Save" button required
- Visual feedback: subtle spinner during save, checkmark on success
- Optimistic updates: UI reflects change immediately
- Rollback on error with toast notification

---

## 6. Visual Components

### 6.1 Header Row

- Sort indicator: triangle (ascending) / triangle (descending) / none (unsorted)
- Resize handle: 4px hit area on right edge of header
- Right-click: Column context menu (hide, freeze, sort)

### 6.2 Group Row (Collapsible)

- Expand/collapse icon: triangle down (expanded) / triangle right (collapsed)
- Group name spans most columns
- Subtotal right-aligned in amount column
- Indentation: 16px per nesting level

### 6.3 Totals Row

- Bold text
- Top border (2px)
- Background tint
- Sticky to bottom of viewport (optional)

### 6.4 Inline Dropdown

- Dropdown arrow inside cell, right-aligned
- Opens below cell (or above if near bottom)
- Searchable for lists > 10 items
- Keyboard: type to filter, arrows to navigate, Enter to select

### 6.5 Validation Indicators

- Red border (2px) for invalid cells
- Red background tint
- Error icon or red dot indicator
- Tooltip with validation message

---

## 7. CSS Custom Properties

Define these CSS variables at the grid container level:

```css
.ls-grid {
  /* Dimensions */
  --ls-grid-row-height: 28px;
  --ls-grid-header-height: 32px;
  --ls-grid-cell-padding-x: 8px;
  --ls-grid-cell-padding-y: 4px;

  /* Typography */
  --ls-grid-font-size: 12px;
  --ls-grid-header-font-size: 11px;
  --ls-grid-font-family: system-ui, -apple-system, 'Inter', sans-serif;

  /* Colors - Light Mode */
  --ls-grid-bg: #ffffff;
  --ls-grid-bg-alt: #fafafa;
  --ls-grid-bg-hover: #f5f5f5;
  --ls-grid-bg-selected: #e3f2fd;
  --ls-grid-bg-group: #eceff1;
  --ls-grid-bg-totals: #e8eaf6;

  --ls-grid-border: #e0e0e0;
  --ls-grid-border-focus: #1976d2;

  --ls-grid-text: #212121;
  --ls-grid-text-input: #1a5fb4;
  --ls-grid-text-calculated: #2e7d32;
  --ls-grid-text-dropdown: #7b1fa2;
  --ls-grid-text-disabled: #757575;
  --ls-grid-text-error: #d32f2f;

  /* Transitions */
  --ls-grid-transition: 150ms ease;
}

/* Dark mode overrides */
.dark .ls-grid,
[data-coreui-theme="dark"] .ls-grid {
  --ls-grid-bg: #1e1e1e;
  --ls-grid-bg-alt: #262626;
  --ls-grid-bg-hover: #2d2d2d;
  --ls-grid-bg-selected: #1e3a5f;
  --ls-grid-bg-group: #2d2d2d;
  --ls-grid-bg-totals: #2d2d2d;

  --ls-grid-border: #424242;
  --ls-grid-border-focus: #64b5f6;

  --ls-grid-text: #e0e0e0;
  --ls-grid-text-input: #64b5f6;
  --ls-grid-text-calculated: #81c784;
  --ls-grid-text-dropdown: #ba68c8;
  --ls-grid-text-disabled: #9e9e9e;
  --ls-grid-text-error: #ef5350;
}
```

---

## 8. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial render (100 rows) | < 100ms | React DevTools Profiler |
| Initial render (1000 rows) | < 300ms | With virtualization |
| Cell edit response | < 50ms | Time to show edit state |
| Auto-save round trip | < 500ms | API call + confirmation |
| Scroll performance | 60 fps | No jank during scroll |
| Memory (10k rows) | < 50MB | Chrome DevTools heap |

---

## 9. Accessibility

### 9.1 ARIA Attributes

```html
<table role="grid" aria-label="Budget Line Items">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-selected="true">
      <td role="gridcell" aria-readonly="false">
        <input aria-label="Amount for Property Insurance" />
      </td>
    </tr>
  </tbody>
</table>
```

### 9.2 Focus Management

- Visible focus ring (2px blue outline)
- Focus trapped within grid during keyboard navigation
- Skip link to exit grid
- Screen reader announcements for cell changes

### 9.3 Color Contrast

All text colors must meet WCAG AA (4.5:1 for normal text):

| Color | Light BG Ratio | Dark BG Ratio | Status |
|-------|----------------|---------------|--------|
| Input blue (#1a5fb4) | 5.2:1 | - | Pass |
| Input blue dark (#64b5f6) | - | 8.1:1 | Pass |
| Calculated green (#2e7d32) | 4.8:1 | - | Pass |
| Dropdown purple (#7b1fa2) | 6.1:1 | - | Pass |

---

## 10. Migration Checklist

For each grid migration:

- [ ] Apply CSS custom properties
- [ ] Reduce row height to 28px
- [ ] Apply cell type color coding (blue/green/purple)
- [ ] Add keyboard navigation hook
- [ ] Convert modal editing to inline (if applicable)
- [ ] Add column grouping headers (if applicable)
- [ ] Add frozen columns for horizontal scroll
- [ ] Verify dark mode colors
- [ ] Add auto-save with visual feedback
- [ ] Test with 100+ rows for performance
- [ ] Document any deviations from standard

---

## 11. Reference Implementation

**Primary POC:** BudgetDataGrid (`src/components/budget/BudgetDataGrid.tsx`)

This component serves as the reference implementation for the Landscape Grid Standard.

---

*Last updated: 2026-01-09*
