"""The rent roll's VIEW SPECIFICATION — what the renderer draws from.

Parity slice RR3 (2026-09-11). Written from the pattern the parcels and budget
artifacts already set, recorded in ``_cowork/PARITY-INVENTORY-2026-09-11.md``:

    a server-side builder producing a view specification, a bespoke component,
    and one dispatch branch keyed on ``tool_name``.

WHY THIS IS SEPARATE FROM THE SCHEMA
------------------------------------
Two representations of the same rows, deliberately:

``params_json`` holds this specification, and it is what the screen draws.
The stored block schema holds one row per unit carrying a per-cell pointer at
its real source row — and a WRITE is resolved against that, never against
anything the client sends. A cell with no pointer is read-only no matter what
any flag says.

Both halves are built from the SAME ``unit_rows`` in the SAME ORDER, and the row
ids match (``u1``, ``u2`` …). That correspondence is what lets a rendered cell be
matched to its source row; build them apart and it is the first thing to rot.

WHAT IS ON SCREEN IS DECIDED BY THE DATA
----------------------------------------
Column presence follows the same granularity floor the schema uses — a Market
Rent column only when market rents exist, Loss-to-Lease only when market sits
beside in-place, Subsidy only where a unit is Section 8, Delinquency only when
past-due data is present, Renovation only when a value-add status exists,
Building only when there is more than one. A column that would be empty for
every unit is not shown, and its absence is stated in the footer rather than
left as a silent gap.

NO INVENTED ASSUMPTIONS
-----------------------
Nothing here supplies a figure the user did not enter (Gregg, 2026-09-11). Where
a value is absent it reads as absent. Occupancy and loss-to-lease are computed
from what is there and are never writable.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# The panel reads this key off params_json to decide it is looking at a rent
# roll. Namespaced the way parcels_view_config / budget_view_config /
# map_config / clarification_config are.
RENT_ROLL_CONFIG_KEY = 'rent_roll_view_config'

# Column metadata, stated once. ``kind: computed`` is presentation only — what
# may actually be written is decided by the pointers on the stored schema.
_COLUMN_META: Dict[str, Dict[str, Any]] = {
    'unit':          {'label': 'Unit',          'align': 'left'},
    'building':      {'label': 'Building',      'align': 'left'},
    'unit_type':     {'label': 'Unit Type',     'align': 'left'},
    'sf':            {'label': 'SF',            'align': 'right'},
    'in_place':      {'label': 'In-Place Rent', 'align': 'right'},
    'market':        {'label': 'Market Rent',   'align': 'right'},
    'loss_to_lease': {'label': 'Loss-to-Lease', 'align': 'right', 'kind': 'computed'},
    'status':        {'label': 'Status',        'align': 'left'},
    'lease_end':     {'label': 'Lease End',     'align': 'right'},
    'subsidy':       {'label': 'Subsidy',       'align': 'left'},
    'delinquency':   {'label': 'Delinquency',   'align': 'right'},
    'reno':          {'label': 'Reno Status',   'align': 'left'},
    'evidence':      {'label': 'Evidence',      'align': 'left'},
}

# Three rungs, not four: a rent roll has no natural summary row per unit, so the
# shortest useful view is still one line per unit with the money on it.
_RUNGS: Dict[str, List[str]] = {
    'summary':  ['unit', 'unit_type', 'in_place', 'status'],
    'standard': ['unit', 'building', 'unit_type', 'sf', 'in_place', 'market',
                 'loss_to_lease', 'status'],
    'detail':   ['unit', 'building', 'unit_type', 'sf', 'in_place', 'market',
                 'loss_to_lease', 'status', 'lease_end', 'subsidy',
                 'delinquency', 'reno', 'evidence'],
}

# Why a column is absent, said in the footer rather than left as a gap.
_ABSENCE_REASON = 'no unit carries that value'


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _truthy(value: Any) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in ('t', 'true', '1', 'y', 'yes')
    return bool(value)


def _date_label(value: Any) -> str:
    if value is None:
        return '—'
    try:
        return value.isoformat()[:10]
    except AttributeError:
        return str(value)[:10]


def available_columns(unit_rows: List[Dict[str, Any]]) -> Dict[str, bool]:
    """The granularity floor, computed from the rows. One statement of it."""
    market = any(_num(r.get('market_rent')) is not None for r in unit_rows)
    return {
        'building': len({(r.get('building_name') or None) for r in unit_rows} - {None}) > 1,
        'sf': any(_num(r.get('square_feet')) is not None for r in unit_rows),
        'market': market,
        'loss_to_lease': market and any(
            _num(r.get('market_rent')) is not None and _num(r.get('current_rent')) is not None
            for r in unit_rows
        ),
        'lease_end': any(r.get('lease_end_date') for r in unit_rows),
        'subsidy': any(_truthy(r.get('is_section8')) for r in unit_rows),
        'delinquency': any((_num(r.get('past_due_amount')) or 0) > 0 for r in unit_rows),
        'reno': any((r.get('renovation_status') or '').strip() for r in unit_rows),
    }


def build_rent_roll_view_config(
    *,
    project_id: int,
    project_name: Optional[str],
    unit_rows: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """The specification the renderer draws from.

    Rows are emitted in the order given and keyed ``u1``, ``u2`` … — the same
    ids the stored schema uses, which is how a cell finds its write pointer.
    """
    have = available_columns(unit_rows)
    always = {'unit', 'unit_type', 'in_place', 'status', 'evidence'}

    def shown(key: str) -> bool:
        return key in always or have.get(key, False)

    rows: List[Dict[str, Any]] = []
    for idx, r in enumerate(unit_rows, start=1):
        in_place = _num(r.get('current_rent'))
        market = _num(r.get('market_rent'))
        cells: Dict[str, Any] = {
            'unit': r.get('unit_number') or f'#{r.get("unit_id")}',
            'building': r.get('building_name') or '',
            'unit_type': r.get('unit_type') or '',
            'sf': _num(r.get('square_feet')),
            'in_place': in_place,
            'market': market,
            'loss_to_lease': ((market - in_place)
                              if (market is not None and in_place is not None) else None),
            'status': r.get('occupancy_status') or '',
            'lease_end': _date_label(r.get('lease_end_date')),
            'subsidy': 'Section 8' if _truthy(r.get('is_section8')) else '',
            'delinquency': _num(r.get('past_due_amount')),
            'reno': r.get('renovation_status') or '',
            'evidence': 'Rent roll',
        }
        rows.append({'id': f'u{idx}', 'unit_id': r.get('unit_id'), 'cells': cells})

    columns = [
        {'key': key, **_COLUMN_META[key]}
        for key in _COLUMN_META
        if shown(key)
    ]
    rung_columns = {
        rung: [k for k in keys if shown(k)]
        for rung, keys in _RUNGS.items()
    }

    # Grouping offered only where it would actually divide the table. A control
    # that produces one bucket is a control that does nothing.
    buildings = {(r['cells']['building'] or '') for r in rows} - {''}
    unit_types = {(r['cells']['unit_type'] or '') for r in rows} - {''}
    group_options = [{'value': 'none', 'label': 'none'}]
    if len(buildings) > 1:
        group_options.append({'value': 'building', 'label': 'building'})
    if len(unit_types) > 1:
        group_options.append({'value': 'unit_type', 'label': 'unit type'})

    optional_columns = [
        {'key': key, 'label': _COLUMN_META[key]['label'],
         'available': False, 'reason': _ABSENCE_REASON}
        for key, present in have.items()
        if not present
    ]

    title = f'{project_name} — Rent Roll' if project_name else 'Rent Roll'
    return {
        'topic': 'rent_roll',
        'kicker': 'Rent roll',
        'title': title,
        'source_label': 'the unit records on this project',
        'binding': {'state': 'live', 'label': 'live'},
        'columns': columns,
        'rung_columns': rung_columns,
        'default_rung': 'standard',
        'default_grouping': 'building' if len(buildings) > 1 else 'none',
        'group_options': group_options,
        'optional_columns': optional_columns,
        'rows': rows,
        'row_count': len(rows),
        'truncate_at': 60,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }
