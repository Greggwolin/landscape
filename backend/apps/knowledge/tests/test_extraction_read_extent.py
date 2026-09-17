"""The extraction read path must never truncate silently.

Three separate caps used to cut document text with nothing recorded:
a 60,000-character ceiling whose marker was read nowhere, a 100-chunk limit
in _get_document_content, and a 100,000-character cache write aimed at a
column that does not exist. These tests hold the replacement honest.

Pure functions only — no database, so they run anywhere.
"""
import pytest

from apps.knowledge.services.extraction_service import (
    MAX_EXTRACTION_TEXT_CHARS,
    trim_for_extraction,
)


def test_short_document_is_read_whole():
    text = "x" * 1_000
    trimmed, used, total = trim_for_extraction(text)
    assert trimmed == text
    assert used == total == 1_000


def test_document_at_the_ceiling_is_read_whole():
    text = "x" * MAX_EXTRACTION_TEXT_CHARS
    trimmed, used, total = trim_for_extraction(text)
    assert used == total == MAX_EXTRACTION_TEXT_CHARS
    assert trimmed == text


def test_over_the_ceiling_reports_the_shortfall():
    text = "x" * (MAX_EXTRACTION_TEXT_CHARS + 5_000)
    trimmed, used, total = trim_for_extraction(text)
    assert len(trimmed) == MAX_EXTRACTION_TEXT_CHARS
    assert used == MAX_EXTRACTION_TEXT_CHARS
    assert total == MAX_EXTRACTION_TEXT_CHARS + 5_000
    # The whole point: the caller can tell.
    assert used < total


def test_fifty_pages_of_a_real_document_fits():
    """90th-percentile density measured 2026-09-16 was 3,522 chars/page."""
    fifty_pages = 50 * 3_522
    _, used, total = trim_for_extraction("x" * fifty_pages)
    assert used == total == fifty_pages, "a 50-page document must read end to end"


def test_the_old_ceiling_would_have_cut_a_fifty_page_document():
    """Regression guard: 60,000 was about 25 pages, not 50."""
    assert MAX_EXTRACTION_TEXT_CHARS > 60_000
    assert 50 * 3_522 > 60_000


def test_empty_and_none_are_not_errors():
    assert trim_for_extraction("") == ("", 0, 0)
    assert trim_for_extraction(None) == ("", 0, 0)


@pytest.mark.parametrize("size", [0, 1, MAX_EXTRACTION_TEXT_CHARS - 1,
                                  MAX_EXTRACTION_TEXT_CHARS,
                                  MAX_EXTRACTION_TEXT_CHARS + 1])
def test_used_never_exceeds_total_or_the_ceiling(size):
    trimmed, used, total = trim_for_extraction("x" * size)
    assert used <= total
    assert used <= MAX_EXTRACTION_TEXT_CHARS
    assert len(trimmed) == used
