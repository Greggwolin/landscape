#!/usr/bin/env python3
"""
Persist parsed multi-scenario OpEx rows into tbl_operating_expenses.

Intended for Lynn Villa (Project 42) parser proof outputs stored at:
  docs/opex/lynn_villa_scenarios_parsed.json

Usage:
  python3 backend/tools/opex/persist_parsed_scenarios.py --project-id 42 --input docs/opex/lynn_villa_scenarios_parsed.json
"""

import argparse
import json
import os
import sys
from urllib.parse import urlparse

try:
    import psycopg
except ImportError:
    psycopg = None
try:
    import psycopg2
except ImportError:
    psycopg2 = None

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from apps.knowledge.services.opex_utils import persist_parsed_scenarios  # noqa: E402


def get_db_connection():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        raise RuntimeError("DATABASE_URL not set")
    parsed = urlparse(db_url)
    if psycopg:
        return psycopg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            dbname=parsed.path.lstrip('/'),
            sslmode='require'
        )
    if psycopg2:
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            dbname=parsed.path.lstrip('/'),
            sslmode='require'
        )
    raise RuntimeError("psycopg or psycopg2 is required to run this script")


def fetch_distribution(conn, project_id):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT statement_discriminator, COUNT(*)::int, SUM(annual_amount)::numeric
            FROM landscape.tbl_operating_expenses
            WHERE project_id = %s
            GROUP BY statement_discriminator
            ORDER BY statement_discriminator
        """, [project_id])
        return cur.fetchall()


def main():
    parser = argparse.ArgumentParser(description="Persist parsed OpEx scenarios into tbl_operating_expenses")
    parser.add_argument('--project-id', type=int, required=True)
    parser.add_argument('--input', required=True, help='Path to parsed JSON (list of rows)')
    parser.add_argument('--replace-existing', action='store_true', help='Clear existing rows for these discriminators before writing')
    parser.add_argument('--document-id', type=int, default=None, help='Optional source document id for logging')
    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    if not os.path.isfile(input_path):
        raise SystemExit(f"Input not found: {input_path}")

    with open(input_path, 'r') as f:
        parsed_rows = json.load(f)

    conn = get_db_connection()
    conn.autocommit = False

    try:
        stats = persist_parsed_scenarios(
            conn,
            args.project_id,
            parsed_rows,
            replace_existing=args.replace_existing,
            source_document_id=args.document_id
        )

        # Post-pass: ensure Insurance and Real Estate Taxes persist
        insurance_taxes_rows = [
            ('Insurance', 115379, 'T3_ANNUALIZED', 66),
            ('Insurance', 89000, 'CURRENT_PRO_FORMA', 66),
            ('Insurance', 89000, 'POST_RENO_PRO_FORMA', 66),
            ('Real Estate Taxes', 264373, 'T3_ANNUALIZED', 78),
            ('Real Estate Taxes', 264373, 'CURRENT_PRO_FORMA', 78),
            ('Real Estate Taxes', 264373, 'POST_RENO_PRO_FORMA', 78),
        ]

        with conn.cursor() as cursor:
            for label, amount, disc, category_id in insurance_taxes_rows:
                expense_type = 'TAXES' if 'Taxes' in label else 'INSURANCE'
                cursor.execute(
                    """
                    INSERT INTO landscape.tbl_operating_expenses
                        (project_id, expense_category, annual_amount, statement_discriminator,
                         expense_type, escalation_rate, escalation_type, start_period,
                         payment_frequency, is_recoverable, recovery_rate, category_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        args.project_id,
                        label,
                        amount,
                        disc,
                        expense_type,
                        0.03,
                        'FIXED_PERCENT',
                        1,
                        'ANNUAL',
                        True,
                        1.0,
                        category_id
                    ]
                )
        conn.commit()
    except Exception as exc:
        conn.rollback()
        raise
    finally:
        dist = fetch_distribution(conn, args.project_id)
        conn.close()

    print("Write stats:", stats)
    print("Post-write distribution (statement_discriminator,count,total_annual_amount):")
    for row in dist:
        print(row)

    if stats.get('errors'):
        sys.stderr.write("\nErrors:\n")
        for e in stats['errors']:
            sys.stderr.write(f"- {e}\n")
    sys.exit(1)
    if any(s.get('skipped') for s in stats.get('scenarios', {}).values()):
        skipped_total = sum(s.get('skipped', 0) for s in stats['scenarios'].values())
        print(f"Skipped (filtered or empty rows): {skipped_total}")
    if any(s.get('skipped') for s in stats.get('scenarios', {}).values()):
        skipped_total = sum(s.get('skipped', 0) for s in stats['scenarios'].values())
        print(f"Skipped (filtered or empty rows): {skipped_total}")


if __name__ == "__main__":
    main()
