/**
 * ValuationSalesCompMap Component
 *
 * Oblique map for Sales Comparison Approach showing subject + comps
 */

'use client';

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { MapOblique, MapObliqueRef } from './MapOblique';
import { useCompsMapData } from '@/lib/map/hooks';
import { ParcelOverlayLayer } from './ParcelOverlayLayer';

export interface ValuationSalesCompMapProps {
  projectId: string;
  styleUrl: string;
  height?: string;
  onToggleComp?: (compId: string) => void;
  subjectApn?: string;
  compApns?: string[];
}

export default function ValuationSalesCompMap({
  projectId,
  styleUrl,
  height = '520px',
  onToggleComp,
  subjectApn,
  compApns
}: ValuationSalesCompMapProps) {
  const { data, error, isLoading } = useCompsMapData(projectId);
  const mapRef = useRef<MapObliqueRef>(null);

  // Basemap state
  type BasemapOption = 'google-roadmap' | 'google-satellite' | 'google-hybrid' | 'google-terrain';
  const basemapOptions: { value: BasemapOption; label: string }[] = [
    { value: 'google-hybrid', label: 'Hybrid' },
    { value: 'google-roadmap', label: 'Map' },
    { value: 'google-satellite', label: 'Satellite' },
    { value: 'google-terrain', label: 'Terrain' },
  ];
  const [activeBasemap, setActiveBasemap] = useState<BasemapOption>(
    styleUrl.startsWith('google-') ? (styleUrl as BasemapOption) : 'google-hybrid'
  );
  const resolvedStyleUrl = activeBasemap;

  // Unique color palette for comps (distinguishable, colorblind-friendly)
  const COMP_COLORS = [
    '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
    '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
    '#dcbeff', '#9A6324', '#800000', '#aaffc3', '#808000',
  ];

  // Color each comp uniquely by index
  const compsWithColor = useMemo(() => {
    if (!data) return null;

    return {
      ...data.comps,
      features: data.comps.features.map((f, idx) => ({
        ...f,
        properties: {
          ...f.properties,
          color: COMP_COLORS[idx % COMP_COLORS.length]
        }
      }))
    };
  }, [data]);

  const handleFeatureClick = useCallback(
    (featureId?: string) => {
      if (featureId && featureId !== 'subject' && onToggleComp) {
        // Extract comp ID from feature ID (e.g., "comp-1" -> "1")
        const compId = featureId.replace('comp-', '');
        onToggleComp(compId);
      }
    },
    [onToggleComp]
  );

  // Auto-fit bounds to show all markers on mount
  useEffect(() => {
    if (!data) return;

    // Calculate bounds from subject + all comp coordinates
    let minLng = data.center[0];
    let maxLng = data.center[0];
    let minLat = data.center[1];
    let maxLat = data.center[1];

    data.comps.features.forEach((f) => {
      if (f.geometry.type === 'Polygon') {
        const coords = f.geometry.coordinates[0][0];
        const lng = coords[0] as number;
        const lat = coords[1] as number;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    });

    // Expand bounds by 15% on each side for comfortable padding
    const lngRange = maxLng - minLng;
    const latRange = maxLat - minLat;
    const bounds: [[number, number], [number, number]] = [
      [minLng - lngRange * 0.15, minLat - latRange * 0.15],
      [maxLng + lngRange * 0.15, maxLat + latRange * 0.15]
    ];

    // Retry fitBounds until map ref is ready (handles async map init)
    let attempts = 0;
    const tryFit = () => {
      if (mapRef.current) {
        mapRef.current.fitBounds(bounds, { padding: 60, pitch: 0, bearing: 0 });
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryFit, 300);
      }
    };
    // Start after a brief delay for initial render
    setTimeout(tryFit, 200);
  }, [data]);

  if (isLoading) {
    return (
      <div
        className="card d-flex align-items-center justify-content-center"
        style={{
          height,
          backgroundColor: 'var(--cui-tertiary-bg)',
        }}
      >
        <div className="text-center">
          <div
            className="spinner-border spinner-border-sm mb-3"
            role="status"
            style={{ color: 'var(--cui-primary)' }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="small mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
            Loading comparables map...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data || !compsWithColor) {
    return (
      <div
        className="card d-flex align-items-center justify-content-center"
        style={{
          height,
          backgroundColor: 'var(--cui-tertiary-bg)',
        }}
      >
        <div className="text-center p-4">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗺️</div>
          <p className="small mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
            Comparables map data unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card overflow-hidden"
      style={{
        height,
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)'
      }}
    >
      {/* Header */}
      <div
        className="card-header d-flex align-items-center justify-content-between"
        style={{ backgroundColor: 'var(--surface-card-header)' }}
      >
        <h5
          className="mb-0"
          style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--cui-body-color)' }}
        >
          Comparable Locations
        </h5>
        <button
          onClick={() => mapRef.current?.flyToSubject(data.center)}
          className="btn btn-sm btn-primary"
        >
          Reset View
        </button>
      </div>

      {/* Map */}
      <div className="p-3" style={{ height: 'calc(100% - 110px)', position: 'relative' }}>
        {/* Basemap Switcher */}
        <div
          className="btn-group btn-group-sm"
          role="group"
          style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            zIndex: 10,
          }}
        >
          {basemapOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`btn btn-ghost-secondary${activeBasemap === opt.value ? ' active' : ''}`}
              onClick={() => setActiveBasemap(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ height: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <MapOblique
          ref={mapRef}
          center={data.center}
          styleUrl={resolvedStyleUrl}
          showExtrusions={false}
          markers={[
            {
              id: 'subject',
              coordinates: data.center,
              color: '#2d8cf0',
              label: 'Subject',
              popup: '<div style="padding: 8px;"><strong>Subject Property</strong></div>'
            },
            ...data.comps.features.map((f, idx) => {
              const props = f.properties;
              const compColor = COMP_COLORS[idx % COMP_COLORS.length];
              const formatShortCurrency = (value?: number | null) => {
                if (value == null || !Number.isFinite(value)) return '';
                if (Math.abs(value) >= 1_000_000) {
                  return `$${(value / 1_000_000).toFixed(2)}M`;
                }
                if (Math.abs(value) >= 1_000) {
                  return `$${Math.round(value / 1_000)}K`;
                }
                return `$${Math.round(value).toLocaleString()}`;
              };

              const priceLabel = formatShortCurrency(props.price);
              const unitLabel = formatShortCurrency(props.price_per_unit);
              const priceLine = priceLabel
                ? `${priceLabel}${unitLabel ? `&nbsp;&nbsp;<span style="color: var(--cui-secondary-color);">${unitLabel} / unit</span>` : ''}`
                : '';

              const popupHTML = `
                <div style="padding: 10px 12px; min-width: 220px; color: var(--cui-body-color); font-family: system-ui, -apple-system, Segoe UI, sans-serif;">
                  <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: var(--cui-body-color);">
                    <span style="color: var(--cui-primary); font-weight:600;">Name:</span> ${props.name || `Comp ${idx + 1}`}
                  </div>
                  ${priceLine ? `<div style="font-size: 13px; color: var(--cui-body-color); margin-bottom: 6px;">
                    <span style="color: var(--cui-primary); font-weight:600;">Price:</span> ${priceLine}
                  </div>` : ''}
                  ${props.date ? `<div style="font-size: 13px; color: var(--cui-body-color); margin-bottom: 6px;">
                    <span style="color: var(--cui-primary); font-weight:600;">Date:</span> ${new Date(props.date).toLocaleDateString()}
                  </div>` : ''}
                </div>
              `;

              return {
                id: `comp-${idx}`,
                coordinates: (f.geometry.type === 'Polygon'
                  ? [f.geometry.coordinates[0][0][0] as number, f.geometry.coordinates[0][0][1] as number]
                  : [0, 0]) as [number, number],
                color: compColor,
                stroke: '#ffffff',
                label: `${idx + 1}`,
                variant: 'numbered' as const,
                popup: popupHTML
              };
            })
          ]}
          onFeatureClick={handleFeatureClick}
        >
          <ParcelOverlayLayer subjectApn={subjectApn} compApns={compApns} />
        </MapOblique>
        </div>
      </div>

      {/* Legend */}
      <div
        className="d-flex align-items-center flex-wrap px-3 py-2"
        style={{
          gap: '0.75rem',
          fontSize: '0.75rem',
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderTop: '1px solid var(--cui-border-color)'
        }}
      >
        <div className="d-flex align-items-center" style={{ gap: '0.375rem' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              backgroundColor: 'var(--cui-warning)',
              borderRadius: '50%',
              border: '2px solid var(--cui-body-color)'
            }}
          />
          <span style={{ color: 'var(--cui-secondary-color)' }}>Subject</span>
        </div>
        {data.comps.features.map((f, idx) => (
          <div key={idx} className="d-flex align-items-center" style={{ gap: '0.375rem' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: COMP_COLORS[idx % COMP_COLORS.length],
                borderRadius: '50%',
                border: '2px solid #fff',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {idx + 1}
            </div>
            <span style={{ color: 'var(--cui-secondary-color)' }}>
              {f.properties.name || `Comp ${idx + 1}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
