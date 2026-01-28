/**
 * FeatureModal Component
 *
 * Modal for creating/editing map features (points, lines, polygons).
 * Shows measurements for lines (distance) and polygons (area).
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { FeatureCategory } from './types';
import { CATEGORIES_BY_FEATURE_TYPE, FEATURE_CATEGORIES } from './constants';

export type FeatureGeometryType = 'Point' | 'LineString' | 'Polygon';

// Map from internal geometry types to our FeatureType for backwards compat
type LegacyFeatureType = 'point' | 'line' | 'polygon' | 'measurement';

interface FeatureModalProps {
  isOpen: boolean;
  featureType: FeatureGeometryType | LegacyFeatureType;
  coordinates: GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | [number, number] | null;
  measurements?: {
    length_ft?: number;
    length_miles?: number;
    area_sqft?: number;
    area_acres?: number;
    perimeter_ft?: number;
  };
  onClose: () => void;
  onSave: (data: {
    label: string;
    category: FeatureCategory;
    notes: string;
  }) => void;
  isSaving?: boolean;
}

// Normalize feature type to GeoJSON geometry type
function normalizeFeatureType(type: FeatureGeometryType | LegacyFeatureType): FeatureGeometryType {
  switch (type) {
    case 'point':
      return 'Point';
    case 'line':
    case 'measurement':
      return 'LineString';
    case 'polygon':
      return 'Polygon';
    default:
      return type;
  }
}

// Get display label for feature type
function getFeatureTypeLabel(type: FeatureGeometryType): string {
  switch (type) {
    case 'Point':
      return 'Point';
    case 'LineString':
      return 'Line';
    case 'Polygon':
      return 'Polygon';
    default:
      return 'Feature';
  }
}

export function FeatureModal({
  isOpen,
  featureType,
  coordinates,
  measurements,
  onClose,
  onSave,
  isSaving = false,
}: FeatureModalProps) {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<FeatureCategory>('annotation');
  const [notes, setNotes] = useState('');

  // Normalize the feature type
  const normalizedType = normalizeFeatureType(featureType);
  const displayLabel = getFeatureTypeLabel(normalizedType);

  // Get categories for this feature type
  const categories = useMemo(() => {
    return CATEGORIES_BY_FEATURE_TYPE[normalizedType] || FEATURE_CATEGORIES;
  }, [normalizedType]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel('');
      setNotes('');
      // Set default category for this feature type
      if (categories.length > 0) {
        setCategory(categories[0].value);
      }
    }
  }, [isOpen, categories]);

  if (!isOpen || !coordinates) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || isSaving) return;

    onSave({
      label: label.trim(),
      category,
      notes: notes.trim(),
    });
  };

  // Format coordinates for display
  const formatCoordinates = (): string => {
    if (!coordinates) return '';

    // Handle Point (simple [lng, lat] array)
    if (normalizedType === 'Point') {
      if (Array.isArray(coordinates) && typeof coordinates[0] === 'number') {
        const [lng, lat] = coordinates as [number, number];
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    }

    // Handle LineString (array of positions)
    if (normalizedType === 'LineString') {
      if (Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
        const coords = coordinates as GeoJSON.Position[];
        return `${coords.length} vertices`;
      }
    }

    // Handle Polygon (array of rings, each ring is array of positions)
    if (normalizedType === 'Polygon') {
      if (Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
        const coords = coordinates as GeoJSON.Position[][] | GeoJSON.Position[];
        // Check if it's a ring (array of arrays of numbers)
        if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
          const ring = (coords as GeoJSON.Position[][])[0];
          return `${ring ? ring.length - 1 : 0} vertices`;
        }
      }
    }

    return '';
  };

  // Format measurements for display
  const formatMeasurements = (): React.ReactNode => {
    if (!measurements) return null;

    if (normalizedType === 'LineString' && measurements.length_ft) {
      return (
        <div className="feature-modal-measurement">
          <span className="measurement-label">Length:</span>
          <span className="measurement-value">
            {measurements.length_ft.toLocaleString()} ft
            {measurements.length_miles !== undefined && (
              <span className="measurement-secondary">
                {' '}({measurements.length_miles.toFixed(2)} mi)
              </span>
            )}
          </span>
        </div>
      );
    }

    if (normalizedType === 'Polygon' && measurements.area_sqft) {
      return (
        <>
          <div className="feature-modal-measurement">
            <span className="measurement-label">Area:</span>
            <span className="measurement-value">
              {measurements.area_acres?.toFixed(2)} acres
              <span className="measurement-secondary">
                {' '}({measurements.area_sqft.toLocaleString()} sq ft)
              </span>
            </span>
          </div>
          {measurements.perimeter_ft && (
            <div className="feature-modal-measurement">
              <span className="measurement-label">Perimeter:</span>
              <span className="measurement-value">
                {measurements.perimeter_ft.toLocaleString()} ft
              </span>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  const hasMeasurements = measurements?.length_ft || measurements?.area_sqft;

  return (
    <div className="feature-modal-overlay" onClick={onClose}>
      <div className="feature-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feature-modal-header">
          <h3>Save {displayLabel}</h3>
          <button type="button" className="feature-modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Measurements display */}
          {hasMeasurements && (
            <div className="feature-modal-measurements">
              {formatMeasurements()}
            </div>
          )}

          <div className="feature-modal-field">
            <label htmlFor="feature-label">Label *</label>
            <input
              id="feature-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter a name for this feature..."
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="feature-modal-field">
            <label htmlFor="feature-category">Category</label>
            <select
              id="feature-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FeatureCategory)}
              disabled={isSaving}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="feature-modal-field">
            <label htmlFor="feature-notes">Notes (optional)</label>
            <textarea
              id="feature-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Coordinates display */}
          <div className="feature-modal-coords">
            <span>{formatCoordinates()}</span>
          </div>

          <div className="feature-modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={!label.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : `Save ${displayLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FeatureModal;
