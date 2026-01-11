'use client';

import React from 'react';

export type ViewMode = 'detail' | 'summary';

interface DetailSummaryToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

/**
 * DetailSummaryToggle - Toggle between Detail and Summary views
 *
 * Used in hierarchical sections (Other Income, Operating Expenses)
 * - Detail: Shows parent categories + child items
 * - Summary: Shows only child items, no parent groupings
 */
export function DetailSummaryToggle({
  value,
  onChange,
  className = ''
}: DetailSummaryToggleProps) {
  return (
    <div className={`ops-view-toggle ${className}`}>
      <button
        type="button"
        className={value === 'detail' ? 'active' : ''}
        onClick={() => onChange('detail')}
      >
        Detail
      </button>
      <button
        type="button"
        className={value === 'summary' ? 'active' : ''}
        onClick={() => onChange('summary')}
      >
        Summary
      </button>
    </div>
  );
}

export default DetailSummaryToggle;
