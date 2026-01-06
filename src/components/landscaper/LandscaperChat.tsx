'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useLandscaper, ChatMessage } from '@/hooks/useLandscaper';
import { ChatMessageBubble } from './ChatMessageBubble';

interface LandscaperChatProps {
  projectId: number;
  activeTab?: string;
  isIngesting?: boolean;
  ingestionProgress?: number; // 0-100
  ingestionMessage?: string;
}

/**
 * Get context-aware hint for the current tab.
 */
function getTabContextHint(tab: string): string {
  const hints: Record<string, string> = {
    'home': 'Project Overview',
    'property': 'Property Details & Site',
    'operations': 'Rent Roll & Operating Expenses',
    'feasibility': 'Returns & Feasibility Analysis',
    'capitalization': 'Capital Structure & Financing',
    'reports': 'Reports & Analytics',
    'documents': 'Document Management',
  };
  return hints[tab] || 'General';
}

export function LandscaperChat({ projectId, activeTab = 'home', isIngesting, ingestionProgress = 0, ingestionMessage }: LandscaperChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userHasSentMessage = useRef(false);
  const prevMessageCount = useRef(0);
  const promptCopy = "Ask Landscaper anything about this project or drop a document and we'll get the model updated.";
  const tabContextHint = getTabContextHint(activeTab);

  const { messages, sendMessage, isLoading } = useLandscaper({
    projectId: projectId.toString(),
    activeTab,
  });

  // Auto-scroll only after user interaction
  useEffect(() => {
    if (userHasSentMessage.current && messages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    userHasSentMessage.current = true;

    const currentMessage = input.trim();
    setInput('');

    sendMessage(currentMessage).catch(() => {
      setInput(currentMessage);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header - matches CoreUI card header padding (0.5rem 1rem) */}
      <div
        className="flex items-center gap-2 border-b"
        style={{
          padding: '0.5rem 1rem',
          borderColor: 'var(--cui-border-color)',
          backgroundColor: 'var(--surface-card-header)',
        }}
      >
        <Image src="/landscaper-icon.png" alt="Landscaper icon" width={20} height={20} />
        <span className="font-semibold" style={{ color: 'var(--cui-body-color)', fontSize: '1rem' }}>
          Landscaper
        </span>

        {/* Context indicator - shows which tab Landscaper is focused on */}
        {!isIngesting && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded"
            style={{
              color: 'var(--cui-secondary-color)',
              backgroundColor: 'var(--cui-tertiary-bg)',
            }}
          >
            {tabContextHint}
          </span>
        )}

        {/* Ingestion Progress Gauge */}
        {isIngesting && (
          <div className="flex items-center gap-2 ml-auto">
            <div
              className="relative"
              style={{ width: '32px', height: '32px' }}
              title={ingestionMessage || 'Processing...'}
            >
              {/* Background circle */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="var(--cui-border-color)"
                  strokeWidth="3"
                />
                {/* Progress arc */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="var(--cui-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(ingestionProgress / 100) * 87.96} 87.96`}
                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                />
              </svg>
              {/* Percentage text in center */}
              <div
                className="absolute inset-0 flex items-center justify-center text-xs font-medium"
                style={{ color: 'var(--cui-body-color)' }}
              >
                {Math.round(ingestionProgress)}
              </div>
            </div>
            <span
              className="text-xs truncate max-w-[120px]"
              style={{ color: 'var(--cui-secondary-color)' }}
            >
              {ingestionMessage || 'Ingesting...'}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ backgroundColor: 'var(--cui-body-bg)' }}
      >
        {messages.length === 0 ? (
          <div className="py-8 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
            <p className="text-sm">{promptCopy}</p>
            <p className="text-xs mt-1">Budget, market analysis, assumptions, documents...</p>
          </div>
        ) : (
          messages.map((msg: ChatMessage) => (
            <ChatMessageBubble key={msg.messageId} message={msg} />
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            <div className="h-4 w-4 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--cui-primary)' }}></div>
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="border-t p-3"
        style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={promptCopy}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--cui-border-color)',
              backgroundColor: 'var(--cui-body-bg)',
              color: 'var(--cui-body-color)',
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--cui-primary)' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
