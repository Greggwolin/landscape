'use client';

import React from 'react';

/**
 * Shared loading state for the preview component family. Phase 1.
 * Sized to match the parent container; centers the spinner.
 */
interface PreviewLoadingProps {
  message?: string;
}

export function PreviewLoading({ message = 'Loading preview…' }: PreviewLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: 'var(--w-text-tertiary)',
        fontSize: 11,
        background: 'var(--w-bg-surface)',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '2px solid var(--w-border)',
          borderTopColor: 'var(--w-accent, #0ea5e9)',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <span>{message}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PreviewLoading;
