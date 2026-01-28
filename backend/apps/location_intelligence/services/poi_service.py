"""
POI caching and retrieval service.

Manages POI data from OpenStreetMap with a 30-day cache in the database.
"""
import json
import math
from typing import Optional, List, Dict, Any
from django.db import connection
from loguru import logger

from .overpass_service import fetch_pois, POIResult

# Cache TTL in days
POI_CACHE_TTL_DAYS = 30


def _calculate_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula."""
    R = 3959  # Earth radius in miles

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def cache_pois(pois: List[POIResult]) -> int:
    """
    Cache POI results to database.

    Uses INSERT ... ON CONFLICT to upsert.

    Args:
        pois: List of POIResult objects

    Returns:
        Number of rows upserted
    """
    if not pois:
        return 0

    with connection.cursor() as cursor:
        count = 0
        for poi in pois:
            try:
                cursor.execute(f"""
                    INSERT INTO location_intelligence.poi_cache
                        (osm_id, osm_type, category, subcategory, name, lat, lon, tags, fetched_at, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW() + INTERVAL '{POI_CACHE_TTL_DAYS} days')
                    ON CONFLICT (osm_id, osm_type) DO UPDATE SET
                        category = EXCLUDED.category,
                        subcategory = EXCLUDED.subcategory,
                        name = EXCLUDED.name,
                        lat = EXCLUDED.lat,
                        lon = EXCLUDED.lon,
                        tags = EXCLUDED.tags,
                        fetched_at = NOW(),
                        expires_at = NOW() + INTERVAL '{POI_CACHE_TTL_DAYS} days'
                """, [
                    poi.osm_id,
                    poi.osm_type,
                    poi.category,
                    poi.subcategory,
                    poi.name,
                    poi.lat,
                    poi.lon,
                    json.dumps(poi.tags),
                ])
                count += 1
            except Exception as e:
                logger.warning(f"Failed to cache POI {poi.osm_id}: {e}")
                continue

        return count


def get_cached_pois(
    lat: float,
    lon: float,
    radius_miles: float,
    categories: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Get POIs from cache within radius.

    Uses PostGIS for efficient spatial query.

    Args:
        lat: Center latitude
        lon: Center longitude
        radius_miles: Search radius in miles
        categories: Optional list of categories to filter

    Returns:
        List of POI dicts with distance_miles added
    """
    radius_meters = radius_miles * 1609.34

    category_filter = ""
    params = [lon, lat, lon, lat, radius_meters]

    if categories:
        placeholders = ', '.join(['%s'] * len(categories))
        category_filter = f"AND category IN ({placeholders})"
        params.extend(categories)

    sql = f"""
        SELECT
            id,
            osm_id,
            osm_type,
            category,
            subcategory,
            name,
            lat,
            lon,
            address_full,
            city,
            state,
            tags,
            ST_Distance(
                geometry::geography,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
            ) / 1609.34 AS distance_miles
        FROM location_intelligence.poi_cache
        WHERE ST_DWithin(
            geometry::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
        )
        AND expires_at > NOW()
        {category_filter}
        ORDER BY distance_miles
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        columns = [col[0] for col in cursor.description]
        results = []
        for row in cursor.fetchall():
            poi = dict(zip(columns, row))
            poi['id'] = str(poi['id'])
            # Parse tags JSON if it's a string
            if poi.get('tags') and isinstance(poi['tags'], str):
                try:
                    poi['tags'] = json.loads(poi['tags'])
                except json.JSONDecodeError:
                    poi['tags'] = {}
            results.append(poi)

    return results


def get_pois_with_cache(
    lat: float,
    lon: float,
    radius_miles: float = 5.0,
    categories: Optional[List[str]] = None,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """
    Get POIs, using cache if available, fetching from Overpass if not.

    Args:
        lat: Center latitude
        lon: Center longitude
        radius_miles: Search radius in miles
        categories: Optional list of categories (default: all)
        force_refresh: If True, bypass cache and fetch fresh data

    Returns:
        Dict with POIs grouped by category and metadata
    """
    all_categories = ['hospital', 'grocery', 'school', 'university', 'transit', 'park']
    target_categories = categories or all_categories

    # Check cache first (unless force refresh)
    if not force_refresh:
        cached = get_cached_pois(lat, lon, radius_miles, target_categories)

        # Check if we have reasonable coverage
        cached_categories = set(p['category'] for p in cached)
        missing_categories = set(target_categories) - cached_categories

        if not missing_categories:
            # All categories have cached data
            return _format_poi_response(lat, lon, radius_miles, cached, from_cache=True)

    # Fetch from Overpass
    logger.info(f"Fetching POIs from Overpass for ({lat}, {lon})")
    fresh_pois = fetch_pois(lat, lon, radius_miles, target_categories)

    # Cache results
    if fresh_pois:
        cached_count = cache_pois(fresh_pois)
        logger.info(f"Cached {cached_count} POIs")

    # Return fresh data with distances calculated
    poi_dicts = []
    for poi in fresh_pois:
        poi_dict = {
            'osm_id': poi.osm_id,
            'osm_type': poi.osm_type,
            'category': poi.category,
            'subcategory': poi.subcategory,
            'name': poi.name,
            'lat': poi.lat,
            'lon': poi.lon,
            'tags': poi.tags,
            'distance_miles': round(_calculate_distance_miles(lat, lon, poi.lat, poi.lon), 2),
        }
        poi_dicts.append(poi_dict)

    return _format_poi_response(lat, lon, radius_miles, poi_dicts, from_cache=False)


def _format_poi_response(
    lat: float,
    lon: float,
    radius_miles: float,
    pois: List[Dict[str, Any]],
    from_cache: bool,
) -> Dict[str, Any]:
    """Format POI response with grouping and counts."""
    # Group by category
    by_category: Dict[str, List[Dict]] = {}
    for poi in pois:
        cat = poi['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(poi)

    # Sort each category by distance
    for cat in by_category:
        by_category[cat].sort(key=lambda p: p.get('distance_miles', 999))

    return {
        'center': {'lat': lat, 'lon': lon},
        'radius_miles': radius_miles,
        'pois': sorted(pois, key=lambda p: p.get('distance_miles', 999)),
        'by_category': by_category,
        'counts': {cat: len(items) for cat, items in by_category.items()},
        'total': len(pois),
        'source': 'cache' if from_cache else 'OpenStreetMap',
    }


def get_poi_stats() -> Dict[str, Any]:
    """Get statistics about cached POIs."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT category, COUNT(*)
                FROM location_intelligence.poi_cache
                WHERE expires_at > NOW()
                GROUP BY category
                ORDER BY category
            """)
            counts = dict(cursor.fetchall())

            cursor.execute("""
                SELECT COUNT(*)
                FROM location_intelligence.poi_cache
                WHERE expires_at <= NOW()
            """)
            expired = cursor.fetchone()[0]

            return {
                'by_category': counts,
                'total_cached': sum(counts.values()),
                'expired': expired,
            }

    except Exception as e:
        logger.error(f"Error getting POI stats: {e}")
        return {'error': str(e)}
