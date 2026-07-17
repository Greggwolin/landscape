'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FilePreviewer } from './FilePreviewer';
import { getAuthHeaders } from '@/lib/authHeaders';

/**
 * DocumentPreviewModal — overlay preview for the artifacts-panel
 * Project Documents list (and any other surface that has only a doc_id
 * in hand and needs to open the previewer without the full DMS detail
 * panel context).
 *
 * Why a modal here (vs. the inline `.w-doc-detail-preview` slot used by
 * DocumentDetailPanel): the artifacts panel is already a stack of
 * Pinned / Recent / Active Artifact / Source Pointers sections — there's
 * no spare real estate for an inline preview, and hijacking the Active
 * Artifact slot would conflict with whatever artifact the user is
 * already viewing. A portal-based overlay sidesteps both.
 *
 * Lazy-fetches the full doc record by id on open — list rows carry only
 * { doc_id, doc_name, doc_type, status, created_at }; FilePreviewer
 * needs storage_uri + mime_type which live on the full /api/dms/docs/[id]
 * response. Same pattern as DocumentDetailPanel.
 *
 * Phase 1 of LSCMD-DMSPREV-COMMIT-0516-DV — closes the wiring gap where
 * the artifacts-panel documents list previously just toggled the right
 * panel to the Documents tab instead of opening the previewer.
 */

interface DocumentPreviewModalProps {
  /** Doc id to preview. null = modal closed. */
  docId: number | null;
  /** Display label shown in the modal header — usually doc_name from the list row. */
  filename?: string | null;
  /** Close handler — invoked by backdrop click, Esc, and the close button. */
  onClose: () => void;
}

interface DocDetail {
  doc_id: number;
  storage_uri: string | null;
  mime_type: string | null;
  original_filename: string | null;
  doc_name?: string | null;
}

const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export function DocumentPreviewModal({ docId, filename, onClose }: DocumentPreviewModalProps) {
  const [detail, setDetail] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // SSR-safe portal mount — only render the overlay after the client mounts.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lazy-fetch the full doc record whenever docId changes.
  // Try the Next.js route first (matches what DocumentDetailPanel uses);
  // fall back to Django's REST endpoint if the Next route 404s under
  // the new auth-scoping rollout.
  useEffect(() => {
    if (docId == null) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    const fetchDoc = async () => {
      try {
        const nextRes = await fetch(`/api/dms/docs/${docId}`, {
          headers: getAuthHeaders(),
        });
        if (nextRes.ok) {
          const data = await nextRes.json();
          if (!cancelled) {
            setDetail({
              doc_id: docId,
              storage_uri: data?.storage_uri ?? null,
              mime_type: data?.mime_type ?? null,
              original_filename: data?.original_filename ?? null,
              doc_name: data?.doc_name ?? null,
            });
            setLoading(false);
          }
          return;
        }
        // Fallback — Django REST. Auth scoping may differ between the
        // two paths; this lets the artifacts-panel preview still work
        // even if the Next route returns 403/404 for the current user.
        const djRes = await fetch(`${DJANGO_API}/api/dms/documents/${docId}/`, {
          headers: getAuthHeaders(),
        });
        if (!djRes.ok) {
          throw new Error(`Document fetch failed (${nextRes.status}/${djRes.status})`);
        }
        const data = await djRes.json();
        if (!cancelled) {
          setDetail({
            doc_id: docId,
            storage_uri: data?.storage_uri ?? data?.uploadthing_url ?? null,
            mime_type: data?.mime_type ?? null,
            original_filename: data?.original_filename ?? null,
            doc_name: data?.doc_name ?? null,
          });
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setLoading(false);
      }
    };

    void fetchDoc();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  // Esc-to-close.
  useEffect(() => {
    if (docId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [docId, onClose]);

  const handleDownload = useCallback(() => {
    if (!detail?.storage_uri) return;
    const a = document.createElement('a');
    a.href = detail.storage_uri;
    a.download = detail.original_filename || detail.doc_name || filename || 'download';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [detail, filename]);

  const handleOpenExternally = useCallback(() => {
    if (!detail?.storage_uri) return;
    window.open(detail.storage_uri, '_blank', 'noopener,noreferrer');
  }, [detail]);

  if (!mounted || docId == null) return null;

  const displayName = detail?.original_filename || detail?.doc_name || filename || `Document ${docId}`;
  const mimeBadge = detail?.mime_type || '—';

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${displayName}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1100px, 92vw)',
          height: 'min(820px, 88vh)',
          background: 'var(--w-card-bg, #1a1e28)',
          color: 'var(--w-text-primary, #e5e7eb)',
          borderRadius: 8,
          border: '1px solid var(--w-border, #323a49)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--w-border, #323a49)',
            background: 'var(--w-header-bg, #08090A)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--w-text-primary, #e5e7eb)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 600,
              }}
              title={displayName}
            >
              {displayName}
            </span>
            <span
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                padding: '2px 6px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--w-text-tertiary, #9ca3af)',
                borderRadius: 3,
              }}
            >
              {mimeBadge}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--w-text-tertiary, #9ca3af)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--w-bg-surface, #1a1e28)',
            overflow: 'hidden',
          }}
        >
          {loading && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--w-text-tertiary, #9ca3af)',
                fontSize: 12,
              }}
            >
              Loading document…
            </div>
          )}
          {!loading && error && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 24,
                color: 'var(--w-text-secondary, #d1d5db)',
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 600 }}>Couldn&rsquo;t load document</div>
              <div style={{ color: 'var(--w-text-tertiary, #9ca3af)' }}>{error}</div>
            </div>
          )}
          {!loading && !error && detail?.storage_uri && (
            <FilePreviewer
              fileUrl={detail.storage_uri}
              mimeType={detail.mime_type}
              filename={detail.original_filename || detail.doc_name || displayName}
              height={Math.max(400, Math.floor(window.innerHeight * 0.7))}
            />
          )}
          {!loading && !error && detail && !detail.storage_uri && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                color: 'var(--w-text-tertiary, #9ca3af)',
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              Document record found but no file URL is attached. The document
              may still be uploading, or the storage record is missing.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '10px 16px',
            borderTop: '1px solid var(--w-border, #323a49)',
            background: 'var(--w-header-bg, #08090A)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleOpenExternally}
            disabled={!detail?.storage_uri}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              border: '1px solid var(--w-border, #323a49)',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--w-text-secondary, #d1d5db)',
              cursor: detail?.storage_uri ? 'pointer' : 'not-allowed',
              opacity: detail?.storage_uri ? 1 : 0.5,
            }}
          >
            ↗ Open in new tab
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!detail?.storage_uri}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              border: '1px solid var(--w-border, #323a49)',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--w-text-secondary, #d1d5db)',
              cursor: detail?.storage_uri ? 'pointer' : 'not-allowed',
              opacity: detail?.storage_uri ? 1 : 0.5,
            }}
          >
            ↓ Download
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              border: '1px solid var(--w-border, #323a49)',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--w-text-secondary, #d1d5db)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default DocumentPreviewModal;
