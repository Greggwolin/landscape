/**
 * Registers the Google Map Tiles protocol handler with MapLibre.
 *
 * Call this once at the application level before any map component mounts.
 * Safe to call multiple times — subsequent calls are no-ops.
 */

import maplibregl from 'maplibre-gl';
import { googleProtocol } from 'maplibre-google-maps';

let registered = false;

export function registerGoogleProtocol(): void {
  if (registered) return;
  maplibregl.addProtocol('google', googleProtocol);
  registered = true;
}
