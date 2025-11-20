'use client';

import React from 'react';
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
      <PreferencesContextBar />
      <main style={{ overflow: 'visible' }}>
        {children}
      </main>
    </>
  );
}
