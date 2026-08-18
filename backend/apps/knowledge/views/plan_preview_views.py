"""
Show what was recovered from a drawing, before anything is placed.

GET /api/knowledge/documents/{doc_id}/plan-preview/
GET /api/knowledge/documents/{doc_id}/plan-preview/sheets/{pdf_page}/image/

A final plat is drawn across several sheets and the recovery succeeds unevenly
across them. The only report of that was four numbers in a sentence — "286
lots, 244 measured" — which cannot say WHICH sheet the other 42 came from, or
whether a whole sheet quietly recovered nothing. That stays invisible until the
lots are drawn on a map, at which point a missing sheet looks like a hole in
the subdivision and gets diagnosed as a mapping fault.

This is the check that catches it first: each sheet with its recovered lots
drawn over it, so you can see whether the shading follows the lot lines or
wanders. Draping is manual work — trace, pin, verify, three times over for this
plat — and nobody should do it on a sheet whose geometry was never any good.

It writes NOTHING. No parcels, no gis_plan_lot rows, no profile updates, no
rendered file kept on disk. It reads the drawing and returns. The image
endpoint streams bytes straight out of the renderer rather than saving them,
because a preview that leaves a trail is not a preview.

Two costs worth knowing before changing anything here:

  * The read is slow — ~7 s to fetch a 2.77 MB plat and ~13 s to parse it. So
    ONE call returns every sheet's rings (47 KB for 246 of them) and switching
    sheets costs nothing. Do not make this per-sheet; it would pay the 20 s
    again on every click.
  * Rendering is per sheet, on demand, one page at a time — 1.5 MB and ~1.5 MB
    peak at the preview zoom. Rendering all seven up front is what would make
    this endpoint expensive, so it does not.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from django.db import connection
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from apps.projects.permissions import user_can_access_project

logger = logging.getLogger(__name__)

#: Zoom the sheet images are rendered at, stated in the response and used by
#: the drawing side rather than assumed. Page points are PDF points at 72 dpi,
#: so this is a x1.53 scale. The overlay is drawn in an SVG whose viewBox IS
#: page-point space, so changing this cannot shift a polygon off its lot lines
#: — but a client that scales by hand still needs to be told the number.
PREVIEW_DPI = 110

#: "SHEET NO. 4 OF 7" in a title block. The plat's own number is the one Gregg
#: and the engineer use and the one printed on the drawing; it is never
#: computed from page position. On this plat sheet 4 sits at page index 3, so
#: the two agree by luck — luck that breaks the moment a plat has a cover sheet
#: or an inserted revision.
_SHEET_NO_RE = re.compile(r"SHEET\s*(?:NO\.?|NUMBER)?\s*(\d+)\s*OF\s*(\d+)", re.I)


def _sheet_number(page) -> Optional[int]:
    """The sheet number the drawing states for itself, or None if it doesn't."""
    try:
        match = _SHEET_NO_RE.search(page.get_text() or "")
    except Exception:  # noqa: BLE001 — a page that will not yield text is not fatal
        return None
    return int(match.group(1)) if match else None


def _numbering(page, page_index: int) -> dict[str, Any]:
    """How this sheet is identified, and whether its two identities agree.

    A disagreement between the printed sheet number and the position in the
    file is information — a missing page, an inserted sheet, a PDF assembled
    out of order. Silently preferring either one throws that away, so both are
    reported along with the fact that they differ. An unreadable title block
    reports the number as unknown rather than falling back to the position,
    which would manufacture agreement that was never established.
    """
    pdf_page = page_index + 1
    stated = _sheet_number(page)
    return {
        "page_index": page_index,
        "pdf_page": pdf_page,
        "sheet_number": stated,
        "sheet_label": f"Sheet {stated}" if stated else f"Page {pdf_page} — sheet number unreadable",
        "numbering_known": stated is not None,
        "numbering_disagrees": stated is not None and stated != pdf_page,
    }


def _load_doc(cursor, doc_id: int) -> Optional[dict[str, Any]]:
    cursor.execute(
        """
        SELECT project_id, doc_name, storage_uri, mime_type
        FROM landscape.core_doc
        WHERE doc_id = %s AND deleted_at IS NULL
        """,
        [doc_id],
    )
    row = cursor.fetchone()
    if not row:
        return None
    return dict(zip(("project_id", "doc_name", "storage_uri", "mime_type"), row))


def _draped_pages(cursor, doc_id: int) -> dict[int, int]:
    """PDF page -> overlay_id for sheets of this document already draped.

    A sheet that has been draped should say so and offer to re-drape, rather
    than presenting the same button as one that has never been placed.
    `source_page` on the overlay is 1-indexed, matching the renderer.
    """
    try:
        cursor.execute(
            """
            SELECT source_page, overlay_id
            FROM landscape.tbl_project_overlay
            WHERE source_doc_id = %s AND source_page IS NOT NULL
            """,
            [doc_id],
        )
        return {int(page): int(oid) for page, oid in cursor.fetchall()}
    except Exception:  # noqa: BLE001
        # Not knowing whether a sheet was draped is a worse preview, not a
        # broken one. Never let it take the window down.
        logger.exception("plan-preview: could not read overlays for doc_id=%s", doc_id)
        return {}


def build_preview(reading, doc, draped: Optional[dict[int, int]] = None) -> dict[str, Any]:
    """Turn a PlanReading into the window's payload. Touches no database.

    Split out from the view so the no-write guarantee can be tested rather than
    asserted: this function is handed an open PDF and a reading and has no
    connection to reach for.

    The three-way state of a lot is computed HERE from whether a ring exists,
    not read off `DerivedLot.source`. That field says "derived" for every lot
    that was not matched, including the 40 on this plat that were never derived
    at all and have no outline — a fallthrough, not a statement. `parcel_rollup`
    validates and writes that column, so it is left exactly as it is and the
    honest distinction is made here instead.
    """
    draped = draped or {}
    lots_by_number = {lot.number: lot for lot in reading.lots}

    sheets = []
    for page_index in reading.sheets:
        rings = reading.rings_by_sheet.get(page_index, {})
        page = doc[page_index]
        rect = page.rect

        lots = []
        counts = {"traced": 0, "rebuilt": 0, "positional": 0}
        measured = 0
        for number in sorted(rings):
            lot = lots_by_number.get(number)
            # The reading now states this honestly, so it is read rather than
            # re-derived here: traced (its own number sat in its own outline),
            # rebuilt (reconstructed from stated dimensions), positional
            # (recovered outline, unusable label, identified by walking the
            # chain of neighbours).
            source = (lot.source if lot and lot.source in counts else "traced")
            counts[source] += 1
            has_frontage = bool(lot and lot.frontage_ft is not None)
            if has_frontage:
                measured += 1
            lots.append({
                "number": number,
                "source": source,
                "measured": has_frontage,
                # Page coordinates: PDF points, origin top-left, y increasing
                # downward. NOT world coordinates — nothing here is on the
                # earth yet, which is what draping is for.
                "ring": [[round(float(x), 1), round(float(y), 1)] for x, y in rings[number]],
            })

        numbering = _numbering(page, page_index)
        sheets.append({
            **numbering,
            "page_width_pts": round(rect.width, 2),
            "page_height_pts": round(rect.height, 2),
            "render_dpi": PREVIEW_DPI,
            "render_zoom": round(PREVIEW_DPI / 72.0, 6),
            "counts": {
                "recovered": len(lots),
                "traced": counts["traced"],
                "rebuilt": counts["rebuilt"],
                "positional": counts["positional"],
                "measured": measured,
            },
            "already_draped": numbering["pdf_page"] in draped,
            "overlay_id": draped.get(numbering["pdf_page"]),
            "lots": lots,
        })

    excluded = [
        {**_numbering(doc[scan.page], scan.page), "reason": scan.reason}
        for scan in reading.sheet_scans
        if not scan.is_lot_sheet
    ]

    recovered_total = sum(s["counts"]["recovered"] for s in sheets)
    scheduled = len(reading.table.areas)
    # Derive the unrecovered count from the OTHER side — lot numbers in the
    # schedule that appear in no sheet's rings — rather than as
    # `scheduled - recovered`. Subtraction would make the reconciliation a
    # tautology: a number computed from the total cannot then be used to check
    # the total. Two independent counts that agree is a check; one number
    # agreeing with itself is not.
    outlined_numbers = {n for page in reading.rings_by_sheet.values() for n in page}
    no_outline = sorted(set(reading.table.areas) - outlined_numbers)
    reconciles = recovered_total + len(no_outline) == scheduled
    return {
        "sheets": sheets,
        "excluded_sheets": excluded,
        "page_count": len(doc),
        "render_dpi": PREVIEW_DPI,
        "scale_ft_per_inch": round(reading.scale_ft_per_inch, 2),
        "scale_is_round": reading.scale_is_round,
        "totals": {
            # The schedule's own count is the denominator everything must
            # reconcile to. If these do not add up the window says so rather
            # than smoothing it over — a total that quietly disagrees with its
            # parts is how 40 lots go missing without anyone chasing them.
            "scheduled": scheduled,
            "recovered": recovered_total,
            "traced": sum(s["counts"]["traced"] for s in sheets),
            "rebuilt": sum(s["counts"]["rebuilt"] for s in sheets),
            "positional": sum(s["counts"]["positional"] for s in sheets),
            "measured": sum(s["counts"]["measured"] for s in sheets),
            "no_outline": len(no_outline),
            "reconciles": reconciles,
        },
        # Assembly is NOT established, and saying so is the point. Sheets 4, 5
        # and 6 share one scale and name each other across matchlines, which is
        # what makes assembly conceivable — but no lot appears on two adjacent
        # sheets, so there is no shared geometry to abut; the matchlines are
        # text labels sitting in each sheet's own independent page coordinates;
        # and no survey tie is common to all three. A guessed offset produces a
        # plan that looks entirely plausible and is wrong by a street width, so
        # these are shown as three separate pieces of geometry and never as one.
        "assembly": {
            "established": False,
            "reason": (
                "These sheets have not been joined into one plan. Nothing in the "
                "drawing fixes how they sit relative to each other — no lot appears "
                "on two sheets, and each sheet's coordinates are its own — so they "
                "are shown separately rather than guessed into place."
            ),
        },
        "refusals": [
            {"lots": list(lots), "reason": reason}
            for lots, reason in getattr(reading, "infill_refusals", []) or []
        ],
        "unplaced": {
            "count": len(no_outline),
            "lot_numbers": no_outline[:200],
            "note": (
                "counted in the schedule, on no sheet, no outline — the drawing "
                "never tied these to a page, so they appear on none of these previews"
            ),
        },
    }


def _open_drawing(doc):
    """Guard against being handed something that is not a multi-page drawing."""
    return doc is not None and len(doc) > 0


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plan_preview(request, doc_id: int):
    """What was recovered from this drawing, sheet by sheet.

    Gated exactly like the read endpoint beside it: DRF authentication, then
    project ownership. A plain Django view here would see an anonymous user
    despite a valid bearer token and answer "not found" — the failure that cost
    a day on the apply endpoint.
    """
    doc_id = int(doc_id)
    with connection.cursor() as cursor:
        meta = _load_doc(cursor, doc_id)
        if meta is None:
            return JsonResponse({"error": "Document not found"}, status=404)
        if not meta["project_id"]:
            return JsonResponse(
                {"error": "This document is not attached to a project."}, status=400
            )
        if not user_can_access_project(request, meta["project_id"]):
            return JsonResponse({"error": "Project not found"}, status=404)
        draped = _draped_pages(cursor, doc_id)

    if not meta["storage_uri"]:
        return JsonResponse(
            {"error": "The drawing's file is missing, so nothing can be shown from it."},
            status=409,
        )

    import pymupdf

    from apps.knowledge.services.plan_geometry.plan_reader import read_plan
    from apps.knowledge.services.text_extraction import _download_to_temp

    pdf = None
    try:
        path = _download_to_temp(meta["storage_uri"], meta["mime_type"] or "application/pdf")
        pdf = pymupdf.open(path)
        if not _open_drawing(pdf):
            return JsonResponse({"error": "The drawing has no pages."}, status=409)
        reading = read_plan(path, doc=pdf)
    except Exception as exc:  # noqa: BLE001
        logger.exception("plan-preview failed for doc_id=%s", doc_id)
        return JsonResponse(
            {"error": f"The drawing could not be read: {exc}"}, status=500
        )

    try:
        payload = build_preview(reading, pdf, draped)
    finally:
        if pdf is not None:
            pdf.close()

    payload.update({
        "doc_id": doc_id,
        "doc_name": meta["doc_name"],
        "project_id": meta["project_id"],
    })
    for sheet in payload["sheets"]:
        sheet["image_url"] = (
            f"/api/knowledge/documents/{doc_id}/plan-preview/sheets/"
            f"{sheet['pdf_page']}/image/"
        )
    return JsonResponse(payload, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plan_preview_sheet_image(request, doc_id: int, pdf_page: int):
    """One sheet, rendered, streamed.

    Streamed rather than saved: `render_plan_crop` persists its PNG to storage
    because the drape workflow needs a URL to re-upload, but a preview that
    leaves files behind every time it is opened is not read-only. This calls
    the same underlying renderer — `_render_page_png`, the pure step with no
    DB and no storage — and hands the bytes straight back.

    One page at a time, on demand. Rendering all seven up front is what would
    make this expensive.
    """
    doc_id, pdf_page = int(doc_id), int(pdf_page)
    with connection.cursor() as cursor:
        meta = _load_doc(cursor, doc_id)
        if meta is None:
            return JsonResponse({"error": "Document not found"}, status=404)
        if not meta["project_id"] or not user_can_access_project(request, meta["project_id"]):
            return JsonResponse({"error": "Project not found"}, status=404)
    if not meta["storage_uri"]:
        return JsonResponse({"error": "The drawing's file is missing."}, status=409)

    import pymupdf

    from apps.knowledge.services.media_extraction_service import MediaExtractionService
    from apps.knowledge.services.text_extraction import _download_to_temp

    pdf = None
    try:
        path = _download_to_temp(meta["storage_uri"], meta["mime_type"] or "application/pdf")
        pdf = pymupdf.open(path)
        if pdf_page < 1 or pdf_page > len(pdf):
            return JsonResponse(
                {"error": f"Page {pdf_page} is outside this drawing (1..{len(pdf)})."},
                status=404,
            )
        png, width, height = MediaExtractionService()._render_page_png(
            pdf, pdf_page, dpi=PREVIEW_DPI
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("plan-preview image failed doc_id=%s page=%s", doc_id, pdf_page)
        return JsonResponse({"error": f"The sheet could not be rendered: {exc}"}, status=500)
    finally:
        if pdf is not None:
            pdf.close()

    response = HttpResponse(png, content_type="image/png")
    # State the zoom on the image itself, so a client that scales by hand can
    # read it off the response it actually drew rather than a separate call.
    response["X-Plan-Render-Dpi"] = str(PREVIEW_DPI)
    response["X-Plan-Render-Px"] = f"{width}x{height}"
    response["Cache-Control"] = "private, max-age=600"
    return response
