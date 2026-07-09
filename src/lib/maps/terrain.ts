/**
 * Terrain / hillshade for MapLibre, fed by a free no-key global DEM.
 *
 * Adds a `raster-dem` source (AWS Terrain Tiles, Terrarium encoding by default),
 * a `hillshade` layer driven by it, and optional 3D terrain via `setTerrain`.
 * Everything is config-driven so the future shared map module can expose a
 * terrain option without hardcoding a source, encoding, or exaggeration.
 *
 * Survives basemap switches the same way `rasterDim` does: a `style.load`/`load`
 * handler re-asserts the source, hillshade layer, and terrain after every
 * `setStyle`, which otherwise wipes all sources and layers.
 *
 * No Landscape-specific imports — reusable as-is.
 */

import type maplibregl from 'maplibre-gl';

export interface TerrainConfig {
  /** DEM raster-dem source id. */
  demSourceId: string;
  /** Hillshade layer id. */
  hillshadeLayerId: string;
  /** DEM tile URL template. Default: AWS Terrain Tiles (no key, global). */
  demTiles: string;
  /** DEM elevation encoding. AWS Terrain Tiles use `terrarium`. */
  encoding: 'terrarium' | 'mapbox';
  tileSize: number;
  /** Max source zoom (AWS Terrain Tiles top out at 15). */
  maxzoom: number;
  /** Default vertical exaggeration for 3D terrain. Modest by design. */
  exaggeration: number;
  /** Camera pitch applied when 3D terrain is enabled. */
  pitchOnEnable: number;
  /** Hillshade paint — subtle by default so it reads over any basemap. */
  hillshadeExaggeration: number;
  hillshadeShadowColor: string;
  hillshadeHighlightColor: string;
  hillshadeAccentColor: string;
}

/**
 * AWS Terrain Tiles — public, no API key, global coverage, Terrarium-encoded.
 * https://registry.opendata.aws/terrain-tiles/
 */
export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  demSourceId: 'terrain-dem',
  hillshadeLayerId: 'terrain-hillshade',
  demTiles: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 15,
  exaggeration: 1.3,
  pitchOnEnable: 60,
  hillshadeExaggeration: 0.35,
  hillshadeShadowColor: '#5a5a5a',
  hillshadeHighlightColor: '#ffffff',
  hillshadeAccentColor: '#5a5a5a',
};

export interface TerrainController {
  /** Toggle the hillshade relief layer. */
  setHillshade(on: boolean): void;
  /** Toggle 3D terrain (mesh + pitch). Optional per-call exaggeration override. */
  setThreeD(on: boolean, exaggeration?: number): void;
  /** Remove handlers, layer, source, and terrain. */
  destroy(): void;
}

/**
 * Register terrain/hillshade on a map and return a controller.
 *
 * The DEM source and hillshade layer are only added when hillshade or 3D is
 * enabled, so a map with both off pays no DEM network cost. State is held in
 * closure and re-applied on every style load.
 */
export function registerTerrain(
  map: maplibregl.Map,
  partial: Partial<TerrainConfig> = {},
): TerrainController {
  const cfg: TerrainConfig = { ...DEFAULT_TERRAIN_CONFIG, ...partial };

  let hillshadeOn = false;
  let threeDOn = false;
  let exaggeration = cfg.exaggeration;

  const ensureSource = () => {
    if (!map.getSource(cfg.demSourceId)) {
      map.addSource(cfg.demSourceId, {
        type: 'raster-dem',
        tiles: [cfg.demTiles],
        encoding: cfg.encoding,
        tileSize: cfg.tileSize,
        maxzoom: cfg.maxzoom,
      });
    }
  };

  const ensureHillshade = () => {
    ensureSource();
    if (!map.getLayer(cfg.hillshadeLayerId)) {
      map.addLayer({
        id: cfg.hillshadeLayerId,
        type: 'hillshade',
        source: cfg.demSourceId,
        paint: {
          'hillshade-exaggeration': cfg.hillshadeExaggeration,
          'hillshade-shadow-color': cfg.hillshadeShadowColor,
          'hillshade-highlight-color': cfg.hillshadeHighlightColor,
          'hillshade-accent-color': cfg.hillshadeAccentColor,
        },
      });
    }
  };

  const removeHillshade = () => {
    if (map.getLayer(cfg.hillshadeLayerId)) map.removeLayer(cfg.hillshadeLayerId);
  };

  const applyTerrain = () => {
    ensureSource();
    map.setTerrain({ source: cfg.demSourceId, exaggeration });
  };

  const removeTerrain = () => {
    // setTerrain(null) clears the 3D mesh; the DEM source may still feed hillshade.
    map.setTerrain(null);
  };

  // Remove the DEM source once nothing references it, to drop its network cost.
  const cleanupSourceIfUnused = () => {
    if (hillshadeOn || threeDOn) return;
    if (map.getLayer(cfg.hillshadeLayerId)) return;
    if (map.getSource(cfg.demSourceId)) {
      try {
        map.removeSource(cfg.demSourceId);
      } catch {
        /* source still referenced (e.g. terrain mid-teardown) — leave it */
      }
    }
  };

  /** Re-assert the desired state against the current (possibly new) style. */
  const apply = () => {
    if (!map.isStyleLoaded()) return;
    if (hillshadeOn) ensureHillshade();
    else removeHillshade();
    if (threeDOn) applyTerrain();
    else removeTerrain();
    cleanupSourceIfUnused();
  };

  // Re-apply after every basemap switch (setStyle wipes sources + layers).
  const handler = () => apply();
  map.on('style.load', handler);
  map.on('load', handler);
  apply();

  return {
    setHillshade(on: boolean) {
      if (hillshadeOn === on) return;
      hillshadeOn = on;
      apply();
    },
    setThreeD(on: boolean, exag?: number) {
      const nextExag = typeof exag === 'number' ? exag : cfg.exaggeration;
      if (threeDOn === on && exaggeration === nextExag) return;
      const wasOn = threeDOn;
      threeDOn = on;
      exaggeration = nextExag;
      apply();
      // Ease the camera in/out of pitch only on an actual on/off transition, so
      // repeated exaggeration tweaks don't yank the view around.
      if (on && !wasOn) {
        map.easeTo({ pitch: cfg.pitchOnEnable, duration: 600 });
      } else if (!on && wasOn) {
        map.easeTo({ pitch: 0, duration: 600 });
      }
    },
    destroy() {
      map.off('style.load', handler);
      map.off('load', handler);
      if (!map.isStyleLoaded()) return;
      removeTerrain();
      removeHillshade();
      if (map.getSource(cfg.demSourceId)) {
        try {
          map.removeSource(cfg.demSourceId);
        } catch {
          /* ignore */
        }
      }
    },
  };
}
