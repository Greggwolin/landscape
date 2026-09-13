"""The sales schedule's VIEW SPECIFICATION — what the renderer draws from.

Parity slice SL1 (2026-09-11), following the rent roll of the same day and the
pattern the budget and parcels artifacts set:

    a server-side builder producing a view specification, a bespoke component,
    and one dispatch branch keyed on ``tool_name``.

The sales artifact ALREADY carried per-cell write pointers — unlike the rent
roll, which needed them added first. What it lacked was a specification of its
own, so it drew through the generic block renderer: two tables and a row of
figures, with no filtering, no grouping and no sense of which column is money.

TWO TABLES, AND WHY THEY STAY TWO
---------------------------------
The rate card says what a product sells for. The schedule says what each parcel
is expected to bring and when. They are different grains — one row per product
against one row per parcel — and merging them would invent a correspondence the
data does not have.

The rate card is NOT filtered by the chips. Narrowing the schedule to one phase
does not change what a product is priced at, and dimming the rate card to match
would suggest it had.

NO INVENTED ASSUMPTIONS
-----------------------
Nothing here supplies a figure the user did not enter (Gregg, 2026-09-11). Net
is calculated from gross, commission and cost of sale and is never writable.
Where a value is absent it reads as absent, not as zero — these are the lines
proceeds get struck from.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

SALES_CONFIG_KEY = 'sales_view_config'

_SCHEDULE_META: Dict[str, Dict[str, Any]] = {
    'parcel':       {'label': 'Parcel',       'align': 'left'},
    'area':         {'label': 'Area',         'align': 'left'},
    'phase':        {'label': 'Phase',        'align': 'left'},
    'sale_date':    {'label': 'Sale Date',    'align': 'right'},
    'gross':        {'label': 'Gross',        'align': 'right'},
    'commission':   {'label': 'Commission',   'align': 'right'},
    'cost_of_sale': {'label': 'Cost of Sale', 'align': 'right'},
    'net':          {'label': 'Net',          'align': 'right', 'kind': 'computed'},
    'evidence':     {'label': 'Evidence',     'align': 'left'},
}

_RUNGS: Dict[str, List[str]] = {
    'summary':  ['parcel', 'sale_date', 'net'],
    'standard': ['parcel', 'area', 'phase', 'sale_date', 'gross', 'commission', 'net'],
    'detail':   ['parcel', 'area', 'phase', 'sale_date', 'gross', 'commission',
                 'cost_of_sale', 'net', 'evidence'],
}

_ABSENCE_REASON = 'every parcel shares one value, so the column would say nothing'


def build_sales_view_config(
    *,
    project_id: int,
    project_name: Optional[str],
    schema: Dict[str, Any],
) -> Dict[str, Any]:
    """Built from the SCHEMA the same call just produced, not from the database.

    That is deliberate and is the one place this differs from the rent roll. The
    sales schema is already assembled from several queries — the rate card, the
    parcel schedule, the offsets — and re-deriving the rows here would be a
    second implementation of the same joins, free to drift from the one the write
    pointers were built against. Reading the schema keeps one source of rows, so
    a rendered cell and its pointer cannot disagree.
    """
    blocks = {b.get('id'): b for b in schema.get('blocks', [])}
    pricing = blocks.get('sales_pricing_ratecard', {})
    schedule = blocks.get('sales_parcel_schedule', {})

    schedule_keys = {c['key'] for c in schedule.get('columns', [])}
    rows = [
        {'id': r['id'], 'cells': dict(r.get('cells', {}))}
        for r in schedule.get('rows', [])
    ]

    def shown(key: str) -> bool:
        return key in schedule_keys

    columns = [
        {'key': key, **_SCHEDULE_META[key]}
        for key in _SCHEDULE_META
        if shown(key)
    ]
    rung_columns = {
        rung: [k for k in keys if shown(k)]
        for rung, keys in _RUNGS.items()
    }

    group_options = [{'value': 'none', 'label': 'none'}]
    if shown('area'):
        group_options.append({'value': 'area', 'label': 'area'})
    if shown('phase'):
        group_options.append({'value': 'phase', 'label': 'phase'})

    optional_columns = [
        {'key': key, 'label': _SCHEDULE_META[key]['label'],
         'available': False, 'reason': _ABSENCE_REASON}
        for key in ('area', 'phase')
        if not shown(key)
    ]

    title = f'{project_name} — Sales' if project_name else 'Sales'
    return {
        'topic': 'sales',
        'kicker': 'Sales schedule',
        'title': title,
        'source_label': 'the parcel sale schedule and the pricing rate card',
        'binding': {'state': 'live', 'label': 'live'},
        'columns': columns,
        'rung_columns': rung_columns,
        'default_rung': 'standard',
        'default_grouping': 'area' if shown('area') else ('phase' if shown('phase') else 'none'),
        'group_options': group_options,
        'optional_columns': optional_columns,
        'rows': rows,
        # The rate card rides along whole: different grain, never filtered by the
        # chips, and short enough that truncation would only hide it.
        'pricing': {
            'title': pricing.get('title') or 'Pricing rate card',
            'columns': [
                {'key': c['key'], 'label': c.get('label'), 'align': c.get('align', 'left')}
                for c in pricing.get('columns', [])
            ],
            'rows': [
                {'id': r['id'], 'cells': dict(r.get('cells', {}))}
                for r in pricing.get('rows', [])
            ],
        },
        'row_count': len(rows),
        'truncate_at': 60,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }
