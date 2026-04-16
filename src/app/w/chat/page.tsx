'use client';

import React from 'react';

/**
 * Chat Canvas — unassigned Landscaper chat (no project attached).
 * The CenterChatPanel is rendered by the wrapper layout; this page fills
 * the right-hand worksheet slot with a plain placeholder (no panel header,
 * so it doesn't look like a second chat panel alongside the center chat).
 */
export default function ChatCanvasPage() {
  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: 'var(--w-text-muted)',
        fontSize: '13px',
        textAlign: 'center',
        lineHeight: 1.5,
      }}
    >
      <div style={{ maxWidth: 380 }}>
        Ask Landscaper anything. Attach files, analyze deals, or draft a project.
        <br />
        Once the conversation is ready, you can promote it into a project.
      </div>
    </div>
  );
}
