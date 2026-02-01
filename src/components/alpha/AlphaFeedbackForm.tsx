'use client';

import React, { useState } from 'react';
import { CButton, CFormTextarea, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSend, cilCheckCircle } from '@coreui/icons';

interface AlphaFeedbackFormProps {
  projectId: number;
  pageContext: string;
}

export function AlphaFeedbackForm({ projectId, pageContext }: AlphaFeedbackFormProps) {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/alpha/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_context: pageContext,
          project_id: projectId,
          feedback: feedback.trim(),
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setFeedback('');
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="alpha-feedback-form">
      <h6 className="mb-2">Submit Feedback</h6>
      <p className="text-body-secondary small mb-3">
        Found a bug? Have a suggestion? Let us know.
      </p>

      {submitted ? (
        <div className="text-center py-4">
          <CIcon icon={cilCheckCircle} size="xl" className="text-success mb-2" />
          <p className="text-success mb-0">Thank you for your feedback!</p>
        </div>
      ) : (
        <>
          <CFormTextarea
            placeholder="Describe your issue, suggestion, or question..."
            rows={6}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="mb-3"
          />
          <CButton
            color="primary"
            onClick={handleSubmit}
            disabled={!feedback.trim() || submitting}
            className="w-100"
          >
            {submitting ? (
              <CSpinner size="sm" className="me-2" />
            ) : (
              <CIcon icon={cilSend} className="me-2" />
            )}
            Submit Feedback
          </CButton>
        </>
      )}
    </div>
  );
}

export default AlphaFeedbackForm;
