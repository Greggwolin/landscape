"""
Turn a recovered lot outline into the numbers a land deal is priced on:
width, depth, and — the one that matters — street frontage.

Why frontage is the hard one
----------------------------
Width and depth fall out of the shape. Frontage does not, because frontage is
not a property of the lot at all: it is a property of which *edge touches the
street*, and a rectangle has no opinion about that. A lot 42 by 124 has 42 feet
of frontage on a normal street and 124 if it happens to be turned sideways at
the end of a block, and no amount of staring at the rectangle distinguishes the
two.

The temptation is to take the narrow dimension and move on. That is right for
most residential lots and quietly wrong for corner lots, wedge lots on a
cul-de-sac, and the oversized lots most subdivisions carry a few of. On the
Red Valley Ranch Phase 1 plat, taking stated area ÷ typical depth for the lots
that could not be measured invented about 440 feet of frontage for each of two
1.21-acre lots and inflated the total by 7%.

So the method here is evidence-based, and refuses when the evidence is absent.

The party-line test
-------------------
Lots in a row share their side lines with their neighbours. Those shared edges
are *party lines*; the edges with nobody on the other side are the front and
the back. So:

1. Fit a minimum-area rectangle to the outline. This gives two dimensions and
   an orientation, and unlike an axis-aligned box it survives a plat drawn at
   an angle — which every plat on a curving street is, locally.
2. Find which edges are shared with a neighbouring lot.
3. If the shared edges run along the rectangle's long axis, the lot is a
   normal interior lot and its frontage is the short dimension. If they run
   along the short axis, it is turned sideways and frontage is the long one.
4. If no edge is shared — an isolated lot, or one whose neighbours were never
   recovered — **return frontage as unknown.** Do not guess.

What this deliberately does NOT do
----------------------------------
Find the street. Doing that properly means recovering the right-of-way as a
face and testing adjacency, which is a bigger job and needs the linework this
module is not given. The party-line test is a weaker signal that happens to be
sufficient for platted subdivisions, where lots come in rows. It reports its
own confidence, and a lot it cannot resolve is excluded from a total rather
than estimated into one.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Optional, Sequence

__all__ = [
    "LotDimensions",
    "measure_lot",
    "measure_lots",
    "total_frontage",
    "FrontageBasis",
]

Ring = Sequence[tuple[float, float]]

#: Two edges count as shared when they run parallel within this many degrees
#: and lie within this distance of each other, in points on the sheet. A plat's
#: party line is drawn once and both lots close on it, so the tolerance only
#: needs to absorb the gap-closing growth applied during recovery.
_PARALLEL_DEG = 4.0
_TOUCH_PT = 2.5


class FrontageBasis:
    """How a lot's frontage was decided — carried so a total can be audited."""

    PARTY_LINES = "party_lines"      #: neighbours on both sides; strongest
    ONE_NEIGHBOUR = "one_neighbour"  #: end of a row; still directional
    UNKNOWN = "unknown"              #: nothing to go on — excluded from totals


@dataclass(frozen=True)
class LotDimensions:
    """One lot, measured. `frontage_ft` is None when it could not be decided."""

    number: int
    width_ft: float
    depth_ft: float
    area_sqft: float
    frontage_ft: Optional[float]
    basis: str
    #: Degrees the lot is rotated from square-to-the-page. Non-zero is normal
    #: on a curving street and is why an axis-aligned box will not do.
    rotation_deg: float

    @property
    def measured(self) -> bool:
        return self.frontage_ft is not None


# ── geometry helpers ────────────────────────────────────────────────────────


def _edges(ring: Ring):
    pts = list(ring)
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    return [(pts[i], pts[(i + 1) % len(pts)]) for i in range(len(pts))]


def _heading(a, b) -> float:
    """Edge direction in degrees, folded to 0–180 — a line has no arrowhead."""
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 180.0


def _length(a, b) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def _parallel(h1: float, h2: float) -> bool:
    d = abs(h1 - h2) % 180.0
    return min(d, 180.0 - d) <= _PARALLEL_DEG


def _point_to_segment(p, a, b) -> float:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(p[0] - ax, p[1] - ay)
    t = max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy))


def _shares(e1, e2) -> bool:
    """Whether two edges are the same drawn line seen from either side."""
    if not _parallel(_heading(*e1), _heading(*e2)):
        return False
    # both ends of the shorter edge must sit on the longer one
    short, long_ = (e1, e2) if _length(*e1) <= _length(*e2) else (e2, e1)
    if _point_to_segment(short[0], *long_) > _TOUCH_PT:
        return False
    if _point_to_segment(short[1], *long_) > _TOUCH_PT:
        return False
    return True


def _oriented_box(ring: Ring):
    """Minimum-area rectangle: (long_ft_pt, short_ft_pt, long_heading_deg)."""
    from shapely.geometry import Polygon

    rect = Polygon(ring).minimum_rotated_rectangle
    pts = list(rect.exterior.coords)[:-1]
    sides = [(_length(pts[i], pts[(i + 1) % 4]), _heading(pts[i], pts[(i + 1) % 4]))
             for i in range(4)]
    sides.sort(key=lambda s: -s[0])
    return sides[0][0], sides[2][0], sides[0][1]


# ── the measurement ─────────────────────────────────────────────────────────


def measure_lot(
    number: int,
    ring: Ring,
    ft_per_pt: float,
    neighbours: Iterable[Ring] = (),
    grow_pt: float = 0.5,
) -> LotDimensions:
    """
    Measure one lot. `neighbours` are the outlines of nearby lots, used only to
    find shared side lines; passing none yields `frontage_ft = None`.

    `grow_pt` is the gap-closing growth applied during recovery, removed here
    so a lot does not read a foot wider than it is.
    """
    from shapely.geometry import Polygon

    poly = Polygon(ring)
    long_pt, short_pt, long_heading = _oriented_box(ring)
    long_ft = max(0.0, long_pt - 2 * grow_pt) * ft_per_pt
    short_ft = max(0.0, short_pt - 2 * grow_pt) * ft_per_pt
    area = poly.area * ft_per_pt * ft_per_pt
    rotation = min(long_heading % 90.0, 90.0 - (long_heading % 90.0))

    # which of this lot's edges are shared with a neighbour
    # Measure the shared boundary by LENGTH, not by edge count.
    #
    # A recovered ring is not four tidy segments: a side line is broken wherever
    # an easement or a cross-line meets it, so one physical side can arrive as
    # five edges and the opposite side as one. Counting edges then reads the
    # split side as the dominant direction, and neighbouring lots come out with
    # their frontage on alternating axes — which is exactly what happened on the
    # Red Valley sheets before this was measured by length.
    mine = _edges(ring)
    theirs = [e for n in neighbours for e in _edges(n)]
    along = across = 0.0
    for e in mine:
        if not any(_shares(e, o) for o in theirs):
            continue
        if _parallel(_heading(*e), long_heading):
            along += _length(*e)
        else:
            across += _length(*e)

    if along == 0.0 and across == 0.0:
        return LotDimensions(number, short_ft, long_ft, area, None,
                             FrontageBasis.UNKNOWN, rotation)

    # a side line runs the depth of the lot, so a shared run worth believing is
    # a substantial fraction of that dimension rather than a clipped corner
    along_long = along if along >= 0.5 * long_pt else 0.0
    across = across if across >= 0.5 * short_pt else 0.0

    if along_long and along_long >= across:
        # party lines run the long way: an ordinary lot, deeper than it is wide
        frontage, basis = short_ft, (
            FrontageBasis.PARTY_LINES if along_long >= 1.6 * long_pt
            else FrontageBasis.ONE_NEIGHBOUR
        )
        width, depth = short_ft, long_ft
    elif across:
        # turned sideways — its neighbours are ahead and behind, not beside
        frontage, basis = long_ft, (
            FrontageBasis.PARTY_LINES if across >= 1.6 * short_pt
            else FrontageBasis.ONE_NEIGHBOUR
        )
        width, depth = long_ft, short_ft
    else:  # pragma: no cover — covered by the empty check above
        return LotDimensions(number, short_ft, long_ft, area, None,
                             FrontageBasis.UNKNOWN, rotation)

    return LotDimensions(number, width, depth, area, frontage, basis, rotation)


def measure_lots(
    rings: dict[int, Ring],
    ft_per_pt: float,
    grow_pt: float = 0.5,
    neighbour_radius_pt: float = 400.0,
) -> dict[int, LotDimensions]:
    """
    Measure a whole sheet's worth of lots, each against the ones near it.

    Only nearby outlines are offered as neighbours — a lot three blocks away
    cannot share a line with this one, and comparing every pair is needless.
    """
    from shapely.geometry import Polygon

    polys = {n: Polygon(r) for n, r in rings.items()}
    out: dict[int, LotDimensions] = {}
    for n, ring in rings.items():
        here = polys[n].centroid
        near = [
            rings[m] for m, p in polys.items()
            if m != n and p.centroid.distance(here) <= neighbour_radius_pt
        ]
        out[n] = measure_lot(n, ring, ft_per_pt, near, grow_pt)
    return out


def total_frontage(measured: Iterable[LotDimensions]) -> tuple[float, int, int]:
    """
    Sum the frontage that was actually established.

    Returns (feet, lots counted, lots excluded). The excluded count is not a
    footnote — a total that quietly drops lots reads the same as one that
    includes them, and the difference is the whole value of the number.
    """
    rows = list(measured)
    good = [m for m in rows if m.measured]
    return sum(m.frontage_ft for m in good), len(good), len(rows) - len(good)
