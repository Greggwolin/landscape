# Multifamily Project Tab Structure
## Complete Tab Configuration in Main Branch

**Generated:** 2025-11-21
**Source:** `main` branch analysis
**Property Types:** MF, OFF, RET, IND, HTL, MXU (Income Properties)

---

## TAB CONFIGURATION

### Multifamily Projects Get **7 Tabs Total**

```typescript
// From: src/lib/utils/projectTabs.ts
// When: project_type_code IN ['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU']

[
  { id: 'project',        label: 'Project',         hasMode: true  },  // 1
  { id: 'property',       label: 'Property',        hasMode: true  },  // 2 ⭐
  { id: 'operations',     label: 'Operations',      hasMode: true  },  // 3 ⭐
  { id: 'valuation',      label: 'Valuation',       hasMode: true  },  // 4 ⭐
  { id: 'capitalization', label: 'Capitalization',  hasMode: false },  // 5
  { id: 'reports',        label: 'Reports',         hasMode: false },  // 6
  { id: 'documents',      label: 'Documents',       hasMode: false },  // 7
]
```

⭐ = Multifamily-specific implementation

---

## TAB DETAILS

### Tab 1: **Project** (Universal)
```
Route:     /projects/[projectId]?tab=project
Component: src/app/projects/[projectId]/components/tabs/ProjectTab.tsx
Shared:    ✅ Same for all property types

Content:
- Project summary
- Key metrics dashboard
- Recent activity feed
- Milestones timeline
- Quick stats

Mode Support: Yes (Napkin/Standard/Detail)
Status: ✅ EXISTS in feature branch
```

---

### Tab 2: **Property** ⭐ (Multifamily-Specific)
```
Route:     /projects/[projectId]?tab=property
Component: src/app/projects/[projectId]/components/tabs/PropertyTab.tsx
Shared:    ❌ Multifamily only

Content:
┌─────────────────────────────────────────┐
│ RENT ROLL & UNIT MANAGEMENT             │
├─────────────────────────────────────────┤
│                                         │
│ 📊 Floor Plans Summary                  │
│   - A1 (1BR/1BA, 650 SF) - 24 units    │
│   - B1 (2BR/2BA, 950 SF) - 36 units    │
│   - Current vs Market vs AI Estimate   │
│                                         │
│ 📝 Unit-by-Unit Grid                    │
│   Unit | Plan | Bed/Bath | SF | Rent   │
│   101  | A1   | 1/1     | 650 | $1,200 │
│   102  | A1   | 1/1     | 650 | $1,225 │
│   103  | B1   | 2/2     | 950 | VACANT │
│   [... editable grid with 100+ units]  │
│                                         │
│ 🗺️ Comparable Rentals Map               │
│   - Shows nearby comps on map          │
│   - Distance, rent, bed/bath           │
│   - AI-estimated market rates          │
│                                         │
│ ⚙️ Configure Columns                    │
│   - Show/hide columns by category      │
│   - Unit/Tenant/Lease/Financial fields │
│                                         │
└─────────────────────────────────────────┘

Key Features:
- Inline editing of unit details
- Lease start/end tracking
- Occupancy status (Occupied/Vacant/Notice/Renewal)
- Market rent AI estimates from comparables
- Rent per SF calculations
- Security deposit tracking
- Tenant name management (optional)

Data Source:
- unitTypesAPI.list(projectId)
- unitsAPI.list(projectId)
- leasesAPI.list(projectId)

Dependencies:
- src/lib/api/multifamily.ts          ❌ NOT in feature branch
- @/components/map/ProjectTabMap      (need to check)
- @/utils/formatNumber               ✅ Likely exists

Mode Support: Yes (Basic/Standard/Advanced columns)
Status: ❌ NOT in feature branch - NEED TO COPY
```

---

### Tab 3: **Operations** ⭐ (Multifamily-Specific)
```
Route:     /projects/[projectId]?tab=operations
Component: src/app/projects/[projectId]/components/tabs/OperationsTab.tsx
Shared:    ⚠️ EXISTS in feature but land dev version

Content:
┌─────────────────────────────────────────┐
│ OPERATING EXPENSES (OpEx)               │
├─────────────────────────────────────────┤
│                                         │
│ 💰 Hierarchical Expense Structure       │
│                                         │
│ ▼ Taxes & Insurance                    │
│   ├─ Property Taxes      $50,000 $/unit│
│   └─ Insurance            $8,000 $/SF  │
│                                         │
│ ▼ Utilities                            │
│   ├─ Water/Sewer         $12,000       │
│   └─ Gas/Electric        $18,000       │
│                                         │
│ ▼ Payroll                              │
│   ├─ Property Management  $25,000      │
│   ├─ Onsite Staff        $45,000       │
│   └─ Offsite Admin       $15,000       │
│                                         │
│ ▼ Repairs & Maintenance                │
│   ├─ Unit Turnover       $10,000       │
│   ├─ General Repairs      $8,000       │
│   └─ Grounds/Common       $6,000       │
│                                         │
│ ▼ General & Administrative             │
│   ├─ Marketing            $5,000       │
│   ├─ Legal/Professional   $3,000       │
│   └─ Other Operating      $4,000       │
│                                         │
│ 📊 Benchmark Comparison                 │
│   - Industry averages by region        │
│   - Per unit comparisons               │
│   - Per SF comparisons                 │
│                                         │
│ 💡 Complexity Modes:                    │
│   • Basic: Aggregate categories        │
│   • Standard: Sub-account detail       │
│   • Advanced: Full chart of accounts   │
│                                         │
└─────────────────────────────────────────┘

Key Features:
- Chart of Accounts hierarchy integration
- Per unit / Per SF calculations
- Escalation rates
- Recoverable expenses tracking
- Recovery percentages (for NNN leases)
- Benchmark panel with industry comps
- Mode switching preserves values

Data Source:
- /api/projects/[projectId]/operating-expenses/hierarchy
- /api/projects/[projectId]/operating-expenses/inventory-stats
- unitsAPI.list() for unit count

Dependencies:
- @/app/prototypes/multifam/.../NestedExpenseTable  ❌ NOT in feature
- @/app/prototypes/multifam/.../BenchmarkPanel      ❌ NOT in feature
- @/config/opex/hierarchical-structure              ❌ Check if exists
- @/config/opex/multifamily-fields                  ❌ Check if exists

Special Note:
⚠️ Feature branch HAS OperationsTab.tsx but may be land dev version
Need to verify it supports multifamily mode properly

Mode Support: Yes (Basic/Standard/Advanced granularity)
Status: ⚠️ EXISTS but need to verify multifamily support
```

---

### Tab 4: **Valuation** ⭐ (Multifamily-Specific)
```
Route:     /projects/[projectId]?tab=valuation
Component: src/app/projects/[projectId]/components/tabs/ValuationTab.tsx
Shared:    ⚠️ EXISTS in feature but land dev version

Content:
┌─────────────────────────────────────────┐
│ INCOME APPROACH VALUATION               │
├─────────────────────────────────────────┤
│                                         │
│ 💵 Income Capitalization                │
│   Gross Scheduled Income:    $1,250,000│
│   - Vacancy Loss (5%):         -$62,500│
│   Effective Gross Income:    $1,187,500│
│                                         │
│   - Operating Expenses:       -$487,500│
│   Net Operating Income (NOI): $700,000 │
│                                         │
│   Cap Rate: 5.5%                       │
│   Indicated Value: $12,727,273         │
│                                         │
│ 📊 Income Comparables                   │
│   - Recent multifamily sales           │
│   - Cap rate analysis                  │
│   - Price per unit                     │
│   - Price per SF                       │
│   - NOI multiples                      │
│                                         │
│ 🗺️ Sales Comp Map                       │
│   - Multifamily sales in market        │
│   - Adjustments grid                   │
│   - Market conditions trending         │
│                                         │
│ 📈 DCF Analysis (Advanced)              │
│   - 10-year cash flow projection       │
│   - Terminal value calculation         │
│   - IRR and NPV metrics                │
│                                         │
└─────────────────────────────────────────┘

Key Features:
- Income approach (Direct Capitalization)
- Sales comparison approach (multifamily comps)
- DCF analysis with reversion
- Rent growth assumptions
- Expense growth assumptions
- Market cap rate analysis
- Sensitivity analysis

Data Source:
- Rent roll from PropertyTab
- OpEx from OperationsTab
- Market sales from /api/market-intel/

Dependencies:
- @/app/projects/[projectId]/valuation/components/
  - ComparablesGrid.tsx              ✅ EXISTS in feature
  - SalesComparisonApproach.tsx      ✅ EXISTS in feature
  - LandscaperChatPanel.tsx          ✅ EXISTS in feature
- Income approach components          ❌ May need multifamily version

Mode Support: Yes (affects detail level)
Status: ⚠️ EXISTS but may be land-focused - need to verify
```

---

### Tab 5: **Capitalization** (Universal)
```
Route:     /projects/[projectId]?tab=capitalization
Component: src/app/projects/[projectId]/components/tabs/CapitalizationTab.tsx
Shared:    ✅ Works for all property types

Content:
┌─────────────────────────────────────────┐
│ CAPITAL STRUCTURE                       │
├─────────────────────────────────────────┤
│                                         │
│ 💰 Sources (How money comes in)        │
│   Debt:                      $8,000,000│
│   Equity:                    $4,000,000│
│   Total:                    $12,000,000│
│                                         │
│ 💸 Uses (How money goes out)           │
│   Acquisition:               $7,500,000│
│   Capex/Renovation:          $3,500,000│
│   Closing Costs:               $500,000│
│   Reserves:                    $500,000│
│   Total:                    $12,000,000│
│                                         │
│ 🏦 Debt Facilities (PRO Tier)          │
│   Senior Loan - $6M @ 5.5%             │
│   Mezzanine - $2M @ 9.0%               │
│   [Draw schedule, covenants, etc.]     │
│                                         │
│ 👥 Equity Partners (PRO Tier)          │
│   GP: 20% ownership, 25% promote       │
│   LP: 80% ownership, 8% pref return    │
│   [Waterfall structure]                │
│                                         │
└─────────────────────────────────────────┘

Key Features:
- Sources & Uses summary
- Debt facility management (PRO)
- Equity partner structure (PRO)
- Waterfall distribution (PRO)
- Developer fees
- Draw schedule

Tier Support:
- Analyst: Sources/Uses summary only
- PRO: Full debt/equity/waterfall features

Mode Support: No (single mode)
Status: ✅ EXISTS in feature branch (new implementation)
```

---

### Tab 6: **Reports** (Universal)
```
Route:     /projects/[projectId]?tab=reports
Component: src/app/projects/[projectId]/components/tabs/ReportsTab.tsx
Shared:    ✅ Same for all property types

Content:
┌─────────────────────────────────────────┐
│ REPORT GENERATION                       │
├─────────────────────────────────────────┤
│                                         │
│ 📄 Available Templates                  │
│   ✓ Rent Roll Summary                  │
│   ✓ Operating Statement                │
│   ✓ Income Valuation Report            │
│   ✓ Investment Summary                 │
│   ✓ Executive Summary (1-pager)        │
│                                         │
│ ⚙️ Report Configurator                  │
│   - Select sections to include         │
│   - Choose output format (PDF/Excel)   │
│   - Add cover page                     │
│   - Include appendices                 │
│                                         │
│ 💾 Export Options                       │
│   [ Export PDF ]                       │
│   [ Export Excel ]                     │
│   [ Export PowerPoint ]                │
│                                         │
└─────────────────────────────────────────┘

Key Features:
- Template management via AdminModal
- Custom report sections
- Multi-format export
- Automated data population

Data Source:
- /api/reports/templates/
- Pulls data from all tabs

Mode Support: No
Status: ✅ EXISTS in feature branch (new implementation)
```

---

### Tab 7: **Documents** (Universal)
```
Route:     /projects/[projectId]?tab=documents
Component: src/app/projects/[projectId]/components/tabs/DocumentsTab.tsx
Shared:    ✅ Same for all property types

Content:
┌─────────────────────────────────────────┐
│ DOCUMENT MANAGEMENT                     │
├─────────────────────────────────────────┤
│                                         │
│ 📁 Folder Structure                     │
│   ▼ Acquisition Documents              │
│     - Purchase Agreement.pdf           │
│     - Title Report.pdf                 │
│     - Phase I ESA.pdf                  │
│                                         │
│   ▼ Leases                             │
│     - Unit 101 Lease.pdf               │
│     - Unit 102 Lease.pdf               │
│     - Master Lease Template.docx       │
│                                         │
│   ▼ Financial                          │
│     - T12 Operating Statement.xlsx     │
│     - Rent Roll.xlsx                   │
│     - Tax Returns 2023.pdf             │
│                                         │
│   ▼ Legal                              │
│     - Operating Agreement.pdf          │
│     - Partnership Agreement.pdf        │
│                                         │
│ ⬆️ Upload Files                         │
│   Drag & drop or browse                │
│                                         │
│ 🔍 Document Search                      │
│   Search by name, tag, or content      │
│                                         │
└─────────────────────────────────────────┘

Key Features:
- File upload/download
- Folder organization
- Document tagging
- Version control
- OCR text extraction
- Full-text search

Data Source:
- /api/dms/ endpoints

Mode Support: No
Status: ✅ EXISTS in feature branch
```

---

## LEGACY TAB MAPPINGS (Backward Compatibility)

These old tab names redirect to current tabs:

```typescript
// From: src/app/projects/[projectId]/page.tsx

{activeTab === 'overview' && <ProjectTab />}      // → 'project'
{activeTab === 'sources' && <SourcesTab />}       // → 'capitalization'
{activeTab === 'uses' && <UsesTab />}             // → 'capitalization'
{activeTab === 'gis' && <GISTab />}               // → removed/deprecated
```

---

## COMPARISON: Multifamily vs Land Development

### Multifamily (7 tabs)
```
1. Project        ← Universal
2. Property       ← Rent roll (MULTIFAMILY ONLY)
3. Operations     ← OpEx (MULTIFAMILY VERSION)
4. Valuation      ← Income approach (MULTIFAMILY VERSION)
5. Capitalization ← Universal
6. Reports        ← Universal
7. Documents      ← Universal
```

### Land Development (9 tabs)
```
1. Project        ← Universal
2. Planning       ← Land use, entitlements (LAND ONLY)
3. Budget         ← Development costs (LAND ONLY)
4. Operations     ← OpEx during development (LAND VERSION)
5. Sales          ← Lot/parcel sales (LAND ONLY)
6. Feasibility    ← Market analysis (LAND ONLY)
7. Capitalization ← Universal
8. Reports        ← Universal
9. Documents      ← Universal
```

### Universal Tabs (4)
- Project (all types)
- Capitalization (all types)
- Reports (all types)
- Documents (all types)

### Property-Specific Tabs
**Multifamily:** Property, Operations (MF version), Valuation (MF version)
**Land Dev:** Planning, Budget, Operations (Land version), Sales, Feasibility

---

## FILES THAT MUST BE COPIED FOR MULTIFAMILY

### CRITICAL (Must Copy)
```
1. src/app/projects/[projectId]/components/tabs/PropertyTab.tsx
   └─ 1,200+ lines
   └─ Rent roll, units, floor plans, market comps

2. src/lib/api/multifamily.ts
   └─ API client for units, leases, unit types
   └─ Dependencies: unitTypesAPI, unitsAPI, leasesAPI, turnsAPI
```

### IMPORTANT (Check if exists, copy if missing)
```
3. src/app/prototypes/multifam/rent-roll-inputs/components/
   ├─ NestedExpenseTable.tsx       (for Operations tab)
   ├─ BenchmarkPanel.tsx            (for Operations tab)
   ├─ CategoryPanel.tsx
   ├─ DetailedBreakdownTable.tsx
   └─ [8-10 more components]

4. src/config/opex/
   ├─ hierarchical-structure.ts     (OpEx hierarchy builder)
   └─ multifamily-fields.ts         (Field definitions)
```

### VERIFY (May already exist in different form)
```
5. src/app/projects/[projectId]/components/tabs/OperationsTab.tsx
   └─ Check if current version supports multifamily mode
   └─ Should have: buildHierarchicalExpenses(), ComplexityTier support

6. src/app/projects/[projectId]/components/tabs/ValuationTab.tsx
   └─ Check if current version supports income approach
   └─ Should have: Cap rate analysis, NOI calculation
```

---

## TAB NAVIGATION IN MAIN BRANCH

### URL Structure
```
Query Parameter Based:
/projects/123?tab=project
/projects/123?tab=property
/projects/123?tab=operations
/projects/123?tab=valuation
etc.
```

### Detection Logic
```typescript
// From: src/lib/utils/projectTabs.ts

function getTabsForPropertyType(propertyType: string): Tab[] {
  const normalized = propertyType?.toUpperCase();

  // Land Development
  if (normalized === 'LAND' || normalized === 'MPC') {
    return LAND_DEV_TABS;
  }

  // Multifamily & Income Properties (DEFAULT)
  return MULTIFAMILY_TABS;
}
```

### Tab Rendering
```typescript
// From: src/app/projects/[projectId]/page.tsx

const activeTab = searchParams.get('tab') || 'project';

return (
  <div>
    {activeTab === 'project' && <ProjectTab project={project} />}
    {activeTab === 'property' && <PropertyTab project={project} />}
    {activeTab === 'operations' && <OperationsTab project={project} mode={complexityMode} />}
    {activeTab === 'valuation' && <ValuationTab project={project} />}
    {activeTab === 'capitalization' && <CapitalizationTab project={project} />}
    {activeTab === 'reports' && <ReportsTab project={project} />}
    {activeTab === 'documents' && <DocumentsTab project={project} />}
  </div>
);
```

---

## SUMMARY

### Multifamily Tab Count: **7 Tabs**

1. **Project** - Universal summary (✅ Exists)
2. **Property** - Rent roll & units (❌ Need to copy)
3. **Operations** - Operating expenses (⚠️ Verify multifamily support)
4. **Valuation** - Income approach (⚠️ Verify multifamily support)
5. **Capitalization** - Cap structure (✅ Exists, new implementation)
6. **Reports** - Report generation (✅ Exists, new implementation)
7. **Documents** - DMS (✅ Exists)

### Integration Complexity

**Easy (Copy as-is):**
- PropertyTab.tsx → Just copy
- multifamily.ts API → Just copy

**Moderate (Verify compatibility):**
- OperationsTab.tsx → Check multifamily mode support
- ValuationTab.tsx → Check income approach support

**Complex (May need refactoring):**
- Prototype components → May be outdated
- OpEx config files → May conflict with land dev versions

---

**Document Purpose:** Reference for multifamily integration
**Next Step:** Use with MULTIFAMILY_INTEGRATION_ANALYSIS.md for implementation
