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

    # Time scale. Offered only where regrouping the rows the engine already
    # emitted would actually produce fewer, different rows — a control that
    # yields one bucket, or the same buckets, is a control that does nothing.
    #
    # The groupings are SEQUENTIAL from the first period, not calendar quarters
    # and years: the engine states a period order, not a calendar, and aligning
    # to one would be inventing a start date it never gave.
    monthly = (period_type or '').lower().startswith('month')
    scales: List[Dict[str, Any]] = [{'value': 'period', 'label': f'by {period_type or "period"}'}]
    if monthly and len(period_rows) > 3:
        scales.append({'value': 'quarter', 'label': 'by quarter'})
    if monthly and len(period_rows) > 12:
        scales.append({'value': 'year', 'label': 'by year'})

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
        'scales': scales,
        # Said on the screen rather than left as a silent absence. Two of the
        # three controls the retired screen carried cannot be done here from the
        # rows the engine emits, and doing them anyway would produce confident
        # wrong totals — see next_actions.md 2026-09-11.
        'unavailable_controls': (
            'Cost detail and filtering by area or phase are not offered here: the '
            'engine emits one aggregated figure per period, so both would have to '
            'be recomputed server-side rather than regrouped on screen.'
        ),
        'truncate_at': 36,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }
