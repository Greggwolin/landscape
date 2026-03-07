#!/usr/bin/env python3
"""Generate a human-readable cleanup plan from file-audit.json"""

import json, sys, os
from pathlib import Path
from datetime import datetime

def format_size(b):
    if b > 1024*1024: return f"{b/1024/1024:.1f} MB"
    if b > 1024: return f"{b/1024:.0f} KB"
    return f"{b} bytes"

def pick_keeper(files):
    """Pick the file to keep — prefer: deepest folder path, then newest modified."""
    scored = []
    for f in files:
        depth = f["path"].count(os.sep)
        scored.append((depth, f.get("modified", ""), f))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return scored[0][2]

def suggest_folder(name, ext):
    """Suggest a subfolder for a loose root file based on name/extension."""
    name_lower = name.lower()
    ext_lower = ext.lower()
    
    # Financial / accounting
    if any(w in name_lower for w in ["budget", "funding", "cash flow", "cf model", "cost estimate", "fee calc"]):
        return "Project Docs/4-Accounting"
    if any(w in name_lower for w in ["invoice", "inv_"]):
        return "Project Docs/4-Accounting/Invoices"
    if any(w in name_lower for w in ["k-1", "k1", "tax", "federal"]):
        return "Project Docs/4-Accounting/Tax Returns"
    
    # Legal / corporate
    if any(w in name_lower for w in ["agreement", "agmt", "contract", "amendment", "ppm", "subscription"]):
        return "Corporate/Company Files"
    if any(w in name_lower for w in ["loan", "note ", "deed"]):
        return "Corporate/Company Files/LoanDocs-2020"
    
    # Marketing / design
    if any(w in name_lower for w in ["marketing", "brochure", "flyer"]):
        return "Project Docs/5-Management/Marketing"
    if ext_lower in [".psd", ".ai", ".indd"]:
        return "Project Docs/5-Management/Marketing"
    
    # Maps / GIS
    if any(w in name_lower for w in ["map", "aerial", "parcel", "gis", "plat"]):
        return "Project Docs/5-Management/Maps&Aerials"
    if ext_lower in [".shp", ".shx", ".dbf", ".prj", ".kml", ".kmz"]:
        return "Project Docs/5-Management/Maps&Aerials"
    if any(w in name_lower for w in ["housing", "competitive", "lucid"]):
        return "Project Docs/5-Management/Maps&Aerials"
    
    # Market data
    if any(w in name_lower for w in ["comp", "permit", "sale", "supply", "demand", "market"]):
        return "Project Docs/5-Management/Market Data"
    
    # Engineering
    if any(w in name_lower for w in ["cvl", "grading", "drainage", "offsite", "engineering"]):
        return "External/Red Valley - Property Materials"
    
    # Operations
    if any(w in name_lower for w in ["report", "scan", "letter", "nathan"]):
        return "Project Docs/5-Management/Operations"
    
    # Property docs
    if any(w in name_lower for w in ["property tax", "notice"]):
        return "Project Docs/5-Management/Operations"
    
    return None  # Can't determine — flag for manual review

def main():
    with open(sys.argv[1]) as f:
        audit = json.load(f)
    
    output = sys.argv[2] if len(sys.argv) > 2 else None
    
    lines = []
    def w(line=""): lines.append(line)
    
    w("# CBLF1 File Cleanup Plan")
    w(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    w(f"**Source:** {audit['root']}")
    w(f"**Total files:** {audit['summary']['total_files']} ({audit['summary']['total_size_mb']} MB)")
    w()
    w("⚠️ **REVIEW EVERY ACTION BEFORE EXECUTING.** Nothing runs automatically.")
    w("Mark each line ✅ to approve or ❌ to skip.")
    w()
    
    # === SECTION 1: EXACT DUPLICATES ===
    w("---")
    w("## 1. Exact Duplicates — DELETE redundant copies")
    w()
    total_wasted = sum(d["wasted_bytes"] for d in audit["exact_duplicates"])
    w(f"**{audit['summary']['exact_duplicate_files']} duplicate files** in {audit['summary']['exact_duplicate_groups']} groups")
    w(f"**Space recoverable:** {format_size(total_wasted)}")
    w()
    
    for i, dupe in enumerate(audit["exact_duplicates"], 1):
        keeper = pick_keeper(dupe["files"])
        w(f"### Duplicate Group {i} ({dupe['count']} copies, {format_size(dupe['size'])} each)")
        w()
        w(f"**KEEP:** `{keeper['path']}`")
        w()
        for f in dupe["files"]:
            if f["path"] == keeper["path"]:
                continue
            w(f"- [ ] DELETE: `{f['path']}`")
        w()
    
    # === SECTION 2: ROOT LOOSE FILES ===
    w("---")
    w("## 2. Loose Files in Root — MOVE to appropriate folders")
    w()
    w(f"**{len(audit['root_loose_files'])} files** sitting in the top-level folder")
    w()
    
    auto_suggest = []
    manual_review = []
    
    for f in audit["root_loose_files"]:
        suggestion = suggest_folder(f["name"], f["ext"])
        if suggestion:
            auto_suggest.append((f, suggestion))
        else:
            manual_review.append(f)
    
    if auto_suggest:
        w("### Suggested moves:")
        w()
        for f, dest in auto_suggest:
            w(f"- [ ] MOVE `{f['name']}` → `{dest}/`")
        w()
    
    if manual_review:
        w("### Needs manual review (couldn't determine folder):")
        w()
        for f in manual_review:
            w(f"- [ ] `{f['name']}` ({f['ext']}, {format_size(f['size'])}, modified {f['modified'][:10]})")
        w()
    
    # === SECTION 3: RENAME SUGGESTIONS ===
    w("---")
    w("## 3. Rename Suggestions — clean up messy names")
    w()
    
    import re
    rename_candidates = []
    for f in audit["root_loose_files"] + [item for group in audit.get("exact_duplicates", []) for item in group["files"]]:
        name = f.get("name", f.get("path", "").split("/")[-1])
        if re.search(r"(Gregg'?s? (iMac|MacBook Pro|MacBook|Mac))", name, re.IGNORECASE):
            clean = re.sub(r"[-_ ]?(Gregg'?s? (iMac|MacBook Pro|MacBook|Mac))", "", name, flags=re.IGNORECASE).strip(" -_")
            rename_candidates.append((f.get("path", name), name, clean))
        elif re.search(r"\(by [^)]+\)", name):
            clean = re.sub(r"\s*\(by [^)]+\)", "", name).strip()
            rename_candidates.append((f.get("path", name), name, clean))
        elif re.search(r"^Scan \d{4}-\d{2}-\d{2}", name):
            rename_candidates.append((f.get("path", name), name, None))
    
    # Deduplicate
    seen = set()
    unique_renames = []
    for path, old, new in rename_candidates:
        if old not in seen:
            seen.add(old)
            unique_renames.append((path, old, new))
    
    if unique_renames:
        for path, old, new in unique_renames:
            if new:
                w(f"- [ ] RENAME `{old}` → `{new}`")
            else:
                w(f"- [ ] RENAME `{old}` → ❓ (needs descriptive name — what is this scan?)")
        w()
    
    # === SUMMARY ===
    w("---")
    w("## Summary of Actions")
    w()
    w(f"| Action | Count |")
    w(f"|--------|-------|")
    w(f"| Delete duplicates | {audit['summary']['exact_duplicate_files']} files |")
    w(f"| Move to folders | {len(auto_suggest)} files (auto-suggested) |")
    w(f"| Manual review | {len(manual_review)} files |")
    w(f"| Rename | {len(unique_renames)} files |")
    w(f"| Space recovered | {format_size(total_wasted)} |")
    w()
    w("---")
    w("*Review this plan, mark approved actions, then hand back to Gern for execution.*")
    
    content = "\n".join(lines)
    if output:
        with open(output, 'w') as out:
            out.write(content)
        print(f"Plan written to {output}", file=sys.stderr)
    else:
        print(content)

if __name__ == "__main__":
    main()
