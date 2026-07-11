"""Regression tests for the media re-scan duplicate guard.

Bug: running "scan PDFs" again after images had already been extracted
re-created pending records for the already-extracted images, so a following
extract persisted a second copy — surfacing as duplicate media in the DMS.

Fix: `_scan_pdf` now loads the signatures of media that already have a live
record for the document (via `_get_existing_live_signatures`) and skips
re-creating pending records for those embedded xrefs / captured pages.

These tests exercise the signature loader in isolation with a mocked DB cursor
so they run fast and don't need a live database. The end-to-end scan→extract→
re-scan path is verified separately during the coding-assistant handoff.
"""
from contextlib import contextmanager
from unittest import mock

from apps.knowledge.services.media_extraction_service import MediaExtractionService


@contextmanager
def _mock_connection(rows):
    """Patch the service module's `connection` so `.cursor()` yields `rows`."""
    cur = mock.MagicMock()
    cur.fetchall.return_value = rows
    cur.__enter__ = mock.Mock(return_value=cur)
    cur.__exit__ = mock.Mock(return_value=False)
    conn = mock.MagicMock()
    conn.cursor.return_value = cur
    with mock.patch(
        "apps.knowledge.services.media_extraction_service.connection", conn
    ):
        yield


def test_signatures_collect_embedded_xrefs_and_capture_pages():
    """A live embedded image and a live page capture are both reported."""
    rows = [
        ("embedded", 3, {"xref": 42, "index": 0}),
        ("page_capture", 5, None),
    ]
    with _mock_connection(rows):
        xrefs, pages = MediaExtractionService()._get_existing_live_signatures(1)

    assert xrefs == {42}
    assert pages == {5}


def test_signatures_parse_json_string_source_region():
    """source_region delivered as a JSON string (not dict) still yields the xref."""
    rows = [("embedded", 2, '{"xref": 77, "index": 1}')]
    with _mock_connection(rows):
        xrefs, pages = MediaExtractionService()._get_existing_live_signatures(1)

    assert xrefs == {77}
    assert pages == set()


def test_signatures_ignore_rows_without_usable_xref():
    """Rows with missing/blank source_region contribute nothing and don't raise."""
    rows = [
        ("embedded", 1, None),
        ("embedded", 1, {"index": 0}),   # no xref key
        ("embedded", 1, "not-json"),
    ]
    with _mock_connection(rows):
        xrefs, pages = MediaExtractionService()._get_existing_live_signatures(1)

    assert xrefs == set()
    assert pages == set()


def test_signatures_empty_when_no_live_records():
    with _mock_connection([]):
        xrefs, pages = MediaExtractionService()._get_existing_live_signatures(99)

    assert xrefs == set()
    assert pages == set()
