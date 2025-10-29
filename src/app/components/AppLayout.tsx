'use client';

import React, { useState } from 'react';
import Navigation from './Navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
      <Navigation activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        {children}
      </main>
    </div>
  );
}
