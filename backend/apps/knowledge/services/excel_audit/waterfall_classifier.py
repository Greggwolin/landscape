"""
Phase 4 — Waterfall Classifier.

Reads the Waterfall sheet of a financial model and produces a structured
classification of the distribution structure: tier count, tier types,
hurdle rates, split ratios, pref rate, compounding convention, sponsor
co-invest %, and a `source_cells` map keyed to Sheet!Cell refs for every
recovered value.

Output feeds Phase 5 (Python replication). The classifier identifies WHAT
to replicate; Phase 5 replicates it. Anything the classifier can't parse
gets returned as `waterfall_type="custom"` with findings — never silently
defaulted to a template.

Design notes:
  - Heuristic, not exhaustive. CRE waterfalls are bespoke; we identify
    structure by tier-label scan + adjacent numeric read, not by parsing
    arbitrary formula trees.
  - Sheet name prefix stripping (i./m./r.) matches the Phase 0 classifier.
  - Tier labels are pattern-matched against TIER_LABEL_PATTERNS.
  - Splits detected as complementary numeric pairs that sum to ~1.0.
  - Hurdle classification: numeric in 0.05-0.25 range adjacent to a hurdle
    label = IRR; numeric in 1.2-3.0 range = EM (equity multiple).
  - Compounding inferred from formula text in the same row (presence of
    `^(1/12)`, `/12`, etc.).

Returns a dict (not a dataclass instance) so tool wrappers can serialize
directly. Every numeric value carries a Sheet!Cell ref in `source_cells`.
"""

import re
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple

from openpyxl.workbook.workbook import Workbook
from openpyxl.worksheet.worksheet import Worksheet


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

# Matches "i.", "m.", "r." at the start of a sheet name. Mirrors the
# Phase 0 classifier's pattern exactly — REQUIRES the dot. Bare-letter
# variants like "iProject" are NOT stripped here (matches existing
# pipeline behavior; CLAUDE.md note about iProject → Project is
# aspirational and not yet implemented anywhere in the audit pipeline).
PREFIX_RE = re.compile(r"^([imr])\.\s*", re.IGNORECASE)

# Sheet-name tokens that mark a candidate waterfall sheet. Mirrors the
# Phase 0 classifier's FULL_MODEL_TOKENS but extended per SKILL.md §Phase 4
# Step 1 to include partnership / allocation / splits.
WATERFALL_SHEET_TOKENS = {
    "waterfall", "wfall", "promote", "distribution",
    "returns split", "jv split", "equity split",
    "partner", "partnership", "prtnership",
    "allocation", "splits",
    "cash flow split", "cf split",
}

# Tier label patterns. Order matters: more specific patterns first so that
# "pref catch-up" doesn't match the bare "catch-up" pattern before being
# classified as catch_up.
TIER_LABEL_PATTERNS = [
    ("return_of_capital", [
        r"\breturn of capital\b",
        r"\broc\b",
        r"\bcapital return\b",
        r"\breturn.*equity\b",
    ]),
    ("pref_accrual", [
        r"\bpref(erred)? return\b",
        r"\bpreferred\b",
        r"\bpref accrual\b",
        r"\bpref\b",
    ]),
    ("catch_up", [
        r"\bcatch[- ]?up\b",
        r"\bcatchup\b",
        r"\bgp catch\b",
    ]),
    ("hurdle_split", [
        r"\bhurdle\b",
        r"\birr hurdle\b",
        r"\bem hurdle\b",
        r"\bequity multiple hurdle\b",
        r"\btier\s*\d\b",
    ]),
    ("residual_split", [
        r"\bresidual\b",
        r"\bremaining\b",
        r"\bthereafter\b",
        r"\babove\b",
        r"\bfinal split\b",
    ]),
]

# Sponsor co-invest detection
COINVEST_PATTERNS = [
    r"\bsponsor co[- ]?invest",
    r"\bgp co[- ]?invest",
    r"\bsponsor equity",
    r"\bgp equity",
    r"\bgp contribution",
    r"\bsp co[- ]?invest",
]

# Maximum scan windows
MAX_LABEL_SCAN_ROWS = 100   # how deep into the sheet we look for tier labels
MAX_LABEL_SCAN_COLS = 4     # leftmost columns to treat as label columns
MAX_VALUE_SCAN_COLS = 8     # how many cols right of a label to read for values
MAX_COINVEST_SCAN_ROWS = 80

# Heuristic ranges
IRR_MIN, IRR_MAX = 0.04, 0.30      # plausible IRR / pref rate
EM_MIN, EM_MAX = 1.10, 4.00        # plausible equity multiple hurdle
PREF_RATE_MIN, PREF_RATE_MAX = 0.04, 0.15
COINVEST_MAX = 0.50                # sponsor coinvest rarely above 50%


# ─────────────────────────────────────────────────────────────────────────────
# Dataclasses
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class WaterfallTier:
    index: int                              # 1-indexed position
    tier_type: str                          # return_of_capital | pref_accrual | catch_up | hurdle_split | residual_split | unknown
    label: str                              # raw label text as found
    label_cell: Optional[str] = None        # Sheet!Cell of the label
    hurdle_type: Optional[str] = None       # IRR | EM | pref_rate | None
    hurdle_value: Optional[float] = None
    split_lp_pct: Optional[float] = None
    split_gp_pct: Optional[float] = None
    pref_rate: Optional[float] = None
    pref_compounding: Optional[str] = None  # monthly | simple | quarterly | annual
    source_cells: Dict[str, str] = field(default_factory=dict)


@dataclass
class WaterfallClassification:
    waterfall_type: str                     # tiered_irr_hurdle | pref_then_split | pref_catchup_split | em_hurdle | hybrid | custom | none
    tier_count: int
    sheet_name: Optional[str]
    tiers: List[WaterfallTier] = field(default_factory=list)
    pref_rate: Optional[float] = None
    pref_compounding: Optional[str] = None
    hurdle_type: Optional[str] = None       # IRR | EM | IRR_EM
    sponsor_coinvest_pct: Optional[float] = None
    source_cells: Dict[str, str] = field(default_factory=dict)
    findings: List[Dict] = field(default_factory=list)
    rationale: str = ""

    def to_dict(self) -> Dict:
        d = asdict(self)
        # Tiers are dataclasses inside a list — asdict already recurses, but
        # be explicit so the JSON shape is stable.
        return d


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _strip_prefix(name: str) -> str:
    return PREFIX_RE.sub("", name or "").strip().lower()


def _find_waterfall_sheets(wb: Workbook) -> List[str]:
    """Return sheet names that match any waterfall keyword (prefix-stripped)."""
    hits: List[str] = []
    for name in wb.sheetnames:
        clean = _strip_prefix(name)
        for tok in WATERFALL_SHEET_TOKENS:
            if tok in clean:
                hits.append(name)
                break
    return hits


def _classify_label(text: str) -> Optional[str]:
    """Return the tier_type matched by `text`, or None."""
    if not text:
        return None
    lower = text.lower().strip()
    for tier_type, patterns in TIER_LABEL_PATTERNS:
        for pat in patterns:
            if re.search(pat, lower):
                return tier_type
    return None


def _coord(ws: Worksheet, row: int, col: int) -> str:
    """Sheet!Cell reference, e.g. 'Waterfall!C16'."""
    return f"{ws.title}!{ws.cell(row=row, column=col).coordinate}"


def _read_numeric_neighbors(
    ws_values: Worksheet, row: int, col_start: int
) -> List[Tuple[int, float, str]]:
    """
    Return (col, value, ref) for non-zero numeric cells right of col_start.
    Stops at first text cell or after MAX_VALUE_SCAN_COLS.
    """
    out: List[Tuple[int, float, str]] = []
    last_col = min(col_start + MAX_VALUE_SCAN_COLS, ws_values.max_column or col_start)
    for c in range(col_start + 1, last_col + 1):
        v = ws_values.cell(row=row, column=c).value
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)) and v != 0:
            out.append((c, float(v), _coord(ws_values, row, c)))
        elif isinstance(v, str) and v.strip():
            # Hit a text label — stop scanning right
            break
    return out


def _detect_compounding(ws_formulas: Worksheet, row: int) -> Optional[str]:
    """
    Inspect formulas in the same row for compounding convention markers.
    Looks at up to first 50 columns.
    """
    last_col = min(50, ws_formulas.max_column or 0)
    for c in range(1, last_col + 1):
        v = ws_formulas.cell(row=row, column=c).value
        if not isinstance(v, str) or not v.startswith("="):
            continue
        f = v.lower()
        if "(1/12)" in f or "^(1/12)" in f:
            return "monthly"
        if "(1/4)" in f or "^(1/4)" in f:
            return "quarterly"
        if "/12" in f and "rate" in f:
            return "monthly"
        if re.search(r"\bmonthly\b", f):
            return "monthly"
        if re.search(r"\bquarterly\b", f):
            return "quarterly"
        if re.search(r"\bannual\b", f):
            return "annual"
    return None


def _split_pair(values: List[float]) -> Optional[Tuple[float, float]]:
    """
    Find a complementary pair in `values` that sums to ~1.0.
    Returns (lp_share, gp_share) with LP > GP by convention, or None.
    """
    for i, a in enumerate(values):
        if not (0 < a < 1):
            continue
        for b in values[i + 1:]:
            if not (0 < b < 1):
                continue
            if abs((a + b) - 1.0) < 0.01:
                lp = max(a, b)
                gp = min(a, b)
                return (lp, gp)
    return None


def _build_tier(
    ws_values: Worksheet,
    ws_formulas: Worksheet,
    row: int,
    col: int,
    tier_type: str,
    label_text: str,
) -> WaterfallTier:
    """Read adjacent cells and build a structured tier object."""
    tier = WaterfallTier(
        index=0,  # set by caller
        tier_type=tier_type,
        label=label_text,
        label_cell=_coord(ws_values, row, col),
    )

    candidates = _read_numeric_neighbors(ws_values, row, col)
    if not candidates:
        return tier

    nums = [v for _, v, _ in candidates]
    refs_by_value = {v: ref for _, v, ref in candidates}

    if tier_type == "pref_accrual":
        # First numeric in plausible pref range = pref rate
        for v in nums:
            if PREF_RATE_MIN <= v <= PREF_RATE_MAX:
                tier.pref_rate = v
                tier.hurdle_type = "pref_rate"
                tier.source_cells["pref_rate"] = refs_by_value[v]
                break
        tier.pref_compounding = _detect_compounding(ws_formulas, row)
        if tier.pref_compounding:
            tier.source_cells["pref_compounding"] = "(inferred from row formulas)"

    elif tier_type == "hurdle_split":
        # Find the hurdle (IRR or EM)
        for v in nums:
            if IRR_MIN <= v <= IRR_MAX:
                tier.hurdle_value = v
                tier.hurdle_type = "IRR"
                tier.source_cells["hurdle_value"] = refs_by_value[v]
                break
            if EM_MIN <= v <= EM_MAX:
                tier.hurdle_value = v
                tier.hurdle_type = "EM"
                tier.source_cells["hurdle_value"] = refs_by_value[v]
                break
        # Find LP/GP split
        pair = _split_pair(nums)
        if pair:
            lp, gp = pair
            tier.split_lp_pct = lp
            tier.split_gp_pct = gp
            tier.source_cells["split_lp_pct"] = refs_by_value[lp]
            tier.source_cells["split_gp_pct"] = refs_by_value[gp]

    elif tier_type == "catch_up":
        # 100% / 0% catch-up to GP, OR a partial catch-up split
        for v in nums:
            if abs(v - 1.0) < 0.01:
                tier.split_gp_pct = 1.0
                tier.split_lp_pct = 0.0
                tier.source_cells["catch_up"] = refs_by_value[v]
                break
        if tier.split_gp_pct is None:
            # Try partial catch-up — pair that sums to 1.0 with GP > LP
            pair = _split_pair(nums)
            if pair:
                # In catch-up, GP typically takes the larger share
                lp, gp = pair
                tier.split_lp_pct = min(lp, gp)
                tier.split_gp_pct = max(lp, gp)
                tier.source_cells["split_gp_pct"] = refs_by_value[max(lp, gp)]
                tier.source_cells["split_lp_pct"] = refs_by_value[min(lp, gp)]

    elif tier_type == "residual_split":
        pair = _split_pair(nums)
        if pair:
            lp, gp = pair
            tier.split_lp_pct = lp
            tier.split_gp_pct = gp
            tier.source_cells["split_lp_pct"] = refs_by_value[lp]
            tier.source_cells["split_gp_pct"] = refs_by_value[gp]

    elif tier_type == "return_of_capital":
        for v in nums:
            if abs(v - 1.0) < 0.01:
                tier.split_lp_pct = 1.0
                tier.split_gp_pct = 0.0
                tier.source_cells["roc"] = refs_by_value[v]
                break

    return tier


def _scan_sheet_for_tiers(
    ws_values: Worksheet, ws_formulas: Worksheet
) -> List[WaterfallTier]:
    """
    Walk the first MAX_LABEL_SCAN_ROWS rows of the sheet looking for tier
    labels in the leftmost MAX_LABEL_SCAN_COLS columns. For each match, read
    adjacent numeric cells to populate the tier object.

    Allows multiple `hurdle_split` tiers (a 3-tier waterfall typically has
    2-3 IRR hurdles). Other tier types collapse to first-seen.
    """
    tiers: List[WaterfallTier] = []
    seen_unique: set = set()  # tier_types other than hurdle_split
    last_row = min(MAX_LABEL_SCAN_ROWS, ws_values.max_row or 0)
    last_col = min(MAX_LABEL_SCAN_COLS, ws_values.max_column or 0)

    for row in range(1, last_row + 1):
        for col in range(1, last_col + 1):
            label_text = ws_values.cell(row=row, column=col).value
            if not isinstance(label_text, str):
                continue
            tier_type = _classify_label(label_text)
            if not tier_type:
                continue
            # Collapse duplicates except for hurdle_split (multiple tiers OK)
            if tier_type != "hurdle_split" and tier_type in seen_unique:
                continue
            tier = _build_tier(
                ws_values, ws_formulas, row, col, tier_type, label_text.strip()
            )
            tiers.append(tier)
            if tier_type != "hurdle_split":
                seen_unique.add(tier_type)
            break  # one label per row

    # Re-index 1-based
    for i, t in enumerate(tiers, start=1):
        t.index = i
    return tiers


def _detect_overall_type(tiers: List[WaterfallTier]) -> str:
    """
    Roll up tier list to a waterfall_type enum.

    Decision tree (SKILL.md §Phase 4 Step 4 enum):
      - none           : no tiers
      - pref_catchup_split : pref + catch_up + split
      - pref_then_split: pref + split, no catch_up
      - tiered_irr_hurdle : multiple hurdle_split tiers with IRR hurdles, no pref
      - em_hurdle      : EM hurdle present, no IRR
      - hybrid         : both IRR and EM hurdles present
      - custom         : tiers found but pattern unrecognized
    """
    if not tiers:
        return "none"

    types = {t.tier_type for t in tiers}
    has_pref = "pref_accrual" in types
    has_catchup = "catch_up" in types
    has_split = "residual_split" in types or any(
        t.tier_type == "hurdle_split" and t.split_lp_pct is not None for t in tiers
    )
    irr_tiers = [t for t in tiers if t.hurdle_type == "IRR"]
    em_tiers = [t for t in tiers if t.hurdle_type == "EM"]

    if has_pref and has_catchup and has_split:
        return "pref_catchup_split"
    if has_pref and has_split and not has_catchup:
        return "pref_then_split"
    if irr_tiers and em_tiers:
        return "hybrid"
    if irr_tiers and not has_pref:
        return "tiered_irr_hurdle"
    if em_tiers and not irr_tiers and not has_pref:
        return "em_hurdle"
    return "custom"


def _detect_sponsor_coinvest(
    ws_values: Worksheet,
) -> Tuple[Optional[float], Optional[str]]:
    """Scan first MAX_COINVEST_SCAN_ROWS for a sponsor co-invest % label."""
    last_row = min(MAX_COINVEST_SCAN_ROWS, ws_values.max_row or 0)
    last_col = min(4, ws_values.max_column or 0)
    for row in range(1, last_row + 1):
        for col in range(1, last_col + 1):
            v = ws_values.cell(row=row, column=col).value
            if not isinstance(v, str):
                continue
            lower = v.lower()
            if not any(re.search(p, lower) for p in COINVEST_PATTERNS):
                continue
            for c in range(col + 1, col + MAX_VALUE_SCAN_COLS + 1):
                val = ws_values.cell(row=row, column=c).value
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    if 0 < val < COINVEST_MAX:
                        return float(val), _coord(ws_values, row, c)
    return None, None


def _build_findings(
    waterfall_type: str,
    tiers: List[WaterfallTier],
    pref_rate: Optional[float],
) -> List[Dict]:
    """Surface anything Phase 5 should know about before replicating."""
    findings: List[Dict] = []

    if waterfall_type == "custom":
        findings.append({
            "severity": "medium",
            "category": "classification",
            "message": (
                "Waterfall structure does not match a standard pattern. "
                "Phase 5 replication will need bespoke logic — review tier "
                "list against the source sheet before replication."
            ),
        })

    if pref_rate is not None and not (PREF_RATE_MIN <= pref_rate <= PREF_RATE_MAX):
        findings.append({
            "severity": "low",
            "category": "data_quality",
            "message": (
                f"Pref rate {pref_rate:.2%} falls outside typical "
                f"{PREF_RATE_MIN:.0%}–{PREF_RATE_MAX:.0%} range. Verify "
                "label match — could be a different rate field."
            ),
        })

    # Tier count sanity
    if 0 < len(tiers) < 2 and waterfall_type != "none":
        findings.append({
            "severity": "low",
            "category": "classification",
            "message": (
                f"Only {len(tiers)} tier detected. Most CRE waterfalls "
                "have 2-4 tiers. Review whether tier labels in the sheet "
                "use non-standard naming."
            ),
        })

    # Compounding gap on pref tier
    pref_tier = next((t for t in tiers if t.tier_type == "pref_accrual"), None)
    if pref_tier and pref_tier.pref_rate and not pref_tier.pref_compounding:
        findings.append({
            "severity": "low",
            "category": "data_quality",
            "message": (
                "Pref rate detected but compounding convention could not "
                "be inferred from formulas. Phase 5 will default to monthly "
                "compounding — confirm against the source model."
            ),
        })

    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Public entrypoint
# ─────────────────────────────────────────────────────────────────────────────


def classify(values_wb: Workbook, formulas_wb: Workbook) -> Dict:
    """
    Phase 4 entry point. Returns a WaterfallClassification as a dict.

    Strategy:
      1. Find candidate waterfall sheet(s) by name.
      2. If none -> waterfall_type = "none".
      3. For each candidate, scan first MAX_LABEL_SCAN_ROWS rows for tier
         labels. Pick the candidate that yields the most tiers.
      4. For each tier, read adjacent cells for rate / split / hurdle data.
      5. Roll up tier list to a waterfall_type enum.
      6. Detect sponsor co-invest %.
      7. Build findings list (data quality, classification gaps).
      8. Return structured classification.
    """
    candidates = _find_waterfall_sheets(values_wb)
    if not candidates:
        return WaterfallClassification(
            waterfall_type="none",
            tier_count=0,
            sheet_name=None,
            rationale=(
                "No sheet matches waterfall keywords "
                "(waterfall, promote, distribution, partnership, splits, etc.). "
                "Either this is not a financial model or the sheet uses non-standard naming."
            ),
        ).to_dict()

    # Pick the candidate that yields the most tiers
    best_sheet_name: Optional[str] = None
    best_tiers: List[WaterfallTier] = []
    for sheet_name in candidates:
        if sheet_name not in formulas_wb.sheetnames:
            # Defensive: should not happen since both wbs come from the same file
            continue
        ws_values = values_wb[sheet_name]
        ws_formulas = formulas_wb[sheet_name]
        tiers = _scan_sheet_for_tiers(ws_values, ws_formulas)
        if len(tiers) > len(best_tiers):
            best_sheet_name = sheet_name
            best_tiers = tiers

    if not best_tiers:
        # Found a candidate sheet but couldn't parse tier structure
        first = candidates[0]
        return WaterfallClassification(
            waterfall_type="custom",
            tier_count=0,
            sheet_name=first,
            rationale=(
                f"Found waterfall sheet '{first}' but no recognizable tier "
                "labels (Pref / Catch-up / Hurdle / Split / Residual). "
                "Manual review required before Phase 5 replication."
            ),
            findings=[{
                "severity": "high",
                "category": "classification",
                "message": (
                    "Waterfall sheet identified but tier structure could not "
                    "be parsed automatically."
                ),
            }],
        ).to_dict()

    ws_values = values_wb[best_sheet_name]
    overall_type = _detect_overall_type(best_tiers)
    coinvest, coinvest_ref = _detect_sponsor_coinvest(ws_values)

    # Pull pref data from pref_accrual tier (if present)
    pref_rate = None
    pref_compounding = None
    for t in best_tiers:
        if t.tier_type == "pref_accrual":
            pref_rate = t.pref_rate
            pref_compounding = t.pref_compounding
            break

    # Hurdle type rollup
    hurdle_types = {t.hurdle_type for t in best_tiers if t.hurdle_type}
    hurdle_types.discard("pref_rate")  # pref handled separately
    if hurdle_types == {"IRR"}:
        rollup_hurdle = "IRR"
    elif hurdle_types == {"EM"}:
        rollup_hurdle = "EM"
    elif "IRR" in hurdle_types and "EM" in hurdle_types:
        rollup_hurdle = "IRR_EM"
    else:
        rollup_hurdle = next(iter(hurdle_types), None)

    findings = _build_findings(overall_type, best_tiers, pref_rate)

    source_cells: Dict[str, str] = {}
    if coinvest_ref:
        source_cells["sponsor_coinvest"] = coinvest_ref

    return WaterfallClassification(
        waterfall_type=overall_type,
        tier_count=len(best_tiers),
        sheet_name=best_sheet_name,
        tiers=best_tiers,
        pref_rate=pref_rate,
        pref_compounding=pref_compounding,
        hurdle_type=rollup_hurdle,
        sponsor_coinvest_pct=coinvest,
        source_cells=source_cells,
        findings=findings,
        rationale=(
            f"Detected {len(best_tiers)}-tier '{overall_type}' waterfall on "
            f"sheet '{best_sheet_name}'."
        ),
    ).to_dict()
