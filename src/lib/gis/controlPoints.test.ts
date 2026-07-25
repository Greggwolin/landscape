/**
 * Unit tests for the thin-plate-spline warp solver (SS14, LSCMD-SS-DRAPE-POLYGON-TPS).
 *
 * TPS is an *exact* interpolant: the solved warp must reproduce every control point's
 * map coordinate, including interior points that a plane (affine/projective 4-corner
 * fit) cannot satisfy — that non-planar reproduction is the whole point of TPS.
 */

import { solveTps, georeference, type ControlPoint } from './controlPoints';

const near = (a: number, b: number, tolDeg = 1e-6) => Math.abs(a - b) <= tolDeg;

describe('solveTps', () => {
  it('throws with fewer than 3 control points', () => {
    const pts: ControlPoint[] = [
      { img: { x: 0, y: 0 }, map: [-112.0, 33.5] },
      { img: { x: 100, y: 0 }, map: [-111.99, 33.5] },
    ];
    expect(() => solveTps(100, 100, pts)).toThrow(/at least 3/i);
  });

  it('reproduces every control point exactly, including a non-planar interior point', () => {
    // Four corners on a plane plus a 5th interior point pulled OFF that plane — no
    // affine/projective map can hit all five, but TPS interpolates exactly.
    const pts: ControlPoint[] = [
      { img: { x: 0, y: 0 }, map: [-112.0, 33.5] },
      { img: { x: 200, y: 0 }, map: [-111.98, 33.5] },
      { img: { x: 200, y: 200 }, map: [-111.98, 33.48] },
      { img: { x: 0, y: 200 }, map: [-112.0, 33.48] },
      { img: { x: 100, y: 100 }, map: [-111.985, 33.492] }, // off the bilinear plane
    ];
    const { warp, rmsMeters, kind } = solveTps(200, 200, pts);
    expect(kind).toBe('tps');
    for (const p of pts) {
      const [lng, lat] = warp.at(p.img.x, p.img.y);
      expect(near(lng, p.map[0])).toBe(true);
      expect(near(lat, p.map[1])).toBe(true);
    }
    // Exact interpolation ⇒ residual is numerically ~0 (metres).
    expect(rmsMeters).toBeLessThan(1e-3);
  });

  it('returns four bounding corners in TL,TR,BR,BL order', () => {
    const pts: ControlPoint[] = [
      { img: { x: 0, y: 0 }, map: [-112.0, 33.5] },
      { img: { x: 100, y: 0 }, map: [-111.99, 33.5] },
      { img: { x: 100, y: 100 }, map: [-111.99, 33.49] },
      { img: { x: 0, y: 100 }, map: [-112.0, 33.49] },
    ];
    const { corners } = solveTps(100, 100, pts);
    expect(corners).toHaveLength(4);
    // TL image corner (0,0) maps to the first control point's target here.
    expect(near(corners[0][0], -112.0)).toBe(true);
    expect(near(corners[0][1], 33.5)).toBe(true);
  });

  it('agrees with the affine 4-corner fit when the control points ARE coplanar', () => {
    // A pure affine mapping: TPS and georeference should land the corners identically.
    const pts: ControlPoint[] = [
      { img: { x: 0, y: 0 }, map: [-112.0, 33.5] },
      { img: { x: 100, y: 0 }, map: [-111.99, 33.5] },
      { img: { x: 0, y: 100 }, map: [-112.0, 33.49] },
    ];
    const tps = solveTps(100, 100, pts);
    const quad = georeference(100, 100, pts);
    for (let i = 0; i < 4; i++) {
      expect(near(tps.corners[i][0], quad.corners[i][0], 1e-5)).toBe(true);
      expect(near(tps.corners[i][1], quad.corners[i][1], 1e-5)).toBe(true);
    }
  });
});
