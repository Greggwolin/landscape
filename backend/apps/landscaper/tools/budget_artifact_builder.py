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
_EDITABLE_BUDGET_COLUMNS = (
    'qty', 'rate', 'uom',
    # Budget slice 2. `start`/`duration` are the cash-flow SPREADING inputs
    # (land_dev_cashflow_service._spread_cost and its TypeScript twin
    # src/lib/financial-engine/cashflow/costs.ts read them), and a second
    # trigger — trg_budget_calculate_end_period — derives end_period from the
    # pair on every write. `notes` is the WHY of a line, distinct from the
    # description that names it; see the mapping below, which is where that
    # distinction is actually enforced.
    'start', 'duration', 'notes',
    # Budget slice 2b -- the rest of the line. `description` becoming editable
    # is the moment the cross-over below stops being a reading hazard and
    # becomes a WRITING one: both halves are now user-editable, in opposite
    # directions, so the mapping is the only thing standing between a note and
    # a description. Tested in both directions.
    'division', 'stage', 'category', 'description',
    'vendor', 'timing_method', 'start_date', 'end_date',
    'curve_profile', 'curve_steepness',
    'escalation', 'escalation_method',
)

# Artifact cell key → the real column it writes, where they differ.
#
# ⚠️ THE ONE PLACE THIS MAPPING LIVES. Two entries CROSS OVER: the artifact's
# `description` is the column `notes`, and the artifact's `notes` is the column
# `internal_memo`. Getting this wrong does not fail loudly — it overwrites the
# line's description with the user's note and looks like it worked. Any cell key
# absent from _EDITABLE_BUDGET_COLUMNS gets no ref and therefore cannot be
# written at all, so an unmapped key fails closed rather than falling through to
# a same-named column. Asserted in test_budget_cell_column_mapping.
_BUDGET_CELL_TO_COLUMN = {
    'uom': 'uom_code',
    'start': 'start_period',
    'duration': 'periods_to_complete',
    # ⚠️ THE CROSS-OVER. Both of these are now editable, in opposite
    # directions. Read them together or not at all:
    'notes': 'internal_memo',       # the artifact's NOTE  -> internal_memo
    'description': 'notes',         # the artifact's TITLE -> notes
    # Slice 2b, plain renames:
    'division': 'division_id',
    'stage': 'activity',
    'category': 'category_id',
    'vendor': 'vendor_name',
    # The escalation cell writes the REFERENCE. Choosing a set also refreshes
    # the derived escalation_rate the engine reads; typing a rate instead
    # clears the reference. Both handled in _write_budget_cell.
    'escalation': 'growth_rate_set_id',
}

# Cells captured as raw text rather than coerced to a number. Everything else in
# _EDITABLE_BUDGET_COLUMNS is numeric.
_TEXTUAL_BUDGET_CELLS = frozenset({
    'uom', 'notes', 'description', 'stage', 'vendor', 'timing_method',
    'start_date', 'end_date', 'curve_profile', 'escalation_method',
})

# Captured as-is: booleans and the reference id, neither of which is a float.
_RAW_BUDGET_CELLS = frozenset({'escalation', 'division', 'category'})


def _capture(cell_key: str, raw: Any) -> Any:
    """The value a ref records, in a form that survives JSON persistence."""
    if hasattr(raw, 'isoformat'):
        return raw.isoformat()[:10]
    if cell_key in _TEXTUAL_BUDGET_CELLS or cell_key in _RAW_BUDGET_CELLS:
        return raw
    return _num(raw)


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
            # Numeric cells capture a number; the picklist captures its
            # code and the free-text note captures its string.
            #
            # Dates are coerced to ISO strings. The schema is PERSISTED AS
            # JSON, and a psycopg2 date lands in it unserialisable: the write
            # itself succeeds and then saving the rebuilt artifact raises
            # `Object of type date is not JSON serializable`, so the row is
            # updated while the client gets a 500 and shows the edit as still
            # pending. Only reachable once a line actually has a date, which is
            # why it survived the slice-2b field model unnoticed.
            'captured_value': _capture(cell_key, raw),
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
                # Budget slice 2. These three carry cell_source_refs, and
                # schema_validation requires every ref to name a DECLARED
                # column on the block — so they are real columns here, not
                # refs hanging off a table that does not show them. That
                # keeps the two budget surfaces consistent: the same fields
                # are editable on the block renderer and on the view spec.
                'start': r.get('start_period'),
                'duration': r.get('periods_to_complete'),
                'division': r.get('division_id'),
                'stage': r.get('activity'),
                'vendor': r.get('vendor_name'),
                'timing_method': r.get('timing_method'),
                'start_date': (r.get('start_date').isoformat()[:10]
                               if hasattr(r.get('start_date'), 'isoformat') else None),
                'end_date': (r.get('end_date').isoformat()[:10]
                             if hasattr(r.get('end_date'), 'isoformat') else None),
                'curve_profile': r.get('curve_profile'),
                'curve_steepness': _num(r.get('curve_steepness')),
                'escalation': r.get('growth_rate_set_id'),
                'escalation_method': r.get('escalation_method'),
                # The user's NOTE (internal_memo), not the line's description
                # (which is the `notes` column and renders as `description`).
                'notes': r.get('internal_memo'),
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
                    # Slice 2 editable columns. `period` above stays as the
                    # human-readable span; these are the two numbers behind it
                    # plus the free-text note.
                    {'key': 'start', 'label': 'Start', 'align': 'right'},
                    {'key': 'duration', 'label': 'Dur', 'align': 'right'},
                    {'key': 'notes', 'label': 'Notes', 'align': 'left'},
                    # Slice 2b. Declared because schema_validation rejects a
                    # cell_source_ref naming a column the block does not have.
                    {'key': 'division', 'label': 'Division', 'align': 'left'},
                    {'key': 'stage', 'label': 'Stage', 'align': 'left'},
                    {'key': 'vendor', 'label': 'Vendor', 'align': 'left'},
                    {'key': 'timing_method', 'label': 'Timing', 'align': 'left'},
                    {'key': 'start_date', 'label': 'Start date', 'align': 'left'},
                    {'key': 'end_date', 'label': 'End date', 'align': 'left'},
                    {'key': 'curve_profile', 'label': 'Curve', 'align': 'left'},
                    {'key': 'curve_steepness', 'label': 'Steep', 'align': 'right'},
                    {'key': 'escalation', 'label': 'Escalation', 'align': 'left'},
                    {'key': 'escalation_method', 'label': 'Esc. when', 'align': 'left'},
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
                   f.division_id, f.activity, f.internal_memo,
                   -- Budget slice 2b. Additive: the block-schema builder reads
                   -- named keys, so extra keys per record cannot change it.
                   f.vendor_name, f.timing_method, f.cf_start_flag,
                   f.curve_profile, f.curve_steepness,
                   f.growth_rate_set_id, f.escalation_rate, f.escalation_method
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
        # The label is the code and nothing else — the renderer shows an
        # option's label in the CELL as well as in the dropdown, so a
        # description here puts a sentence in every row of a two-character
        # column. Kept identical to the same list in
        # schedule_view_spec.build_budget_view_config; if one grows a
        # description the other must too, or the after-write refresh will
        # silently relabel the column.
        cursor.execute(
            """
            SELECT uom_code FROM landscape.core_fin_uom
            WHERE is_active ORDER BY uom_code
            """
        )
        uom_options = [
            {'value': row[0], 'label': row[0]}
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
