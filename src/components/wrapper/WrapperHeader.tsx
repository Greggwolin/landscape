'use client';

import React from 'react';

interface WrapperHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Universal dark header bar used by all three panels
 * (sidebar header, chat header, artifact header).
 * Background: #040506, min-height: 46px.
 */
export function WrapperHeader({ children, className }: WrapperHeaderProps) {
  return (
    <div className={`wrapper-header${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
