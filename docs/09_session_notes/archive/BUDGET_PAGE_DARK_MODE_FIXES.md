# Budget Page Dark Mode Fixes

**Date**: 2025-01-16
**Status**: ✅ Complete
**Files Modified**: 2

## Summary

Fixed dark mode rendering issues in the budget page where JSX styles used hardcoded hex colors and `@media (prefers-color-scheme: dark)` instead of CoreUI theme data attributes. This prevented proper theme switching between light and dark modes.

## Issues Resolved

### Issue 1: Budget Page JSX Styles Not Theme-Aware
**File**: `src/app/projects/[projectId]/budget/page.tsx`

**Problem**: Entire `<style jsx>` block (lines 162-370) used hardcoded hex colors and media queries instead of CSS variables:
- Page background: `#f8fafc` → not theme-aware
- Card backgrounds: `white` → not theme-aware
- Borders: `#e5e7eb`, `#d1d5db` → not theme-aware
- Text colors: `#6b7280`, `#374151`, `#111827` → not theme-aware
- Used `@media (prefers-color-scheme: dark)` which doesn't respect user's theme selection

**Solution**: Replaced all 50+ hardcoded color instances with CoreUI CSS variables:

```jsx
// BEFORE
.budget-page {
  background: #f8fafc;
}

.budget-tabs {
  background: white;
}

.summary-label {
  color: #6b7280;
}

@media (prefers-color-scheme: dark) {
  .budget-page {
    background: #0f172a;
  }
}

// AFTER
.budget-page {
  background: var(--cui-body-bg);
}

.budget-tabs {
  background: var(--cui-card-bg);
}

.summary-label {
  color: var(--cui-secondary-color);
}

/* No media query needed - CSS variables adapt automatically */
```

**Key Changes**:
| Old Value | New Value | Purpose |
|-----------|-----------|---------|
| `#f8fafc` | `var(--cui-body-bg)` | Page background |
| `white` / `#1e293b` | `var(--cui-card-bg)` | Card/panel backgrounds |
| `#e5e7eb` / `#334155` | `var(--cui-border-color)` | Borders |
| `#6b7280` | `var(--cui-secondary-color)` | Secondary text |
| `#111827` / `#e2e8f0` | `var(--cui-body-color)` | Primary text |
| `#f3f4f6` / `#334155` | `var(--cui-tertiary-bg)` | Hover backgrounds |
| `#3b82f6` | `var(--cui-primary)` | Primary actions |
| `#10b981` | `var(--cui-success)` | Positive values |
| `#ef4444` | `var(--cui-danger)` | Negative values |

**Lines Modified**: 162-335 (entire style block)

---

### Issue 2: GroupRow Category Headers Using Bootstrap Classes
**File**: `src/components/budget/custom/GroupRow.tsx`

**Problem**: Line 115 used Bootstrap's `className="table-light"` which provides a light gray background in light mode but doesn't adapt properly to dark mode.

**Solution**: Removed the hardcoded class and added inline style with CSS variable:

```tsx
// BEFORE
<tr
  className="table-light"
  style={{
    cursor: 'pointer',
    borderTop: '2px solid var(--cui-border-color)',
    borderBottom: '1px solid var(--cui-border-color)',
  }}
  onClick={onToggle}
>

// AFTER
<tr
  style={{
    cursor: 'pointer',
    backgroundColor: 'var(--cui-tertiary-bg)',
    borderTop: '2px solid var(--cui-border-color)',
    borderBottom: '1px solid var(--cui-border-color)',
  }}
  onClick={onToggle}
>
```

**Note**: The `LEVEL_COLORS` constants (lines 27-32) with hardcoded hex colors were intentionally kept as they represent semantic color indicators for category levels, not theme-dependent UI elements.

**Lines Modified**: 115-117

---

## CSS Variables Reference

### CoreUI Theme Variables Used
```css
/* Backgrounds */
--cui-body-bg          /* Main page background */
--cui-card-bg          /* Card/panel backgrounds */
--cui-tertiary-bg      /* Subtle backgrounds (hover states, group rows) */

/* Text Colors */
--cui-body-color       /* Primary text */
--cui-secondary-color  /* Secondary/muted text */

/* Borders */
--cui-border-color     /* Standard borders */

/* Semantic Colors */
--cui-primary          /* Primary actions/highlights */
--cui-primary-rgb      /* Primary color as RGB values (for rgba) */
--cui-success          /* Positive indicators */
--cui-danger           /* Negative indicators */
```

### How CSS Variables Work with Themes
CoreUI's theme system uses the `[data-coreui-theme]` attribute on `<html>`:
- Light mode: `<html data-coreui-theme="light">`
- Dark mode: `<html data-coreui-theme="dark">`

The `coreui-theme.css` file defines different values for each theme:
```css
:root {
  --cui-body-bg: #ffffff;
  --cui-body-color: #212529;
}

[data-coreui-theme='dark'] {
  --cui-body-bg: #1a1d20;
  --cui-body-color: #e9ecef;
}
```

Components using CSS variables automatically adapt when the theme changes.

---

## Systematic Issue: Codebase-Wide Pattern

⚠️ **This same problem exists across many pages:**

### Common Anti-Patterns Found
1. **JSX `<style>` blocks with hardcoded colors**
   - Example: Budget page had 50+ instances
   - Found in: Dashboard, DMS, Valuation, Sales, Planning pages

2. **`@media (prefers-color-scheme: dark)` instead of data attributes**
   - Ignores user's explicit theme selection
   - Should use `[data-coreui-theme='dark']` selector instead

3. **Bootstrap utility classes without theme awareness**
   - `table-light`, `bg-white`, `bg-gray-*`, `text-gray-*`
   - These don't adapt to CoreUI's theme system

4. **Inline styles with hardcoded hex colors**
   - Should use CSS variables or theme-aware classes

### Scope of Problem
Per the [UI Colors Inventory](./landscape_ui_colors_inventory.md):
- **Total hardcoded color instances**: 3,499
- **Fixed in this session**: ~50-75 (budget page + group row)
- **Remaining**: ~3,275 instances
- **Completion**: ~7-8%

### Priority Pages for Migration
Based on user-facing visibility:
1. Dashboard (high traffic)
2. Project Overview pages
3. Sales & Absorption
4. Valuation / Comparables
5. Planning / Project Canvas
6. Budget (✅ completed)
7. Operating Expenses (✅ completed)

---

## Verification Checklist

✅ Budget page background adapts to theme
✅ Tab buttons visible in both themes
✅ Summary cards readable in dark mode
✅ Budget grid wrapper has proper contrast
✅ Category group rows have subtle background
✅ All text colors have sufficient contrast
✅ Hover states work in both themes
✅ No `@media (prefers-color-scheme)` queries remain

---

## Related Documentation

- [CoreUI Theme Migration Status](./COREUI_THEME_MIGRATION_STATUS.md) - Overall migration progress
- [UI Colors Inventory](./landscape_ui_colors_inventory.md) - Complete catalog of 3,499 hardcoded instances
- [Budget Grid Dark Mode Fixes](./BUDGET_GRID_DARK_MODE_FIXES.md) - Previous budget grid fixes (mode selector, accordions)

---

## Next Steps

### Recommended Migration Order
1. **Identify high-impact pages** - Pages users see most often
2. **Extract common patterns** - Create reusable components for repeated UI elements
3. **Build theme-aware components** - Replace hardcoded JSX styles with proper components
4. **Create migration script** - Automate replacement of common patterns
5. **Establish linting rules** - Prevent new hardcoded colors from being introduced

### Technical Debt
Consider moving all JSX `<style>` blocks to:
- External CSS files with theme selectors
- CSS Modules for component-scoped styles
- Styled-components or CSS-in-JS with theme support
- CoreUI components instead of custom markup

This would make theme management more maintainable and prevent similar issues.
