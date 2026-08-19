"""
Tests for measuring a lot: width, depth, and which edge is the street.

Frontage is the number a land deal is priced on, so the behaviours pinned here
are mostly about refusing to produce one. Every geometry below is in sheet
points at the Red Valley scale of 1 inch = 50 feet, so one point is 25/36 of a
foot and a 42-foot lot is 60.48 points wide.

A note on why the deduction bug survived: `measure_lot` used to subtract the
gap-closing growth from both axes, and every fixture here passed `GROW = 0.0`
because "fixtures are exact". So the suite never exercised the deduction at all
and could not have caught it. The invariant at the bottom of this file is the
replacement — it holds for any geometry, exact or recovered.
"""

from __future__ import annotations

import pytest

from apps.knowledge.services.plan_geometry.lot_dimensions import (  # noqa: E402
    FrontageBasis,
    LotDimensions,
    measure_lot,
    measure_lots,
    total_frontage,
)

FT_PER_PT = 25.0 / 36.0          # 1" = 50' on a 72-point inch
W = 42.0 / FT_PER_PT             # a 42-foot lot, in points
D = 124.0 / FT_PER_PT            # 124 feet deep


def rect(x, y, w=W, h=D):
    return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]


def row(n, y=0.0, w=W, h=D):
    """`n` lots side by side, sharing their side lines — an ordinary block."""
    return {i: rect(i * w, y, w, h) for i in range(n)}


# ── the shape itself ────────────────────────────────────────────────────────


def test_width_and_depth_come_off_the_outline():
    m = measure_lot(1, rect(0, 0), FT_PER_PT, [])
    assert m.width_ft == pytest.approx(42.0, abs=0.1)
    assert m.depth_ft == pytest.approx(124.0, abs=0.1)
    assert m.area_sqft == pytest.approx(42 * 124, rel=0.001)


def test_a_lot_drawn_at_an_angle_still_measures_42_by_124():
    """
    A plat on a curving street is locally rotated. An axis-aligned box would
    read this lot as far larger than it is; the minimum-area rectangle does not.
    """
    import math

    a = math.radians(30)
    r = [(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a))
         for x, y in rect(0, 0)]
    m = measure_lot(1, r, FT_PER_PT, [])
    assert m.width_ft == pytest.approx(42.0, abs=0.2)
    assert m.depth_ft == pytest.approx(124.0, abs=0.2)
    assert m.rotation_deg == pytest.approx(30.0, abs=0.5)


# ── which edge is the street ────────────────────────────────────────────────


def test_an_interior_lot_fronts_on_its_narrow_side():
    lots = row(3)
    m = measure_lot(1, lots[1], FT_PER_PT, [lots[0], lots[2]])
    assert m.frontage_ft == pytest.approx(42.0, abs=0.1)
    assert m.basis == FrontageBasis.PARTY_LINES


def test_rotating_the_whole_block_does_not_change_the_frontage():
    """
    A block turned 90° on the page is still a block. What decides the street
    edge is where the neighbours are, not which way the sheet happens to be
    oriented — so these lots front on 42 feet exactly as the upright ones do.
    """
    stack = {i: rect(0, i * W, D, W) for i in range(3)}   # the row runs vertically
    m = measure_lot(1, stack[1], FT_PER_PT, [stack[0], stack[2]])
    assert m.frontage_ft == pytest.approx(42.0, abs=0.2)
    assert m.basis == FrontageBasis.PARTY_LINES


def test_a_lot_whose_neighbours_abut_its_ends_fronts_on_its_long_side():
    """
    The case a habit of "take the narrow dimension" gets wrong. Here the shared
    lines run across the short axis — the neighbours are ahead and behind, not
    beside — so the sides are the short edges and the street sees the long one.
    Guessing narrow would understate this lot's frontage threefold.
    """
    column = {i: rect(0, i * D) for i in range(3)}        # stacked front-to-back
    m = measure_lot(1, column[1], FT_PER_PT, [column[0], column[2]])
    assert m.frontage_ft == pytest.approx(124.0, abs=0.2)


def test_a_lot_with_no_neighbours_refuses_to_state_frontage():
    """The whole point. An unplaced lot contributes nothing to a total."""
    m = measure_lot(1, rect(0, 0), FT_PER_PT, [])
    assert m.frontage_ft is None
    assert m.basis == FrontageBasis.UNKNOWN
    assert m.measured is False


def test_one_neighbour_still_gives_a_direction_but_says_so():
    lots = row(2)
    m = measure_lot(0, lots[0], FT_PER_PT, [lots[1]])
    assert m.frontage_ft == pytest.approx(42.0, abs=0.1)
    assert m.basis == FrontageBasis.ONE_NEIGHBOUR


def test_a_lot_merely_near_another_is_not_sharing_a_line():
    """Proximity is not adjacency — a lot across the street is not a neighbour."""
    far = rect(W + 40.0, 0)          # a street's width away
    m = measure_lot(1, rect(0, 0), FT_PER_PT, [far])
    assert m.frontage_ft is None


# ── the defect that made this module necessary ──────────────────────────────


def test_neighbouring_lots_do_not_come_out_on_alternating_axes():
    """
    The regression. A recovered ring is not four tidy segments — a side line
    breaks wherever an easement crosses it. Deciding the street edge by
    counting shared EDGES then read the split side as dominant, and adjacent
    lots alternated between 42 feet and 124. Measuring shared LENGTH fixes it.
    """
    lots = row(6)
    # split one side of every other lot into four collinear pieces, as an
    # easement crossing would
    for i in (1, 3, 5):
        x, y = lots[i][0]
        lots[i] = [(x, y), (x + W, y), (x + W, y + D),
                   (x, y + D), (x, y + 0.75 * D), (x, y + 0.5 * D), (x, y + 0.25 * D)]
    out = measure_lots(lots, FT_PER_PT)
    fronts = [round(m.frontage_ft) for m in out.values() if m.measured]
    assert fronts, "no lot resolved"
    assert set(fronts) == {42}, f"frontage came out on mixed axes: {sorted(set(fronts))}"


# ── totals ──────────────────────────────────────────────────────────────────


def test_a_total_never_absorbs_a_lot_it_could_not_measure():
    lots = row(4)
    out = measure_lots(lots, FT_PER_PT)
    out[99] = LotDimensions(99, 60.0, 200.0, 12000.0, None, FrontageBasis.UNKNOWN, 0.0)
    feet, counted, excluded = total_frontage(out.values())
    assert counted == 4 and excluded == 1
    assert feet == pytest.approx(4 * 42.0, abs=0.5)


def test_the_excluded_count_is_reported_not_hidden():
    """
    A total that quietly drops lots reads identically to one that includes
    them. On this plat that difference was 7% of the frontage.
    """
    feet, counted, excluded = total_frontage([
        LotDimensions(1, 42, 124, 5208, 42.0, FrontageBasis.PARTY_LINES, 0.0),
        LotDimensions(2, 230, 230, 52746, None, FrontageBasis.UNKNOWN, 0.0),
    ])
    assert (feet, counted, excluded) == (42.0, 1, 1)


# ── the invariant that would have caught the deduction ──────────────────────


def _box_area(m: LotDimensions) -> float:
    return m.width_ft * m.depth_ft


@pytest.mark.parametrize("ring,label", [
    (rect(0, 0), "a plain rectangle"),
    (rect(0, 0, W * 2, D), "a double-width lot"),
    ([(0, 0), (W, 0), (W, D), (W / 2, D * 1.1), (0, D)], "a wedge on a cul-de-sac"),
    ([(0, 0), (W, 5), (W - 3, D), (2, D - 4)], "a lot drawn slightly out of square"),
])
def test_the_bounding_rectangle_is_never_smaller_than_what_it_bounds(ring, label):
    """A cheap, universal check, and the one this module needed.

    `measure_lot` used to subtract the gap-closing growth from both axes, which
    left 224 of 238 real lots reporting a width x depth SMALLER than their own
    polygon area — lot 128 came out 4,928 sq ft around a 5,039 sq ft shape.
    That is geometrically impossible for a bounding rectangle, and it is the
    proof the deduction was removing something never added.

    This holds for any shape whatever, so it needs no fixture that anticipates
    the failure — which is exactly what the old tests lacked, having set the
    growth to zero and never exercised it.
    """
    m = measure_lot(1, ring, FT_PER_PT, [])
    assert _box_area(m) >= m.area_sqft - 1e-6, (
        f"{label}: bounding box {_box_area(m):.1f} sq ft is smaller than the "
        f"{m.area_sqft:.1f} sq ft polygon it encloses"
    )


def test_a_lot_measures_the_ring_it_was_given_with_nothing_deducted():
    """42 x 124 in, 42 x 124 out. The plat states 42.00 and the recovered
    polygon agrees with the stated area at a ratio of 1.0000, so any dimension
    that does not come back at 42 is the measurement editing its input."""
    m = measure_lot(1, rect(0, 0), FT_PER_PT, [])
    assert m.width_ft == pytest.approx(42.0, abs=0.01)
    assert m.depth_ft == pytest.approx(124.0, abs=0.01)


def test_frontage_is_one_of_the_measured_dimensions_not_a_separate_figure():
    """Frontage is not computed independently — it IS the oriented box's short
    or long side, chosen by the party-line test. So anything applied to those
    dimensions lands on every parcel's frontage total too, which is how the
    removed deduction shortened Red Valley by ~0.69 ft on each of 246 lots."""
    lots = row(3)
    m = measure_lot(1, lots[1], FT_PER_PT, [lots[0], lots[2]])
    assert m.frontage_ft in (m.width_ft, m.depth_ft)
    assert m.frontage_ft == pytest.approx(42.0, abs=0.01)
