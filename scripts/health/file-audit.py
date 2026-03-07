#!/usr/bin/env python3
"""File Audit — scans a folder for duplicates, suggests organization.
Usage: python3 file-audit.py <folder_path> <output_json>
"""

import hashlib, json, os, sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone

def hash_file(path, chunk_size=65536):
    """SHA256 hash of file contents."""
    h = hashlib.sha256()
    try:
        with open(path, 'rb') as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()
    except (PermissionError, OSError) as e:
        return f"ERROR:{e}"

def get_file_info(path, root):
    """Get metadata for a single file."""
    stat = os.stat(path)
    rel = os.path.relpath(path, root)
    ext = Path(path).suffix.lower()
    return {
        "path": rel,
        "name": os.path.basename(path),
        "ext": ext,
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "created": datetime.fromtimestamp(stat.st_birthtime, tz=timezone.utc).isoformat() if hasattr(stat, 'st_birthtime') else None,
    }

def find_name_clusters(files):
    """Group files that look like variants of the same base name."""
    # Strip common suffixes: " copy", "-Gregg's MacBook Pro", " (1)", etc.
    import re
    def normalize(name):
        name = Path(name).stem
        # Remove device suffixes
        name = re.sub(r"[-_ ](Gregg'?s? (iMac|MacBook Pro|MacBook|Mac))", "", name, flags=re.IGNORECASE)
        # Remove copy/duplicate markers
        name = re.sub(r"[-_ ]?(copy|Copy|\(\d+\))", "", name)
        # Remove version suffixes
        name = re.sub(r"[-_ ]?v\d+", "", name, flags=re.IGNORECASE)
        # Remove trailing whitespace/underscores
        name = name.strip(" _-")
        return name.lower()

    clusters = defaultdict(list)
    for f in files:
        key = normalize(f["name"])
        clusters[key].append(f)

    # Only return clusters with 2+ files
    return {k: v for k, v in clusters.items() if len(v) > 1}

def main():
    folder = sys.argv[1]
    output = sys.argv[2] if len(sys.argv) > 2 else None

    root = os.path.abspath(folder)
    print(f"Scanning {root}...", file=sys.stderr)

    # Collect all files
    files = []
    errors = []
    skip_names = {".DS_Store", "Thumbs.db", "desktop.ini", ".Icon\r"}

    for dirpath, dirnames, filenames in os.walk(root):
        for fname in filenames:
            if fname in skip_names or fname.startswith("._"):
                continue
            fpath = os.path.join(dirpath, fname)
            try:
                info = get_file_info(fpath, root)
                files.append(info)
            except Exception as e:
                errors.append({"path": os.path.relpath(fpath, root), "error": str(e)})

    print(f"Found {len(files)} files. Hashing...", file=sys.stderr)

    # Hash all files
    hash_map = defaultdict(list)
    for i, f in enumerate(files):
        if (i + 1) % 100 == 0:
            print(f"  Hashed {i+1}/{len(files)}...", file=sys.stderr)
        fpath = os.path.join(root, f["path"])
        h = hash_file(fpath)
        f["hash"] = h
        if not h.startswith("ERROR:"):
            hash_map[h].append(f)

    # Find exact duplicates (same hash)
    exact_dupes = {h: group for h, group in hash_map.items() if len(group) > 1}

    # Find name-based clusters (possible variants)
    name_clusters = find_name_clusters(files)

    # Files in root that should probably be in subfolders
    root_files = [f for f in files if os.sep not in f["path"]]

    # Build report
    report = {
        "scan_timestamp": datetime.now(timezone.utc).isoformat(),
        "root": root,
        "summary": {
            "total_files": len(files),
            "total_size_mb": round(sum(f["size"] for f in files) / 1024 / 1024, 1),
            "exact_duplicate_groups": len(exact_dupes),
            "exact_duplicate_files": sum(len(g) - 1 for g in exact_dupes.values()),
            "name_variant_groups": len(name_clusters),
            "files_in_root": len(root_files),
            "scan_errors": len(errors),
        },
        "file_type_counts": {},
        "exact_duplicates": [],
        "name_variants": [],
        "root_loose_files": [],
        "errors": errors[:20],
    }

    # File type counts
    ext_counts = defaultdict(int)
    for f in files:
        ext_counts[f["ext"]] += 1
    report["file_type_counts"] = dict(sorted(ext_counts.items(), key=lambda x: -x[1]))

    # Exact duplicates detail
    for h, group in sorted(exact_dupes.items(), key=lambda x: -x[1][0]["size"]):
        wasted = group[0]["size"] * (len(group) - 1)
        report["exact_duplicates"].append({
            "hash": h[:12],
            "size": group[0]["size"],
            "wasted_bytes": wasted,
            "count": len(group),
            "files": [{"path": f["path"], "modified": f["modified"]} for f in group],
        })

    # Name variants detail
    for key, group in sorted(name_clusters.items(), key=lambda x: -len(x[1])):
        report["name_variants"].append({
            "base_name": key,
            "count": len(group),
            "files": [{"path": f["path"], "size": f["size"], "modified": f["modified"], "hash": f.get("hash", "")[:12]} for f in group],
        })

    # Root loose files
    for f in sorted(root_files, key=lambda x: x["name"]):
        report["root_loose_files"].append({
            "name": f["name"],
            "size": f["size"],
            "ext": f["ext"],
            "modified": f["modified"],
        })

    if output:
        with open(output, 'w') as out:
            json.dump(report, out, indent=2)
        print(f"\nReport written to {output}", file=sys.stderr)
    else:
        print(json.dumps(report, indent=2))

    # Print summary
    s = report["summary"]
    print(f"\n=== SUMMARY ===", file=sys.stderr)
    print(f"Total files: {s['total_files']} ({s['total_size_mb']} MB)", file=sys.stderr)
    print(f"Exact duplicates: {s['exact_duplicate_files']} files in {s['exact_duplicate_groups']} groups", file=sys.stderr)
    print(f"Name variants: {s['name_variant_groups']} groups", file=sys.stderr)
    print(f"Loose files in root: {s['files_in_root']}", file=sys.stderr)

if __name__ == "__main__":
    main()
