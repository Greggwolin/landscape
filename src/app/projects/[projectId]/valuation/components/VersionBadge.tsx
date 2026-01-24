'use client';

import React from 'react';

export type VersionStatus = 'draft' | 'under_review' | 'final';

interface VersionBadgeProps {
  status: VersionStatus;
  className?: string;
}

const STATUS_LABELS: Record<VersionStatus, string> = {
  draft: 'Draft',
  under_review: 'Under Review',
  final: 'Final',
};

export function VersionBadge({ status, className = '' }: VersionBadgeProps) {
  const statusClass = `version-badge-${status.replace('_', '-')}`;

  return (
    <span className={`version-badge ${statusClass} ${className}`.trim()}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default VersionBadge;
