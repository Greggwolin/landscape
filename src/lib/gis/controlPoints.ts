/**
 * controlPoints — georeference an extracted plan image to real parcel geometry.
 *
 * The user places control points (ground control points): each pairs a pixel on the
 * extracted plan image with a lng/lat on the map (ideally snapped to a parcel vertex).
 * From those pairs we solve an image→geo transform and emit the four image-corner
 * coordinates the MapLibre image overlay expects (see imageOverlay.ts `Corners`).
 *
 * Transform tier scales with the number of control points (D16):
 *   2 points  → similarity  (translate + rotate + uniform scale)
 *   3 points  → affine      (adds non-uniform scale + shear)
 *   4+ points → projective  (homography — adds perspective; least-squares when > 4)
 *
 * Thin-plate-spline rubber-sheet (5+ points, true warp) is a later slice: it requires
 * pre-warping the bitmap to a canvas rather than just repositioning four corners, which
 * the MapLibre image source cannot express. `recommendTier` flags when TPS would help.
 *
 * Geometry note: we fit in a local equirectangular frame (metres) centred on the control
 * points' mean latitude, so longitude compression by cos(lat) doesn't skew the fit. The
 * solved corners are converted back to lng/lat.
 *
 * Pure module — no React, no MapLibre. Unit-testable in isolation.
 */

import type { Corners } from './imageOverlay';

export interface ImgPoint {
  /** pixel x in the extracted image (0 = left) */
  x: number;
  /** pixel y in the extracted image (0 = top) */
  y: number;
}

export type GeoPoint = [number, number]; // [lng, lat]

export interface ControlPoint {
  img: ImgPoint;
  map: GeoPoint;
}

export type TransformKind = 'similarity' | 'affine' | 'projective';

export interface GeorefResult {
  corners: Corners;
  kind: TransformKind;
  /** RMS residual of the fit, in metres (lower is better). */
  rmsMeters: number;
}

// --- local planar frame (equirectangular metres about a reference lat/lng) ---

const R = 6378137; // earth radius (m)
const D2R = Math.PI / 180;

interface Frame {
  lng0: number;
  lat0: number;
  kx: number; // metres per degree lng at lat0
  ky: number; // metres per degree lat
}

function makeFrame(lng0: number, lat0: number): Frame {
  const ky = (R * D2R); // ~111320 m/deg lat
  const kx = ky * Math.cos(lat0 * D2R);
  return { lng0, lat0, kx, ky };
}
function toMeters(f: Frame, p: GeoPoint): [number, number] {
  return [(p[0] - f.lng0) * f.kx, (p[1] - f.lat0) * f.ky];
}
function toGeo(f: Frame, m: [number, number]): GeoPoint {
  return [f.lng0 + m[0] / f.kx, f.lat0 + m[1] / f.ky];
}

// --- tiny linear algebra (Gaussian elimination, small systems) ---

/** Solve A x = b for square A (n×n). Returns null if singular. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let j = col; j <= n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row[n]);
}

/** Least-squares solve of (G p = h): returns p minimising ||G p - h||. */
function lstsq(G: number[][], h: number[]): number[] | null {
  const cols = G[0].length;
  const AtA: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const Atb: number[] = new Array(cols).fill(0);
  for (let i = 0; i < G.length; i++) {
    for (let a = 0; a < cols; a++) {
      Atb[a] += G[i][a] * h[i];
      for (let b = 0; b < cols; b++) AtA[a][b] += G[i][a] * G[i][b];
    }
  }
  return solve(AtA, Atb);
}

// --- transform fits: image (x,y) -> metres (mx,my) ---

type MapFn = (x: number, y: number) => [number, number];

/** Similarity: [mx,my] = s*R*[x,y] + t. Solve a,b,tx,ty where mx=a*x-b*y+tx, my=b*x+a*y+ty. */
function fitSimilarity(src: ImgPoint[], dst: [number, number][]): MapFn | null {
  const G: number[][] = [];
  const h: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const { x, y } = src[i];
    const [mx, my] = dst[i];
    G.push([x, -y, 1, 0]); h.push(mx);
    G.push([y, x, 0, 1]); h.push(my);
  }
  const p = lstsq(G, h);
  if (!p) return null;
  const [a, b, tx, ty] = p;
  return (x, y) => [a * x - b * y + tx, b * x + a * y + ty];
}

/** Affine: mx=a*x+b*y+c, my=d*x+e*y+f. */
function fitAffine(src: ImgPoint[], dst: [number, number][]): MapFn | null {
  const Gx: number[][] = [], hx: number[] = [], Gy: number[][] = [], hy: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const { x, y } = src[i];
    Gx.push([x, y, 1]); hx.push(dst[i][0]);
    Gy.push([x, y, 1]); hy.push(dst[i][1]);
  }
  const px = lstsq(Gx, hx), py = lstsq(Gy, hy);
  if (!px || !py) return null;
  return (x, y) => [px[0] * x + px[1] * y + px[2], py[0] * x + py[1] * y + py[2]];
}

/** Projective (homography) image->metres via DLT. Least-squares when > 4 points. */
function fitProjective(src: ImgPoint[], dst: [number, number][]): MapFn | null {
  // [mx,my] = ( (h0 x + h1 y + h2), (h3 x + h4 y + h5) ) / (h6 x + h7 y + 1)
  const G: number[][] = [], h: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const { x, y } = src[i];
    const [mx, my] = dst[i];
    G.push([x, y, 1, 0, 0, 0, -mx * x, -mx * y]); h.push(mx);
    G.push([0, 0, 0, x, y, 1, -my * x, -my * y]); h.push(my);
  }
  const p = lstsq(G, h);
  if (!p) return null;
  const [a, b, c, d, e, f, g, k] = p;
  return (x, y) => {
    const w = g * x + k * y + 1 || 1e-9;
    return [(a * x + b * y + c) / w, (d * x + e * y + f) / w];
  };
}

function rms(fn: MapFn, src: ImgPoint[], dst: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < src.length; i++) {
    const [mx, my] = fn(src[i].x, src[i].y);
    s += (mx - dst[i][0]) ** 2 + (my - dst[i][1]) ** 2;
  }
  return Math.sqrt(s / src.length);
}

/**
 * Georeference: given the extracted image size and ≥2 control points, return the four
 * corner lng/lats for the MapLibre overlay (order TL, TR, BR, BL).
 *
 * @throws if fewer than 2 control points or the system is degenerate (collinear points).
 */
export function georeference(
  imgWidth: number,
  imgHeight: number,
  points: ControlPoint[]
): GeorefResult {
  if (points.length < 2) {
    throw new Error('Need at least 2 control points to position and scale the image.');
  }
  // local frame about the control-point centroid
  const lng0 = points.reduce((a, p) => a + p.map[0], 0) / points.length;
  const lat0 = points.reduce((a, p) => a + p.map[1], 0) / points.length;
  const frame = makeFrame(lng0, lat0);

  const src = points.map((p) => p.img);
  const dst = points.map((p) => toMeters(frame, p.map));

  let kind: TransformKind;
  let fn: MapFn | null;
  if (points.length === 2) {
    kind = 'similarity';
    fn = fitSimilarity(src, dst);
  } else if (points.length === 3) {
    kind = 'affine';
    fn = fitAffine(src, dst);
  } else {
    kind = 'projective';
    fn = fitProjective(src, dst);
    // homography can be unstable on near-degenerate sets — fall back to affine
    if (!fn) { kind = 'affine'; fn = fitAffine(src, dst); }
  }
  if (!fn) {
    throw new Error('Control points are degenerate (e.g. collinear) — move them apart.');
  }

  const cornerPx: ImgPoint[] = [
    { x: 0, y: 0 },               // TL
    { x: imgWidth, y: 0 },        // TR
    { x: imgWidth, y: imgHeight },// BR
    { x: 0, y: imgHeight },       // BL
  ];
  const corners = cornerPx.map((c) => toGeo(frame, fn!(c.x, c.y))) as Corners;
  return { corners, kind, rmsMeters: rms(fn, src, dst) };
}

/**
 * Snap a clicked map point to the nearest parcel-geometry vertex within `thresholdMeters`.
 * Returns the snapped vertex, or the original point if none is close enough.
 */
export function snapToVertex(
  clicked: GeoPoint,
  vertices: GeoPoint[],
  thresholdMeters = 8
): { point: GeoPoint; snapped: boolean } {
  if (!vertices.length) return { point: clicked, snapped: false };
  const f = makeFrame(clicked[0], clicked[1]);
  const c = toMeters(f, clicked);
  let best: GeoPoint | null = null;
  let bestD = Infinity;
  for (const v of vertices) {
    const m = toMeters(f, v);
    const d = Math.hypot(m[0] - c[0], m[1] - c[1]);
    if (d < bestD) { bestD = d; best = v; }
  }
  if (best && bestD <= thresholdMeters) return { point: best, snapped: true };
  return { point: clicked, snapped: false };
}

/**
 * Whether a thin-plate-spline warp would meaningfully help: many control points AND a
 * projective fit that still leaves notable residual (the plan is non-planar / hand-drawn).
 * Used to nudge the UI toward the TPS warp mode rather than implying 4-corner is exact.
 */
export function recommendTpsWarp(result: GeorefResult, pointCount: number): boolean {
  return pointCount >= 5 && result.rmsMeters > 3;
}

// ===========================================================================
// Thin-plate-spline (true rubber-sheet) warp — SS14 (LSCMD-SS-DRAPE-POLYGON-TPS)
//
// The 4-corner fits above (similarity/affine/projective) reposition exactly four
// corners; MapLibre's `image` source can render that. A genuine rubber-sheet warp
// bends the *interior* of the bitmap so every control point lands on its map target,
// which the image source cannot express — the caller renders the warp onto a canvas
// (see lib/gis/tpsOverlay.ts) using the `warp` function returned here.
//
// TPS interpolates each output coordinate independently as
//     f(x,y) = a0 + a1·x + a2·y + Σ w_i·U(‖(x,y) − p_i‖)
// with U(r) = r²·ln(r²) (r>0, U(0)=0), solved so f reproduces the control values
// exactly (λ = 0) subject to the affine side-constraints Σw_i = Σw_i·x_i = Σw_i·y_i = 0.
// Fit is done in the same local equirectangular metre frame as georeference(), then
// converted back to lng/lat, so longitude compression by cos(lat) doesn't skew it.
// ===========================================================================

/** A solved TPS warp: image pixel (x,y) → geographic [lng,lat]. */
export interface TpsWarp {
  /** Map an image pixel to a geographic coordinate. */
  at(x: number, y: number): GeoPoint;
}

export interface TpsResult {
  warp: TpsWarp;
  /** Four image-corner geo coords (TL,TR,BR,BL) — a bounding quad for fallback/preview. */
  corners: Corners;
  /** RMS residual at the control points, in metres (≈0 for an exact interpolation). */
  rmsMeters: number;
  kind: 'tps';
}

const U = (r2: number): number => (r2 <= 0 ? 0 : r2 * Math.log(r2));

/**
 * Solve one TPS component: image points → scalar target values. Returns an evaluator
 * f(x,y). `null` if the (n+3) system is degenerate (e.g. all points coincident).
 */
function solveTpsComponent(
  pts: ImgPoint[],
  values: number[]
): ((x: number, y: number) => number) | null {
  const n = pts.length;
  const dim = n + 3;
  const A: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const b: number[] = new Array(dim).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      A[i][j] = U(dx * dx + dy * dy);
    }
    // P block (affine terms) — right columns and bottom rows.
    A[i][n] = 1; A[i][n + 1] = pts[i].x; A[i][n + 2] = pts[i].y;
    A[n][i] = 1; A[n + 1][i] = pts[i].x; A[n + 2][i] = pts[i].y;
    b[i] = values[i];
  }

  const sol = solve(A, b);
  if (!sol) return null;
  const w = sol.slice(0, n);
  const a0 = sol[n], a1 = sol[n + 1], a2 = sol[n + 2];

  return (x: number, y: number) => {
    let acc = a0 + a1 * x + a2 * y;
    for (let i = 0; i < n; i++) {
      const dx = x - pts[i].x;
      const dy = y - pts[i].y;
      acc += w[i] * U(dx * dx + dy * dy);
    }
    return acc;
  };
}

/**
 * Solve a thin-plate-spline warp from ≥3 control points. The warp reproduces every
 * control point exactly (rubber-sheet). Callers keep the 4-corner {@link georeference}
 * as the default and only switch to TPS on request.
 *
 * @throws if fewer than 3 control points or the system is degenerate.
 */
export function solveTps(
  imgWidth: number,
  imgHeight: number,
  points: ControlPoint[]
): TpsResult {
  if (points.length < 3) {
    throw new Error('Thin-plate-spline warp needs at least 3 control points.');
  }
  const lng0 = points.reduce((a, p) => a + p.map[0], 0) / points.length;
  const lat0 = points.reduce((a, p) => a + p.map[1], 0) / points.length;
  const frame = makeFrame(lng0, lat0);

  const src = points.map((p) => p.img);
  const dstM = points.map((p) => toMeters(frame, p.map));
  const fx = solveTpsComponent(src, dstM.map((d) => d[0]));
  const fy = solveTpsComponent(src, dstM.map((d) => d[1]));
  if (!fx || !fy) {
    throw new Error('Control points are degenerate — spread them out.');
  }

  const warp: TpsWarp = {
    at: (x, y) => toGeo(frame, [fx(x, y), fy(x, y)]),
  };

  // RMS residual at the control points (exact TPS ⇒ ~0, guards a bad solve).
  let s = 0;
  for (let i = 0; i < src.length; i++) {
    const mx = fx(src[i].x, src[i].y);
    const my = fy(src[i].x, src[i].y);
    s += (mx - dstM[i][0]) ** 2 + (my - dstM[i][1]) ** 2;
  }
  const rmsMeters = Math.sqrt(s / src.length);

  const cornerPx: ImgPoint[] = [
    { x: 0, y: 0 },
    { x: imgWidth, y: 0 },
    { x: imgWidth, y: imgHeight },
    { x: 0, y: imgHeight },
  ];
  const corners = cornerPx.map((c) => warp.at(c.x, c.y)) as Corners;

  return { warp, corners, rmsMeters, kind: 'tps' };
}
