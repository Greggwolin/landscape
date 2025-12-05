'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CIcon from '@coreui/icons-react';
import { cilFilterSquare } from '@coreui/icons';
import AccordionFilters, { type FilterAccordion } from '@/components/dms/filters/AccordionFilters';
import FilterDetailView from '@/components/dms/views/FilterDetailView';
import Dropzone from '@/components/dms/upload/Dropzone';
import Queue from '@/components/dms/upload/Queue';
import ProfileForm from '@/components/dms/profile/ProfileForm';
import type { DMSDocument } from '@/types/dms';

type TabType = 'documents' | 'upload';

interface DMSViewProps {
  projectId: number;
  projectName: string;
  projectType?: string | null;
  hideHeader?: boolean;
  defaultTab?: TabType;
}

export default function DMSView({
  projectId,
  projectName,
  projectType = null,
  hideHeader = false,
  defaultTab = 'documents'
}: DMSViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const defaultWorkspaceId = 1;

  // Documents tab state
  const [selectedFilterType, setSelectedFilterType] = useState<string | null>(null);
  const [allFilters, setAllFilters] = useState<FilterAccordion[]>([]);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Upload tab state
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    filename: string;
    size: number;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
    doc_id?: number;
    name?: string;
    profile_json?: Record<string, unknown>;
  }>>([]);
  const [selectedUploadFile, setSelectedUploadFile] = useState<typeof uploadedFiles[number] | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(true);

  const secondaryColorStyle: React.CSSProperties = { color: 'var(--cui-secondary-color)' };
  const primaryColorStyle: React.CSSProperties = { color: 'var(--cui-primary)' };
  const borderColor = 'var(--cui-border-color)';
  const cardBg = 'var(--cui-card-bg)';

  // Fetch filter data when Documents tab is active
  useEffect(() => {
    if (projectId && activeTab === 'documents') {
      void loadFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, projectType, activeTab]);

  const loadFilters = async () => {
    setIsLoadingFilters(true);
    try {
      const docTypeParams = new URLSearchParams({
        project_id: projectId.toString(),
        workspace_id: defaultWorkspaceId.toString()
      });
      if (projectType) {
        docTypeParams.append('project_type', projectType);
      }

      const [docTypesResponse, countsResponse] = await Promise.all([
        fetch(`/api/dms/templates/doc-types?${docTypeParams.toString()}`),
        fetch(`/api/dms/filters/counts?project_id=${projectId}`)
      ]);

      let docTypeOptions: string[] = [];
      if (docTypesResponse.ok) {
        const data = await docTypesResponse.json();
        docTypeOptions = Array.isArray(data.doc_type_options) ? data.doc_type_options : [];
      }

      if (!countsResponse.ok) {
        throw new Error('Failed to fetch filter counts');
      }

      const { doc_type_counts } = await countsResponse.json();
      const countEntries: Array<{ doc_type: string; count: number }> = Array.isArray(doc_type_counts)
        ? doc_type_counts
        : [];

      const totalDocCount = countEntries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);

      // If no documents are profiled yet, fall back to the "valuation" template filters when available
      if (totalDocCount === 0) {
        try {
          const valuationParams = new URLSearchParams(docTypeParams);
          valuationParams.set('project_type', 'valuation');
          const valuationResponse = await fetch(`/api/dms/templates/doc-types?${valuationParams.toString()}`);
          if (valuationResponse.ok) {
            const valuationData = await valuationResponse.json();
            const valuationOptions = Array.isArray(valuationData.doc_type_options) ? valuationData.doc_type_options : [];
            if (valuationOptions.length > 0) {
              docTypeOptions = valuationOptions;
            }
          }
        } catch (valuationError) {
          console.error('Fallback valuation template fetch failed:', valuationError);
        }
      }

      const countMap = new Map<string, number>();
      countEntries.forEach(({ doc_type, count }) => {
        if (doc_type) {
          countMap.set(doc_type, count);
          countMap.set(doc_type.toLowerCase(), count);
        }
      });

      const templateFilters = docTypeOptions.map((type: string) => {
        const normalized = type.toLowerCase();
        const count =
          countMap.get(type) ??
          countMap.get(normalized) ??
          0;

        return {
          doc_type: type,
          icon: '📁',
          count,
          is_expanded: false,
          documents: []
        };
      });

      const templateSet = new Set(docTypeOptions.map(type => type.toLowerCase()));
      const extraFilters = countEntries
        .filter(({ doc_type }) => doc_type && !templateSet.has(doc_type.toLowerCase()))
        .map(({ doc_type, count }) => ({
          doc_type,
          icon: '📁',
          count: count ?? 0,
          is_expanded: false,
          documents: []
        }));

      setAllFilters([...templateFilters, ...extraFilters]);
      setExpandedFilter(null);
    } catch (error) {
      console.error('Error loading filters:', error);
      setAllFilters([]);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const totalItemCount = useMemo(() => {
    return allFilters.reduce((sum, f) => sum + (Number.isFinite(f.count) ? f.count : 0), 0);
  }, [allFilters]);

  // Split filters into two columns
  const leftColumnFilters = useMemo(() => {
    return allFilters.slice(0, Math.ceil(allFilters.length / 2));
  }, [allFilters]);

  const rightColumnFilters = useMemo(() => {
    return allFilters.slice(Math.ceil(allFilters.length / 2));
  }, [allFilters]);

  // Handle accordion expand/collapse
  const handleAccordionExpand = async (docType: string) => {
    if (expandedFilter === docType) {
      setExpandedFilter(null);
      setAllFilters((prev) =>
        prev.map((f) => ({ ...f, is_expanded: false, documents: [] }))
      );
      return;
    }

    setAllFilters((prev) => prev.map((f) => ({ ...f, is_expanded: false })));
    setExpandedFilter(docType);

    try {
      const response = await fetch(
        `/api/dms/search?project_id=${projectId}&doc_type=${encodeURIComponent(docType)}&limit=20`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();

      setAllFilters((prev) =>
        prev.map((f) =>
          f.doc_type === docType
            ? { ...f, is_expanded: true, documents: data.results || [] }
            : f
        )
      );
    } catch (error) {
      console.error('Error fetching documents for filter:', error);
    }
  };

  // Handle clicking folder icon - navigate to filter detail view
  const handleFilterClick = (docType: string) => {
    setSelectedFilterType(docType);
  };

  const handleCloseDetail = () => {
    setSelectedFilterType(null);
  };

  // Handle document selection from accordion
  const handleDocumentSelect = (doc: DMSDocument) => {
    console.log('Document selected:', doc);
    // TODO: Open document preview or navigate to document page
  };

  // Upload handlers
  const handleUploadComplete = (results: Array<Record<string, unknown>>) => {
    console.log('Upload complete:', results);
    const queueItems = results.map((result, index) => ({
      id: (result.key as string) || (result.fileKey as string) || `upload-${Date.now()}-${index}`,
      filename: (result.name as string) || (result.fileName as string) || 'Unknown',
      name: (result.name as string) || (result.fileName as string) || 'Unknown',
      size: (result.size as number) || 0,
      status: 'completed' as const,
      progress: 100,
      doc_id: result.doc_id as number | undefined,
      profile_json: result.profile_json as Record<string, unknown> | undefined
    }));
    setUploadedFiles((prev) => [...prev, ...queueItems]);
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    alert(`Upload failed: ${error.message}`);
  };

  const handleProfileSave = async (docId: number, profile: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/dms/documents/${docId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      alert('Profile saved successfully!');
      setSelectedUploadFile(null);
    } catch (error) {
      console.error('Profile save error:', error);
      alert(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#E6E7EB' }}>
      {/* Header */}
      {!hideHeader && (
        <div
          className="border-b"
          style={{
            borderColor,
            backgroundColor: cardBg
          }}
        >
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('documents')}
                className="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                style={
                  activeTab === 'documents'
                    ? { borderColor: primaryColorStyle.color, color: primaryColorStyle.color }
                    : { borderColor: 'transparent', ...secondaryColorStyle }
                }
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Documents
                </div>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                style={
                  activeTab === 'upload'
                    ? { borderColor: primaryColorStyle.color, color: primaryColorStyle.color }
                    : { borderColor: 'transparent', ...secondaryColorStyle }
                }
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload
                </div>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden" style={{ backgroundColor: '#E6E7EB' }}>
        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="h-full flex flex-col" style={{ backgroundColor: '#E6E7EB' }}>
            <div className="px-3 lg:px-4 py-4 lg:py-6">
              <div
                className="rounded-lg border shadow-sm overflow-hidden"
                style={{
                  borderColor: 'var(--cui-border-color)',
                  backgroundColor: '#F0F1F2'
                }}
              >
                <button
                  className="w-full px-4 py-3 text-left"
                  style={{ color: 'var(--cui-body-color)', backgroundColor: '#F0F1F2' }}
                  onClick={() => setPanelExpanded((prev) => !prev)}
                  aria-expanded={panelExpanded}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5" style={{ color: 'var(--cui-secondary-color)' }}>
                        {panelExpanded ? '▾' : '▸'}
                      </span>
                      <div>
                        <div className="text-xs font-semibold uppercase" style={{ color: 'var(--cui-secondary-color)' }}>
                          Project Documents
                        </div>
                        <div className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                          {projectName}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                          Filtered to project #{projectId} • {totalItemCount} items
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <a
                        href="/dms"
                        className="px-3 py-2 rounded border transition-colors"
                        style={{
                          borderColor: 'var(--cui-border-color)',
                          color: 'var(--cui-primary)'
                        }}
                      >
                        Open Global DMS
                      </a>
                      <a
                        href={`/projects/${projectId}/documents?tab=upload`}
                        className="px-3 py-2 rounded text-white"
                        style={{ backgroundColor: 'var(--cui-primary)' }}
                      >
                        Upload Documents
                      </a>
                    </div>
                  </div>
                </button>

                {panelExpanded && (
                  <div
                    className="border-t"
                    style={{
                      borderColor: 'var(--cui-border-color)',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {/* Breadcrumb */}
                    <div className="px-6 py-2 border-b" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: '#ffffff' }}>
                      <div className="flex items-center gap-2 text-sm">
                        <button className="text-blue-600 hover:underline">Home</button>
                        <span style={{ color: 'var(--cui-secondary-color)' }}>{'>'}</span>
                        <button className="text-blue-600 hover:underline">Projects</button>
                        <span style={{ color: 'var(--cui-secondary-color)' }}>{'>'}</span>
                        <span className="truncate" style={{ color: 'var(--cui-body-color)' }}>
                          {projectName}
                        </span>
                      </div>
                    </div>

                    {/* Toolbar */}
                    <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: '#ffffff' }}>
                      <div className="flex items-center gap-4">
                        <button className="text-blue-600">🔻</button>
                        <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                          {totalItemCount} items | 0 selected
                        </span>
                        <div className="ml-auto flex items-center gap-3 text-sm">
                          <button className="hover:opacity-70" style={{ color: 'var(--cui-secondary-color)' }}>
                            🤖 Ask AI
                          </button>
                          <button className="hover:opacity-70" style={{ color: 'var(--cui-secondary-color)' }}>
                            ✏️ Rename
                          </button>
                          <button className="hover:opacity-70 flex items-center gap-1" style={{ color: 'var(--cui-secondary-color)' }}>
                            <CIcon icon={cilFilterSquare} className="w-4 h-4" />
                            Move/Copy
                          </button>
                          <button className="hover:opacity-70" style={{ color: 'var(--cui-secondary-color)' }}>
                            📧 Email copy
                          </button>
                          <button className="hover:opacity-70" style={{ color: 'var(--cui-secondary-color)' }}>
                            ✏️ Edit profile
                          </button>
                          <button className="hover:opacity-70" style={{ color: 'var(--cui-secondary-color)' }}>
                            ✅ Check in
                          </button>
                          <button className="hover:opacity-70" style={{ color: 'var(--cui-secondary-color)' }}>
                            ⋯ More
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                      <div className={`flex-1 overflow-y-auto ${selectedFilterType ? 'lg:w-7/12 xl:w-3/5' : 'w-full'}`}>
                        <div className="p-4 lg:p-6" style={{ backgroundColor: '#ffffff' }}>
                          {isLoadingFilters ? (
                            <div className="flex items-center justify-center h-64">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <span className="ml-3" style={{ color: 'var(--cui-secondary-color)' }}>Loading filters...</span>
                            </div>
                          ) : allFilters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--cui-secondary-color)' }}>
                              <CIcon icon={cilFilterSquare} className="w-8 h-8 mb-3" />
                              <p className="text-sm">No documents found in this project</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 bg-white">
                              {/* Left Column */}
                              <div className="border-r" style={{ borderColor: 'var(--cui-border-color)' }}>
                                <AccordionFilters
                                  projectId={projectId}
                                  filters={leftColumnFilters}
                                  onExpand={handleAccordionExpand}
                                  onFilterClick={handleFilterClick}
                                  onDocumentSelect={handleDocumentSelect}
                                  expandedFilter={expandedFilter}
                                  activeFilter={selectedFilterType}
                                />
                              </div>

                              {/* Right Column */}
                              <div>
                                <AccordionFilters
                                  projectId={projectId}
                                  filters={rightColumnFilters}
                                  onExpand={handleAccordionExpand}
                                  onFilterClick={handleFilterClick}
                                  onDocumentSelect={handleDocumentSelect}
                                  expandedFilter={expandedFilter}
                                  activeFilter={selectedFilterType}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedFilterType && (
                        <>
                          <div
                            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                            onClick={handleCloseDetail}
                            role="presentation"
                          />
                          <div
                            className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl border-l shadow-xl lg:static lg:z-auto lg:max-w-none lg:w-5/12 xl:w-2/5"
                            style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}
                          >
                            <FilterDetailView
                              projectId={projectId}
                              docType={selectedFilterType}
                              onBack={handleCloseDetail}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Upload Documents
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Drag and drop files or click to select
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Upload */}
                <div className="space-y-6">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
                    <Dropzone
                      projectId={projectId}
                      workspaceId={defaultWorkspaceId}
                      docType="general"
                      onUploadComplete={handleUploadComplete}
                      onUploadError={handleUploadError}
                    />
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
                      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                        Uploaded Files ({uploadedFiles.length})
                      </h3>
                      <Queue
                        items={uploadedFiles}
                        onRetry={(id) => console.log('Retry upload:', id)}
                        onRemove={(id) => setUploadedFiles(prev => prev.filter(f => f.id !== id))}
                      />
                    </div>
                  )}
                </div>

                {/* Right: Profile Form */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-fit sticky top-6 bg-white dark:bg-gray-900">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Document Profile
                  </h3>

                  {selectedUploadFile ? (
                    <div>
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {selectedUploadFile.name || selectedUploadFile.filename}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <ProfileForm
                        docId={selectedUploadFile.doc_id}
                        projectId={projectId}
                        workspaceId={defaultWorkspaceId}
                        docType="general"
                        projectType={projectType}
                        initialProfile={selectedUploadFile.profile_json || {}}
                        onSave={(profile) => handleProfileSave(selectedUploadFile.doc_id!, profile)}
                        onCancel={() => setSelectedUploadFile(null)}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm">Select an uploaded file to edit its profile</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
