"""
Placing an illustrative drawing in the real world.

A site plan carries no coordinates.  What it does have — always, per the
underwriting workflow — is an outer parcel or property boundary that is already
known, either from the county assessor or because the user draped the drawing
onto the map and pinned its corners.  That drape is stored in
`tbl_project_overlay` as four lon/lat corners in NW, NE, SE, SW order.

This module maps image pixels into those coordinates and measures the result on
the ellipsoid, so acreages come out as real acres rather than as a pixel count
scaled by an assumed total.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Sequence

try:  # pyproj is in backend/requirements.txt; keep the import soft for tooling
    from pyproj import Geod

    _GEOD = Geod(ellps="WGS84")
except Exception:  # pragma: no cover - exercised only where pyproj is absent
    _GEOD = None


SQ_METRES_PER_ACRE = 4046.8564224


@dataclass(frozen=True)
class QuadGeoreferencer:
    """
    Bilinear mapping from image pixel space into a lon/lat quadrilateral.

    `corners` is the overlay's stored corner list: NW, NE, SE, SW, each
    ``[lon, lat]``.  `width` and `height` are the pixel dimensions of the image
    those corners were fitted to — which is the cropped region, not the source
    page, when the overlay was produced by a crop.

    Bilinear is the correct inverse of how the drape is rendered: the map draws
    the image into the quad by interpolating its corners, so interpolating the
    same way returns the pixel to where it is actually being displayed.  For
    the site-plan case this is exact by construction.  It is *not* a projective
    correction of camera perspective — a plan is an orthographic drawing, so
    there is no perspective to remove.
    """

    corners: Sequence[Sequence[float]]
    width: int
    height: int

    def __post_init__(self) -> None:
        if len(self.corners) != 4:
            raise ValueError(f"expected 4 corners, got {len(self.corners)}")
        if self.width <= 0 or self.height <= 0:
            raise ValueError("image dimensions must be positive")

    # ------------------------------------------------------------------ core

    def pixel_to_lonlat(self, x: float, y: float) -> tuple[float, float]:
        """Map one pixel to (lon, lat). Origin is the image's top-left."""
        u = x / self.width
        v = y / self.height
        nw, ne, se, sw = self.corners

        top_lon = nw[0] + (ne[0] - nw[0]) * u
        top_lat = nw[1] + (ne[1] - nw[1]) * u
        bot_lon = sw[0] + (se[0] - sw[0]) * u
        bot_lat = sw[1] + (se[1] - sw[1]) * u

        return (
            top_lon + (bot_lon - top_lon) * v,
            top_lat + (bot_lat - top_lat) * v,
        )

    def ring_to_lonlat(
        self, ring: Iterable[Sequence[float]]
    ) -> list[tuple[float, float]]:
        """Map a pixel-space ring to lon/lat, closing it if it is open."""
        out = [self.pixel_to_lonlat(float(px), float(py)) for px, py in ring]
        if out and out[0] != out[-1]:
            out.append(out[0])
        return out

    # ----------------------------------------------------------- measurement

    @staticmethod
    def area_acres(ring_lonlat: Sequence[Sequence[float]]) -> float:
        """
        Geodesic area of a closed lon/lat ring, in acres.

        Uses the WGS84 ellipsoid where pyproj is available, and falls back to a
        local equirectangular approximation otherwise.  The fallback is
        accurate to well under a tenth of a percent at parcel scale, but it is
        a fallback — the ellipsoidal figure is the one to quote.
        """
        if len(ring_lonlat) < 4:
            return 0.0

        if _GEOD is not None:
            lons = [p[0] for p in ring_lonlat]
            lats = [p[1] for p in ring_lonlat]
            area_m2, _perimeter = _GEOD.polygon_area_perimeter(lons, lats)
            return abs(area_m2) / SQ_METRES_PER_ACRE

        # Fallback: project to local metres about the ring's own centroid,
        # then take the shoelace area.
        mean_lat = sum(p[1] for p in ring_lonlat) / len(ring_lonlat)
        m_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * math.radians(mean_lat))
        m_per_deg_lon = 111_412.84 * math.cos(math.radians(mean_lat))

        pts = [
            ((p[0] - ring_lonlat[0][0]) * m_per_deg_lon,
             (p[1] - ring_lonlat[0][1]) * m_per_deg_lat)
            for p in ring_lonlat
        ]
        s = 0.0
        for i in range(len(pts) - 1):
            s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
        return abs(s) / 2.0 / SQ_METRES_PER_ACRE

    # -------------------------------------------------------------- helpers

    def extent_acres(self) -> float:
        """Acreage of the full draped quad — a sanity ceiling for any parcel."""
        ring = list(self.corners) + [self.corners[0]]
        return self.area_acres(ring)

    @classmethod
    def from_overlay_row(
        cls, corners, width: int, height: int
    ) -> "QuadGeoreferencer":
        """
        Build from a `tbl_project_overlay` row.

        `corners` arrives as JSONB and may be a list or a JSON string depending
        on the driver and how the row was written.
        """
        if isinstance(corners, str):
            import json

            corners = json.loads(corners)
        return cls(corners=corners, width=int(width), height=int(height))
