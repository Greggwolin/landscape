"""The cash flow's VIEW SPECIFICATION — what the renderer draws from.

Parity slice CF1 (2026-09-11). Third surface, after the rent roll and sales, and
the first taken under Gregg's ordering by project type: cash flow sits under
Feasibility, which is land development.

Like sales and unlike the rent roll, this artifact already carried per-cell write
pointers, so no write slice was needed first. What it lacked was a specification
of its own, so it drew through the generic block renderer — three stacked tables
with no sense of which one you are meant to touch.

THE SHAPE IS NOT A LIST OF THINGS
---------------------------------
The other surfaces are one row per thing — a parcel, a unit, a product. A cash
flow is one row per PERIOD, and the two halves play different parts:

  * The assumptions strip is the only place anything can be typed. Every pointer
    on this artifact is there.
  * The period grid is entirely calculated by the engine. Nothing in it is
    writable and nothing should look as if it is.

Saying that in the specification, rather than leaving the renderer to infer it
from the presence of pointers, is what lets the screen put the editable half
where a reader looks first.

BUILT FROM THE SCHEMA, FOR THE SAME REASON SALES IS
---------------------------------------------------
The cash-flow schema is assembled from the engine's own output plus several
queries. Re-deriving the rows here would be a second implementation, free to
drift from the one the write pointers were built against. One source of rows.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

CASHFLOW_CONFIG_KEY = 'cashflow_view_config'


def build_cashflow_view_config(
    *,
    project_id: int,
    project_name: Optional[str],
    schema: Dict[str, Any],
    period_type: Optional[str] = None,
    total_periods: Optional[int] = None,
) -> Dict[str, Any]:
    """The specification the renderer draws from, read off the schema."""
    blocks = {b.get('id'): b for b in schema.get('blocks', [])}
    kpis = blocks.get('cashflow_kpis', {})
    assumptions = blocks.get('cashflow_assumptions', {})
    periods = blocks.get('cashflow_periods', {})
    note = blocks.get('cashflow_exit_note', {})

    def table(block: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'title': block.get('title') or '',
            'columns': [
                {'key': c['key'], 'label': c.get('label'), 'align': c.get('align', 'left')}
                for c in block.get('columns', [])
            ],
            'rows': [
                {'id': r['id'], 'cells': dict(r.get('cells', {}))}
                for r in block.get('rows', [])
            ],
        }

    period_rows = periods.get('rows', [])

    # An annual rollup is offered ONLY for monthly periods, and only when there
    # is more than a year of them. Anything else and the control would either do
    # nothing or invent a calendar the engine never stated.
    monthly = (period_type or '').lower().startswith('month')
    can_roll_up = monthly and len(period_rows) > 12

    title = f'{project_name} — Cash Flow' if project_name else 'Cash Flow'
    return {
        'topic': 'cashflow',
        'kicker': 'Cash flow',
        'title': title,
        'source_label': 'the cash-flow engine and this project’s assumptions',
        'binding': {'state': 'live', 'label': 'live'},
        # The one line of prose the schema carries, when it carries one. It
        # explains the numbers below it and belongs above them.
        'note': note.get('content') or None,
        'kpis': [
            {'label': p.get('label'), 'value': p.get('value')}
            for p in kpis.get('pairs', [])
        ],
        # The only place anything can be typed. Said here rather than left to be
        # inferred from the pointers.
        'assumptions': table(assumptions),
        # Entirely calculated by the engine.
        'periods': table(periods),
        'period_type': period_type or 'period',
        'total_periods': total_periods or len(period_rows),
        'can_roll_up': can_roll_up,
        'truncate_at': 36,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }
