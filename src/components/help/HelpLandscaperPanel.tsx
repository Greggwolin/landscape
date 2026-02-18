'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CCloseButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilLifeRing,
  cilTrash,
  cilArrowRight,
  cilChevronBottom,
  cilChevronTop,
} from '@coreui/icons';
import { useHelpLandscaper, HelpMessage } from '@/contexts/HelpLandscaperContext';
import './help-landscaper-panel.css';

/* ------------------------------------------------------------------ */
/* Types for structured page guide content                             */
/* ------------------------------------------------------------------ */

interface PageGuideContent {
  page_name: string;
  page_title: string;
  what_you_can_do: string[];
  coming_soon: string[];
  tips: string[];
}

/* ------------------------------------------------------------------ */
/* Human-readable labels for folder/tab combos                         */
/* ------------------------------------------------------------------ */

const PAGE_LABELS: Record<string, string> = {
  // Home
  home: 'Project Home',

  // Property folder (MF)
  property: 'Property',
  property_details: 'Property Details',
  'property_rent-roll': 'Rent Roll',
  property_market: 'Market',
  property_renovation: 'Renovation',

  // Property folder (Land Dev)
  property_acquisition: 'Acquisition',
  'property_land-use': 'Land Use',
  property_parcels: 'Parcels',

  // Operations
  operations: 'Operations',

  // Valuation (MF)
  valuation: 'Valuation',
  'valuation_sales-comparison': 'Sales Comparison',
  'valuation_cost-approach': 'Cost Approach',
  valuation_income: 'Income Approach',

  // Valuation (Land Dev)
  valuation_feasibility: 'Feasibility',
  'valuation_cash-flow': 'Cash Flow',
  valuation_returns: 'Returns',
  valuation_sensitivity: 'Sensitivity',

  // Budget (Land Dev)
  budget: 'Budget',
  budget_schedule: 'Schedule',
  budget_sales: 'Sales',
  budget_draws: 'Draws',

  // Capital
  capitalization: 'Capitalization',
  capitalization_equity: 'Equity',
  capitalization_debt: 'Debt',

  // Reports
  reports: 'Reports',
  reports_summary: 'Report Summary',
  reports_export: 'Report Export',

  // Documents
  documents: 'Documents',
  documents_all: 'All Documents',
  documents_extractions: 'Extractions',

  // Map
  map: 'Map',
};

/* ------------------------------------------------------------------ */
/* Message Bubble                                                      */
/* ------------------------------------------------------------------ */

function MessageBubble({ message }: { message: HelpMessage }) {
  return (
    <div className={`help-message-row help-message-row--${message.role}`}>
      <div className={`help-message help-message--${message.role}`}>
        {message.content}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading Indicator                                                   */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="help-message-row help-message-row--assistant">
      <div className="help-message help-message--assistant help-typing">
        <span className="help-typing-dot" />
        <span className="help-typing-dot" />
        <span className="help-typing-dot" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page Guide - collapsible structured content                         */
/* ------------------------------------------------------------------ */

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function PageGuide({ currentPage }: { currentPage: string | undefined }) {
  const [content, setContent] = useState<PageGuideContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const lastFetchedPage = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!currentPage || currentPage === lastFetchedPage.current) return;
    lastFetchedPage.current = currentPage;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `${DJANGO_API_URL}/api/knowledge/platform/alpha-help/?page_context=${encodeURIComponent(currentPage)}`,
        );
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!cancelled) {
          setContent({
            page_name: currentPage,
            page_title: PAGE_LABELS[currentPage] || currentPage,
            what_you_can_do: data.what_you_can_do || [],
            coming_soon: data.coming_soon || [],
            tips: data.tips || [],
          });
        }
      } catch {
        if (!cancelled) setContent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [currentPage]);

  const label = currentPage ? PAGE_LABELS[currentPage] || currentPage : null;

  // Nothing to show if not on a workspace page
  if (!currentPage) return null;

  const hasContent =
    content &&
    (content.what_you_can_do.length > 0 ||
      content.coming_soon.length > 0 ||
      content.tips.length > 0);

  return (
    <div className="help-page-guide">
      {/* Collapsible header */}
      <button
        type="button"
        className="help-page-guide-header"
        onClick={() => setExpanded((p) => !p)}
      >
        <span className="help-page-guide-label">{label || 'Page Guide'}</span>
        <CIcon icon={expanded ? cilChevronTop : cilChevronBottom} size="sm" />
      </button>

      {/* Collapsible body */}
      {expanded && (
        <div className="help-page-guide-body">
          {loading && (
            <p className="help-page-guide-loading">Loading page guide…</p>
          )}
          {!loading && hasContent && (
            <>
              {content.what_you_can_do.length > 0 && (
                <div className="help-guide-section">
                  <h6 className="help-guide-section-title help-guide-section-title--success">
                    What You Can Do
                  </h6>
                  <ul className="help-guide-list">
                    {content.what_you_can_do.map((item, i) => (
                      <li key={`what-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {content.coming_soon.length > 0 && (
                <div className="help-guide-section">
                  <h6 className="help-guide-section-title help-guide-section-title--warning">
                    Coming Soon
                  </h6>
                  <ul className="help-guide-list">
                    {content.coming_soon.map((item, i) => (
                      <li key={`soon-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {content.tips.length > 0 && (
                <div className="help-guide-section">
                  <h6 className="help-guide-section-title help-guide-section-title--info">
                    Tips
                  </h6>
                  <ul className="help-guide-list">
                    {content.tips.map((item, i) => (
                      <li key={`tip-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {!loading && !hasContent && (
            <p className="help-page-guide-empty">
              No specific guide available for this page yet. Ask a question below!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export default function HelpLandscaperPanel() {
  const {
    isOpen,
    messages,
    isLoading,
    currentPage,
    closeHelp,
    sendMessage,
    clearConversation,
  } = useHelpLandscaper();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the transition finish
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeHelp();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeHelp]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const text = inputValue;
    setInputValue('');
    await sendMessage(text);
  }, [inputValue, isLoading, sendMessage]);

  return (
    <div className={`help-panel ${isOpen ? 'help-panel--open' : ''}`}>
      {/* Header */}
      <div className="help-panel-header">
        <div className="help-panel-header-title">
          <CIcon icon={cilLifeRing} size="sm" />
          <span className="help-panel-header-text">Help</span>
        </div>
        <div className="help-panel-header-actions">
          {messages.length > 0 && (
            <button
              type="button"
              className="help-panel-action-btn"
              onClick={clearConversation}
              title="Clear conversation"
            >
              <CIcon icon={cilTrash} size="sm" />
            </button>
          )}
          <CCloseButton onClick={closeHelp} />
        </div>
      </div>

      {/* Page Guide - tab-aware structured content */}
      <PageGuide currentPage={currentPage} />

      {/* Messages */}
      <div className="help-panel-messages">
        {messages.length === 0 && !isLoading && (
          <div className="help-panel-empty">
            <CIcon icon={cilLifeRing} className="help-panel-empty-icon" />
            <p className="help-panel-empty-title">Landscape Help</p>
            <p className="help-panel-empty-subtitle">
              Ask me anything about how to use the platform — navigation, features, calculations, or how things compare to ARGUS.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="help-panel-input-area" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="help-panel-input"
          placeholder="Ask about Landscape..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="help-panel-send-btn"
          disabled={!inputValue.trim() || isLoading}
          title="Send"
        >
          <CIcon icon={cilArrowRight} size="sm" />
        </button>
      </form>
    </div>
  );
}
