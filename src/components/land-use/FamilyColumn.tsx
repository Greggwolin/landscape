'use client';

import React from 'react';
import { LuFamily, FAMILY_COLORS } from './LandUsePicker';

interface FamilyColumnProps {
  families: LuFamily[];
  selectedFamilyId: number | null;
  onSelectFamily: (id: number) => void;
  familySelectionCounts: Record<number, number>;
}

export default function FamilyColumn({
  families,
  selectedFamilyId,
  onSelectFamily,
  familySelectionCounts,
}: FamilyColumnProps) {
  return (
    <div className="lup-col lup-col-family">
      <div className="lup-col-header">
        <span className="lup-col-title">Families</span>
        <span className="lup-col-count">{families.length}</span>
      </div>
      <div className="lup-col-body">
        {families.map(fam => {
          const isSelected = fam.family_id === selectedFamilyId;
          const activeCount = familySelectionCounts[fam.family_id] || 0;
          const color = FAMILY_COLORS[fam.code] || 'var(--cui-secondary)';

          return (
            <button
              key={fam.family_id}
              className={`lup-family-item${isSelected ? ' active' : ''}`}
              onClick={() => onSelectFamily(fam.family_id)}
            >
              {/* Color dot */}
              <span
                className="lup-family-dot"
                style={{ backgroundColor: color }}
              />

              {/* Name + code */}
              <span className="lup-family-info">
                <span className="lup-family-name">{fam.name}</span>
                <span className="lup-family-code">{fam.code}</span>
              </span>

              {/* Selection indicator */}
              <span className="lup-family-badge">
                {activeCount > 0 ? (
                  <span className="lup-badge-active">{activeCount}</span>
                ) : (
                  <span className="lup-badge-empty">{fam.type_count}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
