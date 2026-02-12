# CoreUI Component Reference for Landscape

**Generated:** 2026-02-12 14:31:55 MST  
**CoreUI Package Versions (installed):**
- `@coreui/react`: `5.9.1`
- `@coreui/coreui`: `5.5.0`
- `@coreui/icons-react`: `2.3.0`

**Package.json ranges (declared):**
- `@coreui/react`: `^5.9.1`
- `@coreui/coreui`: `^5.4.3`
- `@coreui/icons-react`: `^2.3.0`

---

## Quick Reference: CSS Variables

### Theme Activation
CoreUI dark mode is attribute-driven:

```html
<html data-coreui-theme="dark">
```

CoreUI v5 root variables are defined in:
- `node_modules/@coreui/coreui/scss/_root.scss`
- `node_modules/@coreui/coreui/scss/_variables.scss`
- `node_modules/@coreui/coreui/scss/_variables-dark.scss`

### Core Global Variables (light vs dark)

| Variable | Light | Dark | Notes |
|---|---|---|---|
| `--cui-body-bg` | `#fff` | `#212631` | Main app/page background |
| `--cui-body-color` | `rgba(37, 42.92, 54.02, 0.95)` | `rgba(255, 255, 255, 0.87)` | Main text color |
| `--cui-border-color` | `#dbdfe6` | `#323a49` | Default border color |
| `--cui-border-color-translucent` | `rgba(8, 10, 12, 0.175)` | `rgba(255, 255, 255, 0.1)` | Subtle borders |
| `--cui-border-radius` | `0.375rem` | `0.375rem` | Base radius |
| `--cui-link-color` | theme color | dark theme color | Used by nav, pagination, links |
| `--cui-secondary-bg` | computed | computed dark | Used for subtle surfaces |
| `--cui-tertiary-bg` | computed | computed dark | Used for hover/neutral surfaces |

### Component CSS Variables (high-value)

| Component | Variables |
|---|---|
| Button | `--cui-btn-*` (`padding`, `font-size`, `color`, `bg`, `border-color`, `focus-box-shadow`, `active-*`, `disabled-*`) |
| Card | `--cui-card-*` (`bg`, `border-color`, `cap-bg`, `color`, `radius`) |
| Modal | `--cui-modal-*` (`bg`, `color`, `border-color`, `header-border-color`, `footer-border-color`) |
| Inputs/Selects | `--cui-input-*`, `--cui-form-select-*`, `--cui-form-check-*` |
| Table | `--cui-table-*` (`color`, `bg`, `border-color`, `striped-*`, `active-*`, `hover-*`) |
| Dropdown | `--cui-dropdown-*` (`bg`, `color`, `border-color`, `link-hover-bg`, `active-bg`) |
| Nav/Tabs | `--cui-nav-*` (`link-color`, `tabs-border-color`, `pills-*`, `underline-*`) |
| Progress | `--cui-progress-*` (`bg`, `bar-bg`, `height`, `radius`) |
| Accordion | `--cui-accordion-*` (`bg`, `border-color`, `btn-*`, `active-*`) |
| Offcanvas | `--cui-offcanvas-*` (`bg`, `color`, `border-color`, `width`, `height`) |
| Pagination | `--cui-pagination-*` (`color`, `bg`, `border-color`, `active-*`, `disabled-*`) |
| Toast | `--cui-toast-*` (`bg`, `color`, `border-color`, `header-bg`) |
| Tooltip | `--cui-tooltip-*` (`bg`, `color`, `opacity`, `arrow-*`) |
| Popover | `--cui-popover-*` (`bg`, `border-color`, `header-bg`, `body-color`) |
| Sidebar | `--cui-sidebar-*`, `--cui-sidebar-nav-*` |
| Badge | `--cui-badge-*` |
| Close button | `--cui-btn-close-*` |

---

## Components

## Layout

### `CContainer`
**Import:** `import { CContainer } from '@coreui/react'`

**CoreUI props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `sm` | `boolean` | `undefined` | Full-width until `sm` breakpoint (`container-sm`) |
| `md` | `boolean` | `undefined` | Full-width until `md` breakpoint |
| `lg` | `boolean` | `undefined` | Full-width until `lg` breakpoint |
| `xl` | `boolean` | `undefined` | Full-width until `xl` breakpoint |
| `xxl` | `boolean` | `undefined` | Full-width until `xxl` breakpoint |
| `fluid` | `boolean` | `undefined` | Full-width container (`container-fluid`) |
| `className` | `string` | `undefined` | Additional classes |

**Class generation:**
- Base: `container`
- Responsive: `container-{bp}` for each true breakpoint prop

---

### `CRow`
**Import:** `import { CRow } from '@coreui/react'`

**CoreUI props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `xs`/`sm`/`md`/`lg`/`xl`/`xxl` | `BPObject` | `undefined` | Row cols/gutters per breakpoint |
| `className` | `string` | `undefined` | Additional classes |

`BPObject` keys:
- `cols?: 'auto' | number | string`
- `gutter?: number | string`
- `gutterX?: number | string`
- `gutterY?: number | string`

**Class generation:**
- Base: `row`
- `row-cols{-bp}-{cols}`
- `g{-bp}-{gutter}`, `gx{-bp}-{gutterX}`, `gy{-bp}-{gutterY}`

---

### `CCol`
**Import:** `import { CCol } from '@coreui/react'`

**CoreUI props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `xs`/`sm`/`md`/`lg`/`xl`/`xxl` | `Col` | `undefined` | Column span/offset/order per breakpoint |
| `className` | `string` | `undefined` | Additional classes |

`Col` supports:
- primitive span: `'auto' | number | string | boolean`
- object: `{ span?, offset?, order? }`

**Class generation:**
- Base fallback: `col`
- `col{-bp}` / `col{-bp}-{span}`
- `offset{-bp}-{offset}`
- `order{-bp}-{order}`

---

### `CCard`
**Import:** `import { CCard } from '@coreui/react'`

**CoreUI props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `Colors` | `undefined` | Adds `bg-{color}` |
| `textColor` | `string` | `undefined` | Adds `text-{textColor}` |
| `textBgColor` | `Colors` | `undefined` | Adds `text-bg-{textBgColor}` |
| `className` | `string` | `undefined` | Additional classes |

**Class generation:**
- Base: `card`
- Context classes: `bg-*`, `text-*`, `text-bg-*`

**CSS variables (SCSS):**
- `--cui-card-bg`, `--cui-card-border-color`, `--cui-card-border-radius`, `--cui-card-cap-bg`, `--cui-card-cap-color`, etc.

---

### `CCardBody`, `CCardHeader`, `CCardFooter`
**Import:**
```tsx
import { CCardBody, CCardHeader, CCardFooter } from '@coreui/react'
```

**`CCardBody` props:** `className`
- Class: `card-body`

**`CCardHeader` props:**
- `as?: ElementType` (default: `'div'`)
- `className?: string`
- Class: `card-header`

**`CCardFooter` props:** `className`
- Class: `card-footer`

---

## Forms

### Shared validation/wrapper props (`CFormInput`, `CFormSelect`, `CFormTextarea`, `CFormCheck`)

| Prop | Type |
|---|---|
| `feedback` | `ReactNode | string` |
| `feedbackInvalid` | `ReactNode | string` |
| `feedbackValid` | `ReactNode | string` |
| `invalid` | `boolean` |
| `valid` | `boolean` |
| `tooltipFeedback` | `boolean` |
| `floatingLabel` | `ReactNode | string` |
| `floatingClassName` | `string` |
| `label` | `ReactNode | string` |
| `text` | `ReactNode | string` |

---

### `CForm`
**Import:** `import { CForm } from '@coreui/react'`

| Prop | Type | Default | Description |
|---|---|---|---|
| `validated` | `boolean` | `undefined` | Adds `was-validated` |
| `className` | `string` | `undefined` | Additional classes |

---

### `CFormInput`
**Import:** `import { CFormInput } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `delay` | `boolean | number` | `false` |
| `plainText` | `boolean` | `undefined` |
| `size` | `'sm' | 'lg'` | `undefined` |
| `type` | `'color' | 'file' | 'text' | string` | `'text'` |
| `disabled` | `boolean` | `undefined` |
| `readOnly` | `boolean` | `undefined` |
| `value` | `string | string[] | number` | `undefined` |
| `onChange` | `ChangeEventHandler<HTMLInputElement>` | `undefined` |
| `className` | `string` | `undefined` |
| shared wrapper/validation props | see above | - |

**Class generation:**
- Base: `form-control` or `form-control-plaintext`
- `form-control-{size}`
- `form-control-color` when `type='color'`
- `is-invalid` / `is-valid`

---

### `CFormSelect`
**Import:** `import { CFormSelect } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `htmlSize` | `number` | `undefined` |
| `options` | `Option[] | string[]` | `undefined` |
| `size` | `'sm' | 'lg'` | `undefined` |
| `value` | `string | string[] | number` | `undefined` |
| `onChange` | `ChangeEventHandler<HTMLSelectElement>` | `undefined` |
| `className` | `string` | `undefined` |
| shared wrapper/validation props | see above | - |

**Class generation:**
- Base: `form-select`
- `form-select-{size}`
- `is-invalid` / `is-valid`

---

### `CFormCheck`
**Import:** `import { CFormCheck } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `button` | `{ color?, shape?, size?, variant? }` | `undefined` |
| `hitArea` | `'full'` | `undefined` |
| `id` | `string` | `undefined` |
| `indeterminate` | `boolean` | `undefined` |
| `inline` | `boolean` | `undefined` |
| `label` | `string | ReactNode` | `undefined` |
| `reverse` | `boolean` | `undefined` |
| `type` | `'checkbox' | 'radio'` | `'checkbox'` |
| `className` | `string` | `undefined` |
| shared validation props | see above | - |

**Class generation/patterns:**
- Input: `form-check-input` or `btn-check` (button mode)
- Wrapper: `form-check`, `form-check-inline`, `form-check-reverse`
- Label: `form-check-label` or button classes (`btn`, `btn-{variant?}-{color}`, `btn-{size}`)

---

### `CFormLabel`
**Import:** `import { CFormLabel } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `customClassName` | `string` | `undefined` |
| `className` | `string` | `undefined` |

**Class behavior:**
- Uses `customClassName` if provided
- Otherwise defaults to `form-label` + `className`

---

### `CFormTextarea`
**Import:** `import { CFormTextarea } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `plainText` | `boolean` | `undefined` |
| `disabled` | `boolean` | `undefined` |
| `readOnly` | `boolean` | `undefined` |
| `value` | `string | string[] | number` | `undefined` |
| `onChange` | `ChangeEventHandler<HTMLTextAreaElement>` | `undefined` |
| `className` | `string` | `undefined` |
| shared wrapper/validation props | see above | - |

**Class generation:**
- `form-control` or `form-control-plaintext`
- `is-invalid` / `is-valid`

---

### `CInputGroup`
**Import:** `import { CInputGroup } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `size` | `'sm' | 'lg'` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `input-group`
- `input-group-{size}`

---

## Buttons

### `CButton`
**Import:** `import { CButton } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `active` | `boolean` | `undefined` |
| `as` | `ElementType` | `'button'` |
| `color` | `Colors` | `undefined` |
| `disabled` | `boolean` | `undefined` |
| `href` | `string` | `undefined` |
| `role` | `string` | `undefined` |
| `shape` | `Shapes` | `undefined` |
| `size` | `'sm' | 'lg'` | `undefined` |
| `type` | `'button' | 'submit' | 'reset'` | `'button'` |
| `variant` | `'outline' | 'ghost'` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `btn`
- Solid: `btn-{color}`
- Outline/Ghost: `btn-{variant}-{color}` or `btn-{variant}`
- Size: `btn-{size}`
- Shape utility class passed through directly

---

### `CButtonGroup`
**Import:** `import { CButtonGroup } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `size` | `'sm' | 'lg'` | `undefined` |
| `vertical` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- `btn-group` or `btn-group-vertical`
- `btn-group-{size}`

---

### `CCloseButton`
**Import:** `import { CCloseButton } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `dark` | `boolean` | `undefined` |
| `disabled` | `boolean` | `undefined` |
| `white` | `boolean` | `undefined` (deprecated) |
| `className` | `string` | `undefined` |

**Class generation/behavior:**
- Base classes: `btn btn-close`
- `btn-close-white` when `white`
- Adds `data-coreui-theme="dark"` when `dark`

---

## Navigation

### `CNav`
**Import:** `import { CNav } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `as` | `ElementType` | `'ul'` |
| `layout` | `'fill' | 'justified'` | `undefined` |
| `variant` | `'enclosed' | 'enclosed-pills' | 'pills' | 'tabs' | 'underline' | 'underline-border'` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `nav`
- `nav-{layout}`
- `nav-{variant}`
- Extra for enclosed pills: `nav-enclosed`

---

### `CNavItem`
**Import:** `import { CNavItem } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `as` | `ElementType` | `'li'` |
| `className` | `string` | `undefined` |

**Behavior:**
- Wrapper class: `nav-item`
- If `href`/`to` present, auto-renders `CNavLink`

---

### `CNavLink`
**Import:** `import { CNavLink } from '@coreui/react'`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `idx` | `string` | `undefined` | Sidebar nav-group index wiring |
| `to` | `string` | `undefined` | Routing support hook |
| `className` | `string` | `undefined` | Adds to `nav-link` |

**Class generation:**
- Base: `nav-link`

---

### `CTabs`
**Import:** `import { CTabs } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `activeItemKey` | `number | string` | `undefined` |
| `defaultActiveItemKey` | `number | string` | `undefined` |
| `onChange` | `(value: number | string) => void` | `undefined` |
| `className` | `string` | `undefined` |

**Behavior:**
- Controlled when `activeItemKey` provided
- Uncontrolled when using `defaultActiveItemKey`
- Wraps children in `CTabsContext`

---

### `CTabContent`
**Import:** `import { CTabContent } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `className` | `string` | `undefined` |

**Class:** `tab-content`

---

### `CTabPane`
**Import:** `import { CTabPane } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `visible` | `boolean` | `undefined` |
| `transition` | `boolean` | `true` |
| `onShow` | `() => void` | `undefined` |
| `onHide` | `() => void` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `tab-pane`
- `active` when visible
- `fade` when transition enabled
- `show` on entered transition state

---

### `CSidebar`
**Import:** `import { CSidebar } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `as` | `ElementType` | `'div'` |
| `colorScheme` | `'dark' | 'light'` | `undefined` |
| `narrow` | `boolean` | `undefined` |
| `onHide` | `() => void` | `undefined` |
| `onShow` | `() => void` | `undefined` |
| `onVisibleChange` | `(visible: boolean) => void` | `undefined` |
| `overlaid` | `boolean` | `undefined` |
| `placement` | `'start' | 'end'` | `undefined` |
| `position` | `'fixed' | 'sticky'` | `undefined` |
| `size` | `'sm' | 'lg' | 'xl'` | `undefined` |
| `unfoldable` | `boolean` | `undefined` |
| `visible` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `sidebar`
- `sidebar-{colorScheme}` / `sidebar-{placement}` / `sidebar-{position}` / `sidebar-{size}`
- `sidebar-narrow`, `sidebar-overlaid`, `sidebar-narrow-unfoldable`
- Visibility state: `show` / `hide`

---

### `CSidebarNav`
**Import:** `import { CSidebarNav } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `as` | `ElementType` | `'ul'` |
| `className` | `string` | `undefined` |

**Class:** `sidebar-nav`  
**Behavior:** recursively clones `CNavGroup`/`CNavItem`/`CNavLink` children with `idx` for group visibility logic.

---

## Feedback

### `CModal`
**Import:** `import { CModal } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `alignment` | `'top' | 'center'` | `undefined` |
| `backdrop` | `boolean | 'static'` | `true` |
| `container` | `Element | DocumentFragment | (() => Element \| DocumentFragment \| null) | null` | `undefined` |
| `duration` | `number` | `150` |
| `focus` | `boolean` | `true` |
| `fullscreen` | `boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` | `undefined` |
| `keyboard` | `boolean` | `true` |
| `onClose` | `() => void` | `undefined` |
| `onClosePrevented` | `() => void` | `undefined` |
| `onShow` | `() => void` | `undefined` |
| `portal` | `boolean` | `true` |
| `scrollable` | `boolean` | `undefined` |
| `size` | `'sm' | 'lg' | 'xl'` | `undefined` |
| `transition` | `boolean` | `true` |
| `unmountOnClose` | `boolean` | `true` |
| `visible` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `modal`
- `fade`, `show`, `modal-static`

---

### `CModalHeader`, `CModalBody`, `CModalFooter`

**Import:**
```tsx
import { CModalHeader, CModalBody, CModalFooter } from '@coreui/react'
```

**`CModalHeader` props:**
- `closeButton?: boolean` (default `true`)
- `className?: string`
- Class: `modal-header`

**`CModalBody` props:** `className`
- Class: `modal-body`

**`CModalFooter` props:** `className`
- Class: `modal-footer`

---

### `CToast`
**Import:** `import { CToast } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `animation` | `boolean` | `true` |
| `autohide` | `boolean` | `true` |
| `color` | `Colors` | `undefined` |
| `delay` | `number` | `5000` |
| `visible` | `boolean` | `false` |
| `onClose` | `(index: number | null) => void` | `undefined` |
| `onShow` | `(index: number | null) => void` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `toast`
- Transition state: `fade`, `show`, `show showing`
- Color mode: `bg-{color}` + `border-0` when `color`

---

### `CToaster`
**Import:** `import { CToaster } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `placement` | `'top-start' \| 'top-center' \| 'top-end' \| 'middle-start' \| 'middle-center' \| 'middle-end' \| 'bottom-start' \| 'bottom-center' \| 'bottom-end' \| string` | `undefined` |
| `push` | `ReactElement<CToastProps>` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `toaster toast-container`
- Placement classes: `position-fixed`, `top-0`, `bottom-0`, `start-0`, `end-0`, translate helpers

---

### `CAlert`
**Import:** `import { CAlert } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `color` | `Colors` | `'primary'` |
| `dismissible` | `boolean` | `undefined` |
| `variant` | `'solid' | string` | `undefined` |
| `visible` | `boolean` | `true` |
| `onClose` | `() => void` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `alert`
- Normal variant: `alert-{color}`
- Solid variant: `bg-{color} text-white`
- Dismissible: `alert-dismissible fade`

---

### `CSpinner`
**Import:** `import { CSpinner } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `as` | `ElementType` | `'div'` |
| `color` | `Colors` | `undefined` |
| `size` | `'sm'` | `undefined` |
| `variant` | `'border' | 'grow'` | `'border'` |
| `visuallyHiddenLabel` | `string` | `'Loading...'` |
| `className` | `string` | `undefined` |

**Class generation:**
- `spinner-{variant}`
- `spinner-{variant}-{size}`
- `text-{color}`

---

## Data

### `CTable`
**Import:** `import { CTable } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `align` | `'bottom' | 'middle' | 'top' | string` | `undefined` |
| `borderColor` | `Colors` | `undefined` |
| `bordered` | `boolean` | `undefined` |
| `borderless` | `boolean` | `undefined` |
| `caption` | `'top' | string` | `undefined` |
| `captionTop` | `string` | `undefined` |
| `columns` | `(string | Column)[]` | `undefined` |
| `color` | `Colors` | `undefined` |
| `footer` | `(FooterItem | string)[]` | `undefined` |
| `hover` | `boolean` | `undefined` |
| `items` | `Item[]` | `undefined` |
| `responsive` | `boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` | `undefined` |
| `small` | `boolean` | `undefined` |
| `striped` | `boolean` | `undefined` |
| `stripedColumns` | `boolean` | `undefined` |
| `tableFootProps` | `CTableFootProps` | `undefined` |
| `tableHeadProps` | `CTableHeadProps` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `table`
- `align-*`, `border-*`, `caption-top`, `table-bordered`, `table-borderless`, `table-{color}`, `table-hover`, `table-sm`, `table-striped`, `table-striped-columns`

---

### `CTableHead`, `CTableBody`, `CTableRow`, `CTableHeaderCell`, `CTableDataCell`

**Imports:**
```tsx
import {
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
```

Shared pattern: optional `color?: Colors` adds `table-{color}`.

`CTableRow` adds:
- `active?: boolean` => `table-active`
- `align?: 'bottom' | 'middle' | 'top' | string` => `align-*`

`CTableDataCell` adds:
- `active`, `align`, `color`
- renders `<th>` when `scope` exists; otherwise `<td>`

---

## Overlay

### `CDropdown`
**Import:** `import { CDropdown } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `alignment` | `Alignments` | `undefined` |
| `as` | `ElementType` | `'div'` |
| `autoClose` | `boolean | 'inside' | 'outside'` | `true` |
| `container` | `Element | DocumentFragment | (() => Element \| DocumentFragment \| null) | null` | `undefined` |
| `dark` | `boolean` | `undefined` |
| `direction` | `'center' | 'dropup' | 'dropup-center' | 'dropend' | 'dropstart'` | `undefined` |
| `offset` | `[number, number]` | `[0, 2]` |
| `onHide` | `() => void` | `undefined` |
| `onShow` | `() => void` | `undefined` |
| `placement` | `Placements` | `'bottom-start'` |
| `popper` | `boolean` | `true` |
| `popperConfig` | `Partial<Options> | ((defaultConfig) => Partial<Options>)` | `undefined` |
| `portal` | `boolean` | `false` |
| `reference` | `'parent' | 'toggle' | HTMLElement | React.RefObject<HTMLElement \| null>` | `'toggle'` |
| `variant` | `'btn-group' | 'dropdown' | 'input-group' | 'nav-item'` | `'btn-group'` |
| `visible` | `boolean` | `false` |
| `className` | `string` | `undefined` |

**Class generation:**
- Root: variant class (`btn-group`/`dropdown`/`nav-item dropdown`) unless `input-group` variant
- Direction classes: `dropdown-center`, `dropup dropup-center`, `dropup`, `dropend`, `dropstart`

---

### `CDropdownToggle`
**Import:** `import { CDropdownToggle } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `caret` | `boolean` | `true` |
| `custom` | `boolean` | `undefined` |
| `navLink` | `boolean` | `true` |
| `split` | `boolean` | `undefined` |
| `splitLabel` | `string` | `'Toggle Dropdown'` |
| `trigger` | `Triggers | Triggers[]` | `'click'` |
| `className` | `string` | `undefined` |

**Class generation:**
- `dropdown-toggle` (if caret)
- `dropdown-toggle-split` (if split)
- `nav-link` in nav-item mode
- `show` when visible

---

### `CDropdownMenu`
**Import:** `import { CDropdownMenu } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `as` | `ElementType` | `'ul'` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `dropdown-menu`
- `show` when visible
- Alignment classes from `alignment` object/string
- Adds `data-coreui-theme="dark"` when dropdown `dark`

---

### `CDropdownItem`
**Import:** `import { CDropdownItem } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `className` | `string` | `undefined` |

**Class:** `dropdown-item`

---

### `CPopover`
**Import:** `import { CPopover } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `animation` | `boolean` | `true` |
| `content` | `ReactNode | string` | required |
| `container` | `Element | DocumentFragment | (() => Element \| DocumentFragment \| null) | null` | `undefined` |
| `delay` | `number | { show: number; hide: number }` | `0` |
| `fallbackPlacements` | `Placements | Placements[]` | `['top','right','bottom','left']` |
| `offset` | `[number, number]` | `[0, 8]` |
| `onHide` | `() => void` | `undefined` |
| `onShow` | `() => void` | `undefined` |
| `placement` | `'auto' | 'top' | 'right' | 'bottom' | 'left'` | `'top'` |
| `popperConfig` | `Partial<Options> | ((defaultConfig) => Partial<Options>)` | `undefined` |
| `title` | `ReactNode | string` | `undefined` |
| `trigger` | `Triggers | Triggers[]` | `'click'` |
| `visible` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `popover bs-popover-auto`
- Transition: `fade`, `show`

---

### `CTooltip`
**Import:** `import { CTooltip } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `animation` | `boolean` | `true` |
| `content` | `ReactNode | string` | required |
| `container` | `Element | DocumentFragment | (() => Element \| DocumentFragment \| null) | null` | `undefined` |
| `delay` | `number | { show: number; hide: number }` | `0` |
| `fallbackPlacements` | `Placements | Placements[]` | `['top','right','bottom','left']` |
| `offset` | `[number, number]` | `[0, 6]` |
| `onHide` | `() => void` | `undefined` |
| `onShow` | `() => void` | `undefined` |
| `placement` | `'auto' | 'top' | 'right' | 'bottom' | 'left'` | `'top'` |
| `popperConfig` | `Partial<Options> | ((defaultConfig) => Partial<Options>)` | `undefined` |
| `trigger` | `Triggers | Triggers[]` | `['hover', 'focus']` |
| `visible` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `tooltip bs-tooltip-auto`
- Transition: `fade`, `show`

---

## Progress

### `CProgress`
**Import:** `import { CProgress } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `height` | `number` | `undefined` |
| `progressBarClassName` | `string` | `undefined` |
| `thin` | `boolean` | `undefined` |
| `value` | `number` | `undefined` |
| `white` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |
| plus `CProgressBarProps` | - | - |

**Class generation:**
- Base: `progress`
- `progress-thin`, `progress-white`

---

### `CProgressBar`
**Import:** `import { CProgressBar } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `animated` | `boolean` | `undefined` |
| `color` | `Colors` | `undefined` |
| `value` | `number` | `0` |
| `variant` | `'striped'` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `progress-bar`
- `bg-{color}`
- `progress-bar-striped`
- `progress-bar-animated`

---

## Misc

### `CBadge`
**Import:** `import { CBadge } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `as` | `ElementType` | `'span'` |
| `color` | `Colors` | `undefined` |
| `position` | `'top-start' | 'top-end' | 'bottom-end' | 'bottom-start'` | `undefined` |
| `shape` | `Shapes` | `undefined` |
| `size` | `'sm'` | `undefined` |
| `textBgColor` | `Colors` | `undefined` |
| `textColor` | `TextColors` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Base: `badge`
- `bg-{color}` / `text-{textColor}` / `text-bg-{textBgColor}`
- position helpers: `position-absolute translate-middle`, `top-*`, `start-*`
- `badge-sm`

---

### `CCollapse`
**Import:** `import { CCollapse } from '@coreui/react'`

| Prop | Type | Default |
|---|---|---|
| `horizontal` | `boolean` | `undefined` |
| `onHide` | `() => void` | `undefined` |
| `onShow` | `() => void` | `undefined` |
| `visible` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation (transition states):**
- `collapse-horizontal`
- `collapsing`
- `collapse show`
- `collapse`

---

### `CAccordion` and direct subcomponents
**Imports:**
```tsx
import {
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CAccordionButton,
} from '@coreui/react'
```

**`CAccordion` props:**

| Prop | Type | Default |
|---|---|---|
| `activeItemKey` | `number | string` | `undefined` |
| `alwaysOpen` | `boolean` | `false` |
| `flush` | `boolean` | `undefined` |
| `className` | `string` | `undefined` |

**Class:** `accordion`, optional `accordion-flush`

**`CAccordionItem` props:**
- `itemKey?: number | string`
- `id?: string`
- `className?: string`
- Class: `accordion-item`

**`CAccordionHeader` props:** `className`
- Class: `accordion-header`

**`CAccordionBody` props:** `className`
- Class: `accordion-body` inside `CCollapse` wrapper

**`CAccordionButton` props:** `className`
- Class: `accordion-button`, `collapsed` when not visible

---

### `COffcanvas` and direct subcomponents
**Imports:**
```tsx
import {
  COffcanvas,
  COffcanvasHeader,
  COffcanvasBody,
  COffcanvasTitle,
} from '@coreui/react'
```

**`COffcanvas` props:**

| Prop | Type | Default |
|---|---|---|
| `backdrop` | `boolean | 'static'` | `true` |
| `dark` | `boolean` | `undefined` |
| `keyboard` | `boolean` | `true` |
| `onHide` | `() => void` | `undefined` |
| `onShow` | `() => void` | `undefined` |
| `placement` | `'start' | 'end' | 'top' | 'bottom'` | required |
| `portal` | `boolean` | `false` |
| `responsive` | `boolean | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` | `true` |
| `scroll` | `boolean` | `false` |
| `visible` | `boolean` | `false` |
| `className` | `string` | `undefined` |

**Class generation:**
- `offcanvas` + optional responsive suffix class
- `offcanvas-{placement}`
- Transition states: `showing`, `show`, `show hiding`

**Subcomponents:**
- `COffcanvasHeader` -> class `offcanvas-header`
- `COffcanvasBody` -> class `offcanvas-body`
- `COffcanvasTitle` (`as` default `'h5'`) -> class `offcanvas-title`

---

### `CPagination` and direct subcomponent `CPaginationItem`
**Imports:**
```tsx
import { CPagination, CPaginationItem } from '@coreui/react'
```

**`CPagination` props:**

| Prop | Type | Default |
|---|---|---|
| `align` | `'start' | 'center' | 'end'` | `undefined` |
| `size` | `'sm' | 'lg'` | `undefined` |
| `className` | `string` | `undefined` |

**Class generation:**
- Wrapper list class: `pagination`
- `justify-content-{align}`
- `pagination-{size}`

**`CPaginationItem` props:**
- `active?: boolean`
- `as?: string | ElementType` (default `'span'` when active, otherwise `'a'`)
- `disabled?: boolean`
- Class wrapper: `page-item` with `active`/`disabled`
- Inner class: `page-link`

---

## `@coreui/icons-react` (brief reference)

**Package:** `@coreui/icons-react@2.3.0`

**Primary import pattern:**
```tsx
import { CIcon } from '@coreui/icons-react'
import { cilPencil } from '@coreui/icons'

<CIcon icon={cilPencil} />
```

**Common `CIcon` props:**
- `icon?: string | string[]`
- `size?: 'sm' | 'lg' | 'xl' | 'xxl' | '3xl' ... '9xl' | 'custom'`
- `customClassName?: string | string[]`
- `height?: number`, `width?: number`
- `title?: string`
- `use?: string`

---

## Dark Mode Implementation

CoreUI uses `data-coreui-theme="dark"` on a container (typically `<html>`).  
This toggles theme variables from `_root.scss` using dark values from `_variables-dark.scss`.

**Avoid in Landscape migration:**
- Tailwind `dark:` utility variants for color theming
- Hardcoded `#hex` theme colors in JSX/CSS modules
- Tailwind neutral color classes (`bg-gray-*`, `bg-slate-*`, etc.) for core UI surfaces

**Use instead:**
- CSS variables: `var(--cui-body-bg)`, `var(--cui-body-color)`, `var(--cui-border-color)`
- CoreUI utility classes where applicable
- CoreUI component props: `color`, `variant`, `size`, etc.

---

## Migration Patterns

### Tailwind to CoreUI mapping

| Tailwind pattern | CoreUI equivalent |
|---|---|
| `bg-white dark:bg-gray-900` | `background: var(--cui-body-bg)` or utility `bg-body` |
| `text-gray-900 dark:text-white` | `color: var(--cui-body-color)` or utility `text-body` |
| `border-gray-200 dark:border-gray-700` | `border-color: var(--cui-border-color)` |
| raw `<button className="...">` | `<CButton color="primary">...</CButton>` |
| `<input className="...">` | `<CFormInput ... />` |
| `<select className="...">` | `<CFormSelect ... />` |
| custom dropdown menu | `CDropdown` + `CDropdownToggle` + `CDropdownMenu` |
| custom modal wrappers | `CModal` + `CModalHeader` + `CModalBody` + `CModalFooter` |

---

## Common Patterns in Landscape

### Card with header/body/footer
```tsx
<CCard>
  <CCardHeader>Title</CCardHeader>
  <CCardBody>Content</CCardBody>
  <CCardFooter>Actions</CCardFooter>
</CCard>
```

### Form field with wrapper validation
```tsx
<CFormInput
  label="Project Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  invalid={!name}
  feedbackInvalid="Name is required"
/>
```

### Input group
```tsx
<CInputGroup>
  <span className="input-group-text">$</span>
  <CFormInput type="number" />
</CInputGroup>
```

### Tabs
```tsx
const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview')

<CTabs defaultActiveItemKey="overview">
  <CTabList variant="tabs">
    <CTab itemKey="overview">Overview</CTab>
    <CTab itemKey="details">Details</CTab>
  </CTabList>
  <CTabContent>
    <CTabPane visible={activeTab === 'overview'}>{/* ... */}</CTabPane>
    <CTabPane visible={activeTab === 'details'}>{/* ... */}</CTabPane>
  </CTabContent>
</CTabs>
```

### Modal
```tsx
<CModal visible={visible} onClose={() => setVisible(false)}>
  <CModalHeader>Title</CModalHeader>
  <CModalBody>Content</CModalBody>
  <CModalFooter>
    <CButton color="secondary" onClick={() => setVisible(false)}>Cancel</CButton>
    <CButton color="primary">Save</CButton>
  </CModalFooter>
</CModal>
```

### Dropdown
```tsx
<CDropdown>
  <CDropdownToggle color="secondary">Actions</CDropdownToggle>
  <CDropdownMenu>
    <CDropdownItem>Edit</CDropdownItem>
    <CDropdownItem>Archive</CDropdownItem>
  </CDropdownMenu>
</CDropdown>
```

### Toaster
```tsx
<CToaster placement="top-end" push={<CToast autohide delay={2500}><CToastBody>Saved</CToastBody></CToast>} />
```

---

## Source Coverage (this document)

Priority components covered from `@coreui/react/src/components`:
- Layout: `CContainer`, `CRow`, `CCol`, `CCard`, `CCardBody`, `CCardHeader`, `CCardFooter`
- Forms: `CForm`, `CFormInput`, `CFormSelect`, `CFormCheck`, `CFormLabel`, `CFormTextarea`, `CInputGroup`
- Buttons: `CButton`, `CButtonGroup`, `CCloseButton`
- Navigation: `CNav`, `CNavItem`, `CNavLink`, `CTabs`, `CTabContent`, `CTabPane`, `CSidebar`, `CSidebarNav`
- Feedback: `CModal`, `CModalHeader`, `CModalBody`, `CModalFooter`, `CToast`, `CToaster`, `CAlert`, `CSpinner`
- Data: `CTable`, `CTableHead`, `CTableBody`, `CTableRow`, `CTableHeaderCell`, `CTableDataCell`
- Overlay: `CDropdown`, `CDropdownToggle`, `CDropdownMenu`, `CDropdownItem`, `CPopover`, `CTooltip`
- Progress: `CProgress`, `CProgressBar`
- Misc: `CBadge`, `CCollapse`, `CAccordion`, `COffcanvas`, `CPagination`

Direct subcomponents additionally documented:
- `CTab`, `CTabList`
- `CAccordionItem`, `CAccordionHeader`, `CAccordionBody`, `CAccordionButton`
- `COffcanvasHeader`, `COffcanvasBody`, `COffcanvasTitle`
- `CPaginationItem`
- `CToastHeader`, `CToastBody`
