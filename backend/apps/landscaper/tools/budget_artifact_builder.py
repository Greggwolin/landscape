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


def build_budget_artifact_schema(
    records: List[Dict[str, Any]],
    *,
    total_budget: float,
    category_count: int,
    lot_count: Optional[int],
) -> Dict[str, Any]:
    """Build the fixed budget-artifact schema from real DB rows.

    Totals and the line count come from the rows themselves; cost-per-lot uses
    the supplied lot_count (SUM of parcel units_total) — never recomputed from a
    parcel row count."""
    line_item_count = len(records)
    cost_per_lot = (total_budget / lot_count) if lot_count else None

    kpi_pairs: List[Dict[str, Any]] = [
        {'label': 'Total Budget', 'value': round(total_budget)},
        {'label': 'Line Items', 'value': line_item_count},
        {'label': 'Categories', 'value': category_count},
    ]
    if cost_per_lot is not None:
        kpi_pairs.append({'label': 'Cost / Lot', 'value': round(cost_per_lot)})

    rows: List[Dict[str, Any]] = []
    for idx, r in enumerate(records, start=1):
        rows.append({
            'id': f"b{idx}",
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
                    {'key': 'uom', 'label': 'UOM', 'align': 'left'},
                    {'key': 'qty', 'label': 'Qty', 'align': 'right'},
                    {'key': 'rate', 'label': 'Rate', 'align': 'right'},
                    {'key': 'amount', 'label': 'Amount', 'align': 'right'},
                    {'key': 'period', 'label': 'Period', 'align': 'right'},
                ],
                'rows': rows,
            },
        ],
    }


def create_budget_artifact(
    *,
    project_id: int,
    project_name: Optional[str],
    records: List[Dict[str, Any]],
    total_budget: float,
    category_count: int,
    lot_count: Optional[int],
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
    )
    title = f'{project_name} — Development Budget' if project_name \
        else 'Development Budget'

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            edit_target={'modal_name': 'budget'},
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='get_budget_schedule',
            params_json={'server_rendered': True},
            dedup_key='budget:line_item_detail',
            prior_tool_calls=['get_budget_schedule'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('budget_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
