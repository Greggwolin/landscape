'use client';

import React from 'react';
import { CAlert } from '@coreui/react';

export function Alert({
  children,
  className,
  color = 'warning',
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <CAlert color={color} className={className}>
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

