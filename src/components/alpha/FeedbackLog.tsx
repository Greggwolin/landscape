'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CSpinner, CBadge, CCollapse, CCard, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCommentSquare, cilChevronBottom, cilChevronRight } from '@coreui/icons';

interface FeedbackItem {
  id: number;
  affected_module: string | null;
  landscaper_summary: string | null;
  message: string;
  category: string | null;
  status: 'submitted' | 'under_review' | 'addressed';
  admin_response: string | null;
  admin_responded_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'warning',
  under_review: 'info',
  addressed: 'success',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  addressed: 'Addressed',
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'Feature Request',
  ux_confusion: 'UX Issue',
  question: 'Question',
};

interface FeedbackItemRowProps {
  item: FeedbackItem;
}

function FeedbackItemRow({ item }: FeedbackItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  const displayText = item.landscaper_summary || item.message;
  const truncatedText =
    displayText.length > 80 ? `${displayText.substring(0, 80)}...` : displayText;

  const hasResponse = !!item.admin_response;

  return (
    <div
      className="feedback-log-item"
      style={{
        borderBottom: '1px solid var(--cui-border-color)',
        padding: '0.75rem 0',
      }}
    >
      <div
        className="d-flex align-items-start gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <CIcon
          icon={expanded ? cilChevronBottom : cilChevronRight}
          size="sm"
          className="mt-1 flex-shrink-0"
          style={{ color: 'var(--cui-secondary-color)' }}
        />
        <div className="flex-grow-1 min-width-0">
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            {item.affected_module && (
              <span
                className="text-muted small"
                style={{ fontWeight: 500 }}
              >
                {item.affected_module}
              </span>
            )}
            <CBadge color={STATUS_COLORS[item.status]} size="sm">
              {STATUS_LABELS[item.status]}
            </CBadge>
            {item.category && (
              <span
                className="small"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
            )}
          </div>
          <p
            className="mb-0 small"
            style={{
              color: 'var(--cui-body-color)',
              lineHeight: 1.4,
            }}
          >
            {expanded ? displayText : truncatedText}
          </p>
          <span
            className="small"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>
        {hasResponse && (
          <CIcon
            icon={cilCommentSquare}
            size="sm"
            className="flex-shrink-0"
            style={{ color: 'var(--cui-success)' }}
            title="Admin responded"
          />
        )}
      </div>

      <CCollapse visible={expanded && hasResponse}>
        <CCard
          className="mt-2 ms-4"
          style={{
            backgroundColor: 'var(--cui-success-bg-subtle)',
            border: '1px solid var(--cui-success-border-subtle)',
          }}
        >
          <CCardBody className="py-2 px-3">
            <div className="d-flex align-items-center gap-2 mb-1">
              <strong className="small" style={{ color: 'var(--cui-success)' }}>
                Admin Response
              </strong>
              {item.admin_responded_at && (
                <span
                  className="small"
                  style={{ color: 'var(--cui-secondary-color)' }}
                >
                  {new Date(item.admin_responded_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p
              className="mb-0 small"
              style={{ color: 'var(--cui-body-color)', whiteSpace: 'pre-wrap' }}
            >
              {item.admin_response}
            </p>
          </CCardBody>
        </CCard>
      </CCollapse>
    </div>
  );
}

export function FeedbackLog() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      let accessToken: string | null = null;
      try {
        const tokens = localStorage.getItem('auth_tokens');
        accessToken = tokens ? JSON.parse(tokens).access : null;
      } catch {
        accessToken = null;
      }

      const headers: HeadersInit = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/feedback/my/`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedback(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      setError('Unable to load your feedback history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner size="sm" />
        <p className="mt-2 small text-muted">Loading your feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-danger small">{error}</p>
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted small mb-2">No feedback submitted yet.</p>
        <p className="text-muted small">
          Use the chat above to report issues or request features.
        </p>
      </div>
    );
  }

  return (
    <div className="feedback-log">
      {feedback.map((item) => (
        <FeedbackItemRow key={item.id} item={item} />
      ))}
    </div>
  );
}

export default FeedbackLog;
