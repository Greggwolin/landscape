/**
 * ProjectTabMap Component
 *
 * Oblique map integration for Project Overview tab with controls
 */

'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { MapOblique, MapObliqueRef } from './MapOblique';
import { useProjectMapData } from '@/lib/map/hooks';
import useSWRMutation from 'swr/mutation';

export interface RentalComparable {
  comparable_id: number;
  property_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_miles?: number;
  bedrooms: number;
  bathrooms: number;
  avg_sqft: number;
  asking_rent: number;
}

export interface ComparableColorMap {
  [propertyName: string]: string;
}

export interface ProjectTabMapProps {
  projectId: string;
  styleUrl: string;
  tabId?: string; // Optional identifier for which tab this map is on (e.g., 'project', 'property')
  rentalComparables?: RentalComparable[]; // Optional rental comparables to display as markers
  comparableColors?: ComparableColorMap; // Optional color mapping for comparable markers
  onMarkerClick?: (propertyName: string) => void; // Callback when a comparable marker is clicked
}

export default function ProjectTabMap({ projectId, styleUrl, tabId = 'project', rentalComparables = [], comparableColors = {}, onMarkerClick }: ProjectTabMapProps) {
  const subjectMarkerColor = 'dodgerblue';
  const pendingMarkerColor = 'darkorange';
  const defaultComparableColor = 'mediumseagreen';
  const markerStrokeColor = 'black';
  const contextLineColor = 'dimgray';
  const popupAddressColor = 'var(--cui-secondary-color)';
  const popupMetaColor = 'var(--cui-secondary-color)';
  const popupPriceColor = 'var(--cui-body-color)';
  const popupDistanceColor = 'var(--cui-tertiary-color)';

  const { data, error, isLoading, mutate } = useProjectMapData(projectId);
  const mapRef = useRef<MapObliqueRef>(null);
  const [pendingLocation, setPendingLocation] = useState<[number, number] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Create storage key with tabId to keep tab views independent
  const storageKey = `map-saved-view-${projectId}-${tabId}`;


  // Load initial values from localStorage
  const getInitialSavedView = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse saved view:', e);
        }
      }
    }
    return null;
  };

  const initialSavedView = getInitialSavedView();
  const [pitch, setPitch] = useState(initialSavedView?.pitch ?? 20);
  const [bearing, setBearing] = useState(initialSavedView?.bearing ?? 0);
  const [initialZoom] = useState(initialSavedView?.zoom ?? 13);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [savedView, setSavedView] = useState<{ pitch: number; bearing: number; zoom: number } | null>(initialSavedView);
  const appliedSavedViewRef = useRef(false);

  // Memoize markers and lines with deep comparison to prevent unnecessary updates
  // Use JSON.stringify to ensure memoization only changes when actual values change
  const markers = useMemo(() => {
    const base: Array<{ id: string; coordinates: [number, number]; color: string; label: string; popup?: string }> = data?.center
      ? [{ id: 'subject', coordinates: data.center, color: subjectMarkerColor, label: 'Subject Property' }]
      : [];

    if (pendingLocation) {
      base.push({ id: 'pending', coordinates: pendingLocation, color: pendingMarkerColor, label: 'New Location' });
    }

    // Add rental comparable markers with property-specific colors
    rentalComparables.forEach((comp, index) => {
      if (comp.latitude && comp.longitude) {
        const markerColor = comparableColors[comp.property_name] || defaultComparableColor;
        base.push({
          id: `comp-${comp.comparable_id}`,
          coordinates: [comp.longitude, comp.latitude] as [number, number],
          color: markerColor,
          stroke: markerStrokeColor,
          label: `${index + 1}`,
          popup: `<div style="padding: 12px; min-width: 180px;">
            <div style="font-weight: 600; color: ${markerColor}; margin-bottom: 4px; font-size: 0.95em;">${comp.property_name}</div>
            ${comp.address ? `<div style="font-size: 0.85em; color: ${popupAddressColor}; margin-bottom: 2px;">${comp.address}</div>` : ''}
            <div style="font-size: 0.85em; color: ${popupMetaColor};">${comp.bedrooms}BR/${comp.bathrooms}BA · ${comp.avg_sqft?.toLocaleString()} SF</div>
            <div style="font-size: 0.95em; font-weight: 600; color: ${popupPriceColor}; margin-top: 6px;">$${Math.round(comp.asking_rent || 0).toLocaleString()}/mo</div>
            ${comp.distance_miles ? `<div style="font-size: 0.8em; color: ${popupDistanceColor}; margin-top: 4px;">${comp.distance_miles} mi away</div>` : ''}
          </div>`
        });
      }
    });

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.center ? JSON.stringify(data.center) : null, pendingLocation, rentalComparables, comparableColors]);

  // Create a lookup map from marker ID to property name for click handling
  const markerIdToPropertyName = useMemo(() => {
    const map: Record<string, string> = {};
    rentalComparables.forEach(comp => {
      map[`comp-${comp.comparable_id}`] = comp.property_name;
    });
    return map;
  }, [rentalComparables]);

  // Handle marker clicks - map marker ID to property name and call callback
  const handleFeatureClick = (markerId?: string) => {
    if (!markerId || !onMarkerClick) return;
    const propertyName = markerIdToPropertyName[markerId];
    if (propertyName) {
      onMarkerClick(propertyName);
    }
  };

  const lines = useMemo(
    () => (data?.context ? [{ id: 'context', data: data.context, color: contextLineColor, width: 0.8 }] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contextLineColor, data?.context ? JSON.stringify(data.context) : null]
  );

  const { trigger: saveLocation, isMutating: saving } = useSWRMutation(
    `/api/projects/${projectId}`,
    async (_url: string, { arg }: { arg: { lat: number; lng: number } }) => {
      setSaveError(null);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_lat: arg.lat,
          location_lon: arg.lng
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to save location');
      }
      return response.json();
    }
  );

  const handleMapClick = async ([lng, lat]: [number, number]) => {
    setPendingLocation([lng, lat]);
    setSaveSuccess(null);
    try {
      await saveLocation({ lat, lng });
      setSaveSuccess('Location saved');
      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save location';
      setSaveError(message);
    }
  };

  // Save to localStorage whenever savedView changes
  useEffect(() => {
    if (savedView) {
      localStorage.setItem(storageKey, JSON.stringify(savedView));
    }
  }, [savedView, storageKey]);

  // Note: We no longer auto-fit bounds to comparables as it disrupts the user's view.
  // The subject property should stay centered. Users can manually zoom out to see comparables.

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border"
        style={{
          height: 480,
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
          height: 480,
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      {/* Map */}
      <div style={{ height: 600 }}>
        <MapOblique
          ref={mapRef}
          center={data.center}
          zoom={initialZoom}
          pitch={pitch}
          bearing={bearing}
          styleUrl={styleUrl}
          showExtrusions={false}
          markers={markers}
          lines={lines}
          onMapClick={handleMapClick}
          onFeatureClick={handleFeatureClick}
        />
      </div>

      {/* Controls Panel - Accordion */}
      <div
        className="rounded-lg border"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        {/* Accordion Header */}
        <button
          onClick={() => setControlsExpanded(!controlsExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm transition-colors"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            color: 'var(--cui-body-color)',
            border: 'none',
            cursor: 'pointer',
            borderRadius: controlsExpanded ? '0.5rem 0.5rem 0 0' : '0.5rem'
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 transition-transform"
              style={{
                transform: controlsExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium">Map View Controls</span>
            <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
              3D Oblique View · Click map to set location
            </span>
          </div>
          <div className="flex items-center gap-2">
            {savedView && (
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--cui-success-bg)', color: 'var(--cui-success)' }}>
                ✓ View Saved
              </span>
            )}
          </div>
        </button>

        {/* Accordion Content */}
        {controlsExpanded && (
          <div
            className="p-4"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto auto 1fr 1fr',
              gap: 16,
              alignItems: 'center',
              borderTop: '1px solid var(--cui-border-color)',
              borderRadius: '0 0 0.5rem 0.5rem'
            }}
          >
            <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
              <div className="fw-semibold mb-1">Set location</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Click anywhere on the map to set project coordinates. Saves immediately.
              </div>
              <div className="d-flex align-items-center gap-2 mt-2">
                <span className="badge bg-light text-dark">
                  {saving ? 'Saving...' : pendingLocation ? 'Pending update' : 'Ready'}
                </span>
                {saveSuccess && (
                  <span className="text-success small">{saveSuccess}</span>
                )}
                {saveError && (
                  <span className="text-danger small">{saveError}</span>
                )}
              </div>
            </div>

            {/* Reset View Button */}
            <button
              onClick={() => {
                if (savedView && mapRef.current) {
                  // Restore saved view
                  mapRef.current.flyToSubject(undefined, savedView.zoom);
                  mapRef.current.setPitch(savedView.pitch);
                  mapRef.current.setBearing(savedView.bearing);
                  setPitch(savedView.pitch);
                  setBearing(savedView.bearing);
                } else {
                  // Reset to default
                  mapRef.current?.flyToSubject(undefined, 13);
                  mapRef.current?.setPitch(20);
                  mapRef.current?.setBearing(0);
                  setPitch(20);
                  setBearing(0);
                }
              }}
              className="px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap"
              style={{
                backgroundColor: 'var(--cui-secondary-bg)',
                color: 'var(--cui-body-color)',
                border: '1px solid var(--cui-border-color)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {savedView ? 'Restore Saved View' : 'Reset View'}
            </button>

            {/* Save View Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Get current values from the map, not state
                if (mapRef.current) {
                  const currentPitch = mapRef.current.getPitch();
                  const currentBearing = mapRef.current.getBearing();
                  const currentZoom = typeof mapRef.current.getZoom === 'function'
                    ? mapRef.current.getZoom()
                    : 13;
                  setPitch(currentPitch);
                  setBearing(currentBearing);
                  setSavedView({ pitch: currentPitch, bearing: currentBearing, zoom: currentZoom });
                } else {
                  setSavedView({ pitch, bearing, zoom: 13 });
                }
              }}
              className="px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap"
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
              {savedView ? 'Update Saved View' : 'Save View'}
            </button>

            {/* Pitch Input */}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Pitch (0-75°)
              </label>
              <input
                type="number"
                min={0}
                max={75}
                value={pitch}
                onChange={(e) => {
                  const newPitch = Math.max(0, Math.min(75, Number(e.target.value) || 0));
                  setPitch(newPitch);
                  mapRef.current?.setPitch(newPitch);
                }}
                className="w-full px-3 py-1.5 text-sm rounded"
                style={{
                  backgroundColor: 'var(--cui-input-bg)',
                  color: 'var(--cui-body-color)',
                  border: '1px solid var(--cui-border-color)'
                }}
              />
            </div>

            {/* Bearing Input */}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Bearing (-180 to 180°)
              </label>
              <input
                type="number"
                min={-180}
                max={180}
                value={bearing}
                onChange={(e) => {
                  const newBearing = Math.max(-180, Math.min(180, Number(e.target.value) || 0));
                  setBearing(newBearing);
                  mapRef.current?.setBearing(newBearing);
                }}
                className="w-full px-3 py-1.5 text-sm rounded"
                style={{
                  backgroundColor: 'var(--cui-input-bg)',
                  color: 'var(--cui-body-color)',
                  border: '1px solid var(--cui-border-color)'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
