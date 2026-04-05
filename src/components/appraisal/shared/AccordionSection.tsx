/**
 * AccordionSection
 *
 * Universal collapsible accordion component.
 * Headers flush left, body indented 16px, chevron at far right.
 * Do NOT use CAccordion from CoreUI — CSS height animation conflicts.
 *
 * @version 1.0
 * @created 2026-04-05
 */

'use client';

import React, { useState } from 'react';

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  progress?: {
    filled: number;
    total: number;
    color: 'full' | 'partial' | 'low' | 'empty';
  };
  children: React.ReactNode;
}

export function AccordionSection({
  title,
  defaultOpen = true,
  progress,
  children,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const sectionClass = ['accordion-section', !isOpen && 'collapsed']
    .filter(Boolean)
    .join(' ');

  const fillPct = progress ? (progress.filled / progress.total) * 100 : 0;

  return (
    <div className={sectionClass}>
      <div className="accordion-hdr" onClick={() => setIsOpen(!isOpen)}>
        <span className="accordion-title">{title}</span>
        {progress && (
          <div className="accordion-progress">
            <div className="accordion-bar">
              <div
                className={`accordion-bar-fill ${progress.color}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <span className="accordion-count">
              {progress.filled} / {progress.total}
            </span>
          </div>
        )}
        <span className="accordion-chevron">▾</span>
      </div>
      <div className="accordion-body">{children}</div>
    </div>
  );
}
