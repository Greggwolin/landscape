/**
 * LocationMap Component
 *
 * MapLibre-based map with ring visualization and user points
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type { LocationMapProps, UserMapPoint } from './types';
import { RING_COLORS, POINT_CATEGORIES } from './constants';

// Miles to meters conversion
const MILES_TO_METERS = 1609.34;

export function LocationMap({
  center,
  rings,
  userPoints,
  layers,
  selectedRadius,
  onMapClick,
  onPointClick,
  isAddingPoint = false,
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Keep the callback ref up to date
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapStyle: maplibregl.StyleSpecification = layers.satellite
      ? {
          version: 8,
          sources: {
            satellite: {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              attribution: 'Tiles © Esri',
            },
            labels: {
              type: 'raster',
              tiles: [
                'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
            },
          },
          layers: [
            { id: 'satellite', type: 'raster', source: 'satellite' },
            { id: 'labels', type: 'raster', source: 'labels' },
          ],
        }
      : {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: center,
      zoom: 12,
      antialias: true,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Handle map clicks - use ref to get current callback
    map.current.on('click', (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update cursor for add point mode
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = isAddingPoint ? 'crosshair' : '';
  }, [isAddingPoint]);

  // Draw ring circles using Turf.js
  useEffect(() => {
    if (!map.current || !mapLoaded || !layers.rings) return;

    // Remove existing ring layers
    [1, 3, 5].forEach((radius) => {
      const fillId = `ring-${radius}-fill`;
      const strokeId = `ring-${radius}-stroke`;
      if (map.current?.getLayer(fillId)) map.current.removeLayer(fillId);
      if (map.current?.getLayer(strokeId)) map.current.removeLayer(strokeId);
      if (map.current?.getSource(`ring-${radius}`)) map.current.removeSource(`ring-${radius}`);
    });

    // Add ring circles
    rings.forEach((ring) => {
      const radius = ring.radius_miles;
      const colors = RING_COLORS[radius];
      if (!colors) return;

      // Create circle using Turf.js
      const circleGeoJSON = turf.circle(center, radius, {
        steps: 64,
        units: 'miles',
      });

      const sourceId = `ring-${radius}`;

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
          'fill-opacity': selectedRadius === radius ? 0.25 : 0.1,
        },
      });

      // Stroke layer
      map.current?.addLayer({
        id: `ring-${radius}-stroke`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': colors.stroke,
          'line-width': selectedRadius === radius ? 3 : 1.5,
          'line-opacity': selectedRadius === radius ? 1 : 0.7,
        },
      });
    });

    // Add center marker
    if (!map.current?.getSource('center-point')) {
      map.current?.addSource('center-point', {
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
        id: 'center-point',
        type: 'circle',
        source: 'center-point',
        paint: {
          'circle-radius': 8,
          'circle-color': '#fbbf24',
          'circle-stroke-color': '#000',
          'circle-stroke-width': 2,
        },
      });
    }
  }, [mapLoaded, rings, layers.rings, selectedRadius, center]);

  // Update user point markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!layers.userPoints) return;

    // Add new markers
    userPoints.forEach((point) => {
      const categoryConfig = POINT_CATEGORIES.find((c) => c.value === point.category);
      const color = categoryConfig?.color || '#3b82f6';

      const el = document.createElement('div');
      el.className = 'location-map-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;
      el.style.cursor = 'pointer';

      // Create popup
      const popup = new maplibregl.Popup({
        offset: [0, -24],
        closeButton: true,
        closeOnClick: true,
        className: 'location-map-popup',
      }).setHTML(`
        <div style="padding: 8px;">
          <strong style="color: ${color};">${point.label}</strong>
          ${point.notes ? `<p style="margin: 4px 0 0; font-size: 12px; color: #9ca3af;">${point.notes}</p>` : ''}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(point.coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPointClick?.(point);
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, userPoints, layers.userPoints, onPointClick]);

  // Toggle satellite layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const satelliteLayer = map.current.getLayer('satellite');
    if (satelliteLayer) {
      map.current.setLayoutProperty(
        'satellite',
        'visibility',
        layers.satellite ? 'visible' : 'none'
      );
    }
  }, [mapLoaded, layers.satellite]);

  // Resize map when container changes (e.g., flyout opens)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Trigger resize after a short delay to let layout settle
    const resizeTimeout = setTimeout(() => {
      map.current?.resize();
    }, 100);

    return () => clearTimeout(resizeTimeout);
  }, [mapLoaded]);

  return (
    <div className="location-map-container">
      <div ref={mapContainer} className="location-map" />
      {!mapLoaded && (
        <div className="location-map-loading">
          <div className="loading-spinner" />
          <span>Loading map...</span>
        </div>
      )}
    </div>
  );
}

export default LocationMap;
