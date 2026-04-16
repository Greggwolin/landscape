'use client';

import React from 'react';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';

/**
 * Chat Canvas — opens a specific unassigned thread by ID.
 * The layout extracts the threadId from the pathname and passes it into
 * the already-mounted CenterChatPanel via its `initialThreadId` prop.
 * This page only fills the right-hand worksheet slot.
 */
export default function ChatCanvasThreadPage() {
  return (
    <RightContentPanel title="Chat">
      <div
        style={{
          display: 'flex',
          flex: 1,
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
    </RightContentPanel>
  );
}
