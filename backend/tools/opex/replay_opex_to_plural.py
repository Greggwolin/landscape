#!/usr/bin/env python3
"""
Replay operating expenses from tbl_operating_expense (singular) into
tbl_operating_expenses (plural) without Django dependencies.

Usage:
  python3 backend/tools/opex/replay_opex_to_plural.py --project-id 42 --statement-discriminator default
"""

import argparse
import csv
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
from apps.knowledge.services.opex_utils import upsert_opex_entry  # noqa: E402


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


def fetch_singular_rows(conn, project_id):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT expense_category, category_name, amount
            FROM landscape.tbl_operating_expense
            WHERE project_id = %s
        """, [project_id])
        return cur.fetchall()


def count_plural(conn, project_id):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT statement_discriminator, COUNT(*)::int
            FROM landscape.tbl_operating_expenses
            WHERE project_id = %s
            GROUP BY statement_discriminator
        """, [project_id])
        return cur.fetchall()


def main():
    parser = argparse.ArgumentParser(description="Replay OpEx into tbl_operating_expenses")
    parser.add_argument('--project-id', type=int, required=True)
    parser.add_argument('--statement-discriminator', default='default')
    parser.add_argument('--doc-type', default='T12')
    args = parser.parse_args()

    conn = get_db_connection()
    conn.autocommit = False
    unmapped = []
    try:
        before = count_plural(conn, args.project_id)
        print("Before counts (statement_discriminator,count):", before)

        rows = fetch_singular_rows(conn, args.project_id)
        print(f"Found {len(rows)} rows in tbl_operating_expense for project {args.project_id}")

        for expense_category, category_name, amount in rows:
            label = category_name or expense_category
            selector = {
                'category': label,
                'statement_discriminator': args.statement_discriminator,
                'document_type': args.doc_type
            }
            result = upsert_opex_entry(conn, args.project_id, label, amount, selector)
            if not result.get('success'):
                unmapped.append((label, amount, result.get('error')))
                print(f"Unmapped: {label} amount={amount} error={result.get('error')}", file=sys.stderr)

        conn.commit()
        after = count_plural(conn, args.project_id)
        print("After counts (statement_discriminator,count):", after)

        with conn.cursor() as cur:
            cur.execute("""
                SELECT expense_category, expense_type, annual_amount, account_id, category_id, statement_discriminator
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s
                ORDER BY expense_category, expense_type
            """, [args.project_id])
            rows_after = cur.fetchall()
            writer = csv.writer(sys.stdout)
            writer.writerow(['expense_category', 'expense_type', 'annual_amount', 'account_id', 'category_id', 'statement_discriminator'])
            for r in rows_after:
                writer.writerow(r)

        if unmapped:
            sys.stderr.write(f"Unmapped items: {len(unmapped)}\n")
            for row in unmapped:
                sys.stderr.write(str(row) + "\n")
            sys.exit(1)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
