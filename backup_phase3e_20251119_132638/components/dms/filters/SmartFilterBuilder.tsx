'use client';

import React, { useState } from 'react';

interface FilterQuery {
  q?: string;
  doc_type?: string;
  discipline?: string;
  status?: 'draft' | 'processing' | 'indexed' | 'failed' | 'archived';
  project_id?: number;
  workspace_id?: number;
  folder_id?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  date_from?: string;
  date_to?: string;
  tags?: string[];
  profile?: Record<string, any>;
}

interface SmartFilterBuilderProps {
  filterId?: number; // If editing existing filter
  onSave?: (filterId: number) => void;
  onCancel?: () => void;
}

/**
 * Smart Filter Builder Component
 * Create and edit smart filters with visual query builder
 */
export default function SmartFilterBuilder({
  filterId,
  onSave,
  onCancel,
}: SmartFilterBuilderProps) {
  const [filterName, setFilterName] = useState('');
  const [query, setQuery] = useState<FilterQuery>({});
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing filter if editing
  React.useEffect(() => {
    if (filterId) {
      fetchFilter();
    }
  }, [filterId]);

  async function fetchFilter() {
    try {
      const response = await fetch('/api/dms/filters');
      const data = await response.json();
      const filter = data.filters.find((f: any) => f.filter_id === filterId);

      if (filter) {
        setFilterName(filter.name);
        setQuery(filter.query || {});
        if (filter.query?.tags) {
          setTagInput(filter.query.tags.join(', '));
        }
      }
    } catch (err) {
      console.error('Error fetching filter:', err);
      setError('Failed to load filter');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!filterName.trim()) {
      setError('Filter name is required');
      return;
    }

    try {
      setIsSaving(true);

      // Parse tags
      const tags = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const finalQuery: FilterQuery = {
        ...query,
        tags: tags.length > 0 ? tags : undefined,
      };

      const payload = {
        name: filterName,
        query: finalQuery,
      };

      let response;
      if (filterId) {
        // Update existing filter
        response = await fetch('/api/dms/filters', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter_id: filterId, ...payload }),
        });
      } else {
        // Create new filter
        response = await fetch('/api/dms/filters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save filter');
      }

      const data = await response.json();
      if (onSave) {
        onSave(data.filter.filter_id);
      }
    } catch (err) {
      console.error('Error saving filter:', err);
      setError(err instanceof Error ? err.message : 'Failed to save filter');
    } finally {
      setIsSaving(false);
    }
  }

  function updateQuery(updates: Partial<FilterQuery>) {
    setQuery({ ...query, ...updates });
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {filterId ? 'Edit Smart Filter' : 'New Smart Filter'}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create a saved search query that updates automatically
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Filter Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter Name *
        </label>
        <input
          type="text"
          id="name"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          required
          maxLength={255}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Recent Architectural Plans"
        />
      </div>

      {/* Query Builder */}
      <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Filter Criteria
        </h3>

        {/* Full-Text Search */}
        <div>
          <label htmlFor="q" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search Text
          </label>
          <input
            type="text"
            id="q"
            value={query.q || ''}
            onChange={(e) => updateQuery({ q: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search in document names and content"
          />
        </div>

        {/* Document Type */}
        <div>
          <label htmlFor="doc_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Document Type
          </label>
          <input
            type="text"
            id="doc_type"
            value={query.doc_type || ''}
            onChange={(e) => updateQuery({ doc_type: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., plan, report, contract"
          />
        </div>

        {/* Discipline */}
        <div>
          <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Discipline
          </label>
          <input
            type="text"
            id="discipline"
            value={query.discipline || ''}
            onChange={(e) => updateQuery({ discipline: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., architecture, civil, mechanical"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            id="status"
            value={query.status || ''}
            onChange={(e) => updateQuery({ status: e.target.value as any || undefined })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Any status</option>
            <option value="draft">Draft</option>
            <option value="processing">Processing</option>
            <option value="indexed">Indexed</option>
            <option value="failed">Failed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <select
            id="priority"
            value={query.priority || ''}
            onChange={(e) => updateQuery({ priority: e.target.value as any || undefined })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Any priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., urgent, final, revised"
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              id="date_from"
              value={query.date_from ? query.date_from.split('T')[0] : ''}
              onChange={(e) => updateQuery({ date_from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              id="date_to"
              value={query.date_to ? query.date_to.split('T')[0] : ''}
              onChange={(e) => updateQuery({ date_to: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Query Preview */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Query Preview
        </h4>
        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-auto max-h-40">
          {JSON.stringify(query, null, 2)}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                     disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg"
        >
          {isSaving ? 'Saving...' : filterId ? 'Update Filter' : 'Create Filter'}
        </button>
      </div>
    </form>
  );
}
