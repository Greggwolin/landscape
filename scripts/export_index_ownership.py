#!/usr/bin/env python3
"""
Export landscape index ownership metadata without exposing secrets.
"""

import csv
import os
import sys
from pathlib import Path


QUERY = """
WITH idx AS (
  SELECT
    ns.nspname AS schema_name,
    t.relname  AS table_name,
    i.relname  AS index_name,
    i.oid      AS index_oid,
    pg_get_indexdef(i.oid) AS indexdef
  FROM pg_class i
  JOIN pg_index ix      ON ix.indexrelid = i.oid
  JOIN pg_class t       ON t.oid = ix.indrelid
  JOIN pg_namespace ns  ON ns.oid = t.relnamespace
  WHERE ns.nspname = 'landscape'
    AND t.relkind IN ('r','p')
)
SELECT
  schema_name,
  table_name,
  index_name,
  index_oid,
  indexdef,
  EXISTS (
    SELECT 1 FROM pg_constraint con
    WHERE con.conindid = idx.index_oid
  ) AS is_constraint_owned,
  (
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conindid = idx.index_oid
    LIMIT 1
  ) AS constraint_name,
  (
    SELECT con.contype
    FROM pg_constraint con
    WHERE con.conindid = idx.index_oid
    LIMIT 1
  ) AS constraint_type
FROM idx
ORDER BY schema_name, table_name, index_name;
"""


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    backend_dir = repo_root / "backend"
    sys.path.insert(0, str(backend_dir))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        import django
        django.setup()
        from django.db import connection
    except Exception as exc:
        print("Failed to initialize Django DB connection.", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 1

    output_path = repo_root / "docs" / "schema" / "landscape_index_ownership.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with connection.cursor() as cursor:
        cursor.execute(QUERY)
        rows = cursor.fetchall()
        headers = [col[0] for col in cursor.description]

    with output_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
