# Waterfall Implementation Handoff

## 1. FILES CREATED/MODIFIED

- /src/lib/financial-engine/waterfall/types.ts
  - Status: COMPLETE
  - Defines CashFlow, WaterfallTier, Partner, DistributionResult interfaces.
- /src/lib/financial-engine/waterfall/irr.ts
  - Status: COMPLETE
  - XIRR-style IRR helper using Newton-Raphson with bisection fallback.
- /src/lib/financial-engine/waterfall/engine.ts
  - Status: PARTIAL
  - Core waterfall calculation; accrues pref, returns capital, then split tiers. Needs validation of splits/remaining cash logic.
- /src/lib/financial-engine/waterfall/index.ts
  - Status: COMPLETE
  - Barrel export for types/irr/engine.
- /src/app/api/projects/[projectId]/waterfall/route.ts
  - Status: COMPLETE
  - GET current waterfall tiers and equity partners from DB.
- /src/app/api/projects/[projectId]/waterfall/napkin/route.ts
  - Status: COMPLETE
  - POST to create LP/GP equity rows and 3 tiers based on napkin inputs; clears existing tiers for project.
- /src/app/api/projects/[projectId]/waterfall/calculate/route.ts
  - Status: PARTIAL
  - GET to run waterfall: fetches tiers/partners, generates cash flow, runs engine, returns partner/tier/period summaries. Outputs present but splits may be zero because engine/tier data need tuning.
- /src/app/projects/[projectId]/napkin/waterfall/page.tsx
  - Status: COMPLETE
  - Standalone napkin page rendering form + results.
- /src/components/capitalization/NapkinWaterfallForm.tsx
  - Status: PARTIAL
  - Napkin UI with GP% input, pref/promote/hurdle/residual, auto-fetch equity requirement from cash-flow summary. Layout tightened; save posts derived lp/gp dollars. Needs further styling per latest feedback.
- /src/components/capitalization/WaterfallResults.tsx
  - Status: PARTIAL
  - “Run Waterfall” button and tables; maps API response to partner cards/tier/period tables. Shows dashes for zero values.
- /src/components/capitalization/PartnerSummaryCards.tsx
  - Status: COMPLETE
  - Displays partner contributed/distributed/IRR/multiple (used by WaterfallResults).

## 2. DATABASE QUERIES

- Read tiers: `SELECT ... FROM landscape.tbl_waterfall_tier WHERE project_id = $id ORDER BY COALESCE(display_order, tier_number)`
- Read equity partners: `SELECT ... FROM landscape.tbl_equity WHERE project_id = $id`
- Napkin POST writes equity partners (`INSERT/UPDATE landscape.tbl_equity`) and deletes/rewrites `tbl_waterfall_tier` with three tiers.
- Equity structure ensure: `INSERT INTO landscape.tbl_equity_structure` when missing.
- No schema changes; relies on existing tables.

## 3. CURRENT STATE OF WATERFALL ENGINE

**Cash Flow Integration:**
- Source: `generateCashFlow` from cashflow engine. Net cash is built from sections into `netCashFlows`, then mapped to `CashFlow[]` with periodId/date/amount.
- Distributions (positive) are processed; contributions (negative) are allowed but rarely present from generated net cash (currently mostly positive distributions). If no contribution flows, initial contributions are seeded from partner capital.

**Tier Processing:**
- Tiers loaded from DB and sorted by `tierNumber`.
- Tier 1: preferred return accrual then return of capital, pro rata by accrued pref/unreturned capital.
- Tier 2/3: split distributions by lp_split_pct/gp_split_pct. Tier transition for IRR tiers approximated via `determineAmountToHurdle` (binary search) using LP IRR.

**Split Calculations (CURRENT BLOCKER):**
- In `applySplitDistribution`, LP/GP split uses ownershipShare weights per partner group. If lp/gp split percentages are zero/null, amounts become zero. DB tiers may have null `lp_split_pct/gp_split_pct`; need to ensure tiers are populated correctly (Napkin writes them).
- Remaining cash after tier loop is forced into last tier split; if tiers are missing or split is zero, distributions end up zero.
- LP IRR hurdle check uses `calculateLpIrr` weighted by contributions; may not cross hurdle so tier 2 never triggers.
- Data available: `remaining` cash per flow, tier splits (lp_split_pct/gp_split_pct), partner states (ownershipShare, unreturnedCapital, accruedPref), IRR per partner.

**Partner Tracking:**
- Tracks `unreturnedCapital`, `accruedPref`, `cumulativeDistributions`, contributions/distributions arrays per partner. Pref accrues day-count basis between cash flow dates.
- Initial contributions seeded from partner capital unless actual negative flows present.

## 4. API ENDPOINTS

- GET `/api/projects/[projectId]/waterfall` — returns tiers + equity partners. Status: working.
- POST `/api/projects/[projectId]/waterfall/napkin` — saves LP/GP partners and three tiers. Status: working for napkin inputs.
- GET `/api/projects/[projectId]/waterfall/calculate` — runs cash flow + waterfall, returns partnerSummaries/tierSummaries/periodDistributions. Status: partial (returns data but splits may be zero due to engine/tier values).
- GET `/api/projects/[projectId]/cash-flow/summary` (existing) — used by form to fetch peak equity requirement.

## 5. UI COMPONENTS

- `/src/components/capitalization/NapkinWaterfallForm.tsx`
  - Renders GP contribution %, pref/promote/hurdle/residual inputs; auto-fetches total equity required; shows equity contributions table and 3-tier preview; Save posts to napkin API. Status: partial.
- `/src/components/capitalization/WaterfallResults.tsx`
  - Renders Run Waterfall button; shows partner summary cards, tier table, period distributions. Status: partial.
- `/src/components/capitalization/PartnerSummaryCards.tsx`
  - Cards for contributed/distributed/IRR/multiple. Status: complete.
- `/src/app/projects/[projectId]/napkin/waterfall/page.tsx`
  - Page composing Napkin form + results. Status: complete.

## 6. WHAT'S WORKING

- Napkin POST creates LP/GP equity rows and three tiers with correct promotes/residual splits from GP% input.
- Cash flow generation runs for a project and feeds waterfall calculate endpoint.
- UI fetches equity requirement from cash-flow summary and derives LP/GP dollars from GP% ownership.
- Results UI fetches and renders response (even when values are zero).

## 7. WHAT'S NOT WORKING

- Distribution splits often zero: `applySplitDistribution` uses tier lp/gp splits; if tiers from DB have zero/null splits or LP IRR hurdle never crossed, promote/residual tiers output zero. Need to verify tier data for project and ensure lp_split_pct/gp_split_pct set.
- Period distributions table shows no LP/GP amounts because distributions array from engine has zero amounts after pref/capital return path.
- Ownership-based weighting in `distributeByGroup` uses `ownershipShare`; may be mismatched with tier splits (should use tier percentages directly, possibly without ownership weighting inside group).
- Need validation of preferred return accrual and hurdle targeting; current binary search might not adjust state, so hurdle detection may be off.

## 8. NEXT STEPS (PRIORITY)
1. Verify tier data for target project: ensure lp_split_pct/gp_split_pct populated (Napkin tiers should be 90/10, then promote/residual splits).
2. Instrument `calculateWaterfall` to log per-tier allocations for a sample cash flow to see why remaining cash becomes zero.
3. Adjust `applySplitDistribution` to split strictly by tier percentages across LP/GP groups (not ownershipShare weighting) and ensure non-null splits; guard against zero totals.
4. Validate LP IRR hurdle logic; ensure promote tier activates when LP IRR crosses hurdle; consider simplifying to always apply tier split for positive cash if hurdle not reached.
5. Update period distributions builder to include partnerType in distribution records to avoid relying on later mapping.
6. Re-run with project 9 and confirm non-zero distributions in API and UI.

## 9. KEY CODE SNIPPETS

- Split distribution (engine):
```ts
function applySplitDistribution(states: PartnerState[], tier: WaterfallTier, available: number, date: Date, periodId: number, results: DistributionResult[]): number {
  if (available <= 0) return available;
  const lpPartners = states.filter((s) => s.partnerType === 'LP');
  const gpPartners = states.filter((s) => s.partnerType === 'GP');
  const lpSplit = (tier.lpSplitPct ?? 0) / 100;
  const gpSplit = (tier.gpSplitPct ?? 0) / 100;
  const lpAmount = available * lpSplit;
  const gpAmount = available * gpSplit;
  distributeByGroup(lpPartners, lpAmount, tier.tierNumber, date, periodId, results);
  distributeByGroup(gpPartners, gpAmount, tier.tierNumber, date, periodId, results);
  return 0;
}
```
- IRR helper: `/src/lib/financial-engine/waterfall/irr.ts` implements Newton-Raphson + bisection for irregular dates.
- Tier transition hurdle targeting: `determineAmountToHurdle` in engine uses bisection on amount to reach LP IRR hurdle.
- Preferred return accrual: `accruePreferredReturn` computes day-based accrual and adds to state.accruedPref.

## 10. QUESTIONS FOR CONTINUATION

- Should tier splits be applied strictly by tier percentages regardless of partner ownership weights? (Current distributeByGroup uses ownershipShare within LP/GP groups.)
- How should we seed contributions if cash flow engine never emits negative flows? Is using committed capital at period 0 acceptable?
- Confirm the correct source for total equity required (currently using `summary.peakEquity` from cash-flow summary). Is there a dedicated equity requirement metric?
- For LP IRR hurdle logic, should promote tier be time-bound or cumulative IRR check after each distribution?
- Are tier lp/gp split fields guaranteed non-null in DB, or should we default missing values from ownership?
