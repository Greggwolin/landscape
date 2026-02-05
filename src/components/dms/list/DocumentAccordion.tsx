'use client';

import React, { useState, useRef, useEffect } from 'react';
import CIcon from '@coreui/icons-react';
import { cilSend, cilLightbulb, cilBook, cilCog, cilList } from '@coreui/icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DocumentAccordionProps {
  docName: string;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onQuickAction: (action: 'summarize' | 'key_points' | 'extract_data' | 'qa_prep') => void;
  isLoading?: boolean;
  colSpan?: number;
}

export default function DocumentAccordion({
  docName,
  chatHistory,
  onSendMessage,
  onQuickAction,
  isLoading = false,
  colSpan = 12
}: DocumentAccordionProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Focus input when accordion opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const message = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    try {
      await onSendMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickAction = (action: 'summarize' | 'key_points' | 'extract_data' | 'qa_prep') => {
    if (isSending) return;
    onQuickAction(action);
  };

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div style={{
          backgroundColor: 'var(--cui-tertiary-bg, #f8f9fa)',
          borderTop: '1px solid var(--cui-border-color)',
          borderBottom: '1px solid var(--cui-border-color)'
        }}>
          {/* Accordion content - fixed height */}
          <div className="flex h-[380px]">
            {/* Left panel - Quick actions */}
            <div style={{
              width: '180px',
              flexShrink: 0,
              borderRight: '1px solid var(--cui-border-color)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--cui-secondary-color)',
                marginBottom: '4px'
              }}>
                Quick Actions
              </div>

              <button
                type="button"
                onClick={() => handleQuickAction('summarize')}
                disabled={isSending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  textAlign: 'left',
                  color: 'var(--cui-body-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '6px',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.5 : 1
                }}
              >
                <CIcon icon={cilLightbulb} className="w-4 h-4" style={{ color: '#f59e0b' }} />
                <span>Summarize</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('key_points')}
                disabled={isSending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  textAlign: 'left',
                  color: 'var(--cui-body-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '6px',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.5 : 1
                }}
              >
                <CIcon icon={cilList} className="w-4 h-4" style={{ color: '#10b981' }} />
                <span>Key points</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('extract_data')}
                disabled={isSending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  textAlign: 'left',
                  color: 'var(--cui-body-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '6px',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.5 : 1
                }}
              >
                <CIcon icon={cilBook} className="w-4 h-4" style={{ color: '#3b82f6' }} />
                <span>Extract data</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('qa_prep')}
                disabled={isSending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  textAlign: 'left',
                  color: 'var(--cui-body-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '6px',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.5 : 1
                }}
              >
                <CIcon icon={cilCog} className="w-4 h-4" style={{ color: '#a855f7' }} />
                <span>Q&A prep</span>
              </button>

              <div style={{
                marginTop: 'auto',
                paddingTop: '12px',
                borderTop: '1px solid var(--cui-border-color)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--cui-tertiary-color)' }}>
                  Chatting with:
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--cui-secondary-color)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={docName}
                >
                  {docName}
                </div>
              </div>
            </div>

            {/* Right panel - Chat area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* Messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {chatHistory.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--cui-secondary-color)'
                  }}>
                    <span style={{ fontSize: '30px', marginBottom: '8px' }}>💬</span>
                    <p style={{ fontSize: '14px' }}>Ask Landscaper about this document</p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>or use a quick action to get started</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '80%',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            backgroundColor: msg.role === 'user' ? '#2563eb' : 'var(--cui-body-bg)',
                            color: msg.role === 'user' ? '#fff' : 'var(--cui-body-color)',
                            border: msg.role === 'user' ? 'none' : '1px solid var(--cui-border-color)'
                          }}
                        >
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                          <div
                            style={{
                              fontSize: '11px',
                              marginTop: '4px',
                              color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--cui-secondary-color)'
                            }}
                          >
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading indicator */}
                {(isSending || isLoading) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px' }}>
                    <div style={{
                      backgroundColor: 'var(--cui-body-bg)',
                      border: '1px solid var(--cui-border-color)',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--cui-secondary-color)' }}>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div style={{ borderTop: '1px solid var(--cui-border-color)', padding: '12px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about this document..."
                    disabled={isSending}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid var(--cui-border-color)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--cui-body-bg)',
                      color: 'var(--cui-body-color)',
                      outline: 'none',
                      opacity: isSending ? 0.5 : 1
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isSending}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      borderRadius: '6px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: (!inputValue.trim() || isSending) ? 'not-allowed' : 'pointer',
                      opacity: (!inputValue.trim() || isSending) ? 0.5 : 1
                    }}
                  >
                    <CIcon icon={cilSend} className="w-4 h-4" />
                    <span style={{ fontSize: '14px' }}>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
