# Excel Model Audit Skill — Gap Analysis
**Date:** 2026-04-11  
**Source:** PE Waterfall Structures Foundational Reference vs. SKILL-v2.md  

---

## What the Skill Handles Today

The Python replication engine is hardcoded to one specific waterfall template:

- 3-tier IRR-hurdle structure (8% pref → 12% hurdle → 12%+ residual)
- Monthly compounding at `(1+annual_rate)^(1/12)-1`
- BOP/EOP balance tracking with MIN-based distribution caps
- Fixed sponsor/investor split (5/95)
- Period-by-period column iteration across 84 months
- XIRR via scipy brentq
- Equity multiple as `net_cf / -investment + 1`

This engine is validated and accurate for the Brownstone/ORS template. It is **not generalizable** to any other structure without manual rewrite.

---

## Gap 1: Catch-Up Provisions (Not Supported)

**Reference doc:** §1.3, §2.2, §2.3, Example 7.2

The PE reference describes full and partial catch-up mechanics as a standard waterfall component. The current engine has no concept of a catch-up phase.

**What breaks:** Any model with a GP catch-up tier (common in value-add deals — 8% pref, full catch-up to 20% promote, then 80/20 split). The engine would either skip the catch-up entirely or misallocate it as a normal split tier.

**Complexity:** Catch-ups require tracking a normalization target (GP's share of total profit) and distributing disproportionately until that target is reached — or until cash runs out (incomplete catch-up per Example 7.2). This is structurally different from the MIN-based tier logic the engine currently uses.

**Required change:** Add a catch-up tier type that computes the normalization target, allocates GP/LP shares accordingly, and handles the incomplete case.

---

## Gap 2: Simple Interest Pref Accrual (Not Supported)

**Reference doc:** §1.7, §3.3

The reference doc states simple interest is the most common pref convention in market practice. The current engine uses monthly compounding exclusively (`(1+annual_rate)^(1/12)-1`).

**What breaks:** Any model using simple pref accrual will show a delta because compounded pref grows faster than simple. Over a 3-year hold at 8%, the difference on $1M is roughly $400 — small but fails the "to the penny" test.

**Nuance:** The Brownstone/ORS models do use monthly compounding (confirmed by formula inspection), so the engine is correct for those. But generalizing requires reading the model's formula to detect whether it compounds or uses simple accrual.

**Required change:** The engine must detect the compounding convention from the Excel formulas and switch between simple and compound accrual accordingly.

---

## Gap 3: Equity Multiple Hurdles (Not Supported)

**Reference doc:** §1.6

Some waterfalls use equity multiple hurdles (e.g., 1.5x EM) instead of or in addition to IRR hurdles. The current engine only tests IRR hurdles.

**What breaks:** Any model where promote tiers trigger on EM thresholds rather than IRR. The engine would apply its IRR-based tier slicing and produce wrong allocations.

**Required change:** Add EM-based hurdle testing alongside IRR. This is simpler than IRR (no solver needed — just cumulative distributions / total investment) but requires detecting which hurdle type each tier uses.

---

## Gap 4: Multiple LP Classes (Not Supported)

**Reference doc:** §4.1, with worked example

The reference describes multi-class structures where different LP classes have different pref rates and priority levels (senior/junior). The current engine assumes a single investor class with a single pref rate.

**What breaks:** Any JV or fund model with Class A/Class B investors, or structures with preferred equity as a separate tranche. Each class needs independent pref tracking, priority-based distribution, and separate return calculations.

**Required change:** This is a significant architectural change. The engine needs per-class capital tracking, priority-ordered distribution logic, and class-specific output comparison. Likely the highest-effort enhancement.

---

## Gap 5: Return-of-Capital Priority (Not Explicit)

**Reference doc:** §1.8, §2.1

The reference is emphatic: waterfalls always prioritize return of capital before return on capital. The current engine handles this implicitly through BOP balance tracking, but it's hardwired to the Brownstone formula structure where capital return and pref are handled within the same tier mechanics.

**What breaks:** Models that explicitly separate return-of-capital as Tier 0 (before any pref accrual begins) would confuse the engine's tier-matching logic.

**Required change:** Make return-of-capital an explicit, configurable first tier rather than implicit in the balance tracking.

---

## Gap 6: European vs. American Waterfall (Not Addressed)

**Reference doc:** §2.5

European (whole-fund) waterfalls calculate promote only after aggregate fund-level hurdles are met across all deals. American (deal-by-deal) waterfalls calculate promote per deal.

**What breaks:** The current engine operates at deal level, which is correct for American/deal-level models (like Brownstone/ORS). A whole-fund model would require aggregating cash flows across multiple deals before running the waterfall — fundamentally different input structure.

**Impact assessment:** LOW for near-term. Most deal-level Excel models the skill will encounter are American-style. Fund-level models are typically in separate fund admin systems, not single Excel files. Worth flagging but not priority.

---

## Gap 7: Clawback / True-Up (Not Addressed)

**Reference doc:** §5.0

Clawback provisions require post-hoc reconciliation of interim promote payments against final entitlement. The current engine doesn't model this.

**Impact assessment:** MEDIUM. Clawbacks appear in fund-level models and are typically a final-liquidation calculation. For single-deal models, the waterfall itself handles the economics correctly without clawback logic. But if a model includes a clawback calculation sheet, the engine should be able to replicate it.

---

## Gap 8: Crystallization Events (Not Addressed)

**Reference doc:** §4.4

Crystallization events (promote calculated at refinance, partial sale, etc.) create mid-hold promote distribution triggers. The current engine runs the waterfall from start to exit as a single continuous calculation.

**What breaks:** Models where the waterfall "crystallizes" at a refinance event, distributing promote mid-hold, then resets or continues with a new capital base. The Brownstone/ORS models have a bridge-to-refi structure but the refi doesn't crystallize the promote.

**Required change:** Support waterfall segmentation at crystallization points, with capital base reset logic.

---

## Gap 9: GP Co-Invest Pari Passu Treatment (Not Addressed)

**Reference doc:** §4.2

GP co-invest participates alongside LP capital for return of capital and pref, but carry is not paid on it. The current engine treats sponsor equity as a fixed percentage split, not as a co-investing capital partner.

**What breaks:** Models where GP co-invest is tracked separately from promote economics. The split ratios in the current engine conflate co-invest return and promote.

**Required change:** Separate GP co-invest tracking from promote calculation.

---

## Terminology Differences

The skill uses "sponsor" and "investor" consistently. The reference doc uses "GP" and "LP" as the standard institutional terminology, with "promote" and "carried interest" as synonyms. The skill should normalize to GP/LP in its internal logic and map to whatever labels the Excel model uses (sponsor, investor, member, partner, etc.) during the read phase.

---

## Priority Ranking for Enhancement #1

Based on likelihood of encountering each structure in CRE deal models:

| Priority | Gap | Rationale |
|:--------:|:----|:----------|
| 1 | Catch-up provisions | Standard in value-add deals; very common |
| 2 | Simple vs. compound pref | Default market convention is simple; engine assumes compound |
| 3 | Equity multiple hurdles | Common alongside or instead of IRR hurdles |
| 4 | Return-of-capital as explicit tier | Structural correctness for non-Brownstone templates |
| 5 | GP co-invest separation | Common in JV structures |
| 6 | Crystallization events | Present in refi-heavy strategies |
| 7 | Clawback/true-up | Primarily fund-level |
| 8 | Multiple LP classes | Complex; less common in single-deal Excel models |
| 9 | European waterfall | Fund-level; rare in deal Excel models |

---

## Recommended Architecture for Generalization

Rather than adding case-by-case logic for each gap, the engine should be restructured around a **waterfall definition object** that gets populated by reading the Excel model's formulas:

1. **Read phase** — Parse the calculation sheet formulas to identify tier count, hurdle types (IRR/EM/pref), compounding conventions, split ratios, catch-up presence, and class structure
2. **Build phase** — Construct a waterfall definition: ordered list of tiers, each with type (return-of-capital / pref-accrual / catch-up / hurdle-split / residual-split), parameters (rate, compounding, split ratios, hurdle type), and party assignments
3. **Execute phase** — Run the period-by-period engine against the waterfall definition generically, rather than hardcoding tier logic
4. **Compare phase** — Unchanged; cell-by-cell comparison against Excel outputs

This architecture handles all 9 gaps through configuration rather than code branches.

---

## Test Model Inventory Question

The `skills/excel-models/` directory contains 20 files but the Brownstone and ORS models (the only two validated) are not among them. Before proceeding with engine generalization:

1. Where are the Brownstone and ORS files? They need to remain accessible for regression testing.
2. Which of the 20 models in `excel-models/` contain waterfall/promote structures? Several look like candidates (CP PROFORMA, cbaymod, Orion_Multifam, Clarendon_CBH) but need inspection to confirm.
3. Do any of those models use catch-ups, EM hurdles, or multi-class structures? That would provide real test cases for the generalized engine.
