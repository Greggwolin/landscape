"""Naming the shapes the plat's own file does not name.

Every fixture is built in memory from coordinate rings. The tests that matter
most are the refusals, because each one encodes a way this could quietly
produce a wrong answer:

  * ``test_area_cannot_confirm_an_assignment`` — eleven lots on the Red Valley
    plat state 5040 sq ft, so an assignment agreeing with the stated area
    proves nothing. Area is a veto and only a veto.
  * ``test_two_ways_to_walk_refuses_the_whole_run`` — a branch means the
    numbering is not decided, and "three of them are probably right" is not an
    answer.
  * ``test_a_duplicated_number_identifies_nothing`` — the failure that was
    silently mislabelling lots: the export emits the neighbour's number, sole
    occupancy takes the last one, and the area gate agrees because both lots
    are the same size.

Session: LSCMD-PLANFILL-0818-MK55
"""
import pytest

pytest.importorskip("shapely")

from shapely.geometry import Polygon  # noqa: E402

from apps.knowledge.services.plan_geometry.lot_infill import (  # noqa: E402
    build_adjacency,
    infill_by_position,
)

#: 1 sq unit == 1 sq ft keeps the arithmetic in the tests readable.
SCALE = 1.0


def box(x0, x1, area=100.0):
    """A lot spanning x0..x1, `area` tall — so area is exactly (x1-x0)*height."""
    h = area / (x1 - x0)
    return Polygon([(x0, 0), (x1, 0), (x1, h), (x0, h)])


def row(n, width=10.0, area=100.0):
    return [box(i * width, (i + 1) * width, area) for i in range(n)]


def test_a_single_unnamed_shape_between_two_neighbours_is_named():
    a, mid, b = row(3)
    out = infill_by_position(
        named={1: a, 3: b}, unnamed=[mid],
        stated_areas={1: 100, 2: 100, 3: 100}, scale_sqft_per_pt2=SCALE,
    )
    assert set(out.assigned) == {2}
    assert out.refusals == []


def test_three_unnamed_shapes_are_named_in_walk_order_not_by_position():
    """104, 105, 106 must fall out of walking the chain."""
    faces = row(5)
    out = infill_by_position(
        named={103: faces[0], 107: faces[4]}, unnamed=faces[1:4],
        stated_areas={103: 100, 104: 100, 105: 100, 106: 100, 107: 100},
        scale_sqft_per_pt2=SCALE,
    )
    assert set(out.assigned) == {104, 105, 106}
    assert out.assigned[104].bounds[0] == 10.0   # nearest the 103 anchor
    assert out.assigned[106].bounds[0] == 30.0   # nearest the 107 anchor


def test_one_shape_too_few_refuses_the_whole_run():
    a, mid, b = row(3)
    out = infill_by_position(
        named={1: a, 4: b}, unnamed=[mid],
        stated_areas={1: 100, 2: 100, 3: 100, 4: 100}, scale_sqft_per_pt2=SCALE,
    )
    assert out.assigned == {}
    assert out.refusals and out.refusals[0][0] == [2, 3]
    assert "no unbroken chain" in out.refusals[0][1]


def test_a_broken_chain_refuses_rather_than_reaching_across_the_gap():
    """A street between two lots is not adjacency."""
    a = box(0, 10)
    far = box(100, 110)          # nothing shared with anything
    b = box(110, 120)
    out = infill_by_position(
        named={1: a, 3: b}, unnamed=[far],
        stated_areas={1: 100, 2: 100, 3: 100}, scale_sqft_per_pt2=SCALE,
    )
    assert out.assigned == {}
    assert out.refusals


def test_two_ways_to_walk_refuses_the_whole_run():
    """A branch means which shape is which is not decided."""
    a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
    b = Polygon([(20, 0), (30, 0), (30, 10), (20, 10)])
    upper = Polygon([(10, 0), (20, 0), (20, 5), (10, 5)])
    lower = Polygon([(10, 5), (20, 5), (20, 10), (10, 10)])
    out = infill_by_position(
        named={1: a, 3: b}, unnamed=[upper, lower],
        stated_areas={1: 100, 2: 50, 3: 100}, scale_sqft_per_pt2=SCALE,
    )
    assert out.assigned == {}
    assert "different ways to walk" in out.refusals[0][1]


def test_area_is_a_veto_a_chain_onto_wrong_sized_shapes_is_refused():
    a, mid, b = row(3)
    out = infill_by_position(
        named={1: a, 3: b}, unnamed=[mid],
        stated_areas={1: 100, 2: 9999, 3: 100},   # 2 cannot be this shape
        scale_sqft_per_pt2=SCALE,
    )
    assert out.assigned == {}
    assert "wrong size" in out.refusals[0][1]


def test_area_cannot_confirm_an_assignment_only_refuse_it():
    """Every candidate agreeing equally well is why area cannot identify.

    Both unnamed shapes are exactly 100 sq ft, as eleven Red Valley lots are
    exactly 5040. If area were doing the identifying this would resolve; it
    must not, because agreement carries no information here — only the unique
    chain does, and here the chain is unique so the run stands on that.
    """
    faces = row(4)
    out = infill_by_position(
        named={1: faces[0], 4: faces[3]}, unnamed=faces[1:3],
        stated_areas={1: 100, 2: 100, 3: 100, 4: 100}, scale_sqft_per_pt2=SCALE,
    )
    assert set(out.assigned) == {2, 3}
    assert out.assigned[2].bounds[0] == 10.0 and out.assigned[3].bounds[0] == 20.0


def test_a_run_spanning_a_hundred_block_is_not_a_run():
    """180 and 201 are the last lot of one parcel and the first of another."""
    a, mid, b = row(3)
    out = infill_by_position(
        named={180: a, 201: b}, unnamed=[mid],
        stated_areas={180: 100, 182: 100, 201: 100}, scale_sqft_per_pt2=SCALE,
    )
    assert out.assigned == {}
    assert out.refusals == []          # skipped, not refused — never a run


def test_a_shape_is_never_given_to_two_runs():
    faces = row(5)
    out = infill_by_position(
        named={1: faces[0], 3: faces[2], 5: faces[4]}, unnamed=[faces[1], faces[3]],
        stated_areas={1: 100, 2: 100, 3: 100, 4: 100, 5: 100}, scale_sqft_per_pt2=SCALE,
    )
    assert set(out.assigned) == {2, 4}
    assert out.assigned[2] is not out.assigned[4]


def test_lots_placed_elsewhere_break_the_run():
    """If a number between two anchors was matched on another sheet, the two
    anchors are not consecutive and the shapes between them are not one run."""
    a, mid, b = row(3)
    out = infill_by_position(
        named={1: a, 3: b}, unnamed=[mid],
        stated_areas={1: 100, 2: 100, 3: 100}, scale_sqft_per_pt2=SCALE,
        unassigned=set(),                      # 2 is already placed somewhere
    )
    assert out.assigned == {}
    assert out.refusals == []


def test_faces_touching_at_a_corner_are_not_neighbours():
    a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
    diagonal = Polygon([(10, 10), (20, 10), (20, 20), (10, 20)])
    adjacency = build_adjacency([a, diagonal])
    assert adjacency[0] == set()


def test_a_face_containing_another_is_not_its_neighbour():
    """A merged region swallowing a lot must not be walked into."""
    big = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
    inner = Polygon([(10, 10), (20, 10), (20, 20), (10, 20)])
    adjacency = build_adjacency([big, inner])
    assert adjacency[0] == set()


def test_a_duplicated_number_identifies_nothing():
    """The Red Valley failure: the export emits the neighbour's number.

    Lots 256, 306 and 316 each carry their left neighbour's label, so "255"
    appears twice and "256" never. Sole occupancy took the last one, matching
    lot 255 to lot 256's outline — and because both are 42 x 120 the area gate
    agreed exactly. Both faces must be treated as unidentified.
    """
    from apps.knowledge.services.plan_geometry.lot_match import (
        ambiguous_numbers,
        unnamed_faces,
    )
    from shapely.geometry import Point

    tokens = [(254, Point(5, 5)), (255, Point(15, 5)), (255, Point(25, 5)), (257, Point(35, 5))]
    assert ambiguous_numbers(tokens) == {255}

    faces = row(4)
    free = unnamed_faces(faces, tokens)
    # The two faces holding a duplicated "255" are available to be named; the
    # faces holding the trustworthy 254 and 257 are not.
    assert len(free) == 2
    assert sorted(f.bounds[0] for f in free) == [10.0, 20.0]
