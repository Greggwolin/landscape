'use client';

import React from 'react';

/**
 * ChatDragOverlay — shared drag-over overlay for the universal Landscaper
 * drop-zone (FB-298). Rendered by both the chat-forward CenterChatPanel and the
 * classic LandscaperPanel so the drop affordance looks identical in both UIs.
 *
 * Behavior is universal: any file type becomes a chat attachment, so the copy
 * no longer splits Excel vs. other-files. CoreUI tokens only — no hardcoded hex.
 */
interface ChatDragOverlayProps {
  isDragActive: boolean;
  isDragAccept?: boolean;
  isDragReject?: boolean;
  /** Match the host container's border radius (cards use the card radius). */
  borderRadius?: string;
}

export function ChatDragOverlay({
  isDragActive,
  isDragAccept,
  isDragReject,
  borderRadius,
}: ChatDragOverlayProps) {
  if (!isDragActive) return null;

  const backgroundColor = isDragAccept
    ? 'var(--cui-success-bg-subtle)'
    : isDragReject
    ? 'var(--cui-danger-bg-subtle)'
    : 'var(--cui-tertiary-bg)';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: 50,
        borderRadius,
        backgroundColor,
        opacity: 0.96,
        color: 'var(--cui-body-color)',
        pointerEvents: 'none',
      }}
    >
      <div className="fw-semibold" style={{ fontSize: '1.1rem' }}>
        Drop files for Landscaper
      </div>
      <div className="mt-1" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.9rem' }}>
        Any file type — PDF, image, Word, Excel, CSV. Attach one or several.
      </div>
    </div>
  );
}
