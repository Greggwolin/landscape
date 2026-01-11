# Budget Grid Dark Mode Rendering Fixes

**Date**: 2025-01-16
**Status**: ✅ Complete
**Files Modified**: 3

## Summary

Fixed dark mode rendering issues in the budget grid page, specifically:
1. Accordion headers showing hardcoded light backgrounds instead of theme-aware colors
2. Mode selector buttons (Napkin/Standard/Detail) rendering with solid backgrounds instead of outline style

## Issues Resolved

### Issue 1: Accordion Headers Not Theme-Aware
**File**: `src/components/budget/custom/ExpandableDetailsRow.tsx`

**Problem**: Accordion headers used hardcoded Bootstrap classes (`bg-warning bg-opacity-10`, `bg-danger bg-opacity-10`) that didn't adapt to dark mode.

**Solution**: Replaced hardcoded classes with CSS variables using rgba with opacity:
```tsx
backgroundColor: group.mode === 'standard'
  ? 'rgba(var(--cui-warning-rgb), 0.1)'
  : 'rgba(var(--cui-danger-rgb), 0.1)',
```

**Lines Modified**: 94-96

---

### Issue 2: Mode Selector Buttons - Incorrect Variant Usage
**File**: `src/components/budget/ModeSelector.tsx`

**Problem**: Active buttons were using `variant={undefined}` which renders as solid CoreUI buttons, creating solid yellow/green/red backgrounds in dark mode. The design intent was for ALL buttons to use outline style, with active state differentiated through subtle styling.

**Root Cause**:
```tsx
// WRONG - variant={undefined} renders solid button
<CButton
  color="warning"
  variant={activeMode === 'standard' ? undefined : 'outline'}
  onClick={() => onModeChange('standard')}
  size="sm"
>
```

**Solution**: Changed ALL buttons to always use `variant="outline"` with active state via className:
```tsx
export default function ModeSelector({ activeMode, onModeChange }: Props) {
  return (
    <CButtonGroup role="group" className="mb-3">
      <CButton
        color="success"
        variant="outline"  // ALWAYS outline
        onClick={() => onModeChange('napkin')}
        size="sm"
        className={activeMode === 'napkin' ? 'active' : ''}
      >
        Napkin (9 fields)
      </CButton>
      <CButton
        color="warning"
        variant="outline"
        onClick={() => onModeChange('standard')}
        size="sm"
        className={activeMode === 'standard' ? 'active' : ''}
      >
        Standard (28 fields)
      </CButton>
      <CButton
        color="danger"
        variant="outline"
        onClick={() => onModeChange('detail')}
        size="sm"
        className={activeMode === 'detail' ? 'active' : ''}
      >
        Detail (49 fields)
      </CButton>
    </CButtonGroup>
  );
}
```

**Lines Modified**: Entire component (lines 13-45)

---

### Issue 3: CSS Rules for Solid Button Backgrounds
**File**: `src/styles/coreui-theme.css`

**Problem**: CSS rules targeted `:not(.btn-outline)` which created solid backgrounds for buttons without explicit outline variant.

**Solution**:
1. **Deleted** solid button background rules (lines 92-95, 108-111, 124-127)
2. **Added** active state rules for outline buttons (lines 133-147)

**Deleted Rules**:
```css
/* REMOVED - was creating solid backgrounds */
[data-coreui-theme='dark'] .btn-warning:not(.btn-outline) {
  background-color: rgba(255, 193, 7, 0.2) !important;
  color: #1a1d20 !important;
}
```

**Added Rules**:
```css
/* Active state for outline buttons in dark mode */
[data-coreui-theme='dark'] .btn-outline-warning.active {
  background-color: rgba(255, 193, 7, 0.15) !important;
  border-color: #ffc107 !important;
  color: #ffc107 !important;
  font-weight: 600 !important;
}

[data-coreui-theme='dark'] .btn-outline-success.active {
  background-color: rgba(25, 135, 84, 0.15) !important;
  border-color: #198754 !important;
  color: #198754 !important;
  font-weight: 600 !important;
}

[data-coreui-theme='dark'] .btn-outline-danger.active {
  background-color: rgba(220, 53, 69, 0.15) !important;
  border-color: #dc3545 !important;
  color: #dc3545 !important;
  font-weight: 600 !important;
}
```

## Technical Details

### CoreUI Button Variants
- `variant={undefined}` → Renders solid button with filled background
- `variant="outline"` → Renders outline button with transparent background and colored border
- `.active` class → Applied via className prop to indicate active state

### CSS Variables Used
- `--cui-warning-rgb`: RGB values for warning color (255, 193, 7)
- `--cui-danger-rgb`: RGB values for danger color (220, 53, 69)
- `--cui-success-rgb`: RGB values for success color (25, 135, 84)

### Theme Attribute
All dark mode CSS rules use the selector `[data-coreui-theme='dark']`, which is set by CoreUIThemeProvider on the document root.

## Key Learning Points

1. **CoreUI Variant System**: Always specify `variant="outline"` explicitly if you want outline buttons. The default (`undefined`) renders solid buttons.

2. **CSS Variables in Inline Styles**: Nested CSS variables don't resolve in inline styles:
   ```tsx
   // DOESN'T WORK
   style={{ '--cui-btn-active-bg': 'var(--cui-success)' }}
   ```

3. **Working WITH CoreUI**: Don't fight CoreUI's specificity. Use its theme system (`data-coreui-theme` attribute) and button variants as intended.

4. **Active State Styling**: Use `.active` className with CSS rules rather than changing the button variant or removing CoreUI's color prop.

5. **Diagnostic Process**: When CSS changes don't apply, check:
   - CSS load order
   - Theme data attributes on document root
   - Browser DevTools computed styles
   - Build cache (restart dev server)

## Verification

User confirmed fixes with screenshot showing mode selector buttons rendering correctly:
- All buttons use outline style
- Active button has subtle background (15% opacity) + bold font
- No solid colored backgrounds
- Theme-aware colors working in dark mode

## Files Modified

1. **[src/components/budget/custom/ExpandableDetailsRow.tsx](src/components/budget/custom/ExpandableDetailsRow.tsx#L94-L96)**
   Replaced hardcoded Bootstrap background classes with CSS variables

2. **[src/components/budget/ModeSelector.tsx](src/components/budget/ModeSelector.tsx#L13-L45)**
   Changed all buttons to use `variant="outline"` with `.active` className

3. **[src/styles/coreui-theme.css](src/styles/coreui-theme.css#L133-L147)**
   Deleted solid button rules, added active outline button rules

## Related Files

- **[src/app/layout.tsx](src/app/layout.tsx)**: CSS import order
- **[src/app/components/CoreUIThemeProvider.tsx](src/app/components/CoreUIThemeProvider.tsx)**: Theme management
- **[src/app/globals.css](src/app/globals.css)**: Global styles and accessibility focus indicators
