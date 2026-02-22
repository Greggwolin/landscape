'use client';

import React, { useMemo } from 'react';
import { ThreadMessage } from '@/hooks/useLandscaperThreads';
import { MutationProposalCard, MutationProposal } from './MutationProposalCard';
import MediaSummaryCard from './MediaSummaryCard';
import { processLandscaperResponse } from '@/utils/formatLandscaperResponse';

interface ChatMessageBubbleProps {
  message: ThreadMessage;
  onConfirmMutation?: (mutationId: string) => Promise<void>;
  onRejectMutation?: (mutationId: string) => Promise<void>;
  onConfirmBatch?: (batchId: string) => Promise<void>;
  onReviewMedia?: (docId: number, docName: string) => void;
}

export function ChatMessageBubble({
  message,
  onConfirmMutation,
  onRejectMutation,
  onConfirmBatch,
  onReviewMedia,
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
    <div
      className={`d-flex flex-column ${isUser ? 'align-items-end' : 'align-items-start'}`}
    >
      {/* Main message bubble */}
      <div
        className="rounded px-3 py-2"
        style={{
          maxWidth: isUser ? '80%' : '100%',
          backgroundColor: isUser ? 'var(--cui-primary)' : 'var(--cui-tertiary-bg)',
          color: isUser ? 'var(--cui-primary-text)' : 'var(--cui-body-color)',
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</div>

        {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
          <div className="mt-3 border-top pt-2" style={{ borderColor: 'var(--cui-border-color)' }}>
            <div className="small" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
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
          <div className="mt-2 small" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
            Contains recommendations
          </div>
        )}

        {!isUser && message.metadata?.error && (
          <div className="mt-2 small" style={{ color: 'var(--cui-danger)', fontSize: '0.75rem' }}>
            Error: {message.metadata.error}
          </div>
        )}

        {!isUser && message.metadata?.traceback && (
          <details className="mt-2 small" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
            <summary>Traceback</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{message.metadata.traceback}</pre>
          </details>
        )}
      </div>

      {/* Mutation proposals card (below assistant message) */}
      {!isUser && hasProposals && onConfirmMutation && onRejectMutation && (
        <div className="mt-2 w-100" style={{ maxWidth: '90%' }}>
          <MutationProposalCard
            proposals={proposals}
            onConfirm={onConfirmMutation}
            onReject={onRejectMutation}
            onConfirmAll={onConfirmBatch}
          />
        </div>
      )}

      {/* Media summary card (below assistant message when media detected) */}
      {!isUser && message.metadata?.media_summary && onReviewMedia && (
        <div className="mt-2" style={{ maxWidth: '90%' }}>
          <MediaSummaryCard
            summary={message.metadata.media_summary}
            onReview={onReviewMedia}
          />
        </div>
      )}
    </div>
  );
}

export default ChatMessageBubble;
