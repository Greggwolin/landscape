import React from 'react';
import { CBadge } from '@coreui/react';
import type { CBadgeProps } from '@coreui/react';
import { getPropertyTypeLabel, getPropertyTypeTokenRef } from '@/config/propertyTypeTokens';

export interface PropertyTypeBadgeProps extends Omit<CBadgeProps, 'color'> {
  typeCode?: string | null;
  label?: string;
}

export function PropertyTypeBadge({
  typeCode,
  label,
  style,
  className,
  shape = 'rounded-pill',
  ...rest
}: PropertyTypeBadgeProps) {
  const tokenRef = getPropertyTypeTokenRef(typeCode);
  const displayLabel = label ?? getPropertyTypeLabel(typeCode);

  return (
    <CBadge
      {...rest}
      shape={shape}
      className={className}
      style={{
        backgroundColor: tokenRef?.bgVar ?? 'var(--cui-tertiary-bg)',
        color: tokenRef?.textVar ?? 'var(--cui-body-color)',
        border: tokenRef ? '1px solid transparent' : '1px solid var(--cui-border-color)',
        fontWeight: 600,
        ...style,
      }}
    >
      {displayLabel}
    </CBadge>
  );
}

export default PropertyTypeBadge;
