"""The pricing REGISTER — where a price is set, not where one is reported.

Parity slice PR1 (2026-09-13), the first surface built under the decision Gregg
took that day (D-2026-09-13-SURFACES, option 4d): a surface is a REGISTER, a
REPORT or a DERIVATION, and it may only be one of them.

This is a register. Every cell that carries a pointer can be typed into, nothing
on it is computed from a model run, and the one derived column it does show — the
price a whole lot implies — is drawn as computed so it cannot be mistaken for an
input.

WHY IT EXISTS
-------------
Gregg, 2026-09-11, on opening the sales schedule: *"there is no place to set
prices, inflation, sales costs, etc."* He was right. The rate card was drawn
read-only, and the only writable cells anywhere on the sales surface were the
sale date and a commission amount. This is the place.

THE PRICE LIST IS A CURVE
-------------------------
Gregg, 2026-09-13: *"lots are priced on a $/Front Foot basis that declines with
width."* A narrower lot earns MORE per front foot; the whole lot still costs less
because it has fewer feet to sell. Both are true and they slope opposite ways, so
the register carries the rate and the implied lot price side by side and orders
single-family products by width — which turns "is this card internally
consistent?" from an audit into something you see.

It also flags a product priced above a narrower one in the same use type. That is
an OBSERVATION, not a correction: the register says the row does not follow the
declining curve and leaves the judgement to the reader.

THE AS-OF DATE
--------------
``price_effective_date`` (migration 20260913) is new and nullable. Until a user
sets one, the register says the date is not recorded rather than showing a date
nobody chose — which is what the model does today, escalating either from period
0 or from the row's ``created_at`` depending on whether the parcel has a sale
period. Both are stated on the card.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import connection

logger = logging.getLogger(__name__)

# The real column on ``landscape.land_use_pricing`` each editable cell writes.
# Presence of a pointer IS the write allowlist; a cell missing from here is
# read-only however the column is flagged.
_EDITABLE_PRICING_COLUMNS = {
    'price': 'price_per_unit',
    'uom': 'unit_of_measure',
    'growth_rate': 'growth_rate',
    'growth_set': 'growth_rate_set_id',
    'as_of': 'price_effective_date',
}

# Units that price a lot by its frontage. Both spellings are live in the data.
_FRONT_FOOT_UOMS = {'$/FF', 'FF'}

_PRODUCT_DIMENSIONS = re.compile(r'^\s*(\d{1,3})\s*[xX×]\s*(\d{1,3})\s*$')


def parse_lot_width(product_code: Optional[str]) -> Optional[int]:
    """Lot width in feet from a product code like ``50x125``.

    Returns None for anything that is not two numbers with an x between them —
    MU, APTS, C, OS and every other non-dimensioned product. A guess here would
    put a made-up width on the curve, so there is no fallback.
    """
    if not product_code:
        return None
    m = _PRODUCT_DIMENSIONS.match(str(product_code))
    return int(m.group(1)) if m else None


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _jsonable(value: Any) -> Any:
    """JSON-safe capture value for a source ref. The whole schema is stored as
    JSON, so a raw date or Decimal breaks persistence — the same coercion the
    sales builder needed for its date column."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()[:10]
    return value


def _cell_source_refs(record: Dict[str, Any], captured_at: str) -> Dict[str, Any]:
    """Per-cell pointers at the real source row.

    ``row_id`` is ``land_use_pricing.id`` — the table's own primary key. It is
    UNIQUE on (project, lu_type, product), so one row is one product's price and
    a write can never be ambiguous about which product it changes.
    """
    row_id = record.get('id')
    if row_id is None:
        return {}
    return {
        cell: {
            'table': 'land_use_pricing',
            'row_id': row_id,
            'column': column,
            'captured_at': captured_at,
            'captured_value': _jsonable(record.get(column)),
        }
        for cell, column in _EDITABLE_PRICING_COLUMNS.items()
    }


def fetch_pricing_register_data(project_id: int) -> Dict[str, Any]:
    """Everything the register needs, read once.

    Kept here rather than in the tool handler so the rebuild after a write
    produces a schema identical to a fresh render — the same reason the budget,
    sales and cash-flow builders own their read path.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT project_name FROM landscape.tbl_project WHERE project_id = %s",
            [project_id],
        )
        prow = cursor.fetchone()
        project_name = prow[0] if prow else None

        cursor.execute(
            """
            SELECT p.id, p.lu_type_code, p.product_code, p.price_per_unit,
                   p.unit_of_measure, p.growth_rate, p.growth_rate_set_id,
                   p.price_effective_date, p.benchmark_id,
                   s.set_name
            FROM landscape.land_use_pricing p
            LEFT JOIN landscape.core_fin_growth_rate_sets s
                   ON s.set_id = p.growth_rate_set_id
            WHERE p.project_id = %s
            ORDER BY p.lu_type_code, p.product_code
            """,
            [project_id],
        )
        columns = [c[0] for c in cursor.description]
        rows = [dict(zip(columns, r)) for r in cursor.fetchall()]

        # The growth sources a product can point at: this project's own sets plus
        # anything published platform-wide. Gregg, 7a: a picklist of saved
        # benchmarks OR a custom rate — "custom" is the absence of a set, not a
        # thirteenth option in the list.
        cursor.execute(
            """
            SELECT s.set_id, s.set_name, s.is_global,
                   (SELECT st.rate FROM landscape.core_fin_growth_rate_steps st
                     WHERE st.set_id = s.set_id
                     ORDER BY st.step_number NULLS FIRST, st.step_id LIMIT 1) AS first_rate,
                   (SELECT COUNT(*) FROM landscape.core_fin_growth_rate_steps st
                     WHERE st.set_id = s.set_id) AS step_count
            FROM landscape.core_fin_growth_rate_sets s
            WHERE s.project_id = %s OR COALESCE(s.is_global, FALSE)
            ORDER BY COALESCE(s.is_global, FALSE), s.set_name
            """,
            [project_id],
        )
        set_cols = [c[0] for c in cursor.description]
        growth_sets = [dict(zip(set_cols, r)) for r in cursor.fetchall()]

    # The platform's own lists, asked for rather than rebuilt. Units come from the
    # table the Units of Measure admin screen manages, gated by the project's
    # property type; growth sources from this project's sets plus the global ones.
    from .picklists import growth_source_options, measure_options

    return {
        'project_name': project_name,
        'rows': rows,
        'growth_sets': growth_sets,
        'uom_options': measure_options(
            project_id,
            also_allow=[r.get('unit_of_measure') for r in rows],
        ),
        'growth_options': growth_source_options(project_id),
    }


def _sort_key(row: Dict[str, Any]) -> tuple:
    """Use type, then lot width ascending, then product code.

    Width first WITHIN a use type is the whole point: the curve only reads as a
    curve when the widths are in order. Products with no width sort after the
    dimensioned ones rather than being interleaved with them.
    """
    width = parse_lot_width(row.get('product_code'))
    return (
        str(row.get('lu_type_code') or ''),
        0 if width is not None else 1,
        width if width is not None else 0,
        str(row.get('product_code') or ''),
    )


def annotate_curve_breaks(rows: List[Dict[str, Any]]) -> None:
    """Mark a product priced ABOVE a narrower one in the same use type.

    Per Gregg's rule the rate falls as lots get wider, so within one use type the
    prices should never rise as the width does. Only applied where at least three
    dimensioned, front-foot-priced, priced products share a use type — below that
    there is no curve to depart from, and saying so anyway would be noise.

    Mutates ``rows`` in place, adding ``curve_break``. It is an observation the
    screen reports, never a value the register changes.
    """
    by_type: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        width = parse_lot_width(row.get('product_code'))
        price = _num(row.get('price_per_unit'))
        if width is None or not price:
            continue
        if (row.get('unit_of_measure') or '') not in _FRONT_FOOT_UOMS:
            continue
        by_type.setdefault(str(row.get('lu_type_code') or ''), []).append(row)

    for group in by_type.values():
        if len(group) < 3:
            continue
        group.sort(key=lambda r: parse_lot_width(r.get('product_code')) or 0)
        # A row is flagged when it costs more per foot than ANY narrower lot —
        # that is, when it exceeds the CHEAPEST narrower one. The rule says the
        # rate never rises with width, so a single such pair is a departure.
        #
        # Not a running maximum, which was the first attempt: one high outlier
        # then sits above everything after it and swallows every later break.
        # The cost of the cheapest-narrower test is that an unusually LOW row
        # makes the normal rows above it look like departures; the flag is
        # therefore worded as what it literally is — priced above a narrower lot —
        # and the reader decides which of the two rows is wrong.
        for index, row in enumerate(group):
            width = parse_lot_width(row.get('product_code')) or 0
            price = _num(row.get('price_per_unit'))
            narrower = [
                _num(r.get('price_per_unit')) for r in group[:index]
                if (parse_lot_width(r.get('product_code')) or 0) < width
            ]
            narrower = [p for p in narrower if p]
            if narrower and price > min(narrower):
                row['curve_break'] = True


def build_pricing_register_schema(
    rows: List[Dict[str, Any]],
    growth_sets: List[Dict[str, Any]],
    uom_options: Optional[List[Dict[str, Any]]] = None,
    growth_options: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """The BLOCK SCHEMA: one row per product, carrying the write pointers.

    The renderer draws from the view specification, never from this — but a write
    is resolved against this and nothing else, which is what makes permission
    server-side and fail-closed.
    """
    captured_at = datetime.now(timezone.utc).isoformat()
    ordered = sorted(rows, key=_sort_key)
    annotate_curve_breaks(ordered)

    # Both lists come from the platform, via tools/picklists.py. Built here only
    # as a fallback so a direct caller in a test still gets a usable schema.
    set_options = list(growth_options or [])
    if not set_options:
        set_options = [{'value': '', 'label': 'Custom rate'}] + [
            {'value': str(s['set_id']), 'label': s['set_name'] or f"Set {s['set_id']}"}
            for s in growth_sets
        ]
    unit_options = list(uom_options or [])

    columns: List[Dict[str, Any]] = [
        {'key': 'use_type', 'label': 'Use', 'align': 'left', 'editable': False},
        {'key': 'product', 'label': 'Product', 'align': 'left', 'editable': False},
        {'key': 'width', 'label': 'Width (ft)', 'align': 'right', 'editable': False},
        {'key': 'uom', 'label': 'Unit', 'align': 'left', 'editable': True,
         **({'options': unit_options} if unit_options else {})},
        {'key': 'price', 'label': 'Price', 'align': 'right', 'editable': True},
        {'key': 'price_per_lot', 'label': 'Per Lot', 'align': 'right', 'editable': False},
        {'key': 'growth_set', 'label': 'Growth Source', 'align': 'left',
         'editable': True, 'options': set_options},
        # Stored as a decimal fraction, shown and typed as a percent. The column
        # says so; the renderer must not guess from the column name.
        {'key': 'growth_rate', 'label': 'Growth', 'align': 'right', 'editable': True,
         'format': 'percent'},
        {'key': 'as_of', 'label': 'Priced As Of', 'align': 'right', 'editable': True},
    ]

    data_rows: List[Dict[str, Any]] = []
    for index, r in enumerate(ordered, start=1):
        refs = _cell_source_refs(r, captured_at)
        width = parse_lot_width(r.get('product_code'))
        price = _num(r.get('price_per_unit'))
        uom = r.get('unit_of_measure') or ''
        # Only front-foot products have a whole-lot price. Everything else is
        # already priced in the unit it sells in, and multiplying it by anything
        # would be an invented figure.
        per_lot = (price * width) if (price and width and uom in _FRONT_FOOT_UOMS) else None
        growth = _num(r.get('growth_rate'))
        as_of = r.get('price_effective_date')
        cells: Dict[str, Any] = {
            'use_type': r.get('lu_type_code') or '',
            'product': r.get('product_code') or '(unspecified)',
            'width': width,
            'uom': uom,
            'price': price,
            'price_per_lot': per_lot,
            # The option's VALUE, not its label: a picklist cell holds what would
            # be written, and the renderer shows the matching label. Holding the
            # name here made the select open with nothing chosen.
            'growth_set': str(r['growth_rate_set_id']) if r.get('growth_rate_set_id') else '',
            'growth_rate': growth,
            'as_of': as_of.isoformat()[:10] if hasattr(as_of, 'isoformat') else (as_of or None),
        }
        data_rows.append({
            'id': f'p{index}',
            **({'editable': True, 'cell_source_refs': refs} if refs else {}),
            'cells': cells,
            **({'curve_break': True} if r.get('curve_break') else {}),
        })

    priced = [r for r in ordered if _num(r.get('price_per_unit'))]
    dated = [r for r in ordered if r.get('price_effective_date')]
    escalating = [r for r in ordered if _num(r.get('growth_rate'))]

    return {
        'blocks': [
            {
                'id': 'pricing_register_kpis',
                'type': 'key_value_grid',
                'pairs': [
                    {'label': 'Products', 'value': len(ordered)},
                    {'label': 'Priced', 'value': len(priced)},
                    {'label': 'Escalating', 'value': len(escalating)},
                    {'label': 'Dated', 'value': len(dated)},
                ],
                'columns': 4,
            },
            {
                'id': 'pricing_register_rows',
                'type': 'table',
                'title': 'Pricing register',
                'columns': columns,
                'rows': data_rows,
            },
        ],
    }


def build_pricing_register_refresh(project_id: int) -> Optional[Dict[str, Any]]:
    """Schema AND view specification from one read.

    Both halves or neither: the screen draws from the view specification, which
    carries its own copy of the rows, so refreshing only the schema after a write
    shows the numbers from before the edit. That defect was found on the cash flow
    on 2026-09-11 and is not being rebuilt here.
    """
    from .pricing_register_view_spec import build_pricing_register_view_config

    data = fetch_pricing_register_data(project_id)
    if not data['rows']:
        return None
    schema = build_pricing_register_schema(
        data['rows'], data['growth_sets'],
        data.get('uom_options'), data.get('growth_options'),
    )
    view_config = build_pricing_register_view_config(
        project_id=project_id,
        project_name=data['project_name'],
        schema=schema,
        growth_sets=data['growth_sets'],
    )
    return {'schema': schema, 'view_config': view_config}


def create_pricing_register_artifact(
    *,
    project_id: int,
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the pricing register server-side.

    Dedup: one register per project — re-running updates it in place, the same
    way every other schedule surface behaves.
    """
    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('pricing_register_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    payload = build_pricing_register_refresh(project_id)
    if payload is None:
        return {'success': False, 'error': 'no pricing rows to render'}

    from .pricing_register_view_spec import PRICING_CONFIG_KEY

    title = payload['view_config'].get('title') or 'Pricing register'
    try:
        return create_artifact_record(
            title=title,
            schema=payload['schema'],
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='get_pricing_register',
            params_json={
                'server_rendered': True,
                'kind': 'pricing_register',
                PRICING_CONFIG_KEY: payload['view_config'],
            },
            dedup_key='pricing:register',
            prior_tool_calls=['get_pricing_register'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('pricing_register_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
