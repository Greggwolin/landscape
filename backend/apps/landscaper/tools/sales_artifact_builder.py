"""Server-side parcel-sales schedule artifact builder.

Sales base-artifact slice 1 (SS1 — LSCMD-SS-SALESSCHED-0724). Mirrors
``budget_artifact_builder`` (which itself mirrors ``os_artifact_builder``):
the model announces the artifact in one sentence; it never composes the tables.
This kills the turn-to-turn LLM-composition failure mode the budget artifact
had (churned / vanishing / bogus numbers) for the sales side.

The Sales schedule is a coupled pair rendered as ONE artifact:

  1. Pricing rate-card (the basis) — Product · Price · UOM · Escalation ·
     Evidence, from ``land_use_pricing``.
  2. Parcel sale schedule (the timing, what feeds cash flow) — Parcel · Area ·
     Phase · Sale date · Gross · Commission · Cost of Sale · Net · Evidence,
     from ``tbl_parcel`` ⟕ ``tbl_parcel_sale_assumptions``.

Ground-truth basis (SS1 decision, verified against QB8 + the returns path):
the headline gross/net are the STORED ``gross_sale_proceeds`` /
``net_sale_proceeds`` columns — the identical source
``analysis_tools._landdev_parcel_takedown_absorption_summary`` (the returns/
absorption tool) reports as its headline. This reconciles to QB8
($392.0M gross / $378.4M net on project 9) and never drifts from the returns.
(``LandDevCashFlowService`` additionally exposes an ESCALATED "modeled" total
that the returns keep separate; it is NOT the headline and is not used here.)

Net is CALCULATED, never emitted as an editable value:
    net = gross_sale_proceeds − commission − cost_of_sale
        = gross_sale_proceeds − total_transaction_costs
Deductions trace to the firm Benchmarks library (Commissions + Transaction
Costs sections); escalation traces to a Growth Rate factor.

Driver-1 disclosure floor (data existence) — the only disclosure this slice
does: one area → no Area column; one phase → no Phase column; no escalation on
any rate-card line → no Escalation column. Drivers 2 & 3 (context / user
direction) ride the same later engine as budget.

The renderer's universal tabular formatting (parens negatives, thousands
separators, em-dash zero, no ``$``) applies to the tables + kv_grid values for
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


def _year(value: Any) -> Optional[int]:
    """Extract a 4-digit year from a date / datetime / ISO string."""
    if value is None:
        return None
    try:
        return int(value.year)  # date / datetime
    except AttributeError:
        pass
    try:
        return int(str(value)[:4])
    except (TypeError, ValueError):
        return None


def _date_label(value: Any) -> str:
    """Render a sale date as ISO ``YYYY-MM-DD``; em dash when absent."""
    if value is None:
        return '—'
    try:
        return value.isoformat()[:10]  # date / datetime
    except AttributeError:
        return str(value)[:10]


def _escalation_label(record: Dict[str, Any]) -> str:
    """Render an escalation rate as a percent string, em dash when zero/absent.

    ``growth_rate`` is stored as a decimal fraction (0.03 = 3%)."""
    rate = _num(record.get('growth_rate'))
    if not rate:
        return '—'
    return f'{rate * 100:.1f}%'


def build_sales_artifact_schema(
    parcel_rows: List[Dict[str, Any]],
    pricing_rows: List[Dict[str, Any]],
    *,
    total_gross: float,
    total_net: float,
    parcel_count: int,
    product_count: int,
    span_label: str,
) -> Dict[str, Any]:
    """Build the fixed sales-artifact schema (KPI header + the two grids).

    Column presence follows the Driver-1 floor computed from the rows:
      - Area column hidden when all parcel rows share one area (or none set).
      - Phase column hidden when all parcel rows share one phase (or none set).
      - Escalation column (rate-card) hidden when no rate-card line escalates.
    """
    # ---- Driver-1 floor: decide column presence from the data --------------
    areas = {(r.get('area') or None) for r in parcel_rows}
    areas.discard(None)
    show_area = len(areas) > 1

    phases = {(r.get('phase') or None) for r in parcel_rows}
    phases.discard(None)
    show_phase = len(phases) > 1

    show_escalation = any(_num(r.get('growth_rate')) for r in pricing_rows)

    # ---- KPI header --------------------------------------------------------
    kpi_pairs: List[Dict[str, Any]] = [
        {'label': 'Total Gross Proceeds', 'value': round(total_gross)},
        {'label': 'Total Net Proceeds', 'value': round(total_net)},
        {'label': 'Sale-Date Span', 'value': span_label},
        {'label': 'Parcels', 'value': parcel_count},
        {'label': 'Products', 'value': product_count},
    ]

    # ---- Grid 1: Pricing rate-card ----------------------------------------
    pricing_columns: List[Dict[str, Any]] = [
        {'key': 'product', 'label': 'Product', 'align': 'left', 'editable': True},
        {'key': 'price', 'label': 'Price', 'align': 'right', 'editable': True},
        {'key': 'uom', 'label': 'UOM', 'align': 'left', 'editable': False},
    ]
    if show_escalation:
        pricing_columns.append(
            {'key': 'escalation', 'label': 'Escalation', 'align': 'right', 'editable': True}
        )
    pricing_columns.append(
        {'key': 'evidence', 'label': 'Evidence', 'align': 'left', 'editable': False}
    )

    pricing_data: List[Dict[str, Any]] = []
    for idx, r in enumerate(pricing_rows, start=1):
        product = r.get('product_code') or r.get('lu_type_code') or '(unspecified)'
        # Evidence: a stored Growth Rate set / benchmark reference when present,
        # otherwise the rate card itself.
        if r.get('growth_rate_set_id'):
            evidence = f"Growth Rate set {r.get('growth_rate_set_id')}"
        elif r.get('benchmark_id'):
            evidence = f"Benchmark {r.get('benchmark_id')}"
        else:
            evidence = 'Rate card'
        cells: Dict[str, Any] = {
            'product': product,
            'price': _num(r.get('price_per_unit')),
            'uom': r.get('unit_of_measure') or '',
            'evidence': evidence,
        }
        if show_escalation:
            cells['escalation'] = _escalation_label(r)
        pricing_data.append({'id': f'r{idx}', 'cells': cells})

    # ---- Grid 2: Parcel sale schedule -------------------------------------
    schedule_columns: List[Dict[str, Any]] = [
        {'key': 'parcel', 'label': 'Parcel', 'align': 'left', 'editable': False},
    ]
    if show_area:
        schedule_columns.append(
            {'key': 'area', 'label': 'Area', 'align': 'left', 'editable': False}
        )
    if show_phase:
        schedule_columns.append(
            {'key': 'phase', 'label': 'Phase', 'align': 'left', 'editable': False}
        )
    schedule_columns.extend([
        {'key': 'sale_date', 'label': 'Sale Date', 'align': 'right', 'editable': True},
        {'key': 'gross', 'label': 'Gross', 'align': 'right', 'editable': False},
        {'key': 'commission', 'label': 'Commission', 'align': 'right', 'editable': False},
        {'key': 'cost_of_sale', 'label': 'Cost of Sale', 'align': 'right', 'editable': False},
        # Net is CALCULATED (gross − commission − cost of sale); never editable.
        {'key': 'net', 'label': 'Net', 'align': 'right', 'editable': False},
        {'key': 'evidence', 'label': 'Evidence', 'align': 'left', 'editable': False},
    ])

    schedule_data: List[Dict[str, Any]] = []
    for idx, r in enumerate(parcel_rows, start=1):
        cells = {
            'parcel': r.get('parcel_code') or f"#{r.get('parcel_id')}",
            'sale_date': _date_label(r.get('sale_date')),
            'gross': _num(r.get('gross_sale_proceeds')),
            'commission': _num(r.get('commission_amount')),
            'cost_of_sale': _num(r.get('cost_of_sale')),
            'net': _num(r.get('net_sale_proceeds')),
            'evidence': 'Benchmarks',
        }
        if show_area:
            cells['area'] = r.get('area') or ''
        if show_phase:
            cells['phase'] = r.get('phase') or ''
        schedule_data.append({'id': f's{idx}', 'cells': cells})

    return {
        'blocks': [
            {
                'id': 'sales_kpis',
                'type': 'key_value_grid',
                'columns': 5,
                'pairs': kpi_pairs,
            },
            {
                'id': 'sales_pricing_ratecard',
                'type': 'table',
                'title': 'Pricing Rate-Card',
                'columns': pricing_columns,
                'rows': pricing_data,
            },
            {
                'id': 'sales_parcel_schedule',
                'type': 'table',
                'title': 'Parcel Sale Schedule',
                'columns': schedule_columns,
                'rows': schedule_data,
            },
        ],
    }


def create_sales_artifact(
    *,
    project_id: int,
    project_name: Optional[str],
    parcel_rows: List[Dict[str, Any]],
    pricing_rows: List[Dict[str, Any]],
    total_gross: float,
    total_net: float,
    parcel_count: int,
    product_count: int,
    span_label: str,
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the parcel-sales schedule artifact server-side.

    Returns the artifact service envelope on success, or
    ``{'success': False, 'error': ...}``. Dedup: one canonical sales artifact
    per project — re-running updates in place (mirrors the budget / OS tools).
    No ``artifact_subtype`` — this is not an operating statement, so the OS guard
    does not apply (its title carries no operating-statement keywords)."""
    if not parcel_rows:
        return {'success': False, 'error': 'no parcel sales to render'}

    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('sales_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    schema = build_sales_artifact_schema(
        parcel_rows,
        pricing_rows,
        total_gross=total_gross,
        total_net=total_net,
        parcel_count=parcel_count,
        product_count=product_count,
        span_label=span_label,
    )
    title = f'{project_name} — Sales Schedule' if project_name \
        else 'Sales Schedule'

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='get_sales_schedule',
            params_json={'server_rendered': True},
            dedup_key='sales:schedule_detail',
            prior_tool_calls=['get_sales_schedule'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('sales_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
