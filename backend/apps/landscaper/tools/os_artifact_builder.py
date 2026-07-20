"""Server-side operating-statement artifact builder.

Perceived-speed fix #1 (RF chat, 2026-07-19). Previously the model received
the structured operations payload from ``get_operating_statement`` and then
hand-composed the entire artifact table row-by-row inside a ``create_artifact``
tool call — 60–83s turns in production, sometimes twice when the first
composition tripped the operating-statement guard. This module builds the
artifact server-side from the same payload, in the guard-canonical shape,
and registers it via ``create_artifact_record`` — the same pattern the
report generators use (``apps.reports.artifact_adapter``).

Shape contract (mirrors ``apps.artifacts.operating_statement_guard``):
  - exactly one top-level table block
  - columns: line / annual / per_unit
  - rates inline in labels ("Less: Physical Vacancy (9.7%)")
  - NO per-unit-type rental rows for t12 (guard forbids them — this was the
    exact rejection→retry loop observed in the production message log)
  - subtotals: Effective Gross Income; grand total: Net Operating Income
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Scenario discriminator → guard subtype.
_SUBTYPE_BY_SCENARIO = {
    'T12': 't12',
    'T-12': 't12',
    'T3_ANNUALIZED': 't12',
    'CURRENT_PRO_FORMA': 'current_proforma',
    'BROKER_PRO_FORMA': 'current_proforma',
}


def _subtype_for(scenario: Optional[str]) -> str:
    """Untagged ('default') and year-string scenarios are historical
    statements — treat as t12 for guard purposes; the rendering label
    carries the honest scenario name."""
    if not scenario:
        return 't12'
    return _SUBTYPE_BY_SCENARIO.get(scenario, 't12')


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _row(counter: Dict[str, int], line: str, annual: Optional[float],
         unit_count: int) -> Dict[str, Any]:
    counter['n'] += 1
    cells: Dict[str, Any] = {'line': line}
    if annual is not None:
        cells['annual'] = round(annual)
        cells['per_unit'] = round(annual / unit_count) if unit_count else None
    return {'id': f"r{counter['n']}", 'cells': cells}


def build_os_artifact_schema(
    payload: Dict[str, Any],
) -> Tuple[Dict[str, Any], int]:
    """Convert an ``operations_data`` payload into the canonical artifact
    schema. Returns (schema, unit_count). Totals come from the payload's
    ``totals`` block — never recomputed here."""
    totals = payload.get('totals') or {}
    summary = payload.get('property_summary') or {}
    unit_count = int(_num(summary.get('unit_count')))

    c = {'n': 0}
    rows: List[Dict[str, Any]] = []

    # ── Income ──────────────────────────────────────────────────────────
    rows.append(_row(c, 'Income', None, unit_count))
    gpr = _num(totals.get('gross_potential_rent'))
    rows.append(_row(c, 'Gross Potential Rent', gpr, unit_count))

    for ded in (payload.get('vacancy_deductions') or {}).get('rows') or []:
        label = str(ded.get('label') or 'Deduction')
        as_is = ded.get('as_is') or {}
        amount = _num(as_is.get('total'))
        rate = as_is.get('rate')
        if rate not in (None, ''):
            try:
                label = f"{label} ({float(rate) * 100:.1f}%)" if float(rate) < 1 \
                    else f"{label} ({float(rate):.1f}%)"
            except (TypeError, ValueError):
                pass
        if not label.lower().startswith('less'):
            label = f'Less: {label}'
        rows.append(_row(c, label, -abs(amount), unit_count))

    other_total = _num(totals.get('total_other_income'))
    if other_total:
        rows.append(_row(c, 'Other Income', other_total, unit_count))

    egi = _num(totals.get('effective_gross_income'))
    rows.append(_row(c, 'Effective Gross Income', egi, unit_count))

    # ── Operating expenses ──────────────────────────────────────────────
    rows.append(_row(c, 'Operating Expenses', None, unit_count))
    for exp in (payload.get('operating_expenses') or {}).get('rows') or []:
        # operations_data returns each opex category as a level-0 row carrying
        # its own `as_is.total`; deeper rows are children already summed into
        # that category total, so skip them to avoid double-counting.
        if int(exp.get('level') or 0) > 0:
            continue
        label = str(exp.get('label') or 'Expense')
        as_is = exp.get('as_is') or {}
        amount = _num(as_is.get('total'))
        if not amount:
            # Pure divider with no amount — label-only row.
            rows.append(_row(c, f'  {label}', None, unit_count))
            continue
        rows.append(_row(c, f'  {label}', abs(amount), unit_count))

    # NOTE: operations_data's operating_expenses section already includes
    # management fee + replacement reserves (its section_total equals
    # total_operating_expenses). Do NOT re-add them from `totals` here — that
    # double-counts and breaks reconciliation to Total Operating Expenses.

    total_opex = _num(totals.get('total_operating_expenses'))
    rows.append(_row(c, 'Total Operating Expenses', total_opex, unit_count))

    noi = _num(totals.get('as_is_noi'))
    rows.append(_row(c, 'Net Operating Income', noi, unit_count))

    schema = {
        'blocks': [{
            'id': 'operating_statement',
            'type': 'table',
            'columns': [
                {'key': 'line', 'label': 'Line Item', 'align': 'left'},
                {'key': 'annual', 'label': 'Annual', 'align': 'right'},
                {'key': 'per_unit', 'label': '$/Unit', 'align': 'right'},
            ],
            'rows': rows,
        }],
    }
    return schema, unit_count


def create_os_artifact(
    *,
    project_id: int,
    payload: Dict[str, Any],
    rendering_label: str,
    scenario: Optional[str],
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the operating-statement artifact server-side.

    Returns the artifact service envelope on success, or
    ``{'success': False, 'error': ...}``. Dedup: one canonical artifact per
    (project, scenario) — re-running updates in place, mirroring the report
    tools' dedup pattern."""
    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('os_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    schema, _unit_count = build_os_artifact_schema(payload)
    subtype = _subtype_for(scenario)

    try:
        return create_artifact_record(
            title=rendering_label,
            schema=schema,
            edit_target={'modal_name': 'operating_statement'},
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='get_operating_statement',
            artifact_subtype=subtype,
            params_json={'scenario': scenario, 'server_rendered': True},
            dedup_key=f'os:{scenario or "default"}',
            prior_tool_calls=['get_operating_statement'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('os_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
