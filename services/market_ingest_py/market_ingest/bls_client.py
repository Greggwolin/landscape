from __future__ import annotations
""
"Client for Bureau of Labor Statistics LAUS series."
""

from datetime import date
from typing import Dict, List, Optional

import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from .normalize import NormalizedObservation, parse_decimal


class BlsError(RuntimeError):
    pass


class BlsClient:
    BASE_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

    def __init__(self, api_key: Optional[str], session: Optional[requests.Session] = None):
        self.api_key = api_key
        self.session = session or requests.Session()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def _post(self, payload: Dict[str, object]) -> Dict[str, object]:
        logger.debug("BLS request payload={}", payload)
        response = self.session.post(self.BASE_URL, json=payload, timeout=30)
        if response.status_code >= 400:
            raise BlsError(f"BLS API error {response.status_code}: {response.text}")
        data = response.json()
        if data.get("status") != "REQUEST_SUCCEEDED":
            raise BlsError(f"BLS API error: {data.get('message')}")
        return data

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
        payload: Dict[str, object] = {
            "seriesid": [provider_series_code],
            "startyear": start.year,
            "endyear": end.year,
        }
        if self.api_key:
            payload["registrationkey"] = self.api_key

        data = self._post(payload)
        series_list = data.get("Results", {}).get("series", [])
        if not series_list:
            logger.warning("BLS returned no series data for {}", provider_series_code)
            return []

        observations: List[NormalizedObservation] = []
        series_data = series_list[0]
        for item in series_data.get("data", []):
            period_str = item["period"]
            if not period_str.startswith("M"):
                continue
            month = int(period_str[1:])
            day = date(int(item["year"]), month, 1)
            observations.append(
                NormalizedObservation(
                    series_code=series_code,
                    geo_id=geo_id,
                    geo_level=geo_level,
                    date=day,
                    value=parse_decimal(item.get("value")),
                    units=units,
                    seasonal=seasonal,
                    source="BLS",
                    revision_tag=f"laus:{item.get('footnotes', [])}",
                )
            )
        return observations
