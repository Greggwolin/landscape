/**
 * MapCanvas Component
 *
 * MapLibre GL JS map with layer rendering, draw controls, and feature display.
 */

'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type { MapCanvasProps, BasemapStyle } from './types';
import {
  ESRI_IMAGERY_URL,
  ESRI_TRANSPORTATION_URL,
  ESRI_BOUNDARIES_URL,
  OSM_STREETS_URL,
  RING_COLORS,
} from './constants';

// Expose map instance to parent via ref
export interface MapCanvasRef {
  getMap: () => maplibregl.Map | null;
  isLoaded: () => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map Style Generators
// ─────────────────────────────────────────────────────────────────────────────

function getMapStyle(basemap: BasemapStyle): maplibregl.StyleSpecification {
  switch (basemap) {
    case 'satellite':
      return {
        version: 8,
        sources: {
          'esri-imagery': {
            type: 'raster',
            tiles: [ESRI_IMAGERY_URL],
            tileSize: 256,
            attribution: 'Imagery © Esri',
          },
        },
        layers: [
          { id: 'esri-imagery', type: 'raster', source: 'esri-imagery' },
        ],
      };

    case 'hybrid':
      return {
        version: 8,
        sources: {
          'esri-imagery': {
            type: 'raster',
            tiles: [ESRI_IMAGERY_URL],
            tileSize: 256,
            attribution: 'Imagery © Esri',
          },
          'esri-transportation': {
            type: 'raster',
            tiles: [ESRI_TRANSPORTATION_URL],
            tileSize: 256,
          },
          'esri-boundaries': {
            type: 'raster',
            tiles: [ESRI_BOUNDARIES_URL],
            tileSize: 256,
          },
        },
        layers: [
          { id: 'esri-imagery', type: 'raster', source: 'esri-imagery' },
          { id: 'esri-transportation', type: 'raster', source: 'esri-transportation' },
          { id: 'esri-boundaries', type: 'raster', source: 'esri-boundaries' },
        ],
      };

    case 'streets':
    default:
      return {
        version: 8,
        sources: {
          'osm-streets': {
            type: 'raster',
            tiles: [OSM_STREETS_URL],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          { id: 'osm-streets', type: 'raster', source: 'osm-streets' },
        ],
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MapCanvas Component
// ─────────────────────────────────────────────────────────────────────────────

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(function MapCanvas(
  {
    center,
    zoom,
    basemap,
    layers,
    features,
    activeTool,
    selectedFeatureId,
    onMapClick,
    onFeatureClick,
    onViewStateChange,
  },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Expose map to parent component
  useImperativeHandle(ref, () => ({
    getMap: () => map.current,
    isLoaded: () => mapLoaded,
  }), [mapLoaded]);

  // Keep callbacks current with refs
  const onMapClickRef = useRef(onMapClick);
  const onFeatureClickRef = useRef(onFeatureClick);
  const onViewStateChangeRef = useRef(onViewStateChange);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onFeatureClickRef.current = onFeatureClick;
  }, [onFeatureClick]);

  useEffect(() => {
    onViewStateChangeRef.current = onViewStateChange;
  }, [onViewStateChange]);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize Map
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const style = getMapStyle(basemap);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style,
      center,
      zoom,
      antialias: true,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      // Trigger resize to ensure map fills container correctly
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    });

    // Handle map clicks
    map.current.on('click', (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    // Track view state changes
    map.current.on('moveend', () => {
      if (!map.current || !onViewStateChangeRef.current) return;
      const mapCenter = map.current.getCenter();
      const mapZoom = map.current.getZoom();
      onViewStateChangeRef.current({
        center: [mapCenter.lng, mapCenter.lat],
        zoom: mapZoom,
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run once on mount, using initial values
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Update Basemap Style
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const style = getMapStyle(basemap);
    map.current.setStyle(style);

    // Re-add data layers after style change
    map.current.once('style.load', () => {
      // Will be re-added by other effects
    });
  }, [basemap, mapLoaded]);

  // ─────────────────────────────────────────────────────────────────────────
  // Update Cursor for Active Tool
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current) return;

    const cursor = activeTool === 'point' || activeTool === 'line' || activeTool === 'polygon'
      ? 'crosshair'
      : activeTool === 'edit'
      ? 'move'
      : activeTool === 'delete'
      ? 'not-allowed'
      : '';

    map.current.getCanvas().style.cursor = cursor;
  }, [activeTool]);

  // ─────────────────────────────────────────────────────────────────────────
  // Draw Demo Rings (from location intel layers)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const demoRingsLayer = layers.groups
      .find((g) => g.id === 'location-intel')
      ?.layers.find((l) => l.id === 'demo-rings');

    if (!demoRingsLayer?.visible) {
      // Remove ring layers if hidden
      [1, 3, 5].forEach((radius) => {
        const fillId = `ring-${radius}-fill`;
        const strokeId = `ring-${radius}-stroke`;
        if (map.current?.getLayer(fillId)) map.current.removeLayer(fillId);
        if (map.current?.getLayer(strokeId)) map.current.removeLayer(strokeId);
        if (map.current?.getSource(`ring-${radius}`)) map.current.removeSource(`ring-${radius}`);
      });
      return;
    }

    // Add ring circles
    [1, 3, 5].forEach((radius) => {
      const colors = RING_COLORS[radius];
      if (!colors) return;

      const sourceId = `ring-${radius}`;

      // Skip if already exists
      if (map.current?.getSource(sourceId)) return;

      // Create circle using Turf.js
      const circleGeoJSON = turf.circle(center, radius, {
        steps: 64,
        units: 'miles',
      });

      map.current?.addSource(sourceId, {
        type: 'geojson',
        data: circleGeoJSON,
      });

      // Fill layer
      map.current?.addLayer({
        id: `ring-${radius}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': colors.stroke,
          'fill-opacity': 0.1,
        },
      });

      // Stroke layer
      map.current?.addLayer({
        id: `ring-${radius}-stroke`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': colors.stroke,
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });
    });

    // Add center marker
    const centerMarkerId = 'project-center';
    if (!map.current?.getSource(centerMarkerId)) {
      map.current?.addSource(centerMarkerId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: center,
          },
        },
      });

      map.current?.addLayer({
        id: centerMarkerId,
        type: 'circle',
        source: centerMarkerId,
        paint: {
          'circle-radius': 10,
          'circle-color': '#fbbf24',
          'circle-stroke-color': '#000',
          'circle-stroke-width': 2,
        },
      });
    }
  }, [mapLoaded, layers, center]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render User Features (drawn shapes)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const drawnShapesLayer = layers.groups
      .find((g) => g.id === 'annotations')
      ?.layers.find((l) => l.id === 'drawn-shapes');

    const sourceId = 'user-features';

    // Remove existing source/layers
    if (map.current.getLayer('user-features-fill')) {
      map.current.removeLayer('user-features-fill');
    }
    if (map.current.getLayer('user-features-line')) {
      map.current.removeLayer('user-features-line');
    }
    if (map.current.getLayer('user-features-point')) {
      map.current.removeLayer('user-features-point');
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    if (!drawnShapesLayer?.visible || features.length === 0) return;

    // Convert features to GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature',
        id: f.id,
        properties: {
          id: f.id,
          label: f.label,
          category: f.category,
          selected: f.id === selectedFeatureId,
        },
        geometry: f.geometry,
      })),
    };

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
    });

    // Add polygon fill layer
    map.current.addLayer({
      id: 'user-features-fill',
      type: 'fill',
      source: sourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': '#06b6d4',
        'fill-opacity': ['case', ['get', 'selected'], 0.4, 0.2],
      },
    });

    // Add line layer
    map.current.addLayer({
      id: 'user-features-line',
      type: 'line',
      source: sourceId,
      filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
      paint: {
        'line-color': '#06b6d4',
        'line-width': ['case', ['get', 'selected'], 3, 2],
      },
    });

    // Add point layer
    map.current.addLayer({
      id: 'user-features-point',
      type: 'circle',
      source: sourceId,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': ['case', ['get', 'selected'], 10, 8],
        'circle-color': '#06b6d4',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
      },
    });

    // Handle clicks on features
    map.current.on('click', 'user-features-fill', (e) => {
      if (e.features?.[0] && onFeatureClickRef.current) {
        const featureId = e.features[0].properties?.id;
        const feature = features.find((f) => f.id === featureId);
        if (feature) onFeatureClickRef.current(feature);
      }
    });

    map.current.on('click', 'user-features-point', (e) => {
      if (e.features?.[0] && onFeatureClickRef.current) {
        const featureId = e.features[0].properties?.id;
        const feature = features.find((f) => f.id === featureId);
        if (feature) onFeatureClickRef.current(feature);
      }
    });
  }, [mapLoaded, layers, features, selectedFeatureId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="map-canvas-container">
      <div ref={mapContainer} className="map-canvas" />

      {!mapLoaded && (
        <div className="map-canvas-loading">
          <div className="map-canvas-spinner" />
          <span>Loading map...</span>
        </div>
      )}
    </div>
  );
});

export default MapCanvas;
