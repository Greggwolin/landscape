'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  zoom = 13,
  height = '400px',
  address,
  className = ''
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Placeholder for MapLibre GL JS integration
    // Reference: /prototypes/gis-simple-test for full implementation
  }, []);

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
      {/* Map Container Placeholder */}
      <div
        ref={mapContainer}
        className="rounded overflow-hidden"
        style={{
          height,
          backgroundColor: 'var(--cui-secondary-bg)',
          border: '1px solid var(--cui-border-color)',
          position: 'relative'
        }}
      >
        {/* Placeholder content - replace with actual MapLibre map */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>
              MapLibre Integration
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--cui-secondary-color)' }}>
              Interactive map will be displayed here
            </p>
            {address && (
              <div className="text-sm mb-2" style={{ color: 'var(--cui-body-color)' }}>
                📍 {address}
              </div>
            )}
            <div className="text-xs" style={{ color: 'var(--cui-tertiary-color)' }}>
              Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
            </div>
            <div className="mt-4 text-xs" style={{ color: 'var(--cui-tertiary-color)' }}>
              Reference: /prototypes/gis-simple-test for MapLibre integration
            </div>
          </div>
        </div>

        {/* Map Controls Placeholder */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            className="px-3 py-2 rounded text-sm font-medium"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              border: '1px solid var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              boxShadow: 'var(--cui-box-shadow-sm)'
            }}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="px-3 py-2 rounded text-sm font-medium"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              border: '1px solid var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              boxShadow: 'var(--cui-box-shadow-sm)'
            }}
            title="Zoom Out"
          >
            -
          </button>
        </div>
      </div>

      {/* Map Info Bar */}
      <div
        className="mt-2 px-3 py-2 rounded text-xs"
        style={{
          backgroundColor: 'var(--cui-secondary-bg)',
          border: '1px solid var(--cui-border-color)',
          color: 'var(--cui-secondary-color)'
        }}
      >
        <div className="flex justify-between items-center">
          <span>Zoom: {zoom}</span>
          <span>
            MapLibre GL JS - Open Source Maps
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * MapView Component Documentation
 *
 * This component provides a placeholder for MapLibre GL JS integration.
 * To complete the integration:
 *
 * 1. Install MapLibre GL JS:
 *    npm install maplibre-gl
 *
 * 2. Import styles and library:
 *    import maplibregl from 'maplibre-gl';
 *    import 'maplibre-gl/dist/maplibre-gl.css';
 *
 * 3. Initialize map in useEffect:
 *    const map = new maplibregl.Map({
 *      container: mapContainer.current,
 *      style: 'https://demotiles.maplibre.org/style.json',
 *      center: [longitude, latitude],
 *      zoom: zoom
 *    });
 *
 * 4. Add marker:
 *    new maplibregl.Marker()
 *      .setLngLat([longitude, latitude])
 *      .addTo(map);
 *
 * 5. Reference existing implementation at:
 *    /prototypes/gis-simple-test
 *
 * Props:
 * - latitude: Map center latitude (default: 37.7749 - San Francisco)
 * - longitude: Map center longitude (default: -122.4194)
 * - zoom: Initial zoom level (default: 13)
 * - height: Map container height (default: '400px')
 * - address: Display address below map
 * - className: Additional CSS classes
 */
