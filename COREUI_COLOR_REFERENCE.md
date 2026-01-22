# CoreUI 5.x Color System Reference

Generated from local `node_modules/@coreui/coreui/dist/css/coreui.css` (CoreUI v5.4.3).
If you target CoreUI 5.2.0 exactly, verify these values against that release; 5.4.x adjusts some RGB mixes (notably dark theme tints).

## Primary Brand Colors

| Color | CSS Variable | HEX | RGB |
| --- | --- | --- | --- |
| Primary | `--cui-primary` | #5856d6 | 88, 86, 214 |
| Secondary | `--cui-secondary` | #6b7785 | 107, 119, 133 |
| Success | `--cui-success` | #1b9e3e | 27, 158, 62 |
| Danger | `--cui-danger` | #e55353 | 229, 83, 83 |
| Warning | `--cui-warning` | #f9b115 | 249, 177, 21 |
| Info | `--cui-info` | #39f | 51, 153, 255 |
| Light | `--cui-light` | #f3f4f7 | 243, 244, 247 |
| Dark | `--cui-dark` | #212631 | 33, 38, 49 |

## Color Variants

| Color | Base | Hover (btn) | Active (btn) | Disabled (btn) | Bg Subtle | Text Emphasis | Border Subtle |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Primary | #5856d6 | rgb(74.8, 73.1, 181.9) | rgb(70.4, 68.8, 171.2) | #5856d6 | #cfc7f3 | #3634a3 | #9d92e6 |
| Secondary | #6b7785 | rgb(90.95, 101.15, 113.05) | rgb(85.6, 95.2, 106.4) | #6b7785 | #ced2d8 | #212233 | #9da5b1 |
| Success | #1b9e3e | rgb(61.2, 172.55, 90.95) | rgb(72.6, 177.4, 100.6) | #1b9e3e | #cbedd6 | #0f5722 | #96dbad |
| Danger | #e55353 | rgb(232.9, 108.8, 108.8) | rgb(234.2, 117.4, 117.4) | #e55353 | #f9d4d4 | #671414 | #f2a9a9 |
| Warning | #f9b115 | rgb(249.9, 188.7, 56.1) | rgb(250.2, 192.6, 67.8) | #f9b115 | #feecc5 | #764705 | #fcd88a |
| Info | #39f | rgb(81.6, 168.3, 255) | rgb(91.8, 173.4, 255) | #39f | #c0e6ff | #184c77 | #80c6ff |
| Light | #f3f4f7 | rgb(206.55, 207.4, 209.95) | rgb(194.4, 195.2, 197.6) | #f3f4f7 | rgb(249, 249.5, 251) | #4a566d | #e7eaee |
| Dark | #212631 | rgb(66.3, 70.55, 79.9) | rgb(77.4, 81.4, 90.2) | #212631 | #cfd4de | #323a49 | #aab3c5 |

## Grayscale Palette

| Color | CSS Variable | Value |
| --- | --- | --- |
| WHITE | `--cui-white` | #fff |
| BLACK | `--cui-black` | #080a0c |
| GRAY-100 | `--cui-gray-100` | #f3f4f7 |
| GRAY-200 | `--cui-gray-200` | #e7eaee |
| GRAY-300 | `--cui-gray-300` | #dbdfe6 |
| GRAY-400 | `--cui-gray-400` | #cfd4de |
| GRAY-500 | `--cui-gray-500` | #aab3c5 |
| GRAY-600 | `--cui-gray-600` | #6d7d9c |
| GRAY-700 | `--cui-gray-700` | #4a566d |
| GRAY-800 | `--cui-gray-800` | #323a49 |
| GRAY-900 | `--cui-gray-900` | #212631 |

## Dark Theme Overrides

`data-coreui-theme="dark"` on any ancestor swaps the variables below for dark values.

| Variable | Light Value | Dark Value |
| --- | --- | --- |
| `--cui-body-bg` | #fff | #212631 |
| `--cui-body-color` | rgba(37, 42.92, 54.02, 0.95) | rgba(255, 255, 255, 0.87) |
| `--cui-emphasis-color` | #080a0c | #fff |
| `--cui-secondary-color` | rgba(37, 42.92, 54.02, 0.681) | rgba(255, 255, 255, 0.6) |
| `--cui-tertiary-color` | rgba(37, 42.92, 54.02, 0.38) | rgba(255, 255, 255, 0.38) |
| `--cui-disabled` | rgba(37, 42.92, 54.02, 0.38) | rgba(255, 255, 255, 0.38) |
| `--cui-border-color` | #dbdfe6 | #323a49 |
| `--cui-border-color-translucent` | rgba(8, 10, 12, 0.175) | rgba(255, 255, 255, 0.1) |
| `--cui-secondary-bg` | #e7eaee | #323a49 |
| `--cui-tertiary-bg` | #f3f4f7 | rgb(41.5, 48, 61) |

**Resolved component surfaces (via var references)**

| Component Token | Light Value | Dark Value |
| --- | --- | --- |
| `--cui-card-bg` | #fff | #212631 |
| `--cui-modal-bg` | #fff | #212631 |
| `--cui-card-border-color` | rgba(8, 10, 12, 0.175) | rgba(255, 255, 255, 0.1) |

**Text roles mapping**

| Role | Variable | Light | Dark |
| --- | --- | --- | --- |
| Primary text | `--cui-body-color` | rgba(37, 42.92, 54.02, 0.95) | rgba(255, 255, 255, 0.87) |
| Secondary text | `--cui-secondary-color` | rgba(37, 42.92, 54.02, 0.681) | rgba(255, 255, 255, 0.6) |
| Tertiary text | `--cui-tertiary-color` | rgba(37, 42.92, 54.02, 0.38) | rgba(255, 255, 255, 0.38) |
| Muted text | `--cui-disabled` | rgba(37, 42.92, 54.02, 0.38) | rgba(255, 255, 255, 0.38) |

## Component-Specific Colors

### Tables

| Variable | Value |
| --- | --- |
| `--cui-table-color-type` | initial |
| `--cui-table-bg-type` | initial |
| `--cui-table-color-state` | initial |
| `--cui-table-bg-state` | initial |
| `--cui-table-color` | var(--cui-emphasis-color) |
| `--cui-table-bg` | var(--cui-body-bg) |
| `--cui-table-border-color` | var(--cui-border-color) |
| `--cui-table-accent-bg` | transparent |
| `--cui-table-striped-color` | var(--cui-emphasis-color) |
| `--cui-table-striped-bg` | rgba(var(--cui-emphasis-color-rgb), 0.05) |
| `--cui-table-active-color` | var(--cui-emphasis-color) |
| `--cui-table-active-bg` | rgba(var(--cui-emphasis-color-rgb), 0.1) |
| `--cui-table-hover-color` | var(--cui-emphasis-color) |
| `--cui-table-hover-bg` | rgba(var(--cui-emphasis-color-rgb), 0.075) |

**Table Variants**

| Variant | Bg | Border | Striped Bg | Hover Bg | Active Bg |
| --- | --- | --- | --- | --- | --- |
| Primary | rgb(221.6, 221.2, 246.8) | rgb(178.88, 178.96, 199.84) | rgb(210.92, 210.64, 235.06) | rgb(205.58, 205.36, 229.19) | rgb(200.24, 200.08, 223.32) |
| Secondary | rgb(225.4, 227.8, 230.6) | rgb(181.92, 184.24, 186.88) | rgb(214.53, 216.91, 219.67) | rgb(209.095, 211.465, 214.205) | rgb(203.66, 206.02, 208.74) |
| Success | rgb(209.4, 235.6, 216.4) | rgb(169.12, 190.48, 175.52) | rgb(199.33, 224.32, 206.18) | rgb(194.295, 218.68, 201.07) | rgb(189.26, 213.04, 195.96) |
| Danger | rgb(249.8, 220.6, 220.6) | rgb(201.44, 178.48, 178.88) | rgb(237.71, 210.07, 210.17) | rgb(231.665, 204.805, 204.955) | rgb(225.62, 199.54, 199.74) |
| Warning | rgb(253.8, 239.4, 208.2) | rgb(204.64, 193.52, 168.96) | rgb(241.51, 227.93, 198.39) | rgb(235.365, 222.195, 193.485) | rgb(229.22, 216.46, 188.58) |
| Info | rgb(214.2, 234.6, 255) | rgb(172.96, 189.68, 206.4) | rgb(203.89, 223.37, 242.85) | rgb(198.735, 217.755, 236.775) | rgb(193.58, 212.14, 230.7) |
| Light | #f3f4f7 | rgb(196, 197.2, 200) | rgb(231.25, 232.3, 235.25) | rgb(225.375, 226.45, 229.375) | rgb(219.5, 220.6, 223.5) |
| Dark | #212631 | rgb(77.4, 81.4, 90.2) | rgb(44.1, 48.85, 59.3) | rgb(49.65, 54.275, 64.45) | rgb(55.2, 59.7, 69.6) |

### Forms

- Input base colors (from `.form-control`):
  - `color: var(--cui-body-color);`
  - `background-color: var(--cui-body-bg);`
  - `border: var(--cui-border-width) solid var(--cui-border-color);`
- Focus state (from `.form-control:focus`):
  - `color: var(--cui-body-color);`
  - `background-color: var(--cui-body-bg);`
  - `border-color: rgb(171.5, 170.5, 234.5);`
  - `box-shadow: 0 0 0 0.25rem rgba(88, 86, 214, 0.25);`
- Disabled state (from `.form-control:disabled`):
  - `background-color: var(--cui-secondary-bg);`
  - `opacity: 1;`
- Validation vars: `--cui-form-valid-color`, `--cui-form-valid-border-color`, `--cui-form-invalid-color`, `--cui-form-invalid-border-color`

### Buttons

#### Primary Button
- Background: `--cui-btn-bg` → #5856d6
- Border: `--cui-btn-border-color` → #5856d6
- Text: `--cui-btn-color` → #fff
- Hover BG: `--cui-btn-hover-bg` → rgb(74.8, 73.1, 181.9)
- Active BG: `--cui-btn-active-bg` → rgb(70.4, 68.8, 171.2)
- Disabled BG: `--cui-btn-disabled-bg` → #5856d6

#### Secondary Button
- Background: `--cui-btn-bg` → #6b7785
- Border: `--cui-btn-border-color` → #6b7785
- Text: `--cui-btn-color` → #fff
- Hover BG: `--cui-btn-hover-bg` → rgb(90.95, 101.15, 113.05)
- Active BG: `--cui-btn-active-bg` → rgb(85.6, 95.2, 106.4)
- Disabled BG: `--cui-btn-disabled-bg` → #6b7785

#### Success Button
- Background: `--cui-btn-bg` → #1b9e3e
- Border: `--cui-btn-border-color` → #1b9e3e
- Text: `--cui-btn-color` → #080a0c
- Hover BG: `--cui-btn-hover-bg` → rgb(61.2, 172.55, 90.95)
- Active BG: `--cui-btn-active-bg` → rgb(72.6, 177.4, 100.6)
- Disabled BG: `--cui-btn-disabled-bg` → #1b9e3e

#### Danger Button
- Background: `--cui-btn-bg` → #e55353
- Border: `--cui-btn-border-color` → #e55353
- Text: `--cui-btn-color` → #080a0c
- Hover BG: `--cui-btn-hover-bg` → rgb(232.9, 108.8, 108.8)
- Active BG: `--cui-btn-active-bg` → rgb(234.2, 117.4, 117.4)
- Disabled BG: `--cui-btn-disabled-bg` → #e55353

#### Warning Button
- Background: `--cui-btn-bg` → #f9b115
- Border: `--cui-btn-border-color` → #f9b115
- Text: `--cui-btn-color` → #080a0c
- Hover BG: `--cui-btn-hover-bg` → rgb(249.9, 188.7, 56.1)
- Active BG: `--cui-btn-active-bg` → rgb(250.2, 192.6, 67.8)
- Disabled BG: `--cui-btn-disabled-bg` → #f9b115

#### Info Button
- Background: `--cui-btn-bg` → #39f
- Border: `--cui-btn-border-color` → #39f
- Text: `--cui-btn-color` → #080a0c
- Hover BG: `--cui-btn-hover-bg` → rgb(81.6, 168.3, 255)
- Active BG: `--cui-btn-active-bg` → rgb(91.8, 173.4, 255)
- Disabled BG: `--cui-btn-disabled-bg` → #39f

#### Light Button
- Background: `--cui-btn-bg` → #f3f4f7
- Border: `--cui-btn-border-color` → #f3f4f7
- Text: `--cui-btn-color` → #080a0c
- Hover BG: `--cui-btn-hover-bg` → rgb(206.55, 207.4, 209.95)
- Active BG: `--cui-btn-active-bg` → rgb(194.4, 195.2, 197.6)
- Disabled BG: `--cui-btn-disabled-bg` → #f3f4f7

#### Dark Button
- Background: `--cui-btn-bg` → #212631
- Border: `--cui-btn-border-color` → #212631
- Text: `--cui-btn-color` → #fff
- Hover BG: `--cui-btn-hover-bg` → rgb(66.3, 70.55, 79.9)
- Active BG: `--cui-btn-active-bg` → rgb(77.4, 81.4, 90.2)
- Disabled BG: `--cui-btn-disabled-bg` → #212631

### Cards

| Variable | Value |
| --- | --- |
| `--cui-card-spacer-y` | 1rem |
| `--cui-card-spacer-x` | 1rem |
| `--cui-card-title-spacer-y` | 0.5rem |
| `--cui-card-title-color` |   |
| `--cui-card-subtitle-color` |   |
| `--cui-card-border-width` | var(--cui-border-width) |
| `--cui-card-border-color` | var(--cui-border-color-translucent) |
| `--cui-card-border-radius` | var(--cui-border-radius) |
| `--cui-card-box-shadow` |   |
| `--cui-card-inner-border-radius` | calc(var(--cui-border-radius) - (var(--cui-border-width))) |
| `--cui-card-cap-padding-y` | 0.5rem |
| `--cui-card-cap-padding-x` | 1rem |
| `--cui-card-cap-bg` | rgba(var(--cui-body-color-rgb), 0.03) |
| `--cui-card-cap-color` |   |
| `--cui-card-height` |   |
| `--cui-card-color` |   |
| `--cui-card-bg` | var(--cui-body-bg) |
| `--cui-card-img-overlay-padding` | 1rem |
| `--cui-card-group-margin` | 0.75rem |

### Modals

| Variable | Value |
| --- | --- |
| `--cui-modal-zindex` | 1055 |
| `--cui-modal-width` | 500px |
| `--cui-modal-padding` | 1rem |
| `--cui-modal-margin` | 0.5rem |
| `--cui-modal-color` | var(--cui-body-color) |
| `--cui-modal-bg` | var(--cui-body-bg) |
| `--cui-modal-border-color` | var(--cui-border-color-translucent) |
| `--cui-modal-border-width` | var(--cui-border-width) |
| `--cui-modal-border-radius` | var(--cui-border-radius-lg) |
| `--cui-modal-box-shadow` | var(--cui-box-shadow-sm) |
| `--cui-modal-inner-border-radius` | calc(var(--cui-border-radius-lg) - (var(--cui-border-width))) |
| `--cui-modal-header-padding-x` | 1rem |
| `--cui-modal-header-padding-y` | 1rem |
| `--cui-modal-header-padding` | 1rem 1rem |
| `--cui-modal-header-border-color` | var(--cui-border-color) |
| `--cui-modal-header-border-width` | var(--cui-border-width) |
| `--cui-modal-title-line-height` | 1.5 |
| `--cui-modal-footer-gap` | 0.5rem |
| `--cui-modal-footer-bg` |   |
| `--cui-modal-footer-border-color` | var(--cui-border-color) |
| `--cui-modal-footer-border-width` | var(--cui-border-width) |

### Alerts

| Variant | Text | Background | Border |
| --- | --- | --- | --- |
| Primary | var(--cui-primary-text-emphasis) | var(--cui-primary-bg-subtle) | var(--cui-primary-border-subtle) |
| Secondary | var(--cui-secondary-text-emphasis) | var(--cui-secondary-bg-subtle) | var(--cui-secondary-border-subtle) |
| Success | var(--cui-success-text-emphasis) | var(--cui-success-bg-subtle) | var(--cui-success-border-subtle) |
| Danger | var(--cui-danger-text-emphasis) | var(--cui-danger-bg-subtle) | var(--cui-danger-border-subtle) |
| Warning | var(--cui-warning-text-emphasis) | var(--cui-warning-bg-subtle) | var(--cui-warning-border-subtle) |
| Info | var(--cui-info-text-emphasis) | var(--cui-info-bg-subtle) | var(--cui-info-border-subtle) |
| Light | var(--cui-light-text-emphasis) | var(--cui-light-bg-subtle) | var(--cui-light-border-subtle) |
| Dark | var(--cui-dark-text-emphasis) | var(--cui-dark-bg-subtle) | var(--cui-dark-border-subtle) |

### Badges

| Variable | Value |
| --- | --- |
| `--cui-badge-padding-x` | 0.65em |
| `--cui-badge-padding-y` | 0.35em |
| `--cui-badge-font-size` | 0.75em |
| `--cui-badge-font-weight` | 700 |
| `--cui-badge-color` | #fff |
| `--cui-badge-border-radius` | var(--cui-border-radius) |

## CSS Variable Quick Reference

### Brand Colors

| Variable | Value |
| --- | --- |
| `--cui-primary` | #5856d6 |
| `--cui-secondary` | #6b7785 |
| `--cui-success` | #1b9e3e |
| `--cui-danger` | #e55353 |
| `--cui-warning` | #f9b115 |
| `--cui-info` | #39f |
| `--cui-light` | #f3f4f7 |
| `--cui-dark` | #212631 |
| `--cui-primary-rgb` | 88, 86, 214 |
| `--cui-secondary-rgb` | 107, 119, 133 |
| `--cui-success-rgb` | 27, 158, 62 |
| `--cui-danger-rgb` | 229, 83, 83 |
| `--cui-warning-rgb` | 249, 177, 21 |
| `--cui-info-rgb` | 51, 153, 255 |
| `--cui-light-rgb` | 243, 244, 247 |
| `--cui-dark-rgb` | 33, 38, 49 |

### Color Accents

| Variable | Value |
| --- | --- |
| `--cui-blue` | #0d6efd |
| `--cui-indigo` | #6610f2 |
| `--cui-purple` | #6f42c1 |
| `--cui-pink` | #d63384 |
| `--cui-red` | #dc3545 |
| `--cui-orange` | #fd7e14 |
| `--cui-yellow` | #ffc107 |
| `--cui-green` | #198754 |
| `--cui-teal` | #20c997 |
| `--cui-cyan` | #0dcaf0 |

### Grays & Base

| Variable | Value |
| --- | --- |
| `--cui-black` | #080a0c |
| `--cui-white` | #fff |
| `--cui-gray` | #6d7d9c |
| `--cui-gray-dark` | #323a49 |
| `--cui-gray-100` | #f3f4f7 |
| `--cui-gray-200` | #e7eaee |
| `--cui-gray-300` | #dbdfe6 |
| `--cui-gray-400` | #cfd4de |
| `--cui-gray-500` | #aab3c5 |
| `--cui-gray-600` | #6d7d9c |
| `--cui-gray-700` | #4a566d |
| `--cui-gray-800` | #323a49 |
| `--cui-gray-900` | #212631 |
| `--cui-black-rgb` | 8, 10, 12 |
| `--cui-white-rgb` | 255, 255, 255 |

### Emphasis & State

| Variable | Value |
| --- | --- |
| `--cui-primary-text-emphasis` | #3634a3 |
| `--cui-secondary-text-emphasis` | #212233 |
| `--cui-success-text-emphasis` | #0f5722 |
| `--cui-info-text-emphasis` | #184c77 |
| `--cui-warning-text-emphasis` | #764705 |
| `--cui-danger-text-emphasis` | #671414 |
| `--cui-light-text-emphasis` | #4a566d |
| `--cui-dark-text-emphasis` | #323a49 |
| `--cui-primary-bg-subtle` | #cfc7f3 |
| `--cui-secondary-bg-subtle` | #ced2d8 |
| `--cui-success-bg-subtle` | #cbedd6 |
| `--cui-info-bg-subtle` | #c0e6ff |
| `--cui-warning-bg-subtle` | #feecc5 |
| `--cui-danger-bg-subtle` | #f9d4d4 |
| `--cui-light-bg-subtle` | rgb(249, 249.5, 251) |
| `--cui-dark-bg-subtle` | #cfd4de |
| `--cui-primary-border-subtle` | #9d92e6 |
| `--cui-secondary-border-subtle` | #9da5b1 |
| `--cui-success-border-subtle` | #96dbad |
| `--cui-info-border-subtle` | #80c6ff |
| `--cui-warning-border-subtle` | #fcd88a |
| `--cui-danger-border-subtle` | #f2a9a9 |
| `--cui-light-border-subtle` | #e7eaee |
| `--cui-dark-border-subtle` | #aab3c5 |
| `--cui-high-emphasis` | rgba(37, 42.92, 54.02, 0.95) |
| `--cui-medium-emphasis` | rgba(37, 42.92, 54.02, 0.681) |
| `--cui-disabled` | rgba(37, 42.92, 54.02, 0.38) |
| `--cui-high-emphasis-inverse` | rgba(255, 255, 255, 0.87) |
| `--cui-medium-emphasis-inverse` | rgba(255, 255, 255, 0.6) |
| `--cui-disabled-inverse` | rgba(255, 255, 255, 0.38) |

### Layout

| Variable | Value |
| --- | --- |
| `--cui-body-bg` | #fff |
| `--cui-body-bg-rgb` | 255, 255, 255 |
| `--cui-body-color` | rgba(37, 42.92, 54.02, 0.95) |
| `--cui-body-color-rgb` | 37, 42.92, 54.02 |
| `--cui-body-bg-dark` | #212631 |
| `--cui-body-bg-rgb-dark` | 33, 38, 49 |
| `--cui-body-color-dark` | rgba(255, 255, 255, 0.87) |
| `--cui-body-color-rgb-dark` | 255, 255, 255 |
| `--cui-secondary-bg` | #e7eaee |
| `--cui-secondary-bg-rgb` | 231, 234, 238 |
| `--cui-secondary-bg-dark` | #323a49 |
| `--cui-secondary-bg-rgb-dark` | 50, 58, 73 |
| `--cui-tertiary-bg` | #f3f4f7 |
| `--cui-tertiary-bg-rgb` | 243, 244, 247 |
| `--cui-tertiary-bg-dark` | rgb(41.5, 48, 61) |
| `--cui-tertiary-bg-rgb-dark` | 41.5, 48, 61 |
| `--cui-emphasis-color` | #080a0c |
| `--cui-emphasis-color-rgb` | 8, 10, 12 |
| `--cui-emphasis-color-dark` | #fff |
| `--cui-emphasis-color-rgb-dark` | 255, 255, 255 |
| `--cui-gradient` | linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0)) |

### Typography

| Variable | Value |
| --- | --- |
| `--cui-font-sans-serif` | system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" |
| `--cui-font-monospace` | SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace |
| `--cui-body-font-family` | var(--cui-font-sans-serif) |
| `--cui-body-font-size` | 1rem |
| `--cui-body-font-weight` | 400 |
| `--cui-body-line-height` | 1.5 |
| `--cui-heading-color` | inherit |
| `--cui-link-color` | #5856d6 |
| `--cui-link-color-rgb` | 88, 86, 214 |
| `--cui-link-hover-color` | rgb(70.4, 68.8, 171.2) |
| `--cui-link-hover-color-rgb` | 70.4, 68.8, 171.2 |
| `--cui-link-decoration` | underline |
| `--cui-code-color` | #d63384 |
| `--cui-highlight-color` | rgba(37, 42.92, 54.02, 0.95) |
| `--cui-highlight-bg` | rgb(255, 242.6, 205.4) |

### Borders

| Variable | Value |
| --- | --- |
| `--cui-border-width` | 1px |
| `--cui-border-style` | solid |
| `--cui-border-color` | #dbdfe6 |
| `--cui-border-color-translucent` | rgba(8, 10, 12, 0.175) |
| `--cui-border-radius` | 0.375rem |
| `--cui-border-radius-sm` | 0.25rem |
| `--cui-border-radius-lg` | 0.5rem |
| `--cui-border-radius-xl` | 1rem |
| `--cui-border-radius-xxl` | 2rem |
| `--cui-border-radius-2xl` | var(--cui-border-radius-xxl) |
| `--cui-border-radius-pill` | 50rem |

### Shadows & Focus

| Variable | Value |
| --- | --- |
| `--cui-box-shadow` | 0 0.5rem 1rem rgba(8, 10, 12, 0.15) |
| `--cui-box-shadow-sm` | 0 0.125rem 0.25rem rgba(8, 10, 12, 0.075) |
| `--cui-box-shadow-lg` | 0 1rem 3rem rgba(8, 10, 12, 0.175) |
| `--cui-box-shadow-inset` | inset 0 1px 2px rgba(8, 10, 12, 0.075) |
| `--cui-focus-ring-width` | 0.25rem |
| `--cui-focus-ring-opacity` | 0.25 |
| `--cui-focus-ring-color` | rgba(88, 86, 214, 0.25) |

### Forms

| Variable | Value |
| --- | --- |
| `--cui-form-valid-color` | #1b9e3e |
| `--cui-form-valid-border-color` | #1b9e3e |
| `--cui-form-invalid-color` | #e55353 |
| `--cui-form-invalid-border-color` | #e55353 |

### Buttons

| Variable | Value |
| --- | --- |
| `--cui-btn-padding-x` | (component-defined) |
| `--cui-btn-padding-y` | (component-defined) |
| `--cui-btn-font-family` | (component-defined) |
| `--cui-btn-font-size` | (component-defined) |
| `--cui-btn-font-weight` | (component-defined) |
| `--cui-btn-line-height` | (component-defined) |
| `--cui-btn-color` | (component-defined) |
| `--cui-btn-bg` | (component-defined) |
| `--cui-btn-border-width` | (component-defined) |
| `--cui-btn-border-color` | (component-defined) |
| `--cui-btn-border-radius` | (component-defined) |
| `--cui-btn-hover-color` | (component-defined) |
| `--cui-btn-hover-bg` | (component-defined) |
| `--cui-btn-hover-border-color` | (component-defined) |
| `--cui-btn-active-color` | (component-defined) |
| `--cui-btn-active-bg` | (component-defined) |
| `--cui-btn-active-border-color` | (component-defined) |
| `--cui-btn-disabled-color` | (component-defined) |
| `--cui-btn-disabled-bg` | (component-defined) |
| `--cui-btn-disabled-border-color` | (component-defined) |
| `--cui-btn-focus-shadow-rgb` | (component-defined) |

### Tables

| Variable | Value |
| --- | --- |
| `--cui-table-color-type` | (component-defined) |
| `--cui-table-bg-type` | (component-defined) |
| `--cui-table-color-state` | (component-defined) |
| `--cui-table-bg-state` | (component-defined) |
| `--cui-table-color` | (component-defined) |
| `--cui-table-bg` | (component-defined) |
| `--cui-table-border-color` | (component-defined) |
| `--cui-table-accent-bg` | (component-defined) |
| `--cui-table-striped-color` | (component-defined) |
| `--cui-table-striped-bg` | (component-defined) |
| `--cui-table-active-color` | (component-defined) |
| `--cui-table-active-bg` | (component-defined) |
| `--cui-table-hover-color` | (component-defined) |
| `--cui-table-hover-bg` | (component-defined) |

### Cards

| Variable | Value |
| --- | --- |
| `--cui-card-spacer-y` | (component-defined) |
| `--cui-card-spacer-x` | (component-defined) |
| `--cui-card-title-spacer-y` | (component-defined) |
| `--cui-card-title-color` | (component-defined) |
| `--cui-card-subtitle-color` | (component-defined) |
| `--cui-card-border-width` | (component-defined) |
| `--cui-card-border-color` | (component-defined) |
| `--cui-card-border-radius` | (component-defined) |
| `--cui-card-box-shadow` | (component-defined) |
| `--cui-card-inner-border-radius` | (component-defined) |
| `--cui-card-cap-padding-y` | (component-defined) |
| `--cui-card-cap-padding-x` | (component-defined) |
| `--cui-card-cap-bg` | (component-defined) |
| `--cui-card-cap-color` | (component-defined) |
| `--cui-card-height` | (component-defined) |
| `--cui-card-color` | (component-defined) |
| `--cui-card-bg` | (component-defined) |
| `--cui-card-img-overlay-padding` | (component-defined) |
| `--cui-card-group-margin` | (component-defined) |

### Modals

| Variable | Value |
| --- | --- |
| `--cui-modal-zindex` | (component-defined) |
| `--cui-modal-width` | (component-defined) |
| `--cui-modal-padding` | (component-defined) |
| `--cui-modal-margin` | (component-defined) |
| `--cui-modal-color` | (component-defined) |
| `--cui-modal-bg` | (component-defined) |
| `--cui-modal-border-color` | (component-defined) |
| `--cui-modal-border-width` | (component-defined) |
| `--cui-modal-border-radius` | (component-defined) |
| `--cui-modal-box-shadow` | (component-defined) |
| `--cui-modal-inner-border-radius` | (component-defined) |
| `--cui-modal-header-padding-x` | (component-defined) |
| `--cui-modal-header-padding-y` | (component-defined) |
| `--cui-modal-header-padding` | (component-defined) |
| `--cui-modal-header-border-color` | (component-defined) |
| `--cui-modal-header-border-width` | (component-defined) |
| `--cui-modal-title-line-height` | (component-defined) |
| `--cui-modal-footer-gap` | (component-defined) |
| `--cui-modal-footer-bg` | (component-defined) |
| `--cui-modal-footer-border-color` | (component-defined) |
| `--cui-modal-footer-border-width` | (component-defined) |

### Alerts

| Variable | Value |
| --- | --- |
| `--cui-alert-bg` | (component-defined) |
| `--cui-alert-color` | (component-defined) |
| `--cui-alert-border-color` | (component-defined) |
| `--cui-alert-border` | (component-defined) |
| `--cui-alert-link-color` | (component-defined) |
| `--cui-alert-padding-x` | (component-defined) |
| `--cui-alert-padding-y` | (component-defined) |
| `--cui-alert-margin-bottom` | (component-defined) |
| `--cui-alert-border-radius` | (component-defined) |

### Badges

| Variable | Value |
| --- | --- |
| `--cui-badge-padding-x` | (component-defined) |
| `--cui-badge-padding-y` | (component-defined) |
| `--cui-badge-font-size` | (component-defined) |
| `--cui-badge-font-weight` | (component-defined) |
| `--cui-badge-color` | (component-defined) |
| `--cui-badge-border-radius` | (component-defined) |

### Misc

| Variable | Value |
| --- | --- |
| `--cui-carousel-indicator-active-bg` | #fff |
| `--cui-carousel-caption-color` | #fff |
| `--cui-carousel-control-icon-filter` |   |
| `--cui-btn-close-filter` |   |
| `--cui-btn-close-color` | (component-defined) |
| `--cui-btn-close-bg` | (component-defined) |
| `--cui-btn-close-opacity` | (component-defined) |
| `--cui-btn-close-hover-opacity` | (component-defined) |
| `--cui-btn-close-focus-shadow` | (component-defined) |
| `--cui-btn-close-focus-opacity` | (component-defined) |
| `--cui-btn-close-disabled-opacity` | (component-defined) |

### Other Root Vars

| Variable | Value |
| --- | --- |
| `--cui-secondary-color` | rgba(37, 42.92, 54.02, 0.681) |
| `--cui-secondary-color-rgb` | 37, 42.92, 54.02 |
| `--cui-tertiary-color` | rgba(37, 42.92, 54.02, 0.38) |
| `--cui-tertiary-color-rgb` | 37, 42.92, 54.02 |
| `--cui-secondary-color-dark` | rgba(255, 255, 255, 0.6) |
| `--cui-secondary-color-rgb-dark` | 255, 255, 255 |
| `--cui-tertiary-color-dark` | rgba(255, 255, 255, 0.38) |
| `--cui-tertiary-color-rgb-dark` | 255, 255, 255 |

## Dark Theme Notes

- Dark theme is activated by adding `data-coreui-theme="dark"` on the `html` element or a container; it overrides the root CSS variables for that subtree.
- Component tokens like cards/modals/alerts resolve through the same variable names, so dark values flow through without redefining every component variable.