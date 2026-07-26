/**
 * tpsOverlay — render a thin-plate-spline (rubber-sheet) warped image drape on MapLibre.
 *
 * SS14 (LSCMD-SS-DRAPE-POLYGON-TPS). The 4-corner `image` source (imageOverlay.ts)
 * can only reposition four corners — it cannot bend the interior of the bitmap. A true
 * TPS warp requires pre-warping the pixels, so this module:
 *   1. samples the solved TPS warp (controlPoints.ts `solveTps`) on a grid,
 *   2. computes the geographic bounding box the warped image occupies,
 *   3. paints the source image, warped, into an offscreen canvas whose pixel space is a
 *      linear map of that geo bbox (piecewise-affine per grid triangle — a standard
 *      textured-triangle raster of the TPS field),
 *   4. drapes it through a MapLibre `canvas` source + `raster` layer, with the canvas's
 *      four `coordinates` set to the geo bbox corners (TL,TR,BR,BL).
 *
 * This is deliberately a SEPARATE source/layer from the quad `image` drape: the 4-corner
 * path stays byte-for-byte unchanged and is the default; TPS is opt-in and additive.
 *
 * No React. The image loads async — the source is added once it's ready and re-added
 * after a basemap style swap (which drops custom sources), mirroring addImageOverlay.
 */

import type { Map as MlMap } from 'maplibre-gl';
import { solveTps, type TpsWarp, type ControlPoint } from './controlPoints';
import type { Corners } from './imageOverlay';

export interface TpsOverlayHandle {
  readonly sourceId: string;
  readonly layerId: string;
  setOpacity(opacity: number): void;
  /** Re-solve/re-render with a new warp (e.g. a control point moved). */
  setWarp(warp: TpsWarp, imgWidth: number, imgHeight: number): void;
  /** Current geo bbox corners of the rendered canvas (TL,TR,BR,BL). */
  getCorners(): Corners;
  remove(): void;
}

interface AddTpsOverlayOpts {
  id: string;
  imageUrl: string;
  warp: TpsWarp;
  imgWidth: number;
  imgHeight: number;
  opacity?: number;
  beforeId?: string;
  /** Grid cells per axis for the piecewise-affine warp. Higher = smoother. Default 28. */
  grid?: number;
  /** Longest canvas edge, px. Caps memory/GPU cost of the warped bitmap. Default 1024. */
  maxCanvasPx?: number;
}

const isStyleReady = (map: MlMap): boolean => {
  try {
    return Boolean(map.isStyleLoaded());
  } catch {
    return false;
  }
};

/** Solve the affine (a,b,c,d,e,f) mapping src triangle → dst triangle for canvas setTransform. */
function affineFromTriangles(
  s: [number, number][],
  d: [number, number][]
): [number, number, number, number, number, number] | null {
  const [[u0, v0], [u1, v1], [u2, v2]] = s;
  const det = u0 * (v1 - v2) - v0 * (u1 - u2) + (u1 * v2 - u2 * v1);
  if (Math.abs(det) < 1e-9) return null;
  const solveOne = (x0: number, x1: number, x2: number) => {
    const a = (x0 * (v1 - v2) - v0 * (x1 - x2) + (x1 * v2 - x2 * v1)) / det;
    const b = (u0 * (x1 - x2) - x0 * (u1 - u2) + (u1 * x2 - u2 * x1)) / det;
    const c = (u0 * (v1 * x2 - v2 * x1) - v0 * (u1 * x2 - u2 * x1) + x0 * (u1 * v2 - u2 * v1)) / det;
    return [a, b, c] as const;
  };
  const [a, c, e] = solveOne(d[0][0], d[1][0], d[2][0]); // x = a·u + c·v + e
  const [b, dd, f] = solveOne(d[0][1], d[1][1], d[2][1]); // y = b·u + dd·v + f
  return [a, b, c, dd, e, f];
}

interface RenderResult {
  canvas: HTMLCanvasElement;
  corners: Corners;
}

/** Paint the warped image into an offscreen canvas; return it + its geo-bbox corners. */
function renderWarpedCanvas(
  img: HTMLImageElement,
  warp: TpsWarp,
  imgWidth: number,
  imgHeight: number,
  grid: number,
  maxCanvasPx: number
): RenderResult | null {
  const cols = Math.max(2, grid);
  const rows = Math.max(2, grid);

  // Warp every grid node to geo; track the bbox.
  const geo: [number, number][][] = [];
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (let r = 0; r <= rows; r++) {
    const rowArr: [number, number][] = [];
    for (let c = 0; c <= cols; c++) {
      const ix = (c / cols) * imgWidth;
      const iy = (r / rows) * imgHeight;
      const g = warp.at(ix, iy);
      rowArr.push(g);
      if (g[0] < minLng) minLng = g[0];
      if (g[0] > maxLng) maxLng = g[0];
      if (g[1] < minLat) minLat = g[1];
      if (g[1] > maxLat) maxLat = g[1];
    }
    geo.push(rowArr);
  }
  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;
  if (!(lngSpan > 0) || !(latSpan > 0)) return null;

  // Canvas px space = linear map of the geo bbox. Size to keep the longest edge ≤ cap
  // while preserving the bbox aspect ratio (corrected for longitude compression).
  const latMid = (minLat + maxLat) / 2;
  const aspect = (lngSpan * Math.cos((latMid * Math.PI) / 180)) / latSpan;
  let cw: number, ch: number;
  if (aspect >= 1) { cw = maxCanvasPx; ch = Math.max(1, Math.round(maxCanvasPx / aspect)); }
  else { ch = maxCanvasPx; cw = Math.max(1, Math.round(maxCanvasPx * aspect)); }

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // geo → canvas px (y flips: max lat at top).
  const toPx = (g: [number, number]): [number, number] => [
    ((g[0] - minLng) / lngSpan) * cw,
    ((maxLat - g[1]) / latSpan) * ch,
  ];

  // Draw each grid cell as two textured triangles (source image px → warped canvas px).
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx0 = (c / cols) * imgWidth, sx1 = ((c + 1) / cols) * imgWidth;
      const sy0 = (r / rows) * imgHeight, sy1 = ((r + 1) / rows) * imgHeight;
      const sTL: [number, number] = [sx0, sy0];
      const sTR: [number, number] = [sx1, sy0];
      const sBR: [number, number] = [sx1, sy1];
      const sBL: [number, number] = [sx0, sy1];
      const dTL = toPx(geo[r][c]);
      const dTR = toPx(geo[r][c + 1]);
      const dBR = toPx(geo[r + 1][c + 1]);
      const dBL = toPx(geo[r + 1][c]);
      drawTri(ctx, img, [sTL, sTR, sBR], [dTL, dTR, dBR]);
      drawTri(ctx, img, [sTL, sBR, sBL], [dTL, dBR, dBL]);
    }
  }

  const corners: Corners = [
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat],
  ];
  return { canvas, corners };
}

function drawTri(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  s: [number, number][],
  d: [number, number][]
): void {
  const m = affineFromTriangles(s, d);
  if (!m) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d[0][0], d[0][1]);
  ctx.lineTo(d[1][0], d[1][1]);
  ctx.lineTo(d[2][0], d[2][1]);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Add a TPS-warped image drape. Returns a handle immediately; the canvas source is
 * created once the image loads. Safe across basemap style swaps.
 */
export function addTpsOverlay(map: MlMap, opts: AddTpsOverlayOpts): TpsOverlayHandle {
  const {
    id, imageUrl, opacity = 0.7, beforeId,
    grid = 28, maxCanvasPx = 1024,
  } = opts;
  const sourceId = `siteplan-tps-${id}`;
  const layerId = `siteplan-tps-layer-${id}`;

  let warp = opts.warp;
  let imgWidth = opts.imgWidth;
  let imgHeight = opts.imgHeight;
  let corners: Corners = [[0, 0], [0, 0], [0, 0], [0, 0]];
  let currentOpacity = opacity;
  let removed = false;

  const img = new Image();
  img.crossOrigin = 'anonymous';

  const removeExisting = () => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  };

  const build = () => {
    if (removed || !img.complete || img.naturalWidth === 0) return;
    if (!isStyleReady(map)) return;
    const rendered = renderWarpedCanvas(img, warp, imgWidth, imgHeight, grid, maxCanvasPx);
    if (!rendered) return;
    corners = rendered.corners;
    removeExisting();
    // MapLibre CanvasSource: canvas element + the four geo coordinates it maps onto.
    map.addSource(sourceId, {
      type: 'canvas',
      canvas: rendered.canvas,
      coordinates: corners,
      animate: false,
    } as never);
    const before = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
    map.addLayer(
      {
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: { 'raster-opacity': currentOpacity, 'raster-fade-duration': 0 },
      },
      before
    );
  };

  if (img.complete && img.naturalWidth > 0) build();
  else {
    img.onload = () => build();
  }
  img.src = imageUrl;

  const onStyleData = () => {
    if (isStyleReady(map) && !map.getSource(sourceId)) build();
  };
  map.on('styledata', onStyleData);

  return {
    sourceId,
    layerId,
    setOpacity(value: number) {
      currentOpacity = Math.max(0, Math.min(1, value));
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'raster-opacity', currentOpacity);
      }
    },
    setWarp(nextWarp: TpsWarp, w: number, h: number) {
      warp = nextWarp;
      imgWidth = w;
      imgHeight = h;
      build();
    },
    getCorners() {
      return [[corners[0][0], corners[0][1]], [corners[1][0], corners[1][1]],
        [corners[2][0], corners[2][1]], [corners[3][0], corners[3][1]]] as Corners;
    },
    remove() {
      removed = true;
      map.off('styledata', onStyleData);
      img.onload = null;
      removeExisting();
    },
  };
}

interface AddTpsFromControlPointsOpts {
  id: string;
  imageUrl: string;
  /** Saved control points (image px ↔ map lng/lat) — solved into the warp on load. */
  controlPoints: ControlPoint[];
  opacity?: number;
  beforeId?: string;
  grid?: number;
  maxCanvasPx?: number;
}

/**
 * Mount a TPS-warped drape when only the saved control points are known and the image's
 * pixel dimensions are NOT (the read-only / passive render path — SS15). The overlay row
 * stores control_points but no image dims, so we probe the image, take its natural size
 * as the control-point pixel space (source_uri IS the extracted crop, same space the
 * points were placed in), solve the warp with the shipped solveTps(), and delegate to the
 * unchanged addTpsOverlay() with the same `id`. Returns a handle immediately; the delegate
 * mounts once the (browser-cached) image loads. If the points are too few/degenerate, no
 * warp is mounted (the caller keeps whatever it had).
 */
export function addTpsOverlayFromControlPoints(
  map: MlMap,
  opts: AddTpsFromControlPointsOpts
): TpsOverlayHandle {
  const { id, imageUrl, controlPoints, beforeId, grid, maxCanvasPx } = opts;
  let delegate: TpsOverlayHandle | null = null;
  let removed = false;
  let pendingOpacity = opts.opacity ?? 0.7;

  const probe = new Image();
  probe.crossOrigin = 'anonymous';
  probe.onload = () => {
    if (removed) return;
    const w = probe.naturalWidth;
    const h = probe.naturalHeight;
    if (!w || !h) return;
    try {
      const { warp } = solveTps(w, h, controlPoints);
      delegate = addTpsOverlay(map, {
        id, imageUrl, warp, imgWidth: w, imgHeight: h,
        opacity: pendingOpacity, beforeId, grid, maxCanvasPx,
      });
    } catch {
      // Too few / degenerate points — leave nothing mounted (parity with edit-path fallback).
    }
  };
  probe.src = imageUrl;

  return {
    // Same ids addTpsOverlay will create, so layer-lifting works even before the delegate mounts.
    sourceId: `siteplan-tps-${id}`,
    layerId: `siteplan-tps-layer-${id}`,
    setOpacity(value: number) {
      pendingOpacity = Math.max(0, Math.min(1, value));
      delegate?.setOpacity(pendingOpacity);
    },
    setWarp() {
      // Passive re-render: the warp is fixed from the saved control points.
    },
    getCorners() {
      return delegate?.getCorners() ?? ([[0, 0], [0, 0], [0, 0], [0, 0]] as Corners);
    },
    remove() {
      removed = true;
      probe.onload = null;
      delegate?.remove();
    },
  };
}

/**
 * Whether a saved overlay should render as a TPS warp rather than a 4-corner quad:
 * its warp_mode is 'tps' AND it carries at least the 3 control points TPS needs.
 * Shared by the read-only render (SS15) so the branch is one testable predicate.
 */
export function shouldRenderTps(
  overlay: { warp_mode?: string | null; control_points?: unknown[] | null }
): boolean {
  return overlay.warp_mode === 'tps'
    && Array.isArray(overlay.control_points)
    && overlay.control_points.length >= 3;
}
