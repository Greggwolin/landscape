#!/usr/bin/env python3
"""Generate SCHEMA_EXPORT markdown and JSON snapshot for daily context."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from context_utils import check_db_status, db_connect, markdown_table, read_json, write_json

GROUP_ORDER = ["tbl_", "core_", "bmk_", "lu_", "dms_", "ai_", "knowledge_", "other"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate daily schema export")
    parser.add_argument("--repo-root", default=None, help="Repository root path")
    parser.add_argument("--output", required=True, help="Output markdown file path")
    parser.add_argument("--json-out", required=False, help="Output JSON snapshot path")
    return parser.parse_args()


def table_group(table_name: str) -> str:
    for prefix in GROUP_ORDER[:-1]:
        if table_name.startswith(prefix):
            return prefix
    return "other"


def latest_rich_schema_path(schema_dir: Path) -> Path | None:
    candidates = sorted(schema_dir.glob("landscape_rich_schema_20*.json"))
    return candidates[-1] if candidates else None


def run_rich_export(repo_root: Path) -> tuple[bool, str | None]:
    backend_dir = repo_root / "backend"
    if not backend_dir.exists():
        return False, "backend directory not found"

    cmd = [sys.executable, "manage.py", "export_rich_schema", "--schema", "landscape"]
    proc = subprocess.run(
        cmd,
        cwd=str(backend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return False, (proc.stderr.strip() or proc.stdout.strip() or "unknown exporter error")
    return True, None


def query_db_extras(repo_root: Path) -> tuple[dict[str, int], dict[tuple[str, str], str], dict[str, list[str]], str | None]:
    row_estimates: dict[str, int] = {}
    udt_by_column: dict[tuple[str, str], str] = {}
    enum_labels: dict[str, list[str]] = defaultdict(list)

    try:
        conn = db_connect(repo_root)
    except Exception as exc:
        return row_estimates, udt_by_column, enum_labels, str(exc)

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.relname AS table_name, GREATEST(c.reltuples::bigint, 0) AS estimated_rows
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'landscape' AND c.relkind = 'r'
                ORDER BY c.relname
                """
            )
            for table_name, estimated_rows in cursor.fetchall():
                row_estimates[table_name] = int(estimated_rows)

            cursor.execute(
                """
                SELECT table_name, column_name, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'landscape'
                """
            )
            for table_name, column_name, udt_name in cursor.fetchall():
                udt_by_column[(table_name, column_name)] = str(udt_name)

            cursor.execute(
                """
                SELECT t.typname, e.enumlabel
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'landscape'
                ORDER BY t.typname, e.enumsortorder
                """
            )
            for type_name, label in cursor.fetchall():
                enum_labels[type_name].append(label)

        return row_estimates, udt_by_column, enum_labels, None
    finally:
        conn.close()


def format_column_type(column: dict[str, Any]) -> str:
    data_type = str(column.get("data_type") or "unknown")
    char_len = column.get("character_maximum_length")
    precision = column.get("numeric_precision")
    scale = column.get("numeric_scale")

    if char_len and data_type in {"character varying", "character", "varchar"}:
        return f"{data_type}({char_len})"
    if precision and data_type in {"numeric", "decimal"}:
        return f"{data_type}({precision},{scale or 0})"
    return data_type


def choose_last_modified_column(columns: list[dict[str, Any]]) -> str:
    names = [str(col.get("column_name")) for col in columns]
    for candidate in ["updated_at", "modified_at", "last_modified_at", "updated_on"]:
        if candidate in names:
            return candidate
    return "—"


def build_table_signature(
    table_name: str,
    table_columns: list[dict[str, Any]],
    table_indexes: list[dict[str, Any]],
    table_checks: list[str],
    table_fks: list[dict[str, Any]],
) -> str:
    payload = {
        "table": table_name,
        "columns": [
            {
                "name": col.get("column_name"),
                "type": col.get("data_type"),
                "nullable": col.get("is_nullable"),
                "default": col.get("column_default"),
            }
            for col in table_columns
        ],
        "indexes": sorted(table_indexes),
        "checks": sorted(table_checks),
        "fks": sorted(table_fks, key=lambda x: (x.get("column_name"), x.get("referenced_table"), x.get("referenced_column"))),
    }
    raw = json.dumps(payload, sort_keys=True)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parent.parent
    output_path = Path(args.output).resolve()

    db_status = check_db_status(repo_root)
    exporter_error: str | None = None
    rich_schema_data: dict[str, Any] | None = None

    if db_status.available:
        ok, error = run_rich_export(repo_root)
        if not ok:
            exporter_error = error
            db_status.available = False
            db_status.error = error

    schema_dir = repo_root / "docs" / "schema"
    rich_path = latest_rich_schema_path(schema_dir) if db_status.available else None

    if rich_path and rich_path.exists():
        rich_schema_data = read_json(rich_path)

    markdown_lines: list[str] = []
    snapshot: dict[str, Any] = {
        "generated_at": datetime.now().isoformat(),
        "db_available": db_status.available,
        "db_error": db_status.error,
        "tables": [],
        "table_signatures": {},
    }

    if not db_status.available or not rich_schema_data:
        markdown_lines.append("# Schema Export")
        markdown_lines.append("")
        markdown_lines.append("## DATABASE UNAVAILABLE")
        if exporter_error:
            markdown_lines.append(f"- **Error:** {exporter_error}")
        elif db_status.error:
            markdown_lines.append(f"- **Error:** {db_status.error}")
        else:
            markdown_lines.append("- **Error:** Unable to refresh schema export from database")

        markdown_lines.append("- **Status:** Schema export could not be generated from live database.")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("\n".join(markdown_lines) + "\n", encoding="utf-8")

        if args.json_out:
            write_json(Path(args.json_out).resolve(), snapshot)
        return 0

    row_estimates, udt_by_column, enum_labels, extras_error = query_db_extras(repo_root)

    tables = rich_schema_data.get("tables", [])
    indexes = rich_schema_data.get("indexes", [])
    constraints = rich_schema_data.get("constraints", [])
    foreign_keys = rich_schema_data.get("foreign_keys", [])

    # The rich exporter includes column metadata objects that may cover views.
    # Restrict this report to real base tables when row_estimate metadata is available.
    base_table_names = set(row_estimates.keys())
    if base_table_names:
        tables = [table for table in tables if str(table.get("table_name")) in base_table_names]
        indexes = [idx for idx in indexes if str(idx.get("table_name")) in base_table_names]
        constraints = [c for c in constraints if str(c.get("table_name")) in base_table_names]
        foreign_keys = [fk for fk in foreign_keys if str(fk.get("table_name")) in base_table_names]

    indexes_by_table: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for idx in indexes:
        indexes_by_table[str(idx.get("table_name"))].append(idx)

    checks_by_table: dict[str, list[str]] = defaultdict(list)
    for constraint in constraints:
        if str(constraint.get("constraint_type", "")).upper() == "CHECK":
            checks_by_table[str(constraint.get("table_name"))].append(str(constraint.get("constraint_definition") or ""))

    fks_by_table: dict[str, list[dict[str, Any]]] = defaultdict(list)
    fk_ref_by_table_col: dict[tuple[str, str], str] = {}
    for fk in foreign_keys:
        table_name = str(fk.get("table_name"))
        fks_by_table[table_name].append(fk)
        fk_ref_by_table_col[(table_name, str(fk.get("column_name")))] = f"{fk.get('referenced_table')}.{fk.get('referenced_column')}"

    grouped_tables: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for table in tables:
        grouped_tables[table_group(str(table.get("table_name")))].append(table)

    markdown_lines.append("# Schema Export")
    markdown_lines.append("")
    markdown_lines.append("## Summary")
    markdown_lines.append(f"- **Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S %Z')}")
    markdown_lines.append(f"- **Schema:** landscape")
    markdown_lines.append(f"- **Table Count:** {len(tables)}")
    markdown_lines.append(f"- **Index Count:** {len(indexes)}")
    markdown_lines.append(f"- **Foreign Key Count:** {len(foreign_keys)}")
    if extras_error:
        markdown_lines.append(f"- **Row Estimates/Enums:** PARTIAL ({extras_error})")

    markdown_lines.append("\n## Tables by Domain Prefix")
    for group in GROUP_ORDER:
        markdown_lines.append(f"- **{group}:** {len(grouped_tables.get(group, []))} tables")

    markdown_lines.append("\n## Foreign Key Relationship Map")
    fk_rows: list[list[str]] = []
    for table_name in sorted(fks_by_table.keys()):
        refs = sorted(
            {
                f"{fk.get('column_name')} -> {fk.get('referenced_table')}.{fk.get('referenced_column')}"
                for fk in fks_by_table[table_name]
            }
        )
        fk_rows.append([table_name, "; ".join(refs)])
    markdown_lines.append(markdown_table(["Table", "References"], fk_rows))

    table_signatures: dict[str, str] = {}

    for group in GROUP_ORDER:
        group_tables = sorted(grouped_tables.get(group, []), key=lambda x: str(x.get("table_name")))
        if not group_tables:
            continue

        markdown_lines.append(f"\n## Group: {group}")
        for table in group_tables:
            table_name = str(table.get("table_name"))
            columns = table.get("columns", [])
            table_indexes = indexes_by_table.get(table_name, [])
            table_checks = checks_by_table.get(table_name, [])
            table_fks = fks_by_table.get(table_name, [])

            row_count = row_estimates.get(table_name, -1)
            row_text = str(row_count) if row_count >= 0 else "UNKNOWN"
            last_modified_column = choose_last_modified_column(columns)

            markdown_lines.append(f"\n## {table_name}")
            markdown_lines.append(f"**Row Count (estimated):** {row_text}")
            markdown_lines.append(f"**Last Modified Column:** {last_modified_column}")
            markdown_lines.append("")

            column_rows: list[list[str]] = []
            for col in columns:
                col_name = str(col.get("column_name"))
                col_type = format_column_type(col)
                nullable = str(col.get("is_nullable") or "").upper()
                default = str(col.get("column_default") or "—")
                fk_ref = fk_ref_by_table_col.get((table_name, col_name), "—")
                column_rows.append([col_name, col_type, nullable, default, fk_ref])

            markdown_lines.append(
                markdown_table(
                    ["Column", "Type", "Nullable", "Default", "FK Reference"],
                    column_rows,
                )
            )

            if table_indexes:
                markdown_lines.append("\n**Indexes:**")
                for idx in sorted(table_indexes, key=lambda x: str(x.get("index_name"))):
                    markdown_lines.append(f"- `{idx.get('index_name')}` — `{idx.get('index_definition')}`")
            else:
                markdown_lines.append("\n**Indexes:** none")

            enum_notes: list[str] = []
            for col in columns:
                key = (table_name, str(col.get("column_name")))
                udt_name = udt_by_column.get(key)
                if not udt_name:
                    continue
                labels = enum_labels.get(udt_name)
                if labels:
                    enum_notes.append(f"{col.get('column_name')}: {udt_name} = [{', '.join(labels)}]")

            if enum_notes:
                markdown_lines.append("\n**Enum Values:**")
                for note in enum_notes:
                    markdown_lines.append(f"- {note}")

            if table_checks:
                markdown_lines.append("\n**Check Constraints:**")
                for check_def in sorted(table_checks):
                    markdown_lines.append(f"- `{check_def}`")

            signature = build_table_signature(
                table_name=table_name,
                table_columns=columns,
                table_indexes=[idx.get("index_definition") for idx in table_indexes],
                table_checks=table_checks,
                table_fks=table_fks,
            )
            table_signatures[table_name] = signature

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(markdown_lines) + "\n", encoding="utf-8")

    snapshot.update(
        {
            "tables": sorted(table_signatures.keys()),
            "table_signatures": table_signatures,
            "row_estimates": {k: row_estimates.get(k, -1) for k in sorted(table_signatures.keys())},
        }
    )

    if args.json_out:
        write_json(Path(args.json_out).resolve(), snapshot)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
