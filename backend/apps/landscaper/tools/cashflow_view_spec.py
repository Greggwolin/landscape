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


def resolve_period_zero(project_id: int) -> Dict[str, Any]:
    """When period 0 starts, and where that date came from.

    Gregg, 2026-09-11: *"period 0 = project start date which was entered initially
    on the project setup modal or homepage but gets overridden if the acquisition
    table includes an initial closing date. if no initial closing date, then its
    assumed that the cashflow analysis solves for the PV of the project net income
    stream to arrive at the land value."*

    So the precedence is: the acquisition closing date wins; the project's own
    analysis start date is the fallback; and neither means the analysis is not
    anchored to a calendar at all — it is solving for a present value, and the
    screen says so rather than drawing dates it does not have.

    The table is ``landscape.tbl_acquisition`` — the acquisition LEDGER, one row
    per event, which is what ``AcquisitionEvent`` maps to (``managed = False``).
    Read off the model rather than guessed: a first attempt at this query invented
    a table name that exists nowhere.

    **The INITIAL closing, not the latest.** `apps/acquisition/views.py` reads the
    most recent CLOSING event (`order_by('-event_date').first()`); a deal with
    staged takedowns has several, and the first one is when the clock starts.
    Recorded rather than quietly matched: the two now disagree, deliberately, and
    which is right for the acquisition summary is Gregg's call.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT MIN(event_date) FROM landscape.tbl_acquisition
            WHERE project_id = %s AND event_type = 'CLOSING' AND event_date IS NOT NULL
            """,
            [project_id],
        )
        row = cursor.fetchone()
        closing = row[0] if row else None
        if closing is not None:
            return {'date': closing.isoformat()[:10], 'source': 'acquisition closing'}

        cursor.execute(
            'SELECT analysis_start_date FROM landscape.tbl_project WHERE project_id = %s',
            [project_id],
        )
        row = cursor.fetchone()
        start = row[0] if row else None

    if start is not None:
        return {'date': start.isoformat()[:10], 'source': 'project start date'}
    return {'date': None, 'source': None}


def fetch_cashflow_containers(project_id: int) -> List[Dict[str, Any]]:
    """The areas and phases this project's cash flow can be narrowed to.

    The engine has always accepted a ``container_ids`` filter
    (``LandDevCashFlowService.calculate``); nothing ever offered the list, so the
    screen said filtering was unavailable. It is available — it just cannot be
    done by regrouping rows already on screen, because the engine emits one
    aggregated figure per period. It has to be re-run.

    ``landscape.tbl_division`` is the container ledger, read off
    ``apps.containers.models.Division`` (``managed = False``) rather than guessed.
    Tier 1 is the area/village, tier 2 the phase; tier 3 is unit-level and too
    fine to offer as a cash-flow filter.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT division_id, display_name, division_code, tier, parent_division_id
            FROM landscape.tbl_division
            WHERE project_id = %s AND COALESCE(is_active, TRUE) AND tier IN (1, 2)
            ORDER BY tier, COALESCE(sort_order, 2147483647), division_id
            """,
            [project_id],
        )
        rows = cursor.fetchall()

    return [
        {
            'id': r[0],
            'label': r[1] or r[2] or f'Container {r[0]}',
            'code': r[2],
            'tier': r[3],
            'tier_label': 'Area' if r[3] == 1 else 'Phase',
            'parent_id': r[4],
        }
        for r in rows
    ]


def build_cashflow_view_config(
    *,
    project_id: int,
    project_name: Optional[str],
    schema: Dict[str, Any],
    period_type: Optional[str] = None,
    total_periods: Optional[int] = None,
    container_ids: Optional[List[int]] = None,
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

    try:
        period_zero = resolve_period_zero(project_id)
    except Exception:  # noqa: BLE001 — a missing date must never fail the artifact
        period_zero = {'date': None, 'source': None}

    # What this cash flow can be narrowed to, and what it IS narrowed to. A
    # failure here must never take the artifact with it.
    try:
        containers = fetch_cashflow_containers(project_id)
    except Exception:  # noqa: BLE001
        containers = []

    active_ids = [int(i) for i in (container_ids or [])]
    by_id = {c['id']: c for c in containers}
    active_labels = [
        (by_id[i]['label'] if i in by_id else f'Container {i}') for i in active_ids
    ]

    title = f'{project_name} — Cash Flow' if project_name else 'Cash Flow'
    if active_labels:
        title = f'{title} — {", ".join(active_labels)}'
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
        # When period 0 starts, and where the date came from — so buckets can be
        # labelled with real dates instead of ordinals. None means the analysis is
        # not anchored to a calendar and the screen says so.
        'period_zero': period_zero,
        'unanchored_note': (
            None if period_zero.get('date') else
            'No closing date and no project start date, so this analysis is not '
            'anchored to a calendar: it is solving for the present value of the net '
            'income stream — the land value — and the periods are counted from the '
            'start of that stream.'
        ),
        # Every area and phase this cash flow can be narrowed to, and which of
        # them this one IS. A filtered cash flow is a SEPARATE artifact built by
        # re-running the engine — not the same rows regrouped — so the canonical
        # project-wide cash flow is never overwritten by a filtered view.
        'containers': containers,
        'container_filter': (
            {'ids': active_ids, 'labels': active_labels} if active_ids else None
        ),
        'scope_label': (
            ' · '.join(active_labels) if active_labels else 'Whole project'
        ),
        # Said on the screen rather than left as a silent absence. Cost detail is
        # the one control the retired screen carried that still cannot be
        # produced from what the engine emits — one aggregated figure per period,
        # so a breakdown would be an invented split. Filtering by area or phase
        # IS available, by re-running the engine for those containers.
        'unavailable_controls': (
            'Cost detail is not offered here: the engine emits one aggregated '
            'figure per period, so a breakdown would have to come from the engine '
            'rather than be split on screen.'
        ),
        'truncate_at': 36,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }
