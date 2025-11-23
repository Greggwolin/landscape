/**
 * MapOblique Component
 *
 * Reusable MapLibre GL JS wrapper with oblique 3D view and building extrusions
 */

'use client';

import React, { useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const METERS_PER_STORY = 3.2;

export type ExtrusionSource = {
  id: string;
  data: GeoJSON.FeatureCollection;
  color?: string; // default #3399ff
  heightExpr?: unknown; // optional override for height expression
};

export interface MarkerData {
  id: string;
  coordinates: [number, number];
  color?: string;
  label?: string;
  popup?: string; // HTML content for popup
  tooltip?: string; // alias for popup
  variant?: 'pin' | 'dot';
  isActive?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
}

export interface MapObliqueProps {
  center: [number, number];
  zoom?: number;
  pitch?: number; // default 60
  bearing?: number; // default 30
  styleUrl: string; // from env/config
  extrusions?: ExtrusionSource[]; // ordered layers (subject first)
  lines?: { id: string; data: GeoJSON.FeatureCollection; color?: string; width?: number }[];
  markers?: MarkerData[]; // Simple markers instead of extrusions
  onFeatureClick?: (featureId?: string) => void;
  showExtrusions?: boolean; // Toggle between 3D buildings and flat markers (default true)
}

export interface MapObliqueRef {
  flyToSubject: (center?: [number, number], zoom?: number) => void;
  setBearing: (bearing: number) => void;
  setPitch: (pitch: number) => void;
  getBearing: () => number;
  getPitch: () => number;
  getZoom: () => number; // Returns current map zoom level
  fitBounds: (bounds: [[number, number], [number, number]], options?: { padding?: number; pitch?: number; bearing?: number }) => void;
}

const buildHeightExpr = (featureColor?: string) => {
  return {
    color: featureColor ?? '#3399ff',
    expr: [
      'case',
      ['has', 'height'],
      ['to-number', ['get', 'height']],
      [
        '*',
        METERS_PER_STORY,
        ['coalesce', ['get', 'stories'], ['get', 'defaultStories'], 3]
      ]
    ] as maplibregl.ExpressionSpecification
  };
};

export const MapOblique = forwardRef<MapObliqueRef, MapObliqueProps>(
  function MapOblique(
    {
      center,
      zoom = 14,
      pitch = 20,
      bearing = 0,
      styleUrl,
      extrusions = [],
      lines = [],
      markers = [],
      onFeatureClick,
      showExtrusions = true
    },
    ref
  ) {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        flyToSubject: (c = center, z = zoom) =>
          mapRef.current?.flyTo({ center: c, zoom: z, essential: true }),
        setBearing: (b: number) => mapRef.current?.setBearing(b),
        setPitch: (p: number) => mapRef.current?.setPitch(p),
        getBearing: () => mapRef.current?.getBearing() ?? 0,
        getPitch: () => mapRef.current?.getPitch() ?? 0,
        getZoom: () => mapRef.current?.getZoom() ?? 13,
        fitBounds: (bounds: [[number, number], [number, number]], options?: { padding?: number; pitch?: number; bearing?: number }) => {
          if (mapRef.current) {
            mapRef.current.fitBounds(bounds, {
              padding: options?.padding ?? 50,
              pitch: options?.pitch ?? pitch,
              bearing: options?.bearing ?? bearing,
              essential: true
            });
          }
        }
      }),
      [center, zoom, pitch, bearing]
    );

    // Main effect: Create map once
    // Only recreate if styleUrl changes or component unmounts
    useEffect(() => {
      if (!containerRef.current) return;

      // Check if styleUrl is a full URL (MapTiler) or shorthand (aerial)
      let mapStyle: string | maplibregl.StyleSpecification;

      if (styleUrl.startsWith('http://') || styleUrl.startsWith('https://')) {
        // Use the URL directly (e.g., MapTiler)
        mapStyle = styleUrl;
      } else if (styleUrl === 'aerial') {
        // Build aerial imagery style (ESRI World Imagery) with street labels
        mapStyle = {
          version: 8,
          sources: {
            'satellite': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            },
            'labels': {
              type: 'raster',
              tiles: [
                'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256
            },
            'boundaries': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256
            }
          },
          layers: [
            {
              id: 'satellite',
              type: 'raster',
              source: 'satellite',
              minzoom: 0,
              maxzoom: 22
            },
            {
              id: 'labels',
              type: 'raster',
              source: 'labels',
              minzoom: 0,
              maxzoom: 22
            },
            {
              id: 'boundaries',
              type: 'raster',
              source: 'boundaries',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        };
      } else {
        // Default to ESRI if unknown
        mapStyle = styleUrl;
      }

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyle,
        center,
        zoom,
        pitch,
        bearing,
        antialias: true
      });

      map.on('load', () => {
        setMapLoaded(true);
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
    }, [styleUrl]);
    // Only recreate map if styleUrl changes
    // center, zoom, pitch, bearing are intentionally excluded - they're only for initial setup
    // The map preserves user's camera state after initialization

    // Effect: Update lines when they change
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      // Remove existing line layers and sources
      const existingLayers = map.getStyle().layers || [];
      for (const layer of existingLayers) {
        if (layer.id.endsWith('-line')) {
          map.removeLayer(layer.id);
          const sourceId = layer.id.replace('-line', '');
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        }
      }

      // Add new lines
      for (const l of lines) {
        if (!map.getSource(l.id)) {
          map.addSource(l.id, { type: 'geojson', data: l.data });
        }
        if (!map.getLayer(`${l.id}-line`)) {
          map.addLayer({
            id: `${l.id}-line`,
            type: 'line',
            source: l.id,
            paint: {
              'line-color': l.color ?? '#999',
              'line-width': l.width ?? 1.2,
              'line-opacity': 0.9
            }
          });
        }
      }
    }, [lines, mapLoaded]);

    // Effect: Update extrusions when they change
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      // Remove existing extrusion layers and sources
      const existingLayers = map.getStyle().layers || [];
      for (const layer of existingLayers) {
        if (layer.id.endsWith('-fill')) {
          map.removeLayer(layer.id);
          const sourceId = layer.id.replace('-fill', '');
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        }
      }

      // Add extrusions only if showExtrusions is true
      if (showExtrusions) {
        for (const e of extrusions) {
          const { color, expr } = buildHeightExpr(e.color);
          if (!map.getSource(e.id)) {
            map.addSource(e.id, { type: 'geojson', data: e.data });
          }
          if (!map.getLayer(`${e.id}-fill`)) {
            map.addLayer({
              id: `${e.id}-fill`,
              type: 'fill-extrusion',
              source: e.id,
              paint: {
                'fill-extrusion-color': color,
                'fill-extrusion-opacity': 0.88,
                'fill-extrusion-height': e.heightExpr ?? expr,
                'fill-extrusion-base': 0
              }
            });
          }

          // Add click handlers
          if (onFeatureClick) {
            const layerId = `${e.id}-fill`;
            map.off('click', layerId); // Remove old handlers
            map.on('click', layerId, (ev) => {
              const f = ev.features?.[0];
              onFeatureClick(String(f?.id ?? f?.properties?.id ?? ''));
            });
            map.on('mouseenter', layerId, () => {
              if (map.getCanvas()) {
                map.getCanvas().style.cursor = 'pointer';
              }
            });
            map.on('mouseleave', layerId, () => {
              if (map.getCanvas()) {
                map.getCanvas().style.cursor = '';
              }
            });
          }
        }
      }
    }, [extrusions, showExtrusions, onFeatureClick, mapLoaded]);

    // Effect: Update markers when they change
    // Store marker instances to clean them up
    const markersRef = useRef<maplibregl.Marker[]>([]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      // Remove existing markers
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];

      // Add markers only if showExtrusions is false
      if (!showExtrusions && markers.length > 0) {
        for (const m of markers) {
          const el = document.createElement('div');
          el.className = 'map-marker';
          el.style.cursor = 'pointer';

          const variant = m.variant ?? 'pin';

          if (variant === 'dot') {
            const size = m.isActive ? 18 : 14;
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.style.borderRadius = '9999px';
            el.style.backgroundColor = m.color || '#000';
            el.style.border = '2px solid #fff';
            el.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.3)';
            if (m.isActive) {
              el.style.boxShadow = '0 0 0 2px rgba(0, 0, 0, 0.35)';
            }
          } else if (m.id === 'subject') {
            el.style.width = '32px';
            el.style.height = '32px';
            el.innerHTML = `
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="#FFD700" stroke="#000000" stroke-width="3"/>
              </svg>
            `;
          } else {
            // Regular pushpin for comparables
            el.style.width = '30px';
            el.style.height = '30px';
            el.innerHTML = `
              <svg width="30" height="30" viewBox="0 0 24 24" fill="${m.color || '#2d8cf0'}" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            `;
          }

          if (onFeatureClick) {
            el.addEventListener('click', () => onFeatureClick(m.id));
          }

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat(m.coordinates)
            .addTo(map);

          const popupHtml = m.popup ?? m.tooltip;

          if (popupHtml) {
            const popup = new maplibregl.Popup({
              offset: variant === 'dot' ? 12 : 25,
              closeButton: false,
              closeOnClick: false
            }).setHTML(popupHtml);
            marker.setPopup(popup);

            el.addEventListener('mouseenter', () => {
              popup.addTo(map);
              m.onHover?.();
            });
            el.addEventListener('mouseleave', () => {
              popup.remove();
              m.onLeave?.();
            });
          }

          if (!popupHtml) {
            el.addEventListener('mouseenter', () => m.onHover?.());
            el.addEventListener('mouseleave', () => m.onLeave?.());
          }

          markersRef.current.push(marker);
        }
      }
    }, [markers, showExtrusions, onFeatureClick, mapLoaded]);

    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          overflow: 'hidden'
        }}
      />
    );
  }
);
