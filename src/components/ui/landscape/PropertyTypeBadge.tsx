import React from 'react';
import { CBadge } from '@coreui/react';
import type { CBadgeProps } from '@coreui/react';
import { getPropertyTypeLabel, getPropertyTypeBadgeStyle, type BadgeVariant } from '@/config/propertyTypeTokens';

export interface PropertyTypeBadgeProps extends Omit<CBadgeProps, 'color'> {
  typeCode?: string | null;
  label?: string;
  variant?: BadgeVariant;
}

export function PropertyTypeBadge({
  typeCode,
  label,
  variant = 'solid',
  style,
  className,
  ...rest
}: PropertyTypeBadgeProps) {
  const displayLabel = label ?? getPropertyTypeLabel(typeCode);
  const badgeStyle = getPropertyTypeBadgeStyle(typeCode, variant);

  return (
    <CBadge
      {...rest}
      className={className}
      style={{
        ...badgeStyle,
        fontWeight: 600,
        borderRadius: 4,
        ...style,
      }}
    >
      {displayLabel}
    </CBadge>
  );
}

export default PropertyTypeBadge;
