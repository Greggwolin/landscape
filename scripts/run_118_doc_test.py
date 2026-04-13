#!/usr/bin/env python3
"""
118-Document Pipeline Test — User B (Noel, user_id=20)
Uploads 118 Excel files, triggers AI extraction, accepts + commits.
Tagged QP_BATCH_002 for cleanup.
"""
import os
import sys
import json
import time
import requests
from pathlib import Path
from datetime import datetime

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = os.environ.get("LANDSCAPE_API_URL", "http://localhost:8000")
PROJECT_ID = int(os.environ["TEST_PROJECT_ID"])  # throwaway project
TEST_DIR = Path(__file__).parent / "test_documents"
MANIFEST_FILE = TEST_DIR / "document_manifest.json"
BATCH_TAG = "QP_BATCH_002"

# User B credentials
USERNAME = os.environ.get("TEST_USERNAME", "noel")
PASSWORD = os.environ.get("TEST_PASSWORD", "TestPass123!")

# Timing
EXTRACT_POLL_INTERVAL = 10   # seconds between polling
EXTRACT_TIMEOUT = 3600       # 1 hour max for all extractions
EXTRACT_CONCURRENCY_DELAY = 2  # seconds between triggering extractions


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
def get_jwt_token(session):
    """Get JWT access token for User B."""
    resp = session.post(f"{BASE_URL}/api/auth/login/", json={
        "username": USERNAME,
        "password": PASSWORD
    })
    if resp.status_code != 200:
        resp = session.post(f"{BASE_URL}/api/token/", json={
            "username": USERNAME,
            "password": PASSWORD
        })
    resp.raise_for_status()
    data = resp.json()
    # Handle nested tokens structure: {"user": ..., "tokens": {"access": ...}}
    tokens = data.get("tokens", {})
    token = (tokens.get("access") if isinstance(tokens, dict) else None) or \
            data.get("access") or data.get("token") or data.get("access_token")
    if not token:
        raise ValueError(f"Could not extract token from response: {data.keys()}")
    return token


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------
def upload_document(session, headers, file_path, doc_type=None):
    """Upload a single document. Returns doc_id."""
    with open(file_path, 'rb') as f:
        files = {'file': (file_path.name, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        data = {'project_id': str(PROJECT_ID)}
        if doc_type:
            data['doc_type'] = doc_type
        resp = session.post(
            f"{BASE_URL}/api/dms/upload/",
            files=files,
            data=data,
            headers={k: v for k, v in headers.items() if k != 'Content-Type'}
        )
    resp.raise_for_status()
    result = resp.json()

    if result.get("collision"):
        print(f"  COLLISION ({result['match_type']}): {file_path.name} → existing doc_id={result['existing_doc']['doc_id']}")
        return result['existing_doc']['doc_id'], True
    else:
        print(f"  UPLOADED: {file_path.name} → doc_id={result['doc_id']}")
        return result['doc_id'], False


def trigger_extraction(session, headers, doc_id):
    """Trigger batched AI extraction for a document."""
    resp = session.post(
        f"{BASE_URL}/api/knowledge/documents/{doc_id}/extract-batched/",
        json={
            "project_id": PROJECT_ID,
            "property_type": "multifamily"
        },
        headers=headers
    )
    if resp.status_code in (200, 202):
        return True
    else:
        print(f"  EXTRACT FAILED doc_id={doc_id}: {resp.status_code} {resp.text[:200]}")
        return False


def poll_staging(session, headers, expected_docs):
    """Poll staging until all extractions are done or timeout."""
    start = time.time()
    completed_docs = set()
    stable_count = 0

    while time.time() - start < EXTRACT_TIMEOUT:
        resp = session.get(
            f"{BASE_URL}/api/knowledge/projects/{PROJECT_ID}/extraction-staging/",
            headers=headers
        )
        if resp.status_code != 200:
            print(f"  POLL ERROR: {resp.status_code}")
            time.sleep(EXTRACT_POLL_INTERVAL)
            continue

        data = resp.json()
        extractions = data.get("extractions", data.get("results", []))
        if isinstance(data, list):
            extractions = data

        doc_ids_in_staging = set()
        for e in extractions:
            did = e.get("doc_id") or e.get("document_id")
            if did:
                doc_ids_in_staging.add(did)

        total_rows = len(extractions)
        status_counts = {}
        for e in extractions:
            s = e.get("status", "unknown")
            status_counts[s] = status_counts.get(s, 0) + 1

        elapsed = int(time.time() - start)
        print(f"  [{elapsed}s] STAGING: {len(doc_ids_in_staging)} docs, {total_rows} rows | {status_counts}")

        if len(doc_ids_in_staging) >= expected_docs * 0.9:
            print(f"  Extraction complete: {len(doc_ids_in_staging)}/{expected_docs} docs have staging rows")
            return data

        if len(doc_ids_in_staging) == len(completed_docs) and len(doc_ids_in_staging) > 0:
            stable_count += 1
            if stable_count >= 6:  # 60 seconds with no change
                print(f"  No new docs for 60s. Proceeding with {len(doc_ids_in_staging)} docs.")
                return data
        else:
            stable_count = 0

        completed_docs = doc_ids_in_staging
        time.sleep(EXTRACT_POLL_INTERVAL)

    print(f"  TIMEOUT after {EXTRACT_TIMEOUT}s. {len(completed_docs)} docs extracted.")
    return None


def accept_all_pending(session, headers):
    """Bulk-accept all pending staging rows."""
    resp = session.post(
        f"{BASE_URL}/api/knowledge/projects/{PROJECT_ID}/extraction-staging/accept-all-pending/",
        json={},
        headers=headers
    )
    resp.raise_for_status()
    result = resp.json()
    print(f"  ACCEPTED: {result.get('updated', result.get('accepted', 0))} rows")
    return result


def commit_all(session, headers):
    """Commit all accepted staging rows to production."""
    resp = session.post(
        f"{BASE_URL}/api/knowledge/projects/{PROJECT_ID}/extraction-staging/commit/",
        json={"commit_all_accepted": True},
        headers=headers
    )
    resp.raise_for_status()
    result = resp.json()
    committed = result.get('committed', result.get('applied', 0))
    failed = result.get('failed', 0)
    print(f"  COMMITTED: {committed} rows, FAILED: {failed}")
    if failed > 0:
        for err in result.get('errors', [])[:20]:
            print(f"    ERROR: {err.get('field_key', err.get('key', ''))} — {str(err.get('error', ''))[:100]}")
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"\n{'='*60}")
    print(f"118-DOCUMENT PIPELINE TEST — User B (Noel)")
    print(f"Project ID: {PROJECT_ID} | Batch: {BATCH_TAG}")
    print(f"Started: {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    # Load manifest
    with open(MANIFEST_FILE) as f:
        manifest = json.load(f)
    files = manifest["files"]
    print(f"Manifest: {len(files)} files, {manifest['total_properties_covered']} properties\n")

    # Auth
    session = requests.Session()
    print("=== PHASE 0: Authentication ===")
    try:
        token = get_jwt_token(session)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        print(f"  JWT acquired for {USERNAME}\n")
    except Exception as e:
        print(f"  AUTH FAILED: {e}")
        print(f"  Trying without auth (AllowAny endpoints)...")
        headers = {"Content-Type": "application/json"}
        token = None

    # Phase 1: Upload
    print(f"=== PHASE 1: Upload {len(files)} documents ===")
    doc_map = {}
    collisions = 0
    upload_errors = []

    for i, entry in enumerate(files):
        file_path = TEST_DIR / entry["file"]
        if not file_path.exists():
            print(f"  MISSING: {entry['file']}")
            upload_errors.append(entry["file"])
            continue
        try:
            doc_id, was_collision = upload_document(
                session, headers, file_path, doc_type=entry.get("type")
            )
            doc_map[entry["file"]] = {
                "doc_id": doc_id,
                "collision": was_collision,
                "properties": entry["properties"],
                "type": entry["type"],
                "metro": entry["metro"]
            }
            if was_collision:
                collisions += 1
        except Exception as e:
            print(f"  UPLOAD ERROR {entry['file']}: {e}")
            upload_errors.append(entry["file"])

        if (i + 1) % 20 == 0:
            print(f"  ... {i+1}/{len(files)} uploaded")

    print(f"\n  Upload complete: {len(doc_map)} docs, {collisions} collisions, {len(upload_errors)} errors\n")

    # Phase 2: Trigger extraction
    print(f"=== PHASE 2: Trigger AI extraction ===")
    extract_count = 0
    extract_errors = []

    for filename, info in doc_map.items():
        doc_id = info["doc_id"]
        ok = trigger_extraction(session, headers, doc_id)
        if ok:
            extract_count += 1
        else:
            extract_errors.append(filename)
        time.sleep(EXTRACT_CONCURRENCY_DELAY)

        if extract_count % 20 == 0 and extract_count > 0:
            print(f"  ... {extract_count}/{len(doc_map)} extractions triggered")

    print(f"\n  Extractions triggered: {extract_count}, errors: {len(extract_errors)}\n")

    # Phase 3: Poll for completion
    print(f"=== PHASE 3: Wait for extraction completion ===")
    poll_result = poll_staging(session, headers, len(doc_map))
    if poll_result is None:
        print("  WARNING: Polling timed out. Proceeding with what we have.\n")

    # Phase 4: Accept all
    print(f"=== PHASE 4: Accept all pending ===")
    accept_result = accept_all_pending(session, headers)

    # Phase 5: Commit
    print(f"=== PHASE 5: Commit to production ===")
    commit_result = commit_all(session, headers)

    # Phase 6: Save results
    results = {
        "batch": BATCH_TAG,
        "project_id": PROJECT_ID,
        "timestamp": datetime.now().isoformat(),
        "upload": {
            "total": len(files),
            "uploaded": len(doc_map),
            "collisions": collisions,
            "errors": upload_errors
        },
        "extraction": {
            "triggered": extract_count,
            "errors": extract_errors
        },
        "accept": accept_result,
        "commit": commit_result,
        "doc_map": doc_map
    }

    results_file = Path(__file__).parent / "test_results_118.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n  Results saved: {results_file}")

    print(f"\n{'='*60}")
    print(f"TEST COMPLETE — {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    return results


if __name__ == "__main__":
    main()
