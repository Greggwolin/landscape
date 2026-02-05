'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilFilterSquare,
  cilCommentSquare,
  cilPencil,
  cilCloudDownload,
  cilTrash,
  cilOptions,
} from '@coreui/icons';
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CDropdownDivider } from '@coreui/react';
import type { DMSDocument } from '@/types/dms';
import { DocumentChatModal, RenameModal, DeleteConfirmModal } from '../modals';
import DocumentPreviewPanel from './DocumentPreviewPanel';

interface FilterDetailViewProps {
  projectId: number;
  docType: string;
  onBack: () => void;
}

export default function FilterDetailView({
  projectId,
  docType,
  onBack
}: FilterDetailViewProps) {
  const [documents, setDocuments] = useState<DMSDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DMSDocument | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatDoc, setChatDoc] = useState<DMSDocument | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, docType]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/dms/search?project_id=${projectId}&doc_type=${encodeURIComponent(docType)}&limit=100`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.results || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleDocSelection = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const toggleAllDocs = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.doc_id)));
    }
  };

  // Get first selected document for single-doc operations
  const getFirstSelectedDoc = useCallback((): DMSDocument | null => {
    if (selectedDocs.size === 0) return null;
    const firstId = Array.from(selectedDocs)[0];
    return documents.find(d => d.doc_id === firstId) || null;
  }, [selectedDocs, documents]);

  // Get all selected documents
  const getSelectedDocuments = useCallback((): DMSDocument[] => {
    return documents.filter(d => selectedDocs.has(d.doc_id));
  }, [selectedDocs, documents]);

  // Handle opening chat for a document
  const handleOpenChat = (doc: DMSDocument) => {
    setChatDoc(doc);
    setShowChatModal(true);
  };

  // Handle rename
  const handleRename = async (newName: string) => {
    const doc = getFirstSelectedDoc();
    if (!doc) return;

    const response = await fetch(
      `/api/projects/${projectId}/dms/docs/${doc.doc_id}/rename`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newName }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to rename');
    }

    // Refresh document list
    await fetchDocuments();
    setSelectedDocs(new Set());
  };

  // Handle delete
  const handleDelete = async () => {
    const docsToDelete = getSelectedDocuments();

    // Delete each document
    for (const doc of docsToDelete) {
      const response = await fetch(
        `/api/projects/${projectId}/dms/docs/${doc.doc_id}/delete`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to delete ${doc.doc_name}`);
      }
    }

    // Refresh document list
    await fetchDocuments();
    setSelectedDocs(new Set());
    setSelectedDoc(null);
  };

  // Handle download
  const handleDownload = async (doc: DMSDocument) => {
    try {
      // Use storage_uri if available (direct file URL)
      if (doc.storage_uri) {
        const response = await fetch(doc.storage_uri);
        if (!response.ok) throw new Error('Failed to download');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.doc_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Download not available for this document');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  };

  const selectedCount = selectedDocs.size;
  const firstSelected = getFirstSelectedDoc();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Breadcrumb */}
      <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={onBack}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Home
          </button>
          <span className="text-gray-400">{'>'}</span>
          <button
            onClick={onBack}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Documents
          </button>
          <span className="text-gray-400">{'>'}</span>
          <span className="text-gray-900 dark:text-gray-100">{docType}</span>
        </div>
      </div>

      {/* Filter Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <CIcon icon={cilFilterSquare} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{docType}</h1>
          <div className="ml-auto flex items-center gap-2">
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ▼
            </button>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
              aria-label="Close filter details"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <button className="text-blue-600 dark:text-blue-400">🔻</button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {documents.length} items | {selectedCount} selected
          </span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {/* Rename - single selection only */}
            <button
              className={`flex items-center gap-1 ${
                selectedCount === 1
                  ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
              onClick={() => selectedCount === 1 && setShowRenameModal(true)}
              disabled={selectedCount !== 1}
            >
              <CIcon icon={cilPencil} className="w-4 h-4" />
              Rename
            </button>

            {/* Download - single selection only */}
            <button
              className={`flex items-center gap-1 ${
                selectedCount === 1
                  ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
              onClick={() => firstSelected && handleDownload(firstSelected)}
              disabled={selectedCount !== 1}
            >
              <CIcon icon={cilCloudDownload} className="w-4 h-4" />
              Download
            </button>

            {/* Delete - works with multiple */}
            <button
              className={`flex items-center gap-1 ${
                selectedCount > 0
                  ? 'text-red-600 dark:text-red-400 hover:text-red-700'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
              onClick={() => selectedCount > 0 && setShowDeleteModal(true)}
              disabled={selectedCount === 0}
            >
              <CIcon icon={cilTrash} className="w-4 h-4" />
              Delete
            </button>

            {/* More dropdown */}
            <CDropdown variant="btn-group">
              <CDropdownToggle
                color="secondary"
                variant="ghost"
                size="sm"
                className="text-gray-600 dark:text-gray-400"
              >
                <CIcon icon={cilOptions} className="w-4 h-4" />
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem
                  onClick={() => {
                    // Move/Copy - TODO: implement
                    alert('Move/Copy coming soon');
                  }}
                >
                  Move/Copy
                </CDropdownItem>
                <CDropdownItem
                  onClick={() => {
                    // Email copy - TODO: implement
                    alert('Email copy coming soon');
                  }}
                >
                  Email copy
                </CDropdownItem>
                <CDropdownDivider />
                <CDropdownItem
                  onClick={() => {
                    // Edit profile - TODO: implement
                    alert('Edit profile coming soon');
                  }}
                  disabled={selectedCount === 0}
                >
                  Edit profile
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </div>
        </div>
      </div>

      {/* Main Content: Table + Preview Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading documents...</span>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                      checked={documents.length > 0 && selectedDocs.size === documents.length}
                      onChange={toggleAllDocs}
                    />
                  </th>
                  <th className="w-8"></th>
                  <th className="w-8"></th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                    Version
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                    Last modified date
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.doc_id}
                    className={`
                      border-b border-gray-100 dark:border-gray-800
                      hover:bg-gray-50 dark:hover:bg-gray-800
                      cursor-pointer
                      transition-colors
                      ${selectedDoc?.doc_id === doc.doc_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                        checked={selectedDocs.has(doc.doc_id)}
                        onChange={() => toggleDocSelection(doc.doc_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(doc);
                        }}
                        title="Chat with Landscaper about this document"
                      >
                        <CIcon icon={cilCommentSquare} className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-red-600 dark:text-red-400 text-lg">📄</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {doc.doc_name}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                        {doc.version_no || 1}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-sm">
                      {doc.updated_at ? formatDateTime(doc.updated_at) : 'No date'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && documents.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-sm">No documents in this folder</p>
            </div>
          )}
        </div>

        {/* Preview Panel (slides in from right when document selected) */}
        {selectedDoc && (
          <div className="w-[480px] border-l border-gray-200 dark:border-gray-700">
            <DocumentPreviewPanel
              projectId={projectId}
              document={selectedDoc}
              onClose={() => setSelectedDoc(null)}
              onDocumentChange={fetchDocuments}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {chatDoc && (
        <DocumentChatModal
          visible={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setChatDoc(null);
          }}
          projectId={projectId}
          document={{
            doc_id: parseInt(chatDoc.doc_id),
            filename: chatDoc.doc_name,
            version_number: chatDoc.version_no || 1,
          }}
        />
      )}

      {firstSelected && (
        <RenameModal
          visible={showRenameModal}
          onClose={() => setShowRenameModal(false)}
          docId={parseInt(firstSelected.doc_id)}
          projectId={projectId}
          currentName={firstSelected.doc_name}
          onRename={handleRename}
        />
      )}

      <DeleteConfirmModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        documents={getSelectedDocuments().map(d => ({
          doc_id: parseInt(d.doc_id),
          doc_name: d.doc_name,
        }))}
        projectId={projectId}
        onDelete={handleDelete}
      />
    </div>
  );
}
