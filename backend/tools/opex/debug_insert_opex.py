"""
Debug script to insert a single OpEx row and surface exact DB errors.

Usage:
  DATABASE_URL=... python3 backend/tools/opex/debug_insert_opex.py
"""

from __future__ import annotations

import argparse
import sys
from typing import Optional

import os
import psycopg2


def _print_db_error(error: psycopg2.Error) -> None:
    print("Insert failed with database error:")
    print(f"- pgcode: {getattr(error, 'pgcode', None)}")
    print(f"- pgerror: {getattr(error, 'pgerror', None)}")
    diag = getattr(error, "diag", None)
    if diag:
        print(f"- constraint: {getattr(diag, 'constraint_name', None)}")
        print(f"- table: {getattr(diag, 'table_name', None)}")
        print(f"- column: {getattr(diag, 'column_name', None)}")
        print(f"- detail: {getattr(diag, 'message_detail', None)}")
        print(f"- hint: {getattr(diag, 'message_hint', None)}")


def get_connection() -> psycopg2.extensions.connection:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")

    if "channel_binding" not in database_url:
        sep = "&" if "?" in database_url else "?"
        database_url = f"{database_url}{sep}channel_binding=require"

    return psycopg2.connect(database_url)


def insert_opex(
    project_id: int,
    category_id: int,
    label: str,
    amount: float,
    per_unit: Optional[float],
    per_sf: Optional[float],
    escalation_rate: float,
) -> int:
    insert_sql = """
        INSERT INTO landscape.tbl_operating_expenses (
            project_id,
            expense_category,
            expense_type,
            annual_amount,
            amount_per_sf,
            start_period,
            escalation_rate,
            unit_amount,
            category_id,
            statement_discriminator,
            notes
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        RETURNING opex_id
    """

    params = [
        project_id,
        label,
        "TAXES",
        amount,
        per_sf,
        1,
        escalation_rate,
        per_unit,
        category_id,
        "default",
        "debug_insert_opex",
    ]

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(insert_sql, params)
            opex_id = cursor.fetchone()[0]
        conn.commit()
        return opex_id


def main() -> int:
    parser = argparse.ArgumentParser(description="Insert a debug OpEx row.")
    parser.add_argument("--project-id", type=int, default=54)
    parser.add_argument("--category-id", type=int, default=53)
    parser.add_argument("--label", type=str, default="Real Estate Taxes")
    parser.add_argument("--amount", type=float, default=117560)
    parser.add_argument("--per-unit", type=float, default=2939)
    parser.add_argument("--per-sf", type=float, default=4.20)
    parser.add_argument("--escalation-rate", type=float, default=0.03)
    args = parser.parse_args()

    print("Attempting OpEx insert with:")
    print(
        f"- project_id={args.project_id} category_id={args.category_id} "
        f"label='{args.label}' amount={args.amount}"
    )

    try:
        opex_id = insert_opex(
            project_id=args.project_id,
            category_id=args.category_id,
            label=args.label,
            amount=args.amount,
            per_unit=args.per_unit,
            per_sf=args.per_sf,
            escalation_rate=args.escalation_rate,
        )
        print(f"Insert succeeded: opex_id={opex_id}")
        return 0
    except psycopg2.Error as error:
        _print_db_error(error)
        return 1
    except Exception as error:
        print(f"Insert failed with error: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
