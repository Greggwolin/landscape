'use client';

import React, { useState, useCallback } from 'react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilCheck, cilX, cilCommentSquare } from '@coreui/icons';

export interface Thread {
  threadId: string;
  title: string | null;
  pageContext: string;
  subtabContext: string | null;
  updatedAt: string;
  isActive: boolean;
  messageCount: number;
}

interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string;
  currentPageContext: string;
  showAllPages?: boolean;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onUpdateTitle: (threadId: string, title: string) => void;
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

const PAGE_CONTEXT_LABELS: Record<string, string> = {
  home: 'Home',
  property: 'Property',
  operations: 'Operations',
  valuation: 'Valuation',
  capital: 'Capital',
  budget: 'Budget',
  schedule: 'Schedule',
  reports: 'Reports',
  documents: 'Documents',
  map: 'Map',
  alpha_assistant: 'Assistant',
};

function normalizeContext(context: string): string {
  if (!context) return 'home';
  const key = context.toLowerCase();
  return CONTEXT_NORMALIZATION[key] || key;
}

function getPageContextLabel(context: string): string {
  const normalized = normalizeContext(context);
  return PAGE_CONTEXT_LABELS[normalized] || context;
}

export function ThreadList({
  threads,
  activeThreadId,
  currentPageContext,
  showAllPages = false,
  onSelectThread,
  onNewThread,
  onUpdateTitle,
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

  // Filter threads to current page context unless showing all
  const normalizedCurrentContext = normalizeContext(currentPageContext);
  const filteredThreads = showAllPages
    ? threads
    : threads.filter((t) => normalizeContext(t.pageContext) === normalizedCurrentContext);

  return (
    <div
      className="d-flex flex-column border-bottom"
      style={{
        borderColor: 'var(--cui-border-color)',
        backgroundColor: 'var(--cui-tertiary-bg)',
        maxHeight: '200px',
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

            return (
              <div
                key={thread.threadId}
                onClick={() => !isEditing && onSelectThread(thread.threadId)}
                className="d-flex align-items-center gap-2 px-3 py-2"
                style={{
                  cursor: isEditing ? 'default' : 'pointer',
                  transition: 'background-color 150ms ease',
                  backgroundColor: isActive
                    ? 'var(--cui-body-bg)'
                    : 'transparent',
                  borderLeft: isActive ? '2px solid var(--cui-primary)' : '2px solid transparent',
                }}
              >
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
                        style={{ color: 'var(--cui-body-color)', fontSize: '0.75rem', maxWidth: '160px' }}
                        title={displayTitle}
                      >
                        {displayTitle}
                      </span>
                      {/* Page context badge (only shown when viewing all pages) */}
                      {showAllPages && (
                        <span
                          className="badge rounded-pill"
                          style={{
                            backgroundColor: 'var(--cui-tertiary-bg)',
                            color: 'var(--cui-secondary-color)',
                            fontSize: '0.625rem',
                          }}
                        >
                          {getPageContextLabel(thread.pageContext)}
                        </span>
                      )}
                      {/* Edit button (on hover) */}
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(thread, e)}
                        className="btn btn-sm d-flex align-items-center justify-content-center p-1 ms-auto"
                        style={{ border: 'none', backgroundColor: 'transparent' }}
                        title="Edit title"
                      >
                        <CIcon
                          icon={cilPencil}
                          size="sm"
                          style={{ color: 'var(--cui-secondary-color)' }}
                        />
                      </button>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                {!isEditing && (
                  <span
                    className="small text-nowrap"
                    style={{ color: 'var(--cui-secondary-color)', fontSize: '0.625rem' }}
                  >
                    {formatRelativeTime(thread.updatedAt)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
