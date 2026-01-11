'use client';

import React, { Suspense } from 'react';
import PreferencesContextBar from '@/app/components/PreferencesContextBar';

/**
 * Preferences Layout
 *
 * Wraps all Global Preferences pages with the PreferencesContextBar
 * Provides consistent navigation across all preference tabs
 */
export default function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<div className="h-14 border-b" style={{ backgroundColor: 'var(--cui-body-bg)' }} />}>
        <PreferencesContextBar />
      </Suspense>
      <main style={{ overflow: 'visible' }}>
        {children}
      </main>
    </>
  );
}
