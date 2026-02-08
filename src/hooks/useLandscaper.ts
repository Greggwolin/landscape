import { useState, useCallback, useEffect } from 'react';
import { emitMutationComplete } from '@/lib/events/landscaper-events';

/**
 * Represents a mutation proposal from Landscaper (Level 2 autonomy).
 * The AI proposes changes that users must confirm before execution.
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

export interface ChatMessage {
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
    // Level 2 autonomy: mutation proposals
    mutation_proposals?: MutationProposal[];
    mutationProposals?: MutationProposal[];
    has_pending_mutations?: boolean;
    hasPendingMutations?: boolean;
    // Tool execution results (for auto-refresh detection)
    tools_used?: string[];
    tool_executions?: Array<{
      tool: string;
      success: boolean;
      is_proposal?: boolean;
      result?: Record<string, unknown>;
    }>;
    error?: string;
    traceback?: string;
    // Media asset detection (Phase 4 DMS)
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

interface UseLandscaperOptions {
  /** Project ID, or null for global context (DMS, Admin, Benchmarks) */
  projectId: string | null;
  /** Active tab for project context, or page context for global (e.g., 'dms', 'benchmarks', 'admin') */
  activeTab?: string;
  onFieldUpdate?: (updates: Record<string, unknown>) => void;
}

const REQUEST_TIMEOUT_MS = 90000;

// Map tool names to the tables they affect
const TOOL_TABLE_MAP: Record<string, string[]> = {
  update_units: ['units', 'leases', 'unit_types'],
  update_leases: ['leases'],
  update_unit_types: ['unit_types'],
  update_operating_expenses: ['operating_expenses'],
  update_rental_comps: ['rental_comps'],
  update_sales_comps: ['sales_comps'],
  update_project_field: ['project'],
  bulk_update_fields: ['project'],
  update_cashflow_assumption: ['dcf_analysis', 'cashflow'],  // DCF/Cashflow assumptions
};

/**
 * Check tool executions for successful mutations and emit refresh events.
 */
function emitMutationEventsIfNeeded(
  projectId: number,
  metadata: ChatMessage['metadata']
): void {
  console.log('[useLandscaper] Checking for mutations in metadata:', metadata);

  if (!metadata?.tool_executions) {
    console.log('[useLandscaper] No tool_executions in metadata');
    return;
  }

  const toolExecutions = metadata.tool_executions as Array<{
    tool: string;
    success: boolean;
    is_proposal?: boolean;
    result?: {
      success?: boolean;
      created?: number;
      updated?: number;
      total?: number;
    };
  }>;

  console.log('[useLandscaper] Tool executions:', toolExecutions);

  // Find successful non-proposal tool executions that affect data
  const executedMutations = toolExecutions.filter(
    (t) =>
      t.success &&
      !t.is_proposal &&
      t.result?.success &&
      TOOL_TABLE_MAP[t.tool]
  );

  console.log('[useLandscaper] Filtered mutations:', executedMutations);

  if (executedMutations.length === 0) {
    console.log('[useLandscaper] No mutations matched criteria');
    return;
  }

  // Collect all affected tables
  const affectedTables = new Set<string>();
  let totalCreated = 0;
  let totalUpdated = 0;

  for (const mutation of executedMutations) {
    const tables = TOOL_TABLE_MAP[mutation.tool] || [];
    tables.forEach((t) => affectedTables.add(t));
    totalCreated += mutation.result?.created || 0;
    totalUpdated += mutation.result?.updated || 0;
  }

  // Emit a single event for all mutations
  const eventDetail = {
    projectId,
    mutationType: executedMutations.map((m) => m.tool).join(','),
    tables: Array.from(affectedTables),
    counts: {
      created: totalCreated,
      updated: totalUpdated,
      total: totalCreated + totalUpdated,
    },
  };
  console.log('[useLandscaper] Emitting mutation event:', eventDetail);
  emitMutationComplete(eventDetail);
}

export function useLandscaper({ projectId, activeTab = 'home', onFieldUpdate }: UseLandscaperOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithTimeout = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  // Determine if this is a global (non-project) context
  const isGlobalContext = projectId === null;

  const loadHistory = useCallback(async () => {
    try {
      // Build URL based on context type
      let url: URL;
      if (isGlobalContext) {
        // Global context: DMS, Admin, Benchmarks
        url = new URL('/api/landscaper/global/chat', window.location.origin);
        if (activeTab) {
          url.searchParams.set('page_context', activeTab);
        }
      } else {
        // Project context
        url = new URL(`/api/projects/${projectId}/landscaper/chat`, window.location.origin);
        if (activeTab) {
          url.searchParams.set('active_tab', activeTab);
        }
      }

      console.log('[Landscaper] Loading chat history for', isGlobalContext ? 'global' : 'project', 'context:', activeTab, url.toString());

      const response = await fetchWithTimeout(url.toString());
      const data = await response.json();

      if (data.success && data.messages) {
        console.log('[Landscaper] Loaded', data.messages.length, 'messages for', isGlobalContext ? 'page' : 'tab', ':', activeTab);
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [projectId, activeTab, fetchWithTimeout, isGlobalContext]);

  // Reload history when project or tab changes - clear immediately for responsive UX
  useEffect(() => {
    console.log('[Landscaper] Tab changed to:', activeTab, '- clearing and reloading');
    setMessages([]); // Clear old messages immediately
    loadHistory();
  }, [projectId, activeTab, loadHistory]);

  const sendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      setError(null);

      const clientRequestId = crypto.randomUUID();

      const tempUserMessage: ChatMessage = {
        messageId: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        // Build request URL and body based on context type
        let requestUrl: string;
        let requestBody: Record<string, unknown>;

        if (isGlobalContext) {
          // Global context: DMS, Admin, Benchmarks
          requestUrl = '/api/landscaper/global/chat';
          requestBody = { message, clientRequestId, page_context: activeTab };
        } else {
          // Project context
          requestUrl = `/api/projects/${projectId}/landscaper/chat`;
          requestBody = { message, clientRequestId, activeTab };
        }

        const response = await fetchWithTimeout(requestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to send message');
        }

        const assistantMessage: ChatMessage = {
          messageId: data.messageId,
          role: 'assistant',
          content: data.content,
          metadata: data.metadata,
          createdAt: data.createdAt,
        };

        setMessages((prev) => [
          ...prev.filter((m) => m.messageId !== tempUserMessage.messageId),
          { ...tempUserMessage, messageId: `user-${data.messageId}` },
          assistantMessage,
        ]);

        if (data.metadata?.fieldUpdates && onFieldUpdate) {
          onFieldUpdate(data.metadata.fieldUpdates);
        }

        // Emit mutation events if any tools executed successfully (only for project context)
        // This triggers auto-refresh in listening components (RentRollGrid, etc.)
        if (!isGlobalContext && projectId) {
          emitMutationEventsIfNeeded(Number(projectId), data.metadata);
        }

        if (data.wasDuplicate) {
          console.info('Response was cached (duplicate request)');
        }

        return assistantMessage;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.messageId !== tempUserMessage.messageId));
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError(errorMessage);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, activeTab, onFieldUpdate, fetchWithTimeout, isGlobalContext]
  );

  const clearChat = useCallback(async () => {
    try {
      // Build request URL based on context type
      const requestUrl = isGlobalContext
        ? '/api/landscaper/global/chat'
        : `/api/projects/${projectId}/landscaper/chat`;

      const response = await fetchWithTimeout(requestUrl, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessages([]);
      }

      return data;
    } catch (err) {
      console.error('Failed to clear chat:', err);
      throw err;
    }
  }, [projectId, fetchWithTimeout, isGlobalContext]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    loadHistory,
  };
}
