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
import { registerGoogleProtocol } from '@/lib/maps/registerGoogleProtocol';
import { getGoogleBasemapStyle } from '@/lib/maps/googleBasemaps';
import { registerRasterDim } from '@/lib/maps/rasterDim';

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
  onRingClick,
  onPointClick,
  isAddingPoint = false,
  resizeToken = 0,
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  const onRingClickRef = useRef(onRingClick);
  const ringsRef = useRef(rings);
  const centerRef = useRef(center);
  const layersRef = useRef(layers);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const [blockGroupFeatures, setBlockGroupFeatures] = useState<GeoJSON.FeatureCollection | null>(null);

  // Keep the callback ref up to date
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onRingClickRef.current = onRingClick;
  }, [onRingClick]);

  useEffect(() => {
    ringsRef.current = rings;
  }, [rings]);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // Initialize map once; subsequent center/layer changes are handled by dedicated effects.
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    registerGoogleProtocol();
    const initialBasemap = layers.hybrid ? 'hybrid' : layers.satellite ? 'satellite' : 'roadmap';
    const initialStyle = getGoogleBasemapStyle(initialBasemap);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center: center,
      zoom: 12,
      antialias: true,
    });

    const cleanupRasterDim = registerRasterDim(map.current, 0.3);

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Handle map clicks - use ref to get current callback
    map.current.on('click', (e) => {
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (onRingClickRef.current && layersRef.current?.rings) {
        const ringSet = ringsRef.current;
        if (Array.isArray(ringSet) && ringSet.length > 0 && map.current) {
          const ringLayerIds = ringSet.map((ring) => `ring-${ring.radius_miles}-fill`);
          const hitFeatures = map.current.queryRenderedFeatures(e.point, { layers: ringLayerIds });
          if (hitFeatures.length > 0) {
            const hitLayerId = hitFeatures[0].layer.id;
            const match = hitLayerId.match(/ring-([\\d.]+)-fill/);
            const radiusValue = match ? Number(match[1]) : null;
            const clickedRing = radiusValue === null ? null : ringSet.find((ring) => ring.radius_miles === radiusValue);
            if (clickedRing) {
              onRingClickRef.current(clickedRing, lngLat);
              return;
            }
          }

          const point = turf.point(lngLat);
          const [centerLng, centerLat] = centerRef.current;
          const clickedRing = [...ringSet]
            .sort((a, b) => a.radius_miles - b.radius_miles)
            .find((ring) => {
              const circle = turf.circle([centerLng, centerLat], ring.radius_miles, {
                steps: 64,
                units: 'miles',
              });
              return turf.booleanPointInPolygon(point, circle);
            });

          if (clickedRing) {
            onRingClickRef.current(clickedRing, lngLat);
            return;
          }
        }
      }

      if (onMapClickRef.current) {
        onMapClickRef.current(lngLat);
      }
    });

    return () => {
      cleanupRasterDim();
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
  }, [mapLoaded, center, styleRevision]);

  // Draw ring circles using Turf.js
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    let ringCleanup: (() => void) | undefined;

    // Ensure style is loaded before adding sources/layers
    if (!map.current.isStyleLoaded()) {
      const styleLoadHandler = () => {
        if (map.current) {
          ringCleanup = updateRings();
        }
      };
      map.current.once('styledata', styleLoadHandler);
      return () => {
        map.current?.off('styledata', styleLoadHandler);
        ringCleanup?.();
      };
    }

    const cleanupHandlers = updateRings();

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
      const ringClickHandlers: Array<{
        id: string;
        click: (e: maplibregl.MapMouseEvent) => void;
        enter: () => void;
        leave: () => void;
      }> = [];

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

        // Make rings clickable for demographics popup
        const fillLayerId = `ring-${radius}-fill`;
        const handleClick = (e: maplibregl.MapMouseEvent) => {
          const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          if (onRingClickRef.current) {
            onRingClickRef.current(ring, lngLat);
            return;
          }
          if (onMapClickRef.current) {
            onMapClickRef.current(lngLat);
          }
        };
        const handleEnter = () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        };
        const handleLeave = () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = isAddingPoint ? 'crosshair' : '';
          }
        };

        map.current?.on('click', fillLayerId, handleClick);
        map.current?.on('mouseenter', fillLayerId, handleEnter);
        map.current?.on('mouseleave', fillLayerId, handleLeave);

        ringClickHandlers.push({
          id: fillLayerId,
          click: handleClick,
          enter: handleEnter,
          leave: handleLeave,
        });
      });

      return () => {
        ringClickHandlers.forEach(({ id, click, enter, leave }) => {
          if (!map.current) return;
          map.current.off('click', id, click);
          map.current.off('mouseenter', id, enter);
          map.current.off('mouseleave', id, leave);
        });
      };
    }
    return () => {
      cleanupHandlers?.();
    };
  }, [mapLoaded, rings, layers.rings, selectedRadius, center, styleRevision, isAddingPoint]);

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
  }, [mapLoaded, blockGroupFeatures, layers.blockGroups, styleRevision]);

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
        className: 'location-map-popup',
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
  }, [mapLoaded, userPoints, layers.userPoints, onPointClick, styleRevision]);

  // Toggle basemap: satellite / hybrid / roadmap
  const prevBasemapRef = useRef<string>(
    layers.hybrid ? 'hybrid' : layers.satellite ? 'satellite' : 'roadmap'
  );
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentBasemap = layers.hybrid ? 'hybrid' : layers.satellite ? 'satellite' : 'roadmap';
    if (currentBasemap === prevBasemapRef.current) return;
    prevBasemapRef.current = currentBasemap;

    const newStyle = getGoogleBasemapStyle(currentBasemap as 'hybrid' | 'satellite' | 'roadmap');
    map.current.setStyle(newStyle);

    // After the new style finishes loading, bump the revision counter
    // so that all custom-layer effects re-fire and re-add their data.
    const handleStyleLoad = () => {
      setStyleRevision((prev) => prev + 1);
    };
    map.current.once('style.load', handleStyleLoad);

    return () => {
      map.current?.off('style.load', handleStyleLoad);
    };
  }, [mapLoaded, layers.satellite, layers.hybrid]);

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
