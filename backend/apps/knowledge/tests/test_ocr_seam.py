"""OCR seam tests for auto_classifier.extract_text_from_bytes (Phase 1).

A scanned / image-only PDF has no native text layer. The extractor must NOT
silently return empty — it must route to the OCR seam and, when OCR is not
provisioned, return an explicit error so the scanned-PDF problem is surfaced.
A normal text PDF must still extract unchanged.

Session: LSCMD-PLANEXTRACT-P1-0620-ot4
"""
import fitz

from apps.knowledge.services.auto_classifier import extract_text_from_bytes


def _image_only_pdf_bytes():
    doc = fitz.open()
    page = doc.new_page(width=300, height=300)
    page.draw_rect(fitz.Rect(10, 10, 290, 290), fill=(0.5, 0.5, 0.5))  # no text
    data = doc.tobytes()
    doc.close()
    return data


def _text_pdf_bytes():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Hello Plan Extraction")
    data = doc.tobytes()
    doc.close()
    return data


def test_scanned_pdf_does_not_silently_return_empty():
    text, err = extract_text_from_bytes(_image_only_pdf_bytes(), "scan.pdf", "application/pdf")
    # The silent-empty bug is (text is None and err is None). Must not happen.
    assert not (text is None and err is None), "scanned PDF returned a silent empty result"
    assert text is None
    assert err is not None
    assert any(k in err.lower() for k in ("ocr", "scan", "no text", "text layer"))


def test_text_pdf_still_extracts_cleanly():
    text, err = extract_text_from_bytes(_text_pdf_bytes(), "doc.pdf", "application/pdf")
    assert err is None
    assert text and "Hello Plan Extraction" in text
