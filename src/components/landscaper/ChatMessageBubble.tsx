/**
 * ChatMessageBubble Component
 *
 * Displays an individual chat message with role-based styling.
 * User messages appear on the right, assistant messages on the left.
 */

import React from 'react';

interface ChatMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  userName?: string | null;
}

export default function ChatMessageBubble({
  role,
  content,
  timestamp,
  userName,
}: ChatMessageBubbleProps) {
  const isUser = role === 'user';

  // Format timestamp
  const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div
      className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}
    >
      <div
        className={`d-flex flex-column ${isUser ? 'align-items-end' : 'align-items-start'}`}
        style={{ maxWidth: '75%' }}
      >
        {/* Message bubble */}
        <div
          className={`px-3 py-2 rounded ${
            isUser
              ? 'bg-primary text-white'
              : 'border'
          }`}
          style={{
            backgroundColor: isUser ? 'var(--cui-primary)' : 'var(--cui-body-bg)',
            borderColor: !isUser ? 'var(--cui-border-color)' : undefined,
            color: isUser ? 'white' : 'var(--cui-body-color)',
          }}
        >
          {/* Format content with line breaks */}
          {content.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx < content.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>

        {/* Metadata */}
        <div
          className="text-muted small mt-1"
          style={{ fontSize: '0.75rem' }}
        >
          {isUser && userName && <span className="me-2">{userName}</span>}
          <span>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}
