import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class LennarConfig:
    target_market: str
    entry_url: str
    max_communities: int
    max_plans_per_community: int
    max_listings_per_community: int
    user_agent: str
    respect_robots_txt: bool
    request_delay_seconds: float

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "LennarConfig":
        required = [
            "target_market",
            "entry_url",
            "max_communities",
            "max_plans_per_community",
            "max_listings_per_community",
            "user_agent",
            "respect_robots_txt",
            "request_delay_seconds",
        ]
        missing = [key for key in required if key not in payload]
        if missing:
            raise ValueError(f"Missing required config keys: {', '.join(missing)}")
        return cls(
            target_market=str(payload["target_market"]),
            entry_url=str(payload["entry_url"]),
            max_communities=int(payload["max_communities"]),
            max_plans_per_community=int(payload["max_plans_per_community"]),
            max_listings_per_community=int(payload["max_listings_per_community"]),
            user_agent=str(payload["user_agent"]),
            respect_robots_txt=bool(payload["respect_robots_txt"]),
            request_delay_seconds=float(payload["request_delay_seconds"]),
        )


def load_config(config_path: Optional[str]) -> LennarConfig:
    if config_path:
        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        payload = json.loads(path.read_text())
    else:
        payload = json.loads(sys.stdin.read())
    return LennarConfig.from_dict(payload)
