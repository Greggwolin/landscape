'use client';

import React, { useEffect, useState } from 'react';

interface DocumentVersion {
  doc_id: number;
  version_no: number;
  doc_name: string;
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

  useEffect(() => {
    let isMounted = true;

    const loadVersions = async () => {
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
        if (isMounted) {
          setVersions(list);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load versions');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadVersions();

    return () => {
      isMounted = false;
    };
  }, [projectId, docId]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="p-3">
      <div className="text-xs uppercase tracking-[0.2em] text-body-tertiary mb-2">
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
      <div className="space-y-2">
        {versions.map((version) => {
          const isCurrent = version.doc_id === currentDocId;
          return (
            <div
              key={version.doc_id}
              className="border rounded-md p-2"
              style={{
                borderColor: isCurrent ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                backgroundColor: isCurrent ? 'var(--cui-primary-bg)' : 'var(--cui-body-bg)'
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="text-sm fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
                  V{version.version_no}
                </div>
                {isCurrent ? (
                  <span className="text-[11px]" style={{ color: 'var(--cui-primary)' }}>
                    Current
                  </span>
                ) : (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleRestore(version)}
                    disabled={restoringId === version.doc_id}
                  >
                    {restoringId === version.doc_id ? 'Restoring...' : 'Restore'}
                  </button>
                )}
              </div>
              <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                {version.uploaded_at ? new Date(version.uploaded_at).toLocaleString() : 'Unknown date'}
                {version.uploaded_by ? ` • ${version.uploaded_by}` : ''}
              </div>
              {version.notes && (
                <div className="text-xs mt-1" style={{ color: 'var(--cui-body-color)' }}>
                  {version.notes}
                </div>
              )}
              {version.extraction_summary && (
                <div className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                  {version.extraction_summary}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
