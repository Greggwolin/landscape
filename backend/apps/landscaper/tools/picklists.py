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
Parking Stall. ``core_fin_uom`` WAS a second, older list with price-prefixed codes
($/FF, $/Acre). Gregg settled it on 2026-09-14 — ``tbl_measures`` is THE list —
and migration 0052 repointed every foreign key off ``core_fin_uom``, which now
backs nothing and is marked deprecated on the table itself. Migration 0053 then
removed the last three price expressions ($/MO, $/QTR, $/YR) from the
administered list and added ``QTR``, which had never existed. **Every surface
asks this module; no surface queries either table directly.**
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


# The older price-prefixed spellings still sitting in stored data, mapped to the
# administered code they mean. Gregg, 2026-09-14: the Unit column must not offer
# "(not on the platform list)" entries. Resolving a legacy spelling to its real
# code is how the cell shows the right list item without a stored value being
# silently dropped — the row then writes the administered code the next time it
# is touched, so the data migrates as it is edited.
LEGACY_MEASURE_ALIASES: Dict[str, str] = {
    '$/FF': 'FF',
    '$/LF': 'LF',
    '$/SF': 'SF',
    '$/SY': 'SY',
    '$/CY': 'CY',
    '$/Acre': 'AC',
    '$/AC': 'AC',
    '$/Unit': 'UNIT',
    '$/EA': 'EA',
    '$/Door': 'DOOR',
    '$/Stall': 'STALL',
    '$$$': 'LS',
    '% of': '%',
    # The three time codes retired from tbl_measures by migration 0053. Nothing
    # in the database carried them, but a value typed before the retirement, or
    # arriving from an import, must still land on a real option rather than
    # forcing an off-list entry. D-2026-09-14-MQR: time is the measure.
    '$/MO': 'MO',
    '$/QTR': 'QTR',
    '$/YR': 'YR',
    '$/Month': 'MO',
    '$/Quarter': 'QTR',
    '$/Year': 'YR',
}


def normalize_measure_code(code: Optional[str]) -> str:
    """The administered code a stored unit means. Unknown values pass through.

    Case-insensitive on the second pass: ``Unit`` and ``UNIT`` are the same unit
    typed by different hands, and only one of them is on the list.
    """
    if not code:
        return ''
    stripped = str(code).strip()
    if stripped in LEGACY_MEASURE_ALIASES:
        return LEGACY_MEASURE_ALIASES[stripped]
    folded = stripped.casefold()
    for legacy, administered in LEGACY_MEASURE_ALIASES.items():
        if legacy.casefold() == folded:
            return administered
    return _CASE_ONLY_CODES.get(folded, stripped)


# Administered codes whose only problem is how they were typed.
_CASE_ONLY_CODES: Dict[str, str] = {
    'unit': 'UNIT', 'ff': 'FF', 'ac': 'AC', 'acre': 'AC', 'sf': 'SF',
    'lf': 'LF', 'sy': 'SY', 'cy': 'CY', 'ea': 'EA', 'ls': 'LS',
    'door': 'DOOR', 'stall': 'STALL',
    'mo': 'MO', 'month': 'MO', 'qtr': 'QTR', 'quarter': 'QTR',
    'yr': 'YR', 'year': 'YR', 'wk': 'WK', 'week': 'WK', 'day': 'DAY',
}


def measure_options(project_id: int) -> List[Dict[str, str]]:
    """The units this project may use, as picklist options.

    Only the administered list. A value stored in an older spelling is resolved
    by ``normalize_measure_code`` before the cell is drawn, so it lands on a real
    option rather than forcing an off-list entry into the dropdown.
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
        # The label is the CODE alone — Gregg, 2026-09-14: the column just needs
        # the code. The full name rides along as a description, which the cell
        # shows on hover and the open dropdown spells out, so choosing a unit is
        # still informed without the grid carrying the same words 21 times.
        options.append({
            'value': code,
            'label': code,
            **({'description': name} if name else {}),
        })
        seen.add(code)

    return options


def project_growth_default(project_id: int) -> Optional[Dict[str, Any]]:
    """The project's own price-growth assumption, if one is set.

    Lives in ``tbl_project_settings`` — ``price_inflation_set_id`` first, falling
    back to the flat ``global_inflation_rate``. Not invented here: those columns
    already existed, which is why the register reads them rather than adding a
    second place a growth assumption could live.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT s.price_inflation_set_id,
                   s.global_inflation_rate,
                   g.set_name,
                   (SELECT st.rate FROM landscape.core_fin_growth_rate_steps st
                     WHERE st.set_id = g.set_id
                     ORDER BY st.step_number LIMIT 1)
            FROM landscape.tbl_project_settings s
            LEFT JOIN landscape.core_fin_growth_rate_sets g
                   ON g.set_id = s.price_inflation_set_id
            WHERE s.project_id = %s
            """,
            [project_id],
        )
        row = cursor.fetchone()

    if not row:
        return None
    set_id, flat_rate, set_name, set_rate = row
    if set_id and set_rate is not None:
        return {'set_id': int(set_id), 'label': set_name or f'Set {set_id}',
                'rate': float(set_rate), 'source': 'set'}
    if flat_rate is not None:
        return {'set_id': None, 'label': 'the project inflation rate',
                'rate': float(flat_rate), 'source': 'flat'}
    return None


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


def growth_rate_options(project_id: int) -> List[Dict[str, str]]:
    """The RATES those sets stand for, as a picklist for a rate field.

    Gregg, 2026-09-14: *"growth rates should have dropdowns from benchmarks."*
    Pointing at a set is one thing; choosing the number it implies is another,
    and a rate field that offers only free text is how a project ends up with
    2.95% typed where every other line says 3%. Each option is a decimal
    fraction, the same as the stored value. The first entry leaves the field
    typeable so a rate nobody has published can still be entered.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT s.set_name, COALESCE(s.is_global, FALSE),
                   (SELECT st.rate FROM landscape.core_fin_growth_rate_steps st
                     WHERE st.set_id = s.set_id
                     ORDER BY st.step_number LIMIT 1)
            FROM landscape.core_fin_growth_rate_sets s
            WHERE (s.project_id = %s OR COALESCE(s.is_global, FALSE))
              AND COALESCE(s.card_type, '') IN ('revenue', 'custom', '')
            ORDER BY COALESCE(s.is_global, FALSE), s.set_name
            """,
            [project_id],
        )
        rows = cursor.fetchall()

    options: List[Dict[str, str]] = []
    seen = set()
    for name, is_global, rate in rows:
        if rate is None:
            continue
        value = str(float(rate))
        if value in seen:
            continue
        seen.add(value)
        scope = 'platform' if is_global else 'this project'
        options.append({
            'value': value,
            'label': f'{float(rate) * 100:.1f}% — {name or "unnamed"} ({scope})',
        })

    default = project_growth_default(project_id)
    if default:
        value = str(default['rate'])
        if value not in seen:
            options.insert(0, {
                'value': value,
                'label': f'{default["rate"] * 100:.1f}% — {default["label"]} (project default)',
            })

    return [{'value': '', 'label': 'Type a rate…'}] + options
