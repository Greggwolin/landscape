/**
 * snapIndex — magnetic snapping of map handles to parcel geometry.
 *
 * Part of the site-plan overlay "first slice" (snap + pin). Builds a lightweight
 * index of parcel vertices and edges from a GeoJSON FeatureCollection, then snaps a
 * dragged handle to the nearest vertex (preferred) or point-on-edge within a
 * screen-space pixel tolerance.
 *
 * Pure module — no React, no MapLibre layer mutation. Takes a MapLibre map only to
 * project lng/lat → screen pixels for tolerance checks. Snap targets come from the
 * same county parcel GeoJSON already fetched by laCountyParcels.ts / the parcel proxy.
 */

import type { Feature, FeatureCollection, Position } from 'geojson';
import * as turf from '@turf/turf';

export interface LngLat {
  lng: number;
  lat: number;
}

/** A point the map can project to screen pixels (MapLibre Map satisfies this). */
export interface Projector {
  project(lngLat: [number, number]): { x: number; y: number };
}

export type SnapKind = 'vertex' | 'edge';

export interface SnapResult {
  lngLat: LngLat;
  kind: SnapKind;
  /** screen-pixel distance from the cursor to the snapped point */
  pixelDistance: number;
}

interface Segment {
  a: Position; // [lng, lat]
  b: Position;
}

export interface SnapIndex {
  vertices: Position[];
  segments: Segment[];
  /** Snap a target lng/lat to the nearest vertex/edge within tolerancePx. Null if none. */
  snap(target: LngLat, projector: Projector, tolerancePx?: number): SnapResult | null;
  vertexCount: number;
}

const DEFAULT_TOLERANCE_PX = 12;

/** Walk a polygon/multipolygon coordinate tree, collecting rings (arrays of positions). */
function collectRings(coords: unknown, out: Position[][]): void {
  if (!Array.isArray(coords) || coords.length === 0) return;
  const first = coords[0];
  // A ring is an array of [number, number] positions.
  if (Array.isArray(first) && typeof first[0] === 'number') {
    out.push(coords as Position[]);
    return;
  }
  for (const child of coords) collectRings(child, out);
}

function ringsFromFeature(feature: Feature): Position[][] {
  const geom = feature.geometry;
  if (!geom) return [];
  if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
    const out: Position[][] = [];
    collectRings(geom.coordinates as unknown, out);
    return out;
  }
  if (geom.type === 'LineString') return [geom.coordinates as Position[]];
  if (geom.type === 'MultiLineString') return geom.coordinates as Position[][];
  return [];
}

function pixelDist(
  projector: Projector,
  a: { lng: number; lat: number },
  b: { lng: number; lat: number }
): number {
  const pa = projector.project([a.lng, a.lat]);
  const pb = projector.project([b.lng, b.lat]);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

/**
 * Build a snap index from parcel features. De-duplicates coincident vertices to a
 * ~1e-7 deg grid (~1cm) so shared lot corners register once.
 */
export function buildSnapIndex(fc: FeatureCollection | null | undefined): SnapIndex {
  const vertices: Position[] = [];
  const segments: Segment[] = [];
  const seen = new Set<string>();

  const features = fc?.features ?? [];
  for (const feature of features) {
    for (const ring of ringsFromFeature(feature)) {
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i];
        if (!Array.isArray(p) || typeof p[0] !== 'number' || typeof p[1] !== 'number') continue;
        const key = `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
        if (!seen.has(key)) {
          seen.add(key);
          vertices.push([p[0], p[1]]);
        }
        if (i > 0) {
          const prev = ring[i - 1];
          if (Array.isArray(prev) && typeof prev[0] === 'number') {
            segments.push({ a: [prev[0], prev[1]], b: [p[0], p[1]] });
          }
        }
      }
    }
  }

  const snap = (
    target: LngLat,
    projector: Projector,
    tolerancePx: number = DEFAULT_TOLERANCE_PX
  ): SnapResult | null => {
    let best: SnapResult | null = null;

    // 1) Nearest vertex (preferred — corners feel "sticky").
    for (const v of vertices) {
      const d = pixelDist(projector, target, { lng: v[0], lat: v[1] });
      if (d <= tolerancePx && (!best || d < best.pixelDistance)) {
        best = { lngLat: { lng: v[0], lat: v[1] }, kind: 'vertex', pixelDistance: d };
      }
    }
    if (best) return best;

    // 2) Fall back to nearest point on an edge (geo-space projection, pixel-checked).
    if (segments.length > 0) {
      try {
        const pt = turf.point([target.lng, target.lat]);
        let bestEdge: SnapResult | null = null;
        for (const seg of segments) {
          const line = turf.lineString([seg.a, seg.b]);
          const snapped = turf.nearestPointOnLine(line, pt);
          const [lng, lat] = snapped.geometry.coordinates;
          const d = pixelDist(projector, target, { lng, lat });
          if (d <= tolerancePx && (!bestEdge || d < bestEdge.pixelDistance)) {
            bestEdge = { lngLat: { lng, lat }, kind: 'edge', pixelDistance: d };
          }
        }
        return bestEdge;
      } catch {
        return null;
      }
    }

    return null;
  };

  return { vertices, segments, snap, vertexCount: vertices.length };
}

/** Empty index — used when no parcel layer is available (free-drag, no snapping). */
export function emptySnapIndex(): SnapIndex {
  return {
    vertices: [],
    segments: [],
    vertexCount: 0,
    snap: () => null,
  };
}
