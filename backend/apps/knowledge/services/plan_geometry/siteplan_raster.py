"""
Reading parcel boundaries out of a rendered site plan.

A land-planner or marketing site plan is drawn the same way almost everywhere:
flat colour fills for land use, separated by white or light boundary lines,
over an aerial or a plain background, with the parcel label printed inside each
fill.  That convention is what makes the drawing readable without CAD.

The approach:
  1. Take only the strongly-coloured pixels.  Aerial imagery underneath is
     comparatively desaturated, so saturation separates drawing from backdrop.
  2. Cut the fills along the light boundary lines, so parcels that share a
     colour and a common edge do not merge into one blob.
  3. Label what remains, close the holes punched by the printed labels, and
     discard specks.
  4. Hand the rings to the georeferencer to become real coordinates and real
     acres.

Everything returned is a *candidate*.  Nothing here writes project geometry.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional, Sequence

import cv2
import numpy as np

from .georeference import QuadGeoreferencer
from .stages import PlanStage

logger = logging.getLogger("landscape.plan_geometry")


@dataclass
class ParcelCandidate:
    """One proposed parcel, in both pixel and world space."""

    #: Closed ring in lon/lat, first point repeated last.
    ring_lonlat: list[tuple[float, float]]
    #: Simplified ring in source-image pixels, for drawing a review overlay.
    ring_pixels: list[tuple[int, int]]
    #: Geodesic area on the WGS84 ellipsoid.
    acres: float
    #: Mean fill colour, as the drawing rendered it. Land-use grouping key.
    fill_rgb: tuple[int, int, int]
    #: Centroid in pixels — where the printed label will be, for label reading.
    centroid_px: tuple[int, int]
    #: 0-1. Combines size, shape plausibility and colour purity. Not accuracy.
    confidence: float
    #: Filled once the label inside the shape has been read.
    label: Optional[str] = None
    #: Filled once the candidate is matched to an existing parcel record.
    matched_parcel_id: Optional[int] = None
    notes: list[str] = field(default_factory=list)

    def as_geojson_feature(self) -> dict:
        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[list(p) for p in self.ring_lonlat]],
            },
            "properties": {
                "acres": round(self.acres, 2),
                "fill_rgb": list(self.fill_rgb),
                "confidence": round(self.confidence, 3),
                "label": self.label,
                "matched_parcel_id": self.matched_parcel_id,
                "approximate": True,
                "notes": self.notes,
            },
        }


class SitePlanSegmenter:
    """
    Turns a rendered site plan into proposed parcel polygons.

    Tuning constants are attributes rather than literals so a caller can adapt
    to an unusual drawing without forking the method.  The defaults were set
    against a Phoenix-market master-plan site plan and should be treated as a
    starting point, not as settled.
    """

    #: Minimum saturation for a pixel to count as drawing rather than backdrop.
    MIN_FILL_SATURATION = 70
    #: Minimum value, to drop near-black rendering artefacts.
    MIN_FILL_VALUE = 60
    #: A boundary line is bright and unsaturated.
    BOUNDARY_MIN_VALUE = 180
    #: ...and only weakly coloured.
    BOUNDARY_MAX_SATURATION = 60
    #: Discard regions below this share of the whole drawn area. Kills the
    #: specks left where a printed label punches a hole in its own parcel.
    MIN_REGION_FRACTION = 0.0015
    #: Absolute floor in pixels, for small images.
    MIN_REGION_PX = 900
    #: Ring simplification, as a fraction of the region's perimeter.
    SIMPLIFY_EPSILON_FRAC = 0.004
    #: Anything below this is dropped as too ragged to be a parcel.
    MIN_SOLIDITY = 0.55

    def __init__(self, georeferencer: QuadGeoreferencer,
                 stage: PlanStage = PlanStage.SITE_PLAN):
        self.geo = georeferencer
        self.stage = stage

    # ------------------------------------------------------------------ API

    def segment(self, image_rgba: np.ndarray) -> list[ParcelCandidate]:
        """
        `image_rgba` is HxWx4 uint8.  Transparent pixels are treated as outside
        the drawing, which is how a draped overlay arrives.
        """
        if image_rgba.ndim != 3 or image_rgba.shape[2] != 4:
            raise ValueError("expected an RGBA image")

        h, w = image_rgba.shape[:2]
        if (w, h) != (self.geo.width, self.geo.height):
            raise ValueError(
                f"image is {w}x{h} but the georeferencer was built for "
                f"{self.geo.width}x{self.geo.height}; the corners would not line up"
            )

        rgb = image_rgba[..., :3]
        inside = image_rgba[..., 3] > 10

        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        sat = hsv[..., 1].astype(np.int16)
        val = hsv[..., 2].astype(np.int16)

        fills = inside & (sat > self.MIN_FILL_SATURATION) & (val > self.MIN_FILL_VALUE)
        boundaries = (
            inside
            & (val > self.BOUNDARY_MIN_VALUE)
            & (sat < self.BOUNDARY_MAX_SATURATION)
        )

        if not fills.any():
            logger.warning("site plan segmentation found no coloured fills")
            return []

        separated = self._cut_along_boundaries(fills, boundaries)
        regions = self._label_regions(separated, min_total=int(fills.sum()))
        regions = self._reclaim_boundary_band(regions, fills, boundaries)

        candidates: list[ParcelCandidate] = []
        for mask in regions:
            cand = self._build_candidate(mask, rgb)
            if cand is not None:
                candidates.append(cand)

        candidates.sort(key=lambda c: c.acres, reverse=True)
        logger.info(
            "site plan segmentation produced %d parcel candidates totalling %.1f acres",
            len(candidates),
            sum(c.acres for c in candidates),
        )
        return candidates

    # -------------------------------------------------------------- internals

    def _cut_along_boundaries(
        self, fills: np.ndarray, boundaries: np.ndarray
    ) -> np.ndarray:
        """
        Remove the boundary lines from the fills so touching parcels separate.

        The lines are dilated slightly first — an anti-aliased edge leaves a
        one-pixel bridge of blended colour that is enough to reconnect two
        parcels, and reconnecting two parcels is a much worse failure than
        losing a pixel of width off each.
        """
        lines = cv2.dilate(
            boundaries.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1
        ).astype(bool)
        cut = (fills & ~lines).astype(np.uint8)
        return cv2.morphologyEx(cut, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    def _label_regions(self, cut: np.ndarray, min_total: int) -> list[np.ndarray]:
        """Connected components, filtered by size, holes closed."""
        n, labels, stats, _ = cv2.connectedComponentsWithStats(cut, connectivity=4)
        floor = max(self.MIN_REGION_PX, int(min_total * self.MIN_REGION_FRACTION))

        out: list[np.ndarray] = []
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] < floor:
                continue
            mask = (labels == i).astype(np.uint8)
            out.append(self._close_label_holes(mask))
        return out

    def _reclaim_boundary_band(
        self,
        regions: list[np.ndarray],
        fills: np.ndarray,
        boundaries: np.ndarray,
    ) -> list[np.ndarray]:
        """
        Give each parcel back the strip that cutting the boundary lines removed.

        Separating touching parcels costs every parcel a rim of a few pixels on
        every side, and on a plan at this scale that is a systematic 10-12%
        understatement of area — uniform across parcels, because the rim width
        is uniform.  Left uncorrected it is exactly the kind of quietly wrong
        number that reads as plausible.

        The strip is returned by assigning each pixel of the drawn band to the
        nearest region, which splits a shared boundary line down its middle —
        the same place the surveyor's line represents.  Only the band is
        reassigned; unfilled areas such as roads and washes are untouched,
        because they were never part of a fill.
        """
        if not regions:
            return regions

        seeds = np.zeros(fills.shape, np.int32)
        for idx, mask in enumerate(regions, start=1):
            seeds[mask.astype(bool)] = idx

        band = (boundaries | fills) & (seeds == 0)
        if not band.any():
            return regions

        # Nearest-seed assignment: distanceTransformWithLabels labels every
        # pixel with the connected zero-component nearest to it, so seeding
        # the zeros with the regions makes the labels the region ids.
        src = (seeds == 0).astype(np.uint8)
        _dist, nearest = cv2.distanceTransformWithLabels(
            src, cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL
        )

        # Map the transform's own component numbering back onto ours by
        # sampling one pixel of each seed region.
        remap: dict[int, int] = {}
        for idx, mask in enumerate(regions, start=1):
            ys, xs = np.nonzero(mask)
            if len(ys):
                remap[int(nearest[ys[0], xs[0]])] = idx

        grown = seeds.copy()
        band_labels = nearest[band]
        mapped = np.array(
            [remap.get(int(v), 0) for v in band_labels], dtype=np.int32
        )
        grown[band] = mapped

        out: list[np.ndarray] = []
        for idx in range(1, len(regions) + 1):
            mask = (grown == idx).astype(np.uint8)
            if mask.any():
                out.append(self._close_label_holes(mask))
        return out

    @staticmethod
    def _close_label_holes(mask: np.ndarray) -> np.ndarray:
        """
        Fill interior holes.

        The printed parcel label sits inside its own parcel and is rendered in
        white, so it is removed along with the boundary lines and leaves a
        letter-shaped void.  Those voids are interior by definition, so filling
        every enclosed hole restores the parcel without touching its outline.
        """
        filled = mask.copy()
        h, w = mask.shape
        flood = np.zeros((h + 2, w + 2), np.uint8)
        holes = mask.copy()
        cv2.floodFill(holes, flood, (0, 0), 1)
        filled[holes == 0] = 1
        return filled

    def _build_candidate(
        self, mask: np.ndarray, rgb: np.ndarray
    ) -> Optional[ParcelCandidate]:
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return None
        contour = max(contours, key=cv2.contourArea)
        area_px = cv2.contourArea(contour)
        if area_px <= 0:
            return None

        hull_area = cv2.contourArea(cv2.convexHull(contour))
        solidity = area_px / hull_area if hull_area > 0 else 0.0
        if solidity < self.MIN_SOLIDITY:
            return None

        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, self.SIMPLIFY_EPSILON_FRAC * peri, True)
        ring_px = [(int(p[0][0]), int(p[0][1])) for p in approx]
        if len(ring_px) < 3:
            return None

        ring_ll = self.geo.ring_to_lonlat(ring_px)
        acres = self.geo.area_acres(ring_ll)
        if acres <= 0:
            return None

        pixels = mask.astype(bool)
        fill_rgb = tuple(int(c) for c in rgb[pixels].mean(axis=0))
        ys, xs = np.nonzero(pixels)
        centroid = (int(xs.mean()), int(ys.mean()))

        return ParcelCandidate(
            ring_lonlat=ring_ll,
            ring_pixels=ring_px,
            acres=acres,
            fill_rgb=fill_rgb,
            centroid_px=centroid,
            confidence=self._score(area_px, solidity, len(ring_px)),
        )

    @staticmethod
    def _score(area_px: float, solidity: float, vertices: int) -> float:
        """
        A rough plausibility score, not a measure of accuracy.

        It says how confidently this region looks like a drawn parcel — large,
        reasonably convex, and bounded by a handful of straight runs rather
        than by a ragged coastline.  It says nothing about whether the parcel
        is where the drawing claims, which is a property of the drape.
        """
        size = min(1.0, area_px / 20_000.0)
        convexity = max(0.0, min(1.0, (solidity - 0.55) / 0.40))
        # Parcels are simple polygons; hundreds of vertices means noise.
        simplicity = 1.0 if vertices <= 12 else max(0.2, 12.0 / vertices)
        return round(0.45 * size + 0.35 * convexity + 0.20 * simplicity, 3)
