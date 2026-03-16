# Claude Code Implementation Prompt: Napkin Mode - Landscaper-Powered Feasibility Sketch

**Date**: November 24, 2025  
**Session ID**: ZK22  
**Priority**: Phase 1 (UI Shell) CAN START NOW - Phase 3+ blocked on Cash Flow Engine  
**Dependencies**: See phased dependency list below

---

## EXECUTIVE SUMMARY

Build a new "Napkin Mode" that represents a fundamentally different analysis workflow from the current Standard/Detail toggle system. Napkin Mode is a **Landscaper-powered feasibility sketch** that calculates Residual Land Value (RLV) from approximately 7 high-level inputs, enabling users to quickly answer: "What can I pay for this land?"

**Key Distinction**: The current Napkin/Standard/Detail toggles control *column visibility* within grids. This new Napkin Mode is a completely separate **analysis entity** with its own UI, minimal inputs, and AI-assisted assumption generation.

**Strategic Value**: This is one of Landscape's most novel features - democratizing sophisticated land feasibility analysis by letting Landscaper fill in the gaps using its persistent knowledge base. As users populate the Unit Cost Library and complete projects, Landscaper's suggestions improve.

---

## CONCEPTUAL MODEL

### Analyst vs Developer Workflow

**Analyst Mode (Napkin)**: User is evaluating a potential deal. No contract exists. The question is "What can I pay?" 
- Output: Residual Land Value (RLV) - the maximum supportable land price given assumptions and return requirements
- Optional: If estimated purchase price entered, also shows NPV = RLV - Estimated Purchase Price

**Developer Mode (Standard/Detail)**: User has a deal or is under contract. The question is "Does this deal work at this price?"
- Full project lifecycle tabs: Acquisition, Planning, Development, Sales, Results, Documents
- Detailed line-item entry, actual tracking, variance analysis

### The Transition

A napkin sketch can be **promoted** to a full project when the user decides to pursue the deal. Napkin assumptions become reference benchmarks visible within each detailed tab, showing variance as the user adds granularity.

---

## UI STRUCTURE

### Napkin Mode Navigation

When a project is in Napkin Mode, show only 3 tiles:

```
┌──────────────┐  ┌──────────────────┐  ┌─────────────┐
│ Project Home │  │  Napkin Analysis │  │  Documents  │
└──────────────┘  └──────────────────┘  └─────────────┘
```

- **Project Home**: Location, acreage, basic project info
- **Napkin Analysis**: The 7 core inputs + Landscaper suggestions + calculated RLV
- **Documents**: OMs, aerials, site plans for reference during analysis

### Developer Mode Navigation (Existing)

When promoted to Developer Mode, show full 7-tile navigation:

```
┌──────────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────────┐
│ Project Home │  │ Acquisition │  │ Planning │  │ Development │
└──────────────┘  └─────────────┘  └──────────┘  └─────────────┘

┌───────┐  ┌─────────┐  ┌───────────┐
│ Sales │  │ Results │  │ Documents │
└───────┘  └─────────┘  └───────────┘
```

---

## NAPKIN ANALYSIS PAGE

### The 7 Core Inputs

These inputs are sufficient for Landscaper to build a complete cash flow model:

| # | Input | Description | UOM | Source |
|---|-------|-------------|-----|--------|
| 1 | **Project Acreage** | Total gross acres | AC | User / Project Home |
| 2 | **Residential Density** | Target dwelling units per acre | DU/AC | User input |
| 3 | **Average Home Price** | Current market new home price | $ | User or Landscaper |
| 4 | **Finished Lot Price** | Price per front foot | $/FF | User or Landscaper |
| 5 | **Development Cost** | Subdivision development cost | $/FF | User or Landscaper |
| 6 | **Time to First Sale** | Months from close to first parcel sale | Months | User input |
| 7 | **Absorption Rate** | Units absorbed per year | Units/Yr | User or Landscaper |

**Required Return Metric:**
| Input | Description | UOM |
|-------|-------------|-----|
| **Target Equity IRR** | Required return on equity | % |

**Optional Input:**
| Input | Description | UOM |
|-------|-------------|-----|
| **Estimated Purchase Price** | Current asking or expected price | $ |

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NAPKIN ANALYSIS                                          [Promote →]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── PROJECT SCALE ──────────────────────────────────────────────┐    │
│  │  Gross Acres: [______] AC    Target Density: [______] DU/AC   │    │
│  │  Implied Units: 1,250 DU                                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─── MARKET ASSUMPTIONS ─────────────────────────────────────────┐    │
│  │                          User Input    Landscaper    Source     │    │
│  │  Avg Home Price:         [________]    $485,000     [UCL]  ◉   │    │
│  │  Finished Lot Price:     [________]    $2,100/FF    [UCL]  ◉   │    │
│  │  Development Cost:       [________]    $1,075/FF    [UCL]  ◉   │    │
│  │                                                                 │    │
│  │  ◉ = User Override   ○ = Using Landscaper Suggestion           │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─── TIMING & ABSORPTION ────────────────────────────────────────┐    │
│  │  Time to First Sale:     [______] months                       │    │
│  │  Absorption Rate:        [______] units/year    [Landscaper]   │    │
│  │  Implied Sellout:        8.3 years                             │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─── RETURN REQUIREMENTS ────────────────────────────────────────┐    │
│  │  Target Equity IRR:      [______] %                            │    │
│  │  Estimated Purchase:     [________] (optional)                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ┌─── LANDSCAPER RESULTS ─────────────────────────────────────────┐    │
│  │                                                                 │    │
│  │   RESIDUAL LAND VALUE         NPV (if purchase price entered)  │    │
│  │  ┌─────────────────────┐     ┌─────────────────────┐           │    │
│  │  │                     │     │                     │           │    │
│  │  │    $12,450,000      │     │    $2,450,000       │           │    │
│  │  │    $9,968 / AC      │     │    Positive NPV     │           │    │
│  │  │                     │     │                     │           │    │
│  │  └─────────────────────┘     └─────────────────────┘           │    │
│  │                                                                 │    │
│  │   [View Cash Flow Summary]   [View Assumptions Detail]         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─── LANDSCAPER CONFIDENCE ──────────────────────────────────────┐    │
│  │  ▓▓▓▓▓▓▓▓░░ 78% - "3 of 4 market assumptions from Unit Cost   │    │
│  │              Library. Consider adding Phoenix-area lot comps." │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## LANDSCAPER INTEGRATION

### Knowledge Sources (Priority Order)

1. **Unit Cost Library** - User's own cost comps (highest confidence)
2. **Completed Projects** - Historical project data from user's portfolio
3. **Market Assumptions Table** - Stored market benchmarks
4. **Benchmarks System** - Growth rates, inflation, cap rates

### Suggestion Behavior

When a field is empty and Landscaper has relevant data:

```typescript
interface LandscaperSuggestion {
  field: string;                    // e.g., "finished_lot_price"
  suggestedValue: number;
  confidence: 'high' | 'medium' | 'low';
  source: string;                   // e.g., "Unit Cost Library"
  reasoning: string;                // e.g., "Based on 8 Phoenix-area comps, avg $2,100/FF"
  dataPoints: number;               // Number of comps used
  dateRange?: string;               // e.g., "Jan 2024 - Oct 2024"
}
```

### User Override Pattern

- Landscaper suggestions shown in a secondary column
- User can accept (click to populate) or override (type their own value)
- Overrides are tracked and feed back into Landscaper's learning
- Radio buttons or visual indicator shows which value is active

### Confidence Scoring

Landscaper provides overall confidence based on:
- How many inputs came from Unit Cost Library vs user guesses
- Recency of comparable data
- Geographic relevance of comps
- Consistency of data points

Display as progress bar with explanatory text.

---

## CALCULATION ENGINE

### Cash Flow Generation (Simplified)

Napkin mode generates a simplified cash flow model:

```typescript
interface NapkinCashFlow {
  periods: NapkinPeriod[];
  summary: {
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    residualLandValue: number;
    impliedIRR: number;
    npv?: number;                   // Only if estimated purchase price entered
  };
}

interface NapkinPeriod {
  period: number;                   // Month index
  year: number;
  unitsSold: number;
  grossRevenue: number;             // Units × Lot Price
  developmentCost: number;          // Allocated development cost
  netCashFlow: number;
  cumulativeCashFlow: number;
}
```

### RLV Calculation Logic

```
1. Calculate total units: Acres × Density = Units
2. Calculate average lot front feet (assume 50 FF if not specified)
3. Calculate gross lot revenue: Units × Lot Width × $/FF = Gross Revenue
4. Calculate development costs: Units × Lot Width × Dev Cost/FF = Total Dev Cost
5. Generate absorption schedule based on absorption rate
6. Discount future net cash flows at target IRR
7. Residual Land Value = NPV of net cash flows BEFORE land cost
8. If estimated purchase price entered: NPV = RLV - Purchase Price
```

### Assumptions Landscaper Must Derive

From the 7 inputs, Landscaper needs to derive/assume:
- Average lot width (can pull from Unit Cost Library product types)
- Planning efficiency (net to gross ratio, default 80%)
- Cost escalation rate (from benchmarks)
- Revenue escalation rate (from benchmarks)
- Absorption curve shape (linear vs S-curve)
- Sales commission rate (default 3%)
- Closing costs (default 2%)

These derived assumptions should be viewable in an "Assumptions Detail" modal.

---

## DATABASE SCHEMA

### New Table: `napkin_analysis`

```sql
CREATE TABLE IF NOT EXISTS landscape.napkin_analysis (
  napkin_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  
  -- Core Inputs
  gross_acres NUMERIC(12,4),
  target_density NUMERIC(8,2),           -- DU/AC
  avg_home_price NUMERIC(14,2),
  finished_lot_price_per_ff NUMERIC(10,2),
  development_cost_per_ff NUMERIC(10,2),
  time_to_first_sale_months INTEGER,
  absorption_rate_per_year NUMERIC(8,2),
  
  -- Return Requirements
  target_equity_irr NUMERIC(6,4),        -- Stored as decimal (0.15 = 15%)
  estimated_purchase_price NUMERIC(14,2),
  
  -- Source Tracking (user vs landscaper)
  home_price_source VARCHAR(20),         -- 'user', 'landscaper', 'benchmark'
  lot_price_source VARCHAR(20),
  dev_cost_source VARCHAR(20),
  absorption_source VARCHAR(20),
  
  -- Calculated Results (cached)
  calculated_rlv NUMERIC(14,2),
  calculated_npv NUMERIC(14,2),
  landscaper_confidence NUMERIC(5,2),    -- 0-100
  
  -- Derived Assumptions (JSON blob)
  derived_assumptions JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  calculated_at TIMESTAMP,
  
  UNIQUE(project_id)                     -- One napkin analysis per project
);

CREATE INDEX idx_napkin_project ON landscape.napkin_analysis(project_id);
```

### Derived Assumptions JSON Structure

```json
{
  "avg_lot_width_ff": 50,
  "planning_efficiency": 0.80,
  "cost_escalation_rate": 0.03,
  "revenue_escalation_rate": 0.035,
  "absorption_curve": "linear",
  "sales_commission_rate": 0.03,
  "closing_cost_rate": 0.02,
  "landscaper_notes": [
    "Lot width based on 'Standard 50' product in Unit Cost Library",
    "Absorption rate benchmarked against 5 Phoenix MPC projects"
  ]
}
```

### Project Table Addition

Add column to `tbl_project` to track mode:

```sql
ALTER TABLE landscape.tbl_project 
ADD COLUMN IF NOT EXISTS analysis_mode VARCHAR(20) DEFAULT 'napkin';
-- Values: 'napkin', 'developer'
```

---

## API ENDPOINTS

### GET /api/projects/[projectId]/napkin

Returns current napkin analysis state including Landscaper suggestions.

**Response:**
```json
{
  "inputs": {
    "grossAcres": 500,
    "targetDensity": 2.5,
    "avgHomePrice": null,
    "finishedLotPricePerFf": 2100,
    "developmentCostPerFf": null,
    "timeToFirstSaleMonths": 24,
    "absorptionRatePerYear": 150,
    "targetEquityIrr": 0.18,
    "estimatedPurchasePrice": 10000000
  },
  "suggestions": {
    "avgHomePrice": {
      "value": 485000,
      "confidence": "high",
      "source": "Unit Cost Library",
      "reasoning": "Based on 12 Phoenix-area new home comps",
      "dataPoints": 12
    },
    "developmentCostPerFf": {
      "value": 1075,
      "confidence": "medium",
      "source": "Unit Cost Library",
      "reasoning": "Based on 5 subdivision development cost entries",
      "dataPoints": 5
    }
  },
  "results": {
    "impliedUnits": 1250,
    "residualLandValue": 12450000,
    "rlvPerAcre": 24900,
    "npv": 2450000,
    "landscaperConfidence": 78
  },
  "derivedAssumptions": {
    "avgLotWidthFf": 50,
    "planningEfficiency": 0.80,
    "costEscalationRate": 0.03,
    "revenueEscalationRate": 0.035,
    "absorptionCurve": "linear",
    "salesCommissionRate": 0.03,
    "closingCostRate": 0.02
  },
  "analysisMode": "napkin"
}
```

### PUT /api/projects/[projectId]/napkin

Update napkin inputs and trigger recalculation.

**Request:**
```json
{
  "grossAcres": 500,
  "targetDensity": 2.5,
  "avgHomePrice": 490000,
  "avgHomePriceSource": "user",
  "finishedLotPricePerFf": 2100,
  "lotPriceSource": "landscaper",
  "developmentCostPerFf": 1100,
  "devCostSource": "user",
  "timeToFirstSaleMonths": 24,
  "absorptionRatePerYear": 150,
  "absorptionSource": "landscaper",
  "targetEquityIrr": 0.18,
  "estimatedPurchasePrice": 10000000
}
```

### POST /api/projects/[projectId]/napkin/promote

Promote napkin analysis to full developer mode project.

**Response:**
```json
{
  "success": true,
  "analysisMode": "developer",
  "napkinBenchmarks": {
    "totalBudget": 15500000,
    "totalRevenue": 28000000,
    "residualLandValue": 12450000
  }
}
```

### GET /api/projects/[projectId]/napkin/cash-flow

Returns simplified cash flow schedule for display.

---

## COMPONENTS

### New Components to Create

```
src/components/napkin/
├── NapkinAnalysisPage.tsx       # Main page container
├── NapkinInputSection.tsx       # Input groups with Landscaper suggestions
├── NapkinResultsCard.tsx        # RLV and NPV display cards
├── LandscaperSuggestion.tsx     # Individual field suggestion UI
├── ConfidenceIndicator.tsx      # Progress bar with explanation
├── AssumptionsDetailModal.tsx   # View all derived assumptions
├── CashFlowSummaryModal.tsx     # Simplified cash flow view
├── PromoteProjectModal.tsx      # Confirm promotion to developer mode
└── hooks/
    ├── useNapkinAnalysis.ts     # Fetch/update napkin data
    └── useLandscaperSuggestions.ts  # Get AI suggestions
```

### Navigation Updates

Update `LifecycleTileNav.tsx` to check `analysis_mode`:

```typescript
// If project.analysisMode === 'napkin', show reduced tile set
const napkinTiles = [
  { label: 'Project Home', route: '/project/home', color: 'primary' },
  { label: 'Napkin Analysis', route: '/project/napkin', color: 'info' },
  { label: 'Documents', route: '/project/documents', color: 'dark' },
];

const developerTiles = [
  // Existing 7 tiles
];

const tiles = project.analysisMode === 'napkin' ? napkinTiles : developerTiles;
```

---

## NAPKIN BENCHMARK PERSISTENCE

When user promotes to Developer Mode, napkin assumptions persist as reference benchmarks.

### Display Pattern

Each detailed tab shows a comparison header:

```
┌─────────────────────────────────────────────────────────────────┐
│  Budget: Planning & Engineering                                 │
├─────────────────────────────────────────────────────────────────┤
│  Napkin: $1,500,000  │  Detail: $1,847,500  │  Δ: +$347,500    │
└─────────────────────────────────────────────────────────────────┘
```

On the Napkin Analysis page (even after promotion), add a "Detail" column:

```
┌──────────────────────────────────────────────────────────────────┐
│  NAPKIN ASSUMPTIONS                                              │
├────────────────────────┬─────────────┬─────────────┬────────────┤
│  Category              │   Napkin    │   Detail    │   Δ        │
├────────────────────────┼─────────────┼─────────────┼────────────┤
│  P&E Budget            │  $1,500,000 │  $1,847,500 │  +$347,500 │
│  Development Costs     │ $15,500,000 │ $14,875,000 │  -$625,000 │
│  Parcel Revenue        │ $28,000,000 │ $29,150,000 │  +$1.15M   │
│  Residual Land Value   │ $12,450,000 │ $13,225,000 │  +$775,000 │
├────────────────────────┼─────────────┼─────────────┼────────────┤
│  ** Detail column sums from Standard/Detail mode line items **  │
└──────────────────────────────────────────────────────────────────┘
```

---

## LANDSCAPER CONFIDENCE RULES

### High Confidence (75-100%)
- 3+ of 4 market assumptions from Unit Cost Library
- Comps are < 12 months old
- Comps are in same MSA or submarket

### Medium Confidence (50-74%)
- 2 of 4 assumptions from UCL
- Some comps older than 12 months
- Comps from similar but not identical markets

### Low Confidence (0-49%)
- Using defaults or minimal data
- No relevant comps in UCL
- User should add data to improve estimates

### Confidence Messaging Examples

**High**: "Strong estimate based on 8 local comps from your Unit Cost Library. Last updated October 2024."

**Medium**: "Moderate confidence. Development cost based on Phoenix metro averages. Consider adding project-specific bids."

**Low**: "Limited data available. These are placeholder estimates. Add comparable costs to your Unit Cost Library for better accuracy."

---

## INTEGRATION WITH UNIT COST LIBRARY

### Querying UCL for Suggestions

```typescript
// Example: Get development cost suggestion
async function getDevelopmentCostSuggestion(projectLocation: GeoPoint): Promise<Suggestion> {
  // 1. Query UCL for subdivision development cost items
  const comps = await db.query(`
    SELECT 
      uc.price,
      uc.uom_code,
      uc.as_of_date,
      uc.location_lat,
      uc.location_lng
    FROM landscape.unit_cost_library uc
    WHERE uc.category = 'Development'
      AND uc.item_type = 'Subdivision Development'
      AND uc.uom_code = 'FF'
      AND uc.as_of_date > NOW() - INTERVAL '24 months'
    ORDER BY 
      ST_Distance(
        ST_Point(uc.location_lng, uc.location_lat),
        ST_Point($1, $2)
      )
    LIMIT 10
  `, [projectLocation.lng, projectLocation.lat]);
  
  // 2. Calculate weighted average (closer + more recent = higher weight)
  const weightedAvg = calculateWeightedAverage(comps);
  
  // 3. Determine confidence
  const confidence = determineConfidence(comps);
  
  return {
    value: weightedAvg,
    confidence,
    source: 'Unit Cost Library',
    reasoning: `Based on ${comps.length} subdivision cost entries within 50 miles`,
    dataPoints: comps.length
  };
}
```

---

## IMPLEMENTATION PHASES

### Phase 1: UI Shell (CAN START NOW)
1. Create NapkinAnalysisPage with input sections
2. Add navigation tile switching based on `analysis_mode`
3. Build all input components with validation
4. Create results display cards (RLV, NPV) with **mock/placeholder values**
5. Build Landscaper suggestion UI components (with static mock suggestions)
6. Create ConfidenceIndicator, AssumptionsDetailModal, CashFlowSummaryModal shells
7. Implement PromoteProjectModal UI flow

**Output**: Fully interactive UI that accepts inputs and displays mock results. User can experience the full workflow visually.

### Phase 2: Database & API Foundation (AFTER PHASE 1)
1. Create `napkin_analysis` table
2. Add `analysis_mode` to `tbl_project`
3. Implement CRUD API endpoints
4. Wire UI inputs to database persistence
5. Results still use mock calculations

### Phase 3: Calculation Engine Integration (AFTER CASH FLOW ENGINE COMPLETE)
1. Replace mock RLV calculation with real engine
2. Replace mock NPV calculation with real engine
3. Wire cash flow summary modal to actual generated schedule
4. Validate results against Peoria Lakes reference model

### Phase 4: Landscaper Integration
1. Build UCL query logic for suggestions
2. Implement confidence scoring algorithm
3. Replace mock suggestions with real UCL queries
4. Track source (user vs landscaper) for each input

### Phase 5: Benchmark Persistence
1. Store napkin values when promoted
2. Add comparison headers to detailed tabs
3. Add Detail column to Napkin Analysis page
4. Implement variance calculations between napkin and detail

### Phase 6: Learning Loop (FUTURE)
1. Track user overrides of Landscaper suggestions
2. Feed corrections back into Landscaper training
3. Improve suggestion accuracy over time

---

## TESTING REQUIREMENTS

### Unit Tests
- RLV calculation with known inputs produces expected output
- NPV calculation correct when purchase price entered
- Confidence scoring logic
- UCL query returns relevant comps

### Integration Tests
- Create napkin analysis, update, retrieve
- Promote to developer mode preserves benchmarks
- Navigation switches correctly based on mode

### UI Tests
- Input fields accept/validate correctly
- Landscaper suggestions display and can be accepted/overridden
- Results update when inputs change
- Promote modal flow works

---

## ACCEPTANCE CRITERIA

**Phase 1 Complete When:**
- [ ] User can create project in napkin mode
- [ ] 7 core inputs can be entered and saved
- [ ] RLV calculates and displays correctly
- [ ] NPV shows when estimated purchase price entered
- [ ] Navigation shows only 3 tiles in napkin mode

**Phase 2 Complete When:**
- [ ] Landscaper provides suggestions from Unit Cost Library
- [ ] Confidence indicator shows with explanation
- [ ] User can override suggestions
- [ ] Override tracking works

**Phase 3 Complete When:**
- [ ] Promotion to developer mode works
- [ ] Napkin benchmarks persist and display
- [ ] Variance shows on detailed tabs
- [ ] Napkin Analysis page shows Detail column after promotion

---

## DEPENDENCIES

**Phase 1 (UI Shell) - Can Start Immediately:**
- No blockers - uses mock data and placeholder calculations
- Requires only existing navigation infrastructure

**Phase 2 (Database) - After Phase 1:**
- Standard database migration process
- No external dependencies

**Phase 3 (Calculation Engine) - Blocked Until:**
1. Cash Flow Engine complete
2. Feasibility Metrics (IRR/NPV) complete  
3. RLV Solver complete

**Phase 4+ - After Phase 3:**
- Unit Cost Library must be functional (it already is)
- Benchmarks system available (it already is)

---

## REFERENCE DOCUMENTS

- `IMPLEMENTATION_STATUS_25-11-24.md` - Current system state
- `LANDSCAPE_CONTEXT.md` - Database schema reference
- `Landscaper_Product_Description.md` - AI integration patterns
- `residential_mpc_analytics_summary.md` - MPC calculation requirements
- `PeoriaLakes MPC_2023.xlsm` - Reference cash flow model

---

## NOTES FOR CLAUDE CODE

- **Phase 1 can start immediately** - build the full UI with mock data first
- **Use placeholder calculations** - e.g., `RLV = grossAcres * 25000` as mock until real engine ready
- **Mock Landscaper suggestions** - hardcode sample suggestions to validate the UI pattern
- **Unit Cost Library** is already built (see screenshot in chat) - Phase 4 will query it
- **Benchmarks system** exists - can pull growth rates when wiring up
- **Check `analysis_mode`** before rendering navigation - don't break existing developer mode projects
- **Keep components modular** - calculation logic should be easily swappable when real engine arrives

---

**Prompt Version**: 1.0  
**Created By**: Gregg + Claude (ZK22)  
**Status**: Ready for implementation after Cash Flow Engine complete
