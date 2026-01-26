"""
Clients for Census ACS and Building Permits Survey datasets.

Includes:
- CensusClient: Original client for time-series market data
- BlockGroupDemographicsClient: Client for block-group-level ACS demographics
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Dict, Iterable, List, Optional, Tuple, Any

import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from .db import GeoRecord, SeriesMeta
from .normalize import NormalizedObservation, parse_decimal


class CensusError(RuntimeError):
    """Raised when the Census API request fails."""


# =============================================================================
# BLOCK GROUP DEMOGRAPHICS VARIABLES (for location_intelligence)
# =============================================================================

# ACS 5-year variables for block group demographics
# Format: {internal_name: acs_variable_code}
BLOCK_GROUP_VARIABLES: Dict[str, str] = {
    # Population
    "total_population": "B01003_001E",

    # Age
    "median_age": "B01002_001E",

    # Households
    "total_households": "B11001_001E",
    "avg_household_size": "B25010_001E",

    # Income
    "median_household_income": "B19013_001E",
    "per_capita_income": "B19301_001E",

    # Housing
    "total_housing_units": "B25001_001E",
    "median_home_value": "B25077_001E",
    "median_gross_rent": "B25064_001E",
    "owner_occupied_units": "B25003_002E",
    "total_occupied_units": "B25003_001E",

    # Employment
    "employed_population": "B23025_004E",  # Employed in civilian labor force
    "unemployed_population": "B23025_005E",
    "labor_force": "B23025_003E",
}

# All variable codes for API request
ALL_BG_VARIABLE_CODES = list(BLOCK_GROUP_VARIABLES.values())


@dataclass
class BlockGroupDemographics:
    """Demographics for a single Census block group."""
    geoid: str  # 12-character GEOID (state + county + tract + bg)
    state_fips: str
    county_fips: str
    tract_code: str
    bg_code: str

    # Population
    total_population: Optional[int] = None

    # Age
    median_age: Optional[float] = None

    # Households
    total_households: Optional[int] = None
    avg_household_size: Optional[float] = None

    # Income
    median_household_income: Optional[int] = None
    per_capita_income: Optional[int] = None

    # Housing
    total_housing_units: Optional[int] = None
    median_home_value: Optional[int] = None
    median_gross_rent: Optional[int] = None
    owner_occupied_pct: Optional[float] = None

    # Employment
    employed_population: Optional[int] = None
    unemployment_rate: Optional[float] = None


# =============================================================================
# ORIGINAL ACS SERIES VARIABLES (for market_ingest)
# =============================================================================

ACS_SERIES_VARIABLES: Dict[str, str] = {
    "ACS_POPULATION": "B01001_001E",
    "ACS_HOUSEHOLDS": "B11001_001E",
    "ACS_MEDIAN_HH_INC": "B19013_001E",
    "ACS_STATE_POPULATION": "B01001_001E",
    "ACS_COUNTY_POPULATION": "B01001_001E",
    "ACS_MSA_MEDIAN_HH_INC": "B19013_001E",
    "ACS_COUNTY_MEDIAN_HH_INC": "B19013_001E",
    "ACS_TRACT_MEDIAN_HH_INC": "B19013_001E",
}


BPS_SERIES_VARIABLES: Dict[str, str] = {
    "BPS_TOTAL": "TOTAL",
    "BPS_ONEUNIT": "ONEUNIT",
    "BPS_FIVEPLUS": "FIVEPLUS",
    "PERMIT_TOTAL": "TOTAL",
    "PERMIT_1UNIT": "ONEUNIT",
    "PERMIT_5PLUS": "FIVEPLUS",
    "PERMIT_PLACE_TOTAL": "TOTAL",
    "PERMIT_PLACE_1UNIT": "ONEUNIT",
    "PERMIT_PLACE_5PLUS": "FIVEPLUS",
}


def _first_day_from_period(period: str) -> date:
    # BPS period strings look like 2023-01 or 2023-02
    return date.fromisoformat(f"{period}-01")


@dataclass(frozen=True)
class CensusQuery:
    url: str
    params: Dict[str, str]


class CensusClient:
    BASE_URL = "https://api.census.gov/data"

    def __init__(self, api_key: Optional[str], session: Optional[requests.Session] = None):
        self.api_key = api_key
        self.session = session or requests.Session()

    def _build_acs_query(self, series_code: str, geo: GeoRecord, year: int) -> List[CensusQuery]:
        dataset_priority = {
            "CITY": ["acs/acs1", "acs/acs5"],
            "COUNTY": ["acs/acs1", "acs/acs5"],
            "MSA": ["acs/acs1", "acs/acs5"],
            "TRACT": ["acs/acs5"],  # Tracts only in 5-year estimates
            "STATE": ["acs/acs1"],
            "US": ["acs/acs1"],
        }
        datasets = dataset_priority.get(geo.geo_level, ["acs/acs5"])
        queries: List[CensusQuery] = []
        variable = ACS_SERIES_VARIABLES[series_code]

        for dataset in datasets:
            url = f"{self.BASE_URL}/{year}/{dataset}"
            params = {"get": f"NAME,{variable}"}
            if geo.geo_level == "CITY":
                params["for"] = f"place:{geo.place_fips}"
                params["in"] = f"state:{geo.state_fips}"
            elif geo.geo_level == "COUNTY":
                params["for"] = f"county:{geo.county_fips}"
                params["in"] = f"state:{geo.state_fips}"
            elif geo.geo_level == "MSA":
                params["for"] = f"metropolitan statistical area/micropolitan statistical area:{geo.cbsa_code}"
            elif geo.geo_level == "TRACT":
                # Extract the 6-digit tract code from the full 11-digit FIPS
                # Format: SSCCCTTTTTT where SS=state, CCC=county, TTTTTT=tract
                tract_code = geo.tract_fips[-6:] if geo.tract_fips and len(geo.tract_fips) == 11 else geo.tract_fips
                params["for"] = f"tract:{tract_code}"
                params["in"] = f"state:{geo.state_fips}+county:{geo.county_fips}"
            elif geo.geo_level == "STATE":
                params["for"] = f"state:{geo.state_fips}"
            else:
                params["for"] = "us:1"
            if self.api_key:
                params["key"] = self.api_key
            queries.append(CensusQuery(url=url, params=params))
        return queries

    def _build_bps_query(self, geo: GeoRecord, start: date, end: date) -> CensusQuery:
        url = f"{self.BASE_URL}/timeseries/bps/permits"
        params = {
            "get": "NAME,TOTAL,ONEUNIT,FIVEPLUS",
            # BPS at place-level supports ANNUAL time only
            "time": f"from {start.strftime('%Y')}",
        }
        if geo.geo_level == "CITY":
            params["for"] = f"place:{geo.place_fips}"
            params["in"] = f"state:{geo.state_fips}"
        elif geo.geo_level == "COUNTY":
            params["for"] = f"county:{geo.county_fips}"
            params["in"] = f"state:{geo.state_fips}"
        elif geo.geo_level == "STATE":
            params["for"] = f"state:{geo.state_fips}"
        else:
            params["for"] = "us:1"
        if self.api_key:
            params["key"] = self.api_key
        return CensusQuery(url=url, params=params)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def _request(self, query: CensusQuery) -> List[List[str]]:
        logger.debug("Census request url={} params={}", query.url, query.params)
        response = self.session.get(query.url, params=query.params, timeout=30)
        if response.status_code == 204:
            return []
        # 404 means data not available for this geography/time period - treat as empty
        if response.status_code == 404:
            logger.debug("Census API returned 404 (data not available) for query: {}", query.params)
            return []
        if response.status_code >= 400:
            raise CensusError(f"Census API error {response.status_code}: {response.text}")
        return response.json()

    def fetch_acs_series(
        self,
        series_meta: Dict[str, SeriesMeta],
        geo: GeoRecord,
        start: date,
        end: date,
    ) -> List[NormalizedObservation]:
        results: List[NormalizedObservation] = []
        start_year, end_year = start.year, end.year

        for series_code in series_meta.keys():
            if series_code not in ACS_SERIES_VARIABLES:
                continue

            for year in range(start_year, end_year + 1):
                queries = self._build_acs_query(series_code, geo, year)
                value = None
                dataset_used = None
                for query in queries:
                    try:
                        payload = self._request(query)
                    except CensusError as exc:
                        logger.warning(
                            "ACS query failed for series {} year {}: {}", series_code, year, exc
                        )
                        continue
                    if len(payload) <= 1:
                        continue
                    value = payload[1][1]
                    dataset_used = query.url.split("/acs/")[-1]
                    break

                if value is None:
                    logger.warning(
                        "ACS data missing for series {} geo {} year {}", series_code, geo.geo_id, year
                    )
                    continue

                results.append(
                    NormalizedObservation(
                        series_code=series_code,
                        geo_id=geo.geo_id,
                        geo_level=geo.geo_level,
                        date=date(year, 1, 1),
                        value=parse_decimal(value),
                        units=series_meta[series_code].units,
                        seasonal=series_meta[series_code].seasonal,
                        source="ACS",
                        revision_tag=f"acs:{dataset_used}:{year}",
                    )
                )
        return results

    def fetch_bps_series(
        self,
        series_meta: Dict[str, SeriesMeta],
        geo: GeoRecord,
        start: date,
        end: date,
    ) -> List[NormalizedObservation]:
        query = self._build_bps_query(geo, start, end)
        try:
            payload = self._request(query)
        except CensusError as exc:
            logger.warning("BPS query failed for geo {}: {}", geo.geo_id, exc)
            return []

        if len(payload) <= 1:
            return []

        header = payload[0]
        records = payload[1:]
        col_index = {column: idx for idx, column in enumerate(header)}

        results: List[NormalizedObservation] = []
        for record in records:
            period = record[col_index["time"]]
            for series_code, variable in BPS_SERIES_VARIABLES.items():
                if series_code not in series_meta:
                    continue
                value = record[col_index.get(variable)]
                results.append(
                    NormalizedObservation(
                        series_code=series_code,
                        geo_id=geo.geo_id,
                        geo_level=geo.geo_level,
                        date=_first_day_from_period(period),
                        value=parse_decimal(value),
                        units=series_meta[series_code].units,
                        seasonal=series_meta[series_code].seasonal,
                        source="BPS",
                        revision_tag=f"bps:{period}",
                    )
                )
        return results


# =============================================================================
# BLOCK GROUP DEMOGRAPHICS CLIENT (for location_intelligence)
# =============================================================================

class BlockGroupDemographicsClient:
    """
    Client for fetching ACS 5-year demographics at the block group level.

    Used by the location_intelligence module to populate demographics_cache.
    Fetches all block groups for a county in a single API call.
    """

    BASE_URL = "https://api.census.gov/data"

    def __init__(self, api_key: Optional[str], year: int = 2023, session: Optional[requests.Session] = None):
        """
        Initialize the block group demographics client.

        Args:
            api_key: Census API key (optional but recommended for higher rate limits)
            year: ACS 5-year vintage year (default: 2023 for 2019-2023 estimates)
            session: Optional requests session for connection pooling
        """
        self.api_key = api_key
        self.year = year
        self.session = session or requests.Session()
        self.vintage = f"{year}_5yr"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=15))
    def _request(self, url: str, params: Dict[str, str]) -> List[List[str]]:
        """Make a Census API request with retry logic."""
        logger.debug("Census BG request url={} params={}", url, params)
        response = self.session.get(url, params=params, timeout=60)

        if response.status_code == 204:
            return []
        if response.status_code == 404:
            logger.debug("Census API returned 404 for params: {}", params)
            return []
        if response.status_code >= 400:
            raise CensusError(f"Census API error {response.status_code}: {response.text}")

        return response.json()

    def fetch_county_block_groups(
        self,
        state_fips: str,
        county_fips: str
    ) -> List[BlockGroupDemographics]:
        """
        Fetch demographics for all block groups in a county.

        Args:
            state_fips: 2-digit state FIPS code (e.g., "06" for CA, "04" for AZ)
            county_fips: 3-digit county FIPS code

        Returns:
            List of BlockGroupDemographics objects
        """
        # Build the variable list for the API request
        variables = ",".join(ALL_BG_VARIABLE_CODES)

        url = f"{self.BASE_URL}/{self.year}/acs/acs5"
        params = {
            "get": f"NAME,{variables}",
            "for": "block group:*",
            "in": f"state:{state_fips} county:{county_fips} tract:*",
        }
        if self.api_key:
            params["key"] = self.api_key

        try:
            payload = self._request(url, params)
        except CensusError as exc:
            logger.error("Failed to fetch block groups for state={} county={}: {}",
                        state_fips, county_fips, exc)
            return []

        if len(payload) <= 1:
            logger.warning("No block groups returned for state={} county={}",
                          state_fips, county_fips)
            return []

        # Parse the response
        header = payload[0]
        records = payload[1:]

        # Build column index
        col_index = {col: idx for idx, col in enumerate(header)}

        # Map ACS variable codes to column indices
        var_to_col: Dict[str, int] = {}
        for var_name, var_code in BLOCK_GROUP_VARIABLES.items():
            if var_code in col_index:
                var_to_col[var_name] = col_index[var_code]

        results: List[BlockGroupDemographics] = []

        for record in records:
            # Extract geography identifiers
            state = record[col_index.get("state", -1)] if "state" in col_index else state_fips
            county = record[col_index.get("county", -1)] if "county" in col_index else county_fips
            tract = record[col_index.get("tract", -1)] if "tract" in col_index else ""
            bg = record[col_index.get("block group", -1)] if "block group" in col_index else ""

            # Construct GEOID: state(2) + county(3) + tract(6) + bg(1) = 12 chars
            geoid = f"{state}{county}{tract}{bg}"

            # Parse numeric values (handle null/-666666666 values from Census)
            def parse_int(val: Any) -> Optional[int]:
                if val is None or val == "" or val == "-666666666":
                    return None
                try:
                    return int(float(val))
                except (ValueError, TypeError):
                    return None

            def parse_float(val: Any) -> Optional[float]:
                if val is None or val == "" or val == "-666666666":
                    return None
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return None

            # Extract values
            total_pop = parse_int(record[var_to_col["total_population"]]) if "total_population" in var_to_col else None
            total_hh = parse_int(record[var_to_col["total_households"]]) if "total_households" in var_to_col else None
            total_housing = parse_int(record[var_to_col["total_housing_units"]]) if "total_housing_units" in var_to_col else None
            owner_occupied = parse_int(record[var_to_col["owner_occupied_units"]]) if "owner_occupied_units" in var_to_col else None
            total_occupied = parse_int(record[var_to_col["total_occupied_units"]]) if "total_occupied_units" in var_to_col else None
            unemployed = parse_int(record[var_to_col["unemployed_population"]]) if "unemployed_population" in var_to_col else None
            labor_force = parse_int(record[var_to_col["labor_force"]]) if "labor_force" in var_to_col else None

            # Calculate derived percentages
            owner_occupied_pct = None
            if owner_occupied is not None and total_occupied is not None and total_occupied > 0:
                owner_occupied_pct = round((owner_occupied / total_occupied) * 100, 2)

            unemployment_rate = None
            if unemployed is not None and labor_force is not None and labor_force > 0:
                unemployment_rate = round((unemployed / labor_force) * 100, 2)

            results.append(BlockGroupDemographics(
                geoid=geoid,
                state_fips=state,
                county_fips=county,
                tract_code=tract,
                bg_code=bg,
                total_population=total_pop,
                median_age=parse_float(record[var_to_col["median_age"]]) if "median_age" in var_to_col else None,
                total_households=total_hh,
                avg_household_size=parse_float(record[var_to_col["avg_household_size"]]) if "avg_household_size" in var_to_col else None,
                median_household_income=parse_int(record[var_to_col["median_household_income"]]) if "median_household_income" in var_to_col else None,
                per_capita_income=parse_int(record[var_to_col["per_capita_income"]]) if "per_capita_income" in var_to_col else None,
                total_housing_units=total_housing,
                median_home_value=parse_int(record[var_to_col["median_home_value"]]) if "median_home_value" in var_to_col else None,
                median_gross_rent=parse_int(record[var_to_col["median_gross_rent"]]) if "median_gross_rent" in var_to_col else None,
                owner_occupied_pct=owner_occupied_pct,
                employed_population=parse_int(record[var_to_col["employed_population"]]) if "employed_population" in var_to_col else None,
                unemployment_rate=unemployment_rate,
            ))

        logger.info("Fetched {} block groups for state={} county={}",
                   len(results), state_fips, county_fips)
        return results

    def fetch_state_block_groups(self, state_fips: str) -> List[BlockGroupDemographics]:
        """
        Fetch demographics for all block groups in a state.

        This is a convenience method that fetches county by county.
        CA has 58 counties, AZ has 15 counties.

        Args:
            state_fips: 2-digit state FIPS code

        Returns:
            List of BlockGroupDemographics for all block groups in the state
        """
        # First, get list of counties in the state
        counties = self._get_state_counties(state_fips)
        logger.info("Found {} counties in state {}", len(counties), state_fips)

        all_block_groups: List[BlockGroupDemographics] = []

        for i, county_fips in enumerate(counties, 1):
            logger.info("Fetching block groups for county {} ({}/{})",
                       county_fips, i, len(counties))
            county_bgs = self.fetch_county_block_groups(state_fips, county_fips)
            all_block_groups.extend(county_bgs)

        logger.info("Total: {} block groups for state {}", len(all_block_groups), state_fips)
        return all_block_groups

    def _get_state_counties(self, state_fips: str) -> List[str]:
        """Get list of county FIPS codes for a state."""
        url = f"{self.BASE_URL}/{self.year}/acs/acs5"
        params = {
            "get": "NAME",
            "for": "county:*",
            "in": f"state:{state_fips}",
        }
        if self.api_key:
            params["key"] = self.api_key

        try:
            payload = self._request(url, params)
        except CensusError as exc:
            logger.error("Failed to get counties for state {}: {}", state_fips, exc)
            return []

        if len(payload) <= 1:
            return []

        header = payload[0]
        records = payload[1:]
        county_idx = header.index("county") if "county" in header else -1

        if county_idx == -1:
            return []

        return [record[county_idx] for record in records]
