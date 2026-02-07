'use client';

import React from 'react';

interface CapitalizationLayoutProps {
  children: React.ReactNode;
  subNavOverrides?: {
    activeSubTab?: string;
    onSubTabChange?: (tabId: string) => void;
  };
}

export default function CapitalizationLayout({
  children,
}: CapitalizationLayoutProps) {
  return (
    <div>
      {children}
    </div>
  );
}
