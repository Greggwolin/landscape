'use client';

import React, { useState, useEffect } from 'react';
import CIcon from '@coreui/icons-react';
import { cilFilterSquare } from '@coreui/icons';
import type { DMSDocument } from '@/types/dms';

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
          <button className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors">
            ⭐
          </button>
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
            {documents.length} items | {selectedDocs.size} selected
          </span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <button className="text-blue-600 dark:text-blue-400 hover:underline">
              🤖 Ask AI
            </button>
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              ✏️ Rename
            </button>
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1">
              <CIcon icon={cilFilterSquare} className="w-4 h-4" />
              Move/Copy
            </button>
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              📧 Email copy
            </button>
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              ✏️ Edit profile
            </button>
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              ✅ Check in
            </button>
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              ⋯ More
            </button>
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
                    Total Versions
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                    Last modified date ↓
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                    Notes
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
                        className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Toggle star
                        }}
                      >
                        ⭐
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
                    <td className="px-3 py-3"></td>
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
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
            {/* Preview Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-red-600 dark:text-red-400 text-lg flex-shrink-0">📄</span>
                <span className="font-medium truncate text-gray-900 dark:text-gray-100">
                  {selectedDoc.doc_name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                  Full View
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* PDF Thumbnail Placeholder */}
              <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                <div className="aspect-[8.5/11] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-600 text-4xl">📄</span>
                </div>
              </div>

              {/* Document Metadata */}
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">Type</div>
                  <div className="text-gray-900 dark:text-gray-100">{selectedDoc.doc_type}</div>
                </div>

                {selectedDoc.discipline && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">Discipline</div>
                    <div className="text-gray-900 dark:text-gray-100">{selectedDoc.discipline}</div>
                  </div>
                )}

                {selectedDoc.doc_date && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">Document Date</div>
                    <div className="text-gray-900 dark:text-gray-100">
                      {new Date(selectedDoc.doc_date).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedDoc.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">Created</div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {new Date(selectedDoc.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">Last Modified</div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {formatDateTime(selectedDoc.updated_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors">
                <span>📋</span>
                <span>Copy</span>
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors">
                <span>📄</span>
                <span>Duplicate</span>
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-red-600 dark:text-red-400 transition-colors">
                <span>🗑️</span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
