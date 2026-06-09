'use client';

import React from 'react';
import { CBadge } from '@coreui/react';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const VARIANT_COLOR: Record<BadgeVariant, string> = {
  default: 'primary',
  secondary: 'secondary',
  destructive: 'danger',
  outline: 'secondary',
};

export function Badge({
  children,
  className,
  color,
  variant,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}) {
  const resolvedColor = color ?? (variant ? VARIANT_COLOR[variant] : 'secondary');
  return (
    <CBadge color={resolvedColor} className={className} style={style}>
      {children}
    </CBadge>
  );
}

