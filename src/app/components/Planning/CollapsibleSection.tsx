'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  itemCount: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  headerActions?: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  itemCount,
  children,
  defaultExpanded,
  headerActions
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded !== undefined ? defaultExpanded : itemCount > 0
  );

  return (
    <div className="rounded border overflow-hidden" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: isExpanded ? 'rgb(241, 242, 246)' : 'transparent' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          {/* Chevron Icon */}
          <svg
            className="w-4 h-4 transition-transform"
            style={{
              color: 'var(--cui-secondary-color)',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          <h3 className="text-base font-semibold" style={{ color: 'var(--cui-body-color)' }}>{title}</h3>
        </button>

        {headerActions && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t" style={{ borderColor: 'var(--cui-border-color)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
