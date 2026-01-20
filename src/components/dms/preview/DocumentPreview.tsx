'use client';

import React, { useMemo, useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilCommentSquare, cilPencil, cilCloudDownload, cilTrash, cilX } from '@coreui/icons';
import Link from 'next/link';
import type { DMSDocument } from '@/types/dms';
import ProfileForm from '@/components/dms/profile/ProfileForm';
import { RenameModal, DeleteConfirmModal } from '@/components/dms/modals';
import { useToast } from '@/hooks/use-toast';

interface DocumentPreviewProps {
  document: DMSDocument;
  showProject?: boolean;
  onClose: () => void;
  onChat?: (doc: DMSDocument) => void;
  onUpdate?: () => void;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatFileSize = (bytes: number | null | undefined) => {
  if (bytes == null) return '—';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function DocumentPreview({
  document,
  showProject = false,
  onClose,
  onChat,
  onUpdate
}: DocumentPreviewProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const projectId = useMemo(() => {
    if (!document.project_id) return null;
    const parsed = parseInt(document.project_id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [document.project_id]);

  const workspaceId = useMemo(() => {
    if (!document.workspace_id) return undefined;
    const parsed = parseInt(document.workspace_id, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [document.workspace_id]);

  const handleSaveProfile = async (profile: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/dms/documents/${document.doc_id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      if (!response.ok) throw new Error('Failed to update profile');
      setIsEditing(false);
      onUpdate?.();
      showToast('Profile updated', 'success');
    } catch (error) {
      console.error('Profile update failed:', error);
      showToast('Failed to update profile', 'error');
    }
  };

  const handleDownload = async () => {
    try {
      if (document.storage_uri) {
        const response = await fetch(document.storage_uri);
        if (!response.ok) throw new Error('Failed to download');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.doc_name;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        showToast('Download not available for this document', 'error');
      }
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download document', 'error');
    }
  };

  const handleRename = async (newName: string) => {
    if (!projectId) {
      showToast('Cannot rename: document not linked to a project', 'error');
      return;
    }
    const response = await fetch(
      `/api/projects/${projectId}/dms/docs/${document.doc_id}/rename`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newName })
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to rename');
    }

    onUpdate?.();
    showToast('Document renamed', 'success');
  };

  const handleDelete = async () => {
    if (!projectId) {
      showToast('Cannot delete: document not linked to a project', 'error');
      return;
    }
    const response = await fetch(
      `/api/projects/${projectId}/dms/docs/${document.doc_id}/delete`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete');
    }

    onUpdate?.();
    onClose();
    showToast('Document deleted', 'success');
  };

  if (isEditing) {
    if (!projectId) {
      return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-medium text-gray-900 dark:text-gray-100">Edit Profile</span>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              aria-label="Close edit"
            >
              <CIcon icon={cilX} className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
            This document is not linked to a project. Profile editing is disabled.
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-gray-100">Edit Profile</span>
          <button
            onClick={() => setIsEditing(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Close edit"
          >
            <CIcon icon={cilX} className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ProfileForm
            docId={parseInt(document.doc_id, 10)}
            projectId={projectId}
            workspaceId={workspaceId}
            docType={document.doc_type || undefined}
            initialProfile={document.profile_json || {}}
            onSave={handleSaveProfile}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-red-600 dark:text-red-400 text-lg">📄</span>
          <span className="font-medium truncate text-gray-900 dark:text-gray-100">
            {document.doc_name}
          </span>
          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
            V{document.version_no || 1}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onChat && (
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1"
              onClick={() => onChat(document)}
            >
              <CIcon icon={cilCommentSquare} className="w-4 h-4" />
              Chat
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Close preview"
          >
            <CIcon icon={cilX} className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
          <div className="aspect-[8.5/11] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-600 text-6xl">📄</span>
          </div>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {showProject && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Project</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">
                  {projectId ? (
                    <Link
                      href={`/projects/${projectId}/documents`}
                      className="text-blue-600 hover:underline"
                    >
                      {document.project_name || `Project ${projectId}`}
                    </Link>
                  ) : (
                    document.project_name || '—'
                  )}
                </td>
              </tr>
            )}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Type</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">{document.doc_type || '—'}</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Status</td>
              <td className="py-2 text-gray-900 dark:text-gray-100 capitalize">
                {document.status || '—'}
              </td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Version</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">{document.version_no || 1}</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">File Info</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {[formatFileSize(document.file_size_bytes), document.mime_type].filter(Boolean).join(' • ')}
              </td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Created</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">{formatDate(document.created_at)}</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Modified</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">{formatDateTime(document.updated_at)}</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Document Date</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {(document.profile_json?.doc_date as string)
                  ? formatDate(document.profile_json.doc_date as string)
                  : '—'}
              </td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Parties</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {(document.profile_json?.parties as string) || '—'}
              </td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Amount</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {document.profile_json?.dollar_amount != null
                  ? `$${Number(document.profile_json.dollar_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap align-top">Tags</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {Array.isArray(document.profile_json?.tags) && (document.profile_json.tags as string[]).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(document.profile_json.tags as string[]).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap align-top">Description</td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {(document.profile_json?.description as string) || '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          <CIcon icon={cilPencil} className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors"
          onClick={handleDownload}
        >
          <CIcon icon={cilCloudDownload} className="w-4 h-4" />
          <span>Download</span>
        </button>
        {projectId && (
          <>
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
          </>
        )}
      </div>

      {/* Modals */}
      {projectId && (
        <>
          <RenameModal
            visible={showRenameModal}
            onClose={() => setShowRenameModal(false)}
            docId={parseInt(document.doc_id, 10)}
            projectId={projectId}
            currentName={document.doc_name}
            onRename={handleRename}
          />

          <DeleteConfirmModal
            visible={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            documents={[{ doc_id: parseInt(document.doc_id, 10), doc_name: document.doc_name }]}
            projectId={projectId}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
