'use client';

import React from 'react';
import { ChatMessage } from '@/hooks/useLandscaper';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3"
        style={{
          backgroundColor: isUser ? 'var(--cui-primary)' : 'var(--cui-tertiary-bg)',
          color: isUser ? 'white' : 'var(--cui-body-color)',
        }}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>

        {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
          <div className="mt-3 border-t pt-2" style={{ borderColor: 'var(--cui-border-color)' }}>
            <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
              📄 Sources:{' '}
              {message.metadata.sources
                .slice(0, 3)
                .map((source) => source.filename)
                .join(', ')}
              {message.metadata.sources.length > 3 &&
                ` +${message.metadata.sources.length - 3} more`}
            </div>
          </div>
        )}

        {!isUser && message.metadata?.fieldUpdates && (
          <div className="mt-2 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            💡 Contains recommendations
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessageBubble;
