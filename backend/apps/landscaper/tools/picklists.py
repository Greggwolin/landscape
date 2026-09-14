"""The platform's OWN lists, for any surface that offers a choice.

Gregg, 2026-09-14: *"any fields where a benchmark is available need to show the
established picklist that exists for that item (regardless of the artifact)."*

The word that matters is *established*. These lists already exist, are already
administered on screen (Admin → Preferences), and are already the thing a person
expects to see. A surface that offers its own list instead — or free text where a
list exists — is how a field ends up holding a value the rest of the app does not
recognise. This module is the one place a builder asks for them, so a new surface
gets the right list by calling rather than by remembering.

WHICH UNITS TABLE
-----------------
``landscape.tbl_measures`` is the one the Units of Measure admin screen manages
(``/api/admin/measures``) and the one carrying ``property_types``, so a land deal
is offered Front Foot and Acre while a multifamily deal is offered Unit and
Parking Stall. ``core_fin_uom`` is a SECOND, older list with price-prefixed codes
($/FF, $/Acre) that the budget still draws from; the two disagree and reconciling
them is Gregg's call, not something to paper over here. The pricing register asks
for the administered list — the one he can see and change.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from django.db import connection

logger = logging.getLogger(__name__)


def _project_property_type(project_id: int) -> Optional[str]:
    """The project's type as ``tbl_measures.property_types`` spells it."""
    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT UPPER(COALESCE(project_type_code, \'\')) '
            'FROM landscape.tbl_project WHERE project_id = %s',
            [project_id],
        )
        row = cursor.fetchone()
    code = (row[0] if row else '') or ''
    return {
        'LAND': 'land',
        'MF': 'multifamily',
        'OFF': 'office',
        'RET': 'retail',
        'IND': 'office',   # tbl_measures has no industrial list of its own
        'MXU': 'retail',
    }.get(code)


def measure_options(project_id: int, also_allow: Optional[List[str]] = None) -> List[Dict[str, str]]:
    """The units this project may use, as picklist options.

    ``also_allow`` keeps values already stored on the rows being rendered even
    when they are not on the administered list — a card must never open offering
    to change a unit just because the list moved on. Those are labelled so the
    difference is visible rather than silent.
    """
    property_type = _project_property_type(project_id)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT measure_code, measure_name, property_types
            FROM landscape.tbl_measures
            ORDER BY sort_order NULLS LAST, measure_code
            """
        )
        rows = cursor.fetchall()

    options: List[Dict[str, str]] = []
    seen = set()
    for code, name, types in rows:
        allowed = types
        if isinstance(allowed, str):
            try:
                allowed = json.loads(allowed)
            except ValueError:
                allowed = None
        # A measure with no property list is universal (%, DAY, MO, WK, YR).
        if property_type and isinstance(allowed, list) and property_type not in allowed:
            continue
        options.append({'value': code, 'label': f'{code} — {name}' if name else code})
        seen.add(code)

    for stored in sorted({s for s in (also_allow or []) if s}):
        if stored not in seen:
            options.append({'value': stored, 'label': f'{stored} (not on the platform list)'})

    return options


def growth_source_options(project_id: int) -> List[Dict[str, str]]:
    """The growth-rate sets a product or line can point at — this project's own
    plus anything published platform-wide.

    The empty choice is a CUSTOM rate: pointing at no set is how a per-row rate is
    expressed, so it belongs in the list rather than being a mode hidden
    somewhere else.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT set_id, set_name, COALESCE(is_global, FALSE)
            FROM landscape.core_fin_growth_rate_sets
            WHERE project_id = %s OR COALESCE(is_global, FALSE)
            ORDER BY COALESCE(is_global, FALSE), set_name
            """,
            [project_id],
        )
        rows = cursor.fetchall()

    return [{'value': '', 'label': 'Custom rate'}] + [
        {'value': str(sid), 'label': name or f'Set {sid}'} for sid, name, _ in rows
    ]
