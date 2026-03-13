"""
Configuration for the market intelligence agent system.

Loads from environment variables / .env file.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional


@dataclass(frozen=True)
class MetroArea:
    """A metro area the agents monitor."""
    name: str
    city_label: str          # "Phoenix,AZ" format for geo resolver
    geo_ids: List[str] = field(default_factory=list)  # pre-resolved, filled at runtime


# Default metro areas to monitor
METRO_AREAS = [
    MetroArea(name="Phoenix", city_label="Phoenix,AZ"),
    MetroArea(name="Tucson", city_label="Tucson,AZ"),
    MetroArea(name="Los Angeles", city_label="Los Angeles,CA"),
]

# Series bundles per agent type
AGENT_BUNDLES: Dict[str, List[str]] = {
    # FRED agent pulls these macro series
    "fred_macro": [
        "CPIAUCSL",          # CPI All Urban, SA
        "CPIAUCNS",          # CPI All Urban, NSA
        "PPIACO",            # PPI All Commodities
        "FEDFUNDS",          # Fed Funds Rate
        "MORTGAGE30US",      # 30-Year Fixed Mortgage Rate
        "MORTGAGE15US",      # 15-Year Fixed Mortgage Rate
        "PAYEMS",            # Total Nonfarm Payrolls
        "USSTHPI",           # FHFA All-Transactions HPI (Q)
        "HPIPONM226N",       # FHFA Purchase-Only HPI NSA (M)
        "CSUSHPISA",         # Case-Shiller National HPI SA (M)
        "SPCS20RSA",         # Case-Shiller 20-City SA
        "SPCS20RNSA",        # Case-Shiller 20-City NSA
        "HSN1F",             # New Residential Sales (SA)
        "HSN1FNSA",          # New Residential Sales (NSA)
        "MSPNHSUS",          # Median New Home Sales Price (M)
        "EXHOSLUSM495S",     # Existing Home Sales (SA, M)
        "EXHOSLUSM495N",     # Existing Home Sales (NSA, M)
    ],
    # Census/ACS demographic series
    "census_demo": [
        "ACS_POPULATION",
        "ACS_HOUSEHOLDS",
        "ACS_MEDIAN_HH_INC",
        "ACS_COUNTY_POPULATION",
        "ACS_COUNTY_MEDIAN_HH_INC",
    ],
    # Building permits
    "permits": [
        "PERMIT_TOTAL",
        "PERMIT_1UNIT",
        "PERMIT_5PLUS",
    ],
    # Labor / employment
    "labor": [
        "LAUS_STATE_UNRATE",
        "PERSONAL_INCOME_PC_STATE",
    ],
}


@dataclass
class AgentConfig:
    """Runtime configuration for the agent system."""
    database_url: str
    fred_api_key: Optional[str] = None
    census_api_key: Optional[str] = None
    bls_api_key: Optional[str] = None

    # Discord webhooks
    discord_log_webhook: str = ""
    discord_digest_webhook: str = ""

    # Schedule
    start_hour: int = 18   # 6 PM
    end_hour: int = 6      # 6 AM

    # Metro areas
    metro_areas: List[MetroArea] = field(default_factory=lambda: list(METRO_AREAS))


def _load_env_file():
    """Load .env from the market_agents package root."""
    for candidate in [
        Path(__file__).parent.parent / ".env",
        Path(__file__).parent.parent.parent / "market_ingest_py" / ".env",
    ]:
        if candidate.exists():
            with open(candidate) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        value = value.strip('"').strip("'")
                        os.environ.setdefault(key, value)
            break


@lru_cache()
def get_config() -> AgentConfig:
    _load_env_file()

    db_url = os.environ.get("NEON_DB_URL")
    if not db_url:
        raise RuntimeError("NEON_DB_URL environment variable is required")

    return AgentConfig(
        database_url=db_url,
        fred_api_key=os.environ.get("FRED_API_KEY"),
        census_api_key=os.environ.get("CENSUS_API_KEY"),
        bls_api_key=os.environ.get("BLS_API_KEY"),
        discord_log_webhook=os.environ.get(
            "DISCORD_LOG_WEBHOOK",
            "https://discord.com/api/webhooks/1481800183061680315/ZTp4lrIsdiFU2aP_eruxUKCQ2lkv0pv8LBowqNwUM9ZIHJpQDd5EHqLi-0yDHgOsyipx"
        ),
        discord_digest_webhook=os.environ.get(
            "DISCORD_DIGEST_WEBHOOK",
            "https://discord.com/api/webhooks/1481800385046773911/OcliJpbaezSH4yhz_L3gyTGNVdo7-CzVG8PNmL1acZUzAhTF49gSdT9WEK9o8sFTrgC8"
        ),
    )
