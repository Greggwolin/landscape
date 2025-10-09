"""
Clients for Census ACS and Building Permits Survey datasets.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Dict, Iterable, List, Optional, Tuple

import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from .db import GeoRecord, SeriesMeta
from .normalize import NormalizedObservation, parse_decimal


class CensusError(RuntimeError):
    """Raised when the Census API request fails."""


ACS_SERIES_VARIABLES: Dict[str, str] = {
    "ACS_POPULATION": "B01001_001E",
    "ACS_HOUSEHOLDS": "B11001_001E",
    "ACS_MEDIAN_HH_INC": "B19013_001E",
    "ACS_STATE_POPULATION": "B01001_001E",
    "ACS_COUNTY_POPULATION": "B01001_001E",
}


BPS_SERIES_VARIABLES: Dict[str, str] = {
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
            "time": f"from {start.strftime('%Y-%m')}",
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
