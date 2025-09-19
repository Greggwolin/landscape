'use client';

import React, { useState } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  DocumentTextIcon,
  CalendarIcon,
  TagIcon,
  BuildingOfficeIcon,
  FolderIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface SearchResult {
  doc_id: number;
  doc_name: string;
  doc_type: string;
  discipline?: string;
  status: string;
  version_no: number;
  doc_date?: string;
  priority?: string;
  tags?: string[];
  project_name?: string;
  workspace_name?: string;
  created_at: string;
  updated_at: string;
  contract_value?: number;
  _formatted?: {
    doc_name?: string;
    searchable_text?: string;
  };
}

interface SearchResponse {
  success: boolean;
  source: string;
  results: SearchResult[];
  totalHits: number;
  facets?: Record<string, Record<string, number>>;
  processingTimeMs: number;
  query: string;
  pagination: {
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ResultsTableProps {
  results: SearchResponse | null;
  loading?: boolean;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onPageChange?: (offset: number) => void;
  onViewDocument?: (docId: number) => void;
  onDownloadDocument?: (docId: number) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

const SORT_FIELDS = {
  doc_name: 'Document Name',
  doc_date: 'Date',
  created_at: 'Created',
  updated_at: 'Modified',
  contract_value: 'Value',
  status: 'Status'
};

export default function ResultsTable({ 
  results, 
  loading = false,
  onSort,
  onPageChange,
  onViewDocument,
  onDownloadDocument,
  sortField,
  sortDirection
}: ResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpanded = (docId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: string) => {
    if (!onSort) return;
    
    const newDirection = 
      sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 ml-1" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getDocumentIcon = (docType: string) => {
    const type = docType.toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('image') || type.includes('photo')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    if (type.includes('archive') || type.includes('zip')) return '📦';
    return '📋';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'approved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'superseded': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
    
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const highlightText = (text: string, formatted?: string) => {
    if (!formatted) return text;
    
    // Simple highlighting - replace <em> tags with styled spans
    return formatted.replace(
      /<em>(.*?)<\/em>/g, 
      '<span class="bg-yellow-200 dark:bg-yellow-900 font-medium">$1</span>'
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Searching documents...</span>
        </div>
      </div>
    );
  }

  if (!results || !results.success) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          {results?.success === false ? 'Search failed. Please try again.' : 'No search performed yet.'}
        </div>
      </div>
    );
  }

  if (results.results.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No documents found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {results.query ? `No results found for "${results.query}"` : 'Try adjusting your search terms or filters'}
        </p>
      </div>
    );
  }

  const { results: docs, totalHits, pagination, processingTimeMs, source } = results;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Search Results
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalHits.toLocaleString()} documents found in {processingTimeMs}ms 
              {source === 'database_fallback' && ' (database fallback)'}
            </p>
          </div>
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
            <select
              onChange={(e) => {
                const [field, direction] = e.target.value.split('_');
                handleSort(field);
              }}
              value={sortField ? `${sortField}_${sortDirection}` : ''}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Default</option>
              {Object.entries(SORT_FIELDS).map(([field, label]) => (
                <React.Fragment key={field}>
                  <option value={`${field}_asc`}>{label} (A-Z)</option>
                  <option value={`${field}_desc`}>{label} (Z-A)</option>
                </React.Fragment>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type & Discipline
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {docs.map((doc) => (
              <React.Fragment key={doc.doc_id}>
                {/* Main Row */}
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">{getDocumentIcon(doc.doc_type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => toggleRowExpanded(doc.doc_id)}
                          className="text-left w-full group"
                        >
                          <div 
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightText(doc.doc_name, doc._formatted?.doc_name) 
                            }}
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            v{doc.version_no} • ID: {doc.doc_id}
                          </div>
                        </button>
                      </div>
                      <button
                        onClick={() => toggleRowExpanded(doc.doc_id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {expandedRows.has(doc.doc_id) ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {doc.doc_type}
                    </div>
                    {doc.discipline && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {doc.discipline}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                      {doc.priority && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(doc.priority)}`}>
                          {doc.priority}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {doc.project_name || 'No Project'}
                    </div>
                    {doc.workspace_name && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <FolderIcon className="h-3 w-3" />
                        {doc.workspace_name}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {doc.doc_date ? formatDate(doc.doc_date) : 'No date'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Created: {formatDate(doc.created_at)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewDocument?.(doc.doc_id)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Document"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDownloadDocument?.(doc.doc_id)}
                        className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Download Document"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded Row */}
                {expandedRows.has(doc.doc_id) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                      <div className="space-y-3">
                        {/* Tags */}
                        {doc.tags && doc.tags.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                              <TagIcon className="h-3 w-3" />
                              Tags
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contract Value */}
                        {doc.contract_value && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Contract Value
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(doc.contract_value)}
                            </div>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              Created
                            </div>
                            <div className="text-gray-700 dark:text-gray-300">
                              {formatDate(doc.created_at)}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              Modified
                            </div>
                            <div className="text-gray-700 dark:text-gray-300">
                              {formatDate(doc.updated_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalHits > pagination.limit && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, totalHits)} of {totalHits.toLocaleString()} results
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange?.(Math.max(0, pagination.offset - pagination.limit))}
                disabled={!pagination.hasPrev}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Previous
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {Math.floor(pagination.offset / pagination.limit) + 1} of {Math.ceil(totalHits / pagination.limit)}
              </span>
              
              <button
                onClick={() => onPageChange?.(pagination.offset + pagination.limit)}
                disabled={!pagination.hasNext}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}