'use client';

import React, { useEffect, useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilX } from '@coreui/icons';

import { getAuthHeaders } from '@/lib/authHeaders';
export interface DocumentDetailDoc {
  doc_id: string;
  doc_name?: string;
  original_filename?: string;
  doc_type?: string | null;
  status?: string | null;
  version_no?: number | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  storage_uri?: string | null;
  created_at?: string;
  updated_at?: string;
  doc_date?: string | null;
  profile_json?: Record<string, unknown> | null;
}

interface Props {
  doc: DocumentDetailDoc;
  onClose: () => void;
}

/**
 * Returns an "open externally" label hint based on mime type — purely
 * cosmetic guidance for the user (browser actually decides what app to
 * launch, since web apps cannot directly invoke a desktop app).
 */
function externalOpenHint(mime?: string | null, name?: string): string {
  const lower = (mime || '').toLowerCase();
  const ext = (name || '').toLowerCase().split('.').pop() || '';
  if (lower.includes('pdf') || ext === 'pdf') return 'Open PDF';
  if (
    lower.includes('spreadsheet') ||
    lower.includes('excel') ||
    ext === 'xlsx' ||
    ext === 'xls' ||
    ext === 'xlsm' ||
    ext === 'csv'
  )
    return 'Open in Excel';
  if (
    lower.includes('word') ||
    lower.includes('document') ||
    ext === 'docx' ||
    ext === 'doc'
  )
    return 'Open in Word';
  if (lower.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext))
    return 'Open Image';
  return 'Open';
}

function isPdfMime(mime?: string | null, name?: string): boolean {
  const lower = (mime || '').toLowerCase();
  const ext = (name || '').toLowerCase().split('.').pop() || '';
  return lower.includes('pdf') || ext === 'pdf';
}

function isImageMime(mime?: string | null, name?: string): boolean {
  const lower = (mime || '').toLowerCase();
  const ext = (name || '').toLowerCase().split('.').pop() || '';
  return (
    lower.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
  );
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

  // Lazy-load the canonical doc record to grab storage_uri + mime_type.
  // The list rows only carry a partial DMSDoc shape, but /api/dms/docs/[id]
  // returns the full record (storage_uri included) — needed for preview +
  // open-externally + download to work without plumbing storage_uri through
  // the search-result types.
  const [storageUri, setStorageUri] = useState<string | null>(
    doc.storage_uri ?? null
  );
  const [mimeType, setMimeType] = useState<string | null>(doc.mime_type ?? null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    // Reset on doc change
    setStorageUri(doc.storage_uri ?? null);
    setMimeType(doc.mime_type ?? null);
    if (doc.storage_uri) return;

    let cancelled = false;
    setLoadingDetail(true);
    fetch(`/api/dms/docs/${doc.doc_id}`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.storage_uri === 'string') setStorageUri(data.storage_uri);
        if (typeof data.mime_type === 'string') setMimeType(data.mime_type);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doc.doc_id, doc.storage_uri, doc.mime_type]);

  const canPreview =
    !!storageUri && (isPdfMime(mimeType, name) || isImageMime(mimeType, name));
  const openLabel = externalOpenHint(mimeType, name);

  const handleOpenExternally = () => {
    if (!storageUri) return;
    // Browser default: open inline if it knows the type (PDF/image), otherwise
    // download. Cannot directly invoke a native desktop app from a web page,
    // but for Excel/Word the browser will save and OS open-with handles the
    // hand-off.
    window.open(storageUri, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    if (!storageUri) return;
    const a = document.createElement('a');
    a.href = storageUri;
    a.download = name;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
        {/* Preview pane — renderable types only (PDF + images). For Excel/Word
            and others, we skip preview and lean on the Open button. */}
        {canPreview && storageUri && (
          <div className="w-doc-detail-preview">
            {isPdfMime(mimeType, name) ? (
              <iframe
                src={storageUri}
                title={`Preview of ${name}`}
                className="w-doc-detail-preview-frame"
              />
            ) : (
              <img
                src={storageUri}
                alt={name}
                className="w-doc-detail-preview-image"
              />
            )}
          </div>
        )}

        <DetailRow label="Title">
          <span>{name}</span>{' '}
          <span className="w-doc-detail-version">V{ver}</span>
        </DetailRow>
        <DetailRow label="Type">{doc.doc_type || '—'}</DetailRow>
        <DetailRow label="Status">{doc.status || 'Draft'}</DetailRow>
        <DetailRow label="Version">{ver}</DetailRow>
        <DetailRow label="File Info">
          {formatSize(doc.file_size_bytes)}
          {mimeType ? ` · ${mimeType}` : ''}
        </DetailRow>
        <DetailRow label="Created">{formatDate(doc.created_at)}</DetailRow>
        <DetailRow label="Modified">{formatDate(doc.updated_at, true)}</DetailRow>
        {parties && <DetailRow label="Parties">{parties}</DetailRow>}

        <div className="w-doc-detail-divider" />

        <div className="w-doc-detail-action-list">
          <button
            className="w-doc-detail-action"
            onClick={handleOpenExternally}
            disabled={!storageUri || loadingDetail}
            title={!storageUri ? 'File location not available' : ''}
          >
            ↗ {openLabel}
          </button>
          <button
            className="w-doc-detail-action"
            onClick={handleDownload}
            disabled={!storageUri || loadingDetail}
          >
            ↓ Download
          </button>
          <button className="w-doc-detail-action">⟳ Upload New Version</button>
          <button className="w-doc-detail-action">⚙ Edit Profile</button>
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
