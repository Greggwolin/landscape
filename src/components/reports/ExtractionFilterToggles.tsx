'use client';

import React from 'react';
import { CBadge } from '@coreui/react';
import {
  CATEGORY_CONFIG,
  type ExtractionCategory,
  type CategoryCounts,
} from '@/hooks/useExtractionHistory';

export interface ExtractionFilterTogglesProps {
  selectedCategories: ExtractionCategory[];
  categoryCounts: CategoryCounts;
  onToggleCategory: (category: ExtractionCategory) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const ALL_CATEGORIES: ExtractionCategory[] = [
  'project',
  'physical',
  'pricing',
  'income',
  'expenses',
  'market',
  'debt',
];

export function ExtractionFilterToggles({
  selectedCategories,
  categoryCounts,
  onToggleCategory,
  onSelectAll,
  onDeselectAll,
}: ExtractionFilterTogglesProps) {
  const allSelected = selectedCategories.length === ALL_CATEGORIES.length;
  const noneSelected = selectedCategories.length === 0;
  const totalSelected = selectedCategories.reduce(
    (sum, cat) => sum + (categoryCounts[cat] || 0),
    0
  );
  const totalAll = ALL_CATEGORIES.reduce((sum, cat) => sum + (categoryCounts[cat] || 0), 0);

  return (
    <div className="extraction-filter-toggles">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="text-body-secondary small">
          Showing {totalSelected} of {totalAll} extractions
        </span>
        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-decoration-none"
            onClick={onSelectAll}
            disabled={allSelected}
          >
            Select All
          </button>
          <span className="mx-2 text-muted">|</span>
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-decoration-none"
            onClick={onDeselectAll}
            disabled={noneSelected}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((category) => {
          const config = CATEGORY_CONFIG[category];
          const count = categoryCounts[category] || 0;
          const isSelected = selectedCategories.includes(category);

          return (
            <button
              key={category}
              type="button"
              onClick={() => onToggleCategory(category)}
              className="filter-toggle"
              style={{
                backgroundColor: isSelected ? config.color : 'transparent',
                borderColor: config.color,
                color: isSelected ? '#fff' : config.color,
                opacity: count === 0 ? 0.5 : 1,
              }}
              title={config.description}
            >
              <span className="toggle-label">{config.label}</span>
              <CBadge
                className="ms-2"
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : config.color,
                  color: '#fff',
                }}
              >
                {count}
              </CBadge>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .extraction-filter-toggles {
          padding: 0.75rem;
          background: var(--cui-body-bg);
          border-radius: 0.5rem;
        }

        .filter-toggle {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.75rem;
          border: 2px solid;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
        }

        .filter-toggle:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .toggle-label {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
