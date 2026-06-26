"""
Renovation-breakdown tool for Landscaper AI (RV — real per-slice renovation card).

Purpose: give the model REAL per-unit-type renovation numbers so it can build a
clean "renovation budget for the 1BR units" card from sourced data instead of
fabricating a per-bedroom breakdown. Ties EXACTLY to the Value-Add / Renovation
page, which spreads the $/SF renovation cost across the building's gross SF and
applies the resulting blended cost UNIFORMLY per unit:

    cost_per_unit = reno_cost_per_sf * (gross_sf / unit_count)
    program renovation total = reno_cost_per_sf * gross_sf
    per-slice renovation = cost_per_unit * slice_unit_count
    per-slice relocation  = relocation_incentive * slice_unit_count   (renovate_all)

Verified against project 17 (Chadron Terrace): $25/SF, gross_sf 138,504, 113
units -> $30,642 / unit -> $3,462,600 total, exactly matching the page.

Empty slice (a bedroom/unit type with no units) returns slice_empty=True plus the
real available types, so the model says "no such units — want the rent roll?"
rather than inventing one.
"""

import logging
from typing import Dict, Any, Optional
from django.db import connection
from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


def _f(val):
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _bedroom_label(bedrooms) -> str:
    """Page-aligned label for a bedroom count (0 -> Studio/Commercial bucket)."""
    try:
        b = int(round(float(bedrooms)))
    except (TypeError, ValueError):
        return "Other"
    if b <= 0:
        return "Studio / Commercial"
    return f"{b}BR"


def compute_renovation_breakdown(
    *,
    reno_cost_per_sf: float,
    relocation_incentive: float,
    renovate_all: bool,
    gross_sf: float,
    groups,
    bedrooms_filter: Optional[int] = None,
) -> Dict[str, Any]:
    """Pure renovation-breakdown math (no DB), so it is unit-testable.

    `groups` is an iterable of (bedrooms, unit_count). Reproduces the Renovation
    page exactly: cost_per_unit = reno_cost_per_sf * gross_sf / unit_count, applied
    uniformly. Returns rows + program totals, or a slice_empty payload."""
    unit_count = sum(int(g[1]) for g in groups)
    if not gross_sf or unit_count == 0:
        return {'value_add_enabled': True, 'computable': False,
                'message': ('Renovation is enabled but the project is missing the unit '
                            'count or building square footage needed to compute it.')}

    cost_per_unit = reno_cost_per_sf * (gross_sf / unit_count)

    all_rows = []
    for bedrooms, units in groups:
        units = int(units)
        renovation_cost = round(cost_per_unit * units)
        relocation_cost = round(relocation_incentive * units) if renovate_all else 0
        all_rows.append({
            'bedrooms': int(round(float(bedrooms))) if bedrooms is not None else None,
            'unit_type': _bedroom_label(bedrooms),
            'unit_count': units,
            'renovation_cost': renovation_cost,
            'relocation_cost': relocation_cost,
            'total': renovation_cost + relocation_cost,
        })

    program = {
        'reno_cost_per_sf': round(reno_cost_per_sf, 2),
        'gross_sf': round(gross_sf),
        'unit_count': unit_count,
        'cost_per_unit': round(cost_per_unit),
        'relocation_per_unit': round(relocation_incentive),
        'renovation_total': round(cost_per_unit * unit_count),
        'relocation_total': round(relocation_incentive * unit_count) if renovate_all else 0,
        'renovate_all': renovate_all,
        'basis': 'blended_uniform_per_unit',
        'basis_note': ('Renovation cost is $/SF spread across gross building SF and applied '
                       'evenly to every unit, so all unit types carry the same per-unit cost. '
                       'This matches the Renovation page exactly.'),
    }

    if bedrooms_filter is not None:
        rows = [r for r in all_rows if r['bedrooms'] == bedrooms_filter]
        if not rows:
            return {
                'value_add_enabled': True, 'computable': True, 'slice_empty': True,
                'requested_bedrooms': bedrooms_filter,
                'available_unit_types': [
                    {'unit_type': r['unit_type'], 'unit_count': r['unit_count']} for r in all_rows
                ],
                'message': (f"This project has no {bedrooms_filter}-bedroom units, so there "
                            f"is no {bedrooms_filter}BR renovation budget to show."),
            }
    else:
        rows = all_rows

    return {'value_add_enabled': True, 'computable': True, 'slice_empty': False,
            'requested_bedrooms': bedrooms_filter, 'rows': rows, 'program': program}


@register_tool('get_renovation_breakdown')
def handle_get_renovation_breakdown(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """
    Real per-unit-type renovation budget breakdown, tied to the Renovation page.

    tool_input:
      - bedrooms (optional int): filter to one bedroom count (e.g. 1 for the 1BR
        units). Omit for the full per-type breakdown.

    Returns rows per bedroom type with REAL unit_count, renovation_cost,
    relocation_cost and total, plus program totals. The model must build any card
    ONLY from these returned numbers.
    """
    if not project_id:
        return {'success': False, 'error': 'project_required',
                'message': 'A project is required for a renovation breakdown.'}

    bedrooms_filter = tool_input.get('bedrooms')
    try:
        bedrooms_filter = int(bedrooms_filter) if bedrooms_filter is not None else None
    except (TypeError, ValueError):
        bedrooms_filter = None

    try:
        with connection.cursor() as cur:
            # 1) Value-add assumptions (the renovation program).
            cur.execute(
                """
                SELECT is_enabled, reno_cost_per_sf, relocation_incentive,
                       renovate_all, units_to_renovate
                FROM landscape.tbl_value_add_assumptions
                WHERE project_id = %s
                """, [project_id])
            va = cur.fetchone()

            # 2) Project gross building SF (the basis the page spreads cost over).
            cur.execute(
                "SELECT gross_sf, project_name FROM landscape.tbl_project WHERE project_id = %s",
                [project_id])
            prow = cur.fetchone()
            gross_sf = _f(prow[0]) if prow else None
            project_name = (prow[1] if prow else None)

            # 3) Real unit counts per bedroom type (the page's Floor Plan Matrix
            #    groups one-beds together; bedroom grouping ties to that).
            cur.execute(
                """
                SELECT bedrooms, COUNT(*)::int AS units
                FROM landscape.tbl_multifamily_unit
                WHERE project_id = %s
                GROUP BY bedrooms
                ORDER BY bedrooms
                """, [project_id])
            groups = cur.fetchall()

        # Value-add not configured / disabled -> no renovation program to slice.
        if not va or not va[0]:
            return {
                'success': True,
                'project_id': project_id,
                'project_name': project_name,
                'value_add_enabled': False,
                'message': ('No renovation (value-add) program is configured for this '
                            'project, so there is no renovation budget to break out.'),
            }

        result = compute_renovation_breakdown(
            reno_cost_per_sf=_f(va[1]) or 0.0,
            relocation_incentive=_f(va[2]) or 0.0,
            renovate_all=bool(va[3]),
            gross_sf=gross_sf or 0.0,
            groups=groups,
            bedrooms_filter=bedrooms_filter,
        )
        result.update({'success': True, 'project_id': project_id, 'project_name': project_name})
        return result

    except Exception as e:
        logger.error("[get_renovation_breakdown] failed for project %s: %s", project_id, e)
        return {'success': False, 'error': 'renovation_breakdown_failed',
                'message': f'Could not compute the renovation breakdown: {e}'}
