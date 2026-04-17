"""
Map artifact tools for Landscaper.

Generates interactive map configurations that the frontend renders
as MapLibre GL artifacts in the right-side artifacts panel.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import requests
from django.db import connection

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('generate_map_artifact')
def generate_map_artifact(tool_input: Dict[str, Any] = None, project_id: int = None, **kwargs):
    """
    Generate an interactive aerial/satellite map artifact centered on the project location.
    The map renders in the artifacts panel with MapLibre GL.
    Supports optional overlay layers: comparables (markers) and custom markers.

    Args:
        tool_input: Dict with optional keys: title, basemap, zoom, pitch, bearing,
                    include_comps, custom_markers
        project_id: The active project ID
    """
    tool_input = tool_input or kwargs.get('tool_input', {})

    title = tool_input.get('title', 'Project Location')
    basemap = tool_input.get('basemap', 'satellite')
    zoom = tool_input.get('zoom', 15)
    pitch = tool_input.get('pitch', 45)
    bearing = tool_input.get('bearing', 0)
    include_comps = tool_input.get('include_comps', False)
    custom_markers = tool_input.get('custom_markers', [])

    # ── 1. Get project location ──────────────────────────────────
    center = None
    project_name = None
    location_str = None

    if project_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        location_lat, location_lon,
                        project_name,
                        jurisdiction_city, jurisdiction_state,
                        project_address
                    FROM landscape.tbl_project
                    WHERE project_id = %s
                """, [project_id])
                row = cursor.fetchone()

                if row:
                    lat, lon = row[0], row[1]
                    project_name = row[2]
                    city, state = row[3], row[4]
                    address = row[5]

                    if lat is not None and lon is not None:
                        center = [float(lon), float(lat)]  # MapLibre uses [lng, lat]

                    # Build location string for display
                    parts = [p for p in [city, state] if p]
                    location_str = ', '.join(parts) if parts else address

        except Exception as e:
            logger.error(f"Error fetching project location: {e}")

    if not center:
        # No coords on project — enter input mode.
        # Geocode city/state to get an approximate starting center.
        approx_center = _geocode_city_state(location_str)
        approx_zoom = 12 if approx_center else 4  # city-level or CONUS
        fallback_center = approx_center or [-98.5795, 39.8283]  # geographic center of US

        return {
            'success': True,
            'action': 'show_map_artifact',
            'map_config': {
                'title': title,
                'center': fallback_center,
                'zoom': approx_zoom,
                'pitch': 0,  # top-down for pin placement
                'bearing': 0,
                'basemap': basemap,
                'markers': [],
                'project_name': project_name,
                'location': location_str,
                'mode': 'input',  # signals frontend to enable pin placement
                'project_id': project_id,
            },
        }

    # ── 2. Build markers list ────────────────────────────────────
    markers: List[Dict[str, Any]] = []

    # Subject property marker
    markers.append({
        'id': 'subject',
        'coordinates': center,
        'label': project_name or 'Subject Property',
        'color': '#ef4444',
        'variant': 'pin',
        'popup': (
            f"<strong>{project_name or 'Subject'}</strong>"
            + (f"<br/>{location_str}" if location_str else '')
        ),
    })

    # ── 3. Optional: comparable markers ──────────────────────────
    if include_comps and project_id:
        try:
            comp_markers = _fetch_comp_markers(project_id)
            markers.extend(comp_markers)
        except Exception as e:
            logger.error(f"Error fetching comp markers: {e}")

    # ── 4. Custom markers from tool input ────────────────────────
    for i, cm in enumerate(custom_markers):
        markers.append({
            'id': f'custom_{i}',
            'coordinates': [cm['lng'], cm['lat']],
            'label': cm.get('label', f'Point {i + 1}'),
            'color': cm.get('color', '#3b82f6'),
            'variant': 'pin',
            'popup': f"<strong>{cm.get('label', f'Point {i + 1}')}</strong>",
        })

    # ── 5. Return artifact config ────────────────────────────────
    return {
        'success': True,
        'action': 'show_map_artifact',
        'map_config': {
            'title': title,
            'center': center,
            'zoom': zoom,
            'pitch': pitch,
            'bearing': bearing,
            'basemap': basemap,
            'markers': markers,
            'project_name': project_name,
            'location': location_str,
        },
    }


def _fetch_comp_markers(project_id: int) -> List[Dict[str, Any]]:
    """Fetch comparable properties with coordinates for map overlay."""
    markers = []
    comp_colors = {
        'land': '#22c55e',
        'multifamily': '#8b5cf6',
        'office': '#6366f1',
        'retail': '#f59e0b',
        'industrial': '#06b6d4',
    }

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    comp_id, comp_name, property_type,
                    latitude, longitude,
                    sale_price, sale_date,
                    address
                FROM landscape.tbl_market_comparable
                WHERE project_id = %s
                  AND latitude IS NOT NULL
                  AND longitude IS NOT NULL
                ORDER BY sale_date DESC NULLS LAST
                LIMIT 25
            """, [project_id])

            for row in cursor.fetchall():
                comp_id, name, prop_type = row[0], row[1], row[2]
                lat, lon = float(row[3]), float(row[4])
                price, date, address = row[5], row[6], row[7]

                color = comp_colors.get(
                    (prop_type or '').lower(), '#3b82f6'
                )

                popup_parts = [f"<strong>{name or f'Comp {comp_id}'}</strong>"]
                if address:
                    popup_parts.append(address)
                if price:
                    popup_parts.append(f"${price:,.0f}")
                if date:
                    popup_parts.append(str(date))

                markers.append({
                    'id': f'comp_{comp_id}',
                    'coordinates': [lon, lat],
                    'label': name or f'Comp {comp_id}',
                    'color': color,
                    'variant': 'numbered',
                    'popup': '<br/>'.join(popup_parts),
                })

    except Exception as e:
        logger.error(f"Error fetching comp markers for project {project_id}: {e}")

    return markers


def _geocode_city_state(location_str: Optional[str]) -> Optional[List[float]]:
    """
    Forward-geocode a 'City, State' string to [lng, lat] using Nominatim.
    Returns None on failure or if location_str is empty.
    """
    if not location_str or not location_str.strip():
        return None

    try:
        resp = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={
                'q': location_str.strip(),
                'format': 'json',
                'countrycodes': 'us',
                'limit': 1,
            },
            headers={'User-Agent': 'Landscape/1.0 (gregg@wolinfamily.com)'},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return [lon, lat]  # MapLibre uses [lng, lat]
    except Exception as e:
        logger.warning(f"Nominatim geocode failed for '{location_str}': {e}")

    return None
