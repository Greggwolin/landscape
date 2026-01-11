'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getEsriHybridStyle } from '@/lib/maps/esriHybrid';

interface MapViewProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  height?: string;
  address?: string;
  className?: string;
}

export default function MapView({
  latitude = 37.7749,
  longitude = -122.4194,
  zoom = 15,
  height = '400px',
  address,
  className = ''
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      // Initialize map
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: getEsriHybridStyle(),
        center: [longitude, latitude],
        zoom: zoom
      });

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add marker at location
      new maplibregl.Marker({ color: '#0066cc' })
        .setLngLat([longitude, latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="padding: 8px;">
              <strong>${address || 'Project Location'}</strong><br/>
              <small>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</small>
            </div>`
          )
        )
        .addTo(map.current);

    } catch (err) {
      console.error('Error initializing map:', err);
      setError(err instanceof Error ? err.message : 'Failed to load map');
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, zoom, address]);

  if (error) {
    return (
      <div
        className={`rounded flex flex-col items-center justify-center ${className}`}
        style={{
          height,
          backgroundColor: 'var(--cui-secondary-bg)',
          border: '1px solid var(--cui-border-color)'
        }}
      >
        <div className="text-center p-6">
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--cui-danger)' }}>
            Map Error
          </div>
          <p style={{ color: 'var(--cui-secondary-color)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="rounded overflow-hidden"
        style={{
          height,
          border: '1px solid var(--cui-border-color)'
        }}
      />
    </div>
  );
}
