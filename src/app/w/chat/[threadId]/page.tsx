'use client';

import React from 'react';

/**
 * Chat Canvas — opens a specific unassigned thread by ID.
 * The layout extracts the threadId from the pathname and passes it into
 * the already-mounted CenterChatPanel via its `initialThreadId` prop.
 * This page only fills the right-hand worksheet slot with a plain
 * placeholder — no panel header, so it doesn't double the chat UI.
 */
export default function ChatCanvasThreadPage() {
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
        Continue the conversation in the center panel.
        <br />
        Promote this chat into a project when you&apos;re ready.
      </div>
    </div>
  );
}
