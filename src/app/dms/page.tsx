'use client';

// Force dynamic rendering for pages using useSearchParams
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import CIcon from '@coreui/icons-react';
import { cilFilterSquare, cilPencil, cilApple, cilSend, cilCheck } from '@coreui/icons';
import { useProjectContext } from '@/app/components/ProjectProvider';
import FilterDetailView from '@/components/dms/views/FilterDetailView';
import Dropzone from '@/components/dms/upload/Dropzone';
import Queue from '@/components/dms/upload/Queue';
import ProfileForm from '@/components/dms/profile/ProfileForm';
import DocTypeFilters from '@/components/dms/filters/DocTypeFilters';
import { LandscapeButton } from '@/components/ui/landscape';
import styles from './page.module.css';
import { useRouter, useSearchParams } from 'next/navigation';

type TabType = 'documents' | 'upload';

function DMSPageContent() {
  const { activeProject: currentProject } = useProjectContext();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [totalItemCount, setTotalItemCount] = useState<number>(0);

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
  const selectedDocTypeParam = searchParams.get('doc_type');

  const handleDocTypeChange = (docType: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (docType) {
      params.set('doc_type', docType);
    } else {
      params.delete('doc_type');
    }
    router.push(`?${params.toString()}`);
    setSelectedFilterType(docType);
  };

  // Track selected doc_type from URL
  useEffect(() => {
    const docTypeParam = searchParams.get('doc_type');
    setSelectedFilterType(docTypeParam);
  }, [searchParams]);

  // Fetch total doc count for toolbar
  useEffect(() => {
    const loadCounts = async () => {
      if (!currentProject?.project_id || activeTab !== 'documents') return;
    try {
      const response = await fetch(`/api/dms/filters/counts?project_id=${currentProject.project_id}`);
      if (!response.ok) throw new Error('Failed to fetch filter counts');
        const data = await response.json();
        const total = Array.isArray(data.doc_type_counts)
          ? data.doc_type_counts.reduce(
              (sum: number, entry: { count: number }) => sum + (Number.isFinite(entry.count) ? entry.count : 0),
              0
            )
          : 0;
        setTotalItemCount(total);
      } catch (error) {
        console.error('Error loading totals:', error);
        setTotalItemCount(0);
      }
    };

    void loadCounts();
  }, [currentProject?.project_id, activeTab]);

  const handleCloseDetail = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('doc_type');
    router.push(`?${params.toString()}`);
    setSelectedFilterType(null);
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
        <div className="px-6 flex items-center justify-between">
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
          <button
            onClick={() => router.push('/admin/dms/templates')}
            className="pb-3 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ADMIN
          </button>
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

            <div className="flex-1 flex overflow-hidden">
              <div className="w-[250px] border-r border-line-soft bg-white dark:bg-gray-900 overflow-y-auto">
                <div className="p-4 border-b border-line-soft">
                  <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                    Document Types
                  </h2>
                </div>
                <DocTypeFilters
                  projectId={currentProject.project_id}
                  selectedDocType={selectedDocTypeParam}
                  onFilterChange={handleDocTypeChange}
                  className="divide-y divide-line-soft"
                />
              </div>

              <div className="flex-1 overflow-hidden">
                {selectedFilterType ? (
                  <FilterDetailView
                    projectId={currentProject.project_id}
                    docType={selectedFilterType}
                    onBack={handleCloseDetail}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                    Select a document type to view documents.
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

export default function DMSPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <DMSPageContent />
    </Suspense>
  );
}
