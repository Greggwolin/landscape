"""
Census Building Permits Survey Agent — place-level permit tracking.

Fetches monthly building permit data from Census BPS Excel downloads for
individual cities in monitored metro areas. Provides granular supply pipeline
visibility that FRED's national-level PERMIT series cannot — critical for
land development absorption analysis.

Source: https://www2.census.gov/econ/bps/Place/{Region}/footnote{YYYYMM}.xls
Auth: None (public download)
Frequency: Monthly
Geography: Place (city), County
Format: Excel (.xls) — one file per month per region, ~2 MB each

Note: Census does NOT offer a REST API for place-level BPS data. The
      api.census.gov/data/{year}/bps endpoint does not exist. Place-level
      data is only available as regional Excel file downloads.
"""

from __future__ import annotations

import io
import re
import time
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

import requests
from loguru import logger
from market_ingest.normalize import NormalizedObservation, parse_decimal

from ..base_agent import BaseAgent
from ..config import PHOENIX_METRO_PLACES, AgentConfig


# Census BPS file download URL pattern
# Format: https://www2.census.gov/econ/bps/Place/{Region}/footnote{YYYYMM}.xls
BPS_DOWNLOAD_BASE = "https://www2.census.gov/econ/bps/Place"

# Phoenix metro is in the West Region
WEST_REGION = "West Region"

# Column mapping from Census BPS Excel to our series codes.
# The Census Excel files have varying column headers, but the structure
# is consistent: place identifiers, then permit counts by unit type.
# We'll map by position after identifying the header row.
SERIES_MAP = {
    "PERMIT_TOTAL":    "total_buildings",
    "PERMIT_UNITS":    "total_units",
    "PERMIT_1UNIT":    "1_unit_bldgs",
    "PERMIT_1UNIT_U":  "1_unit_units",
    "PERMIT_2TO4":     "2_to_4_unit_bldgs",
    "PERMIT_5PLUS":    "5plus_unit_bldgs",
    "PERMIT_5PLUS_U":  "5plus_unit_units",
}

# Series codes this agent publishes
SERIES_CODES = list(SERIES_MAP.keys())

# Rate limit between downloads
DOWNLOAD_DELAY_SEC = 3.0

# How many months back to look (rolling window)
DEFAULT_LOOKBACK_MONTHS = 24


class CensusBpsAgent(BaseAgent):
    """
    Downloads monthly Census BPS Excel files and extracts permit data
    for Phoenix metro places and Maricopa County.
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
        Download BPS Excel files for each month in range and extract
        permit data for monitored places.
        """
        observations: List[NormalizedObservation] = []

        # Build list of (year, month) tuples to fetch
        months_to_fetch = self._get_month_range(start, end)
        logger.info(
            "[CENSUS_BPS] Fetching %d months of permit data (%s to %s)",
            len(months_to_fetch),
            months_to_fetch[0] if months_to_fetch else "none",
            months_to_fetch[-1] if months_to_fetch else "none",
        )

        # Build FIPS lookup for our target places
        place_lookup = self._build_place_lookup()

        for year, month in months_to_fetch:
            try:
                month_obs = self._fetch_month(year, month, place_lookup, series_meta)
                observations.extend(month_obs)
            except Exception as exc:
                logger.warning("[CENSUS_BPS] Failed for %d/%02d: %s", year, month, exc)

            # Rate limit
            time.sleep(DOWNLOAD_DELAY_SEC)

        return observations

    def _get_month_range(self, start: date, end: date) -> List[Tuple[int, int]]:
        """Generate list of (year, month) tuples in the date range."""
        months = []
        current = date(start.year, start.month, 1)
        end_first = date(end.year, end.month, 1)

        while current <= end_first:
            months.append((current.year, current.month))
            # Advance to next month
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)

        return months

    def _build_place_lookup(self) -> Dict[str, Dict]:
        """
        Build a lookup dict from FIPS codes to place info.
        Key is "state_fips+place_fips" (e.g., "0427400" for Glendale, AZ).
        """
        lookup = {}
        for place in PHOENIX_METRO_PLACES:
            key = f"{place['state_fips']}{place['place_fips']}"
            lookup[key] = place
        return lookup

    def _fetch_month(
        self,
        year: int,
        month: int,
        place_lookup: Dict[str, Dict],
        series_meta: Dict,
    ) -> List[NormalizedObservation]:
        """Download and parse one month's BPS Excel file."""
        url = f"{BPS_DOWNLOAD_BASE}/{WEST_REGION}/footnote{year}{month:02d}.xls"
        logger.debug("[CENSUS_BPS] Downloading %s", url)

        try:
            resp = self._session.get(url, timeout=60)
        except requests.RequestException as exc:
            logger.warning("[CENSUS_BPS] Download failed for %d/%02d: %s", year, month, exc)
            return []

        if resp.status_code == 404:
            logger.debug("[CENSUS_BPS] No file for %d/%02d (404)", year, month)
            return []

        if resp.status_code != 200:
            logger.warning("[CENSUS_BPS] HTTP %d for %d/%02d", resp.status_code, year, month)
            return []

        # Parse the Excel file
        return self._parse_bps_excel(
            resp.content, year, month, place_lookup, series_meta
        )

    def _parse_bps_excel(
        self,
        content: bytes,
        year: int,
        month: int,
        place_lookup: Dict[str, Dict],
        series_meta: Dict,
    ) -> List[NormalizedObservation]:
        """
        Parse a Census BPS Excel file and extract rows for our target places.

        The BPS Excel files have a non-trivial structure:
        - Several header/title rows at the top
        - A header row with column names
        - Data rows with FIPS codes + permit counts
        - Footnote rows at the bottom
        """
        try:
            import openpyxl
        except ImportError:
            try:
                import xlrd
                return self._parse_xls_xlrd(content, year, month, place_lookup, series_meta)
            except ImportError:
                logger.error("[CENSUS_BPS] Neither openpyxl nor xlrd installed")
                return []

        # Try openpyxl first (.xlsx), fall back to xlrd (.xls)
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            wb.close()
        except Exception:
            try:
                import xlrd
                return self._parse_xls_xlrd(content, year, month, place_lookup, series_meta)
            except ImportError:
                logger.error("[CENSUS_BPS] Failed to parse Excel — install xlrd for .xls support")
                return []

        return self._extract_observations(rows, year, month, place_lookup, series_meta)

    def _parse_xls_xlrd(
        self,
        content: bytes,
        year: int,
        month: int,
        place_lookup: Dict[str, Dict],
        series_meta: Dict,
    ) -> List[NormalizedObservation]:
        """Parse old-format .xls files using xlrd."""
        import xlrd
        wb = xlrd.open_workbook(file_contents=content)
        ws = wb.sheet_by_index(0)
        rows = []
        for row_idx in range(ws.nrows):
            rows.append(tuple(ws.cell_value(row_idx, col) for col in range(ws.ncols)))
        return self._extract_observations(rows, year, month, place_lookup, series_meta)

    def _extract_observations(
        self,
        rows: List[Tuple],
        year: int,
        month: int,
        place_lookup: Dict[str, Dict],
        series_meta: Dict,
    ) -> List[NormalizedObservation]:
        """
        Walk rows, find the header, then extract data for our target places.

        Census BPS Excel structure (typical):
        - Row 0-4: Title text ("Building Permits Survey", date, etc.)
        - Row ~5: Column headers (State, County, Place, Name, 1-unit, 2-unit, ...)
        - Row 6+: Data rows
        - Footer: Footnotes

        We detect the header row by looking for a row containing "1-unit" or
        "Total" plus a FIPS-like pattern.
        """
        observations = []
        obs_date = date(year, month, 1)

        # Find header row
        header_idx = None
        col_map = {}

        for idx, row in enumerate(rows):
            row_str = [str(c).lower().strip() if c else "" for c in row]
            joined = " ".join(row_str)

            # Header row typically contains these keywords
            if ("1-unit" in joined or "1 unit" in joined) and \
               ("total" in joined or "bldgs" in joined or "units" in joined):
                header_idx = idx
                col_map = self._map_columns(row)
                break

        if header_idx is None:
            logger.debug("[CENSUS_BPS] Could not find header row in %d/%02d file", year, month)
            return []

        # Process data rows
        for row in rows[header_idx + 1:]:
            if not row or len(row) < 5:
                continue

            # Extract FIPS identifiers
            state_fips, place_fips, place_name = self._extract_fips(row, col_map)
            if not state_fips or not place_fips:
                continue

            # Check if this place is one we monitor
            fips_key = f"{state_fips}{place_fips}"
            if fips_key not in place_lookup:
                continue

            place_info = place_lookup[fips_key]

            # Extract permit values for each series
            for series_code, col_key in [
                ("PERMIT_TOTAL", "total_bldgs"),
                ("PERMIT_UNITS", "total_units"),
                ("PERMIT_1UNIT", "1unit_bldgs"),
                ("PERMIT_1UNIT_U", "1unit_units"),
                ("PERMIT_2TO4", "2to4_bldgs"),
                ("PERMIT_5PLUS", "5plus_bldgs"),
                ("PERMIT_5PLUS_U", "5plus_units"),
            ]:
                if series_code not in series_meta:
                    continue

                col_idx = col_map.get(col_key)
                if col_idx is None:
                    continue

                try:
                    raw = row[col_idx] if col_idx < len(row) else None
                    if raw is None or str(raw).strip() in ("", ".", "N/A", "-"):
                        continue

                    value = parse_decimal(str(raw).replace(",", ""))
                    if value is not None and value >= 0:
                        geo_id = f"PLACE{state_fips}{place_fips}"
                        observations.append(NormalizedObservation(
                            series_code=series_code,
                            geo_id=geo_id,
                            geo_level="CITY",
                            date=obs_date,
                            value=value,
                            units="count",
                            seasonal="NSA",
                            source="BPS",
                            revision_tag=f"bps:{year}{month:02d}",
                            coverage_note=f"{place_info['name']}, AZ",
                        ))
                except (ValueError, TypeError, IndexError):
                    continue

        logger.info(
            "[CENSUS_BPS] %d/%02d: %d observations from %d target places",
            year, month, len(observations), len(place_lookup),
        )
        return observations

    def _map_columns(self, header_row: Tuple) -> Dict[str, int]:
        """
        Map Census BPS column headers to standardized keys.

        Census headers vary by year but follow patterns like:
        - "1-unit Bldgs", "1-unit Units", "2-units Bldgs", "3-4 units", "5+ units"
        - "Total", "State FIPS", "County FIPS", "Place FIPS", "Name"
        """
        col_map = {}
        for idx, val in enumerate(header_row):
            if val is None:
                continue
            h = str(val).lower().strip()

            # FIPS identifiers
            if "state" in h and ("fips" in h or "code" in h):
                col_map["state_fips"] = idx
            elif "county" in h and ("fips" in h or "code" in h):
                col_map["county_fips"] = idx
            elif "place" in h and ("fips" in h or "code" in h):
                col_map["place_fips"] = idx
            elif h in ("name", "place name", "area name"):
                col_map["name"] = idx

            # Permit counts — match flexibly
            elif "1-unit" in h or "1 unit" in h:
                if "bldg" in h:
                    col_map["1unit_bldgs"] = idx
                elif "unit" in h and "bldg" not in h and "1unit_units" not in col_map:
                    col_map["1unit_units"] = idx
            elif "2-unit" in h or "2 unit" in h or "2-" in h:
                col_map["2to4_bldgs"] = idx
            elif "3-4" in h or "3 and 4" in h:
                col_map.setdefault("2to4_bldgs", idx)
            elif "5+" in h or "5 unit" in h or "5-" in h:
                if "bldg" in h:
                    col_map["5plus_bldgs"] = idx
                elif "unit" in h:
                    col_map["5plus_units"] = idx
                else:
                    col_map.setdefault("5plus_bldgs", idx)

            # Totals
            if h == "total" or (h.startswith("total") and "bldg" in h):
                col_map.setdefault("total_bldgs", idx)
            elif h.startswith("total") and "unit" in h:
                col_map["total_units"] = idx

        return col_map

    def _extract_fips(
        self, row: Tuple, col_map: Dict[str, int]
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Extract state/place FIPS from a data row."""
        state_idx = col_map.get("state_fips")
        place_idx = col_map.get("place_fips")
        name_idx = col_map.get("name")

        if state_idx is None or place_idx is None:
            return None, None, None

        try:
            state_raw = row[state_idx] if state_idx < len(row) else None
            place_raw = row[place_idx] if place_idx < len(row) else None
            name_raw = row[name_idx] if name_idx is not None and name_idx < len(row) else None

            if state_raw is None or place_raw is None:
                return None, None, None

            # FIPS codes may be numeric or string
            state_fips = str(int(float(str(state_raw)))).zfill(2)
            place_fips = str(int(float(str(place_raw)))).zfill(5)
            place_name = str(name_raw).strip() if name_raw else ""

            return state_fips, place_fips, place_name

        except (ValueError, TypeError):
            return None, None, None


# ── Standalone entry point ───────────────────────────────────────────

def run_standalone():
    """CLI entry: python -m market_agents.agents.census_bps_agent"""
    agent = CensusBpsAgent()
    agent.run_standalone()


if __name__ == "__main__":
    run_standalone()
