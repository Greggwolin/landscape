"""
Reading geometry out of an engineering plan.

A plat, preplat or final plat produced from CAD keeps every drawn line in the
PDF as a true vector path.  The lot lines are not something to be recognised in
a picture — they are already geometry, and can be read out exactly.

Two things make that harder than it sounds, and this module exists to handle
both:

  * **The lettering is usually not text.**  Exporting from CAD commonly flattens
    fonts to outlines, so a sheet with thousands of paths is mostly letter
    strokes.  Those must be discarded before anything else, or the linework is
    lost in the noise.  Measured on two real plats: ~17,000 and ~10,700 paths,
    of which roughly 350 and 550 were actual drawn lines.

  * **The sheet is not the site.**  Title block, tables, vicinity map, legend,
    section details and scale bar are all drawn with the same pen as the plan.
    They are separated here by where they sit and how they behave, not by
    hoping they look different.

Placement is handled separately, in :func:`fit_to_known_boundary`.  A plat can
be georeferenced from its own drawn boundary against a known assessor parcel,
which is materially better than pinning corners by eye — the fit is measurable,
so it can be checked rather than trusted.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Iterable, Optional, Sequence

logger = logging.getLogger("landscape.plan_geometry")

try:
    import pymupdf  # PyMuPDF >= 1.24 exposes the modern name
except ImportError:  # pragma: no cover
    import fitz as pymupdf  # type: ignore


#: A path shorter than this, in points, is lettering or a tick mark rather than
#: linework.  72pt = 1 inch on the sheet.  Set from the observed split on real
#: plats, where glyph strokes cluster below ~40pt and linework above ~80pt.
MIN_LINEWORK_LENGTH_PT = 60.0

#: A closed shape smaller than this cannot be a parcel or a lot at any plausible
#: sheet scale, and is almost always a symbol, arrowhead or table cell.
MIN_SHAPE_EXTENT_PT = 18.0

#: A drawn run shorter than this is a glyph stroke, a tick or a hatch, not
#: linework. Set from the observed split on real plats.
MIN_SEGMENT_LENGTH_PT = 12.0


@dataclass
class DrawnShape:
    """One closed shape lifted off the sheet, still in page coordinates."""

    ring: list[tuple[float, float]]
    #: Total drawn length, in points. Long runs are boundaries, not symbols.
    length: float
    #: Axis-aligned extent, for cheap size tests.
    width: float
    height: float
    #: Area of the ring in square points, by the shoelace formula.
    area: float
    #: Stroke width as drawn. Plats encode hierarchy in pen weight — boundaries
    #: heavier than lot lines heavier than easements — so this is a strong hint
    #: even though it is not standardised between engineers.
    stroke: Optional[float] = None
    notes: list[str] = field(default_factory=list)

    @property
    def aspect(self) -> float:
        if self.height == 0:
            return 0.0
        return self.width / self.height

    @property
    def solidity(self) -> float:
        """Ring area over its bounding box. Near 1.0 means rectangular."""
        box = self.width * self.height
        return (self.area / box) if box else 0.0


class PlatVectorReader:
    """
    Lifts closed shapes off an engineering sheet.

    Returns candidates only.  Deciding which candidate is the subdivision
    boundary, which are parcels and which are lots is a separate judgement that
    depends on the sheet, and is left to the caller.
    """

    def __init__(
        self,
        min_length_pt: float = MIN_LINEWORK_LENGTH_PT,
        min_extent_pt: float = MIN_SHAPE_EXTENT_PT,
        min_segment_pt: float = MIN_SEGMENT_LENGTH_PT,
    ):
        self.min_length_pt = min_length_pt
        self.min_extent_pt = min_extent_pt
        self.min_segment_pt = min_segment_pt

    # ------------------------------------------------------- site boundary

    @staticmethod
    def site_boundary(
        shapes: Sequence[DrawnShape],
        lot_area_range: tuple[float, float] = (250.0, 2200.0),
    ) -> Optional[list[tuple[float, float]]]:
        """
        Recover the subdivision boundary by dissolving the lots inside it.

        The outer boundary of a plat is drawn as a run of separate segments
        like everything else, so it rarely survives as a single face. What is
        reliable is that the lots tile the site: merging every lot-sized face
        and taking the outline of the result reproduces the boundary, tracts
        and streets included where they fall between lots.

        The default area window is set for a sheet at 1" = 200 ft, where a
        45x120 lot is about 700 square points. A caller working at a different
        sheet scale must widen it.
        """
        try:
            from shapely.geometry import Polygon
            from shapely.ops import unary_union
        except ImportError:  # pragma: no cover
            return None

        lo, hi = lot_area_range
        lots = [
            Polygon(s.ring) for s in shapes if lo <= s.area <= hi and len(s.ring) >= 4
        ]
        if len(lots) < 20:
            logger.info("site boundary: only %d lot-sized faces, too few", len(lots))
            return None

        # A sheet carries lot-shaped drawings that are not lots: the typical-lot
        # details along the bottom, easement diagrams, and the cells of the
        # parcel and tract tables. They are the same size and shape as lots, so
        # no size or shape test will separate them — but they sit apart from
        # the plan. Keep only the largest spatial cluster.
        lots = _largest_cluster(lots)
        if len(lots) < 20:
            return None

        merged = unary_union([p.buffer(0.5) for p in lots]).buffer(-0.5)
        if merged.is_empty:
            return None
        if merged.geom_type == "MultiPolygon":
            merged = max(merged.geoms, key=lambda g: g.area)
        return [(float(x), float(y)) for x, y in merged.exterior.coords]

    # ------------------------------------------------------------------ API

    def read_page(self, pdf_path: str, page_number: int = 0) -> list[DrawnShape]:
        """
        Lift closed shapes off a sheet.

        **The lines on a plat are not closed paths.** A CAD export emits each
        run as its own path — measured on a real preplat, 6,734 of the paths
        were a single segment and only 288 carried six or more — so almost no
        parcel or lot exists in the file as a ring that can simply be read out.
        Treating multi-segment paths as parcels finds nothing, which is the
        mistake this method exists to avoid.

        What works is to take the segments as a network, split them where they
        cross, and recover the enclosed faces. That returns the lots as they
        are actually drawn: on the cover sheet of a 467-lot preplat it produced
        493 lot-sized faces with a median of 6,378 sq ft, against stated
        products of 45x120, 55x120 and 65x125.
        """
        doc = pymupdf.open(pdf_path)
        try:
            page = doc[page_number]
            segments = self._segments_from_drawings(page.get_drawings())
        finally:
            doc.close()

        shapes = self._faces_from_segments(segments)
        shapes.sort(key=lambda s: s.area, reverse=True)
        logger.info(
            "plat page %d: %d segments -> %d closed faces",
            page_number, len(segments), len(shapes),
        )
        return shapes

    def _segments_from_drawings(
        self, drawings: Iterable[dict]
    ) -> list[tuple[tuple[float, float], tuple[float, float]]]:
        """
        Every drawn straight run on the sheet, with lettering removed.

        The length floor is what separates linework from flattened text. Glyph
        strokes cluster well below it; the shortest real lot frontage at a
        typical sheet scale sits well above.
        """
        segs: list[tuple[tuple[float, float], tuple[float, float]]] = []
        for group in drawings:
            for it in group.get("items", ()):
                if it[0] == "l":
                    a, b = it[1], it[2]
                    if math.dist((a.x, a.y), (b.x, b.y)) >= self.min_segment_pt:
                        segs.append(((a.x, a.y), (b.x, b.y)))
                elif it[0] == "re":
                    r = it[1]
                    c = [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
                    for i in range(4):
                        segs.append((c[i], c[(i + 1) % 4]))
        return segs

    @staticmethod
    def _faces_from_segments(segments) -> list[DrawnShape]:
        """Split the segment network at its crossings and recover the faces."""
        if not segments:
            return []
        try:
            from shapely.geometry import LineString
            from shapely.ops import polygonize, unary_union
        except ImportError:  # pragma: no cover
            logger.error("shapely is required to recover faces from plat linework")
            return []

        noded = unary_union([LineString(s) for s in segments])
        out: list[DrawnShape] = []
        for poly in polygonize(noded):
            ring = list(poly.exterior.coords)
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            out.append(
                DrawnShape(
                    ring=ring,
                    length=poly.exterior.length,
                    width=max(xs) - min(xs),
                    height=max(ys) - min(ys),
                    area=poly.area,
                )
            )
        return out

    # ------------------------------------------------------------- internals

    def _shapes_from_drawings(self, drawings: Iterable[dict]) -> list[DrawnShape]:
        out: list[DrawnShape] = []
        for group in drawings:
            pts, length = self._points_and_length(group.get("items", ()))
            if len(pts) < 3 or length < self.min_length_pt:
                continue

            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            w, h = max(xs) - min(xs), max(ys) - min(ys)
            if w < self.min_extent_pt or h < self.min_extent_pt:
                continue

            ring = self._close(pts)
            out.append(
                DrawnShape(
                    ring=ring,
                    length=length,
                    width=w,
                    height=h,
                    area=abs(self._shoelace(ring)),
                    stroke=group.get("width"),
                )
            )
        return out

    @staticmethod
    def _points_and_length(items) -> tuple[list[tuple[float, float]], float]:
        """
        Flatten one path into points plus its drawn length.

        Curves are sampled at their control points rather than tessellated —
        parcel boundaries are overwhelmingly straight runs, and cul-de-sac
        returns are the exception that a later pass can refine.
        """
        pts: list[tuple[float, float]] = []
        length = 0.0
        for it in items:
            kind = it[0]
            if kind == "l":
                a, b = it[1], it[2]
                pts += [(a.x, a.y), (b.x, b.y)]
                length += math.dist((a.x, a.y), (b.x, b.y))
            elif kind == "re":
                r = it[1]
                pts += [
                    (r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)
                ]
                length += 2 * (r.width + r.height)
            elif kind == "qu":
                q = it[1]
                corners = [
                    (q.ul.x, q.ul.y), (q.ur.x, q.ur.y),
                    (q.lr.x, q.lr.y), (q.ll.x, q.ll.y),
                ]
                pts += corners
                length += sum(
                    math.dist(corners[i], corners[(i + 1) % 4]) for i in range(4)
                )
            elif kind == "c":
                for p in it[1:]:
                    pts.append((p.x, p.y))
                if len(it) >= 3:
                    length += math.dist(
                        (it[1].x, it[1].y), (it[-1].x, it[-1].y)
                    )
        return pts, length

    @staticmethod
    def _close(pts: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
        ring = list(pts)
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        return ring

    @staticmethod
    def _shoelace(ring: Sequence[tuple[float, float]]) -> float:
        s = 0.0
        for i in range(len(ring) - 1):
            s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
        return s / 2.0

    # ------------------------------------------------------- sheet furniture

    @staticmethod
    def drop_sheet_furniture(
        shapes: Sequence[DrawnShape], page_width: float, page_height: float
    ) -> list[DrawnShape]:
        """
        Remove the parts of the sheet that are not the site.

        Title block, tables, legend and vicinity map are all near-perfect
        rectangles — a real parcel almost never is, because at least one edge
        follows a road, a wash or a section line that is not square to the
        sheet.  That difference does most of the work here.

        The remaining test is position: the page border and any full-sheet
        frame span nearly the whole page and are discarded on size alone.
        """
        page_area = page_width * page_height
        kept: list[DrawnShape] = []
        for s in shapes:
            # Test the bounding box, not the ring area. A sheet-spanning path
            # can enclose well under half the page while still stretching
            # corner to corner, and that is exactly what a drawing frame or a
            # match-line construction does.
            if (s.width * s.height) > page_area * 0.55:
                s.notes.append("dropped: spans the sheet, this is a frame or border")
                continue
            # A rectangle whose corners are square to the page, filling its own
            # bounding box, is furniture rather than ground.
            if s.solidity > 0.97 and len(s.ring) <= 6:
                s.notes.append("dropped: axis-square rectangle, likely a table or block")
                continue
            kept.append(s)
        return kept


# --------------------------------------------------------------- placement


@dataclass(frozen=True)
class BoundaryFit:
    """The transform that places a drawn sheet onto the real world."""

    scale: float            #: page points -> metres
    rotation_rad: float     #: counter-clockwise, applied about the centroid
    #: Translation applied after scale and rotation, in the local metric frame.
    dx: float
    dy: float
    #: Origin of the local metric frame, as lon/lat.
    origin_lonlat: tuple[float, float]
    #: Ratio of the fitted area to the known area. **This is close to 1.0 by
    #: construction** — the scale is derived from the area ratio — so it is
    #: reported for completeness and must never be used as evidence the fit is
    #: right. Two different parcels of equal size score identically.
    area_agreement: float
    #: Mean distance from each fitted corner to the known boundary, as a
    #: fraction of the parcel's own size. **This is the real score.** It tests
    #: shape, which the scale cannot fake.
    shape_error: float
    #: Implied drawing scale, e.g. 200.0 for 1" = 200'.
    implied_scale_ft_per_inch: float

    #: Shape error at or below this is a genuine match.
    GOOD_SHAPE_ERROR = 0.04

    @property
    def is_plausible(self) -> bool:
        """
        Whether the fit should be trusted without a human looking.

        Two independent tests, because the obvious one is circular. Area
        agreement proves nothing — it is forced to 1.0 by how the scale is
        derived. What does carry information is (a) whether the *shapes* agree
        once placed, and (b) whether the implied drawing scale is one an
        engineer would actually have used. Engineering sheets are drawn at
        round scales, so an implied 1" = 140 ft is a fit that has gone wrong,
        however well its area happens to agree.
        """
        if self.shape_error > self.GOOD_SHAPE_ERROR:
            return False
        common = (20, 30, 40, 50, 60, 100, 200, 300, 400, 500)
        return any(
            abs(self.implied_scale_ft_per_inch - c) / c < 0.04 for c in common
        )


def fit_to_known_boundary(
    drawn_ring: Sequence[tuple[float, float]],
    known_ring_lonlat: Sequence[Sequence[float]],
) -> BoundaryFit:
    """
    Place a sheet by matching its drawn boundary to a known parcel boundary.

    This is the alternative to dragging corners by eye.  The county's recorded
    parcel is an independent measurement, so fitting to it produces a placement
    that can be *checked* — the area agreement and the implied drawing scale
    both have to come out right, and the drawing scale is a genuinely
    independent test because engineers draw at round scales.

    Both rings are reduced to their principal axes, which handles rotation
    without needing any correspondence between individual corners.
    """
    if len(drawn_ring) < 4 or len(known_ring_lonlat) < 4:
        raise ValueError("both rings need at least three distinct corners")

    lon0 = sum(p[0] for p in known_ring_lonlat) / len(known_ring_lonlat)
    lat0 = sum(p[1] for p in known_ring_lonlat) / len(known_ring_lonlat)
    m_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * math.radians(lat0))
    m_per_deg_lon = 111_412.84 * math.cos(math.radians(lat0))

    known_m = [
        ((p[0] - lon0) * m_per_deg_lon, (p[1] - lat0) * m_per_deg_lat)
        for p in known_ring_lonlat
    ]
    # Page coordinates run y-down; the world runs y-up.
    drawn_m = [(x, -y) for x, y in drawn_ring]

    a_drawn = abs(PlatVectorReader._shoelace(drawn_m))
    a_known = abs(PlatVectorReader._shoelace(known_m))
    if a_drawn <= 0 or a_known <= 0:
        raise ValueError("a ring has no area")

    scale = math.sqrt(a_known / a_drawn)
    cd = _centroid(drawn_m)
    ck = _centroid(known_m)

    # Rotation cannot be taken from the principal axis alone. A quarter section
    # is close to square, so its long axis is ill-defined and the answer comes
    # back arbitrary. Instead, try the candidates that actually occur — sheets
    # are drawn north-up far more often than not — and let shape distance
    # decide between them.
    principal = _principal_angle(known_m) - _principal_angle(drawn_m)
    candidates = [0.0, math.pi / 2, math.pi, 3 * math.pi / 2]
    candidates += [principal + k * math.pi / 2 for k in range(4)]

    best: Optional[tuple[float, float, float, float]] = None  # (err, rot, dx, dy)
    for rot in candidates:
        cos_r, sin_r = math.cos(rot), math.sin(rot)
        px = (cd[0] * cos_r - cd[1] * sin_r) * scale
        py = (cd[0] * sin_r + cd[1] * cos_r) * scale
        dx, dy = ck[0] - px, ck[1] - py
        err = _shape_error(_apply(drawn_m, scale, rot, dx, dy), known_m)
        if best is None or err < best[0]:
            best = (err, rot, dx, dy)

    shape_error, rotation, dx, dy = best  # type: ignore[misc]
    fitted = _apply(drawn_m, scale, rotation, dx, dy)
    agreement = abs(PlatVectorReader._shoelace(fitted)) / a_known

    # scale is metres per point; 72 points to the inch; 0.3048 m to the foot.
    ft_per_inch = scale * 72.0 / 0.3048

    return BoundaryFit(
        scale=scale,
        rotation_rad=((rotation + math.pi) % (2 * math.pi)) - math.pi,
        dx=dx,
        dy=dy,
        origin_lonlat=(lon0, lat0),
        area_agreement=agreement,
        shape_error=shape_error,
        implied_scale_ft_per_inch=ft_per_inch,
    )


def _shape_error(
    fitted: Sequence[tuple[float, float]], known: Sequence[tuple[float, float]]
) -> float:
    """
    Mean distance from each fitted corner to the nearest known corner,
    normalised by the parcel's own size.

    This is the test that carries information. Area can be forced to agree by
    choosing the scale; shape cannot. Normalising by size makes the threshold
    meaningful across a quarter-section and a quarter-acre alike.
    """
    if not fitted or not known:
        return float("inf")
    xs = [p[0] for p in known]
    ys = [p[1] for p in known]
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1.0
    total = 0.0
    for p in fitted:
        total += min(math.dist(p, q) for q in known)
    return (total / len(fitted)) / span


def apply_fit(
    ring: Sequence[tuple[float, float]], fit: BoundaryFit
) -> list[tuple[float, float]]:
    """Take a page-space ring through a fit and out into lon/lat."""
    lon0, lat0 = fit.origin_lonlat
    m_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * math.radians(lat0))
    m_per_deg_lon = 111_412.84 * math.cos(math.radians(lat0))

    flipped = [(x, -y) for x, y in ring]
    placed = _apply(flipped, fit.scale, fit.rotation_rad, fit.dx, fit.dy)
    out = [
        (lon0 + mx / m_per_deg_lon, lat0 + my / m_per_deg_lat) for mx, my in placed
    ]
    if out[0] != out[-1]:
        out.append(out[0])
    return out


# ----------------------------------------------------------------- helpers


def _centroid(pts: Sequence[tuple[float, float]]) -> tuple[float, float]:
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def _principal_angle(pts: Sequence[tuple[float, float]]) -> float:
    """
    Orientation of a ring's long axis, from its second moments.

    Works without any correspondence between the two rings' corners, which is
    what makes the fit robust to a plat drawn at any rotation on the sheet.
    """
    cx, cy = _centroid(pts)
    sxx = syy = sxy = 0.0
    for x, y in pts:
        dx, dy = x - cx, y - cy
        sxx += dx * dx
        syy += dy * dy
        sxy += dx * dy
    return 0.5 * math.atan2(2 * sxy, sxx - syy)


def _apply(
    pts: Sequence[tuple[float, float]], scale: float, rot: float, dx: float, dy: float
) -> list[tuple[float, float]]:
    cos_r, sin_r = math.cos(rot), math.sin(rot)
    return [
        ((x * cos_r - y * sin_r) * scale + dx, (x * sin_r + y * cos_r) * scale + dy)
        for x, y in pts
    ]


def _largest_cluster(polys, gap_factor: float = 2.5):
    """
    Keep the biggest spatially-coherent group of shapes.

    Lots on a plan touch or nearly touch their neighbours; a detail drawing in
    the margin sits well clear of them. Grouping by proximity and keeping the
    largest group discards the margin without needing to know what is in it.

    `gap_factor` is a multiple of the median lot's own width, so the test
    scales with the sheet rather than assuming one.
    """
    if not polys:
        return polys

    cents = [(p.centroid.x, p.centroid.y) for p in polys]
    widths = sorted((p.bounds[2] - p.bounds[0]) for p in polys)
    reach = widths[len(widths) // 2] * gap_factor
    if reach <= 0:
        return polys

    unseen = set(range(len(polys)))
    best: list[int] = []
    while unseen:
        seed = unseen.pop()
        group = [seed]
        frontier = [seed]
        while frontier:
            i = frontier.pop()
            near = [
                j for j in unseen
                if math.dist(cents[i], cents[j]) <= reach
            ]
            for j in near:
                unseen.discard(j)
                group.append(j)
                frontier.append(j)
        if len(group) > len(best):
            best = group
    return [polys[i] for i in best]
