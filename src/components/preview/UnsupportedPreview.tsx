'use client';

import React from 'react';

interface UnsupportedPreviewProps {
  filename?: string | null;
  mimeType?: string | null;
  /** Download handler — invoked when the user clicks the fallback button. */
  onDownload: () => void;
  /** Optional Open-in-new-tab handler — when the host wants to surface that. */
  onOpenExternally?: () => void;
}

/**
 * Fallback card for file types Phase 1 cannot render inline (Word docs,
 * pptx, text, json, zip, etc.). Tells the user what the file is and
 * gives them a clear download path. No crash, no blank preview pane.
 *
 * Phase 2 will replace this for docx + text + image renderers; pptx
 * stays here per spec §8.1 (deferred).
 */
export function UnsupportedPreview({
  filename,
  mimeType,
  onDownload,
  onOpenExternally,
}: UnsupportedPreviewProps) {
  const display = filename || 'this file';
  const mime = mimeType || 'unknown type';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        textAlign: 'center',
        background: 'var(--w-bg-surface)',
      }}
    >
      <div
        aria-hidden
        style={{
          fontSize: 28,
          color: 'var(--w-text-tertiary)',
          marginBottom: 4,
        }}
      >
        📄
      </div>
      <div style={{ fontSize: 12, color: 'var(--w-text-primary)', fontWeight: 600 }}>
        Preview not available
      </div>
      <div style={{ fontSize: 11, color: 'var(--w-text-tertiary)' }}>
        {display}
        <br />
        <span style={{ opacity: 0.75 }}>{mime}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={onDownload}
          style={{
            padding: '6px 12px',
            fontSize: 11,
            border: '1px solid var(--w-border)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--w-text-secondary)',
            cursor: 'pointer',
          }}
        >
          ↓ Download
        </button>
        {onOpenExternally && (
          <button
            type="button"
            onClick={onOpenExternally}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              border: '1px solid var(--w-border)',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--w-text-secondary)',
              cursor: 'pointer',
            }}
          >
            ↗ Open in new tab
          </button>
        )}
      </div>
    </div>
  );
}

export default UnsupportedPreview;
