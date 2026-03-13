"""
FRED Agent — "The Econ Guy"

Pulls macro-economic time series from the Federal Reserve Economic Data API:
  - CPI, PPI, Fed Funds rate
  - 30-yr and 15-yr mortgage rates
  - Home price indices (FHFA, Case-Shiller)
  - New home sales, median sale price, existing home sales
  - Nonfarm payrolls

Wraps the existing market_ingest.fred_client.FredClient.
"""

from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from loguru import logger
from market_ingest.db import GeoRecord
from market_ingest.fred_client import FredClient
from market_ingest.geo import GeoTarget
from market_ingest.normalize import NormalizedObservation

from ..base_agent import BaseAgent
from ..config import AGENT_BUNDLES, AgentConfig


class FredAgent(BaseAgent):
    """Overnight agent that fetches FRED macro series."""

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._fred_client: Optional[FredClient] = None

    @property
    def name(self) -> str:
        return "FRED"

    def series_codes(self) -> List[str]:
        return list(AGENT_BUNDLES["fred_macro"])

    @property
    def fred_client(self) -> FredClient:
        if self._fred_client is None:
            if not self.config.fred_api_key:
                raise RuntimeError("FRED_API_KEY is required for the FRED agent")
            self._fred_client = FredClient(self.config.fred_api_key)
        return self._fred_client

    def fetch_for_geo(
        self,
        targets: List[GeoTarget],
        series_meta: Dict,
        start: date,
        end: date,
    ) -> List[NormalizedObservation]:
        """
        Fetch all FRED macro series for each geo target in the hierarchy.

        Most FRED series are national-level (US), but the runner's coverage
        logic already handles matching series coverage_level to geo targets.
        We iterate targets × series and skip mismatches.
        """
        observations: List[NormalizedObservation] = []

        for target in targets:
            target_geo = self.db.get_geo(target.geo_id)

            for series_code, meta in series_meta.items():
                # Only fetch if this geo level is in the series coverage
                coverage_levels = set(meta.coverage_level.split("|"))
                if target.geo_level not in coverage_levels:
                    continue

                provider_code = meta.provider_code("FRED") or meta.series_code
                provider_code = self._interpolate(provider_code, target_geo)

                try:
                    batch = self.fred_client.fetch_series(
                        series_code=series_code,
                        provider_series_code=provider_code,
                        geo_id=target_geo.geo_id,
                        geo_level=target_geo.geo_level,
                        start=start,
                        end=end,
                        units=meta.units,
                        seasonal=meta.seasonal,
                        frequency=meta.frequency,
                    )
                    observations.extend(batch)
                except Exception as exc:
                    logger.warning(
                        "[FRED] Failed to fetch %s for %s: %s",
                        series_code, target.geo_id, exc,
                    )
                    # Continue with other series — don't let one failure kill the run

        return observations

    @staticmethod
    def _interpolate(template: str, geo: GeoRecord) -> str:
        """Replace geo placeholders in provider codes."""
        from market_ingest.geo_bootstrap import FIPS_TO_ABBR

        result = template
        if "{STATE_FIPS}" in result and geo.state_fips:
            result = result.replace("{STATE_FIPS}", geo.state_fips)
        if "{STATE_ABBR}" in result:
            abbr = FIPS_TO_ABBR.get(geo.state_fips or geo.geo_id, "")
            result = result.replace("{STATE_ABBR}", abbr)
        if "{COUNTY_FIPS}" in result and geo.county_fips:
            result = result.replace("{COUNTY_FIPS}", geo.county_fips)
        if "{CBSA_CODE}" in result and geo.cbsa_code:
            result = result.replace("{CBSA_CODE}", geo.cbsa_code)
        return result


# ── Standalone entry point ───────────────────────────────────────────

def run_standalone():
    """CLI entry: poetry run fred-agent"""
    agent = FredAgent()
    agent.run_standalone()
