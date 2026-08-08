"""Server-side development-budget artifact builder.

Budget base-artifact slice 1 (chat QB, 2026-07-24). Previously the model
received budget rows from ``get_budget_items`` / ``get_budget_rollup`` and
hand-composed the budget artifact inside a ``create_artifact`` call. Because
it was composed freehand every turn it was INCONSISTENT — one render showed a
bogus "Cost Per Lot 93,847" (an invented denominator), another the correct
"Average Item", and sometimes the card persisted hollow so its Open link
opened nothing.

This module builds the budget artifact server-side from the real DB rows, in a
fixed shape, and registers it via ``create_artifact_record`` — the same pattern
``os_artifact_builder`` uses for the operating statement. The model just
announces it; it never composes the table.

Shape:
  - one key_value_grid KPI header: Total Budget · Line Items · Categories ·
    Cost / Lot (= total budget ÷ SUM(parcel units_total), the CRE-correct
    denominator — NOT a parcel count and NOT an LLM guess)
  - one table block: Category · Description · UOM · Qty · Rate · Amount · Period

The renderer's universal tabular formatting (parens negatives, thousands
separators, em-dash zero, no ``$``) applies to the table + kv_grid values for
free — this module emits raw numbers, never formatted strings.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _period_label(record: Dict[str, Any]) -> str:
    """Render the phasing period from start/end period integers.

    "48" for a single-period item, "24-35" for a range, "—" when absent.
    (Timing on these rows is period-based, not calendar dates; when real
    start_date/end_date exist they are surfaced by the edit form, not here.)
    """
    start = record.get('start_period')
    end = record.get('end_period')
    if start is None and record.get('periods_to_complete') is not None \
            and record.get('start_period') is not None:
        # Derive end from start + duration when end_period is absent.
        try:
            end = int(record['start_period']) + int(record['periods_to_complete']) - 1
        except (TypeError, ValueError):
            end = None
    if start is None:
        return '—'
    try:
        s = int(start)
    except (TypeError, ValueError):
        return '—'
    if end is None:
        return str(s)
    try:
        e = int(end)
    except (TypeError, ValueError):
        return str(s)
    return str(s) if e == s else f'{s}-{e}'


# Cells a user may edit directly on the budget schedule, mapped to the real
# column they write. Editing-spine slice 1 (CB6).
#
# ONLY the two INPUTS are writable. `amount` is deliberately absent: a BEFORE
# UPDATE trigger on core_fin_fact_budget (`trg_budget_calculate_amount`)
# recomputes amount = qty x rate on every write, so amount is a CALCULATED cell.
# Exposing it would let a user type a number the database immediately overwrites
# — the worst kind of edit. This is the "editable vs calculated" rule from the
# base-artifact contract, enforced in the payload rather than in the renderer.
# `uom` (CB10) is a PICKLIST cell, not free text: core_fin_fact_budget.uom_code
# is FK-constrained to core_fin_uom, so a typed value that isn't a real code is
# rejected by the database. The artifact carries the allowed codes on the column
# so the renderer can offer a dropdown instead of letting the user type into a
# foreign key.
_EDITABLE_BUDGET_COLUMNS = ('qty', 'rate', 'uom')

# Artifact cell key → the real column it writes, where they differ.
_BUDGET_CELL_TO_COLUMN = {'uom': 'uom_code'}


def _cell_source_refs(record: Dict[str, Any], captured_at: str) -> Dict[str, Any]:
    """Per-cell pointers at the real source row, for the editable cells only.

    A cell carries a ref ⇒ it is writable through the commit path. A cell without
    one is read-only, whatever the row-level `editable` flag says — presence of
    the ref is the contract, so a calculated cell can never become editable by
    accident.
    """
    fact_id = record.get('fact_id')
    if fact_id is None:
        return {}
    refs: Dict[str, Any] = {}
    for cell_key in _EDITABLE_BUDGET_COLUMNS:
        column = _BUDGET_CELL_TO_COLUMN.get(cell_key, cell_key)
        raw = record.get(column)
        refs[cell_key] = {
            'table': 'core_fin_fact_budget',
            'row_id': fact_id,
            'column': column,
            'captured_at': captured_at,
            # Numeric cells capture a number; the picklist captures its code.
            'captured_value': raw if cell_key == 'uom' else _num(raw),
        }
    return refs


def build_budget_artifact_schema(
    records: List[Dict[str, Any]],
    *,
    total_budget: float,
    category_count: int,
    lot_count: Optional[int],
    uom_options: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Build the fixed budget-artifact schema from real DB rows.

    Totals and the line count come from the rows themselves; cost-per-lot uses
    the supplied lot_count (SUM of parcel units_total) — never recomputed from a
    parcel row count.

    ``uom_options`` is the active ``core_fin_uom`` picklist as
    ``[{'value': code, 'label': name}]``. When supplied it rides on the UOM
    column so the renderer offers a dropdown; the column is FK-constrained, so
    free text there would be rejected by the database. Omitted → the column
    behaves as before."""
    line_item_count = len(records)
    cost_per_lot = (total_budget / lot_count) if lot_count else None

    kpi_pairs: List[Dict[str, Any]] = [
        {'label': 'Total Budget', 'value': round(total_budget)},
        {'label': 'Line Items', 'value': line_item_count},
        {'label': 'Categories', 'value': category_count},
    ]
    if cost_per_lot is not None:
        kpi_pairs.append({'label': 'Cost / Lot', 'value': round(cost_per_lot)})

    captured_at = datetime.now(timezone.utc).isoformat()

    rows: List[Dict[str, Any]] = []
    for idx, r in enumerate(records, start=1):
        refs = _cell_source_refs(r, captured_at)
        rows.append({
            'id': f"b{idx}",
            **({'editable': True, 'cell_source_refs': refs} if refs else {}),
            'cells': {
                'category': r.get('category_name') or '(uncategorized)',
                'description': r.get('notes') or '(no description)',
                'uom': r.get('uom_code') or '',
                'qty': _num(r.get('qty')),
                'rate': _num(r.get('rate')),
                'amount': _num(r.get('amount')),
                'period': _period_label(r),
            },
        })

    return {
        'blocks': [
            {
                'id': 'budget_kpis',
                'type': 'key_value_grid',
                'columns': 4,
                'pairs': kpi_pairs,
            },
            {
                'id': 'budget_line_items',
                'type': 'table',
                'columns': [
                    {'key': 'category', 'label': 'Category', 'align': 'left'},
                    {'key': 'description', 'label': 'Description', 'align': 'left'},
                    {
                        'key': 'uom', 'label': 'UOM', 'align': 'left',
                        # Picklist — the renderer offers these as a dropdown
                        # rather than a free-text editor (FK-constrained column).
                        **({'options': uom_options} if uom_options else {}),
                    },
                    {'key': 'qty', 'label': 'Qty', 'align': 'right'},
                    {'key': 'rate', 'label': 'Rate', 'align': 'right'},
                    {'key': 'amount', 'label': 'Amount', 'align': 'right'},
                    {'key': 'period', 'label': 'Period', 'align': 'right'},
                ],
                'rows': rows,
            },
        ],
    }


def fetch_budget_schedule_data(project_id: int) -> Dict[str, Any]:
    """Read the budget-schedule inputs for a project in ONE place.

    Single source of truth for the schedule read path so the tool executor
    (``get_budget_schedule``) and the after-write refresh
    (``_refresh_artifact_after_write``) build byte-identical schemas — the
    editing spine depends on the refreshed artifact matching what a fresh
    render would produce. Returns the same fields the executor computes:
    records (qty/rate/amount coerced to float), total_budget, category_count,
    lot_count (SUM parcel units_total, the cost-per-lot denominator), and
    project_name. ``records`` is empty when the project has no line items.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT f.fact_id, f.category_id, c.category_name,
                   f.uom_code, f.qty, f.rate, f.amount,
                   f.start_date, f.end_date, f.notes,
                   f.start_period, f.periods_to_complete, f.end_period,
                   -- Added for the view specification (budget slice 1). Purely
                   -- additive: the block-schema builder reads named keys, so
                   -- extra keys on each record cannot change what it emits.
                   f.division_id, f.activity, f.internal_memo
            FROM landscape.core_fin_fact_budget f
            LEFT JOIN landscape.core_unit_cost_category c
                ON f.category_id = c.category_id
            WHERE f.project_id = %s
            ORDER BY c.account_level, c.sort_order, f.fact_id
            """,
            [project_id],
        )
        columns = [col[0] for col in cursor.description]
        records = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Cost-per-lot denominator = SUM(parcel units_total) = the LOT count,
        # NOT a parcel row count.
        cursor.execute(
            """
            SELECT COALESCE(SUM(units_total), 0)
            FROM landscape.tbl_parcel WHERE project_id = %s
            """,
            [project_id],
        )
        lot_row = cursor.fetchone()
        lot_count = int(lot_row[0]) if lot_row and lot_row[0] else None

        cursor.execute(
            "SELECT project_name FROM landscape.tbl_project WHERE project_id = %s",
            [project_id],
        )
        pn = cursor.fetchone()
        project_name = pn[0] if pn else None

        # UOM picklist (CB10). `uom_code` is FK-constrained to core_fin_uom, so
        # the artifact carries the allowed codes and the renderer offers a
        # dropdown — typing into a foreign key only earns a database rejection.
        # Read here (not in the tool) so the after-write refresh rebuilds the
        # identical schema, options included.
        cursor.execute(
            """
            SELECT uom_code, name FROM landscape.core_fin_uom
            WHERE is_active ORDER BY uom_code
            """
        )
        uom_options = [
            {'value': row[0], 'label': f'{row[0]} — {row[1]}' if row[1] else row[0]}
            for row in cursor.fetchall()
        ]

    for r in records:
        for k in ('qty', 'rate', 'amount'):
            if r.get(k) is not None:
                r[k] = float(r[k])

    total_budget = sum((r.get('amount') or 0) for r in records)
    category_count = len({
        r.get('category_id') for r in records if r.get('category_id') is not None
    })

    return {
        'records': records,
        'total_budget': float(total_budget),
        'category_count': category_count,
        'lot_count': lot_count,
        'project_name': project_name,
        'uom_options': uom_options,
    }


def build_budget_view_config_for_project(project_id: int) -> Optional[Dict[str, Any]]:
    """Build the budget artifact's VIEW SPECIFICATION for a project.

    Separate from the block schema on purpose. The block schema is what the
    generic renderer and the editing spine already consume and must keep
    working unchanged; the view specification is the settled 31 July design —
    level chips read from project configuration, detail rungs, grouping,
    derivation, provenance footer. Both are stored on the same artifact record,
    so there is one budget surface, not two.

    Returns ``None`` when the project has no budget line items.
    """
    data = fetch_budget_schedule_data(project_id)
    if not data['records']:
        return None
    from .schedule_view_spec import build_budget_view_config, fetch_project_levels
    return build_budget_view_config(
        project_id=project_id,
        project_name=data['project_name'],
        records=data['records'],
        total_budget=data['total_budget'],
        lot_count=data['lot_count'],
        levels=fetch_project_levels(project_id),
    )


def build_budget_schema_for_project(project_id: int) -> Optional[Dict[str, Any]]:
    """Fetch + build the fixed budget-artifact schema for a project.

    Returns ``None`` when the project has no budget line items (the caller
    decides what to do with an empty schedule). Used by the after-write
    refresh so the rebuilt artifact is identical to a fresh ``get_budget_schedule``
    render — same rows, same editable cell refs, same KPI header."""
    data = fetch_budget_schedule_data(project_id)
    if not data['records']:
        return None
    return build_budget_artifact_schema(
        data['records'],
        total_budget=data['total_budget'],
        category_count=data['category_count'],
        lot_count=data['lot_count'],
        uom_options=data.get('uom_options'),
    )


def create_budget_artifact(
    *,
    project_id: int,
    project_name: Optional[str],
    records: List[Dict[str, Any]],
    total_budget: float,
    category_count: int,
    lot_count: Optional[int],
    uom_options: Optional[List[Dict[str, Any]]] = None,
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the development-budget artifact server-side.

    Returns the artifact service envelope on success, or
    ``{'success': False, 'error': ...}``. Dedup: one canonical budget artifact
    per project — re-running updates in place (mirrors the OS / report tools).
    No ``artifact_subtype`` — this is not an operating statement, so the OS guard
    does not apply (its title carries no operating-statement keywords)."""
    if not records:
        return {'success': False, 'error': 'no budget line items to render'}

    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('budget_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    schema = build_budget_artifact_schema(
        records,
        total_budget=total_budget,
        category_count=category_count,
        lot_count=lot_count,
        uom_options=uom_options,
    )
    title = f'{project_name} — Development Budget' if project_name \
        else 'Development Budget'

    # The view specification (budget slice 1) rides alongside the block schema
    # on the SAME artifact record. The panel prefers it when present and falls
    # back to the blocks for artifacts saved before this existed — so nothing
    # regresses and there is never a second budget surface. If building it
    # fails the artifact still renders the old way; a view that cannot be built
    # must not take the budget down with it.
    view_config: Optional[Dict[str, Any]] = None
    try:
        from .schedule_view_spec import (
            build_budget_view_config,
            fetch_project_levels,
        )
        view_config = build_budget_view_config(
            project_id=project_id,
            project_name=project_name,
            records=records,
            total_budget=total_budget,
            lot_count=lot_count,
            levels=fetch_project_levels(project_id),
        )
    except Exception:  # noqa: BLE001
        logger.exception('budget_artifact_builder: view specification failed')

    params: Dict[str, Any] = {'server_rendered': True}
    if view_config:
        params['budget_view_config'] = view_config

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            edit_target={'modal_name': 'budget'},
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='get_budget_schedule',
            params_json=params,
            dedup_key='budget:line_item_detail',
            prior_tool_calls=['get_budget_schedule'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('budget_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
