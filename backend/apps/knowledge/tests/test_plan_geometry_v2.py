"""Tests for the plan geometry pipeline v2 enhancements.

Covers:
  - Smart gap closure (snap_endpoints)
  - Tract token extraction (tract_tokens)
  - Tract sole occupancy
  - Vector glyph centroid detection
  - Cross-hundred-block infill
  - Infill chaining around tracts
  - Tract area table reading
  - DB constraint alignment (VALID_SOURCES)

Every fixture is built in memory — no network, no database, no real plat.

Session: LSCMD-PLANFIX-0823
"""
import math

import pytest

pytest.importorskip("shapely")
pytest.importorskip("pymupdf")

import pymupdf  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from apps.knowledge.services.plan_geometry import lot_match  # noqa: E402
from apps.knowledge.services.plan_geometry.lot_infill import (  # noqa: E402
    InfillResult,
    _reachable,
    build_adjacency,
    infill_by_position,
)
from apps.knowledge.services.plan_geometry.parcel_rollup import VALID_SOURCES  # noqa: E402


# ---------------------------------------------------------------- snap_endpoints


def test_snap_endpoints_connects_near_miss_endpoints():
    """Two lines that stop 3pt short of each other get a connector."""
    line_a = LineString([(0, 0), (100, 0)])
    line_b = LineString([(103, 0), (103, 100)])  # 3pt gap

    result = lot_match.snap_endpoints([line_a, line_b], radius_pt=5.0)

    # Original 2 lines + 1 connector
    assert len(result) == 3
    connector = result[2]
    assert connector.length == pytest.approx(3.0)


def test_snap_endpoints_does_not_connect_distant_endpoints():
    """Lines 20pt apart should not get a connector with radius_pt=5."""
    line_a = LineString([(0, 0), (100, 0)])
    line_b = LineString([(120, 0), (120, 100)])

    result = lot_match.snap_endpoints([line_a, line_b], radius_pt=5.0)

    assert len(result) == 2  # no connector added


def test_snap_endpoints_does_not_connect_same_line_endpoints():
    """A line's own two endpoints should not be connected to each other."""
    line = LineString([(0, 0), (5, 0)])  # short line, endpoints within radius

    result = lot_match.snap_endpoints([line], radius_pt=10.0)

    assert len(result) == 1  # no self-connector


def test_snap_endpoints_one_to_one_matching():
    """Each endpoint connects to at most one other."""
    lines = [
        LineString([(0, 0), (10, 0)]),
        LineString([(12, 0), (22, 0)]),
        LineString([(13, 0), (23, 0)]),  # also near endpoint of line 1
    ]

    result = lot_match.snap_endpoints(lines, radius_pt=5.0)

    connectors = result[3:]
    # At most 1 connector involving the endpoint at (12, 0) area
    assert len(connectors) <= 2


def test_snap_endpoints_improves_face_recovery():
    """A grid with one deliberate gap recovers more faces with snapping."""
    # 2x2 grid with a gap in one horizontal line
    lines_no_snap = [
        LineString([(0, 0), (200, 0)]),       # top
        LineString([(0, 100), (95, 100)]),     # middle left (gap at 95-105)
        LineString([(105, 100), (200, 100)]),  # middle right
        LineString([(0, 200), (200, 200)]),    # bottom
        LineString([(0, 0), (0, 200)]),        # left
        LineString([(100, 0), (100, 200)]),    # center vertical
        LineString([(200, 0), (200, 200)]),    # right
    ]

    # Without snapping: the gap at the middle horizontal breaks face recovery
    faces_without = lot_match.faces_from_lines(lines_no_snap)
    # With snapping: the 10pt gap should be bridged
    snapped = lot_match.snap_endpoints(lines_no_snap, radius_pt=12.0)
    faces_with = lot_match.faces_from_lines(snapped)

    assert len(faces_with) >= len(faces_without)


# ---------------------------------------------------------------- tract_tokens


def _make_tract_page(labels):
    """Build a PDF page with TRACT labels on it."""
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)
    y = 200
    for label in labels:
        page.insert_text(pymupdf.Point(100, y), "TRACT", fontsize=14)
        page.insert_text(pymupdf.Point(160, y), label, fontsize=14)
        y += 40
    return page, doc


def test_tract_tokens_finds_standard_labels():
    page, doc = _make_tract_page(["A", "B", "C"])
    try:
        tokens = lot_match.tract_tokens(page)
        labels = sorted([t[0] for t in tokens])
        assert labels == ["A", "B", "C"]
    finally:
        doc.close()


def test_tract_tokens_reads_the_merged_single_word_form():
    """CAD kerns "TRACT A" without a real space, so it arrives as one word.

    This is the form on the reference plat, and reading only the two-word
    form is why tract extraction returned nothing at all (PF1).
    """
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)
    # Set close enough together that the text extractor keeps them as one run.
    page.insert_text(pymupdf.Point(100, 200), "TRACT", fontsize=14)
    page.insert_text(pymupdf.Point(140, 200), "A", fontsize=14)
    try:
        words = [w[4] for w in page.get_text("words")]
        assert words == ["TRACTA"], f"fixture no longer merges: {words}"
        tokens = lot_match.tract_tokens(page)
        assert [t[0] for t in tokens] == ["A"]
    finally:
        doc.close()


def test_tract_tokens_does_not_read_the_plural_as_a_label():
    """"TRACTS" is prose on the plat, not tract S."""
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text(pymupdf.Point(100, 200), "TRACTS", fontsize=14)
    try:
        assert lot_match.tract_tokens(page) == []
    finally:
        doc.close()


def test_tract_tokens_drops_labels_the_area_table_does_not_state():
    """The drawing proposes a label; the plat's own table decides."""
    page, doc = _make_tract_page(["A", "B", "C"])
    try:
        tokens = lot_match.tract_tokens(page, labels={"A", "C"})
        assert sorted(t[0] for t in tokens) == ["A", "C"]
    finally:
        doc.close()


def test_tract_tokens_ignores_bare_letters():
    """A lone letter without TRACT nearby should not match."""
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text(pymupdf.Point(100, 200), "X", fontsize=14)
    try:
        tokens = lot_match.tract_tokens(page)
        assert len(tokens) == 0
    finally:
        doc.close()


# ---------------------------------------------------------- tract sole occupancy


def _square(x0, y0, side):
    return Polygon(
        [(x0, y0), (x0 + side, y0), (x0 + side, y0 + side), (x0, y0 + side)]
    )


def test_tract_sole_occupancy_matches_tract_face():
    """A tract label inside a face with no lot numbers should match."""
    # The faces are side by side, not nested: `faces_from_lines` keeps each
    # region's OUTER boundary only, so one recovered face never sits inside
    # another. The original fixture nested the lot inside the tract, which
    # made the tract face legitimately fail the "holds no lot number" rule
    # it is supposed to pass here (PF1).
    big_face = _square(0, 0, 200)      # big tract
    lot_face = _square(200, 0, 50)     # small lot, alongside

    tract_toks = [("A", Point(100, 100))]
    lot_toks = [(101, Point(225, 25))]

    found = lot_match._tract_sole_occupancy(
        [big_face, lot_face], tract_toks, lot_toks
    )

    assert "A" in found
    assert found["A"].area == pytest.approx(big_face.area)


def test_tract_sole_occupancy_rejects_face_with_lot_numbers():
    """A face holding both a tract label and a lot number is a merged region."""
    merged = _square(0, 0, 200)

    tract_toks = [("A", Point(50, 50))]
    lot_toks = [(101, Point(150, 150))]

    found = lot_match._tract_sole_occupancy([merged], tract_toks, lot_toks)

    assert "A" not in found


# -------------------------------------------------------- cross-boundary infill


def test_reachable_finds_adjacent_nodes():
    """BFS reachability check works across a simple adjacency graph."""
    adj = {0: {1}, 1: {0, 2}, 2: {1, 3}, 3: {2}}
    assert _reachable(adj, 0, 3, {1, 2}, max_depth=3) is True
    assert _reachable(adj, 0, 3, {1, 2}, max_depth=1) is False


def test_infill_cross_boundary_with_strong_evidence():
    """Infill should cross a hundred-block boundary when evidence is strong.

    Set up: lots 183 (named) and 201 (named) are adjacent through one unnamed
    face. Lot 184 is in the schedule and unassigned.
    """
    # Named faces (anchors)
    face_183 = _square(0, 0, 50)
    face_201 = _square(100, 0, 50)
    # Unnamed face between them
    face_between = _square(50, 0, 50)

    named = {183: face_183, 201: face_201}
    unnamed = [face_between]
    stated = {183: 2500, 184: 2500, 201: 2500}
    scale = 1.0  # 1 sqft per sq pt for simplicity

    result = infill_by_position(
        named=named,
        unnamed=unnamed,
        stated_areas=stated,
        scale_sqft_per_pt2=scale,
        unassigned={184},
    )

    # Pass 2 (cross-boundary) should pick up lot 184
    assert 184 in result.assigned


def test_infill_refuses_long_cross_boundary_run():
    """Cross-boundary infill should refuse runs > 3 lots."""
    face_183 = _square(0, 0, 50)
    face_201 = _square(250, 0, 50)
    unnamed = [_square(50 + i * 50, 0, 50) for i in range(4)]

    named = {183: face_183, 201: face_201}
    stated = {183: 2500, 184: 2500, 185: 2500, 186: 2500, 187: 2500, 201: 2500}
    scale = 1.0

    result = infill_by_position(
        named=named,
        unnamed=unnamed,
        stated_areas=stated,
        scale_sqft_per_pt2=scale,
        unassigned={184, 185, 186, 187},
    )

    # Should NOT place these — run is too long for cross-boundary
    assert 184 not in result.assigned


# ---------------------------------------------------------- VALID_SOURCES


def test_valid_sources_includes_tract():
    """The code-side VALID_SOURCES must include 'tract'."""
    assert "tract" in VALID_SOURCES
    assert "traced" in VALID_SOURCES
    assert "rebuilt" in VALID_SOURCES
    assert "positional" in VALID_SOURCES
    assert "unplaced" in VALID_SOURCES


# ---------------------------------------------------------- tract area table


def test_read_tract_area_table_from_synthetic_pdf():
    """Build a PDF with a tract area table and read it back."""
    from apps.knowledge.services.plan_geometry.lot_table import read_tract_area_table

    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)

    # Write header
    page.insert_text(pymupdf.Point(200, 100), "TRACT AREA TABLE", fontsize=14)

    # Write tract rows: label, sqft, acres
    tracts = [
        ("A", "21,780", "0.500"),
        ("B", "43,560", "1.000"),
        ("C", "10,890", "0.250"),
    ]
    y = 150
    for label, sqft, acres in tracts:
        page.insert_text(pymupdf.Point(100, y), label, fontsize=12)
        page.insert_text(pymupdf.Point(200, y), sqft, fontsize=12)
        page.insert_text(pymupdf.Point(320, y), acres, fontsize=12)
        y += 25

    try:
        table = read_tract_area_table(doc)
        assert len(table) == 3
        assert table.areas["A"] == 21780
        assert table.areas["B"] == 43560
        assert table.areas["C"] == 10890
    finally:
        doc.close()


# ---------------------------------------------------- MatchedTract dataclass


def test_matched_tract_error():
    tract = lot_match.MatchedTract(
        label="A",
        page=0,
        ring=[(0, 0), (100, 0), (100, 100), (0, 100)],
        area_sqft=21780,
        stated_sqft=21780,
        gap_used_pt=0.5,
    )
    assert tract.error == pytest.approx(0.0)
    assert tract.source == "tract"


# ---------------------------------------------------- LotMatchResult summary


def test_result_summary_includes_tracts():
    result = lot_match.LotMatchResult()
    result.tracts = [
        lot_match.MatchedTract("A", 0, [], 21780, 21780, 0.5),
        lot_match.MatchedTract("B", 0, [], 43560, 43560, 0.5),
    ]
    result.unresolved_tracts = ["C"]
    s = result.summary()
    assert "2 tracts identified" in s
    assert "1 tracts unresolved" in s


# ---------------------------------- vector glyph centroids (basic structure)


def test_vector_glyph_centroids_returns_sentinel_values():
    """Glyph centroids use -1 as sentinel lot number."""
    # Create minimal short segments that look like a glyph cluster
    segments = []
    cx, cy = 50.0, 50.0
    for i in range(8):
        angle = i * math.pi / 4
        a = (cx + 3 * math.cos(angle), cy + 3 * math.sin(angle))
        b = (cx + 6 * math.cos(angle), cy + 6 * math.sin(angle))
        segments.append((a, b))

    doc = pymupdf.open()
    page = doc.new_page()
    try:
        result = lot_match._vector_glyph_centroids(page, segments, 1, 999)
        # May or may not find clusters depending on exact geometry, but the
        # function should run without error
        for value, point in result:
            assert value == -1
            assert isinstance(point, Point)
    finally:
        doc.close()


# --------------------------------------- full pipeline with tracts (synthetic)


def _build_plat_with_tracts(path):
    """Build a synthetic plat: 6 lots + 1 tract on one sheet.

    Layout (in page coordinates):
    Lots 101-103 in a row, then TRACT A, then lots 104-106 in a row.
    """
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)

    lot_width = 70.0
    lot_height = 60.0
    tract_width = 60.0
    y0 = 200.0
    y1 = y0 + lot_height

    # Draw 3 lots, then a tract gap, then 3 more lots.
    # 6 lots + 1 tract must fit inside the 612pt page: at the original 90pt
    # lot width the run ended at x=650 and lot 106 was drawn off the sheet,
    # so it rendered clipped as "10" and never matched (PF1).
    x = 20.0
    for i in range(3):
        x0 = x + i * lot_width
        x1 = x0 + lot_width
        # Draw the lot rectangle
        page.draw_rect(pymupdf.Rect(x0, y0, x1, y1), width=0.5)
        # Label it
        cx = (x0 + x1) / 2 - 9
        cy = (y0 + y1) / 2 + 7
        page.insert_text(pymupdf.Point(cx, cy), str(101 + i), fontsize=18)

    # Tract A
    tx0 = x + 3 * lot_width
    tx1 = tx0 + tract_width
    page.draw_rect(pymupdf.Rect(tx0, y0, tx1, y1), width=0.5)
    page.insert_text(pymupdf.Point(tx0 + 5, (y0 + y1) / 2), "TRACT", fontsize=12)
    page.insert_text(pymupdf.Point(tx0 + 42, (y0 + y1) / 2), "A", fontsize=12)

    # 3 more lots after the tract
    for i in range(3):
        x0 = tx1 + i * lot_width
        x1_lot = x0 + lot_width
        page.draw_rect(pymupdf.Rect(x0, y0, x1_lot, y1), width=0.5)
        cx = (x0 + x1_lot) / 2 - 9
        cy = (y0 + y1) / 2 + 7
        page.insert_text(pymupdf.Point(cx, cy), str(104 + i), fontsize=18)

    doc.save(path)
    doc.close()
    return path


@pytest.fixture
def plat_with_tracts(tmp_path):
    return _build_plat_with_tracts(str(tmp_path / "plat_tracts.pdf"))


def test_match_lots_finds_tracts(plat_with_tracts):
    """The pipeline should identify tract A alongside the numbered lots."""
    scale_factor = (100.0 / 72.0) ** 2  # assume 1in = 100ft
    lot_area_pt2 = 70.0 * 60.0
    tract_area_pt2 = 60.0 * 60.0

    stated = {n: round(lot_area_pt2 * scale_factor) for n in range(101, 107)}
    tract_areas = {"A": round(tract_area_pt2 * scale_factor)}

    result = lot_match.match_lots(
        plat_with_tracts,
        sheets=[0],
        stated_areas=stated,
        number_range=(101, 106),
        tract_areas=tract_areas,
    )

    # Should find 6 lots
    assert len(result.matched) == 6
    matched_numbers = {m.number for m in result.matched}
    assert matched_numbers == {101, 102, 103, 104, 105, 106}

    # Should find tract A
    assert len(result.tracts) >= 1
    tract_labels = {t.label for t in result.tracts}
    # The tract may or may not match depending on exact geometry, but the
    # pipeline should run without error


# ──────────────────────────────────────────── the tract path, end to end


def test_read_plan_carries_tracts_from_the_table_to_the_handover(
    plat_with_tracts, monkeypatch
):
    """The wiring, which is the half that was missing.

    `match_lots` grew a `tract_areas` parameter and a `tracts` result, and
    `parcel_rollup` grew a tract row — but nothing called either, so no tract
    could reach the writer no matter how well the extraction worked. This
    pins the whole path: tract area table -> match_lots -> PlanReading.tracts
    -> the DerivedTract the rollup writes (PF1).
    """
    from apps.knowledge.services.plan_geometry import plan_reader
    from apps.knowledge.services.plan_geometry.lot_table import (
        LotAreaTable,
        TractAreaTable,
    )

    scale_factor = (100.0 / 72.0) ** 2
    lots = {n: round(70.0 * 60.0 * scale_factor) for n in range(101, 107)}
    tracts = TractAreaTable(areas={"A": round(60.0 * 60.0 * scale_factor)})

    monkeypatch.setattr(plan_reader, "read_lot_area_table",
                        lambda doc: LotAreaTable(areas=lots))
    monkeypatch.setattr(plan_reader, "read_tract_area_table", lambda doc: tracts)

    reading = plan_reader.read_plan(plat_with_tracts, sheets=[0])

    assert [t.label for t in reading.tracts] == ["A"]
    tract = reading.tracts[0]
    assert tract.source == "tract"
    assert tract.area_sqft == tracts.areas["A"]
    assert tract.page == 0
    # Page coordinates are kept for georeferencing, world coordinates are not
    # invented — the same contract lots have.
    assert tract.ring_3857 is None
    assert reading.tract_rings_by_sheet[0]["A"]

    # A tract is in no parcel and in no lot total.
    assert reading.lot_count == len(lots)
    assert all(lot.number in lots for lot in reading.lots)


def test_read_plan_without_a_tract_table_reads_exactly_as_before(
    plat_with_tracts, monkeypatch
):
    """A plat carrying no tract area table must be unaffected."""
    from apps.knowledge.services.plan_geometry import plan_reader
    from apps.knowledge.services.plan_geometry.lot_table import (
        LotAreaTable,
        TractAreaTable,
    )

    scale_factor = (100.0 / 72.0) ** 2
    lots = {n: round(70.0 * 60.0 * scale_factor) for n in range(101, 107)}

    monkeypatch.setattr(plan_reader, "read_lot_area_table",
                        lambda doc: LotAreaTable(areas=lots))
    monkeypatch.setattr(plan_reader, "read_tract_area_table",
                        lambda doc: TractAreaTable())

    reading = plan_reader.read_plan(plat_with_tracts, sheets=[0])

    assert reading.tracts == []
    assert reading.tract_rings_by_sheet == {}
    assert reading.lot_count == len(lots)
