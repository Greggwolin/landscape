'use client';

import React, { useState } from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilCommentSquare,
  cilPencil,
  cilCloudDownload,
  cilTrash,
  cilX,
  cilSettings,
} from '@coreui/icons';
import type { DMSDocument } from '@/types/dms';
import { DocumentChatModal, RenameModal, DeleteConfirmModal } from '../modals';
import ProfileForm from '../profile/ProfileForm';

interface DocumentPreviewPanelProps {
  projectId: number;
  document: DMSDocument;
  onClose: () => void;
  onDocumentChange?: () => void;
}

export default function DocumentPreviewPanel({
  projectId,
  document: doc,
  onClose,
  onDocumentChange,
}: DocumentPreviewPanelProps) {
  const [showChatModal, setShowChatModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (bytes == null) return null;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRename = async (newName: string) => {
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

    onDocumentChange?.();
  };

  const handleDelete = async () => {
    const response = await fetch(
      `/api/projects/${projectId}/dms/docs/${doc.doc_id}/delete`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete');
    }

    onDocumentChange?.();
    onClose();
  };

  const handleDownload = async () => {
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
        // Fallback: open in new tab if no storage_uri
        alert('Download not available for this document');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  };

  const handleSaveProfile = async (profile: Record<string, unknown>) => {
    const response = await fetch(`/api/dms/documents/${doc.doc_id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });

    if (!response.ok) {
      throw new Error('Failed to save profile');
    }

    setShowProfileForm(false);
    onDocumentChange?.();
  };

  // Extract profile data
  const profile = doc.profile_json || {};
  const description = profile.description as string | undefined;
  const parties = profile.parties as string | undefined;
  const dollarAmount = profile.dollar_amount as number | undefined;

  // Show profile form if editing
  if (showProfileForm) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto p-4">
          <ProfileForm
            docId={parseInt(doc.doc_id)}
            projectId={projectId}
            docType={doc.doc_type || undefined}
            initialProfile={{
              doc_type: doc.doc_type || '',
              description: description || '',
              tags: doc.tags || [],
              doc_date: doc.doc_date || '',
              parties: parties || '',
              dollar_amount: dollarAmount,
            }}
            onSave={handleSaveProfile}
            onCancel={() => setShowProfileForm(false)}
            onSuccess={() => setShowProfileForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-red-600 dark:text-red-400 text-lg flex-shrink-0">📄</span>
          <span className="font-medium truncate text-gray-900 dark:text-gray-100">
            {doc.doc_name}
          </span>
          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded flex-shrink-0">
            V{doc.version_no || 1}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1"
            onClick={() => setShowChatModal(true)}
          >
            <CIcon icon={cilCommentSquare} className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Close preview"
          >
            <CIcon icon={cilX} className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Document Metadata - 2-column layout */}
        <table className="w-full text-sm">
          <tbody>
            {/* Core Fields */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Type</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">{doc.doc_type || 'Not specified'}</td>
            </tr>

            {doc.status && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Status</td>
                <td className="py-2 text-gray-900 dark:text-gray-100 capitalize">{doc.status}</td>
              </tr>
            )}

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Version</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">{doc.version_no || 1}</td>
            </tr>

            {doc.discipline && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Discipline</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">{doc.discipline}</td>
              </tr>
            )}

            {/* File Info */}
            {(doc.file_size_bytes || doc.mime_type) && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">File Info</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">
                  {[formatFileSize(doc.file_size_bytes), doc.mime_type].filter(Boolean).join(' • ')}
                </td>
              </tr>
            )}

            {/* Dates */}
            {doc.doc_date && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Document Date</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">
                  {new Date(doc.doc_date).toLocaleDateString()}
                </td>
              </tr>
            )}

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Created</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {new Date(doc.created_at).toLocaleDateString()}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Modified</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {formatDateTime(doc.updated_at)}
              </td>
            </tr>

            {/* Profile Fields */}
            {description && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap align-top">Description</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">{description}</td>
              </tr>
            )}

            {parties && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Parties</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">{parties}</td>
              </tr>
            )}

            {(doc.contract_value || dollarAmount) && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Amount</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">
                  {formatCurrency(doc.contract_value || dollarAmount)}
                </td>
              </tr>
            )}

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <tr>
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap align-top">Tags</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors"
          onClick={() => setShowProfileForm(true)}
        >
          <CIcon icon={cilSettings} className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors"
          onClick={handleDownload}
        >
          <CIcon icon={cilCloudDownload} className="w-4 h-4" />
          <span>Download</span>
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors"
          onClick={() => setShowRenameModal(true)}
        >
          <CIcon icon={cilPencil} className="w-4 h-4" />
          <span>Rename</span>
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-red-600 dark:text-red-400 transition-colors"
          onClick={() => setShowDeleteModal(true)}
        >
          <CIcon icon={cilTrash} className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>

      {/* Modals */}
      <DocumentChatModal
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        projectId={projectId}
        document={{
          doc_id: parseInt(doc.doc_id),
          filename: doc.doc_name,
          version_number: doc.version_no || 1,
        }}
      />

      <RenameModal
        visible={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        docId={parseInt(doc.doc_id)}
        projectId={projectId}
        currentName={doc.doc_name}
        onRename={handleRename}
      />

      <DeleteConfirmModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        documents={[{ doc_id: parseInt(doc.doc_id), doc_name: doc.doc_name }]}
        projectId={projectId}
        onDelete={handleDelete}
      />
    </div>
  );
}
