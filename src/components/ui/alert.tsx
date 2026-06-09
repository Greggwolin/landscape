'use client';

import React from 'react';
import { CAlert } from '@coreui/react';

type AlertVariant = 'default' | 'destructive';

const VARIANT_COLOR: Record<AlertVariant, string> = {
  default: 'info',
  destructive: 'danger',
};

export function Alert({
  children,
  className,
  color,
  variant,
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  variant?: AlertVariant;
}) {
  const resolvedColor = color ?? (variant ? VARIANT_COLOR[variant] : 'warning');
  return (
    <CAlert color={resolvedColor} className={className}>
      {children}
    </CAlert>
  );
}

export function AlertTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h6 className={className}>{children}</h6>;
}

export function AlertDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

