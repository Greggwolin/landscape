"""Resolve a standard surface to its DEFINITION, live, for one project.

The second step of 2a. ``surface_map`` says which report renders which surface;
this says how to obtain that surface's definition without going through the
artifact record.

WHY NOT READ THE STORED ARTIFACT
--------------------------------
Every surface's view specification is already sitting on ``tbl_artifact`` in
``params_json``, and reading it from there would be four lines. It is forbidden.
An artifact bakes its specification at BUILD time, so a stored one can be weeks
old — the trap recorded on 2026-09-11 and acted on again on 2026-09-14. A report
rendered from a stale specification would disagree with the screen and there
would be nothing on either to say which was older. The definition is rebuilt on
demand, from the same builder the screen calls, or it is not used.

WHAT IS RESOLVABLE TODAY, AND WHAT IS NOT
-----------------------------------------
Five of the nine surfaces already have a project-level builder, because the
after-write refresh path needed one. Four do not: their builders are handed
pre-fetched data by the tool that calls them, and there is no function that
takes a project id and returns the surface. Writing those four fetchers is real
work with real query cost and it is NOT smuggled in here — ``resolve`` returns
None for them and ``UNRESOLVED`` says exactly what each one is missing, so the
gap is visible rather than being hidden behind a silent empty report.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, Optional


def _pricing(project_id: int) -> Optional[Dict[str, Any]]:
    from apps.landscaper.tools.pricing_register_builder import (
        build_pricing_register_refresh,
    )
    payload = build_pricing_register_refresh(project_id)
    return payload['view_config'] if payload else None


def _budget(project_id: int) -> Optional[Dict[str, Any]]:
    from apps.landscaper.tools.budget_artifact_builder import (
        build_budget_view_config_for_project,
    )
    return build_budget_view_config_for_project(project_id)


def _parcels(project_id: int) -> Optional[Dict[str, Any]]:
    from apps.landscaper.tools.parcels_artifact_builder import build_parcels_payload
    payload = build_parcels_payload(project_id)
    return payload.get('config') if payload else None


def _sales(project_id: int) -> Optional[Dict[str, Any]]:
    """The one surface whose two halves are built in different places.

    ``build_sales_schema_for_project`` exists and returns the schema; the view
    specification is built from that schema plus the project name, which the
    same fetch already produced. Both are taken from ONE fetch here rather than
    two, so the rows the specification carries are the rows the schema was built
    from — the property the sales specification's own docstring depends on.
    """
    from apps.landscaper.tools.sales_artifact_builder import (
        build_sales_artifact_schema,
        fetch_sales_schedule_data,
    )
    from apps.landscaper.tools.sales_view_spec import build_sales_view_config

    data = fetch_sales_schedule_data(project_id)
    if not data['parcel_rows']:
        return None
    schema = build_sales_artifact_schema(
        data['parcel_rows'],
        data['pricing_rows'],
        total_gross=data['total_gross'],
        total_net=data['total_net'],
        parcel_count=data['parcel_count'],
        product_count=data['product_count'],
        span_label=data['span_label'],
    )
    return build_sales_view_config(
        project_id=project_id,
        project_name=data.get('project_name'),
        schema=schema,
    )


def _cashflow(project_id: int) -> Optional[Dict[str, Any]]:
    from apps.landscaper.tools.cashflow_artifact_builder import (
        build_cashflow_refresh_payload,
    )
    payload = build_cashflow_refresh_payload(project_id)
    return payload['view_config'] if payload else None


# tool name -> builder taking a project id and returning the surface's definition
RESOLVERS: Dict[str, Callable[[int], Optional[Dict[str, Any]]]] = {
    'get_pricing_register': _pricing,
    'get_budget_schedule': _budget,
    'open_parcels': _parcels,
    'get_sales_schedule': _sales,
    'get_cashflow_schedule': _cashflow,
}

# The four with no project-level builder, and what each one actually needs. Read
# as a work list, not as an apology: each entry names the data its builder is
# handed today and therefore what a fetcher would have to produce.
UNRESOLVED: Dict[str, str] = {
    'get_capitalization_schedule': (
        'create_capitalization_artifact is handed lp_summary, gp_summary, '
        'project_summary and tier_config by its tool; no function fetches them '
        'from a project id.'
    ),
    'get_rent_roll_schedule': (
        'create_rent_roll_artifact is handed unit_rows and five totals by its '
        'tool; no function fetches them from a project id.'
    ),
    'get_operating_statement': (
        'build_os_artifact_schema takes an operations_data payload, and it has '
        'no view specification either — its definition is the schema.'
    ),
    'review_budget_variance': (
        'build_variance_artifact_schema takes a computed variance result, and '
        'it has no view specification either — its definition is the schema.'
    ),
}


class SurfaceUnavailable(RuntimeError):
    """This surface cannot be resolved live for this project, and why."""


def resolve(tool_name: str, project_id: int) -> Optional[Dict[str, Any]]:
    """The surface's definition for this project, rebuilt now.

    Returns None where the surface exists but this project has nothing to show
    (no budget lines, no dated sales, no cash flow) — the caller renders an
    honest "nothing here" rather than an empty table.

    Raises SurfaceUnavailable where the surface itself cannot be resolved, so
    that a missing fetcher reads as a missing fetcher and never as an empty
    project.
    """
    resolver = RESOLVERS.get(tool_name)
    if resolver is None:
        reason = UNRESOLVED.get(tool_name) or 'not a standard surface'
        raise SurfaceUnavailable(f'{tool_name}: {reason}')
    return resolver(project_id)
