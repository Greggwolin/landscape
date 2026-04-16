'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useRecentThreads, type RecentThread } from '@/hooks/useRecentThreads';

/**
 * Cross-project recent thread list for the sidebar.
 * Self-contained — fetches its own data via useRecentThreads.
 * Uses .sb-thread + .sb-thread-dot classes per v4 prototype.
 */
export function SidebarRecentThreads() {
  const { threads, isLoading } = useRecentThreads(30);
  const router = useRouter();

  const handleClick = (thread: RecentThread) => {
    if (thread.projectId) {
      router.push(`/w/projects/${thread.projectId}?thread=${thread.threadId}`);
    } else {
      router.push(`/w/chat/${thread.threadId}`);
    }
  };

  if (isLoading && threads.length === 0) {
    return (
      <div style={{ padding: '4px 10px 8px', fontSize: '11px', color: 'var(--w-text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div style={{ padding: '4px 10px 8px', fontSize: '11px', color: 'var(--w-text-muted)' }}>
        No recent threads
      </div>
    );
  }

  return (
    <>
      {threads.map((thread, index) => (
        <div
          key={thread.threadId}
          className="sb-thread"
          onClick={() => handleClick(thread)}
        >
          <span className={`sb-thread-dot ${index === 0 ? 'active' : 'idle'}`} />
          {thread.title || 'New conversation'}
        </div>
      ))}
    </>
  );
}
