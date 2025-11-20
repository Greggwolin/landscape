/**
 * StatusChip - CoreUI Badge Wrapper Component
 *
 * Semantic wrapper around CoreUI CBadge for consistent status indicators.
 * Automatically maps semantic states to the correct color tokens from tokens.css.
 *
 * @version 1.0.0
 * @phase Phase 1 - CoreUI Migration
 */

import React from 'react';
import { CBadge } from '@coreui/react';
import type { CBadgeProps } from '@coreui/react';

/**
 * Semantic status types
 */
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

/**
 * Status configuration mapping
 */
const statusConfig: Record<
  StatusType,
  {
    color: CBadgeProps['color'];
    label: string;
    variant?: 'outline' | 'ghost';
  }
> = {
  complete: {
    color: 'success',
    label: 'Complete',
  },
  partial: {
    color: 'warning',
    label: 'Partial',
  },
  pending: {
    color: 'warning',
    label: 'Pending',
  },
  error: {
    color: 'danger',
    label: 'Error',
  },
  inactive: {
    color: 'secondary',
    label: 'Inactive',
  },
  info: {
    color: 'info',
    label: 'Info',
  },
  active: {
    color: 'success',
    label: 'Active',
  },
  draft: {
    color: 'secondary',
    label: 'Draft',
  },
  approved: {
    color: 'success',
    label: 'Approved',
  },
  rejected: {
    color: 'danger',
    label: 'Rejected',
  },
};

export interface StatusChipProps extends Omit<CBadgeProps, 'color'> {
  /**
   * Semantic status type
   */
  status: StatusType;

  /**
   * Custom label (overrides default label for status)
   */
  label?: string;

  /**
   * Badge variant (default renders solid background)
   */
  variant?: 'solid' | 'outline' | 'ghost';
}

/**
 * StatusChip Component
 *
 * @example
 * // Complete status
 * <StatusChip status="complete" />
 *
 * @example
 * // Custom label
 * <StatusChip status="pending" label="In Review" />
 *
 * @example
 * // Outline variant
 * <StatusChip status="error" variant="outline" />
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  variant = 'solid',
  className,
  ...props
}) => {
  const config = statusConfig[status];

  // Map variant to CoreUI shape (CoreUI doesn't have ghost, so use light background)
  const coreUIProps: Partial<CBadgeProps> = {
    color: config.color,
  };

  // Apply text variant for outline/ghost
  if (variant === 'outline') {
    coreUIProps.textBgColor = config.color;
    coreUIProps.color = undefined;
  }

  return (
    <CBadge
      {...coreUIProps}
      className={className}
      {...props}
    >
      {label || config.label}
    </CBadge>
  );
};

/**
 * Status types for easy import
 */
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
