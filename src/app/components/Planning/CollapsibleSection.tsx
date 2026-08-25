'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  itemCount: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  headerActions?: React.ReactNode;
  locked?: boolean;
  /** CONTROLLED MODE — opt-in, and absent everywhere it is not wanted.
   *
   *  Pass both to hand ownership of open/closed to the parent. The Parcels
   *  workspace does, so which sections you left open survives closing the
   *  artifact; the overlay and the classic screen pass neither and keep the
   *  uncontrolled behaviour they have always had, unchanged.
   *
   *  Both or neither. One alone would give a section that looks controlled and
   *  silently is not, which is worse than either mode. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export default function CollapsibleSection({
  title,
  itemCount,
  children,
  defaultExpanded,
  headerActions,
  locked,
  expanded,
  onExpandedChange,
}: CollapsibleSectionProps) {
  const controlled = expanded !== undefined && onExpandedChange !== undefined;

  const [internalExpanded, setInternalExpanded] = useState(() => {
    if (locked) {
      return false;
    }

    if (defaultExpanded !== undefined) {
      return defaultExpanded;
    }

    return itemCount > 0;
  });

  // `locked` wins over a controlled value. A locked section cannot be opened by
  // clicking, so it must not be openable by a restored one either — otherwise a
  // saved view could show content the lock exists to withhold.
  const isExpanded = locked ? false : (controlled ? Boolean(expanded) : internalExpanded);

  const toggleSection = () => {
    if (locked) return;
    if (controlled) {
      onExpandedChange!(!isExpanded);
      return;
    }
    setInternalExpanded((prev) => !prev);
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
