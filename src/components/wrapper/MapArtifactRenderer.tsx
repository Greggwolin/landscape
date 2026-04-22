'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { registerGoogleProtocol } from '@/lib/maps/registerGoogleProtocol';
import { getGoogleBasemapStyle, isGoogleBasemapAvailable } from '@/lib/maps/googleBasemaps';
import type { MapArtifactConfig } from '@/contexts/WrapperUIContext';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch { /* ignore */ }
  return {};
}

/**
 * Free basemap style for fallback when Google Maps API key is not configured.
 * Uses OpenStreetMap tiles (no API key required).
 */
const FREE_SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

interface MapArtifactRendererProps {
  config: MapArtifactConfig;
  onClose: () => void;
  /** Called after pin confirmed and saved — parent can refresh or transition to display mode. */
  onLocationSaved?: (lat: number, lng: number) => void;
}

export function MapArtifactRenderer({ config, onClose, onLocationSaved }: MapArtifactRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const isInputMode = config.mode === 'input';

  // Input mode state
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Save pin location to project ────────────────────────────
  const handleConfirmLocation = useCallback(async () => {
    if (!pinCoords || !config.project_id) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`${DJANGO_API_URL}/api/projects/${config.project_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          location_lat: pinCoords.lat,
          location_lon: pinCoords.lng,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Status ${res.status}`);
      }

      onLocationSaved?.(pinCoords.lat, pinCoords.lng);
      // Transition: remove input mode UI, show as display with subject marker
      onClose();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save location');
    } finally {
      setIsSaving(false);
    }
  }, [pinCoords, config.project_id, onLocationSaved, onClose]);

  // ── Map click handler for input mode ────────────────────────
  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    if (!isInputMode || !mapRef.current) return;

    const { lng, lat } = e.lngLat;
    setPinCoords({ lat, lng });
    setSaveError(null);

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new maplibregl.Marker({
        color: '#ef4444',
        draggable: true,
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current?.getLngLat();
        if (lngLat) {
          setPinCoords({ lat: lngLat.lat, lng: lngLat.lng });
        }
      });
    }
  }, [isInputMode]);

  // ── Initialize map ──────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    registerGoogleProtocol();

    let style: maplibregl.StyleSpecification | string;
    if (isGoogleBasemapAvailable()) {
      const basemapType = config.basemap === 'terrain' ? 'terrain'
        : config.basemap === 'roadmap' ? 'roadmap'
        : 'satellite';
      style = getGoogleBasemapStyle(basemapType) as maplibregl.StyleSpecification;
    } else {
      style = FREE_SATELLITE_STYLE;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: config.center,
      zoom: config.zoom,
      pitch: config.pitch,
      bearing: config.bearing,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    // Display mode: render all markers after load
    if (!isInputMode) {
      map.on('load', () => {
        for (const marker of config.markers) {
          const el = document.createElement('div');
          el.style.width = '14px';
          el.style.height = '14px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = marker.color || '#ef4444';
          el.style.border = '2px solid #fff';
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
          el.style.cursor = 'pointer';

          if (marker.id === 'subject') {
            el.style.width = '18px';
            el.style.height = '18px';
            el.style.border = '3px solid #fff';
          }

          const m = new maplibregl.Marker({ element: el })
            .setLngLat(marker.coordinates)
            .addTo(map);

          if (marker.popup) {
            const popup = new maplibregl.Popup({
              offset: 12,
              closeButton: false,
              maxWidth: '200px',
            }).setHTML(
              `<div style="font-size:12px;line-height:1.4;color:#1a1e28">${marker.popup}</div>`
            );
            m.setPopup(popup);
          }
        }
      });
    }

    // Input mode: attach click handler
    if (isInputMode) {
      map.on('click', handleMapClick);
    }

    mapRef.current = map;
  }, [config, isInputMode, handleMapClick]);

  useEffect(() => {
    const timer = setTimeout(initMap, 100);
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [initMap]);

  // Resize map when panel resizes
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Artifact header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid var(--w-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--w-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isInputMode ? 'Set Project Location' : config.title}
          </div>
          {config.location && (
            <div style={{ fontSize: '11px', color: 'var(--w-text-secondary)', marginTop: '1px' }}>
              {config.location}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--w-text-tertiary)',
            padding: '2px 6px',
            borderRadius: '4px',
            flexShrink: 0,
          }}
          title="Close map"
        >
          {/* intentionally unicode — inline-styled button, CIcon not applicable here */}
          ✕
        </button>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}
      />

      {/* Input mode: instruction banner + confirm button */}
      {isInputMode && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--w-border)',
            background: 'var(--w-bg-surface)',
            flexShrink: 0,
          }}
        >
          {!pinCoords ? (
            <div style={{ fontSize: '12px', color: 'var(--w-text-secondary)', textAlign: 'center' }}>
              Click the map to place a pin at the project location
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--w-text-secondary)' }}>
                {pinCoords.lat.toFixed(6)}, {pinCoords.lng.toFixed(6)}
                <span style={{ marginLeft: '8px', opacity: 0.7 }}>Drag pin to adjust</span>
              </div>
              {saveError && (
                <div style={{ fontSize: '11px', color: 'var(--w-danger-text, #ef4444)' }}>
                  {saveError}
                </div>
              )}
              <button
                onClick={handleConfirmLocation}
                disabled={isSaving}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  background: isSaving ? 'var(--w-text-muted)' : '#22c55e',
                  color: '#fff',
                  opacity: isSaving ? 0.7 : 1,
                  alignSelf: 'flex-end',
                }}
              >
                {isSaving ? 'Saving...' : 'Confirm Location'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
