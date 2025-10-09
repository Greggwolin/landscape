"""
Client for interacting with the FRED API.
"""

from __future__ import annotations

from datetime import date
from typing import Iterable, List, Optional

import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from .normalize import NormalizedObservation, build_revision_tag, parse_date, parse_decimal


class FredClient:
    BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

    # Map canonical series codes to their SA/NSA twin IDs when the provider uses
    # separate identifiers. The ingestion layer can use this to auto-pull both.
    SEASONAL_TWIN_LOOKUP = {
        "CPIAUCSL": "CPIAUCNS",
        "CPIAUCNS": "CPIAUCSL",
        "HSN1F": "HSN1FNSA",
        "HSN1FNSA": "HSN1F",
        "MSPNHSUS": "MSPNHSUSNSA",
        "MSPNHSUSNSA": "MSPNHSUS",
        "EXHOSLUSM495S": "EXHOSLUSM495SNSA",
        "EXHOSLUSM495SNSA": "EXHOSLUSM495S",
    }

    def __init__(self, api_key: str, session: Optional[requests.Session] = None):
        if not api_key:
            raise ValueError("FRED_API_KEY is required to access the FRED API")
        self.api_key = api_key
        self.session = session or requests.Session()

    def get_seasonal_pair(self, series_code: str) -> Optional[str]:
        return self.SEASONAL_TWIN_LOOKUP.get(series_code)

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=1, max=10))
    def _request(self, params: dict) -> dict:
        logger.debug("FRED request params={}", params)
        response = self.session.get(self.BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        payload = response.json()
        if "error_code" in payload:
            raise RuntimeError(f"FRED error {payload['error_code']}: {payload.get('error_message')}")
        return payload

    def fetch_series(
        self,
        series_code: str,
        provider_series_code: str,
        geo_id: str,
        geo_level: str,
        start: date,
        end: date,
        units: Optional[str],
        seasonal: Optional[str],
        frequency: Optional[str] = None,
    ) -> List[NormalizedObservation]:
        """
        Fetch observations for a single FRED series between two dates.
        """

        params = {
            "series_id": provider_series_code,
            "api_key": self.api_key,
            "file_type": "json",
            "observation_start": start.isoformat(),
            "observation_end": end.isoformat(),
        }
        if frequency:
            params["frequency"] = frequency

        payload = self._request(params)

        observations: List[NormalizedObservation] = []
        for record in payload.get("observations", []):
            observations.append(
                NormalizedObservation(
                    series_code=series_code,
                    geo_id=geo_id,
                    geo_level=geo_level,
                    date=parse_date(record["date"]),
                    value=parse_decimal(record.get("value")),
                    units=units or payload.get("units"),
                    seasonal=seasonal or payload.get("seasonal_adjustment_short"),
                    source="FRED",
                    revision_tag=build_revision_tag(record, ("realtime_start", "realtime_end")),
                )
            )

        logger.info(
            "FRED fetched {} rows for series {} ({}) between {} and {}",
            len(observations),
            series_code,
            provider_series_code,
            start,
            end,
        )
        return observations

    def fetch_series_with_twins(
        self,
        series_code: str,
        provider_series_code: str,
        geo_id: str,
        geo_level: str,
        start: date,
        end: date,
        units: Optional[str],
        seasonal: Optional[str],
        frequency: Optional[str],
        include_twins: bool,
    ) -> List[NormalizedObservation]:
        """
        Convenience helper to fetch both the requested series and its seasonal twin.
        """

        series_list: List[tuple[str, str, Optional[str]]] = [
            (series_code, provider_series_code, seasonal)
        ]

        if include_twins:
            twin = self.get_seasonal_pair(series_code)
            if twin:
                series_list.append((twin, twin, None))

        combined: List[NormalizedObservation] = []
        for canonical_code, provider_code, override_seasonal in series_list:
            combined.extend(
                self.fetch_series(
                    canonical_code,
                    provider_code,
                    geo_id=geo_id,
                    geo_level=geo_level,
                    start=start,
                    end=end,
                    units=units,
                    seasonal=override_seasonal or seasonal,
                    frequency=frequency,
                )
            )
        return combined
