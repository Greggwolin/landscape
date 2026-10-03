"""
Cost estimate → cost library, for Landscaper.

Gregg, 2026-09-29: a contractor's cost estimate "had lots of unit prices and
quantities so LS should have analyzed the contents, determined if the database
was already populated with these line-item costs and if it should add the items
to the cost database."

Two tools:

  review_cost_estimate(doc_id)
      Reads the estimate's line items and compares each with the cost library:
      already there at the same price, there at a different price, or new.
      Read-only.

  add_cost_estimate_items(doc_id, rows, source, as_of_date, confirm)
      Adds the rows the person chose. Never overwrites a library price: a row
      whose item is already there at another price is added as a further price
      point, carrying its own source and date — the library already keeps one
      row per bid (six "Mobilization" rows from three contractors). Refuses to
      run without confirm=true, and skips a row identical to one already stored,
      so running it twice adds nothing twice.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from django.db import connection

from ..tool_executor import register_tool, _log_system_activity
from apps.knowledge.services.cost_estimate_reader import (
    compare_with_library,
    normalize_uom,
    read_cost_estimate,
)

logger = logging.getLogger(__name__)

_READABLE = (".xlsx", ".xlsm", ".csv")

#: Estimate section words → the library's own category names. Only categories
#: the library already uses; anything unmapped is left without a category rather
#: than guessed.
_SECTION_TO_CATEGORY = (
    (("earthwork", "grading", "excavation", "site prep"), "Grading / Site Prep"),
    (("paving", "asphalt", "pavement"), "Paving"),
    (("staking", "survey"), "Staking"),
    (("testing",), "Testing"),
    (("water",), "Water"),
    (("sewer",), "Sewer"),
    (("storm", "drainage"), "Storm Drain"),
    (("concrete", "curb", "sidewalk"), "Concrete"),
    (("dry util", "electric", "gas", "telecom"), "Dry Utilities"),
    (("landscap",), "Landscape"),
    (("wall",), "Walls"),
    (("permit",), "Permits"),
    (("bond",), "Bonds"),
)


def _doc(doc_id: int) -> Optional[dict]:
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT d.doc_id, d.doc_name, d.storage_uri, d.mime_type, d.project_id,
                   p.jurisdiction_city, p.jurisdiction_state
              FROM landscape.core_doc d
              LEFT JOIN landscape.tbl_project p ON p.project_id = d.project_id
             WHERE d.doc_id = %s AND d.deleted_at IS NULL
            """,
            [doc_id],
        )
        row = cur.fetchone()
    if not row:
        return None
    keys = ["doc_id", "doc_name", "storage_uri", "mime_type", "project_id", "city", "state"]
    return dict(zip(keys, row))


def _library() -> list[dict]:
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT i.item_id, i.item_name, i.default_uom_code, i.typical_mid_value,
                   i.source, i.as_of_date, i.market_geography, i.category_id,
                   c.category_name
              FROM landscape.core_unit_cost_item i
              LEFT JOIN landscape.core_unit_cost_category c ON c.category_id = i.category_id
             WHERE i.is_active IS NOT FALSE
            """
        )
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


def _read(doc: dict):
    """Download and read the estimate. Returns (lines, error)."""
    name = (doc.get("doc_name") or "").lower()
    if not name.endswith(_READABLE):
        return None, (
            "Only spreadsheet estimates (.xlsx, .xlsm, .csv) can be read line by line "
            "so far. A PDF estimate is not yet supported."
        )
    from apps.knowledge.services.text_extraction import _download_to_temp
    path = None
    try:
        path = _download_to_temp(doc["storage_uri"], doc.get("mime_type") or "")
        ext = os.path.splitext(name)[1]
        if path and not path.lower().endswith(ext):
            new_path = path + ext
            os.rename(path, new_path)
            path = new_path
        return read_cost_estimate(path), None
    except Exception as exc:  # pragma: no cover - network / file errors
        logger.warning("cost estimate read failed for doc %s: %s", doc.get("doc_id"), exc)
        return None, f"The file could not be read: {exc}"
    finally:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass


def _geography(doc: dict) -> Optional[str]:
    if doc.get("city") and doc.get("state"):
        return f"{doc['city']}, {doc['state']}"
    return None


def _category_for(entry: dict, categories: dict[str, int]) -> Optional[int]:
    match = entry.get("match") or {}
    if match.get("category") and match["category"] in categories:
        return categories[match["category"]]
    text = f"{entry.get('section') or ''} {entry.get('name') or ''}".lower()
    for words, cat in _SECTION_TO_CATEGORY:
        if any(w in text for w in words) and cat in categories:
            return categories[cat]
    return None


@register_tool("review_cost_estimate")
def review_cost_estimate(tool_input: dict, project_id: int = None, **kwargs) -> dict:
    doc_id = tool_input.get("doc_id")
    try:
        doc_id = int(doc_id)
    except (TypeError, ValueError):
        return {"success": False, "error": "doc_id is required"}
    doc = _doc(doc_id)
    if not doc:
        return {"success": False, "error": f"Document {doc_id} not found."}

    lines, err = _read(doc)
    if err:
        return {"success": False, "error": err,
                "instruction": "Tell the user plainly why the estimate could not be read. Do not invent line items."}
    if not lines:
        return {
            "success": True, "doc_id": doc_id, "doc_name": doc["doc_name"], "line_count": 0,
            "instruction": (
                "No priced line items were found — no header row with a description and a unit "
                "price. Say so; do not guess at the contents."
            ),
        }

    compared = compare_with_library(lines, _library())
    counts = {"new": 0, "different_price": 0, "in_library": 0}
    for e in compared:
        counts[e["status"]] += 1

    compact = []
    for e in compared:
        m = e.get("match") or {}
        compact.append({
            "row": e["row"],
            "item": e["name"],
            "unit": e["uom"],
            "unit_price": e["unit_price"],
            "quantity": e["quantity"],
            "status": e["status"],
            "library_item": m.get("item_name"),
            "library_price": m.get("unit_price"),
            "library_source": m.get("source"),
            "library_as_of": m.get("as_of_date"),
            "checks": e.get("checks") or [],
        })

    return {
        "success": True,
        "doc_id": doc_id,
        "doc_name": doc["doc_name"],
        "market_geography": _geography(doc),
        "line_count": len(compared),
        "counts": counts,
        "lines": compact,
        "instruction": (
            "Show the user a table of these lines grouped by status — New, Different price "
            "(show both prices), Already in library — with the checks beside the rows they "
            "concern. Use only the figures above. Then ask which rows to add; recommend the "
            "New and Different-price rows. Before adding, ask who priced it (the contractor or "
            "engineer — the source) and the date of the pricing unless the file name or the "
            "user already stated them; never guess either. A different-price row is ADDED as "
            "another price point, never written over the library price — say so. Call "
            "add_cost_estimate_items only after the user says yes, with confirm=true."
        ),
    }


@register_tool("add_cost_estimate_items", is_mutation=True)
def add_cost_estimate_items(tool_input: dict, project_id: int = None, **kwargs) -> dict:
    doc_id = tool_input.get("doc_id")
    try:
        doc_id = int(doc_id)
    except (TypeError, ValueError):
        return {"success": False, "error": "doc_id is required"}
    if tool_input.get("confirm") is not True:
        return {
            "success": False, "error": "not_confirmed",
            "instruction": "Ask the user to confirm which rows to add, then call again with confirm=true.",
        }
    source = (tool_input.get("source") or "").strip()
    as_of = (tool_input.get("as_of_date") or "").strip() or None
    if not source:
        return {"success": False, "error": "source_required",
                "instruction": "Ask the user who priced this estimate (contractor or engineer)."}

    doc = _doc(doc_id)
    if not doc:
        return {"success": False, "error": f"Document {doc_id} not found."}
    lines, err = _read(doc)
    if err:
        return {"success": False, "error": err}

    library = _library()
    compared = compare_with_library(lines, library)
    wanted = tool_input.get("rows")
    if wanted in (None, "new_and_changed"):
        chosen = [e for e in compared if e["status"] in ("new", "different_price")]
    else:
        try:
            wanted_set = {int(r) for r in wanted}
        except (TypeError, ValueError):
            return {"success": False, "error": "rows must be a list of row numbers or 'new_and_changed'"}
        chosen = [e for e in compared if e["row"] in wanted_set]
    if not chosen:
        return {"success": True, "added": [], "skipped": [], "instruction": "Nothing was selected to add."}

    categories = {r["category_name"]: r["category_id"] for r in library if r.get("category_name")}
    geography = tool_input.get("market_geography") or _geography(doc)
    added, skipped = [], []

    with connection.cursor() as cur:
        for e in chosen:
            uom = normalize_uom(e["uom"])
            cur.execute(
                """
                SELECT item_id FROM landscape.core_unit_cost_item
                 WHERE lower(item_name) = lower(%s)
                   AND coalesce(default_uom_code, '') = coalesce(%s, '')
                   AND typical_mid_value = %s
                   AND coalesce(source, '') = %s
                 LIMIT 1
                """,
                [e["name"], uom, e["unit_price"], source],
            )
            dup = cur.fetchone()
            if dup:
                skipped.append({"row": e["row"], "item": e["name"], "reason": f"already stored as item {dup[0]}"})
                continue
            cur.execute(
                """
                INSERT INTO landscape.core_unit_cost_item
                    (category_id, item_name, default_uom_code, typical_mid_value, quantity,
                     market_geography, source, as_of_date, created_from_project_id,
                     created_from_ai, is_active, usage_count, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, TRUE, 0, NOW(), NOW())
                RETURNING item_id
                """,
                [_category_for(e, categories), e["name"], uom, e["unit_price"], e["quantity"],
                 geography, source, as_of, doc.get("project_id") or project_id],
            )
            added.append({"row": e["row"], "item": e["name"], "item_id": cur.fetchone()[0],
                          "unit": uom, "unit_price": e["unit_price"], "status_before": e["status"]})

    if added:
        _log_system_activity(
            "core_unit_cost_item", "create", len(added),
            f"From cost estimate {doc['doc_name']} (doc {doc_id}), source {source}",
        )
    return {
        "success": True,
        "added": added,
        "skipped": skipped,
        "instruction": (
            f"Tell the user {len(added)} item(s) were added to the cost library"
            + (f" and {len(skipped)} were already there" if skipped else "")
            + ". Name them briefly. Existing library prices were not changed."
        ),
    }
