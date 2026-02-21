import type maplibregl from 'maplibre-gl';

const DIM_SOURCE_ID = 'raster-dim-source';
const DIM_LAYER_ID = 'raster-dim-layer';

const ensureDimLayer = (map: maplibregl.Map, opacity: number) => {
  if (!map.isStyleLoaded()) return;

  if (!map.getSource(DIM_SOURCE_ID)) {
    map.addSource(DIM_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-180, -85],
            [180, -85],
            [180, 85],
            [-180, 85],
            [-180, -85],
          ]],
        },
        properties: {},
      },
    });
  }

  if (!map.getLayer(DIM_LAYER_ID)) {
    map.addLayer({
      id: DIM_LAYER_ID,
      type: 'fill',
      source: DIM_SOURCE_ID,
      paint: {
        'fill-color': 'rgba(0, 0, 0, 1)',
        'fill-opacity': opacity,
      },
    });
  } else {
    map.setPaintProperty(DIM_LAYER_ID, 'fill-opacity', opacity);
  }
};

export const registerRasterDim = (map: maplibregl.Map, dimOpacity: number): (() => void) => {
  const handler = () => ensureDimLayer(map, dimOpacity);
  handler();
  map.on('style.load', handler);
  map.on('load', handler);
  return () => {
    map.off('style.load', handler);
    map.off('load', handler);
    if (!map.isStyleLoaded()) return;
    if (map.getLayer(DIM_LAYER_ID)) map.removeLayer(DIM_LAYER_ID);
    if (map.getSource(DIM_SOURCE_ID)) map.removeSource(DIM_SOURCE_ID);
  };
};
