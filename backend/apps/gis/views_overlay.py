"""Site-plan image overlay endpoints (Phase 1: snap + pin).

Project-scoped georeferenced image drapes persisted to
``landscape.tbl_project_overlay``. Raw SQL via ``connection.cursor()`` — the
GIS tables in this app live in the SQL migrations under ``migrations/`` and
are managed outside Django's ORM, mirroring ``parcel_ingest`` in views.py.

Routes (registered in apps/projects/urls.py so they resolve at /api/):
    GET    /api/projects/<id>/overlays/   -> list
    POST   /api/projects/<id>/overlays/   -> create
    GET    /api/overlays/<overlay_id>/    -> retrieve
    PATCH  /api/overlays/<overlay_id>/    -> partial_update
    DELETE /api/overlays/<overlay_id>/    -> destroy

LSCMD-CW-OVERLAY-P1-0613-GV
"""

import json

from django.db import connection
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import ProjectOverlaySerializer

_SELECT_COLS = (
    "overlay_id, project_id, title, source_uri, corners, "
    "opacity, rotation_deg, created_at, updated_at, "
    "source_doc_id, source_page, source_crop_bbox"
)


def _row_to_overlay(row):
    """Map a tbl_project_overlay row (in _SELECT_COLS order) to a JSON dict."""
    # corners is JSONB. Depending on the DB adapter/connection, a raw cursor may
    # hand it back already decoded (list) OR as a JSON string — decode the string
    # case so the API always returns corners as a real array, not a string.
    corners = row[4]
    if isinstance(corners, str):
        corners = json.loads(corners)
    # source_crop_bbox is JSONB too — same string/dict ambiguity. May be NULL.
    crop_bbox = row[11]
    if isinstance(crop_bbox, str):
        crop_bbox = json.loads(crop_bbox)
    return {
        "overlay_id": row[0],
        "project_id": row[1],
        "title": row[2],
        "source_uri": row[3],
        "corners": corners,
        "opacity": float(row[5]) if row[5] is not None else None,
        "rotation_deg": float(row[6]) if row[6] is not None else None,
        "created_at": row[7].isoformat() if row[7] else None,
        "updated_at": row[8].isoformat() if row[8] else None,
        # Source-document provenance (Phase 1: extract + place). NULL for
        # manually-uploaded overlays.
        "source_doc_id": row[9],
        "source_page": row[10],
        "source_crop_bbox": crop_bbox,
    }


class ProjectOverlayViewSet(viewsets.ViewSet):
    """CRUD for site-plan overlays, raw-SQL backed."""

    permission_classes = [IsAuthenticated]

    def list(self, request, project_pk=None):
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT {_SELECT_COLS} FROM landscape.tbl_project_overlay "
                "WHERE project_id = %s ORDER BY created_at, overlay_id",
                [int(project_pk)],
            )
            rows = cursor.fetchall()
        overlays = [_row_to_overlay(row) for row in rows]
        return Response({"count": len(overlays), "results": overlays})

    def create(self, request, project_pk=None):
        serializer = ProjectOverlaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO landscape.tbl_project_overlay "
                "(project_id, title, source_uri, corners, opacity, rotation_deg, "
                "source_doc_id, source_page, source_crop_bbox) "
                "VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s::jsonb) "
                f"RETURNING {_SELECT_COLS}",
                [
                    int(project_pk),
                    data.get("title"),
                    data["source_uri"],
                    json.dumps(data["corners"]),
                    data.get("opacity", 0.7),
                    data.get("rotation_deg", 0),
                    data.get("source_doc_id"),
                    data.get("source_page"),
                    json.dumps(data["source_crop_bbox"])
                    if data.get("source_crop_bbox") is not None else None,
                ],
            )
            row = cursor.fetchone()
        return Response(_row_to_overlay(row), status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT {_SELECT_COLS} FROM landscape.tbl_project_overlay "
                "WHERE overlay_id = %s",
                [int(pk)],
            )
            row = cursor.fetchone()
        if not row:
            return Response({"error": "Overlay not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_row_to_overlay(row))

    def partial_update(self, request, pk=None):
        serializer = ProjectOverlaySerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        set_clauses = []
        params = []
        for column in ("title", "source_uri", "opacity", "rotation_deg",
                       "source_doc_id", "source_page"):
            if column in data:
                set_clauses.append(f"{column} = %s")
                params.append(data[column])
        if "corners" in data:
            set_clauses.append("corners = %s::jsonb")
            params.append(json.dumps(data["corners"]))
        if "source_crop_bbox" in data:
            set_clauses.append("source_crop_bbox = %s::jsonb")
            params.append(
                json.dumps(data["source_crop_bbox"])
                if data["source_crop_bbox"] is not None else None
            )

        if not set_clauses:
            return Response(
                {"error": "No updatable fields provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        set_clauses.append("updated_at = now()")
        params.append(int(pk))

        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE landscape.tbl_project_overlay "
                f"SET {', '.join(set_clauses)} "
                f"WHERE overlay_id = %s RETURNING {_SELECT_COLS}",
                params,
            )
            row = cursor.fetchone()
        if not row:
            return Response({"error": "Overlay not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_row_to_overlay(row))

    def destroy(self, request, pk=None):
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM landscape.tbl_project_overlay WHERE overlay_id = %s",
                [int(pk)],
            )
            deleted = cursor.rowcount
        if not deleted:
            return Response({"error": "Overlay not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
