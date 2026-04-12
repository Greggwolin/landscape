---
name: excel-model-audit
description: "Use this skill whenever an Excel file (.xlsx, .xlsm) is uploaded, referenced, or added to a project for the first time. Auto-triggers on any new spreadsheet ingestion. Also triggers when the user says 'audit this model', 'check this spreadsheet', 'validate the Excel', 'is this model correct', 'review the formulas', or any request to verify Excel model integrity. Runs a Python replication test against the model's conclusions, checks for hardcoded constants in formula ranges, builds or verifies a Sources & Uses balance, and produces a concise HTML audit summary with a key assumptions table. Use this skill even if the user just wants to 'look at' or 'pull numbers from' an Excel file — the audit should run first before any analysis begins."
---

# Excel Model Audit Skill

## Purpose

Verify that an Excel financial model's conclusions are mathematically correct by replicating them independently in Python. This is not a critique of assumptions — it is a math validation. The audit answers three questions:

1. **Can Python reproduce every summary output to the penny?**
2. **Are there hardcoded constants hiding in formula ranges that could silently corrupt results?**
3. **Do Sources = Uses?**

If all three pass, the model's math is verified. Everything else is informational.

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
scipy              # XIRR via brentq solver
```

Install check: Before first run, verify both are available. If missing, install via pip.

---

## Audit Pipeline

Three core tests, run sequentially. Each must pass for the model to be considered verified.

### Test 1: Python Replication (THE critical test)

This is the only test that definitively proves the model's math is correct. If Python reproduces every summary cell to the penny using the same inputs and logic, the model is verified.

**Step 1 — Read the model's formula structure:**
- Load with `data_only=False` to read formulas
- Map the waterfall/allocation logic by reading formulas in the calculation sheets
- Identify: what are the inputs (monthly CFs, dates, parameters), what is the calculation path (period-by-period accruals, tier allocations), what are the outputs (summary cells)

**Step 2 — Read the model's data arrays:**
- Load with `data_only=True` to read cached values
- Extract the full monthly cash flow arrays (dates and amounts)
- Extract all waterfall parameters (split percentages, hurdle rates, pref rates)
- Extract all summary output cells that will serve as comparison targets

**Step 3 — Replicate the calculation in Python:**
- Implement the exact same period-by-period logic the formulas describe
- For waterfall models: monthly compounding at `(1 + annual_rate)^(1/12) - 1`, BOP/EOP balance tracking, MIN-based distribution caps, tier-by-tier allocation with exact split ratios
- For XIRR: use `scipy.optimize.brentq` on the NPV equation matching Excel's XIRR
- For equity multiples: `net_cf / -investment + 1`

**Step 4 — Compare every output cell:**
- Dollar amounts must match within $0.01 (sub-cent)
- IRR must match within 0.01% (sub-basis-point)
- Equity multiples must match within 0.001x
- Cash flow check cells must equal $0
- Present results as a cell-by-cell comparison table: Cell | Metric | Excel | Python | Delta | Match

**What "match" means:** If Python gets the same answer using the same inputs and the same logic, the model's math is correct. Period. No confidence scores, no judgment calls.

**If Python does NOT match:** This is the only true finding. Report the specific cells that diverge, the magnitude, and the likely cause (e.g., a formula that Python interpreted differently).

---

### Test 2: Hardcoded Constants in Formula Ranges

Scan calculation sheets for hardcoded values that break a formula pattern. This is the "silent corruption" risk — someone typed a number over a formula and it looks normal but isn't calculating.

**Scope:** Only sheets that feed output cells. Typically: Waterfall Split, Monthly Cash Flow, Loan Summary, Sale Analysis, Cash Flow Summary, Cont. Dist. Skip cosmetic/presentation sheets (3 Pager Graphs, charts, etc.).

**Method:**
- For each column or row of formulas in a calculated sheet, identify the dominant formula pattern (most common structure in R1C1 notation)
- Flag any cell that contains a constant where the pattern says there should be a formula
- Report: sheet, cell, the constant value found, what formula was expected

**Severity:** Only flag if the hardcoded value is in a range that feeds summary outputs. A hardcoded label or formatting constant is not a finding.

---

### Test 3: Sources & Uses Balance

Every deal model must balance: total sources of capital = total uses of capital. This test verifies that fundamental constraint.

**Step 1 — Look for an existing S&U schedule:**
- Search the Assumptions sheet (or similarly named sheet) for "Sources" and "Uses" labels
- If a schedule exists with totals, read both totals and compare
- If they match within $1, PASS — report the values and cell references

**Step 2 — If no S&U schedule exists, or if only one side is found, build one:**
Construct Sources and Uses from the model's own cells:

*Uses side:*
- Acquisition/Purchase price (Assumptions sheet)
- Closing costs (Assumptions or Sale Analysis)
- Renovation/capex budget (Renovation Budget sheet or Assumptions)
- Loan closing costs / origination fees
- Reserves (working capital, operating reserves)
- Any other capitalized costs

*Sources side:*
- Total equity (Waterfall Split equity investment cell)
- Senior debt / bridge loan (Loan Summary)
- Mezzanine or preferred equity (if present)
- Any other funding sources

**Step 3 — Compare:**
- Sources must equal Uses within $1
- If gap exists, report the dollar amount and identify which side is short
- This is a finding only if the gap is material (>$100). Rounding differences under $100 are INFO.

---

## Informational Checks (run but don't headline)

These provide useful context but are NOT findings unless they affect outputs:

**Error cells:** Find all #REF!, #VALUE!, #DIV/0!, #NAME?, #N/A cells. For each, determine whether any output/summary cell depends on it. If errors are contained (don't propagate to conclusions), report as a single line: "X error cells found in [sheet], none affect summary outputs." If errors DO propagate to outputs, that will already show up in Test 1 (Python won't match).

**Inactive model sections:** If the model contains sections (like a Member Loan, preferred equity tranche, or alternative scenario) that exist structurally but do not feed into the waterfall or summary outputs, state this definitively: "[Section name] exists at [location] but does not feed any output cell. Confirmed inert by Python replication match." Do not flag these as needing external confirmation — if Python matched every output, the section is provably not in the cash flow path.

**Multiple file versions:** If the project directory contains multiple Excel files for the same property, list them with key metrics (IRR, EM) so the user can confirm which is current. If project instructions specify the correct version, flag any others as "not the active model."

---

## Output Format

Generate a concise HTML audit summary. One page. No accordions needed for the core content.

```
[Property Name] — Model Audit
Generated: [date] | File: [filename]

VERDICT: [Python matches Excel: YES/NO]
  - [X] cells compared, [Y] match to the penny
  - Sources = Uses: [YES/NO] ($X = $Y)
  - Hardcoded overrides in formula ranges: [NONE FOUND / list]

Key Assumptions (table with cell references)
  Assumption | Value | Cell

Python vs Excel Comparison (table)
  Cell | Metric | Excel | Python | Match

[If applicable: Informational notes — error cells, inactive sections, version list]
```

**Styling:**
- Clean, minimal. Dark header (#1a4b7a), white body.
- Verdict section: green background if all pass, red if Python doesn't match.
- Cell references in monospace.
- Key assumptions table is always included — it's the "what drives this model" reference.

---

## Behavioral Rules

1. **Auto-fire on ingestion.** When a new Excel file enters the project, run the audit BEFORE any analysis begins.

2. **Python match is the headline.** The first thing the user sees is whether Python reproduced Excel's conclusions. Everything else is secondary.

3. **Cell references always.** Every value, every finding, every assumption must include the exact cell address (Sheet!Cell).

4. **Don't critique assumptions.** Whether 5% cap rate is "right" or 120-month I/O is "aggressive" is not this skill's job. This skill validates math, not judgment. The user and their advisors evaluate assumptions.

5. **Be definitive about inactive sections.** If Python matches every output cell, any model section that doesn't feed those outputs is provably inert. Say so. Don't hedge with "needs confirmation."

6. **Error severity = output impact.** 1,000 #N/A errors that don't touch returns are an informational footnote. 1 #N/A error that feeds an IRR cell is a critical finding. Severity is determined solely by whether the error affects conclusions.

7. **Build what's missing.** If the model lacks a Sources & Uses schedule, build one from the model's cells rather than flagging "no S&U found." The skill's job is to verify the model balances, not to complain that a schedule doesn't exist.

8. **No confidence scores or trust ratings.** The model either matches or it doesn't. Binary.

9. **Replication means replication.** Python must use the same period-by-period logic the Excel formulas describe. Monthly compounding, balance carry-forward, MIN-based distribution caps, exact split ratios. A "proportional-timing approximation" is not a replication and any delta it produces is the Python's error, not the model's.

---

## Integration with Project Instructions

When this skill runs in a project that has existing instructions:

- If the project specifies a "correct" model version, use that file and flag others as inactive
- If the project specifies expected values (IRR, EM, promote), cross-check against both Excel and Python
- If mandatory rules exist (like "always include cell references"), this skill's output already complies

---

## Example Audit Opening

```
I've audited "Brownstone Apartments - 3 year bridge refi and hold.xlsx"

**Python matches Excel: YES** — all 17 summary cells verified to the penny.

Sources & Uses: Total Uses = $4,274,317 (Assumptions!C29). Equity = $1,497,642
(Waterfall Split!C55) + Debt = $2,776,675 (Loan Summary) = $4,274,317. Balanced.

No hardcoded overrides found in formula ranges (Waterfall Split, Monthly CF,
Sale Analysis, Loan Summary all formula-consistent).

1,102 #N/A errors exist in Loan Summary rows 86-361 (refi HLOOKUP range issue).
None affect summary outputs — confirmed by Python match.

Member Loan section exists at Loan Summary!O1 but does not feed any output cell.
Confirmed inert by Python replication match.

[Key Assumptions table]
[Python vs Excel comparison table]
```

---

## Limitations

- **Cannot evaluate VBA macros.** If a model relies on VBA for calculations, those results cannot be independently verified.
- **Cached value dependency.** openpyxl reads cached formula results. If cells cache as $0 or None, Python reconstructs the values from the formula logic rather than treating them as unverifiable.
- **Complex array formulas.** Some advanced Excel functions (LAMBDA, LET, dynamic arrays) may not have direct Python equivalents. Flag unsupported functions rather than silently skipping them.
- **Model-specific logic.** Each model's formula structure must be read and understood before replication. The skill reads the formulas first, then builds the Python replication to match. It does not assume a standard template.
