---
name: excel-model-audit
description: "Use this skill whenever an Excel file (.xlsx, .xlsm) is uploaded, referenced, or added to a project for the first time. Auto-triggers on any new spreadsheet ingestion. Also triggers when the user says 'audit this model', 'check this spreadsheet', 'validate the Excel', 'is this model correct', 'review the formulas', or any request to verify Excel model integrity. Performs structural scanning, formula integrity checks, comprehensive assumption extraction with cell references, waterfall classification, and Sources & Uses verification. Produces an HTML audit report with trust score. Use this skill even if the user just wants to 'look at' or 'pull numbers from' an Excel file — the audit should run first before any analysis begins."
---

# Excel Model Audit Skill — v3

## Purpose

Read, classify, extract, and structurally validate Excel financial models. This skill is the **extraction and classification layer** — it does NOT compute cash flows, waterfalls, or returns. Computation belongs in the Landscape platform's validated financial engine.

The skill answers:

1. **What does this model contain?** (sheets, structure, property type, deal type)
2. **What are the assumptions?** (every financial input, mapped and tagged with cell references)
3. **What kind of waterfall does it use?** (classified, not computed)
4. **Is the model structurally sound?** (formula consistency, hardcoded overrides, error propagation, S&U balance)
5. **How trustworthy is the extraction?** (trust score based on coverage and structural findings)

---

## When to Use

- **Auto-trigger:** Any time an .xlsx or .xlsm file is uploaded or referenced for the first time
- **Manual trigger:** User asks to audit, validate, check, or verify an Excel model
- **Re-trigger:** User says "re-audit" or "recheck" after model changes

Do NOT use this skill for:
- CSV or flat data files (no formula structure to audit)
- Excel files used purely as data exports (no calculations)
- Files the user explicitly says to skip auditing ("just read the data")

---

## Dependencies

```
openpyxl>=3.1.0    # Workbook structure, formula text, cell inspection
```

Install check: Before first run, verify openpyxl is available. If missing, install via pip.

Note: scipy is NOT required. This skill does not compute IRR or any financial metric.

---

## Audit Pipeline

Six phases, run sequentially.

### Phase 1: Structural Scan

Map the workbook's physical structure before reading any values.

**Step 1 — Sheet inventory:**
- List every sheet (visible, hidden, very hidden)
- Classify each sheet's role: Assumptions, Cash Flow, Waterfall, Loan, Rent Roll, Budget/CapEx, Sale/Disposition, Summary/Dashboard, Presentation/Charts, Other
- Classification is heuristic: scan first 20 rows and column headers for keywords
- Report: sheet name, visibility, classification, row/column dimensions

**Sheet name prefix stripping (REQUIRED before keyword matching):**
Many CRE models use single-letter prefixes to denote content type. Before matching sheet names against classification keywords, strip these known prefixes:
- `i.` or `i` (before uppercase) = inputs (e.g., "iProject" → "Project", "i.General" → "General")
- `m.` or `m` (before uppercase) = model/calculation (e.g., "mWaterfall" → "Waterfall", "mPrtnership" → "Prtnership")
- `r.` or `r` (before uppercase) = reports (e.g., "r.Sales" → "Sales", "rSummary" → "Summary")

Stripping logic: if sheet name starts with `i.`, `m.`, or `r.` (dot-separated), remove the prefix and dot. If it starts with a single lowercase `i`, `m`, or `r` immediately followed by an uppercase letter, remove the prefix letter. Then match the stripped name against classification keywords.

This convention is standard across Landscape-native models and common in CRE modeling practice.

**Extended waterfall keywords (for sheet name classification):**
In addition to "waterfall", "promote", "distribution", "returns split", "jv split", "equity split", also match: "partner", "partnership", "prtnership" (common misspelling), "allocation", "splits".

**Step 2 — External links and named ranges:**
- Detect external workbook references in formulas (`[filename]Sheet!Cell` patterns)
- List named ranges and their targets
- Flag external links as a structural finding (values may be stale)

**Step 3 — VBA detection:**
- Check for `.xlsm` extension or VBA project presence
- If VBA exists: list module names, flag which sheets contain event macros
- State clearly: "This model contains VBA macros. Macro-dependent calculations cannot be verified by this audit. Values read from macro-dependent cells reflect the last cached state."

**Step 4 — Hidden content:**
- Detect hidden rows, hidden columns, hidden sheets
- Flag any hidden content that contains formulas feeding visible output cells
- Report: count of hidden rows/columns per sheet, any hidden sheets

---

### Phase 2: Formula Integrity

Scan calculation sheets for structural formula issues. This is NOT about whether the math is right — it's about whether the formula structure is self-consistent.

**Scope:** Only sheets classified as Cash Flow, Waterfall, Loan, Sale/Disposition, or Summary. Skip presentation/chart sheets.

**Check 2a — Hardcoded constants in formula ranges:**
- For each contiguous row or column of formulas, identify the dominant pattern (most common R1C1 structure)
- Flag any cell that contains a literal constant where the pattern expects a formula
- Report: sheet, cell, constant value, expected formula pattern
- Severity: Only flag if the cell is in a range that feeds output cells. A hardcoded label is not a finding.

**Check 2b — Error cells and propagation:**
- Find all #REF!, #VALUE!, #DIV/0!, #NAME?, #N/A cells
- For each, trace whether any output/summary cell depends on it
- If errors are contained: report as single line ("X errors in [sheet], none propagate to outputs")
- If errors propagate to outputs: flag as critical finding with the specific output cells affected

**Check 2c — Circular references:**
- Detect circular reference chains
- Report which cells are involved and whether iteration is enabled
- Flag as critical if any circular chain feeds output cells

**Check 2d — Structural consistency of repeating ranges:**
- In monthly/periodic arrays (common in cash flow and waterfall sheets), verify that formulas are consistent across all periods
- Flag any period column that breaks the pattern (different formula structure than its neighbors)

---

### Phase 3: Assumption Extraction

The core extraction layer. For each assumption category, read values from the model with exact cell references. Every value reported must include `Sheet!Cell`.

**3a — Property & Deal Info:**
- Property name, address, city, state
- Unit count, total SF (NRA/GLA), year built, renovation year
- Property type (multifamily, retail, office, industrial, land, mixed-use, hotel)
- Acquisition date, purchase price, closing costs
- Hold period (months), projected sale month
- Exit assumptions (cap rate, sale price, disposition costs)

**3b — Income Assumptions:**
- Rent roll / unit mix table: unit types, count per type, SF per unit, monthly rent per unit
- Gross potential rent (GPR) or gross potential income (GPI)
- Vacancy rate (economic vacancy, physical vacancy if separate)
- Concessions, loss-to-lease if present
- Other income line items (parking, laundry, pet fees, utility reimbursements, etc.)
- Rent growth rate(s) — single rate or per-unit-type
- Other income growth rate

**3c — Operating Expenses:**
- Line-by-line OpEx with amounts: management fee, insurance, property taxes, R&M, utilities, payroll, marketing, administrative, etc.
- For each line: identify whether the model expresses it as a dollar amount, per-unit, or percentage of revenue
- Escalation rate per category (or single blended rate)
- Total OpEx, OpEx per unit
- NOI (as stated by the model — read, not computed)

**3d — Capital Expenditure:**
- Renovation/rehab budget (total and per-unit if available)
- Line-item breakdown if present (kitchens, baths, flooring, exteriors, common areas, etc.)
- CapEx reserves / replacement reserves (annual or per-unit)
- Renovation timeline: start month, duration, phasing if applicable
- Funding source identification (equity-funded vs. debt-financed)

**3e — Debt Structure:**
For each loan identified in the model:
- Loan type: acquisition/bridge, construction, permanent/takeout, mezzanine, seller financing
- Amount, interest rate, term (months), amortization period
- Interest-only period if applicable
- Refinance trigger month if applicable
- Origination fees (points), exit fees, prepayment penalties
- Debt service reserve requirements

**3f — Capital Structure:**
- Total equity required
- Equity split: sponsor %, LP/investor %
- GP co-invest amount and treatment (pari passu or subordinated)
- Multiple investor classes if present (Class A, Class B, preferred equity)
- Capital call timing if phased contributions

**3g — Disposition / Exit:**
- Exit cap rate
- Terminal NOI (which year's NOI is capitalized)
- Gross sale price
- Disposition costs (broker commission rate, closing costs)
- Net sale proceeds

**3h — Model-Stated Returns (READ, not computed):**
Read these values directly from the model's output cells. Do NOT compute them.
- Deal-level: IRR, equity multiple
- Investor-level: IRR, equity multiple
- Sponsor-level: promote (total dollars), IRR if stated
- Cash-on-cash return by year if available
- Any other return metrics the model states (DSCR, debt yield, etc.)
- Cell references for every value — these are the comparison targets for downstream reconciliation

**Extraction rules:**
- Every value MUST include the cell reference (Sheet!Cell)
- If a value cannot be found, report it as "NOT FOUND" with the search strategy used
- If a value is ambiguous (multiple candidates), report all candidates with cell references and flag for user resolution
- Do not infer or compute values. If the model doesn't state total OpEx but lists line items, report the line items and note "total not stated by model"
- Terminology varies by model author — map to standard categories regardless of label (e.g., "Floorplan" = "Unit Type", "Bed/Bath" = "Unit Type")

---

### Phase 4: Waterfall Classification

Classify the waterfall structure without computing it. The output is a structured description that a downstream engine can consume.

**Step 1 — Locate the waterfall:**
- Search for sheets named: Waterfall, Waterfall Split, Promote, Distribution, Returns, Cash Flow Split, JV Split, Partnership
- If no dedicated sheet: search for waterfall/distribution sections within summary or cash flow sheets
- If no waterfall found: report "No waterfall/promote structure identified" — this is valid (some models are unleveraged or pre-promote)

**Step 2 — Read the structure:**
From the waterfall formulas and labels, identify:
- Tier count
- For each tier: type (return-of-capital / pref-accrual / catch-up / hurdle-split / residual-split)
- Hurdle type per tier: IRR, equity multiple (EM), IRR+EM, pref rate, none
- Hurdle values (8%, 12%, 1.5x, etc.)
- Split ratios per tier (LP% / GP% or investor% / sponsor%)
- Whether catch-up exists, and if so: full or partial, target normalization %
- Pref compounding convention: simple, monthly compound, quarterly compound, annual compound
- GP co-invest treatment: pari passu with LP, subordinated, or not present
- Multiple LP/investor classes: if present, list each class with pref rate and priority

**Step 3 — Produce classification object:**
```json
{
  "waterfall_type": "tiered_irr_hurdle | pref_then_split | pref_catchup_split | em_hurdle | hybrid | custom | none",
  "tier_count": 3,
  "has_return_of_capital_tier": true,
  "has_catch_up": false,
  "catch_up_type": null,
  "catch_up_split_gp": null,
  "pref_rate": 0.08,
  "pref_compounding": "monthly | simple | quarterly | annual",
  "hurdle_type": "IRR | EM | IRR_EM",
  "tiers": [
    {
      "tier": 1,
      "type": "pref",
      "rate": 0.08,
      "lp_split": 1.00,
      "gp_split": 0.00,
      "hurdle_value": null
    },
    {
      "tier": 2,
      "type": "promote",
      "rate": null,
      "lp_split": 0.70,
      "gp_split": 0.30,
      "hurdle_value": 0.12
    },
    {
      "tier": 3,
      "type": "residual",
      "rate": null,
      "lp_split": 0.60,
      "gp_split": 0.40,
      "hurdle_value": null
    }
  ],
  "sponsor_coinvest_pct": 0.05,
  "coinvest_treatment": "pari_passu_with_lp | subordinated | none",
  "investor_classes": [],
  "source_cells": {
    "sponsor_pct": "Waterfall Split!C16",
    "pref_rate": "Waterfall Split!D19",
    "tier2_hurdle": "Waterfall Split!D32"
  }
}
```

**Step 4 — Flag unrecognized structures:**
If the waterfall uses a structure the classifier doesn't recognize, report it as a finding:
"Waterfall structure at [Sheet!Range] does not match any known classification pattern. Manual review required."
This is a valid finding, not a failure to fix with more code.

---

### Phase 5: Sources & Uses Verification

**Step 1 — Look for an existing S&U schedule:**
- Search Assumptions sheet (or similarly named) for "Sources" and "Uses" labels
- If a schedule exists with totals, read both totals and compare
- If they match within $1, PASS

**Step 2 — If no S&U schedule exists, build one from extracted assumptions:**

Uses side (from Phase 3 extractions):
- Purchase price (3a)
- Closing costs (3a)
- Renovation budget (3d)
- Loan origination fees (3e)
- Reserves (3d or 3e)
- Other capitalized costs

Sources side (from Phase 3 extractions):
- Total equity (3f)
- Each loan amount (3e)
- Mezzanine/preferred equity if present (3f)

**Step 3 — Compare:**
- Sources must equal Uses within $1
- If gap > $100: finding. Report dollar amount and which side is short.
- If gap $1–$100: INFO (rounding).
- Report all values with cell references.

---

### Phase 6: Trust Score & Report Generation

**Data file early detection (REQUIRED before trust scoring):**
Before computing trust, determine whether the file is a financial model or a data export. A file is classified as a **data file** (not a model) if ALL of these are true:
- 3 or fewer sheets
- No formulas detected in any sheet (all cells are constants or empty)
- No sheets classified as Cash Flow, Waterfall, Loan, or Budget/CapEx

Data files are exempt from the full audit pipeline. Report: "This file is a data export, not a financial model. Extraction of tabular data available on request. Full audit not applicable." Trust score = N/A.

**Trust score** is a coverage metric with property-type-aware weighting:

**Standard weights (multifamily, office, retail, hotel, mixed-use):**

| Component | Weight | Scoring |
|-----------|--------|---------|
| Sheet classification success | 15% | % of sheets successfully classified |
| Assumption extraction coverage | 40% | % of standard categories where at least one value was found |
| Waterfall classification | 15% | Fully classified = 100%, partial = 50%, none found = 0%, unrecognized = 25% |
| Formula integrity | 15% | No critical findings = 100%, only INFO = 80%, critical findings = scaled down by count |
| S&U balance | 15% | Balanced = 100%, gap < $100 = 80%, gap > $100 = 50%, could not build = 25% |

**Land development / residential construction weights:**
Land dev models frequently have no waterfall sheet (promote structures may not apply or may be tracked outside the proforma). Rebalance weights to avoid penalizing these models:

| Component | Weight | Scoring |
|-----------|--------|---------|
| Sheet classification success | 20% | Same scoring as standard |
| Assumption extraction coverage | 45% | Same scoring as standard |
| Waterfall classification | 5% | Same scoring — but low weight means missing waterfall ≈ 5% penalty, not 15% |
| Formula integrity | 15% | Same scoring as standard |
| S&U balance | 15% | Same scoring as standard |

**Valuation models (appraisals, STNL, comp analysis):**
Valuation models may lack debt, capex, or waterfall sections. Adjust extraction expectations:

| Component | Weight | Scoring |
|-----------|--------|---------|
| Sheet classification success | 20% | Same scoring as standard |
| Assumption extraction coverage | 40% | But category list is reduced: income, expenses, deal_info, returns are expected; debt, capex, equity are optional (no penalty if missing) |
| Waterfall classification | 5% | Waterfalls uncommon in valuation models |
| Formula integrity | 15% | Same scoring as standard |
| S&U balance | 20% | S&U is critical in valuation — sources of value must reconcile |

**Property type detection (used to select weight profile):**
Detect property type from extracted labels before computing trust. Heuristics:
- "unit mix", "rent roll", "apartment", "multifamily", "studio", "1br", "2br" → multifamily
- "lot", "parcel", "absorption", "phase", "land use", "plat", "site plan" → land_development
- "custom home", "builder", "construction cost" → residential_construction
- "cap rate", "valuation", "appraisal", "STNL" → valuation_model
- "tenant", "lease", "nnn", "cam" → commercial (use standard weights)
- If ambiguous or unknown → use standard weights

Trust score = weighted sum using the appropriate profile, reported as percentage. Interpretation:
- 90–100%: High confidence extraction — ready for downstream engine ingestion
- 70–89%: Moderate confidence — some assumptions missing or ambiguous, flag for manual review
- Below 70%: Low confidence — model structure is non-standard or extraction had significant gaps

**HTML report generation:**

Produce a single-page HTML audit summary:

```
[Property Name] — Model Audit
Generated: [date] | File: [filename] | Trust Score: [XX%]

STRUCTURE
  Sheets: [count] ([count] classified, [count] hidden)
  VBA: [Yes/No] | External Links: [count] | Error Cells: [count] (propagating: [count])

FORMULA INTEGRITY
  Hardcoded overrides: [NONE / count with details]
  Circular references: [NONE / count]
  Pattern breaks: [NONE / count]

ASSUMPTIONS EXTRACTED
  [Table: Category | Value | Cell Reference — one section per extraction category]

WATERFALL CLASSIFICATION
  Type: [classification]
  Tiers: [count] | Pref: [rate] ([compounding]) | Hurdle: [type]
  [Tier table: Tier | Type | Hurdle | LP Split | GP Split]

SOURCES & USES
  Sources: $X | Uses: $Y | Balance: [PASS/FAIL ($delta)]

MODEL-STATED RETURNS (read from Excel, not computed)
  [Table: Metric | Value | Cell Reference]

[Informational: inactive sections, version notes, unrecognized structures]
```

**Styling:**
- Clean, minimal. Dark header (#1a4b7a), white body.
- Trust score badge: green (90+), amber (70–89), red (below 70).
- Cell references in monospace throughout.
- Tables alternate row shading for readability.

---

## Behavioral Rules

1. **Auto-fire on ingestion.** When a new Excel file enters the project, run the audit BEFORE any analysis begins.

2. **Extract, don't compute.** Read model-stated values from cells. Never compute IRR, NPV, NOI, cash flows, or any derived metric. Report what the model says, not what you calculate.

3. **Cell references always.** Every value, every finding, every assumption must include the exact cell address (Sheet!Cell). No exceptions.

4. **Don't critique assumptions.** Whether 5% cap rate is "right" or a 120-month I/O is "aggressive" is not this skill's job. This skill reads and classifies, not judges.

5. **Map terminology to standard categories.** Different model authors use different labels. "Floorplan" = "Unit Type" = "Bed/Bath". "OpEx" = "Operating Expenses" = "Expenses". The skill normalizes to standard CRE terminology in its output regardless of the model's labels.

6. **Error severity = output impact.** 1,000 #N/A errors that don't touch return cells are an informational footnote. 1 #N/A error that feeds an IRR cell is a critical finding. Severity is determined solely by propagation to outputs.

7. **Build what's missing.** If the model lacks a Sources & Uses schedule, construct one from extracted values rather than flagging "no S&U found."

8. **Flag what you can't classify.** If the waterfall structure doesn't match a known pattern, say so clearly. This is a finding for the user, not a bug to fix with more code.

9. **Be definitive about VBA limitations.** If VBA is present, state clearly that macro-dependent values are cached snapshots and cannot be verified.

10. **Report extraction gaps honestly.** If a standard assumption category (e.g., CapEx reserves) isn't found, report "NOT FOUND" with what was searched. Don't silently skip categories.

---

## What This Skill Does NOT Do

- **Does NOT compute cash flows, waterfall distributions, IRR, NPV, DSCR, or any financial metric.** That is the Landscape platform engine's job.
- **Does NOT replicate Excel formulas in Python.** (Exception: the archived Brownstone/ORS basic engine is retained as an offline fallback but is NOT part of the standard audit pipeline.)
- **Does NOT critique deal assumptions.** Whether assumptions are reasonable is the user's judgment, not the skill's.
- **Does NOT modify the Excel file.** Read-only operations only.

---

## Integration with Landscape Platform

When running within the Landscape project context:

1. **Extraction output feeds the platform engine.** The structured assumption extraction (Phase 3) and waterfall classification (Phase 4) produce data that the Django backend's financial engine can ingest to run its own calculations.

2. **Model-stated returns become comparison targets.** Phase 3h's extracted return values (IRR, EM, promote) are what the platform engine compares its own calculations against.

3. **The reconciliation happens in the platform, not here.** This skill extracts; the platform computes; the platform compares. The skill does not close the loop itself.

4. **Project instructions apply.** If the project specifies a "correct" model version, use that file and flag others. If the project specifies expected values, include them in the report for downstream comparison.

---

## Offline / Standalone Mode

When running outside the Landscape platform (e.g., in a standalone Cowork session):

- The full audit pipeline (Phases 1–6) runs identically
- The waterfall classification object is still produced but there's no downstream engine to consume it
- The trust score and HTML report are self-contained deliverables
- The archived basic replication engine (Brownstone/ORS template only) MAY be used as a fallback for models that match that specific template, but this is explicitly limited and not the standard path

---

## Limitations

- **Cannot evaluate VBA macros.** Macro-dependent values are cached snapshots only.
- **Cached value dependency.** openpyxl reads cached formula results from `data_only=True`. If cells were never calculated (new file opened only in openpyxl, never in Excel), cached values may be None.
- **Complex array formulas.** LAMBDA, LET, dynamic arrays, XLOOKUP may not parse via openpyxl. Flag unsupported functions rather than silently skipping.
- **Template diversity.** CRE models vary enormously in structure and terminology. The extraction heuristics cover common patterns but will miss non-standard layouts. Extraction gaps are reported honestly in the trust score.
- **No computation.** This skill cannot verify that the model's math is correct. It can verify structural integrity (formulas are consistent, no hardcoded overrides) but proving correctness requires a computation engine (the platform's job).
