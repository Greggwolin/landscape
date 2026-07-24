"""Server-side cash-flow / discounted-sellout schedule artifact builder.

Cash Flow base-artifact slice 1 (CF1 — LSCMD-CF-CASHFLOWSCHED-0724). Mirrors
``sales_artifact_builder`` / ``budget_artifact_builder`` / ``os_artifact_builder``:
the model announces the artifact in one sentence; it NEVER composes the tables.
This kills the turn-to-turn LLM-composition failure mode for the cash-flow side
before it can start.

Cash Flow is the first *mostly-calculated* base artifact and the downstream of a
coupled cluster: it consumes Budget (outflows) + Sales/operations (inflows) and
adds only a thin strip of dual-input assumptions of its own. So the artifact has
three blocks:

  1. KPI header (all CALCULATED) — NPV, IRR, Equity Multiple, Peak Capital,
     periods. Engine outputs; never editable.
  2. Assumptions strip (the only EDITABLE cells) — discount rate, hold period,
     exit cap, selling costs, growth. These are the handful of inputs that steer
     the whole schedule.
  3. Period grid (all CALCULATED) — per-period net revenue/NOI, costs, net cash
     flow, cumulative. Read-only; the engine owns every cell.

Ground-truth basis: this module NEVER computes cash-flow math. It consumes the
canonical engine envelope reduced by
``apps.financial.services.cashflow_routing.leveraged_cashflow_summary`` (the same
reduction the leveraged-cash-flow UI and the waterfall consume) plus the DCF
assumptions and the engine summary results (NPV/IRR/EM). So the artifact can
never drift from the returns path. Missing data → no artifact, never fabricated
numbers.

The renderer's universal tabular formatting (parens negatives, thousands
separators, em-dash zero, no ``$``) applies to the money tables + kv_grid values
for free — this module emits raw numbers for money cells, and pre-formatted
percent/multiple strings only for rate-like values (IRR, discount rate) where a
raw fraction would render as 0.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Assumption keys surfaced on the editable strip, in display order, with the
# label + formatting kind. Only keys actually present in the assumptions payload
# are rendered (no fabricated rows).
_ASSUMPTION_SPEC: List[Dict[str, str]] = [
    {'key': 'discount_rate', 'label': 'Discount Rate', 'kind': 'pct'},
    {'key': 'hold_period_years', 'label': 'Hold Period (yrs)', 'kind': 'int'},
    {'key': 'exit_cap_rate', 'label': 'Exit Cap Rate', 'kind': 'pct'},
    {'key': 'selling_costs_pct', 'label': 'Selling Costs', 'kind': 'pct'},
    {'key': 'income_growth_rate', 'label': 'Income Growth', 'kind': 'pct'},
    {'key': 'expense_growth_rate', 'label': 'Expense Growth', 'kind': 'pct'},
]


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _pct_label(value: Any) -> str:
    """Render a decimal fraction (0.09) as a percent string; em dash when absent.

    Values already >= 1.5 are treated as already-percent (9.0) to tolerate either
    storage convention without inventing a number."""
    v = _num(value)
    if v is None:
        return '—'
    pct = v * 100 if abs(v) <= 1.5 else v
    return f'{pct:.1f}%'


def _multiple_label(value: Any) -> str:
    v = _num(value)
    if v is None:
        return '—'
    return f'{v:.2f}x'


def _assumption_value_label(kind: str, value: Any) -> str:
    if value is None:
        return '—'
    if kind == 'pct':
        return _pct_label(value)
    if kind == 'int':
        v = _num(value)
        return str(int(v)) if v is not None else '—'
    return str(value)


def build_cashflow_artifact_schema(
    rows: List[Dict[str, Any]],
    assumptions: Dict[str, Any],
    results: Dict[str, Any],
    *,
    net_revenue_label: str,
    period_type: str,
    total_periods: int,
) -> Dict[str, Any]:
    """Build the fixed cash-flow-artifact schema (KPI header + assumptions strip +
    period grid).

    ``rows`` are the per-period rows from ``leveraged_cashflow_summary``:
    ``{seq, label, netRevenue, costs, financing, lotbank, reversion, net,
    cumulative}``. ``results`` are the engine summary outputs (NPV/IRR/EM/peak).
    Column presence on the period grid follows the Driver-1 floor: a component
    column (Financing, Reversion) appears only when any period carries it.
    """
    # ---- KPI header — engine outputs only, present keys only (no fabrication) --
    kpi_pairs: List[Dict[str, Any]] = []
    if results.get('npv') is not None:
        kpi_pairs.append({'label': 'Net Present Value', 'value': round(_num(results['npv']) or 0)})
    if results.get('irr') is not None:
        kpi_pairs.append({'label': 'IRR', 'value': _pct_label(results['irr'])})
    if results.get('equityMultiple') is not None:
        kpi_pairs.append({'label': 'Equity Multiple', 'value': _multiple_label(results['equityMultiple'])})
    if results.get('peakEquity') is not None:
        kpi_pairs.append({'label': 'Peak Capital', 'value': round(_num(results['peakEquity']) or 0)})
    period_word = (period_type or 'period').capitalize()
    kpi_pairs.append({'label': f'{period_word}s', 'value': int(total_periods or len(rows))})

    # ---- Assumptions strip — the ONLY editable cells --------------------------
    assumption_rows: List[Dict[str, Any]] = []
    for idx, spec in enumerate(_ASSUMPTION_SPEC, start=1):
        raw = assumptions.get(spec['key'])
        if raw is None:
            continue
        assumption_rows.append({
            'id': f'a{idx}',
            'cells': {
                'assumption': spec['label'],
                # Display string so rate-like values don't render as 0; the cell is
                # dual-input (editable) — the write path lands on the real
                # assumption behind it, never on a calculated cell.
                'value': _assumption_value_label(spec['kind'], raw),
                'evidence': 'Assumption',
            },
        })

    assumption_columns = [
        {'key': 'assumption', 'label': 'Assumption', 'align': 'left', 'editable': False},
        {'key': 'value', 'label': 'Value', 'align': 'right', 'editable': True},
        {'key': 'evidence', 'label': 'Evidence', 'align': 'left', 'editable': False},
    ]

    # ---- Period grid — Driver-1 floor: show a component only when it's nonzero -
    show_financing = any(abs(_num(r.get('financing')) or 0) > 0 for r in rows)
    show_reversion = any(abs(_num(r.get('reversion')) or 0) > 0 for r in rows)

    period_columns: List[Dict[str, Any]] = [
        {'key': 'period', 'label': 'Period', 'align': 'left', 'editable': False},
        {'key': 'net_revenue', 'label': net_revenue_label, 'align': 'right', 'editable': False},
        {'key': 'costs', 'label': 'Costs', 'align': 'right', 'editable': False},
    ]
    if show_financing:
        period_columns.append({'key': 'financing', 'label': 'Financing', 'align': 'right', 'editable': False})
    if show_reversion:
        period_columns.append({'key': 'reversion', 'label': 'Reversion', 'align': 'right', 'editable': False})
    period_columns.extend([
        # Net + cumulative are CALCULATED; Landscaper edits the assumptions above,
        # never these cells.
        {'key': 'net', 'label': 'Net Cash Flow', 'align': 'right', 'editable': False},
        {'key': 'cumulative', 'label': 'Cumulative', 'align': 'right', 'editable': False},
    ])

    period_rows: List[Dict[str, Any]] = []
    for idx, r in enumerate(rows, start=1):
        cells: Dict[str, Any] = {
            'period': r.get('label') or f'Period {r.get("seq", idx)}',
            'net_revenue': _num(r.get('netRevenue')),
            'costs': _num(r.get('costs')),
            'net': _num(r.get('net')),
            'cumulative': _num(r.get('cumulative')),
        }
        if show_financing:
            cells['financing'] = _num(r.get('financing'))
        if show_reversion:
            cells['reversion'] = _num(r.get('reversion'))
        period_rows.append({'id': f'p{idx}', 'cells': cells})

    return {
        'blocks': [
            {
                'id': 'cashflow_kpis',
                'type': 'key_value_grid',
                'columns': 5,
                'pairs': kpi_pairs,
            },
            {
                'id': 'cashflow_assumptions',
                'type': 'table',
                'title': 'Assumptions',
                'columns': assumption_columns,
                'rows': assumption_rows,
            },
            {
                'id': 'cashflow_periods',
                'type': 'table',
                'title': 'Cash Flow by Period',
                'columns': period_columns,
                'rows': period_rows,
            },
        ],
    }


def create_cashflow_artifact(
    *,
    project_id: int,
    project_name: Optional[str],
    rows: List[Dict[str, Any]],
    assumptions: Dict[str, Any],
    results: Dict[str, Any],
    net_revenue_label: str,
    period_type: str,
    total_periods: int,
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the cash-flow schedule artifact server-side.

    Returns the artifact service envelope on success, or
    ``{'success': False, 'error': ...}``. Dedup: one canonical cash-flow artifact
    per project — re-running updates in place (mirrors the budget / sales / OS
    tools). No ``artifact_subtype`` — this is not an operating statement, so the
    OS guard does not apply (its title carries no operating-statement keywords).
    """
    if not rows:
        return {'success': False, 'error': 'no cash-flow periods to render'}

    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('cashflow_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    schema = build_cashflow_artifact_schema(
        rows,
        assumptions,
        results,
        net_revenue_label=net_revenue_label,
        period_type=period_type,
        total_periods=total_periods,
    )
    title = f'{project_name} — Cash Flow' if project_name else 'Cash Flow'

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='get_cashflow_schedule',
            params_json={'server_rendered': True},
            dedup_key='cashflow:schedule_detail',
            prior_tool_calls=['get_cashflow_schedule'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('cashflow_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
