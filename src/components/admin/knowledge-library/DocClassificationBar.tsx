'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface GeoTag {
  doc_geo_tag_id: number;
  geo_level: string;
  geo_value: string;
  geo_source: string;
}

interface ClassificationOptions {
  doc_types: string[];
  property_types: { code: string; label: string }[];
}

interface DocClassificationBarProps {
  docId: number;
  currentDocType: string;
  currentPropertyType?: string | null;
  onClassificationChange?: () => void;
}

export default function DocClassificationBar({
  docId,
  currentDocType,
  currentPropertyType,
  onClassificationChange,
}: DocClassificationBarProps) {
  const [docType, setDocType] = useState(currentDocType || '');
  const [propertyType, setPropertyType] = useState(currentPropertyType || '');
  const [geoTags, setGeoTags] = useState<GeoTag[]>([]);
  const [options, setOptions] = useState<ClassificationOptions | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [isAddingGeo, setIsAddingGeo] = useState(false);
  const [newGeoLevel, setNewGeoLevel] = useState('state');
  const [newGeoValue, setNewGeoValue] = useState('');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch classification options + geo tags on mount
  useEffect(() => {
    void (async () => {
      try {
        const [optionsRes, tagsRes] = await Promise.all([
          fetch(`${DJANGO_API_URL}/api/knowledge/library/classification-options/`),
          fetch(`${DJANGO_API_URL}/api/knowledge/library/documents/${docId}/geo-tags/`),
        ]);
        if (optionsRes.ok) {
          const data = await optionsRes.json();
          setOptions(data);
        }
        if (tagsRes.ok) {
          const data = await tagsRes.json();
          setGeoTags(data.tags || []);
        }
      } catch (err) {
        console.error('Failed to load classification data:', err);
      }
    })();
  }, [docId]);

  const flashSaved = useCallback(() => {
    setShowSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
  }, []);

  const handleDocTypeChange = async (newType: string) => {
    setDocType(newType);
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/knowledge/library/documents/${docId}/classification/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_type: newType }),
        },
      );
      if (res.ok) {
        flashSaved();
        onClassificationChange?.();
      }
    } catch (err) {
      console.error('Failed to update doc type:', err);
    }
  };

  const handlePropertyTypeChange = async (newPt: string) => {
    setPropertyType(newPt);
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/knowledge/library/documents/${docId}/classification/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property_type: newPt || null }),
        },
      );
      if (res.ok) {
        flashSaved();
        onClassificationChange?.();
      }
    } catch (err) {
      console.error('Failed to update property type:', err);
    }
  };

  const handleRemoveGeoTag = async (tagId: number) => {
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/knowledge/library/documents/${docId}/geo-tags/${tagId}/`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        setGeoTags((prev) => prev.filter((t) => t.doc_geo_tag_id !== tagId));
        flashSaved();
        onClassificationChange?.();
      }
    } catch (err) {
      console.error('Failed to remove geo tag:', err);
    }
  };

  const handleAddGeoTag = async () => {
    const value = newGeoValue.trim();
    if (!value) return;

    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/knowledge/library/documents/${docId}/geo-tags/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geo_level: newGeoLevel, geo_value: value }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.created) {
          setGeoTags((prev) => [
            ...prev,
            {
              doc_geo_tag_id: data.doc_geo_tag_id,
              geo_level: newGeoLevel,
              geo_value: value,
              geo_source: 'user_assigned',
            },
          ]);
        }
        setNewGeoValue('');
        setIsAddingGeo(false);
        flashSaved();
        onClassificationChange?.();
      }
    } catch (err) {
      console.error('Failed to add geo tag:', err);
    }
  };

  // Don't render for platform knowledge docs (negative IDs)
  if (docId < 0) return null;

  return (
    <div className="kl-classification-bar">
      {/* Doc Type */}
      <div className="kl-classification-field">
        <span className="kl-classification-label">Type:</span>
        <select
          className="kl-classification-select"
          value={docType}
          onChange={(e) => void handleDocTypeChange(e.target.value)}
        >
          <option value="general">General</option>
          {options?.doc_types.map((dt) => (
            <option key={dt} value={dt}>{dt}</option>
          ))}
        </select>
      </div>

      {/* Property Type */}
      <div className="kl-classification-field">
        <span className="kl-classification-label">Property:</span>
        <select
          className="kl-classification-select"
          value={propertyType}
          onChange={(e) => void handlePropertyTypeChange(e.target.value)}
        >
          <option value="">—</option>
          {options?.property_types.map((pt) => (
            <option key={pt.code} value={pt.code}>{pt.label}</option>
          ))}
        </select>
      </div>

      {/* Geo Tags */}
      <div className="kl-classification-field">
        <span className="kl-classification-label">Geo:</span>
        <div className="kl-geo-tags">
          {geoTags.map((tag) => (
            <span key={tag.doc_geo_tag_id} className="kl-geo-tag">
              {tag.geo_value}
              <button
                type="button"
                className="kl-geo-tag-remove"
                onClick={() => void handleRemoveGeoTag(tag.doc_geo_tag_id)}
                title="Remove tag"
              >
                ×
              </button>
            </span>
          ))}
          {isAddingGeo ? (
            <span className="kl-geo-add-form">
              <select
                className="kl-geo-add-select"
                value={newGeoLevel}
                onChange={(e) => setNewGeoLevel(e.target.value)}
              >
                <option value="state">State</option>
                <option value="city">City</option>
                <option value="county">County</option>
                <option value="msa">MSA</option>
                <option value="zip">ZIP</option>
              </select>
              <input
                className="kl-geo-add-input"
                type="text"
                value={newGeoValue}
                onChange={(e) => setNewGeoValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleAddGeoTag();
                  if (e.key === 'Escape') { setIsAddingGeo(false); setNewGeoValue(''); }
                }}
                placeholder="Value..."
                autoFocus
              />
              <button
                type="button"
                className="kl-geo-tag-add"
                onClick={() => void handleAddGeoTag()}
              >
                Add
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="kl-geo-tag-add"
              onClick={() => setIsAddingGeo(true)}
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Saved indicator */}
      <span className={`kl-classification-saved${showSaved ? ' visible' : ''}`}>
        Updated
      </span>
    </div>
  );
}
