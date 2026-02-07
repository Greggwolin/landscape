/* Lightweight comps map for Napkin Analysis panels */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import { formatMoney } from '@/utils/formatters/number';
import type { SfComp } from '@/hooks/analysis/useSfComps';
import { getEsriHybridStyle } from '@/lib/maps/esriHybrid';

interface NapkinCompsMapProps {
  projectId: number;
  comps: SfComp[];
  height?: number | string;
  radiusMiles?: number;
}

// Available map styles
type MapStyleKey = 'hybrid' | 'voyager' | 'satellite';

const MAP_STYLES: Record<MapStyleKey, { name: string; url: string }> = {
  hybrid: {
    name: 'Hybrid',
    url: '' // Built dynamically for ESRI hybrid
  },
  voyager: {
    name: 'Street',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
  },
  satellite: {
    name: 'Satellite',
    url: '' // We'll build this dynamically for ESRI
  }
};

const getEsriSatelliteStyle = (): maplibregl.StyleSpecification => ({
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Imagery © Esri'
    }
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
});

// 8-color progressive ramp for lot SF bands (one per product)
// Colors progress from cool (small lots) to warm (large lots)
const BAND_DOT_COLORS = [
  '#22c55e',  // 40' - green
  '#4ade80',  // 45' - light green
  '#a3e635',  // 50' - lime
  '#facc15',  // 55' - yellow
  '#fb923c',  // 60' - orange
  '#f87171',  // 65' - light red
  '#ef4444',  // 70' - red
  '#be185d',  // 80' - pink/magenta
];

// Helper to get marker color based on lot SF - matches product bands
function getLotSizeColor(lotSqft: number | null): string {
  if (!lotSqft) return '#9ca3af'; // gray for no data
  if (lotSqft < 5175) return BAND_DOT_COLORS[0];  // 40'
  if (lotSqft < 5750) return BAND_DOT_COLORS[1];  // 45'
  if (lotSqft < 6325) return BAND_DOT_COLORS[2];  // 50'
  if (lotSqft < 6900) return BAND_DOT_COLORS[3];  // 55'
  if (lotSqft < 7500) return BAND_DOT_COLORS[4];  // 60'
  if (lotSqft < 8100) return BAND_DOT_COLORS[5];  // 65'
  if (lotSqft < 9200) return BAND_DOT_COLORS[6];  // 70'
  return BAND_DOT_COLORS[7];                       // 80'
}

export function NapkinCompsMap({
  projectId,
  comps,
  height = 350,
  radiusMiles
}: NapkinCompsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const compsMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('hybrid');

  // Fetch project data to get location
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  // Get project location
  const projectLat = project?.location_lat || project?.latitude;
  const projectLon = project?.location_lon || project?.longitude;

  // Store project marker ref so we can re-add after style change
  const projectMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Get current style
  const getMapStyle = (): string | maplibregl.StyleSpecification => {
    if (mapStyle === 'hybrid') {
      return getEsriHybridStyle();
    }
    if (mapStyle === 'satellite') {
      return getEsriSatelliteStyle();
    }
    return MAP_STYLES.voyager.url;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!projectLat || !projectLon) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: getMapStyle(),
        center: [projectLon, projectLat],
        zoom: 12
      });

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add project marker (blue)
      projectMarkerRef.current = new maplibregl.Marker({ color: '#0d6efd', scale: 1.2 })
        .setLngLat([projectLon, projectLat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="padding: 8px; color: var(--cui-body-color);">
              <div style="font-weight: 600; color: #0d6efd;">📍 ${project?.project_name || 'Subject Property'}</div>
              <div style="font-size: 11px; color: var(--cui-secondary-color);">${projectLat.toFixed(6)}, ${projectLon.toFixed(6)}</div>
            </div>`
          )
        )
        .addTo(map.current);

    } catch (err) {
      console.error('Error initializing map:', err);
      setError(err instanceof Error ? err.message : 'Failed to load map');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectLat, projectLon, project?.project_name]);

  // Handle style changes
  useEffect(() => {
    if (!map.current || !projectLat || !projectLon) return;

    const newStyle = getMapStyle();
    map.current.setStyle(newStyle);

    // Re-add markers after style loads
    map.current.once('styledata', () => {
      // Re-add project marker
      if (projectMarkerRef.current && map.current) {
        projectMarkerRef.current.remove();
        projectMarkerRef.current = new maplibregl.Marker({ color: '#0d6efd', scale: 1.2 })
          .setLngLat([projectLon, projectLat])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div style="padding: 8px; color: var(--cui-body-color);">
                <div style="font-weight: 600; color: #0d6efd;">📍 ${project?.project_name || 'Subject Property'}</div>
                <div style="font-size: 11px; color: var(--cui-secondary-color);">${projectLat.toFixed(6)}, ${projectLon.toFixed(6)}</div>
              </div>`
            )
          )
          .addTo(map.current);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  // Update comp markers when comps change
  useEffect(() => {
    if (!map.current) return;

    // Remove existing comp markers
    compsMarkersRef.current.forEach(marker => marker.remove());
    compsMarkersRef.current = [];

    if (comps.length === 0) return;

    // Add comp markers
    comps.forEach(comp => {
      if (comp.lat && comp.lng && map.current) {
        const color = getLotSizeColor(comp.lotSqft);

        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'comp-marker';
        el.style.cssText = `
          width: 20px;
          height: 20px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        // Create inner dot
        const dot = document.createElement('div');
        dot.style.cssText = `
          width: 6px;
          height: 6px;
          background-color: white;
          border-radius: 50%;
          opacity: 0.8;
        `;
        el.appendChild(dot);

        const priceFormatted = formatMoney(comp.salePrice, { maximumFractionDigits: 0 });
        const psfFormatted = comp.pricePerSqft ? `$${comp.pricePerSqft}/SF` : '';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([comp.lng, comp.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: '280px' }).setHTML(
              `<div style="padding: 8px; min-width: 200px; color: var(--cui-body-color);">
                <div style="font-weight: 600; color: var(--cui-body-color); margin-bottom: 4px; font-size: 13px;">${comp.address}</div>
                <div style="font-size: 11px; color: var(--cui-secondary-color); margin-bottom: 6px;">${comp.city}, ${comp.state} · ${comp.distanceMiles.toFixed(1)} mi</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--cui-body-color); margin-bottom: 4px;">
                  ${priceFormatted}
                  <span style="font-size: 11px; font-weight: 400; color: var(--cui-secondary-color); margin-left: 4px;">${psfFormatted}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; font-size: 11px; margin-bottom: 6px;">
                  <div><span style="color: var(--cui-secondary-color);">Size:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.sqft?.toLocaleString() || '—'} SF</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Built:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.yearBuilt || '—'}</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Beds:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.beds ?? '—'}</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Baths:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.baths ?? '—'}</span></div>
                  ${comp.lotSqft ? `<div><span style="color: var(--cui-secondary-color);">Lot:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.lotSqft.toLocaleString()} SF</span></div>` : ''}
                </div>
                <div style="font-size: 10px; color: var(--cui-secondary-color); border-top: 1px solid var(--cui-border-color); padding-top: 4px;">
                  Sold ${new Date(comp.saleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                ${comp.url ? `<a href="${comp.url}" target="_blank" rel="noreferrer" style="font-size: 10px; color: var(--cui-primary); text-decoration: none;">View on Redfin →</a>` : ''}
              </div>`
            )
          )
          .addTo(map.current);

        compsMarkersRef.current.push(marker);
      }
    });

    // Fit bounds to show all comps
    if (comps.length > 0 && projectLat && projectLon) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([projectLon, projectLat]);

      comps.forEach(comp => {
        if (comp.lat && comp.lng) {
          bounds.extend([comp.lng, comp.lat]);
        }
      });

      if (map.current) {
        map.current.fitBounds(bounds, {
          padding: 40,
          maxZoom: 14
        });
      }
    }
  }, [comps, projectLat, projectLon]);

  // Show loading state while fetching project
  if (isLoadingProject) {
    return (
      <div
        className="rounded d-flex align-items-center justify-content-center"
        style={{
          height,
          backgroundColor: 'var(--cui-secondary-bg)',
          border: '1px solid var(--cui-border-color)'
        }}
      >
        <div className="text-center p-3">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading map...</span>
          </div>
          <p className="mt-2 mb-0 small" style={{ color: 'var(--cui-secondary-color)' }}>
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  if (!projectLat || !projectLon) {
    return (
      <div
        className="rounded d-flex align-items-center justify-content-center"
        style={{
          height,
          backgroundColor: 'var(--cui-secondary-bg)',
          border: '1px solid var(--cui-border-color)'
        }}
      >
        <div className="text-center p-3">
          <i className="bi bi-geo-alt" style={{ fontSize: '2rem', color: 'var(--cui-secondary-color)' }}></i>
          <p className="mt-2 mb-0 small" style={{ color: 'var(--cui-secondary-color)' }}>
            Project location not set
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded d-flex align-items-center justify-content-center"
        style={{
          height,
          backgroundColor: 'var(--cui-secondary-bg)',
          border: '1px solid var(--cui-border-color)'
        }}
      >
        <div className="text-center p-3">
          <p className="mb-0 small" style={{ color: 'var(--cui-danger)' }}>
            Map Error: {error}
          </p>
        </div>
      </div>
    );
  }

  // Determine if we're in flex mode (height="100%")
  const isFlexMode = height === '100%';

  return (
    <div
      className={isFlexMode ? 'd-flex flex-column flex-grow-1' : ''}
      style={isFlexMode ? { height: '100%', minHeight: 0 } : undefined}
    >
      {/* Map Container */}
      <div
        className={`position-relative ${isFlexMode ? 'flex-grow-1' : ''}`}
        style={isFlexMode ? { minHeight: 0 } : undefined}
      >
        <div
          ref={mapContainer}
          className="rounded overflow-hidden"
          style={{
            height: isFlexMode ? '100%' : height,
            minHeight: isFlexMode ? 0 : undefined,
            border: '1px solid var(--cui-border-color)'
          }}
        />

        {/* Comp count badge - top left of map */}
        <div
          className="position-absolute top-0 start-0 m-2 px-2 py-1 rounded shadow-sm"
          style={{
            backgroundColor: 'var(--cui-card-bg)',
            border: '1px solid var(--cui-card-border-color)',
            color: 'var(--cui-body-color)',
            zIndex: 1,
            fontSize: '11px'
          }}
        >
          <strong>{comps.length}</strong> comps{radiusMiles ? ` within ${radiusMiles} mi` : ''}
        </div>

        {/* Style toggle - bottom left of map */}
        <div
          className="position-absolute bottom-0 start-0 m-2 d-flex rounded shadow-sm overflow-hidden"
          style={{
            zIndex: 1,
            fontSize: '11px'
          }}
        >
          <button
            type="button"
            className="btn btn-sm px-2 py-1"
            onClick={() => setMapStyle('voyager')}
            style={{
              backgroundColor: mapStyle === 'voyager' ? 'var(--cui-primary)' : 'var(--cui-card-bg)',
              color: mapStyle === 'voyager' ? 'white' : 'var(--cui-body-color)',
              border: '1px solid var(--cui-card-border-color)',
              borderRight: 'none',
              borderRadius: '4px 0 0 4px',
              fontSize: '11px'
            }}
          >
            Street
          </button>
          <button
            type="button"
            className="btn btn-sm px-2 py-1"
            onClick={() => setMapStyle('satellite')}
            style={{
              backgroundColor: mapStyle === 'satellite' ? 'var(--cui-primary)' : 'var(--cui-card-bg)',
              color: mapStyle === 'satellite' ? 'white' : 'var(--cui-body-color)',
              border: '1px solid var(--cui-card-border-color)',
              borderRadius: '0 4px 4px 0',
              fontSize: '11px'
            }}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* Legend - below map, horizontal layout */}
      <div
        className="d-flex flex-wrap align-items-center gap-2 mt-2 pt-2"
        style={{
          fontSize: '10px',
          color: 'var(--cui-secondary-color)',
          borderTop: '1px solid var(--cui-border-color)'
        }}
      >
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '10px', height: '10px', backgroundColor: '#0d6efd', borderRadius: '50%' }}></div>
          <span>Subject</span>
        </div>
        <span className="text-muted mx-1">|</span>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: BAND_DOT_COLORS[0], borderRadius: '50%' }}></div>
          <span>40&apos;</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: BAND_DOT_COLORS[1], borderRadius: '50%' }}></div>
          <span>45&apos;</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: BAND_DOT_COLORS[2], borderRadius: '50%' }}></div>
          <span>50&apos;</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: BAND_DOT_COLORS[3], borderRadius: '50%' }}></div>
          <span>55&apos;</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: BAND_DOT_COLORS[4], borderRadius: '50%' }}></div>
          <span>60&apos;</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: BAND_DOT_COLORS[5], borderRadius: '50%' }}></div>
          <span>65&apos;</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: BAND_DOT_COLORS[6], borderRadius: '50%' }}></div>
          <span>70&apos;</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: BAND_DOT_COLORS[7], borderRadius: '50%' }}></div>
          <span>80&apos;</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: '7px', height: '7px', backgroundColor: '#9ca3af', borderRadius: '50%' }}></div>
          <span>N/A</span>
        </div>
      </div>
    </div>
  );
}

export default NapkinCompsMap;
