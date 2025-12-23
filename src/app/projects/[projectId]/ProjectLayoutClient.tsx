'use client';

import React from 'react';
import { LandscaperPanel } from '@/components/landscaper';

interface ProjectLayoutClientProps {
  projectId: number;
  children: React.ReactNode;
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  return (
    <div className="flex flex-1 min-h-0 gap-3" style={{ alignItems: 'flex-start' }}>
      {/* Left Panel - Landscaper (30%) - sticky to stay visible while scrolling */}
      <div
        className="flex-shrink-0 sticky top-0"
        style={{
          width: '30%',
          minWidth: '350px',
          maxWidth: '450px',
          height: 'calc(100vh - 180px)', // Subtract header heights
        }}
      >
        <LandscaperPanel projectId={projectId} />
      </div>

      {/* Right Content - Tab Content (70%) */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
