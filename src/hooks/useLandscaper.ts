import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emitFieldUpdate } from './useFieldRefresh';

export interface ColumnDef {
  key: string;
  label: string;
  width?: number;
  format?: 'currency' | 'number' | 'decimal' | 'percent';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    suggestedValues?: Record<string, string>;
    confidenceLevel?: 'low' | 'medium' | 'high';
    context?: {
      chunks_retrieved?: number;
      sources?: string[];
      db_query_matched?: boolean;
      db_query_type?: string;
      primary_source?: string;
    };
  };
  // Structured data for table rendering
  structuredData?: Record<string, unknown>[];
  dataType?: 'table' | 'list';
  dataTitle?: string;
  columns?: ColumnDef[];
}

interface ChatHistoryResponse {
  success: boolean;
  messages: Array<{ role: string; content: string }>;
  count: number;
  error?: string;
}

export interface FieldUpdate {
  table: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  success: boolean;
}

interface SendMessageResponse {
  success: boolean;
  messageId: string;
  content: string;
  metadata: Record<string, unknown>;
  context: Record<string, unknown>;
  // Structured data for table rendering
  structuredData?: Record<string, unknown>[];
  dataType?: 'table' | 'list';
  dataTitle?: string;
  columns?: ColumnDef[];
  // Field updates from Landscaper tool calls
  fieldUpdates?: FieldUpdate[];
  error?: string;
}

/**
 * Fetch chat history for a project.
 */
export function useLandscaperChat(projectId?: string | number) {
  const id = projectId?.toString() || '';

  return useQuery<ChatHistoryResponse>({
    queryKey: ['landscaper-chat', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/landscaper/chat`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch chat history');
      }
      return response.json();
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/**
 * Send a message to Landscaper AI.
 * Automatically invalidates project data queries when field updates occur.
 */
export function useSendMessage(projectId?: string | number) {
  const queryClient = useQueryClient();
  const id = projectId?.toString() || '';

  return useMutation<SendMessageResponse, Error, string>({
    mutationFn: async (message: string) => {
      if (!id) {
        throw new Error('Project ID is required');
      }

      const response = await fetch(`/api/projects/${id}/landscaper/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      return data;
    },
    onSuccess: (data) => {
      // Always invalidate chat history
      queryClient.invalidateQueries({ queryKey: ['landscaper-chat', id] });

      // If there were field updates, invalidate project-related queries AND emit event
      if (data.fieldUpdates && data.fieldUpdates.length > 0) {
        // Invalidate React Query caches
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/profile`] });
        queryClient.invalidateQueries({ queryKey: ['project-details', id] });
        queryClient.invalidateQueries({ queryKey: ['project', id] });
        queryClient.invalidateQueries({ queryKey: ['landscaper-activities', id] });

        // Emit event for SWR-based components (like ProjectProfileTile)
        emitFieldUpdate({
          projectId: id,
          updates: data.fieldUpdates.map((u) => ({
            table: u.table,
            field: u.field,
            old_value: u.old_value,
            new_value: u.new_value,
          })),
        });
      }
    },
  });
}

/**
 * Clear chat history.
 */
export function useClearChat(projectId?: string | number) {
  const queryClient = useQueryClient();
  const id = projectId?.toString() || '';

  return useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error('Project ID is required');
      }

      const response = await fetch(`/api/projects/${id}/landscaper/chat`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to clear chat history');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landscaper-chat', id] });
    },
  });
}

/**
 * Search documents without AI response.
 */
export function useDocumentSearch(projectId?: string | number) {
  const id = projectId?.toString() || '';

  return useMutation({
    mutationFn: async (query: string) => {
      if (!id) {
        throw new Error('Project ID is required');
      }

      const response = await fetch(`/api/projects/${id}/landscaper/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Search failed');
      }

      return data;
    },
  });
}
