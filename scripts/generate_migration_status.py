#!/usr/bin/env python3
"""Generate MIGRATION_STATUS markdown and JSON snapshot for daily context."""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
from typing import Any

from context_utils import check_db_status, markdown_table, relpath, write_json


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate migration status")
    parser.add_argument("--repo-root", default=None, help="Repository root path")
    parser.add_argument("--output", required=True, help="Output markdown file path")
    parser.add_argument("--json-out", required=False, help="Output JSON snapshot path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parent.parent
    output_path = Path(args.output).resolve()

    db_status = check_db_status(repo_root)

    sql_dir = repo_root / "migrations"
    sql_migrations = sorted(path for path in sql_dir.glob("*.sql") if path.is_file()) if sql_dir.exists() else []

    latest_sql = sql_migrations[-1] if sql_migrations else None
    latest_sql_rel = relpath(latest_sql, repo_root) if latest_sql else "—"
    latest_sql_date = datetime.fromtimestamp(latest_sql.stat().st_mtime).strftime("%Y-%m-%d") if latest_sql else "—"

    apps_dir = repo_root / "backend" / "apps"
    django_rows: list[list[str]] = []
    django_snapshot: dict[str, Any] = {}

    if apps_dir.exists():
        for app_dir in sorted(apps_dir.iterdir()):
            if not app_dir.is_dir() or app_dir.name.startswith("."):
                continue

            mig_dir = app_dir / "migrations"
            if not mig_dir.exists():
                continue

            migration_files = sorted(path for path in mig_dir.glob("*.py") if path.name != "__init__.py")
            if not migration_files:
                continue

            latest = migration_files[-1].stem
            django_rows.append([app_dir.name, str(len(migration_files)), latest])
            django_snapshot[app_dir.name] = {
                "count": len(migration_files),
                "latest": latest,
                "files": [path.stem for path in migration_files],
            }

    lines: list[str] = []
    lines.append("# Migration Status")
    lines.append("")
    lines.append("## Summary")
    lines.append(f"- **Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S %Z')}")

    if not db_status.available:
        lines.append("- **DATABASE UNAVAILABLE:** Migration report generated without live DB verification")
        if db_status.error:
            lines.append(f"- **DB Error:** {db_status.error}")

    lines.append(f"- **Total SQL Migrations:** {len(sql_migrations)}")
    lines.append(f"- **Latest Migration:** `{latest_sql_rel}` ({latest_sql_date})")

    lines.append("\n## SQL Migrations")
    if sql_migrations:
        sql_rows = []
        for migration in sql_migrations:
            sql_rows.append(
                [
                    migration.name,
                    datetime.fromtimestamp(migration.stat().st_mtime).strftime("%Y-%m-%d"),
                    str(migration.stat().st_size),
                ]
            )
        lines.append(markdown_table(["File", "Last Modified", "Size (bytes)"], sql_rows))
    else:
        lines.append("No SQL migrations found.")

    lines.append("\n## Django Migrations by App")
    lines.append(markdown_table(["App", "Migrations", "Latest"], django_rows))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    if args.json_out:
        snapshot = {
            "generated_at": datetime.now().isoformat(),
            "db_available": db_status.available,
            "db_error": db_status.error,
            "sql_migrations": [migration.name for migration in sql_migrations],
            "django_migrations": django_snapshot,
            "latest_sql": latest_sql.name if latest_sql else None,
        }
        write_json(Path(args.json_out).resolve(), snapshot)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
