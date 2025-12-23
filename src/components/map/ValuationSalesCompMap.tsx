/**
 * ValuationSalesCompMap Component
 *
 * Oblique map for Sales Comparison Approach showing subject + comps
 */

'use client';

import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { MapOblique, MapObliqueRef } from './MapOblique';
import { useCompsMapData } from '@/lib/map/hooks';

export interface ValuationSalesCompMapProps {
  projectId: string;
  styleUrl: string;
  height?: string;
  onToggleComp?: (compId: string) => void;
}

export default function ValuationSalesCompMap({
  projectId,
  styleUrl,
  height = '520px',
  onToggleComp
}: ValuationSalesCompMapProps) {
  const { data, error, isLoading } = useCompsMapData(projectId);
  const mapRef = useRef<MapObliqueRef>(null);

  // Color comps by selected state
  const compsWithColor = useMemo(() => {
    if (!data) return null;

    return {
      ...data.comps,
      features: data.comps.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          color: f.properties.selected ? '#10b981' : '#f59e0b'
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
    if (!data || !mapRef.current) return;

    // Calculate bounds from all marker coordinates
    let minLng = data.center[0];
    let maxLng = data.center[0];
    let minLat = data.center[1];
    let maxLat = data.center[1];

    // Include all comp coordinates
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

    // Expand bounds by 10% on each side (120% total view)
    const lngRange = maxLng - minLng;
    const latRange = maxLat - minLat;
    const expandedMinLng = minLng - (lngRange * 0.1);
    const expandedMaxLng = maxLng + (lngRange * 0.1);
    const expandedMinLat = minLat - (latRange * 0.1);
    const expandedMaxLat = maxLat + (latRange * 0.1);

    const bounds: [[number, number], [number, number]] = [
      [expandedMinLng, expandedMinLat],
      [expandedMaxLng, expandedMaxLat]
    ];

    // Delay to ensure map is fully initialized and loaded
    setTimeout(() => {
      mapRef.current?.fitBounds(bounds, { padding: 100, pitch: 30, bearing: 0 });
    }, 500);
  }, [data]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border"
        style={{
          height,
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-3"
            style={{ borderColor: 'var(--cui-primary)' }}
          />
          <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            Loading comparables map...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data || !compsWithColor) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border"
        style={{
          height,
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="text-center p-6">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            Comparables map data unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        height,
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Comparable Locations - 3D View
          </h3>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Click a building to select/deselect comparable
          </p>
        </div>
        <button
          onClick={() => mapRef.current?.flyToSubject(data.center)}
          className="px-3 py-1 text-xs font-medium rounded transition-opacity"
          style={{
            backgroundColor: 'var(--cui-primary)',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Reset View
        </button>
      </div>

      {/* Map */}
      <div className="px-4 pb-4" style={{ height: 'calc(100% - 110px)' }}>
        <div className="h-full rounded-lg overflow-hidden">
        <MapOblique
          ref={mapRef}
          center={data.center}
          styleUrl={styleUrl}
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
              const popupHTML = `
                <div style="padding: 8px; min-width: 200px;">
                  <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #1f2937;">
                    ${props.name || `Comp ${idx + 1}`}
                  </div>
                  ${props.price ? `<div style="font-size: 13px; color: #4b5563; margin-bottom: 4px;">
                    <strong>Price:</strong> $${props.price.toLocaleString()}
                  </div>` : ''}
                  ${props.date ? `<div style="font-size: 13px; color: #4b5563; margin-bottom: 4px;">
                    <strong>Date:</strong> ${new Date(props.date).toLocaleDateString()}
                  </div>` : ''}
                  <div style="font-size: 13px; color: #4b5563; margin-bottom: 4px;">
                    <strong>Type:</strong> ${props.type || 'N/A'}
                  </div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                    ${props.selected ? '<span style="color: #10b981;">✓ Selected</span>' : '<span style="color: #9ca3af;">Not Selected</span>'}
                  </div>
                </div>
              `;

              return {
                id: `comp-${idx}`,
                coordinates: f.geometry.type === 'Polygon'
                  ? [(f.geometry.coordinates[0][0][0] as number), (f.geometry.coordinates[0][0][1] as number)]
                  : [0, 0],
                color: props.selected ? '#10b981' : '#f59e0b',
                label: `Comp ${idx + 1}`,
                popup: popupHTML
              };
            })
          ]}
          onFeatureClick={handleFeatureClick}
        />
        </div>
      </div>

      {/* Legend */}
      <div
        className="px-4 py-3 border-t flex items-center gap-6 text-xs"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#2d8cf0',
              borderRadius: '2px'
            }}
          />
          <span style={{ color: 'var(--cui-secondary-color)' }}>Subject Property</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#f59e0b',
              borderRadius: '2px'
            }}
          />
          <span style={{ color: 'var(--cui-secondary-color)' }}>Comparable (Unselected)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#10b981',
              borderRadius: '2px'
            }}
          />
          <span style={{ color: 'var(--cui-secondary-color)' }}>Comparable (Selected)</span>
        </div>
      </div>
    </div>
  );
}
