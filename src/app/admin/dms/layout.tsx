'use client';

import React, { useState } from 'react';
import { ProjectProvider } from '@/app/components/ProjectProvider';
import { CoreUIThemeProvider } from '@/app/components/CoreUIThemeProvider';
import Navigation from '@/app/components/Navigation';

export default function AdminDMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeView, setActiveView] = useState('dms-admin');

  return (
    <CoreUIThemeProvider>
      <ProjectProvider>
        <div className="min-h-screen flex" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
          <Navigation activeView={activeView} setActiveView={setActiveView} />
          <main className="flex-1" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
            {children}
          </main>
        </div>
      </ProjectProvider>
    </CoreUIThemeProvider>
  );
}
