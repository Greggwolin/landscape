'use client';

import { ReactNode } from 'react';
import { ProjectProvider } from '@/app/components/ProjectProvider';
import Header from '@/app/components/Header';
import Navigation from '@/app/components/Navigation';

export default function MarketLayout({ children }: { children: ReactNode }) {
  return (
    <ProjectProvider>
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Navigation activeView="market" setActiveView={() => {}} />
          <main className="flex-1 overflow-visible bg-gray-950">
            {children}
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}
