from __future__ import annotations
""
"Client for Bureau of Labor Statistics LAUS series."
""

from datetime import date
from typing import Dict, List, Optional

import requests
from loguru import logger
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

from .config import redact_params
from .normalize import NormalizedObservation, parse_decimal


class BlsError(RuntimeError):
    pass


class BlsQuotaError(BlsError):
    """Daily request allowance used up. Retrying cannot help until tomorrow."""


class BlsClient:
    BASE_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

    def __init__(self, api_key: Optional[str], session: Optional[requests.Session] = None):
        self.api_key = api_key
        self.session = session or requests.Session()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8),
           retry=retry_if_not_exception_type(BlsQuotaError), reraise=True)
    def _post(self, payload: Dict[str, object]) -> Dict[str, object]:
        logger.debug("BLS request payload={}", redact_params(payload))
        response = self.session.post(self.BASE_URL, json=payload, timeout=30)
        if response.status_code >= 400:
            raise BlsError(f"BLS API error {response.status_code}: {response.text}")
        data = response.json()
        if data.get("status") != "REQUEST_SUCCEEDED":
            message = " ".join(data.get("message") or [])
            if "threshold" in message.lower():
                raise BlsQuotaError(f"BLS daily allowance reached: {message}")
            raise BlsError(f"BLS API error: {message}")
        return data

    # BLS allows 25 series per request without a key and 50 with one; 25 keeps the
    # unkeyed daily allowance (25 requests) enough for ~600 series.
    BATCH = 25

    def fetch_many(
        self,
        requests_: List[tuple],
        start: date,
        end: date,
    ) -> Dict[str, List[NormalizedObservation]]:
        """
        Fetch many series in as few requests as BLS allows.
        ``requests_`` is a list of (series_code, provider_code, geo_id, geo_level, units, seasonal).
        Returns {provider_code: [observations]} -- an empty list for a code BLS does not carry.
        """
        out: Dict[str, List[NormalizedObservation]] = {}
        by_code = {r[1]: r for r in requests_}
        codes = list(by_code)
        for i in range(0, len(codes), self.BATCH):
            chunk = codes[i:i + self.BATCH]
            payload: Dict[str, object] = {"seriesid": chunk, "startyear": start.year, "endyear": end.year}
            if self.api_key:
                payload["registrationkey"] = self.api_key
            data = self._post(payload)
            for msg in data.get("message") or []:
                logger.warning("BLS: {}", msg)
            for series_data in data.get("Results", {}).get("series", []):
                code = series_data.get("seriesID")
                series_code, _, geo_id, geo_level, units, seasonal = by_code.get(code, (None,) * 6)
                if series_code is None:
                    continue
                out[code] = self._to_observations(series_data, series_code, geo_id, geo_level, units, seasonal)
        for code in codes:
            out.setdefault(code, [])
        return out

    def _to_observations(self, series_data, series_code, geo_id, geo_level, units, seasonal):
        observations: List[NormalizedObservation] = []
        for item in series_data.get("data", []):
            period_str = item["period"]
            if not period_str.startswith("M") or period_str == "M13":
                continue  # M13 = annual average
            raw = (item.get("value") or "").strip()
            try:
                value = parse_decimal(raw)
            except (ValueError, ArithmeticError):
                # BLS publishes '-' for a month it did not collect (e.g. Oct 2025, during the
                # federal shutdown). That month is absent, not zero, and must not sink the batch.
                continue
            observations.append(
                NormalizedObservation(
                    series_code=series_code,
                    geo_id=geo_id,
                    geo_level=geo_level,
                    date=date(int(item["year"]), int(period_str[1:]), 1),
                    value=value,
                    units=units,
                    seasonal=seasonal,
                    source="BLS",
                    revision_tag="bls:" + ",".join(f.get("code", "") for f in item.get("footnotes", []) if f.get("code")),
                )
            )
        return observations

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
