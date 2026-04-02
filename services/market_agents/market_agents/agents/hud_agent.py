"""
HUD Fair Market Rents Agent — annual FMR and income limit data.

Fetches Fair Market Rents (FMR) and Income Limits from HUD's public API.
FMR is the rent floor benchmark for affordable housing underwriting
and LIHTC analysis. Income limits determine tenant eligibility.

Source: https://www.huduser.gov/hudapi/public/
Auth: HUD_API_TOKEN (free registration)
Frequency: Annual (published each fall for upcoming fiscal year)
Geography: County, MSA, ZIP (Small Area FMR)
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

import requests
from loguru import logger
from market_ingest.db import GeoRecord
from market_ingest.geo import GeoTarget
from market_ingest.normalize import NormalizedObservation, parse_decimal

from ..base_agent import BaseAgent
from ..config import AgentConfig


# HUD API base
HUD_API_BASE = "https://www.huduser.gov/hudapi/public"

# Series codes this agent publishes
HUD_SERIES = {
    "HUD_FMR_0BR": "Fair Market Rent, Efficiency (0BR)",
    "HUD_FMR_1BR": "Fair Market Rent, 1 Bedroom",
    "HUD_FMR_2BR": "Fair Market Rent, 2 Bedroom",
    "HUD_FMR_3BR": "Fair Market Rent, 3 Bedroom",
    "HUD_FMR_4BR": "Fair Market Rent, 4 Bedroom",
    "HUD_IL_VLI_4P": "Very Low Income Limit, 4-person family",
    "HUD_IL_LI_4P": "Low Income Limit, 4-person family",
    "HUD_IL_MOD_4P": "Moderate Income Limit, 4-person family (80% AMI proxy)",
}

SERIES_CODES = list(HUD_SERIES.keys())

# Target geographies (FIPS entity IDs for HUD API)
# Format: state FIPS + county FIPS (5 digits) or CBSA code
HUD_TARGET_COUNTIES = [
    {"entity_id": "METRO38060M38060", "name": "Phoenix-Mesa-Chandler MSA", "geo_level": "MSA", "geo_id": "MSA38060"},
    {"entity_id": "0401300000", "name": "Maricopa County", "geo_level": "COUNTY", "geo_id": "COUNTY04013"},
    {"entity_id": "0401900000", "name": "Pima County (Tucson)", "geo_level": "COUNTY", "geo_id": "COUNTY04019"},
    {"entity_id": "0603700000", "name": "Los Angeles County", "geo_level": "COUNTY", "geo_id": "COUNTY06037"},
]

# Fiscal years to fetch (HUD publishes FY data each fall)
# FY2026 data covers Oct 2025 - Sep 2026
FMR_FISCAL_YEARS = [2024, 2025, 2026]


class HudAgent(BaseAgent):
    """
    Fetches Fair Market Rents and Income Limits from HUD API.

    Annual data, but critical for multifamily underwriting:
    - FMR sets rent benchmarks for Section 8 / LIHTC
    - Income limits determine tenant eligibility tiers
    """

    def __init__(self, config: Optional[AgentConfig] = None):
        super().__init__(config)

    @property
    def name(self) -> str:
        return "HUD"

    def series_codes(self) -> List[str]:
        return SERIES_CODES

    def fetch_for_geo(
        self,
        targets: List[GeoTarget],
        series_meta: Dict,
        start: date,
        end: date,
    ) -> List[NormalizedObservation]:
        """
        Fetch FMR and income limit data for target geographies.
        """
        if not self.config.hud_api_token:
            logger.warning("[HUD] HUD_API_TOKEN not set — skipping")
            return []

        observations: List[NormalizedObservation] = []

        headers = {
            "Authorization": f"Bearer {self.config.hud_api_token}",
            "User-Agent": "Landscape-DataHarvester/1.0",
        }

        for target_geo in HUD_TARGET_COUNTIES:
            for fy in FMR_FISCAL_YEARS:
                # FMR data
                try:
                    fmr_obs = self._fetch_fmr(
                        entity_id=target_geo["entity_id"],
                        fiscal_year=fy,
                        geo_id=target_geo["geo_id"],
                        geo_level=target_geo["geo_level"],
                        geo_name=target_geo["name"],
                        series_meta=series_meta,
                        headers=headers,
                    )
                    observations.extend(fmr_obs)
                except Exception as exc:
                    logger.warning(
                        "[HUD] FMR failed for %s/FY%d: %s",
                        target_geo["name"], fy, exc,
                    )

                # Income limits
                try:
                    il_obs = self._fetch_income_limits(
                        entity_id=target_geo["entity_id"],
                        fiscal_year=fy,
                        geo_id=target_geo["geo_id"],
                        geo_level=target_geo["geo_level"],
                        geo_name=target_geo["name"],
                        series_meta=series_meta,
                        headers=headers,
                    )
                    observations.extend(il_obs)
                except Exception as exc:
                    logger.warning(
                        "[HUD] Income limits failed for %s/FY%d: %s",
                        target_geo["name"], fy, exc,
                    )

        return observations

    def _fetch_fmr(
        self,
        entity_id: str,
        fiscal_year: int,
        geo_id: str,
        geo_level: str,
        geo_name: str,
        series_meta: Dict,
        headers: Dict,
    ) -> List[NormalizedObservation]:
        """Fetch Fair Market Rent data for a single geography and fiscal year."""
        url = f"{HUD_API_BASE}/fmr/data/{entity_id}"
        params = {"year": fiscal_year}

        resp = requests.get(url, params=params, headers=headers, timeout=30)
        if resp.status_code == 404:
            logger.debug("[HUD] No FMR for %s/FY%d", geo_name, fiscal_year)
            return []
        resp.raise_for_status()

        data = resp.json()
        if not data or "data" not in data:
            return []

        fmr_data = data["data"]
        observations = []

        # FMR publication date is typically Oct 1 of the fiscal year - 1
        obs_date = date(fiscal_year - 1, 10, 1)

        # Extract FMR by bedroom count
        fmr_fields = {
            "Efficiency": "HUD_FMR_0BR",
            "One-Bedroom": "HUD_FMR_1BR",
            "Two-Bedroom": "HUD_FMR_2BR",
            "Three-Bedroom": "HUD_FMR_3BR",
            "Four-Bedroom": "HUD_FMR_4BR",
            # Alternate field names in HUD API
            "basicdata.Efficiency": "HUD_FMR_0BR",
            "basicdata.One-Bedroom": "HUD_FMR_1BR",
            "basicdata.Two-Bedroom": "HUD_FMR_2BR",
            "basicdata.Three-Bedroom": "HUD_FMR_3BR",
            "basicdata.Four-Bedroom": "HUD_FMR_4BR",
        }

        # Handle both nested and flat response formats
        basic = fmr_data.get("basicdata", fmr_data)
        if isinstance(basic, dict):
            for field_name, series_code in fmr_fields.items():
                if series_code not in series_meta:
                    continue

                # Try both dotted and direct field names
                clean_name = field_name.replace("basicdata.", "")
                raw_value = basic.get(clean_name) or basic.get(field_name)

                if raw_value is not None:
                    value = parse_decimal(str(raw_value))
                    if value is not None and value > 0:
                        observations.append(NormalizedObservation(
                            series_code=series_code,
                            geo_id=geo_id,
                            geo_level=geo_level,
                            date=obs_date,
                            value=value,
                            units="usd_monthly",
                            seasonal=None,
                            source="HUD",
                            revision_tag=f"fmr:fy{fiscal_year}",
                            coverage_note=geo_name,
                        ))

        logger.debug(
            "[HUD] FMR %s/FY%d: %d observations",
            geo_name, fiscal_year, len(observations),
        )
        return observations

    def _fetch_income_limits(
        self,
        entity_id: str,
        fiscal_year: int,
        geo_id: str,
        geo_level: str,
        geo_name: str,
        series_meta: Dict,
        headers: Dict,
    ) -> List[NormalizedObservation]:
        """Fetch income limits for a single geography and fiscal year."""
        url = f"{HUD_API_BASE}/il/data/{entity_id}"
        params = {"year": fiscal_year}

        resp = requests.get(url, params=params, headers=headers, timeout=30)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()

        data = resp.json()
        if not data or "data" not in data:
            return []

        il_data = data["data"]
        observations = []
        obs_date = date(fiscal_year - 1, 10, 1)

        # Income limit fields — 4-person household (standard reference)
        # HUD returns arrays indexed by family size (1-8 persons)
        # Index 3 = 4-person family
        il_mappings = {
            "very_low": "HUD_IL_VLI_4P",    # 50% AMI
            "low": "HUD_IL_LI_4P",            # 80% AMI
        }

        basic = il_data if isinstance(il_data, dict) else {}

        for limit_type, series_code in il_mappings.items():
            if series_code not in series_meta:
                continue

            # Try common field patterns in HUD response
            field_names = [
                f"{limit_type}_income",
                f"il_{limit_type}",
                f"{limit_type}",
                f"median_income",  # For reference
            ]

            for field_name in field_names:
                raw = basic.get(field_name)
                if raw is None:
                    continue

                # If array (by family size), grab 4-person (index 3)
                if isinstance(raw, list) and len(raw) >= 4:
                    value = parse_decimal(str(raw[3]))
                elif isinstance(raw, (int, float, str)):
                    value = parse_decimal(str(raw))
                else:
                    continue

                if value is not None and value > 0:
                    observations.append(NormalizedObservation(
                        series_code=series_code,
                        geo_id=geo_id,
                        geo_level=geo_level,
                        date=obs_date,
                        value=value,
                        units="usd_annual",
                        seasonal=None,
                        source="HUD",
                        revision_tag=f"il:fy{fiscal_year}",
                        coverage_note=f"{geo_name}, 4-person household",
                    ))
                    break  # Found this limit type, move on

        logger.debug(
            "[HUD] IL %s/FY%d: %d observations",
            geo_name, fiscal_year, len(observations),
        )
        return observations


# ── Standalone entry point ───────────────────────────────────────────

def run_standalone():
    """CLI entry: python -m market_agents.agents.hud_agent"""
    agent = HudAgent()
    agent.run_standalone()


if __name__ == "__main__":
    run_standalone()
