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
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# Editing spine slice 3 (CB9) — the parcel-schedule cells a user may edit, and
# the real column each writes on ``tbl_parcel_sale_assumptions``.
#
# SCOPE DECISION (Gregg, 2026-07-28): the parcel schedule only. The rate card's
# price stays READ-ONLY this slice. Editing a rate-card price fires
# ``trg_recalc_on_pricing_change``, which does not recalculate — it DELETES the
# parcel sale rows for that product ("the frontend must handle null values").
# On project 9 that is up to 6 of 37 rows per price, taking any per-parcel
# override with them. Making price editable is a separate slice that has to
# rebuild what the delete removes.
#
# Everything derived stays out: gross, cost_of_sale and net are stored
# calculated values. Unlike the budget table there is NO trigger recomputing
# them, so the writer must recalculate the row (SaleCalculationService) after
# any write — see the CB9 handoff.
#
# ``commission`` is an OVERRIDE cell: writing commission_amount without also
# setting commission_override = true leaves the user's number to be silently
# reverted by the next recalculation. The writer owns that companion flag.
_EDITABLE_SALE_COLUMNS = {
    'sale_date': 'sale_date',
    'commission': 'commission_amount',
}


def _jsonable_capture(value: Any) -> Any:
    """JSON-safe capture value for a source_ref.

    The whole artifact schema (including these refs) is stored as JSON, so a raw
    ``date`` in ``captured_value`` silently breaks artifact persistence — the
    sale_date column is a DATE, so this is the load-bearing coercion. Dates →
    ISO string; Decimals → float; everything else unchanged."""
    if value is None:
        return None
    if hasattr(value, 'isoformat') and not isinstance(value, str):
        try:
            return value.isoformat()
        except Exception:  # noqa: BLE001
            return str(value)
    from decimal import Decimal
    if isinstance(value, Decimal):
        return float(value)
    return value


def _cell_source_refs(record: Dict[str, Any], captured_at: str) -> Dict[str, Any]:
    """Per-cell pointers at the real source row, for the editable cells only.

    ``row_id`` is the PARCEL id, not ``assumption_id``: ``tbl_parcel_sale_
    assumptions`` is UNIQUE on ``parcel_id`` and the existing writer
    (``update_parcel_sale_assumptions``) keys on the parcel. Presence of a ref
    is the write allowlist — a cell without one is read-only, whatever the
    row-level ``editable`` flag says.
    """
    parcel_id = record.get('parcel_id')
    if parcel_id is None:
        return {}
    return {
        cell_key: {
            'table': 'tbl_parcel_sale_assumptions',
            'row_id': parcel_id,
            'column': column,
            'captured_at': captured_at,
            'captured_value': _jsonable_capture(record.get(column)),
        }
        for cell_key, column in _EDITABLE_SALE_COLUMNS.items()
    }


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


# CB15 — human-readable offset-refusal notices for the schedule evidence cell.
# Each reads as ABSENT (no offset configured), never "$0" or a bare em dash. The
# two ways a per-FF offset can fail to apply — no benchmark for the parcel's unit
# vs frontage not derivable — are kept distinct: they have different fixes.
_OFFSET_NOTICE = {
    'no_offset_benchmark_for_uom': 'No offset — no benchmark for this unit',
    'no_offset_benchmark': 'No offset configured',
    'frontage_unavailable': 'No offset — frontage unavailable',
    'units_unavailable': 'No offset — unit count unavailable',
    'area_unavailable': 'No offset — area unavailable',
    'unsupported_uom': 'No offset — unsupported unit',
}


def _evidence_label(offset_status: Optional[str]) -> str:
    """Evidence-cell text: the offset-refusal notice when the offset does not
    resolve, else the default 'Benchmarks'. Front-foot (applied) parcels are
    unchanged."""
    if offset_status and offset_status != 'applied':
        return _OFFSET_NOTICE.get(offset_status, 'No offset configured')
    return 'Benchmarks'


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
        # Commission is editable via its per-cell source_ref (CB9). The renderer
        # gates on the ref, not this flag, but keep them aligned so the column
        # def is honest about what a user can edit.
        {'key': 'commission', 'label': 'Commission', 'align': 'right', 'editable': True},
        {'key': 'cost_of_sale', 'label': 'Cost of Sale', 'align': 'right', 'editable': False},
        # Net is CALCULATED (gross − commission − cost of sale); never editable.
        {'key': 'net', 'label': 'Net', 'align': 'right', 'editable': False},
        {'key': 'evidence', 'label': 'Evidence', 'align': 'left', 'editable': False},
    ])

    captured_at = datetime.now(timezone.utc).isoformat()

    schedule_data: List[Dict[str, Any]] = []
    for idx, r in enumerate(parcel_rows, start=1):
        refs = _cell_source_refs(r, captured_at)
        cells = {
            'parcel': r.get('parcel_code') or f"#{r.get('parcel_id')}",
            'sale_date': _date_label(r.get('sale_date')),
            'gross': _num(r.get('gross_sale_proceeds')),
            'commission': _num(r.get('commission_amount')),
            'cost_of_sale': _num(r.get('cost_of_sale')),
            'net': _num(r.get('net_sale_proceeds')),
            'evidence': _evidence_label(r.get('offset_status')),
        }
        if show_area:
            cells['area'] = r.get('area') or ''
        if show_phase:
            cells['phase'] = r.get('phase') or ''
        schedule_data.append({
            'id': f's{idx}',
            **({'editable': True, 'cell_source_refs': refs} if refs else {}),
            'cells': cells,
        })

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


# ─── Read path (CB9) ─────────────────────────────────────────────────────────
#
# The parcel-schedule + rate-card queries live here (not only in the
# get_sales_schedule tool) so the after-write refresh
# (commit_field_edit → _refresh_artifact_after_write) rebuilds a schema
# IDENTICAL to the fresh render. The editing spine depends on that single source
# of truth — the same reason the budget slice put its read path in
# ``fetch_budget_schedule_data``.


def fetch_sales_schedule_data(project_id: int) -> Dict[str, Any]:
    """Read the parcel sale schedule + pricing rate-card for one project.

    Returns everything ``build_sales_artifact_schema`` needs, already coerced:
    ``parcel_rows`` (with ``parcel_id`` for the editable cell refs), ``pricing_rows``,
    ``total_gross`` / ``total_net``, ``parcel_count`` / ``product_count``,
    ``span_label`` and ``project_name``. ``parcel_rows`` is empty for a project
    with no dated parcel sale assumptions (e.g. an MF deal)."""
    from django.db import connection

    with connection.cursor() as cursor:
        # Per-parcel sale schedule. Deductions: commission = commission_amount;
        # cost of sale = the remaining transaction costs (legal + closing +
        # title). Net is the stored net_sale_proceeds and equals
        # gross_sale_proceeds − total_transaction_costs by construction.
        cursor.execute("""
            SELECT
                p.parcel_id,
                p.parcel_code,
                p.product_code,
                COALESCE(a.area_alias, NULLIF('Area ' || a.area_no, 'Area ')) AS area,
                ph.phase_name AS phase,
                psa.sale_date,
                psa.gross_sale_proceeds,
                psa.commission_amount,
                (COALESCE(psa.total_transaction_costs, 0)
                    - COALESCE(psa.commission_amount, 0)) AS cost_of_sale,
                psa.net_sale_proceeds,
                p.type_code,
                p.lot_width,
                p.units_total,
                p.acres_gross
            FROM landscape.tbl_parcel p
            JOIN landscape.tbl_parcel_sale_assumptions psa
                ON psa.parcel_id = p.parcel_id
            LEFT JOIN landscape.tbl_area a ON p.area_id = a.area_id
            LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
            WHERE p.project_id = %s
              AND psa.sale_date IS NOT NULL
            ORDER BY psa.sale_date, p.parcel_code
        """, [project_id])
        columns = [col[0] for col in cursor.description]
        parcel_rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Pricing rate-card (the basis). Its own table — one row per product.
        cursor.execute("""
            SELECT
                lu_type_code,
                product_code,
                price_per_unit,
                unit_of_measure,
                growth_rate,
                growth_rate_set_id,
                benchmark_id
            FROM landscape.land_use_pricing
            WHERE project_id = %s
            ORDER BY lu_type_code, product_code
        """, [project_id])
        pcols = [col[0] for col in cursor.description]
        pricing_rows = [dict(zip(pcols, row)) for row in cursor.fetchall()]

        cursor.execute(
            "SELECT project_name FROM landscape.tbl_project WHERE project_id = %s",
            [project_id],
        )
        pn = cursor.fetchone()
        project_name = pn[0] if pn else None

    # Coerce the money columns to float (the builder emits raw numbers).
    for r in parcel_rows:
        for k in ('gross_sale_proceeds', 'commission_amount',
                  'cost_of_sale', 'net_sale_proceeds'):
            if r.get(k) is not None:
                r[k] = float(r[k])

    # Offset-resolution status per parcel (CB15) — so the schedule can say WHY a
    # parcel has no improvement offset (unknown vs a real zero), using the same
    # UOM resolution as the calculator. Deterministic, server-side; the pricing
    # UOM is the rate card the parcel prices against. Live against the current
    # benchmark config (adding/removing an offset benchmark changes it), not the
    # stored offset value.
    from apps.sales_absorption.services import SaleCalculationService
    uom_by_key = {(pr.get('lu_type_code'), pr.get('product_code')): pr.get('unit_of_measure')
                  for pr in pricing_rows}
    for r in parcel_rows:
        tc, pc = r.get('type_code'), r.get('product_code')
        pricing_uom = uom_by_key.get((tc, pc)) or uom_by_key.get((tc, None))
        try:
            r['offset_status'] = SaleCalculationService.resolve_offset_status(
                project_id, tc, pc, pricing_uom,
                r.get('lot_width'), r.get('units_total'), r.get('acres_gross'))
        except Exception:  # noqa: BLE001 — the notice is best-effort, never blocks the schedule
            r['offset_status'] = None

    total_gross = sum((r.get('gross_sale_proceeds') or 0) for r in parcel_rows)
    total_net = sum((r.get('net_sale_proceeds') or 0) for r in parcel_rows)
    parcel_count = len(parcel_rows)
    product_count = len({
        r.get('product_code') for r in parcel_rows if r.get('product_code')
    })

    # Sale-date span label ("2028–2034", or a single year).
    years = sorted({
        y for r in parcel_rows if (y := _year(r.get('sale_date'))) is not None
    })
    if years and years[0] != years[-1]:
        span_label = f'{years[0]}–{years[-1]}'
    elif years:
        span_label = str(years[0])
    else:
        span_label = '—'

    return {
        'parcel_rows': parcel_rows,
        'pricing_rows': pricing_rows,
        'total_gross': float(total_gross),
        'total_net': float(total_net),
        'parcel_count': parcel_count,
        'product_count': product_count,
        'span_label': span_label,
        'project_name': project_name,
    }


def build_sales_schema_for_project(project_id: int) -> Optional[Dict[str, Any]]:
    """Fetch + build the sales-schedule schema for a project.

    Returns the schema dict, or ``None`` when the project has no dated parcel
    sale assumptions (land-only guard — the caller renders "no schedule", not an
    empty artifact). Used by the after-write refresh path so a freshly-committed
    sale-cell edit re-renders exactly as a fresh ``get_sales_schedule`` would."""
    data = fetch_sales_schedule_data(project_id)
    if not data['parcel_rows']:
        return None
    return build_sales_artifact_schema(
        data['parcel_rows'],
        data['pricing_rows'],
        total_gross=data['total_gross'],
        total_net=data['total_net'],
        parcel_count=data['parcel_count'],
        product_count=data['product_count'],
        span_label=data['span_label'],
    )
