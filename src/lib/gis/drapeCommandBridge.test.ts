/**
 * Unit tests for the SS16 drape-command bridge helpers (LSCMD-SS-DRAPE-TOOL-WIRE):
 * target resolution (selected parcels vs drawn polygon vs auto, with graceful
 * no-geometry fallback) and nudge translation. These are the pure decision points the
 * MapTab drain handler runs; the drape handlers themselves are WebGL and visual-gated.
 */

import {
  resolveDrapeTargetGeometry,
  nudgeCorners,
  setPendingDrapeCommand,
  takePendingDrapeCommand,
} from './drapeCommandBridge';
import { fitCornersToGeometry, type Corners } from './imageOverlay';

const parcelA = { coordinates: [[[-112.0, 33.49], [-111.99, 33.49], [-111.99, 33.50], [-112.0, 33.49]]] };
const parcelB = { coordinates: [[[-111.98, 33.50], [-111.97, 33.50], [-111.97, 33.51], [-111.98, 33.50]]] };
const drawn = { coordinates: [[[-112.5, 33.0], [-112.4, 33.0], [-112.4, 33.1], [-112.5, 33.0]]] };

describe('resolveDrapeTargetGeometry', () => {
  it('selected_parcels → wraps the selected parcels’ coordinates', () => {
    const geom = resolveDrapeTargetGeometry('selected_parcels', {
      selectedParcelGeoms: [parcelA, parcelB],
      drawnPolygon: drawn,
    });
    // fitCornersToGeometry bboxes across BOTH parcels, not the drawn polygon.
    const corners = fitCornersToGeometry(geom);
    expect(corners![0]).toEqual([-112.0, 33.51]); // TL = minLng,maxLat over A+B
    expect(corners![2]).toEqual([-111.97, 33.49]); // BR = maxLng,minLat over A+B
  });

  it('drawn_polygon → uses the drawn polygon even when parcels are selected', () => {
    const geom = resolveDrapeTargetGeometry('drawn_polygon', {
      selectedParcelGeoms: [parcelA],
      drawnPolygon: drawn,
    });
    const corners = fitCornersToGeometry(geom);
    expect(corners![0]).toEqual([-112.5, 33.1]);
  });

  it('auto → parcels first, else drawn polygon, else null', () => {
    expect(
      resolveDrapeTargetGeometry('auto', { selectedParcelGeoms: [parcelA], drawnPolygon: drawn })!.coordinates
    ).toEqual([parcelA.coordinates]);
    expect(
      resolveDrapeTargetGeometry('auto', { selectedParcelGeoms: [], drawnPolygon: drawn })!.coordinates
    ).toEqual(drawn.coordinates);
    expect(
      resolveDrapeTargetGeometry('auto', { selectedParcelGeoms: [], drawnPolygon: null })
    ).toBeNull();
  });

  it('ignores parcels without geometry and returns null when nothing usable remains', () => {
    expect(
      resolveDrapeTargetGeometry('selected_parcels', {
        selectedParcelGeoms: [null, undefined, {}],
        drawnPolygon: null,
      })
    ).toBeNull();
  });
});

describe('nudgeCorners', () => {
  const square: Corners = [
    [-112.0, 33.51], // TL
    [-111.98, 33.51], // TR
    [-111.98, 33.49], // BR
    [-112.0, 33.49], // BL
  ]; // extent: 0.02 lng × 0.02 lat

  it('east shifts longitude by +amount×width', () => {
    const out = nudgeCorners(square, 'east', 0.1);
    out.forEach(([lng], i) => expect(lng).toBeCloseTo(square[i][0] + 0.002, 9));
  });

  it('north shifts latitude by +amount×height; south is negative', () => {
    expect(nudgeCorners(square, 'north', 0.25)[0][1]).toBeCloseTo(33.51 + 0.005, 9);
    expect(nudgeCorners(square, 'south', 0.25)[0][1]).toBeCloseTo(33.51 - 0.005, 9);
  });

  it('west/left and east/right are aliases; default amount is 0.1', () => {
    expect(nudgeCorners(square, 'left')[0][0]).toBeCloseTo(-112.0 - 0.002, 9);
    expect(nudgeCorners(square, 'right')[0][0]).toBeCloseTo(-112.0 + 0.002, 9);
  });
});

describe('drape command latch', () => {
  it('take() returns the pending command once, then null', () => {
    setPendingDrapeCommand({ action: 'save' });
    expect(takePendingDrapeCommand()).toEqual({ action: 'save' });
    expect(takePendingDrapeCommand()).toBeNull();
  });
});
