'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  COffcanvas,
  COffcanvasHeader,
  COffcanvasTitle,
  COffcanvasBody,
  CCloseButton,
  CButton,
  CFormInput,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBook, cilSend, cilCommentSquare } from '@coreui/icons';
import type { PlatformKnowledgeDocument } from '@/types/dms';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources_used?: number;
}

interface PlatformKnowledgeChatModalProps {
  visible: boolean;
  onClose: () => void;
  document: PlatformKnowledgeDocument;
}

const formatChatResponse = (content: string) => {
  let text = content || '';
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\s*#{2,6}\s*/g, '\n');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/\s*-\s+/g, '\n  ');
  text = text.replace(/\s*\*\s+/g, '\n  ');
  text = text.replace(/(^|\s)\*(\S)/g, '$1$2');
  text = text.replace(/(\S)\*(\s|$)/g, '$1$2');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
};

export default function PlatformKnowledgeChatModal({
  visible,
  onClose,
  document,
}: PlatformKnowledgeChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset messages when document changes
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [document.document_key]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/platform-knowledge/${document.document_key}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: formatChatResponse(data.content || ''),
          sources_used: data.chunks_used,
        },
      ]);
    } catch (error) {
      console.error('Platform knowledge chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    'Summarize this document',
    'What are the key concepts?',
    'What methodologies are described?',
  ];

  return (
    <COffcanvas
      placement="end"
      visible={visible}
      onHide={onClose}
      style={{ width: '450px' }}
    >
      <COffcanvasHeader className="border-bottom">
        <COffcanvasTitle className="d-flex align-items-center gap-2">
          <CIcon icon={cilBook} />
          <span className="text-truncate" style={{ maxWidth: '280px' }}>
            {document.title}
          </span>
          {document.publication_year && (
            <span className="badge bg-secondary ms-1">{document.publication_year}</span>
          )}
        </COffcanvasTitle>
        <CCloseButton className="text-reset" onClick={onClose} />
      </COffcanvasHeader>

      <COffcanvasBody className="d-flex flex-column p-0">
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-grow-1 overflow-auto p-3"
          style={{ minHeight: 0 }}
        >
          {messages.length === 0 && (
            <div className="text-center text-muted py-5">
              <CIcon icon={cilCommentSquare} size="3xl" className="mb-3 opacity-50" />
              <p className="mb-2">Ask Landscaper about this platform knowledge document.</p>
              <p className="small text-muted mb-3">
                {document.publisher && `Source: ${document.publisher}`}
                {document.knowledge_domain && ` | Domain: ${document.knowledge_domain}`}
              </p>
              <div className="d-flex flex-column gap-2">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setInput(question);
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`d-flex mb-3 ${
                msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'
              }`}
            >
              <div
                className={`rounded-3 px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-light border'
                }`}
                style={{ maxWidth: '85%' }}
              >
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </p>
                {msg.sources_used !== undefined && msg.sources_used > 0 && (
                  <p className="mb-0 mt-1 small opacity-75">
                    Based on {msg.sources_used} passage
                    {msg.sources_used !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="d-flex justify-content-start mb-3">
              <div className="bg-light border rounded-3 px-3 py-2">
                <CSpinner size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-top p-3">
          <div className="d-flex gap-2">
            <CFormInput
              placeholder="Ask about this document..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <CButton
              color="primary"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
            >
              <CIcon icon={cilSend} />
            </CButton>
          </div>
        </div>
      </COffcanvasBody>
    </COffcanvas>
  );
}
