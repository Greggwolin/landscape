/**
 * StatusBadge - CoreUI Badge Wrapper Component
 *
 * Semantic wrapper around CoreUI CBadge for consistent status indicators.
 * Automatically maps semantic states to the correct color tokens from tokens.css.
 *
 * Renamed from StatusChip (Phase 2 Step 6).
 */

import React from 'react';
import { CBadge } from '@coreui/react';
import type { CBadgeProps } from '@coreui/react';

export type StatusType =
  | 'complete'
  | 'partial'
  | 'pending'
  | 'error'
  | 'inactive'
  | 'info'
  | 'active'
  | 'draft'
  | 'approved'
  | 'rejected';

const statusConfig: Record<
  StatusType,
  {
    color: CBadgeProps['color'];
    label: string;
    variant?: 'outline' | 'ghost';
  }
> = {
  complete: { color: 'success', label: 'Complete' },
  partial: { color: 'warning', label: 'Partial' },
  pending: { color: 'warning', label: 'Pending' },
  error: { color: 'danger', label: 'Error' },
  inactive: { color: 'secondary', label: 'Inactive' },
  info: { color: 'info', label: 'Info' },
  active: { color: 'success', label: 'Active' },
  draft: { color: 'secondary', label: 'Draft' },
  approved: { color: 'success', label: 'Approved' },
  rejected: { color: 'danger', label: 'Rejected' },
};

export interface StatusBadgeProps extends Omit<CBadgeProps, 'color'> {
  status: StatusType;
  label?: string;
  variant?: 'solid' | 'outline' | 'ghost';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  variant = 'solid',
  className,
  style,
  ...props
}) => {
  const config = statusConfig[status];

  const coreUIProps: Partial<CBadgeProps> = {
    color: config.color,
  };

  if (variant === 'outline') {
    coreUIProps.textBgColor = config.color;
    coreUIProps.color = undefined;
  }

  return (
    <CBadge
      {...coreUIProps}
      className={className}
      style={{ borderRadius: 4, ...style }}
      {...props}
    >
      {label || config.label}
    </CBadge>
  );
};

export const Status = {
  COMPLETE: 'complete' as StatusType,
  PARTIAL: 'partial' as StatusType,
  PENDING: 'pending' as StatusType,
  ERROR: 'error' as StatusType,
  INACTIVE: 'inactive' as StatusType,
  INFO: 'info' as StatusType,
  ACTIVE: 'active' as StatusType,
  DRAFT: 'draft' as StatusType,
  APPROVED: 'approved' as StatusType,
  REJECTED: 'rejected' as StatusType,
};
