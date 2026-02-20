/**
 * Google Map Tiles Basemap Styles for MapLibre
 *
 * Uses the maplibre-google-maps plugin (by Traccar) to serve Google Map Tiles
 * as a MapLibre-compatible raster source via a custom `google://` protocol.
 *
 * Requirements:
 *   - "Map Tiles API" must be enabled in GCP Console
 *   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY must be set in .env.local
 *   - googleProtocol must be registered via maplibregl.addProtocol() before use
 */

import { createGoogleStyle } from 'maplibre-google-maps';
import type { StyleSpecification } from 'maplibre-gl';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export type GoogleBasemapType = 'roadmap' | 'satellite' | 'terrain' | 'hybrid';

/**
 * Returns a MapLibre StyleSpecification that renders Google Map Tiles.
 *
 * For 'hybrid' mode, we layer a satellite base with a road-label overlay.
 * All other modes use a single Google tile source.
 */
export function getGoogleBasemapStyle(type: GoogleBasemapType): StyleSpecification {
  if (type === 'hybrid') {
    // Google Map Tiles API doesn't support mapType "hybrid" directly.
    // Hybrid = satellite tiles + road/label overlay (layerRoadmap).
    return {
      version: 8,
      sources: {
        google: {
          type: 'raster',
          tiles: [`google://satellite/{z}/{x}/{y}?key=${GOOGLE_API_KEY}&layerType=layerRoadmap`],
          tileSize: 256,
          attribution: '&copy; Google Maps',
          maxzoom: 22,
        },
      },
      layers: [
        {
          id: 'google',
          type: 'raster',
          source: 'google',
        },
      ],
    };
  }

  if (type === 'terrain') {
    // Terrain requires layerTypes: ["layerRoadmap"] in the session request.
    // Pass layerType as a query param so the plugin includes it.
    return {
      version: 8,
      sources: {
        google: {
          type: 'raster',
          tiles: [`google://terrain/{z}/{x}/{y}?key=${GOOGLE_API_KEY}&layerType=layerRoadmap`],
          tileSize: 256,
          attribution: '&copy; Google Maps',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'google',
          type: 'raster',
          source: 'google',
        },
      ],
    };
  }

  // roadmap, satellite — single source
  return createGoogleStyle('google', type, GOOGLE_API_KEY) as StyleSpecification;
}

/**
 * Check whether the Google Maps API key is configured.
 */
export function isGoogleBasemapAvailable(): boolean {
  return GOOGLE_API_KEY.length > 0;
}
