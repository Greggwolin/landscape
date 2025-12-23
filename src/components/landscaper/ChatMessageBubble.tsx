'use client';

import React, { useState } from 'react';
import { ChatMessage } from '@/hooks/useLandscaper';
import { DataTableModal, ColumnDef } from './DataTableModal';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const [showModal, setShowModal] = useState(false);
  const isUser = message.role === 'user';

  const hasStructuredData =
    !isUser &&
    message.structuredData &&
    Array.isArray(message.structuredData) &&
    message.structuredData.length > 0;

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className="max-w-[80%] rounded-2xl px-4 py-3"
          style={{
            backgroundColor: isUser ? 'var(--cui-primary)' : 'var(--cui-tertiary-bg)',
            color: isUser ? 'white' : 'var(--cui-body-color)',
          }}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>

          {/* View as table button */}
          {hasStructuredData && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <TableIcon className="h-4 w-4" />
              View as table ({message.structuredData!.length} rows)
            </button>
          )}

          {!isUser &&
            message.metadata?.context?.sources &&
            message.metadata.context.sources.length > 0 && (
              <div
                className="mt-3 border-t pt-2"
                style={{ borderColor: 'var(--cui-border-color)' }}
              >
                <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  📄 Sources:{' '}
                  {message.metadata.context.sources.slice(0, 3).join(', ')}
                  {message.metadata.context.sources.length > 3 &&
                    ` +${message.metadata.context.sources.length - 3} more`}
                </div>
              </div>
            )}

          {!isUser &&
            message.metadata?.suggestedValues &&
            Object.keys(message.metadata.suggestedValues).length > 0 && (
              <div className="mt-2 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                💡 Contains recommendations
              </div>
            )}
        </div>
      </div>

      {/* Data table modal */}
      {showModal && hasStructuredData && (
        <DataTableModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={message.dataTitle || 'Data'}
          data={message.structuredData!}
          columns={(message.columns as ColumnDef[]) || []}
        />
      )}
    </>
  );
}

export default ChatMessageBubble;
