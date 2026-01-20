/**
 * ChatInterface Component
 *
 * Main chat interface for Landscaper AI.
 * Displays message history and provides input for new messages.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CButton, CFormTextarea, CSpinner } from '@coreui/react';
import ChatMessageBubble from './ChatMessageBubble';
import { LandscaperProgress } from './LandscaperProgress';
import { ChatMessage } from '@/hooks/useLandscaper';
import { emitMutationComplete } from '@/lib/events/landscaper-events';

// Map tool names to the tables they affect (same as useLandscaper.ts)
const TOOL_TABLE_MAP: Record<string, string[]> = {
  update_units: ['units', 'leases', 'unit_types'],
  update_leases: ['leases'],
  update_unit_types: ['unit_types'],
  update_operating_expenses: ['operating_expenses'],
  update_rental_comps: ['rental_comps'],
  update_sales_comps: ['sales_comps'],
  update_project_field: ['project'],
  bulk_update_fields: ['project'],
};

interface ChatInterfaceProps {
  projectId: number;
  messages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
}

const REQUEST_TIMEOUT_MS = 90000;

/**
 * Emit mutation events for successful tool executions.
 * This triggers auto-refresh in components like RentRollGrid.
 *
 * The backend sends:
 * - tool_calls: Array of {tool, input} for executed tools
 * - field_updates: Array of updates with {tool, type, success, created, updated, total}
 */
function emitMutationEventsIfNeeded(
  projectId: number,
  metadata: ChatMessage['metadata']
): void {
  // Check both tool_executions (legacy) and field_updates (from backend)
  const fieldUpdates = metadata?.field_updates as Array<{
    tool?: string;
    type?: string;
    success?: boolean;
    created?: number;
    updated?: number;
    total?: number;
  }> | undefined;

  const toolCalls = metadata?.tool_calls as Array<{
    tool: string;
    input: unknown;
  }> | undefined;

  // Also check legacy tool_executions format
  const toolExecutions = metadata?.tool_executions as Array<{
    tool: string;
    success: boolean;
    is_proposal?: boolean;
    result?: {
      success?: boolean;
      created?: number;
      updated?: number;
      total?: number;
    };
  }> | undefined;

  const affectedTables = new Set<string>();
  let totalCreated = 0;
  let totalUpdated = 0;
  const mutationTools: string[] = [];

  // Process field_updates from backend (new format)
  if (fieldUpdates && fieldUpdates.length > 0) {
    for (const update of fieldUpdates) {
      const toolName = update.tool || '';
      const updateType = update.type || '';

      // Map update types to tables
      if (updateType === 'units' || toolName === 'update_units') {
        ['units', 'leases', 'unit_types'].forEach(t => affectedTables.add(t));
        mutationTools.push('update_units');
      } else if (updateType === 'operating_expenses' || toolName === 'update_operating_expenses') {
        affectedTables.add('operating_expenses');
        mutationTools.push('update_operating_expenses');
      } else if (toolName && TOOL_TABLE_MAP[toolName]) {
        TOOL_TABLE_MAP[toolName].forEach(t => affectedTables.add(t));
        mutationTools.push(toolName);
      }

      totalCreated += update.created || 0;
      totalUpdated += update.updated || 0;
    }
  }

  // Process tool_calls from backend (check if any data-modifying tools were called)
  if (toolCalls && toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (TOOL_TABLE_MAP[call.tool]) {
        TOOL_TABLE_MAP[call.tool].forEach(t => affectedTables.add(t));
        if (!mutationTools.includes(call.tool)) {
          mutationTools.push(call.tool);
        }
      }
    }
  }

  // Process legacy tool_executions format (for backwards compatibility)
  if (toolExecutions && toolExecutions.length > 0) {
    const executedMutations = toolExecutions.filter(
      (t) =>
        t.success &&
        !t.is_proposal &&
        t.result?.success &&
        TOOL_TABLE_MAP[t.tool]
    );

    for (const mutation of executedMutations) {
      const tables = TOOL_TABLE_MAP[mutation.tool] || [];
      tables.forEach((t) => affectedTables.add(t));
      totalCreated += mutation.result?.created || 0;
      totalUpdated += mutation.result?.updated || 0;
      if (!mutationTools.includes(mutation.tool)) {
        mutationTools.push(mutation.tool);
      }
    }
  }

  // Only emit if we found affected tables
  if (affectedTables.size === 0) return;

  // Emit a single event for all mutations
  console.log('[ChatInterface] Emitting mutation event for tables:', Array.from(affectedTables));
  emitMutationComplete({
    projectId,
    mutationType: mutationTools.join(','),
    tables: Array.from(affectedTables),
    counts: {
      created: totalCreated,
      updated: totalUpdated,
      total: totalCreated + totalUpdated,
    },
  });
}

export default function ChatInterface({
  projectId,
  messages,
  onMessagesUpdate,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load message history on mount
  useEffect(() => {
    loadMessages();
  }, [projectId]);

  const loadMessages = async () => {
    try {
      const response = await fetchWithTimeout(
        `/api/projects/${projectId}/landscaper/chat`
      );

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      onMessagesUpdate(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load chat history');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const clientRequestId = crypto.randomUUID();
      const response = await fetchWithTimeout(
        `/api/projects/${projectId}/landscaper/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputValue.trim(),
            clientRequestId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const userMessage: ChatMessage = {
        messageId: `temp-${Date.now()}`,
        role: 'user',
        content: inputValue.trim(),
        createdAt: new Date().toISOString(),
      };

      const assistantMessage: ChatMessage = {
        messageId: data.messageId,
        role: 'assistant',
        content: data.content,
        metadata: data.metadata,
        createdAt: data.createdAt,
      };

      const newMessages = [
        ...messages,
        userMessage,
        assistantMessage,
      ];
      onMessagesUpdate(newMessages);

      // Emit mutation events if any tools executed successfully
      // This triggers auto-refresh in listening components (RentRollGrid, etc.)
      emitMutationEventsIfNeeded(projectId, data.metadata);

      // Clear input
      setInputValue('');
    } catch (err) {
      console.error('Error sending message:', err);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to send message. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Messages area */}
      <div
        className="flex-grow-1 overflow-auto p-3"
        style={{
          minHeight: 0,
          backgroundColor: 'var(--cui-tertiary-bg)',
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>Start a conversation with Landscaper AI</p>
            <p className="small">
              Ask about budgets, market analysis, or project assumptions
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.messageId}
                message={message}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-danger m-3 mb-0" role="alert">
          {error}
        </div>
      )}

      {/* Progress indicator - shows during processing */}
      <LandscaperProgress isProcessing={isLoading} />

      {/* Input area */}
      <div className="border-top p-3">
        <div className="d-flex gap-2">
          <CFormTextarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            rows={2}
            disabled={isLoading}
            style={{
              resize: 'none',
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
            }}
          />
          <CButton
            color="primary"
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            style={{ minWidth: '80px' }}
          >
            {isLoading ? (
              <CSpinner size="sm" />
            ) : (
              'Send'
            )}
          </CButton>
        </div>
        <div className="text-muted small mt-2">
          Phase 6: AI responses are placeholders. Real integration coming soon.
        </div>
      </div>
    </div>
  );
}
