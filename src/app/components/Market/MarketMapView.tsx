'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import { useSfComps, SfComp } from '@/hooks/analysis/useSfComps';
import { formatMoney } from '@/utils/formatters/number';

interface MarketCompetitor {
  id?: number;
  comp_name: string;
  comp_address?: string;
  latitude?: number;
  longitude?: number;
  total_units?: number;
  status?: string;
}

interface MarketMapViewProps {
  projectId: number;
  competitors: MarketCompetitor[];
  height?: string;
  className?: string;
}

// Helper to categorize price relative to dataset
function getPriceTier(price: number, allComps: SfComp[]): 'low' | 'mid' | 'high' {
  const prices = allComps.map(c => c.salePrice).sort((a, b) => a - b);
  const p25 = prices[Math.floor(prices.length * 0.25)];
  const p75 = prices[Math.floor(prices.length * 0.75)];

  if (price <= p25) return 'low';
  if (price >= p75) return 'high';
  return 'mid';
}

export default function MarketMapView({
  projectId,
  competitors,
  height = '600px',
  className = ''
}: MarketMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const compsMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showComps, setShowComps] = useState(true);
  const [showCompetitors, setShowCompetitors] = useState(true);
  const [selectedComp, setSelectedComp] = useState<SfComp | null>(null);

  // Fetch Redfin comps
  const { data: compsData } = useSfComps(projectId, {
    radiusMiles: 5,
    soldWithinDays: 180
  });
  const comps = compsData?.comps || [];

  // Fetch project data to get location
  const { data: project } = useQuery({
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

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!projectLat || !projectLon) return;

    try {
      // Initialize map centered on project
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [projectLon, projectLat],
        zoom: 12
      });

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add project marker (blue)
      new maplibregl.Marker({ color: '#0d6efd', scale: 1.2 })
        .setLngLat([projectLon, projectLat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="padding: 8px;">
              <strong style="color: #0d6efd;">📍 ${project?.project_name || 'Subject Property'}</strong><br/>
              <small>${projectLat.toFixed(6)}, ${projectLon.toFixed(6)}</small>
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
  }, [projectLat, projectLon, project?.project_name]);

  // Update competitor markers when competitors change or visibility toggles
  useEffect(() => {
    if (!map.current) return;

    // Remove existing competitor markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (!showCompetitors) return;

    // Add competitor markers
    competitors.forEach(comp => {
      if (comp.latitude && comp.longitude && map.current) {
        const statusColors: Record<string, string> = {
          selling: '#198754',
          sold_out: '#6c757d',
          planned: '#0dcaf0'
        };
        const markerColor = statusColors[comp.status || ''] || '#dc3545';

        const marker = new maplibregl.Marker({ color: markerColor })
          .setLngLat([comp.longitude, comp.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div style="padding: 8px;">
                <strong>${comp.comp_name}</strong><br/>
                ${comp.comp_address ? `<small>${comp.comp_address}</small><br/>` : ''}
                ${comp.total_units ? `<small>${comp.total_units} units</small><br/>` : ''}
                <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; background-color: ${markerColor}; color: white; font-size: 10px; text-transform: uppercase;">
                  ${comp.status?.replace('_', ' ') || 'competitor'}
                </span>
              </div>`
            )
          )
          .addTo(map.current);

        markersRef.current.push(marker);
      }
    });

    // Adjust map bounds to show all markers if there are competitors
    if (competitors.length > 0 && projectLat && projectLon) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([projectLon, projectLat]);

      competitors.forEach(comp => {
        if (comp.latitude && comp.longitude) {
          bounds.extend([comp.longitude, comp.latitude]);
        }
      });

      if (map.current) {
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 14
        });
      }
    }
  }, [competitors, projectLat, projectLon, showCompetitors]);

  // Update Redfin comps markers when comps change or visibility toggles
  useEffect(() => {
    if (!map.current) return;

    // Remove existing comps markers
    compsMarkersRef.current.forEach(marker => marker.remove());
    compsMarkersRef.current = [];

    if (!showComps || comps.length === 0) return;

    // Color mapping for price tiers
    const tierColors: Record<string, string> = {
      low: '#22c55e',   // green
      mid: '#eab308',   // yellow
      high: '#ef4444'   // red
    };

    // Add comp markers with custom styling
    comps.forEach(comp => {
      if (comp.lat && comp.lng && map.current) {
        const tier = getPriceTier(comp.salePrice, comps);
        const color = tierColors[tier];

        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'comp-marker';
        el.style.cssText = `
          width: 24px;
          height: 24px;
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
          width: 8px;
          height: 8px;
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
            new maplibregl.Popup({ offset: 25, maxWidth: '300px' }).setHTML(
              `<div style="padding: 10px; min-width: 220px;">
                <div style="font-weight: 600; color: #111; margin-bottom: 4px;">${comp.address}</div>
                <div style="font-size: 11px; color: #666; margin-bottom: 8px;">${comp.city}, ${comp.state} · ${comp.distanceMiles.toFixed(1)} mi</div>
                <div style="font-size: 20px; font-weight: 700; color: #111; margin-bottom: 4px;">
                  ${priceFormatted}
                  <span style="font-size: 12px; font-weight: 400; color: #666; margin-left: 6px;">${psfFormatted}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 12px; margin-bottom: 8px;">
                  <div><span style="color: #888;">Size:</span> <span style="font-weight: 500;">${comp.sqft?.toLocaleString() || '—'} SF</span></div>
                  <div><span style="color: #888;">Built:</span> <span style="font-weight: 500;">${comp.yearBuilt || '—'}</span></div>
                  <div><span style="color: #888;">Beds:</span> <span style="font-weight: 500;">${comp.beds ?? '—'}</span></div>
                  <div><span style="color: #888;">Baths:</span> <span style="font-weight: 500;">${comp.baths ?? '—'}</span></div>
                  <div><span style="color: #888;">Lot:</span> <span style="font-weight: 500;">${comp.lotSqft?.toLocaleString() || '—'} SF</span></div>
                </div>
                <div style="font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 6px;">
                  Sold ${new Date(comp.saleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                ${comp.url ? `<a href="${comp.url}" target="_blank" rel="noreferrer" style="font-size: 11px; color: #0d6efd; text-decoration: none;">View on Redfin →</a>` : ''}
              </div>`
            )
          )
          .addTo(map.current);

        compsMarkersRef.current.push(marker);
      }
    });
  }, [comps, showComps]);

  if (!projectLat || !projectLon) {
    return (
      <div
        className={`rounded flex flex-col items-center justify-content-center ${className}`}
        style={{
          height,
          backgroundColor: 'var(--cui-secondary-bg)',
          border: '1px solid var(--cui-border-color)'
        }}
      >
        <div className="text-center p-4">
          <i className="bi bi-geo-alt" style={{ fontSize: '3rem', color: 'var(--cui-secondary-color)' }}></i>
          <p className="mt-3" style={{ color: 'var(--cui-secondary-color)' }}>
            Project location not set
          </p>
          <p className="small" style={{ color: 'var(--cui-tertiary-color)' }}>
            Add latitude/longitude to the project to display the map
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded flex flex-col items-center justify-content-center ${className}`}
        style={{
          height,
          backgroundColor: 'var(--cui-secondary-bg)',
          border: '1px solid var(--cui-border-color)'
        }}
      >
        <div className="text-center p-4">
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--cui-danger)' }}>
            Map Error
          </div>
          <p style={{ color: 'var(--cui-secondary-color)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`position-relative ${className}`}>
      <div
        ref={mapContainer}
        className="rounded overflow-hidden"
        style={{
          height,
          border: '1px solid var(--cui-border-color)'
        }}
      />

      {/* Layer Toggle Controls */}
      <div
        className="position-absolute top-0 end-0 m-3 p-2 rounded shadow-sm"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid var(--cui-border-color)',
          zIndex: 1,
          marginTop: '50px' // Below nav controls
        }}
      >
        <div className="text-muted small fw-semibold mb-2" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Map Layers
        </div>
        <div className="d-flex flex-column gap-1" style={{ fontSize: '12px' }}>
          <label className="d-flex align-items-center gap-2 mb-0" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCompetitors}
              onChange={() => setShowCompetitors(!showCompetitors)}
              className="form-check-input m-0"
              style={{ width: '14px', height: '14px' }}
            />
            <span>Competitive Projects</span>
            <span className="text-muted">({competitors.length})</span>
          </label>
          <label className="d-flex align-items-center gap-2 mb-0" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showComps}
              onChange={() => setShowComps(!showComps)}
              className="form-check-input m-0"
              style={{ width: '14px', height: '14px' }}
            />
            <span>Recent Sales</span>
            <span className="text-muted">({comps.length})</span>
          </label>
        </div>
      </div>

      {/* Legend */}
      <div
        className="position-absolute bottom-0 start-0 m-3 p-2 rounded shadow-sm"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid var(--cui-border-color)',
          zIndex: 1
        }}
      >
        <div className="d-flex flex-column gap-1" style={{ fontSize: '11px' }}>
          {/* Subject Property */}
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: '12px', height: '12px', backgroundColor: '#0d6efd', borderRadius: '50%' }}></div>
            <span>Subject Property</span>
          </div>

          {/* Competitive Projects Legend */}
          {showCompetitors && (
            <>
              <div className="text-muted mt-1" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Competitors</div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '10px', height: '10px', backgroundColor: '#198754', borderRadius: '50%' }}></div>
                <span>Selling</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '10px', height: '10px', backgroundColor: '#6c757d', borderRadius: '50%' }}></div>
                <span>Sold Out</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '10px', height: '10px', backgroundColor: '#0dcaf0', borderRadius: '50%' }}></div>
                <span>Planned</span>
              </div>
            </>
          )}

          {/* Recent Sales Legend */}
          {showComps && comps.length > 0 && (
            <>
              <div className="text-muted mt-1" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Sales</div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%', border: '1.5px solid white', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></div>
                <span>Below 25th %ile</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '10px', height: '10px', backgroundColor: '#eab308', borderRadius: '50%', border: '1.5px solid white', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></div>
                <span>25th - 75th %ile</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', border: '1.5px solid white', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></div>
                <span>Above 75th %ile</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
