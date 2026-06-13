"""
Geocoding tool for Landscaper (FB-317).

On-demand forward geocoding: resolve an address (or a project's stored
address) to coordinates via the pluggable provider in
apps.location_intelligence.services.geocode_provider. Universal tool —
works pre- and post-project.

Scope (Gregg, 2026-06-12, chat MC): free OSM/Nominatim provider, swappable.
This tool is the on-demand half; the on-save hook + backfill command (which
write to the DB and need a migration) are handled separately per the CC
handoff MC-FBTRIAGE-0612-mc48-FB317.
"""

import logging
from typing import Any, Dict

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('geocode_address')
def geocode_address_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    user_id: str = None,
    **kwargs,
) -> Dict[str, Any]:
    """Resolve a street address to latitude/longitude coordinates.

    Args:
        tool_input: {
            address: free-text address string (optional if use_project_address)
            use_project_address: bool — geocode the active project's stored
                address instead of a passed string (requires project_id)
            persist: bool (default false) — when true AND a project address was
                geocoded, write the result back to tbl_project. Persistence is
                gated server-side; the tool reports whether it wrote.
        }

    Returns:
        {success, latitude, longitude, confidence, formatted_address,
         provider, persisted, error}
    """
    tool_input = tool_input or {}
    address = (tool_input.get('address') or '').strip()
    use_project_address = bool(tool_input.get('use_project_address'))
    persist = bool(tool_input.get('persist'))

    from apps.location_intelligence.services.geocode_provider import (
        geocode_address,
        build_project_address,
    )

    resolved_from_project = False
    if not address and use_project_address:
        if not project_id:
            return {
                'success': False,
                'error': 'use_project_address set but no project in context',
            }
        try:
            from django.db import connection
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT street_address, project_address, city, state, zip_code
                    FROM landscape.tbl_project WHERE project_id = %s
                    """,
                    [int(project_id)],
                )
                row = cur.fetchone()
            if not row:
                return {'success': False, 'error': f'project {project_id} not found'}
            address = build_project_address(
                street_address=row[0], project_address=row[1],
                city=row[2], state=row[3], zip_code=row[4],
            ) or ''
            resolved_from_project = True
        except Exception as exc:  # noqa: BLE001
            logger.exception('geocode_address_tool: project address lookup failed')
            return {'success': False, 'error': f'project lookup failed: {exc}'}

    if not address:
        return {
            'success': False,
            'error': 'no address provided (pass `address` or set use_project_address)',
        }

    result = geocode_address(address)
    if result.get('latitude') is None:
        return {
            'success': False,
            'error': result.get('error') or 'no_match',
            'formatted_address': result.get('formatted_address'),
            'provider': result.get('provider'),
        }

    persisted = False
    # Persistence only when explicitly requested AND we geocoded the project's
    # own address (never silently overwrite project coords from an ad-hoc
    # lookup). Writes the columns the FB-317 migration adds to tbl_project.
    if persist and resolved_from_project and project_id:
        try:
            from django.db import connection
            with connection.cursor() as cur:
                cur.execute(
                    """
                    UPDATE landscape.tbl_project
                    SET latitude = %s,
                        longitude = %s,
                        geocoding_confidence = %s,
                        geocoded_at = NOW(),
                        geocoded_by_service = %s
                    WHERE project_id = %s
                    """,
                    [
                        result['latitude'], result['longitude'],
                        result.get('confidence'), result.get('provider'),
                        int(project_id),
                    ],
                )
            persisted = True
        except Exception as exc:  # noqa: BLE001 — migration may not be applied yet
            logger.warning(f'geocode_address_tool: persist skipped — {exc}')

    return {
        'success': True,
        'latitude': result['latitude'],
        'longitude': result['longitude'],
        'confidence': result.get('confidence'),
        'formatted_address': result.get('formatted_address'),
        'provider': result.get('provider'),
        'persisted': persisted,
        'error': None,
    }
