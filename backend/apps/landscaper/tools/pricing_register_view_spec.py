"""The pricing register's VIEW SPECIFICATION — what the renderer draws from.

Parity slice PR1 (2026-09-13). The first surface built as a REGISTER under
D-2026-09-13-SURFACES, and the first to carry the convention that decides how
every surface after it reads:

    BLUE MEANS A HUMAN TYPED IT. BLACK MEANS THE MODEL COMPUTED IT.

That is the thirty-year financial-modelling convention, not an invention here,
and it replaces the per-column ``editable`` flag that had been advertising edits
the write path would not accept — the rate card's Price column was flagged
editable and could not be written.

The specification therefore states, per column, which of the two a cell is:
``input`` where a pointer backs it, ``computed`` where the value is derived,
``context`` where the cell is neither (a label the register does not own).

BUILT FROM THE SCHEMA
---------------------
Same reason as sales and cash flow: the schema is where the write pointers live,
and re-deriving the rows here would be a second implementation free to drift from
the one a write is resolved against. One source of rows.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

PRICING_CONFIG_KEY = 'pricing_register_view_config'

# Which of the three kinds each column is. Read by the renderer to colour the
# cell, and the ONLY place that mapping is stated.
_COLUMN_KIND = {
    'use_type': 'context',
    'product': 'context',
    'width': 'computed',
    'uom': 'input',
    'price': 'input',
    'price_per_lot': 'computed',
    'growth_set': 'input',
    'growth_rate': 'input',
    'as_of': 'input',
}

_RUNGS: Dict[str, List[str]] = {
    'summary':  ['product', 'price', 'growth_rate'],
    'standard': ['use_type', 'product', 'width', 'uom', 'price', 'price_per_lot', 'growth_rate'],
    'detail':   ['use_type', 'product', 'width', 'uom', 'price', 'price_per_lot',
                 'growth_set', 'growth_rate', 'as_of'],
}


def build_pricing_register_view_config(
    *,
    project_id: int,
    project_name: Optional[str],
    schema: Dict[str, Any],
    growth_sets: List[Dict[str, Any]],
    growth_default: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    blocks = {b.get('id'): b for b in schema.get('blocks', [])}
    kpis = blocks.get('pricing_register_kpis', {})
    table = blocks.get('pricing_register_rows', {})

    columns = [
        {
            'key': c['key'],
            'label': c.get('label'),
            'align': c.get('align', 'left'),
            'kind': _COLUMN_KIND.get(c['key'], 'context'),
            # The picklist and the number format both ride on the column, read
            # off the schema, so the renderer never infers either from a key
            # name. Any field with an established list carries that list here.
            **({'options': c['options']} if c.get('options') else {}),
            **({'allow_custom': True} if c.get('allow_custom') else {}),
            **({'format': c['format']} if c.get('format') else {}),
        }
        for c in table.get('columns', [])
    ]

    rows = [
        {
            'id': r['id'],
            'cells': dict(r.get('cells', {})),
            **({'curve_break': True} if r.get('curve_break') else {}),
            # Shown but not stored: the rate came from the project, and typing
            # over it writes this product's own.
            **({'growth_inherited': True} if r.get('growth_inherited') else {}),
        }
        for r in table.get('rows', [])
    ]

    breaks = [r for r in rows if r.get('curve_break')]
    undated = [r for r in rows if not r['cells'].get('as_of')]
    flat = [r for r in rows if not r['cells'].get('growth_rate')]
    inherited = [r for r in rows if r.get('growth_inherited')]

    title = f'{project_name} — Pricing' if project_name else 'Pricing'
    return {
        'topic': 'pricing',
        'kicker': 'Pricing register',
        'title': title,
        'source_label': 'the land-use pricing table',
        'binding': {'state': 'live', 'label': 'live'},
        # Said on the card, because a register that does not announce itself as
        # one is indistinguishable from the reports beside it.
        'lede': (
            'This is where prices are set. Anything in blue you can type into; '
            'anything in black the model worked out.'
        ),
        'kpis': [
            {'label': p.get('label'), 'value': p.get('value')}
            for p in kpis.get('pairs', [])
        ],
        'columns': columns,
        'rung_columns': _RUNGS,
        'default_rung': 'standard',
        'rows': rows,
        'row_count': len(rows),
        # Observations, not corrections. Each names what it noticed and leaves the
        # judgement to the reader.
        'notices': [
            n for n in [
                (f'{len(inherited)} of {len(rows)} products take the project\'s growth '
                 f'assumption of {growth_default["rate"] * 100:.1f}% '
                 f'({growth_default["label"]}). Type over any one of them to give that '
                 'product its own rate.')
                if (inherited and growth_default) else None,
                (f'{len(breaks)} product'
                 f'{"" if len(breaks) == 1 else "s"} priced above a narrower lot in the '
                 'same use type — the rate is meant to fall as lots get wider.')
                if breaks else None,
                (f'{len(undated)} of {len(rows)} prices carry no as-of date. Without one the '
                 'model escalates from period 0 where a parcel has a sale period, and from '
                 'the date the pricing row was created where it does not.')
                if undated else None,
                (f'{len(flat)} product'
                 f'{"" if len(flat) == 1 else "s"} escalate at nothing — the price stays '
                 'flat for the whole analysis.')
                if flat else None,
            ] if n
        ],
        'growth_sources': [
            {'id': s['set_id'], 'label': s['set_name'] or f"Set {s['set_id']}",
             'global': bool(s.get('is_global')),
             'first_rate': float(s['first_rate']) if s.get('first_rate') is not None else None,
             'steps': int(s.get('step_count') or 0)}
            for s in growth_sets
        ],
        'truncate_at': 40,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }
