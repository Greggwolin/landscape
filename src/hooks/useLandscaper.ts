import { useState, useCallback, useEffect } from 'react';

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
  };
}

interface UseLandscaperOptions {
  projectId: string;
  activeTab?: string;
  onFieldUpdate?: (updates: Record<string, unknown>) => void;
}

export function useLandscaper({ projectId, activeTab = 'home', onFieldUpdate }: UseLandscaperOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      // Build URL with active_tab filter for tab-specific history
      const url = new URL(`/api/projects/${projectId}/landscaper/chat`, window.location.origin);
      if (activeTab) {
        url.searchParams.set('active_tab', activeTab);
      }

      console.log('[Landscaper] Loading chat history for tab:', activeTab, url.toString());

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success && data.messages) {
        console.log('[Landscaper] Loaded', data.messages.length, 'messages for tab:', activeTab);
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [projectId, activeTab]);

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
        const response = await fetch(`/api/projects/${projectId}/landscaper/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, clientRequestId, activeTab }),
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

        if (data.wasDuplicate) {
          console.info('Response was cached (duplicate request)');
        }

        return assistantMessage;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.messageId !== tempUserMessage.messageId));
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, activeTab, onFieldUpdate]
  );

  const clearChat = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/landscaper/chat`, {
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
  }, [projectId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    loadHistory,
  };
}
