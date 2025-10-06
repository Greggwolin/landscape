# CoreUI Prototype Branch

This branch (`feature/coreui-prototype`) contains an experimental implementation of CoreUI components as an alternative to the current Material UI (MUI) setup.

## Quick Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **View options:**
   - **Full CoreUI App:** http://localhost:3000/coreui-app (Complete app with navigation)
   - **Component Demo:** http://localhost:3000/coreui-demo (Component showcase)
   - **Original MUI App:** http://localhost:3000 (Unchanged)

3. **Current branch:**
   ```bash
   git branch  # Should show * feature/coreui-prototype
   ```

## What's Been Set Up

### Dependencies Added
- `@coreui/react` (v5.9.1) - CoreUI React components
- `@coreui/coreui` (v5.4.3) - CoreUI CSS framework
- `@coreui/icons` (v3.0.1) - CoreUI icon set
- `@coreui/icons-react` (v2.3.0) - CoreUI React icon components

### New Directory Structure
```
src/app/
├── components/              # Original MUI components (untouched)
├── components-coreui/       # NEW: CoreUI parallel components
│   ├── CoreUIHeader.tsx     # Header with project selector
│   ├── CoreUINavigation.tsx # Sidebar navigation
│   └── README.md
├── coreui-demo/            # NEW: Component showcase page
│   ├── page.tsx
│   └── layout.tsx
└── coreui-app/             # NEW: Full CoreUI application
    ├── page.tsx            # Main app with all routes
    └── layout.tsx
```

### CoreUI App Features
The `/coreui-app` page is a **complete replication** of your app with:
- ✅ Full sidebar navigation (collapsible sections)
- ✅ Header with project selector dropdown
- ✅ All existing pages integrated (Home, Planning, Market, Budgets, etc.)
- ✅ Same ProjectProvider context
- ✅ Same routing logic
- ✅ User dropdown menu
- ✅ Footer with project info
- ✅ Responsive layout

### Demo Page Features
The `/coreui-demo` page demonstrates individual components:
- Forms (inputs, selects, textareas)
- Buttons (all variants)
- Cards and layouts
- Tables (responsive, hoverable)
- Tabs and navigation
- Badges and alerts
- Grid system (Bootstrap-based)

## Comparison: MUI vs CoreUI

### Current Stack (MUI)
- **Pros:** Comprehensive, Material Design, excellent TypeScript support
- **Cons:** Heavy bundle size, opinionated styling, complex customization
- **Current usage:** Heavily integrated throughout app

### CoreUI
- **Pros:** Bootstrap-based, lighter weight, admin-focused, flexible styling
- **Cons:** Less comprehensive than MUI, different design system
- **Use case:** Admin dashboards, internal tools

## Working with This Branch

### Adding CoreUI Components

Create components in `src/app/components-coreui/` to keep them separate:

```tsx
// src/app/components-coreui/MyComponent.tsx
'use client'
import { CButton, CCard } from '@coreui/react'
import '@coreui/react/dist/css/coreui.min.css'

export default function MyComponent() {
  return <CCard>...</CCard>
}
```

### Switching Between Branches

```bash
# Return to main branch
git checkout main

# Return to CoreUI prototype
git checkout feature/coreui-prototype

# Compare changes
git diff main feature/coreui-prototype
```

### Testing Alongside MUI

Both UI frameworks can coexist during evaluation:
- MUI components continue working normally
- CoreUI components are isolated in `components-coreui/`
- Demo page loads CoreUI CSS independently

## Decision Points

Before merging or adopting CoreUI, evaluate:

1. **Component Coverage:** Does CoreUI have all components you need?
2. **Customization:** Is it easier/harder to customize than MUI?
3. **Bundle Size:** Measure impact on build size
4. **Performance:** Compare rendering performance
5. **Accessibility:** Test WCAG compliance
6. **Developer Experience:** Team preference and learning curve
7. **Maintenance:** Community support and update frequency
8. **Migration Cost:** Effort to migrate existing MUI components

## Next Steps

### Option 1: Full Adoption
If CoreUI is superior:
1. Gradually migrate components from `components/` to CoreUI
2. Use feature flags for incremental rollout
3. Remove MUI dependencies when migration complete

### Option 2: Selective Use
Use CoreUI for specific sections:
1. Admin panels → CoreUI
2. Customer-facing UI → Keep MUI
3. Maintain both frameworks with clear boundaries

### Option 3: Stay with MUI
If MUI remains better:
1. Delete this branch: `git branch -D feature/coreui-prototype`
2. Continue with current architecture
3. Document learnings for future reference

## Build Configuration

CoreUI works with existing config:
- ✅ Tailwind CSS (compatible)
- ✅ Next.js 15 (compatible)
- ✅ TypeScript (fully typed)
- ✅ Turbopack (compatible)

No additional configuration needed for basic usage.

## Resources

- [CoreUI React Documentation](https://coreui.io/react/docs/)
- [CoreUI Components](https://coreui.io/react/docs/components/)
- [CoreUI Icons](https://icons.coreui.io/)
- [CoreUI Templates](https://coreui.io/react/docs/templates/)

## Notes

- Branch created: 2025-10-05
- Original stack remains functional
- No breaking changes to main codebase
- Safe to delete if not adopted
