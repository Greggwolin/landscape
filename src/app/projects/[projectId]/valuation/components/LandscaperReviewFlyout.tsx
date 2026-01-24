'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CButton, CFormInput, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilX, cilSend } from '@coreui/icons';

import ReviewConversation from './ReviewConversation';
import ChangesPreview from './ChangesPreview';
import { LandscaperResponse, ReviewMessage } from './ReviewTypes';

interface LandscaperReviewFlyoutProps {
  projectId: number;
  approachType: string;
  versionId: number | null;
  isOpen: boolean;
  response: LandscaperResponse | null;
  thread: ReviewMessage[];
  onClose: () => void;
  onApplyChanges: (suggestedContent: object | undefined) => Promise<void>;
  onThreadUpdate: (messages: ReviewMessage[], response: LandscaperResponse | null) => void;
}

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export default function LandscaperReviewFlyout({
  projectId,
  approachType,
  versionId,
  isOpen,
  response,
  thread,
  onClose,
  onApplyChanges,
  onThreadUpdate,
}: LandscaperReviewFlyoutProps) {
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'ready' | 'error'>('pending');
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const canSendFollowUp = followUpMessage.trim().length > 0;

  const narrativeBaseUrl = useMemo(() => {
    return `${DJANGO_API_URL}/api/projects/${projectId}/narrative/${approachType}`;
  }, [projectId, approachType]);

  useEffect(() => {
    if (isOpen) {
      setReviewStatus(response ? 'ready' : 'pending');
    }
  }, [isOpen, response]);

  useEffect(() => {
    if (isOpen && response && thread.length === 0) {
      const newMessage: ReviewMessage = {
        id: `landscaper-${Date.now()}`,
        role: 'landscaper',
        message: response.message,
        timestamp: 'Just now',
        response,
      };
      onThreadUpdate([newMessage], response);
    }
  }, [isOpen, onThreadUpdate, response, thread.length]);

  useEffect(() => {
    if (!isOpen || reviewStatus !== 'pending') return;
    const poll = window.setInterval(async () => {
      try {
        const res = await fetch(`${narrativeBaseUrl}/review-status/`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'ready') {
          const nextResponse: LandscaperResponse = data.response;
          const newMessage: ReviewMessage = {
            id: `landscaper-${Date.now()}`,
            role: 'landscaper',
            message: nextResponse.message,
            timestamp: 'Just now',
            response: nextResponse,
          };
          onThreadUpdate([...thread, newMessage], nextResponse);
          setReviewStatus('ready');
          window.clearInterval(poll);
        }
      } catch (error) {
        console.error('Failed to fetch review status:', error);
        setReviewStatus('error');
      }
    }, 2000);

    return () => window.clearInterval(poll);
  }, [isOpen, narrativeBaseUrl, onThreadUpdate, reviewStatus, thread]);

  const handleApply = async () => {
    if (!response?.suggested_content) return;
    setIsApplying(true);
    try {
      await onApplyChanges(response.suggested_content);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleDiscussFurther = async () => {
    if (!followUpMessage.trim()) return;
    const userMessage: ReviewMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      message: followUpMessage.trim(),
      timestamp: 'Just now',
    };
    const nextThread = [...thread, userMessage];
    onThreadUpdate(nextThread, response);
    setIsSending(true);
    try {
      const res = await fetch(`${narrativeBaseUrl}/follow-up/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_id: versionId,
          message: followUpMessage.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          const nextResponse: LandscaperResponse = data.response;
          const newMessage: ReviewMessage = {
            id: `landscaper-${Date.now()}`,
            role: 'landscaper',
            message: nextResponse.message,
            timestamp: 'Just now',
            response: nextResponse,
          };
          onThreadUpdate([...nextThread, newMessage], nextResponse);
          setReviewStatus('ready');
        } else {
          setReviewStatus('pending');
        }
      } else {
        setReviewStatus('error');
      }
      setFollowUpMessage('');
    } catch (error) {
      console.error('Failed to send follow-up:', error);
      setReviewStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="landscaper-review-flyout" role="dialog" aria-label="Landscaper Review">
      <div className="landscaper-review-header">
        <div>
          <div className="fw-semibold">Landscaper Review</div>
          {reviewStatus === 'pending' && (
            <div className="text-muted small d-flex align-items-center gap-2">
              <CSpinner size="sm" /> Waiting for response
            </div>
          )}
          {reviewStatus === 'error' && (
            <div className="text-danger small">Unable to load response</div>
          )}
        </div>
        <CButton color="secondary" variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
          <CIcon icon={cilX} />
        </CButton>
      </div>

      <div className="landscaper-review-body">
        <ReviewConversation messages={thread} />
        <ChangesPreview response={response} />
      </div>

      <div className="landscaper-review-footer">
        <div className="landscaper-followup">
          <div className="small text-muted mb-2">Ask a follow-up question</div>
          <div className="d-flex gap-2">
            <CFormInput
              value={followUpMessage}
              onChange={(event) => setFollowUpMessage(event.target.value)}
              placeholder="Ask a follow-up question..."
            />
            <CButton color="primary" onClick={handleDiscussFurther} disabled={isSending || !canSendFollowUp}>
              <CIcon icon={cilSend} size="sm" className="me-1" />
              Send
            </CButton>
          </div>
        </div>
        <div className="landscaper-review-actions">
          <CButton color="primary" onClick={handleApply} disabled={isApplying || !response?.suggested_content}>
            {isApplying ? 'Applying...' : 'Apply Changes'}
          </CButton>
          <CButton color="secondary" variant="outline" onClick={handleDiscussFurther} disabled={isSending || !canSendFollowUp}>
            Discuss Further
          </CButton>
          <CButton color="secondary" variant="ghost" onClick={onClose}>
            Close
          </CButton>
        </div>
      </div>
    </div>
  );
}
