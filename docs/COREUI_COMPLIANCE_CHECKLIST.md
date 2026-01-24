# COREUI COMPLIANCE CHECKLIST

**Version:** 1.0
**Last Updated:** January 2026
**Purpose:** Standard reference for all new and refactored components in Landscape

---

## QUICK REFERENCE

### ✅ DO USE

| Category | CoreUI Pattern |
|----------|----------------|
| **Backgrounds** | `var(--cui-body-bg)`, `var(--cui-secondary-bg)`, `var(--cui-tertiary-bg)` |
| **Text** | `var(--cui-body-color)`, `var(--cui-secondary-color)`, `text-muted` |
| **Borders** | `var(--cui-border-color)`, `var(--cui-border-color-translucent)` |
| **Brand colors** | `var(--cui-primary)`, `var(--cui-success)`, `var(--cui-danger)`, `var(--cui-warning)`, `var(--cui-info)` |
| **Buttons** | `btn btn-primary`, `btn btn-secondary`, `btn btn-ghost-secondary`, `btn btn-outline-primary` |
| **Layout** | `d-flex`, `align-items-center`, `justify-content-between`, `gap-2`, `gap-3` |
| **Spacing** | `p-3`, `px-4`, `py-2`, `m-0`, `mb-3`, `mt-2` |
| **Text utilities** | `text-primary`, `text-success`, `text-danger`, `text-warning`, `small`, `fw-bold` |

### ❌ DO NOT USE

| Category | Forbidden Pattern | Use Instead |
|----------|-------------------|-------------|
| **Tailwind colors** | `bg-slate-800`, `text-gray-400`, `border-zinc-700` | CoreUI variables |
| **Tailwind flex** | `flex`, `items-center`, `justify-between` | `d-flex`, `align-items-center`, `justify-content-between` |
| **Tailwind spacing** | `p-4`, `mx-auto`, `gap-4` (Tailwind) | CoreUI spacing: `p-3`, `mx-auto`, `gap-3` |
| **Dark mode variants** | `dark:bg-gray-900`, `dark:text-white` | CSS variables auto-switch |
| **Hardcoded hex** | `#1e293b`, `#f8fafc`, `color: #fff` | CSS variables |
| **Inline color styles** | `style={{ color: '#10b981' }}` | `style={{ color: 'var(--cui-success)' }}` |

---

## COLOR SYSTEM

### Primary Brand Colors

| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| Primary | `--cui-primary` | #5856d6 | Primary actions, links, focus states |
| Secondary | `--cui-secondary` | #6b7785 | Secondary actions, muted elements |
| Success | `--cui-success` | #1b9e3e | Positive values, confirmations, +adjustments |
| Danger | `--cui-danger` | #e55353 | Errors, destructive actions, -adjustments |
| Warning | `--cui-warning` | #f9b115 | Warnings, pending states |
| Info | `--cui-info` | #39f | Informational, highlights |

### Landscape Brand

| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| Landscape Cyan | `--landscape-cyan` | #00d9ff | Landscaper branding, AI indicators |

### Surface Colors (Auto-switch Light/Dark)

| Variable | Light | Dark | Usage |
|----------|-------|------|-------|
| `--cui-body-bg` | #fff | #212631 | Page background |
| `--cui-secondary-bg` | #e7eaee | #323a49 | Card headers, elevated surfaces |
| `--cui-tertiary-bg` | #f3f4f7 | ~#293040 | Nested panels, canvas backgrounds |
| `--cui-body-color` | rgba(37,43,54,0.95) | rgba(255,255,255,0.87) | Primary text |
| `--cui-border-color` | #dbdfe6 | #323a49 | Standard borders |

---

## BUTTON PATTERNS

### Standard Buttons

```tsx
// Primary action (submit, save, confirm)
<button className="btn btn-primary">Save Changes</button>

// Secondary action (cancel, back)
<button className="btn btn-secondary">Cancel</button>

// Success action (approve, complete)
<button className="btn btn-success">Approve</button>

// Danger action (delete, remove)
<button className="btn btn-danger">Delete</button>

// Warning action (caution-required)
<button className="btn btn-warning">Proceed Anyway</button>
```

### Outline & Ghost Variants

```tsx
// Outline (secondary emphasis)
<button className="btn btn-outline-primary">View Details</button>
<button className="btn btn-outline-secondary">Options</button>

// Ghost (minimal, icon buttons, subtle actions)
<button className="btn btn-ghost-secondary">Edit</button>
<button className="btn btn-ghost-primary" aria-label="Close">✕</button>
```

### Sizes

```tsx
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary">Default</button>
<button className="btn btn-primary btn-lg">Large</button>
```

### Landscaper Branded

```tsx
// Special Landscaper actions
<button className="btn btn-landscaper">Ask Landscaper</button>
```

```css
.btn-landscaper {
  background: linear-gradient(135deg, var(--landscape-cyan), #0891b2);
  border: none;
  color: white;
}
```

---

## LAYOUT UTILITIES

### Flexbox (CoreUI, NOT Tailwind)

```tsx
// ✅ Correct
<div className="d-flex align-items-center justify-content-between gap-3">

// ❌ Wrong
<div className="flex items-center justify-between gap-3">
```

### Common Patterns

```tsx
// Row with spaced items
<div className="d-flex align-items-center justify-content-between">

// Centered content
<div className="d-flex align-items-center justify-content-center">

// Column layout
<div className="d-flex flex-column gap-2">

// Inline items with gap
<div className="d-inline-flex align-items-center gap-2">
```

---

## FORM ELEMENTS

```tsx
<input type="text" className="form-control" />
<input type="text" className="form-control form-control-sm" />
<select className="form-select form-select-sm">
  <option>Choose...</option>
</select>
<label className="form-label">Field Name</label>
```

---

## TABLES

```tsx
<table className="table table-dark table-striped table-hover">
  <thead>
    <tr><th>Column</th></tr>
  </thead>
  <tbody>
    <tr><td>Value</td></tr>
  </tbody>
</table>
```

### Custom Table Styling

```css
.custom-table {
  background: var(--cui-body-bg);
  border: 1px solid var(--cui-border-color);
}

.custom-table th {
  background: var(--cui-secondary-bg);
  color: var(--cui-body-color);
}

.custom-table td {
  color: var(--cui-body-color);
  border-bottom: 1px solid var(--cui-border-color-translucent);
}
```

---

## DARK THEME

**DO NOT use Tailwind dark: variants.** CoreUI handles dark mode via CSS variables.

Dark mode activates with `data-coreui-theme="dark"` on an ancestor. All `var(--cui-*)` variables auto-switch.

```tsx
// ❌ Wrong
<div className="bg-white dark:bg-gray-900">

// ✅ Correct
<div style={{ background: 'var(--cui-body-bg)' }}>
```

---

## PRE-COMMIT VERIFICATION

Before marking any task complete:

### 1. Search for Forbidden Patterns

```bash
grep -r "bg-slate\|bg-gray\|bg-zinc\|text-slate\|text-gray\|text-zinc\|border-slate\|border-gray\|border-zinc" src/
grep -r "dark:" src/
grep -r "#[0-9a-fA-F]\{6\}" src/  # Review hardcoded hex
```

### 2. Verify Button Classes

All buttons should use `btn btn-*` pattern.

### 3. Check Layout Classes

Flexbox should use `d-flex`, `align-items-*`, `justify-content-*`.

### 4. Test Dark Mode

Toggle theme and verify no styling breaks.

---

## COMMON MISTAKES & FIXES

| Mistake | Fix |
|---------|-----|
| `className="flex items-center"` | `className="d-flex align-items-center"` |
| `className="bg-gray-800"` | `style={{ background: 'var(--cui-secondary-bg)' }}` |
| `className="text-white"` | `style={{ color: 'var(--cui-body-color)' }}` |
| `className="border-gray-700"` | `style={{ borderColor: 'var(--cui-border-color)' }}` |
| `className="dark:bg-slate-900"` | Remove — CSS vars auto-switch |
| `color: #10b981` | `color: var(--cui-success)` |
| `<button className="px-4 py-2 bg-blue-500">` | `<button className="btn btn-primary">` |
```
