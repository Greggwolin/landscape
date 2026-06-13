/**
 * imageOverlay — manage a draggable, georeferenced image drape on a MapLibre map.
 *
 * Part of the site-plan overlay "first slice" (snap + pin). Wraps a MapLibre `image`
 * source + `raster` layer. The image is pinned to four corner coordinates
 * (top-left, top-right, bottom-right, bottom-left). Corners are mutated as the user
 * drags handles; opacity is adjustable. This is the rectangular-quad drape — true
 * rubber-sheet warp to an irregular boundary is the later "full warp" slice.
 *
 * No React here — just source/layer lifecycle around a map instance.
 */

import type { Map as MlMap, ImageSource } from 'maplibre-gl';

/** Corner order MapLibre expects: TL, TR, BR, BL. Each is [lng, lat]. */
export type Corners = [
  [number, number],
  [number, number],
  [number, number],
  [number, number]
];

export interface OverlayHandle {
  readonly sourceId: string;
  readonly layerId: string;
  setCorners(corners: Corners): void;
  setOpacity(opacity: number): void;
  getCorners(): Corners;
  remove(): void;
}

interface AddOverlayOpts {
  id: string;
  url: string;
  corners: Corners;
  opacity?: number;
  /** Insert the raster layer beneath this layer id (e.g. parcel outlines) if present. */
  beforeId?: string;
}

const cloneCorners = (c: Corners): Corners =>
  [[c[0][0], c[0][1]], [c[1][0], c[1][1]], [c[2][0], c[2][1]], [c[3][0], c[3][1]]] as Corners;

/**
 * Build a default rectangle of corners around a center, sized in degrees. Used as the
 * initial drop position before the user drags/snaps. widthDeg/heightDeg are rough; the
 * user immediately repositions.
 */
export function defaultCorners(
  center: [number, number],
  widthDeg = 0.01,
  heightDeg = 0.008
): Corners {
  const [lng, lat] = center;
  const hw = widthDeg / 2;
  const hh = heightDeg / 2;
  return [
    [lng - hw, lat + hh], // TL
    [lng + hw, lat + hh], // TR
    [lng + hw, lat - hh], // BR
    [lng - hw, lat - hh], // BL
  ];
}

/** Centroid of the four corners. */
export function cornersCenter(c: Corners): [number, number] {
  const lng = (c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4;
  const lat = (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4;
  return [lng, lat];
}

/**
 * Rotate four corners about their centroid by `deg` degrees. Latitude is scaled by
 * cos(lat) so rotation looks square on a Web-Mercator map rather than skewing N-S.
 */
export function rotateCorners(c: Corners, deg: number): Corners {
  const [cLng, cLat] = cornersCenter(c);
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const latScale = Math.cos((cLat * Math.PI) / 180) || 1e-6;
  return c.map(([lng, lat]) => {
    const dx = (lng - cLng) * latScale;
    const dy = lat - cLat;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return [cLng + rx / latScale, cLat + ry] as [number, number];
  }) as Corners;
}

const isStyleReady = (map: MlMap): boolean => {
  try {
    return Boolean(map.isStyleLoaded());
  } catch {
    return false;
  }
};

/**
 * Add an image overlay to the map. Safe to call after a style reload — if the source
 * already exists it is removed first. Returns a handle for live updates.
 */
export function addImageOverlay(map: MlMap, opts: AddOverlayOpts): OverlayHandle {
  const { id, url, corners, opacity = 0.7, beforeId } = opts;
  const sourceId = `siteplan-overlay-${id}`;
  const layerId = `siteplan-overlay-layer-${id}`;

  let current = cloneCorners(corners);

  const removeExisting = () => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  };

  const add = () => {
    if (!isStyleReady(map)) return;
    removeExisting();
    map.addSource(sourceId, {
      type: 'image',
      url,
      coordinates: current,
    });
    const before = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
    map.addLayer(
      {
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: { 'raster-opacity': opacity, 'raster-fade-duration': 0 },
      },
      before
    );
  };

  add();

  // Re-add the overlay after a basemap style swap (Google ↔ OSM) drops custom sources.
  const onStyleData = () => {
    if (isStyleReady(map) && !map.getSource(sourceId)) add();
  };
  map.on('styledata', onStyleData);

  return {
    sourceId,
    layerId,
    setCorners(next: Corners) {
      current = cloneCorners(next);
      const src = map.getSource(sourceId) as ImageSource | undefined;
      if (src && typeof src.setCoordinates === 'function') {
        src.setCoordinates(current);
      }
    },
    setOpacity(value: number) {
      const clamped = Math.max(0, Math.min(1, value));
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'raster-opacity', clamped);
      }
    },
    getCorners() {
      return cloneCorners(current);
    },
    remove() {
      map.off('styledata', onStyleData);
      removeExisting();
    },
  };
}
