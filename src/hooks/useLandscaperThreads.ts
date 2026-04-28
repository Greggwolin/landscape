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
  /** Project ID as a string. Omit/undefined/empty string = unassigned (Chat Canvas) mode. */
  projectId?: string;
  pageContext: string;
  subtabContext?: string;
  /**
   * URL-derived thread UUID. When set on an unassigned chat, the hook fetches
   * this exact thread instead of calling the server-side get_or_create flow.
   * This is how `/w/chat/[threadId]` resumes a conversation without
   * accidentally resurrecting a different "active" thread.
   */
  initialThreadId?: string;
  onFieldUpdate?: (updates: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: Record<string, unknown>) => void;
}

/** True when the projectId string represents a real project (not unassigned mode). */
function hasProjectId(pid: string | undefined): pid is string {
  return !!pid && pid !== '0' && parseInt(pid) > 0;
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
  initialThreadId,
  onFieldUpdate,
  onToolResult,
}: UseLandscaperThreadsOptions) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Set true when a URL-pinned thread (`initialThreadId`) returns 404 / null
   * from the server. Permanent failure — recovery loop has been short-circuited.
   * Consumers (CenterChatPanel) should watch this and redirect to /w/chat.
   */
  const [threadNotFound, setThreadNotFound] = useState(false);
  const initializingRef = useRef(false);
  const activeThreadRef = useRef<ChatThread | null>(null);
  /** Guards concurrent sendMessage calls */
  const sendingRef = useRef(false);
  /** Tracks whether at least one full initializeThread cycle has completed */
  const hasInitializedOnceRef = useRef(false);
  /**
   * Recovery attempt counter for missing/failed threads. Hoisted up here
   * (was declared near the recovery effect) so initializeThread can short-
   * circuit it on permanent 404 in the URL-pinned branch.
   */
  const recoveryAttemptsRef = useRef(0);
  const MAX_RECOVERY_ATTEMPTS = 5;

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
    try {
      const url = new URL(`${DJANGO_API_URL}/api/landscaper/threads/`);
      if (hasProjectId(projectId)) {
        url.searchParams.set('project_id', projectId);
        url.searchParams.set('page_context', pageContext);
        if (subtabContext) {
          url.searchParams.set('subtab_context', subtabContext);
        }
      } else {
        // Unassigned mode — list Chat Canvas threads (no project attached)
        url.searchParams.set('unassigned', 'true');
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
    try {
      const url = new URL(`${DJANGO_API_URL}/api/landscaper/threads/`);
      if (hasProjectId(projectId)) {
        url.searchParams.set('project_id', projectId);
        // No page_context filter — get ALL threads for the project
      } else {
        url.searchParams.set('unassigned', 'true');
      }
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
   * Load a single thread by UUID. Used by URL-based thread resumption
   * (`/w/chat/[threadId]`) so we fetch exactly the thread named in the URL
   * without falling through to get_or_create (which could return a
   * different active thread).
   *
   * Returns the ChatThread on success, or null on 404 / error / abort.
   */
  const loadThreadById = useCallback(
    async (threadId: string): Promise<ChatThread | null> => {
      try {
        const response = await fetchWithTimeout(
          `${DJANGO_API_URL}/api/landscaper/threads/${threadId}/`,
          {
            headers: getAuthHeaders(false),
          }
        );
        if (!response.ok) return null;
        const data = await response.json();
        if (data.success && data.thread) {
          return data.thread as ChatThread;
        }
        return null;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return null;
        console.error('[LandscaperThreads] Failed to load thread by id:', err);
        return null;
      }
    },
    [fetchWithTimeout, getAuthHeaders]
  );

  /**
   * Initialize the thread for the current context.
   *
   * Branches:
   * 1. **URL-pinned thread** — if `initialThreadId` is set, fetch that exact
   *    thread by UUID. No get_or_create fallback. If the fetch fails we leave
   *    activeThread=null and let the caller / UI surface the miss. This is
   *    the Chat Canvas resume path (`/w/chat/[threadId]`).
   * 2. **Project-scoped chat** — existing get_or_create flow. The server
   *    reactivates or creates a thread keyed on (project, page_context,
   *    subtab_context). This is the project-page Landscaper behavior.
   * 3. **Unassigned chat with no URL thread** — DO NOT create anything.
   *    activeThread stays null, messages stays []. A thread is created
   *    lazily on the first sendMessage call. This is `/w/chat` root.
   */
  const initializeThread = useCallback(async () => {
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
      // --- Branch 1: URL-pinned thread (Chat Canvas resume) ---
      if (initialThreadId) {
        const thread = await loadThreadById(initialThreadId);
        if (mySignal.aborted) return;

        if (thread) {
          setActiveThread(thread);
          setThreadNotFound(false);
          await loadThreadMessages(thread.threadId);
          if (mySignal.aborted) return;
          // Refresh sidebar list so the resumed thread is reflected
          await loadThreads();
        } else {
          // URL pointed at a thread we can't fetch (deleted / bad id / auth).
          // Don't fall through to get_or_create — that would silently
          // resurrect a different thread. SHORT-CIRCUIT recovery: a 404
          // here is permanent (thread is genuinely gone), retrying 5x
          // floods the console with errors and leaves the user stranded.
          // Set threadNotFound so CenterChatPanel can redirect to /w/chat.
          setActiveThread(null);
          setMessages([]);
          setThreadNotFound(true);
          recoveryAttemptsRef.current = MAX_RECOVERY_ATTEMPTS;
          setError('Thread not found — redirecting to a new chat');
        }
        return;
      }
      // Reset the flag any time we successfully take a non-URL branch
      setThreadNotFound(false);

      // --- Branch 3: Unassigned chat, no URL thread → wait for first send ---
      if (!hasProjectId(projectId)) {
        // Don't POST anything. activeThread stays null; sendMessage will
        // create the thread on first user message (Option B semantics).
        // Still load the sidebar list so past threads are browsable.
        await loadThreads();
        if (mySignal.aborted) return;
        setActiveThread(null);
        setMessages([]);
        return;
      }

      // --- Branch 2: Project-scoped chat — existing get_or_create flow ---
      const loadedThreads = await loadThreads();
      if (mySignal.aborted) return;

      const existingActive = loadedThreads.find((t: ChatThread) => t.isActive);

      if (existingActive) {
        setActiveThread(existingActive);
        await loadThreadMessages(existingActive.threadId);
      } else {
        // No active thread for this (project, page_context) — use
        // server-side get_or_create (SELECT FOR UPDATE protected). Handles
        // both "reactivate most recent" and "create new" via one call.
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
          await loadThreadMessages(data.thread.threadId);
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
  }, [projectId, pageContext, subtabContext, initialThreadId, loadThreads, loadThreadById, loadThreadMessages, fetchWithTimeout, getAuthHeaders, isAuthError]);

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
   *
   * For project-scoped chats this POSTs `/threads/new/` to bypass
   * get_or_create. For unassigned chats the UI-preferred path is instead
   * to clear state and let sendMessage create the thread on first message
   * (Option B). We keep this callable for project chats and defensive
   * fallback; unassigned callers should prefer navigating to `/w/chat`
   * and letting the hook handle the empty state.
   */
  const startNewThread = useCallback(async () => {
    setIsThreadLoading(true);
    try {
      if (!hasProjectId(projectId)) {
        // Unassigned — clear state, don't create. sendMessage will create
        // on first send. Refresh the sidebar list so any existing
        // unassigned threads remain visible.
        setActiveThread(null);
        setMessages([]);
        await loadThreads();
        return;
      }

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
        setError(null);

        if (!hasProjectId(projectId) && !initialThreadId) {
          // Unassigned chat, first message — create thread lazily here
          // (Option B semantics). Bypasses get_or_create so we always
          // get a fresh thread rather than resurrecting a stale one.
          try {
            const response = await fetchWithTimeout(
              `${DJANGO_API_URL}/api/landscaper/threads/new/`,
              {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                  page_context: pageContext,
                  subtab_context: subtabContext || null,
                }),
              }
            );

            if (isAuthError(response)) {
              setError('Authentication failed — please refresh the page or log in again');
              return;
            }

            const data = await response.json();
            if (data.success && data.thread) {
              setActiveThread(data.thread);
              activeThreadRef.current = data.thread;
              setMessages([]);
              // Don't await loadThreads here — it's non-blocking sidebar refresh
              loadThreads();
            } else {
              setError(data.error || 'Failed to start new thread');
              return;
            }
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            console.error('[LandscaperThreads] Failed to create thread on first send:', err);
            setError('Failed to start new thread');
            return;
          }
        } else {
          // Project-scoped or URL-pinned with missing thread — run full
          // initializeThread recovery. initializeThread keeps
          // activeThreadRef in sync via the state→ref effect.
          console.log('[LandscaperThreads] No active thread — attempting recovery before send...');
          try {
            await initializeThread();
          } catch {
            // initializeThread sets its own error
          }
          if (!activeThreadRef.current) {
            setError('No active thread — please try again');
            return;
          }
          console.log('[LandscaperThreads] Recovery succeeded, proceeding with send');
        }
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

        // Emit mutation events for auto-refresh (project-scoped threads only;
        // unassigned threads run no mutation tools via the executor guard)
        if (hasProjectId(projectId)) {
          emitMutationEventsIfNeeded(parseInt(projectId), data.assistant_message?.metadata);
        }

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
          // AbortError lands here for three reasons: (1) the context-change
          // effect aborts when initialThreadId / pageContext changes — most
          // commonly a benign URL echo after THIS request created a thread,
          // (2) component unmount, (3) the genuine 150s REQUEST_TIMEOUT_MS
          // firing. None of these benefit from a user-facing banner: the
          // first two are by-design cancellations and the third is rare
          // enough that the user has navigated away. Match the silent-return
          // pattern used by the other catch blocks in this hook.
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
    [activeThread, projectId, pageContext, subtabContext, initialThreadId, onFieldUpdate, onToolResult, loadThreads, initializeThread, fetchWithTimeout, getAuthHeaders, isAuthError]
  );

  // Keep ref in sync with state so sendMessage recovery can check current value
  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  // Initialize thread when page context, subtab, or URL-pinned thread changes.
  // NOTE: initializeThread intentionally excluded from deps to prevent
  // cascading re-renders when its callback deps (loadThreads) change.
  // The context key string captures the meaningful changes.
  useEffect(() => {
    // Skip the reset/abort when the URL transition is just THIS request
    // creating a thread — the new initialThreadId echoes back to match the
    // activeThread we just set, so there's no real context change. Without
    // this guard, the abort cancels the in-flight POST that just succeeded
    // and the catch block produces a spurious "Request timed out" (finding #11).
    if (initialThreadId && initialThreadId === activeThreadRef.current?.threadId) {
      return;
    }

    console.log('[LandscaperThreads] Context changed:', { projectId, pageContext, subtabContext, initialThreadId });
    // Abort any in-flight requests from previous context
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setMessages([]);
    setActiveThread(null);
    hasInitializedOnceRef.current = false;
    initializeThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, pageContext, subtabContext, initialThreadId]);

  // Auto-recover from missing/failed thread — retry with increasing delay.
  // This prevents "No active thread" from being a permanent terminal state
  // (e.g. after ingestion closes and the main Landscaper re-mounts).
  //
  // IMPORTANT: only run for project-scoped or URL-pinned threads. On the
  // unassigned `/w/chat` root we WANT activeThread=null (waiting for the
  // user's first message); looping recovery here would recreate the old
  // bug where new-chat mounts silently resurrect a thread.
  // (recoveryAttemptsRef + MAX_RECOVERY_ATTEMPTS now declared at top of
  // hook so initializeThread can short-circuit them on permanent 404.)
  useEffect(() => {
    // Reset recovery counter when context changes (new mount / new page)
    recoveryAttemptsRef.current = 0;
  }, [projectId, pageContext, subtabContext, initialThreadId]);

  useEffect(() => {
    const shouldRecover = hasProjectId(projectId) || !!initialThreadId;
    if (!shouldRecover) return;

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
  }, [activeThread, isThreadLoading, error, projectId, initialThreadId]);

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
    /** True when URL-pinned thread fetch returned 404. Watch from layout/CenterChatPanel and redirect to /w/chat. */
    threadNotFound,
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
