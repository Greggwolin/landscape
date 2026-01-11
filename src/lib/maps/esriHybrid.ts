import type { StyleSpecification } from 'maplibre-gl';

const ESRI_IMAGERY_TILES =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_TRANSPORTATION_TILES =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
const ESRI_BOUNDARIES_TILES =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export const getEsriHybridStyle = (): StyleSpecification => ({
  version: 8,
  sources: {
    'esri-world-imagery': {
      type: 'raster',
      tiles: [ESRI_IMAGERY_TILES],
      tileSize: 256,
      attribution: 'Imagery © Esri'
    },
    'esri-world-transportation': {
      type: 'raster',
      tiles: [ESRI_TRANSPORTATION_TILES],
      tileSize: 256
    },
    'esri-world-boundaries': {
      type: 'raster',
      tiles: [ESRI_BOUNDARIES_TILES],
      tileSize: 256
    }
  },
  layers: [
    {
      id: 'esri-imagery',
      type: 'raster',
      source: 'esri-world-imagery',
      minzoom: 0,
      maxzoom: 22
    },
    {
      id: 'esri-transportation',
      type: 'raster',
      source: 'esri-world-transportation',
      minzoom: 0,
      maxzoom: 22
    },
    {
      id: 'esri-boundaries',
      type: 'raster',
      source: 'esri-world-boundaries',
      minzoom: 0,
      maxzoom: 22
    }
  ]
});
