import argparse
import json
import logging
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

from .analysis import build_summary
from .config import LennarConfig, load_config
from .sampler import LennarSampler
from .schemas import Community, Listing, Plan
from ..common import HttpClient, RobotsInfo, fetch_robots
from ..common.adapters import (
    to_unified_communities,
    to_unified_plans,
    to_unified_inventory,
)
from ..common.persistence import persist_lennar_unified


OUTPUT_MODE_SOURCE = "source"
OUTPUT_MODE_UNIFIED = "unified"


def setup_logging() -> None:
    logs_dir = Path("backend/tools/lennar_offerings/logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "lennar_offerings.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)],
    )


def build_source_report(
    config: LennarConfig,
    run_metadata: Dict[str, Any],
    communities: List[Community],
    plans: List[Plan],
    listings: List[Listing],
    http_errors: List[tuple],
) -> Dict[str, Any]:
    """Build the original source-shaped JSON output."""
    return {
        "source_system": "lennar",
        "target_market": config.target_market,
        "run_metadata": run_metadata,
        "communities": [community.__dict__ for community in communities],
        "plans": [plan.__dict__ for plan in plans],
        "listings": [listing.__dict__ for listing in listings],
        "summary": build_summary(communities, plans, listings, http_errors),
    }


def build_empty_report(
    config: LennarConfig,
    run_metadata: Dict[str, Any],
    output_mode: str,
) -> Dict[str, Any]:
    """Build empty report when crawl is skipped (e.g., robots.txt denial)."""
    base = {
        "source_system": "lennar",
        "target_market": config.target_market,
        "run_metadata": run_metadata,
    }

    if output_mode == OUTPUT_MODE_UNIFIED:
        base["unified"] = {
            "communities": [],
            "plans": [],
            "inventory": [],
        }
    else:
        base["communities"] = []
        base["plans"] = []
        base["listings"] = []
        base["summary"] = {
            "notes": "Crawl skipped because robots.txt disallows the entry URL or related paths."
        }

    return base


def main() -> None:
    parser_cli = argparse.ArgumentParser(description="Run Lennar offerings miner.")
    parser_cli.add_argument("--config-path", type=str, help="Path to config JSON.")
    parser_cli.add_argument(
        "--output-mode",
        type=str,
        choices=[OUTPUT_MODE_SOURCE, OUTPUT_MODE_UNIFIED],
        default=OUTPUT_MODE_SOURCE,
        help=(
            f"Output format: '{OUTPUT_MODE_SOURCE}' emits Lennar-native schema (default), "
            f"'{OUTPUT_MODE_UNIFIED}' emits canonical unified schema for cross-source aggregation."
        ),
    )
    parser_cli.add_argument(
        "--persist",
        action="store_true",
        help=(
            "Persist unified data to Neon PostgreSQL. Requires DATABASE_URL env var. "
            "Automatically enables unified output mode."
        ),
    )
    args = parser_cli.parse_args()

    # --persist implies unified mode
    if args.persist:
        args.output_mode = OUTPUT_MODE_UNIFIED

    try:
        setup_logging()
        config: LennarConfig = load_config(args.config_path)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to load config: {exc}", file=sys.stderr)
        sys.exit(1)

    run_started_at = datetime.now(timezone.utc)
    client = HttpClient(
        user_agent=config.user_agent, request_delay_seconds=config.request_delay_seconds
    )
    robots_info: RobotsInfo = fetch_robots(
        client, config.entry_url, [config.entry_url], config.user_agent
    )

    # Handle robots.txt denial
    if config.respect_robots_txt and not robots_info.allowed:
        run_finished_at = datetime.now(timezone.utc)
        run_metadata: Dict[str, Any] = {
            "analysis_version": "v1.0",
            "run_started_at": run_started_at.isoformat(),
            "run_finished_at": run_finished_at.isoformat(),
            "total_http_requests": client.request_count,
            "unique_communities_sampled": 0,
            "unique_plans_sampled": 0,
            "unique_listings_sampled": 0,
        }
        report = build_empty_report(config, run_metadata, args.output_mode)
        print(json.dumps(report, indent=2, cls=DateTimeEncoder))
        return

    # Run the crawl
    sampler = LennarSampler(config, client, robots_info)
    communities, plans, listings = sampler.crawl()
    run_finished_at = datetime.now(timezone.utc)

    run_metadata = {
        "analysis_version": "v1.0",
        "run_started_at": run_started_at.isoformat(),
        "run_finished_at": run_finished_at.isoformat(),
        "total_http_requests": client.request_count,
        "unique_communities_sampled": len(communities),
        "unique_plans_sampled": len(plans),
        "unique_listings_sampled": len(listings),
    }

    # Build report based on output mode
    if args.output_mode == OUTPUT_MODE_UNIFIED:
        # Transform to unified models
        unified_communities = to_unified_communities(
            communities, market_label=config.target_market
        )
        unified_plans = to_unified_plans(plans)
        unified_inventory = to_unified_inventory(listings)

        # Persist if requested
        if args.persist:
            try:
                persist_stats = persist_lennar_unified(
                    unified_communities, unified_plans, unified_inventory
                )
                run_metadata["persist_stats"] = persist_stats
                logging.info("Persisted to Neon: %s", persist_stats)
            except Exception as exc:  # noqa: BLE001
                logging.exception("Failed to persist to Neon: %s", exc)
                run_metadata["persist_error"] = str(exc)

        report = {
            "source_system": "lennar",
            "target_market": config.target_market,
            "run_metadata": run_metadata,
            "unified": {
                "communities": [asdict(c) for c in unified_communities],
                "plans": [asdict(p) for p in unified_plans],
                "inventory": [asdict(i) for i in unified_inventory],
            },
        }
    else:
        report = build_source_report(
            config, run_metadata, communities, plans, listings, sampler.http_errors
        )

    print(json.dumps(report, indent=2, cls=DateTimeEncoder))


if __name__ == "__main__":
    main()
