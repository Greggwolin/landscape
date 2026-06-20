"""
Configuration and Environment Settings

Loads configuration from environment variables using pydantic-settings.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database
    database_url: str = Field(
        ...,
        description="PostgreSQL connection string (e.g., postgresql://user:pass@host/db)",
    )

    # Calculation defaults
    default_discount_rate: float = Field(
        0.10, description="Default discount rate for NPV (10%)", ge=0.0, le=1.0
    )
    default_exit_cap_rate: float = Field(
        0.065, description="Default exit cap rate (6.5%)", ge=0.0, le=1.0
    )
    default_vacancy_pct: float = Field(
        0.05, description="Default vacancy percentage (5%)", ge=0.0, le=1.0
    )
    default_credit_loss_pct: float = Field(
        0.02, description="Default credit loss percentage (2%)", ge=0.0, le=1.0
    )

    # IRR calculation settings
    irr_max_iterations: int = Field(100, description="Max iterations for IRR calculation", ge=10)
    irr_tolerance: float = Field(
        0.000001, description="Convergence tolerance for IRR", ge=0.0
    )

    # Monte Carlo settings
    mc_default_simulations: int = Field(
        10000, description="Default number of Monte Carlo simulations", ge=100
    )
    mc_random_seed: Optional[int] = Field(
        None, description="Random seed for reproducibility (None = random)"
    )

    # Logging
    log_level: str = Field("INFO", description="Logging level (DEBUG, INFO, WARNING, ERROR)")

    # API settings (optional - only needed for FastAPI microservice)
    api_host: str = Field("0.0.0.0", description="API host")
    api_port: int = Field(8001, description="API port", ge=1, le=65535)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """
    Get application settings singleton.

    Returns:
        Settings instance loaded from environment

    Example:
        >>> settings = get_settings()
        >>> print(settings.database_url)
        postgresql://...
    """
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings() -> None:
    """Reset settings singleton (mainly for testing)"""
    global _settings
    _settings = None
