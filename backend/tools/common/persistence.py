"""Persistence helpers for unified builder benchmark models.

This module provides upsert functions for persisting UnifiedCommunityBenchmark,
UnifiedPlanBenchmark, and UnifiedInventoryListing to the Neon PostgreSQL database.

Usage:
    from backend.tools.common.persistence import (
        get_connection,
        upsert_builder_communities,
        upsert_builder_plans,
        upsert_builder_inventory,
    )

    with get_connection() as conn:
        stats = upsert_builder_communities(conn, communities)
        print(f"Inserted {stats['inserted']}, updated {stats['updated']}")

Environment:
    DATABASE_URL: PostgreSQL connection string (required)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import TYPE_CHECKING, Dict, List, Optional

import psycopg2
from psycopg2.extras import execute_values

from backend.tools.common.models import (
    UnifiedCommunityBenchmark,
    UnifiedInventoryListing,
    UnifiedPlanBenchmark,
    UnifiedResaleClosing,
)

if TYPE_CHECKING:
    from backend.tools.hbaca_ingest.schemas import MarketActivityRecord


logger = logging.getLogger(__name__)


def get_connection() -> psycopg2.extensions.connection:
    """Create a database connection from DATABASE_URL.

    Returns:
        psycopg2 connection object.

    Raises:
        ValueError: If DATABASE_URL is not set.
        psycopg2.Error: If connection fails.
    """
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")

    # Add channel_binding for Neon compatibility if not present
    if "channel_binding" not in database_url:
        sep = "&" if "?" in database_url else "?"
        database_url = f"{database_url}{sep}channel_binding=require"

    return psycopg2.connect(database_url)


def upsert_builder_communities(
    conn: psycopg2.extensions.connection,
    communities: List[UnifiedCommunityBenchmark],
) -> Dict[str, int]:
    """Upsert community benchmarks to bmk_builder_communities.

    Uses ON CONFLICT (source, source_id) to update existing records or insert new ones.

    Args:
        conn: psycopg2 connection (caller manages transaction).
        communities: List of UnifiedCommunityBenchmark instances.

    Returns:
        Dict with 'inserted' and 'updated' counts.
    """
    if not communities:
        return {"inserted": 0, "updated": 0}

    now = datetime.utcnow()

    # Prepare values for bulk insert
    values = []
    for c in communities:
        # Convert product_types list to comma-separated string
        product_types_str = ",".join(c.product_types) if c.product_types else None

        values.append((
            c.source,
            c.source_id,
            c.builder_name,
            c.community_name,
            c.market_label,
            c.city,
            c.state,
            c.zip_code,
            c.lat,
            c.lng,
            c.price_min,
            c.price_max,
            c.sqft_min,
            c.sqft_max,
            c.beds_min,
            c.beds_max,
            c.baths_min,
            c.baths_max,
            c.hoa_monthly,
            product_types_str,
            c.plan_count,
            c.inventory_count,
            c.source_url,
            c.first_seen_at or now,
            c.last_seen_at or now,
            now,  # ingested_at
        ))

    sql = """
        INSERT INTO landscape.bmk_builder_communities (
            source, source_id, builder_name, community_name, market_label,
            city, state, zip_code, lat, lng,
            price_min, price_max, sqft_min, sqft_max,
            beds_min, beds_max, baths_min, baths_max,
            hoa_monthly, product_types, plan_count, inventory_count, source_url,
            first_seen_at, last_seen_at, ingested_at
        ) VALUES %s
        ON CONFLICT (source, source_id) DO UPDATE SET
            builder_name = EXCLUDED.builder_name,
            community_name = EXCLUDED.community_name,
            market_label = EXCLUDED.market_label,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip_code = EXCLUDED.zip_code,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            price_min = EXCLUDED.price_min,
            price_max = EXCLUDED.price_max,
            sqft_min = EXCLUDED.sqft_min,
            sqft_max = EXCLUDED.sqft_max,
            beds_min = EXCLUDED.beds_min,
            beds_max = EXCLUDED.beds_max,
            baths_min = EXCLUDED.baths_min,
            baths_max = EXCLUDED.baths_max,
            hoa_monthly = EXCLUDED.hoa_monthly,
            product_types = EXCLUDED.product_types,
            plan_count = EXCLUDED.plan_count,
            inventory_count = EXCLUDED.inventory_count,
            source_url = EXCLUDED.source_url,
            last_seen_at = EXCLUDED.last_seen_at,
            ingested_at = EXCLUDED.ingested_at
        RETURNING (xmax = 0) AS inserted
    """

    with conn.cursor() as cur:
        results = execute_values(cur, sql, values, fetch=True)

    inserted = sum(1 for r in results if r[0])
    updated = len(results) - inserted

    logger.info(
        "upsert_builder_communities: %d inserted, %d updated",
        inserted,
        updated,
    )

    return {"inserted": inserted, "updated": updated}


def upsert_builder_plans(
    conn: psycopg2.extensions.connection,
    plans: List[UnifiedPlanBenchmark],
) -> Dict[str, int]:
    """Upsert plan benchmarks to bmk_builder_plans.

    Uses ON CONFLICT (source, source_id) to update existing records or insert new ones.

    Args:
        conn: psycopg2 connection (caller manages transaction).
        plans: List of UnifiedPlanBenchmark instances.

    Returns:
        Dict with 'inserted' and 'updated' counts.
    """
    if not plans:
        return {"inserted": 0, "updated": 0}

    now = datetime.utcnow()

    values = []
    for p in plans:
        values.append((
            p.source,
            p.source_id,
            p.community_source_id,
            p.plan_name,
            p.series_name,
            p.product_type,
            p.base_price,
            p.sqft_min,
            p.sqft_max,
            p.beds_min,
            p.beds_max,
            p.baths_min,
            p.baths_max,
            p.garage_spaces,
            p.stories,
            p.source_url,
            p.first_seen_at or now,
            p.last_seen_at or now,
            now,  # ingested_at
        ))

    sql = """
        INSERT INTO landscape.bmk_builder_plans (
            source, source_id, community_source_id, plan_name, series_name,
            product_type, base_price, sqft_min, sqft_max,
            beds_min, beds_max, baths_min, baths_max,
            garage_spaces, stories, source_url,
            first_seen_at, last_seen_at, ingested_at
        ) VALUES %s
        ON CONFLICT (source, source_id) DO UPDATE SET
            community_source_id = EXCLUDED.community_source_id,
            plan_name = EXCLUDED.plan_name,
            series_name = EXCLUDED.series_name,
            product_type = EXCLUDED.product_type,
            base_price = EXCLUDED.base_price,
            sqft_min = EXCLUDED.sqft_min,
            sqft_max = EXCLUDED.sqft_max,
            beds_min = EXCLUDED.beds_min,
            beds_max = EXCLUDED.beds_max,
            baths_min = EXCLUDED.baths_min,
            baths_max = EXCLUDED.baths_max,
            garage_spaces = EXCLUDED.garage_spaces,
            stories = EXCLUDED.stories,
            source_url = EXCLUDED.source_url,
            last_seen_at = EXCLUDED.last_seen_at,
            ingested_at = EXCLUDED.ingested_at
        RETURNING (xmax = 0) AS inserted
    """

    with conn.cursor() as cur:
        results = execute_values(cur, sql, values, fetch=True)

    inserted = sum(1 for r in results if r[0])
    updated = len(results) - inserted

    logger.info(
        "upsert_builder_plans: %d inserted, %d updated",
        inserted,
        updated,
    )

    return {"inserted": inserted, "updated": updated}


def upsert_builder_inventory(
    conn: psycopg2.extensions.connection,
    listings: List[UnifiedInventoryListing],
) -> Dict[str, int]:
    """Upsert inventory listings to bmk_builder_inventory.

    Uses ON CONFLICT (source, source_id) to update existing records or insert new ones.

    Args:
        conn: psycopg2 connection (caller manages transaction).
        listings: List of UnifiedInventoryListing instances.

    Returns:
        Dict with 'inserted' and 'updated' counts.
    """
    if not listings:
        return {"inserted": 0, "updated": 0}

    now = datetime.utcnow()

    values = []
    for l in listings:
        values.append((
            l.source,
            l.source_id,
            l.community_source_id,
            l.plan_source_id,
            l.address_line1,
            l.city,
            l.state,
            l.zip_code,
            l.lat,
            l.lng,
            l.status,
            l.price_current,
            l.price_original,
            l.sqft_actual,
            l.beds_actual,
            l.baths_actual,
            l.lot_sqft,
            l.move_in_date,
            l.source_url,
            l.first_seen_at or now,
            l.last_seen_at or now,
            now,  # ingested_at
        ))

    sql = """
        INSERT INTO landscape.bmk_builder_inventory (
            source, source_id, community_source_id, plan_source_id,
            address_line1, city, state, zip_code, lat, lng,
            status, price_current, price_original,
            sqft_actual, beds_actual, baths_actual, lot_sqft,
            move_in_date, source_url,
            first_seen_at, last_seen_at, ingested_at
        ) VALUES %s
        ON CONFLICT (source, source_id) DO UPDATE SET
            community_source_id = EXCLUDED.community_source_id,
            plan_source_id = EXCLUDED.plan_source_id,
            address_line1 = EXCLUDED.address_line1,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip_code = EXCLUDED.zip_code,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            status = EXCLUDED.status,
            price_current = EXCLUDED.price_current,
            price_original = EXCLUDED.price_original,
            sqft_actual = EXCLUDED.sqft_actual,
            beds_actual = EXCLUDED.beds_actual,
            baths_actual = EXCLUDED.baths_actual,
            lot_sqft = EXCLUDED.lot_sqft,
            move_in_date = EXCLUDED.move_in_date,
            source_url = EXCLUDED.source_url,
            last_seen_at = EXCLUDED.last_seen_at,
            ingested_at = EXCLUDED.ingested_at
        RETURNING (xmax = 0) AS inserted
    """

    with conn.cursor() as cur:
        results = execute_values(cur, sql, values, fetch=True)

    inserted = sum(1 for r in results if r[0])
    updated = len(results) - inserted

    logger.info(
        "upsert_builder_inventory: %d inserted, %d updated",
        inserted,
        updated,
    )

    return {"inserted": inserted, "updated": updated}


def upsert_resale_closings(
    conn: psycopg2.extensions.connection,
    closings: List[UnifiedResaleClosing],
) -> Dict[str, int]:
    """Upsert resale closings to bmk_resale_closings.

    Uses ON CONFLICT (source, source_id) to update existing records or insert new ones.

    Args:
        conn: psycopg2 connection (caller manages transaction).
        closings: List of UnifiedResaleClosing instances.

    Returns:
        Dict with 'inserted' and 'updated' counts.
    """
    if not closings:
        return {"inserted": 0, "updated": 0}

    now = datetime.utcnow()

    values = []
    for c in closings:
        values.append((
            c.source,
            c.source_id,
            c.sale_price,
            c.sale_date,
            c.address_line1,
            c.city,
            c.state,
            c.zip_code,
            c.lat,
            c.lng,
            c.property_type,
            c.list_price,
            c.list_date,
            c.days_on_market,
            c.sqft,
            c.lot_sqft,
            c.price_per_sqft,
            c.year_built,
            c.beds,
            c.baths,
            c.builder_name,
            c.subdivision_name,
            c.source_url,
            now,  # first_seen_at
            now,  # last_seen_at
            now,  # ingested_at
        ))

    sql = """
        INSERT INTO landscape.bmk_resale_closings (
            source, source_id, sale_price, sale_date,
            address_line1, city, state, zip_code, lat, lng,
            property_type, list_price, list_date, days_on_market,
            sqft, lot_sqft, price_per_sqft, year_built, beds, baths,
            builder_name, subdivision_name, source_url,
            first_seen_at, last_seen_at, ingested_at
        ) VALUES %s
        ON CONFLICT (source, source_id) DO UPDATE SET
            sale_price = EXCLUDED.sale_price,
            sale_date = EXCLUDED.sale_date,
            address_line1 = EXCLUDED.address_line1,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip_code = EXCLUDED.zip_code,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            property_type = EXCLUDED.property_type,
            list_price = EXCLUDED.list_price,
            list_date = EXCLUDED.list_date,
            days_on_market = EXCLUDED.days_on_market,
            sqft = EXCLUDED.sqft,
            lot_sqft = EXCLUDED.lot_sqft,
            price_per_sqft = EXCLUDED.price_per_sqft,
            year_built = EXCLUDED.year_built,
            beds = EXCLUDED.beds,
            baths = EXCLUDED.baths,
            builder_name = EXCLUDED.builder_name,
            subdivision_name = EXCLUDED.subdivision_name,
            source_url = EXCLUDED.source_url,
            last_seen_at = EXCLUDED.last_seen_at,
            ingested_at = EXCLUDED.ingested_at
        RETURNING (xmax = 0) AS inserted
    """

    with conn.cursor() as cur:
        results = execute_values(cur, sql, values, fetch=True)

    inserted = sum(1 for r in results if r[0])
    updated = len(results) - inserted

    logger.info(
        "upsert_resale_closings: %d inserted, %d updated",
        inserted,
        updated,
    )

    return {"inserted": inserted, "updated": updated}


def persist_lennar_unified(
    communities: List[UnifiedCommunityBenchmark],
    plans: List[UnifiedPlanBenchmark],
    inventory: List[UnifiedInventoryListing],
    database_url: Optional[str] = None,
) -> Dict[str, Dict[str, int]]:
    """Convenience function to persist all Lennar unified data in a single transaction.

    Args:
        communities: List of UnifiedCommunityBenchmark instances.
        plans: List of UnifiedPlanBenchmark instances.
        inventory: List of UnifiedInventoryListing instances.
        database_url: Optional override for DATABASE_URL env var.

    Returns:
        Dict with stats for each entity type:
        {
            'communities': {'inserted': N, 'updated': M},
            'plans': {'inserted': N, 'updated': M},
            'inventory': {'inserted': N, 'updated': M},
        }
    """
    if database_url:
        os.environ["DATABASE_URL"] = database_url

    conn = get_connection()
    try:
        stats = {
            "communities": upsert_builder_communities(conn, communities),
            "plans": upsert_builder_plans(conn, plans),
            "inventory": upsert_builder_inventory(conn, inventory),
        }
        conn.commit()
        logger.info("persist_lennar_unified: transaction committed")
        return stats
    except Exception:
        conn.rollback()
        logger.exception("persist_lennar_unified: transaction rolled back")
        raise
    finally:
        conn.close()


def persist_redfin_closings(
    closings: List[UnifiedResaleClosing],
    database_url: Optional[str] = None,
) -> Dict[str, int]:
    """Convenience function to persist Redfin resale closings.

    Args:
        closings: List of UnifiedResaleClosing instances.
        database_url: Optional override for DATABASE_URL env var.

    Returns:
        Dict with 'inserted' and 'updated' counts.
    """
    if database_url:
        os.environ["DATABASE_URL"] = database_url

    conn = get_connection()
    try:
        stats = upsert_resale_closings(conn, closings)
        conn.commit()
        logger.info("persist_redfin_closings: transaction committed")
        return stats
    except Exception:
        conn.rollback()
        logger.exception("persist_redfin_closings: transaction rolled back")
        raise
    finally:
        conn.close()


def upsert_market_activity(
    conn: psycopg2.extensions.connection,
    records: "List[MarketActivityRecord]",
) -> Dict[str, int]:
    """Upsert market activity records to landscape.market_activity.

    Uses ON CONFLICT to update existing records or insert new ones.
    Conflict key: (msa_code, source, metric_type, geography_type, geography_name, period_end_date)

    Args:
        conn: psycopg2 connection (caller manages transaction).
        records: List of MarketActivityRecord instances.

    Returns:
        Dict with 'inserted' and 'updated' counts.
    """
    if not records:
        return {"inserted": 0, "updated": 0}

    now = datetime.utcnow()

    values = []
    for r in records:
        values.append((
            r.msa_code,
            r.source,
            r.metric_type,
            r.geography_type,
            r.geography_name,
            r.period_type,
            r.period_end_date,
            r.value,
            r.notes,
            now,  # updated_at
        ))

    sql = """
        INSERT INTO landscape.market_activity (
            msa_code, source, metric_type, geography_type, geography_name,
            period_type, period_end_date, value, notes, updated_at
        ) VALUES %s
        ON CONFLICT (msa_code, source, metric_type, geography_type, geography_name, period_end_date)
        DO UPDATE SET
            value = EXCLUDED.value,
            notes = EXCLUDED.notes,
            updated_at = EXCLUDED.updated_at
        RETURNING (xmax = 0) AS inserted
    """

    with conn.cursor() as cur:
        results = execute_values(cur, sql, values, fetch=True)

    inserted = sum(1 for r in results if r[0])
    updated = len(results) - inserted

    logger.info(
        "upsert_market_activity: %d inserted, %d updated",
        inserted,
        updated,
    )

    return {"inserted": inserted, "updated": updated}


def persist_market_activity(
    records: "List[MarketActivityRecord]",
    database_url: Optional[str] = None,
) -> Dict[str, int]:
    """Convenience function to persist market activity records.

    Args:
        records: List of MarketActivityRecord instances.
        database_url: Optional override for DATABASE_URL env var.

    Returns:
        Dict with 'inserted' and 'updated' counts.
    """
    if database_url:
        os.environ["DATABASE_URL"] = database_url

    conn = get_connection()
    try:
        stats = upsert_market_activity(conn, records)
        conn.commit()
        logger.info("persist_market_activity: transaction committed")
        return stats
    except Exception:
        conn.rollback()
        logger.exception("persist_market_activity: transaction rolled back")
        raise
    finally:
        conn.close()
