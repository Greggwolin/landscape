"""
Tie every lot number on a plat to the outline it sits inside.

This is the step that turns a plat from a picture into an inventory: after it
runs, each lot has a number, a boundary and an area, and every one of those
areas has been checked against a figure the drawing states independently.

The method
----------
1. **Take the linework.** Straight runs, rectangle sides, and Bezier curves
   flattened into short chords. Curved street frontages matter — a lot on a
   bend has no front boundary without them.

2. **Rebuild long lines from fragments.** Producers emit an arc as hundreds of
   sub-point chords. A length floor applied to the raw pieces throws all of it
   away (measured: 92% of the linework on a 2025 final plat, 101,738 of 110,954
   pieces). So fragments are chained through shared endpoints while the
   direction barely changes, and the floor is applied to the assembled run.
   The angle limit is what separates a flattened arc, which turns a degree at a
   time, from hatching, which reverses at every node.

3. **Close hairline gaps.** Lot lines routinely stop a hair short of the line
   they should meet, so the face never closes and several lots merge into one
   region. Each line is extended slightly at both ends. The tolerance is
   escalated (see below) rather than guessed.

4. **Recover the faces and take each one's OUTER boundary.** This is not
   cosmetic. Plats draw building setbacks and easements as closed shapes
   *inside* each lot, so a face recovered with its interior rings intact is a
   doughnut — and the lot number, which sits in the middle, falls in the hole
   and reads as outside its own lot. Keeping the holes drops the match rate
   from 78 lots to 1. A lot is its perimeter, not its perimeter minus its
   easements.

5. **Assign by sole occupancy.** A lot's face is the largest region containing
   its number and no other lot's number. Larger regions have swallowed a
   neighbour; smaller ones are slivers cut off by an easement line.

6. **Gate every result on the drawing's own arithmetic.** Plats carry a lot
   area table. A recovered outline is accepted only if its area agrees with the
   stated area for that lot. Because of that gate, escalating the gap tolerance
   can only ever add lots: a tolerance that distorts geometry produces areas
   that no longer agree, and those results are discarded rather than kept.

Measured on the Red Valley Ranch Phase 1 final plat (Rick Engineering,
21 Jan 2025 — 286 lots over three sheets):

    accepted                231 lots, each area-verified within 1%
    median area error       0.001%
    implied sheet scale     1 inch = 50.00 ft   (derived, not read)
    still merged            54 lots

The scale is the load-bearing check. Nothing supplies it; it falls out of
matching computed areas to stated ones, and it lands on a round engineering
scale. A tolerance that has begun distorting the geometry drives it off that
value — at a 1.7 ft tolerance the raw match count rose to 246 while the implied
scale drifted to 56 ft and the median error to 4.3%, and the gate correctly
accepted none of it.

What this deliberately does NOT do: place the sheet in the world. Georeferencing
stays with the corner-pinning tools. This produces geometry in page coordinates
plus a scale, which is what a placement step consumes.
"""

from __future__ import annotations

import collections
import logging
import math
import re
from dataclasses import dataclass, field
from statistics import median
from typing import Iterable, Optional, Sequence

logger = logging.getLogger(__name__)

try:
    import pymupdf
except ImportError:  # pragma: no cover
    pymupdf = None

#: Assembled runs shorter than this are lettering or noise, not boundary.
MIN_RUN_PT = 12.0

#: Chain two fragments only if the direction changes by less than this. A
#: flattened arc turns fractionally per chord; hatching reverses.
MAX_TURN_RAD = math.radians(15.0)

#: Gap tolerances tried in order, in points. Escalation is safe because every
#: result is gated on the stated area (see module docstring).
GAP_LADDER_PT = (0.5, 1.0, 1.5, 2.5, 4.0)

#: A recovered area must agree with the stated area to within this.
AREA_TOLERANCE = 0.01

#: Faces smaller than this are slivers between easement lines.
MIN_FACE_PT2 = 200.0

#: Engineering sheets are drawn at round scales; used to sanity-check the fit.
COMMON_SCALES_FT_PER_INCH = (20, 30, 40, 50, 60, 100, 200, 300)


@dataclass(frozen=True)
class MatchedLot:
    """One lot, with its number, its boundary and a verified area."""

    number: int
    page: int
    ring: list[tuple[float, float]]
    #: Area in square feet, from the geometry and the fitted scale.
    area_sqft: float
    #: Area in square feet as the drawing's own table states it.
    stated_sqft: int
    #: Gap tolerance, in points, that this lot needed in order to close.
    gap_used_pt: float
    #: How this lot was established. "traced" — its own number sat inside its
    #: own recovered face. "positional" — the face was recovered but carried no
    #: number, and was identified by walking the chain between two named
    #: neighbours (see `lot_infill`).
    source: str = "traced"

    @property
    def error(self) -> float:
        return abs(self.area_sqft - self.stated_sqft) / self.stated_sqft


@dataclass
class LotMatchResult:
    matched: list[MatchedLot] = field(default_factory=list)
    #: Lot numbers present in the table that never closed into their own face.
    unresolved: list[int] = field(default_factory=list)
    #: Square feet per square point.
    scale_sqft_per_pt2: float = 0.0
    #: Runs the positional infill refused whole, with a plain-English reason.
    #: Reported, never silently dropped: a refusal is the mechanism working.
    infill_refusals: list = field(default_factory=list)

    @property
    def scale_ft_per_inch(self) -> float:
        return 72.0 * math.sqrt(self.scale_sqft_per_pt2) if self.scale_sqft_per_pt2 else 0.0

    @property
    def scale_is_round(self) -> bool:
        """Whether the fitted scale is one an engineer would have drawn at."""
        s = self.scale_ft_per_inch
        return any(abs(s - c) / c < 0.02 for c in COMMON_SCALES_FT_PER_INCH)

    @property
    def median_error(self) -> float:
        return median([m.error for m in self.matched]) if self.matched else 0.0

    def summary(self) -> str:
        return (
            f"{len(self.matched)} lots matched and area-verified, "
            f"{len(self.unresolved)} unresolved; "
            f"scale 1in = {self.scale_ft_per_inch:.2f} ft "
            f"({'round' if self.scale_is_round else 'NOT round — suspect'}), "
            f"median area error {self.median_error * 100:.3f}%"
        )


# ---------------------------------------------------------------- linework


def _flatten_bezier(p, n: int = 6):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((
            u ** 3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t ** 3 * p[3][0],
            u ** 3 * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t ** 3 * p[3][1],
        ))
    return out


def split_linework(drawings: Iterable[dict], min_run_pt: float = MIN_RUN_PT):
    """Every drawn segment, separated into already-long and fragment."""
    long_, short_ = [], []
    for group in drawings:
        for it in group.get("items", ()):
            raw = []
            if it[0] == "l":
                raw = [((it[1].x, it[1].y), (it[2].x, it[2].y))]
            elif it[0] == "re":
                r = it[1]
                c = [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
                raw = [(c[i], c[(i + 1) % 4]) for i in range(4)]
            elif it[0] == "c":
                pts = _flatten_bezier([(p.x, p.y) for p in it[1:5]])
                raw = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
            for a, b in raw:
                if a == b:
                    continue
                (long_ if math.dist(a, b) >= min_run_pt else short_).append((a, b))
    return long_, short_


def chain_fragments(
    short_: Sequence[tuple], max_turn: float = MAX_TURN_RAD, min_run_pt: float = MIN_RUN_PT
) -> list[list[tuple[float, float]]]:
    """Walk fragment to fragment while the heading barely changes."""
    key = lambda p: (round(p[0], 2), round(p[1], 2))
    at: dict = collections.defaultdict(list)
    for i, (a, b) in enumerate(short_):
        at[key(a)].append(i)
        at[key(b)].append(i)

    heading = lambda a, b: math.atan2(b[1] - a[1], b[0] - a[0])
    seen: set[int] = set()
    runs: list[list[tuple[float, float]]] = []

    for i in range(len(short_)):
        if i in seen:
            continue
        seen.add(i)
        a, b = short_[i]
        pts = [a, b]
        for end in (0, 1):
            if end:
                pts.reverse()
            while True:
                p, q = pts[-2], pts[-1]
                d = heading(p, q)
                best = None
                for j in at[key(q)]:
                    if j in seen:
                        continue
                    x, y = short_[j]
                    onward = y if key(x) == key(q) else (x if key(y) == key(q) else None)
                    if onward is None:
                        continue
                    turn = abs((heading(q, onward) - d + math.pi) % (2 * math.pi) - math.pi)
                    if turn <= max_turn and (best is None or turn < best[0]):
                        best = (turn, j, onward)
                if best is None:
                    break
                seen.add(best[1])
                pts.append(best[2])
        length = sum(math.dist(pts[k], pts[k + 1]) for k in range(len(pts) - 1))
        if length >= min_run_pt:
            runs.append(pts)
    return runs


def extend_ends(pts: Sequence[tuple[float, float]], grow_pt: float):
    """Push both ends outward so a hairline gap closes."""
    if grow_pt <= 0:
        return list(pts)
    p = list(pts)
    for at_start, (a, b) in ((True, (p[1], p[0])), (False, (p[-2], p[-1]))):
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        if L <= 0:
            continue
        moved = (b[0] + dx / L * grow_pt, b[1] + dy / L * grow_pt)
        if at_start:
            p[0] = moved
        else:
            p[-1] = moved
    return p


def faces_from_lines(lines) -> list:
    """
    Recover enclosed regions, keeping each one's OUTER boundary only.

    Discarding interior rings is required, not tidy-minded: setbacks and
    easements are drawn as closed shapes inside a lot, and a face that keeps
    them as holes excludes its own lot number. See the module docstring.
    """
    from shapely.geometry import Polygon
    from shapely.ops import polygonize, unary_union

    out = []
    for poly in polygonize(unary_union(list(lines))):
        solid = Polygon(poly.exterior)
        if solid.is_valid and solid.area > MIN_FACE_PT2:
            out.append(solid)
    return out


# ----------------------------------------------------------------- labels


def lot_number_tokens(page, lo: int, hi: int, min_height_pt: float = 13.0):
    """Lot numbers as live text, with their positions on the sheet."""
    from shapely.geometry import Point

    out = []
    for w in page.get_text("words"):
        if not re.fullmatch(r"\d{1,4}", w[4]):
            continue
        value = int(w[4])
        if not (lo <= value <= hi):
            continue
        if (w[3] - w[1]) < min_height_pt:
            continue
        out.append((value, Point((w[0] + w[2]) / 2, (w[1] + w[3]) / 2)))
    return out


def ambiguous_numbers(tokens) -> set:
    """Lot numbers this sheet prints more than once.

    A CAD export can emit the WRONG number rather than no number: on the Red
    Valley plat, lots 256, 306 and 316 each carry their left-hand neighbour's
    label in the text layer, so "255", "305" and "315" each appear twice while
    256/306/316 appear not at all.

    That is worse than a missing label, because it does not fail — it succeeds
    wrongly. Sole occupancy takes the last token it sees, so lot 255 was
    matched to lot 256's outline, and since both lots are 42 x 120 the area
    gate agreed with it exactly. A number that appears twice identifies
    nothing, so both of its faces are handed to the positional infill to be
    resolved from their neighbours instead.
    """
    import collections

    counts = collections.Counter(v for v, _ in tokens)
    return {v for v, n in counts.items() if n > 1}


def _sole_occupancy(faces, tokens, all_candidates: bool = False):
    """Largest face holding this lot's number and no other lot's number.

    With ``all_candidates``, returns every qualifying face per lot instead of
    only the largest. The largest remains the primary answer — the fallback in
    `match_lots` consults the rest only for lots the primary already failed to
    place, so no lot that places today can be re-decided by it.
    """
    from shapely.strtree import STRtree

    tree = STRtree([t[1] for t in tokens])
    ambiguous = ambiguous_numbers(tokens)
    found: dict[int, object] = {}
    every: dict[int, list] = {}
    for value, point in tokens:
        if value in ambiguous:
            # Cannot identify a face — see `ambiguous_numbers`. Still counted as
            # an occupant below, because a face holding two labels is a merged
            # region whether or not either label can be trusted.
            continue
        best = None
        for face in faces:
            if not face.contains(point):
                continue
            occupants = sum(1 for i in tree.query(face) if face.contains(tokens[i][1]))
            if occupants != 1:
                continue
            every.setdefault(value, []).append(face)
            if best is None or face.area > best.area:
                best = face
        if best is not None:
            found[value] = best
    return every if all_candidates else found


def unnamed_faces(faces, tokens):
    """Faces carrying no lot number at all.

    These are the shapes a CAD export orphaned by flattening their label into
    line-work. `_sole_occupancy` cannot see them — it walks tokens, and these
    have none — so they are collected separately for `lot_infill` to name from
    the numbering of their neighbours.
    """
    from shapely.strtree import STRtree

    if not tokens:
        return list(faces)
    tree = STRtree([t[1] for t in tokens])
    ambiguous = ambiguous_numbers(tokens)
    # A face whose only label is a duplicated number is unidentified, not
    # identified — it belongs here so the chain can name it from its
    # neighbours, which is the only evidence left once the label is untrustworthy.
    return [
        f for f in faces
        if not any(
            tokens[i][0] not in ambiguous and f.contains(tokens[i][1])
            for i in tree.query(f)
        )
    ]


# ------------------------------------------------------------------- API


def match_lots(
    pdf_path: str,
    sheets: Sequence[int],
    stated_areas: dict[int, int],
    number_range: tuple[int, int] = (1, 9999),
    gap_ladder: Sequence[float] = GAP_LADDER_PT,
) -> LotMatchResult:
    """
    Tie lot numbers to outlines across a plat's sheets, verifying as it goes.

    `stated_areas` is the drawing's own lot area table, keyed by lot number.
    It is the acceptance test, which is what makes the escalating gap
    tolerance safe: a tolerance that distorts geometry fails the check and its
    results are dropped rather than kept.
    """
    if pymupdf is None:  # pragma: no cover
        raise RuntimeError("PyMuPDF is required to read a plat")
    from shapely.geometry import LineString

    doc = pymupdf.open(pdf_path)
    try:
        prepared = {}
        for pi in sheets:
            page = doc[pi]
            long_, short_ = split_linework(page.get_drawings())
            prepared[pi] = (
                long_,
                chain_fragments(short_),
                lot_number_tokens(page, *number_range),
            )
            logger.info(
                "sheet %d: %d long lines, %d fragments, %d lot labels",
                pi, len(long_), len(short_), len(prepared[pi][2]),
            )

        result = LotMatchResult()
        accepted: dict[int, MatchedLot] = {}

        from .lot_infill import infill_by_position

        def _accept(value, pi, face, grow, scale, source):
            accepted[value] = MatchedLot(
                number=value,
                page=pi,
                ring=[(float(x), float(y)) for x, y in face.exterior.coords],
                area_sqft=face.area * scale,
                stated_sqft=stated_areas[value],
                gap_used_pt=grow,
                source=source,
            )

        def _agrees(face, value, scale):
            got = face.area * scale
            return abs(got - stated_areas[value]) / stated_areas[value] <= AREA_TOLERANCE

        seen_refusals: set[tuple] = set()

        for grow in gap_ladder:
            per_sheet: dict[int, tuple] = {}
            found: dict[int, tuple[int, object]] = {}
            for pi in sheets:
                long_, runs, tokens = prepared[pi]
                lines = [LineString(extend_ends(list(s), grow)) for s in long_]
                lines += [LineString(extend_ends(r, grow)) for r in runs]
                faces = faces_from_lines(lines)
                # One occupancy pass, reused three ways: the largest qualifying
                # face per lot (the primary answer, unchanged), every
                # qualifying face (the fallback), and the faces with no number
                # at all (the infill).
                every = _sole_occupancy(faces, tokens, all_candidates=True)
                sole = {v: max(c, key=lambda f: f.area) for v, c in every.items()}
                per_sheet[pi] = (faces, tokens, sole, every)
                for value, face in sole.items():
                    found[value] = (pi, face)

            if not result.scale_sqft_per_pt2:
                shared = [v for v in found if v in stated_areas]
                if not shared:
                    continue
                result.scale_sqft_per_pt2 = median(
                    stated_areas[v] / found[v][1].area for v in shared
                )

            scale = result.scale_sqft_per_pt2
            for value, (pi, face) in found.items():
                if value in accepted or value not in stated_areas:
                    continue
                if _agrees(face, value, scale):
                    _accept(value, pi, face, grow, scale, "traced")

            # FALLBACK — strictly additive. Sole occupancy answers with the
            # LARGEST qualifying face, which is wrong for a lot whose largest
            # candidate swallowed a neighbour. Consulting the smaller
            # candidates recovers those, and because this only ever looks at
            # lots the primary pass did not place, it cannot re-decide a lot
            # that places today. That matters: a project has already been
            # written from the current matches.
            for pi in sheets:
                _, _, _, every = per_sheet[pi]
                for value, candidates in every.items():
                    if value in accepted or value not in stated_areas:
                        continue
                    for face in candidates:
                        if _agrees(face, value, scale):
                            _accept(value, pi, face, grow, scale, "traced")
                            break

            # INFILL — name the faces the file left unnamed. Anchors are
            # restricted to lots whose own area agrees with the schedule; an
            # anchor whose face swallowed its neighbour would drag a whole run
            # onto the wrong shapes. Verifying the anchor refuses rather than
            # selects, so it does not make the identification circular.
            outstanding = set(stated_areas) - set(accepted)
            if outstanding:
                for pi in sheets:
                    faces, tokens, sole, _ = per_sheet[pi]
                    anchors = {
                        v: f for v, f in sole.items()
                        if v in stated_areas and v in accepted and _agrees(f, v, scale)
                    }
                    if not anchors:
                        continue
                    outcome = infill_by_position(
                        named=anchors,
                        unnamed=unnamed_faces(faces, tokens),
                        stated_areas=stated_areas,
                        scale_sqft_per_pt2=scale,
                        unassigned=set(stated_areas) - set(accepted),
                    )
                    for value, face in outcome.assigned.items():
                        if value not in accepted:
                            _accept(value, pi, face, grow, scale, "positional")
                    for lots, why in outcome.refusals:
                        key = (tuple(lots), why)
                        if key not in seen_refusals:
                            seen_refusals.add(key)
                            result.infill_refusals.append((list(lots), why))

        result.matched = [accepted[v] for v in sorted(accepted)]
        result.unresolved = sorted(set(stated_areas) - set(accepted))
        if not result.scale_is_round:
            logger.warning(
                "fitted scale 1in = %.2f ft is not a round engineering scale — "
                "treat the placement as unverified",
                result.scale_ft_per_inch,
            )
        return result
    finally:
        doc.close()
