'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, FileText, Loader2 } from 'lucide-react';
import type { ChatMessage } from './types';
import NewProjectDropZone from './NewProjectDropZone';
import { processLandscaperResponse } from '@/utils/formatLandscaperResponse';

interface NewProjectChatProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  onSendMessage: (message: string) => void;
  onDocumentDrop: (file: File) => void;
  isDark?: boolean;
  projectId: number | null;
}

const STARTER_PROMPTS = [
  "I'm evaluating a 100-unit apartment building in Phoenix",
  "I have an offering memorandum to analyze",
  "Help me set up a new multifamily acquisition",
  "I'm looking at a retail property in Scottsdale",
];

export default function NewProjectChat({
  messages,
  isProcessing,
  onSendMessage,
  onDocumentDrop,
  isDark = false,
  projectId: _projectId,
}: NewProjectChatProps) {
  const [input, setInput] = useState('');
  const [showDropZone, setShowDropZone] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hide drop zone after first message or document
  useEffect(() => {
    if (messages.length > 1) {
      setShowDropZone(false);
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isProcessing) return;
    onSendMessage(input.trim());
    setInput('');
  }, [input, isProcessing, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleFileDrop = useCallback((file: File) => {
    setShowDropZone(false);
    onDocumentDrop(file);
  }, [onDocumentDrop]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          // Initial empty state
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`text-5xl mb-4 ${isDark ? 'opacity-80' : ''}`}>
              🌿
            </div>
            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Welcome to Landscaper
            </h3>
            <p className={`text-sm mb-6 max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Tell me about your new project, or drag a document into this window for me to review.
            </p>

            {/* Document Drop Zone */}
            {showDropZone && (
              <div className="w-full max-w-md mb-6">
                <NewProjectDropZone
                  onFileDrop={handleFileDrop}
                  isDark={isDark}
                  isProcessing={isProcessing}
                />
              </div>
            )}

            {/* Starter Prompts */}
            <div className="w-full max-w-md space-y-2">
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Or start with:
              </p>
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleStarterClick(prompt)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Message history
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : isDark
                        ? 'bg-slate-800 border border-slate-700 text-slate-200'
                        : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                  }`}
                >
                  {/* Message content - sanitized for assistant messages */}
                  <div className="whitespace-pre-wrap">
                    {message.role === 'user'
                      ? message.content
                      : processLandscaperResponse(message.content)
                    }
                  </div>

                  {/* Metadata badges */}
                  {message.metadata?.fieldsExtracted && message.metadata.fieldsExtracted.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200/20">
                      <span className={`text-xs ${message.role === 'user' ? 'text-blue-200' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Extracted {message.metadata.fieldsExtracted.length} fields
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Landscaper is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className={`border-t p-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Landscaper..."
              disabled={isProcessing}
              rows={1}
              className={`w-full resize-none rounded-lg border px-4 py-3 pr-12 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500'
                  : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 transition ${
                input.trim() && !isProcessing
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : isDark
                    ? 'bg-slate-700 text-slate-500'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className={`mt-2 flex items-center justify-between text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <span>Press Enter to send</span>
          <button
            onClick={() => setShowDropZone(!showDropZone)}
            className={`flex items-center gap-1 transition hover:text-blue-500 ${
              showDropZone ? 'text-blue-500' : ''
            }`}
          >
            <FileText className="h-3 w-3" />
            Upload document
          </button>
        </div>

        {/* Inline drop zone toggle */}
        {showDropZone && messages.length > 0 && (
          <div className="mt-3">
            <NewProjectDropZone
              onFileDrop={handleFileDrop}
              isDark={isDark}
              isProcessing={isProcessing}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}
