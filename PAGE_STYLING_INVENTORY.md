# Page Styling System Inventory

Date: January 20, 2026

Purpose: Determine which styling system each page/route uses


## Section 1: Page Routes

```
src/app/admin/benchmarks/cost-library/page.tsx
src/app/admin/benchmarks/page.tsx
src/app/admin/dms/templates/page.tsx
src/app/admin/preferences/page.tsx
src/app/admin/users/page.tsx
src/app/ai-document-review/page.tsx
src/app/benchmarks/products/page.tsx
src/app/benchmarks/unit-costs/page.tsx
src/app/breadcrumb-demo/page.tsx
src/app/budget-grid/page.tsx
src/app/budget-grid-v2/page.tsx
src/app/contacts/page.tsx
src/app/dashboard/page.tsx
src/app/db-schema/page.tsx
src/app/dev-status/page.tsx
src/app/diligence/page.tsx
src/app/dms/page.tsx
src/app/documentation/page.tsx
src/app/documents/review/page.tsx
src/app/forgot-password/page.tsx
src/app/gis-simple-test/page.tsx
src/app/gis-test/page.tsx
src/app/growthratedetail/page.tsx
src/app/growthrates/page.tsx
src/app/growthrates-original/page.tsx
src/app/growthratesmanager/page.tsx
src/app/ingestion/page.tsx
src/app/inventory/page.tsx
src/app/lease/[id]/page.tsx
src/app/login/page.tsx
src/app/map-debug/page.tsx
src/app/market/page.tsx
src/app/market-assumptions/page.tsx
src/app/page.tsx
src/app/parcel-test/page.tsx
src/app/phases/page.tsx
src/app/planning/page.tsx
src/app/preferences/page.tsx
src/app/projects/[projectId]/acquisition/page.tsx
src/app/projects/[projectId]/analysis/market-data/page.tsx
src/app/projects/[projectId]/analysis/page.tsx
src/app/projects/[projectId]/analysis/sensitivity/page.tsx
src/app/projects/[projectId]/assumptions/page.tsx
src/app/projects/[projectId]/budget/page.tsx
src/app/projects/[projectId]/capitalization/debt/page.tsx
src/app/projects/[projectId]/capitalization/equity/page.tsx
src/app/projects/[projectId]/capitalization/operations/page.tsx
src/app/projects/[projectId]/capitalization/waterfall/page.tsx
src/app/projects/[projectId]/development/budget/page.tsx
src/app/projects/[projectId]/development/phasing/page.tsx
src/app/projects/[projectId]/documents/files/page.tsx
src/app/projects/[projectId]/documents/page.tsx
src/app/projects/[projectId]/landscaper/page.tsx
src/app/projects/[projectId]/napkin/page.tsx
src/app/projects/[projectId]/napkin/waterfall/page.tsx
src/app/projects/[projectId]/opex/page.tsx
src/app/projects/[projectId]/opex-accounts/page.tsx
src/app/projects/[projectId]/overview/page.tsx
src/app/projects/[projectId]/page.tsx
src/app/projects/[projectId]/planning/budget/page.tsx
src/app/projects/[projectId]/planning/land-use/page.tsx
src/app/projects/[projectId]/planning/market/page.tsx
src/app/projects/[projectId]/project/budget/page.tsx
src/app/projects/[projectId]/project/dms/page.tsx
src/app/projects/[projectId]/project/planning/page.tsx
src/app/projects/[projectId]/project/sales/page.tsx
src/app/projects/[projectId]/project/summary/page.tsx
src/app/projects/[projectId]/results/page.tsx
src/app/projects/[projectId]/sales-marketing/page.tsx
src/app/projects/[projectId]/settings/page.tsx
src/app/projects/[projectId]/validation/page.tsx
src/app/projects/[projectId]/valuation/income-approach/page.tsx
src/app/projects/[projectId]/valuation/page.tsx
src/app/projects/setup/page.tsx
src/app/properties/[id]/analysis/page.tsx
src/app/property/[id]/page.tsx
src/app/prototypes/[prototypeId]/page.tsx
src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx
src/app/prototypes/multifam/rent-roll-inputs/page.tsx
src/app/prototypes/page.tsx
src/app/prototypes-multifam/page.tsx
src/app/register/page.tsx
src/app/rent-roll/page.tsx
src/app/reports/page.tsx
src/app/reset-password/page.tsx
src/app/settings/budget-categories/page.tsx
src/app/settings/contact-roles/page.tsx
src/app/settings/profile/page.tsx
src/app/settings/taxonomy/page.tsx
src/app/test-coreui/page.tsx
```

## Section 2: Page Categorization

| Route | Page File | Primary System | CoreUI Imports | MUI Imports | Tailwind Classes | Inline Styles | Status |
|-------|-----------|----------------|----------------|-------------|------------------|---------------|--------|
| /admin/benchmarks/cost-library | src/app/admin/benchmarks/cost-library/page.tsx | TAILWIND | 0 | 0 | 9 | 0 | ✅ Clean |
| /admin/benchmarks | src/app/admin/benchmarks/page.tsx | TAILWIND | 0 | 0 | 20 | 5 | ✅ Clean |
| /admin/dms/templates | src/app/admin/dms/templates/page.tsx | TAILWIND | 0 | 0 | 37 | 0 | ✅ Clean |
| /admin/preferences | src/app/admin/preferences/page.tsx | TAILWIND | 0 | 0 | 17 | 19 | 🔴 Problematic |
| /admin/users | src/app/admin/users/page.tsx | TAILWIND | 0 | 0 | 47 | 0 | ✅ Clean |
| /ai-document-review | src/app/ai-document-review/page.tsx | TAILWIND | 0 | 0 | 30 | 0 | ✅ Clean |
| /benchmarks/products | src/app/benchmarks/products/page.tsx | TAILWIND | 0 | 0 | 2 | 2 | ✅ Clean |
| /benchmarks/unit-costs | src/app/benchmarks/unit-costs/page.tsx | TAILWIND | 0 | 0 | 35 | 24 | 🔴 Problematic |
| /breadcrumb-demo | src/app/breadcrumb-demo/page.tsx | TAILWIND | 0 | 0 | 75 | 0 | ✅ Clean |
| /budget-grid | src/app/budget-grid/page.tsx | MUI | 0 | 9 | 3 | 0 | ✅ Clean |
| /budget-grid-v2 | src/app/budget-grid-v2/page.tsx | TAILWIND | 0 | 0 | 10 | 0 | ✅ Clean |
| /contacts | src/app/contacts/page.tsx | MIXED | 1 | 0 | 20 | 3 | ⚠️ Mixed |
| /dashboard | src/app/dashboard/page.tsx | MIXED | 1 | 0 | 24 | 16 | 🔴 Problematic |
| /db-schema | src/app/db-schema/page.tsx | TAILWIND | 0 | 0 | 7 | 0 | ✅ Clean |
| /dev-status | src/app/dev-status/page.tsx | MINIMAL | 0 | 0 | 0 | 0 | ✅ Clean |
| /diligence | src/app/diligence/page.tsx | MIXED | 0 | 0 | 0 | 9 | ⚠️ Mixed |
| /dms | src/app/dms/page.tsx | TAILWIND | 0 | 0 | 36 | 0 | ✅ Clean |
| /documentation | src/app/documentation/page.tsx | TAILWIND | 0 | 0 | 91 | 13 | 🔴 Problematic |
| /documents/review | src/app/documents/review/page.tsx | TAILWIND | 0 | 0 | 99 | 1 | ✅ Clean |
| /forgot-password | src/app/forgot-password/page.tsx | TAILWIND | 0 | 0 | 24 | 0 | ✅ Clean |
| /gis-simple-test | src/app/gis-simple-test/page.tsx | TAILWIND | 0 | 0 | 31 | 0 | ✅ Clean |
| /gis-test | src/app/gis-test/page.tsx | TAILWIND | 0 | 0 | 11 | 0 | ✅ Clean |
| /growthratedetail | src/app/growthratedetail/page.tsx | COREUI | 1 | 0 | 3 | 0 | ✅ Clean |
| /growthrates | src/app/growthrates/page.tsx | TAILWIND | 0 | 0 | 1 | 0 | ✅ Clean |
| /growthrates-original | src/app/growthrates-original/page.tsx | TAILWIND | 0 | 0 | 1 | 0 | ✅ Clean |
| /growthratesmanager | src/app/growthratesmanager/page.tsx | TAILWIND | 0 | 0 | 1 | 0 | ✅ Clean |
| /ingestion | src/app/ingestion/page.tsx | COREUI | 1 | 0 | 7 | 2 | ✅ Clean |
| /inventory | src/app/inventory/page.tsx | TAILWIND | 0 | 0 | 11 | 0 | ✅ Clean |
| /lease/[id] | src/app/lease/[id]/page.tsx | MIXED | 0 | 0 | 0 | 0 | ⚠️ Mixed |
| /login | src/app/login/page.tsx | TAILWIND | 0 | 0 | 22 | 0 | ✅ Clean |
| /map-debug | src/app/map-debug/page.tsx | TAILWIND | 0 | 0 | 8 | 0 | ✅ Clean |
| /market | src/app/market/page.tsx | TAILWIND | 0 | 0 | 25 | 2 | ✅ Clean |
| /market-assumptions | src/app/market-assumptions/page.tsx | MINIMAL | 0 | 0 | 0 | 0 | ✅ Clean |
| / | src/app/page.tsx | TAILWIND | 0 | 0 | 1 | 2 | ✅ Clean |
| /parcel-test | src/app/parcel-test/page.tsx | TAILWIND | 0 | 0 | 6 | 1 | ✅ Clean |
| /phases | src/app/phases/page.tsx | MIXED | 0 | 0 | 0 | 9 | ⚠️ Mixed |
| /planning | src/app/planning/page.tsx | TAILWIND | 0 | 0 | 1 | 1 | ✅ Clean |
| /preferences | src/app/preferences/page.tsx | TAILWIND | 0 | 0 | 1 | 1 | ✅ Clean |
| /projects/[projectId]/acquisition | src/app/projects/[projectId]/acquisition/page.tsx | TAILWIND | 0 | 0 | 1 | 1 | ✅ Clean |
| /projects/[projectId]/analysis/market-data | src/app/projects/[projectId]/analysis/market-data/page.tsx | TAILWIND | 0 | 0 | 2 | 0 | ✅ Clean |
| /projects/[projectId]/analysis | src/app/projects/[projectId]/analysis/page.tsx | TAILWIND | 0 | 0 | 3 | 1 | ✅ Clean |
| /projects/[projectId]/analysis/sensitivity | src/app/projects/[projectId]/analysis/sensitivity/page.tsx | TAILWIND | 0 | 0 | 2 | 0 | ✅ Clean |
| /projects/[projectId]/assumptions | src/app/projects/[projectId]/assumptions/page.tsx | TAILWIND | 0 | 0 | 12 | 0 | ✅ Clean |
| /projects/[projectId]/budget | src/app/projects/[projectId]/budget/page.tsx | TAILWIND | 0 | 0 | 1 | 0 | ✅ Clean |
| /projects/[projectId]/capitalization/debt | src/app/projects/[projectId]/capitalization/debt/page.tsx | COREUI | 1 | 0 | 4 | 0 | ✅ Clean |
| /projects/[projectId]/capitalization/equity | src/app/projects/[projectId]/capitalization/equity/page.tsx | COREUI | 1 | 0 | 3 | 2 | ✅ Clean |
| /projects/[projectId]/capitalization/operations | src/app/projects/[projectId]/capitalization/operations/page.tsx | COREUI | 1 | 0 | 6 | 1 | ✅ Clean |
| /projects/[projectId]/capitalization/waterfall | src/app/projects/[projectId]/capitalization/waterfall/page.tsx | MINIMAL | 0 | 0 | 0 | 0 | ✅ Clean |
| /projects/[projectId]/development/budget | src/app/projects/[projectId]/development/budget/page.tsx | TAILWIND | 0 | 0 | 1 | 0 | ✅ Clean |
| /projects/[projectId]/development/phasing | src/app/projects/[projectId]/development/phasing/page.tsx | TAILWIND | 0 | 0 | 28 | 2 | ✅ Clean |
| /projects/[projectId]/documents/files | src/app/projects/[projectId]/documents/files/page.tsx | TAILWIND | 0 | 0 | 1 | 1 | ✅ Clean |
| /projects/[projectId]/documents | src/app/projects/[projectId]/documents/page.tsx | TAILWIND | 0 | 0 | 7 | 5 | ✅ Clean |
| /projects/[projectId]/landscaper | src/app/projects/[projectId]/landscaper/page.tsx | COREUI | 1 | 0 | 1 | 0 | ✅ Clean |
| /projects/[projectId]/napkin | src/app/projects/[projectId]/napkin/page.tsx | TAILWIND | 0 | 0 | 2 | 1 | ✅ Clean |
| /projects/[projectId]/napkin/waterfall | src/app/projects/[projectId]/napkin/waterfall/page.tsx | TAILWIND | 0 | 0 | 5 | 2 | ✅ Clean |
| /projects/[projectId]/opex | src/app/projects/[projectId]/opex/page.tsx | TAILWIND | 0 | 0 | 40 | 29 | 🔴 Problematic |
| /projects/[projectId]/opex-accounts | src/app/projects/[projectId]/opex-accounts/page.tsx | TAILWIND | 0 | 0 | 2 | 0 | ✅ Clean |
| /projects/[projectId]/overview | src/app/projects/[projectId]/overview/page.tsx | TAILWIND | 0 | 0 | 81 | 71 | 🔴 Problematic |
| /projects/[projectId] | src/app/projects/[projectId]/page.tsx | COREUI | 1 | 0 | 9 | 0 | ✅ Clean |
| /projects/[projectId]/planning/budget | src/app/projects/[projectId]/planning/budget/page.tsx | MINIMAL | 0 | 0 | 0 | 0 | ✅ Clean |
| /projects/[projectId]/planning/land-use | src/app/projects/[projectId]/planning/land-use/page.tsx | MINIMAL | 0 | 0 | 0 | 0 | ✅ Clean |
| /projects/[projectId]/planning/market | src/app/projects/[projectId]/planning/market/page.tsx | TAILWIND | 0 | 0 | 68 | 9 | ✅ Clean |
| /projects/[projectId]/project/budget | src/app/projects/[projectId]/project/budget/page.tsx | COREUI | 1 | 0 | 3 | 1 | ✅ Clean |
| /projects/[projectId]/project/dms | src/app/projects/[projectId]/project/dms/page.tsx | TAILWIND | 0 | 0 | 2 | 0 | ✅ Clean |
| /projects/[projectId]/project/planning | src/app/projects/[projectId]/project/planning/page.tsx | TAILWIND | 0 | 0 | 2 | 0 | ✅ Clean |
| /projects/[projectId]/project/sales | src/app/projects/[projectId]/project/sales/page.tsx | TAILWIND | 0 | 0 | 2 | 0 | ✅ Clean |
| /projects/[projectId]/project/summary | src/app/projects/[projectId]/project/summary/page.tsx | COREUI | 1 | 0 | 3 | 0 | ✅ Clean |
| /projects/[projectId]/results | src/app/projects/[projectId]/results/page.tsx | TAILWIND | 0 | 0 | 40 | 2 | ✅ Clean |
| /projects/[projectId]/sales-marketing | src/app/projects/[projectId]/sales-marketing/page.tsx | TAILWIND | 0 | 0 | 2 | 0 | ✅ Clean |
| /projects/[projectId]/settings | src/app/projects/[projectId]/settings/page.tsx | COREUI | 1 | 0 | 3 | 0 | ✅ Clean |
| /projects/[projectId]/validation | src/app/projects/[projectId]/validation/page.tsx | COREUI | 1 | 0 | 0 | 0 | ✅ Clean |
| /projects/[projectId]/valuation/income-approach | src/app/projects/[projectId]/valuation/income-approach/page.tsx | MIXED | 1 | 0 | 28 | 18 | 🔴 Problematic |
| /projects/[projectId]/valuation | src/app/projects/[projectId]/valuation/page.tsx | TAILWIND | 0 | 0 | 29 | 18 | 🔴 Problematic |
| /projects/setup | src/app/projects/setup/page.tsx | MINIMAL | 0 | 0 | 0 | 0 | ✅ Clean |
| /properties/[id]/analysis | src/app/properties/[id]/analysis/page.tsx | TAILWIND | 0 | 0 | 18 | 0 | ✅ Clean |
| /property/[id] | src/app/property/[id]/page.tsx | MIXED | 0 | 0 | 0 | 0 | ⚠️ Mixed |
| /prototypes/[prototypeId] | src/app/prototypes/[prototypeId]/page.tsx | TAILWIND | 0 | 0 | 7 | 0 | ✅ Clean |
| /prototypes/multifam/rent-roll-inputs/content | src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx | TAILWIND | 0 | 0 | 203 | 0 | ✅ Clean |
| /prototypes/multifam/rent-roll-inputs | src/app/prototypes/multifam/rent-roll-inputs/page.tsx | MIXED | 0 | 1 | 250 | 1 | ⚠️ Mixed |
| /prototypes | src/app/prototypes/page.tsx | TAILWIND | 0 | 0 | 19 | 4 | ✅ Clean |
| /prototypes-multifam | src/app/prototypes-multifam/page.tsx | TAILWIND | 0 | 0 | 43 | 0 | ✅ Clean |
| /register | src/app/register/page.tsx | TAILWIND | 0 | 0 | 37 | 0 | ✅ Clean |
| /rent-roll | src/app/rent-roll/page.tsx | MIXED | 0 | 1 | 30 | 0 | ⚠️ Mixed |
| /reports | src/app/reports/page.tsx | COREUI | 1 | 0 | 5 | 0 | ✅ Clean |
| /reset-password | src/app/reset-password/page.tsx | TAILWIND | 0 | 0 | 28 | 0 | ✅ Clean |
| /settings/budget-categories | src/app/settings/budget-categories/page.tsx | COREUI | 1 | 0 | 3 | 4 | ✅ Clean |
| /settings/contact-roles | src/app/settings/contact-roles/page.tsx | MIXED | 1 | 0 | 18 | 3 | ⚠️ Mixed |
| /settings/profile | src/app/settings/profile/page.tsx | TAILWIND | 0 | 0 | 55 | 0 | ✅ Clean |
| /settings/taxonomy | src/app/settings/taxonomy/page.tsx | TAILWIND | 0 | 0 | 2 | 2 | ✅ Clean |
| /test-coreui | src/app/test-coreui/page.tsx | COREUI | 1 | 0 | 10 | 3 | ✅ Clean |

## Section 3: Component Drill-Down (Mixed or Problematic)

### /admin/preferences
- Primary: TAILWIND
- Status: 🔴 Problematic
- Components: None detected (or unresolved).

### /benchmarks/unit-costs
- Primary: TAILWIND
- Status: 🔴 Problematic
- Components: None detected (or unresolved).

### /contacts
- Primary: MIXED
- Status: ⚠️ Mixed
- Components: None detected (or unresolved).

### /dashboard
- Primary: MIXED
- Status: 🔴 Problematic
- Components: None detected (or unresolved).

### /diligence
- Primary: MIXED
- Status: ⚠️ Mixed
- Components: None detected (or unresolved).

### /documentation
- Primary: TAILWIND
- Status: 🔴 Problematic
- Components: None detected (or unresolved).

### /lease/[id]
- Primary: MIXED
- Status: ⚠️ Mixed
- Components: None detected (or unresolved).

### /phases
- Primary: MIXED
- Status: ⚠️ Mixed
- Components: None detected (or unresolved).

### /projects/[projectId]/opex
- Primary: TAILWIND
- Status: 🔴 Problematic
- Components: None detected (or unresolved).

### /projects/[projectId]/overview
- Primary: TAILWIND
- Status: 🔴 Problematic
- Components: None detected (or unresolved).

### /projects/[projectId]/valuation/income-approach
- Primary: MIXED
- Status: 🔴 Problematic
- Components: None detected (or unresolved).

### /projects/[projectId]/valuation
- Primary: TAILWIND
- Status: 🔴 Problematic
- Components: None detected (or unresolved).

### /property/[id]
- Primary: MIXED
- Status: ⚠️ Mixed
- Components: None detected (or unresolved).

### /prototypes/multifam/rent-roll-inputs
- Primary: MIXED
- Status: ⚠️ Mixed
- Components: None detected (or unresolved).

### /rent-roll
- Primary: MIXED
- Status: ⚠️ Mixed
- Components: None detected (or unresolved).

### /settings/contact-roles
- Primary: MIXED
- Status: ⚠️ Mixed
- Components: None detected (or unresolved).

## Section 4: Shared Layout Analysis

- src/app/layout.tsx
  - Primary system: MINIMAL
  - Theme context: CoreUIThemeProvider
  - Spacing: not explicit in layout
- src/app/preferences/layout.tsx
  - Primary system: TAILWIND
  - Theme context: None detected
  - Spacing: inline styles / utility classes
- src/app/projects/[projectId]/capitalization/layout.tsx
  - Primary system: COREUI
  - Theme context: None detected
  - Spacing: inline styles / utility classes
- src/app/projects/[projectId]/development/layout.tsx
  - Primary system: TAILWIND
  - Theme context: None detected
  - Spacing: app-* helper classes
- src/app/projects/[projectId]/layout.tsx
  - Primary system: TAILWIND
  - Theme context: None detected
  - Spacing: app-* helper classes
- src/app/projects/[projectId]/napkin/layout.tsx
  - Primary system: TAILWIND
  - Theme context: None detected
  - Spacing: app-* helper classes
- src/app/projects/[projectId]/planning/layout.tsx
  - Primary system: COREUI
  - Theme context: None detected
  - Spacing: inline styles / utility classes

## Section 5: Summary Statistics

Total Pages: 90

By Primary System:
- COREUI: 14 pages (15.6%)
- TAILWIND: 59 pages (65.6%)
- MUI: 1 pages (1.1%)
- MIXED: 10 pages (11.1%)
- MINIMAL: 6 pages (6.7%)

Pages Needing Attention:
- Mixed systems: /contacts, /dashboard, /diligence, /lease/[id], /phases, /projects/[projectId]/valuation/income-approach, /property/[id], /prototypes/multifam/rent-roll-inputs, /rent-roll, /settings/contact-roles
- Problematic (inline styles): /admin/preferences, /benchmarks/unit-costs, /dashboard, /documentation, /projects/[projectId]/opex, /projects/[projectId]/overview, /projects/[projectId]/valuation/income-approach, /projects/[projectId]/valuation

## Section 6: Recommendations

1. Dominant system: Tailwind (by page count)
2. Outliers: CoreUI + MUI pages and Mixed pages listed above
3. Cleanup scope: 10 mixed pages + 8 problematic pages
4. Quick wins: pages with heavy inline styles but low component complexity (e.g., /diligence, /phases)