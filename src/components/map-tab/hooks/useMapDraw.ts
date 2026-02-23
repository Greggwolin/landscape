/**
 * useMapDraw Hook
 *
 * Integrates mapbox-gl-draw with MapLibre for drawing points, lines, and polygons.
 * Provides live measurements during drawing and feature management.
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Map } from 'maplibre-gl';
import * as turf from '@turf/turf';

export type DrawMode =
  | 'simple_select'
  | 'draw_point'
  | 'draw_line_string'
  | 'draw_polygon'
  | 'direct_select';

export interface DrawnFeature {
  id: string;
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][];
  properties: {
    length_ft?: number;
    length_miles?: number;
    area_sqft?: number;
    area_acres?: number;
    perimeter_ft?: number;
  };
}

interface UseMapDrawOptions {
  onFeatureCreated?: (feature: DrawnFeature) => void;
  onFeatureUpdated?: (feature: DrawnFeature) => void;
  onFeatureDeleted?: (featureId: string) => void;
}

// Custom draw styles for dark theme
function getDrawStyles(): object[] {
  return [
    // Polygon fill - active
    {
      id: 'gl-draw-polygon-fill-active',
      type: 'fill',
      filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.3,
      },
    },
    // Polygon fill - inactive
    {
      id: 'gl-draw-polygon-fill-inactive',
      type: 'fill',
      filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.15,
      },
    },
    // Polygon stroke - active
    {
      id: 'gl-draw-polygon-stroke-active',
      type: 'line',
      filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
      },
    },
    // Polygon stroke - inactive
    {
      id: 'gl-draw-polygon-stroke-inactive',
      type: 'line',
      filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
      },
    },
    // Line - active
    {
      id: 'gl-draw-line-active',
      type: 'line',
      filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
      paint: {
        'line-color': '#f97316',
        'line-width': 4,
      },
    },
    // Line - inactive
    {
      id: 'gl-draw-line-inactive',
      type: 'line',
      filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString']],
      paint: {
        'line-color': '#f97316',
        'line-width': 3,
      },
    },
    // Point - active
    {
      id: 'gl-draw-point-active',
      type: 'circle',
      filter: [
        'all',
        ['==', 'active', 'true'],
        ['==', '$type', 'Point'],
        ['==', 'meta', 'feature'],
      ],
      paint: {
        'circle-radius': 8,
        'circle-color': '#22c55e',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    },
    // Point - inactive
    {
      id: 'gl-draw-point-inactive',
      type: 'circle',
      filter: [
        'all',
        ['==', 'active', 'false'],
        ['==', '$type', 'Point'],
        ['==', 'meta', 'feature'],
      ],
      paint: {
        'circle-radius': 6,
        'circle-color': '#22c55e',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    },
    // Vertex points (for editing)
    {
      id: 'gl-draw-vertex-active',
      type: 'circle',
      filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
      paint: {
        'circle-radius': 6,
        'circle-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#3b82f6',
      },
    },
    // Midpoint (for adding vertices)
    {
      id: 'gl-draw-midpoint',
      type: 'circle',
      filter: ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
      paint: {
        'circle-radius': 4,
        'circle-color': '#3b82f6',
      },
    },
  ];
}

// Calculate measurements for a feature
function calculateMeasurements(
  feature: GeoJSON.Feature
): Record<string, number> {
  const measurements: Record<string, number> = {};

  if (feature.geometry.type === 'LineString') {
    const coords = (feature.geometry as GeoJSON.LineString).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const length = turf.length(feature as turf.Feature<turf.LineString>, {
        units: 'feet',
      });
      measurements.length_ft = Math.round(length);
      measurements.length_miles = length / 5280;
    }
  }

  if (feature.geometry.type === 'Polygon') {
    const ring = (feature.geometry as GeoJSON.Polygon).coordinates?.[0];
    if (Array.isArray(ring) && ring.length >= 4) {
      const area = turf.area(feature as turf.Feature<turf.Polygon>); // square meters
      measurements.area_sqft = Math.round(area * 10.7639); // sqm to sqft
      measurements.area_acres = measurements.area_sqft / 43560;

      const perimeter = turf.length(
        turf.polygonToLine(feature as turf.Feature<turf.Polygon>),
        { units: 'feet' }
      );
      measurements.perimeter_ft = Math.round(perimeter);
    }
  }

  return measurements;
}

export function useMapDraw(map: Map | null, options: UseMapDrawOptions = {}) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [activeMode, setActiveMode] = useState<DrawMode>('simple_select');
  const [currentFeature, setCurrentFeature] = useState<DrawnFeature | null>(
    null
  );
  const [liveMeasurement, setLiveMeasurement] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Store callbacks in refs to avoid stale closures
  const onFeatureCreatedRef = useRef(options.onFeatureCreated);
  const onFeatureUpdatedRef = useRef(options.onFeatureUpdated);
  const onFeatureDeletedRef = useRef(options.onFeatureDeleted);

  useEffect(() => {
    onFeatureCreatedRef.current = options.onFeatureCreated;
    onFeatureUpdatedRef.current = options.onFeatureUpdated;
    onFeatureDeletedRef.current = options.onFeatureDeleted;
  }, [options.onFeatureCreated, options.onFeatureUpdated, options.onFeatureDeleted]);

  // Initialize draw control
  const initializeDraw = useCallback(() => {
    if (!map || drawRef.current) return;

     
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: getDrawStyles(),
    } as any);

    // Add control to map (mapbox-gl-draw works with maplibre)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.addControl(draw as any);
    drawRef.current = draw;

    // Event handlers
    const handleDrawCreate = (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0];
      if (!feature) return;

      const measurements = calculateMeasurements(feature);
      const drawnFeature: DrawnFeature = {
        id: feature.id as string,
        type: feature.geometry.type as 'Point' | 'LineString' | 'Polygon',
        coordinates: (feature.geometry as any).coordinates,
        properties: measurements,
      };

      setCurrentFeature(drawnFeature);
      setIsDrawing(false);
      onFeatureCreatedRef.current?.(drawnFeature);
    };

    const handleDrawUpdate = (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0];
      if (!feature) return;

      const measurements = calculateMeasurements(feature);
      const drawnFeature: DrawnFeature = {
        id: feature.id as string,
        type: feature.geometry.type as 'Point' | 'LineString' | 'Polygon',
        coordinates: (feature.geometry as any).coordinates,
        properties: measurements,
      };

      setCurrentFeature(drawnFeature);
      onFeatureUpdatedRef.current?.(drawnFeature);
    };

    const handleDrawDelete = (e: { features: GeoJSON.Feature[] }) => {
      e.features.forEach((feature) => {
        onFeatureDeletedRef.current?.(feature.id as string);
      });
      setCurrentFeature(null);
      setLiveMeasurement(null);
    };

    const handleModeChange = (e: { mode: string }) => {
      setActiveMode(e.mode as DrawMode);
      if (e.mode === 'simple_select') {
        setLiveMeasurement(null);
        setIsDrawing(false);
      }
    };

    const handleDrawRender = () => {
      if (!drawRef.current) return;

      const features = drawRef.current.getAll();
      if (features.features.length === 0) {
        setLiveMeasurement(null);
        return;
      }

      const feature = features.features[features.features.length - 1];
      const measurements = calculateMeasurements(feature);

      if (feature.geometry.type === 'LineString') {
        const coords = (feature.geometry as GeoJSON.LineString).coordinates;
        if (coords.length >= 2) {
          setLiveMeasurement(
            `${measurements.length_ft?.toLocaleString()} ft (${measurements.length_miles?.toFixed(2)} mi)`
          );
        }
      } else if (feature.geometry.type === 'Polygon') {
        const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
        if (coords.length >= 4) {
          setLiveMeasurement(
            `${measurements.area_acres?.toFixed(2)} acres (${measurements.area_sqft?.toLocaleString()} sq ft)`
          );
        }
      }
    };

    // Register event listeners
    map.on('draw.create', handleDrawCreate);
    map.on('draw.update', handleDrawUpdate);
    map.on('draw.delete', handleDrawDelete);
    map.on('draw.modechange', handleModeChange);
    map.on('draw.render', handleDrawRender);

    // Return cleanup function
    return () => {
      map.off('draw.create', handleDrawCreate);
      map.off('draw.update', handleDrawUpdate);
      map.off('draw.delete', handleDrawDelete);
      map.off('draw.modechange', handleModeChange);
      map.off('draw.render', handleDrawRender);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.removeControl(draw as any);
      drawRef.current = null;
    };
  }, [map]);

  // Mode setters
  const startDrawPoint = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('draw_point');
    setActiveMode('draw_point');
    setIsDrawing(true);
    setCurrentFeature(null);
  }, []);

  const startDrawLine = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('draw_line_string');
    setActiveMode('draw_line_string');
    setIsDrawing(true);
    setCurrentFeature(null);
    setLiveMeasurement(null);
  }, []);

  const startDrawPolygon = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('draw_polygon');
    setActiveMode('draw_polygon');
    setIsDrawing(true);
    setCurrentFeature(null);
    setLiveMeasurement(null);
  }, []);

  const startEdit = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('simple_select');
    setActiveMode('simple_select');
    setIsDrawing(false);
  }, []);

  const deleteSelected = useCallback(() => {
    if (!drawRef.current) return;
    const selected = drawRef.current.getSelectedIds();
    if (selected && selected.length > 0) {
      drawRef.current.delete(selected);
      setCurrentFeature(null);
    }
  }, []);

  const cancelDraw = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.changeMode('simple_select');
    drawRef.current.deleteAll();
    setCurrentFeature(null);
    setLiveMeasurement(null);
    setActiveMode('simple_select');
    setIsDrawing(false);
  }, []);

  const getFeatureGeoJSON = useCallback((): GeoJSON.Feature | null => {
    if (!currentFeature) return null;
    return {
      type: 'Feature',
      id: currentFeature.id,
      geometry: {
        type: currentFeature.type,
        coordinates: currentFeature.coordinates,
      } as GeoJSON.Geometry,
      properties: currentFeature.properties,
    };
  }, [currentFeature]);

  const clearCurrentFeature = useCallback(() => {
    if (currentFeature && drawRef.current) {
      drawRef.current.delete([currentFeature.id]);
    }
    setCurrentFeature(null);
    setLiveMeasurement(null);
  }, [currentFeature]);

  const loadFeatures = useCallback((features: GeoJSON.FeatureCollection) => {
    if (!drawRef.current) return;
    drawRef.current.set(features);
  }, []);

  const getSelectedIds = useCallback((): string[] => {
    if (!drawRef.current) return [];
    return drawRef.current.getSelectedIds() as string[];
  }, []);

  return {
    initializeDraw,
    activeMode,
    currentFeature,
    liveMeasurement,
    isDrawing,
    startDrawPoint,
    startDrawLine,
    startDrawPolygon,
    startEdit,
    deleteSelected,
    cancelDraw,
    getFeatureGeoJSON,
    clearCurrentFeature,
    loadFeatures,
    getSelectedIds,
  };
}
