#!/usr/bin/env python3
"""Generate CONTEXT_DIFF markdown by comparing current and previous snapshots."""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
from typing import Any

from context_utils import markdown_table, read_json, slug_date_from_name


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate daily context diff")
    parser.add_argument("--repo-root", default=None, help="Repository root path")
    parser.add_argument("--current-dir", default=None, help="Current output directory")
    parser.add_argument("--history-dir", default=None, help="History output directory")
    parser.add_argument("--today", default=datetime.now().strftime("%Y-%m-%d"), help="Date label")
    parser.add_argument("--output", required=False, help="Output markdown file path")
    return parser.parse_args()


def load_snapshot(directory: Path, prefix: str, date_hint: str | None = None) -> tuple[dict[str, Any], str | None]:
    pattern = f"{prefix}_*.json"
    candidates = sorted(directory.glob(pattern))
    if date_hint:
        hinted = [path for path in candidates if date_hint in path.name]
        if hinted:
            candidates = hinted
    if not candidates:
        return {}, None

    path = candidates[-1]
    data = read_json(path)
    return data, slug_date_from_name(path.name)


def latest_history_dir(history_dir: Path, today: str) -> Path | None:
    if not history_dir.exists():
        return None

    candidates = [path for path in history_dir.iterdir() if path.is_dir() and path.name.startswith("20")]
    if not candidates:
        return None
    return sorted(candidates, key=lambda p: p.name)[-1]


def file_inventory(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    records = snapshot.get("repo_files", []) if isinstance(snapshot, dict) else []
    output: dict[str, dict[str, Any]] = {}
    for record in records:
        path = record.get("path")
        if not path:
            continue
        output[str(path)] = {
            "lines": int(record.get("lines", 0)),
            "hash": str(record.get("hash", "")),
            "size": int(record.get("size", 0)),
        }
    return output


def component_sets(snapshot: dict[str, Any]) -> tuple[set[str], dict[str, str]]:
    names: set[str] = set()
    by_file: dict[str, str] = {}
    for row in snapshot.get("react_components", []) if isinstance(snapshot, dict) else []:
        name = str(row.get("component", "")).strip()
        file_path = str(row.get("file", "")).strip()
        if not name:
            continue
        names.add(name)
        if file_path:
            by_file[file_path] = name
    return names, by_file


def endpoint_sets(snapshot: dict[str, Any]) -> tuple[set[str], set[str]]:
    django = set()
    for row in snapshot.get("django_endpoints", []) if isinstance(snapshot, dict) else []:
        django.add(f"{row.get('methods', 'UNKNOWN')} {row.get('pattern', '')}".strip())

    nextjs = set()
    for row in snapshot.get("next_routes", []) if isinstance(snapshot, dict) else []:
        nextjs.add(f"{row.get('methods', 'UNKNOWN')} {row.get('route', '')}".strip())

    return django, nextjs


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parent.parent
    current_dir = Path(args.current_dir).resolve() if args.current_dir else repo_root / "docs" / "daily-context" / "current"
    history_dir = Path(args.history_dir).resolve() if args.history_dir else repo_root / "docs" / "daily-context" / "history"
    output_path = (
        Path(args.output).resolve()
        if args.output
        else (current_dir / f"CONTEXT_DIFF_{args.today}.md").resolve()
    )

    current_audit, _ = load_snapshot(current_dir, "AUDIT_SNAPSHOT", args.today)
    current_schema, _ = load_snapshot(current_dir, "SCHEMA_SNAPSHOT", args.today)
    current_migrations, _ = load_snapshot(current_dir, "MIGRATION_SNAPSHOT", args.today)

    previous_dir = latest_history_dir(history_dir, args.today)
    previous_date = previous_dir.name if previous_dir else "N/A"

    if previous_dir:
        previous_audit, _ = load_snapshot(previous_dir, "AUDIT_SNAPSHOT", previous_date)
        previous_schema, _ = load_snapshot(previous_dir, "SCHEMA_SNAPSHOT", previous_date)
        previous_migrations, _ = load_snapshot(previous_dir, "MIGRATION_SNAPSHOT", previous_date)
    else:
        previous_audit, previous_schema, previous_migrations = {}, {}, {}

    curr_files = file_inventory(current_audit)
    prev_files = file_inventory(previous_audit)

    curr_paths = set(curr_files)
    prev_paths = set(prev_files)

    new_files = sorted(curr_paths - prev_paths)
    removed_files = sorted(prev_paths - curr_paths)

    modified_files = []
    for path in sorted(curr_paths & prev_paths):
        if curr_files[path]["hash"] == prev_files[path]["hash"]:
            continue
        curr_lines = curr_files[path]["lines"]
        prev_lines = prev_files[path]["lines"]
        added = max(curr_lines - prev_lines, 0)
        removed = max(prev_lines - curr_lines, 0)
        modified_files.append((path, added, removed, curr_lines - prev_lines))

    modified_files.sort(key=lambda item: (item[1] + item[2], abs(item[3])), reverse=True)

    curr_tables = set(current_schema.get("tables", []) if isinstance(current_schema, dict) else [])
    prev_tables = set(previous_schema.get("tables", []) if isinstance(previous_schema, dict) else [])
    new_tables = sorted(curr_tables - prev_tables)
    removed_tables = sorted(prev_tables - curr_tables)

    curr_signatures = current_schema.get("table_signatures", {}) if isinstance(current_schema, dict) else {}
    prev_signatures = previous_schema.get("table_signatures", {}) if isinstance(previous_schema, dict) else {}
    modified_tables = sorted(
        table
        for table in sorted(curr_tables & prev_tables)
        if curr_signatures.get(table) and prev_signatures.get(table) and curr_signatures.get(table) != prev_signatures.get(table)
    )

    curr_django, curr_next = endpoint_sets(current_audit)
    prev_django, prev_next = endpoint_sets(previous_audit)

    new_django = sorted(curr_django - prev_django)
    removed_django = sorted(prev_django - curr_django)
    new_next = sorted(curr_next - prev_next)
    removed_next = sorted(prev_next - curr_next)

    curr_components, curr_component_file_map = component_sets(current_audit)
    prev_components, _ = component_sets(previous_audit)

    new_components = sorted(curr_components - prev_components)
    removed_components = sorted(prev_components - curr_components)

    modified_components: list[str] = []
    for path, _, _, net in modified_files:
        component = curr_component_file_map.get(path)
        if component:
            modified_components.append(f"{component} ({'+' if net >= 0 else ''}{net} lines)")

    curr_styling = current_audit.get("styling", {}) if isinstance(current_audit, dict) else {}
    prev_styling = previous_audit.get("styling", {}) if isinstance(previous_audit, dict) else {}

    curr_violation_total = int(curr_styling.get("hex_count", 0)) + int(curr_styling.get("tailwind_count", 0)) + int(curr_styling.get("dark_count", 0))
    prev_violation_total = int(prev_styling.get("hex_count", 0)) + int(prev_styling.get("tailwind_count", 0)) + int(prev_styling.get("dark_count", 0))
    violation_delta = curr_violation_total - prev_violation_total

    curr_sql = set(current_migrations.get("sql_migrations", []) if isinstance(current_migrations, dict) else [])
    prev_sql = set(previous_migrations.get("sql_migrations", []) if isinstance(previous_migrations, dict) else [])
    new_sql_migrations = sorted(curr_sql - prev_sql)

    lines: list[str] = []
    lines.append(f"# Context Diff — {args.today} vs {previous_date}")

    if not previous_dir:
        lines.append("")
        lines.append("## Summary")
        lines.append("- No previous snapshot found. Baseline context generated.")
        lines.append(f"- Current files indexed: {len(curr_files)}")
        lines.append(f"- Current database tables indexed: {len(curr_tables)}")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return 0

    lines.append("")
    lines.append("## Summary")
    lines.append(f"- **New files added:** {len(new_files)}")
    lines.append(f"- **Files removed:** {len(removed_files)}")
    lines.append(f"- **Files modified:** {len(modified_files)}")
    lines.append(f"- **New database tables:** {len(new_tables)}")
    lines.append(f"- **New API endpoints:** {len(new_django) + len(new_next)}")
    lines.append(f"- **New components:** {len(new_components)}")
    lines.append(
        f"- **Styling violations change:** {violation_delta:+d} (was {prev_violation_total}, now {curr_violation_total})"
    )

    lines.append("\n## New Files")
    if new_files:
        for path in new_files[:200]:
            lines.append(f"- `{path}`")
    else:
        lines.append("- (none)")

    lines.append("\n## Removed Files")
    if removed_files:
        for path in removed_files[:200]:
            lines.append(f"- `{path}`")
    else:
        lines.append("- (none)")

    lines.append("\n## Modified Files (by most lines changed)")
    if modified_files:
        rows = [[path, f"+{added}", f"-{removed}", f"{net:+d}"] for path, added, removed, net in modified_files[:200]]
        lines.append(markdown_table(["File", "Lines Added", "Lines Removed", "Net Change"], rows))
    else:
        lines.append("- (none)")

    lines.append("\n## Database Changes")
    lines.append(f"- **New tables:** {', '.join(f'`{name}`' for name in new_tables) if new_tables else '(none)'}")
    lines.append(f"- **Removed tables:** {', '.join(f'`{name}`' for name in removed_tables) if removed_tables else '(none)'}")
    lines.append(
        f"- **Modified tables:** {', '.join(f'`{name}`' for name in modified_tables[:50]) if modified_tables else '(none)'}"
    )
    lines.append(
        f"- **New migrations:** {', '.join(f'`{name}`' for name in new_sql_migrations) if new_sql_migrations else '(none)'}"
    )

    lines.append("\n## API Changes")
    lines.append(
        f"- **New Django endpoints:** {', '.join(f'`{value}`' for value in new_django[:30]) if new_django else '(none)'}"
    )
    lines.append(
        f"- **Removed Django endpoints:** {', '.join(f'`{value}`' for value in removed_django[:30]) if removed_django else '(none)'}"
    )
    lines.append(
        f"- **New Next.js routes:** {', '.join(f'`{value}`' for value in new_next[:30]) if new_next else '(none)'}"
    )
    lines.append(
        f"- **Removed Next.js routes:** {', '.join(f'`{value}`' for value in removed_next[:30]) if removed_next else '(none)'}"
    )

    lines.append("\n## Component Changes")
    lines.append(f"- **New:** {', '.join(f'`{name}`' for name in new_components[:50]) if new_components else '(none)'}")
    lines.append(f"- **Removed:** {', '.join(f'`{name}`' for name in removed_components[:50]) if removed_components else '(none)'}")
    lines.append(
        f"- **Modified:** {', '.join(f'`{name}`' for name in modified_components[:50]) if modified_components else '(none)'}"
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
