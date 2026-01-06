'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLandscaper, ChatMessage } from '@/hooks/useLandscaper';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isLoading } = useLandscaper({
    projectId,
  });

  // Track if user has sent a message - only auto-scroll after user interaction
  const userHasSentMessage = useRef(false);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    // Only scroll if user has sent a message AND there are new messages
    if (userHasSentMessage.current && messages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    // Mark that user has interacted - now auto-scroll is allowed
    userHasSentMessage.current = true;

    // Optimistically add user message immediately
    const currentMessage = input.trim();
    setInput('');

    sendMessage(currentMessage).catch(() => {
      setInput(currentMessage);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-muted">
            <p className="text-sm">
              Ask {agentName} anything about this analysis.
            </p>
          </div>
        ) : (
          messages.map((msg: ChatMessage) => (
            <ChatMessageBubble key={msg.messageId} message={msg} />
          ))
        )}

        {isLoading && (
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
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
