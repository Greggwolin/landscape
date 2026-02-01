'use client';

import React, { useEffect, useState } from 'react';
import { CCloseButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLifeRing } from '@coreui/icons';
import { HelpContentPanel, HelpContent } from './HelpContentPanel';
import { AlphaLandscaperChat } from './AlphaLandscaperChat';
import { AlphaFeedbackForm } from './AlphaFeedbackForm';
import './alpha-flyout.css';

interface AlphaAssistantFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext: string;
  projectId: number;
}

export function AlphaAssistantFlyout({
  isOpen,
  onClose,
  pageContext,
  projectId,
}: AlphaAssistantFlyoutProps) {
  const [helpContent, setHelpContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'help' | 'chat' | 'feedback'>('help');

  useEffect(() => {
    if (isOpen && pageContext) {
      fetchHelpContent();
    }
  }, [isOpen, pageContext]);

  const fetchHelpContent = async () => {
    setLoading(true);
    setHelpContent(null);
    try {
      const response = await fetch(`/api/alpha/help?page_context=${encodeURIComponent(pageContext)}`);
      if (response.ok) {
        const data = await response.json();
        setHelpContent(data);
      }
    } catch (error) {
      console.error('Failed to fetch help content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <div className={`alpha-flyout ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="alpha-flyout-header">
        <div className="d-flex align-items-center gap-2">
          <CIcon icon={cilLifeRing} />
          <span className="fw-semibold">Alpha Assistant</span>
        </div>
        <CCloseButton onClick={onClose} />
      </div>

      {/* Section Tabs */}
      <div className="alpha-flyout-tabs">
        <button
          className={`alpha-tab ${activeSection === 'help' ? 'active' : ''}`}
          onClick={() => setActiveSection('help')}
        >
          Help
        </button>
        <button
          className={`alpha-tab ${activeSection === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveSection('chat')}
        >
          Chat
        </button>
        <button
          className={`alpha-tab ${activeSection === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveSection('feedback')}
        >
          Feedback
        </button>
      </div>

      {/* Content */}
      <div className="alpha-flyout-content">
        {activeSection === 'help' && (
          <HelpContentPanel content={helpContent} loading={loading} />
        )}

        {activeSection === 'chat' && (
          <AlphaLandscaperChat projectId={projectId} pageContext={pageContext} />
        )}

        {activeSection === 'feedback' && (
          <AlphaFeedbackForm projectId={projectId} pageContext={pageContext} />
        )}
      </div>
    </div>
  );
}

export default AlphaAssistantFlyout;
