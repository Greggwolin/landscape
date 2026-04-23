"""
Location Brief service.

Generates a property-type-aware economic brief for any US location using
FRED + Census ACS 5-Year data, narrated by Anthropic. Cached per
(user, location, depth). Invalidation is release-schedule-driven — the
brief is fresh until the earliest next_release_date among its FRED
series (Census ACS refreshes annually in December).

Depth tiers:
  condensed      — ~4 blocks   (quick read: metro snapshot + summary)
  standard       — ~8 blocks   (default: adds state + regional housing)
  comprehensive  — ~18 blocks  (full T1/T2/T3 × 6 section analysis)

This service is Landscaper-callable pre-project (no project_id required).
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests
from django.db import connection

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

PROPERTY_TYPE_LABELS = {
    "LAND": "Land Development",
    "MF": "Multifamily",
    "OFF": "Office",
    "RET": "Retail",
    "IND": "Industrial",
    "HTL": "Hotel",
    "MXU": "Mixed Use",
}

DEPTH_CONFIG = {
    "condensed": {
        "max_tokens": 1400,
        "target_sections": 4,
        "tiers": ["t2"],           # metro-only
        "sections_per_tier": 3,    # employment, demographics, housing
    },
    "standard": {
        "max_tokens": 2400,
        "target_sections": 8,
        "tiers": ["t1", "t2"],     # national + metro
        "sections_per_tier": 4,
    },
    "comprehensive": {
        "max_tokens": 4000,
        "target_sections": 18,
        "tiers": ["t1", "t2", "t3"],
        "sections_per_tier": 6,
    },
}

# Key FRED series, grouped by geographic scope
FRED_SERIES_NATIONAL = [
    ("UNRATE", "US Unemployment Rate", "%"),
    ("CPIAUCSL", "CPI (All Items, SA)", "idx"),
    ("FEDFUNDS", "Fed Funds Rate", "%"),
    ("MORTGAGE30US", "30-Yr Fixed Mortgage", "%"),
    ("HOUST", "Housing Starts (Annualized)", "thou"),
    ("CSUSHPINSA", "Case-Shiller US Home Price Index", "idx"),
]

# State-level unemployment: pattern {STATE}UR (e.g., AZUR, CAUR)
FRED_STATE_UNEMP_TPL = "{state}UR"

# ─────────────────────────────────────────────────────────────────────────────
# Location resolution
# ─────────────────────────────────────────────────────────────────────────────

_CITY_STATE_RE = re.compile(r"^\s*([^,]+?)\s*,\s*([A-Za-z]{2})\s*$")


def _normalize_location_key(city: str, state: str) -> str:
    c = re.sub(r"[^a-z0-9]+", "-", (city or "").strip().lower())
    s = (state or "").strip().lower()
    return f"{c}-{s}".strip("-")


def parse_location_input(location: str) -> Tuple[Optional[str], Optional[str]]:
    """Parse 'City, ST' string. Returns (city, state_abbrev) or (None, None)."""
    if not location:
        return None, None
    m = _CITY_STATE_RE.match(location)
    if not m:
        return None, None
    return m.group(1).strip(), m.group(2).strip().upper()


def geocode_location(location_str: str) -> Optional[Dict[str, Any]]:
    """Nominatim geocode → {lat, lon, display_name, city, state, county}."""
    if not location_str:
        return None
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": location_str,
                "format": "json",
                "addressdetails": 1,
                "countrycodes": "us",
                "limit": 1,
            },
            headers={"User-Agent": "Landscape/1.0 (gregg@wolinfamily.com)"},
            timeout=8,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        if not data:
            return None
        first = data[0]
        addr = first.get("address", {}) or {}
        return {
            "lat": float(first["lat"]),
            "lon": float(first["lon"]),
            "display_name": first.get("display_name", ""),
            "city": addr.get("city") or addr.get("town") or addr.get("village"),
            "state": addr.get("state"),
            "state_abbrev": _state_name_to_abbrev(addr.get("state")),
            "county": (addr.get("county") or "").replace(" County", "") or None,
        }
    except Exception as e:
        logger.warning(f"Nominatim geocode failed for '{location_str}': {e}")
        return None


_STATE_MAP = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC",
}


def _state_name_to_abbrev(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    return _STATE_MAP.get(name.strip())


# ─────────────────────────────────────────────────────────────────────────────
# Indicator fetching
# ─────────────────────────────────────────────────────────────────────────────

def fetch_fred_series(series_id: str, api_key: str) -> Optional[Dict[str, Any]]:
    """Fetch latest observation + next scheduled release for a FRED series."""
    if not api_key:
        return None
    try:
        obs_resp = requests.get(
            "https://api.stlouisfed.org/fred/series/observations",
            params={
                "series_id": series_id,
                "api_key": api_key,
                "file_type": "json",
                "sort_order": "desc",
                "limit": 13,  # enough for YoY on monthly series
            },
            timeout=10,
        )
        if obs_resp.status_code != 200:
            return None
        obs_data = obs_resp.json()
        obs = [o for o in obs_data.get("observations", []) if o.get("value") not in (".", None, "")]
        if not obs:
            return None
        latest = obs[0]
        yoy_obs = obs[12] if len(obs) >= 13 else None

        latest_val = _safe_float(latest.get("value"))
        yoy_val = _safe_float(yoy_obs.get("value")) if yoy_obs else None
        yoy_pct = None
        if latest_val is not None and yoy_val is not None and yoy_val != 0:
            yoy_pct = (latest_val - yoy_val) / abs(yoy_val) * 100.0

        # Next release date
        next_release = None
        try:
            rel_resp = requests.get(
                "https://api.stlouisfed.org/fred/series",
                params={"series_id": series_id, "api_key": api_key, "file_type": "json"},
                timeout=5,
            )
            if rel_resp.status_code == 200:
                meta = rel_resp.json().get("seriess", [{}])[0]
                # FRED doesn't expose next_release_date directly via /series, but
                # `last_updated` gives last refresh; we derive a conservative next
                # refresh date from the frequency.
                last_updated = meta.get("last_updated", "")
                freq = (meta.get("frequency_short") or "").lower()
                if last_updated:
                    base = datetime.fromisoformat(last_updated.split(" ")[0]).date()
                    delta = {"d": 1, "w": 7, "m": 35, "q": 100, "a": 380}.get(freq, 35)
                    next_release = (base + timedelta(days=delta)).isoformat()
        except Exception:
            pass

        return {
            "series_id": series_id,
            "value": latest_val,
            "date": latest.get("date"),
            "yoy_pct": yoy_pct,
            "next_release": next_release,
        }
    except Exception as e:
        logger.warning(f"FRED fetch failed for {series_id}: {e}")
        return None


def fetch_census_acs(state_fips: str, county_fips: Optional[str], api_key: str) -> Optional[Dict[str, Any]]:
    """
    Fetch key ACS 5-Year indicators for a state (or county).
    Returns: population, median_hh_income, median_home_value, owner_occ_pct.
    ACS vintage = 2023 (latest available).
    """
    if not state_fips:
        return None
    try:
        variables = "B01003_001E,B19013_001E,B25077_001E,B25003_002E,B25003_001E"
        if county_fips:
            geo_clause = f"county:{county_fips}&in=state:{state_fips}"
        else:
            geo_clause = f"state:{state_fips}"
        url = (
            f"https://api.census.gov/data/2023/acs/acs5"
            f"?get={variables}&for={geo_clause}"
        )
        if api_key:
            url += f"&key={api_key}"
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            return None
        data = resp.json()
        if len(data) < 2:
            return None
        header, row = data[0], data[1]
        idx = {h: i for i, h in enumerate(header)}
        pop = _safe_int(row[idx["B01003_001E"]])
        med_inc = _safe_int(row[idx["B19013_001E"]])
        med_val = _safe_int(row[idx["B25077_001E"]])
        owner_occ = _safe_int(row[idx["B25003_002E"]])
        total_occ = _safe_int(row[idx["B25003_001E"]])
        owner_pct = (owner_occ / total_occ * 100.0) if (owner_occ and total_occ) else None

        return {
            "population": pop,
            "median_hh_income": med_inc,
            "median_home_value": med_val,
            "owner_occ_pct": owner_pct,
            "vintage": "ACS 5-Year 2023",
            "data_as_of": "2023-12-31",
        }
    except Exception as e:
        logger.warning(f"Census ACS fetch failed: {e}")
        return None


_STATE_FIPS = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06", "CO": "08",
    "CT": "09", "DE": "10", "DC": "11", "FL": "12", "GA": "13", "HI": "15",
    "ID": "16", "IL": "17", "IN": "18", "IA": "19", "KS": "20", "KY": "21",
    "LA": "22", "ME": "23", "MD": "24", "MA": "25", "MI": "26", "MN": "27",
    "MS": "28", "MO": "29", "MT": "30", "NE": "31", "NV": "32", "NH": "33",
    "NJ": "34", "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39",
    "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45", "SD": "46",
    "TN": "47", "TX": "48", "UT": "49", "VT": "50", "VA": "51", "WA": "53",
    "WV": "54", "WI": "55", "WY": "56",
}


def state_abbrev_to_fips(abbrev: Optional[str]) -> Optional[str]:
    if not abbrev:
        return None
    return _STATE_FIPS.get(abbrev.upper())


# ─────────────────────────────────────────────────────────────────────────────
# Narrative (Anthropic)
# ─────────────────────────────────────────────────────────────────────────────

def narrate_brief(
    indicators: Dict[str, Any],
    geo: Dict[str, Any],
    property_type: str,
    depth: str,
) -> Dict[str, Any]:
    """
    Call Anthropic to produce a depth-tiered property-type-aware narrative.
    Returns {summary: str, sections: [{title, content}, ...]}.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY missing — returning data-only stub")
        return _stub_narrative(indicators, geo, property_type, depth)

    cfg = DEPTH_CONFIG.get(depth, DEPTH_CONFIG["standard"])
    property_label = PROPERTY_TYPE_LABELS.get(property_type, property_type or "Real Estate")

    today = date.today().strftime("%B %Y")
    location_line = ", ".join([p for p in [geo.get("city"), geo.get("state_abbrev")] if p])

    # Compact the indicators as context
    fred_lines = []
    for k, v in indicators.get("fred", {}).items():
        if not v:
            continue
        val = v.get("value")
        yoy = v.get("yoy_pct")
        yoy_str = f" (YoY {yoy:+.1f}%)" if yoy is not None else ""
        fred_lines.append(f"  {k}: {val}{yoy_str} as of {v.get('date', 'n/a')}")

    census = indicators.get("census", {}) or {}
    census_lines = []
    if census:
        if census.get("population") is not None:
            census_lines.append(f"  Population: {census['population']:,}")
        if census.get("median_hh_income") is not None:
            census_lines.append(f"  Median HH Income: ${census['median_hh_income']:,}")
        if census.get("median_home_value") is not None:
            census_lines.append(f"  Median Home Value: ${census['median_home_value']:,}")
        if census.get("owner_occ_pct") is not None:
            census_lines.append(f"  Owner-Occupied: {census['owner_occ_pct']:.1f}%")
        census_lines.append(f"  Source: {census.get('vintage', 'ACS 5-Year')}")

    section_list = _section_list_for_depth(depth)
    sections_spec = "\n".join(f"  - {s}" for s in section_list)

    system_prompt = f"""You are a senior MAI-designated commercial real estate appraiser writing a
pre-underwriting location brief as of {today}. The analytical frame follows
The Appraisal of Real Estate, 14th Ed. (Chapters 10, 11, 15).

Target property type: {property_label}.

Writing rules:
- Professional, analytical, dense. Each section = 1-2 short paragraphs, 3-4 sentences.
- The numeric indicators below are already rendered as tiles in the UI above
  the narrative. DO NOT restate the raw numbers (unemployment rate %, Fed Funds %,
  CPI index, population count, median HH income $, median home value $, etc.).
  Refer to them directionally instead — "elevated", "softening", "above the
  national average", "well below peer metros". Cite a specific figure only when
  you are comparing it to something not already in the tiles (e.g., historical
  baseline, peer market, asset-class threshold).
- No filler. No bullets. No markdown.
- Where data is unavailable, omit quietly. Do not invent numbers.
- Summary = 2-3 sentences. A genuine executive takeaway — what the tiles MEAN
  for the target property type, not a recitation of what they say.
- Tailor implications to the {property_label} asset class.

Respond with ONLY valid JSON matching this schema:
{{
  "summary": "2-3 sentences",
  "sections": [
    {{"title": "...", "content": "..."}}
  ]
}}

Produce exactly these sections in this order:
{sections_spec}
"""

    user_prompt = f"""Location: {location_line}
County: {geo.get('county') or 'n/a'}
State: {geo.get('state') or geo.get('state_abbrev') or 'n/a'}

National FRED indicators:
{chr(10).join(fred_lines) if fred_lines else '  (none available)'}

State/county Census (ACS 5-Year 2023):
{chr(10).join(census_lines) if census_lines else '  (none available)'}

Write the brief."""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=cfg["max_tokens"],
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = response.content[0].text.strip()
        # Strip code fences if present
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
        parsed = json.loads(text)
        return {
            "summary": parsed.get("summary", ""),
            "sections": parsed.get("sections", []),
        }
    except Exception as e:
        logger.error(f"Anthropic narrate failed: {e}")
        return _stub_narrative(indicators, geo, property_type, depth)


def _section_list_for_depth(depth: str) -> List[str]:
    if depth == "condensed":
        return [
            "Economic Snapshot",
            "Demographics & Income",
            "Regional Housing Market",
            "Implications for the Subject Property",
        ]
    if depth == "comprehensive":
        return [
            # T1 — national
            "National Economic Cycle & Growth",
            "Inflation & Monetary Policy",
            "Capital Markets & Lending Environment",
            "National Housing Market",
            "State Economic Conditions",
            "National-to-Local Implications",
            # T2 — metro
            "Metro Economic Base & Employment",
            "Metro Demographic Trends",
            "Metro Income & Purchasing Power",
            "Regional Housing Market",
            "Infrastructure & Development Pipeline",
            "Market Cycle Position",
            # T3 — city
            "Local Demographics & Social Forces",
            "Local Economic Forces & Property Market",
            "Governmental & Regulatory Influences",
            "Environmental & Locational Factors",
            "Neighborhood Life Cycle",
            "Competitive Position & Outlook",
        ]
    # standard (default)
    return [
        "National Economic Backdrop",
        "Monetary Policy & Lending",
        "State Economic Conditions",
        "Metro Economic Base & Employment",
        "Demographic Trends",
        "Regional Housing Market",
        "Market Cycle Position",
        "Implications for the Subject Property",
    ]


def _stub_narrative(indicators, geo, property_type, depth):
    """Fallback narrative when Anthropic is unavailable — data-only dump."""
    titles = _section_list_for_depth(depth)
    location = ", ".join([p for p in [geo.get("city"), geo.get("state_abbrev")] if p]) or "the subject location"
    return {
        "summary": f"Location brief for {location} generated without AI narrative (see indicators).",
        "sections": [{"title": t, "content": "Data available in indicators panel. Narrative generation unavailable."} for t in titles],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Cache
# ─────────────────────────────────────────────────────────────────────────────

def get_cached_brief(user_id: Optional[str], location_key: str, depth: str) -> Optional[Dict[str, Any]]:
    """Look up cached brief. Returns None if missing or stale."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT brief_id, location_display, property_type, center_lat, center_lon,
                       geo_hierarchy, indicators, sections, summary, data_as_of,
                       next_refresh_at, cached_at
                FROM landscape.tbl_location_brief
                WHERE COALESCE(user_id::text, '') = %s
                  AND location_key = %s
                  AND depth = %s
                """,
                [str(user_id) if user_id else "", location_key, depth],
            )
            row = cursor.fetchone()
            if not row:
                return None

            next_refresh = row[10]
            if next_refresh and next_refresh < datetime.now(timezone.utc):
                # Stale — caller should regenerate
                return None

            # Bump access stats
            cursor.execute(
                """
                UPDATE landscape.tbl_location_brief
                SET accessed_at = NOW(), access_count = access_count + 1
                WHERE brief_id = %s
                """,
                [row[0]],
            )

            return {
                "location_display": row[1],
                "property_type": row[2],
                "center": [float(row[4]), float(row[3])] if row[3] and row[4] else None,
                "geo_hierarchy": row[5] if isinstance(row[5], dict) else json.loads(row[5] or "{}"),
                "indicators": row[6] if isinstance(row[6], dict) else json.loads(row[6] or "{}"),
                "sections": row[7] if isinstance(row[7], list) else json.loads(row[7] or "[]"),
                "summary": row[8],
                "data_as_of": row[9].isoformat() if row[9] else None,
                "cached": True,
                "cached_at": row[11].isoformat() if row[11] else None,
            }
    except Exception as e:
        logger.warning(f"Cache lookup failed: {e}")
        return None


def save_brief_cache(
    user_id: Optional[str],
    location_key: str,
    location_display: str,
    property_type: str,
    depth: str,
    center: Optional[List[float]],
    geo: Dict[str, Any],
    indicators: Dict[str, Any],
    narrative: Dict[str, Any],
    next_refresh_at: Optional[datetime],
) -> None:
    """Upsert brief cache row."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO landscape.tbl_location_brief (
                    user_id, location_key, location_display, property_type, depth,
                    center_lat, center_lon, geo_hierarchy, indicators, sections,
                    summary, data_as_of, next_refresh_at, cached_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s::jsonb, %s::jsonb, %s::jsonb,
                    %s, %s, %s, NOW()
                )
                ON CONFLICT (COALESCE(user_id::text, ''), location_key, depth)
                DO UPDATE SET
                    location_display = EXCLUDED.location_display,
                    property_type    = EXCLUDED.property_type,
                    center_lat       = EXCLUDED.center_lat,
                    center_lon       = EXCLUDED.center_lon,
                    geo_hierarchy    = EXCLUDED.geo_hierarchy,
                    indicators       = EXCLUDED.indicators,
                    sections         = EXCLUDED.sections,
                    summary          = EXCLUDED.summary,
                    data_as_of       = EXCLUDED.data_as_of,
                    next_refresh_at  = EXCLUDED.next_refresh_at,
                    cached_at        = NOW(),
                    accessed_at      = NOW(),
                    access_count     = landscape.tbl_location_brief.access_count + 1
                """,
                [
                    user_id,
                    location_key,
                    location_display,
                    property_type,
                    depth,
                    center[1] if center else None,  # lat
                    center[0] if center else None,  # lon
                    json.dumps(geo),
                    json.dumps(indicators, default=str),
                    json.dumps(narrative.get("sections", []), default=str),
                    narrative.get("summary"),
                    _latest_indicator_date(indicators),
                    next_refresh_at,
                ],
            )
    except Exception as e:
        logger.error(f"Cache save failed: {e}")


def _latest_indicator_date(indicators: Dict[str, Any]) -> Optional[date]:
    latest = None
    for v in (indicators.get("fred") or {}).values():
        if not v or not v.get("date"):
            continue
        try:
            d = datetime.fromisoformat(v["date"]).date()
            if latest is None or d > latest:
                latest = d
        except Exception:
            pass
    census = indicators.get("census") or {}
    if census.get("data_as_of"):
        try:
            d = datetime.fromisoformat(census["data_as_of"]).date()
            if latest is None or d > latest:
                latest = d
        except Exception:
            pass
    return latest


def _earliest_next_refresh(indicators: Dict[str, Any]) -> Optional[datetime]:
    earliest = None
    for v in (indicators.get("fred") or {}).values():
        if not v or not v.get("next_release"):
            continue
        try:
            d = datetime.fromisoformat(v["next_release"]).replace(tzinfo=timezone.utc)
            if earliest is None or d < earliest:
                earliest = d
        except Exception:
            pass
    # Census ACS refreshes annually in early December
    today = date.today()
    census_next = datetime(today.year if today.month < 12 else today.year + 1, 12, 15, tzinfo=timezone.utc)
    if earliest is None or census_next < earliest:
        earliest = census_next
    return earliest


# ─────────────────────────────────────────────────────────────────────────────
# Orchestrator
# ─────────────────────────────────────────────────────────────────────────────

def generate_location_brief(
    location: str,
    property_type: str = "LAND",
    depth: str = "standard",
    user_id: Optional[str] = None,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """
    End-to-end: resolve location → fetch indicators → narrate → cache → return config.

    Returns artifact config dict shaped for the frontend renderer:
    {
      "success": bool,
      "action": "show_location_brief",
      "location_brief_config": {
        "title", "location_display", "property_type", "depth",
        "center", "geo_hierarchy",
        "summary", "sections", "indicators",
        "data_as_of", "cached", "project_ready"
      }
    }
    """
    city, state = parse_location_input(location)
    # Fallback: try to geocode the raw string
    geo_hit = None
    if not (city and state):
        geo_hit = geocode_location(location)
        if geo_hit:
            city = geo_hit.get("city") or city
            state = geo_hit.get("state_abbrev") or state
    if not (city and state):
        return {
            "success": False,
            "error": (
                "Could not parse location. Please provide a 'City, ST' format "
                "(e.g., 'Phoenix, AZ')."
            ),
        }

    location_key = _normalize_location_key(city, state)
    location_display = f"{city}, {state}"

    # Cache check
    if not force_refresh:
        cached = get_cached_brief(user_id, location_key, depth)
        if cached:
            return {
                "success": True,
                "action": "show_location_brief",
                "location_brief_config": _config_from_cache(cached, location_display, depth),
            }

    # Geocode (if we haven't already)
    if not geo_hit:
        geo_hit = geocode_location(location_display)
    center = [geo_hit["lon"], geo_hit["lat"]] if geo_hit else None

    geo = {
        "city": city,
        "state_abbrev": state,
        "state": (geo_hit or {}).get("state"),
        "county": (geo_hit or {}).get("county"),
    }

    # Fetch indicators
    fred_key = os.environ.get("FRED_API_KEY", "")
    census_key = os.environ.get("CENSUS_API_KEY", "")

    fred: Dict[str, Any] = {}
    for series_id, label, _unit in FRED_SERIES_NATIONAL:
        obs = fetch_fred_series(series_id, fred_key)
        if obs:
            fred[label] = obs

    # State unemployment
    state_unemp_series = FRED_STATE_UNEMP_TPL.format(state=state.upper())
    state_obs = fetch_fred_series(state_unemp_series, fred_key)
    if state_obs:
        fred[f"{state} Unemployment Rate"] = state_obs

    state_fips = state_abbrev_to_fips(state)
    census = fetch_census_acs(state_fips, None, census_key) or {}

    indicators = {"fred": fred, "census": census}

    # Narrate
    narrative = narrate_brief(indicators, geo, property_type, depth)

    # Cache
    next_refresh = _earliest_next_refresh(indicators)
    save_brief_cache(
        user_id=user_id,
        location_key=location_key,
        location_display=location_display,
        property_type=property_type,
        depth=depth,
        center=center,
        geo=geo,
        indicators=indicators,
        narrative=narrative,
        next_refresh_at=next_refresh,
    )

    config = {
        "title": f"Location Brief — {location_display}",
        "location_display": location_display,
        "property_type": property_type,
        "property_type_label": PROPERTY_TYPE_LABELS.get(property_type, property_type),
        "depth": depth,
        "center": center,
        "geo_hierarchy": geo,
        "summary": narrative.get("summary", ""),
        "sections": narrative.get("sections", []),
        "indicators": indicators,
        "data_as_of": (_latest_indicator_date(indicators) or date.today()).isoformat(),
        "cached": False,
        "project_ready": bool(city and state and property_type),
    }

    return {
        "success": True,
        "action": "show_location_brief",
        "location_brief_config": config,
    }


def _config_from_cache(cached: Dict[str, Any], location_display: str, depth: str) -> Dict[str, Any]:
    return {
        "title": f"Location Brief — {location_display}",
        "location_display": cached.get("location_display") or location_display,
        "property_type": cached.get("property_type"),
        "property_type_label": PROPERTY_TYPE_LABELS.get(
            cached.get("property_type"), cached.get("property_type")
        ),
        "depth": depth,
        "center": cached.get("center"),
        "geo_hierarchy": cached.get("geo_hierarchy") or {},
        "summary": cached.get("summary") or "",
        "sections": cached.get("sections") or [],
        "indicators": cached.get("indicators") or {},
        "data_as_of": cached.get("data_as_of"),
        "cached": True,
        "cached_at": cached.get("cached_at"),
        "project_ready": True,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _safe_float(v) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _safe_int(v) -> Optional[int]:
    if v is None or v == "":
        return None
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None
