'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useSendMessage,
  useLandscaperChat,
  ChatMessage,
} from '@/hooks/useLandscaper';
import { ChatMessageBubble } from './ChatMessageBubble';

interface LandscaperChatProps {
  projectId: number;
}

export function LandscaperChat({ projectId }: LandscaperChatProps) {
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userHasSentMessage = useRef(false);
  const prevMessageCount = useRef(0);

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

  // Auto-scroll only after user interaction
  useEffect(() => {
    if (userHasSentMessage.current && localMessages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevMessageCount.current = localMessages.length;
  }, [localMessages]);

  const handleSend = () => {
    if (!input.trim() || isPending) return;

    userHasSentMessage.current = true;

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
          structuredData: response.structuredData || undefined,
          dataType: response.dataType || undefined,
          dataTitle: response.dataTitle || undefined,
          columns: response.columns || undefined,
        };
        setLocalMessages((prev) => [...prev, assistantMessage]);
      },
      onError: () => {
        setLocalMessages((prev) => prev.slice(0, -1));
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{
          borderColor: 'var(--cui-border-color)',
          backgroundColor: 'var(--cui-tertiary-bg)',
        }}
      >
        <span className="text-lg">🌿</span>
        <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Landscaper
        </span>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ backgroundColor: 'var(--cui-body-bg)' }}
      >
        {localMessages.length === 0 ? (
          <div className="py-8 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
            <p className="text-sm">Ask Landscaper anything about this project.</p>
            <p className="text-xs mt-1">Budget, market analysis, assumptions, documents...</p>
          </div>
        ) : (
          localMessages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))
        )}

        {isPending && (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            <div className="h-4 w-4 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--cui-primary)' }}></div>
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="border-t p-3"
        style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--cui-border-color)',
              backgroundColor: 'var(--cui-body-bg)',
              color: 'var(--cui-body-color)',
            }}
            disabled={isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--cui-primary)' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
