"""Unit tests for the plan-extraction render helper (Phase 1: extract + place).

These exercise the pure render step (no DB, no storage) so they run fast and
prove: (a) default behavior is opaque full-page RGB — unchanged from the
existing page-capture path — and (b) a clip rect crops to the region and yields
a transparency-capable RGBA PNG.

Session: LSCMD-PLANEXTRACT-P1-0620-ot4
"""
import io

import fitz
from PIL import Image

from apps.knowledge.services.media_extraction_service import MediaExtractionService


def _make_pdf():
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)  # US Letter, points
    page.draw_rect(fitz.Rect(0, 0, 306, 792), color=(0, 0, 0), fill=(0.2, 0.4, 0.6))
    return doc


def test_render_full_page_defaults_to_opaque_rgb():
    svc = MediaExtractionService()
    doc = _make_pdf()
    png_bytes, w, h = svc._render_page_png(doc, 1, dpi=72)
    doc.close()

    img = Image.open(io.BytesIO(png_bytes))
    assert img.format == "PNG"
    assert img.mode == "RGB"          # no alpha when clip/alpha omitted (prior behavior)
    assert (w, h) == (612, 792)       # 72 dpi == 1:1 with PDF points


def test_render_with_clip_crops_to_region_and_is_transparency_capable():
    svc = MediaExtractionService()
    doc = _make_pdf()
    clip = fitz.Rect(0, 0, 306, 792)  # left half of the page
    png_bytes, w, h = svc._render_page_png(doc, 1, clip=clip, dpi=72, alpha=True)
    doc.close()

    img = Image.open(io.BytesIO(png_bytes))
    assert img.mode == "RGBA"         # alpha channel present for future masking
    assert w == 306 and h == 792      # cropped to the clip region
