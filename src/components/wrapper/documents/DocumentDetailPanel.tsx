'use client';

import React from 'react';
import CIcon from '@coreui/icons-react';
import { cilX } from '@coreui/icons';

export interface DocumentDetailDoc {
  doc_id: string;
  doc_name?: string;
  original_filename?: string;
  doc_type?: string | null;
  status?: string | null;
  version_no?: number | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  created_at?: string;
  updated_at?: string;
  doc_date?: string | null;
  profile_json?: Record<string, unknown> | null;
}

interface Props {
  doc: DocumentDetailDoc;
  onClose: () => void;
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso?: string | null, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (withTime) {
    return d.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DocumentDetailPanel({ doc, onClose }: Props) {
  const name = doc.doc_name || doc.original_filename || `Document ${doc.doc_id}`;
  const ver = doc.version_no ?? 1;
  const parties =
    (doc.profile_json?.parties as string | undefined) ||
    (doc.profile_json?.party as string | undefined) ||
    '';

  return (
    <aside className="w-doc-detail">
      <div className="w-doc-detail-header">
        <span className="w-doc-detail-title">Document Details</span>
        <div className="w-doc-detail-actions">
          <button className="w-doc-detail-close" onClick={onClose} aria-label="Close">
            <CIcon icon={cilX} size="sm" />
          </button>
        </div>
      </div>
      <div className="w-doc-detail-body">
        <DetailRow label="Title">
          <span>{name}</span>{' '}
          <span className="w-doc-detail-version">V{ver}</span>
        </DetailRow>
        <DetailRow label="Type">{doc.doc_type || '—'}</DetailRow>
        <DetailRow label="Status">{doc.status || 'Draft'}</DetailRow>
        <DetailRow label="Version">{ver}</DetailRow>
        <DetailRow label="File Info">
          {formatSize(doc.file_size_bytes)}
          {doc.mime_type ? ` · ${doc.mime_type}` : ''}
        </DetailRow>
        <DetailRow label="Created">{formatDate(doc.created_at)}</DetailRow>
        <DetailRow label="Modified">{formatDate(doc.updated_at, true)}</DetailRow>
        {parties && <DetailRow label="Parties">{parties}</DetailRow>}

        <div className="w-doc-detail-divider" />

        <div className="w-doc-detail-action-list">
          <button className="w-doc-detail-action">⟳ Upload New Version</button>
          <button className="w-doc-detail-action">⚙ Edit Profile</button>
          <button className="w-doc-detail-action">↓ Download</button>
          <button className="w-doc-detail-action">✏ Rename</button>
          <button className="w-doc-detail-action is-danger">🗑 Delete</button>
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="w-doc-detail-row">
      <span className="w-doc-detail-label">{label}</span>
      <span className="w-doc-detail-value">{children}</span>
    </div>
  );
}
