'use client';

import React from 'react';

import { ReviewMessage } from './ReviewTypes';

interface ReviewConversationProps {
  messages: ReviewMessage[];
}

export function ReviewConversation({ messages }: ReviewConversationProps) {
  if (messages.length === 0) {
    return (
      <div className="landscaper-message">
        <div className="landscaper-message-header">
          <div className="landscaper-avatar">L</div>
          <div>
            <div className="fw-semibold">Landscaper</div>
            <div className="text-muted small">Awaiting response...</div>
          </div>
        </div>
        <div className="landscaper-message-body text-muted">
          Review in progress.
        </div>
      </div>
    );
  }

  return (
    <div className="review-conversation">
      {messages.map((message) => (
        <div
          key={message.id}
          className={message.role === 'landscaper' ? 'landscaper-message' : 'review-user-message'}
        >
          {message.role === 'landscaper' ? (
            <>
              <div className="landscaper-message-header">
                <div className="landscaper-avatar">L</div>
                <div>
                  <div className="fw-semibold">Landscaper</div>
                  {message.timestamp && (
                    <div className="text-muted small">{message.timestamp}</div>
                  )}
                </div>
              </div>
              <div className="landscaper-message-body">
                <p>{message.message}</p>
                {message.response?.questions_answered && message.response.questions_answered.length > 0 && (
                  <div className="landscaper-message-section">
                    <div className="fw-semibold mb-2">Your Questions</div>
                    {message.response.questions_answered.map((qa, index) => (
                      <div key={`${message.id}-qa-${index}`} className="mb-2">
                        <div className="small fw-semibold">Q: {qa.question}</div>
                        <div className="small text-muted">A: {qa.answer}</div>
                      </div>
                    ))}
                  </div>
                )}
                {message.response?.suggested_edits && message.response.suggested_edits.length > 0 && (
                  <div className="landscaper-message-section">
                    <div className="fw-semibold mb-2">Suggested Edits</div>
                    <ul className="mb-0">
                      {message.response.suggested_edits.map((edit, index) => (
                        <li key={`${message.id}-edit-${index}`}>
                          {edit.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="review-user-message-body">{message.message}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ReviewConversation;
