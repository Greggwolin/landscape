#!/usr/bin/env python3
"""
Smoke checks for parcel_id standardization.

Usage:
  DATABASE_URL=... python scripts/smoke_parcel_id_fix.py
"""

import os
import sys

import psycopg2


def run_check(cursor, label, sql, params=None):
    cursor.execute(sql, params or [])
    row = cursor.fetchone()
    value = row[0] if row else None
    print(f"{label}: {value}")
    return value


def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required")
        return 1

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            run_check(
                cur,
                "project_parcel_boundaries missing parcel_apn",
                """
                SELECT COUNT(*)
                FROM landscape.project_parcel_boundaries
                WHERE parcel_id IS NOT NULL AND parcel_apn IS NULL
                """,
            )

            run_check(
                cur,
                "core_doc parcel_id_int null (with bigint in range)",
                """
                SELECT COUNT(*)
                FROM landscape.core_doc
                WHERE parcel_id IS NOT NULL
                  AND parcel_id BETWEEN -2147483648 AND 2147483647
                  AND parcel_id_int IS NULL
                """,
            )

            run_check(
                cur,
                "tbl_absorption_schedule parcel_id_int null (with bigint in range)",
                """
                SELECT COUNT(*)
                FROM landscape.tbl_absorption_schedule
                WHERE parcel_id IS NOT NULL
                  AND parcel_id BETWEEN -2147483648 AND 2147483647
                  AND parcel_id_int IS NULL
                """,
            )

            run_check(
                cur,
                "tbl_acreage_allocation parcel_id_int null (with bigint in range)",
                """
                SELECT COUNT(*)
                FROM landscape.tbl_acreage_allocation
                WHERE parcel_id IS NOT NULL
                  AND parcel_id BETWEEN -2147483648 AND 2147483647
                  AND parcel_id_int IS NULL
                """,
            )

            run_check(
                cur,
                "tbl_parcel_sale_event parcel_id_int null (with bigint in range)",
                """
                SELECT COUNT(*)
                FROM landscape.tbl_parcel_sale_event
                WHERE parcel_id IS NOT NULL
                  AND parcel_id BETWEEN -2147483648 AND 2147483647
                  AND parcel_id_int IS NULL
                """,
            )

            run_check(
                cur,
                "core_doc parcel_id_int without tbl_parcel match",
                """
                SELECT COUNT(*)
                FROM landscape.core_doc d
                LEFT JOIN landscape.tbl_parcel p ON p.parcel_id = d.parcel_id_int
                WHERE d.parcel_id_int IS NOT NULL AND p.parcel_id IS NULL
                """,
            )

        print("Smoke checks complete.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
