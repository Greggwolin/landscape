'use client';

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import CIcon from '@coreui/icons-react';
import { LandscaperIcon } from '@/components/icons/LandscaperIcon';
import { cilChevronBottom, cilChevronLeft, cilChevronTop, cilCommentSquare, cilPlus, cilPencil, cilCheck, cilX, cilTrash } from '@coreui/icons';
import { useLandscaperThreads, ThreadMessage, type SendMessageOptions } from '@/hooks/useLandscaperThreads';
import { useLandscaperThinking } from '@/contexts/LandscaperThinkingContext';
import { ChatMessageBubble } from './ChatMessageBubble';
import { LandscaperProgress } from './LandscaperProgress';
import { ThreadList } from './ThreadList';
import {
  useLandscaperCollision,
  buildCollisionMessage,
  type CollisionAction,
  type PendingCollision,
} from '@/contexts/LandscaperCollisionContext';
import { emitMutationComplete } from '@/lib/events/landscaper-events';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// Map DB table names from pending_mutations to the event table names components watch.
// Keys must match the table_name values used in tool_executor.py mutations.
const DB_TABLE_TO_EVENT_TABLES: Record<string, string[]> = {
  // Operations tab watches: operating_expenses, units, unit_types, leases
  tbl_operating_expenses: ['operating_expenses'],
  tbl_multifamily_unit: ['units'],
  tbl_multifamily_unit_type: ['unit_types'],
  tbl_lease: ['leases'],
  tbl_vacancy_assumption: ['operating_expenses'], // vacancy changes trigger ops refresh
  tbl_project_assumption: ['operating_expenses'], // assumption changes (vacancy override) trigger ops refresh

  // Capitalization tab watches: loans, equity_structure, waterfall_tiers
  tbl_loan: ['loans'],
  tbl_equity_structure: ['equity_structure'],
  tbl_waterfall_tier: ['waterfall_tiers'],

  // Comps
  tbl_rental_comp: ['rental_comps'],
  tbl_rental_comparable: ['rental_comps'],
  tbl_sales_comp: ['sales_comps'],
  tbl_sales_comparables: ['sales_comps'],

  // Project-level
  tbl_project: ['project'],
  tbl_dcf_assumption: ['dcf_analysis', 'cashflow'],
};

export interface LandscaperChatHandle {
  sendMessage: (msg: string, options?: SendMessageOptions) => Promise<void>;
  /** Pre-fill the chat input without sending — used by 💬 discuss buttons */
  setInputText: (text: string) => void;
}

interface LandscaperChatThreadedProps {
  /** Project ID. Omit/undefined = unassigned (Chat Canvas) thread. */
  projectId?: number;
  pageContext: string;
  subtabContext?: string;
  contextPillLabel?: string;
  contextPillColor?: string;
  isIngesting?: boolean;
  ingestionProgress?: number;
  ingestionMessage?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onCollapsePanel?: () => void;
  onReviewMedia?: (docId: number, docName: string) => void;
  onToolResult?: (toolName: string, result: Record<string, unknown>) => void;
  /**
   * Phase 4 — invoked when the user clicks "Open" on an inline artifact card
   * below an assistant bubble. Parent should set the active artifact id and
   * make the right artifacts panel visible.
   */
  onOpenArtifact?: (artifactId: number) => void;
  /** When provided, activates this thread on mount (used by URL-based thread switching) */
  initialThreadId?: string;
  /** When true, suppresses the internal header (used when parent provides its own header, e.g. `/w/` CenterChatPanel) */
  hideInternalHeader?: boolean;
  /** External control for the thread-history drawer. When provided, overrides internal toggle state. */
  showThreadList?: boolean;
  /**
   * Fires whenever the hook's activeThread transitions to a new UUID (or to null).
   * Parent uses this to sync the URL — on `/w/chat`, the parent does
   * `router.replace('/w/chat/[newId]')` once the first message creates a thread.
   */
  onActiveThreadChange?: (threadId: string | null) => void;
  /**
   * Pre-send hook. Fires inside `handleSend` BEFORE `sendMessage` is called.
   * Parent uses this to upload pending attachments and return context that
   * gets appended to the user's message (e.g. doc_id reference). If it
   * throws, the send is aborted and the input is restored.
   *
   * Returning a `contextSuffix` causes the actual sent message to be
   *   `${userText}\n\n${contextSuffix}`
   * so the model sees both the user's prompt and the attached doc context.
   */
  onBeforeSend?: () => Promise<{ contextSuffix?: string } | void>;
  /**
   * Fires when the URL-pinned `initialThreadId` is permanently missing
   * (404 from the backend). Parent should redirect to /w/chat or similar
   * fallback so the user isn't stranded on a dead URL.
   */
  onThreadNotFound?: () => void;
  /**
   * Fires whenever the count of in-scope threads changes (mount, after a
   * thread is created/deleted, after refetch). Parent uses this to drive the
   * thread-history badge count without making a duplicate fetch — this
   * component already loads `allThreads` for the in-panel browser, so the
   * badge reads from the same source. Keeps badge ↔ list in sync.
   */
  onThreadCountChange?: (count: number) => void;
}

/**
 * Get context-aware hint for the current page.
 */
function getPageContextHint(context: string): string {
  const hints: Record<string, string> = {
    home: 'Overview',
    mf_home: 'Overview',
    land_home: 'Overview',
    property: 'Property',
    mf_property: 'Property',
    land_planning: 'Planning',
    operations: 'Operations',
    mf_operations: 'Operations',
    valuation: 'Valuation',
    mf_valuation: 'Valuation',
    land_valuation: 'Valuation',
    capitalization: 'Capitalization',
    mf_capitalization: 'Capitalization',
    land_capitalization: 'Capitalization',
    land_budget: 'Budget',
    land_schedule: 'Schedule',
    reports: 'Reports',
    investment_committee: 'IC',
    documents: 'Documents',
    map: 'Map',
    alpha_assistant: 'Help',
  };
  return hints[context] || 'General';
}

/**
 * Editable thread title bar displayed above messages — similar to ChatGPT/Claude.
 *
 * PG25 follow-up: gained a delete button next to the edit pencil so
 * the active thread can be deleted from the chat body, not just from
 * the in-panel ThreadList drawer. Two-click confirmation pattern
 * mirrors the drawer's behavior — first click arms (turns red), second
 * click within 3 seconds fires `onDelete`.
 */
function ThreadTitleBar({
  title,
  onSave,
  onDelete,
}: {
  title: string | null;
  onSave: (t: string) => void;
  onDelete?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayTitle = title || 'New conversation';

  const startEdit = useCallback(() => {
    setEditValue(title || '');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [title]);

  const saveEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onSave(trimmed);
    }
    setIsEditing(false);
  }, [editValue, title, onSave]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    else if (e.key === 'Escape') { cancelEdit(); }
  }, [saveEdit, cancelEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      // Second click — confirm delete
      onDelete?.();
      setConfirmDelete(false);
    } else {
      // First click — arm confirmation; auto-reset after 3 seconds
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [confirmDelete, onDelete]);

  return (
    <div
      className="d-flex align-items-center gap-2 border-bottom px-3"
      style={{
        minHeight: '36px',
        borderColor: 'var(--cui-border-color)',
        backgroundColor: 'var(--cui-body-bg)',
      }}
    >
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            className="form-control form-control-sm flex-grow-1"
            style={{
              backgroundColor: 'var(--cui-tertiary-bg)',
              color: 'var(--cui-body-color)',
              fontSize: '0.8rem',
              border: '1px solid var(--cui-primary)',
            }}
          />
          <button
            type="button"
            onClick={saveEdit}
            className="btn btn-sm p-1"
            style={{ border: 'none', backgroundColor: 'transparent' }}
            title="Save"
          >
            <CIcon icon={cilCheck} size="sm" style={{ color: 'var(--cui-success)' }} />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="btn btn-sm p-1"
            style={{ border: 'none', backgroundColor: 'transparent' }}
            title="Cancel"
          >
            <CIcon icon={cilX} size="sm" style={{ color: 'var(--cui-danger)' }} />
          </button>
        </>
      ) : (
        <>
          <span
            className="small text-truncate flex-grow-1"
            style={{
              color: title ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)',
              fontSize: '0.8rem',
              fontWeight: title ? 500 : 400,
              fontStyle: title ? 'normal' : 'italic',
              cursor: 'pointer',
            }}
            onClick={startEdit}
            title={`${displayTitle} — click to edit`}
          >
            {displayTitle}
          </span>
          <button
            type="button"
            onClick={startEdit}
            className="btn btn-sm p-1"
            style={{ border: 'none', backgroundColor: 'transparent', opacity: 0.5 }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
            title="Edit title"
          >
            <CIcon icon={cilPencil} size="sm" style={{ color: 'var(--cui-secondary-color)' }} />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="btn btn-sm p-1"
              style={{ border: 'none', backgroundColor: 'transparent', opacity: 0.5 }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
              title={confirmDelete ? 'Click again to confirm delete' : 'Delete thread'}
            >
              <CIcon
                icon={cilTrash}
                size="sm"
                style={{
                  color: confirmDelete
                    ? 'var(--cui-danger)'
                    : 'var(--cui-secondary-color)',
                }}
              />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export const LandscaperChatThreaded = forwardRef<LandscaperChatHandle, LandscaperChatThreadedProps>(
  function LandscaperChatThreaded({
    projectId,
    pageContext,
    subtabContext,
    contextPillLabel,
    contextPillColor,
    isIngesting,
    ingestionProgress = 0,
    ingestionMessage,
    isExpanded = true,
    onToggleExpand,
    onCollapsePanel,
    onReviewMedia,
    onToolResult,
    onOpenArtifact,
    initialThreadId,
    hideInternalHeader = false,
    showThreadList: showThreadListProp,
    onActiveThreadChange,
    onBeforeSend,
    onThreadNotFound,
    onThreadCountChange,
  }, ref) {
  const [input, setInput] = useState('');
  const [showThreadList, setShowThreadList] = useState(false);

  // Sync external control (from CenterChatPanel) into internal state
  useEffect(() => {
    if (showThreadListProp !== undefined) setShowThreadList(showThreadListProp);
  }, [showThreadListProp]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userHasSentMessage = useRef(false);
  const prevMessageCount = useRef(0);
  const promptCopy =
    'Ask Landscaper anything about this project or drop a document and we\'ll get the model updated.';
  const pageContextHint = contextPillLabel || (() => {
    const baseHint = getPageContextHint(pageContext);
    if (!subtabContext) return baseHint;
    const subtabLabel = subtabContext.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    // Avoid duplication like "Rent Roll · Rent Roll"
    if (baseHint.toLowerCase() === subtabLabel.toLowerCase()) return subtabLabel;
    return `${baseHint} · ${subtabLabel}`;
  })();
  const {
    threads,
    allThreads,
    activeThread,
    messages,
    isLoading,
    isThreadLoading,
    error,
    threadNotFound,
    selectThread,
    startNewThread,
    updateThreadTitle,
    deleteThread,
    sendMessage,
    loadThreads,
    loadAllThreads,
  } = useLandscaperThreads({
    projectId: projectId !== undefined ? projectId.toString() : undefined,
    pageContext,
    subtabContext,
    initialThreadId,
    onToolResult,
  });

  // Bubble activeThread id changes up to the parent so /w/chat can sync the URL.
  // Fires on transitions to a new UUID AND on transitions to null, so the
  // parent can react to new-chat (null → id) and thread-switch (id → id') both.
  const lastEmittedThreadIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!onActiveThreadChange) return;
    const current = activeThread?.threadId ?? null;
    if (lastEmittedThreadIdRef.current === current) return;
    lastEmittedThreadIdRef.current = current;
    onActiveThreadChange(current);
  }, [activeThread?.threadId, onActiveThreadChange]);

  // Thread browser shows all threads in scope (project-scoped when a project
  // is active, unassigned-scoped on /w/chat) — page context is shown as a
  // per-thread badge in the list, not used as a filter.
  //
  // On project-scoped chats, allThreads (from loadAllThreads) is the canonical
  // source — loadThreads filters by page_context, allThreads does not. On
  // unassigned mode the two URLs are identical, so we mirror `threads` into
  // the effective collection rather than firing a redundant request.
  const effectiveAllThreads = projectId ? allThreads : threads;
  const visibleThreadCount = effectiveAllThreads.length;

  // Load all project threads on mount so the badge count is available immediately.
  //
  // Skipped on unassigned mode (no projectId): useLandscaperThreads.initializeThread()
  // Branch 3 already calls loadThreads() with the same `unassigned=true` URL
  // on mount, so loadAllThreads() here would fire a duplicate request. The
  // effectiveAllThreads above falls through to `threads` in that case so the
  // in-panel browser + badge count stay populated.
  // Finding #8 fix — was the second of the two duplicate /w/chat fetches.
  useEffect(() => {
    if (!projectId) return;
    loadAllThreads();
  }, [loadAllThreads, projectId]);

  // Emit thread count to parent — single source of truth for the badge.
  // Parent (CenterChatPanel) reads from this callback instead of running
  // its own duplicate fetch, so the badge can never disagree with the
  // in-panel thread list count.
  useEffect(() => {
    if (onThreadCountChange) onThreadCountChange(effectiveAllThreads.length);
  }, [effectiveAllThreads.length, onThreadCountChange]);

  // URL-based thread activation is now handled inside the hook
  // (useLandscaperThreads accepts `initialThreadId` and fetches the thread
  // directly by UUID, avoiding the list-filter race this effect used to
  // work around). Kept as a comment marker in case of regression.

  // Sync project landscaper loading state to global context (drives HelpIcon propeller)
  const { setIsThinking } = useLandscaperThinking();
  useEffect(() => { setIsThinking(isLoading); }, [isLoading, setIsThinking]);

  // Expose sendMessage and setInputText to parent via imperative handle
  useImperativeHandle(ref, () => ({ sendMessage, setInputText: setInput }), [sendMessage, setInput]);

  // Notify parent when URL-pinned thread is permanently missing (404).
  // Parent typically redirects to /w/chat — keeps us off a dead URL.
  useEffect(() => {
    if (threadNotFound && onThreadNotFound) {
      onThreadNotFound();
    }
  }, [threadNotFound, onThreadNotFound]);

  // Collision handling via context
  const { pendingCollision, setOnCollisionResolved } = useLandscaperCollision();

  // Mutation handlers for Level 2 autonomy
  const handleConfirmMutation = useCallback(async (mutationId: string) => {
    try {
      const response = await fetch(
        `${DJANGO_API_URL}/api/landscaper/mutations/${mutationId}/confirm/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json();
      if (data.success) {
        loadThreads();

        // Emit mutation event so page components refresh without reload
        const pid = data.project_id || projectId;
        if (pid) {
          const tableName = data.table_name || '';
          const eventTables = DB_TABLE_TO_EVENT_TABLES[tableName] || [tableName.replace('tbl_', '')];
          emitMutationComplete({
            projectId: typeof pid === 'string' ? parseInt(pid) : pid,
            mutationType: data.mutation_type || 'confirm',
            tables: eventTables,
            counts: { updated: 1, total: 1 },
          });
        }
      }
    } catch (error) {
      console.error('Error confirming mutation:', error);
    }
  }, [loadThreads, projectId]);

  const handleRejectMutation = useCallback(async (mutationId: string) => {
    try {
      const response = await fetch(
        `${DJANGO_API_URL}/api/landscaper/mutations/${mutationId}/reject/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json();
      if (data.success) {
        loadThreads();
      }
    } catch (error) {
      console.error('Error rejecting mutation:', error);
    }
  }, [loadThreads]);

  const handleConfirmBatch = useCallback(async (batchId: string) => {
    try {
      const response = await fetch(
        `${DJANGO_API_URL}/api/landscaper/mutations/batch/${batchId}/confirm/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json();
      if (data.success) {
        loadThreads();

        // Collect all affected tables from batch results and emit single event
        const affectedTables = new Set<string>();
        let totalConfirmed = 0;
        for (const result of (data.results || [])) {
          if (result.success && result.table_name) {
            const eventTables = DB_TABLE_TO_EVENT_TABLES[result.table_name] || [result.table_name.replace('tbl_', '')];
            eventTables.forEach((t: string) => affectedTables.add(t));
            totalConfirmed++;
          }
        }
        if (affectedTables.size > 0 && projectId) {
          emitMutationComplete({
            projectId,
            mutationType: 'batch_confirm',
            tables: Array.from(affectedTables),
            counts: { updated: totalConfirmed, total: totalConfirmed },
          });
        }
      }
    } catch (error) {
      console.error('Error confirming batch:', error);
    }
  }, [loadThreads, projectId]);

  // Handle document collision - send message to Landscaper
  useEffect(() => {
    if (pendingCollision) {
      const message = buildCollisionMessage(
        pendingCollision.file,
        pendingCollision.matchType,
        pendingCollision.existingDoc
      );

      // Mark that user interacted so we auto-scroll
      userHasSentMessage.current = true;

      // Send the collision message to Landscaper
      sendMessage(message).catch((err) => {
        console.error('Failed to send collision message:', err);
      });
    }
  }, [pendingCollision, sendMessage]);

  // Set up collision resolution handler
  // This will be called when user responds (detected via message parsing)
  useEffect(() => {
    const handleCollisionResponse = async (action: CollisionAction, collision: PendingCollision) => {
      const { file, existingDoc, projectId: collisionProjectId } = collision;

      try {
        if (action === 'version') {
          // Upload as new version
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(
            `/api/projects/${collisionProjectId}/dms/docs/${existingDoc.doc_id}/version`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error('Failed to upload new version');
          }

          const result = await response.json();

          // Send confirmation message
          await sendMessage(`Done! I've uploaded "${file.name}" as Version ${result.version_no || 'new'} of "${existingDoc.filename}".`);
        } else if (action === 'rename') {
          // This would be handled by the upload component
          console.log('Rename action - will be handled by upload component');
        } else if (action === 'skip') {
          // Just clear and continue
          console.log('Skip action - collision ignored');
        }
      } catch (error) {
        console.error('Error handling collision resolution:', error);
        await sendMessage(`There was an error processing the file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    setOnCollisionResolved(handleCollisionResponse);

    return () => {
      setOnCollisionResolved(null);
    };
  }, [sendMessage, setOnCollisionResolved]);

  // Auto-scroll only after user interaction
  useEffect(() => {
    if (userHasSentMessage.current && messages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight || '20', 10);
    const maxHeight = lineHeight * 8;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    userHasSentMessage.current = true;

    const currentMessage = input.trim();
    setInput('');

    // Pre-send hook: parent may upload pending attachments and return a
    // contextSuffix to append to the user's message (e.g. doc_id reference).
    // If the hook throws, restore the input and bail.
    const sendWithContext = async () => {
      let contextSuffix = '';
      if (onBeforeSend) {
        try {
          const result = await onBeforeSend();
          if (result && typeof result === 'object' && result.contextSuffix) {
            contextSuffix = result.contextSuffix;
          }
        } catch (err) {
          console.error('onBeforeSend failed', err);
          setInput(currentMessage);
          throw err;
        }
      }
      const finalMessage = contextSuffix
        ? `${currentMessage}\n\n${contextSuffix}`
        : currentMessage;
      await sendMessage(finalMessage);
    };

    sendWithContext().catch(() => {
      // sendMessage failure restores input; onBeforeSend failure already did.
      // Avoid double-restore by checking input state.
      if (!input) setInput(currentMessage);
    });
  };

  const handleSelectThread = (threadId: string) => {
    selectThread(threadId);
    setShowThreadList(false);
  };

  const handleNewThread = () => {
    startNewThread().then(() => loadAllThreads());
    setShowThreadList(false);
  };

  const handleToggleThreadList = useCallback(() => {
    const willShow = !showThreadList;
    setShowThreadList(willShow);
    if (willShow) {
      // Load all project threads when opening the list
      loadAllThreads();
    }
  }, [showThreadList, loadAllThreads]);

  const hoverNeutralBackground = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = 'transparent';
    },
  };

  return (
    <div className="d-flex h-100 flex-column">
      {/* Header */}
      {!hideInternalHeader && (
      <div
        className="d-flex align-items-center gap-2 border-bottom"
        style={{
          padding: '0.5rem 1rem',
          borderColor: 'var(--cui-card-border-color)',
          backgroundColor: 'var(--cui-card-header-bg)',
        }}
      >
        <LandscaperIcon className="landscaper-panel-icon" aria-hidden="true" />

        {/* Panel title - static "Landscaper" */}
        <span
          className="fw-bold"
          style={{ color: 'var(--cui-body-color)', fontSize: '1rem' }}
        >
          Landscaper
        </span>

        {/* Collapse panel chevron */}
        {onCollapsePanel && (
          <button
            onClick={onCollapsePanel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--cui-body-color)',
              opacity: 0.6,
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
            aria-label="Collapse Landscaper panel"
          >
            <CIcon icon={cilChevronLeft} size="sm" />
          </button>
        )}

        {/* Spacer */}
        <div className="flex-grow-1" />

        {/* Context indicator */}
        {!isIngesting && (
          <span
            className="badge rounded-pill"
            style={{
              color: contextPillColor ? 'var(--nav-tab-text)' : 'var(--cui-secondary-color)',
              backgroundColor: contextPillColor || 'var(--cui-tertiary-bg)',
              fontSize: '0.75rem',
            }}
          >
            {pageContextHint}
          </span>
        )}

        {/* Ingestion Progress Gauge */}
        {isIngesting && (
          <div className="d-flex align-items-center gap-2">
            <div
              className="position-relative"
              style={{ width: '32px', height: '32px' }}
              title={ingestionMessage || 'Processing...'}
            >
              <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="var(--cui-border-color)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="var(--cui-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(ingestionProgress / 100) * 87.96} 87.96`}
                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                />
              </svg>
              <div
                className="position-absolute top-0 start-0 d-flex align-items-center justify-content-center fw-medium"
                style={{ color: 'var(--cui-body-color)', width: '100%', height: '100%', fontSize: '0.75rem' }}
              >
                {Math.round(ingestionProgress)}
              </div>
            </div>
            <span
              className="small text-truncate d-inline-block"
              style={{ color: 'var(--cui-secondary-color)', maxWidth: '120px' }}
            >
              {ingestionMessage || 'Ingesting...'}
            </span>
          </div>
        )}

        {/* New Chat button */}
        <button
          type="button"
          onClick={handleNewThread}
          className="btn btn-sm d-flex align-items-center justify-content-center p-1"
          style={{ color: 'var(--cui-secondary-color)', backgroundColor: 'transparent', border: 'none' }}
          title="New chat"
          {...hoverNeutralBackground}
        >
          <CIcon
            icon={cilPlus}
            size="sm"
            style={{ color: 'var(--cui-secondary-color)' }}
          />
        </button>

        {/* Thread list toggle — chat bubble icon with count badge */}
        <button
          type="button"
          onClick={handleToggleThreadList}
          className="btn btn-sm d-flex align-items-center justify-content-center p-1 position-relative"
          style={{ color: 'var(--cui-secondary-color)', backgroundColor: 'transparent', border: 'none' }}
          title={showThreadList ? 'Hide threads' : `Show threads (${visibleThreadCount})`}
          {...hoverNeutralBackground}
        >
          <CIcon
            icon={cilCommentSquare}
            size="sm"
            style={{ color: showThreadList ? 'var(--cui-primary)' : 'var(--cui-secondary-color)' }}
          />
          {visibleThreadCount > 1 && (
            <span
              className="position-absolute badge rounded-pill"
              style={{
                top: '-2px',
                right: '-4px',
                fontSize: '0.55rem',
                padding: '1px 4px',
                backgroundColor: 'var(--cui-primary)',
                color: '#fff',
                lineHeight: 1.2,
                minWidth: '14px',
              }}
            >
              {visibleThreadCount}
            </span>
          )}
        </button>

        {/* Activity feed toggle chevron removed — feed has its own header toggle */}
      </div>
      )}

      {/* Thread List (collapsible) — shows ALL project threads across pages */}
      {showThreadList && (
        <ThreadList
          threads={effectiveAllThreads.length > 0 ? effectiveAllThreads : threads}
          activeThreadId={activeThread?.threadId}
          currentPageContext={pageContext}
          currentSubtabContext={subtabContext}
          showAllPages={true}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          onUpdateTitle={updateThreadTitle}
          onDeleteThread={deleteThread}
          isLoading={isThreadLoading}
        />
      )}

      {/* Thread Title Bar — ChatGPT/Claude-style editable title.
          PG25 follow-up: gained an inline delete button so the active
          thread can be removed without opening the drawer. */}
      {activeThread && (
        <ThreadTitleBar
          title={activeThread.title}
          onSave={(newTitle) => updateThreadTitle(activeThread.threadId, newTitle)}
          onDelete={() => deleteThread(activeThread.threadId)}
        />
      )}

      {/* Messages */}
      <div
        className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-3"
        style={{ backgroundColor: 'var(--cui-body-bg)' }}
      >
        {messages.length === 0 ? (
          <div className="py-4 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
            {isThreadLoading ? (
              <p className="small mb-0">Loading conversation...</p>
            ) : (
              <>
                <p className="small mb-1">{promptCopy}</p>
                <p style={{ fontSize: '0.75rem', marginBottom: 0 }}>Budget, market analysis, assumptions, documents...</p>
              </>
            )}
          </div>
        ) : (
          messages
            .filter((msg: ThreadMessage) => !msg.metadata?.hidden)
            .map((msg: ThreadMessage) => (
            <ChatMessageBubble
              key={msg.messageId}
              message={msg}
              onConfirmMutation={handleConfirmMutation}
              onRejectMutation={handleRejectMutation}
              onConfirmBatch={handleConfirmBatch}
              onReviewMedia={onReviewMedia}
              onOpenArtifact={onOpenArtifact}
            />
          ))
        )}

        {error && (
          <div
            className="rounded border px-3 py-2 small"
            style={{
              borderColor: 'var(--cui-danger-border-subtle)',
              color: 'var(--cui-danger)',
              backgroundColor: 'var(--cui-danger-bg-subtle)',
            }}
          >
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Progress indicator */}
      <LandscaperProgress isProcessing={isLoading} />

      {/* Input */}
      <div
        className="border-top p-3"
        style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}
      >
        <div className="d-flex gap-2 align-items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={promptCopy}
            rows={1}
            className="form-control flex-grow-1"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              color: 'var(--cui-body-color)',
              maxHeight: '200px',
              resize: 'none',
            }}
            disabled={isLoading || isThreadLoading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isThreadLoading}
            className="btn btn-primary"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
});
