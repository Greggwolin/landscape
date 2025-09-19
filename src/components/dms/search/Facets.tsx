'use client';

import React from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface FacetValue {
  value: string;
  count: number;
  selected?: boolean;
}

interface Facet {
  name: string;
  displayName: string;
  values: FacetValue[];
  expanded?: boolean;
}

interface FacetsProps {
  facets: Record<string, Record<string, number>>;
  selectedFilters: Record<string, string[]>;
  onFilterChange: (facetName: string, value: string, selected: boolean) => void;
  onClearFilters: () => void;
  expandedFacets?: string[];
  onToggleExpanded?: (facetName: string) => void;
}

const FACET_CONFIG = {
  doc_type: { displayName: 'Document Type', icon: '📄' },
  discipline: { displayName: 'Discipline', icon: '🏗️' },
  status: { displayName: 'Status', icon: '📊' },
  priority: { displayName: 'Priority', icon: '⚡' },
  tags: { displayName: 'Tags', icon: '🏷️' },
  project_name: { displayName: 'Project', icon: '🏘️' },
  workspace_name: { displayName: 'Workspace', icon: '📁' }
};

export default function Facets({ 
  facets, 
  selectedFilters, 
  onFilterChange, 
  onClearFilters,
  expandedFacets = [],
  onToggleExpanded 
}: FacetsProps) {
  const hasActiveFilters = Object.values(selectedFilters).some(filters => filters.length > 0);

  const getFacetConfig = (facetName: string) => {
    return FACET_CONFIG[facetName as keyof typeof FACET_CONFIG] || { 
      displayName: facetName, 
      icon: '📋' 
    };
  };

  const isExpanded = (facetName: string) => {
    return expandedFacets.includes(facetName);
  };

  const toggleExpanded = (facetName: string) => {
    onToggleExpanded?.(facetName);
  };

  const renderFacetValue = (facetName: string, value: string, count: number) => {
    const isSelected = selectedFilters[facetName]?.includes(value) || false;
    
    return (
      <label
        key={value}
        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group"
      >
        <div className="flex items-center flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onFilterChange(facetName, value, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded mr-2 flex-shrink-0"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0" title={value}>
            {value || 'Unspecified'}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0 font-medium">
          {count.toLocaleString()}
        </span>
      </label>
    );
  };

  if (Object.keys(facets).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          No filters available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Active Filters
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(selectedFilters).map(([facetName, values]) =>
              values.map(value => (
                <span
                  key={`${facetName}-${value}`}
                  className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full"
                >
                  {getFacetConfig(facetName).displayName}: {value}
                  <button
                    onClick={() => onFilterChange(facetName, value, false)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Facet Groups */}
      <div className="space-y-3">
        {Object.entries(facets).map(([facetName, facetValues]) => {
          const config = getFacetConfig(facetName);
          const expanded = isExpanded(facetName);
          const valueEntries = Object.entries(facetValues).sort((a, b) => b[1] - a[1]);
          const visibleEntries = expanded ? valueEntries : valueEntries.slice(0, 5);
          const hasMore = valueEntries.length > 5;

          return (
            <div
              key={facetName}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Facet Header */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {config.displayName}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {valueEntries.length}
                    </span>
                  </div>
                  {hasMore && (
                    <button
                      onClick={() => toggleExpanded(facetName)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {expanded ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Facet Values */}
              <div className="p-2 space-y-0.5 max-h-64 overflow-y-auto">
                {visibleEntries.map(([value, count]) =>
                  renderFacetValue(facetName, value, count)
                )}
                
                {hasMore && !expanded && (
                  <button
                    onClick={() => toggleExpanded(facetName)}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 py-2 text-center font-medium"
                  >
                    Show {valueEntries.length - 5} more...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}