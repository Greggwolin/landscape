'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

type FeedbackType = 'bug' | 'feature' | 'question' | 'general';

interface FeedbackSubmission {
  feedback_type: FeedbackType;
  message: string;
  page_url: string;
  page_path: string;
  project_id?: number;
  project_name?: string;
  context_url?: string;
}

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();

  const projectMatch = pathname?.match(/\/projects\/(\d+)/);
  const projectId = projectMatch ? Number.parseInt(projectMatch[1], 10) : undefined;

  const resetForm = () => {
    setFeedbackType('general');
    setMessage('');
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setSubmitError('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let accessToken: string | null = null;
      try {
        const tokens = localStorage.getItem('auth_tokens');
        accessToken = tokens ? JSON.parse(tokens).access : null;
      } catch {
        accessToken = null;
      }

      const pagePath = pathname || '/';
      const pageUrl = typeof window !== 'undefined' ? window.location.href : pagePath;

      const submission: FeedbackSubmission = {
        feedback_type: feedbackType,
        message: message.trim(),
        page_url: pageUrl,
        page_path: pagePath,
        project_id: projectId,
        context_url: pageUrl,
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/feedback/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(submission),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="btn btn-primary fixed right-6 rounded-full shadow-lg z-50 d-flex align-items-center justify-content-center"
        style={{
          width: '56px',
          height: '56px',
          bottom: '80px',
        }}
        title="Send Feedback"
        aria-label="Send Feedback"
      >
        FB
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--cui-body-color) 35%, transparent)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            className="rounded-lg shadow-xl w-full max-w-md mx-4"
            style={{
              background: 'var(--cui-card-bg)',
              color: 'var(--cui-body-color)',
              border: '1px solid var(--cui-border-color)',
            }}
          >
            <div
              className="p-4 d-flex justify-content-between align-items-center"
              style={{ borderBottom: '1px solid var(--cui-border-color)' }}
            >
              <h3 className="m-0 font-semibold">Send Feedback</h3>
              <button
                onClick={handleClose}
                className="btn btn-ghost-secondary btn-sm"
                aria-label="Close"
                type="button"
              >
                X
              </button>
            </div>

            <div className="p-4">
              {submitSuccess ? (
                <div className="text-center py-4" style={{ color: 'var(--cui-success)' }}>
                  <div style={{ fontSize: '48px' }}>OK</div>
                  <p className="mt-2">Thank you for your feedback!</p>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: 'var(--cui-body-color)' }}>
                      Type
                    </label>
                    <select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                      className="form-select"
                      style={{
                        background: 'var(--cui-input-bg)',
                        color: 'var(--cui-body-color)',
                        border: '1px solid var(--cui-border-color)',
                      }}
                    >
                      <option value="general">General Feedback</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="question">Question</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ color: 'var(--cui-body-color)' }}>
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="form-control"
                      rows={4}
                      placeholder="Describe your feedback, issue, or question..."
                      style={{
                        background: 'var(--cui-input-bg)',
                        color: 'var(--cui-body-color)',
                        border: '1px solid var(--cui-border-color)',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div
                    className="mb-3 p-2 rounded text-sm"
                    style={{
                      background: 'var(--cui-tertiary-bg)',
                      color: 'var(--cui-secondary-color)',
                    }}
                  >
                    <div>Page: {pathname}</div>
                    {projectId && <div>Project ID: {projectId}</div>}
                  </div>

                  {submitError && (
                    <div
                      className="mb-3 p-2 rounded"
                      style={{
                        background: 'color-mix(in srgb, var(--cui-danger) 15%, var(--cui-body-bg))',
                        color: 'var(--cui-danger)',
                      }}
                    >
                      {submitError}
                    </div>
                  )}
                </>
              )}
            </div>

            {!submitSuccess && (
              <div
                className="p-4 d-flex justify-content-end gap-2"
                style={{ borderTop: '1px solid var(--cui-border-color)' }}
              >
                <button
                  onClick={handleClose}
                  className="btn btn-ghost-secondary"
                  disabled={isSubmitting}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  disabled={isSubmitting || !message.trim()}
                  type="button"
                >
                  {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackButton;
