# PRIVATE EQUITY WATERFALL STRUCTURES: FOUNDATIONAL REFERENCE

This document defines, standardizes, and explains private equity waterfall structures as used in institutional and sub‑institutional real estate investments. It is written as a reference authority intended to support underwriting, modeling, legal drafting, and AI‑assisted analysis. The concepts and mechanics described herein reflect current market practice and resolve common ambiguities found in practitioner literature.

---

## 1. CORE DEFINITIONS

### 1.1 Preferred Return ("Pref")
A **Preferred Return** is a priority return on invested capital allocated to limited partners (LPs) before the general partner (GP) participates in profit distributions beyond its pro rata capital share. The pref is not a guarantee; it accrues only to the extent distributable cash is available.

Preferred returns are typically expressed as an annual percentage rate applied to unreturned contributed capital and accrue over time until paid. Unless otherwise specified, the pref is cumulative.

Key characteristics:
- Accrues on **unreturned capital** only
- Senior in the distribution order
- Does not imply compounding unless explicitly stated

### 1.2 Hurdle Rate
A **Hurdle Rate** is a performance threshold that must be achieved before the GP is entitled to receive carried interest. The hurdle may be defined using an internal rate of return (IRR), an equity multiple, or both.

Hurdles are structural gates, not guaranteed returns. Failure to achieve a hurdle reallocates economics toward LPs, not away from them.

### 1.3 Catch‑Up (GP Catch‑Up)
A **Catch‑Up** is a distribution phase following satisfaction of the LP preferred return in which a disproportionate share of cash flow is allocated to the GP until an agreed profit split is reached.

The purpose of the catch‑up is economic normalization: it allows the GP to receive its negotiated share of profits after LPs have been made whole on capital and pref.

Catch‑ups may be:
- **Full**: 100% of cash to GP until the target split is achieved
- **Partial**: A fixed percentage (e.g., 50%) to GP until normalization

### 1.4 Carried Interest (Carry / Promote)
**Carried Interest** (also called the **Promote**) is the GP’s share of profits above its pro rata capital contribution. Carry represents performance compensation and is subordinate to return of capital and preferred return.

Carry is earned economically when hurdles are met but may be paid earlier subject to clawback.

### 1.5 Lookback / Clawback
A **Clawback** is a contractual obligation requiring the GP to return excess carried interest if, upon final liquidation of the investment, aggregate distributions to the GP exceed the amount it would have received under the agreed waterfall.

Clawbacks are typically calculated on a whole‑fund basis and secured by guarantees, escrows, or holdbacks.

### 1.6 IRR Hurdle vs. Equity Multiple Hurdle
An **IRR Hurdle** requires achievement of a minimum internal rate of return, accounting for timing of cash flows.

An **Equity Multiple Hurdle** requires achievement of a minimum ratio of total distributions to total contributed capital, independent of timing.

IRR hurdles are time‑sensitive; equity multiples are not. Many modern structures employ both.

### 1.7 Compounding Conventions
Preferred returns may accrue using:
- **Simple interest** (most common)
- **Compound interest** (less common; must be explicit)

Accrual frequency (annual, quarterly, daily) materially affects outcomes and must be specified. In the absence of explicit language, annual simple accrual is assumed in market practice.

### 1.8 Return OF Capital vs. Return ON Capital
- **Return of Capital**: Repayment of invested principal
- **Return on Capital**: Economic profit, including preferred return and carry

Waterfalls always prioritize return of capital before return on capital.

---

## 2. STANDARD WATERFALL STRUCTURES

### 2.1 Simple Preferred Return (Pref → Split)

**Distribution Sequence:**
1. Return of LP capital
2. Accrued preferred return to LP
3. Remaining cash split pro rata (e.g., 80% LP / 20% GP)

**GP Promote Start:** After full satisfaction of LP capital and pref

**Typical Market Terms:**
- Core / core‑plus: 6–8% pref, 90/10 or 80/20 split

This structure is straightforward and common in lower‑risk strategies.

---

### 2.2 Preferred Return with Full Catch‑Up

**Distribution Sequence:**
1. Return of LP capital
2. Accrued preferred return to LP
3. 100% of cash to GP until GP receives agreed promote share
4. Ongoing split (e.g., 80/20)

**GP Promote Start:** Immediately upon pref satisfaction

**Typical Market Terms:**
- Value‑add: 8% pref, full catch‑up to 20% promote

Full catch‑ups accelerate GP economics and increase sensitivity to early exits.

---

### 2.3 Preferred Return with Partial Catch‑Up

**Distribution Sequence:**
1. Return of LP capital
2. Accrued preferred return to LP
3. Partial catch‑up (e.g., 50% GP / 50% LP)
4. Ongoing split

**GP Promote Start:** During partial catch‑up

Partial catch‑ups moderate GP acceleration while preserving incentive alignment.

---

### 2.4 Multi‑Tier / Stacked Hurdles

Multi‑tier waterfalls introduce escalating GP promotes tied to increasing performance thresholds.

**Example:**
- 8% IRR → 80/20
- 12% IRR → 70/30
- 15% IRR → 60/40

Higher tiers apply only to incremental profits above each hurdle.

---

### 2.5 European vs. American Waterfalls

- **European (Whole‑Fund):** Promote paid only after aggregate fund hurdles are met
- **American (Deal‑by‑Deal):** Promote paid on individual deals as realized

European structures reduce clawback risk; American structures accelerate GP liquidity.

---

## 3. CALCULATION MECHANICS

### 3.1 Order of Operations

1. Track capital contributions by date
2. Accrue preferred return on outstanding capital
3. Apply distributions sequentially per waterfall tiers
4. Recalculate IRR after each distribution event

### 3.2 Capital Treatment

- Return of capital reduces pref accrual base
- Distributions exceeding capital constitute profit

### 3.3 Compounding Methodology

Preferred return accrual formula (simple interest):

Pref Accrued = Unreturned Capital × Pref Rate × Time

Compound pref requires explicit compounding periods.

### 3.4 Time‑Weighted vs. Dollar‑Weighted Returns

IRR is a **dollar‑weighted** metric. Time‑weighted returns are not used in waterfalls.

### 3.5 Capital Calls and IRR

IRR calculations must reflect:
- Exact contribution dates
- Exact distribution dates
- Interim cash flows

Approximations materially distort hurdle testing.

---

## 4. ADVANCED STRUCTURES & VARIATIONS

### 4.1 Multiple LP Classes (Concrete Example)
Multiple LP classes are used to create contractual seniority and differentiated risk/return profiles inside a single vehicle. Seniority is enforced by distribution priority, not by labels.

**Example Assumptions (two classes, single interim distribution):**
- **Class A (Senior):** $8,000,000 contributed at Year 0; **10% pref**, cumulative, simple, **senior** to Class B
- **Class B (Junior):** $2,000,000 contributed at Year 0; **8% pref**, cumulative, simple
- **Distribution Event:** $15,000,000 available for distribution at end of **Year 3**
- **Residual Split (after capital + prefs):** pro rata by contributed capital (A 80% / B 20%)

**Step 1 — Return of Capital (by class):**
1. Distribute **$8,000,000** to Class A (return of A capital)
2. Distribute **$2,000,000** to Class B (return of B capital)

Remaining distributable cash: **$15,000,000 − $10,000,000 = $5,000,000**

**Step 2 — Pay Class A Preferred Return (10% senior):**
- Class A pref accrued (simple):
  - Pref_A = $8,000,000 × 10% × 3 = **$2,400,000**
- Pay **$2,400,000** to Class A

Remaining distributable cash: **$5,000,000 − $2,400,000 = $2,600,000**

**Step 3 — Pay Class B Preferred Return (8% junior):**
- Class B pref accrued (simple):
  - Pref_B = $2,000,000 × 8% × 3 = **$480,000**
- Pay **$480,000** to Class B

Remaining distributable cash: **$2,600,000 − $480,000 = $2,120,000**

**Step 4 — Residual (pro rata by contributed capital):**
- Class A share: $2,120,000 × 80% = **$1,696,000**
- Class B share: $2,120,000 × 20% = **$424,000**

**Distribution Table (Multiple Classes Example):**

| Step | Description | Total Distributed | Class A | Class B |
|---:|---|---:|---:|---:|
| 1 | Return of capital | 8,000,000 | 8,000,000 | 0 |
| 2 | Return of capital | 2,000,000 | 0 | 2,000,000 |
| 3 | Pref (10% A senior) | 2,400,000 | 2,400,000 | 0 |
| 4 | Pref (8% B junior) | 480,000 | 0 | 480,000 |
| 5 | Residual pro rata (80/20) | 2,120,000 | 1,696,000 | 424,000 |
|  | **Totals** | **15,000,000** | **12,096,000** | **2,904,000** |

**Key modeling implication:** when multiple classes exist, a single “pref accrual” line is wrong. Pref must be tracked separately by class, with class-specific accrual bases and priority.

---

### 4.2 GP Co-Invest Requirements
GP co-invest is GP capital invested alongside LP capital. Unless explicitly subordinated, GP co-invest participates pari passu with LP capital for return of capital and preferred return. Carry is not paid on GP co-invest; carry is the GP’s incremental profit share above its pro rata capital economics.

---

### 4.3 Management Fee Offsets
Management fees may be structured to reduce (i) distributable cash before the waterfall or (ii) the GP’s carried interest entitlement. Fee offsets must specify the target offset bucket (management fee vs. promote), the timing (current vs. true-up), and whether offsets survive into final liquidation.

---

### 4.4 Crystallization Events
A crystallization event is a contractual measurement date at which promote is calculated and potentially distributed (e.g., upon refinance). Crystallization accelerates GP liquidity and increases reliance on clawback/holdback protections because later outcomes can reverse prior promote entitlement.

---

### 4.5 Interim Distributions vs. Final Reconciliation
Interim distributions are applied under the waterfall at the time they occur, but the economic correctness of early promote payments is not known until the investment is fully realized. Final reconciliation aligns paid carry with earned carry, typically using a clawback or a final holdback.

---

## 5. CLAWBACK & TRUE‑UP PROVISIONS

### 5.1 Applicability

Clawbacks apply when early promote payments exceed final entitlement.

### 5.2 Calculation

Clawback = GP Distributions − GP Entitlement at Final Liquidation

### 5.3 Security

Common mechanisms:
- Personal GP guarantees
- Escrowed promote reserves
- Final distribution holdbacks

---

## 6. COMMON ERRORS & MISCONCEPTIONS

### 6.1 Treating the Preferred Return as Guaranteed
This mistake manifests when a model “forces” pref payments regardless of available cash, effectively inserting phantom distributions. The financial impact is overstated LP distributions, overstated LP IRR, and understated financing needs because the model assumes cash exists that does not.

### 6.2 Confusing IRR Hurdles with Cash-on-Cash Returns
This error appears when a model uses annual cash yield (or average annual return) to test an IRR hurdle. The financial impact is mis-triggered promotes: front-loaded cash flow deals will incorrectly show promote eligibility early, while back-loaded deals will be penalized despite equal or higher true IRR.

### 6.3 Misapplying Catch-Up Mechanics
This commonly shows up as a catch-up applied to the wrong profit pool (e.g., including return of capital), or as a catch-up that continues after the intended normalization point. The impact is GP overpayment (often material), distorted tier breakpoints, and elevated clawback exposure.

### 6.4 Compounding Errors (Implicit vs. Explicit)
Models often compound preferred returns or hurdle balances monthly/daily while the agreement implies annual simple accrual—or the reverse. The impact is systematic bias: more frequent compounding increases the hurdle balance and shifts economics toward LPs; less compounding shifts economics toward the GP.

### 6.5 Return OF Capital Timing Errors
This occurs when a model accrues pref on contributed capital that has already been returned, or when it returns capital “pro rata” while still accruing pref on the full original contribution. The impact is double-counting economics: LPs appear to earn pref on capital they no longer have at risk, which can shift promote eligibility and materially inflate LP distributions.

### 6.6 Using Period-Average Balances for IRR/Hurdle Testing
Some models approximate hurdle progress using average outstanding capital within a year (or month) rather than using exact dates and event-level balances. The impact is breakpoint drift: tiers trigger too early or too late, with errors that compound over longer holds and with frequent capital calls/distributions.

---

## 7. WORKED EXAMPLES

### 7.1 Example 1: Simple 8% Pref, 80/20 Split

**Inputs:**
- LP Capital: $10,000,000
- Hold: 3 years
- Exit Proceeds: $14,000,000

**Distributions:**
1. Return of capital: $10,000,000
2. Pref (8% × 3 yrs): $2,400,000
3. Remaining: $1,600,000 split 80/20
   - LP: $1,280,000
   - GP: $320,000

---

### 7.2 Example 2: $10M LP Capital, 4-Year Hold, $16M Exit — 8% Pref, 50% Catch-Up, then 70/30

**Structure (deal-level, single LP, GP contributes $0):**
1. Return of LP capital
2. Pay LP preferred return: 8% simple, annual
3. Catch-up phase: 50% to GP / 50% to LP **until GP is normalized to 30% of total profit** (if possible)
4. Remaining proceeds: split 70% LP / 30% GP

**Cash Flow Inputs:**
- LP contribution at Year 0: **($10,000,000)**
- Exit distribution at Year 4: **$16,000,000**

**Step A — Compute total profit and LP pref:**
- Total profit (before promote) = Exit − Capital = $16,000,000 − $10,000,000 = **$6,000,000**
- Pref accrual (simple):
  - Pref = $10,000,000 × 8% × 4 = **$3,200,000**

**Step B — Apply waterfall sequentially:**

**Tier 1: Return of capital (LP)**
- Pay LP: **$10,000,000**
- Remaining proceeds: $16,000,000 − $10,000,000 = **$6,000,000**

**Tier 2: Preferred return (LP)**
- Pay LP pref: **$3,200,000**
- Remaining proceeds: $6,000,000 − $3,200,000 = **$2,800,000**

**Tier 3: 50% catch-up (attempt to normalize GP to 30% of total profit)**
- Normalization target (30% of total profit):
  - Target GP profit = 30% × $6,000,000 = **$1,800,000**
- During catch-up, GP receives 50% of distributions.
  - Cash required to deliver $1,800,000 to GP in a 50% catch-up:
    - Required catch-up pool = $1,800,000 / 50% = **$3,600,000**
- Available after pref: **$2,800,000** (insufficient to complete catch-up)

Therefore, **the catch-up consumes all remaining proceeds and GP does not fully normalize to 30%**.

- Catch-up distribution of remaining $2,800,000 at 50/50:
  - LP receives: $2,800,000 × 50% = **$1,400,000**
  - GP receives: $2,800,000 × 50% = **$1,400,000**
- Remaining proceeds after catch-up: **$0**
- 70/30 phase: **not reached**

**Distribution Table (Example 2):**

| Tier | Description | Total Distributed | LP | GP |
|---:|---|---:|---:|---:|
| 1 | Return of capital | 10,000,000 | 10,000,000 | 0 |
| 2 | 8% pref (simple, 4 yrs) | 3,200,000 | 3,200,000 | 0 |
| 3 | 50% catch-up (incomplete) | 2,800,000 | 1,400,000 | 1,400,000 |
|  | **Totals** | **16,000,000** | **14,600,000** | **1,400,000** |

**Outcome Diagnostics:**
- LP total profit = $14.6M − $10.0M = **$4.6M**
- GP total profit = **$1.4M**
- GP share of total profit = $1.4M / $6.0M = **23.33%** (below 30% target)

**Modeling takeaway:** partial catch-ups only “work” (reach the intended normalization point) if the deal generates enough profit after pref to fund the catch-up pool.

---

### 7.3 Example 3: $10M LP Capital, Distributions Over 5 Years Totaling $20M — Tiered IRR Waterfall (8% / 12% / 15%)

This example demonstrates tiered IRR hurdles using an **IRR hurdle balance** approach (i.e., the amount required at each distribution date to make the investor whole at the hurdle rate, given actual timing of cash flows). Promote is applied only to incremental cash above each hurdle.

**Distribution Schedule (Investor-level, before promote):**
- Year 0: LP contributes **($10,000,000)**
- Year 2: Distribution **$3,000,000**
- Year 3: Distribution **$3,000,000**
- Year 5: Distribution **$14,000,000**
- Total distributions: **$20,000,000**

**Tier Splits (incremental):**
- **0–8% IRR:** 100% to LP
- **8–12% IRR:** 80% LP / 20% GP
- **12–15% IRR:** 70% LP / 30% GP
- **>15% IRR:** 60% LP / 40% GP

#### 7.3.1 Hurdle Breakpoint Math (IRR at each breakpoint)
At Year 5, the Year 5 distribution is sliced across tiers so that the LP’s achieved IRR equals the tier thresholds at the exact breakpoint.

**Step 1 — Apply Year 2 and Year 3 distributions (all to LP because hurdles not yet met):**
- Year 2: LP = $3,000,000
- Year 3: LP = $3,000,000

**Step 2 — Slice the Year 5 distribution ($14,000,000) across tiers:**

Let the Year 5 distribution be allocated in segments A, B, C, D corresponding to tiers 0–8%, 8–12%, 12–15%, and >15%.

Computed segment allocations (dollars):
- **Segment A (0–8%):** Total $7,414,944.768 → LP $7,414,944.768; GP $0
- **Segment B (8–12%):** Total $2,788,110.080 → LP $2,230,488.064; GP $557,622.016
- **Segment C (12–15%):** Total $2,768,591.490 → LP $1,938,014.043; GP $830,577.447
- **Segment D (>15%):** Total $1,028,353.662 → LP $617,012.197; GP $411,341.465

Check: A + B + C + D = $14,000,000 (rounding tolerance)

#### 7.3.2 LP IRR at Each Breakpoint
The LP’s IRR is calculated using the cash flows actually allocated to the LP by the time each breakpoint is reached.

LP cash flows at breakpoints:
- Contribution: (10,000,000) at Year 0
- Distributions: 3,000,000 at Year 2; 3,000,000 at Year 3; plus partial Year 5 amounts as shown

**Breakpoint 1 — After Segment A (0–8% satisfied):**
- LP Year 5 amount included: $7,414,944.768
- LP IRR at breakpoint: **8.00%**

**Breakpoint 2 — After Segment B (8–12% satisfied):**
- Additional LP Year 5 amount included: $2,230,488.064
- LP IRR at breakpoint: **12.00%**

**Breakpoint 3 — After Segment C (12–15% satisfied):**
- Additional LP Year 5 amount included: $1,938,014.043
- LP IRR at breakpoint: **15.00%**

**Final — After Segment D (>15% split):**
- Additional LP Year 5 amount included: $617,012.197
- LP IRR final (after promote): **15.88%** (approximately)

**Interpretation:** the underlying deal’s gross cash timing can support an ~18% project IRR before carry, but the tiered promote structure reallocates incremental profits to the GP, reducing the LP’s net IRR.

#### 7.3.3 Distribution Table (Example 3)

| Date | Total Cash Available | Tier Segment | Segment Total | LP Share | LP Amount | GP Share | GP Amount |
|---:|---:|---|---:|---:|---:|---:|---:|
| Yr 2 | 3,000,000 | 0–8% | 3,000,000 | 100% | 3,000,000 | 0% | 0 |
| Yr 3 | 3,000,000 | 0–8% | 3,000,000 | 100% | 3,000,000 | 0% | 0 |
| Yr 5 | 14,000,000 | 0–8% | 7,414,944.768 | 100% | 7,414,944.768 | 0% | 0 |
| Yr 5 | 14,000,000 | 8–12% | 2,788,110.080 | 80% | 2,230,488.064 | 20% | 557,622.016 |
| Yr 5 | 14,000,000 | 12–15% | 2,768,591.490 | 70% | 1,938,014.043 | 30% | 830,577.447 |
| Yr 5 | 14,000,000 | >15% | 1,028,353.662 | 60% | 617,012.197 | 40% | 411,341.465 |
|  |  | **Totals** | **20,000,000** |  | **18,200,459.072** |  | **1,799,540.928** |

**Modeling takeaway:** tiered IRR promotes require event-level slicing of each distribution across tiers using hurdle balances (or an equivalent consistent method). “One-pass” percentage splits applied to total profit are wrong when multiple hurdles exist.

---

## SOURCES

- Real Estate Finance Journal – Promote and Waterfall Series (SAC Capital)
- SAC Promote Basics
- SAC Promote Structures I–VI
- Institutional Private Equity Fund Documentation (market synthesis)

