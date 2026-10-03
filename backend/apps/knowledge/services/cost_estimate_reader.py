"""
Read a contractor's cost estimate and compare its line items with the cost library.

Why this exists
---------------
A cost estimate (a bid, an engineer's estimate, a take-off) is a list of unit
prices and quantities. The staging tray has always recognised one — "cost
estimate", "contractor bid", "unit cost" in the file name routes it to the cost
library — but that route was a stub, so the prices on it never reached the
library and nobody was told. Gregg, 2026-09-29: an estimate with "lots of unit
prices and quantities" should be read, checked against what the library already
holds, and the new prices offered for adding.

What it does
------------
1. `read_cost_estimate` finds the header row (Description / Unit / Unit Price /
   Quantity, in whatever words the sheet uses) and reads every row under it that
   carries a unit price. Section headings ("Earthwork", "Paving") are carried
   onto the rows beneath them. Subtotals, totals and placeholder rows ("Item 1"
   with no price) are skipped.
2. `compare_with_library` matches each row to the library by name and unit, and
   classes it as already there at the same price, there at a different price, or
   not there at all.

Nothing here writes. Adding to the library is a separate, confirmed step.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from difflib import SequenceMatcher
from typing import Any, Iterable, Optional

__all__ = [
    "EstimateLine",
    "read_cost_estimate",
    "read_rows",
    "compare_with_library",
    "normalize_uom",
]

# ── header detection ─────────────────────────────────────────────────────────

_DESC = re.compile(r"^(description|item|item description|scope|work item|bid item)$", re.I)
_UOM = re.compile(r"^(unit|units|uom|u/m|um)$", re.I)
_PRICE = re.compile(r"^(unit\s*(price|cost|rate)|price|rate|\$/unit|cost/unit)$", re.I)
_QTY = re.compile(r"^(qty|quantity|quant\.?|est\.?\s*qty)$", re.I)
_TOTAL = re.compile(r"^(total|amount|extended|ext\.?\s*(price|cost)?|cost)$", re.I)

_SKIP_DESC = re.compile(r"^(sub-?total|total\b|grand total|contingency)", re.I)
#: "Item 1", "Item 2" — a placeholder label; the real name is the section above
#: it plus whatever note sits beside it ("Dust Control – Inspection").
_PLACEHOLDER = re.compile(r"^item\s*\d+$", re.I)

#: Units written several ways on real estimates. "LFS" appears on the
#: CopperNail estimate for linear feet of striping.
_UOM_ALIASES = {
    "LFS": "LF", "LIN FT": "LF", "L.F.": "LF", "FT": "LF",
    "S.Y.": "SY", "SQ YD": "SY", "SQYD": "SY",
    "S.F.": "SF", "SQ FT": "SF", "SQFT": "SF",
    "C.Y.": "CY", "CU YD": "CY",
    "L.S.": "LS", "LUMP": "LS", "LUMP SUM": "LS",
    "EACH": "EA", "E.A.": "EA",
    "MONTH": "MO", "MOS": "MO",
    "AC": "AC", "ACRE": "AC", "ACRES": "AC",
}


def normalize_uom(uom: Any) -> Optional[str]:
    if uom is None:
        return None
    u = str(uom).strip().upper()
    if not u:
        return None
    return _UOM_ALIASES.get(u, u)


def _num(v: Any) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", "").replace("$", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _text(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (int, float)):
        return ""
    return str(v).strip()


@dataclass
class EstimateLine:
    row: int                     # 1-based row number on the sheet
    sheet: str
    section: Optional[str]
    description: str
    uom: Optional[str]
    unit_price: float
    quantity: Optional[float]
    total: Optional[float]
    note: Optional[str] = None
    #: The name used for matching and for the library: the description, with the
    #: section prefixed when the description alone says too little
    #: ("Major Arterial" under CONSTRUCTION STAKING).
    name: str = ""
    #: Plain-English doubts about the row, for the person reviewing it.
    checks: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def _find_header(rows: list[list[Any]]) -> Optional[tuple[int, dict[str, int]]]:
    for i, row in enumerate(rows[:80]):
        cols: dict[str, int] = {}
        for j, v in enumerate(row):
            t = _text(v)
            if not t:
                continue
            if "desc" not in cols and _DESC.match(t):
                cols["desc"] = j
            elif "price" not in cols and _PRICE.match(t):
                cols["price"] = j
            elif "uom" not in cols and _UOM.match(t):
                cols["uom"] = j
            elif "qty" not in cols and _QTY.match(t):
                cols["qty"] = j
            elif "total" not in cols and _TOTAL.match(t):
                cols["total"] = j
        if {"desc", "price"} <= cols.keys():
            return i, cols
    return None


def read_rows(rows: list[list[Any]], sheet: str = "Sheet1") -> list[EstimateLine]:
    """Read line items from one sheet's rows (a list of lists of cell values)."""
    found = _find_header(rows)
    if not found:
        return []
    start, cols = found
    lines: list[EstimateLine] = []
    section: Optional[str] = None
    desc_col = cols["desc"]

    for i in range(start + 1, len(rows)):
        row = rows[i]

        def cell(key: str) -> Any:
            j = cols.get(key)
            return row[j] if j is not None and j < len(row) else None

        # A repeated header row further down the sheet — skip it.
        if _DESC.match(_text(cell("desc"))) and _PRICE.match(_text(cell("price"))):
            continue

        # The description may sit one column left or right of the header's
        # column when a sheet indents its sub-items.
        desc = _text(cell("desc"))
        if not desc:
            for j in (desc_col - 1, desc_col + 1):
                if 0 <= j < len(row) and j not in cols.values():
                    desc = _text(row[j])
                    if desc:
                        break
        price = _num(cell("price"))
        uom = normalize_uom(cell("uom"))
        qty = _num(cell("qty"))
        total = _num(cell("total"))

        if not desc:
            continue
        if _SKIP_DESC.match(desc) or "subtotal" in desc.lower():
            continue
        if price is None and uom is None and qty is None:
            # A heading row: nothing but a name.
            section = desc
            continue
        if price is None or price <= 0:
            continue

        note = None
        extra = [
            _text(v) for j, v in enumerate(row)
            if j not in cols.values() and j != desc_col and _text(v) and _text(v) != desc
        ]
        if extra:
            note = "; ".join(extra)[:200]

        sec = section.title() if section and section.isupper() else section
        if _PLACEHOLDER.match(desc):
            name = " – ".join(p for p in (sec, note) if p) or desc
        elif sec and len(_norm_name(desc).split()) <= 2 and _norm_name(sec) not in _norm_name(desc):
            name = f"{sec} – {desc}"
        else:
            name = desc

        checks = []
        if uom and uom != "LS" and qty == 1 and total is not None and abs(total - price) < 0.01 and price >= 5000:
            checks.append(f"Unit says {uom} but the quantity is 1 at {price:,.0f} — reads like a lump sum.")
        if qty in (None, 0):
            checks.append("No quantity on the estimate — the unit price stands on its own.")
        if total is not None and qty and abs(round(price * qty, 2) - total) > max(1.0, 0.005 * total):
            checks.append(f"Unit price × quantity is {price * qty:,.2f}, but the row's total is {total:,.2f}.")

        lines.append(EstimateLine(
            row=i + 1, sheet=sheet, section=section, description=desc,
            uom=uom, unit_price=round(price, 4), quantity=qty,
            total=round(total, 2) if total is not None else None, note=note,
            name=name, checks=checks,
        ))
    return lines


def read_cost_estimate(path: str) -> list[EstimateLine]:
    """Read every sheet of a workbook (.xlsx / .xlsm) or a .csv file."""
    lower = path.lower()
    if lower.endswith(".csv"):
        import csv
        with open(path, newline="", encoding="utf-8", errors="ignore") as fh:
            rows = [list(r) for r in csv.reader(fh)]
        return read_rows(rows, "csv")

    from openpyxl import load_workbook
    wb = load_workbook(path, data_only=True, read_only=True)
    out: list[EstimateLine] = []
    for ws in wb.worksheets:
        rows = [list(r) for r in ws.iter_rows(values_only=True)]
        out.extend(read_rows(rows, ws.title))
    wb.close()
    return out


# ── comparison with the library ─────────────────────────────────────────────

_NOISE = re.compile(r"\b(mag|std|stdd|dtl|det|detail|per|standard|the|and|of|to|&)\b", re.I)


def _norm_name(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[\"'’()\[\],.:;/\\–-]", " ", s)
    s = _NOISE.sub(" ", s)
    words = [w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w
             for w in s.split()]
    return " ".join(words)


_SPEC = re.compile(r"\d+[a-z]?")


def _spec_numbers(s: str) -> set:
    """Sizes and detail numbers — 4" AC on 10" ABC is not 5" AC on 7" ABC."""
    return set(_SPEC.findall(_norm_name(s)))


def _similarity(a: str, b: str) -> float:
    na, nb = _norm_name(a), _norm_name(b)
    if not na or not nb:
        return 0.0
    sa, sb = _spec_numbers(a), _spec_numbers(b)
    if sa and sb and sa != sb:
        # Both state a size or a detail number, and they differ: a different item.
        return 0.0
    ratio = SequenceMatcher(None, na, nb).ratio()
    ta, tb = set(na.split()), set(nb.split())
    overlap = len(ta & tb) / max(1, min(len(ta), len(tb)))
    return max(ratio, 0.5 * ratio + 0.5 * overlap)


#: Below this a library item is not the same thing, however close the price.
MATCH_THRESHOLD = 0.72
#: Within this fraction the price is the same price.
SAME_PRICE_TOLERANCE = 0.01


def compare_with_library(
    lines: Iterable[EstimateLine],
    library: Iterable[dict],
) -> list[dict]:
    """
    Class every estimate line against the library.

    `library` rows need item_id, item_name, default_uom_code, typical_mid_value,
    and may carry source, as_of_date, market_geography, category_name.

    Status per line:
      in_library        — a same-unit item with the same name at the same price
      different_price   — a same-unit item with the same name at another price
      new               — nothing in the library is the same item in the same unit
    """
    lib = list(library)
    results = []
    for line in lines:
        best, best_score = None, 0.0
        for item in lib:
            if normalize_uom(item.get("default_uom_code")) != line.uom:
                continue
            score = _similarity(line.name or line.description, item.get("item_name") or "")
            if score > best_score:
                best, best_score = item, score
        entry = {**line.to_dict(), "status": "new", "match": None}
        if best is not None and best_score >= MATCH_THRESHOLD:
            lib_price = float(best.get("typical_mid_value") or 0)
            same = lib_price > 0 and abs(lib_price - line.unit_price) <= SAME_PRICE_TOLERANCE * lib_price
            entry["status"] = "in_library" if same else "different_price"
            entry["match"] = {
                "item_id": best.get("item_id"),
                "item_name": best.get("item_name"),
                "uom": best.get("default_uom_code"),
                "unit_price": lib_price,
                "source": best.get("source"),
                "as_of_date": str(best.get("as_of_date")) if best.get("as_of_date") else None,
                "category": best.get("category_name"),
                "similarity": round(best_score, 2),
            }
        results.append(entry)
    return results
