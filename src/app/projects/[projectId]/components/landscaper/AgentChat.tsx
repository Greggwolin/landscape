'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useSendMessage,
  useLandscaperChat,
  ChatMessage,
} from '@/hooks/useLandscaper';
import { ChatMessageBubble } from '@/components/landscaper/ChatMessageBubble';

interface AgentChatProps {
  projectId: string;
  agentId: string;
  agentName: string;
  placeholder?: string;
}

export function AgentChat({
  projectId,
  agentId,
  agentName,
  placeholder,
}: AgentChatProps) {
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatHistory } = useLandscaperChat(projectId);
  const { mutate: sendMessage, isPending } = useSendMessage(projectId);

  // Sync server messages to local state
  useEffect(() => {
    if (chatHistory?.messages) {
      const formatted: ChatMessage[] = chatHistory.messages.map((msg, idx) => ({
        id: `msg_${idx}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date().toISOString(),
      }));
      setLocalMessages(formatted);
    }
  }, [chatHistory]);

  // Track if user has sent a message - only auto-scroll after user interaction
  const userHasSentMessage = useRef(false);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    // Only scroll if user has sent a message AND there are new messages
    if (userHasSentMessage.current && localMessages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevMessageCount.current = localMessages.length;
  }, [localMessages]);

  const handleSend = () => {
    if (!input.trim() || isPending) return;

    // Mark that user has interacted - now auto-scroll is allowed
    userHasSentMessage.current = true;

    // Optimistically add user message immediately
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setInput('');

    sendMessage(input.trim(), {
      onSuccess: (response) => {
        const assistantMessage: ChatMessage = {
          id: response.messageId,
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
          metadata: {
            ...response.metadata,
            context: response.context,
          },
          // Pass through structured data for table rendering
          structuredData: response.structuredData || undefined,
          dataType: response.dataType || undefined,
          dataTitle: response.dataTitle || undefined,
          columns: response.columns || undefined,
        };
        setLocalMessages((prev) => [...prev, assistantMessage]);
      },
      onError: () => {
        // Remove optimistic user message on failure
        setLocalMessages((prev) => prev.slice(0, -1));
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {localMessages.length === 0 ? (
          <div className="py-8 text-center text-muted">
            <p className="text-sm">
              Ask {agentName} anything about this analysis.
            </p>
          </div>
        ) : (
          localMessages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))
        )}

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={placeholder || 'Ask a question...'}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            disabled={isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
