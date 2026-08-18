"""Plan preview — the window that shows recovered geometry before it is placed.

The load-bearing test here is ``test_build_preview_touches_no_database``. This
whole feature is read-only by contract: it renders what a drawing gave up so a
person can decide which sheets are worth the manual work of draping. "It writes
nothing" is the sort of claim that stays true right up until someone adds a
convenient cache, so it is enforced by a connection that raises rather than by
review — proven, not asserted.

Every fixture is built in memory. Nothing touches the database, the network, or
a real plat.

Session: LSCMD-PLANPREVIEW-0817-MK51
"""
from types import SimpleNamespace

import pytest

pytest.importorskip("pymupdf")

from apps.knowledge.views.plan_preview_views import (  # noqa: E402
    _numbering,
    _sheet_number,
    build_preview,
)


class ExplodingConnection:
    """A connection that refuses to be used at all.

    Any database access — read or write — raises. `build_preview` is handed an
    open PDF and a finished reading and has no legitimate reason to reach for a
    cursor, so the strictest possible guard is the correct one.
    """

    def cursor(self, *args, **kwargs):  # noqa: D102
        raise AssertionError("build_preview reached the database")

    def __getattr__(self, name):
        raise AssertionError(f"build_preview touched connection.{name}")


def _page(text="", width=2592.0, height=1728.0):
    return SimpleNamespace(
        rect=SimpleNamespace(width=width, height=height),
        get_text=lambda *a, **k: text,
    )


class _Doc(list):
    """Stands in for a PyMuPDF document: indexable, with a length."""


def _reading(*, areas, rings, sheets, scans, scale=50.0, round_scale=True):
    lots = [
        SimpleNamespace(
            number=n,
            source="traced" if n in {x for page in rings.values() for x in page} else "unplaced",
            frontage_ft=1.0 if n in {x for page in rings.values() for x in page} else None,
        )
        for n in sorted(areas)
    ]
    return SimpleNamespace(
        table=SimpleNamespace(areas=areas),
        lots=lots,
        sheets=sheets,
        rings_by_sheet=rings,
        sheet_scans=scans,
        scale_ft_per_inch=scale,
        scale_is_round=round_scale,
    )


SQUARE = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]


def test_build_preview_touches_no_database(monkeypatch):
    """The contract: reading a drawing for a preview writes nothing, and in
    fact touches no database at all."""
    import apps.knowledge.views.plan_preview_views as mod

    monkeypatch.setattr(mod, "connection", ExplodingConnection())
    doc = _Doc([_page("SHEET NO. 1 OF 2"), _page("SHEET NO. 2 OF 2")])
    reading = _reading(
        areas={1: 5000, 2: 5000},
        rings={1: {1: SQUARE, 2: SQUARE}},
        sheets=[1],
        scans=[
            SimpleNamespace(page=0, is_lot_sheet=False, reason="cover sheet"),
            SimpleNamespace(page=1, is_lot_sheet=True, reason="2 lot numbers"),
        ],
    )
    payload = build_preview(reading, doc)  # must not raise
    assert payload["totals"]["recovered"] == 2


def test_a_sheet_that_recovered_nothing_still_appears():
    """The failure this window exists to catch. A lot sheet whose geometry did
    not come back must be visible as empty, never absent."""
    doc = _Doc([_page("SHEET NO. 1 OF 2"), _page("SHEET NO. 2 OF 2")])
    reading = _reading(
        areas={1: 5000, 2: 5000},
        rings={0: {1: SQUARE}, 1: {}},  # sheet 2 recovered nothing
        sheets=[0, 1],
        scans=[
            SimpleNamespace(page=0, is_lot_sheet=True, reason="lots"),
            SimpleNamespace(page=1, is_lot_sheet=True, reason="lots"),
        ],
    )
    payload = build_preview(reading, doc)
    assert [s["pdf_page"] for s in payload["sheets"]] == [1, 2]
    assert payload["sheets"][1]["counts"]["recovered"] == 0


def test_counts_reconcile_to_the_schedule():
    """Recovered plus never-outlined must equal what the schedule states, and
    the two sides must be derived independently — a count computed by
    subtracting from the total cannot then verify the total."""
    doc = _Doc([_page("SHEET NO. 1 OF 1")])
    reading = _reading(
        areas={1: 5000, 2: 5000, 3: 5000, 4: 5000},
        rings={0: {1: SQUARE, 2: SQUARE}},  # 2 of 4 recovered
        sheets=[0],
        scans=[SimpleNamespace(page=0, is_lot_sheet=True, reason="lots")],
    )
    payload = build_preview(reading, doc)
    assert payload["totals"] == {
        "scheduled": 4, "recovered": 2, "traced": 2, "rebuilt": 0,
        "positional": 0, "measured": 2, "no_outline": 2, "reconciles": True,
    }
    assert payload["unplaced"]["count"] == 2
    assert payload["unplaced"]["lot_numbers"] == [3, 4]


def test_lots_with_no_outline_are_not_attributed_to_a_sheet():
    """The drawing never tied them to a page, so no sheet may claim them."""
    doc = _Doc([_page("SHEET NO. 1 OF 1")])
    reading = _reading(
        areas={1: 5000, 2: 5000, 9: 5000},
        rings={0: {1: SQUARE, 2: SQUARE}},
        sheets=[0],
        scans=[SimpleNamespace(page=0, is_lot_sheet=True, reason="lots")],
    )
    payload = build_preview(reading, doc)
    assert [lot["number"] for lot in payload["sheets"][0]["lots"]] == [1, 2]
    assert 9 in payload["unplaced"]["lot_numbers"]


def test_rings_are_returned_in_page_coordinates_untransformed():
    """Page points in, page points out. Any transform here would land the
    shading off the lot lines and read as a bad recovery."""
    doc = _Doc([_page("SHEET NO. 1 OF 1")])
    reading = _reading(
        areas={1: 5000}, rings={0: {1: SQUARE}}, sheets=[0],
        scans=[SimpleNamespace(page=0, is_lot_sheet=True, reason="lots")],
    )
    payload = build_preview(reading, doc)
    assert payload["sheets"][0]["lots"][0]["ring"] == [[0.0, 0.0], [10.0, 0.0], [10.0, 10.0], [0.0, 10.0]]
    assert payload["sheets"][0]["page_width_pts"] == 2592.0


def test_sheet_number_comes_from_the_title_block_never_from_position():
    """The plat's own number is what the engineer and the drawing use."""
    assert _sheet_number(_page("... SHEET NO. 4 OF 7 ...")) == 4
    assert _sheet_number(_page("SHEET 4 OF 7")) == 4
    assert _sheet_number(_page("no sheet marking here")) is None


def test_numbering_disagreement_is_reported_not_resolved():
    """A printed number that differs from the file position is information —
    a missing page, an inserted sheet, a PDF assembled out of order."""
    agree = _numbering(_page("SHEET NO. 4 OF 7"), 3)
    assert agree["sheet_number"] == 4 and agree["pdf_page"] == 4
    assert agree["numbering_disagrees"] is False

    clash = _numbering(_page("SHEET NO. 6 OF 7"), 3)
    assert clash["sheet_number"] == 6 and clash["pdf_page"] == 4
    assert clash["numbering_disagrees"] is True


def test_unreadable_title_block_says_unknown_rather_than_guessing():
    """Falling back to the position would manufacture agreement that was never
    established."""
    unknown = _numbering(_page("cover sheet, no marking"), 1)
    assert unknown["sheet_number"] is None
    assert unknown["numbering_known"] is False
    assert unknown["numbering_disagrees"] is False
    assert "unreadable" in unknown["sheet_label"]


def test_excluded_pages_are_shown_with_their_reason():
    """A page that was never examined must be visible as excluded, not simply
    missing — 'not in the list' and 'has no lots' are different facts."""
    doc = _Doc([_page("SHEET NO. 1 OF 2"), _page("SHEET NO. 2 OF 2")])
    reading = _reading(
        areas={1: 5000}, rings={1: {1: SQUARE}}, sheets=[1],
        scans=[
            SimpleNamespace(page=0, is_lot_sheet=False, reason="24 numbers — a cover sheet"),
            SimpleNamespace(page=1, is_lot_sheet=True, reason="lots"),
        ],
    )
    payload = build_preview(reading, doc)
    assert len(payload["excluded_sheets"]) == 1
    assert payload["excluded_sheets"][0]["pdf_page"] == 1
    assert "cover sheet" in payload["excluded_sheets"][0]["reason"]


def test_the_preview_reports_the_source_the_reading_states():
    """`DerivedLot.source` used to say "derived" for every unmatched lot,
    including ones nothing derived, so the preview had to recompute the
    distinction from ring presence. MK55 gave the field four honest values —
    traced, rebuilt, positional, unplaced — so the preview reports what the
    reading states instead of second-guessing it, and a lot with no outline is
    counted as unplaced rather than as a failed derivation."""
    doc = _Doc([_page("SHEET NO. 1 OF 1")])
    lots = [
        SimpleNamespace(number=1, source="traced", frontage_ft=12.0),
        SimpleNamespace(number=2, source="positional", frontage_ft=None),
        SimpleNamespace(number=3, source="rebuilt", frontage_ft=None),
        SimpleNamespace(number=4, source="unplaced", frontage_ft=None),  # no ring
    ]
    reading = SimpleNamespace(
        table=SimpleNamespace(areas={1: 5000, 2: 5000, 3: 5000, 4: 5000}),
        lots=lots, sheets=[0],
        rings_by_sheet={0: {1: SQUARE, 2: SQUARE, 3: SQUARE}},
        sheet_scans=[SimpleNamespace(page=0, is_lot_sheet=True, reason="lots")],
        scale_ft_per_inch=50.0, scale_is_round=True,
    )
    payload = build_preview(reading, doc)
    counts = payload["sheets"][0]["counts"]
    assert (counts["traced"], counts["positional"], counts["rebuilt"]) == (1, 1, 1)
    assert counts["measured"] == 1
    assert payload["totals"]["no_outline"] == 1          # lot 4
    assert payload["unplaced"]["lot_numbers"] == [4]


def test_assembly_is_declined_and_said_rather_than_guessed():
    """Nothing in the drawing fixes how the sheets sit relative to each other,
    and a guessed offset produces a plan that looks plausible and is wrong by a
    street width. The window must say so instead of presenting three things as
    one."""
    doc = _Doc([_page("SHEET NO. 1 OF 2"), _page("SHEET NO. 2 OF 2")])
    reading = _reading(
        areas={1: 5000, 2: 5000}, rings={0: {1: SQUARE}, 1: {2: SQUARE}},
        sheets=[0, 1],
        scans=[SimpleNamespace(page=0, is_lot_sheet=True, reason="lots"),
               SimpleNamespace(page=1, is_lot_sheet=True, reason="lots")],
    )
    payload = build_preview(reading, doc)
    assert payload["assembly"]["established"] is False
    assert "not been joined" in payload["assembly"]["reason"]
    assert len(payload["sheets"]) == 2


def test_already_draped_sheets_are_marked():
    doc = _Doc([_page("SHEET NO. 1 OF 1")])
    reading = _reading(
        areas={1: 5000}, rings={0: {1: SQUARE}}, sheets=[0],
        scans=[SimpleNamespace(page=0, is_lot_sheet=True, reason="lots")],
    )
    payload = build_preview(reading, doc, draped={1: 77})
    assert payload["sheets"][0]["already_draped"] is True
    assert payload["sheets"][0]["overlay_id"] == 77


def test_render_zoom_is_stated_so_the_drawing_side_need_not_assume():
    doc = _Doc([_page("SHEET NO. 1 OF 1")])
    reading = _reading(
        areas={1: 5000}, rings={0: {1: SQUARE}}, sheets=[0],
        scans=[SimpleNamespace(page=0, is_lot_sheet=True, reason="lots")],
    )
    payload = build_preview(reading, doc)
    sheet = payload["sheets"][0]
    assert sheet["render_dpi"] == payload["render_dpi"]
    assert sheet["render_zoom"] == pytest.approx(payload["render_dpi"] / 72.0)
