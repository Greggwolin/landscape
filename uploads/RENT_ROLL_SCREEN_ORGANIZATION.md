# RETAIL RENT ROLL - SCREEN ORGANIZATION PLAN

**Date:** October 16, 2025  
**Context:** Kitchen Sink implementation for Scottsdale Promenade  
**Previous Decisions:** Universal rent roll interface (Chat: TZ32-TZ39)

---

## CONFIRMED ARCHITECTURE

### Route Structure

```
/rent-roll
  ├── Adaptive based on project.property_type_code
  ├── Single page, multiple tabs
  └── Universal for: Multifamily, Office, Retail, Industrial, Mixed-Use
```

**Current project:** Scottsdale Promenade (property_type_code = 'RETAIL')

---

## TAB STRUCTURE (3 Tabs)

### Tab 1: Rent Roll (Primary - Data Entry)

**Purpose:** Actual lease data - what exists today

**For Retail Properties:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ RENT ROLL - Scottsdale Promenade                    [Import] [Add]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Grid Layout (Excel-like, inline editing):                          │
│                                                                      │
│ Suite  │ Tenant          │ SF    │ Type  │ Rent/SF │ Annual  │ Exp │
│────────┼─────────────────┼───────┼───────┼─────────┼─────────┼─────│
│ PAD2   │ Living Spaces   │133120 │ NNN   │ $10.00  │$1.3M    │2036 │
│ MAJ4   │ Painted Tree    │ 34922 │ ModG  │ $16.00  │ $559K   │2032 │
│ MAJ7   │ Nordstrom Rack  │ 34565 │ NNN   │ $13.00  │ $449K   │2034 │
│ 12     │ Trader Joe's    │ 10000 │ NNN   │ $35.00  │ $350K   │2038 │
│ 7      │ Cooper's Hawk   │ 12500 │ NNN   │ $40.00  │ $500K   │2031 │
│ 5B2    │ Vacant          │  5000 │ --    │  --     │  --     │  -- │
│ ...    │ ...             │   ... │ ...   │  ...    │  ...    │ ... │
│                                                                      │
│ 38 of 41 spaces leased │ 97.6% occupied │ $23.45 avg PSF           │
└─────────────────────────────────────────────────────────────────────┘

Expandable Row Details (click row to expand):
┌─────────────────────────────────────────────────────────────────────┐
│ Suite 12: Trader Joe's                                              │
├─────────────────────────────────────────────────────────────────────┤
│ Lease Details:                                                      │
│   Commencement: 2023-04-01  │  Expiration: 2038-03-31              │
│   Term: 15 years             │  Options: 2 x 5 years                │
│                                                                      │
│ Rent Schedule:                                                      │
│   2023-2028: $35.00 PSF      │  Escalation: 2% every 5 years       │
│   2028-2033: $38.00 PSF      │                                      │
│   2033-2038: $41.00 PSF      │                                      │
│                                                                      │
│ Recovery Structure: Triple Net (NNN)                                │
│   Property Tax: 100% tenant  │  CAM: 100% tenant                   │
│   Insurance: 100% tenant     │  Utilities: 100% tenant              │
│                                                                      │
│ [View Full Lease] [Edit] [Delete]                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Inline editing for quick updates
- Sortable/filterable columns
- Color coding: Green (leased), Red (vacant), Yellow (expiring <12mo)
- Click row to expand full lease details
- Import from CSV/Excel/PDF
- Export to Excel
- Bulk actions (select multiple rows)

**Columns Shown (Retail):**
- Suite/Space number
- Tenant name
- Square footage
- Lease type (NNN, Modified Gross, Gross, Ground)
- Base rent PSF
- Annual rent
- Lease expiration
- Status (Active, Expiring, Vacant)

**Additional fields in expanded row:**
- Lease dates (commencement, expiration)
- Rent schedule (with escalations)
- Recovery structure (what tenant pays)
- TI allowance
- Percentage rent (if applicable)
- Options/renewals
- Special clauses

---

### Tab 2: Market Assumptions (Secondary - Market Intelligence)

**Purpose:** Market rent benchmarks - what you SHOULD get

```
┌─────────────────────────────────────────────────────────────────────┐
│ MARKET ASSUMPTIONS - Scottsdale Promenade                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Market Rent by Space Type:                                          │
│                                                                      │
│ Space Type        │ Avg SF  │ Market Rent │ Comps   │ Confidence   │
│───────────────────┼─────────┼─────────────┼─────────┼──────────────│
│ Power Anchor      │ 133,120 │  $12.00 PSF │ 3 comps │ High ●       │
│ Major Anchor      │  30,000 │  $15.00 PSF │ 8 comps │ High ●       │
│ Junior Anchor     │  12,000 │  $28.00 PSF │ 5 comps │ Medium ●     │
│ Inline Retail     │   3,000 │  $35.00 PSF │ 12 comps│ High ●       │
│ Restaurant - FS   │   8,000 │  $42.00 PSF │ 6 comps │ Medium ●     │
│ Restaurant - QSR  │   3,000 │  $38.00 PSF │ 4 comps │ Low ●        │
│ Pad Site          │   4,000 │  $32.00 PSF │ 7 comps │ High ●       │
│                                                                      │
│ [Import Comps] [Run AI Market Analysis] [View Comp Details]         │
└─────────────────────────────────────────────────────────────────────┘

Market Intelligence Sources:
┌─────────────────────────────────────────────────────────────────────┐
│ • CoStar data (Phoenix MSA - Retail)                                │
│ • Recent leases: Kierland Commons, Desert Ridge Marketplace        │
│ • AI-analyzed: 47 comparable leases within 5 miles                  │
│ • Last updated: 2025-10-15                                          │
│                                                                      │
│ [Refresh Market Data] [View Full Comp Set]                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Market rent benchmarks by space type
- Comparable lease data
- AI-powered market analysis
- Confidence scores based on comp quality
- Auto-refresh from CoStar/other sources
- Document upload for comp extraction

---

### Tab 3: Analysis (Tertiary - Computed Metrics)

**Purpose:** Loss-to-lease, occupancy trends, rollover analysis

```
┌─────────────────────────────────────────────────────────────────────┐
│ ANALYSIS - Scottsdale Promenade                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Key Metrics Summary:                                                │
│                                                                      │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│ │ Occupancy    │  │ Avg Rent PSF │  │ Loss-to-Lease│              │
│ │   97.6%      │  │   $23.45     │  │   -$1.2M/yr  │              │
│ │  ▲ 2.1%      │  │  ▼ $0.85     │  │  ▼ -$125K    │              │
│ └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│ │ Rollover Risk│  │ Below Market │  │ Lease-Up Time│              │
│ │  15% in 2026 │  │  23 of 38    │  │  45 days avg │              │
│ │  ⚠ Warning   │  │  ⚠ 61%       │  │  ✓ Good      │              │
│ └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│ Loss-to-Lease Detail (Leased Spaces Below Market):                 │
│                                                                      │
│ Suite │ Tenant         │ Current │ Market │ Lost/Yr │ Expires     │
│───────┼────────────────┼─────────┼────────┼─────────┼─────────────│
│ PAD2  │ Living Spaces  │ $10.00  │ $12.00 │ -$266K  │ 2036 (11yr)│
│ MAJ7  │ Nordstrom Rack │ $13.00  │ $15.00 │  -$69K  │ 2034 (9yr) │
│ 7     │ Cooper's Hawk  │ $40.00  │ $42.00 │  -$25K  │ 2031 (6yr) │
│ ...   │ ...            │  ...    │  ...   │   ...   │  ...       │
│                                                                      │
│ Total Loss-to-Lease: -$1.2M annually                                │
│                                                                      │
│ Lease Rollover Schedule:                                            │
│                                                                      │
│ Year │ Expiring SF │ % of Total │ Tenants Expiring                 │
│──────┼─────────────┼────────────┼──────────────────────────────────│
│ 2025 │      0      │    0%      │ None                             │
│ 2026 │   45,000    │   15%      │ Saks Off 5th, Old Navy, 3 more  │
│ 2027 │   18,000    │    6%      │ Cost Plus, 2 restaurants         │
│ 2028 │   62,000    │   21%      │ Michaels, Putting World, 4 more │
│                                                                      │
│ [Export Analysis] [Generate Rollover Report]                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Occupancy trends over time
- Loss-to-lease calculations (actual vs market)
- Lease rollover risk analysis
- Below-market lease identification
- Lease-up velocity tracking
- Exportable reports for investors/lenders

---

## SCREEN LAYOUT PRINCIPLES

### Design Pattern: ARGUS Developer Style

**Reference:** ARGUS Developer Figure 2-11 (from project knowledge)

**Key Elements:**
1. **Dense information display** - Professionals want data, not whitespace
2. **Inline editing** - Click any cell to edit (Excel-like)
3. **Expandable sections** - Drill down for details
4. **Color coding** - Visual status indicators
5. **Summary metrics** - Always visible at top or bottom
6. **Action buttons** - Import, Export, Add, Analyze

**Visual Hierarchy:**
```
┌─────────────────────────────────────────────────────┐
│ Page Header: Property Name + Quick Stats            │ ← Always visible
├─────────────────────────────────────────────────────┤
│ Tab Navigation: Rent Roll | Market | Analysis       │ ← Switch views
├─────────────────────────────────────────────────────┤
│                                                      │
│ Primary Action Buttons: [Import] [Add] [Export]     │ ← Top right
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                  │ │
│ │     DATA GRID (Primary Content)                 │ │
│ │     - 80% of screen height                      │ │
│ │     - Scrollable                                │ │
│ │     - Sortable/filterable columns               │ │
│ │     - Inline editing                            │ │
│ │                                                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Summary Bar: Total SF | Occupancy | Avg Rent       │ ← Always visible
└─────────────────────────────────────────────────────┘
```

---

## RESPONSIVE BEHAVIOR

### Desktop (Primary)
- 3-column layout for expanded lease details
- Full grid with all columns visible
- Side-by-side: Actual rent | Market rent | Variance

### Tablet
- 2-column layout for lease details
- Horizontal scroll for grid
- Most important columns visible

### Mobile
- Stacked layout for lease details
- Card view instead of grid
- Swipe to see full details

**Note:** Retail analysis is primarily desktop workflow, but responsive for field use.

---

## PROPERTY TYPE ADAPTATIONS

### What Changes by Property Type

**Multifamily (MF):**
- Column: "Unit #" (instead of "Suite #")
- Column: "Resident" (instead of "Tenant")
- Columns: Beds, Baths (MF-specific)
- Market tab: "Floor Plans" (Studio, 1BR, 2BR)
- Simpler recovery structure (utilities included/excluded)

**Office:**
- Column: "Suite #"
- Column: "Tenant"
- Recovery: CAM, Tax, Insurance (modified gross common)
- Market tab: "Building Class" (A, B, C)

**Retail (Current):**
- Column: "Suite #"
- Column: "Tenant"
- Column: "Lease Type" (NNN, Mod Gross, Gross, Ground)
- Recovery: Complex (percentage rent, CAM caps, exclusives)
- Market tab: "Space Type" (Anchor, Inline, Pad, Restaurant)

**Industrial:**
- Column: "Unit #" or "Bay #"
- Column: "Tenant"
- Recovery: Usually NNN
- Market tab: "Space Type" (Warehouse, Flex, Office)

### What Stays the Same

- Tab structure (Rent Roll | Market | Analysis)
- Grid-based layout
- Inline editing
- Import/export functionality
- Loss-to-lease calculations
- Rollover analysis

---

## INTEGRATION WITH KITCHEN SINK

### Data Flow

**Rent Roll Tab:**
- Queries: `tbl_lease`, `tbl_cre_space`, `tbl_cre_tenant`
- Displays: Actual lease data from database
- Updates: Saves edits back to database

**Market Assumptions Tab:**
- Queries: `tbl_market_assumption`, `tbl_lease_assumption`
- Displays: Market rent benchmarks
- Updates: Can be AI-populated from CoStar/comps

**Analysis Tab:**
- Queries: Both actual and market data
- Calculates: Loss-to-lease, occupancy, rollover
- Read-only: Computed from other tabs

### Calculation Engine Integration

When calculation engine is complete:
- Analysis tab shows IRR sensitivity to rent assumptions
- Highlights which leases have highest impact on returns
- Shows upside potential from renewal opportunities

---

## AI INTEGRATION POINTS

### Import from Documents (Phase 2)

**User Flow:**
```
1. User clicks [Import] on Rent Roll tab
2. Upload dialog: "Drop rent roll PDF or Excel here"
3. AI processes document
4. Shows grid preview with confidence scores
5. User reviews/corrects AI extractions
6. Click [Confirm Import] → Saves to database
```

**AI Extracts:**
- Tenant names
- Suite numbers
- Square footage
- Rent amounts
- Lease dates
- Lease types

### Market Intelligence (Phase 2)

**User Flow:**
```
1. User clicks [Run AI Market Analysis] on Market tab
2. AI queries CoStar API + uploaded comp docs
3. Analyzes 50+ comparable leases
4. Returns market rent by space type with confidence scores
5. Highlights outliers in current rent roll
```

---

## IMPLEMENTATION PRIORITY

### Phase 1: Manual Entry (Current - Kitchen Sink)
1. ✅ Rent Roll tab - Grid with inline editing
2. ✅ Market Assumptions tab - Manual market rent entry
3. ✅ Analysis tab - Basic loss-to-lease calculations
4. ✅ Data from Scottsdale Promenade seed data

### Phase 2: AI Import (After calculations working)
5. ⏸ Import wizard with AI extraction
6. ⏸ Market intelligence automation
7. ⏸ Anomaly detection

### Phase 3: Advanced Analysis (After Phase 2)
8. ⏸ Rollover strategy recommendations
9. ⏸ Renewal optimization
10. ⏸ Portfolio benchmarking

---

## OPEN QUESTIONS FOR CLAUDE CODE

### Q1: Grid Library Choice

**Options:**
- AG-Grid (Excel-like, free community edition)
- TanStack Table (React-native, flexible)
- Custom implementation

**Recommendation:** AG-Grid - Most Excel-like, inline editing built-in

### Q2: Lease Detail Display

**Options:**
- A) Expandable row (click to show details below)
- B) Side panel (click row, panel slides in from right)
- C) Modal dialog (click row, popup with full details)

**Recommendation:** A (expandable row) - Keeps context, no navigation

### Q3: Market Tab Data Source

**Options:**
- A) Manual entry only (for now)
- B) Manual + API integration (CoStar)
- C) Manual + AI document upload

**Recommendation:** A for Phase 1, add B+C in Phase 2

### Q4: Analysis Calculations

**Where should IRR calculations run?**
- A) Real-time in UI (fast but limited)
- B) API endpoint (scalable)
- C) Background job (for complex scenarios)

**Recommendation:** B - API endpoint `/api/properties/:id/analysis`

---

## SUCCESS CRITERIA

### Rent Roll Tab
- [ ] Displays 41 spaces from Scottsdale Promenade
- [ ] Inline editing works (click cell, edit, save)
- [ ] Can add new lease
- [ ] Can import from CSV
- [ ] Summary bar shows correct occupancy %
- [ ] Color coding: Green=leased, Red=vacant
- [ ] Expandable row shows full lease details

### Market Assumptions Tab
- [ ] Shows 7 space types (Anchor, Inline, etc.)
- [ ] Can manually enter market rent PSF
- [ ] Confidence indicator (manual = "Medium")
- [ ] Links to comp database (stub for Phase 2)

### Analysis Tab
- [ ] Calculates loss-to-lease correctly
- [ ] Shows below-market leases ranked
- [ ] Lease rollover schedule by year
- [ ] Export to Excel button works

---

## FILES TO CREATE

```
/src/app/rent-roll/
  ├── page.tsx                          # Main page with tabs
  ├── components/
  │   ├── RentRollGrid.tsx             # Lease data grid (Tab 1)
  │   ├── ExpandedLeaseRow.tsx         # Lease detail expansion
  │   ├── MarketAssumptions.tsx        # Market rent tab (Tab 2)
  │   ├── AnalysisDashboard.tsx        # Loss-to-lease tab (Tab 3)
  │   └── ImportWizard.tsx             # CSV import (Phase 2)
  └── types/
      └── lease.types.ts               # TypeScript interfaces
```

**API Routes:**
```
/src/app/api/properties/[id]/
  ├── rent-roll/route.ts               # GET leases, POST new lease
  ├── market-assumptions/route.ts      # GET/PUT market rents
  └── analysis/route.ts                # GET computed metrics
```

---

**Ready for implementation.**

**HR14**
