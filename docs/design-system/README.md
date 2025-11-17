# Landscape Design System

**Version**: 1.0.0
**Status**: Phase 1 Complete
**Last Updated**: 2025-01-14

## Overview

The Landscape Design System is built on CoreUI 5.9.1 with custom enhancements for ARGUS-style information density and professional dark-theme interfaces. This guide provides usage patterns, component references, and migration strategies.

## Philosophy

**90% CoreUI, 10% Custom**
- Leverage CoreUI components for all interactive elements
- Use thin wrappers for Landscape-specific features
- Avoid hand-rolled Tailwind components
- Maintain ARGUS-style information density

## Quick Start

### Import Landscape Components

```tsx
import { LandscapeButton, StatusChip, DataTable } from '@/components/ui/landscape';
```

### Import CoreUI Components Directly

```tsx
import { CCard, CCardBody, CFormInput, CFormSelect } from '@coreui/react';
```

## Color Palette

### Semantic Colors

```typescript
// Primary (actions, links, focus)
primary: #0ea5e9 (sky-500)

// Success (positive states, complete)
success: #16a34a (green-600)

// Warning (pending, alerts)
warning: #ca8a04 (yellow-600)

// Danger (errors, delete)
danger: #dc2626 (red-600)

// Secondary (cancel, neutral actions)
secondary: #64748b (slate-500)
```

### Usage in Tailwind

```tsx
<div className="bg-primary text-white">...</div>
<div className="bg-success-chip dark:bg-success-chipDark">...</div>
```

### Usage in CoreUI

```tsx
<CButton color="primary">Save</CButton>
<CBadge color="success">Complete</CBadge>
```

## Component Reference

### LandscapeButton

Thin wrapper around CoreUI `<CButton>` with loading states and icons.

**Usage**:
```tsx
// Primary action
<LandscapeButton color="primary">Save</LandscapeButton>

// With loading state
<LandscapeButton color="primary" loading={isSubmitting}>
  Submit
</LandscapeButton>

// With icon
<LandscapeButton color="success" icon={<CIcon icon={cilSave} />}>
  Save Changes
</LandscapeButton>

// Outline variant
<LandscapeButton color="secondary" variant="outline">
  Cancel
</LandscapeButton>

// Disabled
<LandscapeButton color="primary" disabled>
  Disabled
</LandscapeButton>
```

**Props**:
- `color`: `'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'`
- `variant`: `'outline' | 'ghost'` (optional)
- `size`: `'sm' | 'lg'` (optional)
- `loading`: `boolean` - Shows spinner and disables button
- `icon`: `ReactNode` - Icon before text
- `iconRight`: `ReactNode` - Icon after text
- `disabled`: `boolean`

### StatusChip

Semantic wrapper around CoreUI `<CBadge>` for consistent status indicators.

**Usage**:
```tsx
// Complete status
<StatusChip status="complete" />

// Custom label
<StatusChip status="pending" label="In Review" />

// Outline variant
<StatusChip status="error" variant="outline" />
```

**Available Status Types**:
- `complete` - Green success badge
- `partial` - Yellow warning badge
- `pending` - Yellow warning badge
- `error` - Red danger badge
- `inactive` - Gray secondary badge
- `info` - Blue info badge
- `active` - Green success badge
- `draft` - Gray secondary badge
- `approved` - Green success badge
- `rejected` - Red danger badge

**Props**:
- `status`: `StatusType` (required)
- `label`: `string` - Custom label (optional)
- `variant`: `'solid' | 'outline' | 'ghost'` (optional)

### DataTable

Enhanced CoreUI `<CTable>` with loading, empty states, and custom rendering.

**Usage**:
```tsx
// Basic usage
<DataTable
  data={projects}
  columns={[
    { label: 'Name', key: 'name' },
    { label: 'Status', key: 'status' },
  ]}
/>

// With custom rendering
<DataTable
  data={projects}
  columns={[
    { label: 'Name', key: 'name' },
    {
      label: 'Status',
      key: 'status',
      render: (row) => <StatusChip status={row.status} />
    },
  ]}
/>

// With loading state
<DataTable
  data={projects}
  columns={columns}
  loading={isLoading}
/>

// With row click handler
<DataTable
  data={projects}
  columns={columns}
  onRowClick={(row) => navigate(`/projects/${row.id}`)}
/>
```

**Props**:
- `data`: `T[]` - Array of data objects (required)
- `columns`: `DataTableColumn<T>[]` - Column definitions (required)
- `loading`: `boolean` - Show loading spinner
- `emptyMessage`: `string` - Custom empty state message
- `onRowClick`: `(row: T, index: number) => void` - Row click handler
- `rowKey`: `keyof T | (row, index) => string` - Unique row identifier

## CoreUI Components (Direct Usage)

### Forms

```tsx
import { CFormInput, CFormSelect, CFormTextarea, CFormCheck } from '@coreui/react';

// Text input
<CFormInput
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Enter text"
/>

// Dropdown
<CFormSelect
  value={value}
  onChange={(e) => setValue(e.target.value)}
>
  <option value="">Select...</option>
  <option value="1">Option 1</option>
</CFormSelect>

// Checkbox
<CFormCheck
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
  label="I agree"
/>
```

### Cards

```tsx
import { CCard, CCardBody, CCardHeader, CCardTitle } from '@coreui/react';

<CCard>
  <CCardHeader>
    <CCardTitle>Card Title</CCardTitle>
  </CCardHeader>
  <CCardBody>
    Card content here
  </CCardBody>
</CCard>
```

### Modals

```tsx
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter } from '@coreui/react';

<CModal visible={visible} onClose={() => setVisible(false)}>
  <CModalHeader>
    <CModalTitle>Modal Title</CModalTitle>
  </CModalHeader>
  <CModalBody>
    Modal content
  </CModalBody>
  <CModalFooter>
    <LandscapeButton color="secondary" onClick={() => setVisible(false)}>
      Cancel
    </LandscapeButton>
    <LandscapeButton color="primary" onClick={handleSave}>
      Save
    </LandscapeButton>
  </CModalFooter>
</CModal>
```

## Migration Patterns

### Buttons

**Before** (hand-rolled Tailwind):
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Save
</button>
```

**After** (CoreUI wrapper):
```tsx
<LandscapeButton color="primary">Save</LandscapeButton>
```

### Status Chips

**Before** (inconsistent):
```tsx
<span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">Complete</span>
<span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Complete</span>
```

**After** (semantic):
```tsx
<StatusChip status="complete" />
```

### Form Inputs

**Before**:
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500"
  value={value}
  onChange={onChange}
/>
```

**After**:
```tsx
<CFormInput
  type="text"
  value={value}
  onChange={onChange}
/>
```

### Cards

**Before**:
```tsx
<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
  {content}
</div>
```

**After**:
```tsx
<CCard>
  <CCardBody>{content}</CCardBody>
</CCard>
```

## Dark Mode

Dark mode is the **default theme**. The theme system uses:
- `[data-theme='dark']` attribute on `<html>`
- `.dark-theme` CSS class
- CSS variables in `tokens.css`

**Theme Toggle**:
```tsx
import { useTheme } from '@/app/components/CoreUIThemeProvider';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <LandscapeButton color="secondary" variant="ghost" onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </LandscapeButton>
  );
}
```

## Accessibility

All components include:
- **Visible focus indicators** (2px outline, 2px offset)
- **Keyboard navigation** support
- **WCAG 2.1 AA compliance**

Focus indicators are automatically applied via global CSS:
```css
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
```

## Best Practices

### DO:
- ✅ Use `LandscapeButton` for all buttons
- ✅ Use `StatusChip` for all status indicators
- ✅ Use CoreUI form components (`CFormInput`, `CFormSelect`, etc.)
- ✅ Use CoreUI cards (`CCard`) for containers
- ✅ Leverage existing color tokens (`--brand-primary`, `--surface-bg`, etc.)

### DON'T:
- ❌ Write raw `<button>` with Tailwind classes
- ❌ Create custom status chips with `bg-green-900` etc.
- ❌ Use inline hex colors (`#0d6efd`)
- ❌ Use inconsistent shadow classes (`shadow-sm`, `shadow-xl` arbitrarily)
- ❌ Skip focus indicators on interactive elements

## File Locations

- **Wrapper Components**: `/src/components/ui/landscape/`
- **CoreUI Theme**: `/src/styles/coreui-theme.css`
- **Color Tokens**: `/src/styles/tokens.css`
- **Global Styles**: `/src/app/globals.css`
- **Tailwind Config**: `/tailwind.config.js`
- **Theme Provider**: `/src/app/components/CoreUIThemeProvider.tsx`

## Next Steps (Phase 2)

After Phase 1 approval:
1. Select one critical page for pilot migration (Projects Overview recommended)
2. Migrate all buttons, chips, forms, cards on that page to CoreUI wrappers
3. Test dark mode, keyboard navigation, accessibility
4. Report back for Phase 3 approval

## Support

For questions or issues:
- Review this documentation first
- Check existing CoreUI components in the codebase
- Refer to [CoreUI React Documentation](https://coreui.io/react/docs/)
- Create an issue in the project repository

---

**Last Updated**: 2025-01-14
**Version**: 1.0.0
**Phase**: 1 Complete
