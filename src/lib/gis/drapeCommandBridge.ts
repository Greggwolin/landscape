/**
 * drapeCommandBridge — late-delivery latch + helpers for the Landscaper drape tool
 * (SS16, LSCMD-SS-DRAPE-TOOL-WIRE). Sibling of planExtractBridge: the chat panel
 * (CenterChatPanel, in the outer /w/ layout) latches a drape command and fires a live
 * CustomEvent; MapTab (mounts only on /w/projects/[id]/map) drains the latch on mount
 * and/or handles the live event, then drives the shipped SS14 drape handlers. Whoever
 * consumes first wins (take() nulls the latch), so the command never runs twice.
 *
 * The command shape mirrors the `control_map_overlay` tool's `overlay_command` return.
 */

import type { Corners } from './imageOverlay';

export type DrapeAction =
  | 'drape' | 'fit' | 'set_opacity' | 'scale' | 'rotate'
  | 'set_warp_mode' | 'nudge' | 'lock' | 'unlock' | 'save';

export type DrapeTarget = 'selected_parcels' | 'drawn_polygon' | 'auto';

export interface DrapeCommandParams {
  source_uri?: string;
  source_doc_id?: number | null;
  source_page?: number | null;
  fit?: boolean;
  opacity?: number;
  scale?: number;
  scale_delta?: number;
  rotation_deg?: number;
  rotation_delta?: number;
  warp_mode?: 'quad' | 'tps';
  direction?: string;
  amount?: number;
  locked?: boolean;
}

export interface DrapeCommand {
  action: DrapeAction;
  target?: DrapeTarget;
  params?: DrapeCommandParams;
}

let pending: DrapeCommand | null = null;

export function setPendingDrapeCommand(next: DrapeCommand | null): void {
  pending = next;
}

/** Read and clear the pending command (so it is acted on exactly once). */
export function takePendingDrapeCommand(): DrapeCommand | null {
  const c = pending;
  pending = null;
  return c;
}

/** A minimal geometry carrier fitCornersToGeometry can bbox (it recurses `coordinates`). */
export interface TargetGeometry {
  coordinates: unknown;
}

/**
 * Resolve a drape/fit target from live map state to a geometry whose extent the drape
 * can be fitted to (SS16). 'selected_parcels' → the selected parcels' geometries;
 * 'drawn_polygon' → the drawn polygon; 'auto' → selected parcels if any, else the drawn
 * polygon. Returns null when nothing is available (caller falls back to free drape/pin).
 *
 * Pure — unit-tested. Wrapping the parcels' coordinates in one `{coordinates: [...]}`
 * works because fitCornersToGeometry walks arbitrarily-nested coordinate arrays.
 */
export function resolveDrapeTargetGeometry(
  target: DrapeTarget | undefined,
  sources: {
    selectedParcelGeoms: Array<{ coordinates?: unknown } | null | undefined>;
    drawnPolygon: { coordinates?: unknown } | null | undefined;
  }
): TargetGeometry | null {
  const parcels = (sources.selectedParcelGeoms ?? []).filter(
    (g): g is { coordinates: unknown } => !!g && g.coordinates != null
  );
  const drawn = sources.drawnPolygon;
  const wrapParcels = (): TargetGeometry | null =>
    parcels.length ? { coordinates: parcels.map((g) => g.coordinates) } : null;
  const wrapDrawn = (): TargetGeometry | null =>
    drawn && drawn.coordinates != null ? { coordinates: drawn.coordinates } : null;

  if (target === 'selected_parcels') return wrapParcels();
  if (target === 'drawn_polygon') return wrapDrawn();
  return wrapParcels() ?? wrapDrawn(); // 'auto' / undefined
}

/**
 * Translate four corners by a fraction of their own extent in a compass/screen
 * direction (SS16 "nudge it east"). amount defaults to 0.1 (10% of the extent).
 * Pure — unit-tested.
 */
export function nudgeCorners(
  corners: Corners,
  direction: string,
  amount = 0.1
): Corners {
  const lngs = corners.map((c) => c[0]);
  const lats = corners.map((c) => c[1]);
  const w = Math.max(...lngs) - Math.min(...lngs);
  const h = Math.max(...lats) - Math.min(...lats);
  let dLng = 0;
  let dLat = 0;
  const d = direction.toLowerCase();
  if (d === 'east' || d === 'right') dLng = w * amount;
  else if (d === 'west' || d === 'left') dLng = -w * amount;
  else if (d === 'north' || d === 'up') dLat = h * amount;
  else if (d === 'south' || d === 'down') dLat = -h * amount;
  return corners.map(([lng, lat]) => [lng + dLng, lat + dLat]) as Corners;
}
