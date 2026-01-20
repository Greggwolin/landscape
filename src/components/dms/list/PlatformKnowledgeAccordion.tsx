'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import CIcon from '@coreui/icons-react';
import { cilSend, cilLightbulb, cilBook, cilCog, cilList } from '@coreui/icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PlatformKnowledgeAccordionProps {
  documentKey: string;
  documentTitle: string;
  pageCount?: number | null;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onQuickAction: (action: 'summarize' | 'topics' | 'key_concepts' | 'methodologies') => void;
  isLoading?: boolean;
}

export default function PlatformKnowledgeAccordion({
  documentKey,
  documentTitle,
  pageCount,
  chatHistory,
  onSendMessage,
  onQuickAction,
  isLoading = false
}: PlatformKnowledgeAccordionProps) {
  const canSummarize = useMemo(() => {
    const threshold = 50;
    const safeCount = pageCount ?? 0;
    return safeCount > 0 && safeCount <= threshold;
  }, [pageCount]);
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

  const handleQuickAction = (action: 'summarize' | 'topics' | 'key_concepts' | 'methodologies') => {
    if (isSending) return;
    onQuickAction(action);
  };

  return (
    <tr>
      <td colSpan={8} className="p-0">
        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-b border-gray-200 dark:border-gray-700">
          {/* Accordion content - fixed height */}
          <div className="flex h-[380px]">
            {/* Left panel - Quick actions */}
            <div className="w-[180px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Quick Actions
              </div>

              {canSummarize ? (
                <button
                  type="button"
                  onClick={() => handleQuickAction('summarize')}
                  disabled={isSending}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CIcon icon={cilLightbulb} className="w-4 h-4 text-amber-500" />
                  <span>Summarize</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleQuickAction('topics')}
                  disabled={isSending}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CIcon icon={cilList} className="w-4 h-4 text-emerald-500" />
                  <span>What topics?</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleQuickAction('key_concepts')}
                disabled={isSending}
                className="flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CIcon icon={cilBook} className="w-4 h-4 text-blue-500" />
                <span>Key concepts</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('methodologies')}
                disabled={isSending}
                className="flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CIcon icon={cilCog} className="w-4 h-4 text-purple-500" />
                <span>Methodologies</span>
              </button>

              <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Chatting with:
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate" title={documentTitle}>
                  {documentTitle}
                </div>
              </div>
            </div>

            {/* Right panel - Chat area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <span className="text-3xl mb-2">💬</span>
                    <p className="text-sm">Ask a question about this document</p>
                    <p className="text-xs mt-1">or use a quick action to get started</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            msg.role === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Loading indicator */}
                {(isSending || isLoading) && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about this document..."
                    disabled={isSending}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isSending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <CIcon icon={cilSend} className="w-4 h-4" />
                    <span className="text-sm">Send</span>
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
