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
    ("USSTHPI", "US House Price Index (FHFA)", "idx"),
]

# State-level FRED patterns
FRED_STATE_UNEMP_TPL = "{state}UR"       # e.g., CAUR
FRED_STATE_HPI_TPL = "{state}STHPI"      # e.g., CASTHPI (FHFA HPI, quarterly)

# MSA-level FRED pattern (FHFA HPI, quarterly, NSA)
FRED_MSA_HPI_TPL = "ATNHPIUS{cbsa}Q"     # e.g., ATNHPIUS31080Q for LA-LB-Anaheim

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


def resolve_census_fips(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Call Census Geocoder to resolve a coordinate to the full FIPS hierarchy.

    Returns a dict shaped like:
      {
        "state_fips": "06",
        "state_name": "California",
        "county_fips": "037",           # 3-digit, no state prefix
        "county_name": "Los Angeles County",
        "place_fips": "06308",          # 5-digit (state+3 is NOT the pattern;
                                        # Census uses a 5-digit place code per state)
        "place_name": "Bellflower",
        "cbsa_code": "31080",           # 5-digit CBSA
        "cbsa_name": "Los Angeles-Long Beach-Anaheim, CA Metro Area",
      }

    Keys will be None (omitted) when the coordinate has no match for that tier
    (e.g., rural coordinates outside any incorporated place will have no
    place_fips).
    """
    if lat is None or lon is None:
        return None
    try:
        resp = requests.get(
            "https://geocoding.geo.census.gov/geocoder/geographies/coordinates",
            params={
                "x": lon,
                "y": lat,
                "benchmark": "Public_AR_Current",
                "vintage": "Current_Current",
                "format": "json",
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        geos = (data.get("result") or {}).get("geographies") or {}

        out: Dict[str, Any] = {}

        states = geos.get("States") or []
        if states:
            s = states[0]
            out["state_fips"] = s.get("STATE") or s.get("GEOID")
            out["state_name"] = s.get("NAME") or s.get("BASENAME")

        counties = geos.get("Counties") or []
        if counties:
            c = counties[0]
            out["county_fips"] = c.get("COUNTY")  # 3-digit
            out["county_name"] = c.get("NAME") or c.get("BASENAME")

        places = geos.get("Incorporated Places") or []
        if not places:
            # Fall back to Census Designated Places if no incorporated place
            places = geos.get("Census Designated Places") or []
        if places:
            p = places[0]
            # PLACE is 5-digit; GEOID = state+place (7 digits)
            out["place_fips"] = p.get("PLACE")
            out["place_name"] = p.get("NAME") or p.get("BASENAME")

        cbsas = (
            geos.get("Metropolitan Statistical Areas")
            or geos.get("Metropolitan/Micropolitan Statistical Areas")
            or geos.get("Combined Statistical Areas")
            or []
        )
        if cbsas:
            m = cbsas[0]
            out["cbsa_code"] = m.get("CBSA") or m.get("GEOID")
            out["cbsa_name"] = m.get("NAME") or m.get("BASENAME")

        return out or None
    except Exception as e:
        logger.warning(f"Census Geocoder failed for ({lat},{lon}): {e}")
        return None


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


# Expanded ACS variable set
_ACS_VARS = [
    "B01003_001E",   # Population
    "B19013_001E",   # Median HH Income
    "B25077_001E",   # Median Home Value
    "B25064_001E",   # Median Gross Rent
    "B01002_001E",   # Median Age
    "B25003_001E",   # Total occupied housing units (denominator)
    "B25003_002E",   # Owner-occupied housing units
]


def _parse_acs_row(header, row) -> Dict[str, Any]:
    idx = {h: i for i, h in enumerate(header)}

    def g(v):
        return _safe_int(row[idx[v]]) if v in idx else None

    pop = g("B01003_001E")
    med_inc = g("B19013_001E")
    med_val = g("B25077_001E")
    med_rent = g("B25064_001E")
    med_age_raw = row[idx["B01002_001E"]] if "B01002_001E" in idx else None
    med_age = _safe_float(med_age_raw) if med_age_raw not in (None, "") else None
    total_occ = g("B25003_001E")
    owner_occ = g("B25003_002E")
    owner_pct = (owner_occ / total_occ * 100.0) if (owner_occ and total_occ) else None

    return {
        "population": pop,
        "median_hh_income": med_inc,
        "median_home_value": med_val,
        "median_gross_rent": med_rent,
        "median_age": med_age,
        "owner_occ_pct": owner_pct,
        "vintage": "ACS 5-Year 2023",
        "data_as_of": "2023-12-31",
    }


def fetch_census_acs_tier(
    tier: str,
    fips_info: Dict[str, Any],
    api_key: str,
) -> Optional[Dict[str, Any]]:
    """
    Fetch ACS 5-Year (vintage 2023) at a specific geo tier.

    tier in {"state", "county", "place"}
    fips_info expects state_fips + (county_fips | place_fips) as needed.
    """
    state_fips = fips_info.get("state_fips")
    if not state_fips:
        return None

    if tier == "state":
        geo_clause = f"state:{state_fips}"
    elif tier == "county":
        cf = fips_info.get("county_fips")
        if not cf:
            return None
        geo_clause = f"county:{cf}&in=state:{state_fips}"
    elif tier == "place":
        pf = fips_info.get("place_fips")
        if not pf:
            return None
        geo_clause = f"place:{pf}&in=state:{state_fips}"
    else:
        return None

    try:
        variables = ",".join(_ACS_VARS)
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
        parsed = _parse_acs_row(data[0], data[1])

        # Attach tier label for frontend row rendering
        parsed["tier"] = tier
        if tier == "state":
            parsed["tier_label"] = fips_info.get("state_name") or state_fips
            parsed["fips"] = state_fips
        elif tier == "county":
            parsed["tier_label"] = fips_info.get("county_name") or f"County {fips_info.get('county_fips')}"
            parsed["fips"] = f"{state_fips}{fips_info.get('county_fips')}"
        elif tier == "place":
            parsed["tier_label"] = fips_info.get("place_name") or f"Place {fips_info.get('place_fips')}"
            parsed["fips"] = f"{state_fips}{fips_info.get('place_fips')}"

        return parsed
    except Exception as e:
        logger.warning(f"Census ACS tier={tier} fetch failed: {e}")
        return None


# Legacy shim — preserved for any caller still relying on the flat signature.
def fetch_census_acs(state_fips: str, county_fips: Optional[str], api_key: str) -> Optional[Dict[str, Any]]:
    tier = "county" if county_fips else "state"
    return fetch_census_acs_tier(
        tier,
        {"state_fips": state_fips, "county_fips": county_fips},
        api_key,
    )


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

    # Tiered census data — feed Claude state / county / city values
    # explicitly so narrative can contrast local vs regional variance.
    census_tiers = indicators.get("census_tiers", {}) or {}
    census_lines: List[str] = []
    for tier_key in ("state", "county", "city"):
        t = census_tiers.get(tier_key)
        if not t:
            continue
        label = t.get("tier_label") or tier_key.title()
        parts = []
        if t.get("population") is not None:
            parts.append(f"pop {t['population']:,}")
        if t.get("median_hh_income") is not None:
            parts.append(f"median HH income ${t['median_hh_income']:,}")
        if t.get("median_home_value") is not None:
            parts.append(f"median home value ${t['median_home_value']:,}")
        if t.get("median_gross_rent") is not None:
            parts.append(f"median gross rent ${t['median_gross_rent']:,}")
        if t.get("median_age") is not None:
            parts.append(f"median age {t['median_age']:.1f}")
        if t.get("owner_occ_pct") is not None:
            parts.append(f"owner-occ {t['owner_occ_pct']:.1f}%")
        if parts:
            census_lines.append(f"  {label}: {', '.join(parts)}")

    # Fallback to legacy census dict if no tiers present
    if not census_lines:
        census = indicators.get("census", {}) or {}
        if census:
            if census.get("population") is not None:
                census_lines.append(f"  Population: {census['population']:,}")
            if census.get("median_hh_income") is not None:
                census_lines.append(f"  Median HH Income: ${census['median_hh_income']:,}")
            if census.get("median_home_value") is not None:
                census_lines.append(f"  Median Home Value: ${census['median_home_value']:,}")
            if census.get("owner_occ_pct") is not None:
                census_lines.append(f"  Owner-Occupied: {census['owner_occ_pct']:.1f}%")

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

    # Resolve full FIPS hierarchy via Census Geocoder (state / county / place / CBSA)
    fips_info: Dict[str, Any] = {}
    if geo_hit and geo_hit.get("lat") is not None and geo_hit.get("lon") is not None:
        fips_info = resolve_census_fips(geo_hit["lat"], geo_hit["lon"]) or {}

    # Backfill state FIPS from abbrev if geocoder didn't return it
    if not fips_info.get("state_fips"):
        fips_info["state_fips"] = state_abbrev_to_fips(state)
    if not fips_info.get("state_name") and state:
        # reverse lookup from _STATE_MAP
        for full_name, abbr in _STATE_MAP.items():
            if abbr == state.upper():
                fips_info["state_name"] = full_name
                break

    geo = {
        "city": city,
        "state_abbrev": state,
        "state": (geo_hit or {}).get("state") or fips_info.get("state_name"),
        "county": (geo_hit or {}).get("county") or (
            (fips_info.get("county_name") or "").replace(" County", "") or None
        ),
        "cbsa_code": fips_info.get("cbsa_code"),
        "cbsa_name": fips_info.get("cbsa_name"),
        "fips": {
            "state": fips_info.get("state_fips"),
            "county": fips_info.get("county_fips"),
            "place": fips_info.get("place_fips"),
        },
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
    state_abbr_upper = state.upper()
    state_unemp_series = FRED_STATE_UNEMP_TPL.format(state=state_abbr_upper)
    state_obs = fetch_fred_series(state_unemp_series, fred_key)
    if state_obs:
        fred[f"{state_abbr_upper} Unemployment Rate"] = state_obs

    # State HPI (FHFA, quarterly)
    state_hpi_series = FRED_STATE_HPI_TPL.format(state=state_abbr_upper)
    state_hpi_obs = fetch_fred_series(state_hpi_series, fred_key)
    if state_hpi_obs:
        fred[f"{state_abbr_upper} House Price Index (FHFA)"] = state_hpi_obs

    # MSA HPI (FHFA, quarterly, NSA) — only if CBSA resolved
    if fips_info.get("cbsa_code"):
        msa_hpi_series = FRED_MSA_HPI_TPL.format(cbsa=fips_info["cbsa_code"])
        msa_hpi_obs = fetch_fred_series(msa_hpi_series, fred_key)
        if msa_hpi_obs:
            msa_label_base = fips_info.get("cbsa_name") or f"MSA {fips_info['cbsa_code']}"
            # Strip " Metro Area" suffix for tidier labels
            msa_label = re.sub(r"\s+Metro(politan)? Area$", "", msa_label_base)
            fred[f"{msa_label} Home Price Index (FHFA)"] = msa_hpi_obs

    # Tiered Census ACS — state / county / place
    census_tiers: Dict[str, Any] = {}
    state_census = fetch_census_acs_tier("state", fips_info, census_key)
    if state_census:
        census_tiers["state"] = state_census
    if fips_info.get("county_fips"):
        county_census = fetch_census_acs_tier("county", fips_info, census_key)
        if county_census:
            census_tiers["county"] = county_census
    if fips_info.get("place_fips"):
        place_census = fetch_census_acs_tier("place", fips_info, census_key)
        if place_census:
            census_tiers["city"] = place_census

    # Legacy `census` key — populate with most-specific tier (city > county > state)
    # so downstream consumers + cache shape keep working.
    legacy_census = (
        census_tiers.get("city")
        or census_tiers.get("county")
        or census_tiers.get("state")
        or {}
    )

    indicators = {
        "fred": fred,
        "census": legacy_census,
        "census_tiers": census_tiers,
    }

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
