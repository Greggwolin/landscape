'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import { useSfComps, SfComp } from '@/hooks/analysis/useSfComps';
import { formatMoney } from '@/utils/formatters/number';
import { registerGoogleProtocol } from '@/lib/maps/registerGoogleProtocol';
import { getGoogleBasemapStyle } from '@/lib/maps/googleBasemaps';
import { registerRasterDim } from '@/lib/maps/rasterDim';
import { escapeHtml, splitAddressLines } from '@/lib/maps/addressFormat';

interface MarketCompetitorProduct {
  lot_width_ft?: number | null;
  lot_dimensions?: string | null;
  unit_size_min_sf?: number | null;
  unit_size_max_sf?: number | null;
  unit_size_avg_sf?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_avg?: number | null;
}

interface MarketCompetitor {
  id?: number;
  comp_name: string;
  builder_name?: string | null;
  comp_address?: string;
  latitude?: number;
  longitude?: number;
  total_units?: number;
  price_min?: number | null;
  price_max?: number | null;
  status?: string;
  products?: MarketCompetitorProduct[];
}

interface MarketMapViewProps {
  projectId: number;
  competitors: MarketCompetitor[];
  height?: string;
  className?: string;
  selectedCompetitorId?: number | null;
  onSelectCompetitor?: (id: number) => void;
  onClearSelection?: () => void;
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
  className = '',
  selectedCompetitorId = null,
  onSelectCompetitor,
  onClearSelection
}: MarketMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const compsMarkersRef = useRef<maplibregl.Marker[]>([]);
  const competitorMarkerElements = useRef<Map<number, { dot: HTMLDivElement; baseColor: string }>>(new Map());
  const [mapStyleId, setMapStyleId] = useState('hybrid');
  const [error, setError] = useState<string | null>(null);
  const [showComps, setShowComps] = useState(true);
  const [showCompetitors, setShowCompetitors] = useState(true);
  const [selectedComp, setSelectedComp] = useState<SfComp | null>(null);

  const mapStyles = useMemo(() => ({
    hybrid: {
      label: 'Hybrid',
      style: getGoogleBasemapStyle('hybrid')
    },
    light: {
      label: 'Light',
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    },
    dark: {
      label: 'Dark',
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    },
    voyager: {
      label: 'Voyager',
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
    },
    aerial: {
      label: 'Aerial',
      style: {
        version: 8,
        sources: {
          esri: {
            type: 'raster',
            tiles: [
              'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'Esri, Maxar, Earthstar Geographics'
          }
        },
        layers: [
          { id: 'esri', type: 'raster', source: 'esri' }
        ]
      }
    }
  }), []);

  const formatShortCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    if (value >= 1_000_000) return `$${Math.round(value / 1000).toLocaleString()}k`;
    if (value >= 1_000) return `$${Math.round(value / 1000)}k`;
    return `$${Math.round(value)}`;
  };

  const getLotDisplay = (comp: MarketCompetitor) => {
    const product = comp.products?.find(p =>
      p.lot_dimensions || p.lot_width_ft || p.unit_size_avg_sf || p.unit_size_min_sf || p.unit_size_max_sf
    );
    if (!product) return { label: 'Lot', value: '—' };
    if (product.lot_dimensions) return { label: 'Lot', value: product.lot_dimensions };
    if (Number.isFinite(Number(product.lot_width_ft))) {
      return { label: 'Lot', value: `${Number(product.lot_width_ft)}'` };
    }
    if (Number.isFinite(Number(product.unit_size_avg_sf))) {
      return { label: 'Size', value: `${Number(product.unit_size_avg_sf).toLocaleString()} SF` };
    }
    const min = Number(product.unit_size_min_sf);
    const max = Number(product.unit_size_max_sf);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { label: 'Size', value: `${min.toLocaleString()}-${max.toLocaleString()} SF` };
    }
    return { label: 'Lot', value: '—' };
  };

  const getLastSalePrice = (comp: MarketCompetitor) => {
    const product = comp.products?.find(p => p.price_avg || p.price_max || p.price_min);
    const value = product?.price_avg ?? product?.price_max ?? product?.price_min ?? null;
    return value;
  };

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

    let cleanupRasterDim: (() => void) | null = null;

    try {
      registerGoogleProtocol();
      // Initialize map centered on project
      const selectedStyle = mapStyles[mapStyleId]?.style ?? mapStyles.light.style;
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: selectedStyle,
        center: [projectLon, projectLat],
        zoom: 12
      });

      cleanupRasterDim = registerRasterDim(map.current, 0.1);

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.current.on('click', () => {
        onClearSelection?.();
      });

      // Add project marker (blue)
      new maplibregl.Marker({ color: '#0d6efd', scale: 1.2 })
        .setLngLat([projectLon, projectLat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="padding: 8px; color: var(--cui-body-color);">
              <strong style="color: var(--cui-primary);">📍 ${project?.project_name || 'Subject Property'}</strong><br/>
              <small style="color: var(--cui-secondary-color);">${projectLat.toFixed(6)}, ${projectLon.toFixed(6)}</small>
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
        cleanupRasterDim?.();
        map.current.remove();
        map.current = null;
      }
    };
  }, [projectLat, projectLon, project?.project_name]);

  useEffect(() => {
    if (!map.current) return;
    const style = mapStyles[mapStyleId]?.style ?? mapStyles.light.style;
    map.current.setStyle(style as maplibregl.StyleSpecification | string);
  }, [mapStyleId, mapStyles]);

  // Update competitor markers when competitors change or visibility toggles
  useEffect(() => {
    if (!map.current) return;

    // Remove existing competitor markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (!showCompetitors) return;

    competitorMarkerElements.current.clear();

    // Add competitor markers
    competitors.forEach(comp => {
      if (comp.latitude && comp.longitude && map.current) {
        const statusColors: Record<string, string> = {
          selling: '#198754',
          sold_out: '#6c757d',
          planned: '#0dcaf0'
        };
        const markerColor = statusColors[comp.status || ''] || '#dc3545';
        const el = document.createElement('div');
        el.style.cssText = `
          width: 22px;
          height: 22px;
          cursor: pointer;
        `;
        const dot = document.createElement('div');
        dot.style.cssText = `
          width: 100%;
          height: 100%;
          background-color: ${markerColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
          transform-origin: center;
        `;
        el.appendChild(dot);
        if (comp.id) {
          competitorMarkerElements.current.set(comp.id, { dot, baseColor: markerColor });
        }

        const lotDisplay = getLotDisplay(comp);
        const priceRange = (comp.price_min || comp.price_max)
          ? `${formatShortCurrency(comp.price_min ?? null)}-${formatShortCurrency(comp.price_max ?? null)}`
          : '—';
        const lastSalePrice = getLastSalePrice(comp);
        const addressLines = splitAddressLines(comp.comp_address);
        const addressHtml = addressLines
          ? `<div style="font-size: 11px; color: var(--cui-secondary-color); margin-bottom: 2px;">${escapeHtml(addressLines.line1)}</div>${
            addressLines.line2
              ? `<div style="font-size: 11px; color: var(--cui-secondary-color); margin-bottom: 6px;">${escapeHtml(addressLines.line2)}</div>`
              : ''
          }`
          : '';

        el.addEventListener('click', (event) => {
          event.stopPropagation();
          if (comp.id) {
            onSelectCompetitor?.(comp.id);
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([comp.longitude, comp.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: '280px' }).setHTML(
              `<div style="padding: 10px; color: var(--cui-body-color);">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: var(--cui-body-color);">${comp.comp_name}</div>
                ${comp.builder_name ? `<div style="font-size: 12px; color: var(--cui-secondary-color); margin-bottom: 4px;">${comp.builder_name}</div>` : ''}
                ${addressHtml}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 12px;">
                  <div><span style="color: var(--cui-secondary-color);">${lotDisplay.label}:</span> <span style="font-weight: 600; color: var(--cui-body-color);">${lotDisplay.value}</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Units:</span> <span style="font-weight: 600; color: var(--cui-body-color);">${comp.total_units?.toLocaleString() || '—'}</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Price Range:</span> <span style="font-weight: 600; color: var(--cui-body-color);">${priceRange}</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Last Sale:</span> <span style="font-weight: 600; color: var(--cui-body-color);">${lastSalePrice ? formatShortCurrency(lastSalePrice) : '—'}</span></div>
                </div>
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

  useEffect(() => {
    competitorMarkerElements.current.forEach(({ dot, baseColor }, id) => {
      if (selectedCompetitorId && id === selectedCompetitorId) {
        dot.style.backgroundColor = '#0d6efd';
        dot.style.borderColor = '#0b5ed7';
        dot.style.transform = 'scale(1.2)';
      } else {
        dot.style.backgroundColor = baseColor;
        dot.style.borderColor = 'white';
        dot.style.transform = 'scale(1)';
      }
    });
  }, [selectedCompetitorId]);

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
              `<div style="padding: 10px; min-width: 220px; color: var(--cui-body-color);">
                <div style="font-weight: 600; color: var(--cui-body-color); margin-bottom: 4px;">${comp.address}</div>
                <div style="font-size: 11px; color: var(--cui-secondary-color); margin-bottom: 8px;">${comp.city}, ${comp.state} · ${comp.distanceMiles.toFixed(1)} mi</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--cui-body-color); margin-bottom: 4px;">
                  ${priceFormatted}
                  <span style="font-size: 12px; font-weight: 400; color: var(--cui-secondary-color); margin-left: 6px;">${psfFormatted}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 12px; margin-bottom: 8px;">
                  <div><span style="color: var(--cui-secondary-color);">Size:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.sqft?.toLocaleString() || '—'} SF</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Built:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.yearBuilt || '—'}</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Beds:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.beds ?? '—'}</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Baths:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.baths ?? '—'}</span></div>
                  <div><span style="color: var(--cui-secondary-color);">Lot:</span> <span style="font-weight: 500; color: var(--cui-body-color);">${comp.lotSqft?.toLocaleString() || '—'} SF</span></div>
                </div>
                <div style="font-size: 11px; color: var(--cui-secondary-color); border-top: 1px solid var(--cui-border-color); padding-top: 6px;">
                  Sold ${new Date(comp.saleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                ${comp.url ? `<a href="${comp.url}" target="_blank" rel="noreferrer" style="font-size: 11px; color: var(--cui-primary); text-decoration: none;">View on Redfin →</a>` : ''}
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

      <div
        className="position-absolute top-0 start-0 m-3 p-2 rounded shadow-sm"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
          color: 'var(--cui-body-color)',
          zIndex: 1
        }}
      >
        <div className="small fw-semibold mb-2" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cui-secondary-color)' }}>
          Map Layers
        </div>
        <div className="mb-2">
          <select
            className="form-select form-select-sm"
            style={{
              backgroundColor: 'var(--cui-input-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)'
            }}
            value={mapStyleId}
            onChange={(event) => setMapStyleId(event.target.value)}
          >
            {Object.entries(mapStyles).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
        <div className="d-flex flex-column gap-1" style={{ fontSize: '12px', color: 'var(--cui-body-color)' }}>
          <label className="d-flex align-items-center gap-2 mb-0" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCompetitors}
              onChange={() => setShowCompetitors(!showCompetitors)}
              className="form-check-input m-0"
              style={{ width: '14px', height: '14px', accentColor: 'var(--cui-primary)' }}
            />
            <span>Competitive Projects</span>
            <span style={{ color: 'var(--cui-secondary-color)' }}>({competitors.length})</span>
          </label>
          <label className="d-flex align-items-center gap-2 mb-0" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showComps}
              onChange={() => setShowComps(!showComps)}
              className="form-check-input m-0"
              style={{ width: '14px', height: '14px', accentColor: 'var(--cui-primary)' }}
            />
            <span>Recent Sales</span>
            <span style={{ color: 'var(--cui-secondary-color)' }}>({comps.length})</span>
          </label>
        </div>
      </div>

      <div
        className="position-absolute bottom-0 start-0 m-3 p-2 rounded shadow-sm"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
          color: 'var(--cui-body-color)',
          zIndex: 1
        }}
      >
        <div className="d-flex flex-column gap-1" style={{ fontSize: '11px', color: 'var(--cui-body-color)' }}>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: '12px', height: '12px', backgroundColor: '#0d6efd', borderRadius: '50%' }}></div>
            <span>Subject Property</span>
          </div>
          {showComps && comps.length > 0 && (
            <>
              <div className="mt-1" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cui-secondary-color)' }}>Recent Sales</div>
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
