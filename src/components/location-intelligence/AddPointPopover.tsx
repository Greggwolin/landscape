/**
 * AddPointPopover Component
 *
 * Popover form for adding user map points
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { AddPointPopoverProps, UserMapPoint } from './types';
import { POINT_CATEGORIES } from './constants';

export function AddPointPopover({
  isOpen,
  coordinates,
  onClose,
  onSave,
  reverseGeocodeResult,
}: AddPointPopoverProps) {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<UserMapPoint['category']>('poi');
  const [notes, setNotes] = useState('');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setLabel(reverseGeocodeResult?.address || '');
      setCategory('poi');
      setNotes('');
    }
  }, [isOpen, reverseGeocodeResult]);

  // Update label if reverse geocode completes after opening
  useEffect(() => {
    if (isOpen && reverseGeocodeResult?.address && !label) {
      setLabel(reverseGeocodeResult.address);
    }
  }, [isOpen, reverseGeocodeResult, label]);

  if (!isOpen || !coordinates) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    onSave({
      label: label.trim(),
      category,
      coordinates,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const selectedCategoryConfig = POINT_CATEGORIES.find((c) => c.value === category);

  return (
    <div className="add-point-popover-overlay" onClick={onClose}>
      <div
        className="add-point-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popover-header">
          <h4 className="popover-title">Add Point</h4>
          <button type="button" className="popover-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="popover-field">
            <label htmlFor="point-label">Label</label>
            <input
              id="point-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter point label..."
              autoFocus
            />
          </div>

          <div className="popover-field">
            <label>Category</label>
            <div className="category-buttons">
              {POINT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`category-btn ${category === cat.value ? 'selected' : ''}`}
                  style={{
                    '--category-color': cat.color,
                  } as React.CSSProperties}
                  onClick={() => setCategory(cat.value)}
                >
                  <span
                    className="category-dot"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="popover-field">
            <label htmlFor="point-notes">Notes (optional)</label>
            <textarea
              id="point-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={2}
            />
          </div>

          {reverseGeocodeResult && (
            <div className="popover-address">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="address-text">{reverseGeocodeResult.display_name}</span>
            </div>
          )}

          <div className="popover-coords">
            <span>
              {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
            </span>
          </div>

          <div className="popover-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={!label.trim()}
              style={{
                '--btn-color': selectedCategoryConfig?.color || '#3b82f6',
              } as React.CSSProperties}
            >
              Add Point
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPointPopover;
