/**
 * LocationMap Component
 *
 * MapLibre-based map with ring visualization and user points
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type { LocationMapProps } from './types';
import { RING_COLORS, POINT_CATEGORIES } from './constants';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const CENTER_SOURCE_ID = 'center-point';
const BLOCK_GROUP_SOURCE_ID = 'location-intel-block-groups';
const BLOCK_GROUP_FILL_LAYER_ID = 'location-intel-block-groups-fill';
const BLOCK_GROUP_LINE_LAYER_ID = 'location-intel-block-groups-line';

export function LocationMap({
  center,
  rings,
  userPoints,
  layers,
  selectedRadius,
  onMapClick,
  onPointClick,
  isAddingPoint = false,
  resizeToken = 0,
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [blockGroupFeatures, setBlockGroupFeatures] = useState<GeoJSON.FeatureCollection | null>(null);

  // Keep the callback ref up to date
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize map once; subsequent center/layer changes are handled by dedicated effects.
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapStyle: maplibregl.StyleSpecification = {
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
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          layout: { visibility: layers.satellite ? 'none' : 'visible' },
        },
        {
          id: 'satellite',
          type: 'raster',
          source: 'satellite',
          layout: { visibility: layers.satellite ? 'visible' : 'none' },
        },
        {
          id: 'labels',
          type: 'raster',
          source: 'labels',
          layout: { visibility: layers.satellite ? 'visible' : 'none' },
        },
      ],
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

  // Keep map centered on active project location
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.easeTo({ center, duration: 250 });
  }, [mapLoaded, center]);

  // Update cursor for add point mode
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = isAddingPoint ? 'crosshair' : '';
  }, [isAddingPoint]);

  // Keep center marker in sync
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Ensure style is loaded before adding sources/layers
    if (!map.current.isStyleLoaded()) {
      const styleLoadHandler = () => {
        if (map.current) {
          addCenterMarker();
        }
      };
      map.current.once('styledata', styleLoadHandler);
      return () => {
        map.current?.off('styledata', styleLoadHandler);
      };
    }

    addCenterMarker();

    function addCenterMarker() {
      if (!map.current) return;

      const centerPointData = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: center,
        },
      } as GeoJSON.Feature;

      const existingSource = map.current.getSource(CENTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(centerPointData);
        return;
      }

      map.current.addSource(CENTER_SOURCE_ID, {
        type: 'geojson',
        data: centerPointData,
      });

      map.current.addLayer({
        id: CENTER_SOURCE_ID,
        type: 'circle',
        source: CENTER_SOURCE_ID,
        paint: {
          'circle-radius': 8,
          'circle-color': '#fbbf24',
          'circle-stroke-color': '#000',
          'circle-stroke-width': 2,
        },
      });
    }
  }, [mapLoaded, center]);

  // Draw ring circles using Turf.js
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Ensure style is loaded before adding sources/layers
    if (!map.current.isStyleLoaded()) {
      const styleLoadHandler = () => {
        if (map.current) {
          updateRings();
        }
      };
      map.current.once('styledata', styleLoadHandler);
      return () => {
        map.current?.off('styledata', styleLoadHandler);
      };
    }

    updateRings();

    function updateRings() {
      if (!map.current) return;

      // Remove existing ring layers
      [1, 3, 5].forEach((radius) => {
        const fillId = `ring-${radius}-fill`;
        const whiteStrokeId = `ring-${radius}-stroke-white`;
        const strokeId = `ring-${radius}-stroke`;
        if (map.current?.getLayer(fillId)) map.current.removeLayer(fillId);
        if (map.current?.getLayer(whiteStrokeId)) map.current.removeLayer(whiteStrokeId);
        if (map.current?.getLayer(strokeId)) map.current.removeLayer(strokeId);
        if (map.current?.getSource(`ring-${radius}`)) map.current.removeSource(`ring-${radius}`);
      });

      if (!layers.rings) return;

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
            'fill-opacity': selectedRadius === radius ? 0.42 : 0.26,
          },
        });

        const ringLineWidth = selectedRadius === radius ? 3.4 : 1.9;

        // White halo stroke for stronger contrast on aerial imagery
        map.current?.addLayer({
          id: `ring-${radius}-stroke-white`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ringLineWidth + 2,
            'line-opacity': 1,
          },
        });

        // Stroke layer
        map.current?.addLayer({
          id: `ring-${radius}-stroke`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#000000',
            'line-width': ringLineWidth,
            'line-opacity': 1,
          },
        });
      });
    }
  }, [mapLoaded, rings, layers.rings, selectedRadius, center]);

  // Fetch nearby block-group boundaries
  useEffect(() => {
    if (!mapLoaded) return;

    const controller = new AbortController();

    const fetchBlockGroups = async () => {
      try {
        const response = await fetch(
          `${DJANGO_API_URL}/api/v1/location-intelligence/block-groups/?lat=${center[1]}&lon=${center[0]}&radius=5`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          setBlockGroupFeatures({ type: 'FeatureCollection', features: [] });
          return;
        }

        const payload = await response.json();
        if (payload?.type === 'FeatureCollection' && Array.isArray(payload.features)) {
          setBlockGroupFeatures(payload as GeoJSON.FeatureCollection);
        } else {
          setBlockGroupFeatures({ type: 'FeatureCollection', features: [] });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('Failed to fetch block group boundaries:', error);
          setBlockGroupFeatures({ type: 'FeatureCollection', features: [] });
        }
      }
    };

    void fetchBlockGroups();

    return () => controller.abort();
  }, [mapLoaded, center]);

  // Render block-group boundaries on map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Ensure style is loaded before adding sources/layers
    if (!map.current.isStyleLoaded()) {
      const styleLoadHandler = () => {
        if (map.current) {
          updateBlockGroups();
        }
      };
      map.current.once('styledata', styleLoadHandler);
      return () => {
        map.current?.off('styledata', styleLoadHandler);
      };
    }

    updateBlockGroups();

    function updateBlockGroups() {
      if (!map.current) return;

      if (map.current.getLayer(BLOCK_GROUP_FILL_LAYER_ID)) {
        map.current.removeLayer(BLOCK_GROUP_FILL_LAYER_ID);
      }
      if (map.current.getLayer(BLOCK_GROUP_LINE_LAYER_ID)) {
        map.current.removeLayer(BLOCK_GROUP_LINE_LAYER_ID);
      }
      if (map.current.getSource(BLOCK_GROUP_SOURCE_ID)) {
        map.current.removeSource(BLOCK_GROUP_SOURCE_ID);
      }

      if (!blockGroupFeatures || !Array.isArray(blockGroupFeatures.features) || blockGroupFeatures.features.length === 0) {
        return;
      }

      map.current.addSource(BLOCK_GROUP_SOURCE_ID, {
        type: 'geojson',
        data: blockGroupFeatures,
      });

      map.current.addLayer({
        id: BLOCK_GROUP_FILL_LAYER_ID,
        type: 'fill',
        source: BLOCK_GROUP_SOURCE_ID,
        paint: {
          'fill-color': '#4B5563',
          'fill-opacity': 0.12,
        },
        layout: {
          visibility: layers.blockGroups ? 'visible' : 'none',
        },
      });

      map.current.addLayer({
        id: BLOCK_GROUP_LINE_LAYER_ID,
        type: 'line',
        source: BLOCK_GROUP_SOURCE_ID,
        paint: {
          'line-color': '#6B7280',
          'line-width': 0.8,
          'line-opacity': 0.75,
        },
        layout: {
          visibility: layers.blockGroups ? 'visible' : 'none',
        },
      });
    }
  }, [mapLoaded, blockGroupFeatures, layers.blockGroups]);

  // Update overlay markers (rental comparables)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!layers.userPoints) return;

    // Add markers
    userPoints.forEach((point) => {
      const categoryConfig = POINT_CATEGORIES.find((c) => c.value === point.category);
      const color = point.markerColor || categoryConfig?.color || 'var(--cui-primary)';

      const el = document.createElement('div');
      el.className = 'location-map-marker map-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.innerHTML = `
        <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}" stroke="#000000" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;
      el.style.cursor = 'pointer';

      // Create popup
      const popupHtml = point.popupHtml || `
        <div style="padding: 8px;">
          <strong style="color: ${color};">${point.label}</strong>
          ${point.notes ? `<p style="margin: 4px 0 0; font-size: 12px; color: var(--cui-secondary-color);">${point.notes}</p>` : ''}
        </div>
      `;
      const popup = new maplibregl.Popup({
        offset: [0, -30],
        closeButton: true,
        closeOnClick: true,
        className: 'map-marker-popup',
      }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el }).setLngLat(point.coordinates);
      marker.setPopup(popup);
      marker.addTo(map.current!);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (marker.getPopup()) {
          marker.togglePopup();
        }
        onPointClick?.(point);
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, userPoints, layers.userPoints, onPointClick]);

  // Toggle satellite layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const satelliteLayer = map.current.getLayer('satellite');
    const labelsLayer = map.current.getLayer('labels');
    const osmLayer = map.current.getLayer('osm');

    if (satelliteLayer && labelsLayer && osmLayer) {
      map.current.setLayoutProperty(
        'satellite',
        'visibility',
        layers.satellite ? 'visible' : 'none'
      );
      map.current.setLayoutProperty(
        'labels',
        'visibility',
        layers.satellite ? 'visible' : 'none'
      );
      map.current.setLayoutProperty(
        'osm',
        'visibility',
        layers.satellite ? 'none' : 'visible'
      );
    }
  }, [mapLoaded, layers.satellite]);

  // Resize map when the container dimensions change (e.g., accordion expand)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const forceResize = () => {
      map.current?.resize();
      map.current?.triggerRepaint();
    };

    // Trigger initial resize after a short delay to let layout settle
    const resizeTimeout = setTimeout(forceResize, 60);

    // Re-run resize a few times because some collapsible layouts report transient sizes.
    const followUpTimeout = setTimeout(forceResize, 240);
    const finalTimeout = setTimeout(forceResize, 520);

    let observer: ResizeObserver | null = null;
    if (mapContainer.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        forceResize();
      });
      observer.observe(mapContainer.current);
    }

    return () => {
      clearTimeout(resizeTimeout);
      clearTimeout(followUpTimeout);
      clearTimeout(finalTimeout);
      observer?.disconnect();
    };
  }, [mapLoaded, resizeToken]);

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
