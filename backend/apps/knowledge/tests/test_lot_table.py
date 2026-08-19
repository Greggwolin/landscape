"""
Tests for reading a plat's lot area table and rebuilding the lots that never
closed.

Both halves failed on the real Red Valley Ranch final plat before they worked,
and in the same way each time: an answer that was internally consistent and
wrong. The tests below are mostly about that.
"""

from __future__ import annotations

import pytest

from apps.knowledge.services.plan_geometry.lot_table import (  # noqa: E402
    LotAreaTable,
    compare_to_drawn_labels,
    read_lot_area_table,
)

SQFT_PER_ACRE = 43560.0


class _Word(tuple):
    """A PyMuPDF word tuple: (x0, y0, x1, y1, text, ...)."""

    def __new__(cls, x, y, text, w=34.0, h=11.0):
        return super().__new__(cls, (x, y, x + w, y + h, text, 0, 0, 0))


class _Page:
    def __init__(self, words, text=None):
        self._words = words
        self._text = text if text is not None else "LOT AREA TABLE"

    def get_text(self, kind=None):
        return self._words if kind == "words" else self._text


class _Doc:
    def __init__(self, pages):
        self._pages = pages

    def __len__(self):
        return len(self._pages)

    def __getitem__(self, i):
        return self._pages[i]


def _row(y, number, sqft_text, acres_text):
    return [_Word(100, y, str(number)), _Word(150, y, sqft_text), _Word(210, y, acres_text)]


# ── reading the table ───────────────────────────────────────────────────────


def test_an_ordinary_table_reads():
    doc = _Doc([_Page(_row(10, 101, "5,166", "0.119") + _row(30, 102, "5,217", "0.120"))])
    t = read_lot_area_table(doc)
    assert t.areas == {101: 5166, 102: 5217}
    assert t.rejected == []


def test_a_row_written_with_a_decimal_separator_is_still_read():
    """
    One row on the real plat writes 5,418 as "5.418". A reader that insists on
    a comma drops the lot silently — and the row's own arithmetic proves which
    reading is meant, so there is no need to guess.
    """
    doc = _Doc([_Page(_row(10, 123, "5.418", "0.124"))])
    assert read_lot_area_table(doc).areas == {123: 5418}


def test_a_lot_of_more_than_an_acre_is_not_invisible():
    """
    The defect that hid two of this plat's 286 lots. The acre column was matched
    as `0.xxx`, so the two 1.21-acre lots never appeared — and nothing inside
    the extraction could notice, because the rows that remained were contiguous
    and every one of them balanced.
    """
    doc = _Doc([_Page(_row(10, 182, "52,746", "1.211") + _row(30, 183, "52,746", "1.211"))])
    t = read_lot_area_table(doc)
    assert t.areas == {182: 52746, 183: 52746}


def test_a_row_whose_arithmetic_does_not_balance_is_rejected_not_repaired():
    """Square feet ÷ 43,560 must equal the acreage the same row states."""
    doc = _Doc([_Page(_row(10, 104, "5,560", "0.500"))])
    t = read_lot_area_table(doc)
    assert t.areas == {}
    assert t.rejected and t.rejected[0][0] == 104


def test_numbers_that_are_not_a_row_are_ignored():
    """A curve table sits on the same sheet. Only aligned triples are rows."""
    doc = _Doc([_Page([_Word(100, 10, "C73"), _Word(150, 10, "1129.91'"),
                       _Word(600, 10, "364.28'")])])
    assert read_lot_area_table(doc).areas == {}


def test_a_sheet_without_the_header_is_skipped():
    doc = _Doc([_Page(_row(10, 101, "5,166", "0.119"), text="CURVE TABLE")])
    assert read_lot_area_table(doc).areas == {}


# ── the completeness check that actually works ──────────────────────────────


def test_comparing_against_the_drawn_labels_finds_a_row_that_was_filtered_out():
    """
    The lesson. Checking a table against itself — no gaps, every row balances —
    reads as full confidence on a set that is missing rows, because a row lost
    before the check ran leaves no trace inside the set. Two independent
    sources is the only test worth having.
    """
    t = LotAreaTable(areas={101: 5166, 102: 5217})       # 103 was filtered out upstream
    out = compare_to_drawn_labels(t, drawn=[101, 102, 103])
    assert out["drawn_but_not_tabulated"] == [103]


def test_a_lot_tabulated_but_not_drawn_is_reported_too():
    """Its label may simply be too small or rotated to read — worth knowing."""
    t = LotAreaTable(areas={101: 5166, 102: 5217})
    out = compare_to_drawn_labels(t, drawn=[101])
    assert out["tabulated_but_not_drawn"] == [102]


def test_agreement_reports_nothing_missing_either_way():
    t = LotAreaTable(areas={101: 5166, 102: 5217})
    out = compare_to_drawn_labels(t, drawn=[101, 102])
    assert out == {"drawn_but_not_tabulated": [], "tabulated_but_not_drawn": []}


# ── the table's derived figures ─────────────────────────────────────────────


def test_hundred_blocks_split_by_parcel():
    t = LotAreaTable(areas={101: 5000, 183: 5000, 201: 5000, 465: 5000})
    assert t.by_hundred_block() == {1: [101, 183], 2: [201], 4: [465]}


def test_total_acres_is_the_sum_of_the_rows():
    t = LotAreaTable(areas={1: 43560, 2: 21780})
    assert t.total_acres == pytest.approx(1.5)
