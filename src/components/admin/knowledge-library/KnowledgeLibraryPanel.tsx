'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CSpinner } from '@coreui/react';
import SourceToggle, { type SourceFilter } from './SourceToggle';
import FilterColumns, { type Facets, type ActiveFilters } from './FilterColumns';
import CounterBar from './CounterBar';
import UploadDropZone from './UploadDropZone';
import DocResultCard, { type DocResult } from './DocResultCard';
import DocumentChatModal from '@/components/dms/modals/DocumentChatModal';
import './knowledge-library.css';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const MAX_AUTO_DOCS = 50;

const EMPTY_FACETS: Facets = {
  geography: [],
  property_type: [],
  format: [],
  doc_type: [],
  project: [],
};

const EMPTY_FILTERS: ActiveFilters = {
  geo: [],
  property_type: [],
  format: [],
  doc_type: [],
  project_id: [],
};

export default function KnowledgeLibraryPanel() {
  const [source, setSource] = useState<SourceFilter>('all');
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [totalCount, setTotalCount] = useState(0);
  const [sourceCounts, setSourceCounts] = useState({ all: 0, user: 0, platform: 0 });
  const [isLoadingFacets, setIsLoadingFacets] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(new Set());

  // Auto-populated document list state
  const [documents, setDocuments] = useState<DocResult[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Document preview state
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const fetchFacets = useCallback(async (
    currentSource: SourceFilter,
    currentFilters: ActiveFilters,
  ) => {
    setIsLoadingFacets(true);
    try {
      const params = new URLSearchParams();
      params.append('source', currentSource);
      currentFilters.geo.forEach((v) => params.append('geo', v));
      currentFilters.property_type.forEach((v) => params.append('property_type', v));
      currentFilters.format.forEach((v) => params.append('fmt', v));
      currentFilters.doc_type.forEach((v) => params.append('doc_type', v));
      currentFilters.project_id.forEach((v) => params.append('project_id', v));

      const response = await fetch(
        `${DJANGO_API_URL}/api/knowledge/library/facets/?${params.toString()}`
      );

      if (!response.ok) throw new Error('Failed to fetch facets');

      const data = await response.json();
      setFacets(data.facets || EMPTY_FACETS);
      setTotalCount(data.total_count || 0);
    } catch (error) {
      console.error('Error fetching facets:', error);
      setFacets(EMPTY_FACETS);
      setTotalCount(0);
    } finally {
      setIsLoadingFacets(false);
    }
  }, []);

  const fetchDocuments = useCallback(async (
    currentSource: SourceFilter,
    currentFilters: ActiveFilters,
  ) => {
    setIsLoadingDocs(true);
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/knowledge/library/search/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
          filters: {
            source: currentSource,
            geo: currentFilters.geo,
            property_type: currentFilters.property_type,
            format: currentFilters.format,
            doc_type: currentFilters.doc_type,
            project_id: currentFilters.project_id,
          },
          fallback_level: 0,
          limit: MAX_AUTO_DOCS,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.results || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  const fetchSourceCounts = useCallback(async () => {
    try {
      const [allRes, userRes, platformRes] = await Promise.all([
        fetch(`${DJANGO_API_URL}/api/knowledge/library/facets/?source=all`),
        fetch(`${DJANGO_API_URL}/api/knowledge/library/facets/?source=user`),
        fetch(`${DJANGO_API_URL}/api/knowledge/library/facets/?source=platform`),
      ]);

      const [allData, userData, platformData] = await Promise.all([
        allRes.json(),
        userRes.json(),
        platformRes.json(),
      ]);

      setSourceCounts({
        all: allData.total_count || 0,
        user: userData.total_count || 0,
        platform: platformData.total_count || 0,
      });
    } catch (error) {
      console.error('Error fetching source counts:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchFacets(source, activeFilters);
    void fetchDocuments(source, activeFilters);
    void fetchSourceCounts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch facets and documents when filters change
  useEffect(() => {
    void fetchFacets(source, activeFilters);
    void fetchDocuments(source, activeFilters);
  }, [source, activeFilters, fetchFacets, fetchDocuments]);

  const handleSourceChange = (newSource: SourceFilter) => {
    setSource(newSource);
    setActiveFilters(EMPTY_FILTERS);
    setSelectedDocs(new Set());
  };

  const handleToggleFilter = (dimension: keyof ActiveFilters, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[dimension];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [dimension]: next };
    });
  };

  const handleClearFilters = () => {
    setActiveFilters(EMPTY_FILTERS);
  };

  const handleToggleSelect = (docId: number) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSelectAll = (docIds: number[]) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      docIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleDownloadSelected = async () => {
    if (selectedDocs.size === 0) return;

    try {
      const response = await fetch(`${DJANGO_API_URL}/api/knowledge/library/batch-download/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_ids: Array.from(selectedDocs) }),
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'knowledge-library-download.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Batch download error:', error);
    }
  };

  const handlePreview = (docId: number) => {
    setPreviewDocId(docId);
    setPreviewVisible(true);
  };

  const handleUploadComplete = () => {
    void fetchFacets(source, activeFilters);
    void fetchDocuments(source, activeFilters);
    void fetchSourceCounts();
  };

  const handleSelectAllVisible = () => {
    handleSelectAll(documents.map((d) => d.doc_id));
  };

  return (
    <div className="knowledge-library-panel">
      {/* Source Toggle */}
      <SourceToggle
        active={source}
        counts={sourceCounts}
        onChange={handleSourceChange}
      />

      {/* Filter Columns */}
      {isLoadingFacets && facets === EMPTY_FACETS ? (
        <div className="d-flex align-items-center justify-content-center" style={{ padding: 40 }}>
          <CSpinner size="sm" />
          <span className="ms-2" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.85rem' }}>
            Loading filters...
          </span>
        </div>
      ) : (
        <FilterColumns
          facets={facets}
          activeFilters={activeFilters}
          onToggleFilter={handleToggleFilter}
        />
      )}

      {/* Counter Bar */}
      <CounterBar
        totalCount={totalCount}
        activeFilters={activeFilters}
        selectedCount={selectedDocs.size}
        onDownloadSelected={() => void handleDownloadSelected()}
        onClearFilters={handleClearFilters}
      />

      {/* Auto-populated Document List */}
      <div className="kl-doc-list">
        {isLoadingDocs ? (
          <div className="kl-doc-list-loading">
            <CSpinner size="sm" />
            <span>Loading documents...</span>
          </div>
        ) : documents.length > 0 ? (
          <>
            <div className="kl-doc-list-header">
              <button
                type="button"
                className="kl-select-all-row"
                onClick={handleSelectAllVisible}
              >
                Select all {documents.length} visible
              </button>
            </div>
            <div className="kl-doc-list-scroll">
              {documents.map((doc) => (
                <DocResultCard
                  key={doc.doc_id}
                  doc={doc}
                  isSelected={selectedDocs.has(doc.doc_id)}
                  onToggleSelect={handleToggleSelect}
                  onPreview={handlePreview}
                />
              ))}
            </div>
            {totalCount > MAX_AUTO_DOCS && (
              <div className="kl-doc-list-overflow">
                Showing {documents.length} of {totalCount} documents — use filters to narrow results
              </div>
            )}
          </>
        ) : (
          <div className="kl-doc-list-empty">
            No documents match the current filters
          </div>
        )}
      </div>

      {/* Upload Drop Zone */}
      <UploadDropZone
        djangoApiUrl={DJANGO_API_URL}
        onUploadComplete={handleUploadComplete}
      />

      {/* Document Chat Modal */}
      {previewDocId != null && (() => {
        const previewDoc = documents.find((d) => d.doc_id === previewDocId);
        return (
          <DocumentChatModal
            visible={previewVisible}
            onClose={() => {
              setPreviewVisible(false);
              setPreviewDocId(null);
            }}
            projectId={0}
            document={{
              doc_id: previewDocId,
              filename: previewDoc?.name || `Document ${previewDocId}`,
              version_number: 1,
            }}
          />
        );
      })()}
    </div>
  );
}
