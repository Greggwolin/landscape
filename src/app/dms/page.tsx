'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import FolderTree from '@/components/dms/folders/FolderTree';
import FolderEditor from '@/components/dms/folders/FolderEditor';
import SearchBox from '@/components/dms/search/SearchBox';
import ResultsTable from '@/components/dms/search/ResultsTable';
import DocCard from '@/components/dms/profile/DocCard';
import Dropzone from '@/components/dms/upload/Dropzone';
import Queue from '@/components/dms/upload/Queue';
import ProfileForm from '@/components/dms/profile/ProfileForm';
import type { DMSDocument } from '@/types/dms';

type TabType = 'documents' | 'upload' | 'templates' | 'attributes';

interface FolderNode {
  folder_id: number;
  parent_id: number | null;
  name: string;
  path: string;
  sort_order: number;
  default_profile: Record<string, unknown>;
  is_active: boolean;
  children: FolderNode[];
  doc_count?: number;
}

export default function DMSPage() {
  const { activeProject: currentProject } = useProjectContext();

  // Read tab from URL parameter on mount
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'upload' || tab === 'documents' || tab === 'templates' || tab === 'attributes') {
        return tab as TabType;
      }
    }
    return 'documents';
  });

  const defaultWorkspaceId = 1;

  // Documents tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<DMSDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DMSDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [showFolderEditor, setShowFolderEditor] = useState(false);

  // Upload tab state
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    filename: string;
    size: number;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
    doc_id?: number;
  }>>([]);
  const [selectedUploadFile, setSelectedUploadFile] = useState<typeof uploadedFiles[number] | null>(null);

  // Fetch documents with search and filters
  const fetchDocuments = useCallback(async () => {
    if (!currentProject) return;

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        project_id: currentProject.project_id.toString(),
        limit: '50',
        offset: '0',
      });

      if (searchQuery) {
        params.append('q', searchQuery);
      }

      // Add folder filter if selected
      if (selectedFolder) {
        params.append('folder_id', selectedFolder.folder_id.toString());
      }

      const response = await fetch(`/api/dms/search?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search API error:', response.status, errorText);
        throw new Error(`Search failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      setDocuments(data.results || []);
      setTotalHits(data.totalHits || 0);
    } catch (error) {
      console.error('Search error:', error);
      setDocuments([]);
      setTotalHits(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, searchQuery, selectedFolder]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [fetchDocuments, activeTab]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleDocumentSelect = (doc: DMSDocument) => {
    setSelectedDoc(doc);
  };

  const handleDocumentClose = () => {
    setSelectedDoc(null);
  };

  const handleFolderSelect = (folder: FolderNode) => {
    setSelectedFolder(folder);
  };

  const handleDocumentMove = async (docId: number, folderId: number | null) => {
    try {
      const response = await fetch(`/api/dms/docs/${docId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId, apply_inheritance: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to move document');
      }

      // Refresh documents
      fetchDocuments();
    } catch (error) {
      console.error('Error moving document:', error);
      alert('Failed to move document');
    }
  };

  // Upload handlers
  const handleUploadComplete = (results: Array<Record<string, unknown>>) => {
    console.log('Upload complete:', results);
    // Transform results to match Queue component's expected structure
    const queueItems = results.map((result, index) => ({
      id: (result.key as string) || (result.fileKey as string) || `upload-${Date.now()}-${index}`,
      filename: (result.name as string) || (result.fileName as string) || 'Unknown',
      size: (result.size as number) || 0,
      status: 'completed' as const,
      progress: 100,
      doc_id: result.doc_id as number | undefined
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
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            No Project Selected
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300">
            Please select a project from the navigation to access the Document Management System.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Document Management System
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentProject.project_name}
          </p>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/dms/templates'}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 font-medium text-sm"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Templates
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/dms/attributes'}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 font-medium text-sm"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Attributes
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="h-full flex">
            {/* Left Sidebar - Folders */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Folders
                  </h2>
                  <button
                    onClick={() => setShowFolderEditor(true)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    title="New Folder"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <FolderTree
                  onFolderSelect={handleFolderSelect}
                  onDocumentMove={handleDocumentMove}
                  selectedFolderId={selectedFolder?.folder_id}
                />
              </div>
            </div>

            {/* Main Content - Search & Results */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SearchBox
                  onSearch={handleSearch}
                  placeholder="Search documents by name, type, or content..."
                  initialValue={searchQuery}
                />
                {selectedFolder && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Showing documents in:
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {selectedFolder.path}
                    </span>
                    <button
                      onClick={() => setSelectedFolder(null)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
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

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12">
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
                    <p className="mt-4 text-gray-500 dark:text-gray-400">No documents found</p>
                    <p className="text-sm mt-2 text-gray-400 dark:text-gray-500">
                      Try adjusting your search or filters
                    </p>
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

            {/* Right Sidebar - Document Details */}
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
              <div className="p-6">
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="mt-2 text-sm">Select a document to view details</p>
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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Upload Documents
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Drag and drop files or click to select
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Upload */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <Dropzone
                      projectId={currentProject.project_id}
                      workspaceId={defaultWorkspaceId}
                      docType="general"
                      onUploadComplete={handleUploadComplete}
                      onUploadError={handleUploadError}
                    />
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
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
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-fit sticky top-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Document Profile
                  </h3>

                  {selectedUploadFile ? (
                    <div>
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {selectedUploadFile.name}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <ProfileForm
                        docId={selectedUploadFile.doc_id}
                        projectId={currentProject.project_id}
                        workspaceId={defaultWorkspaceId}
                        docType="general"
                        initialProfile={selectedUploadFile.profile_json || {}}
                        onSave={(profile) => handleProfileSave(selectedUploadFile.doc_id, profile)}
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

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Document Templates
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Configure which attributes are required or optional for different document types
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Templates feature coming soon. See Step 5 implementation guide for details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attributes Tab */}
        {activeTab === 'attributes' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Custom Attributes
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Define custom fields for document profiles
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Attributes feature coming soon. See Step 5 implementation guide for details.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Folder Editor Modal */}
      {showFolderEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <FolderEditor
              parentId={selectedFolder?.folder_id}
              onSave={() => {
                setShowFolderEditor(false);
                // Refresh folder tree
                window.location.reload();
              }}
              onCancel={() => setShowFolderEditor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
