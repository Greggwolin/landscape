'use client';

import React, { useState } from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilCommentSquare,
  cilPencil,
  cilCloudUpload,
  cilCloudDownload,
  cilTrash,
  cilX,
  cilSettings,
} from '@coreui/icons';
import type { DMSDocument } from '@/types/dms';
import { useToast } from '@/components/ui/toast';
import { DocumentChatModal, RenameModal, DeleteConfirmModal } from '../modals';
import ProfileForm from '../profile/ProfileForm';
import DocumentVersionHistory from './DocumentVersionHistory';

interface DocumentPreviewPanelProps {
  projectId: number;
  document: DMSDocument;
  onClose: () => void;
  onDocumentChange?: (options?: { keepSelection?: boolean; updatedDoc?: DMSDocument }) => void;
  folderDocType?: string;
}

export default function DocumentPreviewPanel({
  projectId,
  document: doc,
  onClose,
  onDocumentChange,
  folderDocType,
}: DocumentPreviewPanelProps) {
  const { showToast } = useToast();
  const [showChatModal, setShowChatModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showVersionUpload, setShowVersionUpload] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState('');
  const [versionError, setVersionError] = useState<string | null>(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

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

  const buildUpdatedDoc = (data: Partial<Record<string, unknown>>): DMSDocument => {
    const updatedDocId = data.doc_id ? String(data.doc_id) : doc.doc_id;
    return {
      ...doc,
      doc_id: updatedDocId,
      doc_name: (data.doc_name as string) || doc.doc_name,
      version_no: (data.version_no as number) ?? doc.version_no,
      storage_uri: (data.storage_uri as string) || doc.storage_uri,
      mime_type: (data.mime_type as string) || doc.mime_type,
      file_size_bytes: (data.file_size_bytes as number) ?? doc.file_size_bytes,
      sha256_hash: (data.sha256_hash as string) || doc.sha256_hash,
      created_at: (data.created_at as string) || doc.created_at,
      updated_at: (data.updated_at as string) || doc.updated_at,
      status: (data.status as string) || doc.status,
    };
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

    // Detect doc_type change for toast notification
    const newDocType = profile.doc_type as string | undefined;
    const oldDocType = doc.doc_type;
    if (newDocType && newDocType !== oldDocType) {
      const label = newDocType.charAt(0).toUpperCase() + newDocType.slice(1);
      showToast({
        title: 'Document Moved',
        message: `Document moved to ${label}`,
        type: 'success',
      });
    } else {
      showToast('Profile saved', 'success');
    }

    setShowProfileForm(false);
    onDocumentChange?.();
  };

  const handleUploadNewVersion = async () => {
    if (!versionFile) {
      setVersionError('Please select a file to upload.');
      return;
    }

    setIsUploadingVersion(true);
    setVersionError(null);

    try {
      const formData = new FormData();
      formData.append('file', versionFile);
      if (versionNotes.trim()) {
        formData.append('notes', versionNotes.trim());
      }

      const response = await fetch(
        `/api/projects/${projectId}/dms/docs/${doc.doc_id}/version`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to upload new version');
      }

      const data = await response.json();
      const updatedDoc = buildUpdatedDoc(data);
      onDocumentChange?.({ keepSelection: true, updatedDoc });
      showToast(`Version V${updatedDoc.version_no || ''} uploaded`, 'success');
      setShowVersionUpload(false);
      setVersionFile(null);
      setVersionNotes('');
    } catch (error) {
      console.error('Version upload error:', error);
      setVersionError(error instanceof Error ? error.message : 'Failed to upload new version');
      showToast('Failed to upload new version', 'error');
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleRestoreVersion = (data: Record<string, unknown>) => {
    const updatedDoc = buildUpdatedDoc(data);
    onDocumentChange?.({ keepSelection: true, updatedDoc });
    showToast(`Restored as V${updatedDoc.version_no || ''}`, 'success');
  };

  // Extract profile data
  const profile = doc.profile_json || {};
  const description = profile.description as string | undefined;
  const parties = profile.parties as string | undefined;
  const dollarAmount = profile.dollar_amount as number | undefined;

  const rowBorderStyle = { borderBottom: '1px solid var(--cui-card-border-color)' };
  const labelCellStyle = { color: 'var(--cui-secondary-color)' };
  const valueCellStyle = { color: 'var(--cui-body-color)' };

  // Show profile form if editing
  if (showProfileForm) {
    return (
      <div className="h-100 d-flex flex-column" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
        <div className="flex-grow-1 overflow-auto p-3">
          <ProfileForm
            docId={parseInt(doc.doc_id)}
            projectId={projectId}
            docType={doc.doc_type || folderDocType || undefined}
            initialProfile={{
              doc_type: doc.doc_type || folderDocType || '',
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
    <div className="h-100 d-flex flex-column" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
      {/* Header */}
      <div
        className="p-3 border-bottom d-flex align-items-center justify-content-between"
        style={{ borderColor: 'var(--cui-card-border-color)', backgroundColor: 'var(--cui-card-header-bg)' }}
      >
        <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: 0 }}>
          <span className="flex-shrink-0" style={{ fontSize: '1rem', color: 'var(--cui-danger)' }}>📄</span>
          <span className="fw-semibold text-truncate" style={{ color: 'var(--cui-body-color)' }}>
            {doc.doc_name}
          </span>
          <button
            type="button"
            onClick={() => setShowVersionHistory((prev) => !prev)}
            className="badge rounded-pill flex-shrink-0"
            style={{
              backgroundColor: 'var(--cui-primary-bg-subtle)',
              color: 'var(--cui-primary)',
              border: '1px solid var(--cui-primary-border-subtle)'
            }}
            aria-label="Toggle version history"
            title="View version history"
          >
            V{doc.version_no || 1}
          </button>
        </div>
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={() => setShowChatModal(true)}
          >
            <CIcon icon={cilCommentSquare} />
            Chat
          </button>
          <button
            onClick={onClose}
            className="btn btn-link btn-sm p-0"
            style={{ color: 'var(--cui-secondary-color)' }}
            aria-label="Close preview"
          >
            <CIcon icon={cilX} />
          </button>
        </div>
      </div>

      {showVersionHistory && (
        <div className="border-bottom" style={{ borderColor: 'var(--cui-card-border-color)' }}>
          <DocumentVersionHistory
            projectId={projectId}
            docId={parseInt(doc.doc_id)}
            currentDocId={parseInt(doc.doc_id)}
            onRestored={handleRestoreVersion}
          />
        </div>
      )}

      {/* Preview Content */}
      <div className="flex-grow-1 overflow-auto p-3">
        {/* Document Metadata - 2-column layout */}
        <table className="w-100 small">
          <tbody>
            {/* Core Fields */}
            <tr style={rowBorderStyle}>
              <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Type</td>
              <td className="py-2" style={valueCellStyle}>{doc.doc_type || 'Not specified'}</td>
            </tr>

            {doc.status && (
              <tr style={rowBorderStyle}>
                <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Status</td>
                <td className="py-2 text-capitalize" style={valueCellStyle}>{doc.status}</td>
              </tr>
            )}

            <tr style={rowBorderStyle}>
              <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Version</td>
              <td className="py-2" style={valueCellStyle}>{doc.version_no || 1}</td>
            </tr>

            {doc.discipline && (
              <tr style={rowBorderStyle}>
                <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Discipline</td>
                <td className="py-2" style={valueCellStyle}>{doc.discipline}</td>
              </tr>
            )}

            {/* File Info */}
            {(doc.file_size_bytes || doc.mime_type) && (
              <tr style={rowBorderStyle}>
                <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>File Info</td>
                <td className="py-2" style={valueCellStyle}>
                  {[formatFileSize(doc.file_size_bytes), doc.mime_type].filter(Boolean).join(' • ')}
                </td>
              </tr>
            )}

            {/* Dates */}
            {doc.doc_date && (
              <tr style={rowBorderStyle}>
                <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Document Date</td>
                <td className="py-2" style={valueCellStyle}>
                  {new Date(doc.doc_date).toLocaleDateString()}
                </td>
              </tr>
            )}

            <tr style={rowBorderStyle}>
              <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Created</td>
              <td className="py-2" style={valueCellStyle}>
                {new Date(doc.created_at).toLocaleDateString()}
              </td>
            </tr>

            <tr style={rowBorderStyle}>
              <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Modified</td>
              <td className="py-2" style={valueCellStyle}>
                {formatDateTime(doc.updated_at)}
              </td>
            </tr>

            {/* Profile Fields */}
            {description && (
              <tr style={rowBorderStyle}>
                <td className="py-2 pe-3 fw-semibold text-nowrap align-top" style={labelCellStyle}>Description</td>
                <td className="py-2" style={valueCellStyle}>{description}</td>
              </tr>
            )}

            {parties && (
              <tr style={rowBorderStyle}>
                <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Parties</td>
                <td className="py-2" style={valueCellStyle}>{parties}</td>
              </tr>
            )}

            {(doc.contract_value || dollarAmount) && (
              <tr style={rowBorderStyle}>
                <td className="py-2 pe-3 fw-semibold text-nowrap" style={labelCellStyle}>Amount</td>
                <td className="py-2" style={valueCellStyle}>
                  {formatCurrency(doc.contract_value || dollarAmount)}
                </td>
              </tr>
            )}

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <tr>
                <td className="py-2 pe-3 fw-semibold text-nowrap align-top" style={labelCellStyle}>Tags</td>
                <td className="py-2">
                  <div className="d-flex flex-wrap gap-1">
                    {doc.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="badge rounded-pill"
                        style={{
                          backgroundColor: 'var(--cui-tertiary-bg)',
                          color: 'var(--cui-body-color)',
                          border: '1px solid var(--cui-border-color)'
                        }}
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
      <div
        className="p-3 border-top"
        style={{ borderColor: 'var(--cui-card-border-color)', backgroundColor: 'var(--cui-card-bg)' }}
      >
        <div className="d-grid gap-2">
          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 justify-content-start"
            onClick={() => setShowVersionUpload(true)}
          >
            <CIcon icon={cilCloudUpload} />
            <span>Upload New Version</span>
          </button>
          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 justify-content-start"
            onClick={() => setShowProfileForm(true)}
          >
            <CIcon icon={cilSettings} />
            <span>Edit Profile</span>
          </button>
          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 justify-content-start"
            onClick={handleDownload}
          >
            <CIcon icon={cilCloudDownload} />
            <span>Download</span>
          </button>
          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 justify-content-start"
            onClick={() => setShowRenameModal(true)}
          >
            <CIcon icon={cilPencil} />
            <span>Rename</span>
          </button>
          <button
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 justify-content-start"
            onClick={() => setShowDeleteModal(true)}
          >
            <CIcon icon={cilTrash} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {showVersionUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md mx-4 rounded-lg shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--cui-body-bg)' }}
          >
            <div
              className="px-4 py-3 border-bottom"
              style={{ borderColor: 'var(--cui-border-color)' }}
            >
              <h3 className="text-sm font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                Upload New Version
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  File
                </label>
                <input
                  type="file"
                  className="form-control form-control-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setVersionFile(file);
                    setVersionError(null);
                  }}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  Version Notes (optional)
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={versionNotes}
                  onChange={(event) => setVersionNotes(event.target.value)}
                  placeholder="Updated rent roll for October"
                />
              </div>
              {versionError && (
                <div className="text-xs" style={{ color: 'var(--cui-danger)' }}>
                  {versionError}
                </div>
              )}
              <div className="d-flex gap-2 justify-content-end">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setShowVersionUpload(false);
                    setVersionFile(null);
                    setVersionNotes('');
                    setVersionError(null);
                  }}
                  disabled={isUploadingVersion}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleUploadNewVersion}
                  disabled={isUploadingVersion}
                >
                  {isUploadingVersion ? 'Uploading...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
