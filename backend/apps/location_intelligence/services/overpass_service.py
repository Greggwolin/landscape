"""
OpenStreetMap Overpass API service for POI queries.

Fetches points of interest (hospitals, grocery stores, schools, etc.)
within a given radius of a coordinate point.
"""
import time
from typing import Optional, List
from dataclasses import dataclass
import requests
from loguru import logger

OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"

# Rate limiting: track last request time
_last_request_time: float = 0
_min_request_interval: float = 1.0  # 1 second between requests


@dataclass
class POIResult:
    """Single POI from Overpass API."""
    osm_id: int
    osm_type: str  # 'node', 'way', 'relation'
    category: str
    subcategory: Optional[str]
    name: Optional[str]
    lat: float
    lon: float
    tags: dict


# OSM tag mappings for each category
POI_CATEGORY_QUERIES = {
    'hospital': '[amenity=hospital]',
    'grocery': '[shop=supermarket]',
    'school': '[amenity=school]',
    'university': '[amenity=university]',
    'transit': '[public_transport=station]',
    'railway': '[railway=station]',
    'park': '[leisure=park]',
}


def _rate_limit():
    """Enforce rate limiting for Overpass API."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _min_request_interval:
        time.sleep(_min_request_interval - elapsed)
    _last_request_time = time.time()


def _build_overpass_query(lat: float, lon: float, radius_meters: float, category: str) -> str:
    """
    Build Overpass QL query for a category within radius of point.

    Args:
        lat: Center latitude
        lon: Center longitude
        radius_meters: Search radius in meters
        category: POI category key

    Returns:
        Overpass QL query string
    """
    # Handle transit which needs two tag types
    if category == 'transit':
        return f"""
        [out:json][timeout:30];
        (
          node[public_transport=station](around:{radius_meters},{lat},{lon});
          way[public_transport=station](around:{radius_meters},{lat},{lon});
          node[railway=station](around:{radius_meters},{lat},{lon});
          way[railway=station](around:{radius_meters},{lat},{lon});
        );
        out center;
        """

    tag_filter = POI_CATEGORY_QUERIES.get(category)
    if not tag_filter:
        raise ValueError(f"Unknown POI category: {category}")

    return f"""
    [out:json][timeout:30];
    (
      node{tag_filter}(around:{radius_meters},{lat},{lon});
      way{tag_filter}(around:{radius_meters},{lat},{lon});
    );
    out center;
    """


def _parse_overpass_response(data: dict, category: str) -> List[POIResult]:
    """
    Parse Overpass API JSON response into POIResult objects.

    Args:
        data: Raw JSON response from Overpass
        category: Category being queried

    Returns:
        List of POIResult objects
    """
    results = []

    for element in data.get('elements', []):
        osm_type = element.get('type')
        osm_id = element.get('id')
        tags = element.get('tags', {})

        # Get coordinates (ways use 'center' from 'out center')
        if osm_type == 'node':
            lat = element.get('lat')
            lon = element.get('lon')
        else:
            center = element.get('center', {})
            lat = center.get('lat')
            lon = center.get('lon')

        if not lat or not lon:
            continue

        # Determine subcategory from tags
        subcategory = None
        if category == 'transit':
            subcategory = tags.get('station') or tags.get('railway')
        elif category == 'school':
            subcategory = tags.get('school:type') or tags.get('isced:level')

        results.append(POIResult(
            osm_id=osm_id,
            osm_type=osm_type,
            category=category,
            subcategory=subcategory,
            name=tags.get('name'),
            lat=lat,
            lon=lon,
            tags=tags,
        ))

    return results


def fetch_pois(
    lat: float,
    lon: float,
    radius_miles: float,
    categories: List[str],
) -> List[POIResult]:
    """
    Fetch POIs from Overpass API for given categories.

    Args:
        lat: Center latitude
        lon: Center longitude
        radius_miles: Search radius in miles
        categories: List of category keys to fetch

    Returns:
        List of POIResult objects
    """
    radius_meters = radius_miles * 1609.34
    all_results = []

    for category in categories:
        try:
            _rate_limit()

            query = _build_overpass_query(lat, lon, radius_meters, category)

            response = requests.post(
                OVERPASS_API_URL,
                data={'data': query},
                headers={'User-Agent': 'Landscape/1.0'},
                timeout=60,
            )
            response.raise_for_status()

            data = response.json()
            results = _parse_overpass_response(data, category)
            all_results.extend(results)

            logger.info(f"Fetched {len(results)} {category} POIs within {radius_miles}mi of ({lat}, {lon})")

        except requests.RequestException as e:
            logger.error(f"Overpass API error for {category}: {e}")
            continue
        except Exception as e:
            logger.error(f"Error parsing {category} POIs: {e}")
            continue

    return all_results


def fetch_pois_all_categories(
    lat: float,
    lon: float,
    radius_miles: float = 5.0,
) -> List[POIResult]:
    """
    Fetch all supported POI categories.

    Args:
        lat: Center latitude
        lon: Center longitude
        radius_miles: Search radius in miles (default 5)

    Returns:
        List of POIResult objects for all categories
    """
    categories = ['hospital', 'grocery', 'school', 'university', 'transit', 'park']
    return fetch_pois(lat, lon, radius_miles, categories)
