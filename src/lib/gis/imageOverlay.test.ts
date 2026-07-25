/**
 * Unit tests for scaleCorners + fitCornersToGeometry (SS14, LSCMD-SS-DRAPE-POLYGON-TPS).
 * Pure geometry helpers behind the discrete scale control and the drawn-polygon drape
 * target. No MapLibre / DOM — these are the testable core of both features.
 */

import { scaleCorners, fitCornersToGeometry, cornersCenter, type Corners } from './imageOverlay';

const SQUARE: Corners = [
  [-112.0, 33.51], // TL
  [-111.98, 33.51], // TR
  [-111.98, 33.49], // BR
  [-112.0, 33.49], // BL
];

const approx = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

describe('scaleCorners', () => {
  it('factor 1 leaves corners unchanged', () => {
    const out = scaleCorners(SQUARE, 1);
    out.forEach(([lng, lat], i) => {
      expect(approx(lng, SQUARE[i][0])).toBe(true);
      expect(approx(lat, SQUARE[i][1])).toBe(true);
    });
  });

  it('preserves the centroid and doubles the latitude extent at factor 2', () => {
    const [c0Lng, c0Lat] = cornersCenter(SQUARE);
    const out = scaleCorners(SQUARE, 2);
    const [c1Lng, c1Lat] = cornersCenter(out);
    expect(approx(c0Lng, c1Lng, 1e-7)).toBe(true);
    expect(approx(c0Lat, c1Lat, 1e-7)).toBe(true);
    const latExtentBefore = SQUARE[0][1] - SQUARE[3][1];
    const latExtentAfter = out[0][1] - out[3][1];
    expect(approx(latExtentAfter, latExtentBefore * 2, 1e-7)).toBe(true);
  });

  it('shrinks at factor 0.5', () => {
    const out = scaleCorners(SQUARE, 0.5);
    const latExtentAfter = out[0][1] - out[3][1];
    const latExtentBefore = SQUARE[0][1] - SQUARE[3][1];
    expect(approx(latExtentAfter, latExtentBefore * 0.5, 1e-7)).toBe(true);
  });
});

describe('fitCornersToGeometry', () => {
  it('derives TL,TR,BR,BL from a polygon bbox', () => {
    const poly = {
      type: 'Polygon',
      coordinates: [[[-112.0, 33.49], [-111.98, 33.49], [-111.985, 33.51], [-112.0, 33.49]]],
    };
    const corners = fitCornersToGeometry(poly);
    expect(corners).not.toBeNull();
    // bbox: lng [-112.0,-111.98], lat [33.49,33.51]
    expect(corners![0]).toEqual([-112.0, 33.51]); // TL = minLng,maxLat
    expect(corners![1]).toEqual([-111.98, 33.51]); // TR = maxLng,maxLat
    expect(corners![2]).toEqual([-111.98, 33.49]); // BR = maxLng,minLat
    expect(corners![3]).toEqual([-112.0, 33.49]); // BL = minLng,minLat
  });

  it('handles MultiPolygon (recurses into nested coordinate arrays)', () => {
    const multi = {
      type: 'MultiPolygon',
      coordinates: [
        [[[-112.0, 33.49], [-111.99, 33.49], [-111.99, 33.50], [-112.0, 33.49]]],
        [[[-111.98, 33.50], [-111.97, 33.50], [-111.97, 33.51], [-111.98, 33.50]]],
      ],
    };
    const corners = fitCornersToGeometry(multi);
    expect(corners![0]).toEqual([-112.0, 33.51]); // overall bbox spanning both polys
    expect(corners![2]).toEqual([-111.97, 33.49]);
  });

  it('returns null for empty / degenerate geometry', () => {
    expect(fitCornersToGeometry(null)).toBeNull();
    expect(fitCornersToGeometry({ type: 'Polygon', coordinates: [] })).toBeNull();
    // zero-area (all points identical) → null, not a collapsed quad
    expect(
      fitCornersToGeometry({ type: 'Polygon', coordinates: [[[-112, 33.5], [-112, 33.5]]] })
    ).toBeNull();
  });
});
