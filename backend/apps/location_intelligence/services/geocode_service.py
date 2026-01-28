"""
Reverse geocoding service using Nominatim.

Converts coordinates to human-readable addresses using OpenStreetMap's
Nominatim geocoding service.
"""
import time
from typing import Dict, Any
import requests
from loguru import logger

NOMINATIM_URL = "https://nominatim.openstreetmap.org"

# Rate limiting
_last_request_time: float = 0
_min_request_interval: float = 1.0


def _rate_limit():
    """Enforce rate limiting for Nominatim."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _min_request_interval:
        time.sleep(_min_request_interval - elapsed)
    _last_request_time = time.time()


def reverse_geocode(lat: float, lon: float) -> Dict[str, Any]:
    """
    Reverse geocode coordinates to address using Nominatim.

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        Dict with address, poi_name (if applicable), and raw response
    """
    _rate_limit()

    try:
        response = requests.get(
            f"{NOMINATIM_URL}/reverse",
            params={
                'format': 'json',
                'lat': lat,
                'lon': lon,
                'zoom': 18,
                'addressdetails': 1,
            },
            headers={'User-Agent': 'Landscape/1.0'},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        address_parts = data.get('address', {})

        return {
            'lat': lat,
            'lon': lon,
            'address': data.get('display_name', f"{lat}, {lon}"),
            'poi_name': data.get('name'),
            'address_parts': {
                'house_number': address_parts.get('house_number'),
                'road': address_parts.get('road'),
                'city': (
                    address_parts.get('city') or
                    address_parts.get('town') or
                    address_parts.get('village')
                ),
                'state': address_parts.get('state'),
                'postcode': address_parts.get('postcode'),
                'country': address_parts.get('country'),
            },
            'osm_type': data.get('osm_type'),
            'osm_id': data.get('osm_id'),
            'source': 'Nominatim',
        }

    except requests.RequestException as e:
        logger.error(f"Nominatim reverse geocode error: {e}")
        return {
            'lat': lat,
            'lon': lon,
            'address': f"{lat:.6f}, {lon:.6f}",
            'poi_name': None,
            'error': str(e),
            'source': 'fallback',
        }


def forward_geocode(address: str) -> Dict[str, Any]:
    """
    Forward geocode an address to coordinates using Nominatim.

    Args:
        address: Address string to geocode

    Returns:
        Dict with lat, lon, and address details
    """
    _rate_limit()

    try:
        response = requests.get(
            f"{NOMINATIM_URL}/search",
            params={
                'format': 'json',
                'q': address,
                'limit': 1,
                'addressdetails': 1,
            },
            headers={'User-Agent': 'Landscape/1.0'},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        if not data:
            return {
                'address': address,
                'lat': None,
                'lon': None,
                'error': 'No results found',
                'source': 'Nominatim',
            }

        result = data[0]
        address_parts = result.get('address', {})

        return {
            'lat': float(result.get('lat')),
            'lon': float(result.get('lon')),
            'address': result.get('display_name'),
            'address_parts': {
                'house_number': address_parts.get('house_number'),
                'road': address_parts.get('road'),
                'city': (
                    address_parts.get('city') or
                    address_parts.get('town') or
                    address_parts.get('village')
                ),
                'state': address_parts.get('state'),
                'postcode': address_parts.get('postcode'),
                'country': address_parts.get('country'),
            },
            'osm_type': result.get('osm_type'),
            'osm_id': result.get('osm_id'),
            'importance': result.get('importance'),
            'source': 'Nominatim',
        }

    except requests.RequestException as e:
        logger.error(f"Nominatim forward geocode error: {e}")
        return {
            'address': address,
            'lat': None,
            'lon': None,
            'error': str(e),
            'source': 'fallback',
        }
