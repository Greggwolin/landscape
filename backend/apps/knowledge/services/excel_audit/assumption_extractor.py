"""
Phase 3 — Assumption extraction.

Walks the workbook for labeled input values and writes them to
`ai_extraction_staging` so the Ingestion Workbench can review and
commit them into project tables (or knowledge).

Extraction pattern (MVP):
  - Scan every non-formula numeric / date / percent cell whose immediate
    left neighbor (or same cell with colon-suffixed text-left neighbor)
    is a non-empty text label.
  - `extraction_type = 'excel_audit_assumption'`
  - `target_table = 'assumption_unmapped'` (workbench / future field-registry
    matcher will map to real DB targets at approve-time)
  - `target_field` = cleaned snake_case of the label
  - `source_text` = Sheet!Cell reference + first 200 chars of context
  - `confidence_score` = heuristic based on label clarity

Writes are scoped by `project_id`. For pre-project chats (no project_id),
skip the write and return the extractions inline so Landscaper can
surface them in chat. The workbench will pick them up once the user
promotes the chat to a project.

Returns a summary dict; staging_ids is empty when project_id is None.
"""

import json
import logging
import re
from typing import Dict, List, Optional, Tuple

from django.db import connection
from openpyxl.workbook.workbook import Workbook

logger = logging.getLogger(__name__)


LABEL_CLEAN_RE = re.compile(r"[^a-z0-9]+")
PERCENT_RE = re.compile(r"%$")
# A "label" cell: reasonable length, mostly text, non-numeric
MIN_LABEL_LEN = 2
MAX_LABEL_LEN = 80
MAX_EXTRACTIONS_PER_WORKBOOK = 500


def _is_label(val) -> bool:
    if not isinstance(val, str):
        return False
    s = val.strip()
    if len(s) < MIN_LABEL_LEN or len(s) > MAX_LABEL_LEN:
        return False
    if s in ("$", "%", "-", "#"):
        return False
    # Contains at least one letter
    if not any(c.isalpha() for c in s):
        return False
    return True


def _is_value(val) -> bool:
    if isinstance(val, bool):
        return False
    if isinstance(val, (int, float)):
        return True
    # Dates come back as datetime objects
    from datetime import date, datetime
    if isinstance(val, (date, datetime)):
        return True
    # Percent or dollar strings
    if isinstance(val, str):
        s = val.strip()
        if s.endswith("%") and s[:-1].replace(".", "").replace("-", "").isdigit():
            return True
    return False


def _snake(label: str) -> str:
    s = LABEL_CLEAN_RE.sub("_", label.lower()).strip("_")
    return s[:60] or "unnamed"


def _serialize(val):
    from datetime import date, datetime
    if isinstance(val, (date, datetime)):
        return val.isoformat()
    return val


def _cell_ref(sheet_name: str, coord: str) -> str:
    needs_quote = any(c in sheet_name for c in " -") or (sheet_name and sheet_name[0].isdigit())
    q = f"'{sheet_name}'" if needs_quote else sheet_name
    return f"{q}!{coord}"


def _scan_pairs(values_wb: Workbook) -> List[Dict]:
    """
    Extract (label, value, ref) triples using label-left-of-value heuristic.
    """
    out: List[Dict] = []
    for sheet in values_wb.worksheets:
        if sheet.sheet_state != "visible":
            continue
        for row in sheet.iter_rows(values_only=False):
            # Walk row, look for label -> value transitions
            for idx, cell in enumerate(row):
                if not _is_value(cell.value):
                    continue
                label_cell = None
                # Same-row, left neighbor
                if idx > 0 and _is_label(row[idx - 1].value):
                    label_cell = row[idx - 1]
                # Fallback: two to the left if the immediate left is also a value/blank
                elif idx > 1 and _is_label(row[idx - 2].value) and not _is_value(row[idx - 1].value):
                    label_cell = row[idx - 2]
                if not label_cell:
                    continue
                label = str(label_cell.value).strip().rstrip(":").rstrip()
                out.append(
                    {
                        "label": label,
                        "field_key": _snake(label),
                        "value": _serialize(cell.value),
                        "ref": _cell_ref(sheet.title, cell.coordinate),
                        "sheet": sheet.title,
                    }
                )
                if len(out) >= MAX_EXTRACTIONS_PER_WORKBOOK:
                    return out
    return out


def _confidence(item: Dict) -> float:
    label = item["label"]
    # Clear labels (ends with colon in source, reasonable length, known terms) get higher conf
    score = 0.4
    if ":" in label:
        score += 0.1
    if len(label.split()) <= 4:
        score += 0.1
    lower = label.lower()
    for kw in (
        "rate", "irr", "cap rate", "discount", "ltv", "ltc", "noi", "gross",
        "vacancy", "growth", "term", "hold", "exit", "pref", "promote",
        "construction", "interest", "absorption", "price",
    ):
        if kw in lower:
            score += 0.2
            break
    return min(score, 0.95)


def extract(
    values_wb: Workbook,
    doc_id: int,
    project_id: Optional[int] = None,
    write_to_staging: bool = True,
) -> Dict:
    """
    Extract assumptions and (optionally) write to ai_extraction_staging.

    Args:
        values_wb:       openpyxl workbook loaded with data_only=True
        doc_id:          core_doc.doc_id
        project_id:      landscape project id. If None, no staging writes.
        write_to_staging: explicit flag; if False, returns extractions only.

    Returns:
        {
          "extractions": [ {label, field_key, value, ref, sheet, confidence} ],
          "extraction_count": int,
          "staging_ids": [ids written, empty if project_id is None],
          "wrote_to_staging": bool,
        }
    """
    pairs = _scan_pairs(values_wb)
    for p in pairs:
        p["confidence"] = _confidence(p)

    staging_ids: List[int] = []
    wrote = False

    if write_to_staging and project_id and pairs:
        try:
            with connection.cursor() as cursor:
                for p in pairs:
                    cursor.execute(
                        """
                        INSERT INTO landscape.ai_extraction_staging (
                            project_id,
                            doc_id,
                            field_key,
                            target_table,
                            target_field,
                            extracted_value,
                            extraction_type,
                            source_text,
                            confidence_score,
                            status
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
                        RETURNING extraction_id
                        """,
                        [
                            project_id,
                            doc_id,
                            p["field_key"],
                            "assumption_unmapped",
                            p["field_key"],
                            json.dumps(p["value"]),
                            "excel_audit_assumption",
                            f"{p['ref']} :: {p['label']}",
                            p["confidence"],
                        ],
                    )
                    staging_ids.append(cursor.fetchone()[0])
            wrote = True
        except Exception as e:
            logger.exception(
                "excel_audit.assumption_extract staging write failed doc=%s project=%s",
                doc_id,
                project_id,
            )
            # Do not raise — return extractions inline so the caller can still use them
            wrote = False

    return {
        "extractions": pairs,
        "extraction_count": len(pairs),
        "staging_ids": staging_ids,
        "wrote_to_staging": wrote,
    }
