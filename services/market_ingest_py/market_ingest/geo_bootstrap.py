"""
Auto-bootstrap geo_xwalk records for any US city.

When a city is not found in geo_xwalk, this module resolves the full
geographic hierarchy (US → State → MSA → County → City) using Census
Bureau APIs and inserts all necessary records.

Data sources:
  - Census ACS API: place FIPS resolution (all incorporated places by state)
  - Census Geocoder API: county FIPS for a city (which county contains the city)
  - Static CBSA lookup: county → MSA mapping from Census delineation files
"""

from __future__ import annotations

import json
import re
from typing import Dict, List, Optional, Tuple

import requests
from loguru import logger

from .cbsa_lookup import get_cbsa
from .db import Database, GeoRecord

# ---------------------------------------------------------------------------
# State abbreviation ↔ FIPS mapping
# ---------------------------------------------------------------------------

ABBR_TO_FIPS: Dict[str, str] = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06",
    "CO": "08", "CT": "09", "DE": "10", "DC": "11", "FL": "12",
    "GA": "13", "HI": "15", "ID": "16", "IL": "17", "IN": "18",
    "IA": "19", "KS": "20", "KY": "21", "LA": "22", "ME": "23",
    "MD": "24", "MA": "25", "MI": "26", "MN": "27", "MS": "28",
    "MO": "29", "MT": "30", "NE": "31", "NV": "32", "NH": "33",
    "NJ": "34", "NM": "35", "NY": "36", "NC": "37", "ND": "38",
    "OH": "39", "OK": "40", "OR": "41", "PA": "42", "RI": "44",
    "SC": "45", "SD": "46", "TN": "47", "TX": "48", "UT": "49",
    "VT": "50", "VA": "51", "WA": "53", "WV": "54", "WI": "55",
    "WY": "56", "PR": "72",
}

FIPS_TO_ABBR: Dict[str, str] = {v: k for k, v in ABBR_TO_FIPS.items()}

# Full state names
FIPS_TO_NAME: Dict[str, str] = {
    "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
    "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
    "11": "District of Columbia", "12": "Florida", "13": "Georgia", "15": "Hawaii",
    "16": "Idaho", "17": "Illinois", "18": "Indiana", "19": "Iowa",
    "20": "Kansas", "21": "Kentucky", "22": "Louisiana", "23": "Maine",
    "24": "Maryland", "25": "Massachusetts", "26": "Michigan", "27": "Minnesota",
    "28": "Mississippi", "29": "Missouri", "30": "Montana", "31": "Nebraska",
    "32": "Nevada", "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico",
    "36": "New York", "37": "North Carolina", "38": "North Dakota", "39": "Ohio",
    "40": "Oklahoma", "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island",
    "45": "South Carolina", "46": "South Dakota", "47": "Tennessee", "48": "Texas",
    "49": "Utah", "50": "Vermont", "51": "Virginia", "53": "Washington",
    "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming", "72": "Puerto Rico",
}


# ---------------------------------------------------------------------------
# Census API helpers
# ---------------------------------------------------------------------------

_CENSUS_ACS_URL = "https://api.census.gov/data/2020/acs/acs5"

# Suffixes to strip when matching city names from Census
_PLACE_SUFFIXES = re.compile(
    r"\s+(city|town|village|borough|CDP|municipality|plantation|"
    r"city and borough|metropolitan government|"
    r"unified government|consolidated government|"
    r"urban county government|city \(balance\))$",
    re.IGNORECASE,
)


def _strip_place_suffix(name: str) -> str:
    """Remove Census geographic type suffixes like 'city', 'town', 'CDP'."""
    return _PLACE_SUFFIXES.sub("", name).strip()


def _normalize(name: str) -> str:
    """Normalize city name for comparison: lowercase, strip suffix, collapse whitespace."""
    n = _strip_place_suffix(name).lower().strip()
    n = re.sub(r"\s+", " ", n)
    # Normalize saint abbreviations
    n = re.sub(r"^st\.?\s+", "saint ", n)
    return n


def resolve_place_fips(
    city: str, state_fips: str, session: Optional[requests.Session] = None
) -> Tuple[str, str]:
    """
    Resolve a city name to its Census place FIPS code.

    Queries Census ACS API for all places in the state, then matches by name.

    Args:
        city: City name (e.g., "Bozeman")
        state_fips: 2-digit state FIPS (e.g., "30")
        session: Optional requests session for connection pooling

    Returns:
        Tuple of (place_fips, official_name) e.g., ("08950", "Bozeman city")

    Raises:
        ValueError: If city cannot be resolved
    """
    s = session or requests.Session()
    url = f"{_CENSUS_ACS_URL}?get=NAME&for=place:*&in=state:{state_fips}"
    logger.debug("Fetching Census places for state {}: {}", state_fips, url)

    resp = s.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()  # [[header], [row1], [row2], ...]

    if len(data) < 2:
        raise ValueError(f"No Census places found for state FIPS {state_fips}")

    # Build lookup: normalized_name -> (place_fips, official_name)
    places: Dict[str, Tuple[str, str]] = {}
    target = _normalize(city)

    for row in data[1:]:
        name = row[0]  # e.g., "Phoenix city, Arizona"
        # Census format: "Place Name type, State Name"
        place_name = name.split(",")[0].strip()
        place_fips = row[2]  # 5-digit place FIPS

        norm = _normalize(place_name)
        places[norm] = (place_fips, place_name)

    # 1. Exact match (normalized)
    if target in places:
        fips, official = places[target]
        logger.info("Place FIPS resolved (exact): {} -> {} ({})", city, fips, official)
        return fips, official

    # 2. Try with "saint" expansion
    alt_target = target.replace("st.", "saint").replace("st ", "saint ")
    if alt_target != target and alt_target in places:
        fips, official = places[alt_target]
        logger.info("Place FIPS resolved (saint expansion): {} -> {} ({})", city, fips, official)
        return fips, official

    # 3. Substring match (city name starts with target)
    matches = [(k, v) for k, v in places.items() if k.startswith(target)]
    if len(matches) == 1:
        fips, official = matches[0][1]
        logger.info("Place FIPS resolved (prefix): {} -> {} ({})", city, fips, official)
        return fips, official
    elif len(matches) > 1:
        # Multiple prefix matches — try to find best
        logger.warning(
            "Ambiguous place match for '{}': {}",
            city,
            [m[1][1] for m in matches[:5]],
        )
        # Pick the one where the normalized name is shortest (most exact)
        best = min(matches, key=lambda m: len(m[0]))
        fips, official = best[1]
        logger.info("Place FIPS resolved (best prefix): {} -> {} ({})", city, fips, official)
        return fips, official

    # 4. Reverse substring (target contains a place name)
    matches = [(k, v) for k, v in places.items() if target.startswith(k)]
    if matches:
        best = max(matches, key=lambda m: len(m[0]))
        fips, official = best[1]
        logger.info("Place FIPS resolved (reverse prefix): {} -> {} ({})", city, fips, official)
        return fips, official

    raise ValueError(
        f"Could not resolve place FIPS for '{city}' in state {state_fips} "
        f"({FIPS_TO_ABBR.get(state_fips, '??')}). "
        f"Checked {len(places)} Census places."
    )


_CENSUS_GEOCODER_OLA_URL = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress"


def resolve_county_fips(
    city: str, state_abbr: str, state_fips: str, session: Optional[requests.Session] = None
) -> Tuple[str, str]:
    """
    Resolve which county a city is in using the Census Geocoder.

    Uses the onelineaddress endpoint with a synthetic street address
    ("1 Main St, City, ST") since the Census Geocoder requires a street
    address to return geographic hierarchy data.

    Args:
        city: City name (e.g., "Bozeman")
        state_abbr: 2-letter state abbreviation (e.g., "MT")
        state_fips: 2-digit state FIPS (e.g., "30")
        session: Optional requests session

    Returns:
        Tuple of (county_fips_3digit, county_name) e.g., ("031", "Gallatin County")

    Raises:
        ValueError: If county cannot be determined
    """
    s = session or requests.Session()

    # Try several street address variations — the geocoder needs a real-ish address
    address_attempts = [
        f"1 Main St, {city}, {state_abbr}",
        f"100 Main St, {city}, {state_abbr}",
        f"1 Broadway, {city}, {state_abbr}",
        f"{city}, {state_abbr}",
    ]

    for address in address_attempts:
        try:
            params = {
                "address": address,
                "benchmark": "Public_AR_Current",
                "vintage": "Current_Current",
                "format": "json",
            }
            logger.debug("Geocoding '{}' via Census Geocoder", address)
            resp = s.get(_CENSUS_GEOCODER_OLA_URL, params=params, timeout=30)
            resp.raise_for_status()
            result = resp.json()

            address_matches = result.get("result", {}).get("addressMatches", [])
            if address_matches:
                geographies = address_matches[0].get("geographies", {})
                counties = geographies.get("Counties", [])
                if counties:
                    county = counties[0]
                    full_fips = county.get("GEOID", "")  # "30031" (state+county)
                    county_fips = full_fips[2:]  # "031"
                    county_name = county.get("NAME", "Unknown County")
                    logger.info(
                        "County resolved via geocoder: {} -> {} ({})",
                        city, county_fips, county_name,
                    )
                    return county_fips, county_name
        except Exception as e:
            logger.debug("Geocoder attempt failed for '{}': {}", address, e)
            continue

    # Fallback: heuristic match — some cities share name with county
    logger.debug("Trying ACS county-name-match fallback for '{}'", city)
    try:
        url = f"{_CENSUS_ACS_URL}?get=NAME&for=county:*&in=state:{state_fips}"
        resp = s.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        target = city.lower()
        for row in data[1:]:
            county_name_full = row[0]  # "Gallatin County, Montana"
            county_name = county_name_full.split(",")[0].strip()
            county_fips = row[2]  # 3-digit

            if target in county_name.lower():
                logger.info(
                    "County resolved via ACS name match: {} -> {} ({})",
                    city, county_fips, county_name,
                )
                return county_fips, county_name
    except Exception as e:
        logger.warning("ACS county fallback failed: {}", e)

    raise ValueError(
        f"Could not resolve county for '{city}, {state_abbr}'. "
        "Census Geocoder and ACS county-name fallback both failed."
    )


# ---------------------------------------------------------------------------
# Main bootstrap function
# ---------------------------------------------------------------------------


def bootstrap_city(
    city: str,
    state_abbr: str,
    db: Database,
) -> GeoRecord:
    """
    Resolve a US city to its full FIPS hierarchy and seed geo_xwalk.

    Creates geo_xwalk records for US, State, MSA (if applicable), County,
    and City — then returns the GeoRecord for the city.

    Args:
        city: City name (e.g., "Bozeman")
        state_abbr: 2-letter state abbreviation (e.g., "MT")
        db: Database instance for reading/writing geo_xwalk

    Returns:
        GeoRecord for the bootstrapped city

    Raises:
        ValueError: If city cannot be resolved via Census APIs
    """
    state_abbr = state_abbr.upper()
    state_fips = ABBR_TO_FIPS.get(state_abbr)
    if not state_fips:
        raise ValueError(f"Unknown state abbreviation: {state_abbr}")

    session = requests.Session()
    logger.info("Bootstrapping geo_xwalk for '{}, {}'", city, state_abbr)

    # Step 1: Resolve place FIPS
    place_fips, official_place_name = resolve_place_fips(city, state_fips, session)

    # Step 2: Resolve county FIPS
    county_fips, county_name = resolve_county_fips(city, state_abbr, state_fips, session)

    # Step 3: Resolve CBSA (MSA) from static lookup
    cbsa_result = get_cbsa(state_fips, county_fips)
    cbsa_code: Optional[str] = None
    msa_name: Optional[str] = None
    if cbsa_result:
        cbsa_code, msa_name = cbsa_result
        logger.info("MSA resolved: {} ({})", msa_name, cbsa_code)
    else:
        logger.info("No MSA for county {}{} (non-metro area)", state_fips, county_fips)

    # Step 4: Build geo_id values
    state_geo_id = state_fips
    county_geo_id = f"{state_fips}{county_fips}"
    msa_geo_id = cbsa_code  # Can be None
    city_geo_id = f"{state_fips}-{place_fips}"
    state_name = FIPS_TO_NAME.get(state_fips, state_abbr)

    # Step 5: Build hierarchy chain
    chain: List[str] = [city_geo_id, county_geo_id]
    if msa_geo_id:
        chain.append(msa_geo_id)
    chain.extend([state_geo_id, "US"])

    hierarchy = {
        "chain": chain,
        "county": county_geo_id,
        "state": state_geo_id,
        "us": "US",
    }
    if msa_geo_id:
        hierarchy["msa"] = msa_geo_id

    # Step 6: Build records in hierarchical order (parents first)
    records: List[Dict] = [
        # US
        {
            "geo_id": "US",
            "geo_level": "US",
            "geo_name": "United States",
            "state_fips": None,
            "county_fips": None,
            "place_fips": None,
            "cbsa_code": None,
            "parent_geo_id": None,
            "usps_city": None,
            "usps_state": None,
            "hierarchy": {},
        },
        # State
        {
            "geo_id": state_geo_id,
            "geo_level": "STATE",
            "geo_name": state_name,
            "state_fips": state_fips,
            "county_fips": None,
            "place_fips": None,
            "cbsa_code": None,
            "parent_geo_id": "US",
            "usps_city": None,
            "usps_state": state_abbr,
            "hierarchy": {"chain": [state_geo_id, "US"], "us": "US"},
        },
        # County
        {
            "geo_id": county_geo_id,
            "geo_level": "COUNTY",
            "geo_name": county_name if "County" in county_name else f"{county_name} County",
            "state_fips": state_fips,
            "county_fips": county_fips,
            "place_fips": None,
            "cbsa_code": cbsa_code,
            "parent_geo_id": state_geo_id,
            "usps_city": None,
            "usps_state": state_abbr,
            "hierarchy": {
                "chain": [county_geo_id] + ([msa_geo_id] if msa_geo_id else []) + [state_geo_id, "US"],
                "state": state_geo_id,
                "us": "US",
                **({"msa": msa_geo_id} if msa_geo_id else {}),
            },
        },
    ]

    # MSA (optional)
    if msa_geo_id and msa_name:
        records.append({
            "geo_id": msa_geo_id,
            "geo_level": "MSA",
            "geo_name": msa_name,
            "state_fips": state_fips,
            "county_fips": None,
            "place_fips": None,
            "cbsa_code": cbsa_code,
            "parent_geo_id": state_geo_id,
            "usps_city": None,
            "usps_state": state_abbr,
            "hierarchy": {
                "chain": [msa_geo_id, state_geo_id, "US"],
                "state": state_geo_id,
                "us": "US",
            },
        })

    # City
    # Determine parent: county if it exists
    city_parent = county_geo_id

    records.append({
        "geo_id": city_geo_id,
        "geo_level": "CITY",
        "geo_name": official_place_name,
        "state_fips": state_fips,
        "county_fips": county_fips,
        "place_fips": place_fips,
        "cbsa_code": cbsa_code,
        "parent_geo_id": city_parent,
        "usps_city": city,
        "usps_state": state_abbr,
        "hierarchy": hierarchy,
    })

    # Step 7: Upsert all records
    _upsert_geo_records(db, records)

    logger.info(
        "Bootstrapped geo_xwalk: {} ({}) -> county={}, msa={}, state={}",
        city_geo_id, official_place_name, county_geo_id, msa_geo_id or "none", state_geo_id,
    )

    # Step 8: Return GeoRecord for the city
    return GeoRecord(
        geo_id=city_geo_id,
        geo_level="CITY",
        geo_name=official_place_name,
        state_fips=state_fips,
        county_fips=county_fips,
        place_fips=place_fips,
        cbsa_code=cbsa_code,
        tract_fips=None,
        parent_geo_id=city_parent,
        hierarchy=hierarchy,
    )


def _upsert_geo_records(db: Database, records: List[Dict]) -> None:
    """Insert or update geo_xwalk records in dependency order."""
    with db.connection() as conn:
        cur = conn.cursor()
        for rec in records:
            cur.execute(
                """
                INSERT INTO public.geo_xwalk (
                    geo_id, geo_level, geo_name, state_fips, county_fips,
                    place_fips, cbsa_code, parent_geo_id, usps_city, usps_state,
                    hierarchy, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                ON CONFLICT (geo_id) DO UPDATE SET
                    geo_name = EXCLUDED.geo_name,
                    state_fips = COALESCE(EXCLUDED.state_fips, public.geo_xwalk.state_fips),
                    county_fips = COALESCE(EXCLUDED.county_fips, public.geo_xwalk.county_fips),
                    place_fips = COALESCE(EXCLUDED.place_fips, public.geo_xwalk.place_fips),
                    cbsa_code = COALESCE(EXCLUDED.cbsa_code, public.geo_xwalk.cbsa_code),
                    parent_geo_id = COALESCE(EXCLUDED.parent_geo_id, public.geo_xwalk.parent_geo_id),
                    usps_city = COALESCE(EXCLUDED.usps_city, public.geo_xwalk.usps_city),
                    usps_state = COALESCE(EXCLUDED.usps_state, public.geo_xwalk.usps_state),
                    hierarchy = CASE
                        WHEN EXCLUDED.hierarchy::text != '{}'
                        THEN EXCLUDED.hierarchy
                        ELSE public.geo_xwalk.hierarchy
                    END,
                    updated_at = now()
                """,
                (
                    rec["geo_id"],
                    rec["geo_level"],
                    rec["geo_name"],
                    rec["state_fips"],
                    rec["county_fips"],
                    rec["place_fips"],
                    rec["cbsa_code"],
                    rec["parent_geo_id"],
                    rec["usps_city"],
                    rec["usps_state"],
                    json.dumps(rec.get("hierarchy", {})),
                ),
            )
        cur.close()
        logger.debug("Upserted {} geo_xwalk records", len(records))
