#!/usr/bin/env python3
"""ALLOWED_UPDATES Field Auditor — Landscape Platform
Cross-checks Landscaper tool ALLOWED_UPDATES fields against actual DB columns.
Detects silent write failures.
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

def find_allowed_updates_blocks(content):
    """Find all ALLOWED_UPDATES with their associated table name."""
    results = []
    
    # Pattern: look for table_name near ALLOWED_UPDATES
    # Common patterns:
    #   table_name = "tbl_foo"  ... ALLOWED_UPDATES = {"col1": ..., "col2": ...}
    #   ALLOWED_UPDATES = {"col1": ...}  with table_name = "tbl_foo" nearby
    
    au_matches = list(re.finditer(r'ALLOWED_UPDATES\s*=\s*\{([^}]+)\}', content))
    table_matches = list(re.finditer(r'table_name\s*=\s*["\'](\w+)["\']', content))
    
    for au_match in au_matches:
        keys = re.findall(r'["\'](\w+)["\']\s*:', au_match.group(1))
        
        # Find nearest table_name declaration (before this ALLOWED_UPDATES)
        table = None
        au_pos = au_match.start()
        best_dist = float('inf')
        for tm in table_matches:
            dist = abs(au_pos - tm.start())
            if dist < best_dist:
                best_dist = dist
                table = tm.group(1)
        
        if table and keys:
            results.append({"table": table, "fields": keys})
    
    return results

def main():
    db_url = get_db_url()
    if not db_url:
        print(json.dumps({"agent": "allowed-updates-auditor", "status": "ERROR", "message": "No DATABASE_URL"}))
        return

    tools_checked = 0
    critical_mismatches = []
    warnings = []

    for tools_dir in TOOLS_DIRS:
        if not os.path.isdir(tools_dir):
            continue
        for py_file in Path(tools_dir).rglob("*.py"):
            content = py_file.read_text(errors="ignore")
            if "ALLOWED_UPDATES" not in content:
                continue
            
            rel_path = str(py_file.relative_to(REPO_ROOT))
            blocks = find_allowed_updates_blocks(content)
            
            for block in blocks:
                tools_checked += 1
                table = block["table"]
                fields = block["fields"]
                
                # Get actual columns
                live_cols = set(query_db(db_url,
                    f"SELECT column_name FROM information_schema.columns "
                    f"WHERE table_schema = 'landscape' AND table_name = '{table}'"))
                
                if not live_cols:
                    critical_mismatches.append({
                        "file": rel_path,
                        "table": table,
                        "issue": "table_not_found",
                        "fields": fields
                    })
                    continue
                
                # Fields in ALLOWED_UPDATES but not in DB
                missing = [f for f in fields if f not in live_cols]
                if missing:
                    critical_mismatches.append({
                        "file": rel_path,
                        "table": table,
                        "issue": "columns_not_in_db",
                        "missing_columns": missing
                    })

    status = "PASS"
    if critical_mismatches:
        status = "FAIL"
    elif warnings:
        status = "WARN"

    print(json.dumps({
        "agent": "allowed-updates-auditor",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "tools_checked": tools_checked,
        "critical_mismatches": len(critical_mismatches),
        "details": critical_mismatches[:20],
    }, indent=2))

if __name__ == "__main__":
    main()
