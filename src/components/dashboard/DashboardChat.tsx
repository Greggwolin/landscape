'use client';

import React, { useState } from 'react';

interface DashboardChatProps {
  onSend?: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

/**
 * Compact chat bar for dashboard-level Landscaper interactions.
 * Sticky at bottom of screen.
 */
export function DashboardChat({
  onSend,
  isLoading = false,
  placeholder = 'Ask Landscaper about your portfolio...',
}: DashboardChatProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSend?.(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickPrompts = [
    'Which projects need attention?',
    'Show portfolio summary',
    'Compare project completeness',
  ];

  return (
    <div className="border-t border-border bg-surface-card px-3 py-2">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Landscaper Avatar */}
          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            L
          </div>

          {/* Input field */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                Thinking...
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>

        {/* Quick prompts */}
        {!input && (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 pl-1">
            <span className="text-xs text-muted whitespace-nowrap">Try:</span>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInput(prompt)}
                className="flex-shrink-0 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

export default DashboardChat;
