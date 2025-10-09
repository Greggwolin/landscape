"""
Thin wrapper that maps canonical FHFA HPI identifiers to FRED series.
"""

from __future__ import annotations

from datetime import date
from typing import List, Optional

from loguru import logger

from .db import GeoRecord, SeriesMeta
from .fred_client import FredClient
from .normalize import NormalizedObservation

STATE_FIPS_TO_ABBR = {
    "01": "AL",
    "02": "AK",
    "04": "AZ",
    "05": "AR",
    "06": "CA",
    "08": "CO",
    "09": "CT",
    "10": "DE",
    "11": "DC",
    "12": "FL",
    "13": "GA",
    "15": "HI",
    "16": "ID",
    "17": "IL",
    "18": "IN",
    "19": "IA",
    "20": "KS",
    "21": "KY",
    "22": "LA",
    "23": "ME",
    "24": "MD",
    "25": "MA",
    "26": "MI",
    "27": "MN",
    "28": "MS",
    "29": "MO",
    "30": "MT",
    "31": "NE",
    "32": "NV",
    "33": "NH",
    "34": "NJ",
    "35": "NM",
    "36": "NY",
    "37": "NC",
    "38": "ND",
    "39": "OH",
    "40": "OK",
    "41": "OR",
    "42": "PA",
    "44": "RI",
    "45": "SC",
    "46": "SD",
    "47": "TN",
    "48": "TX",
    "49": "UT",
    "50": "VT",
    "51": "VA",
    "53": "WA",
    "54": "WV",
    "55": "WI",
    "56": "WY",
}


class FhfaClient:
    def __init__(self, fred_client: FredClient):
        self.fred = fred_client

    def _resolve_series_code(self, series: SeriesMeta, geo: GeoRecord) -> Optional[str]:
        # Use alias first if present
        code = series.provider_code("FRED")
        if code:
            return code

        if geo.geo_level == "US":
            if series.series_code.endswith("_SA"):
                return "USSTHPI"
            return "USSTHPI"

        if geo.geo_level == "STATE" and geo.state_fips:
            abbr = STATE_FIPS_TO_ABBR.get(geo.state_fips)
            if not abbr:
                return None
            suffix = "STHPI"
            if series.series_code.endswith("_SA"):
                return f"{abbr}{suffix}"
            return f"{abbr}{suffix}"

        if geo.geo_level == "MSA" and geo.cbsa_code:
            suffix = geo.cbsa_code
            if series.series_code.endswith("_NSA"):
                return f"ATNHPIUS{suffix}Q"
            if series.series_code.endswith("_SA"):
                return f"ATNHPIUS{suffix}Q"

        return None

    def fetch(
        self,
        series: SeriesMeta,
        geo: GeoRecord,
        start: date,
        end: date,
        frequency: Optional[str],
    ) -> List[NormalizedObservation]:
        provider_code = self._resolve_series_code(series, geo)
        if not provider_code:
            logger.warning(
                "No FHFA provider code mapping available for series {} geo {}",
                series.series_code,
                geo.geo_id,
            )
            return []

        observations = self.fred.fetch_series(
            series.series_code,
            provider_code,
            geo_id=geo.geo_id,
            geo_level=geo.geo_level,
            start=start,
            end=end,
            units=series.units,
            seasonal=series.seasonal,
            frequency=frequency,
        )
        return observations
