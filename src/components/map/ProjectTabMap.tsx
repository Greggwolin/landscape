/**
 * ProjectTabMap Component
 *
 * Oblique map integration for Project Overview tab with controls
 */

'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { MapOblique, MapObliqueRef } from './MapOblique';
import { useProjectMapData } from '@/lib/map/hooks';

export interface ProjectTabMapProps {
  projectId: string;
  styleUrl: string;
  tabId?: string; // Optional identifier for which tab this map is on (e.g., 'project', 'property')
}

export default function ProjectTabMap({ projectId, styleUrl, tabId = 'project' }: ProjectTabMapProps) {
  const { data, error, isLoading } = useProjectMapData(projectId);
  const mapRef = useRef<MapObliqueRef>(null);

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
  const markers = useMemo(
    () => (data?.center ? [{ id: 'subject', coordinates: data.center, color: '#2d8cf0', label: 'Subject Property' }] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.center ? JSON.stringify(data.center) : null]
  );

  const lines = useMemo(
    () => (data?.context ? [{ id: 'context', data: data.context, color: '#666', width: 0.8 }] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.context ? JSON.stringify(data.context) : null]
  );

  // Save to localStorage whenever savedView changes
  useEffect(() => {
    if (savedView) {
      console.log('[ProjectTabMap] Saving to localStorage, key:', storageKey, 'value:', savedView);
      localStorage.setItem(storageKey, JSON.stringify(savedView));
    }
  }, [savedView, storageKey]);

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
            cursor: 'pointer'
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
              3D Oblique View
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
              borderTop: '1px solid var(--cui-border-color)'
            }}
          >
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
                  console.log('[ProjectTabMap] Saving view:', { currentPitch, currentBearing, currentZoom });
                  setPitch(currentPitch);
                  setBearing(currentBearing);
                  setSavedView({ pitch: currentPitch, bearing: currentBearing, zoom: currentZoom });
                } else {
                  console.log('[ProjectTabMap] No map ref, using defaults');
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
