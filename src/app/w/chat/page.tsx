'use client';

import React from 'react';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';

/**
 * Chat Canvas — unassigned Landscaper chat (no project attached).
 * The CenterChatPanel is rendered by the wrapper layout; this page fills the
 * right-hand worksheet slot with a neutral canvas until the user promotes
 * the conversation into a project.
 */
export default function ChatCanvasPage() {
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
          Ask Landscaper anything. Attach files, analyze deals, or draft a project.
          <br />
          Once the conversation is ready, you can promote it into a project.
        </div>
      </div>
    </RightContentPanel>
  );
}
