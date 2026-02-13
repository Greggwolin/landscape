#!/usr/bin/env python3
"""Shared helpers for daily context generation scripts."""

from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

try:
    import psycopg2
except Exception:  # pragma: no cover - handled by callers
    psycopg2 = None


@dataclass
class DbStatus:
    available: bool
    error: str | None = None
    server_version: str | None = None


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        values[key] = value
    return values


def get_database_url(repo_root: Path) -> str | None:
    env_db = os.environ.get("DATABASE_URL")
    if env_db:
        return env_db

    backend_env = read_env_file(repo_root / "backend" / ".env")
    if backend_env.get("DATABASE_URL"):
        return backend_env["DATABASE_URL"]

    root_env = read_env_file(repo_root / ".env")
    if root_env.get("DATABASE_URL"):
        return root_env["DATABASE_URL"]

    return None


def check_db_status(repo_root: Path, schema: str = "landscape") -> DbStatus:
    if psycopg2 is None:
        return DbStatus(available=False, error="psycopg2 is not installed")

    database_url = get_database_url(repo_root)
    if not database_url:
        return DbStatus(available=False, error="DATABASE_URL not found in backend/.env or environment")

    try:
        conn = psycopg2.connect(database_url, connect_timeout=6)
        try:
            with conn.cursor() as cursor:
                cursor.execute(f"SET search_path TO {schema}, public")
                cursor.execute("SHOW server_version")
                version = cursor.fetchone()[0]
            return DbStatus(available=True, server_version=version)
        finally:
            conn.close()
    except Exception as exc:  # pragma: no cover - depends on network/db
        return DbStatus(available=False, error=str(exc))


def db_connect(repo_root: Path):
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is not installed")

    database_url = get_database_url(repo_root)
    if not database_url:
        raise RuntimeError("DATABASE_URL not found in backend/.env or environment")

    conn = psycopg2.connect(database_url, connect_timeout=8)
    with conn.cursor() as cursor:
        cursor.execute("SET search_path TO landscape, public")
    conn.commit()
    return conn


def run_command(command: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        err = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"Command failed: {' '.join(command)}\n{err}")
    return result.stdout.strip()


def safe_run_command(command: list[str], cwd: Path | None = None) -> str | None:
    try:
        return run_command(command, cwd=cwd)
    except Exception:
        return None


def relpath(path: Path, repo_root: Path) -> str:
    return str(path.resolve().relative_to(repo_root.resolve()))


def count_lines(path: Path) -> int:
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as handle:
            return sum(1 for _ in handle)
    except Exception:
        return 0


def file_mtime_date(path: Path) -> str:
    try:
        return datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d")
    except Exception:
        return "unknown"


def markdown_table(headers: list[str], rows: Iterable[list[str]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "|" + "|".join(["-" * (len(h) + 2) for h in headers]) + "|",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
    return "\n".join(lines)


def slug_date_from_name(name: str) -> str | None:
    match = re.search(r"(20\d{2}-\d{2}-\d{2})", name)
    return match.group(1) if match else None


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))
