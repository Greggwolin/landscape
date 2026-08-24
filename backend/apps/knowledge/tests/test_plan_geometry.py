"""Plan geometry — synthetic-fixture tests for the drawing-reading services.

Every fixture here is built in memory: coloured arrays, coordinate rings, and a
two-page PDF drawn line by line with PyMuPDF. Nothing touches the database, the
network, or a real plat.

The tests that matter most are the two guards, because both encode a mistake
that has already been made once:

  * ``test_perfect_area_agreement_with_off_round_scale_is_rejected`` — a
    placement whose areas agree exactly but whose implied drawing scale is
    1" = 140.2 ft must be refused. Area agreement is circular by construction;
    the round-scale test is the one carrying information.

  * ``test_faces_from_lines_discards_interior_rings`` — a face drawn with a
    smaller shape inside it must report the OUTER area and must still contain
    the inner point. Plats draw setbacks and easements as closed shapes inside
    each lot; keeping them as holes drops the lot number out of its own lot and
    took the match rate from 78 lots to 1.

Session: LSCMD-PLANGEO-LAND-0814-GP14
"""
import math

import pytest

# The package itself guards pymupdf/shapely so it imports without them; these
# tests must not be the thing that makes the suite environment-dependent.
pytest.importorskip("numpy")
pytest.importorskip("cv2")
pytest.importorskip("shapely")
pytest.importorskip("pymupdf")

import numpy as np  # noqa: E402
import pymupdf  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from apps.knowledge.services.plan_geometry import (  # noqa: E402
    BoundaryFit,
    PlanStage,
    PlatVectorReader,
    QuadGeoreferencer,
    SitePlanSegmenter,
    TRUST_FOR_MONEY,
    fit_to_known_boundary,
    match_lots,
)
from apps.knowledge.services.plan_geometry import lot_match, stages  # noqa: E402
from apps.knowledge.services.plan_geometry.calibration import (  # noqa: E402
    UNIFORMITY_THRESHOLD,
    apply_scale_to_corners,
    check_scale,
)
from apps.knowledge.services.plan_geometry.plat_vector import (  # noqa: E402
    DrawnShape,
    apply_fit,
)


# --------------------------------------------------------------------- stages


def test_plan_stage_is_ordered_by_authority():
    assert (
        PlanStage.ZONING_EXHIBIT
        < PlanStage.CONCEPT
        < PlanStage.SITE_PLAN
        < PlanStage.PRELIMINARY_PLAT
        < PlanStage.PRELIMINARY_LANDSCAPE
        < PlanStage.FINAL_PLAT
        < PlanStage.FINAL_LANDSCAPE
        < PlanStage.RECORDED_SURVEY
    )


def test_stage_values_are_stable():
    """The integer is stored on the geometry row, so renumbering breaks stored data."""
    assert [int(s) for s in PlanStage] == [10, 20, 30, 40, 45, 60, 65, 70]


def test_supersedes_is_strict():
    assert stages.supersedes(PlanStage.FINAL_PLAT, PlanStage.SITE_PLAN)
    assert not stages.supersedes(PlanStage.SITE_PLAN, PlanStage.FINAL_PLAT)
    # A second site plan does not displace the first — that is a dated revision.
    assert not stages.supersedes(PlanStage.SITE_PLAN, PlanStage.SITE_PLAN)


def test_every_stage_has_a_label():
    assert set(stages.STAGE_LABELS) == set(PlanStage)


def test_trust_for_money_excludes_illustrative_stages():
    for illustrative in (
        PlanStage.ZONING_EXHIBIT,
        PlanStage.CONCEPT,
        PlanStage.SITE_PLAN,
    ):
        assert illustrative not in TRUST_FOR_MONEY
        assert stages.is_approximate(illustrative)

    for surveyed in (PlanStage.PRELIMINARY_PLAT, PlanStage.FINAL_PLAT):
        assert surveyed in TRUST_FOR_MONEY
        assert not stages.is_approximate(surveyed)


# -------------------------------------------------------------- georeferencing

#: NW, NE, SE, SW — the order an overlay row stores them in.
CORNERS = [
    [-112.0100, 33.7550],
    [-111.9900, 33.7550],
    [-111.9900, 33.7450],
    [-112.0100, 33.7450],
]


def _metres_per_degree(lat):
    return (
        111_412.84 * math.cos(math.radians(lat)),
        111_132.92 - 559.82 * math.cos(2 * math.radians(lat)),
    )


def test_pixel_to_lonlat_is_exact_at_the_corners():
    geo = QuadGeoreferencer(corners=CORNERS, width=1000, height=800)
    nw, ne, se, sw = CORNERS
    for pixel, expected in (
        ((0, 0), nw),
        ((1000, 0), ne),
        ((1000, 800), se),
        ((0, 800), sw),
    ):
        lon, lat = geo.pixel_to_lonlat(*pixel)
        assert lon == pytest.approx(expected[0], abs=1e-9)
        assert lat == pytest.approx(expected[1], abs=1e-9)


def test_area_acres_on_a_ten_acre_box():
    """1000 ft x 435.6 ft is exactly 10 acres. Measure it near Phoenix latitude."""
    lon_c, lat_c = -112.0, 33.75
    per_lon, per_lat = _metres_per_degree(lat_c)
    half_lon = (1000 * 0.3048 / 2) / per_lon
    half_lat = (435.6 * 0.3048 / 2) / per_lat

    ring = [
        (lon_c - half_lon, lat_c + half_lat),
        (lon_c + half_lon, lat_c + half_lat),
        (lon_c + half_lon, lat_c - half_lat),
        (lon_c - half_lon, lat_c - half_lat),
    ]
    ring.append(ring[0])

    assert QuadGeoreferencer.area_acres(ring) == pytest.approx(10.0, rel=0.005)


# --------------------------------------------------------- site-plan raster


def _four_colour_site_plan(separator_px=4):
    """Four flat colour fills in a 2x2 block, split by a white cross.

    Outside the drawing is transparent, which is how a draped overlay arrives —
    the alpha channel is what tells the segmenter where the drawing stops.
    """
    image = np.zeros((400, 400, 4), np.uint8)
    lo, hi = 49, 351
    mid_lo = 200 - separator_px // 2
    mid_hi = mid_lo + separator_px

    image[lo:hi, lo:hi, :3] = 255  # white boundary lines show through here
    image[lo:hi, lo:hi, 3] = 255  # opaque only inside the drawing

    fills = {
        (0, 0): (255, 0, 0),
        (0, 1): (0, 200, 0),
        (1, 0): (0, 0, 220),
        (1, 1): (230, 140, 0),
    }
    spans = [(lo, mid_lo), (mid_hi, hi)]
    for (row, col), colour in fills.items():
        y0, y1 = spans[row]
        x0, x1 = spans[col]
        image[y0:y1, x0:x1, :3] = colour
    return image


def test_segmenter_splits_four_equal_fills_along_their_boundary_lines():
    geo = QuadGeoreferencer(corners=CORNERS, width=400, height=400)
    candidates = SitePlanSegmenter(geo).segment(_four_colour_site_plan())

    assert len(candidates) == 4

    areas = [c.acres for c in candidates]
    assert min(areas) > 0
    assert max(areas) / min(areas) < 1.05

    # Fill colour is the land-use grouping key, so the four must stay distinct.
    assert len({c.fill_rgb for c in candidates}) == 4
    assert all(len(c.ring_pixels) >= 3 for c in candidates)
    assert all(0.0 <= c.confidence <= 1.0 for c in candidates)


def test_segmenter_rejects_an_image_that_is_not_rgba():
    geo = QuadGeoreferencer(corners=CORNERS, width=400, height=400)
    with pytest.raises(ValueError):
        SitePlanSegmenter(geo).segment(np.zeros((400, 400, 3), np.uint8))


# ------------------------------------------------------------------ calibration

SCHEDULE_ACRES = [40.0, 32.0, 25.0, 18.0, 12.0, 9.0, 6.0, 4.0]


def test_check_scale_needs_at_least_five_parcels():
    assert check_scale([10.0, 9.0, 8.0, 7.0], [11.0, 10.0, 9.0, 8.0]) is None


def test_check_scale_detects_a_uniform_shortfall():
    extracted = [a * 0.88 for a in SCHEDULE_ACRES]
    check = check_scale(extracted, SCHEDULE_ACRES)

    assert check is not None
    assert check.sample_size == len(SCHEDULE_ACRES)
    assert check.uniformity < UNIFORMITY_THRESHOLD
    assert check.area_scale == pytest.approx(1 / 0.88, rel=1e-3)
    assert check.linear_scale == pytest.approx(1.066, abs=0.005)
    assert check.error_before_pct == pytest.approx(12.0, abs=0.1)
    assert check.error_after_pct < 0.01
    assert check.auto_applicable is True


def test_check_scale_refuses_scattered_ratios():
    factors = [0.6, 1.4, 0.7, 1.3, 0.65, 1.35, 0.75, 1.25]
    extracted = [a * f for a, f in zip(SCHEDULE_ACRES, factors)]
    check = check_scale(extracted, SCHEDULE_ACRES)

    assert check is not None
    assert check.uniformity > UNIFORMITY_THRESHOLD
    assert check.auto_applicable is False


def test_apply_scale_to_corners_preserves_the_centroid():
    scaled = apply_scale_to_corners(CORNERS, 1.2)

    for axis in (0, 1):
        before = sum(c[axis] for c in CORNERS) / len(CORNERS)
        after = sum(c[axis] for c in scaled) / len(scaled)
        assert after == pytest.approx(before, abs=1e-12)

    width_before = CORNERS[1][0] - CORNERS[0][0]
    width_after = scaled[1][0] - scaled[0][0]
    assert width_after == pytest.approx(width_before * 1.2, rel=1e-12)


# --------------------------------------------------------------- plat vector


def test_faces_from_segments_recovers_a_two_by_two_grid():
    """Feed segments that CROSS, not pre-closed rings — that is how CAD emits them."""
    segments = [((0.0, y), (200.0, y)) for y in (0.0, 100.0, 200.0)]
    segments += [((x, 0.0), (x, 200.0)) for x in (0.0, 100.0, 200.0)]

    shapes = PlatVectorReader._faces_from_segments(segments)

    assert len(shapes) == 4
    for shape in shapes:
        assert shape.area == pytest.approx(10_000.0)
        assert shape.width == pytest.approx(100.0)
        assert shape.height == pytest.approx(100.0)


def test_shoelace_sign_and_magnitude():
    """Signed area of the closed unit square: +1 counter-clockwise, -1 the other way.

    The ring must be closed — `_shoelace` sums consecutive pairs and does not
    close it for you, which is why every ring handed to the fit is closed.
    """
    counter_clockwise = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0), (0.0, 0.0)]
    assert PlatVectorReader._shoelace(counter_clockwise) == pytest.approx(1.0)
    assert PlatVectorReader._shoelace(counter_clockwise[::-1]) == pytest.approx(-1.0)

    half = [(0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (0.0, 0.0)]
    assert PlatVectorReader._shoelace(half) == pytest.approx(0.5)


def _shape(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return DrawnShape(
        ring=list(ring),
        length=0.0,
        width=max(xs) - min(xs),
        height=max(ys) - min(ys),
        area=abs(PlatVectorReader._shoelace(ring)),
    )


def test_drop_sheet_furniture_keeps_the_ground_and_drops_the_furniture():
    frame = _shape([(6, 6), (606, 6), (606, 786), (6, 786), (6, 6)])
    table = _shape([(50, 50), (150, 50), (150, 110), (50, 110), (50, 50)])
    parcel = _shape([(100, 100), (300, 120), (280, 300), (120, 290), (100, 100)])

    kept = PlatVectorReader.drop_sheet_furniture([frame, table, parcel], 612.0, 792.0)

    assert kept == [parcel]
    assert "spans the sheet" in frame.notes[0]
    assert "axis-square rectangle" in table.notes[0]


class _P:
    """Stand-in for a PyMuPDF point, which is all `_points_and_length` reads."""

    def __init__(self, x, y):
        self.x = float(x)
        self.y = float(y)


def _line_group(points):
    items = [
        ("l", _P(*points[i]), _P(*points[i + 1])) for i in range(len(points) - 1)
    ]
    return {"items": items}


def test_min_shape_extent_drops_a_dense_scribble_and_keeps_a_real_shape():
    """A long path packed into a tiny box is lettering, not linework."""
    square = _line_group([(0, 0), (100, 0), (100, 100), (0, 100), (0, 0)])
    # ~145pt of drawn length, but only 15pt across — under MIN_SHAPE_EXTENT_PT.
    scribble = _line_group(
        [(0, 0), (15, 15), (0, 15), (15, 0), (0, 0), (15, 15), (0, 15), (15, 0)]
    )

    shapes = PlatVectorReader()._shapes_from_drawings([square, scribble])

    assert len(shapes) == 1
    assert shapes[0].width == pytest.approx(100.0)


# ------------------------------------------------------------ placement guard

#: 1 inch = 200 ft, expressed as metres per page point.
SCALE_M_PER_PT = 200.0 * 0.3048 / 72.0


def _rotated_known_boundary(drawn_ring, lon_c=-112.0, lat_c=33.75):
    """The same outline, scaled to the ground and turned 90 degrees CCW."""
    drawn_m = [(x, -y) for x, y in drawn_ring]
    turned = [(-y * SCALE_M_PER_PT, x * SCALE_M_PER_PT) for x, y in drawn_m]

    mean_x = sum(p[0] for p in turned) / len(turned)
    mean_y = sum(p[1] for p in turned) / len(turned)

    per_lon, per_lat = _metres_per_degree(lat_c)
    return [
        (lon_c + (x - mean_x) / per_lon, lat_c + (y - mean_y) / per_lat)
        for x, y in turned
    ]


#: Deliberately NOT a square: a square is its own 90-degree rotation, so the
#: rotation recovery would be untestable. A trapezoid pins the answer.
DRAWN_TRAPEZOID = [(0.0, 0.0), (300.0, 0.0), (300.0, 200.0), (0.0, 100.0), (0.0, 0.0)]


def test_fit_to_known_boundary_recovers_a_ninety_degree_rotation():
    known = _rotated_known_boundary(DRAWN_TRAPEZOID)
    fit = fit_to_known_boundary(DRAWN_TRAPEZOID, known)

    assert fit.rotation_rad == pytest.approx(math.pi / 2, abs=1e-6)
    assert fit.shape_error < 0.01
    assert fit.implied_scale_ft_per_inch == pytest.approx(200.0, rel=1e-6)
    assert fit.area_agreement == pytest.approx(1.0, rel=1e-6)
    assert fit.is_plausible is True


def test_apply_fit_puts_the_drawn_ring_back_on_the_known_ring():
    known = _rotated_known_boundary(DRAWN_TRAPEZOID)
    fit = fit_to_known_boundary(DRAWN_TRAPEZOID, known)

    placed = apply_fit(DRAWN_TRAPEZOID, fit)

    assert len(placed) == len(known)
    for got, want in zip(placed, known):
        assert got[0] == pytest.approx(want[0], abs=1e-9)
        assert got[1] == pytest.approx(want[1], abs=1e-9)


def test_perfect_area_agreement_with_off_round_scale_is_rejected():
    """The regression test for the trap: areas agreeing is not evidence.

    A fit can be made to agree on area by choosing the scale — that is how the
    scale is derived. What it cannot fake is drawing at 1" = 140.2 ft, which no
    engineer does.
    """
    fit = BoundaryFit(
        scale=0.5933,
        rotation_rad=0.0,
        dx=0.0,
        dy=0.0,
        origin_lonlat=(-112.0, 33.75),
        area_agreement=1.0000,
        shape_error=0.01,
        implied_scale_ft_per_inch=140.2,
    )

    assert fit.area_agreement == 1.0
    assert fit.shape_error < BoundaryFit.GOOD_SHAPE_ERROR
    assert fit.is_plausible is False


def test_round_scale_with_a_bad_shape_is_rejected():
    """The other half of the guard — either test alone is sufficient to refuse."""
    fit = BoundaryFit(
        scale=SCALE_M_PER_PT,
        rotation_rad=0.0,
        dx=0.0,
        dy=0.0,
        origin_lonlat=(-112.0, 33.75),
        area_agreement=1.0000,
        shape_error=0.15,
        implied_scale_ft_per_inch=200.0,
    )

    assert fit.implied_scale_ft_per_inch == 200.0
    assert fit.is_plausible is False


# --------------------------------------------------------------- lot matching


def test_chain_fragments_rebuilds_a_flattened_arc_as_one_run():
    radius, sweep, chords = 100.0, math.pi / 2, 200
    points = [
        (radius * math.cos(sweep * i / chords), radius * math.sin(sweep * i / chords))
        for i in range(chords + 1)
    ]
    fragments = [(points[i], points[i + 1]) for i in range(chords)]

    # Every chord is far below the length floor on its own.
    assert all(math.dist(a, b) < lot_match.MIN_RUN_PT for a, b in fragments)

    runs = lot_match.chain_fragments(fragments)

    assert len(runs) == 1
    length = sum(math.dist(runs[0][k], runs[0][k + 1]) for k in range(len(runs[0]) - 1))
    assert length == pytest.approx(radius * sweep, rel=0.001)


def test_chain_fragments_refuses_to_chain_hatching():
    """Hatching reverses at every node; that is what the angle limit is for."""
    fragments = []
    point = (0.0, 0.0)
    for i in range(40):
        heading = math.radians(60 if i % 2 == 0 else -60)
        nxt = (point[0] + 5 * math.cos(heading), point[1] + 5 * math.sin(heading))
        fragments.append((point, nxt))
        point = nxt

    assert lot_match.chain_fragments(fragments) == []


def test_extend_ends_grows_both_ends_and_holds_the_direction():
    grown = lot_match.extend_ends([(0.0, 0.0), (3.0, 4.0)], 5.0)

    assert grown[0] == pytest.approx((-3.0, -4.0))
    assert grown[-1] == pytest.approx((6.0, 8.0))
    assert math.dist(grown[0], grown[-1]) == pytest.approx(5.0 + 5.0 + 5.0)

    # Same heading before and after.
    before = math.atan2(4.0, 3.0)
    after = math.atan2(grown[-1][1] - grown[0][1], grown[-1][0] - grown[0][0])
    assert after == pytest.approx(before)


def test_extend_ends_is_a_no_op_at_zero():
    pts = [(0.0, 0.0), (10.0, 0.0)]
    assert lot_match.extend_ends(pts, 0.0) == pts


def _ring_lines(ring):
    return [LineString([ring[i], ring[i + 1]]) for i in range(len(ring) - 1)]


def test_faces_from_lines_discards_interior_rings():
    """A lot is its perimeter, not its perimeter minus its easements.

    An easement drawn inside a lot must not become a hole — the lot number sits
    in the middle, and a doughnut excludes its own label. This is the bug that
    cost 77 of 78 matches.
    """
    outer = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0), (0.0, 100.0), (0.0, 0.0)]
    inner = [(40.0, 40.0), (60.0, 40.0), (60.0, 60.0), (40.0, 60.0), (40.0, 40.0)]

    faces = lot_match.faces_from_lines(_ring_lines(outer) + _ring_lines(inner))
    biggest = max(faces, key=lambda f: f.area)

    assert biggest.area == pytest.approx(10_000.0)
    assert len(biggest.interiors) == 0
    assert biggest.contains(Point(50.0, 50.0))


def _square(x0, y0, side):
    return Polygon(
        [(x0, y0), (x0 + side, y0), (x0 + side, y0 + side), (x0, y0 + side)]
    )


def test_sole_occupancy_takes_the_largest_single_occupant_region():
    big = _square(0, 0, 100)  # holds both lot numbers
    medium = _square(5, 5, 40)  # holds only lot 1
    small = _square(15, 15, 10)  # holds only lot 1, but smaller

    tokens = [(1, Point(20.0, 20.0)), (2, Point(80.0, 80.0))]
    found = lot_match._sole_occupancy([big, medium, small], tokens)

    assert set(found) == {1}
    assert found[1].area == pytest.approx(medium.area)
    assert 2 not in found  # its only container holds two numbers


# ---- the synthetic plat --------------------------------------------------

#: Three columns and two rows of 90x60pt lots, on each of two sheets.
LOT_X = [100.0, 190.0, 280.0, 370.0]
LOT_Y = [150.0, 210.0, 270.0]
LOT_AREA_PT2 = 90.0 * 60.0

#: Wide enough that the 0.5pt rung cannot bridge it and the 1.0pt rung can.
GAP_PT = 1.4

#: lot number -> (sheet, row, col, which outer edge is left open)
GAPPED_LOTS = {1: (0, 0, 0, "top"), 5: (0, 1, 1, "bottom"), 9: (1, 0, 2, "top")}

#: Drawn at 1 inch = 100 ft, so a 90x60pt lot is 10,417 sq ft on the ground.
STATED_SQFT = round(LOT_AREA_PT2 * (100.0 / 72.0) ** 2)


def _lot_number(sheet, row, col):
    return sheet * 6 + row * 3 + col + 1


def _build_plat(path):
    """Two sheets, six lots each, three of them left deliberately open."""
    doc = pymupdf.open()
    for sheet in range(2):
        page = doc.new_page(width=612, height=792)

        for y in LOT_Y:
            for col in range(3):
                x0, x1 = LOT_X[col], LOT_X[col + 1]
                for _number, (pg, row, gap_col, side) in GAPPED_LOTS.items():
                    if pg != sheet or col != gap_col:
                        continue
                    if side == "top" and y == LOT_Y[row]:
                        if gap_col == 0:
                            x1 -= GAP_PT
                        else:
                            x0 += GAP_PT
                    if side == "bottom" and y == LOT_Y[row + 1]:
                        x1 -= GAP_PT
                page.draw_line(pymupdf.Point(x0, y), pymupdf.Point(x1, y), width=0.5)

        for x in LOT_X:
            for row in range(2):
                page.draw_line(
                    pymupdf.Point(x, LOT_Y[row]),
                    pymupdf.Point(x, LOT_Y[row + 1]),
                    width=0.5,
                )

        for row in range(2):
            for col in range(3):
                cx = (LOT_X[col] + LOT_X[col + 1]) / 2
                cy = (LOT_Y[row] + LOT_Y[row + 1]) / 2
                page.insert_text(
                    pymupdf.Point(cx - 9, cy + 7),
                    str(_lot_number(sheet, row, col)),
                    fontsize=18,
                )

    doc.save(path)
    doc.close()
    return path


@pytest.fixture
def plat_pdf(tmp_path):
    return _build_plat(str(tmp_path / "synthetic_plat.pdf"))


def test_match_lots_closes_hairline_gaps_and_verifies_every_area(plat_pdf):
    stated = {n: STATED_SQFT for n in range(1, 13)}

    result = match_lots(plat_pdf, [0, 1], stated, number_range=(1, 12))

    assert [m.number for m in result.matched] == list(range(1, 13))
    assert result.unresolved == []
    assert result.scale_is_round is True
    assert result.scale_ft_per_inch == pytest.approx(100.0, rel=0.001)
    assert result.median_error < 0.001

    by_number = {m.number: m for m in result.matched}
    first_rung = lot_match.GAP_LADDER_PT[0]

    # Every lot now closes on the first rung, the deliberately-gapped three
    # included. `snap_endpoints` connects near-miss endpoints directly instead
    # of pushing each line further along its own direction, and it closes on
    # the first pass the gaps that blind extension had to escalate to reach
    # (PF1). Before that, GAPPED_LOTS came in above the first rung.
    #
    # The escalation ladder is not what makes this safe and never was: the
    # acceptance test is the stated area, asserted above at a median error
    # under 0.1% across all twelve lots. A snap that distorted geometry would
    # fail that gate and its lot would be dropped, not kept.
    for number in range(1, 13):
        assert by_number[number].gap_used_pt == first_rung


def test_match_lots_spans_both_sheets(plat_pdf):
    stated = {n: STATED_SQFT for n in range(1, 13)}
    result = match_lots(plat_pdf, [0, 1], stated, number_range=(1, 12))

    pages = {m.number: m.page for m in result.matched}
    assert all(pages[n] == 0 for n in range(1, 7))
    assert all(pages[n] == 1 for n in range(7, 13))


def test_match_lots_rejects_areas_inconsistent_with_the_fitted_scale(plat_pdf):
    """The gate, not the geometry, is what stops a table that does not hang together.

    Stated areas spread across a 0.65-1.75 range cannot all be satisfied by one
    scale. The fit lands on the median and everything else fails the 1% check,
    so those results are discarded rather than kept — which is exactly what
    makes escalating the gap tolerance safe.
    """
    stated = {n: round(STATED_SQFT * (0.65 + 0.10 * (n - 1))) for n in range(1, 13)}

    result = match_lots(plat_pdf, [0, 1], stated, number_range=(1, 12))

    assert len(result.matched) <= 1  # only the lot the median scale was fitted to
    assert len(result.unresolved) >= 11
    assert result.scale_is_round is False


def test_uniform_inflation_passes_the_area_gate_and_is_caught_by_the_scale(plat_pdf):
    """Area agreement is a verifier, never a corrector — here it verifies nothing.

    The scale is derived FROM the stated areas, so inflating every stated area
    by the same 40% simply inflates the fitted scale, and every lot still agrees
    to within a thousandth of a percent. The only thing that catches it is that
    no engineer draws a sheet at 1" = 118 ft.
    """
    stated = {n: round(STATED_SQFT * 1.4) for n in range(1, 13)}

    result = match_lots(plat_pdf, [0, 1], stated, number_range=(1, 12))

    assert len(result.matched) == 12
    assert result.median_error < 0.001  # the area check is fooled completely
    assert result.scale_is_round is False  # the round-scale check is not
    assert "NOT round" in result.summary()
