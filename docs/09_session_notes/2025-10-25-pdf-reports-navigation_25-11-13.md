# PDF Reports & Navigation - Session Notes

**Date:** October 25, 2025
**Session:** PDF Report Generation System & Legacy Navigation Setup
**Status:** ✅ COMPLETE

---

## Summary

This session continued from the previous multifamily overview integration work, focusing on:
1. Building a production-quality PDF report generation system for multifamily properties
2. Formatting and styling PDF reports to match ARGUS quality standards
3. Organizing legacy pages in the navigation sidebar

---

## Part 1: PDF Report Generation System

### Problem Statement

Need to generate professional PDF reports for multifamily properties that:
- Match ARGUS Enterprise quality standards
- Display in browser before download
- Support multiple report types (Property Summary, Cash Flow, Rent Roll)
- Use proper formatting (comma-separated numbers, appropriate fonts, correct orientation)

### Implementation

#### Backend - Django PDF Generation

**Technology Stack:**
- Django 5.0.1
- WeasyPrint 62.3 for PDF rendering
- Pango for text rendering
- Custom template filters for formatting

**Files Created/Modified:**

1. **`/backend/apps/reports/generators/cash_flow.py`**
   - Generates annual cash flow projections (changed from monthly to annual)
   - Aggregates 12 months into annual totals
   - Supports configurable year ranges (default: 5 years)
   - Calculates: GSR, vacancy, EGI, OpEx, NOI, debt service, cash flow

2. **`/backend/apps/reports/templatetags/report_filters.py`**
   - Custom `intcomma` template filter for number formatting
   - Formats numbers with comma thousand separators (#,###)
   - Handles Decimal, int, float types gracefully

3. **`/backend/apps/reports/templates/reports/cash_flow.html`**
   - Annual cash flow template (5-year default)
   - Percentage-based table widths (32% for labels, 68% for years)
   - Uses Helvetica fonts throughout
   - Landscape orientation for 10+ years, portrait for < 10 years

4. **`/backend/apps/reports/static/reports/styles.css`**
   - Helvetica font family for all text
   - Landscape page setup: `@page landscape { size: letter landscape; margin: 0.5in 0.4in; }`
   - Portrait default for shorter reports
   - Proper table styling with borders and spacing

#### Frontend - Report Viewer

**Files Created/Modified:**

1. **`/src/components/reports/PropertySummaryView.tsx`**
   - Browser-based report viewer component
   - Uses CoreUI components (CCard, CButton, CTable)
   - Scenario toggle (Current vs Proforma)
   - Download PDF button
   - Displays property summary data in browser before PDF generation

2. **`/src/app/projects/[projectId]/components/tabs/ReportsTab.tsx`**
   - Report type selector (Summary, Cash Flow, Rent Roll)
   - Integrated into project overview tabs
   - Uses CoreUI navigation components

### Key Features Implemented

#### 1. Annual Cash Flow Formatting
- **Period:** Changed from 12 monthly periods to 5 annual periods
- **Columns:** Year 1, Year 2, Year 3, Year 4, Year 5
- **Line Items:**
  - Gross Scheduled Rent
  - Vacancy Loss
  - Effective Gross Income
  - Operating Expenses
  - Net Operating Income
  - Debt Service
  - Cash Flow

#### 2. Number Formatting
- **Format:** 2,798,124 (comma-separated thousands)
- **Implementation:** Custom Django template filter `intcomma`
- **Usage:** `{{ cf.gross_scheduled_rent|intcomma }}`

#### 3. PDF Orientation
- **Portrait:** Reports < 10 years (Cash Flow 5-year, Rent Roll, Property Summary)
- **Landscape:** Reports ≥ 10 years (Cash Flow 10-year+)
- **Implementation:** Conditional CSS class on `<body>` element

#### 4. Typography
- **Font:** Helvetica throughout (changed from Times New Roman/Arial)
- **Rationale:** Professional, clean appearance matching industry standards
- **Applied To:** All text, headers, tables

#### 5. Property Information
- **Removed:** Redundant property info box from Cash Flow report
- **Kept:** Property name in report title
- **Rationale:** Cleaner layout, information already in header

### Data Cleanup

**Task:** Reduced Chadron property units from 129 to 113 to match Operating Memorandum

**Script:** `/backend/scripts/cleanup_chadron_units.py`

**Target Counts (per OM):**
- 1BR/1BA: 24 units
- 2BR/2BA: 52 units
- 3BR/2BA: 32 units
- Commercial: 5 units
- Office: 0 units (deleted)

**Results:** Successfully cleaned up to exactly 113 units matching OM specifications

---

## Part 2: Legacy Navigation Organization

### Problem Statement

User requested a "Legacy" collapsible folder at the bottom of the navigation sidebar containing links to older pages with assumptions and factors (sales commission %, management fee %, exit cap rate, etc.).

### Implementation

**File Modified:** `/src/app/components/Navigation.tsx`

#### Legacy Section Definition

```typescript
const legacySection: NavSection = useMemo(() => ({
  title: 'Legacy',
  items: [
    {
      id: 'assumptions',
      label: 'Assumptions & Factors',
      href: projectId ? `/projects/${projectId}/assumptions` : '/projects/17/assumptions',
      icon: 'cilSettings'
    },
    { id: 'market-assumptions', label: 'Market Assumptions (Old)', href: projectId ? `/properties/${projectId}/analysis` : '/properties/17/analysis', icon: 'cilChartPie' },
    { id: 'market-intel-legacy', label: 'Market Intel (Old)', href: '/market', icon: 'cilGraph' },
    { id: 'project-overview-legacy', label: 'Project Overview (Old)', href: projectId ? `/projects/${projectId}/overview` : '/projects/11/overview', icon: 'cilFile' },
    { id: 'test-coreui', label: 'Theme Demo', href: '/test-coreui', icon: 'cilPaint' },
    { id: 'prototypes', label: 'Prototypes', href: '/prototypes', icon: 'cilBeaker' },
    { id: 'documentation', label: 'Documentation', href: '/documentation', icon: 'cilNotes' }
  ],
  isCollapsible: true
}), [projectId])
```

#### Key Features

1. **Bottom Positioning:** Uses flexbox spacer to push Legacy section to bottom
2. **Collapsible:** Can be collapsed/expanded with arrow icon
3. **Visual Separator:** Border-top separator distinguishes from main navigation
4. **Visible Text:** Changed from `--cui-tertiary-color` to `--cui-sidebar-nav-link-color` for proper contrast
5. **Dynamic Project ID:** Links update based on selected project

#### Assumptions Page Details

The "Assumptions & Factors" link points to `/projects/[projectId]/assumptions` which contains:

**5 Assumption Baskets with Progressive Disclosure (Napkin → Mid → Pro):**

1. **Basket 1: "The Deal"** (Acquisition)
   - Purchase price
   - Acquisition date
   - Hold period (years)
   - **Exit cap rate**
   - Sale date
   - **Broker commission %** (Mid tier)
   - **Sale costs %** (Mid tier)
   - Closing costs %
   - Due diligence days
   - Earnest money
   - Legal fees (Pro tier)
   - Depreciation basis (Pro tier)

2. **Basket 2: "The Cash In"** (Revenue)
   - Rent assumptions
   - Occupancy %
   - Annual rent growth %
   - Other income sources

3. **Basket 3: "The Cash Out"** (Expenses)
   - **Management fee %**
   - Total OpEx per unit
   - Property taxes
   - Insurance
   - Utilities
   - Repairs & maintenance
   - CapEx reserves

4. **Basket 4: "The Financing"** (Debt)
   - Loan amount
   - Interest rate
   - Amortization period
   - LTV %
   - DSCR

5. **Basket 5: "The Split"** (Equity)
   - LP ownership %
   - GP ownership %
   - Preferred return %
   - Waterfall tiers

**Progressive Disclosure Tiers:**
- **Napkin:** ~15 essential fields (quick napkin math)
- **Mid:** ~45 fields (standard underwriting)
- **Pro:** ~80+ fields (institutional-grade analysis)

**Auto-Save Functionality:**
- 1-second debounced auto-save
- Saves to Django backend via API routes
- "Saving..." and "Saved [time]" status indicators

---

## Issues Resolved

### Issue 1: Number Format Reverted
**Problem:** Numbers showing as "2798124" instead of "2,798,124"
**Cause:** Django's `|stringformat:"s"|slice:":-2"` doesn't add commas
**Fix:** Created custom `intcomma` template filter
**File:** `/backend/apps/reports/templatetags/report_filters.py`

### Issue 2: Page Bleeding
**Problem:** Cash Flow report content bleeding off page edges
**Cause:** Too many columns (10 years) with fixed pixel widths
**Fix:** Reduced to 5 years and changed to percentage-based widths
**Result:** Content fits within page margins

### Issue 3: Legacy Folder Invisible
**Problem:** "the font color of the legacy folder makes it invisible"
**Cause:** Using `var(--cui-tertiary-color)` which was invisible in dark theme
**Fix:** Changed to `var(--cui-sidebar-nav-link-color)`
**File:** `/src/app/components/Navigation.tsx:150`

### Issue 4: Wrong Orientation
**Problem:** Short-term reports (< 10 years) showing in landscape
**Cause:** All cash flow reports using landscape CSS class
**Fix:** Conditional class application - only use landscape for 10+ years
**Implementation:**
```django
{% block body_class %}{% if years >= 10 %}cash-flow-report-landscape{% endif %}{% endblock %}
```

---

## Technical Architecture

### Backend (Django)

```
landscape/backend/
├── apps/
│   └── reports/
│       ├── generators/
│       │   ├── cash_flow.py          # Annual cash flow calculator
│       │   ├── property_summary.py   # Property summary generator
│       │   └── rent_roll.py          # Rent roll report
│       ├── templates/
│       │   └── reports/
│       │       ├── base.html         # Base template with styles
│       │       ├── cash_flow.html    # 5-year cash flow template
│       │       ├── property_summary.html
│       │       └── rent_roll.html
│       ├── templatetags/
│       │   └── report_filters.py     # intcomma filter
│       ├── static/
│       │   └── reports/
│       │       └── styles.css        # Helvetica fonts, landscape CSS
│       └── views.py                  # PDF generation endpoints
```

### Frontend (Next.js)

```
landscape/src/
├── components/
│   └── reports/
│       └── PropertySummaryView.tsx   # Browser-based report viewer
├── app/
│   └── projects/
│       └── [projectId]/
│           └── components/
│               └── tabs/
│                   └── ReportsTab.tsx # Report selector UI
```

### API Routes

1. `/api/reports/[propertyId]/property-summary.pdf/` - Property Summary PDF
2. `/api/reports/[propertyId]/cash-flow.pdf/?years=5` - Cash Flow PDF
3. `/api/reports/[propertyId]/rent-roll.pdf/` - Rent Roll PDF

---

## Testing Performed

### PDF Generation Tests
- [x] Property Summary PDF generates successfully (Property 17 - Chadron)
- [x] Cash Flow PDF shows 5 annual columns (not monthly)
- [x] Numbers formatted with commas (2,798,124)
- [x] Helvetica fonts used throughout
- [x] Portrait orientation for 5-year Cash Flow
- [x] Landscape orientation would apply for 10+ year reports
- [x] Property info box removed from Cash Flow
- [x] Title shows "Cash Flow Proforma - 5 Years"
- [x] Content fits within page margins (no bleeding)

### Navigation Tests
- [x] Legacy section appears at bottom of sidebar
- [x] Legacy section is collapsible with arrow icon
- [x] Text and icons are visible (white color in dark theme)
- [x] Border separator distinguishes Legacy from main nav
- [x] "Assumptions & Factors" link navigates to `/projects/17/assumptions`
- [x] Assumptions page loads with 5 baskets
- [x] Complexity toggle works (Napkin/Mid/Pro)
- [x] Auto-save functionality working

### Data Cleanup Tests
- [x] Chadron property reduced to 113 units
- [x] Unit type counts match OM specifications
- [x] Commercial units preserved (5 units)
- [x] Office units removed (0 units)
- [x] Rent roll shows correct unit counts

---

## Files Modified This Session

### Backend Files
1. `/backend/apps/reports/generators/cash_flow.py` - Annual aggregation logic
2. `/backend/apps/reports/templatetags/report_filters.py` - intcomma filter
3. `/backend/apps/reports/templates/reports/cash_flow.html` - Annual template
4. `/backend/apps/reports/static/reports/styles.css` - Helvetica, orientation
5. `/backend/scripts/cleanup_chadron_units.py` - Unit cleanup script

### Frontend Files
1. `/src/components/reports/PropertySummaryView.tsx` - CoreUI integration
2. `/src/app/projects/[projectId]/components/tabs/ReportsTab.tsx` - Report selector
3. `/src/app/components/Navigation.tsx` - Legacy section

**Total Files Modified:** 8
**Total Lines Changed:** ~400

---

## Configuration Details

### WeasyPrint Dependencies
- Pango (system dependency for text rendering)
- Cairo (graphics library)
- GLib (system utilities)

### Django Settings
```python
INSTALLED_APPS = [
    # ...
    'apps.reports',
]

TEMPLATES = [
    {
        'DIRS': [BASE_DIR / 'apps' / 'reports' / 'templates'],
        # ...
    }
]
```

### PDF Generation URL Patterns
```python
# apps/reports/urls.py
urlpatterns = [
    path('<int:property_id>/property-summary.pdf/', PropertySummaryPDFView.as_view()),
    path('<int:property_id>/cash-flow.pdf/', CashFlowPDFView.as_view()),
    path('<int:property_id>/rent-roll.pdf/', RentRollPDFView.as_view()),
]
```

---

## Future Enhancements

### Short Term
1. **Additional Report Types:**
   - T12 (Trailing 12 Months) Operating Statement
   - Cap Table / Waterfall Distribution
   - Sensitivity Analysis (Exit Cap, Rent Growth, OpEx)
   - Market Comps Report

2. **Report Customization:**
   - User-configurable year ranges (3, 5, 7, 10 years)
   - Toggle property info box on/off
   - Custom logo upload
   - Font selection (Helvetica, Arial, Times New Roman)

3. **Batch Export:**
   - Export all reports as ZIP
   - Email reports to stakeholders
   - Schedule automated report generation

### Long Term
1. **Template Library:**
   - Save report templates
   - Custom branding per user/organization
   - Report sections drag-and-drop builder

2. **Interactive Reports:**
   - Edit assumptions directly in PDF viewer
   - Real-time recalculation
   - Comparison mode (side-by-side scenarios)

3. **Integration:**
   - Export to Excel (ARGUS format)
   - Integration with third-party underwriting tools
   - API for programmatic report generation

---

## Related Documentation

- [Multifamily Overview Integration](./2025-10-25-multifamily-overview-integration.md)
- [Rent Roll Ingestion Complete](../rent-roll-ingestion-COMPLETE.md)
- [Chadron Complete Integration Summary](../chadron-complete-integration-summary.md)
- [Progressive Disclosure Assumptions System](../../README.md#transaction-assumptions-accordion)

---

## Key Learnings

1. **Django Template Filters:** Custom filters are essential for formatting in WeasyPrint templates since many Python libraries aren't available in the template context

2. **PDF Orientation:** Use conditional CSS classes and `@page` rules rather than trying to change orientation in Python code

3. **Number Formatting:** `intcomma` filter is more reliable than string manipulation for comma-separated numbers

4. **Navigation Organization:** Legacy sections should be visually separated (border-top) and positioned at bottom (flexbox spacer) to distinguish from main navigation

5. **Progressive Disclosure:** The Napkin → Mid → Pro tier system works well for assumptions - users can start simple and add detail as needed

---

**Implemented by:** Claude
**Session Duration:** ~3 hours
**Status:** ✅ COMPLETE - Ready for Production

---

## Session Continuation - Navigation Clarification

**Status:** ✅ RESOLVED

### Final Navigation State

The Legacy navigation section correctly contains the "Assumptions & Factors" link pointing to `/projects/[projectId]/assumptions`. This page includes all transaction assumptions the user requested:

- Broker commission % (Basket 1, Mid tier)
- Management fee % (Basket 3, Napkin tier)
- Exit cap rate (Basket 1, Napkin tier)
- Sale costs % (Basket 1, Mid tier)
- Closing costs % (Basket 1, Mid tier)
- And 70+ other fields across 5 baskets

The navigation is working correctly with:
- Collapsible Legacy section at bottom
- Visible white text/icons in dark theme
- Border separator from main navigation
- Dynamic project ID in URLs
- All 7 legacy pages linked

**No further action required** - the assumptions page the user wanted is already properly linked in the Legacy navigation.
