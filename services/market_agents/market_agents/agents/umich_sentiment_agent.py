"""
UMich Consumer Sentiment Agent.

Pulls three sentiment indices monthly from the University of Michigan
Surveys of Consumers (sca.isr.umich.edu):

  UMCSENT — Consumer Sentiment composite
  UMICC   — Current Economic Conditions
  UMICE   — Consumer Expectations

All three are US-national, monthly, NSA. Published by UMich directly;
FRED only redistributes the composite, which is why the agent goes to
the source.
"""

from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from loguru import logger
from market_ingest.geo import GeoTarget
from market_ingest.normalize import NormalizedObservation
from market_ingest.umich_client import UMichClient

from ..base_agent import BaseAgent
from ..config import AgentConfig

UMICH_SERIES = ("UMCSENT", "UMICC", "UMICE")


class UMichSentimentAgent(BaseAgent):
    """Pulls UMich consumer sentiment series (composite + two sub-indices)."""

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)
        self._client: Optional[UMichClient] = None
        self._cached_observations: Optional[List[NormalizedObservation]] = None

    @property
    def name(self) -> str:
        return "UMich Sentiment"

    def series_codes(self) -> List[str]:
        return list(UMICH_SERIES)

    @property
    def client(self) -> UMichClient:
        if self._client is None:
            self._client = UMichClient()
        return self._client

    def fetch_for_geo(
        self,
        targets: List[GeoTarget],
        series_meta: Dict,
        start: date,
        end: date,
    ) -> List[NormalizedObservation]:
        """
        UMich series are US-national. Date window is ignored — the CSV
        returns full history in one GET, and the upsert path is idempotent,
        so we persist every row every run (backfill + revision handling
        fall out naturally).
        """
        us_target = next((t for t in targets if t.geo_level == "US"), None)
        if us_target is None:
            return []

        if self._cached_observations is None:
            obs: List[NormalizedObservation] = []
            obs.extend(self.client.fetch_composite(series_code="UMCSENT"))
            obs.extend(self.client.fetch_components(icc_code="UMICC", ice_code="UMICE"))
            self._cached_observations = obs
            logger.info(
                "[UMich] Fetched {} observations from tbmics.csv + tbmiccice.csv",
                len(obs),
            )

        known_codes = {meta.series_code for meta in series_meta.values()}
        return [o for o in self._cached_observations if o.series_code in known_codes]

    def close(self):
        self._cached_observations = None
        super().close()


def run_standalone():
    """CLI entry: poetry run umich-agent"""
    agent = UMichSentimentAgent()
    agent.run_standalone()
