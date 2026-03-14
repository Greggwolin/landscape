'use client';

import React from 'react';
import { CSpinner } from '@coreui/react';

export interface HelpContent {
  page_name: string;
  page_title: string;
  what_you_can_do: string[];
  coming_soon: string[];
  tips: string[];
}

interface HelpContentPanelProps {
  content: HelpContent | null;
  loading: boolean;
}

export function HelpContentPanel({ content, loading }: HelpContentPanelProps) {
  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner size="sm" />
        <p className="mt-2 text-muted">Loading help content...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-muted">
        <p>Help content not available for this page.</p>
        <p>Ask Landscaper for assistance →</p>
      </div>
    );
  }

  return (
    <div className="help-content">
      <h5 className="mb-3">{content.page_title || content.page_name} Help &amp; Feedback</h5>

      {content.what_you_can_do?.length > 0 && (
        <div className="mb-3">
          <h6 className="text-success">What You Can Do</h6>
          <ul className="mb-0">
            {content.what_you_can_do.map((item, index) => (
              <li key={`what-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {content.coming_soon?.length > 0 && (
        <div className="mb-3">
          <h6 className="text-warning">Coming Soon</h6>
          <ul className="mb-0">
            {content.coming_soon.map((item, index) => (
              <li key={`coming-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3">
        <h6 className="text-info">Feedback</h6>
        <p className="mb-0" style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
          To send immediate feedback, just include the text &quot;#FB&quot; in any prompt (ex. &quot;#FB the map controls are clunky on this page&quot;).
        </p>
      </div>
    </div>
  );
}
