'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CIcon from '@coreui/icons-react';
import { cilCommentSquare, cilSend } from '@coreui/icons';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch { /* ignore */ }
  return {};
}

interface ProjectThread {
  threadId: string;
  title: string | null;
  pageContext: string;
  updatedAt: string;
  messageCount: number;
  isActive: boolean;
  /**
   * AI-generated 1-2 sentence summary as a small HTML fragment.
   * Allowed tags: <b>, <strong>, <i>, <em>, <br> — sanitized
   * server-side by ThreadService._sanitize_summary_html. Populated
   * when the thread crosses the message-count threshold (5/15/30/60)
   * or when close_thread regenerates on material change.
   */
  summary?: string | null;
}

interface ProjectHomepageProps {
  projectId: number;
  onSelectThread: (threadId: string, title?: string) => void;
  onStartChat: (message: string) => void;
  isStartingChat?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProjectHomepage({
  projectId,
  onSelectThread,
  onStartChat,
  isStartingChat = false,
}: ProjectHomepageProps) {
  const [threads, setThreads] = useState<ProjectThread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [threadsExpanded, setThreadsExpanded] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch threads for this project
  useEffect(() => {
    setIsLoadingThreads(true);
    fetch(`${DJANGO_API_URL}/api/landscaper/threads/?project_id=${projectId}&include_closed=true`, {
        headers: getAuthHeaders(),
      })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.threads)) {
          setThreads(data.threads);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingThreads(false));
  }, [projectId]);

  const handleSubmit = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg || isStartingChat) return;
    setChatInput('');
    onStartChat(msg);
  }, [chatInput, isStartingChat, onStartChat]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--w-bg-body)',
      }}
    >
      {/* Chat starter input */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--w-border)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--w-bg-input)',
            border: '1px solid var(--w-border)',
            borderRadius: '8px',
            padding: '6px 10px',
            transition: 'border-color 0.15s',
          }}
          onFocus={() => {
            inputRef.current?.parentElement &&
              ((inputRef.current.parentElement as HTMLDivElement).style.borderColor =
                'var(--w-border-hover)');
          }}
          onBlur={() => {
            inputRef.current?.parentElement &&
              ((inputRef.current.parentElement as HTMLDivElement).style.borderColor =
                'var(--w-border)');
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Landscaper about this project…"
            disabled={isStartingChat}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--w-text-primary)',
              minWidth: 0,
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!chatInput.trim() || isStartingChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: chatInput.trim() && !isStartingChat ? 'var(--w-accent)' : 'transparent',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 6px',
              cursor: chatInput.trim() && !isStartingChat ? 'pointer' : 'default',
              transition: 'background 0.12s',
              flexShrink: 0,
            }}
            title="Send"
          >
            <CIcon
              icon={cilSend}
              size="sm"
              style={{
                color:
                  chatInput.trim() && !isStartingChat
                    ? '#fff'
                    : 'var(--w-text-muted)',
              }}
            />
          </button>
        </div>

        {isStartingChat && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--w-text-secondary)',
              marginTop: '6px',
              textAlign: 'center',
            }}
          >
            Starting conversation…
          </div>
        )}
      </div>

      {/* Thread list */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Collapsible header */}
        <div
          onClick={() => setThreadsExpanded((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px 6px',
            flexShrink: 0,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--w-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span style={{ fontSize: '8px', opacity: 0.7 }}>{threadsExpanded ? '▾' : '▸'}</span>
            Threads
          </span>
          {threads.length > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--w-text-muted)' }}>
              {threads.length}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 0, display: threadsExpanded ? undefined : 'none' }}>
          {isLoadingThreads ? (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--w-text-muted)',
                textAlign: 'center',
                padding: '20px',
              }}
            >
              Loading…
            </div>
          ) : threads.length === 0 ? (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--w-text-secondary)',
                textAlign: 'center',
                padding: '20px 12px',
                lineHeight: 1.5,
              }}
            >
              No threads yet.
              <br />
              Start a conversation above.
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.threadId}
                type="button"
                onClick={() => onSelectThread(thread.threadId, thread.title ?? undefined)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 8px',
                  borderRadius: 0,
                  border: 'none',
                  borderBottom: '1px solid var(--w-border-subtle)',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'var(--w-bg-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <CIcon
                  icon={cilCommentSquare}
                  size="sm"
                  style={{ color: 'var(--w-text-tertiary)', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: thread.isActive
                        ? 'var(--w-text-primary)'
                        : 'var(--w-text-secondary)',
                      fontStyle: thread.isActive ? 'normal' : 'italic',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={thread.title ?? 'New conversation'}
                  >
                    {thread.title ?? 'New conversation'}
                  </div>
                  {thread.summary && thread.summary.trim() ? (
                    /* FB-292 / PG32 — AI-generated summary fragment.
                       Trusted: thread.summary is sanitized server-side
                       to the b/strong/i/em/br allowlist with no
                       attributes preserved. Mirrors the same pattern
                       used in ThreadList.tsx. Threads under the regen
                       threshold have no summary; we skip the line
                       entirely rather than fall back to anything. */
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--w-text-secondary)',
                        marginTop: '2px',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      title={thread.summary
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()}
                      dangerouslySetInnerHTML={{ __html: thread.summary }}
                    />
                  ) : null}
                  <div style={{ fontSize: '11px', color: 'var(--w-text-muted)', marginTop: '1px' }}>
                    Last message {formatRelativeTime(thread.updatedAt)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--w-text-muted)',
                    flexShrink: 0,
                    marginLeft: '8px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  title={`${thread.messageCount} message${thread.messageCount === 1 ? '' : 's'}`}
                >
                  {thread.messageCount}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
