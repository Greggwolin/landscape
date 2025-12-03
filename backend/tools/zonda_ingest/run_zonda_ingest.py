"""CLI entrypoint for Zonda subdivision data ingestion.

Usage:
    python -m backend.tools.zonda_ingest.run_zonda_ingest --file Zonda-Phx_Nov2025.xlsx --dry-run
    python -m backend.tools.zonda_ingest.run_zonda_ingest --file Zonda-Phx_Nov2025.xlsx --persist
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from collections import Counter
from dataclasses import asdict
from datetime import date, datetime
from typing import Dict, List

from .parser import parse_zonda_file
from .schemas import ZondaSubdivision
from ..common.persistence import get_connection


logger = logging.getLogger(__name__)


def setup_logging() -> None:
    """Configure logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def upsert_zonda_subdivisions(
    conn,
    records: List[ZondaSubdivision],
) -> Dict[str, int]:
    """Upsert Zonda subdivision records to database.

    Args:
        conn: psycopg2 connection.
        records: List of ZondaSubdivision instances.

    Returns:
        Dict with 'inserted' and 'updated' counts.
    """
    from psycopg2.extras import execute_values

    if not records:
        return {"inserted": 0, "updated": 0}

    now = datetime.now()

    # Deduplicate by unique key (msa_code, project_name, product_code)
    # Keep last occurrence (most recent in file)
    seen = {}
    for r in records:
        key = (r.msa_code, r.project_name, r.product_code)
        seen[key] = r
    deduped_records = list(seen.values())

    if len(deduped_records) < len(records):
        logger.info(
            "Deduplicated %d records to %d unique records",
            len(records),
            len(deduped_records),
        )

    values = []
    for r in deduped_records:
        values.append((
            r.msa_code,
            r.project_name,
            r.builder,
            r.mpc,
            r.property_type,
            r.style,
            r.lot_size_sf,
            r.lot_width,
            r.lot_depth,
            r.product_code,
            r.units_sold,
            r.units_remaining,
            r.size_min_sf,
            r.size_max_sf,
            r.size_avg_sf,
            r.price_min,
            r.price_max,
            r.price_avg,
            r.latitude,
            r.longitude,
            r.special_features,
            r.source_file,
            r.source_date,
            now,  # updated_at
        ))

    sql = """
        INSERT INTO landscape.zonda_subdivisions (
            msa_code, project_name, builder, mpc, property_type, style,
            lot_size_sf, lot_width, lot_depth, product_code,
            units_sold, units_remaining, size_min_sf, size_max_sf, size_avg_sf,
            price_min, price_max, price_avg, latitude, longitude,
            special_features, source_file, source_date, updated_at
        ) VALUES %s
        ON CONFLICT (msa_code, project_name, product_code)
        DO UPDATE SET
            builder = EXCLUDED.builder,
            mpc = EXCLUDED.mpc,
            property_type = EXCLUDED.property_type,
            style = EXCLUDED.style,
            lot_size_sf = EXCLUDED.lot_size_sf,
            lot_width = EXCLUDED.lot_width,
            lot_depth = EXCLUDED.lot_depth,
            units_sold = EXCLUDED.units_sold,
            units_remaining = EXCLUDED.units_remaining,
            size_min_sf = EXCLUDED.size_min_sf,
            size_max_sf = EXCLUDED.size_max_sf,
            size_avg_sf = EXCLUDED.size_avg_sf,
            price_min = EXCLUDED.price_min,
            price_max = EXCLUDED.price_max,
            price_avg = EXCLUDED.price_avg,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            special_features = EXCLUDED.special_features,
            source_file = EXCLUDED.source_file,
            source_date = EXCLUDED.source_date,
            updated_at = EXCLUDED.updated_at
        RETURNING (xmax = 0) AS inserted
    """

    with conn.cursor() as cur:
        results = execute_values(cur, sql, values, fetch=True)

    inserted = sum(1 for r in results if r[0])
    updated = len(results) - inserted

    logger.info(
        "upsert_zonda_subdivisions: %d inserted, %d updated",
        inserted,
        updated,
    )

    return {"inserted": inserted, "updated": updated}


def print_summary(records: List[ZondaSubdivision], persist_stats: Dict[str, int] = None) -> None:
    """Print summary of parsed records."""
    print("\n" + "=" * 60)
    print("Zonda Subdivision Data Import Summary")
    print("=" * 60)

    if not records:
        print("No records parsed.")
        return

    # Basic counts
    print(f"Records Parsed: {len(records)}")

    # Unique projects
    unique_projects = len(set(r.project_name for r in records))
    print(f"Unique Projects: {unique_projects}")

    # Unique builders
    builders = [r.builder for r in records if r.builder]
    unique_builders = len(set(builders))
    print(f"Unique Builders: {unique_builders}")

    # Lot width distribution
    lot_widths = [r.lot_width for r in records if r.lot_width]
    if lot_widths:
        width_counts = Counter(lot_widths)
        print(f"\nLot Width Distribution:")
        for width in sorted(width_counts.keys()):
            print(f"  {width}ft: {width_counts[width]} records")

    # Property types
    types = [r.property_type for r in records if r.property_type]
    if types:
        type_counts = Counter(types)
        print(f"\nProperty Types:")
        for ptype, count in type_counts.most_common():
            print(f"  {ptype}: {count}")

    # Inventory summary
    total_remaining = sum(r.units_remaining or 0 for r in records)
    total_sold = sum(r.units_sold or 0 for r in records)
    print(f"\nInventory Summary:")
    print(f"  Total Units Remaining: {total_remaining:,}")
    print(f"  Total Units Sold: {total_sold:,}")

    # Top builders by remaining inventory
    builder_inventory = Counter()
    for r in records:
        if r.builder and r.units_remaining:
            builder_inventory[r.builder] += r.units_remaining
    if builder_inventory:
        print(f"\nTop 10 Builders by Remaining Inventory:")
        for builder, inv in builder_inventory.most_common(10):
            print(f"  {builder}: {inv:,}")

    # Price range
    prices = [r.price_avg for r in records if r.price_avg]
    if prices:
        print(f"\nPrice Range (avg base):")
        print(f"  Min: ${min(prices):,.0f}")
        print(f"  Max: ${max(prices):,.0f}")
        print(f"  Median: ${sorted(prices)[len(prices)//2]:,.0f}")

    # Persist stats
    if persist_stats:
        print(f"\nDatabase: {persist_stats['inserted']} inserted, {persist_stats['updated']} updated")
    else:
        print("\n[DRY RUN - no data persisted]")

    print("=" * 60)


def main() -> None:
    """Main CLI entrypoint."""
    parser = argparse.ArgumentParser(description="Import Zonda subdivision data.")
    parser.add_argument("--file", required=True, help="Path to Zonda Excel file")
    parser.add_argument("--msa", default="38060", help="MSA code (default: 38060 Phoenix)")
    parser.add_argument(
        "--source-date",
        type=lambda s: datetime.strptime(s, "%Y-%m-%d").date(),
        default=None,
        help="Source date in YYYY-MM-DD format (default: today)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse only, don't persist")
    parser.add_argument("--persist", action="store_true", help="Persist to database")
    parser.add_argument(
        "--output",
        choices=["summary", "json"],
        default="summary",
        help="Output format",
    )
    args = parser.parse_args()

    setup_logging()

    # Parse file
    records = parse_zonda_file(
        filepath=args.file,
        msa_code=args.msa,
        source_date=args.source_date,
    )

    persist_stats = None

    # Persist if requested
    if args.persist and not args.dry_run:
        conn = get_connection()
        try:
            persist_stats = upsert_zonda_subdivisions(conn, records)
            conn.commit()
            logger.info("Transaction committed")
        except Exception:
            conn.rollback()
            logger.exception("Transaction rolled back")
            raise
        finally:
            conn.close()

    # Output
    if args.output == "json":
        output = {
            "records": [asdict(r) for r in records],
            "persist_stats": persist_stats,
        }
        # Convert dates to strings for JSON
        for rec in output["records"]:
            if rec.get("source_date"):
                rec["source_date"] = rec["source_date"].isoformat()
        print(json.dumps(output, indent=2))
    else:
        print_summary(records, persist_stats)


if __name__ == "__main__":
    main()
