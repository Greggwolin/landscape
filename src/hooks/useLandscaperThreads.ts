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

  const fetchWithTimeout = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
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
   * Load all threads for the current project/page context.
   */
  const loadThreads = useCallback(async () => {
    try {
      const url = new URL(`${DJANGO_API_URL}/api/landscaper/threads/`);
      url.searchParams.set('project_id', projectId);
      url.searchParams.set('page_context', pageContext);
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
      console.error('[LandscaperThreads] Failed to load threads:', err);
      return [];
    }
  }, [projectId, pageContext, fetchWithTimeout, getAuthHeaders]);

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
      console.error('[LandscaperThreads] Failed to load messages:', err);
    }
  }, [fetchWithTimeout, getAuthHeaders]);

  /**
   * Get or create an active thread for the current page context.
   */
  const initializeThread = useCallback(async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    setIsThreadLoading(true);

    try {
      // First, try to get existing active thread
      const loadedThreads = await loadThreads();
      const existingActive = loadedThreads.find((t: ChatThread) => t.isActive);

      if (existingActive) {
        setActiveThread(existingActive);
        // Load messages for this thread
        await loadThreadMessages(existingActive.threadId);
      } else {
        // Create new thread
        const response = await fetchWithTimeout(`${DJANGO_API_URL}/api/landscaper/threads/`, {
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
          // Refresh threads list
          await loadThreads();
        }
      }
    } catch (err) {
      console.error('[LandscaperThreads] Failed to initialize thread:', err);
      setError('Failed to initialize chat thread');
    } finally {
      setIsThreadLoading(false);
      initializingRef.current = false;
    }
  }, [projectId, pageContext, subtabContext, loadThreads, loadThreadMessages, fetchWithTimeout, getAuthHeaders]);

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
      console.error('[LandscaperThreads] Failed to start new thread:', err);
      setError('Failed to start new thread');
    } finally {
      setIsThreadLoading(false);
    }
  }, [projectId, pageContext, subtabContext, loadThreads, fetchWithTimeout, getAuthHeaders]);

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
      console.error('[LandscaperThreads] Failed to update title:', err);
    }
  }, [activeThread, fetchWithTimeout, getAuthHeaders]);

  /**
   * Send a message in the current thread.
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!activeThread) {
        setError('No active thread');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Optimistic update: show user message immediately
      const tempUserMessage: ThreadMessage = {
        messageId: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        const response = await fetchWithTimeout(
          `${DJANGO_API_URL}/api/landscaper/threads/${activeThread.threadId}/messages/`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              content: message,
              page_context: pageContext,  // Pass for context-aware tool filtering
            }),
          }
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to send message');
        }

        // Replace temp message with real ones
        setMessages((prev) => [
          ...prev.filter((m) => m.messageId !== tempUserMessage.messageId),
          data.user_message,
          data.assistant_message,
        ]);

        // Handle field updates
        if (data.field_updates && onFieldUpdate) {
          onFieldUpdate(data.field_updates);
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
        setMessages((prev) => prev.filter((m) => m.messageId !== tempUserMessage.messageId));
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Request timed out — the operation may still be processing. If you were updating many records, the changes may have been saved. Please refresh and try again.');
        } else {
          setError(errorMessage);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [activeThread, projectId, pageContext, onFieldUpdate, onToolResult, loadThreads, fetchWithTimeout, getAuthHeaders]
  );

  // Initialize thread when page context changes
  useEffect(() => {
    console.log('[LandscaperThreads] Context changed:', { projectId, pageContext });
    setMessages([]);
    setActiveThread(null);
    initializeThread();
  }, [projectId, pageContext, initializeThread]);

  return {
    // Thread state
    threads,
    activeThread,
    messages,
    isLoading,
    isThreadLoading,
    error,
    // Thread actions
    selectThread,
    startNewThread,
    updateThreadTitle,
    // Message actions
    sendMessage,
    loadThreadMessages,
    // Utility
    loadThreads,
  };
}
