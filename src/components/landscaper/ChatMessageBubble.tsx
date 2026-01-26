'use client';

import React, { useMemo } from 'react';
import { ChatMessage } from '@/hooks/useLandscaper';
import { MutationProposalCard, MutationProposal } from './MutationProposalCard';
import { processLandscaperResponse } from '@/utils/formatLandscaperResponse';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onConfirmMutation?: (mutationId: string) => Promise<void>;
  onRejectMutation?: (mutationId: string) => Promise<void>;
  onConfirmBatch?: (batchId: string) => Promise<void>;
}

export function ChatMessageBubble({
  message,
  onConfirmMutation,
  onRejectMutation,
  onConfirmBatch,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  // Check for mutation proposals in metadata
  const proposals: MutationProposal[] = message.metadata?.mutation_proposals ||
    message.metadata?.mutationProposals ||
    [];
  const hasProposals = proposals.length > 0;

  // Process assistant responses to remove markdown and thinking narration
  const displayContent = useMemo(() => {
    if (isUser) return message.content;
    return processLandscaperResponse(message.content);
  }, [message.content, isUser]);

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Main message bubble */}
      <div
        className={`rounded-2xl px-4 py-3 ${isUser ? 'max-w-[80%]' : 'max-w-full'}`}
        style={{
          backgroundColor: isUser ? 'var(--cui-primary)' : 'var(--cui-tertiary-bg)',
          color: isUser ? 'white' : 'var(--cui-body-color)',
        }}
      >
        <div className="whitespace-pre-wrap">{displayContent}</div>

        {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
          <div className="mt-3 border-t pt-2" style={{ borderColor: 'var(--cui-border-color)' }}>
            <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
              Sources:{' '}
              {message.metadata.sources
                .slice(0, 3)
                .map((source) => source.filename)
                .join(', ')}
              {message.metadata.sources.length > 3 &&
                ` +${message.metadata.sources.length - 3} more`}
            </div>
          </div>
        )}

        {!isUser && message.metadata?.fieldUpdates && !hasProposals && (
          <div className="mt-2 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            Contains recommendations
          </div>
        )}

        {!isUser && message.metadata?.error && (
          <div className="mt-2 text-xs" style={{ color: '#b91c1c' }}>
            Error: {message.metadata.error}
          </div>
        )}

        {!isUser && message.metadata?.traceback && (
          <details className="mt-2 text-xs" style={{ color: '#6b7280' }}>
            <summary>Traceback</summary>
            <pre className="whitespace-pre-wrap">{message.metadata.traceback}</pre>
          </details>
        )}
      </div>

      {/* Mutation proposals card (below assistant message) */}
      {!isUser && hasProposals && onConfirmMutation && onRejectMutation && (
        <div className="mt-2 w-full max-w-[90%]">
          <MutationProposalCard
            proposals={proposals}
            onConfirm={onConfirmMutation}
            onReject={onRejectMutation}
            onConfirmAll={onConfirmBatch}
          />
        </div>
      )}
    </div>
  );
}

export default ChatMessageBubble;
