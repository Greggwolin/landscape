/**
 * ProjectTabMap Component
 *
 * Oblique map integration for Project Overview tab with controls
 */

'use client';

import React, { useRef, useState } from 'react';
import { MapOblique, MapObliqueRef } from './MapOblique';
import { useProjectMapData } from '@/lib/map/hooks';

export interface ProjectTabMapProps {
  projectId: string;
  styleUrl: string;
}

export default function ProjectTabMap({ projectId, styleUrl }: ProjectTabMapProps) {
  const { data, error, isLoading } = useProjectMapData(projectId);
  const mapRef = useRef<MapObliqueRef>(null);
  const [pitch, setPitch] = useState(60);
  const [bearing, setBearing] = useState(30);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [savedView, setSavedView] = useState<{ pitch: number; bearing: number } | null>(null);

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
          pitch={pitch}
          bearing={bearing}
          styleUrl={styleUrl}
          showExtrusions={false}
          markers={[
            { id: 'subject', coordinates: data.center, color: '#2d8cf0', label: 'Subject Property' }
          ]}
          lines={
            data.context
              ? [{ id: 'context', data: data.context, color: '#666', width: 0.8 }]
              : []
          }
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
              onClick={() => mapRef.current?.flyToSubject()}
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
              Reset View
            </button>

            {/* Save View Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSavedView({ pitch, bearing });
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

            {/* Pitch Slider */}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Pitch: {pitch}°
              </label>
              <input
                type="range"
                min={0}
                max={75}
                value={pitch}
                onChange={(e) => {
                  const newPitch = Number(e.target.value);
                  setPitch(newPitch);
                  mapRef.current?.setPitch(newPitch);
                }}
                className="w-full"
                style={{
                  accentColor: 'var(--cui-primary)'
                }}
              />
            </div>

            {/* Bearing Slider */}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Bearing: {bearing}°
              </label>
              <input
                type="range"
                min={-180}
                max={180}
                value={bearing}
                onChange={(e) => {
                  const newBearing = Number(e.target.value);
                  setBearing(newBearing);
                  mapRef.current?.setBearing(newBearing);
                }}
                className="w-full"
                style={{
                  accentColor: 'var(--cui-primary)'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
