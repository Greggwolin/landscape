"""
Phase 1 — Structural scan.

Inventories the workbook so downstream phases can reason about scope:
  - Sheet list with dimensions
  - Named ranges
  - External links (risk flag — breaks portability)
  - Merged cell ranges (cosmetic, but can confuse formula auditors)
  - Hidden sheets (may hide material logic)

Pure read, no writes. Returns a dict.
"""

from typing import Dict, List
from openpyxl.workbook.workbook import Workbook


def _sheet_inventory(values_wb: Workbook) -> List[Dict]:
    out = []
    for sheet in values_wb.worksheets:
        dims = sheet.dimensions  # e.g. 'A1:Z500'
        merged = len(sheet.merged_cells.ranges) if sheet.merged_cells else 0
        out.append(
            {
                "name": sheet.title,
                "dimensions": dims,
                "max_row": sheet.max_row,
                "max_col": sheet.max_column,
                "merged_ranges": merged,
                "hidden": sheet.sheet_state != "visible",
            }
        )
    return out


def _named_ranges(values_wb: Workbook) -> List[Dict]:
    out = []
    try:
        for name in values_wb.defined_names:
            defn = values_wb.defined_names[name]
            out.append(
                {
                    "name": name,
                    "value": str(defn.value) if defn and defn.value else None,
                }
            )
    except Exception:
        # openpyxl API has varied across versions; swallow rather than crash.
        pass
    return out


def _external_links(values_wb: Workbook) -> List[str]:
    """
    Detect external workbook references. These are portability red flags —
    a [Filename.xlsx] prefix in any formula means the workbook depends on
    another file we don't have.
    """
    hits: List[str] = []
    try:
        for link in getattr(values_wb, "_external_links", []) or []:
            target = getattr(link, "file_link", None)
            target_str = getattr(target, "Target", None) if target else None
            if target_str:
                hits.append(target_str)
    except Exception:
        pass
    return hits


def scan(values_wb: Workbook, formulas_wb: Workbook) -> Dict:
    sheets = _sheet_inventory(values_wb)
    named = _named_ranges(values_wb)
    ext = _external_links(formulas_wb)
    return {
        "sheets": sheets,
        "sheet_count": len(sheets),
        "hidden_sheet_count": sum(1 for s in sheets if s["hidden"]),
        "named_ranges": named,
        "named_range_count": len(named),
        "external_links": ext,
        "external_link_count": len(ext),
    }
