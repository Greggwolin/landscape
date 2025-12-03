"""CLI entrypoint for Redfin sold comps ingestion.

Usage:
    python -m backend.tools.redfin_ingest.run_redfin_ingest --config-path redfin_phx_config.json
    python -m backend.tools.redfin_ingest.run_redfin_ingest --config-path redfin_phx_config.json --output-mode unified
    python -m backend.tools.redfin_ingest.run_redfin_ingest --config-path redfin_phx_config.json --persist
"""

import argparse
import json
import logging
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from .client import RedfinClient
from .config import RedfinConfig, load_config
from .schemas import RedfinComp
from ..common.adapters import to_unified_resale_closings
from ..common.persistence import persist_redfin_closings


OUTPUT_MODE_SOURCE = "source"
OUTPUT_MODE_UNIFIED = "unified"


class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def setup_logging() -> None:
    """Configure logging to file and stdout."""
    logs_dir = Path("backend/tools/redfin_ingest/logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "redfin_ingest.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)],
    )


def build_source_report(
    config: RedfinConfig,
    run_metadata: Dict[str, Any],
    comps: List[RedfinComp],
) -> Dict[str, Any]:
    """Build the original source-shaped JSON output."""
    return {
        "source_system": "redfin",
        "target_market": config.target_market,
        "run_metadata": run_metadata,
        "raw": [
            {
                "mlsId": c.mls_id,
                "address": c.address,
                "city": c.city,
                "state": c.state,
                "zip": c.zip_code,
                "price": c.price,
                "sqft": c.sqft,
                "pricePerSqft": c.price_per_sqft,
                "lotSize": c.lot_size,
                "yearBuilt": c.year_built,
                "beds": c.beds,
                "baths": c.baths,
                "soldDate": c.sold_date,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "distanceMiles": c.distance_miles,
                "url": c.url,
            }
            for c in comps
        ],
    }


def main() -> None:
    """Main CLI entrypoint."""
    parser_cli = argparse.ArgumentParser(description="Run Redfin sold comps ingestion.")
    parser_cli.add_argument("--config-path", type=str, help="Path to config JSON.")
    parser_cli.add_argument(
        "--output-mode",
        type=str,
        choices=[OUTPUT_MODE_SOURCE, OUTPUT_MODE_UNIFIED],
        default=OUTPUT_MODE_SOURCE,
        help=(
            f"Output format: '{OUTPUT_MODE_SOURCE}' emits Redfin-native schema (default), "
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
        config: RedfinConfig = load_config(args.config_path)
    except Exception as exc:
        print(f"Failed to load config: {exc}", file=sys.stderr)
        sys.exit(1)

    run_started_at = datetime.now(timezone.utc)

    # Fetch comps from Redfin
    logging.info(
        "Fetching Redfin comps for %s (%.4f, %.4f) radius %.1f mi",
        config.target_market,
        config.center_lat,
        config.center_lng,
        config.radius_miles,
    )

    with RedfinClient(config) as client:
        comps = client.fetch_comps()
        request_count = client.request_count

    run_finished_at = datetime.now(timezone.utc)

    run_metadata: Dict[str, Any] = {
        "analysis_version": "v1.0",
        "run_started_at": run_started_at.isoformat(),
        "run_finished_at": run_finished_at.isoformat(),
        "total_http_requests": request_count,
        "result_count": len(comps),
        "search_params": {
            "center_lat": config.center_lat,
            "center_lng": config.center_lng,
            "radius_miles": config.radius_miles,
            "sold_within_days": config.sold_within_days,
            "min_year_built": config.min_year_built,
            "max_year_built": config.max_year_built,
            "property_type": config.property_type,
        },
    }

    # Build report based on output mode
    if args.output_mode == OUTPUT_MODE_UNIFIED:
        # Transform to unified models
        unified_closings = to_unified_resale_closings(
            comps, property_type=config.property_type
        )

        # Persist if requested
        if args.persist:
            try:
                persist_stats = persist_redfin_closings(unified_closings)
                run_metadata["persist_stats"] = persist_stats
                logging.info("Persisted to Neon: %s", persist_stats)
            except Exception as exc:
                logging.exception("Failed to persist to Neon: %s", exc)
                run_metadata["persist_error"] = str(exc)

        report = {
            "source_system": "redfin",
            "target_market": config.target_market,
            "run_metadata": run_metadata,
            "unified": [asdict(c) for c in unified_closings],
        }
    else:
        report = build_source_report(config, run_metadata, comps)

    print(json.dumps(report, indent=2, cls=DateTimeEncoder))


if __name__ == "__main__":
    main()
