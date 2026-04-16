'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch { /* ignore */ }
  return {};
}

interface ProjectDocument {
  doc_id: number;
  doc_name: string;
  doc_type: string;
  status: string;
  created_at: string;
  storage_uri?: string;
}

interface ProjectArtifactsPanelProps {
  projectId: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const DOC_TYPE_LABELS: Record<string, string> = {
  general: 'General',
  lease: 'Lease',
  appraisal: 'Appraisal',
  financial: 'Financial',
  report: 'Report',
  contract: 'Contract',
  permit: 'Permit',
  title: 'Title',
  survey: 'Survey',
  market: 'Market',
  om: 'OM',
  excel: 'Excel',
  pdf: 'PDF',
};

function docTypeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] ?? docType;
}

export function ProjectArtifactsPanel({ projectId }: ProjectArtifactsPanelProps) {
  const router = useRouter();
  const { artifactsOpen, toggleArtifacts } = useWrapperUI();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${DJANGO_API_URL}/api/dms/documents/?project_id=${projectId}`, {
        headers: getAuthHeaders(),
      })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setDocuments(data);
        } else if (Array.isArray(data?.results)) {
          setDocuments(data.results);
        } else if (Array.isArray(data?.documents)) {
          setDocuments(data.documents);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [projectId]);

  /* ── Collapsed strip ── */
  if (!artifactsOpen) {
    return (
      <div className="artifacts-collapsed">
        <button
          className="artifacts-expand-btn"
          onClick={toggleArtifacts}
          title="Open artifacts panel"
        >
          ☰
        </button>
      </div>
    );
  }

  /* ── Expanded panel ── */
  return (
    <div className="artifacts-panel">
      {/* Header */}
      <div className="wrapper-header">
        <span className="wrapper-header-title">Artifacts</span>
        <div className="wrapper-header-spacer" />
        <button
          className="wrapper-btn-ghost"
          onClick={toggleArtifacts}
          title="Collapse artifacts panel"
          style={{ fontSize: '14px', padding: '2px 6px' }}
        >
          ☰
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {isLoading ? (
          <div
            style={{
              color: 'var(--w-text-muted)',
              fontSize: '13px',
              textAlign: 'center',
              padding: '40px 24px',
            }}
          >
            Loading…
          </div>
        ) : documents.length === 0 ? (
          <div
            style={{
              color: 'var(--w-text-secondary)',
              fontSize: '13px',
              textAlign: 'center',
              padding: '40px 24px',
              lineHeight: 1.6,
            }}
          >
            No documents yet.
            <br />
            Upload files in the Documents tab to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {documents.map((doc) => (
              <div
                key={doc.doc_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--w-bg-surface)',
                  border: '1px solid var(--w-border)',
                  transition: 'background 0.12s',
                  cursor: 'pointer',
                }}
                onClick={() => router.push(`/w/projects/${projectId}/documents`)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    'var(--w-bg-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--w-bg-surface)';
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--w-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={doc.doc_name}
                  >
                    {doc.doc_name}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--w-text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    {docTypeLabel(doc.doc_type)} · {formatDate(doc.created_at)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background:
                      doc.status === 'indexed'
                        ? 'var(--w-success-dim)'
                        : 'var(--w-bg-surface)',
                    color:
                      doc.status === 'indexed'
                        ? 'var(--w-success-text)'
                        : 'var(--w-text-secondary)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    letterSpacing: '0.3px',
                    flexShrink: 0,
                  }}
                >
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
