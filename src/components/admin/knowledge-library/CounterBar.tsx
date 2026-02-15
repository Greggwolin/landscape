'use client';

import React from 'react';
import { CButton } from '@coreui/react';
import type { ActiveFilters } from './FilterColumns';

interface CounterBarProps {
  totalCount: number;
  activeFilters: ActiveFilters;
  selectedCount: number;
  onDownloadSelected: () => void;
  onClearFilters: () => void;
}

function buildFilterSummary(filters: ActiveFilters): string {
  const parts: string[] = [];
  if (filters.geo.length > 0) parts.push(filters.geo.join(', '));
  if (filters.property_type.length > 0) parts.push(filters.property_type.join(', '));
  if (filters.format.length > 0) parts.push(filters.format.join(', '));
  if (filters.doc_type.length > 0) parts.push(filters.doc_type.join(', '));
  if (filters.project_id.length > 0) parts.push(`${filters.project_id.length} project(s)`);
  return parts.length > 0 ? parts.join(' + ') : 'all documents';
}

function hasActiveFilters(filters: ActiveFilters): boolean {
  return (
    filters.geo.length > 0 ||
    filters.property_type.length > 0 ||
    filters.format.length > 0 ||
    filters.doc_type.length > 0 ||
    filters.project_id.length > 0
  );
}

export default function CounterBar({
  totalCount,
  activeFilters,
  selectedCount,
  onDownloadSelected,
  onClearFilters,
}: CounterBarProps) {
  const summary = buildFilterSummary(activeFilters);
  const filtersActive = hasActiveFilters(activeFilters);

  return (
    <div className="kl-counter-bar">
      <div>
        <strong>Scope:</strong> {totalCount} document{totalCount !== 1 ? 's' : ''} matching{' '}
        <span className="kl-counter-bar-summary">{summary}</span>
      </div>
      <div className="kl-counter-bar-actions">
        {selectedCount > 0 && (
          <CButton color="primary" size="sm" onClick={onDownloadSelected}>
            Download Selected ({selectedCount})
          </CButton>
        )}
        {filtersActive && (
          <button
            type="button"
            className="kl-clear-filters"
            onClick={onClearFilters}
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
