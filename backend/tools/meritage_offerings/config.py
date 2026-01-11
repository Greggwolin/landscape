import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class MeritageConfig:
    target_market: str
    entry_url: str
    max_communities: int
    user_agent: str
    respect_robots_txt: bool
    request_delay_seconds: float
    api_subscription_key: Optional[str] = None

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "MeritageConfig":
        required = [
            "target_market",
            "entry_url",
            "max_communities",
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
            user_agent=str(payload["user_agent"]),
            respect_robots_txt=bool(payload["respect_robots_txt"]),
            request_delay_seconds=float(payload["request_delay_seconds"]),
            api_subscription_key=payload.get("api_subscription_key"),
        )


def load_config(config_path: Optional[str]) -> MeritageConfig:
    """Load config from JSON file or stdin when path is omitted."""
    if config_path:
        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")
        payload = json.loads(path.read_text())
    else:
        payload = json.loads(sys.stdin.read())
    return MeritageConfig.from_dict(payload)
