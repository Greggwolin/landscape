"""Plan-image extraction tool for Landscaper (Phase 1: extract + place).

`extract_plan_image` renders a plan/plat document page (or a cropped region of
it) to a transparent-capable PNG via MediaExtractionService.render_plan_crop,
then hands the result back for the EXISTING site-plan overlay flow to drape.

Firing discipline mirrors generate_location_brief: fires only on explicit
"extract / pull out / clip the site plan" triggers (enforced by the schema
description + BASE_INSTRUCTIONS). It never commits an overlay — when page/crop
are absent it returns a confirm-preview, and even in produce mode the actual
tbl_project_overlay write is done by the frontend overlay editor. So a research
download path that calls this tool can only ever surface a preview, never
silently place an overlay.

Session: LSCMD-PLANEXTRACT-P1-0620-ot4
"""

import logging
from typing import Any, Dict

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('extract_plan_image')
def extract_plan_image_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    user_id: str = None,
    thread_id: Any = None,
    **kwargs,
) -> Dict[str, Any]:
    """Render a plan document page/region to a PNG for the overlay flow.

    Args:
        tool_input: {
            doc_id: int (required) — the uploaded plan/plat document,
            page: int (optional, 1-indexed) — page to render,
            crop_bbox: {x0,y0,x1,y1} in PDF page points (optional),
        }
        project_id: project context (the document's project).

    Returns:
        Preview mode (no page/crop):
            {success, action: "show_plan_extract_preview", committed: False,
             preview: {url, page, page_count, proposed_crop_bbox, ...}}
        Produce mode (page + crop_bbox):
            {success, action: "place_plan_overlay", committed: False,
             overlay: {source_uri, source_doc_id, source_page, source_crop_bbox,
                       width_px, height_px}}
        The frontend confirms/places via the existing overlay editor; this tool
        never writes tbl_project_overlay itself.
    """
    tool_input = tool_input or kwargs.get('tool_input', {}) or {}

    doc_id = tool_input.get('doc_id')
    if doc_id is None:
        return {
            'success': False,
            'error': "doc_id is required — the uploaded plan/plat document to extract from.",
        }

    page = tool_input.get('page')
    crop_bbox = tool_input.get('crop_bbox')

    try:
        from apps.knowledge.services.media_extraction_service import MediaExtractionService

        service = MediaExtractionService()
        result = service.render_plan_crop(
            doc_id=int(doc_id), page=page, crop_bbox=crop_bbox,
        )
    except Exception as e:
        logger.exception("extract_plan_image failed")
        return {'success': False, 'error': str(e)}

    if not result.get('success'):
        return {'success': False, 'error': result.get('error', 'Plan extraction failed')}

    # Preview: render + proposed crop, nothing committed — user confirms next.
    if result.get('mode') == 'preview':
        return {
            'success': True,
            'action': 'show_plan_extract_preview',
            'committed': False,
            'preview': {
                'url': result.get('url'),
                'doc_id': result.get('doc_id'),
                'page': result.get('page'),
                'page_count': result.get('page_count'),
                'page_width_pts': result.get('page_width_pts'),
                'page_height_pts': result.get('page_height_pts'),
                'proposed_crop_bbox': result.get('proposed_crop_bbox'),
                'width_px': result.get('width_px'),
                'height_px': result.get('height_px'),
            },
            'message': (
                "Rendered the plan page. Confirm or adjust the crop region, then "
                "place it on the map — I won't drape it until you confirm."
            ),
        }

    # Produce: a cropped transparent PNG. Hand the frontend an overlay payload
    # (source_uri + provenance) for the existing drape/save flow.
    return {
        'success': True,
        'action': 'place_plan_overlay',
        'committed': False,
        'overlay': {
            'source_uri': result.get('url'),
            'source_doc_id': result.get('doc_id'),
            'source_page': result.get('page'),
            'source_crop_bbox': result.get('crop_bbox'),
            'width_px': result.get('width_px'),
            'height_px': result.get('height_px'),
        },
        'message': (
            "Cropped the plan image. Place and fit it on the map using the "
            "overlay editor (selected parcels, APN geometry, the project "
            "boundary, or free-place), then save."
        ),
    }
