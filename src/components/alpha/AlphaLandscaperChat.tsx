'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CButton, CFormInput, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSend } from '@coreui/icons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AlphaLandscaperChatProps {
  projectId: number;
  pageContext: string;
}

export function AlphaLandscaperChat({ projectId, pageContext }: AlphaLandscaperChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm here to help you with this page. What questions do you have?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/landscaper/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          page_context: 'alpha_assistant',
          source_page: pageContext,
        }),
      });

      const data = await response.json();
      const assistantText =
        data?.content || data?.message || data?.response || data?.text || 'I saved that for you.';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantText },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="alpha-chat d-flex flex-column h-100">
      <h6 className="mb-2">💬 Ask Landscaper</h6>
      <div
        className="chat-messages flex-grow-1 overflow-auto mb-2"
        style={{ maxHeight: '300px' }}
      >
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={`chat-message mb-2 p-2 rounded ${
              msg.role === 'user' ? 'bg-primary text-white ms-4' : 'bg-light'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="chat-message mb-2 p-2 rounded bg-light">
            <CSpinner size="sm" className="me-2" /> Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input d-flex gap-2">
        <CFormInput
          placeholder="Ask about this page..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <CButton color="primary" onClick={sendMessage} disabled={!input.trim() || loading}>
          <CIcon icon={cilSend} />
        </CButton>
      </div>
    </div>
  );
}
