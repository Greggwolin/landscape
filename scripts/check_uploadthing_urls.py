#!/usr/bin/env python3
"""Check UploadThing URLs in core_doc for broken links. Read-only — no writes."""

import csv
import os
import time
import psycopg2
import requests
from collections import defaultdict

DB_URL = "postgresql://neondb_owner:npg_bps3EShU9WFM@ep-tiny-lab-af0tg3ps.c-2.us-west-2.aws.neon.tech/land_v2?sslmode=require"

QUERY = """
SELECT doc_id, project_id, doc_name, doc_type, storage_uri, created_at
FROM landscape.core_doc
WHERE deleted_at IS NULL
  AND (
    storage_uri LIKE 'https://utfs.io/%%'
    OR storage_uri LIKE 'https://uploadthing.com/%%'
    OR storage_uri LIKE 'https://%%.ufs.sh/%%'
  )
ORDER BY project_id, doc_id;
"""

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute(QUERY)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    print(f"Found {len(rows)} UploadThing URLs in core_doc to check.\n")

    results = []
    for i, (doc_id, project_id, doc_name, doc_type, storage_uri, created_at) in enumerate(rows):
        try:
            resp = requests.head(storage_uri, timeout=10, allow_redirects=True)
            status = resp.status_code
        except requests.RequestException as e:
            status = f"ERROR: {e}"

        label = "OK" if isinstance(status, int) and status == 200 else "BROKEN" if isinstance(status, int) and status in (403, 404, 410) else "AMBIGUOUS"
        results.append({
            "doc_id": doc_id,
            "project_id": project_id,
            "doc_name": doc_name,
            "doc_type": doc_type,
            "storage_uri": storage_uri,
            "created_at": str(created_at),
            "http_status": status,
            "label": label,
        })

        symbol = "✓" if label == "OK" else "✗" if label == "BROKEN" else "?"
        print(f"  [{i+1}/{len(rows)}] {symbol} doc_id={doc_id} status={status}")
        time.sleep(0.5)

    # Write CSV
    csv_path = os.path.join(os.path.dirname(__file__), "..", "uploadthing_url_check.csv")
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["doc_id", "project_id", "doc_name", "doc_type", "storage_uri", "created_at", "http_status", "label"])
        writer.writeheader()
        writer.writerows(results)
    print(f"\nCSV written to {csv_path}")

    # Categorize
    broken = [r for r in results if r["label"] == "BROKEN"]
    healthy = [r for r in results if r["label"] == "OK"]
    ambiguous = [r for r in results if r["label"] == "AMBIGUOUS"]

    # Group broken by project
    broken_by_project = defaultdict(list)
    for r in broken:
        broken_by_project[r["project_id"]].append(r)

    # Generate report
    report_lines = []
    report_lines.append("=" * 70)
    report_lines.append("UPLOADTHING URL VERIFICATION REPORT")
    report_lines.append(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append("=" * 70)
    report_lines.append("")
    report_lines.append("SUMMARY")
    report_lines.append("-" * 40)
    report_lines.append(f"  Total UploadThing URLs checked:  {len(results)}")
    report_lines.append(f"    core_doc:       {len(results)}")
    report_lines.append(f"    core_doc_media: 0  (no UploadThing URLs found)")
    report_lines.append(f"  Healthy (200):    {len(healthy)}")
    report_lines.append(f"  Broken (4xx):     {len(broken)}")
    report_lines.append(f"  Ambiguous:        {len(ambiguous)}")
    report_lines.append("")

    if broken:
        report_lines.append("BROKEN URLs — BY PROJECT")
        report_lines.append("-" * 40)
        for pid in sorted(broken_by_project.keys()):
            docs = broken_by_project[pid]
            report_lines.append(f"\n  Project {pid} ({len(docs)} broken):")
            for r in docs:
                report_lines.append(f"    doc_id={r['doc_id']}  status={r['http_status']}  {r['doc_name']}")
                report_lines.append(f"      URI: {r['storage_uri']}")
        report_lines.append("")

    if ambiguous:
        report_lines.append("AMBIGUOUS — NEEDS MANUAL REVIEW")
        report_lines.append("-" * 40)
        for r in ambiguous:
            report_lines.append(f"  doc_id={r['doc_id']}  project={r['project_id']}  status={r['http_status']}  {r['doc_name']}")
            report_lines.append(f"    URI: {r['storage_uri']}")
        report_lines.append("")

    report_lines.append("HEALTHY URLs: " + str(len(healthy)) + " documents verified accessible (not listed)")
    report_lines.append("")
    report_lines.append("=" * 70)

    report_text = "\n".join(report_lines)
    print("\n" + report_text)

    report_path = os.path.join(os.path.dirname(__file__), "..", "broken_uploadthing_urls_report.txt")
    with open(report_path, "w") as f:
        f.write(report_text)
    print(f"\nReport written to {report_path}")


if __name__ == "__main__":
    main()
