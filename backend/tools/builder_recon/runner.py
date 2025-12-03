from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from . import adapters
from .analysis import intersection_dataset
from .config import ReconConfig
from .loader import load_builder_matrix, top_builders
from .schemas import BuilderRecon
from ..common import HttpClient


def run_recon(config: ReconConfig) -> Dict[str, Any]:
    matrix = load_builder_matrix()
    selected_builders = top_builders(matrix, config.top_n, config.builders_filter)
    recon_results: List[BuilderRecon] = []
    for builder in selected_builders:
        name = builder.get("builder_name", "")
        logging.info("Recon for builder: %s", name)
        if name.lower().startswith("lennar"):
            result = adapters.run_lennar_adapter(builder, config.__dict__)
        elif name.lower().startswith("meritage"):
            client = HttpClient(
                user_agent=f"LandscapeBuilderRecon/0.1 ({name})",
                request_delay_seconds=config.request_delay_seconds,
            )
            result = adapters.run_meritage_adapter(builder, config.__dict__, client)
            client.close()
        else:
            client = HttpClient(
                user_agent=f"LandscapeBuilderRecon/0.1 ({name})",
                request_delay_seconds=config.request_delay_seconds,
            )
            result = adapters.run_generic_adapter(builder, config.__dict__, client)
            client.close()
        recon_results.append(result)

    dataset = intersection_dataset(recon_results)
    report = {
        "market": matrix.get("market", config.target_market),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_matrix": "backend/tools/builder_matrix/top20_builders_phx.json",
        "recon_config": {
            "target_market": config.target_market,
            "top_n": config.top_n,
            "builders_filter": config.builders_filter,
            "respect_robots_txt": config.respect_robots_txt,
            "request_delay_seconds": config.request_delay_seconds,
            "max_communities_per_builder": config.max_communities_per_builder,
            "max_plans_per_builder": config.max_plans_per_builder,
            "max_listings_per_builder": config.max_listings_per_builder,
        },
        "builders": [result.__dict__ for result in recon_results],
        "intersection_dataset": dataset,
    }
    return report
