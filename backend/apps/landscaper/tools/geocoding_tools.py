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


@register_tool('geocode_rent_comps')
def geocode_rent_comps_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    **kwargs,
) -> Dict[str, Any]:
    """Look up and save map locations for this project's active rent comps that
    don't have coordinates yet, so they can be plotted on the map.

    Conservative-by-design (Gregg, 2026-06-16): this is the "yes, look them up"
    follow-through after generate_map_artifact reports comps with no saved
    location. ONLY call after the user has agreed. Geocodes each comp's stored
    address and writes the result back to tbl_rental_comparable. Comps with no
    address are skipped (reported, never invented).

    Args:
        tool_input: { limit: optional int cap on how many to process this call }
        project_id: active project (required)

    Returns:
        {success, located, failed, skipped_no_address, details[], error}
    """
    tool_input = tool_input or {}
    limit = tool_input.get('limit')

    if not project_id:
        return {'success': False, 'error': 'no project in context'}

    from django.db import connection
    from apps.location_intelligence.services.geocode_provider import geocode_address

    located = 0
    failed = 0
    skipped_no_address = 0
    details = []

    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT comparable_id, property_name, address
                FROM landscape.tbl_rental_comparable
                WHERE project_id = %s
                  AND is_active = true
                  AND (latitude IS NULL OR longitude IS NULL)
                ORDER BY distance_miles ASC NULLS LAST
                """,
                [int(project_id)],
            )
            rows = cur.fetchall()

        if isinstance(limit, int) and limit > 0:
            rows = rows[:limit]

        for comp_id, name, address in rows:
            if not address or not str(address).strip():
                skipped_no_address += 1
                details.append({'comp': name, 'status': 'no_address'})
                continue

            geo = geocode_address(str(address).strip())
            if geo.get('latitude') is None:
                failed += 1
                details.append({'comp': name, 'status': 'no_match'})
                continue

            try:
                with connection.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE landscape.tbl_rental_comparable
                        SET latitude = %s, longitude = %s, updated_at = NOW()
                        WHERE comparable_id = %s
                        """,
                        [geo['latitude'], geo['longitude'], comp_id],
                    )
                located += 1
                details.append({'comp': name, 'status': 'located'})
            except Exception as exc:  # noqa: BLE001
                failed += 1
                details.append({'comp': name, 'status': f'write_failed: {exc}'})

    except Exception as exc:  # noqa: BLE001
        logger.exception('geocode_rent_comps_tool failed')
        return {'success': False, 'error': str(exc)}

    return {
        'success': True,
        'located': located,
        'failed': failed,
        'skipped_no_address': skipped_no_address,
        'details': details,
        'error': None,
    }
