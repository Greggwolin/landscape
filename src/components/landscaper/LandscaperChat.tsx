'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronTop } from '@coreui/icons';
import { useLandscaper, ChatMessage } from '@/hooks/useLandscaper';
import { ChatMessageBubble } from './ChatMessageBubble';
import { LandscaperProgress } from './LandscaperProgress';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface LandscaperChatProps {
  projectId: number;
  activeTab?: string;
  isIngesting?: boolean;
  ingestionProgress?: number; // 0-100
  ingestionMessage?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
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

export function LandscaperChat({ projectId, activeTab = 'home', isIngesting, ingestionProgress = 0, ingestionMessage, isExpanded = true, onToggleExpand }: LandscaperChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userHasSentMessage = useRef(false);
  const prevMessageCount = useRef(0);
  const promptCopy = "Ask Landscaper anything about this project or drop a document and we'll get the model updated.";
  const tabContextHint = getTabContextHint(activeTab);

  const { messages, sendMessage, isLoading, loadHistory, error } = useLandscaper({
    projectId: projectId.toString(),
    activeTab,
  });

  // Mutation handlers for Level 2 autonomy
  const handleConfirmMutation = useCallback(async (mutationId: string) => {
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/landscaper/mutations/${mutationId}/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        // Refresh chat history to reflect updated state
        loadHistory?.();
      } else {
        console.error('Failed to confirm mutation:', data.error);
      }
    } catch (error) {
      console.error('Error confirming mutation:', error);
    }
  }, [loadHistory]);

  const handleRejectMutation = useCallback(async (mutationId: string) => {
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/landscaper/mutations/${mutationId}/reject/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        loadHistory?.();
      }
    } catch (error) {
      console.error('Error rejecting mutation:', error);
    }
  }, [loadHistory]);

  const handleConfirmBatch = useCallback(async (batchId: string) => {
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/landscaper/mutations/batch/${batchId}/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        loadHistory?.();
      } else {
        console.error('Failed to confirm batch:', data.error);
      }
    } catch (error) {
      console.error('Error confirming batch:', error);
    }
  }, [loadHistory]);

  // Auto-scroll only after user interaction
  useEffect(() => {
    if (userHasSentMessage.current && messages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight || '20', 10);
    const maxHeight = lineHeight * 8;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

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

        {/* Collapse/Expand toggle */}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isExpanded ? 'Collapse chat' : 'Expand chat'}
          >
            <CIcon
              icon={isExpanded ? cilChevronTop : cilChevronBottom}
              size="sm"
              style={{ color: 'var(--cui-secondary-color)' }}
            />
          </button>
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
            <ChatMessageBubble
              key={msg.messageId}
              message={msg}
              onConfirmMutation={handleConfirmMutation}
              onRejectMutation={handleRejectMutation}
              onConfirmBatch={handleConfirmBatch}
            />
          ))
        )}

        {error && !isLoading && (
          <div className="rounded-md border px-3 py-2 text-sm" style={{
            borderColor: 'var(--cui-danger-border-subtle)',
            color: 'var(--cui-danger)',
            backgroundColor: 'var(--cui-danger-bg-subtle)',
          }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Progress indicator - shows during processing */}
      <LandscaperProgress isProcessing={isLoading} />

      {/* Input */}
      <div
        className="border-t p-3"
        style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}
      >
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={promptCopy}
            rows={1}
            className="flex-1 rounded-lg border px-3 py-2 text-sm resize-none"
            style={{
              borderColor: 'var(--cui-border-color)',
              backgroundColor: 'var(--cui-body-bg)',
              color: 'var(--cui-body-color)',
              maxHeight: '200px',
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
