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
import { cilFile, cilSend, cilCommentSquare } from '@coreui/icons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources_used?: number;
}

interface DocumentChatModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: number;
  document: {
    doc_id: number;
    filename: string;
    version_number: number;
  };
}

export default function DocumentChatModal({
  visible,
  onClose,
  projectId,
  document,
}: DocumentChatModalProps) {
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
  }, [document.doc_id]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/dms/docs/${document.doc_id}/chat`,
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
          content: data.content || data.response,
          sources_used: data.metadata?.rag_chunks_used || data.sources_used,
        },
      ]);
    } catch (error) {
      console.error('Document chat error:', error);
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
    'What are the key terms?',
    'What did you extract from this?',
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
          <CIcon icon={cilFile} />
          <span className="text-truncate" style={{ maxWidth: '280px' }}>
            {document.filename}
          </span>
          <span className="badge bg-secondary ms-1">V{document.version_number}</span>
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
              <p className="mb-2">Ask Landscaper about this document.</p>
              <p className="small mb-3">Examples:</p>
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
                <p className="mb-0 white-space-pre-wrap">{msg.content}</p>
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
