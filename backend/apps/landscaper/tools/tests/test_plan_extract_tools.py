"""extract_plan_image tool tests (Phase 1: extract + place).

The tool is a thin adapter over MediaExtractionService.render_plan_crop. It must:
- require a doc_id,
- in preview mode (no page/crop) return a confirm-preview action,
- in produce mode (page + crop) return a place-overlay action whose payload
  carries source_uri + provenance for the existing overlay create flow,
- NEVER mark anything committed (the frontend persists the overlay).

Session: LSCMD-PLANEXTRACT-P1-0620-ot4
"""
from apps.knowledge.services.media_extraction_service import MediaExtractionService
from apps.landscaper.tools import plan_extract_tools as pet


def test_requires_doc_id():
    res = pet.extract_plan_image_tool(tool_input={}, project_id=1)
    assert res["success"] is False
    assert "doc_id" in res["error"].lower()


def test_preview_mode_passes_through_and_never_commits(monkeypatch):
    def fake_render(self, doc_id, page=None, crop_bbox=None, dpi=None):
        return {
            "success": True, "mode": "preview", "committed": False,
            "url": "http://s/preview.png", "doc_id": doc_id, "page": 1,
            "page_count": 3,
            "proposed_crop_bbox": {"x0": 0, "y0": 0, "x1": 612, "y1": 792},
        }
    monkeypatch.setattr(MediaExtractionService, "render_plan_crop", fake_render)

    res = pet.extract_plan_image_tool(tool_input={"doc_id": 7}, project_id=1)
    assert res["success"] is True
    assert res["action"] == "show_plan_extract_preview"
    assert res["committed"] is False
    assert res["preview"]["url"] == "http://s/preview.png"
    assert res["preview"]["page_count"] == 3


def test_produce_mode_returns_place_overlay_with_provenance(monkeypatch):
    bbox = {"x0": 0, "y0": 0, "x1": 300, "y1": 400}

    def fake_render(self, doc_id, page=None, crop_bbox=None, dpi=None):
        assert page == 2 and crop_bbox == bbox
        return {
            "success": True, "mode": "image", "committed": False,
            "url": "http://s/crop.png", "doc_id": doc_id, "page": 2,
            "crop_bbox": bbox, "width_px": 300, "height_px": 400,
        }
    monkeypatch.setattr(MediaExtractionService, "render_plan_crop", fake_render)

    res = pet.extract_plan_image_tool(
        tool_input={"doc_id": 7, "page": 2, "crop_bbox": bbox}, project_id=1,
    )
    assert res["success"] is True
    assert res["action"] == "place_plan_overlay"
    assert res["committed"] is False
    overlay = res["overlay"]
    assert overlay["source_uri"] == "http://s/crop.png"
    assert overlay["source_doc_id"] == 7
    assert overlay["source_page"] == 2
    assert overlay["source_crop_bbox"] == bbox
