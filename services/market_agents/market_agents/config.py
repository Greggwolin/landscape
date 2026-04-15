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
    # Treasury yields — for spread analysis and cap rate decomposition
    "fred_treasury": [
        "DGS2",              # 2-Year Treasury Constant Maturity Rate (D)
        "DGS10",             # 10-Year Treasury Constant Maturity Rate (D)
        "DGS30",             # 30-Year Treasury Constant Maturity Rate (D)
        "T10Y2Y",            # 10Y minus 2Y Treasury Spread (D)
    ],
    # Lending / credit conditions — SLOOS via FRED (quarterly)
    "fred_lending": [
        "SOFR",              # Secured Overnight Financing Rate (D)
        "DRTSCILM",          # Net % banks tightening CRE loan standards (Q, SLOOS)
        "DRTSCIS",           # Net % banks tightening construction/land dev standards (Q, SLOOS)
        "DRTSCLCC",          # Net % banks reporting stronger CRE loan demand (Q, SLOOS)
    ],
    # GDP (consumer sentiment series are pulled directly from UMich, not FRED)
    "fred_gdp": [
        "GDPC1",             # Real GDP (Q)
        "A191RL1Q225SBEA",   # Real GDP Growth Rate (Q)
    ],
    # UMich Surveys of Consumers (pulled from sca.isr.umich.edu, not FRED)
    "umich_sentiment": [
        "UMCSENT",           # Consumer Sentiment composite (M)
        "UMICC",             # Current Economic Conditions (M)
        "UMICE",             # Consumer Expectations (M)
    ],
    # Housing supply pipeline (national, via FRED)
    "fred_housing_supply": [
        "PERMIT",            # New Housing Units Authorized by Permits (M, SA)
        "PERMITNSA",         # Same, NSA
        "PERMIT1",           # Single-family permits (M, SA)
        "PERMIT5",           # 5+ unit permits (M, SA) — multifamily proxy
        "HOUST",             # Housing Starts (M, SA)
        "COMPUTSA",          # Housing Units Completed (M, SA)
    ],
    # Census/ACS demographic series
    "census_demo": [
        "ACS_POPULATION",
        "ACS_HOUSEHOLDS",
        "ACS_MEDIAN_HH_INC",
        "ACS_COUNTY_POPULATION",
        "ACS_COUNTY_MEDIAN_HH_INC",
    ],
    # Building permits (via Census BPS API — place-level)
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

# Phoenix metro cities for place-level Census BPS permit tracking
PHOENIX_METRO_PLACES = [
    {"name": "Phoenix", "place_fips": "55000", "state_fips": "04"},
    {"name": "Peoria", "place_fips": "54050", "state_fips": "04"},
    {"name": "Glendale", "place_fips": "27400", "state_fips": "04"},
    {"name": "Surprise", "place_fips": "71510", "state_fips": "04"},
    {"name": "Buckeye", "place_fips": "07940", "state_fips": "04"},
    {"name": "Goodyear", "place_fips": "28380", "state_fips": "04"},
    {"name": "Avondale", "place_fips": "04720", "state_fips": "04"},
    {"name": "Chandler", "place_fips": "12000", "state_fips": "04"},
    {"name": "Gilbert", "place_fips": "27820", "state_fips": "04"},
    {"name": "Mesa", "place_fips": "46000", "state_fips": "04"},
    {"name": "Scottsdale", "place_fips": "65000", "state_fips": "04"},
    {"name": "Tempe", "place_fips": "73000", "state_fips": "04"},
    {"name": "Queen Creek", "place_fips": "57140", "state_fips": "04"},
    {"name": "Maricopa", "place_fips": "44410", "state_fips": "04"},
    {"name": "Casa Grande", "place_fips": "10530", "state_fips": "04"},
]


@dataclass
class AgentConfig:
    """Runtime configuration for the agent system."""
    database_url: str
    fred_api_key: Optional[str] = None
    census_api_key: Optional[str] = None
    bls_api_key: Optional[str] = None

    # ULI credentials (member login for Knowledge Finder)
    uli_email: Optional[str] = None
    uli_password: Optional[str] = None

    # HUD API
    hud_api_token: Optional[str] = None

    # Time-series agent toggles
    census_bps_enabled: bool = True
    hud_enabled: bool = True

    # Research agent toggles
    uli_harvest_enabled: bool = True
    crefc_harvest_enabled: bool = True
    mba_harvest_enabled: bool = True
    kbra_harvest_enabled: bool = True
    trepp_harvest_enabled: bool = True
    brokerage_harvest_enabled: bool = True
    construction_cost_harvest_enabled: bool = True
    naiop_harvest_enabled: bool = True

    # PDF storage paths
    uli_pdf_storage_path: str = "data/uli/pdfs"
    crefc_pdf_storage_path: str = "data/crefc/pdfs"
    brokerage_pdf_storage_path: str = "data/brokerage/pdfs"

    # Discord webhooks
    discord_log_webhook: str = ""
    discord_digest_webhook: str = ""

    # Schedule
    start_hour: int = 18   # 6 PM — existing FRED agents
    research_hour: int = 5  # 5 AM — ULI/CREFC agents (off-peak)
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
        # ULI credentials
        uli_email=os.environ.get("ULI_EMAIL"),
        uli_password=os.environ.get("ULI_PASSWORD"),
        # Research agent toggles
        uli_harvest_enabled=os.environ.get("ULI_HARVEST_ENABLED", "true").lower() == "true",
        crefc_harvest_enabled=os.environ.get("CREFC_HARVEST_ENABLED", "true").lower() == "true",
        # HUD API
        hud_api_token=os.environ.get("HUD_API_TOKEN"),
        # Time-series agent toggles
        census_bps_enabled=os.environ.get("CENSUS_BPS_ENABLED", "true").lower() == "true",
        hud_enabled=os.environ.get("HUD_ENABLED", "true").lower() == "true",
        # Research agent toggles (Track 3)
        mba_harvest_enabled=os.environ.get("MBA_HARVEST_ENABLED", "true").lower() == "true",
        kbra_harvest_enabled=os.environ.get("KBRA_HARVEST_ENABLED", "true").lower() == "true",
        trepp_harvest_enabled=os.environ.get("TREPP_HARVEST_ENABLED", "true").lower() == "true",
        brokerage_harvest_enabled=os.environ.get("BROKERAGE_HARVEST_ENABLED", "true").lower() == "true",
        construction_cost_harvest_enabled=os.environ.get("CONSTRUCTION_COST_HARVEST_ENABLED", "true").lower() == "true",
        naiop_harvest_enabled=os.environ.get("NAIOP_HARVEST_ENABLED", "true").lower() == "true",
        # PDF storage
        uli_pdf_storage_path=os.environ.get("ULI_PDF_STORAGE_PATH", "data/uli/pdfs"),
        crefc_pdf_storage_path=os.environ.get("CREFC_PDF_STORAGE_PATH", "data/crefc/pdfs"),
        brokerage_pdf_storage_path=os.environ.get("BROKERAGE_PDF_STORAGE_PATH", "data/brokerage/pdfs"),
        discord_log_webhook=os.environ.get(
            "DISCORD_LOG_WEBHOOK",
            "https://discord.com/api/webhooks/1481800183061680315/ZTp4lrIsdiFU2aP_eruxUKCQ2lkv0pv8LBowqNwUM9ZIHJpQDd5EHqLi-0yDHgOsyipx"
        ),
        discord_digest_webhook=os.environ.get(
            "DISCORD_DIGEST_WEBHOOK",
            "https://discord.com/api/webhooks/1481800385046773911/OcliJpbaezSH4yhz_L3gyTGNVdo7-CzVG8PNmL1acZUzAhTF49gSdT9WEK9o8sFTrgC8"
        ),
    )
