'use client';

import React, { useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronRight } from '@coreui/icons';

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: string;
  headerAction?: React.ReactNode;
  headerClassName?: string;
}

export function AccordionSection({
  title,
  children,
  defaultOpen = false,
  icon,
  headerAction,
  headerClassName,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${headerClassName || ''}`}
        style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--cui-secondary-bg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)';
        }}
      >
        <div className="flex items-center gap-2">
          <CIcon icon={isOpen ? cilChevronBottom : cilChevronRight} size="sm" className="text-muted" />
          {icon && <span>{icon}</span>}
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        {headerAction && (
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {headerAction}
          </div>
        )}
      </div>

      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}
