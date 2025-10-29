#!/usr/bin/env python3
import argparse
import os
from pathlib import Path
import psycopg2

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MIGRATION = ROOT / "db" / "migrations" / "016_subdivision_underwriting_v1.sql"
DEFAULT_RECONCILE = [
    (
        "tbl_budget column check",
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema='landscape'
          AND table_name='tbl_budget'
          AND column_name IN ('rate_profile_id','financeable_flag','include_in_per_lot_infra_flag')
        ORDER BY column_name;
        """,
    ),
    (
        "object existence",
        """
        SELECT
          to_regclass('landscape.financial_land_acquisition')    AS land_acq,
          to_regclass('landscape.financial_overhead')            AS overhead,
          to_regclass('landscape.tbl_revenue_schedule_res')      AS rev_sched,
          to_regclass('landscape.financial_financing')           AS financing,
          to_regclass('landscape.financial_draws')               AS draws,
          to_regclass('landscape.financial_summary_res')         AS summary_mv;
        """,
    ),
    (
        "index overview",
        """
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname='landscape'
          AND indexname LIKE 'idx_%'
        ORDER BY indexname;
        """,
    ),
    (
        "sample row counts",
        """
        SELECT 'rev_sched' AS table_name, COUNT(*) AS row_count FROM landscape.tbl_revenue_schedule_res
        UNION ALL
        SELECT 'overhead', COUNT(*) FROM landscape.financial_overhead
        UNION ALL
        SELECT 'land_acq', COUNT(*) FROM landscape.financial_land_acquisition;
        """,
    ),
]


def load_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    env_file = ROOT.parent / ".env.local"
    if env_file.exists():
        with env_file.open() as fh:
            for line in fh:
                if line.startswith("DATABASE_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("DATABASE_URL not found in environment or .env.local")


def run_sql(cur, label: str, sql: str):
    print(f"\n--- Running: {label} ---")
    cur.execute(sql)
    print(f"✔ Completed: {label}")


def run_reconcile(cur):
    print("\n--- Reconcile Checks ---")
    for label, query in DEFAULT_RECONCILE:
        print(f"\n[{label}]")
        cur.execute(query)
        rows = cur.fetchall()
        if not rows:
            print("  (no rows)")
            continue
        for row in rows:
            print("  ", row)


def main():
    parser = argparse.ArgumentParser(description="Apply SQL migration to Neon and run reconciliation queries.")
    parser.add_argument(
        "--file",
        type=Path,
        default=DEFAULT_MIGRATION,
        help="Path to SQL migration file (default: %(default)s)",
    )
    parser.add_argument(
        "--skip-reconcile",
        action="store_true",
        help="Skip post-migration reconcile queries.",
    )
    args = parser.parse_args()

    migration_path = args.file.resolve()
    if not migration_path.exists():
        raise FileNotFoundError(f"Migration file not found: {migration_path}")

    database_url = load_database_url()
    sql = migration_path.read_text()

    print(f"Connecting to database at {database_url.split('@')[-1]} ...")
    conn = psycopg2.connect(database_url)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            run_sql(cur, migration_path.name, sql)
            conn.commit()
            print("\n✅ Migration committed successfully.")

        if not args.skip_reconcile:
            with conn.cursor() as cur:
                run_reconcile(cur)
    except Exception as exc:
        conn.rollback()
        print(f"\n❌ Migration failed: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
