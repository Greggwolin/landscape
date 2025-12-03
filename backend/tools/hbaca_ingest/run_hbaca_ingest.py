"""CLI entrypoint for HBACA permit data ingestion.

Usage:
    python -m backend.tools.hbaca_ingest.run_hbaca_ingest --file HBACA_Permits_Master_Through_2025-10.xlsx
    python -m backend.tools.hbaca_ingest.run_hbaca_ingest --file HBACA_Permits_Master_Through_2025-10.xlsx --persist
    python -m backend.tools.hbaca_ingest.run_hbaca_ingest --file HBACA_Permits_Master_Through_2025-10.xlsx --msa-code 38060 --persist

Environment:
    DATABASE_URL: PostgreSQL connection string (required for --persist)
"""

import argparse
import json
import logging
import sys
from dataclasses import asdict
from datetime import datetime, timezone, date
from pathlib import Path
from typing import Any, Dict

from .parser import parse_hbaca_file, recognize_hbaca_file
from .schemas import MarketActivityRecord
from ..common.persistence import persist_market_activity


class DateEncoder(json.JSONEncoder):
    """JSON encoder that handles date and datetime objects."""

    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def setup_logging() -> None:
    """Configure logging to file and stdout."""
    logs_dir = Path("backend/tools/hbaca_ingest/logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "hbaca_ingest.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)],
    )


def build_report(
    metadata: Dict[str, Any],
    records: list[MarketActivityRecord],
    persist_stats: Dict[str, int] | None = None,
) -> Dict[str, Any]:
    """Build the JSON output report."""
    report = {
        "source_system": "hbaca",
        "run_metadata": metadata,
    }

    if persist_stats:
        report["persist_stats"] = persist_stats

    # Add summary statistics
    if records:
        # Group by jurisdiction
        by_jurisdiction: Dict[str, list] = {}
        for r in records:
            by_jurisdiction.setdefault(r.geography_name, []).append(r)

        # Calculate per-jurisdiction stats
        jurisdiction_stats = []
        for name, recs in sorted(by_jurisdiction.items()):
            values = [r.value for r in recs]
            dates = [r.period_end_date for r in recs]
            jurisdiction_stats.append({
                "name": name,
                "record_count": len(recs),
                "total_permits": sum(values),
                "avg_monthly": round(sum(values) / len(values), 1) if values else 0,
                "first_period": min(dates).isoformat(),
                "last_period": max(dates).isoformat(),
            })

        report["jurisdiction_summary"] = jurisdiction_stats

        # Recent data (last 12 months)
        recent_cutoff = date(
            metadata.get("date_range_end", "2025-01-01")[:4] if isinstance(metadata.get("date_range_end"), str) else 2025,
            1, 1
        )
        # Actually, let's just get last 12 periods for each jurisdiction
        recent_by_jurisdiction = {}
        for name, recs in by_jurisdiction.items():
            sorted_recs = sorted(recs, key=lambda r: r.period_end_date, reverse=True)[:12]
            recent_by_jurisdiction[name] = [
                {"period": r.period_end_date.isoformat(), "value": r.value}
                for r in sorted_recs
            ]

        report["recent_data"] = recent_by_jurisdiction

    return report


def main() -> None:
    """Main CLI entrypoint."""
    parser_cli = argparse.ArgumentParser(
        description="Import HBACA permit data from Excel files."
    )
    parser_cli.add_argument(
        "--file",
        type=str,
        required=True,
        help="Path to HBACA Excel file (master or monthly update).",
    )
    parser_cli.add_argument(
        "--msa-code",
        type=str,
        default="38060",
        help="MSA code to assign (default: 38060 for Phoenix).",
    )
    parser_cli.add_argument(
        "--file-type",
        type=str,
        choices=["master", "monthly"],
        default=None,
        help="File type (auto-detected if not specified).",
    )
    parser_cli.add_argument(
        "--persist",
        action="store_true",
        help="Persist to database. Requires DATABASE_URL env var.",
    )
    parser_cli.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse file but don't persist (for testing).",
    )
    parser_cli.add_argument(
        "--output",
        type=str,
        choices=["json", "summary"],
        default="summary",
        help="Output format: json (full report) or summary (console only).",
    )
    args = parser_cli.parse_args()

    setup_logging()

    # Validate file exists
    filepath = Path(args.file)
    if not filepath.exists():
        print(f"Error: File not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    run_started_at = datetime.now(timezone.utc)

    # Detect file type if not specified
    file_type = args.file_type
    if file_type is None:
        file_type = recognize_hbaca_file(str(filepath))
        if file_type is None:
            print(
                f"Error: Could not detect HBACA file type for: {filepath}",
                file=sys.stderr,
            )
            sys.exit(1)
        logging.info("Auto-detected file type: %s", file_type)

    # Parse the file
    try:
        records, metadata = parse_hbaca_file(
            str(filepath),
            msa_code=args.msa_code,
            file_type=file_type,
        )
    except Exception as exc:
        print(f"Error parsing file: {exc}", file=sys.stderr)
        logging.exception("Failed to parse HBACA file")
        sys.exit(1)

    run_finished_at = datetime.now(timezone.utc)

    # Add run timing to metadata
    metadata["run_started_at"] = run_started_at.isoformat()
    metadata["run_finished_at"] = run_finished_at.isoformat()

    # Persist if requested
    persist_stats = None
    if args.persist and not args.dry_run:
        try:
            persist_stats = persist_market_activity(records)
            logging.info("Persisted to database: %s", persist_stats)
        except Exception as exc:
            logging.exception("Failed to persist to database: %s", exc)
            metadata["persist_error"] = str(exc)

    # Output
    if args.output == "json":
        report = build_report(metadata, records, persist_stats)
        print(json.dumps(report, indent=2, cls=DateEncoder))
    else:
        # Summary output
        print("\n" + "=" * 60)
        print("HBACA Permit Data Import Summary")
        print("=" * 60)
        print(f"File: {metadata['filepath']}")
        print(f"Type: {metadata['file_type']}")
        print(f"MSA:  {metadata['msa_code']}")
        print(f"Date Range: {metadata['date_range_start']} to {metadata['date_range_end']}")
        print(f"Jurisdictions: {metadata['jurisdiction_count']}")
        print(f"Records Parsed: {metadata['record_count']}")

        if persist_stats:
            print(f"\nDatabase: {persist_stats['inserted']} inserted, {persist_stats['updated']} updated")
        elif args.dry_run:
            print("\n[DRY RUN - no data persisted]")

        # Show jurisdiction list
        print("\nJurisdictions:")
        for j in sorted(metadata['jurisdictions']):
            print(f"  - {j}")

        print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
