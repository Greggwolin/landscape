/**
 * Landscaper Demo Flow State Machine
 *
 * Provides scripted demo responses for Sunhaven Ranch using
 * real market data from Zonda/HBACA databases.
 */

export type DemoState =
  | 'IDLE'
  | 'DOC_UPLOADED'
  | 'EXTRACTION_SHOWN'
  | 'BENCHMARKS_APPLIED'
  | 'ANALYSIS_COMPLETE';

export interface DemoResponse {
  content: string;
  actions?: { label: string; nextState?: DemoState; value?: string }[];
  quickReplies?: string[];
}

// Sunhaven Ranch extraction data (pre-built demo data)
export const SUNHAVEN_EXTRACTION = {
  projectName: 'Sunhaven Ranch',
  location: 'Buckeye, AZ',
  grossAcres: 320,
  netAcres: 245,
  totalUnits: 1127,
  phases: [
    { name: 'Phase 1', lots: 187, lotWidth: 45, acres: 42 },
    { name: 'Phase 2', lots: 224, lotWidth: 50, acres: 56 },
    { name: 'Phase 3', lots: 198, lotWidth: 55, acres: 52 },
    { name: 'Phase 4', lots: 156, lotWidth: 60, acres: 48 },
    { name: 'Phase 5', lots: 155, lotWidth: 55, acres: 44 },
    { name: 'Phase 6', lots: 207, lotWidth: 'MDR', acres: 38 },
  ],
  commercial: { pads: 2, acres: 15.5 },
  parks: { acres: 12 },
  drainage: { acres: 8.5 },
};

// Scripted responses for each demo state
export const SUNHAVEN_RESPONSES: Record<DemoState, DemoResponse> = {
  IDLE: {
    content: `I'm ready to help analyze this land deal. Upload a document (PDF, Excel, or image) and I'll extract the key project metrics.`,
    quickReplies: ['What can you do?', 'Show me an example'],
  },

  DOC_UPLOADED: {
    content: `I've processed your document and extracted the land plan for **Sunhaven Ranch** in Buckeye, AZ.

| Phase | Lots | Lot Width | Acres |
|-------|------|-----------|-------|
| Phase 1 | 187 | 45' | 42 |
| Phase 2 | 224 | 50' | 56 |
| Phase 3 | 198 | 55' | 52 |
| Phase 4 | 156 | 60' | 48 |
| Phase 5 | 155 | 55' | 44 |
| Phase 6 (MDR) | 207 | Attached | 38 |

**Summary:**
- **Total Units:** 1,127 (920 SFD + 207 MDR)
- **Gross Acres:** 320
- **Net Developable:** 245 acres
- **Commercial:** 2 pads (15.5 ac)
- **Parks/Open Space:** 12 ac

Want me to pull market benchmarks for Buckeye to validate your assumptions?`,
    actions: [
      { label: 'Pull Benchmarks', nextState: 'EXTRACTION_SHOWN' },
      { label: 'Adjust Extraction' },
    ],
    quickReplies: ['What absorption rate should I use?', 'What are comps selling for?'],
  },

  EXTRACTION_SHOWN: {
    content: `Here's how **Sunhaven Ranch** compares to the Buckeye market:

### Absorption by Lot Width (Buckeye/West Valley)
| Lot Width | Market Avg | Median | Top Quartile | Projects |
|-----------|-----------|--------|--------------|----------|
| 45' | 3.2/mo | 2.8/mo | 4.5/mo | 12 |
| 50' | 3.5/mo | 3.1/mo | 4.8/mo | 18 |
| 55' | 2.9/mo | 2.5/mo | 4.1/mo | 14 |
| 60' | 2.4/mo | 2.1/mo | 3.4/mo | 8 |

### Pricing Benchmarks (Active Communities)
| Lot Width | Avg Price | Entry | Ceiling |
|-----------|-----------|-------|---------|
| 45' | $425,000 | $389,000 | $465,000 |
| 50' | $468,000 | $429,000 | $512,000 |
| 55' | $498,000 | $455,000 | $545,000 |
| 60' | $535,000 | $489,000 | $589,000 |

### Competitive Projects (Top 5 by velocity)
1. **Estrella Vista** (Meritage) - 50' @ $452K, 4.2/mo
2. **Verrado Highlands** (Taylor Morrison) - 55' @ $489K, 3.8/mo
3. **Tartesso West** (Lennar) - 45' @ $398K, 3.6/mo
4. **Festival Ranch** (Pulte) - 50' @ $445K, 3.4/mo
5. **Canyon Trails** (KB Home) - 55' @ $475K, 3.2/mo

Based on this data, I'd suggest **3.0/mo blended absorption** for your mix. Apply these benchmarks to the analysis?`,
    actions: [
      { label: 'Apply Benchmarks', nextState: 'BENCHMARKS_APPLIED' },
      { label: 'Adjust Values' },
    ],
    quickReplies: ['What about permit trends?', 'Show infrastructure costs'],
  },

  BENCHMARKS_APPLIED: {
    content: `I've applied market benchmarks to your Sunhaven Ranch analysis:

### Applied Values
| Metric | Your Input | Market Benchmark | Applied |
|--------|-----------|------------------|---------|
| Absorption (blended) | - | 3.0/mo | ✓ 3.0/mo |
| 45' lot price | - | $425,000 | ✓ $425,000 |
| 50' lot price | - | $468,000 | ✓ $468,000 |
| 55' lot price | - | $498,000 | ✓ $498,000 |
| 60' lot price | - | $535,000 | ✓ $535,000 |
| FLF (45'-50') | - | 22-23% | ✓ 22.5% |
| FLF (55'-60') | - | 23-24% | ✓ 23.5% |

### Projected Timeline
- **Phase 1 Start:** Month 0 (after 18-month entitlement)
- **Phase 1 Complete:** Month 62 (187 lots @ 3.0/mo)
- **Full Buildout:** ~6.2 years (1,127 units)

### Permit Trend Context (Buckeye)
- 2023: 2,847 SF permits
- 2024: 3,156 SF permits (+11% YoY)
- 2025 YTD: 2,890 (on pace for 3,400+)

The market is healthy with increasing permit activity. Your timing looks good.

Ready to review the full pro forma?`,
    actions: [
      { label: 'Open Pro Forma', nextState: 'ANALYSIS_COMPLETE' },
      { label: 'Adjust Timeline' },
    ],
    quickReplies: ['What are the risks?', 'Compare to Gilbert market'],
  },

  ANALYSIS_COMPLETE: {
    content: `Your Sunhaven Ranch analysis is ready. I've populated the Napkin forms with benchmark data.

### Summary Metrics
| Metric | Value |
|--------|-------|
| Total Revenue | $524.8M |
| Land Basis | $42.0M ($131K/gross ac) |
| Blended FLF | 23% |
| Project IRR | 18.4% |
| Equity Multiple | 2.1x |

**Key Observations:**
1. ✓ Absorption assumption (3.0/mo) is conservative vs market (3.2 avg)
2. ✓ Pricing is in-line with market entry points
3. ⚠️ Phase 6 MDR pricing should be validated - attached product is sparse in Buckeye
4. ✓ Permit trends support continued demand through buildout

The analysis panels on the left now reflect these values. You can adjust any assumption and I'll recalculate in real-time.

What else would you like to explore?`,
    quickReplies: ['Run sensitivity analysis', 'Export to Excel', 'Start fresh'],
  },
};

// Quick reply handlers
export const QUICK_REPLY_RESPONSES: Record<string, DemoResponse> = {
  'What can you do?': {
    content: `I can help you:
- **Extract land plans** from PDFs, images, or spreadsheets
- **Pull market benchmarks** from 700+ active Zonda projects
- **Analyze permit trends** using 35 years of HBACA data
- **Validate assumptions** against comparable projects
- **Calculate residual land values** using FLF analysis

Upload a document to get started, or ask me about a specific market.`,
    quickReplies: ['Show me an example', 'What markets do you cover?'],
  },

  'Show me an example': {
    content: `Here's a quick example using **Sunhaven Ranch** in Buckeye:

1. **Upload** a land plan PDF or parcel schedule
2. **I extract** lot counts, widths, phases, and acreage
3. **I pull benchmarks** from nearby active communities
4. **I validate** your assumptions vs market data
5. **You adjust** and iterate in real-time

Want to try it? Upload any document and I'll show you the full flow.`,
    quickReplies: ['What markets do you cover?'],
  },

  'What markets do you cover?': {
    content: `I have comprehensive data for the **Phoenix MSA** including:

**West Valley:** Buckeye, Goodyear, Surprise, Peoria, Glendale
**East Valley:** Gilbert, Mesa, Chandler, Queen Creek, Apache Junction
**North Valley:** Phoenix, Scottsdale, Paradise Valley, Cave Creek
**Pinal County:** Casa Grande, Maricopa, Florence, Coolidge

Data sources:
- **Zonda:** 717 active subdivision projects with pricing, absorption, lot sizes
- **HBACA:** 35 years of permit history (1990-2025) for 22 jurisdictions

Ask me about any Phoenix-area market and I'll pull the data.`,
    quickReplies: ['Tell me about Buckeye', 'What about Gilbert?'],
  },

  'What absorption rate should I use?': {
    content: `For Buckeye/West Valley, absorption varies by lot width:

| Lot Width | Market Avg | Safe Assumption |
|-----------|-----------|-----------------|
| 40'-45' | 3.2/mo | 2.8/mo |
| 50' | 3.5/mo | 3.0/mo |
| 55' | 2.9/mo | 2.5/mo |
| 60'+ | 2.4/mo | 2.0/mo |

For a blended project like Sunhaven Ranch (45'-60' mix), I'd recommend **3.0/mo** as a conservative starting point.

Top performers like Estrella Vista and Verrado are hitting 4.0+/mo, but that requires premium location and builder execution.`,
    quickReplies: ['What are comps selling for?', 'Pull full benchmarks'],
  },

  'What are comps selling for?': {
    content: `Active community pricing in Buckeye (as of this month):

| Lot Width | Entry | Average | Ceiling |
|-----------|-------|---------|---------|
| 45' | $389K | $425K | $465K |
| 50' | $429K | $468K | $512K |
| 55' | $455K | $498K | $545K |
| 60' | $489K | $535K | $589K |

**Price/SF benchmarks:**
- 45' product: $245-265/SF
- 50' product: $235-255/SF
- 55' product: $225-245/SF
- 60' product: $215-235/SF

These are builder base prices, not including lot premiums or options.`,
    quickReplies: ['What about permit trends?', 'Pull full benchmarks'],
  },

  'What about permit trends?': {
    content: `Buckeye permit activity has been strong:

| Year | SF Permits | YoY Change |
|------|-----------|------------|
| 2020 | 2,156 | - |
| 2021 | 2,847 | +32% |
| 2022 | 2,534 | -11% |
| 2023 | 2,847 | +12% |
| 2024 | 3,156 | +11% |
| 2025 YTD | 2,890 | +8% pace |

**MSA Context:** Phoenix MSA is averaging 3,200 SF permits/month in 2025, with Buckeye capturing ~12% of that volume.

The West Valley continues to outperform due to land availability and infrastructure investments (Loop 303, I-10 expansion).`,
    quickReplies: ['Show infrastructure costs', 'Pull full benchmarks'],
  },

  'Show infrastructure costs': {
    content: `Typical infrastructure costs for Buckeye MPCs:

### In-Tract (per lot)
| Item | Low | High | Typical |
|------|-----|------|---------|
| Grading | $3,500 | $6,000 | $4,500 |
| Streets/Paving | $5,000 | $8,000 | $6,500 |
| Water/Sewer | $4,000 | $7,000 | $5,500 |
| Dry Utilities | $2,500 | $4,000 | $3,000 |
| Landscaping | $1,500 | $3,000 | $2,000 |
| **Total** | **$16,500** | **$28,000** | **$21,500** |

### Offsite (lump sum)
| Item | Range |
|------|-------|
| Traffic Signals | $800K - $1.2M each |
| Arterial Widening | $2.5M - $5M/mile |
| Water Main Extension | $150 - $250/LF |
| Sewer Trunk | $200 - $350/LF |

For Sunhaven Ranch at 320 gross acres, budget **$22-25K/lot** for in-tract plus **$8-12M** for major offsites.`,
    quickReplies: ['What are the risks?', 'Pull full benchmarks'],
  },

  'What are the risks?': {
    content: `Key risks for Sunhaven Ranch (Buckeye):

### Market Risks
⚠️ **Supply concentration** - 18 active communities in immediate area
⚠️ **Interest rate sensitivity** - West Valley buyers skew first-time/move-up
⚠️ **Builder competition** - Lennar, Meritage, Taylor Morrison all active

### Project-Specific Risks
⚠️ **Phase 6 MDR** - Limited attached product comps in Buckeye
⚠️ **6-year buildout** - Long exposure to market cycles
⚠️ **Commercial pads** - Timing depends on rooftops

### Mitigants
✓ Strong permit trends (+11% YoY)
✓ Infrastructure investments (Loop 303)
✓ Conservative absorption assumption (3.0 vs 3.2 market)
✓ Phased development reduces capital at risk

Overall risk profile: **Moderate** - fundamentals are solid but execution matters.`,
    quickReplies: ['Compare to Gilbert market', 'Pull full benchmarks'],
  },

  'Compare to Gilbert market': {
    content: `Gilbert vs Buckeye comparison:

| Metric | Gilbert | Buckeye |
|--------|---------|---------|
| Active Projects | 24 | 18 |
| Avg Absorption | 2.8/mo | 3.2/mo |
| Entry Price (50') | $525K | $429K |
| Avg Price (50') | $568K | $468K |
| Permits (2024) | 1,890 | 3,156 |
| Land Cost/AC | $450K+ | $150-200K |

**Key Differences:**
- Gilbert is **infill** with limited land supply → higher prices, lower velocity
- Buckeye is **greenfield** with abundant supply → lower prices, higher velocity
- Gilbert buyers skew **move-up/executive**
- Buckeye buyers skew **first-time/entry**

For comparable lot widths, Buckeye achieves **15-25% higher absorption** but at **20-25% lower price points**.`,
    quickReplies: ['Tell me about Buckeye', 'Pull full benchmarks'],
  },

  'Tell me about Buckeye': {
    content: `**Buckeye Market Overview**

### Current Snapshot
- **Active Communities:** 18
- **Available Units:** 2,340
- **Avg Absorption:** 3.2/mo
- **Median Price:** $465,000

### Top Builders (by market share)
1. Lennar (22%)
2. Meritage (18%)
3. Taylor Morrison (15%)
4. KB Home (12%)
5. Pulte (10%)

### Lot Width Distribution
| Width | Communities | Units |
|-------|-------------|-------|
| 40'-45' | 8 | 890 |
| 50' | 12 | 1,245 |
| 55' | 6 | 560 |
| 60'+ | 4 | 380 |

### Recent Trends
- Price appreciation: +4.2% YTD
- Absorption trend: Stable (±0.2/mo)
- New community openings: 3 in last 90 days

Buckeye remains the highest-volume market in Phoenix MSA.`,
    quickReplies: ['What absorption rate should I use?', 'What are comps selling for?'],
  },

  'Run sensitivity analysis': {
    content: `Here's a sensitivity analysis for Sunhaven Ranch IRR:

### Absorption Sensitivity
| Absorption | Buildout | IRR |
|------------|----------|-----|
| 2.5/mo | 7.5 years | 15.8% |
| **3.0/mo** | **6.2 years** | **18.4%** |
| 3.5/mo | 5.4 years | 20.6% |
| 4.0/mo | 4.7 years | 22.4% |

### Price Sensitivity
| Price Δ | Revenue | IRR |
|---------|---------|-----|
| -10% | $472M | 14.2% |
| -5% | $498M | 16.3% |
| **Base** | **$525M** | **18.4%** |
| +5% | $551M | 20.4% |
| +10% | $577M | 22.2% |

### Combined Downside Scenario
- Absorption: 2.5/mo (-17%)
- Pricing: -5%
- **Stressed IRR: 12.8%**

The project has reasonable downside protection at your current land basis.`,
    quickReplies: ['Export to Excel', 'Adjust assumptions'],
  },

  'Export to Excel': {
    content: `I can export your Sunhaven Ranch analysis to Excel with:

📊 **Included tabs:**
- Land Plan Summary
- Phase Schedule
- Market Benchmarks
- Absorption Model
- Pro Forma
- Sensitivity Analysis

Click "Export Analysis" to download the workbook.`,
    actions: [
      { label: 'Export Analysis' },
    ],
    quickReplies: ['Start fresh', 'Adjust assumptions'],
  },

  'Start fresh': {
    content: `Ready to start a new analysis. Upload a document (PDF, Excel, or image) and I'll extract the project data.

Or tell me about a project and I can help you build assumptions from scratch.`,
    quickReplies: ['What markets do you cover?', 'Show me an example'],
  },
};

/**
 * Get the next demo state based on current state and action
 */
export function getNextDemoState(currentState: DemoState, action: string): DemoState {
  const response = SUNHAVEN_RESPONSES[currentState];
  const matchingAction = response.actions?.find(a => a.label === action);

  if (matchingAction?.nextState) {
    return matchingAction.nextState;
  }

  // Default state transitions
  switch (currentState) {
    case 'IDLE':
      return 'DOC_UPLOADED';
    case 'DOC_UPLOADED':
      return 'EXTRACTION_SHOWN';
    case 'EXTRACTION_SHOWN':
      return 'BENCHMARKS_APPLIED';
    case 'BENCHMARKS_APPLIED':
      return 'ANALYSIS_COMPLETE';
    default:
      return currentState;
  }
}

/**
 * Get demo response for a quick reply
 */
export function getQuickReplyResponse(reply: string): DemoResponse | null {
  return QUICK_REPLY_RESPONSES[reply] || null;
}

/**
 * Check if a message matches a demo trigger
 */
export function checkDemoTrigger(message: string): { isDemoTrigger: boolean; response?: DemoResponse } {
  const lowerMessage = message.toLowerCase();

  // Check quick replies first (case-insensitive match)
  for (const [key, response] of Object.entries(QUICK_REPLY_RESPONSES)) {
    if (lowerMessage.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerMessage)) {
      return { isDemoTrigger: true, response };
    }
  }

  return { isDemoTrigger: false };
}
