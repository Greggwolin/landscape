'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  itemCount: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  headerActions?: React.ReactNode;
  locked?: boolean;
}

export default function CollapsibleSection({
  title,
  itemCount,
  children,
  defaultExpanded,
  headerActions,
  locked,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (locked) {
      return false;
    }

    if (defaultExpanded !== undefined) {
      return defaultExpanded;
    }

    return itemCount > 0;
  });

  const toggleSection = () => {
    if (locked) return;
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="rounded border overflow-hidden" style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)' }}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: 'var(--surface-card-header)' }}>
        <button
          type="button"
          onClick={toggleSection}
          aria-expanded={isExpanded}
          disabled={locked}
          className={`flex items-center gap-2 transition-opacity ${locked ? 'cursor-not-allowed opacity-60' : 'hover:opacity-70'}`}
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

          <h3 className="text-sm font-semibold mb-0" style={{ color: 'var(--cui-body-color)' }}>{title}</h3>
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
