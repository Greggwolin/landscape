'use client';

import React from 'react';

interface PreviewErrorProps {
  /** Short human-readable label, e.g. "Couldn't load PDF" */
  message: string;
  /** Optional secondary detail line — error.message or a hint */
  detail?: string;
  /** Optional fallback action — usually "Download" so the user can recover */
  onAction?: () => void;
  actionLabel?: string;
}

/**
 * Shared error state for the preview component family. Phase 1.
 * Renders inline; matches the calm-but-visible style of the
 * existing detail panel rather than shouting red.
 */
export function PreviewError({
  message,
  detail,
  onAction,
  actionLabel = 'Download',
}: PreviewErrorProps) {
  return (
    <div
      role="alert"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 16,
        color: 'var(--w-text-secondary)',
        fontSize: 12,
        textAlign: 'center',
        background: 'var(--w-bg-surface)',
      }}
    >
      <div style={{ fontWeight: 600, color: 'var(--w-text-primary)' }}>{message}</div>
      {detail && (
        <div style={{ fontSize: 11, color: 'var(--w-text-tertiary)' }}>{detail}</div>
      )}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 6,
            padding: '6px 12px',
            fontSize: 11,
            border: '1px solid var(--w-border)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--w-text-secondary)',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default PreviewError;
