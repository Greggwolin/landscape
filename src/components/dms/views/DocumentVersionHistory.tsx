'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface DocumentVersion {
  doc_id: number;
  version_no: number;
  doc_name: string;
  storage_uri?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  uploaded_at?: string | null;
  uploaded_by?: string | number | null;
  notes?: string | null;
  extraction_summary?: string | null;
}

interface DocumentVersionHistoryProps {
  projectId: number;
  docId: number;
  currentDocId: number;
  onRestored?: (data: Record<string, unknown>) => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentVersionHistory({
  projectId,
  docId,
  currentDocId,
  onRestored,
}: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/dms/docs/${docId}/versions`
      );
      if (!response.ok) {
        throw new Error('Failed to load version history');
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.versions || []);
      setVersions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, docId]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const handleRestore = async (version: DocumentVersion) => {
    setRestoringId(version.doc_id);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/dms/docs/${docId}/restore-version`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_doc_id: version.doc_id }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to restore version');
      }
      const data = await response.json();
      onRestored?.(data);
      void loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setRestoringId(null);
    }
  };

  const PREVIEWABLE_MIMES = new Set([
    'application/pdf',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'text/plain', 'text/html', 'text/csv',
  ]);

  const isPreviewable = (mime: string | null | undefined): boolean => {
    if (!mime) return false;
    return PREVIEWABLE_MIMES.has(mime.toLowerCase());
  };

  const handleViewVersion = async (version: DocumentVersion) => {
    if (!version.storage_uri) return;
    try {
      const response = await fetch(version.storage_uri);
      if (!response.ok) throw new Error('Failed to fetch file');
      const arrayBuffer = await response.arrayBuffer();
      const mimeType = version.mime_type || response.headers.get('content-type') || 'application/octet-stream';
      const blob = new Blob([arrayBuffer], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      window.open(version.storage_uri, '_blank');
    }
  };

  const handleDownloadVersion = async (version: DocumentVersion) => {
    if (!version.storage_uri) return;
    try {
      const response = await fetch(version.storage_uri);
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.doc_name || `version_${version.version_no}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(version.storage_uri, '_blank');
    }
  };

  return (
    <div className="p-3">
      <div className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--cui-secondary-color)' }}>
        Version History
      </div>

      {isLoading && (
        <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
          Loading versions...
        </div>
      )}
      {error && (
        <div className="text-xs" style={{ color: 'var(--cui-danger)' }}>
          {error}
        </div>
      )}
      {!isLoading && !error && versions.length === 0 && (
        <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
          No versions found.
        </div>
      )}

      {/* Vertical timeline */}
      <div style={{ position: 'relative' }}>
        {/* Connector line */}
        {versions.length > 1 && (
          <div
            style={{
              position: 'absolute',
              left: 11,
              top: 12,
              bottom: 12,
              width: 2,
              backgroundColor: 'var(--cui-border-color)',
              zIndex: 0,
            }}
          />
        )}

        {versions.map((version, idx) => {
          const isCurrent = version.doc_id === currentDocId;
          const isFirst = idx === 0;
          const isLast = idx === versions.length - 1;
          const sizeStr = formatFileSize(version.file_size_bytes);

          return (
            <div
              key={version.doc_id}
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: isLast ? 0 : 16,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Timeline dot */}
              <div
                style={{
                  width: 24,
                  minWidth: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: 2,
                }}
              >
                <div
                  style={{
                    width: isCurrent ? 12 : 10,
                    height: isCurrent ? 12 : 10,
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? 'var(--cui-primary)' : 'var(--cui-body-bg)',
                    border: `2px solid ${isCurrent ? 'var(--cui-primary)' : 'var(--cui-border-color)'}`,
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Version card */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 6,
                  padding: '8px 10px',
                  border: `1px solid ${isCurrent ? 'var(--cui-primary)' : 'var(--cui-border-color)'}`,
                  backgroundColor: isCurrent ? 'var(--cui-primary-bg)' : 'var(--cui-body-bg)',
                }}
              >
                {/* Header row: version + current badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="fw-semibold" style={{ fontSize: 13, color: 'var(--cui-body-color)' }}>
                      V{version.version_no}
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 3,
                          backgroundColor: 'var(--cui-primary)',
                          color: '#fff',
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                  {version.uploaded_at && (
                    <span style={{ fontSize: 11, color: 'var(--cui-secondary-color)' }}>
                      {formatRelativeDate(version.uploaded_at)}
                    </span>
                  )}
                </div>

                {/* Filename + size */}
                <div style={{ fontSize: 11, color: 'var(--cui-body-color)', marginBottom: 2 }}>
                  {version.doc_name}
                  {sizeStr && (
                    <span style={{ color: 'var(--cui-secondary-color)', marginLeft: 6 }}>
                      ({sizeStr})
                    </span>
                  )}
                </div>

                {/* Notes */}
                {version.notes && (
                  <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginBottom: 2, fontStyle: 'italic' }}>
                    {version.notes}
                  </div>
                )}

                {/* Extraction summary */}
                {version.extraction_summary && (
                  <div style={{ fontSize: 10, color: 'var(--cui-secondary-color)' }}>
                    {version.extraction_summary}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {version.storage_uri && isPreviewable(version.mime_type) && (
                    <button
                      className="btn btn-sm"
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        border: '1px solid var(--cui-border-color)',
                        color: 'var(--cui-body-color)',
                        backgroundColor: 'transparent',
                      }}
                      onClick={() => handleViewVersion(version)}
                      title="Open in new tab"
                    >
                      View
                    </button>
                  )}
                  {version.storage_uri && (
                    <button
                      className="btn btn-sm"
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        border: '1px solid var(--cui-border-color)',
                        color: 'var(--cui-body-color)',
                        backgroundColor: 'transparent',
                      }}
                      onClick={() => handleDownloadVersion(version)}
                      title="Download this version"
                    >
                      Download
                    </button>
                  )}
                  {!isCurrent && (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => handleRestore(version)}
                      disabled={restoringId === version.doc_id}
                    >
                      {restoringId === version.doc_id ? 'Restoring...' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
