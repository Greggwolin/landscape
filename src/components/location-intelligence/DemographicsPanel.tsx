/**
 * DemographicsPanel Component
 *
 * Displays ring demographics data with selectable radius
 */

'use client';

import React from 'react';
import type { DemographicsPanelProps, RingDemographics } from './types';
import { RING_RADII, RING_COLORS, DEMOGRAPHIC_FIELDS, formatDemographicValue } from './constants';

function RingSelector({
  rings,
  selectedRadius,
  onSelect,
}: {
  rings: RingDemographics[];
  selectedRadius: number | null;
  onSelect: (radius: number | null) => void;
}) {
  return (
    <div className="demographics-ring-selector">
      {RING_RADII.map((radius) => {
        const ring = rings.find((r) => r.radius_miles === radius);
        const isSelected = selectedRadius === radius;
        const colors = RING_COLORS[radius];

        return (
          <button
            key={radius}
            type="button"
            className={`ring-selector-btn ${isSelected ? 'selected' : ''}`}
            style={{
              '--ring-color': colors.stroke,
              borderColor: isSelected ? colors.stroke : 'var(--cui-border-color)',
              backgroundColor: isSelected ? colors.fill : 'transparent',
            } as React.CSSProperties}
            onClick={() => onSelect(isSelected ? null : radius)}
          >
            <span className="ring-radius">{radius} mi</span>
            {ring && (
              <span className="ring-pop">
                {ring.population?.toLocaleString() ?? '—'} pop
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DemographicsGrid({ ring }: { ring: RingDemographics }) {
  return (
    <div className="demographics-grid">
      {DEMOGRAPHIC_FIELDS.map((field) => {
        const value = ring[field.key as keyof RingDemographics];
        const numValue = typeof value === 'number' ? value : null;

        return (
          <div key={field.key} className="demographics-stat">
            <span className="stat-label">{field.label}</span>
            <span className="stat-value">
              {formatDemographicValue(numValue, field.format)}
            </span>
          </div>
        );
      })}
      {ring.block_groups_included !== null && (
        <div className="demographics-stat meta">
          <span className="stat-label">Block Groups</span>
          <span className="stat-value">{ring.block_groups_included}</span>
        </div>
      )}
      {ring.total_land_area_sqmi !== null && (
        <div className="demographics-stat meta">
          <span className="stat-label">Land Area</span>
          <span className="stat-value">{ring.total_land_area_sqmi.toFixed(1)} sq mi</span>
        </div>
      )}
    </div>
  );
}

function ComparisonTable({ rings }: { rings: RingDemographics[] }) {
  return (
    <div className="demographics-comparison">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Metric</th>
            {RING_RADII.map((radius) => (
              <th key={radius} style={{ color: RING_COLORS[radius].stroke }}>
                {radius} mi
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DEMOGRAPHIC_FIELDS.map((field) => (
            <tr key={field.key}>
              <td className="metric-label">{field.label}</td>
              {RING_RADII.map((radius) => {
                const ring = rings.find((r) => r.radius_miles === radius);
                const value = ring?.[field.key as keyof RingDemographics];
                const numValue = typeof value === 'number' ? value : null;

                return (
                  <td key={radius} className="metric-value">
                    {formatDemographicValue(numValue, field.format)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DemographicsPanel({
  demographics,
  isLoading,
  error,
  selectedRadius,
  onRadiusSelect,
}: DemographicsPanelProps) {
  if (isLoading) {
    return (
      <div className="demographics-panel loading">
        <div className="demographics-loading">
          <div className="loading-spinner" />
          <span>Loading demographics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="demographics-panel error">
        <div className="demographics-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!demographics || !demographics.rings.length) {
    return (
      <div className="demographics-panel empty">
        <div className="demographics-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
          </svg>
          <span>No demographics data available</span>
          <p className="empty-hint">
            Demographics require block group data to be loaded for this area.
          </p>
        </div>
      </div>
    );
  }

  const selectedRing = selectedRadius
    ? demographics.rings.find((r) => r.radius_miles === selectedRadius)
    : null;

  return (
    <div className="demographics-panel">
      <div className="demographics-header">
        <h3 className="demographics-title">Ring Demographics</h3>
        {demographics.cached && (
          <span className="demographics-badge cached">Cached</span>
        )}
        <span className="demographics-source">{demographics.source}</span>
      </div>

      <RingSelector
        rings={demographics.rings}
        selectedRadius={selectedRadius}
        onSelect={onRadiusSelect}
      />

      {selectedRing ? (
        <DemographicsGrid ring={selectedRing} />
      ) : (
        <ComparisonTable rings={demographics.rings} />
      )}

      <div className="demographics-footer">
        <span className="calculated-at">
          Updated: {new Date(demographics.calculated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export default DemographicsPanel;
