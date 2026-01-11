"""Configuration for Redfin ingestion tool."""

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Literal, Optional


PropertyType = Literal["house", "condo", "townhouse", "attached", "all"]


@dataclass
class RedfinConfig:
    """Configuration for Redfin sold comps ingestion.

    Attributes:
        target_market: Human-readable market label (e.g., "Phoenix, AZ").
        center_lat: Center latitude for search radius.
        center_lng: Center longitude for search radius.
        radius_miles: Search radius in miles from center point.
        sold_within_days: Look back window for sold properties.
        min_year_built: Minimum year built filter (optional).
        max_year_built: Maximum year built filter (optional).
        property_type: Property type filter.
        max_results: Maximum results to fetch from Redfin.
        user_agent: User-Agent string for HTTP requests.
        request_delay_seconds: Delay between requests (for rate limiting).
        timeout_seconds: HTTP request timeout.
    """

    target_market: str
    center_lat: float
    center_lng: float
    radius_miles: float
    sold_within_days: int
    min_year_built: Optional[int]
    max_year_built: Optional[int]
    property_type: PropertyType
    max_results: int
    user_agent: str
    request_delay_seconds: float
    timeout_seconds: float

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "RedfinConfig":
        """Create config from dictionary.

        Args:
            payload: Configuration dictionary.

        Returns:
            RedfinConfig instance.

        Raises:
            ValueError: If required keys are missing.
        """
        required = ["target_market", "center_lat", "center_lng"]
        missing = [key for key in required if key not in payload]
        if missing:
            raise ValueError(f"Missing required config keys: {', '.join(missing)}")

        return cls(
            target_market=str(payload["target_market"]),
            center_lat=float(payload["center_lat"]),
            center_lng=float(payload["center_lng"]),
            radius_miles=float(payload.get("radius_miles", 5.0)),
            sold_within_days=int(payload.get("sold_within_days", 180)),
            min_year_built=int(payload["min_year_built"]) if payload.get("min_year_built") else None,
            max_year_built=int(payload["max_year_built"]) if payload.get("max_year_built") else None,
            property_type=payload.get("property_type", "house"),
            max_results=int(payload.get("max_results", 350)),
            user_agent=str(payload.get(
                "user_agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            )),
            request_delay_seconds=float(payload.get("request_delay_seconds", 1.5)),
            timeout_seconds=float(payload.get("timeout_seconds", 15.0)),
        )


def load_config(config_path: Optional[str]) -> RedfinConfig:
    """Load config from file path or stdin.

    Args:
        config_path: Path to JSON config file, or None to read from stdin.

    Returns:
        RedfinConfig instance.

    Raises:
        FileNotFoundError: If config file does not exist.
        ValueError: If config is invalid.
    """
    if config_path:
        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        payload = json.loads(path.read_text())
    else:
        payload = json.loads(sys.stdin.read())
    return RedfinConfig.from_dict(payload)
