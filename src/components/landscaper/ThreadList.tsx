'use client';

import React, { useState, useCallback } from 'react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilCheck, cilX, cilCommentSquare, cilTrash } from '@coreui/icons';

export interface Thread {
  threadId: string;
  title: string | null;
  pageContext: string;
  subtabContext: string | null;
  updatedAt: string;
  isActive: boolean;
  messageCount: number;
  /**
   * AI-generated 1-2 sentence summary as a small HTML fragment.
   * Allowed tags: <b>, <strong>, <i>, <em>, <br> — sanitized
   * server-side by ThreadService._sanitize_summary_html. Populated on
   * threshold cross or material-change close.
   */
  summary?: string | null;
  /** Server-truncated first user message (≤120 chars); used as a summary fallback. */
  firstUserMessage?: string | null;
}

interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string;
  currentPageContext: string;
  currentSubtabContext?: string | null;
  showAllPages?: boolean;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onUpdateTitle: (threadId: string, title: string) => void;
  onDeleteThread?: (threadId: string) => void;
  isLoading?: boolean;
}

/**
 * Format relative time display.
 */
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

const CONTEXT_NORMALIZATION: Record<string, string> = {
  home: 'home',
  mf_home: 'home',
  land_home: 'home',
  property: 'property',
  mf_property: 'property',
  land_planning: 'property',
  operations: 'operations',
  mf_operations: 'operations',
  valuation: 'valuation',
  mf_valuation: 'valuation',
  land_valuation: 'valuation',
  feasibility: 'valuation',
  capitalization: 'capital',
  capital: 'capital',
  mf_capitalization: 'capital',
  land_capitalization: 'capital',
  budget: 'budget',
  land_budget: 'budget',
  schedule: 'schedule',
  land_schedule: 'schedule',
  reports: 'reports',
  documents: 'documents',
  map: 'map',
  alpha_assistant: 'alpha_assistant',
};

// PAGE_CONTEXT_LABELS + getPageContextLabel removed PG25 follow-up —
// the page-context badge in the row UI was dropped because "Home" /
// "Documents" labels weren't informative; the AI summary line covers
// what-the-thread-is-about. The normalizers below are still used
// for thread filtering by current context.

function normalizeContext(context: string): string {
  if (!context) return 'home';
  const key = context.toLowerCase();
  return CONTEXT_NORMALIZATION[key] || key;
}

/**
 * Normalize subtab context — collapse variants (e.g. rent_roll → rent-roll).
 */
function normalizeSubtab(subtab: string | null | undefined): string | null {
  if (!subtab) return null;
  // Normalize underscores to hyphens for consistent matching
  return subtab.toLowerCase().replace(/_/g, '-');
}

export function ThreadList({
  threads,
  activeThreadId,
  currentPageContext,
  showAllPages = false,
  onSelectThread,
  onNewThread,
  onUpdateTitle,
  onDeleteThread,
  currentSubtabContext,
  isLoading = false,
}: ThreadListProps) {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartEdit = useCallback((thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(thread.threadId);
    setEditTitle(thread.title || '');
  }, []);

  const handleSaveEdit = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onUpdateTitle(threadId, editTitle.trim());
    }
    setEditingThreadId(null);
    setEditTitle('');
  }, [editTitle, onUpdateTitle]);

  const handleCancelEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(null);
    setEditTitle('');
  }, []);

  const handleKeyDown = useCallback((threadId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editTitle.trim()) {
        onUpdateTitle(threadId, editTitle.trim());
      }
      setEditingThreadId(null);
      setEditTitle('');
    } else if (e.key === 'Escape') {
      setEditingThreadId(null);
      setEditTitle('');
    }
  }, [editTitle, onUpdateTitle]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === threadId) {
      // Second click — confirm delete
      onDeleteThread?.(threadId);
      setConfirmDeleteId(null);
    } else {
      // First click — arm confirmation
      setConfirmDeleteId(threadId);
      // Auto-reset after 3 seconds if not confirmed
      setTimeout(() => setConfirmDeleteId((prev) => prev === threadId ? null : prev), 3000);
    }
  }, [confirmDeleteId, onDeleteThread]);

  // Filter threads: showAllPages → everything, subtab → exact match, page only → page match
  const normalizedCurrentContext = normalizeContext(currentPageContext);
  const normalizedCurrentSubtab = normalizeSubtab(currentSubtabContext);
  const filteredThreads = showAllPages
    ? threads
    : threads.filter((t) => {
        if (normalizeContext(t.pageContext) !== normalizedCurrentContext) return false;
        // If we have a subtab context, filter to matching subtab
        if (normalizedCurrentSubtab) {
          return normalizeSubtab(t.subtabContext) === normalizedCurrentSubtab;
        }
        // No subtab specified — show all threads for this page (including those with subtabs)
        return true;
      });

  return (
    <div
      className="d-flex flex-column border-bottom"
      style={{
        borderColor: 'var(--cui-border-color)',
        backgroundColor: 'var(--cui-tertiary-bg)',
        maxHeight: '280px',
      }}
    >
      {/* Header */}
      <div
        className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
        style={{ borderColor: 'var(--cui-border-color)' }}
      >
        <span
          className="small fw-medium"
          style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}
        >
          {showAllPages ? 'All Threads' : 'Threads'}
        </span>
        <button
          type="button"
          onClick={onNewThread}
          disabled={isLoading}
          className="btn btn-sm d-flex align-items-center gap-1 px-2 py-1"
          style={{
            color: 'var(--cui-primary)',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '0.75rem',
          }}
          title="Start new thread"
        >
          <CIcon icon={cilPlus} size="sm" />
          New
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-grow-1 overflow-auto">
        {filteredThreads.length === 0 ? (
          <div
            className="px-3 py-4 text-center small"
            style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}
          >
            {isLoading ? 'Loading...' : 'No threads yet. Send a message to start.'}
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isActive = thread.threadId === activeThreadId;
            const isEditing = editingThreadId === thread.threadId;
            const displayTitle = thread.title || `New conversation`;

            // FB-292 — collapsed (non-active) rows render the AI-generated
            // 1-2 sentence summary below the title row. Active row skips
            // both since the chat body already shows the conversation.
            //
            // Per Gregg (PG25 follow-up):
            //   - DROP the firstUserMessage fallback. The auto-generated
            //     title IS the first user message; rendering both is just
            //     duplicate content. Threads under the 5-message regen
            //     threshold get NO preview line — title alone is enough.
            //   - DROP the "N messages" line. The count pill in the header
            //     row already shows it; second copy is duplicate.
            //   - The brief summary text is what tells the user what the
            //     thread is about. Until summary is populated, no preview.
            const showPreviewMeta = !isEditing && !isActive;
            const summaryHtml = showPreviewMeta ? (thread.summary?.trim() || '') : '';
            // tooltip is plain-text version of the summary (HTML stripped)
            const previewTooltip = summaryHtml
              ? summaryHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
              : '';

            return (
              <div
                key={thread.threadId}
                onClick={() => !isEditing && onSelectThread(thread.threadId)}
                className="d-flex flex-column px-3 py-2"
                style={{
                  cursor: isEditing ? 'default' : 'pointer',
                  transition: 'background-color 150ms ease',
                  backgroundColor: isActive
                    ? 'var(--cui-body-bg)'
                    : 'transparent',
                  borderLeft: isActive ? '2px solid var(--cui-primary)' : '2px solid transparent',
                  gap: '2px',
                }}
              >
                {/* Header row: icon + title + count/timestamp */}
                <div className="d-flex align-items-center gap-2">
                {/* Thread icon */}
                <CIcon
                  icon={cilCommentSquare}
                  size="sm"
                  style={{ color: 'var(--cui-secondary-color)' }}
                />

                {/* Title (editable) */}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  {isEditing ? (
                    <div className="d-flex align-items-center gap-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(thread.threadId, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="form-control form-control-sm flex-grow-1"
                        style={{
                          backgroundColor: 'var(--cui-body-bg)',
                          color: 'var(--cui-body-color)',
                          fontSize: '0.75rem',
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => handleSaveEdit(thread.threadId, e)}
                        className="btn btn-sm d-flex align-items-center justify-content-center p-1"
                        style={{ border: 'none', backgroundColor: 'transparent' }}
                        title="Save"
                      >
                        <CIcon icon={cilCheck} size="sm" style={{ color: 'var(--cui-success)' }} />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="btn btn-sm d-flex align-items-center justify-content-center p-1"
                        style={{ border: 'none', backgroundColor: 'transparent' }}
                        title="Cancel"
                      >
                        <CIcon icon={cilX} size="sm" style={{ color: 'var(--cui-danger)' }} />
                      </button>
                    </div>
                  ) : (
                    <div className="d-flex align-items-center gap-1">
                      <span
                        className="small text-truncate d-inline-block"
                        style={{
                          color: thread.isActive ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)',
                          fontSize: '0.875rem',
                          maxWidth: '180px',
                          fontStyle: thread.isActive ? 'normal' : 'italic',
                        }}
                        title={`${displayTitle}${!thread.isActive ? ' (closed)' : ''}`}
                      >
                        {displayTitle}
                      </span>
                      {/* Page-context badge intentionally removed (PG25
                          follow-up): "Home"/"Documents" labels weren't
                          informative; the AI summary line below covers
                          what-is-this-thread-about. */}
                      {/* Edit + Delete buttons */}
                      <div className="d-flex align-items-center ms-auto gap-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(thread, e)}
                          className="btn btn-sm d-flex align-items-center justify-content-center p-1"
                          style={{ border: 'none', backgroundColor: 'transparent' }}
                          title="Edit title"
                        >
                          <CIcon
                            icon={cilPencil}
                            size="sm"
                            style={{ color: 'var(--cui-secondary-color)' }}
                          />
                        </button>
                        {onDeleteThread && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(thread.threadId, e)}
                            className="btn btn-sm d-flex align-items-center justify-content-center p-1"
                            style={{ border: 'none', backgroundColor: 'transparent' }}
                            title={confirmDeleteId === thread.threadId ? 'Click again to confirm delete' : 'Delete thread'}
                          >
                            <CIcon
                              icon={cilTrash}
                              size="sm"
                              style={{
                                color: confirmDeleteId === thread.threadId
                                  ? 'var(--cui-danger)'
                                  : 'var(--cui-secondary-color)',
                              }}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message count + Timestamp */}
                {!isEditing && (
                  <div className="d-flex align-items-center gap-1 flex-shrink-0">
                    {thread.messageCount > 0 && (
                      <span
                        className="badge rounded-pill"
                        style={{
                          backgroundColor: 'var(--cui-secondary-bg)',
                          color: 'var(--cui-secondary-color)',
                          fontSize: '0.6875rem',
                          padding: '1px 6px',
                        }}
                      >
                        {thread.messageCount}
                      </span>
                    )}
                    <span
                      className="small text-nowrap"
                      style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}
                    >
                      {formatRelativeTime(thread.updatedAt)}
                    </span>
                  </div>
                )}
                </div>

                {/* FB-292 / PG25 — collapsed-row summary line.
                    Renders ONLY when the AI summary is populated. Threads
                    under the 5-message regen threshold (or with regen
                    failures) skip the preview entirely; the header row's
                    title + count pill is enough on its own. The "N
                    messages" duplicate line was removed per PG25 since
                    the count pill already lives in the header row. */}
                {showPreviewMeta && summaryHtml && (
                  <div
                    style={{
                      // Indent under the icon column (icon ~16px + 8px gap ≈ 24px)
                      paddingLeft: '24px',
                      marginTop: '2px',
                    }}
                  >
                    {/* Trusted: thread.summary is generated by our own
                        Haiku call and sanitized server-side via
                        ThreadService._sanitize_summary_html down to the
                        <b>/<strong>/<i>/<em>/<br> allowlist with no
                        attributes preserved. */}
                    <span
                      style={{
                        color: 'var(--cui-secondary-color)',
                        fontSize: '0.75rem',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={previewTooltip}
                      dangerouslySetInnerHTML={{ __html: summaryHtml }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
