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
    <div className="app-content">
      {children}
    </div>
  );
}
