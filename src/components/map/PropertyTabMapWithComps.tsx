/**
 * PropertyTabMapWithComps Component
 *
 * Map integration for Property tab showing subject property and rental comps
 */

'use client';

import React, { useRef, useMemo } from 'react';
import { MapOblique, MapObliqueRef, MarkerData } from './MapOblique';
import { useProjectMapData } from '@/lib/map/hooks';
import { formatCurrency } from '@/utils/formatNumber';

interface RentalComp {
  id: string;
  name: string;
  address?: string | null;
  distance: number | null;
  askingRent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lat: number | null;
  lng: number | null;
  yearBuilt?: number | null;
  totalUnits?: number | null;
  unitType?: string;
}

export interface PropertyTabMapWithCompsProps {
  projectId: string;
  styleUrl: string;
  rentalComps: RentalComp[];
}

export default function PropertyTabMapWithComps({ projectId, styleUrl, rentalComps }: PropertyTabMapWithCompsProps) {
  const { data, error, isLoading } = useProjectMapData(projectId);
  const mapRef = useRef<MapObliqueRef>(null);

  // Build markers for subject property and rental comps
  const markers = useMemo<MarkerData[]>(() => {
    const result: MarkerData[] = [];

    // Subject property marker (gold circle)
    if (data?.center) {
      result.push({
        id: 'subject',
        coordinates: data.center,
        color: '#FFD700',
        label: 'Subject Property',
        popup: `<div style="padding: 4px 8px; font-size: 12px;"><strong>Subject Property</strong></div>`
      });
    }

    // Group rental comps by property name (since there can be multiple unit types per property)
    const propertyGroups = new Map<string, RentalComp[]>();
    for (const comp of rentalComps) {
      if (comp.lat && comp.lng) {
        const key = comp.name;
        if (!propertyGroups.has(key)) {
          propertyGroups.set(key, []);
        }
        propertyGroups.get(key)!.push(comp);
      }
    }

    // Create one marker per property with all unit types in popup
    for (const [propertyName, comps] of propertyGroups) {
      const first = comps[0];
      if (!first.lat || !first.lng) continue;

      // Sort comps by bedrooms then sqft
      const sortedComps = [...comps].sort((a, b) => {
        if (a.bedrooms !== b.bedrooms) return a.bedrooms - b.bedrooms;
        return a.sqft - b.sqft;
      });

      // Build unit type rows
      const unitTypeRows = sortedComps.map(comp => {
        const rentPerSf = comp.sqft > 0 ? (comp.askingRent / comp.sqft).toFixed(2) : '—';
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #e8e8e8;">
            <div>
              <span style="font-weight: 600; color: #333; font-size: 12px;">${comp.unitType || `${comp.bedrooms}BR/${comp.bathrooms}BA`}</span>
              <span style="color: #888; font-size: 10px; margin-left: 4px;">${comp.sqft.toLocaleString()} SF</span>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: #2d8cf0; font-size: 13px;">${formatCurrency(comp.askingRent)}</div>
              <div style="font-size: 9px; color: #888;">$${rentPerSf}/SF</div>
            </div>
          </div>
        `;
      }).join('');

      result.push({
        id: `comp-${first.id}`,
        coordinates: [first.lng, first.lat],
        color: '#2d8cf0',
        label: propertyName,
        popup: `
          <div style="padding: 12px; font-size: 13px; min-width: 260px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1a1a1a;">${propertyName}</div>
            ${first.address ? `<div style="color: #666; margin-bottom: 8px; font-size: 11px; line-height: 1.3;">${first.address}</div>` : ''}

            <div style="background: #f5f7fa; border-radius: 6px; padding: 10px; margin-bottom: 8px; max-height: 200px; overflow-y: auto;">
              <div style="font-weight: 600; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Unit Types & Rents (${comps.length})</div>
              ${unitTypeRows}
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666;">
              ${first.totalUnits ? `<span>${first.totalUnits} units</span>` : ''}
              ${first.yearBuilt ? `<span>Built ${first.yearBuilt}</span>` : ''}
              ${first.distance !== null ? `<span>${first.distance.toFixed(1)} mi</span>` : ''}
            </div>
          </div>
        `
      });
    }

    return result;
  }, [data?.center, rentalComps]);

  // Build context lines from project data
  const lines = useMemo(
    () => (data?.context ? [{ id: 'context', data: data.context, color: '#666', width: 0.8 }] : []),
    [data?.context]
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border"
        style={{
          height: '100%',
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
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border"
        style={{
          height: '100%',
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="text-center p-6">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            Map data unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%' }}>
      <MapOblique
        ref={mapRef}
        center={data.center}
        zoom={14}
        pitch={0}
        bearing={0}
        styleUrl={styleUrl}
        showExtrusions={false}
        markers={markers}
        lines={lines}
      />
    </div>
  );
}
