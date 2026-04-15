"""
Client for University of Michigan Surveys of Consumers CSV downloads.

Pulls three monthly sentiment series directly from sca.isr.umich.edu:
  UMCSENT — Consumer Sentiment composite   (tbmics.csv    column ICS_ALL)
  UMICC   — Current Economic Conditions   (tbmiccice.csv column ICC)
  UMICE   — Consumer Expectations         (tbmiccice.csv column ICE)

CSVs are public, no auth. Pre-1978 rows are sparse (quarterly-ish); full monthly
cadence begins January 1978, so we filter to that start.
"""

from __future__ import annotations

import csv
import io
from datetime import date
from typing import Dict, List, Optional

import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from .normalize import NormalizedObservation, parse_decimal


UMICH_COMPOSITE_URL = "https://www.sca.isr.umich.edu/files/tbmics.csv"
UMICH_COMPONENTS_URL = "https://www.sca.isr.umich.edu/files/tbmiccice.csv"

MONTH_NUMBERS = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}

EARLIEST_YEAR = 1978


class UMichClient:
    def __init__(self, session: Optional[requests.Session] = None, timeout: int = 30):
        self.session = session or requests.Session()
        self.session.headers.update({"User-Agent": "landscape-market-agents/1.0"})
        self.timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _fetch_csv(self, url: str) -> str:
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.text

    def fetch_composite(
        self,
        series_code: str = "UMCSENT",
        geo_id: str = "US",
        geo_level: str = "US",
    ) -> List[NormalizedObservation]:
        text = self._fetch_csv(UMICH_COMPOSITE_URL)
        return self._parse_rows(text, {"ICS_ALL": series_code}, geo_id, geo_level)

    def fetch_components(
        self,
        icc_code: str = "UMICC",
        ice_code: str = "UMICE",
        geo_id: str = "US",
        geo_level: str = "US",
    ) -> List[NormalizedObservation]:
        text = self._fetch_csv(UMICH_COMPONENTS_URL)
        return self._parse_rows(text, {"ICC": icc_code, "ICE": ice_code}, geo_id, geo_level)

    def _parse_rows(
        self,
        csv_text: str,
        column_to_code: Dict[str, str],
        geo_id: str,
        geo_level: str,
    ) -> List[NormalizedObservation]:
        reader = csv.DictReader(io.StringIO(csv_text))
        obs: List[NormalizedObservation] = []
        skipped_old = 0
        for row in reader:
            try:
                year = int((row.get("YYYY") or "").strip())
            except ValueError:
                continue
            if year < EARLIEST_YEAR:
                skipped_old += 1
                continue
            month_name = (row.get("Month") or "").strip().lower()
            month = MONTH_NUMBERS.get(month_name)
            if not month:
                logger.warning("UMich: unknown month '{}' in row {} — skipping", row.get("Month"), row)
                continue
            obs_date = date(year, month, 1)

            for col, code in column_to_code.items():
                raw = (row.get(col) or "").strip()
                if not raw:
                    continue
                try:
                    value = parse_decimal(raw)
                except ValueError:
                    logger.warning("UMich: bad value '{}' for {} at {} — skipping", raw, code, obs_date)
                    continue
                if value is None:
                    continue
                obs.append(
                    NormalizedObservation(
                        series_code=code,
                        geo_id=geo_id,
                        geo_level=geo_level,
                        date=obs_date,
                        value=value,
                        units="Index 1966:Q1=100",
                        seasonal="NSA",
                        source="UMICH",
                        revision_tag=None,
                    )
                )
        logger.info(
            "UMich parse: {} obs across {} series; {} pre-{} rows skipped",
            len(obs), len(column_to_code), skipped_old, EARLIEST_YEAR,
        )
        return obs
