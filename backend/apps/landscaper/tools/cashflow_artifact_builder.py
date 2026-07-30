"""Server-side cash-flow / discounted-sellout schedule artifact builder.

Cash Flow base-artifact slice 1 (CF1 — LSCMD-CF-CASHFLOWSCHED-0724), extended by
the editing spine (CC2 — LSCMD-CC-EDITSPINE-CASHFLOW-0730). Mirrors
``sales_artifact_builder`` / ``budget_artifact_builder`` / ``os_artifact_builder``:
the model announces the artifact in one sentence; it NEVER composes the tables.

Cash Flow is the first *mostly-calculated* base artifact and the downstream of a
coupled cluster: it consumes Budget (outflows) + Sales/operations (inflows) and
adds only a strip of dual-input assumptions of its own. Three blocks:

  1. KPI header (all CALCULATED) — NPV, IRR, Equity Multiple, Peak Capital,
     periods. Engine outputs; never editable.
  2. Assumptions strip (the only EDITABLE cells) — the assumptions that actually
     steer THIS deal type (see ``assumption_spec_for``).
  3. Period grid (all CALCULATED) — per-period net revenue/NOI, costs, net cash
     flow, cumulative. Read-only; the engine owns every cell.

Ground-truth basis: this module NEVER computes cash-flow math. It consumes the
canonical engine envelope reduced by
``apps.financial.services.cashflow_routing.leveraged_cashflow_summary`` (the same
reduction the leveraged-cash-flow UI and the waterfall consume) plus the DCF
assumptions and the engine summary results (NPV/IRR/EM). So the artifact can
never drift from the returns path. Missing data → no artifact, never fabricated
numbers.

EDITING SPINE NOTES (CC2)
-------------------------
*Deal-type disclosure.* The assumptions strip renders the assumptions that bear
on THIS deal type — land deals get price growth / cost inflation / bulk sale;
income deals get going-in cap / vacancy / credit loss / management fee /
reserves. Previously the strip was hard-coded to a list that showed income-only
growth rows on land projects (where they are never populated) while hiding every
land assumption that drives a discounted sellout.

*The per-cell source_ref IS the write allowlist.* A cell carries a ref ⇒ it is
writable through ``commit_field_edit``. A cell without one is read-only whatever
any row-level flag says. Only assumptions backed by a real, writable column on
the engine-selected ``tbl_dcf_analysis`` row get a ref; benchmark-linked rows
(growth-rate sets) and non-allowlisted columns deliberately get none.

*The duplicate-row trap.* ``tbl_dcf_analysis`` is UNIQUE on
(project_id, property_type) and a project can legitimately hold BOTH a
``land_dev`` and a ``cre`` row — project 17 does. The engine only ever reads the
row matching the project's type (``DcfAnalysis.get_or_create_for_project``
filters on both). A write aimed at the other row would report success and change
no number on screen. So the ref pins ``row_id`` to the ``dcf_analysis_id`` this
render actually read, and the writer re-resolves and refuses on a mismatch.

*Percent cells take percents.* Rate values are emitted in PERCENT UNITS (20.0,
not 0.20) with a per-cell ``format: 'percent'``, matching the renderer's existing
percent convention. There is no magnitude heuristic anywhere on this path: what
the user types is the unit they see, and the writer scales by exactly 100 for the
fields declared percent. Out-of-band input is refused, never coerced.

*Provenance is not decoration.* A value the service substituted because the
stored column is NULL is tagged ``Assumed`` — never presented like a decision.
A stored value is ``Entered``; a growth row is ``Benchmark · <set name>``. There
is no silent fourth state: every row states its basis.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from django.db import connection

logger = logging.getLogger(__name__)

# Income-property project_type_codes (mirrors cashflow_routing).
INCOME_PROPERTY_TYPE_CODES = ('MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU')

# ---------------------------------------------------------------------------
# Assumption specification
# ---------------------------------------------------------------------------
#
# ``kind`` drives BOTH display formatting and write coercion:
#   'pct'      — stored as a decimal fraction; displayed + typed in percent units
#   'int'      — whole periods / years
#   'money'    — currency amount, stored as-is
#   'flag'     — boolean, display-only in this slice
#
# ``column`` is the real column on tbl_dcf_analysis. A spec entry with
# ``column=None`` is derived (benchmark-linked) and gets NO source_ref.
#
# ``writable`` mirrors tool_executor.ASSUMPTION_FIELD_TYPES — the single existing
# verified allowlist for this table. The two are asserted to agree by
# test_cashflow_artifact_builder, so a column can never become editable here
# without also being writable there.

_COMMON_SPEC: List[Dict[str, Any]] = [
    {'key': 'discount_rate', 'label': 'Discount Rate', 'kind': 'pct',
     'column': 'discount_rate', 'writable': True},
    {'key': 'hold_period_years', 'label': 'Hold Period (yrs)', 'kind': 'int',
     'column': 'hold_period_years', 'writable': True},
    {'key': 'exit_cap_rate', 'label': 'Exit Cap Rate', 'kind': 'pct',
     'column': 'exit_cap_rate', 'writable': True},
    {'key': 'selling_costs_pct', 'label': 'Selling Costs', 'kind': 'pct',
     'column': 'selling_costs_pct', 'writable': True},
]

_LAND_SPEC: List[Dict[str, Any]] = [
    # Growth is a LIBRARY LINK, not a typed value — the set is chosen elsewhere,
    # so these rows are read-only here and say which set they are using.
    {'key': 'price_growth_rate', 'label': 'Price Growth', 'kind': 'pct',
     'column': None, 'writable': False, 'benchmark_set_key': 'price_growth_set_id'},
    {'key': 'cost_inflation_rate', 'label': 'Cost Inflation', 'kind': 'pct',
     'column': None, 'writable': False, 'benchmark_set_key': 'cost_inflation_set_id'},
    # Bulk-sale exit. The on/off flag is not in the writable allowlist, so it
    # renders read-only rather than pretending to be editable.
    {'key': 'bulk_sale_enabled', 'label': 'Bulk Sale at Exit', 'kind': 'flag',
     'column': 'bulk_sale_enabled', 'writable': False},
    {'key': 'bulk_sale_period', 'label': 'Bulk Sale Period', 'kind': 'int',
     'column': 'bulk_sale_period', 'writable': True},
    {'key': 'bulk_sale_discount_pct', 'label': 'Bulk Sale Discount', 'kind': 'pct',
     'column': 'bulk_sale_discount_pct', 'writable': True},
]

_INCOME_SPEC: List[Dict[str, Any]] = [
    {'key': 'going_in_cap_rate', 'label': 'Going-In Cap Rate', 'kind': 'pct',
     'column': 'going_in_cap_rate', 'writable': True},
    {'key': 'vacancy_rate', 'label': 'Vacancy', 'kind': 'pct',
     'column': 'vacancy_rate', 'writable': True},
    {'key': 'stabilized_vacancy', 'label': 'Stabilized Vacancy', 'kind': 'pct',
     'column': 'stabilized_vacancy', 'writable': True},
    {'key': 'credit_loss', 'label': 'Credit Loss', 'kind': 'pct',
     'column': 'credit_loss', 'writable': True},
    {'key': 'management_fee_pct', 'label': 'Management Fee', 'kind': 'pct',
     'column': 'management_fee_pct', 'writable': True},
    {'key': 'reserves_per_unit', 'label': 'Reserves / Unit', 'kind': 'money',
     'column': 'reserves_per_unit', 'writable': True},
    {'key': 'income_growth_rate', 'label': 'Income Growth', 'kind': 'pct',
     'column': None, 'writable': False, 'benchmark_set_key': 'income_growth_set_id'},
    {'key': 'expense_growth_rate', 'label': 'Expense Growth', 'kind': 'pct',
     'column': None, 'writable': False, 'benchmark_set_key': 'expense_growth_set_id'},
]

_ALL_SPECS = _COMMON_SPEC + _LAND_SPEC + _INCOME_SPEC

# Percent-unit fields, exported so the write path scales by exactly the same set
# the render path formatted. One list, two consumers — no drift.
PERCENT_ASSUMPTION_COLUMNS = frozenset(
    s['column'] for s in _ALL_SPECS if s['column'] and s['kind'] == 'pct'
)

# Integer fields — coerced whole, never rounded silently from a fraction.
INTEGER_ASSUMPTION_COLUMNS = frozenset(
    s['column'] for s in _ALL_SPECS if s['column'] and s['kind'] == 'int'
)

# Every column this artifact will ever emit a source_ref for. The write path
# rejects anything outside it before touching the ORM.
EDITABLE_ASSUMPTION_COLUMNS = frozenset(
    s['column'] for s in _ALL_SPECS if s['column'] and s['writable']
)


def assumption_spec_for(property_type: str) -> List[Dict[str, Any]]:
    """The assumptions that bear on this deal type, in display order."""
    tail = _LAND_SPEC if property_type == 'land_dev' else _INCOME_SPEC
    return _COMMON_SPEC + tail


def property_type_for_code(project_type_code: Optional[str]) -> str:
    """Mirror ``DcfAnalysis.get_property_type_for_project`` exactly.

    The artifact MUST read the same row the engine reads, or an edit lands on a
    record nothing consumes.
    """
    return 'land_dev' if (project_type_code or '').upper() == 'LAND' else 'cre'


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _pct_label(value: Any) -> str:
    """Render a decimal fraction (0.09) as a percent string for KPI display.

    KPI-only helper (IRR). Assumption cells do NOT go through this — they emit
    raw percent-unit numbers so the cell stays numerically editable.
    """
    v = _num(value)
    if v is None:
        return '—'
    return f'{v * 100:.1f}%'


def _multiple_label(value: Any) -> str:
    v = _num(value)
    if v is None:
        return '—'
    return f'{v:.2f}x'


def _assumption_display_value(kind: str, value: Any) -> Any:
    """Cell value for an assumption row.

    Percent rows emit PERCENT UNITS as a number (0.20 → 20.0) and rely on the
    per-cell ``format: 'percent'`` for display, so the editor round-trips the
    same unit the user reads. Never a pre-formatted string — a string cell
    cannot be edited numerically.
    """
    if kind == 'flag':
        return 'Yes' if bool(value) else 'No'
    v = _num(value)
    if v is None:
        return None
    if kind == 'pct':
        return round(v * 100, 4)
    if kind == 'int':
        return int(v)
    return v


def _cell_format(kind: str) -> Optional[str]:
    if kind == 'pct':
        return 'percent'
    if kind == 'money':
        return 'currency'
    if kind == 'int':
        return 'number'
    return None


# ---------------------------------------------------------------------------
# Read path — single source of truth for the tool render AND the after-write
# refresh (mirrors budget/sales; without it the panel after an edit is built by
# different code than the panel before it).
# ---------------------------------------------------------------------------

_DCF_COLUMNS = [
    'dcf_analysis_id', 'property_type',
    'hold_period_years', 'discount_rate', 'exit_cap_rate', 'selling_costs_pct',
    'going_in_cap_rate', 'sensitivity_interval', 'vacancy_rate',
    'stabilized_vacancy', 'credit_loss', 'management_fee_pct',
    'reserves_per_unit', 'income_growth_set_id', 'expense_growth_set_id',
    'price_growth_set_id', 'cost_inflation_set_id',
    'bulk_sale_enabled', 'bulk_sale_period', 'bulk_sale_discount_pct',
]


def fetch_dcf_row(project_id: int, property_type: str) -> Optional[Dict[str, Any]]:
    """The ONE ``tbl_dcf_analysis`` row the engine reads for this project.

    Selected on (project_id, property_type) — the same pair
    ``DcfAnalysis.get_or_create_for_project`` uses, and the table's unique key.
    Returns None when no row exists yet (the artifact then shows every value as
    Assumed rather than inventing an Entered basis).
    """
    with connection.cursor() as cursor:
        cursor.execute(
            f"SELECT {', '.join(_DCF_COLUMNS)} FROM landscape.tbl_dcf_analysis "
            "WHERE project_id = %s AND property_type = %s",
            [project_id, property_type],
        )
        row = cursor.fetchone()
    if row is None:
        return None
    return dict(zip(_DCF_COLUMNS, row))


def resolve_engine_dcf_id(project_id: int) -> Optional[int]:
    """The dcf_analysis_id the ENGINE will read for this project.

    Used by the write path to refuse an edit aimed at a sibling row (a project
    may hold both a land_dev and a cre record; only one is ever consumed).
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT UPPER(COALESCE(project_type_code, '')) "
            "FROM landscape.tbl_project WHERE project_id = %s",
            [project_id],
        )
        prow = cursor.fetchone()
    if prow is None:
        return None
    row = fetch_dcf_row(project_id, property_type_for_code(prow[0]))
    return row['dcf_analysis_id'] if row else None


def _fetch_growth_set_names(set_ids: List[int]) -> Dict[int, str]:
    """Name each referenced growth-rate set so a benchmark row can say which
    library entry it is using. A row whose set cannot be named says so rather
    than rendering a bare rate with no basis."""
    ids = [int(i) for i in set_ids if i]
    if not ids:
        return {}
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT set_id, set_name FROM landscape.core_fin_growth_rate_sets "
            "WHERE set_id = ANY(%s)",
            [ids],
        )
        return {r[0]: r[1] for r in cursor.fetchall()}


def fetch_cashflow_schedule_data(project_id: int) -> Dict[str, Any]:
    """Everything the cash-flow artifact needs, read once.

    Kept in the builder (not the tool handler) so ``commit_field_edit`` →
    ``_refresh_artifact_after_write`` rebuilds a schema identical to a fresh
    render. Raises RuntimeError only if the engine itself fails; an un-modeled
    project yields ``rows == []`` and the caller degrades cleanly.
    """
    from apps.financial.services.cashflow_routing import leveraged_cashflow_summary
    from apps.landscaper.tool_executor import (
        CASHFLOW_RESULT_KEYS,
        _build_cashflow_assumptions,
        _fetch_cashflow_schedule,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT project_name, UPPER(COALESCE(project_type_code, '')) "
            "FROM landscape.tbl_project WHERE project_id = %s",
            [project_id],
        )
        prow = cursor.fetchone()
    project_name = prow[0] if prow else None
    project_type_code = (prow[1] if prow else '') or ''
    property_type = property_type_for_code(project_type_code)

    envelope = _fetch_cashflow_schedule(project_id)
    summary_reduced = leveraged_cashflow_summary(envelope)
    rows = summary_reduced.get('rows') or []

    assumptions = _build_cashflow_assumptions(project_id)
    engine_summary = envelope.get('summary') or {}
    results = {k: engine_summary[k] for k in CASHFLOW_RESULT_KEYS if k in engine_summary}

    dcf_row = fetch_dcf_row(project_id, property_type)
    spec = assumption_spec_for(property_type)
    set_ids = [
        dcf_row.get(s['benchmark_set_key'])
        for s in spec
        if s.get('benchmark_set_key') and dcf_row
    ]
    growth_set_names = _fetch_growth_set_names([i for i in set_ids if i])

    is_income = project_type_code in INCOME_PROPERTY_TYPE_CODES
    return {
        'project_name': project_name,
        'project_type_code': project_type_code,
        'property_type': property_type,
        'rows': rows,
        'assumptions': assumptions,
        'results': results,
        'dcf_row': dcf_row,
        'growth_set_names': growth_set_names,
        'net_revenue_label': 'Net Operating Income' if is_income else 'Net Revenue',
        'period_type': summary_reduced.get('periodType') or 'month',
        'total_periods': summary_reduced.get('totalPeriods') or len(rows),
        'total_net': summary_reduced.get('totalNet'),
    }


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

def _build_assumption_rows(
    spec: List[Dict[str, Any]],
    assumptions: Dict[str, Any],
    dcf_row: Optional[Dict[str, Any]],
    growth_set_names: Dict[int, str],
    captured_at: str,
) -> List[Dict[str, Any]]:
    """One row per assumption that bears on this deal type.

    Emits a source_ref ONLY for a writable column backed by the engine-selected
    DCF row. Presence of that ref is the write allowlist — a benchmark-linked or
    non-allowlisted row is inert by construction, not by a flag.
    """
    dcf_id = (dcf_row or {}).get('dcf_analysis_id')
    out: List[Dict[str, Any]] = []

    for idx, s in enumerate(spec, start=1):
        key = s['key']
        kind = s['kind']
        column = s['column']

        if kind == 'flag':
            raw = (dcf_row or {}).get(column)
        else:
            if key not in assumptions:
                # Driver-1 floor: a dimension absent from the payload is not a row.
                continue
            raw = assumptions.get(key)

        # ---- Basis. Never blank, never guessed. ---------------------------
        if s.get('benchmark_set_key'):
            set_id = (dcf_row or {}).get(s['benchmark_set_key'])
            set_name = growth_set_names.get(set_id) if set_id else None
            # No explicit set on the record → the service resolved a project or
            # global default. Say that plainly rather than implying a direct link.
            basis = f'Benchmark · {set_name}' if set_name else 'Benchmark · project default'
        elif dcf_row is not None and column and dcf_row.get(column) is not None:
            basis = 'Entered'
        else:
            # The stored column is NULL (or there is no record yet) and the
            # service supplied a default. That is an assumption, not a decision.
            basis = 'Assumed'

        cells: Dict[str, Any] = {
            'assumption': s['label'],
            'value': _assumption_display_value(kind, raw),
            'basis': basis,
        }

        row: Dict[str, Any] = {'id': f'a{idx}', 'cells': cells}

        fmt = _cell_format(kind)
        if fmt:
            row['cell_formats'] = {'value': fmt}

        if s['writable'] and column and dcf_id is not None:
            row['editable'] = True
            row['cell_source_refs'] = {
                'value': {
                    'table': 'tbl_dcf_analysis',
                    'row_id': dcf_id,
                    'column': column,
                    'captured_at': captured_at,
                    # Capture the STORED value (decimal fraction for a rate),
                    # not the displayed percent — the ref describes the row.
                    'captured_value': _num((dcf_row or {}).get(column)),
                },
            }

        out.append(row)

    return out


def build_cashflow_artifact_schema(
    rows: List[Dict[str, Any]],
    assumptions: Dict[str, Any],
    results: Dict[str, Any],
    *,
    net_revenue_label: str,
    period_type: str,
    total_periods: int,
    property_type: str = 'cre',
    dcf_row: Optional[Dict[str, Any]] = None,
    growth_set_names: Optional[Dict[int, str]] = None,
    captured_at: Optional[str] = None,
) -> Dict[str, Any]:
    """Build the fixed cash-flow-artifact schema (KPI header + assumptions strip +
    period grid).

    ``rows`` are the per-period rows from ``leveraged_cashflow_summary``:
    ``{seq, label, netRevenue, costs, financing, lotbank, reversion, net,
    cumulative}``. ``results`` are the engine summary outputs (NPV/IRR/EM/peak).
    Column presence on the period grid follows the Driver-1 floor: a component
    column (Financing, Reversion) appears only when any period carries it.
    """
    captured_at = captured_at or datetime.now(timezone.utc).isoformat()

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
    assumption_rows = _build_assumption_rows(
        assumption_spec_for(property_type),
        assumptions,
        dcf_row,
        growth_set_names or {},
        captured_at,
    )

    assumption_columns = [
        {'key': 'assumption', 'label': 'Assumption', 'align': 'left'},
        {'key': 'value', 'label': 'Value', 'align': 'right'},
        {'key': 'basis', 'label': 'Basis', 'align': 'left'},
    ]

    # ---- Period grid — Driver-1 floor: show a component only when it's nonzero -
    show_financing = any(abs(_num(r.get('financing')) or 0) > 0 for r in rows)
    show_reversion = any(abs(_num(r.get('reversion')) or 0) > 0 for r in rows)

    period_columns: List[Dict[str, Any]] = [
        {'key': 'period', 'label': 'Period', 'align': 'left'},
        {'key': 'net_revenue', 'label': net_revenue_label, 'align': 'right'},
        {'key': 'costs', 'label': 'Costs', 'align': 'right'},
    ]
    if show_financing:
        period_columns.append({'key': 'financing', 'label': 'Financing', 'align': 'right'})
    if show_reversion:
        period_columns.append({'key': 'reversion', 'label': 'Reversion', 'align': 'right'})
    period_columns.extend([
        # Net + cumulative are CALCULATED; Landscaper edits the assumptions above,
        # never these cells.
        {'key': 'net', 'label': 'Net Cash Flow', 'align': 'right'},
        {'key': 'cumulative', 'label': 'Cumulative', 'align': 'right'},
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


def build_cashflow_schema_for_project(project_id: int) -> Optional[Dict[str, Any]]:
    """Rebuild the cash-flow schema from the source of truth.

    Used by the tool AND by ``_refresh_artifact_after_write`` so the panel after
    an edit is produced by exactly the same code as the panel before it. Returns
    None when the project has no cash-flow periods (caller degrades; never an
    empty artifact).
    """
    data = fetch_cashflow_schedule_data(project_id)
    if not data['rows']:
        return None
    return build_cashflow_artifact_schema(
        data['rows'],
        data['assumptions'],
        data['results'],
        net_revenue_label=data['net_revenue_label'],
        period_type=data['period_type'],
        total_periods=data['total_periods'],
        property_type=data['property_type'],
        dcf_row=data['dcf_row'],
        growth_set_names=data['growth_set_names'],
    )


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
    property_type: str = 'cre',
    dcf_row: Optional[Dict[str, Any]] = None,
    growth_set_names: Optional[Dict[int, str]] = None,
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
        property_type=property_type,
        dcf_row=dcf_row,
        growth_set_names=growth_set_names,
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
