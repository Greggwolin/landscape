'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CCloseButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLifeRing, cilTrash, cilArrowRight } from '@coreui/icons';
import { useHelpLandscaper, HelpMessage } from '@/contexts/HelpLandscaperContext';
import './help-landscaper-panel.css';

/* ------------------------------------------------------------------ */
/* Message Bubble                                                      */
/* ------------------------------------------------------------------ */

function MessageBubble({ message }: { message: HelpMessage }) {
  return (
    <div className={`help-message-row help-message-row--${message.role}`}>
      <div className={`help-message help-message--${message.role}`}>
        {message.content}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading Indicator                                                   */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="help-message-row help-message-row--assistant">
      <div className="help-message help-message--assistant help-typing">
        <span className="help-typing-dot" />
        <span className="help-typing-dot" />
        <span className="help-typing-dot" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export default function HelpLandscaperPanel() {
  const {
    isOpen,
    messages,
    isLoading,
    closeHelp,
    sendMessage,
    clearConversation,
  } = useHelpLandscaper();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the transition finish
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeHelp();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeHelp]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const text = inputValue;
    setInputValue('');
    await sendMessage(text);
  }, [inputValue, isLoading, sendMessage]);

  return (
    <div className={`help-panel ${isOpen ? 'help-panel--open' : ''}`}>
      {/* Header */}
      <div className="help-panel-header">
        <div className="help-panel-header-title">
          <CIcon icon={cilLifeRing} size="sm" />
          <span className="help-panel-header-text">Help</span>
        </div>
        <div className="help-panel-header-actions">
          {messages.length > 0 && (
            <button
              type="button"
              className="help-panel-action-btn"
              onClick={clearConversation}
              title="Clear conversation"
            >
              <CIcon icon={cilTrash} size="sm" />
            </button>
          )}
          <CCloseButton onClick={closeHelp} />
        </div>
      </div>

      {/* Messages */}
      <div className="help-panel-messages">
        {messages.length === 0 && !isLoading && (
          <div className="help-panel-empty">
            <CIcon icon={cilLifeRing} className="help-panel-empty-icon" />
            <p className="help-panel-empty-title">Landscape Help</p>
            <p className="help-panel-empty-subtitle">
              Ask me anything about how to use the platform — navigation, features, calculations, or how things compare to ARGUS.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="help-panel-input-area" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="help-panel-input"
          placeholder="Ask about Landscape..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="help-panel-send-btn"
          disabled={!inputValue.trim() || isLoading}
          title="Send"
        >
          <CIcon icon={cilArrowRight} size="sm" />
        </button>
      </form>
    </div>
  );
}
