#!/usr/bin/env python3
"""Dead Tool Detector — Landscape Platform
Scans Landscaper tools for references to DB tables/columns that don't exist.
Output: JSON to stdout
"""

import json, os, re, sys, subprocess
from pathlib import Path
from datetime import datetime, timezone

REPO_ROOT = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parents[2])
TOOLS_DIRS = [
    os.path.join(REPO_ROOT, "backend/apps/landscaper/tools"),
    os.path.join(REPO_ROOT, "backend/services/landscaper"),
]

def get_db_url():
    env_file = os.path.join(REPO_ROOT, ".env.local")
    if os.path.exists(env_file):
        for line in open(env_file):
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("NEON_DATABASE_URL", "")

def query_db(db_url, sql):
    try:
        result = subprocess.run(
            ["psql", db_url, "-t", "-A", "-c", sql],
            capture_output=True, text=True, timeout=15
        )
        return [r.strip() for r in result.stdout.strip().split("\n") if r.strip()]
    except Exception:
        return []

def extract_table_refs(content):
    patterns = [
        r'FROM\s+landscape\.(\w+)',
        r'INTO\s+landscape\.(\w+)',
        r'UPDATE\s+landscape\.(\w+)',
        r'table_name\s*=\s*["\'](\w+)["\']',
        r'JOIN\s+landscape\.(\w+)',
    ]
    tables = set()
    for p in patterns:
        tables.update(re.findall(p, content, re.IGNORECASE))
    return tables

def extract_allowed_updates(content):
    """Extract ALLOWED_UPDATES dict keys mapped to their table context."""
    results = []
    # Find ALLOWED_UPDATES = { ... } blocks
    for match in re.finditer(r'ALLOWED_UPDATES\s*=\s*\{([^}]+)\}', content):
        block = match.group(1)
        keys = re.findall(r'["\'](\w+)["\']', block)
        results.extend(keys)
    return results

def main():
    db_url = get_db_url()
    if not db_url:
        print(json.dumps({"agent": "dead-tool-detector", "status": "ERROR", "message": "No DATABASE_URL"}))
        return

    # Get live tables
    live_tables = set(query_db(db_url, 
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'landscape'"))
    
    if not live_tables:
        print(json.dumps({"agent": "dead-tool-detector", "status": "ERROR", "message": "Could not query tables"}))
        return

    # Get columns per table (lazy, query as needed)
    columns_cache = {}
    def get_columns(table):
        if table not in columns_cache:
            columns_cache[table] = set(query_db(db_url,
                f"SELECT column_name FROM information_schema.columns WHERE table_schema = 'landscape' AND table_name = '{table}'"))
        return columns_cache[table]

    dead_tables = []
    dead_columns = []
    tools_scanned = 0

    for tools_dir in TOOLS_DIRS:
        if not os.path.isdir(tools_dir):
            continue
        for py_file in Path(tools_dir).rglob("*.py"):
            content = py_file.read_text(errors="ignore")
            if "@register_tool" not in content and "ALLOWED_UPDATES" not in content:
                continue
            
            tools_scanned += 1
            rel_path = str(py_file.relative_to(REPO_ROOT))
            
            # Check table references
            for table in extract_table_refs(content):
                if table not in live_tables:
                    dead_tables.append({"file": rel_path, "table": table})
            
            # Check ALLOWED_UPDATES columns
            au_keys = extract_allowed_updates(content)
            tables_in_file = extract_table_refs(content)
            for table in tables_in_file:
                if table in live_tables:
                    live_cols = get_columns(table)
                    for key in au_keys:
                        if key not in live_cols and key not in live_tables:
                            dead_columns.append({"file": rel_path, "table": table, "column": key})

    status = "PASS"
    if dead_tables:
        status = "FAIL"
    elif dead_columns:
        status = "WARN"

    print(json.dumps({
        "agent": "dead-tool-detector",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "tools_scanned": tools_scanned,
        "dead_table_refs": len(dead_tables),
        "dead_column_refs": len(dead_columns),
        "dead_tables": dead_tables[:20],
        "dead_columns": dead_columns[:20],
    }, indent=2))

if __name__ == "__main__":
    main()
