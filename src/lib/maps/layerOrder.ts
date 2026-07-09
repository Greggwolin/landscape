/**
 * Legend → map draw-order application.
 *
 * The legend's row order (top of legend = drawn on top) is the source of truth
 * for how the data layers stack on the MapLibre canvas. This module owns the
 * mapping from a legend layer id to the actual MapLibre style-layer ids it
 * controls, plus a pure function that restacks the map to match a legend order.
 *
 * Kept free of any Landscape-specific imports so the future shared map module
 * can reuse it as-is: the only input is a MapLibre map + a list of legend ids.
 */

import type maplibregl from 'maplibre-gl';

/**
 * Describes which MapLibre style layers a single legend row governs.
 *
 * `prefixes` are matched against live style-layer ids with `startsWith`, which
 * keeps the registry resilient to dynamically-suffixed ids (e.g. the demo-ring
 * layers `ring-1-fill` / `ring-3-stroke` created per radius).
 */
export interface ReorderableLayerDef {
  /** Matches `LayerItem.id` in the legend model. */
  legendId: string;
  /** Style-layer id prefixes this legend row controls. */
  prefixes: string[];
  /**
   * True when the legend row is backed only by `maplibregl.Marker` DOM elements
   * (rent comps, recent sales, competitors). Those float above the canvas in DOM
   * order and cannot be restacked via `map.moveLayer`, so reordering them has no
   * visual effect on the canvas — we skip them rather than pretend otherwise.
   */
  markerOnly?: boolean;
}

/**
 * The reorderable data layers, keyed by legend id. Order here is irrelevant —
 * the live legend order drives stacking; this only declares the id mapping.
 *
 * Style-layer id prefixes mirror the ids MapCanvas assigns when it adds each
 * layer (e.g. `project-boundary-fill`, `tax-parcels-line`, `user-features-*`).
 */
export const REORDERABLE_LAYERS: ReorderableLayerDef[] = [
  { legendId: 'site-boundary', prefixes: ['project-boundary', 'project-location-point'] },
  { legendId: 'tax-parcels', prefixes: ['tax-parcels'] },
  { legendId: 'plan-parcels', prefixes: ['plan-parcels'] },
  { legendId: 'demo-rings', prefixes: ['ring-'] },
  { legendId: 'sale-comps', prefixes: ['sale-comps'] },
  { legendId: 'drawn-shapes', prefixes: ['user-features'] },
  // Marker-backed rows — declared so callers can detect them, but not restackable.
  { legendId: 'rent-comps', prefixes: [], markerOnly: true },
  { legendId: 'recent-sales', prefixes: [], markerOnly: true },
  { legendId: 'competitive-projects', prefixes: [], markerOnly: true },
];

const DEF_BY_LEGEND: Map<string, ReorderableLayerDef> = new Map(
  REORDERABLE_LAYERS.map((d) => [d.legendId, d]),
);

/** True if this legend row can actually be restacked on the canvas. */
export function isRestackable(legendId: string): boolean {
  const def = DEF_BY_LEGEND.get(legendId);
  return Boolean(def && !def.markerOnly && def.prefixes.length > 0);
}

/**
 * Restack the MapLibre style layers so their draw order matches the legend.
 *
 * @param map              a loaded MapLibre map
 * @param orderedLegendIds legend layer ids, TOP-of-legend first (drawn on top)
 *
 * Implementation: reorder the governed data layers *in place*, beneath whatever
 * currently sits above them, so foreign layers keep their positions. Anything
 * above the data block (e.g. a site-plan drape that MapTab pins on top) stays
 * above; the basemap and hillshade below stay below. Within a single legend row
 * the layers keep their existing relative order (e.g. line stays above fill).
 */
export function applyLayerOrder(map: maplibregl.Map, orderedLegendIds: string[]): void {
  if (!map || !map.isStyleLoaded()) return;

  const style = map.getStyle();
  const liveIds = style?.layers?.map((l) => l.id) ?? [];
  if (liveIds.length === 0) return;

  // Governed layer ids that actually exist, in the desired BOTTOM→TOP order.
  // Legend is top-first, so iterate it in reverse; within a row keep the layers'
  // existing relative order (fill before line, etc.).
  const desiredBottomToTop: string[] = [];
  for (let i = orderedLegendIds.length - 1; i >= 0; i--) {
    const def = DEF_BY_LEGEND.get(orderedLegendIds[i]);
    if (!def || def.markerOnly || def.prefixes.length === 0) continue;
    for (const id of liveIds) {
      if (def.prefixes.some((prefix) => id.startsWith(prefix))) desiredBottomToTop.push(id);
    }
  }
  if (desiredBottomToTop.length === 0) return;

  // Ceiling = the layer directly above the current topmost governed layer. The
  // governed layers are re-inserted just beneath it (moveLayer's beforeId), so a
  // drape or any other layer sitting above the data block is never covered.
  const governed = new Set(desiredBottomToTop);
  let topGovernedIdx = -1;
  for (let i = liveIds.length - 1; i >= 0; i--) {
    if (governed.has(liveIds[i])) {
      topGovernedIdx = i;
      break;
    }
  }
  const ceilingId =
    topGovernedIdx >= 0 && topGovernedIdx < liveIds.length - 1
      ? liveIds[topGovernedIdx + 1]
      : undefined;

  // Insert bottom→top before the ceiling: each successive insert lands just
  // beneath the ceiling, pushing earlier ones down, yielding the desired order.
  for (const id of desiredBottomToTop) {
    if (map.getLayer(id)) map.moveLayer(id, ceilingId);
  }
}

/**
 * Flatten a legend model into the top-first list of legend ids that
 * `applyLayerOrder` consumes. Group order is preserved as-is (groups are not
 * reordered), and within each group the array order is the draw order.
 */
export function flattenLegendOrder(
  groups: { layers: { id: string }[] }[],
): string[] {
  return groups.flatMap((g) => g.layers.map((l) => l.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence (optional) — remember a per-context layer order across reloads.
//
// Storage-agnostic in spirit but backed by localStorage here; the caller owns
// the key (Landscape uses `mapLayerOrder:<projectId>`). SSR-safe: no-ops when
// `window` is absent. Shape stored: `{ [groupId]: string[] }` (ordered ids).
// ─────────────────────────────────────────────────────────────────────────────

export type StoredLayerOrder = Record<string, string[]>;

/** Read a saved order, or null if none/unavailable/corrupt. */
export function readStoredLayerOrder(storageKey: string): StoredLayerOrder | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredLayerOrder) : null;
  } catch {
    return null;
  }
}

/** Persist the current per-group layer order. Silently no-ops on failure
 *  (private mode / quota / disabled storage). */
export function writeStoredLayerOrder(
  storageKey: string,
  groups: { id: string; layers: { id: string }[] }[],
): void {
  if (typeof window === 'undefined') return;
  try {
    const order: StoredLayerOrder = {};
    for (const g of groups) order[g.id] = g.layers.map((l) => l.id);
    window.localStorage.setItem(storageKey, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

/**
 * Reorder each group's `layers` to match a stored order. Ids present in storage
 * are placed first in the stored sequence; ids not in storage (newly-added
 * defaults) keep their default order appended after; stored ids no longer
 * present are ignored. Returns a new array; groups without a stored entry are
 * returned unchanged.
 */
export function applyStoredLayerOrder<
  G extends { id: string; layers: L[] },
  L extends { id: string },
>(groups: G[], stored: StoredLayerOrder | null): G[] {
  if (!stored) return groups;
  return groups.map((g) => {
    const wanted = stored[g.id];
    if (!wanted || wanted.length === 0) return g;
    const byId = new Map(g.layers.map((l) => [l.id, l]));
    const ordered: L[] = [];
    for (const id of wanted) {
      const layer = byId.get(id);
      if (layer) {
        ordered.push(layer);
        byId.delete(id);
      }
    }
    // Append any layers not named in the stored order, in their default order.
    for (const layer of g.layers) {
      if (byId.has(layer.id)) ordered.push(layer);
    }
    return { ...g, layers: ordered };
  });
}
