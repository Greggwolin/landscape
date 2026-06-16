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
    # Which comparable set to plot when include_comps is true.
    # 'sale'  → tbl_market_comparable (sale comps)
    # 'rent'  → tbl_rental_comparable (rent comps)
    # Defaults to 'sale' for backward compatibility with prior callers.
    comp_kind = (tool_input.get('comp_kind') or 'sale').lower()
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
    # Plot only comps that already have coordinates. Count the ones missing
    # coordinates so the caller (Landscaper) can OFFER to look them up from
    # their addresses — never auto-write, never fabricate coordinates.
    comps_skipped_no_location = 0
    rent_summary = None  # {'comp_count', 'property_count'} for rent maps; honest counts
    if include_comps and project_id:
        try:
            if comp_kind == 'rent':
                comp_markers, comps_skipped_no_location, rent_summary = _fetch_rent_comp_markers(project_id)
            else:  # 'sale' (default / backward compatible)
                comp_markers = _fetch_comp_markers(project_id)
            markers.extend(comp_markers)
        except Exception as e:
            logger.error(f"Error fetching {comp_kind} comp markers: {e}")

    # ── 4. Custom markers from tool input ────────────────────────
    # Each custom marker may carry a rich popup. Precedence:
    #   1. explicit `popup` HTML string (use verbatim)
    #   2. assembled from optional detail fields (label + address + any
    #      `detail` lines: rent, distance, etc.) so rental/expense comps
    #      plotted as custom markers get informative popups, not a bare
    #      label. Previously this path emitted label-only popups, which is
    #      why clicked comp markers showed nothing useful.
    for i, cm in enumerate(custom_markers):
        label = cm.get('label', f'Point {i + 1}')
        if cm.get('popup'):
            popup_html = cm['popup']
        else:
            parts = [f"<strong>{label}</strong>"]
            if cm.get('address'):
                parts.append(str(cm['address']))
            details = cm.get('details')
            if isinstance(details, list):
                parts.extend(str(d) for d in details if d)
            elif isinstance(details, str) and details:
                parts.append(details)
            popup_html = '<br/>'.join(parts)
        markers.append({
            'id': f'custom_{i}',
            'coordinates': [cm['lng'], cm['lat']],
            'label': label,
            'color': cm.get('color', '#3b82f6'),
            'variant': 'pin',
            'popup': popup_html,
        })

    # ── 5. Return artifact config ────────────────────────────────
    result = {
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

    # Honest counts so the model narrates "N comps across M properties" instead
    # of a bare comp count that doesn't match the visible (one-per-property)
    # pins. Co-located unit-type rows collapse to one marker in
    # _fetch_rent_comp_markers (LSCMD-MAPCLUSTER-0616-mp5).
    if rent_summary is not None:
        n_comps = rent_summary['comp_count']
        n_props = rent_summary['property_count']
        result['plotted_comp_count'] = n_comps
        result['property_count'] = n_props
        # The MapLibre renderer shows map_config['title'] (it has no subtitle
        # field), so fold the honest count into the title where it's visible.
        prop_word = 'property' if n_props == 1 else 'properties'
        caption = f"{n_comps} rent comps across {n_props} {prop_word}"
        if n_comps > n_props:
            caption += " — several share a location"
        result['map_config']['title'] = caption

    # If some comps were left off the map for lack of coordinates, tell the
    # model so it can offer to look them up (conservative UX: plot what's
    # ready, offer the rest — never geocode or write silently).
    if comps_skipped_no_location:
        result['comps_skipped_no_location'] = comps_skipped_no_location
        result['relay_hint'] = (
            f"{comps_skipped_no_location} {comp_kind} comparable(s) have no saved map "
            f"location and were left off the map. Offer to look up their locations from "
            f"their addresses and add them — only proceed if the user says yes. Do not "
            f"invent coordinates."
        )

    # ── 6. Persist as a durable artifact (Option B) ──────────────
    # Give the map an artifact_id so it lists in the artifacts panel, surfaces
    # a chat card, and reopens — without forcing it through the block-document
    # renderer / operating-statement guard (those assume the four block types).
    # The real payload (map_config) rides in params_json; the schema is a
    # minimal valid text block purely to satisfy validate_block_document. The
    # map still draws live via the unchanged action/map_config keys above.
    #
    # Dedup by PURPOSE so distinct maps each keep their own slot and re-running
    # the same map updates in place: comp maps key on comp_kind ('rent'/'sale');
    # a non-comp (subject-only) map keys on its title slug.
    if project_id:
        try:
            from apps.artifacts.services import create_artifact_record

            if include_comps:
                artifact_title = f"Map — {comp_kind.capitalize()} Comps"
                map_dedup_key = comp_kind
            else:
                artifact_title = title or "Map"
                map_dedup_key = (title or "map").strip().lower().replace(' ', '-')[:60]

            artifact_envelope = create_artifact_record(
                title=artifact_title,
                schema={'blocks': [{
                    'type': 'text',
                    'id': 'map_note',
                    'content': 'Interactive map — opens in the map viewer.',
                }]},
                project_id=project_id,
                thread_id=kwargs.get('thread_id'),
                user_id=kwargs.get('user_id'),
                tool_name='generate_map_artifact',
                params_json={
                    'kind': 'map',
                    'comp_kind': comp_kind,
                    'include_comps': bool(include_comps),
                    # Stash the full config so a click-through from the artifacts
                    # list / chat card re-hydrates the live map from the record
                    # alone (read back by ArtifactWorkspacePanel's map branch).
                    'map_config': result['map_config'],
                },
                dedup_key=map_dedup_key,
            )

            if artifact_envelope.get('success') and 'artifact_id' in artifact_envelope:
                # Merge artifact_id + title so the frontend's extractArtifactCards
                # surfaces a chat card and the list shows a titled entry. The
                # existing action/map_config keys remain → live render unchanged.
                result = {
                    **result,
                    'artifact_id': artifact_envelope['artifact_id'],
                    'title': artifact_title,
                }
        except Exception as inner:
            # Best-effort: a registry-side failure must not break the live map.
            logger.warning(
                f"generate_map_artifact: artifact registration failed (non-fatal): {inner}",
                exc_info=True,
            )

    return result


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


def _fetch_rent_comp_markers(
    project_id: int,
) -> Tuple[List[Dict[str, Any]], int, Dict[str, int]]:
    """
    Fetch active rent comparables and aggregate them into ONE marker per
    property location.

    Most rent comps are the same property with several unit-type rows, all
    geocoded to that property's single coordinate. Emitting one marker per row
    stacks them — the map looks like ~7 pins while the narrated count says 45
    (LSCMD-MAPCLUSTER-0616-mp5). We group rows by rounded coordinate and emit
    one marker per group whose popup lists each unit type + rent.

    Returns (markers, skipped, summary):
      - skipped  = active comps with NO coordinates (still offered for geocoding)
      - summary  = {'comp_count': plotted rows, 'property_count': marker groups}
    """
    skipped = 0
    comp_count = 0
    # Group by rounded coordinate (5 decimals ≈ ~1m; absorbs float noise).
    # Plain dict preserves insertion order (distance ASC) on py3.7+.
    groups: Dict[Tuple[float, float], Dict[str, Any]] = {}

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    comparable_id, property_name, address,
                    latitude, longitude,
                    asking_rent, unit_type, distance_miles
                FROM landscape.tbl_rental_comparable
                WHERE project_id = %s
                  AND is_active = true
                ORDER BY distance_miles ASC NULLS LAST
            """, [project_id])

            for row in cursor.fetchall():
                name = row[1]
                lat, lon = row[3], row[4]
                rent, unit_type, distance = row[5], row[6], row[7]

                if lat is None or lon is None:
                    skipped += 1
                    continue

                comp_count += 1
                # One pin per PROPERTY. Rows of a property are sometimes geocoded
                # a few meters apart, so coordinate-rounding alone would split a
                # property into 2-3 pins (project 17: 7 properties → 15 distinct
                # coords). Key on property_name; fall back to rounded coordinate
                # for any unnamed row. The group keeps the FIRST (nearest, since
                # ordered by distance) row's coordinate as its pin location.
                key = (
                    name.strip().lower()
                    if name and name.strip()
                    else (round(float(lat), 5), round(float(lon), 5))
                )
                grp = groups.get(key)
                if grp is None:
                    grp = {
                        'lat': float(lat),
                        'lon': float(lon),
                        'names': {},      # property_name → frequency
                        'units': [],      # one line per comp row
                        'distance': distance,
                    }
                    groups[key] = grp

                if name:
                    grp['names'][name] = grp['names'].get(name, 0) + 1
                unit_label = str(unit_type) if unit_type else 'Unit'
                rent_label = f"${rent:,.0f}/mo" if rent is not None else 'rent n/a'
                grp['units'].append(f"{unit_label} — {rent_label}")
                if distance is not None and (
                    grp['distance'] is None or distance < grp['distance']
                ):
                    grp['distance'] = distance

    except Exception as e:
        logger.error(f"Error fetching rent comp markers for project {project_id}: {e}")
        return [], skipped, {'comp_count': comp_count, 'property_count': 0}

    markers: List[Dict[str, Any]] = []
    MAX_UNITS = 12
    for i, grp in enumerate(groups.values()):
        # Rows in a group normally share property_name; if not, take the most common.
        prop = max(grp['names'], key=grp['names'].get) if grp['names'] else f'Property {i + 1}'
        lines = [f"<strong>{prop}</strong>"]
        units = grp['units']
        lines.extend(units[:MAX_UNITS])
        if len(units) > MAX_UNITS:
            lines.append(f"+{len(units) - MAX_UNITS} more")
        if grp['distance'] is not None:
            lines.append(f"{grp['distance']} mi")

        markers.append({
            'id': f'rent_comp_group_{i}',
            'coordinates': [grp['lon'], grp['lat']],
            'label': prop,
            'color': '#8b5cf6',  # multifamily / rent
            'variant': 'numbered',
            'popup': '<br/>'.join(lines),
        })

    summary = {'comp_count': comp_count, 'property_count': len(markers)}
    return markers, skipped, summary


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
