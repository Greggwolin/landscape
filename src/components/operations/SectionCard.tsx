'use client';

import React, { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  controls?: ReactNode;
  className?: string;
  evidenceExpanded?: boolean;
  onToggleEvidence?: () => void;
}

/**
 * SectionCard - Container for P&L sections
 *
 * Provides consistent styling for section headers with title and optional controls.
 * Used for Rental Income, Vacancy, Other Income, and Operating Expenses sections.
 */
export function SectionCard({
  title,
  subtitle,
  children,
  controls,
  className = '',
  evidenceExpanded = false
}: SectionCardProps) {
  const expansionClass = evidenceExpanded ? 'ops-evidence-expanded' : 'ops-evidence-collapsed';

  return (
    <div className={`ops-card ${expansionClass} ${className}`}>
      <div className="ops-section-header">
        <h3 className="ops-section-title">
          {title}
          {subtitle && <span className="ops-section-subtitle">{subtitle}</span>}
        </h3>
        {controls && (
          <div className="ops-section-controls">
            {controls}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default SectionCard;
