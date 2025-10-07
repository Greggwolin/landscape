'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import SearchBox from '@/components/dms/search/SearchBox';
import Facets from '@/components/dms/search/Facets';
import ResultsTable from '@/components/dms/search/ResultsTable';
import DocCard from '@/components/dms/profile/DocCard';
import type { DMSDocument } from '@/types/dms';

export default function DMSDocumentsPage() {
  const { activeProject: currentProject } = useProjectContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<DMSDocument[]>([]);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [selectedDoc, setSelectedDoc] = useState<DMSDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalHits, setTotalHits] = useState(0);

  // Fetch documents with search and filters
  const fetchDocuments = useCallback(async () => {
    if (!currentProject) return;

    setIsLoading(true);

    try {
      // Build query params
      const params = new URLSearchParams({
        project_id: currentProject.project_id.toString(),
        limit: '50',
        offset: '0',
      });

      if (searchQuery) {
        params.append('q', searchQuery);
      }

      // Add filters
      Object.entries(selectedFilters).forEach(([key, values]) => {
        if (values.length > 0) {
          params.append(key, values.join(','));
        }
      });

      const response = await fetch(`/api/dms/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      setDocuments(data.results || []);
      setFacets(data.facets || {});
      setTotalHits(data.totalHits || 0);
    } catch (error) {
      console.error('Search error:', error);
      setDocuments([]);
      setFacets({});
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, searchQuery, selectedFilters]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (facetKey: string, values: string[]) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [facetKey]: values,
    }));
  };

  const handleDocumentSelect = (doc: DMSDocument) => {
    setSelectedDoc(doc);
  };

  const handleDocumentClose = () => {
    setSelectedDoc(null);
  };

  if (!currentProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            No Project Selected
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300">
            Please select a project from the navigation to browse documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Documents
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse and search documents for: <strong>{currentProject.project_name}</strong>
        </p>
      </div>

      {/* Search Box */}
      <div className="mb-6">
        <SearchBox
          onSearch={handleSearch}
          placeholder="Search documents by name, type, or content..."
          initialValue={searchQuery}
        />
      </div>

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isLoading ? (
            'Searching...'
          ) : (
            <>
              Found <strong>{totalHits}</strong> document{totalHits !== 1 ? 's' : ''}
            </>
          )}
        </p>
        <button
          onClick={fetchDocuments}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Facets (25%) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Filters
            </h2>
            <Facets
              facets={facets}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>

        {/* Center Column: Results Table (50%) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-4">No documents found</p>
                <p className="text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <ResultsTable
                documents={documents}
                onDocumentSelect={handleDocumentSelect}
                selectedDocId={selectedDoc?.doc_id}
              />
            )}
          </div>
        </div>

        {/* Right Column: Doc Card (25%) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
            {selectedDoc ? (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Document Details
                  </h2>
                  <button
                    onClick={handleDocumentClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <DocCard doc={selectedDoc} />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <p className="mt-2 text-sm">
                  Select a document to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
