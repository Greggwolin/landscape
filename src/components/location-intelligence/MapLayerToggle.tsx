/**
 * MapLayerToggle Component
 *
 * Toggle controls for map layer visibility
 */

'use client';

import React from 'react';
import type { MapLayerToggleProps, LayerVisibility } from './types';

interface LayerOption {
  key: keyof LayerVisibility;
  label: string;
  icon: React.ReactNode;
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    key: 'satellite',
    label: 'Satellite',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    key: 'hybrid',
    label: 'Hybrid',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <path d="M4 6l4-2 4 2 4-2 4 2" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: 'rings',
    label: 'Demographics Rings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="11" />
      </svg>
    ),
  },
  {
    key: 'blockGroups',
    label: 'Parcels / Block Groups',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    key: 'userPoints',
    label: 'Rental Comparables',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18" />
        <path d="M5 21V9l4-4 4 4v12" />
        <path d="M15 21V6l3-2 1 1v16" />
      </svg>
    ),
  },
];

const ANNOTATION_TOOLS = [
  {
    key: 'draw-polygon',
    label: 'Draw Polygon',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5,3 19,3 22,15 12,21 2,15" />
      </svg>
    ),
  },
  {
    key: 'draw-line',
    label: 'Draw Line',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="20" x2="20" y2="4" />
      </svg>
    ),
  },
  {
    key: 'add-marker',
    label: 'Add Marker',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'measure-distance',
    label: 'Measure Distance',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12h20" />
        <path d="M6 8v8" />
        <path d="M18 8v8" />
      </svg>
    ),
  },
];

export function MapLayerToggle({ layers, onToggle }: MapLayerToggleProps) {
  return (
    <div className="location-map-layer-toggle">
      <div className="layer-toggle-header">
        <span className="layer-toggle-title">Layers</span>
      </div>
      <div className="layer-toggle-options">
        {LAYER_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`layer-toggle-btn ${layers[option.key] ? 'active' : ''}`}
            onClick={() => onToggle(option.key)}
            title={option.label}
          >
            <span className="layer-toggle-icon">{option.icon}</span>
            <span className="layer-toggle-label">{option.label}</span>
            <span className={`layer-toggle-indicator ${layers[option.key] ? 'on' : 'off'}`} />
          </button>
        ))}
      </div>

      {/* Annotation Tools - Placeholder */}
      <div className="annotation-tools-section">
        <div className="layer-toggle-header">
          <span className="layer-toggle-title">Draw / Measure</span>
        </div>
        {ANNOTATION_TOOLS.map((tool) => (
          <button
            key={tool.key}
            type="button"
            className="annotation-tool-btn"
            disabled
            title="Coming soon"
          >
            <span className="layer-toggle-icon">{tool.icon}</span>
            <span className="layer-toggle-label">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MapLayerToggle;
