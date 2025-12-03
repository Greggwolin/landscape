'use client';

import React from 'react';

/**
 * Napkin layout wrapper - provides stable container to prevent child remounts
 */
export default function NapkinLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginLeft: '1rem', marginRight: '1rem' }}>
      {children}
    </div>
  );
}
