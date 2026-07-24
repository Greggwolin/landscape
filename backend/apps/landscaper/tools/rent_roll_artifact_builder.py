"""Server-side rent-roll schedule artifact builder.

Rent Roll base-artifact slice 1 (RR1 — LSCMD-RR-RENTROLL-0724). Mirrors
``cashflow_artifact_builder`` / ``sales_artifact_builder`` / ``budget_artifact_builder``:
the model announces the artifact in one sentence; it NEVER composes the table.

The rent roll is the unit-level basis of income and the coupled partner of the
operating statement (which already ships as its own deterministic artifact +
guard). This slice builds the rent-roll grid; the two are separate artifacts that
reference each other — the rent roll rolls up into the operating statement's
gross potential rent.

Disclosure here is driven by DATA GRANULARITY, not Area/Phase (income-property
flavor of the Driver-1 floor): a Market Rent column only when market rents exist,
Loss-to-Lease only when market sits beside in-place, a Subsidy column only when a
unit is Section 8, Delinquency only when past-due data is present, Renovation only
when a value-add status exists, Building only when there's more than one.

Editable-vs-calculated: in-place rent, market rent, status, and lease dates are
inputs; Loss-to-Lease is calculated (market − in-place). NOI and every operating
subtotal live on the operating-statement artifact, never here.

Money cells are raw numbers (the renderer formats: parens negatives, thousands
separators, em-dash zero, no ``$``); occupancy is a pre-formatted percent string.
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


def _truthy(value: Any) -> bool:
    """DB booleans may arrive as bool, 1/0, or 't'/'f' strings."""
    if isinstance(value, str):
        return value.strip().lower() in ('t', 'true', '1', 'y', 'yes')
    return bool(value)


def _date_label(value: Any) -> str:
    if value is None:
        return '—'
    try:
        return value.isoformat()[:10]
    except AttributeError:
        return str(value)[:10]


def build_rent_roll_artifact_schema(
    unit_rows: List[Dict[str, Any]],
    *,
    unit_count: int,
    occupied_count: int,
    total_in_place: float,
    total_market: Optional[float],
    total_loss_to_lease: Optional[float],
) -> Dict[str, Any]:
    """Build the fixed rent-roll-artifact schema (KPI header + rent-roll grid).

    Column presence follows the data-granularity Driver-1 floor computed from the
    rows.
    """
    # ---- Driver-1 floor: decide column presence from the data -----------------
    show_building = len({(r.get('building_name') or None) for r in unit_rows} - {None}) > 1
    show_sf = any(_num(r.get('square_feet')) for r in unit_rows)
    show_market = any(_num(r.get('market_rent')) for r in unit_rows)
    show_ltl = show_market and any(
        _num(r.get('market_rent')) is not None and _num(r.get('current_rent')) is not None
        for r in unit_rows
    )
    show_lease = any(r.get('lease_end_date') for r in unit_rows)
    show_subsidy = any(_truthy(r.get('is_section8')) for r in unit_rows)
    show_delinquency = any((_num(r.get('past_due_amount')) or 0) > 0 for r in unit_rows)
    show_reno = any((r.get('renovation_status') or '').strip() for r in unit_rows)

    # ---- KPI header (all calculated) ------------------------------------------
    occ_pct = f'{occupied_count / unit_count * 100:.1f}%' if unit_count else '—'
    kpi_pairs: List[Dict[str, Any]] = [
        {'label': 'Units', 'value': unit_count},
        {'label': 'Occupancy', 'value': occ_pct},
        {'label': 'In-Place Rent (mo)', 'value': round(total_in_place)},
    ]
    if total_market is not None:
        kpi_pairs.append({'label': 'Market Rent (mo)', 'value': round(total_market)})
    if total_loss_to_lease is not None:
        kpi_pairs.append({'label': 'Loss-to-Lease (mo)', 'value': round(total_loss_to_lease)})

    # ---- Rent-roll grid --------------------------------------------------------
    columns: List[Dict[str, Any]] = [
        {'key': 'unit', 'label': 'Unit', 'align': 'left', 'editable': False},
    ]
    if show_building:
        columns.append({'key': 'building', 'label': 'Building', 'align': 'left', 'editable': False})
    columns.append({'key': 'unit_type', 'label': 'Unit Type', 'align': 'left', 'editable': False})
    if show_sf:
        columns.append({'key': 'sf', 'label': 'SF', 'align': 'right', 'editable': True})
    columns.append({'key': 'in_place', 'label': 'In-Place Rent', 'align': 'right', 'editable': True})
    if show_market:
        columns.append({'key': 'market', 'label': 'Market Rent', 'align': 'right', 'editable': True})
    if show_ltl:
        # Loss-to-Lease is CALCULATED (market − in-place); never editable.
        columns.append({'key': 'loss_to_lease', 'label': 'Loss-to-Lease', 'align': 'right', 'editable': False})
    columns.append({'key': 'status', 'label': 'Status', 'align': 'left', 'editable': True})
    if show_lease:
        columns.append({'key': 'lease_end', 'label': 'Lease End', 'align': 'right', 'editable': True})
    if show_subsidy:
        columns.append({'key': 'subsidy', 'label': 'Subsidy', 'align': 'left', 'editable': False})
    if show_delinquency:
        columns.append({'key': 'delinquency', 'label': 'Delinquency', 'align': 'right', 'editable': True})
    if show_reno:
        columns.append({'key': 'reno', 'label': 'Reno Status', 'align': 'left', 'editable': True})
    columns.append({'key': 'evidence', 'label': 'Evidence', 'align': 'left', 'editable': False})

    rows: List[Dict[str, Any]] = []
    for idx, r in enumerate(unit_rows, start=1):
        in_place = _num(r.get('current_rent'))
        market = _num(r.get('market_rent'))
        cells: Dict[str, Any] = {
            'unit': r.get('unit_number') or f'#{r.get("unit_id")}',
            'unit_type': r.get('unit_type') or '',
            'in_place': in_place,
            'status': r.get('occupancy_status') or '',
            'evidence': 'Rent roll',
        }
        if show_building:
            cells['building'] = r.get('building_name') or ''
        if show_sf:
            cells['sf'] = _num(r.get('square_feet'))
        if show_market:
            cells['market'] = market
        if show_ltl:
            cells['loss_to_lease'] = (market - in_place) if (market is not None and in_place is not None) else None
        if show_lease:
            cells['lease_end'] = _date_label(r.get('lease_end_date'))
        if show_subsidy:
            cells['subsidy'] = 'Section 8' if _truthy(r.get('is_section8')) else ''
        if show_delinquency:
            cells['delinquency'] = _num(r.get('past_due_amount'))
        if show_reno:
            cells['reno'] = r.get('renovation_status') or ''
        rows.append({'id': f'u{idx}', 'cells': cells})

    return {
        'blocks': [
            {
                'id': 'rent_roll_kpis',
                'type': 'key_value_grid',
                'columns': 5,
                'pairs': kpi_pairs,
            },
            {
                'id': 'rent_roll_grid',
                'type': 'table',
                'title': 'Rent Roll',
                'columns': columns,
                'rows': rows,
            },
        ],
    }


def create_rent_roll_artifact(
    *,
    project_id: int,
    project_name: Optional[str],
    unit_rows: List[Dict[str, Any]],
    unit_count: int,
    occupied_count: int,
    total_in_place: float,
    total_market: Optional[float],
    total_loss_to_lease: Optional[float],
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Build + register the rent-roll schedule artifact server-side.

    Returns the artifact service envelope on success, or
    ``{'success': False, 'error': ...}``. Dedup: one canonical rent-roll artifact
    per project — re-running updates in place. No ``artifact_subtype`` — this is
    not an operating statement (its title carries no operating-statement
    keywords), so the OS guard does not apply.
    """
    if not unit_rows:
        return {'success': False, 'error': 'no units to render'}

    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('rent_roll_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    schema = build_rent_roll_artifact_schema(
        unit_rows,
        unit_count=unit_count,
        occupied_count=occupied_count,
        total_in_place=total_in_place,
        total_market=total_market,
        total_loss_to_lease=total_loss_to_lease,
    )
    title = f'{project_name} — Rent Roll' if project_name else 'Rent Roll'

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='get_rent_roll_schedule',
            params_json={'server_rendered': True},
            dedup_key='rent_roll:schedule_detail',
            prior_tool_calls=['get_rent_roll_schedule'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('rent_roll_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
