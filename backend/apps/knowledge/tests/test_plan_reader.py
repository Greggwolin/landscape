"""
Tests for the end-to-end plat read.

This module is the join between six steps that were each tested alone. What
matters here is not that any one of them works — it is that the wrong sheets
are not chosen, that a bad read is refused rather than reported, and that the
lots handed on carry only what was actually established.
"""

from __future__ import annotations

import pytest

from apps.knowledge.services.plan_geometry.lot_table import LotAreaTable  # noqa: E402
from apps.knowledge.services.plan_geometry.plan_reader import (  # noqa: E402
    PlanReading,
    find_lot_sheets,
)


class _Pt:
    def __init__(self, x, y):
        self.x, self.y = x, y


class _Page:
    """Stands in for a PyMuPDF page; only its lot labels matter here."""

    def __init__(self, labels):
        self._labels = labels          # [(value, (x, y)), ...]

    def positions(self):
        return [(v, _Pt(x, y)) for v, (x, y) in self._labels]


class _Doc:
    def __init__(self, pages):
        self._pages = pages

    def __len__(self):
        return len(self._pages)

    def __getitem__(self, i):
        return self._pages[i]


@pytest.fixture(autouse=True)
def _stub_tokens(monkeypatch):
    """Feed `find_lot_sheets` the labels the fake pages carry."""
    monkeypatch.setattr(
        "apps.knowledge.services.plan_geometry.plan_reader.lot_number_tokens",
        lambda page, lo=1, hi=9999: [(v, p) for v, p in page.positions() if lo <= v <= hi],
    )


def _scattered(n, start=101, per_row=8):
    """
    A lot sheet: numbers spread across the sheet, a few per column.

    Rows are offset from each other, because real lot rows are — a block on the
    far side of a street does not line its lots up with the block opposite. A
    perfectly aligned grid would read as columns and be rejected as a table,
    which is the whole point of the test below.
    """
    out = []
    for i in range(n):
        row, col = divmod(i, per_row)
        out.append((start + i, (120.0 * col + 37.0 * row + 40, 90.0 * row + 60)))
    return out


def _tabulated(n, start=101, columns=5):
    """A lot area table: many numbers stacked under a handful of headings."""
    return [(start + i, (300.0 * (i % columns) + 100, 12.0 * (i // columns) + 60))
            for i in range(n)]


# ── choosing the sheets ─────────────────────────────────────────────────────


def test_lot_sheets_are_the_ones_with_scattered_numbers():
    doc = _Doc([_Page(_scattered(120)), _Page(_scattered(140, 300))])
    assert find_lot_sheets(doc) == [0, 1]


def test_a_cover_sheet_is_not_a_lot_sheet():
    """Two dozen stray numbers is a title block, not an inventory."""
    doc = _Doc([_Page(_scattered(25)), _Page(_scattered(120))])
    assert find_lot_sheets(doc) == [1]


def test_the_lot_area_table_is_not_a_lot_sheet():
    """
    The defect this pins. The area table carries MORE lot numbers than any lot
    sheet — 302 against 153 on the Red Valley plat — so every count-based test
    picks it first. Run against all seven sheets the fitted scale came out at
    1in = 175 ft, nothing measured, and the answer was silently wrong.

    What separates them is arrangement: a lot number sits inside its lot, so a
    lot sheet scatters them; a table stacks them in columns.
    """
    doc = _Doc([_Page(_tabulated(300)), _Page(_scattered(120))])
    assert find_lot_sheets(doc) == [1]


def test_a_drawing_with_no_lot_sheets_returns_nothing_rather_than_guessing():
    doc = _Doc([_Page(_scattered(10)), _Page(_tabulated(300))])
    assert find_lot_sheets(doc) == []


# ── what the reading says about itself ──────────────────────────────────────


def _reading(**kw):
    base = dict(table=LotAreaTable(areas={101: 5000, 102: 5000}),
                scale_ft_per_inch=50.0, scale_is_round=True,
                label_disagreements={"drawn_but_not_tabulated": [],
                                     "tabulated_but_not_drawn": []})
    base.update(kw)
    return PlanReading(**base)


def test_a_reading_with_no_lots_is_not_trustworthy():
    assert _reading(lots=[]).trustworthy is False


def test_an_unround_scale_makes_the_whole_reading_untrustworthy():
    """
    Worth more than any count. The scale is not read off the drawing — it falls
    out of fitting recovered areas to stated ones, so a value that is not a
    round engineering scale means the fit found something other than the lots.
    """
    from apps.knowledge.services.plan_geometry.parcel_rollup import DerivedLot

    lots = [DerivedLot(number=101, area_sqft=5000.0)]
    assert _reading(lots=lots, scale_is_round=True).trustworthy is True
    assert _reading(lots=lots, scale_is_round=False, scale_ft_per_inch=175.2).trustworthy is False


def test_lots_drawn_but_missing_from_the_table_make_it_untrustworthy():
    """A short table read is a wrong denominator, not a smaller plat."""
    from apps.knowledge.services.plan_geometry.parcel_rollup import DerivedLot

    lots = [DerivedLot(number=101, area_sqft=5000.0)]
    r = _reading(lots=lots, label_disagreements={"drawn_but_not_tabulated": [183],
                                                 "tabulated_but_not_drawn": []})
    assert r.trustworthy is False


def test_lots_tabulated_but_not_drawn_are_tolerated():
    """
    The other direction is ordinary: a label too small or too rotated to read
    is a limit of the reader, not a missing lot. On the Red Valley plat 22 lots
    fall in this bucket and the read is sound.
    """
    from apps.knowledge.services.plan_geometry.parcel_rollup import DerivedLot

    lots = [DerivedLot(number=101, area_sqft=5000.0)]
    r = _reading(lots=lots, label_disagreements={"drawn_but_not_tabulated": [],
                                                 "tabulated_but_not_drawn": [104, 105]})
    assert r.trustworthy is True


# ── what gets handed on ─────────────────────────────────────────────────────


def test_frontage_totals_only_what_was_measured():
    from apps.knowledge.services.plan_geometry.parcel_rollup import DerivedLot

    r = _reading(lots=[
        DerivedLot(number=101, area_sqft=5208.0, frontage_ft=42.0),
        DerivedLot(number=102, area_sqft=5208.0, frontage_ft=42.0),
        DerivedLot(number=103, area_sqft=52746.0),      # never measured
    ])
    assert r.lot_count == 3
    assert r.with_frontage == 2
    assert r.total_frontage_ft == pytest.approx(84.0)


def test_no_lot_is_handed_on_with_world_geometry():
    """
    Everything here is a point on a sheet. Placing the sheet on the earth is a
    separate step, and a ring in sheet coordinates written into a column that
    expects EPSG:3857 would be silently, confidently wrong.
    """
    from apps.knowledge.services.plan_geometry.parcel_rollup import DerivedLot

    r = _reading(lots=[DerivedLot(number=101, area_sqft=5000.0, frontage_ft=42.0)])
    assert all(lot.ring_3857 is None for lot in r.lots)
    assert all(lot.is_placed is False for lot in r.lots)
