import { useState, useCallback, useEffect, useRef } from 'react';
import { emitMutationComplete } from '@/lib/events/landscaper-events';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 150000;

/**
 * Represents a chat thread.
 */
export interface ChatThread {
  threadId: string;
  projectId: number;
  pageContext: string;
  subtabContext: string | null;
  title: string | null;
  summary: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messageCount: number;
}

/**
 * Represents a mutation proposal from Landscaper (Level 2 autonomy).
 */
export interface MutationProposal {
  mutation_id?: string;
  mutationId?: string;
  mutation_type?: string;
  mutationType?: string;
  table?: string;
  table_name?: string;
  field?: string | null;
  field_name?: string | null;
  record_id?: string | null;
  recordId?: string | null;
  current_value?: unknown;
  currentValue?: unknown;
  proposed_value?: unknown;
  proposedValue?: unknown;
  reason?: string;
  is_high_risk?: boolean;
  isHighRisk?: boolean;
  expires_at?: string;
  expiresAt?: string;
  batch_id?: string;
  batchId?: string;
}

/**
 * Represents a chat message within a thread.
 */
export interface ThreadMessage {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: {
    sources?: Array<{ filename: string; similarity?: number; doc_id?: number }>;
    fieldUpdates?: Record<string, unknown>;
    db_query_used?: string;
    rag_chunks_used?: number;
    client_request_id?: string;
    mutation_proposals?: MutationProposal[];
    mutationProposals?: MutationProposal[];
    has_pending_mutations?: boolean;
    hasPendingMutations?: boolean;
    tools_used?: string[];
    tool_executions?: Array<{
      tool: string;
      success: boolean;
      is_proposal?: boolean;
      result?: Record<string, unknown>;
    }>;
    error?: string;
    traceback?: string;
    /** If true, this user message is a system injection and should not be rendered */
    hidden?: boolean;
    media_summary?: {
      doc_id: number;
      doc_name: string;
      total_detected: number;
      by_type: Record<string, {
        name: string;
        count: number;
        badge_color: string;
        content_intent?: string;
        default_action?: string;
      }>;
    };
  };
}

/** Options for sendMessage */
export interface SendMessageOptions {
  /** If true, the user message is hidden from the chat UI (system injection) */
  hidden?: boolean;
}

interface UseLandscaperThreadsOptions {
  projectId: string;
  pageContext: string;
  subtabContext?: string;
  onFieldUpdate?: (updates: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: Record<string, unknown>) => void;
}

// Map tool names to the tables they affect
const TOOL_TABLE_MAP: Record<string, string[]> = {
  update_units: ['units', 'leases', 'unit_types'],
  delete_units: ['units', 'leases'],
  update_leases: ['leases'],
  update_unit_types: ['unit_types'],
  update_operating_expenses: ['operating_expenses'],
  update_rental_comps: ['rental_comps'],
  update_sales_comps: ['sales_comps'],
  update_project_field: ['project'],
  bulk_update_fields: ['project'],
  update_cashflow_assumption: ['dcf_analysis', 'cashflow'],  // DCF/Cashflow assumptions
  confirm_column_mapping: ['units', 'leases', 'unit_types', 'dynamic_columns'],
  compute_rent_roll_delta: ['units', 'leases'],
};

/**
 * Check tool executions for successful mutations and emit refresh events.
 */
function emitMutationEventsIfNeeded(
  projectId: number,
  metadata: ThreadMessage['metadata']
): void {
  if (!metadata?.tool_executions) return;

  const toolExecutions = metadata.tool_executions;
  const executedMutations = toolExecutions.filter(
    (t) =>
      t.success &&
      !t.is_proposal &&
      t.result?.success &&
      TOOL_TABLE_MAP[t.tool]
  );

  if (executedMutations.length === 0) return;

  const affectedTables = new Set<string>();
  let totalCreated = 0;
  let totalUpdated = 0;

  for (const mutation of executedMutations) {
    const tables = TOOL_TABLE_MAP[mutation.tool] || [];
    tables.forEach((t) => affectedTables.add(t));
    totalCreated += (mutation.result?.created as number) || 0;
    totalUpdated += (mutation.result?.updated as number) || 0;
  }

  emitMutationComplete({
    projectId,
    mutationType: executedMutations.map((m) => m.tool).join(','),
    tables: Array.from(affectedTables),
    counts: {
      created: totalCreated,
      updated: totalUpdated,
      total: totalCreated + totalUpdated,
    },
  });
}

/**
 * Hook for managing Landscaper chat threads.
 *
 * This hook provides thread-aware chat functionality:
 * - Auto-creates or retrieves threads for the current page context
 * - Manages messages within the current thread
 * - Supports thread switching and new thread creation
 * - Handles title updates
 */
export function useLandscaperThreads({
  projectId,
  pageContext,
  subtabContext,
  onFieldUpdate,
  onToolResult,
}: UseLandscaperThreadsOptions) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const activeThreadRef = useRef<ChatThread | null>(null);
  /** Guards concurrent sendMessage calls */
  const sendingRef = useRef(false);
  /** Tracks whether at least one full initializeThread cycle has completed */
  const hasInitializedOnceRef = useRef(false);

  // AbortController for cancelling in-flight requests on unmount / context change
  const abortControllerRef = useRef<AbortController>(new AbortController());

  // Abort all in-flight requests on unmount, then reset for potential re-mount
  useEffect(() => {
    return () => {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    };
  }, []);

  const fetchWithTimeout = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    // Chain with the component-level abort controller
    const parentSignal = abortControllerRef.current.signal;
    if (parentSignal.aborted) {
      controller.abort();
      // Throw AbortError that callers already catch and suppress
      throw new DOMException('The operation was aborted due to unmount', 'AbortError');
    }
    const onAbort = () => controller.abort();
    parentSignal.addEventListener('abort', onAbort);

    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
      parentSignal.removeEventListener('abort', onAbort);
    }
  }, []);

  /** Returns true if a fetch Response is a 401/403 auth error — callers should stop retrying. */
  const isAuthError = useCallback((response: Response): boolean => {
    return response.status === 401 || response.status === 403;
  }, []);

  const getAuthHeaders = useCallback((includeContentType = true): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('auth_tokens');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.access) {
            headers.Authorization = `Bearer ${parsed.access}`;
          }
        }
      } catch (error) {
        console.warn('[LandscaperThreads] Failed to parse auth token:', error);
      }
    }

    return headers;
  }, []);

  /**
   * Load threads for the current project/page context (used for initialization).
   */
  const loadThreads = useCallback(async () => {
    // Guard: skip API call for invalid project IDs
    if (!projectId || projectId === '0' || parseInt(projectId) <= 0) {
      return [];
    }

    try {
      const url = new URL(`${DJANGO_API_URL}/api/landscaper/threads/`);
      url.searchParams.set('project_id', projectId);
      url.searchParams.set('page_context', pageContext);
      if (subtabContext) {
        url.searchParams.set('subtab_context', subtabContext);
      }
      url.searchParams.set('include_closed', 'true');

      const response = await fetchWithTimeout(url.toString(), {
        headers: getAuthHeaders(false),
      });
      const data = await response.json();

      if (data.success && data.threads) {
        setThreads(data.threads);
        return data.threads as ChatThread[];
      }
      return [];
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return [];
      console.error('[LandscaperThreads] Failed to load threads:', err);
      return [];
    }
  }, [projectId, pageContext, subtabContext, fetchWithTimeout, getAuthHeaders]);

  /**
   * Load ALL threads for the project (across all page contexts).
   * Used by ThreadList browser so users can see and switch to any thread.
   */
  const [allThreads, setAllThreads] = useState<ChatThread[]>([]);
  const loadAllThreads = useCallback(async () => {
    if (!projectId || projectId === '0' || parseInt(projectId) <= 0) {
      return [];
    }

    try {
      const url = new URL(`${DJANGO_API_URL}/api/landscaper/threads/`);
      url.searchParams.set('project_id', projectId);
      // No page_context filter — get ALL threads for the project
      url.searchParams.set('include_closed', 'true');

      const response = await fetchWithTimeout(url.toString(), {
        headers: getAuthHeaders(false),
      });
      const data = await response.json();

      if (data.success && data.threads) {
        setAllThreads(data.threads);
        return data.threads as ChatThread[];
      }
      return [];
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return [];
      console.error('[LandscaperThreads] Failed to load all threads:', err);
      return [];
    }
  }, [projectId, fetchWithTimeout, getAuthHeaders]);

  /**
   * Load messages for a specific thread.
   */
  const loadThreadMessages = useCallback(async (threadId: string) => {
    try {
      const response = await fetchWithTimeout(
        `${DJANGO_API_URL}/api/landscaper/threads/${threadId}/messages/`,
        {
          headers: getAuthHeaders(false),
        }
      );
      const data = await response.json();

      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[LandscaperThreads] Failed to load messages:', err);
    }
  }, [fetchWithTimeout, getAuthHeaders]);

  /**
   * Get or create an active thread for the current page context.
   */
  const initializeThread = useCallback(async () => {
    // Guard: skip initialization for invalid project IDs
    if (!projectId || projectId === '0' || parseInt(projectId) <= 0) {
      return;
    }

    if (initializingRef.current) return;
    initializingRef.current = true;
    setIsThreadLoading(true);

    // Capture the current abort signal so we can detect stale-context races.
    // If context changes while we're awaiting, the context-change effect aborts
    // this signal and creates a new one. Checking `mySignal.aborted` after each
    // async gap prevents us from creating threads for a context we've already
    // navigated away from.
    const mySignal = abortControllerRef.current.signal;

    try {
      // First, try to get existing active thread
      const loadedThreads = await loadThreads();

      // Bail out if context changed while loading
      if (mySignal.aborted) return;

      const existingActive = loadedThreads.find((t: ChatThread) => t.isActive);

      if (existingActive) {
        setActiveThread(existingActive);
        // Load messages for this thread
        await loadThreadMessages(existingActive.threadId);
      } else if (loadedThreads.length > 0) {
        // No active thread but threads exist for this context —
        // pick the most recently updated one instead of creating a blank.
        // The server-side POST (get_or_create) would reactivate anyway,
        // but doing it here avoids an unnecessary network round-trip.
        const mostRecent = [...loadedThreads].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];

        if (mySignal.aborted) return;

        // Use the server-side get_or_create which will return this thread
        // (it reactivates or creates as needed, protected by SELECT FOR UPDATE)
        const response = await fetchWithTimeout(`${DJANGO_API_URL}/api/landscaper/threads/`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            project_id: parseInt(projectId),
            page_context: pageContext,
            subtab_context: subtabContext || null,
          }),
        });

        if (mySignal.aborted) return;

        if (isAuthError(response)) {
          recoveryAttemptsRef.current = MAX_RECOVERY_ATTEMPTS;
          setError('Authentication failed — please refresh the page or log in again');
          return;
        }

        const data = await response.json();
        if (data.success && data.thread) {
          setActiveThread(data.thread);
          // Load messages — the reactivated thread may have history
          await loadThreadMessages(data.thread.threadId);
          await loadThreads();
        }
      } else {
        // No threads at all for this context — create new
        if (mySignal.aborted) return;

        const response = await fetchWithTimeout(`${DJANGO_API_URL}/api/landscaper/threads/`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            project_id: parseInt(projectId),
            page_context: pageContext,
            subtab_context: subtabContext || null,
          }),
        });

        if (mySignal.aborted) return;

        if (isAuthError(response)) {
          // Auth failure — stop recovery loop, surface immediately
          recoveryAttemptsRef.current = MAX_RECOVERY_ATTEMPTS;
          setError('Authentication failed — please refresh the page or log in again');
          return;
        }

        const data = await response.json();
        if (data.success && data.thread) {
          setActiveThread(data.thread);
          setMessages([]);
          // Refresh threads list
          await loadThreads();
        }
      }
    } catch (err) {
      // Silently ignore aborts from unmount/context change
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('[LandscaperThreads] Failed to initialize thread:', err);
      setError('Failed to initialize chat thread');
    } finally {
      setIsThreadLoading(false);
      initializingRef.current = false;
      hasInitializedOnceRef.current = true;
    }
  }, [projectId, pageContext, subtabContext, loadThreads, loadThreadMessages, fetchWithTimeout, getAuthHeaders, isAuthError]);

  /**
   * Select a different thread.
   */
  const selectThread = useCallback(async (threadId: string) => {
    const thread = threads.find((t) => t.threadId === threadId);
    if (thread) {
      setActiveThread(thread);
      setMessages([]);
      await loadThreadMessages(threadId);
    }
  }, [threads, loadThreadMessages]);

  /**
   * Start a new thread (closes current one first).
   */
  const startNewThread = useCallback(async () => {
    setIsThreadLoading(true);
    try {
      const response = await fetchWithTimeout(`${DJANGO_API_URL}/api/landscaper/threads/new/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          project_id: parseInt(projectId),
          page_context: pageContext,
          subtab_context: subtabContext || null,
        }),
      });

      const data = await response.json();
      if (data.success && data.thread) {
        setActiveThread(data.thread);
        setMessages([]);
        await loadThreads();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[LandscaperThreads] Failed to start new thread:', err);
      setError('Failed to start new thread');
    } finally {
      setIsThreadLoading(false);
    }
  }, [projectId, pageContext, subtabContext, loadThreads, fetchWithTimeout, getAuthHeaders]);

  /**
   * Delete a thread. Knowledge is retained in separate tables — this only
   * removes the conversational transcript.
   */
  const deleteThread = useCallback(async (threadId: string) => {
    try {
      const response = await fetchWithTimeout(
        `${DJANGO_API_URL}/api/landscaper/threads/${threadId}/`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();
      if (data.success) {
        // Remove from local state
        setThreads((prev) => prev.filter((t) => t.threadId !== threadId));
        setAllThreads((prev) => prev.filter((t) => t.threadId !== threadId));
        // If we deleted the active thread, clear it so recovery kicks in
        if (activeThread?.threadId === threadId) {
          setActiveThread(null);
          setMessages([]);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[LandscaperThreads] Failed to delete thread:', err);
    }
  }, [activeThread, fetchWithTimeout, getAuthHeaders]);

  /**
   * Update a thread's title.
   */
  const updateThreadTitle = useCallback(async (threadId: string, title: string) => {
    try {
      const response = await fetchWithTimeout(
        `${DJANGO_API_URL}/api/landscaper/threads/${threadId}/`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title }),
        }
      );

      const data = await response.json();
      if (data.success && data.thread) {
        // Update local state
        setThreads((prev) =>
          prev.map((t) => (t.threadId === threadId ? { ...t, title } : t))
        );
        if (activeThread?.threadId === threadId) {
          setActiveThread((prev) => (prev ? { ...prev, title } : prev));
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[LandscaperThreads] Failed to update title:', err);
    }
  }, [activeThread, fetchWithTimeout, getAuthHeaders]);

  /**
   * Send a message in the current thread.
   */
  const sendMessage = useCallback(
    async (message: string, options?: SendMessageOptions) => {
      // Guard: prevent concurrent sends
      if (sendingRef.current) {
        console.warn('[LandscaperThreads] Message send already in progress — ignoring');
        return;
      }

      if (!activeThread) {
        // Attempt recovery — initializeThread updates activeThreadRef synchronously
        console.log('[LandscaperThreads] No active thread — attempting recovery before send...');
        setError(null);
        try {
          await initializeThread();
        } catch {
          // initializeThread sets its own error
        }
        // Check ref (not stale closure) to see if recovery succeeded
        if (!activeThreadRef.current) {
          setError('No active thread — please try again');
          return;
        }
        // Recovery succeeded — fall through to send using the ref value
        console.log('[LandscaperThreads] Recovery succeeded, proceeding with send');
      }

      // Use ref for the thread ID in case we just recovered
      const threadToUse = activeThread || activeThreadRef.current;
      if (!threadToUse) {
        setError('No active thread available');
        return;
      }

      sendingRef.current = true;
      setIsLoading(true);
      setError(null);

      const isHidden = options?.hidden === true;

      // Optimistic update: show user message immediately (unless hidden)
      const tempUserMessage: ThreadMessage = {
        messageId: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
        ...(isHidden ? { metadata: { hidden: true } } : {}),
      };
      if (!isHidden) {
        setMessages((prev) => [...prev, tempUserMessage]);
      }

      try {
        const response = await fetchWithTimeout(
          `${DJANGO_API_URL}/api/landscaper/threads/${threadToUse.threadId}/messages/`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              content: message,
              page_context: pageContext,  // Pass for context-aware tool filtering
              ...(isHidden ? { hidden: true } : {}),
            }),
          }
        );

        if (isAuthError(response)) {
          throw new Error('Authentication failed — please refresh the page or log in again');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to send message');
        }

        // Tag user message as hidden if this was a system injection
        const userMsg = data.user_message;
        if (isHidden && userMsg) {
          userMsg.metadata = { ...userMsg.metadata, hidden: true };
        }

        // Replace temp message with real ones (skip hidden user messages)
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.messageId !== tempUserMessage.messageId);
          const newMessages: ThreadMessage[] = [];
          if (userMsg && !isHidden) newMessages.push(userMsg);
          if (data.assistant_message) newMessages.push(data.assistant_message);
          return [...filtered, ...newMessages];
        });

        // Handle field updates
        if (data.field_updates && onFieldUpdate) {
          onFieldUpdate(data.field_updates);
        }

        // Optimistically update thread title if backend generated one
        if (data.thread_title && threadToUse) {
          setActiveThread((prev) =>
            prev ? { ...prev, title: data.thread_title } : prev
          );
        }

        // Emit mutation events for auto-refresh
        emitMutationEventsIfNeeded(parseInt(projectId), data.assistant_message?.metadata);

        // Emit tool result callbacks (for IC page data flow)
        if (onToolResult && data.assistant_message?.metadata?.tool_executions) {
          for (const exec of data.assistant_message.metadata.tool_executions) {
            if (exec.success && exec.result) {
              onToolResult(exec.tool, exec.result as Record<string, unknown>);
            }
          }
        }

        // Refresh thread list to get updated title/timestamp
        await loadThreads();

        return data.assistant_message;
      } catch (err) {
        if (!isHidden) {
          setMessages((prev) => prev.filter((m) => m.messageId !== tempUserMessage.messageId));
        }
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Could be unmount or genuine timeout — only show error if component is still mounted
          // (setError is a no-op after unmount in React 18+, but avoid noisy re-throws)
          setError('Request timed out — the operation may still be processing. Please refresh and try again.');
          return undefined;
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
        sendingRef.current = false;
      }
    },
    [activeThread, projectId, pageContext, onFieldUpdate, onToolResult, loadThreads, initializeThread, fetchWithTimeout, getAuthHeaders, isAuthError]
  );

  // Keep ref in sync with state so sendMessage recovery can check current value
  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  // Initialize thread when page context or subtab changes
  // NOTE: initializeThread intentionally excluded from deps to prevent
  // cascading re-renders when its callback deps (loadThreads) change.
  // The context key string captures the meaningful changes.
  useEffect(() => {
    console.log('[LandscaperThreads] Context changed:', { projectId, pageContext, subtabContext });
    // Abort any in-flight requests from previous context
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setMessages([]);
    setActiveThread(null);
    hasInitializedOnceRef.current = false;
    initializeThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, pageContext, subtabContext]);

  // Auto-recover from missing/failed thread — retry with increasing delay.
  // This prevents "No active thread" from being a permanent terminal state
  // (e.g. after ingestion closes and the main Landscaper re-mounts).
  const recoveryAttemptsRef = useRef(0);
  const MAX_RECOVERY_ATTEMPTS = 5;
  useEffect(() => {
    // Reset recovery counter when context changes (new mount / new page)
    recoveryAttemptsRef.current = 0;
  }, [projectId, pageContext, subtabContext]);

  useEffect(() => {
    if (
      !activeThread &&
      !isThreadLoading &&
      !initializingRef.current &&
      hasInitializedOnceRef.current &&  // Only recover after first init completes
      recoveryAttemptsRef.current < MAX_RECOVERY_ATTEMPTS
    ) {
      // Recover from both error states AND silent failures (no error but no thread)
      const attempt = recoveryAttemptsRef.current + 1;
      recoveryAttemptsRef.current = attempt;
      const delay = attempt === 1 ? 500 : Math.min(attempt * 1500, 5000);
      const timer = setTimeout(() => {
        console.log(`[LandscaperThreads] Auto-recovering from missing thread (attempt ${attempt}/${MAX_RECOVERY_ATTEMPTS})...`);
        setError(null);
        initializeThread();
      }, delay);
      return () => clearTimeout(timer);
    }
    // NOTE: initializeThread intentionally excluded to prevent cascading
    // re-fires when its callback reference changes. The effect triggers
    // on activeThread/isThreadLoading state changes which are the meaningful signals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThread, isThreadLoading, error]);

  // Reset recovery counter on successful thread acquisition
  useEffect(() => {
    if (activeThread) {
      recoveryAttemptsRef.current = 0;
    }
  }, [activeThread]);

  return {
    // Thread state
    threads,
    allThreads,
    activeThread,
    messages,
    isLoading,
    isThreadLoading,
    error,
    // Thread actions
    selectThread,
    startNewThread,
    updateThreadTitle,
    deleteThread,
    // Message actions
    sendMessage,
    loadThreadMessages,
    // Utility
    loadThreads,
    loadAllThreads,
  };
}
