"""
Pluggable forward-geocoding provider (FB-317).

A thin, swappable layer over the platform's existing Nominatim geocoder
(geocode_service.forward_geocode). The point of this module is the *interface*:
every consumer (on-save hooks, the Landscaper tool, the backfill command) calls
`geocode_address()` here, never the raw provider. Swapping to a paid service
later (Google, Mapbox, Census) means writing one new provider class and flipping
GEOCODER_PROVIDER in settings — no consumer touches.

Decision (Gregg, 2026-06-12, chat MC): ship on the free OSM/Nominatim provider
now, keep it swappable. Both on-save and on-demand geocoding.

Return contract — every provider returns this dict shape:
    {
        'latitude': float | None,
        'longitude': float | None,
        'confidence': float | None,   # 0.0–1.0, provider-normalized
        'formatted_address': str | None,
        'provider': str,              # 'nominatim' | 'google' | ...
        'error': str | None,          # set when lat/long are None
    }
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from django.conf import settings
from loguru import logger

from .geocode_service import forward_geocode as _nominatim_forward


# Nominatim's `importance` (0–1) is a rough relevance signal, not a true
# match-confidence. We pass it through as `confidence` but floor it so a
# successful geocode never reports 0.0 (which downstream might treat as a
# rejected match). Consumers that need a hard quality gate should compare
# against GEOCODER_MIN_CONFIDENCE (default 0.0 = accept all) in settings.
_NOMINATIM_MIN_REPORTED = 0.10


def _geocode_nominatim(address: str) -> Dict[str, Any]:
    raw = _nominatim_forward(address)
    lat = raw.get('lat')
    lon = raw.get('lon')
    if lat is None or lon is None:
        return {
            'latitude': None,
            'longitude': None,
            'confidence': None,
            'formatted_address': raw.get('address') or address,
            'provider': 'nominatim',
            'error': raw.get('error') or 'no_match',
        }
    importance = raw.get('importance')
    confidence = None
    if isinstance(importance, (int, float)):
        confidence = max(float(importance), _NOMINATIM_MIN_REPORTED)
    return {
        'latitude': float(lat),
        'longitude': float(lon),
        'confidence': confidence,
        'formatted_address': raw.get('address'),
        'provider': 'nominatim',
        'error': None,
    }


# Provider registry. Add new entries here (e.g. 'google': _geocode_google)
# without touching any consumer. The active provider is chosen by
# settings.GEOCODER_PROVIDER (default 'nominatim').
_PROVIDERS = {
    'nominatim': _geocode_nominatim,
}


def geocode_address(address: str) -> Dict[str, Any]:
    """Forward-geocode a free-text address via the configured provider.

    Returns the standard provider dict (see module docstring). Never raises —
    a provider failure returns a dict with latitude/longitude=None and an
    `error` string, so callers can branch on the result rather than catch.
    """
    if not address or not address.strip():
        return {
            'latitude': None, 'longitude': None, 'confidence': None,
            'formatted_address': None, 'provider': 'none',
            'error': 'empty_address',
        }

    provider_name = getattr(settings, 'GEOCODER_PROVIDER', 'nominatim')
    provider = _PROVIDERS.get(provider_name)
    if provider is None:
        logger.warning(
            f"GEOCODER_PROVIDER={provider_name!r} not registered; "
            f"falling back to nominatim"
        )
        provider = _geocode_nominatim
    try:
        return provider(address.strip())
    except Exception as exc:  # noqa: BLE001 — never propagate to caller
        logger.exception(f"geocode_address failed for {address!r}")
        return {
            'latitude': None, 'longitude': None, 'confidence': None,
            'formatted_address': address, 'provider': provider_name,
            'error': str(exc),
        }


def build_project_address(
    *,
    street_address: Optional[str] = None,
    project_address: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
) -> Optional[str]:
    """Assemble a geocodable one-line address from tbl_project parts.

    Prefers street_address, falls back to project_address. Returns None when
    there's nothing geocodable (no street line AND no city/state), so callers
    can skip the geocode call entirely.
    """
    line1 = (street_address or project_address or '').strip()
    locality_parts = [p for p in (city, state, zip_code) if p and str(p).strip()]
    if not line1 and not locality_parts:
        return None
    parts = [p for p in [line1, ', '.join(
        [x for x in [city, state] if x and str(x).strip()]
    ), (zip_code or '').strip()] if p]
    # De-dupe accidental double commas / empties.
    return ', '.join(p.strip().strip(',').strip() for p in parts if p.strip().strip(','))
