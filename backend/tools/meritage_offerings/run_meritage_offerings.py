import argparse
import json
import logging
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from backend.tools.common import HttpClient, RobotsInfo, fetch_robots
from backend.tools.common.adapters.meritage_adapter import (
    to_unified_communities as meritage_to_unified_communities,
)

from .config import MeritageConfig, load_config
from .sampler import MeritageSampler
from .schemas import MeritageCommunity


OUTPUT_MODE_SOURCE = "source"
OUTPUT_MODE_UNIFIED = "unified"


class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def setup_logging() -> None:
    logs_dir = Path("backend/tools/meritage_offerings/logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "meritage_offerings.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)],
    )


def build_source_report(
    config: MeritageConfig,
    run_metadata: Dict[str, Any],
    communities: List[MeritageCommunity],
    notes: str,
) -> Dict[str, Any]:
    return {
        "source_system": "meritage",
        "target_market": config.target_market,
        "run_metadata": run_metadata,
        "communities": [community.__dict__ for community in communities],
        "summary": {"notes": notes},
    }


def build_empty_report(
    config: MeritageConfig,
    run_metadata: Dict[str, Any],
    output_mode: str,
    notes: str,
) -> Dict[str, Any]:
    base = {
        "source_system": "meritage",
        "target_market": config.target_market,
        "run_metadata": run_metadata,
    }
    if output_mode == OUTPUT_MODE_UNIFIED:
        base["unified"] = {"communities": []}
    else:
        base["communities"] = []
        base["summary"] = {"notes": notes}
    return base


def main() -> None:
    parser_cli = argparse.ArgumentParser(description="Run Meritage offerings ingestion.")
    parser_cli.add_argument("--config-path", type=str, help="Path to config JSON.")
    parser_cli.add_argument(
        "--output-mode",
        type=str,
        choices=[OUTPUT_MODE_SOURCE, OUTPUT_MODE_UNIFIED],
        default=OUTPUT_MODE_SOURCE,
        help="Output format (source | unified).",
    )
    parser_cli.add_argument(
        "--persist",
        action="store_true",
        help="Persist unified data to Neon (requires DATABASE_URL). Implies unified output.",
    )
    args = parser_cli.parse_args()

    if args.persist:
        args.output_mode = OUTPUT_MODE_UNIFIED

    try:
        setup_logging()
        config: MeritageConfig = load_config(args.config_path)
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

    # Respect robots
    if config.respect_robots_txt and not robots_info.allowed:
        run_finished_at = datetime.now(timezone.utc)
        run_metadata: Dict[str, Any] = {
            "analysis_version": "v1.0",
            "run_started_at": run_started_at.isoformat(),
            "run_finished_at": run_finished_at.isoformat(),
            "total_http_requests": client.request_count,
            "unique_communities_sampled": 0,
        }
        report = build_empty_report(
            config,
            run_metadata,
            args.output_mode,
            "Crawl skipped because robots.txt disallows the entry URL or related paths.",
        )
        print(json.dumps(report, indent=2, cls=DateTimeEncoder))
        return

    sampler = MeritageSampler(config, client)
    communities = sampler.crawl()
    run_finished_at = datetime.now(timezone.utc)

    run_metadata = {
        "analysis_version": "v1.0",
        "run_started_at": run_started_at.isoformat(),
        "run_finished_at": run_finished_at.isoformat(),
        "total_http_requests": client.request_count,
        "unique_communities_sampled": len(communities),
        "has_price_ranges": any(c.price_min or c.price_max for c in communities),
        "has_sqft_ranges": any(c.sqft_min or c.sqft_max for c in communities),
        "has_bed_bath_ranges": any(
            (c.beds_min or c.beds_max or c.baths_min or c.baths_max) for c in communities
        ),
    }

    notes = "Parsed communities from Meritage Next.js data."
    if not communities:
        notes = (
            "No community data found in __NEXT_DATA__. "
            "Site may require client-side search or additional endpoints."
        )
    if sampler.warnings:
        notes = "; ".join([notes] + sampler.warnings)

    if args.output_mode == OUTPUT_MODE_UNIFIED:
        unified_communities = meritage_to_unified_communities(
            communities, market_label=config.target_market
        )
        if args.persist:
            try:
                from backend.tools.common.persistence import (  # type: ignore
                    get_connection,
                    upsert_builder_communities,
                )

                conn = get_connection()
                stats = upsert_builder_communities(conn, unified_communities)
                conn.commit()
                run_metadata["persist_stats"] = stats
                logging.info("Persisted unified communities: %s", stats)
            except Exception as exc:  # noqa: BLE001
                logging.exception("Failed to persist to Neon: %s", exc)
                run_metadata["persist_error"] = str(exc)
            finally:
                try:
                    conn.close()  # type: ignore[arg-type]
                except Exception:
                    pass

        report = {
            "source_system": "meritage",
            "target_market": config.target_market,
            "run_metadata": run_metadata,
            "unified": {"communities": [asdict(c) for c in unified_communities]},
            "summary": {"notes": notes},
        }
    else:
        report = build_source_report(config, run_metadata, communities, notes)

    print(json.dumps(report, indent=2, cls=DateTimeEncoder))


if __name__ == "__main__":
    main()
