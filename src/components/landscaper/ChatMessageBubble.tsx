'use client';

import React, { useMemo } from 'react';
import { ThreadMessage } from '@/hooks/useLandscaperThreads';
import { MutationProposalCard, MutationProposal } from './MutationProposalCard';
import MediaSummaryCard from './MediaSummaryCard';
import { processLandscaperResponse } from '@/utils/formatLandscaperResponse';
import { ArtifactCardInline } from '@/components/wrapper/ArtifactCardInline';

/**
 * Slim shape pulled out of a tool_execution result whose tool name is
 * `create_artifact`. Matches the envelope `create_artifact_record`
 * returns (services.py §6.1).
 */
interface CreateArtifactCardData {
  artifactId: number;
  title: string;
}

function extractArtifactCards(
  message: ThreadMessage,
): CreateArtifactCardData[] {
  const executions = message.metadata?.tool_executions;
  if (!Array.isArray(executions) || executions.length === 0) return [];
  const cards: CreateArtifactCardData[] = [];
  for (const exec of executions) {
    if (!exec || exec.tool !== 'create_artifact') continue;
    if (!exec.success) continue;
    const result = exec.result as Record<string, unknown> | undefined;
    if (!result) continue;
    const artifactId = result.artifact_id;
    const title = result.title;
    if (typeof artifactId !== 'number') continue;
    cards.push({
      artifactId,
      title: typeof title === 'string' ? title : `Artifact #${artifactId}`,
    });
  }
  return cards;
}

interface ChatMessageBubbleProps {
  message: ThreadMessage;
  onConfirmMutation?: (mutationId: string) => Promise<void>;
  onRejectMutation?: (mutationId: string) => Promise<void>;
  onConfirmBatch?: (batchId: string) => Promise<void>;
  onReviewMedia?: (docId: number, docName: string) => void;
  /** Phase 4 — opens an artifact in the right-side workspace panel. */
  onOpenArtifact?: (artifactId: number) => void;
}

export function ChatMessageBubble({
  message,
  onConfirmMutation,
  onRejectMutation,
  onConfirmBatch,
  onReviewMedia,
  onOpenArtifact,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  // Check for mutation proposals in metadata
  const proposals: MutationProposal[] = message.metadata?.mutation_proposals ||
    message.metadata?.mutationProposals ||
    [];
  const hasProposals = proposals.length > 0;

  // Phase 4 — surface a card per `create_artifact` tool_execution so the
  // user has a stable handle back to the artifact even after scrolling.
  const artifactCards = useMemo(
    () => (isUser ? [] : extractArtifactCards(message)),
    [isUser, message],
  );

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

      {/* Phase 4 — artifact cards from create_artifact tool_executions. */}
      {!isUser && artifactCards.length > 0 && onOpenArtifact && (
        <div className="mt-2 d-flex flex-column gap-2 w-100">
          {artifactCards.map((card) => (
            <ArtifactCardInline
              key={card.artifactId}
              artifactId={card.artifactId}
              title={card.title}
              subtitle="Artifact"
              onOpen={onOpenArtifact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ChatMessageBubble;
