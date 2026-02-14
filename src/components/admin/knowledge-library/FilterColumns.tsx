'use client';

import React from 'react';

export interface FacetItem {
  value: string;
  count: number;
  level?: string;
  id?: number;
  name?: string;
}

export interface Facets {
  geography: FacetItem[];
  property_type: FacetItem[];
  format: FacetItem[];
  doc_type: FacetItem[];
  project: FacetItem[];
}

export interface ActiveFilters {
  geo: string[];
  property_type: string[];
  format: string[];
  doc_type: string[];
  project_id: string[];
}

interface FilterColumnsProps {
  facets: Facets;
  activeFilters: ActiveFilters;
  onToggleFilter: (dimension: keyof ActiveFilters, value: string) => void;
}

interface ColumnConfig {
  title: string;
  dimension: keyof ActiveFilters;
  items: FacetItem[];
  getLabel: (item: FacetItem) => string;
  getValue: (item: FacetItem) => string;
}

export default function FilterColumns({ facets, activeFilters, onToggleFilter }: FilterColumnsProps) {
  const columns: ColumnConfig[] = [
    {
      title: 'Geography',
      dimension: 'geo',
      items: facets.geography,
      getLabel: (item) => item.value,
      getValue: (item) => item.value,
    },
    {
      title: 'Property Type',
      dimension: 'property_type',
      items: facets.property_type,
      getLabel: (item) => item.value,
      getValue: (item) => item.value,
    },
    {
      title: 'Format',
      dimension: 'format',
      items: facets.format,
      getLabel: (item) => item.value,
      getValue: (item) => item.value,
    },
    {
      title: 'Document Type',
      dimension: 'doc_type',
      items: facets.doc_type,
      getLabel: (item) => item.value,
      getValue: (item) => item.value,
    },
    {
      title: 'Project',
      dimension: 'project_id',
      items: facets.project,
      getLabel: (item) => item.name || item.value,
      getValue: (item) => item.id != null ? String(item.id) : item.value,
    },
  ];

  return (
    <div className="kl-filter-columns">
      {columns.map(({ title, dimension, items, getLabel, getValue }) => {
        const activeValues = activeFilters[dimension];
        const availableCount = items.filter((i) => i.count > 0).length;

        return (
          <div key={dimension} className="kl-filter-column">
            <div className="kl-filter-column-header">
              <span>{title}</span>
              <span className="kl-filter-column-count">{availableCount} available</span>
            </div>
            <div className="kl-filter-chips">
              {items.length === 0 ? (
                <div style={{ padding: '8px', color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
                  No options
                </div>
              ) : (
                items.map((item) => {
                  const value = getValue(item);
                  const label = getLabel(item);
                  const isActive = activeValues.includes(value);
                  const isDimmed = item.count === 0 && !isActive;

                  return (
                    <button
                      key={value}
                      className={`kl-filter-chip${isActive ? ' active' : ''}${isDimmed ? ' dimmed' : ''}`}
                      onClick={() => onToggleFilter(dimension, value)}
                      disabled={isDimmed}
                      type="button"
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                      <span className="kl-chip-count">{item.count}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
