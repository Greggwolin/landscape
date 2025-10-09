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
    import os, json
    env = dict(os.environ)
    # Allow JSON strings in env for nested fields
    for k in ("neon", "providers"):
        if k in env and isinstance(env[k], str):
            try:
                env[k] = json.loads(env[k])
            except Exception:
                pass
    try:
        return Settings.model_validate(env)
    except Exception as exc:
        raise RuntimeError(f"Invalid ingestion configuration: {exc}") from exc

