"""
Census Building Permits Survey Agent — place-level permit tracking.

Downloads monthly building permit CSV files from the Census Bureau's
public file server and extracts permit counts for monitored cities.
This provides granular supply pipeline visibility that FRED's national-
level PERMIT series cannot — critical for land development absorption.

Source: https://www2.census.gov/econ/bps/Place/{Region}/we{YY}{MM}c.txt
Auth: None (public download)
Frequency: Monthly
Geography: Place (city), County
Format: CSV text — one file per month per region
"""

from __future__ import annotations

import csv
import io
import time
from datetime import date, timedelta
from typing import Dict, List, Optional, Set, Tuple

import requests
from loguru import logger
from market_ingest.normalize import NormalizedObservation, parse_decimal

from ..base_agent import BaseAgent
from ..config import AgentConfig

# State FIPS → abbreviation for coverage notes
_STATE_ABBR = {"04": "AZ", "06": "CA", "08": "CO", "32": "NV", "49": "UT"}


# ── Census BPS file structure ────────────────────────────────────────────

BPS_BASE_URL = "https://www2.census.gov/econ/bps"

# Regional file prefixes — Arizona is in the West
REGION_PREFIXES = {
    "west": "we",
    "south": "so",
    "midwest": "mw",
    "northeast": "ne",
}

# Default region — West covers AZ, CA, CO, etc.
DEFAULT_REGION = "west"

# Column indices in the place-level CSV (0-based, from header inspection)
# Row format:
#   Survey Date, State Code, 6-Digit ID, County Code, Census Place,
#   FIPS Place, FIPS MCD, Pop, CSA, CBSA, Footnote, Central City,
#   Zip, Region, Division, Source, Place Name,
#   1-unit Bldgs, 1-unit Units, 1-unit Value,
#   2-unit Bldgs, 2-unit Units, 2-unit Value,
#   3-4 unit Bldgs, 3-4 unit Units, 3-4 unit Value,
#   5+ unit Bldgs, 5+ unit Units, 5+ unit Value
COL_STATE = 1
COL_FIPS_PLACE = 5
COL_PLACE_NAME = 16
COL_1UNIT_BLDGS = 17
COL_1UNIT_UNITS = 18
COL_1UNIT_VALUE = 19
COL_2UNIT_BLDGS = 20
COL_5PLUS_BLDGS = 26
COL_5PLUS_UNITS = 27
COL_5PLUS_VALUE = 28

# County-level column indices (different format, fewer columns)
# Survey Date, FIPS State, FIPS County, Region, Division, County Name,
# 1-unit Bldgs, 1-unit Units, 1-unit Value, ...
CO_COL_STATE = 1
CO_COL_COUNTY = 2
CO_COL_NAME = 5
CO_COL_1UNIT_BLDGS = 6
CO_COL_1UNIT_UNITS = 7
CO_COL_5PLUS_BLDGS = 15
CO_COL_5PLUS_UNITS = 16

# Series codes this agent writes to (must exist in public.market_series)
SERIES_CODES = ["BPS_TOTAL", "BPS_ONEUNIT", "BPS_FIVEPLUS"]

# Rate limit between file downloads (Census asks for courtesy)
DOWNLOAD_DELAY_SEC = 2.0

# How many months back on first run
DEFAULT_LOOKBACK_MONTHS = 24

# ── Target geographies ──────────────────────────────────────────────────
# State FIPS → { place_fips: place_name }
# Configurable: add new states/places here

TARGET_PLACES: Dict[str, Dict[str, str]] = {
    "04": {  # Arizona
        "55000": "Phoenix",
        "54050": "Peoria",
        "27400": "Glendale",
        "71510": "Surprise",
        "07940": "Buckeye",
        "28380": "Goodyear",
        "27820": "Gilbert",
        "12000": "Chandler",
        "46000": "Mesa",
        "65000": "Scottsdale",
        "73000": "Tempe",
        "57380": "Queen Creek",
        "44410": "Maricopa",
        "09950": "Casa Grande",
        "23620": "Florence",
        "15250": "Coolidge",
        "77000": "Tucson",
    },
}

TARGET_COUNTIES: Dict[str, Dict[str, str]] = {
    "04": {  # Arizona
        "013": "Maricopa",
        "021": "Pinal",
        "019": "Pima",
    },
}


class CensusBpsAgent(BaseAgent):
    """
    Downloads monthly Census BPS CSV files and extracts place-level
    and county-level permit data for monitored geographies.
    """

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "Landscape-CRE-Analytics/1.0 (research; gregg@wolinfamily.com)",
        })

    @property
    def name(self) -> str:
        return "CENSUS_BPS"

    def series_codes(self) -> List[str]:
        return SERIES_CODES

    def fetch_for_geo(
        self,
        targets,
        series_meta: Dict,
        start: date,
        end: date,
    ) -> List[NormalizedObservation]:
        """
        Download BPS CSV files for each month in range and extract
        permit data for monitored places and counties.
        """
        observations: List[NormalizedObservation] = []

        months = self._month_range(start, end)
        if not months:
            return []

        # Ensure all target places exist in geo_xwalk
        self._ensure_geo_xwalk_entries()

        logger.info(
            "[CENSUS_BPS] Fetching %d months (%04d-%02d to %04d-%02d)",
            len(months), months[0][0], months[0][1],
            months[-1][0], months[-1][1],
        )

        # ── Place-level files ───────────────────────────────────────
        for year, month in months:
            try:
                place_obs = self._download_and_parse_places(
                    year, month, series_meta,
                )
                observations.extend(place_obs)
            except Exception as exc:
                logger.warning(
                    "[CENSUS_BPS] Place file failed %d/%02d: %s",
                    year, month, exc,
                )
            time.sleep(DOWNLOAD_DELAY_SEC)

        # ── County-level files ──────────────────────────────────────
        for year, month in months:
            try:
                county_obs = self._download_and_parse_counties(
                    year, month, series_meta,
                )
                observations.extend(county_obs)
            except Exception as exc:
                logger.warning(
                    "[CENSUS_BPS] County file failed %d/%02d: %s",
                    year, month, exc,
                )
            time.sleep(DOWNLOAD_DELAY_SEC)

        return observations

    # ── File download ────────────────────────────────────────────────

    def _download_file(self, url: str) -> Optional[str]:
        """Download a text file, returning its content or None on 404."""
        try:
            resp = self._session.get(url, timeout=60)
        except requests.RequestException as exc:
            logger.warning("[CENSUS_BPS] Download error: %s — %s", url, exc)
            return None

        if resp.status_code == 404:
            logger.debug("[CENSUS_BPS] 404: %s (not yet published)", url)
            return None

        if resp.status_code != 200:
            logger.warning("[CENSUS_BPS] HTTP %d: %s", resp.status_code, url)
            return None

        return resp.text

    # ── Place-level parsing ──────────────────────────────────────────

    def _place_file_url(self, year: int, month: int) -> str:
        """Build URL for a monthly place-level file."""
        prefix = REGION_PREFIXES[DEFAULT_REGION]
        yy = year % 100
        return (
            f"{BPS_BASE_URL}/Place/"
            f"{DEFAULT_REGION.capitalize()}%20Region/"
            f"{prefix}{yy:02d}{month:02d}c.txt"
        )

    def _download_and_parse_places(
        self,
        year: int,
        month: int,
        series_meta: Dict,
    ) -> List[NormalizedObservation]:
        """Download one month's place-level file and parse target rows."""
        url = self._place_file_url(year, month)
        text = self._download_file(url)
        if text is None:
            return []

        lines = text.strip().splitlines()
        if len(lines) < 3:
            logger.warning("[CENSUS_BPS] File too short: %s (%d lines)", url, len(lines))
            return []

        # Log first data line for format confirmation
        logger.debug("[CENSUS_BPS] Header: %s", lines[0][:120])
        logger.debug("[CENSUS_BPS] Sample:  %s", lines[3][:120] if len(lines) > 3 else "N/A")

        # Build lookup set for fast FIPS matching: "SS-PPPPP"
        target_set: Set[str] = set()
        for state_fips, places in TARGET_PLACES.items():
            for place_fips in places:
                target_set.add(f"{state_fips}-{place_fips}")

        observations: List[NormalizedObservation] = []
        obs_date = date(year, month, 1)

        # Skip header rows (2 header lines + 1 blank line)
        reader = csv.reader(io.StringIO(text))
        row_num = 0
        for row in reader:
            row_num += 1
            if row_num <= 3:  # 2 header rows + blank
                continue
            if len(row) < COL_5PLUS_VALUE + 1:
                continue

            state_fips = row[COL_STATE].strip()
            raw_place_fips = row[COL_FIPS_PLACE].strip()
            place_name = row[COL_PLACE_NAME].strip()

            # Skip unincorporated areas and non-matching codes
            if not raw_place_fips or raw_place_fips == "99990":
                continue

            key = f"{state_fips}-{raw_place_fips}"
            if key not in target_set:
                continue

            # Total units = 1-unit + 2-unit + 3-4 unit + 5+ units
            units_1 = self._parse_int(row[COL_1UNIT_UNITS])
            units_5plus = self._parse_int(row[COL_5PLUS_UNITS])

            # Total = all unit types' units columns
            # Column layout: 1-unit(bldgs,units,val), 2-unit(b,u,v), 3-4(b,u,v), 5+(b,u,v)
            units_2 = self._parse_int(row[COL_2UNIT_BLDGS + 1]) if len(row) > COL_2UNIT_BLDGS + 1 else 0
            units_34 = self._parse_int(row[COL_2UNIT_BLDGS + 4]) if len(row) > COL_2UNIT_BLDGS + 4 else 0
            total_units = (units_1 or 0) + (units_2 or 0) + (units_34 or 0) + (units_5plus or 0)

            # geo_xwalk uses "SS-PPPPP" format for cities
            geo_id = f"{state_fips}-{raw_place_fips}"
            display_name = TARGET_PLACES.get(state_fips, {}).get(raw_place_fips, place_name)
            st_abbr = _STATE_ABBR.get(state_fips, state_fips)
            coverage = f"{display_name}, {st_abbr}"

            # BPS_TOTAL — total units across all types
            if "BPS_TOTAL" in series_meta and total_units > 0:
                observations.append(NormalizedObservation(
                    series_code="BPS_TOTAL",
                    geo_id=geo_id,
                    geo_level="CITY",
                    date=obs_date,
                    value=parse_decimal(str(total_units)),
                    units="count",
                    seasonal="NSA",
                    source="BPS",
                    revision_tag=f"bps:{year}{month:02d}",
                    coverage_note=coverage,
                ))

            # BPS_ONEUNIT — single-family units
            if "BPS_ONEUNIT" in series_meta and units_1 is not None and units_1 > 0:
                observations.append(NormalizedObservation(
                    series_code="BPS_ONEUNIT",
                    geo_id=geo_id,
                    geo_level="CITY",
                    date=obs_date,
                    value=parse_decimal(str(units_1)),
                    units="count",
                    seasonal="NSA",
                    source="BPS",
                    revision_tag=f"bps:{year}{month:02d}",
                    coverage_note=coverage,
                ))

            # BPS_FIVEPLUS — 5+ unit (multifamily) units
            if "BPS_FIVEPLUS" in series_meta and units_5plus is not None and units_5plus > 0:
                observations.append(NormalizedObservation(
                    series_code="BPS_FIVEPLUS",
                    geo_id=geo_id,
                    geo_level="CITY",
                    date=obs_date,
                    value=parse_decimal(str(units_5plus)),
                    units="count",
                    seasonal="NSA",
                    source="BPS",
                    revision_tag=f"bps:{year}{month:02d}",
                    coverage_note=coverage,
                ))

        logger.info(
            "[CENSUS_BPS] Place %d/%02d: %d observations for %d target places",
            year, month, len(observations), len(target_set),
        )
        return observations

    # ── County-level parsing ─────────────────────────────────────────

    def _county_file_url(self, year: int, month: int) -> str:
        """Build URL for a monthly county-level file."""
        yy = year % 100
        return f"{BPS_BASE_URL}/County/co{yy:02d}{month:02d}c.txt"

    def _download_and_parse_counties(
        self,
        year: int,
        month: int,
        series_meta: Dict,
    ) -> List[NormalizedObservation]:
        """Download one month's county-level file and parse target rows."""
        url = self._county_file_url(year, month)
        text = self._download_file(url)
        if text is None:
            return []

        lines = text.strip().splitlines()
        if len(lines) < 3:
            return []

        target_set: Set[str] = set()
        for state_fips, counties in TARGET_COUNTIES.items():
            for county_fips in counties:
                target_set.add(f"{state_fips}-{county_fips}")

        observations: List[NormalizedObservation] = []
        obs_date = date(year, month, 1)

        reader = csv.reader(io.StringIO(text))
        row_num = 0
        for row in reader:
            row_num += 1
            if row_num <= 3:
                continue
            if len(row) < CO_COL_5PLUS_UNITS + 1:
                continue

            state_fips = row[CO_COL_STATE].strip()
            county_fips = row[CO_COL_COUNTY].strip().zfill(3)
            county_name = row[CO_COL_NAME].strip()

            key = f"{state_fips}-{county_fips}"
            if key not in target_set:
                continue

            units_1 = self._parse_int(row[CO_COL_1UNIT_UNITS])
            units_5plus = self._parse_int(row[CO_COL_5PLUS_UNITS])
            # County files have more columns for "reported" values
            # Total = sum of 1-unit + 2-unit + 3-4 + 5+ (units columns)
            units_2 = self._parse_int(row[CO_COL_1UNIT_BLDGS + 3 + 1]) if len(row) > CO_COL_1UNIT_BLDGS + 4 else 0
            units_34 = self._parse_int(row[CO_COL_1UNIT_BLDGS + 6 + 1]) if len(row) > CO_COL_1UNIT_BLDGS + 7 else 0
            total_units = (units_1 or 0) + (units_2 or 0) + (units_34 or 0) + (units_5plus or 0)

            # geo_xwalk uses "SSCCC" format for counties
            geo_id = f"{state_fips}{county_fips}"
            display_name = TARGET_COUNTIES.get(state_fips, {}).get(county_fips, county_name)
            st_abbr = _STATE_ABBR.get(state_fips, state_fips)
            coverage = f"{display_name} County, {st_abbr}"

            if "BPS_TOTAL" in series_meta and total_units > 0:
                observations.append(NormalizedObservation(
                    series_code="BPS_TOTAL",
                    geo_id=geo_id,
                    geo_level="COUNTY",
                    date=obs_date,
                    value=parse_decimal(str(total_units)),
                    units="count",
                    seasonal="NSA",
                    source="BPS",
                    revision_tag=f"bps:{year}{month:02d}",
                    coverage_note=coverage,
                ))

            if "BPS_ONEUNIT" in series_meta and units_1 is not None and units_1 > 0:
                observations.append(NormalizedObservation(
                    series_code="BPS_ONEUNIT",
                    geo_id=geo_id,
                    geo_level="COUNTY",
                    date=obs_date,
                    value=parse_decimal(str(units_1)),
                    units="count",
                    seasonal="NSA",
                    source="BPS",
                    revision_tag=f"bps:{year}{month:02d}",
                    coverage_note=coverage,
                ))

            if "BPS_FIVEPLUS" in series_meta and units_5plus is not None and units_5plus > 0:
                observations.append(NormalizedObservation(
                    series_code="BPS_FIVEPLUS",
                    geo_id=geo_id,
                    geo_level="COUNTY",
                    date=obs_date,
                    value=parse_decimal(str(units_5plus)),
                    units="count",
                    seasonal="NSA",
                    source="BPS",
                    revision_tag=f"bps:{year}{month:02d}",
                    coverage_note=coverage,
                ))

        logger.info(
            "[CENSUS_BPS] County %d/%02d: %d observations",
            year, month, len(observations),
        )
        return observations

    # ── Geo bootstrap ──────────────────────────────────────────────────

    def _ensure_geo_xwalk_entries(self):
        """
        Ensure all target places and counties exist in geo_xwalk.
        Inserts missing entries so the market_data FK constraint passes.
        """
        import psycopg2

        with self.db.connection() as conn, conn.cursor() as cur:
            # Places
            for state_fips, places in TARGET_PLACES.items():
                st_abbr = _STATE_ABBR.get(state_fips, state_fips)
                for place_fips, place_name in places.items():
                    geo_id = f"{state_fips}-{place_fips}"
                    try:
                        cur.execute("""
                            INSERT INTO public.geo_xwalk
                                (geo_id, geo_level, geo_name, state_fips, place_fips)
                            VALUES (%s, 'CITY', %s, %s, %s)
                            ON CONFLICT (geo_id) DO NOTHING
                        """, (geo_id, f"{place_name} city", state_fips, place_fips))
                    except psycopg2.Error:
                        conn.rollback()

            # Counties
            for state_fips, counties in TARGET_COUNTIES.items():
                st_abbr = _STATE_ABBR.get(state_fips, state_fips)
                for county_fips, county_name in counties.items():
                    geo_id = f"{state_fips}{county_fips}"
                    try:
                        cur.execute("""
                            INSERT INTO public.geo_xwalk
                                (geo_id, geo_level, geo_name, state_fips, county_fips)
                            VALUES (%s, 'COUNTY', %s, %s, %s)
                            ON CONFLICT (geo_id) DO NOTHING
                        """, (geo_id, f"{county_name} County", state_fips, county_fips))
                    except psycopg2.Error:
                        conn.rollback()

        logger.debug("[CENSUS_BPS] Ensured geo_xwalk entries for target places/counties")

    # ── Helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _month_range(start: date, end: date) -> List[Tuple[int, int]]:
        """Generate (year, month) tuples for the date range."""
        months = []
        cur = date(start.year, start.month, 1)
        end_m = date(end.year, end.month, 1)
        while cur <= end_m:
            months.append((cur.year, cur.month))
            if cur.month == 12:
                cur = date(cur.year + 1, 1, 1)
            else:
                cur = date(cur.year, cur.month + 1, 1)
        return months

    @staticmethod
    def _parse_int(val: str) -> Optional[int]:
        """Parse a string to int, returning None on failure."""
        try:
            v = val.strip().replace(",", "")
            if not v or v in (".", "-", "N/A", ""):
                return None
            return int(v)
        except (ValueError, TypeError):
            return None


# ── Standalone entry point ───────────────────────────────────────────

def run_standalone():
    """CLI entry: python -m market_agents.agents.census_bps_agent"""
    agent = CensusBpsAgent()
    agent.run_standalone()


if __name__ == "__main__":
    run_standalone()
