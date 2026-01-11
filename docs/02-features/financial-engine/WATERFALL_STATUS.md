# Waterfall Engine - Implementation Status

**Last Updated:** 2025-12-05
**Status:** Production Ready (Python Engine)
**Supersedes:** `WATERFALL_IMPLEMENTATION_HANDOFF.md` (TypeScript - Deprecated)

---

## Executive Summary

The waterfall distribution engine calculates LP/GP profit splits based on multi-tier promote structures commonly used in real estate joint ventures. The **Python implementation** is now the authoritative engine, with the TypeScript implementation deprecated.

### Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Python Engine Core | ✅ Working | Multi-tier distributions, IRR/EMx calculations |
| Database Tier Config | ✅ Working | Dynamic tier loading from `tbl_waterfall_tier` |
| Cash Flow Integration | ✅ Working | Pulls from TypeScript cash flow engine |
| Django Service Layer | ✅ Working | `calculate_project_waterfall()` endpoint |
| Next.js API Proxy | ✅ Working | Transforms Django response for UI |
| Napkin Input Form | ✅ Working | Redesigned with IRR/EM toggle, structured tables |
| Accrued Pref/Hurdle | ✅ Working | Cumulative tracking with paydown logic |
| GP Catch-up Logic | ⚠️ Partial | Implemented but hardcoded OFF |
| EMx Hurdle Gating | ⚠️ Partial | Formula exists, not wired into distribution |

### Recent Updates (Dec 5, 2025)

- **$800K Excel Variance Fixed** - IRR waterfall now matches Excel within $187 (0.00008%)
  - First period: contribution processed BEFORE accruals (matches Excel)
  - Subsequent periods: accruals processed before contributions (original behavior)
  - Fix isolated to period_id == 1 to avoid overcorrection
- **Hurdle Display by Mode** - Hurdle column now updates when switching IRR/EM/IRR+EM modes
  - API transforms tier definitions based on `hurdle_method` query param
  - Correct suffixes shown (% for IRR, x for EMx)
- **NapkinWaterfallForm Redesign** - Complete restructure with:
  - Equity Contributions section (GP input, LP calculated, dollar amounts)
  - Waterfall Type toggle (IRR / Equity Mult / IRR + EM)
  - IRR Waterfall table with Rate, Promote, LP/GP splits
  - Equity Multiples table with shared splits in hybrid mode
  - Grey background styling for input cells
- **Accrued Columns Fixed** - Period table now shows cumulative accrued pref (8%) and hurdle (15%)
- **Period Table Updates** - Removed IRR columns, added Residual columns, renamed Promote to Hurdle

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│  /projects/[id]/napkin/waterfall/page.tsx                          │
│  └── WaterfallResults.tsx → PartnerSummaryCards.tsx                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS API LAYER                                │
│  /api/projects/[projectId]/waterfall/calculate/route.ts            │
│  └── Proxies to Django, transforms response                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DJANGO SERVICE LAYER                             │
│  backend/apps/calculations/services.py                              │
│  └── calculate_project_waterfall()                                  │
│      ├── Loads tiers from tbl_waterfall_tier                       │
│      ├── Fetches cash flows from TS engine                          │
│      └── Runs Python WaterfallEngine                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PYTHON WATERFALL ENGINE                          │
│  services/financial_engine_py/financial_engine/waterfall/           │
│  └── WaterfallEngine.calculate()                                    │
│      ├── Process contributions (negative cash flows)                │
│      ├── Calculate accruals per tier                                │
│      ├── Distribute through tiers sequentially                      │
│      └── Calculate IRR/EMx per partner                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What's Working

### 1. Multi-Tier Distribution Engine

The Python engine correctly processes up to 5 tiers with configurable splits:

- **Tier 1 (Pref + Return of Capital):** Distributes to satisfy preferred return accrual and return contributed capital
- **Tiers 2-4 (Promote Tiers):** Distribute based on IRR hurdles and LP/GP splits
- **Tier 5 (Residual):** Catches all remaining cash at final split percentages

**Key File:** [engine.py](services/financial_engine_py/financial_engine/waterfall/engine.py)

```python
# From engine.py - Tier 1 distribution
tier1_result = calculate_tier1_distribution(Tier1Input(
    cash_available=remaining,
    lp_capital_account=self.lp_state.capital_accounts.tier1,
    gp_capital_account=self.gp_state.capital_accounts.tier1,
    lp_split_pct=lp_split,
    gp_split_pct=gp_split,
    gp_catch_up=self.settings.gp_catch_up,
    return_of_capital=self.settings.return_of_capital,
))
```

### 2. IRR Calculations (XIRR)

Full XIRR implementation using Newton-Raphson with bisection fallback:

**Key File:** [irr.py](services/financial_engine_py/financial_engine/waterfall/irr.py)

- Handles irregular period dates
- Per-partner IRR tracking
- Project-level IRR calculation

### 3. Equity Multiple (EMx) Calculations

**Key File:** [formulas.py](services/financial_engine_py/financial_engine/waterfall/formulas.py:380-399)

```python
def calculate_equity_multiple(
    total_distributions: Decimal,
    total_contributions: Decimal,
) -> Decimal:
    if total_contributions <= ZERO:
        return ZERO
    return round_financial(total_distributions / total_contributions, 4)
```

### 4. Database-Driven Tier Configuration

Tiers are loaded from `tbl_waterfall_tier` table, not hardcoded:

**Key File:** [services.py](backend/apps/calculations/services.py:607-640)

```sql
SELECT tier_number, tier_name,
       COALESCE(irr_threshold_pct, hurdle_rate) AS irr_hurdle,
       equity_multiple_threshold AS emx_hurdle,
       lp_split_pct, gp_split_pct
FROM landscape.tbl_waterfall_tier
WHERE project_id = %s AND (is_active IS NULL OR is_active = TRUE)
ORDER BY COALESCE(display_order, tier_number)
```

### 5. Cash Flow Integration

Cash flows are fetched from the TypeScript cash flow engine which has the authoritative budget allocations:

**Key File:** [services.py](backend/apps/calculations/services.py:80-198)

- Parses per-period costs from Development, Planning, Land Acquisition sections
- Parses per-period revenue from NET REVENUE section
- Returns `(period_id, date, net_cash_flow)` tuples

### 6. Capital Account Tracking

Each partner has capital accounts per tier that track:
- Beginning balance
- Accrued returns (compound interest)
- Contributions added
- Distributions paid out

**Key Type:** [types.py](services/financial_engine_py/financial_engine/waterfall/types.py:129-153)

```python
@dataclass
class TierCapitalAccounts:
    tier1: Decimal = Decimal('0')
    tier2: Decimal = Decimal('0')
    tier3: Decimal = Decimal('0')
    tier4: Decimal = Decimal('0')
    tier5: Decimal = Decimal('0')
```

---

## What's Partially Implemented

### 1. GP Catch-up

**Status:** Engine supports it, but hardcoded to OFF

The `calculate_tier1_distribution()` function fully implements GP catch-up logic:

**Key File:** [formulas.py](services/financial_engine_py/financial_engine/waterfall/formulas.py:201-252)

```python
if input.gp_catch_up:
    # GP catches up: gets MIN(remaining cash, what GP is owed)
    remaining_after_lp = input.cash_available - lp_dist
    gp_dist = max(min(remaining_after_lp, input.gp_capital_account), ZERO)
else:
    # Pro-rata: GP gets proportional share based on LP distribution
    if input.lp_split_pct > ZERO and lp_dist > ZERO:
        gp_dist = (lp_dist / input.lp_split_pct) * input.gp_split_pct
```

**Limitation:** In `calculate_project_waterfall()`, GP catch-up is hardcoded:

```python
waterfall_settings = WaterfallSettings(
    ...
    gp_catch_up=False,  # Hardcoded OFF
    ...
)
```

**To Fix:** Add `gp_catch_up` column to database (or waterfall settings table) and wire to UI.

### 2. EMx Hurdle Gating

**Status:** Formula exists, not used in distribution flow

The `is_hurdle_met()` function supports EMx hurdles:

**Key File:** [formulas.py](services/financial_engine_py/financial_engine/waterfall/formulas.py:406-438)

```python
def is_hurdle_met(settings, tier, current_irr, current_emx) -> bool:
    if settings.hurdle_method == HurdleMethod.IRR:
        return irr_threshold is not None and current_irr >= irr_threshold
    elif settings.hurdle_method == HurdleMethod.EMX:
        return emx_threshold is not None and current_emx >= emx_threshold
    elif settings.hurdle_method == HurdleMethod.IRR_EMX:
        return irr_met or emx_met  # Either threshold
```

**Limitation:** The distribution logic in `_distribute_cash()` doesn't call this function. Distributions flow through tiers based on capital account balances, not explicit hurdle checks.

**To Fix:** Add hurdle gating logic before tier distributions in engine.

### 3. UI Display

**Status:** Basic display working, needs polish

Components exist but show basic data:
- `WaterfallResults.tsx` - Run button and results display
- `PartnerSummaryCards.tsx` - LP/GP contribution/distribution cards

**Limitations:**
- No sensitivity analysis charts
- No tier-by-tier waterfall visualization
- Limited formatting/styling

---

## What's Missing

### 1. GP Catch-up UI Configuration

- No toggle in napkin form to enable/disable
- No database field to store preference
- Settings hardcoded in service layer

### 2. EMx Hurdle Mode in UI

- `HurdleMethod.EMX` and `HurdleMethod.IRR_EMX` defined but not selectable
- No UI for configuring EMx thresholds per tier
- Database has `equity_multiple_threshold` column but not populated

### 3. Sensitivity Analysis

- No tornado charts for IRR sensitivity
- No Monte Carlo simulation
- No scenario comparison

### 4. Excel Export

- `runtime.py` has placeholder but no implementation
- No formatted Excel output with waterfall schedule

### 5. Audit Trail / Trace Mode

- `?trace=true` query param exists but minimal logging
- No detailed calculation trace for validation

---

## Key Files Reference

### Python Engine

| File | Purpose |
|------|---------|
| [engine.py](services/financial_engine_py/financial_engine/waterfall/engine.py) | Main `WaterfallEngine` class |
| [formulas.py](services/financial_engine_py/financial_engine/waterfall/formulas.py) | Distribution calculation formulas |
| [types.py](services/financial_engine_py/financial_engine/waterfall/types.py) | Data classes and enums |
| [irr.py](services/financial_engine_py/financial_engine/waterfall/irr.py) | XIRR calculation |
| [runtime.py](services/financial_engine_py/financial_engine/waterfall/runtime.py) | Factory function (legacy) |
| [\_\_init\_\_.py](services/financial_engine_py/financial_engine/waterfall/__init__.py) | Public exports |

### Django Backend

| File | Purpose |
|------|---------|
| [services.py](backend/apps/calculations/services.py) | `CalculationService` with waterfall methods |
| [views.py](backend/apps/calculations/views.py) | API endpoint handlers |
| [serializers.py](backend/apps/calculations/serializers.py) | Request/response serialization |

### Next.js Frontend

| File | Purpose |
|------|---------|
| [route.ts](src/app/api/projects/[projectId]/waterfall/calculate/route.ts) | Proxy to Django, response transformation |
| [page.tsx](src/app/projects/[projectId]/napkin/waterfall/page.tsx) | Waterfall page component |
| [WaterfallResults.tsx](src/components/capitalization/WaterfallResults.tsx) | Results display component |
| [PartnerSummaryCards.tsx](src/components/capitalization/PartnerSummaryCards.tsx) | Partner cards component |
| [NapkinWaterfallForm.tsx](src/components/capitalization/NapkinWaterfallForm.tsx) | Input form component |

---

## Database Tables

### tbl_waterfall_tier

Stores tier configuration per project:

| Column | Type | Description |
|--------|------|-------------|
| tier_id | BIGINT | Primary key |
| project_id | BIGINT | FK to tbl_project |
| tier_number | INTEGER | 1-5 |
| tier_name | VARCHAR | Display name |
| irr_threshold_pct | DECIMAL | IRR hurdle (e.g., 8 for 8%) |
| hurdle_rate | DECIMAL | Legacy hurdle rate |
| equity_multiple_threshold | DECIMAL | EMx hurdle (e.g., 1.5) |
| lp_split_pct | DECIMAL | LP percentage (e.g., 90) |
| gp_split_pct | DECIMAL | GP percentage (e.g., 10) |
| display_order | INTEGER | Sort order |
| is_active | BOOLEAN | Soft delete flag |

### tbl_equity

Stores LP/GP partner configuration:

| Column | Type | Description |
|--------|------|-------------|
| equity_id | BIGINT | Primary key |
| project_id | BIGINT | FK to tbl_project |
| partner_type | VARCHAR | 'LP' or 'GP' |
| partner_name | VARCHAR | Display name |
| committed_capital | DECIMAL | Capital commitment |
| ownership_pct | DECIMAL | Ownership percentage |

---

## API Endpoints

### Calculate Waterfall

**Endpoint:** `GET /api/projects/[projectId]/waterfall/calculate`

**Response Structure:**

```typescript
interface WaterfallApiResponse {
  projectSummary: {
    totalContributed: number;
    totalDistributed: number;
    equityMultiple: number;
    projectIrr?: number;
    tierTotals: TierTotal[];
  };
  partnerSummaries: PartnerSummary[];
  tierSummaries: TierSummary[];
  periodDistributions: PeriodDistribution[];
  tierDefinitions: TierDefinition[];
}
```

### Get Waterfall Tiers

**Endpoint:** `GET /api/projects/[projectId]/waterfall`

Returns current tier configuration and equity partners.

### Save Napkin Waterfall

**Endpoint:** `POST /api/projects/[projectId]/waterfall/napkin`

Creates/updates LP/GP partners and tier configuration from napkin inputs.

---

## Current Results - Project 9

As of 2025-12-05, Project 9 (Peoria Lakes) produces validated results matching Excel:

### Database Tier Configuration

| Tier | Name | IRR Hurdle | EMx Hurdle | LP Split | GP Split |
|------|------|------------|------------|----------|----------|
| 1 | Preferred Return + Capital | 8% | 1.0x | 90% | 10% |
| 2 | Hurdle 1 | 15% | 1.5x | 72% | 28% |
| 3 | Residual | — | — | 45% | 55% |

### Cash Flow Summary

- **Total Costs:** $144.7M (contributions)
- **Total Revenue:** $299.8M (distributions)
- **Net Profit:** $155.1M

### Distribution Summary (IRR Mode - Validated vs Excel)

| Partner | Contributed | Distributed | Excel Distributed | Variance |
|---------|-------------|-------------|-------------------|----------|
| LP (90%) | $130.2M | $223,787,714 | $223,787,901 | -$187 |
| GP (10%) | $14.5M | $71,031,059 | $71,030,872 | +$187 |

**Variance:** 0.00008% - within acceptable tolerance

---

## Migration from TypeScript

The TypeScript waterfall implementation at `src/lib/financial-engine/waterfall/` is **deprecated** and should not be used for production calculations. Key differences:

| Aspect | TypeScript (Deprecated) | Python (Current) |
|--------|------------------------|------------------|
| Precision | JavaScript floats | Python Decimal |
| IRR | Custom Newton-Raphson | numpy-financial XIRR |
| Performance | ~50ms | ~10ms |
| Testing | Limited | Comprehensive pytest |
| Maintenance | Frozen | Active development |

The Next.js route at `/api/projects/[projectId]/waterfall/calculate` now proxies to Django, which calls the Python engine.

---

## Next Steps (Priority Order)

1. **Wire GP Catch-up to UI** - Add toggle in napkin form, store in database
2. **Implement EMx Hurdle Gating** - Call `is_hurdle_met()` before tier distributions
3. **Add Trace Mode** - Detailed logging for calculation validation
4. **Sensitivity Analysis** - Tornado charts for IRR drivers
5. **Excel Export** - Formatted waterfall schedule output

---

*Document maintained by Engineering Team*
*For questions, see #landscape-dev Slack channel*
