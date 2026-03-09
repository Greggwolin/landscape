'use client';

import React, { useState, useEffect } from 'react';
import { LuFamily, LuType, ProjectTypeSelection, FAMILY_COLORS } from './LandUsePicker';

const DJANGO = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth_tokens');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.access) headers.Authorization = `Bearer ${parsed.access}`;
      }
    } catch { /* ignore */ }
  }
  return headers;
}

interface TypeColumnProps {
  family: LuFamily | null;
  selectedTypeId: number | null;
  onSelectType: (id: number | null) => void;
  allTypeSelections: ProjectTypeSelection[];
  parcelCounts: Record<string, number>;
  onToggleType: (typeId: number, familyId: number, isActive: boolean) => void;
}

export default function TypeColumn({
  family,
  selectedTypeId,
  onSelectType,
  allTypeSelections,
  parcelCounts,
  onToggleType,
}: TypeColumnProps) {
  const [types, setTypes] = useState<LuType[]>([]);
  const [loading, setLoading] = useState(false);

  // Load types when family changes
  useEffect(() => {
    if (!family) {
      setTypes([]);
      return;
    }
    setLoading(true);
    fetch(`${DJANGO}/api/landuse/types/?family_id=${family.family_id}`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setTypes(list);
      })
      .catch(err => console.error('Failed to load types:', err))
      .finally(() => setLoading(false));
  }, [family]);

  if (!family) {
    return (
      <div className="lup-col lup-col-type">
        <div className="lup-col-header">
          <span className="lup-col-title">Types</span>
        </div>
        <div className="lup-col-empty">
          Select a family to see its types
        </div>
      </div>
    );
  }

  const familyColor = FAMILY_COLORS[family.code] || 'var(--cui-secondary)';

  // Build lookup for active selections
  const selectionMap = new Map<number, ProjectTypeSelection>();
  for (const sel of allTypeSelections) {
    if (sel.family_id === family.family_id) {
      selectionMap.set(sel.type_id, sel);
    }
  }

  return (
    <div className="lup-col lup-col-type">
      <div className="lup-col-header">
        <span className="lup-col-title">{family.name} Types</span>
        <span className="lup-col-count">{types.length}</span>
      </div>
      <div className="lup-col-body">
        {loading ? (
          <div className="lup-col-loading">Loading types...</div>
        ) : types.length === 0 ? (
          <div className="lup-col-empty">No types defined for {family.name}</div>
        ) : (
          types.map(type => {
            const sel = selectionMap.get(type.type_id);
            const isActive = sel?.is_active ?? false;
            const isSelected = type.type_id === selectedTypeId;
            const parcels = parcelCounts[type.code] || 0;
            const productCount = sel?.product_selections?.filter(p => p.is_active).length || 0;

            return (
              <div
                key={type.type_id}
                className={`lup-type-item${isSelected ? ' selected' : ''}${isActive ? ' active' : ''}`}
                onClick={() => onSelectType(type.type_id)}
              >
                <div className="lup-type-left">
                  {/* Toggle switch */}
                  <button
                    className={`lup-toggle${isActive ? ' on' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleType(type.type_id, family.family_id, !isActive);
                    }}
                    title={isActive ? 'Deactivate' : 'Activate'}
                  >
                    <span className="lup-toggle-thumb" />
                  </button>

                  {/* Type info */}
                  <div className="lup-type-info">
                    <span className="lup-type-name">{type.name}</span>
                    <span
                      className="lup-type-code-badge"
                      style={{ backgroundColor: familyColor }}
                    >
                      {type.code}
                    </span>
                  </div>
                </div>

                <div className="lup-type-right">
                  {productCount > 0 && (
                    <span className="lup-type-products" title={`${productCount} products selected`}>
                      {productCount} prod
                    </span>
                  )}
                  {parcels > 0 && (
                    <span className="lup-type-parcels" title={`${parcels} parcels using this type`}>
                      {parcels} parcels
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
