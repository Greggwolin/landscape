'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CIcon from '@coreui/icons-react';
import { cilFilterSquare, cilPencil, cilApple, cilSend, cilCheck } from '@coreui/icons';
import { useProjectContext } from '@/app/components/ProjectProvider';
import AccordionFilters, { type FilterAccordion } from '@/components/dms/filters/AccordionFilters';
import FilterDetailView from '@/components/dms/views/FilterDetailView';
import Dropzone from '@/components/dms/upload/Dropzone';
import Queue from '@/components/dms/upload/Queue';
import ProfileForm from '@/components/dms/profile/ProfileForm';
import type { DMSDocument } from '@/types/dms';
import { LandscapeButton } from '@/components/ui/landscape';
import styles from './page.module.css';

type TabType = 'documents' | 'upload';

export default function DMSPage() {
  const { activeProject: currentProject } = useProjectContext();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'upload' || tab === 'documents') {
        return tab as TabType;
      }
    }
    return 'documents';
  });

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

  // Fetch filter data when Documents tab is active
  useEffect(() => {
    if (currentProject?.project_id && activeTab === 'documents') {
      void loadFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.project_id, currentProject?.project_type, activeTab]);

  const loadFilters = async () => {
    if (!currentProject) return;
    setIsLoadingFilters(true);
    try {
      const docTypeParams = new URLSearchParams({
        project_id: currentProject.project_id.toString(),
        workspace_id: defaultWorkspaceId.toString()
      });
      if (currentProject.project_type) {
        docTypeParams.append('project_type', currentProject.project_type);
      }

      const [docTypesResponse, countsResponse] = await Promise.all([
        fetch(`/api/dms/templates/doc-types?${docTypeParams.toString()}`),
        fetch(`/api/dms/filters/counts?project_id=${currentProject.project_id}`)
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
        `/api/dms/search?project_id=${currentProject.project_id}&doc_type=${encodeURIComponent(docType)}&limit=20`
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

  if (!currentProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className={`rounded-lg p-6 border ${styles.noProjectCard}`}>
          <h2 className={`text-lg font-semibold mb-2 ${styles.noProjectTitle}`}>
            No Project Selected
          </h2>
          <p className={`text-sm ${styles.noProjectMessage}`}>
            Please select a project from the navigation to access the Document Management System.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Tabs */}
      <div className={`border-b ${styles.tabsBar}`}>
        <div className="px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <LandscapeButton
              onClick={() => setActiveTab('documents')}
              color={activeTab === 'documents' ? 'primary' : 'secondary'}
              variant="ghost"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${styles.tabButton} ${
                activeTab === 'documents'
                  ? styles.tabButtonActive
                  : styles.tabButtonInactive
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documents
              </div>
            </LandscapeButton>

            <LandscapeButton
              onClick={() => setActiveTab('upload')}
              color={activeTab === 'upload' ? 'primary' : 'secondary'}
              variant="ghost"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${styles.tabButton} ${
                activeTab === 'upload'
                  ? styles.tabButtonActive
                  : styles.tabButtonInactive
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload
              </div>
            </LandscapeButton>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className={`h-full flex flex-col ${styles.documentsPane}`}>
            {/* Breadcrumb */}
            <div className={`px-6 py-2 border-b ${styles.breadcrumbRow}`}>
              <div className="flex items-center gap-2 text-sm">
                <LandscapeButton color="primary" variant="ghost" size="sm" className="!p-0 hover:underline">
                  Home
                </LandscapeButton>
                <span className="text-text-secondary">{'>'}</span>
                <LandscapeButton color="primary" variant="ghost" size="sm" className="!p-0 hover:underline">
                  Projects
                </LandscapeButton>
                <span className="text-text-secondary">{'>'}</span>
                <span className="truncate text-text-primary">
                  {currentProject.project_name}
                </span>
              </div>
            </div>

            {/* Toolbar */}
            <div className={`px-6 py-3 border-b ${styles.toolbarRow}`}>
              <div className="flex items-center gap-4">
                <LandscapeButton color="primary" variant="ghost" size="sm" className="!p-1">
                  🔻
                </LandscapeButton>
                <span className="text-sm text-text-secondary">
                  {totalItemCount} items | 0 selected
                </span>
                  <div className="ml-auto flex items-center gap-3 text-sm">
                  <LandscapeButton color="secondary" variant="ghost" size="sm" icon={<CIcon icon={cilApple} className="w-4 h-4" />}>
                    Ask AI
                  </LandscapeButton>
                  <LandscapeButton color="secondary" variant="ghost" size="sm" icon={<CIcon icon={cilPencil} className="w-4 h-4" />}>
                    Rename
                  </LandscapeButton>
                  <LandscapeButton color="secondary" variant="ghost" size="sm" className="flex items-center gap-1">
                    <CIcon icon={cilFilterSquare} className="w-4 h-4" />
                    Move/Copy
                  </LandscapeButton>
                  <LandscapeButton color="secondary" variant="ghost" size="sm" icon={<CIcon icon={cilSend} className="w-4 h-4" />}>
                    Email copy
                  </LandscapeButton>
                  <LandscapeButton color="secondary" variant="ghost" size="sm" icon={<CIcon icon={cilPencil} className="w-4 h-4" />}>
                    Edit profile
                  </LandscapeButton>
                  <LandscapeButton color="secondary" variant="ghost" size="sm" icon={<CIcon icon={cilCheck} className="w-4 h-4" />}>
                    Check in
                  </LandscapeButton>
                  <LandscapeButton color="secondary" variant="ghost" size="sm">
                    ⋯ More
                  </LandscapeButton>
                </div>
              </div>
            </div>

            <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
              <div className={`flex-1 overflow-y-auto ${selectedFilterType ? 'lg:w-2/3' : 'w-full'}`}>
                {isLoadingFilters ? (
                  <div className="flex items-center justify-center h-64">
                    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${styles.loadingSpinner}`}></div>
                    <span className="ml-3 text-text-secondary">Loading filters...</span>
                  </div>
                ) : allFilters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
                    <CIcon icon={cilFilterSquare} className="w-8 h-8 mb-3 text-text-secondary" />
                    <p className="text-sm text-text-secondary">No documents found in this project</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Left Column */}
                    <div className="border-r border-line-soft">
                      <AccordionFilters
                        projectId={currentProject.project_id}
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
                        projectId={currentProject.project_id}
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

              {selectedFilterType && (
                <>
                  <div
                    className={`fixed inset-0 z-40 lg:hidden ${styles.detailBackdrop}`}
                    onClick={handleCloseDetail}
                    role="presentation"
                  />
                  <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl border-l border-line-soft bg-surface-card shadow-xl lg:static lg:z-auto lg:max-w-none lg:w-1/3">
                    <FilterDetailView
                      projectId={currentProject.project_id}
                      docType={selectedFilterType}
                      onBack={handleCloseDetail}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  Upload Documents
                </h2>
                <p className="text-text-secondary">
                  Drag and drop files or click to select
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Upload */}
                <div className="space-y-6">
                  <div className="rounded-lg border border-line-strong bg-surface-card p-6">
                    <Dropzone
                      projectId={currentProject.project_id}
                      workspaceId={defaultWorkspaceId}
                      docType="general"
                      onUploadComplete={handleUploadComplete}
                      onUploadError={handleUploadError}
                    />
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="rounded-lg border border-line-strong bg-surface-card p-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-4">
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
                <div className="rounded-lg border border-line-strong bg-surface-card p-6 h-fit sticky top-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    Document Profile
                  </h3>

                  {selectedUploadFile ? (
                    <div>
                      <div className={`mb-4 p-3 rounded-lg ${styles.selectedFileInfo}`}>
                        <p className="text-sm font-medium text-text-primary">
                          {selectedUploadFile.name || selectedUploadFile.filename}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          {(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <ProfileForm
                        docId={selectedUploadFile.doc_id}
                        projectId={currentProject.project_id}
                        workspaceId={defaultWorkspaceId}
                        docType="general"
                        projectType={currentProject.project_type ?? null}
                        initialProfile={selectedUploadFile.profile_json || {}}
                        onSave={(profile) => handleProfileSave(selectedUploadFile.doc_id!, profile)}
                        onCancel={() => setSelectedUploadFile(null)}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-text-secondary">
                      <svg
                        className="mx-auto h-12 w-12 text-text-secondary"
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
