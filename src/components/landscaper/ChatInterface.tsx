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

interface ChatMessage {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  user_name?: string | null;
}

interface ChatInterfaceProps {
  projectId: number;
  messages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
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
      const response = await fetch(
        `http://localhost:8000/api/projects/${projectId}/landscaper/chat/`
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
      const response = await fetch(
        `http://localhost:8000/api/projects/${projectId}/landscaper/chat/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: inputValue.trim(),
            // user: null, // TODO: Add user ID when auth is implemented
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Add both user and assistant messages to the list
      const newMessages = [
        ...messages,
        data.user_message,
        data.assistant_message,
      ];
      onMessagesUpdate(newMessages);

      // Clear input
      setInputValue('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
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
                key={message.message_id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                userName={message.user_name}
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
