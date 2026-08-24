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

#: Maximum distance (in points) for smart endpoint snapping. Two line endpoints
#: within this distance are connected directly rather than relying on blind
#: extension. This closes gaps that extension misses — when a line stops short
#: of a perpendicular line, extension pushes it past, but snapping connects the
#: actual near-miss endpoints.
SNAP_RADIUS_PT = 6.0

#: Minimum lot area relative to the median stated area. Faces below this are
#: slivers, not lots. Used by tract extraction to set a floor for lot faces and
#: a separate (larger) floor for tract faces.
TRACT_MIN_AREA_FACTOR = 2.0


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


@dataclass(frozen=True)
class MatchedTract:
    """A drainage/utility tract identified by its alpha label (TRACT A, etc.)."""

    label: str          # e.g. "A", "B", "C"
    page: int
    ring: list[tuple[float, float]]
    area_sqft: float
    stated_sqft: int    # from tract area table on the plat
    gap_used_pt: float
    source: str = "tract"

    @property
    def error(self) -> float:
        return abs(self.area_sqft - self.stated_sqft) / self.stated_sqft if self.stated_sqft else 0.0


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
    #: Tracts identified by alpha label.
    tracts: list[MatchedTract] = field(default_factory=list)
    #: Tract labels present in the table that were not matched.
    unresolved_tracts: list[str] = field(default_factory=list)

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
        parts = (
            f"{len(self.matched)} lots matched and area-verified, "
            f"{len(self.unresolved)} unresolved; "
            f"scale 1in = {self.scale_ft_per_inch:.2f} ft "
            f"({'round' if self.scale_is_round else 'NOT round — suspect'}), "
            f"median area error {self.median_error * 100:.3f}%"
        )
        if self.tracts:
            parts += f"; {len(self.tracts)} tracts identified"
        if self.unresolved_tracts:
            parts += f", {len(self.unresolved_tracts)} tracts unresolved"
        return parts


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


def snap_endpoints(lines, radius_pt: float = SNAP_RADIUS_PT):
    """Connect near-miss line endpoints directly instead of extending blindly.

    Blind extension pushes each line end further along its own direction, which
    works when the gap is aligned with the line but fails when two lines meet
    at an angle — the extension overshoots or misses entirely. This function
    finds pairs of line endpoints that are close together and adds a short
    connecting segment between them.

    The connecting segments are added to the list rather than replacing the
    originals: the originals carry the real geometry, the connectors just close
    the gaps. Every result is still gated on the stated area, so a false
    connector that distorts geometry is rejected by the same mechanism that
    makes gap escalation safe.

    Returns the original lines plus any new connector segments.
    """
    from shapely.geometry import LineString

    # Collect all endpoints with back-references
    endpoints = []  # (x, y, line_index, which_end)
    for i, line in enumerate(lines):
        coords = list(line.coords)
        if len(coords) < 2:
            continue
        endpoints.append((coords[0][0], coords[0][1], i, 0))
        endpoints.append((coords[-1][0], coords[-1][1], i, 1))

    if not endpoints:
        return list(lines)

    # Build a spatial grid for fast neighbour lookup
    grid: dict[tuple[int, int], list[int]] = collections.defaultdict(list)
    cell = radius_pt * 2
    for idx, (x, y, li, end) in enumerate(endpoints):
        grid[(int(x // cell), int(y // cell))].append(idx)

    connectors = []
    used = set()  # each endpoint connects to at most one other

    for idx, (x, y, li, end) in enumerate(endpoints):
        if idx in used:
            continue
        cx, cy = int(x // cell), int(y // cell)
        best_dist = radius_pt
        best_idx = None
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for jdx in grid.get((cx + dx, cy + dy), ()):
                    if jdx <= idx or jdx in used:
                        continue
                    ox, oy, lj, _ = endpoints[jdx]
                    if li == lj:
                        continue  # same line
                    d = math.hypot(x - ox, y - oy)
                    if d < best_dist and d > 0.01:  # skip coincident
                        best_dist = d
                        best_idx = jdx
        if best_idx is not None:
            ox, oy = endpoints[best_idx][0], endpoints[best_idx][1]
            connectors.append(LineString([(x, y), (ox, oy)]))
            used.add(idx)
            used.add(best_idx)

    if connectors:
        logger.debug("snap_endpoints: added %d connector segments", len(connectors))
    return list(lines) + connectors


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


#: A tract label that the text layer collapsed into one word. CAD sets
#: "TRACT" and its letter with a kerned gap rather than a real space, so
#: PyMuPDF frequently returns "TRACTA" as a single word — the two-word form
#: only survives when the gap is wide enough to break the run. Both happen on
#: the same plat, so both are read.
_TRACT_MERGED = re.compile(r"^TRACT[\s.]*([A-Z])$")

#: Words that start with TRACT but are not a label. "TRACTS" would otherwise
#: read as tract "S".
_TRACT_NOT_A_LABEL = frozenset({"TRACTS"})


def tract_tokens(page, min_height_pt: float = 10.0, labels=None):
    """Tract labels as live text — matches TRACT A, TRACT B, etc.

    Tracts on a plat are labelled with alpha identifiers, not lot numbers.
    Two tokenizations occur, both on real plats and often on the same sheet:

      "TRACT" + "A"   two words, when the drawn gap is wide enough that the
                      text extractor breaks the run
      "TRACTA"        one word, when the gap is kerning rather than a space —
                      this is the common case and reading only the two-word
                      form is why tract extraction found nothing (PF1)

    `labels`, when given, is the set of tract labels the plat's own area table
    states. Anything outside it is dropped: it is the same principle as
    gating a lot on its stated area — the drawing proposes, the table decides.

    Returns a list of (label, Point) where label is the letter ("A", "B", etc.)
    and Point is the centroid of the TRACT+letter pair.
    """
    from shapely.geometry import Point

    def _wanted(label: str) -> bool:
        return labels is None or label in labels

    words = page.get_text("words")
    tract_words = []
    letter_words = []
    out = []
    for w in words:
        text = w[4].strip().upper()
        height = w[3] - w[1]
        if height < min_height_pt:
            continue
        if text in _TRACT_NOT_A_LABEL:
            continue
        if text == "TRACT":
            tract_words.append(w)
            continue
        merged = _TRACT_MERGED.fullmatch(text)
        if merged:
            # One word already carrying its own letter — no partner to find.
            label = merged.group(1)
            if _wanted(label):
                out.append((label, Point((w[0] + w[2]) / 2, (w[1] + w[3]) / 2)))
            continue
        if re.fullmatch(r"[A-Z]", text):
            letter_words.append(w)

    used_letters = set()
    for tw in tract_words:
        tmid = (tw[1] + tw[3]) / 2
        theight = tw[3] - tw[1]
        # Find the nearest letter to the right, on the same line
        best = None
        for i, lw in enumerate(letter_words):
            if i in used_letters:
                continue
            lmid = (lw[1] + lw[3]) / 2
            if abs(lmid - tmid) > theight * 0.8:
                continue  # not same line
            dx = lw[0] - tw[2]
            if dx < -2 or dx > theight * 5:
                continue  # too far or to the left
            if best is None or dx < best[0]:
                best = (dx, i, lw)
        if best is not None:
            _, li, lw = best
            label = lw[4].strip().upper()
            if not _wanted(label):
                continue
            used_letters.add(li)
            cx = (tw[0] + lw[2]) / 2
            cy = (tw[1] + lw[3]) / 2
            out.append((label, Point(cx, cy)))

    if out:
        logger.debug("tract_tokens: found %d tract labels: %s",
                      len(out), [t[0] for t in out])
    return out


def _vector_glyph_centroids(page, short_segments, lo: int, hi: int):
    """Detect lot numbers rendered as vector linework instead of text.

    When a CAD export flattens lot numbers, each digit becomes a cluster of
    tiny line segments (glyph strokes). These clusters are small (~8-15 pt
    across), spatially compact, and sit inside their lot face.

    This function clusters short segments by spatial proximity, identifies
    clusters that look like single-digit glyphs (aspect ratio, size), groups
    nearby digit-sized clusters into multi-digit numbers, and returns them as
    synthetic tokens indistinguishable from text-layer lot numbers.

    This is a heuristic, not OCR — it does not read the digits. What it DOES
    is locate WHERE vector-rendered numbers sit, so that faces containing them
    can be distinguished from truly unnamed faces. The actual lot number
    assignment still comes from positional infill; this just improves the
    signal about which faces carry a label at all.

    Returns a list of (estimated_lot_number, Point) in the same format as
    lot_number_tokens. The lot number is estimated from position within the
    known number range; if the estimate cannot be made, the cluster is skipped.
    """
    from shapely.geometry import Point

    if not short_segments:
        return []

    # Cluster short segments by endpoint proximity
    # A glyph is typically 6-14 pt across. Cluster within that radius.
    GLYPH_RADIUS = 14.0
    GLYPH_MIN_SEGMENTS = 3
    GLYPH_MAX_SEGMENTS = 40
    GLYPH_MAX_EXTENT = 18.0  # a single digit is at most this wide/tall

    # Collect all midpoints of short segments
    midpoints = []
    for a, b in short_segments:
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        seg_len = math.dist(a, b)
        if seg_len < 1.0 or seg_len > GLYPH_MAX_EXTENT:
            continue
        midpoints.append((mx, my))

    if len(midpoints) < GLYPH_MIN_SEGMENTS:
        return []

    # Simple grid-based clustering
    cell = GLYPH_RADIUS
    grid: dict[tuple[int, int], list[int]] = collections.defaultdict(list)
    for idx, (x, y) in enumerate(midpoints):
        grid[(int(x // cell), int(y // cell))].append(idx)

    visited = set()
    clusters = []
    for idx in range(len(midpoints)):
        if idx in visited:
            continue
        # BFS to collect nearby midpoints
        cluster = []
        queue = [idx]
        visited.add(idx)
        while queue:
            ci = queue.pop(0)
            cluster.append(ci)
            cx, cy = midpoints[ci]
            gcx, gcy = int(cx // cell), int(cy // cell)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for ni in grid.get((gcx + dx, gcy + dy), ()):
                        if ni not in visited:
                            nx, ny = midpoints[ni]
                            if math.dist((cx, cy), (nx, ny)) <= GLYPH_RADIUS:
                                visited.add(ni)
                                queue.append(ni)
        if GLYPH_MIN_SEGMENTS <= len(cluster) <= GLYPH_MAX_SEGMENTS:
            xs = [midpoints[i][0] for i in cluster]
            ys = [midpoints[i][1] for i in cluster]
            extent_x = max(xs) - min(xs)
            extent_y = max(ys) - min(ys)
            if extent_x <= GLYPH_MAX_EXTENT * 3 and extent_y <= GLYPH_MAX_EXTENT:
                # Looks like 1-3 digits side by side
                cx = sum(xs) / len(xs)
                cy = sum(ys) / len(ys)
                clusters.append((cx, cy, len(cluster), extent_x, extent_y))

    # We cannot read the actual digit values from vector strokes without OCR.
    # Instead, return the centroids as potential lot-number locations. The
    # caller (unnamed_faces) uses these to distinguish "has a vector label"
    # from "truly unlabelled", improving the signal for infill.
    #
    # We return these with a sentinel value of -1, which lot_number_tokens
    # callers know to treat as "position known, value unknown".
    out = []
    for cx, cy, count, ext_x, ext_y in clusters:
        # Filter: must look like a lot number glyph cluster, not hatching
        # or dimension text. Lot numbers are roughly square-ish clusters;
        # dimension callouts are long and thin.
        if ext_x > 0 and ext_y > 0:
            aspect = max(ext_x, ext_y) / min(ext_x, ext_y)
            if aspect > 4.0:
                continue  # too elongated — probably a dimension callout
        out.append((-1, Point(cx, cy)))

    if out:
        logger.debug("_vector_glyph_centroids: found %d glyph clusters", len(out))
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


def _tract_sole_occupancy(faces, tract_toks, lot_tokens):
    """Associate tract labels with their faces.

    Tracts are larger than lots — a drainage tract might be 0.5 to 5 acres
    while lots are 0.1 acres. The face must contain the tract label and must
    NOT contain any lot number (a face holding both is a merged region, not a
    tract).
    """
    from shapely.strtree import STRtree

    if not tract_toks:
        return {}

    lot_tree = STRtree([t[1] for t in lot_tokens]) if lot_tokens else None
    found: dict[str, object] = {}

    for label, point in tract_toks:
        best = None
        for face in faces:
            if not face.contains(point):
                continue
            # Reject if any lot number sits inside this face
            if lot_tree is not None:
                lot_inside = any(
                    face.contains(lot_tokens[i][1])
                    for i in lot_tree.query(face)
                )
                if lot_inside:
                    continue
            if best is None or face.area > best.area:
                best = face
        if best is not None:
            found[label] = best
    return found


def match_lots(
    pdf_path: str,
    sheets: Sequence[int],
    stated_areas: dict[int, int],
    number_range: tuple[int, int] = (1, 9999),
    gap_ladder: Sequence[float] = GAP_LADDER_PT,
    tract_areas: Optional[dict[str, int]] = None,
) -> LotMatchResult:
    """
    Tie lot numbers to outlines across a plat's sheets, verifying as it goes.

    `stated_areas` is the drawing's own lot area table, keyed by lot number.
    It is the acceptance test, which is what makes the escalating gap
    tolerance safe: a tolerance that distorts geometry fails the check and its
    results are dropped rather than kept.

    `tract_areas`, when supplied, is a dict of tract label ("A", "B", ...) to
    stated area in square feet. Tracts are extracted in a separate pass using
    alpha labels instead of lot numbers.
    """
    if pymupdf is None:  # pragma: no cover
        raise RuntimeError("PyMuPDF is required to read a plat")
    from shapely.geometry import LineString

    if tract_areas is None:
        tract_areas = {}

    doc = pymupdf.open(pdf_path)
    try:
        prepared = {}
        for pi in sheets:
            page = doc[pi]
            long_, short_ = split_linework(page.get_drawings())
            t_tokens = tract_tokens(page, labels=set(tract_areas) or None)
            lot_tokens = lot_number_tokens(page, *number_range)
            # `_vector_glyph_centroids` is deliberately NOT called here.
            # It locates where CAD-flattened lot numbers sit but cannot read
            # them, and infill's walk is unique-or-refuse — there is no
            # ordering for a "this face carries a label" hint to influence.
            # Running it per sheet and discarding the answer only made the
            # log say work was happening that changed nothing (PF1). The
            # detector and its tests are kept for whoever wires a use for it.
            prepared[pi] = (
                long_,
                chain_fragments(short_),
                lot_tokens,
                t_tokens,
            )
            logger.info(
                "sheet %d: %d long lines, %d fragments, %d lot labels, "
                "%d tract labels",
                pi, len(long_), len(short_), len(lot_tokens), len(t_tokens),
            )

        result = LotMatchResult()
        accepted: dict[int, MatchedLot] = {}
        accepted_tracts: dict[str, MatchedTract] = {}

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

        def _tract_agrees(face, label, scale):
            if label not in tract_areas:
                return False
            got = face.area * scale
            stated = tract_areas[label]
            # Tracts are less precisely drawn than lots — allow 3% tolerance
            return abs(got - stated) / stated <= 0.03

        seen_refusals: set[tuple] = set()

        for grow in gap_ladder:
            per_sheet: dict[int, tuple] = {}
            found: dict[int, tuple[int, object]] = {}
            for pi in sheets:
                long_, runs, tokens, t_toks = prepared[pi]
                lines = [LineString(extend_ends(list(s), grow)) for s in long_]
                lines += [LineString(extend_ends(r, grow)) for r in runs]
                # Smart gap closure: snap near-miss endpoints before polygonize
                lines = snap_endpoints(lines, radius_pt=max(SNAP_RADIUS_PT, grow * 1.5))
                faces = faces_from_lines(lines)
                # One occupancy pass, reused three ways: the largest qualifying
                # face per lot (the primary answer, unchanged), every
                # qualifying face (the fallback), and the faces with no number
                # at all (the infill).
                every = _sole_occupancy(faces, tokens, all_candidates=True)
                sole = {v: max(c, key=lambda f: f.area) for v, c in every.items()}
                # Tract extraction
                tract_found = _tract_sole_occupancy(faces, t_toks, tokens)
                per_sheet[pi] = (faces, tokens, sole, every, t_toks, tract_found)
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
            # that places today.
            for pi in sheets:
                _, _, _, every, _, _ = per_sheet[pi]
                for value, candidates in every.items():
                    if value in accepted or value not in stated_areas:
                        continue
                    for face in candidates:
                        if _agrees(face, value, scale):
                            _accept(value, pi, face, grow, scale, "traced")
                            break

            # TRACT MATCHING — associate tract labels with their faces. Tracts
            # are area-verified with a wider tolerance than lots (3% vs 1%)
            # because their outlines are less precisely drawn.
            if tract_areas:
                for pi in sheets:
                    _, _, _, _, _, tract_found = per_sheet[pi]
                    for label, face in tract_found.items():
                        if label in accepted_tracts:
                            continue
                        if _tract_agrees(face, label, scale):
                            accepted_tracts[label] = MatchedTract(
                                label=label,
                                page=pi,
                                ring=[(float(x), float(y)) for x, y in face.exterior.coords],
                                area_sqft=face.area * scale,
                                stated_sqft=tract_areas[label],
                                gap_used_pt=grow,
                            )

            # INFILL — name the faces the file left unnamed. Now tract-aware:
            # faces that matched a tract label are excluded from the unnamed
            # pool so infill does not try to number them as lots. This is what
            # lets infill chain AROUND a drainage tract instead of stopping.
            outstanding = set(stated_areas) - set(accepted)
            if outstanding:
                # Collect tract faces to exclude from unnamed pool
                tract_faces = set()
                for pi in sheets:
                    _, _, _, _, _, tract_found = per_sheet[pi]
                    for face in tract_found.values():
                        tract_faces.add(id(face))

                for pi in sheets:
                    faces, tokens, sole, _, _, _ = per_sheet[pi]
                    anchors = {
                        v: f for v, f in sole.items()
                        if v in stated_areas and v in accepted and _agrees(f, v, scale)
                    }
                    if not anchors:
                        continue
                    # Filter out faces that are identified tracts
                    unnamed = [
                        f for f in unnamed_faces(faces, tokens)
                        if id(f) not in tract_faces
                    ]
                    outcome = infill_by_position(
                        named=anchors,
                        unnamed=unnamed,
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
        result.tracts = [accepted_tracts[k] for k in sorted(accepted_tracts)]
        result.unresolved_tracts = sorted(set(tract_areas) - set(accepted_tracts))
        if not result.scale_is_round:
            logger.warning(
                "fitted scale 1in = %.2f ft is not a round engineering scale — "
                "treat the placement as unverified",
                result.scale_ft_per_inch,
            )
        return result
    finally:
        doc.close()
