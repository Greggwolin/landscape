#!/usr/bin/env python3
"""
Re-run 59 failed documents with per-doc throwaway projects.
Each doc gets its own project_id to avoid staging constraint collisions.
"""
import os
import sys
import json
import time
import requests
import psycopg2
from pathlib import Path
from datetime import datetime

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = os.environ.get("LANDSCAPE_API_URL", "http://localhost:8000")
DATABASE_URL = os.environ["DATABASE_URL"]
ORIG_PROJECT_ID = int(os.environ.get("ORIG_PROJECT_ID",
    json.load(open(Path(__file__).parent / "test_results_118.json"))["project_id"]))

USERNAME = os.environ.get("TEST_USERNAME", "noel")
PASSWORD = os.environ.get("TEST_PASSWORD", "TestPass123!")
USER_ID = 20  # Noel

EXTRACT_DELAY = 2
POLL_INTERVAL = 5
POLL_TIMEOUT = 120  # 2 min per doc


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
def get_jwt_token(session):
    resp = session.post(f"{BASE_URL}/api/token/", json={
        "username": USERNAME, "password": PASSWORD
    })
    resp.raise_for_status()
    data = resp.json()
    if "tokens" in data:
        return data["tokens"]["access"]
    return data.get("access") or data.get("token")


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
def get_failed_doc_ids(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT d.doc_id, d.doc_name
            FROM landscape.core_doc d
            WHERE d.project_id = %s
              AND d.doc_id NOT IN (
                SELECT DISTINCT doc_id
                FROM landscape.ai_extraction_staging
                WHERE project_id = %s
              )
            ORDER BY d.doc_id
        """, [ORIG_PROJECT_ID, ORIG_PROJECT_ID])
        return cur.fetchall()


def create_throwaway_project(conn, doc_name, idx):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO landscape.tbl_project (
                project_name, project_type_code,
                analysis_perspective, analysis_purpose,
                created_by_id, is_active
            ) VALUES (
                %s, 'MF', 'INVESTMENT', 'VALUATION', %s, true
            )
            RETURNING project_id
        """, [f"QP_RETRY_{idx:03d}_{doc_name[:40]}", USER_ID])
        project_id = cur.fetchone()[0]
        conn.commit()
        return project_id


def reassign_doc_to_project(conn, doc_id, new_project_id):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE landscape.core_doc
            SET project_id = %s, updated_at = NOW()
            WHERE doc_id = %s
        """, [new_project_id, doc_id])
        conn.commit()


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------
def trigger_extraction(session, headers, doc_id, project_id):
    resp = session.post(
        f"{BASE_URL}/api/knowledge/documents/{doc_id}/extract-batched/",
        json={"project_id": project_id, "property_type": "multifamily"},
        headers=headers
    )
    if resp.status_code in (200, 202):
        return True
    else:
        print(f"  EXTRACT FAILED doc_id={doc_id}: {resp.status_code} {resp.text[:200]}")
        return False


def poll_project_staging(session, headers, project_id, timeout=120):
    start = time.time()
    last_count = 0
    stable = 0
    while time.time() - start < timeout:
        resp = session.get(
            f"{BASE_URL}/api/knowledge/projects/{project_id}/extraction-staging/",
            headers=headers
        )
        if resp.status_code == 200:
            data = resp.json()
            rows = data.get("extractions", data.get("results", []))
            count = len(rows) if isinstance(rows, list) else 0
            if count > 0 and count == last_count:
                stable += 1
                if stable >= 3:  # 15s stable
                    return count
            else:
                stable = 0
            last_count = count
        time.sleep(POLL_INTERVAL)
    return last_count


def accept_and_commit(session, headers, project_id):
    # Accept
    resp = session.post(
        f"{BASE_URL}/api/knowledge/projects/{project_id}/extraction-staging/accept-all-pending/",
        json={}, headers=headers
    )
    accepted = 0
    if resp.status_code == 200:
        accepted = resp.json().get("updated", resp.json().get("accepted", 0))

    # Commit
    resp = session.post(
        f"{BASE_URL}/api/knowledge/projects/{project_id}/extraction-staging/commit/",
        json={"commit_all_accepted": True}, headers=headers
    )
    committed = failed = 0
    errors = []
    if resp.status_code == 200:
        result = resp.json()
        committed = result.get("committed", result.get("applied", 0))
        failed = result.get("failed", 0)
        errors = result.get("errors", [])

    return accepted, committed, failed, errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"\n{'='*60}")
    print(f"59-DOCUMENT RETRY — Per-Doc Throwaway Projects")
    print(f"Original Project: {ORIG_PROJECT_ID} | User: noel (id={USER_ID})")
    print(f"Started: {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    conn = psycopg2.connect(DATABASE_URL)
    failed_docs = get_failed_doc_ids(conn)
    print(f"Failed docs to retry: {len(failed_docs)}\n")

    if not failed_docs:
        print("No failed docs found. Exiting.")
        return

    session = requests.Session()
    print("=== AUTH ===")
    token = get_jwt_token(session)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print(f"  JWT acquired\n")

    # Snapshot before
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM landscape.knowledge_entities WHERE created_by_id = %s", [USER_ID])
        entities_before = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM landscape.knowledge_facts WHERE created_by_id = %s", [USER_ID])
        facts_before = cur.fetchone()[0]
    print(f"Before: {entities_before} entities, {facts_before} facts\n")

    results = []

    for i, (doc_id, doc_name) in enumerate(failed_docs):
        print(f"--- [{i+1}/{len(failed_docs)}] doc_id={doc_id}: {doc_name[:50]} ---")

        # 1. Create throwaway project
        project_id = create_throwaway_project(conn, doc_name, i + 1)
        print(f"  Project: {project_id}")

        # 2. Reassign doc
        reassign_doc_to_project(conn, doc_id, project_id)

        # 3. Trigger extraction
        ok = trigger_extraction(session, headers, doc_id, project_id)
        if not ok:
            results.append({"doc_id": doc_id, "doc_name": doc_name,
                          "project_id": project_id, "status": "extract_failed"})
            continue

        # 4. Poll for staging rows
        time.sleep(EXTRACT_DELAY)
        staging_rows = poll_project_staging(session, headers, project_id, timeout=POLL_TIMEOUT)
        print(f"  Staging: {staging_rows} rows")

        if staging_rows == 0:
            print(f"  WARNING: No staging rows after {POLL_TIMEOUT}s")
            results.append({"doc_id": doc_id, "doc_name": doc_name,
                          "project_id": project_id, "status": "no_staging",
                          "staging_rows": 0})
            continue

        # 5. Accept + Commit
        accepted, committed, failed, errors = accept_and_commit(session, headers, project_id)
        print(f"  Accepted: {accepted}, Committed: {committed}, Failed: {failed}")
        if errors:
            for e in errors[:3]:
                print(f"    ERR: {e.get('field_key','')} — {str(e.get('error',''))[:80]}")

        results.append({
            "doc_id": doc_id, "doc_name": doc_name, "project_id": project_id,
            "status": "ok" if committed > 0 else ("partial" if accepted > 0 else "commit_failed"),
            "staging_rows": staging_rows, "accepted": accepted,
            "committed": committed, "failed": failed
        })

    # Final counts
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM landscape.knowledge_entities WHERE created_by_id = %s", [USER_ID])
        entities_after = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM landscape.knowledge_facts WHERE created_by_id = %s", [USER_ID])
        facts_after = cur.fetchone()[0]
    conn.close()

    ok_count = sum(1 for r in results if r["status"] == "ok")
    partial_count = sum(1 for r in results if r["status"] == "partial")
    fail_count = len(results) - ok_count - partial_count
    total_committed = sum(r.get("committed", 0) for r in results)
    total_failed_rows = sum(r.get("failed", 0) for r in results)

    print(f"\n{'='*60}")
    print(f"RETRY COMPLETE — {datetime.now().isoformat()}")
    print(f"{'='*60}")
    print(f"  Docs processed:  {len(results)}/{len(failed_docs)}")
    print(f"  Successful:      {ok_count}")
    print(f"  Partial:         {partial_count}")
    print(f"  Failed:          {fail_count}")
    print(f"  Rows committed:  {total_committed}")
    print(f"  Rows failed:     {total_failed_rows}")
    print(f"  Entities: {entities_before} → {entities_after} (+{entities_after - entities_before})")
    print(f"  Facts:    {facts_before} → {facts_after} (+{facts_after - facts_before})")

    retry_results = {
        "timestamp": datetime.now().isoformat(),
        "original_project_id": ORIG_PROJECT_ID,
        "docs_retried": len(failed_docs),
        "ok": ok_count, "partial": partial_count, "failed": fail_count,
        "total_committed": total_committed,
        "total_failed_rows": total_failed_rows,
        "entities_before": entities_before, "entities_after": entities_after,
        "facts_before": facts_before, "facts_after": facts_after,
        "per_doc": results
    }

    results_file = Path(__file__).parent / "test_results_59_retry.json"
    with open(results_file, 'w') as f:
        json.dump(retry_results, f, indent=2, default=str)
    print(f"\n  Results saved: {results_file}")


if __name__ == "__main__":
    main()
