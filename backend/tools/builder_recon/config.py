import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class ReconConfig:
    target_market: str
    top_n: int = 20
    builders_filter: List[str] = field(default_factory=list)
    respect_robots_txt: bool = True
    request_delay_seconds: float = 1.5
    max_communities_per_builder: int = 20
    max_plans_per_builder: int = 10
    max_listings_per_builder: int = 20
    output_path: str = "backend/tools/builder_recon/top20_builder_recon_phx.json"

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "ReconConfig":
        return cls(
            target_market=str(payload.get("target_market", "")),
            top_n=int(payload.get("top_n", 20)),
            builders_filter=list(payload.get("builders_filter", [])),
            respect_robots_txt=bool(payload.get("respect_robots_txt", True)),
            request_delay_seconds=float(payload.get("request_delay_seconds", 1.5)),
            max_communities_per_builder=int(
                payload.get("max_communities_per_builder", 20)
            ),
            max_plans_per_builder=int(payload.get("max_plans_per_builder", 10)),
            max_listings_per_builder=int(payload.get("max_listings_per_builder", 20)),
            output_path=str(
                payload.get(
                    "output_path", "backend/tools/builder_recon/top20_builder_recon_phx.json"
                )
            ),
        )


def load_config(config_path: Optional[str]) -> ReconConfig:
    if config_path:
        payload = json.loads(Path(config_path).read_text())
    else:
        payload = json.loads(sys.stdin.read() or "{}")
    return ReconConfig.from_dict(payload)
