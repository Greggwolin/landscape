"""
Apply a confirmed drawing to its project.

POST /api/knowledge/documents/{doc_id}/apply-plan/

This is the first thing in the plan-geometry arc that writes to a project, and
it is triggered by a button, so the shape here is deliberately cautious:

  * `why_not_ready` runs FIRST, against the stored verdict alone. A blocked
    document is answered without fetching anything — there is no point
    downloading three megabytes to be told the drawing is unconfirmed.
  * The read itself takes ~10 s on a seven-sheet plat, which does not belong on
    a request thread. It runs in a daemon thread and the caller polls, the same
    way `extract_document_batched` already works. One pattern, not two.
  * The outcome is written back into `core_doc.profile_json.plan.apply`. That
    needs no schema change, survives a refresh, and keeps the result with the
    document that produced it rather than in memory belonging to one request.
  * Writing is all-or-nothing inside `transaction.atomic()`. A half-applied
    project is worse than an unchanged one, because the unchanged one is
    obvious.

The four gates live in `apply_plan` and are not duplicated here — this module
must never decide for itself that a drawing is ready.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from typing import Any, Optional

from django.db import connection, transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.projects.permissions import user_can_access_project

from ..services.plan_geometry.apply_plan import apply_confirmed_plan, why_not_ready

logger = logging.getLogger(__name__)

#: Shown while the read is running. The card polls until this changes.
READING_MESSAGE = "Reading the drawing…"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_doc(cursor, doc_id: int) -> Optional[dict[str, Any]]:
    cursor.execute(
        """
        SELECT project_id, doc_name, storage_uri, mime_type, profile_json
        FROM landscape.core_doc
        WHERE doc_id = %s AND deleted_at IS NULL
        """,
        [doc_id],
    )
    row = cursor.fetchone()
    if not row:
        return None
    project_id, doc_name, storage_uri, mime_type, profile_json = row
    profile = profile_json or {}
    if isinstance(profile, str):  # some drivers hand back raw JSON
        try:
            profile = json.loads(profile)
        except ValueError:
            profile = {}
    return {
        "project_id": project_id,
        "doc_name": doc_name or "",
        "storage_uri": storage_uri,
        "mime_type": mime_type,
        "profile": profile,
        "plan": (profile or {}).get("plan") or {},
    }


def _record_apply_state(doc_id: int, apply_state: dict[str, Any]) -> None:
    """Merge `apply_state` into profile_json.plan.apply.

    A targeted jsonb_set rather than a read-modify-write of the whole profile:
    the confirm PATCH and this can land close together, and rewriting the whole
    document would let one clobber the other's stage.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE landscape.core_doc
                SET profile_json = jsonb_set(
                        COALESCE(profile_json, '{}'::jsonb),
                        '{plan,apply}',
                        %s::jsonb,
                        true
                    )
                WHERE doc_id = %s
                """,
                [json.dumps(apply_state), doc_id],
            )
    except Exception:
        # The parcels are already written or already refused; failing to record
        # the note must not undo either.
        logger.exception("apply-plan: could not record state for doc_id=%s", doc_id)


def _read_and_apply(doc_id: int, doc: dict[str, Any]) -> None:
    """The slow half. Runs in a daemon thread; never raises into the caller."""
    try:
        from ..services.text_extraction import _download_to_temp

        tmp_path = _download_to_temp(doc["storage_uri"], doc["mime_type"] or "application/pdf")
        with open(tmp_path, "rb") as fh:
            pdf_bytes = fh.read()

        with transaction.atomic():
            with connection.cursor() as cursor:
                outcome = apply_confirmed_plan(
                    cursor,
                    project_id=doc["project_id"],
                    doc_id=doc_id,
                    doc_name=doc["doc_name"],
                    pdf_bytes=pdf_bytes,
                    plan_profile=doc["plan"],
                )
                # Not raising on refusal: a refusal is a normal outcome, not an
                # error, and apply_confirmed_plan has already written nothing in
                # that case. Raising would only roll back an empty transaction.

        # Attribute names taken from the dataclasses, not guessed: PlanReading
        # exposes lot_count / with_frontage / total_frontage_ft, and
        # RollupResult exposes parcels_written — there is no `.parcels`.
        counts: dict[str, Any] = {}
        if outcome.applied and outcome.reading is not None:
            reading = outcome.reading
            counts = {
                "lots": reading.lot_count,
                "measured": reading.with_frontage,
                "front_feet": round(reading.total_frontage_ft, 1),
                "parcels": outcome.rollup.parcels_written if outcome.rollup else 0,
            }

        _record_apply_state(
            doc_id,
            {
                "state": "done" if outcome.applied else "blocked",
                "message": outcome.message,
                "counts": counts,
                "at": _now(),
            },
        )
        logger.info(
            "apply-plan doc_id=%s applied=%s — %s",
            doc_id, outcome.applied, outcome.message,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("apply-plan failed for doc_id=%s", doc_id)
        _record_apply_state(
            doc_id,
            {
                "state": "failed",
                "message": f"Could not read the drawing: {exc}",
                "counts": {},
                "at": _now(),
            },
        )


@csrf_exempt
@require_http_methods(["POST"])
def apply_plan_to_project(request, doc_id: int):
    """Read a confirmed drawing into its project."""
    with connection.cursor() as cursor:
        doc = _load_doc(cursor, int(doc_id))

    if doc is None:
        return JsonResponse({"error": "Document not found"}, status=404)
    if not doc["project_id"]:
        return JsonResponse(
            {"applied": False, "state": "blocked",
             "message": "This document is not attached to a project."},
            status=200,
        )

    # This writes parcels into a project, so it is gated like the other project
    # write paths rather than like the read-only document endpoints beside it.
    if not user_can_access_project(request, doc["project_id"]):
        return JsonResponse({"error": "Project not found"}, status=404)

    # GATE FIRST, FETCH LATER. Answered from the stored verdict alone.
    blocked = why_not_ready(doc["plan"])
    if blocked:
        state = {"state": "blocked", "message": blocked, "counts": {}, "at": _now()}
        _record_apply_state(int(doc_id), state)
        return JsonResponse({"applied": False, **state}, status=200)

    if not doc["storage_uri"]:
        return JsonResponse(
            {"applied": False, "state": "blocked",
             "message": "The drawing's file is missing, so nothing can be read from it."},
            status=200,
        )

    # Already running: report the same thing rather than starting a second read.
    # The writer supersedes rather than duplicating, so a double press is not
    # destructive — but two reads of the same plat is pure waste.
    if (doc["plan"].get("apply") or {}).get("state") == "reading":
        return JsonResponse(
            {"applied": False, "state": "reading", "message": READING_MESSAGE},
            status=202,
        )

    _record_apply_state(
        int(doc_id),
        {"state": "reading", "message": READING_MESSAGE, "counts": {}, "at": _now()},
    )

    thread = threading.Thread(
        target=_read_and_apply, args=(int(doc_id), doc), daemon=True,
    )
    thread.start()

    return JsonResponse(
        {"applied": False, "state": "reading", "message": READING_MESSAGE},
        status=202,
    )
