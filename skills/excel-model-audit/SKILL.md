---
name: excel-model-audit
description: "Use this skill whenever an Excel file (.xlsx, .xlsm) is uploaded, referenced, or added to a project for the first time. Auto-triggers on any new spreadsheet ingestion. Also triggers when the user says 'audit this model', 'check this spreadsheet', 'validate the Excel', 'is this model correct', 'review the formulas', or any request to verify Excel model integrity. Performs structural scanning, formula integrity checks, comprehensive assumption extraction with cell references, waterfall classification, Python replication of waterfall math, Sources & Uses verification, and produces an HTML audit report with trust score. Also triggers for scenario analysis: 'what if', 'change assumption', 'run scenario', 'sensitivity', or any request to modify model inputs and see the impact. Use this skill even if the user just wants to 'look at' or 'pull numbers from' an Excel file — the audit should run first before any analysis begins."
---

# Excel Model Audit Skill — v5

## Purpose

Read, classify, extract, structurally validate, **independently verify**, and **run scenario analysis** on Excel financial models. This skill combines the v3 extraction/classification pipeline with a Python computation engine for waterfall verification and a LibreOffice-based recalculation pipeline for full-model scenario analysis.

The skill answers:

1. **What does this model contain?** (sheets, structure, property type, deal type)
2. **What are the assumptions?** (every financial input, mapped and tagged with cell references)
3. **What kind of waterfall does it use?** (classified and structured)
4. **Can Python reproduce every summary output to the penny?** (THE critical test)
5. **Is the model structurally sound?** (formula consistency, hardcoded overrides, error propagation, S&U balance, **range consistency**)
6. **How trustworthy is the extraction?** (trust score based on coverage and structural findings)
7. **What happens if we change assumptions?** (scenario mode — modify Excel → recalculate → read results)

---

## When to Use

- **Auto-trigger:** Any time an .xlsx or .xlsm file is uploaded or referenced for the first time
- **Manual trigger:** User asks to audit, validate, check, or verify an Excel model
- **Re-trigger:** User says "re-audit" or "recheck" after model changes
- **Smoke test:** User changes an assumption and wants independent verification
- **Scenario analysis:** User asks "what if", "change X to Y", "run with different assumptions", "sensitivity analysis"

Do NOT use this skill for:
- CSV or flat data files (no formula structure to audit)
- Excel files used purely as data exports (no calculations)
- Files the user explicitly says to skip auditing ("just read the data")

---

## Dependencies

```
openpyxl>=3.1.0    # Workbook structure, formula text, cell inspection
scipy              # XIRR via brentq solver (for Python replication)
LibreOffice        # Required for scenario mode (formula recalculation)
```

Install check: Before first run, verify openpyxl and scipy are available. If missing, install via pip.
LibreOffice is pre-installed in Cowork sandbox environments.

---

## LibreOffice Recalculation Setup (REQUIRED for Scenario Mode)

Before any scenario analysis, the LibreOffice macro must be configured to handle circular references. **This must be done at the start of every new session** — the sandbox is ephemeral.

### Install the recalculation macro:

```python
import os
from pathlib import Path

MACRO_DIR = os.path.expanduser("~/.config/libreoffice/4/user/basic/Standard")
os.makedirs(MACRO_DIR, exist_ok=True)

MACRO_CONTENT = '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">
<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" script:language="StarBasic">
    Sub RecalculateAndSave()
      Dim oDoc As Object
      oDoc = ThisComponent

      ' Enable iterative calculation to resolve circular references.
      ' Without this, models with circular refs (common in CRE financial
      ' models where AM fees depend on distributions which depend on AM fees)
      ' will produce #VALUE! errors on recalc.
      oDoc.IsIterationEnabled = True
      oDoc.IterationCount = 100
      oDoc.IterationEpsilon = 0.001

      ' Recalculate twice for circular convergence
      oDoc.calculateAll()
      oDoc.calculateAll()

      oDoc.store()
      oDoc.close(True)
    End Sub
</script:module>'''

Path(os.path.join(MACRO_DIR, "Module1.xba")).write_text(MACRO_CONTENT)
```

### Why this matters:

The default LibreOffice recalc macro (from the xlsx skill's `recalc.py`) does NOT enable iterative calculation. CRE financial models commonly have intentional circular references (e.g., AM fee → distributions → AM fee). Without `IsIterationEnabled = True`, these models produce 6,000+ #VALUE! errors on recalc. With it, they resolve correctly.

**CRITICAL:** Always install this macro BEFORE the xlsx skill's `recalc.py` runs. The `recalc.py` script checks if the macro exists and skips rewriting if it finds one. By installing our version first, we ensure the correct macro is used.

### Recalculation function:

```python
import subprocess
import shutil
from pathlib import Path

def recalc_model(source_path, working_path=None):
    """
    Copy model to working path and recalculate all formulas via LibreOffice.
    Returns the path to the recalculated file.
    
    NEVER modify the original file. Always work on a copy.
    """
    if working_path is None:
        working_path = str(Path(source_path).with_suffix('.working.xlsx'))
    
    shutil.copy(source_path, working_path)
    
    cmd = [
        'timeout', '60',
        'soffice', '--headless', '--norestore',
        'vnd.sun.star.script:Standard.Module1.RecalculateAndSave?language=Basic&location=application',
        str(Path(working_path).absolute())
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 and result.returncode != 124:
        raise RuntimeError(f"LibreOffice recalc failed: {result.stderr}")
    
    return working_path
```

---

## Audit Pipeline

Seven phases, run sequentially.

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

**Extended waterfall keywords (for sheet name classification):**
In addition to "waterfall", "promote", "distribution", "returns split", "jv split", "equity split", also match: "partner", "partnership", "prtnership", "allocation", "splits".

**Step 2 — External links and named ranges:**
- Detect external workbook references in formulas
- List named ranges and their targets
- Flag external links as a structural finding

**Step 3 — VBA detection:**
- Check for `.xlsm` extension or VBA project presence
- If VBA exists: list module names, flag which sheets contain event macros
- State clearly: "This model contains VBA macros. Macro-dependent calculations cannot be verified by this audit."

**Step 4 — Hidden content:**
- Detect hidden rows, hidden columns, hidden sheets
- Flag any hidden content that contains formulas feeding visible output cells

---

### Phase 2: Formula Integrity

Scan calculation sheets for structural formula issues.

**Scope:** Only sheets classified as Cash Flow, Waterfall, Loan, Sale/Disposition, or Summary.

**Check 2a — Hardcoded constants in formula ranges:**
- For each contiguous row or column of formulas, identify the dominant R1C1 pattern
- Flag any cell with a literal constant where the pattern expects a formula
- Severity: Only flag if the cell feeds output cells

**Check 2b — Error cells and propagation:**
- Find all #REF!, #VALUE!, #DIV/0!, #NAME?, #N/A cells
- Trace whether any output/summary cell depends on them
- If contained: single-line report. If propagating: critical finding.

**Check 2c — Circular references:**
- Detect and report. Flag as critical if feeding output cells.

**Check 2d — Structural consistency of repeating ranges:**
- In periodic arrays, verify formulas are consistent across all periods
- Flag any period column that breaks the pattern

**Check 2e — Range Consistency Audit (MANDATORY):**

This check catches the class of bug where a model is extended (e.g., from 60 months to 83 months) but some SUM/XIRR/aggregation formulas are not updated to cover the new range. This is a silent, critical error class.

**Step 1 — Determine the actual last cash flow period column per sheet.**
For each calculation sheet, scan header rows (1-10) for date values or month/period numbers. Find the last column containing period data. Record this as the sheet's `expected_last_col`. Common patterns:
- Row with sequential dates (e.g., 2026-11-01, 2026-12-01, ..., 2033-05-01)
- Row with sequential month numbers (e.g., 5, 6, 7, ..., 83)
- A "Total" column label inserted mid-sheet (this is NOT the last period — it's a periodic subtotal)

**CRITICAL: Distinguish periodic subtotals from truncated totals.** Monthly Cash Flow sheets commonly insert annual subtotal columns at regular intervals (e.g., every 12 months). These are identified by:
- Regular spacing (every 12-13 columns)
- SUM ranges that cover exactly one sub-period (e.g., `=SUM(D10:O10)` for year 1, `=SUM(Q10:AB10)` for year 2)
- A header label like "Year 1 Total" or just "Total"
These are BY DESIGN and are NOT truncation errors. Only flag a SUM as truncated if it appears in a position where it should aggregate the full deal period (e.g., a column labeled "Total" that is the ONLY total column, or a summary block separate from the monthly array).

**Step 2 — For every SUM and XIRR formula in summary/total positions, verify the range extends to `expected_last_col`.**
Specifically check:
- All SUM formulas in dedicated "total" columns or summary blocks
- All XIRR formulas
- Any formula in the first 7 columns (A-G) that references a horizontal range spanning >10 columns

**Step 3 — Cross-reference summary blocks within the same sheet.**
If a sheet has multiple summary/total blocks (e.g., column E totals AND column C totals in a Waterfall Split), verify they cover the same range. If one block extends to CN and another stops at BP, the shorter one is truncated.

**Step 4 — Trace downstream dependencies of truncated formulas.**
For each truncated formula found:
1. Check if any other sheet references that cell
2. Check if the cell feeds the model's output cells (Executive Summary, return metrics)
3. Classify severity:
   - **CRITICAL**: Truncated formula feeds return outputs (IRR, EM, promote, distributions)
   - **HIGH**: Truncated formula is in a summary position but doesn't feed outputs currently — however, if someone reads it or if the model is restructured, it would produce wrong numbers. Also: if changing an assumption (like extending the hold period or changing the exit month) would cause the truncated range to BECOME the binding constraint, that's HIGH.
   - **MEDIUM**: Truncated formula is cosmetic (labeled "Total" but nothing reads from it) — still a credibility risk if someone opens the model

**Step 5 — Check for formulas that would break under scenario changes.**
This is the "latent error" check. For each formula, ask: if a reasonable assumption change were made (different hold period, different exit month, different loan term), would this formula still capture all relevant periods? Specifically:
- If the model's hold period is an input cell and the SUM range is hardcoded to a specific column, flag it. The range should ideally be dynamic or at minimum extend to the model's maximum supported period.
- If a SUM range ends exactly at the current last cash flow period but there are empty columns beyond it that would be populated under a longer hold scenario, flag the tight fit.

**Reporting for Check 2e:**
- Report every truncated formula with: cell address, current formula, expected end column, actual end column, what it's labeled, whether it feeds outputs
- Do NOT report periodic subtotals (annual/quarterly sub-period totals) as truncation errors
- Do NOT include an "Informational" section for things that are working correctly by design — only report findings that are errors now OR would become errors under reasonable assumption changes

---

### Phase 3: Assumption Extraction

The core extraction layer. Every value reported must include `Sheet!Cell`.

**3a — Property & Deal Info:**
Property name, address, units, SF, year built, acquisition date, purchase price, closing costs, hold period, exit assumptions.

**3b — Income Assumptions:**
Unit mix table (type, count, SF, rents), GPR, vacancy rate, concessions, other income, rent growth rates.

**3c — Operating Expenses:**
Line-by-line OpEx with amounts, per-unit or % of revenue notation, escalation rates, total OpEx, NOI.

**3d — Capital Expenditure:**
Renovation budget (total and per-unit), line items, reserves, timeline, funding source.

**3e — Debt Structure:**
For each loan: type, amount, rate, term, amortization, I/O period, refi trigger, fees.

**3f — Capital Structure:**
Total equity, equity split (SP/investor %), GP co-invest treatment, investor classes if present.

**3g — Disposition / Exit:**
Exit cap rate, terminal NOI, gross sale price, disposition costs, net proceeds.

**3h — Model-Stated Returns (READ, not computed):**
Read directly from output cells: deal/investor/sponsor IRR, EM, promote, distributions, investment, CF check. These become comparison targets for Phase 5.

**Extraction rules:**
- Every value MUST include cell reference (Sheet!Cell)
- "NOT FOUND" with search strategy if missing
- Report all candidates if ambiguous
- Map terminology to standard CRE categories regardless of model labels

---

### Phase 4: Waterfall Classification

Classify the waterfall structure AND prepare it for Python replication.

**Step 1 — Locate the waterfall:**
Search for sheets named: Waterfall, Waterfall Split, Promote, Distribution, Returns, Cash Flow Split, JV Split, Partnership.

**Step 2 — Read the structure:**
- Tier count
- For each tier: type (return-of-capital / pref-accrual / catch-up / hurdle-split / residual-split)
- Hurdle type per tier: IRR, equity multiple, pref rate, none
- Hurdle values, split ratios, compounding convention
- GP co-invest treatment, multiple investor classes

**Step 3 — Read the formulas:**
This is critical for Phase 5. From the waterfall sheet, read the actual Excel formulas to understand:
- Which rows contain dates, cash flows, distributions, injections
- How BOP/EOP balance tracking works (cell-by-cell formula structure)
- How accruals are computed (monthly rate derivation)
- How distributions are capped (MIN-based logic)
- How tier spillover works (remaining cash flow passed to next tier)
- How summary cells aggregate (SUM of monthly arrays, XIRR, EM formulas)

Document the formula map: "Row X does Y, referencing Z" for each calculation row.

**Step 4 — Produce classification object:**
```json
{
  "waterfall_type": "tiered_irr_hurdle | pref_then_split | pref_catchup_split | em_hurdle | hybrid | custom | none",
  "tier_count": 3,
  "pref_rate": 0.08,
  "pref_compounding": "monthly | simple | quarterly | annual",
  "hurdle_type": "IRR | EM | IRR_EM",
  "tiers": [...],
  "sponsor_coinvest_pct": 0.05,
  "source_cells": {...}
}
```

**Step 5 — Flag unrecognized structures:**
If the waterfall doesn't match a known pattern, report it clearly. This is a finding, not a bug.

---

### Phase 5: Python Replication (THE critical test)

This is the only test that definitively proves the model's math is correct. Using the formula map from Phase 4, replicate the waterfall calculation in Python and compare every output cell.

**Step 1 — Read the model's data arrays:**
- Load with `data_only=True` to read cached values
- Extract full monthly cash flow arrays (dates and amounts) from Cont. Dist. or equivalent
- Extract all waterfall parameters (split percentages, hurdle rates, pref rates)
- Extract all summary output cells as comparison targets (from Phase 3h)

**Step 2 — Replicate the calculation in Python:**
- Implement the exact same period-by-period logic the formulas describe
- Monthly compounding: `(1 + annual_rate)^(1/12) - 1`
- BOP/EOP balance tracking with carry-forward
- MIN-based distribution caps matching Excel's exact formula
- Tier-by-tier allocation with exact split ratios
- XIRR via `scipy.optimize.brentq` on the NPV equation
- Equity multiples: `total_distributions / total_investment`

**Step 3 — Compare every output cell:**
- Dollar amounts: match within $0.01
- IRR: match within 0.01% (sub-basis-point)
- Equity multiples: match within 0.001x
- Cash flow check: must equal $0
- Present as cell-by-cell comparison table: Cell | Metric | Excel | Python | Delta | Match

**What "match" means:** Binary. Python gets the same answer = model math is correct. No confidence scores.

**If Python does NOT match:** Report specific cells, magnitude, and likely cause.

**Replication means replication:** Python must use the same period-by-period logic the Excel formulas describe. Monthly compounding, balance carry-forward, MIN-based distribution caps, exact split ratios. A "proportional-timing approximation" is NOT a replication and any delta it produces is Python's error, not the model's.

---

### Phase 6: Sources & Uses Verification

**Step 1 — Look for existing S&U schedule:**
Search for "Sources" and "Uses" labels. If found with totals, compare.

**Step 2 — If missing, build from extracted assumptions:**

Uses: Purchase price, closing costs, renovation, loan fees, reserves, other capitalized costs.
Sources: Total equity, each loan amount, mezzanine/pref equity if present.

**Step 3 — Compare:**
- Sources must equal Uses within $1. Gap > $100 = finding.
- Report all values with cell references.

---

### Phase 7: Trust Score & Report Generation

**Data file detection (before scoring):**
File is data (not model) if ALL true: ≤3 sheets, no formulas, no calc-type sheets. Report as data export, trust = N/A.

**Trust score** — property-type-aware weighted coverage metric:

| Component | Standard | Land Dev | Valuation |
|-----------|----------|----------|-----------|
| Sheet classification | 10% | 15% | 15% |
| Assumption extraction | 25% | 30% | 25% |
| Waterfall classification | 10% | 5% | 5% |
| **Python replication** | **25%** | **20%** | **20%** |
| Formula integrity + range audit | 15% | 15% | 15% |
| S&U balance | 15% | 15% | 20% |

Python replication scoring: All cells match = 100%, >80% match = 75%, >50% = 50%, could not replicate (VBA/unsupported) = 0%.

**Reporting rules — what to include and exclude:**

Only report findings that meet at least ONE of these criteria:
1. **Error now**: The formula produces a wrong number today
2. **Error on change**: A reasonable assumption change (hold period, exit month, loan term, equity split) would cause the formula to produce a wrong number
3. **Credibility risk**: Someone reading the model would see a misleading number (e.g., a cell labeled "Total" that doesn't actually total everything)

Do NOT report:
- Structures that are working correctly by design (periodic subtotals, running cumulative balances, expanding IRR calculations)
- "Informational" findings where no action is required and no error would result from assumption changes
- Observations about model architecture that don't indicate a problem

**HTML report:**
```
[Property Name] — Model Audit
Generated: [date] | File: [filename] | Trust Score: [XX%]

VERDICT: Python matches Excel: [YES/NO] — [X/Y] cells verified
  Sources = Uses: [YES/NO] ($X = $Y)
  Range consistency: [PASS / X issues found]
  Hardcoded overrides: [NONE / list]

FINDINGS (errors, truncations, latent risks)
  [Each finding with: severity, cell refs, current value vs expected, 
   downstream impact, whether it feeds returns, recommended fix]

ASSUMPTIONS EXTRACTED
  [Table: Category | Value | Cell Reference]

WATERFALL CLASSIFICATION
  [Tier table with splits]

PYTHON vs EXCEL
  [Cell-by-cell comparison table]

SOURCES & USES
  [Itemized with balance check]

MODEL-STATED RETURNS
  [Table: Metric | Deal | Investor | Sponsor — with cell refs]

VERIFIED CORRECT
  [List of critical formula paths confirmed working: summary SUMs, 
   XIRR ranges, Executive Summary references, Cash Flow Check]
```

---

## Scenario Mode (NEW in v4)

When the user asks "what if we change X" or "run with different assumptions":

### Architecture

The Excel model IS the calculation engine. Do not build a Python replacement of the full proforma. Instead:

1. **Modify** the Excel file (openpyxl, data_only=False)
2. **Recalculate** via LibreOffice (with iterative calc enabled)
3. **Read** the new results (openpyxl, data_only=True)
4. **Report** the deltas vs baseline

### Workflow

```python
import openpyxl
import shutil
from pathlib import Path

def run_scenario(original_path, changes, output_path=None):
    """
    Run a scenario by modifying cells in Excel and recalculating.
    
    Args:
        original_path: Path to the ORIGINAL model (never modified)
        changes: Dict of {cell_ref: new_value} e.g. {"Waterfall Split!C16": 0.10}
        output_path: Where to save the modified copy (default: auto-generated)
    
    Returns:
        Path to the recalculated file
    """
    # Step 1: ALWAYS work on a copy
    if output_path is None:
        output_path = str(Path(original_path).stem) + "_scenario.xlsx"
    shutil.copy(original_path, output_path)
    
    # Step 2: Apply changes via openpyxl (preserving formulas)
    wb = openpyxl.load_workbook(output_path)  # NOT data_only — we need formulas intact
    for cell_ref, new_value in changes.items():
        sheet_name, cell = cell_ref.split("!")
        ws = wb[sheet_name]
        old_value = ws[cell].value
        # Only change cells that contain literal values, not formulas
        # If cell is a formula, warn and skip unless explicitly overriding
        if isinstance(old_value, str) and old_value.startswith("="):
            print(f"WARNING: {cell_ref} contains formula '{old_value}' — skipping")
            continue
        ws[cell] = new_value
    wb.save(output_path)
    wb.close()
    
    # Step 3: Recalculate via LibreOffice
    recalc_model(output_path, output_path)  # in-place recalc of the copy
    
    # Step 4: Read recalculated results
    return output_path
```

### Rules for Scenario Mode

1. **NEVER modify the original file.** Always copy first.
2. **Check if target cell is a formula before overwriting.** If `C17 = "=1-C16"`, changing C16 is enough — C17 resolves automatically through recalc. Warn if the user asks to overwrite a formula cell.
3. **Verify baseline first.** Before running any scenario, confirm the unmodified model recalculates correctly (compare key output cells to original cached values). If baseline recalc introduces errors, stop and report.
4. **Report deltas, not just results.** Show: Metric | Baseline | Scenario | Delta for every output cell that changed.
5. **Cash Flow Check must be $0 in both baseline and scenario.** If CF Check ≠ $0 after scenario, something broke.
6. **Cross-verify with Python engine when possible.** For waterfall-only changes (pref, hurdle, promote splits), run the Python replication engine with overridden params as an independent check. Both should agree.

### What changes cascade (and why recalc is needed)

| Change Type | Examples | Cascades? | Recalc Required? |
|-------------|----------|-----------|------------------|
| Waterfall splits only | Pref rate, hurdle, promote % | No — only affects how distributions are divided | Optional (Python engine can handle) |
| Equity structure | SP/Investor % (C16) | Yes — AM fee, distributions, circular refs | **YES** |
| Debt terms | Interest rate, loan amount, I/O period | Yes — debt service, levered CF, everything downstream | **YES** |
| Revenue | Rents, vacancy, growth rates | Yes — NOI, debt coverage, distributions | **YES** |
| CapEx | Renovation budget, timing | Yes — draws, equity requirements, CF timing | **YES** |
| Exit | Cap rate, sale month | Yes — sale proceeds, terminal distributions | **YES** |
| Fees | AM fee %, acq fee %, CM fee % | Yes — circular ref with distributions | **YES** |

**Rule of thumb:** If the change only affects cells in the Waterfall Split sheet's parameter section (rows 16-49 in the known template), the Python engine can handle it without recalc. Anything else needs LibreOffice recalc.

---

## Smoke Test Mode

When the user changes an assumption in the model and asks for verification:

1. Re-read the model (both `data_only=False` and `data_only=True`)
2. Identify what changed (compare to prior extraction if available)
3. Re-run Python replication with the new inputs
4. Compare to the model's new outputs
5. Report: what changed, whether the model correctly propagated the change, cell-by-cell comparison

This is the proof that the skill can independently verify — not just read — the model's math.

---

## Behavioral Rules

1. **Auto-fire on ingestion.** Run before any analysis begins.

2. **Python match is the headline.** First thing the user sees.

3. **Cell references always.** Every value, every finding. No exceptions.

4. **Don't critique assumptions.** This skill validates math, not judgment.

5. **Extract AND compute.** Read model-stated values (Phase 3h) AND independently replicate them (Phase 5). Both appear in the report. If they match, the model is verified. If they don't, the delta is the finding.

6. **Be definitive about inactive sections.** If Python matches every output, non-feeding sections are provably inert.

7. **Error severity = output impact.** Only matters if it touches return cells.

8. **Build what's missing.** Construct S&U from model cells rather than flagging absence.

9. **Replication means replication.** Period-by-period, same logic, same compounding. Not an approximation.

10. **No confidence scores.** Match or don't match. Binary.

11. **Map terminology.** Normalize model labels to standard CRE terminology.

12. **Flag what you can't classify.** Unrecognized waterfall = finding for user, not bug to fix.

13. **Install the iterative calc macro at session start.** Before any recalc or scenario analysis, ensure the LibreOffice macro with `IsIterationEnabled = True` is installed. This is not optional — without it, models with circular references will fail.

14. **Never modify the original model.** All scenario analysis works on copies.

15. **No "Informational" findings.** Every finding in the report must be actionable — either it's wrong now, it would break under a reasonable assumption change, or it's misleading to a reader. If a structure is working as designed and wouldn't break under changes, don't report it. Observations like "this sheet uses annual subtotals" or "running cumulative balances are present" are not findings.

16. **Flag latent errors, not just current errors.** A formula that works today but would silently break if the hold period changed is a finding. A formula with a hardcoded range that exactly matches the current last period but wouldn't accommodate an extension is a finding. The question is always: "would a reasonable assumption change expose this as a bug?"

---

## Limitations

- **Cannot evaluate VBA macros.** Macro-dependent values are cached snapshots only.
- **Cached value dependency.** openpyxl reads cached formula results. If cells cache as $0 or None, Python reconstructs from formula logic.
- **Complex array formulas.** LAMBDA, LET, dynamic arrays may not parse. Flag unsupported functions.
- **Waterfall generalization.** The replication engine currently handles tiered IRR-hurdle structures with monthly compounding. Other structures (EM hurdles, catch-up provisions, clawbacks) require reading the specific formulas and building custom replication logic. The engine reads formulas first, then replicates — it does not assume a template.
- **LibreOffice compatibility.** Most Excel models recalculate correctly with iterative calc enabled. Some models with Excel-specific features (Power Query, dynamic arrays, complex array formulas) may produce errors. If baseline recalc fails, report and fall back to read-only mode.

---

## v5 Changelog (2026-04-13)

**New: Check 2e — Range Consistency Audit.** Mandatory phase that catches formula range truncation — the class of bug where a model is extended to a longer hold period but some SUM/XIRR formulas aren't updated. This was the #1 miss in v4: column E "Total" formulas in Waterfall Split summed through month 60 (col BP) when the model ran 83 months (col CN). The error was contained (didn't feed outputs) but would have been missed entirely without this check.

**Changed: Reporting rules.** Removed the "Informational" section from the report template. Findings must be errors, latent risks, or credibility problems. Structures working as designed (periodic subtotals, cumulative balances, expanding IRR calcs) are not findings and are not reported. This reduces noise and keeps the audit focused on what matters.

**Changed: Trust score weights.** Formula integrity + range audit weight increased from 10% to 15% (taken from assumption extraction) to reflect the importance of range consistency checking.

**Root cause of the miss:** v4's Check 2d ("Structural consistency of repeating ranges") only checked whether formulas were consistent ACROSS periods within the same row. It did not check whether summary/total formulas covered ALL periods. A formula could be perfectly consistent across 60 months and still be truncated. Check 2e specifically addresses the orthogonal question: "does this total actually total everything?"
