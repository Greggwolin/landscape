# Report 4: Equity Waterfall / Distribution Schedule

## Overview
- **Property Types:** Universal (Land Dev, Multifamily, Mixed Use)
- **Data Readiness:** PARTIAL
- **Primary Data Source(s):** Capitalization tab (Equity panel), Financial engine waterfall calculations
- **ARGUS Equivalent:** Waterfall / Pref Return + Promote / Distribution schedules
- **Peoria Lakes Equivalent:** r.Waterfall + r.Distribution_Schedule

---

## Column Layout

### Section 1: Capital Structure (Header Block)
| Item | Value | % of Total |
|------|-------|-----------|
| GP Contribution | $ | % |
| LP Contribution | $ | % |
| **Total Equity** | **$** | **100%** |

### Section 3: Distribution Schedule (By Period)
| Period | Year | Revenue | Costs | Operating Cash Flow | Cumulative CF | Preferred Return (LP) | Hurdle Distribution (LP/GP split) | Residual (LP/GP split) | LP Total Distribution | GP Total Distribution |
|--------|------|---------|-------|---------------------|---------------|-----------------------|-----------------------------------|------------------------|----------------------|----------------------|
| 1 | Yr1 | $ | $ | $ | $ | $ | $/$  | $/$  | $ | $ |
| 2 | Yr2 | $ | $ | $ | $ | $ | $/$  | $/$  | $ | $ |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

---

## Row Structure

**Periods:** Display annually (or semi-annually if deal includes interim distributions). Rows grouped by:
- **Development phase** (Years 1-N): Negative or minimal cash flow
- **Stabilized operation** (Years N+1-Hold): Positive distributions
- **Exit phase** (Sale/disposition): Lump-sum proceeds distribution

**Waterfall logic:**
1. **Tier 1 — Preferred Return:** LP receives fixed % (e.g., 5%) return on invested capital. GP receives 0% at this tier.
2. **Tier 2 — Hurdle/Promote:** Remaining cash after preferred return distributed per hurdle structure (e.g., 10% hurdle with 20% GP promote). LP % → GP % as hurdle met.
3. **Tier 3 — Residual:** Any remaining distributions after hurdles paid per residual split (e.g., LP 45% / GP 55%).

---

## Section Breakdown

### Section 1: Capital Structure Summary
Display GP and LP contributions:
- Absolute dollars
- Percentage of total
- Investment date / commitment period
- Current distribution status (distributions to date, remaining balance)

**Formatting:** Header block, portrait. Align $ right, % right. Bold total row.

### Section 2: Waterfall Definition
Display the waterfall structure in effect:
- **Waterfall Type:** IRR (most common) | Equity Multiple | IRR + EM hybrid
- **Preferred Return Rate:** (%) on LP capital
- **Hurdle Rate:** (%) threshold for promote trigger
- **Promote Percentage:** GP % when hurdle met (e.g., 20%)
- **Residual Split:** LP % / GP % of remaining
- **Pref Return Recapture:** Y/N (whether hurdle triggered before pref return exhausted)

**Formatting:** Two-column table or bulleted list. Bold tier names. Example:
```
Waterfall Structure: IRR

Preferred Return:    5.00% annually on LP capital
Hurdle Rate:         10.00% IRR threshold
GP Promote:          20% GP carry (when IRR ≥ 10%)
Residual Split:      LP 45% / GP 55%
Pref Recapture:      Yes (pref return exhausts before hurdle triggered)
```

### Section 3: Distribution Schedule (By Period)
Multi-year table showing:
- **Period** (1, 2, 3, ..., N)
- **Year** (Yr1, Yr2, ... YrN)
- **Revenue** (gross revenue collected)
- **Costs** (operating + capital costs)
- **Operating Cash Flow** (Revenue - Costs)
- **Cumulative CF** (running total)
- **Preferred Return to LP** ($ paid to LP tier 1)
- **Hurdle Distribution** (split between LP and GP by hurdle rate)
- **Residual Distribution** (split between LP and GP at residual %)
- **LP Total Distribution** (sum of all LP tiers for period)
- **GP Total Distribution** (sum of all GP tiers for period)

**Formatting:**
- Columns 3–5 (Revenue, Costs, Operating CF): Currency, right-aligned, black text
- Columns 6–10 (distributions): Currency, right-aligned, color-coded by tier (Pref = blue, Hurdle = orange, Residual = green)
- Page break after period 30 if 96+ periods
- Subtotals by phase (development, stabilized, exit)

### Section 4: Return Summary
Display aggregate IRR and Equity Multiple by partner:
| Metric | LP | GP | Combined |
|--------|----|----|----------|
| Total Cash Distributed | $ | $ | $ |
| Total Cash Invested | $ | $ | $ |
| Equity Multiple | X.XXx | X.XXx | X.XXx |
| IRR | X.XX% | X.XX% | X.XX% |
| Distribution Period | Year N | Year N | Year N |

**Formatting:** Bold row headers. Currency right-aligned. IRR/EM bold, green if > hurdle/target, red if below.

---

## Formatting Notes

- **Orientation:** Portrait
- **Currency:** $X,XXX,XXX (use comma thousands separator; show cents only if < $1k)
- **Percentages:** X.XX% (two decimal places)
- **Equity Multiples:** X.XXx (three decimal places)
- **IRR:** X.XX% (two decimal places)
- **Alignment:** Currency/numbers right, text left
- **Bold:** Row totals, tier headers, final return metrics
- **Color coding:** Preferred Return (blue), Hurdle/Promote (orange), Residual (green) — use light background or font color to distinguish tiers
- **Page breaks:** Insert after period 30 if schedule exceeds 2 pages

---

## Pending Inputs

- [ ] Waterfall run/calculate: User must click "Run Waterfall" in Capitalization panel to generate distribution schedule
- [ ] GP/LP contribution amounts: Configured in Capitalization panel (Peoria Meadows shows $149.5M total)
- [ ] Hurdle rate & promote %: Set in waterfall definition (Peoria shows 10% hurdle / 20% promote)
- [ ] Pref return rate: Set in waterfall definition (Peoria shows 5%)
- [ ] Cash flow inputs: Revenue, operating costs, capital costs, exit proceeds (CFY sheet feeds waterfall engine)
- [ ] Hold/exit year: When property exits/sells for disposition proceeds distribution
- [ ] Residual split: Configured post-hurdle (Peoria shows LP 45% / GP 55%)
- [ ] Period count: Number of years in projection (Peoria shows 96 periods)

---

## Sample Layout

```
PEORIA MEADOWS MASTER PLANNED COMMUNITY
Equity Waterfall & Distribution Schedule
As of [Report Date]

┌─────────────────────────────────────────┐
│         CAPITAL STRUCTURE               │
├─────────────────────────────────────────┤
│ GP Contribution      $14,950,000   10.0%│
│ LP Contribution     $134,550,000   90.0%│
├─────────────────────────────────────────┤
│ TOTAL EQUITY        $149,500,000  100.0%│
└─────────────────────────────────────────┘

WATERFALL STRUCTURE: IRR-BASED
• Preferred Return:     5.00% annually on LP capital
• Hurdle Rate:          10.00% IRR threshold
• GP Promote:           20.00% of distributions when hurdle met
• Residual Split:       LP 45% / GP 55%
• Preference Recapture: Yes

DISTRIBUTION SCHEDULE (Annual)
┌──────┬──────┬──────────┬──────────┬────────────┬────────────┬──────────────┬──────────────┬──────────┬──────────────┬──────────────┐
│ Prd  │ Year │ Revenue  │  Costs   │   Op CF    │   Cum CF   │ Pref Return  │Hurdle (LP/GP)│Residual │ LP Total Dis │ GP Total Dis │
│      │      │          │          │            │            │    (LP)      │ (LP / GP)    │(LP / GP)│     (LP)     │     (GP)     │
├──────┼──────┼──────────┼──────────┼────────────┼────────────┼──────────────┼──────────────┼──────────┼──────────────┼──────────────┤
│  1   │ Yr1  │      —   │$(35.0M)  │  $(35.0M)  │  $(35.0M)  │      —       │      —       │    —     │      —       │      —       │
│  2   │ Yr2  │      —   │$(32.0M)  │  $(32.0M)  │  $(67.0M)  │      —       │      —       │    —     │      —       │      —       │
│  3   │ Yr3  │      —   │$(28.0M)  │  $(28.0M)  │  $(95.0M)  │      —       │      —       │    —     │      —       │      —       │
│  4   │ Yr4  │  $12.0M  │$(8.0M)   │   $4.0M    │  $(91.0M)  │   $6.7M      │      —       │    —     │    $6.7M     │      —       │
│  5   │ Yr5  │  $15.5M  │$(7.5M)   │   $8.0M    │  $(83.0M)  │   $6.7M      │      —       │    —     │    $6.7M     │      —       │
│ ...  │ ...  │   ...    │   ...    │    ...     │    ...     │    ...       │     ...      │   ...    │     ...      │     ...      │
│ 15   │Yr15  │  $24.0M  │$(5.0M)   │  $19.0M    │   $45.0M   │   $6.7M      │$5.2M / $2.6M │$1.8M/2.7M│   $13.7M     │    $5.3M     │
│ ...  │ ...  │   ...    │   ...    │    ...     │    ...     │    ...       │     ...      │   ...    │     ...      │     ...      │
│ 96   │Yr30  │  $26.0M  │$(4.5M)   │  $21.5M    │$245.0M[*]  │   $6.7M      │$8.1M / $4.1M │$3.2M/4.8M│   $18.0M     │   $8.9M      │
└──────┴──────┴──────────┴──────────┴────────────┴────────────┴──────────────┴──────────────┴──────────┴──────────────┴──────────────┘
[*] Includes bulk sale proceeds Year 15 per DCF parameters

RETURN SUMMARY
┌───────────────────────┬─────────────┬─────────────┬─────────────┐
│ Metric                │      LP     │      GP     │  Combined   │
├───────────────────────┼─────────────┼─────────────┼─────────────┤
│ Total Distributed     │  $202.1M    │   $62.4M    │  $264.5M    │
│ Total Invested        │  $134.6M    │   $14.9M    │  $149.5M    │
├───────────────────────┼─────────────┼─────────────┼─────────────┤
│ Equity Multiple       │    1.50x    │    4.18x    │    1.77x    │
│ IRR                   │   11.2%     │   18.5%     │   12.1%     │
│ Distribution Period   │   30 years  │   30 years  │   30 years  │
└───────────────────────┴─────────────┴─────────────┴─────────────┘
```

---

*Report generated by Landscape. Waterfall calculations perform via numpy-financial IRR engine.*
*Last waterfall run: [timestamp]. Status: [READY / REQUIRES RECALC]*
