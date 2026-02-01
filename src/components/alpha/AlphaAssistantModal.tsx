'use client';

import React, { useEffect, useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CButton,
  CFormTextarea,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLifeRing, cilCommentBubble, cilSend } from '@coreui/icons';
import { HelpContentPanel, HelpContent } from './HelpContentPanel';
import { AlphaLandscaperChat } from './AlphaLandscaperChat';
import { useToast } from '@/components/ui/toast';

interface AlphaAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  pageContext: string;
  projectId: number;
}

export function AlphaAssistantModal({
  visible,
  onClose,
  pageContext,
  projectId,
}: AlphaAssistantModalProps) {
  const [helpContent, setHelpContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (visible && pageContext) {
      fetchHelpContent(pageContext);
    }
  }, [visible, pageContext]);

  const fetchHelpContent = async (context: string) => {
    setLoading(true);
    setHelpContent(null);
    try {
      const response = await fetch(`/api/alpha/help?page_context=${encodeURIComponent(context)}`);
      if (response.ok) {
        const data = await response.json();
        setHelpContent(data);
      } else {
        setHelpContent(null);
      }
    } catch (error) {
      console.error('Failed to fetch help content:', error);
      setHelpContent(null);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || submittingFeedback) return;

    setSubmittingFeedback(true);
    try {
      const response = await fetch('/api/alpha/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_context: pageContext,
          project_id: projectId,
          feedback: feedbackText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setFeedbackText('');
      showToast('Feedback submitted. Thank you!', 'success');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showToast('Unable to submit feedback right now.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="xl"
      className="alpha-assistant-modal"
      alignment="center"
    >
      <CModalHeader>
        <CModalTitle>
          <CIcon icon={cilLifeRing} className="me-2" />
          Alpha Assistant
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="alpha-assistant-content">
          <div className="row g-3">
            <div className="col-lg-5 col-md-12">
              <div className="help-panel">
                <HelpContentPanel content={helpContent} loading={loading} />
              </div>
            </div>
            <div className="col-lg-7 col-md-12">
              <div className="chat-panel d-flex flex-column h-100">
                <AlphaLandscaperChat projectId={projectId} pageContext={pageContext} />
              </div>
            </div>
          </div>
          <div className="feedback-section mt-3">
            <h6 className="mb-2 d-flex align-items-center gap-1">
              <CIcon icon={cilCommentBubble} />
              Submit Feedback
            </h6>
            <CFormTextarea
              placeholder="Describe your issue or suggestion. A quick chat with Landscaper above can help clarify your feedback before you submit."
              rows={3}
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
            />
            <div className="d-flex justify-content-end mt-2">
              <CButton
                color="primary"
                size="sm"
                onClick={submitFeedback}
                disabled={!feedbackText.trim() || submittingFeedback}
              >
                {submittingFeedback ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilSend} className="me-1" />
                    Submit Feedback
                  </>
                )}
              </CButton>
            </div>
          </div>
        </div>
      </CModalBody>
    </CModal>
  );
}
