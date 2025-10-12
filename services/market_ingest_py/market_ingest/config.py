"""
Configuration primitives for the market ingestion engine.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, PostgresDsn, ValidationError, model_validator

DEFAULT_BUNDLES: Dict[str, List[str]] = {
    "macro_v1": [
        "CPIAUCSL",
        "CPIAUCNS",
        "PPIACO",
        "FEDFUNDS",
        "MORTGAGE30US",
        "MORTGAGE15US",
        "PAYEMS",
        "FHFA_HPI_US_SA",
        "FHFA_HPI_US_NSA",
        "SPCSUSHPISA",
        "SPCS20RSA",
        "SPCS20RNSA",
        "HSN1F",
        "HSN1FNSA",
        "MSPNHSUS",
        "MSPNHSUSNSA",
        "PERMIT_TOTAL",
        "PERMIT_1UNIT",
        "PERMIT_5PLUS",
        "ACS_POPULATION",
        "ACS_HOUSEHOLDS",
        "ACS_MEDIAN_HH_INC",
        "LAUS_STATE_UNRATE",
        "PERSONAL_INCOME_PC_STATE",
    ]
}


class NeonSettings(BaseModel):
    """Connection information for Neon/Postgres."""

    dsn: PostgresDsn = Field(alias="NEON_DB_URL")


class ProviderKeys(BaseModel):
    fred_api_key: Optional[str] = Field(default=None, alias="FRED_API_KEY")
    census_api_key: Optional[str] = Field(default=None, alias="CENSUS_API_KEY")
    bls_api_key: Optional[str] = Field(default=None, alias="BLS_API_KEY")


class Settings(BaseModel):
    """
    Global runtime configuration.
    """

    neon: NeonSettings
    providers: ProviderKeys
    default_bundle: str = Field(default="macro_v1")

    @model_validator(mode="after")
    def validate_bundle(self) -> "Settings":
        if self.default_bundle not in DEFAULT_BUNDLES:
            raise ValueError(
                f"default bundle '{self.default_bundle}' is not registered in DEFAULT_BUNDLES"
            )
        return self

    @property
    def database_url(self) -> str:
        return str(self.neon.dsn)

    def resolve_series_bundle(self, bundle_key: Optional[str]) -> List[str]:
        if bundle_key is None:
            bundle_key = self.default_bundle
        if bundle_key not in DEFAULT_BUNDLES:
            raise KeyError(f"Unknown bundle '{bundle_key}'")
        return DEFAULT_BUNDLES[bundle_key]


@lru_cache()
def get_settings() -> "Settings":
    import os
    from pathlib import Path

    # Load .env file if it exists
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    os.environ[key] = value

    env = dict(os.environ)

    # Build nested config from flat env vars
    if "NEON_DB_URL" not in env:
        raise RuntimeError("NEON_DB_URL environment variable is required")

    neon_cfg = {"NEON_DB_URL": env["NEON_DB_URL"]}

    provider_keys = {
        "FRED_API_KEY": env.get("FRED_API_KEY"),
        "CENSUS_API_KEY": env.get("CENSUS_API_KEY"),
        "BLS_API_KEY": env.get("BLS_API_KEY"),
    }

    config = {
        "neon": neon_cfg,
        "providers": provider_keys,
    }

    try:
        return Settings.model_validate(config)
    except ValidationError as exc:
        raise RuntimeError(f"Invalid ingestion configuration: {exc}") from exc
